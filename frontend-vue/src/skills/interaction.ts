/**
 * 复杂交互系统 - 处理技能中的复杂交互功能
 * 包括手牌查看、卡牌选择、状态询问等
 */

import type { AnimeCard } from '@/types/card';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { persistentEffects } from './systems';

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
 * 战斗交互 UI 的契约 —— 由 components/battle/InteractionManager.vue 实现并在挂载时注入。
 * 系统层只依赖这个接口，不持有具体组件实例类型。
 */
export interface BattleInteractionUI {
  showHandView(
    cards: AnimeCard[],
    title: string,
    subtitle?: string,
    emptyMessage?: string,
    showTypes?: boolean,
  ): Promise<void>;
  showCardSelection(cards: AnimeCard[], options: CardSelectionOptions): Promise<CardSelectionResult>;
  showTypeSelection(
    availableTypes: string[],
    title: string,
    description?: string,
    allowCancel?: boolean,
    typeDescriptions?: Record<string, string>,
  ): Promise<string | null>;
}

/**
 * 交互系统核心类
 */
export class InteractionSystem {
  private static instance: InteractionSystem;
  private pendingInteraction: Promise<unknown> | null = null;
  private interactionManager: BattleInteractionUI | null = null; // 由 BattleView 挂载时注入

  static getInstance(): InteractionSystem {
    if (!InteractionSystem.instance) {
      InteractionSystem.instance = new InteractionSystem();
    }
    return InteractionSystem.instance;
  }

  /**
   * 设置交互管理器实例 (由战斗界面组件调用)
   */
  setInteractionManager(manager: BattleInteractionUI | null) {
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

    // S8c：存在感消失——目标手牌本回合对查看者隐藏
    if (persistentEffects.hasRestriction(opponentId, 'hand_hidden')) {
      gameStore.addNotification('对方的手牌被「存在感消失」隐藏了！', 'warning');
      historyStore.addLog('查看手牌失败：对方手牌处于隐藏状态。', 'info');
      return [];
    }

    // 根据选项过滤和选择卡牌
    let cardsToShow = opponentHand;
    if (options.filter) {
      cardsToShow = cardsToShow.filter(options.filter);
    }

    // 限制查看数量
    if (options.count < cardsToShow.length) {
      cardsToShow = cardsToShow.slice(0, options.count);
    }

    // S8c：迷路小学生——被查看时藏起其中 1 张
    const oppActive = playerStore[opponentId].characters[playerStore[opponentId].activeCharacterIndex];
    const hasMayoi = (oppActive?.skills || []).some(s => s.effectId === '八九寺真宵_迷路小学生');
    if (hasMayoi && cardsToShow.length > 0) {
      cardsToShow = cardsToShow.slice(0, -1);
      historyStore.addLog('迷路小学生捣乱：有 1 张手牌没被看到。', 'info');
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
    
    // 牌库顶 = 数组尾（drawCards 从尾部 pop）；S8c 修正此前查反方向的 bug
    const playerDeck = playerStore[playerId].deck;
    let cardsToShow = playerDeck.slice(-Math.min(options.count, playerDeck.length)).reverse();

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
   * S8c：从任意给定卡牌列表中选择（交互式技能通用；无 UI 时退化为取前 count 张）。
   */
  async selectFromCards(cards: AnimeCard[], options: CardSelectionOptions): Promise<CardSelectionResult> {
    const available = options.filter ? cards.filter(options.filter) : cards;
    if (this.interactionManager && available.length > 0) {
      return await this.interactionManager.showCardSelection(available, options);
    }
    return { selected: available.slice(0, Math.min(options.count, available.length)), cancelled: false };
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