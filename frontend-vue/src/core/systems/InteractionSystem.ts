/**
 * 复杂交互系统 - 处理技能中的复杂交互功能
 * 包括手牌查看、卡牌选择、状态询问等
 */

import type { AnimeCard } from '@/types/card';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';

export interface CardViewOptions {
  count: number;
  source: 'hand' | 'deck';
  filter?: (card: AnimeCard) => boolean;
  title?: string;
}

export interface CardSelectionOptions {
  count: number;
  source: 'hand' | 'deck' | 'viewed';
  filter?: (card: AnimeCard) => boolean;
  required: boolean;
  title: string;
  description?: string;
}

export interface CardSelectionResult {
  selected: AnimeCard[];
  cancelled: boolean;
}

/**
 * 交互系统核心类
 */
export class InteractionSystem {
  private static instance: InteractionSystem;
  private pendingInteraction: Promise<any> | null = null;
  private interactionManager: any = null; // Will be set by BattleView

  static getInstance(): InteractionSystem {
    if (!InteractionSystem.instance) {
      InteractionSystem.instance = new InteractionSystem();
    }
    return InteractionSystem.instance;
  }

  /**
   * 设置交互管理器实例 (由战斗界面组件调用)
   */
  setInteractionManager(manager: any) {
    this.interactionManager = manager;
  }

  /**
   * 查看对手手牌
   */
  async viewOpponentHand(playerId: 'playerA' | 'playerB', options: CardViewOptions): Promise<AnimeCard[]> {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const gameStore = useGameStore();
    
    const opponentId = playerId === 'playerA' ? 'playerB' : 'playerA';
    const opponentHand = playerStore[opponentId].hand;
    
    // 根据选项过滤和选择卡牌
    let cardsToShow = opponentHand;
    if (options.filter) {
      cardsToShow = cardsToShow.filter(options.filter);
    }
    
    // 限制查看数量
    if (options.count < cardsToShow.length) {
      cardsToShow = cardsToShow.slice(0, options.count);
    }

    // 记录日志
    const playerName = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${playerName} 查看了对手 ${Math.min(options.count, opponentHand.length)} 张手牌。`, 'info');
    
    // 显示手牌查看UI Modal
    if (this.interactionManager) {
      await this.interactionManager.showHandView(
        cardsToShow,
        `对手手牌 (${Math.min(options.count, opponentHand.length)}/${opponentHand.length})`,
        `查看对手的手牌信息`,
        '对手没有手牌'
      );
    } else {
      gameStore.addNotification(`查看对手${cardsToShow.length}张手牌`, 'info');
    }
    
    return cardsToShow;
  }

  /**
   * 查看己方牌库顶部
   */
  async viewDeckTop(playerId: 'playerA' | 'playerB', options: CardViewOptions): Promise<AnimeCard[]> {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    const playerDeck = playerStore[playerId].deck;
    let cardsToShow = playerDeck.slice(0, Math.min(options.count, playerDeck.length));
    
    if (options.filter) {
      cardsToShow = cardsToShow.filter(options.filter);
    }

    const playerName = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${playerName} 查看了牌库顶部 ${cardsToShow.length} 张牌。`, 'info');
    
    return cardsToShow;
  }

  /**
   * 从手牌中选择卡牌
   */
  async selectFromHand(playerId: 'playerA' | 'playerB', options: CardSelectionOptions): Promise<CardSelectionResult> {
    const playerStore = usePlayerStore();
    const hand = playerStore[playerId].hand;
    
    let availableCards = hand;
    if (options.filter) {
      availableCards = availableCards.filter(options.filter);
    }

    // 显示卡牌选择UI Modal
    if (this.interactionManager && availableCards.length > 0) {
      return await this.interactionManager.showCardSelection(availableCards, options);
    } else {
      // 简化结果（无UI时）
      const selectedCount = Math.min(options.count, availableCards.length);
      const selected = availableCards.slice(0, selectedCount);
      
      return {
        selected,
        cancelled: false
      };
    }
  }

  /**
   * 从牌库中选择卡牌
   */
  async selectFromDeck(playerId: 'playerA' | 'playerB', options: CardSelectionOptions): Promise<CardSelectionResult> {
    const playerStore = usePlayerStore();
    const deck = playerStore[playerId].deck;
    
    let availableCards = deck.slice(0, 10); // 限制查看前10张
    if (options.filter) {
      availableCards = availableCards.filter(options.filter);
    }

    // TODO: 显示牌库选择UI Modal
    const selectedCount = Math.min(options.count, availableCards.length);
    const selected = availableCards.slice(0, selectedCount);
    
    return {
      selected,
      cancelled: false
    };
  }

  /**
   * 卡牌交换
   */
  async exchangeCards(playerAId: 'playerA' | 'playerB', playerBId: 'playerA' | 'playerB', count: number = 1): Promise<void> {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    const playerAHand = playerStore[playerAId].hand;
    const playerBHand = playerStore[playerBId].hand;
    
    if (playerAHand.length === 0 || playerBHand.length === 0) {
      return; // 无法交换
    }

    // 简化版本：随机交换第一张牌
    const cardFromA = playerAHand[0];
    const cardFromB = playerBHand[0];
    
    // 从各自手牌中移除
    playerStore.removeCardFromHand(playerAId, cardFromA);
    playerStore.removeCardFromHand(playerBId, cardFromB);
    
    // 添加到对方手牌
    playerStore.addCardToHand(playerAId, cardFromB);
    playerStore.addCardToHand(playerBId, cardFromA);
    
    const nameA = playerAId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    const nameB = playerBId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${nameA} 与 ${nameB} 交换了手牌。`, 'info');
  }

  /**
   * 确认对话框
   */
  async confirm(message: string, title?: string): Promise<boolean> {
    // TODO: 显示确认对话框UI
    // 目前返回true作为默认
    return true;
  }

  /**
   * 选择卡牌类型
   */
  async selectCardType(availableTypes: string[], title: string, description?: string): Promise<string | null> {
    // 显示类型选择UI Modal
    if (this.interactionManager && availableTypes.length > 0) {
      return await this.interactionManager.showTypeSelection(availableTypes, title, description);
    } else {
      // 简化结果（无UI时）
      return availableTypes.length > 0 ? availableTypes[0] : null;
    }
  }

  /**
   * 检查是否有待处理的交互
   */
  hasPendingInteraction(): boolean {
    return this.pendingInteraction !== null;
  }

  /**
   * 等待当前交互完成
   */
  async waitForInteraction(): Promise<void> {
    if (this.pendingInteraction) {
      await this.pendingInteraction;
    }
  }
}