import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { BattleController } from '../battle/BattleController';
import { useSettingsStore } from '@/stores/settings';

export const AIController = {
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
    setTimeout(() => {
      // AI finds all cards it can afford to play
      const playableCards = aiPlayer.hand.filter(card => (card.cost || 0) <= aiPlayer.tp);

      if (playableCards.length > 0) {
        // 智能卡牌选择：优先选择高强度卡牌
        const cardToPlay = this.selectBestCard(playableCards, aiPlayer);
        
        // 智能出牌风格选择：根据TP和卡牌强度决定
        const style = this.selectBattleStyle(cardToPlay, aiPlayer);
        
        historyStore.addLog(`${aiPlayer.name} 打出了 [${cardToPlay.name}]。`, 'clash');
        BattleController.initiateClash(cardToPlay.id, style);
      } else {
        // If no card can be played, try using character skills first
        if (!this.tryUseCharacterSkill(aiPlayer)) {
          historyStore.addLog(`${aiPlayer.name} 选择结束回合。`, 'event');
          BattleController.endTurn();
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
  tryUseCharacterSkill(aiPlayer: any): boolean {
    // TODO: 实现AI角色技能使用逻辑
    // 暂时返回false，让AI结束回合
    return false;
  },
};
