import { useGameStore, useHistoryStore } from '@/stores/battle';
import { BattleEngine } from '../calculation/BattleEngine';
import { TurnManager } from './TurnManager';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard, PlayerState } from '@/types';
import { usePlayerStore } from '@/stores/battle';
import { useSettingsStore } from '@/stores/settings';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';
import type { DialogueSystem } from '@/core/systems/DialogueSystem';
import { CostCalculator } from '@/core/calculation/CostCalculator';
import { battleDebugLogger } from '@/core/debug/BattleDebugLogger';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import type { StrengthCalculation } from '@/types/debug';

// 工厂函数：创建带有依赖注入的 BattleController
export function createBattleController(dialogueSystem: DialogueSystem) {
  return {
    dialogueSystem, // 保存依赖引用
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

    // 使用 CostCalculator 计算实际费用（考虑减免效果）
    const costInfo = CostCalculator.getCostModification(attackingCard, attackerId);
    const totalCost = costInfo.finalCost + styleCost;

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

    // Log card play action for debugging with detailed calculations
    const strengthCalc = this.getStrengthCalculationDetails(attackingCard, attackerId);
    const costCalc = CostCalculator.getCostModification(attackingCard, attackerId);
    battleDebugLogger.logCardPlay(attackerId, attackingCard, style, strengthCalc, {
      cardId: attackingCard.id,
      cardName: attackingCard.name,
      baseCost: costCalc.baseCost,
      costReductions: costCalc.reduction > 0 ? [{
        source: '系统减免',
        amount: costCalc.reduction,
        reason: '技能效果或临时加成'
      }] : [],
      finalCost: costCalc.finalCost
    });

    const attackerName = attackerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${attackerName} 以 [${style}] 的方式打出了 [${attackingCard.name}]。`, 'clash');

    // 触发辩论对话系统
    const attackDialogue = await this.dialogueSystem.generateAttackDialogue(style, attackingCard.name, attackerId);
    this.dialogueSystem.addDialogue(attackerId, attackDialogue, 'speech');
    
    // 如果是辛辣点评，有概率触发"异议！"动作效果
    if (style === '辛辣点评' && Math.random() < 0.3) {
      setTimeout(async () => {
        const objectionText = await this.dialogueSystem.generateActionDialogue('objection', attackerId, attackingCard.name);
        this.dialogueSystem.addDialogue(attackerId, objectionText, 'action', 'objection');
      }, 1500);
    }

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

  async aiRespondToClash() {
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

      // Log AI defense card play for debugging with detailed calculations
      const aiStrengthCalc = this.getStrengthCalculationDetails(decision.card, defenderId);
      const aiCostCalc = CostCalculator.getCostModification(decision.card, defenderId);
      battleDebugLogger.logCardPlay(defenderId, decision.card, decision.style, aiStrengthCalc, {
        cardId: decision.card.id,
        cardName: decision.card.name,
        baseCost: aiCostCalc.baseCost,
        costReductions: aiCostCalc.reduction > 0 ? [{
          source: 'AI系统减免',
          amount: aiCostCalc.reduction,
          reason: 'AI技能效果或临时加成'
        }] : [],
        finalCost: aiCostCalc.finalCost
      });
      
      // 触发AI防御对话
      const dialogueSystem = this.dialogueSystem;
      const defenseDialogue = await dialogueSystem.generateDefenseDialogue(
        decision.style === '赞同' ? '赞同' : '反驳', 
        gameStore.clashInfo?.attackingCard.name || '',
        defenderId,
        decision.card.name
      );
      dialogueSystem.addDialogue(defenderId, defenseDialogue, 'speech');
      
      // 如果是反驳，有概率触发反击动作效果
      if (decision.style === '反驳' && Math.random() < 0.4) {
        setTimeout(async () => {
          const counterText = await dialogueSystem.generateActionDialogue('counterattack', defenderId, decision.card.name);
          dialogueSystem.addDialogue(defenderId, counterText, 'action', 'counterattack');
        }, 2000);
      }
      
      this.respondToClash(decision.card.id, decision.style);
    } else {
      const defenderName = defenderId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${defenderName} 选择不响应，跳过防御。`, 'info');
      
      // AI跳过防御时的对话
      const dialogueSystem = this.dialogueSystem;
      const passDialogue = "这个...我暂时没有好的反驳...";
      dialogueSystem.addDialogue(defenderId, passDialogue, 'speech');
      
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

    // 生成跳过防御的对话 
    const defenderId = gameStore.opponentId;
    const dialogueSystem = this.dialogueSystem;
    const passDialogue = defenderId === 'playerA' 
      ? "这个观点...确实有些道理..." 
      : "这个...我暂时没有好的反驳...";
    dialogueSystem.addDialogue(defenderId, passDialogue, 'speech');

    // 默认以"赞同"方式防守，且不出卡（强度为0）
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

    // 使用 CostCalculator 计算实际费用（考虑减免效果）
    const costInfo = CostCalculator.getCostModification(defendingCard, defenderId);
    const totalCost = costInfo.finalCost + styleCost;

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

    // Log defense card play action for debugging with detailed calculations
    const defenseStrengthCalc = this.getStrengthCalculationDetails(defendingCard, defenderId);
    const defenseCostCalc = CostCalculator.getCostModification(defendingCard, defenderId);
    battleDebugLogger.logCardPlay(defenderId, defendingCard, defenseStyle, defenseStrengthCalc, {
      cardId: defendingCard.id,
      cardName: defendingCard.name,
      baseCost: defenseCostCalc.baseCost,
      costReductions: defenseCostCalc.reduction > 0 ? [{
        source: '玩家系统减免',
        amount: defenseCostCalc.reduction,
        reason: '玩家技能效果或临时加成'
      }] : [],
      finalCost: defenseCostCalc.finalCost
    });

    // 生成玩家防御对话
    const dialogueSystem = this.dialogueSystem;
    const defenseDialogue = await dialogueSystem.generateDefenseDialogue(
      defenseStyle === '赞同' ? '赞同' : '反驳', 
      gameStore.clashInfo?.attackingCard.name || '',
      defenderId,
      defendingCard.name
    );
    dialogueSystem.addDialogue(defenderId, defenseDialogue, 'speech');
    
    // 如果是反驳，有概率触发反击动作效果
    if (defenseStyle === '反驳' && Math.random() < 0.4) {
      setTimeout(async () => {
        const counterText = await dialogueSystem.generateActionDialogue('counterattack', defenderId, defendingCard.name);
        dialogueSystem.addDialogue(defenderId, counterText, 'action', 'counterattack');
      }, 2000);
    }

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

    // Determine winner based on strength comparison
    const strengthDiff = clashResult.attackerStrength - clashResult.defenderStrength;
    const winner = strengthDiff > 0 ? clashInfo.attackerId :
                   strengthDiff < 0 ? (clashInfo.defenderId || clashInfo.attackerId) :
                   'draw' as 'playerA' | 'playerB' | 'draw';

    // Log clash resolution for debugging
    battleDebugLogger.logClashResolve(
      clashInfo.attackerId,
      clashInfo.defenderId || clashInfo.attackerId,
      clashInfo.attackingCard,
      clashInfo.defendingCard || null,
      clashResult.attackerStrength,
      clashResult.defenderStrength,
      {
        winner,
        reputationChange: {
          playerA: clashInfo.attackerId === 'playerA' ? rewards.attackerReputationChange : rewards.defenderReputationChange,
          playerB: clashInfo.attackerId === 'playerB' ? rewards.attackerReputationChange : rewards.defenderReputationChange
        },
        topicBiasChange: rewards.topicBiasChange
      }
    );

    // 使用批量更新优化性能
    const nameA = playerStore.playerA.name;
    const nameB = playerStore.playerB.name;
    const attackerName2 = clashInfo.attackerId === 'playerA' ? nameA : nameB;
    const defenderName2 = clashInfo.defenderId === 'playerA' ? nameA : nameB;

    // 批量更新玩家状态和游戏状态（减少响应式触发）
    playerStore.$patch((state) => {
      state[clashInfo.attackerId].reputation += rewards.attackerReputationChange;
      if (clashInfo.defenderId) {
        state[clashInfo.defenderId].reputation += rewards.defenderReputationChange;
      }
    });
    gameStore.updateTopicBias(rewards.topicBiasChange);

    // 批量添加日志
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
      // Log turn end for debugging
      battleDebugLogger.logAction('turn_end', gameStore.activePlayer, `回合结束: ${gameStore.activePlayer}`);
      TurnManager.endTurn();
    }
  },

  /**
   * 获取卡牌强度计算详情
   */
  getStrengthCalculationDetails(card: AnimeCard, playerId: 'playerA' | 'playerB'): StrengthCalculation {
    const playerStore = usePlayerStore();
    const baseStrength = card.points || 0;
    const finalStrength = StrengthCalculator.calculateFinalStrength(card, playerId);
    const strengthBonus = finalStrength - baseStrength;

    const strengthBonuses: Array<{source: string, amount: number, reason: string}> = [];

    // 检查是否有强度加成
    if (strengthBonus > 0) {
      strengthBonuses.push({
        source: '技能效果',
        amount: strengthBonus,
        reason: '角色技能或临时效果提供的强度加成'
      });
    } else if (strengthBonus < 0) {
      strengthBonuses.push({
        source: '负面效果',
        amount: strengthBonus,
        reason: '受到削弱效果影响'
      });
    }

    // 检查玩家当前激活的角色和技能
    const player = playerStore[playerId];
    const activeCharacter = player.characters[player.activeCharacterIndex];
    if (activeCharacter && activeCharacter.skills) {
      const activeSkills = activeCharacter.skills.filter(skill =>
        skill.type === '被动技能' || (skill.type === '主动技能' && !player.skillCooldowns[skill.id || skill.effectId || ''])
      );

      if (activeSkills.length > 0) {
        strengthBonuses.push({
          source: activeCharacter.name,
          amount: 0, // 这里应该从技能系统获取实际加成
          reason: `角色技能: ${activeSkills.map(s => s.name).join(', ')}`
        });
      }
    }

    return {
      cardId: card.id,
      cardName: card.name,
      baseStrength,
      strengthBonuses,
      finalStrength
    };
  },
  };
}

// 创建一个默认实例用于向后兼容（暂时使用 null，实际使用时需要正确的 DialogueSystem 实例）
// TODO: 这是临时的向后兼容方案，应该逐步迁移到依赖注入
export const BattleController = {
  // 临时的兼容方法，会在运行时报错提示需要使用新的依赖注入方式
  async initiateClash() {
    throw new Error('BattleController.initiateClash() 已废弃，请使用 createBattleController(dialogueSystem).initiateClash()');
  },
  // 其他方法类似...
};