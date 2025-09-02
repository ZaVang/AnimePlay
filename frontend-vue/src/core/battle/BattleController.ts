import { useGameStore, useHistoryStore } from '@/stores/battle';
import { BattleEngine } from '../calculation/BattleEngine';
import { TurnManager } from './TurnManager';
import type { ClashInfo } from '@/types/battle';
import { usePlayerStore } from '@/stores/battle';
import { useSettingsStore } from '@/stores/settings';
import { SkillSystem } from '@/core/systems/SkillSystem';

export const BattleController = {
  async initiateClash(animeId: number, style: '友好安利' | '辛辣点评') {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const settingsStore = useSettingsStore();
    const attackerId = gameStore.activePlayer;
    const attacker = playerStore[attackerId];
    const defenderId = gameStore.opponentId;
    const defender = playerStore[defenderId];

    const attackingCard = attacker.hand.find(a => a.id === animeId);
    if (!attackingCard) return;

    const styleCost = style === '辛辣点评' ? 1 : 0;
    const totalCost = (attackingCard.cost || 0) + styleCost;
    
    if (attacker.tp < totalCost) {
      gameStore.addNotification('TP不足，无法出牌！', 'warning');
      return;
    }

    playerStore.changeTp(attackerId, -totalCost);
    playerStore.discardCardFromHand(attackerId, animeId.toString());

    const clash: ClashInfo = {
      attackerId,
      attackingCard,
      attackStyle: style,
      defenderId,
    };
    gameStore.setClash(clash);
    gameStore.setPhase('defense');

    // Trigger onPlay effects for attacker (minimal demo)
    await SkillSystem.onCardPlayed(attackerId, attackingCard);

    const attackerName = attackerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${attackerName} 以 [${style}] 的方式打出了 [${attackingCard.name}]。`, 'clash');

    // If the player is the attacker, trigger AI response.
    // If AI is the attacker, the UI will wait for player's input.
    if (attackerId === 'playerA') {
      const delay = settingsStore.getBattleDelay('aiDefense');
      setTimeout(() => this.aiRespondToClash(), delay);
    }
  },

  skipTurn() {
    const gameStore = useGameStore();
    if (gameStore.phase === 'action' && gameStore.activePlayer === 'playerA') {
       this.endTurn();
    } else if (gameStore.phase === 'defense' && gameStore.activePlayer === 'playerB') {
      // This is the case where player skips defense
      this.passDefense();
    }
  },

  aiRespondToClash() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const defenderId = gameStore.opponentId;
    const defender = playerStore[defenderId];

    if (gameStore.phase !== 'defense') return;

    const affordableCards = defender.hand
      .filter(card => (card.cost || 0) <= defender.tp)
      .sort((a, b) => (a.cost || 0) - (b.cost || 0)); // Prefer cheaper cards

    if (affordableCards.length > 0) {
      const cardToPlay = affordableCards[0];
      const canAffordRebuttal = (cardToPlay.cost || 0) + 1 <= defender.tp;
      const defenseStyle = canAffordRebuttal ? '反驳' : '赞同';
      const defenderName = defenderId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${defenderName} 使用 [${cardToPlay.name}] 进行 [${defenseStyle}]。`, 'clash');
      this.respondToClash(cardToPlay.id, defenseStyle);
    } else {
      const defenderName = defenderId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${defenderName} 无法响应，选择跳过。`, 'info');
      this.passDefense();
    }
  },

  async passDefense() {
    const gameStore = useGameStore();
    if (!gameStore.clashInfo) return;

    // 默认以“赞同”方式防守，且不出卡（强度为0）
    const finalClashInfo: ClashInfo = {
      ...gameStore.clashInfo,
      defenseStyle: '赞同',
      defendingCard: undefined,
    };

    await this.resolveClash(finalClashInfo);
  },

  async respondToClash(defendingAnimeId: number, defenseStyle: '赞同' | '反驳') {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    if (!gameStore.clashInfo) return;

    const defenderId = gameStore.opponentId;
    const defender = playerStore[defenderId];
    const defendingCard = defender.hand.find(a => a.id === defendingAnimeId);
    if (!defendingCard) return;

    const styleCost = defenseStyle === '反驳' ? 1 : 0;
    const totalCost = (defendingCard.cost || 0) + styleCost;
    if (defender.tp < totalCost) {
      gameStore.addNotification('TP不足！', 'warning');
      return;
    }
    
    playerStore.changeTp(defenderId, -totalCost);
    playerStore.discardCardFromHand(defenderId, defendingAnimeId.toString());

    const finalClashInfo: ClashInfo = {
      ...gameStore.clashInfo,
      defenderId,
      defendingCard,
      defenseStyle,
    };

    // Trigger onPlay effects for defender (minimal demo)
    await SkillSystem.onCardPlayed(defenderId, defendingCard);

    await this.resolveClash(finalClashInfo);
  },

  async resolveClash(clashInfo: ClashInfo) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const settingsStore = useSettingsStore();

    // beforeResolve: allow effects to inject temp bonuses
    let extraAttacker = 0;
    let extraDefender = 0;
    await SkillSystem.emitBeforeResolve(clashInfo, (side, amount) => {
      if (side === 'attacker') extraAttacker += amount; else extraDefender += amount;
    });

    const clashResult = BattleEngine.resolveClash(clashInfo);
    clashResult.attackerStrength += extraAttacker;
    clashResult.defenderStrength += extraDefender;
    const { rewards } = clashResult;

    playerStore.changeReputation(clashInfo.attackerId, rewards.attackerReputationChange);
    if (clashInfo.defenderId) {
      playerStore.changeReputation(clashInfo.defenderId, rewards.defenderReputationChange);
    }
    gameStore.updateTopicBias(rewards.topicBiasChange);

    const nameA = playerStore.playerA.name;
    const nameB = playerStore.playerB.name;
    const attackerName2 = clashInfo.attackerId === 'playerA' ? nameA : nameB;
    const defenderName2 = clashInfo.defenderId === 'playerA' ? nameA : nameB;
    historyStore.addLog(`声望变化: ${attackerName2} ${rewards.attackerReputationChange}, ${defenderName2} ${rewards.defenderReputationChange}。`, 'damage');
    historyStore.addLog(`议题偏向变化: ${rewards.topicBiasChange > 0 ? '+' : ''}${rewards.topicBiasChange}。`, 'info');

    gameStore.setClash({ ...clashInfo, ...clashResult });

    // afterResolve effects
    await SkillSystem.emitAfterResolve({ ...clashInfo, ...clashResult });

    const delay = settingsStore.getBattleDelay('settle');
    setTimeout(() => {
      gameStore.clearClash();
      gameStore.setPhase('action');
      TurnManager.checkVictoryConditions();

      // If the AI was the attacker, its turn is now over.
      if (clashInfo.attackerId === 'playerB' && !gameStore.isGameOver) {
        this.endTurn();
      }
    }, delay);
  },

  endTurn() {
    const gameStore = useGameStore();
    if (!gameStore.isGameOver) {
      TurnManager.endTurn();
    }
  },
};