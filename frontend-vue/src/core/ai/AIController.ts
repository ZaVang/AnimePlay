import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { createBattleController } from '../battle/BattleController';
import { systemRegistry } from '@/core/di/registry';
import { useSettingsStore } from '@/stores/settings';

export const AIController = {
  /**
   * 获取BattleController实例
   */
  getBattleController() {
    try {
      const dialogueSystem = systemRegistry.getDialogueSystem();
      return createBattleController(dialogueSystem);
    } catch (error) {
      console.error('Failed to get BattleController in AIController:', error);
      throw error;
    }
  },

  /**
   * The AI's main turn logic.
   */
  takeTurn() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const settingsStore = useSettingsStore();
    const aiPlayer = playerStore.playerB;

    historyStore.addLog(`${aiPlayer.name} 正在思考...`, 'info');

    const delay = settingsStore.getBattleDelay('aiThink');
    setTimeout(async () => {
      // AI决策流程：技能优先还是出牌优先
      const playableCards = aiPlayer.hand.filter(card => (card.cost || 0) <= aiPlayer.tp);

      // 30%概率AI会先考虑使用技能（如果技能价值很高）
      const shouldConsiderSkillFirst = Math.random() < 0.3 && aiPlayer.tp >= 2;

      if (shouldConsiderSkillFirst) {
        // 尝试使用技能（如果技能评分高）
        const skillUsed = await this.tryUseCharacterSkill(aiPlayer);
        if (skillUsed) {
          // 技能使用成功后，检查是否还能出牌
          const updatedPlayableCards = aiPlayer.hand.filter(card => (card.cost || 0) <= aiPlayer.tp);
          if (updatedPlayableCards.length > 0) {
            // 仍有卡牌可出，递归调用（但标记为技能后续）
            setTimeout(() => {
              const cardToPlay = this.selectBestCard(updatedPlayableCards, aiPlayer);
              const style = this.selectBattleStyle(cardToPlay, aiPlayer);
              historyStore.addLog(`${aiPlayer.name} 打出了 [${cardToPlay.name}]。`, 'clash');
              this.getBattleController().initiateClash(cardToPlay.id, style);
            }, settingsStore.getBattleDelay('aiThink') / 2);
          } else {
            // 技能用完后没有足够TP出牌，结束回合
            historyStore.addLog(`${aiPlayer.name} 选择结束回合。`, 'event');
            this.getBattleController().endTurn();
          }
          return;
        }
      }

      // 标准流程：优先出牌
      if (playableCards.length > 0) {
        // 智能卡牌选择：优先选择高强度卡牌
        const cardToPlay = this.selectBestCard(playableCards, aiPlayer);

        // 智能出牌风格选择：根据TP和卡牌强度决定
        const style = this.selectBattleStyle(cardToPlay, aiPlayer);

        historyStore.addLog(`${aiPlayer.name} 打出了 [${cardToPlay.name}]。`, 'clash');
        this.getBattleController().initiateClash(cardToPlay.id, style);
      } else {
        // If no card can be played, try using character skills first
        const skillUsed = await this.tryUseCharacterSkill(aiPlayer);
        if (!skillUsed) {
          historyStore.addLog(`${aiPlayer.name} 选择结束回合。`, 'event');
          this.getBattleController().endTurn();
        }
      }
    }, delay);
  },

  /**
   * 智能选择最佳卡牌：优先高强度、低费用的卡牌
   */
  selectBestCard(playableCards: any[], aiPlayer: any) {
    // 计算每张卡牌的价值分数 (强度/费用比)
    const cardScores = playableCards.map(card => ({
      card,
      score: (card.points || 1) / Math.max(card.cost || 1, 1) // 避免除零
    }));
    
    // 按分数排序，选择最高分的卡牌
    cardScores.sort((a, b) => b.score - a.score);
    
    // 有30%概率选择最佳卡牌，70%概率从前3张中随机选择（增加变化性）
    if (Math.random() < 0.3 || cardScores.length === 1) {
      return cardScores[0].card;
    } else {
      const topCards = cardScores.slice(0, Math.min(3, cardScores.length));
      return topCards[Math.floor(Math.random() * topCards.length)].card;
    }
  },

  /**
   * 智能选择战斗风格
   */
  selectBattleStyle(card: any, aiPlayer: any): '友好安利' | '辛辣点评' {
    // 如果TP充足且卡牌强度高，使用辛辣点评增加攻击性
    const cardStrength = card.points || 1;
    const canAffordHarsh = (card.cost || 0) + 1 <= aiPlayer.tp;
    
    if (canAffordHarsh && cardStrength >= 4) {
      return Math.random() < 0.6 ? '辛辣点评' : '友好安利';
    } else {
      return '友好安利';
    }
  },

  /**
   * 尝试使用角色技能
   */
  async tryUseCharacterSkill(aiPlayer: any): Promise<boolean> {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();

    // 获取当前主辩手角色
    const activeCharacter = aiPlayer.characters[aiPlayer.activeCharacterIndex];
    if (!activeCharacter || !activeCharacter.skills) {
      return false;
    }

    // 找到可用的主动技能
    const usableSkills = this.getUsableSkills(aiPlayer, activeCharacter);
    if (usableSkills.length === 0) {
      return false;
    }

    // 评估并选择最佳技能
    const bestSkill = this.evaluateAndSelectBestSkill(usableSkills, aiPlayer);
    if (!bestSkill) {
      return false;
    }

    // 执行技能
    try {
      // Import SkillSystem directly
      const { SkillSystem } = await import('@/core/systems/SkillSystem');

      // useSkill already handles cooldown, TP cost, and execution
      await SkillSystem.useSkill('playerB', bestSkill);

      historyStore.addLog(`${aiPlayer.name} 使用了技能 [${bestSkill.name}]！`, 'event');
      return true;
    } catch (error) {
      console.error('AI skill execution failed:', error);
      return false;
    }
  },

  /**
   * 获取可用的技能列表
   */
  getUsableSkills(aiPlayer: any, activeCharacter: any) {
    const playerStore = usePlayerStore();
    const usableSkills = [];

    for (const skill of activeCharacter.skills) {
      // 只考虑主动技能
      if (skill.type !== '主动技能') {
        continue;
      }

      // 检查冷却
      const currentCooldown = playerStore.getSkillCooldown('playerB', skill.id);
      if (currentCooldown > 0) {
        continue;
      }

      // 检查TP成本
      if (skill.cost && skill.cost > aiPlayer.tp) {
        continue;
      }

      usableSkills.push(skill);
    }

    return usableSkills;
  },

  /**
   * 评估并选择最佳技能
   */
  evaluateAndSelectBestSkill(usableSkills: any[], aiPlayer: any) {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const opponentPlayer = playerStore.playerA;

    // 为每个技能评分
    const skillScores = usableSkills.map(skill => ({
      skill,
      score: this.evaluateSkillValue(skill, aiPlayer, opponentPlayer, gameStore)
    }));

    // 按分数排序
    skillScores.sort((a, b) => b.score - a.score);

    // 如果最高分技能价值太低（<30分），不使用技能
    if (skillScores[0].score < 30) {
      return null;
    }

    // 有60%几率选择最佳技能，40%几率从前2个中随机选择
    if (Math.random() < 0.6 || skillScores.length === 1) {
      return skillScores[0].skill;
    } else {
      const topSkills = skillScores.slice(0, Math.min(2, skillScores.length));
      return topSkills[Math.floor(Math.random() * topSkills.length)].skill;
    }
  },

  /**
   * 评估技能价值（返回0-100分）
   */
  evaluateSkillValue(skill: any, aiPlayer: any, opponentPlayer: any, gameStore: any): number {
    let score = 50; // 基础分数

    const aiReputation = aiPlayer.reputation;
    const opponentReputation = opponentPlayer.reputation;
    const aiTp = aiPlayer.tp;
    const aiHandSize = aiPlayer.hand.length;
    const opponentHandSize = opponentPlayer.hand.length;

    // 根据技能名称中的关键词进行启发式评估
    const skillName = skill.name || '';
    const skillDesc = skill.description || '';
    const combined = skillName + skillDesc;

    // === 优势/劣势相关技能 ===
    if (aiReputation < 15) {
      // 低血量：优先防守和恢复技能
      if (combined.includes('声望+') || combined.includes('声望加') || combined.includes('回复')) {
        score += 30;
      }
      if (combined.includes('免疫') || combined.includes('防守') || combined.includes('保护')) {
        score += 25;
      }
    }

    if (opponentReputation < 15) {
      // 对手低血量：优先进攻技能
      if (combined.includes('强度+') || combined.includes('伤害') || combined.includes('攻击')) {
        score += 25;
      }
    }

    if (aiReputation > opponentReputation + 10) {
      // 明显优势：可以使用经济/增益技能
      if (combined.includes('TP+') || combined.includes('抽牌') || combined.includes('手牌')) {
        score += 15;
      }
    }

    // === 资源相关技能 ===
    if (aiTp > 5) {
      // TP充足：高成本技能不扣分
      score += 5;
    } else if (skill.cost && skill.cost >= 3) {
      // TP紧张但技能成本高：降低优先级
      score -= 15;
    }

    if (aiHandSize <= 3) {
      // 手牌少：优先抽牌/资源技能
      if (combined.includes('抽牌') || combined.includes('手牌') || combined.includes('牌库')) {
        score += 20;
      }
    }

    if (opponentHandSize >= 6) {
      // 对手手牌多：对手手牌惩罚技能提升
      if (combined.includes('弃牌') || combined.includes('手牌成本') || combined.includes('对手手牌')) {
        score += 15;
      }
    }

    // === 卡牌类型增益技能 ===
    if (combined.includes('科幻') || combined.includes('校园') || combined.includes('战斗') ||
        combined.includes('奇幻') || combined.includes('日常')) {
      // 类型增益技能：检查手牌中是否有对应类型
      score += 10; // 基础分，假设手牌中通常有该类型
    }

    // === 战斗阶段相关 ===
    if (gameStore.phase === 'action' || gameStore.phase === 'clash') {
      // 战斗阶段：强度增益更有价值
      if (combined.includes('强度+') || combined.includes('点数+')) {
        score += 15;
      }
    }

    // === 话题偏向相关 ===
    if (Math.abs(gameStore.topicBias) >= 5) {
      // 话题偏向明显：相关技能提升
      if (combined.includes('话题') || combined.includes('偏向')) {
        score += 10;
      }
    }

    // === 成本效率 ===
    if (skill.cost) {
      // 成本越低，基础优先级越高
      score += Math.max(0, 5 - skill.cost) * 3;
    } else {
      // 0成本技能优先
      score += 15;
    }

    // === 冷却时间考虑 ===
    if (skill.cooldown && skill.cooldown >= 3) {
      // 长冷却技能：降低一些优先级（因为用完后长时间无法再用）
      score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  },
};
