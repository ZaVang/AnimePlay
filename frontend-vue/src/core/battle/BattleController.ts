import { useGameStore, useHistoryStore } from '@/stores/battle';
import { BattleEngine } from '../calculation/BattleEngine';
import { TurnManager } from './TurnManager';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard, PlayerState } from '@/types';
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
    if (!gameStore.clashInfo) return;

    // 使用智能防御策略
    const decision = this.makeDefenseDecision(defender, gameStore.clashInfo);
    
    if (decision.shouldDefend && decision.card) {
      const defenderName = defenderId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${defenderName} 使用 [${decision.card.name}] 进行 [${decision.style}]。`, 'clash');
      this.respondToClash(decision.card.id, decision.style);
    } else {
      const defenderName = defenderId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${defenderName} 选择不响应，跳过防御。`, 'info');
      this.passDefense();
    }
  },

  /**
   * AI智能防御决策
   */
  makeDefenseDecision(defender: PlayerState, clashInfo: ClashInfo) {
    const affordableCards = defender.hand.filter((card: AnimeCard) => (card.cost || 0) <= defender.tp);
    
    if (affordableCards.length === 0) {
      return { shouldDefend: false };
    }

    // 计算攻击者的强度
    const attackerStrength = clashInfo.attackingCard?.points || 0;
    
    // 选择最佳防御卡牌：优先考虑强度vs费用比
    const bestDefenseCard = affordableCards.reduce((best: AnimeCard, card: AnimeCard) => {
      const cardValue = (card.points || 1) / Math.max(card.cost || 1, 1);
      const bestValue = (best.points || 1) / Math.max(best.cost || 1, 1);
      return cardValue > bestValue ? card : best;
    });

    // 决定防御风格：如果有足够TP且对手攻击力强，倾向于反驳
    const canAffordRebuttal = (bestDefenseCard.cost || 0) + 1 <= defender.tp;
    const shouldRebuttal = canAffordRebuttal && attackerStrength >= 3;
    const defenseStyle = shouldRebuttal && Math.random() < 0.7 ? '反驳' : '赞同';

    // 决定是否防御：如果手牌很少或者卡牌价值不高，可能选择跳过
    const handSize = defender.hand.length;
    const cardStrength = bestDefenseCard.points || 0;
    
    // 如果手牌少于3张且卡牌强度低于2，30%概率跳过防御
    const shouldSkip = handSize <= 2 && cardStrength < 2 && Math.random() < 0.3;
    
    return {
      shouldDefend: !shouldSkip,
      card: bestDefenseCard,
      style: defenseStyle as '赞同' | '反驳'
    };
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