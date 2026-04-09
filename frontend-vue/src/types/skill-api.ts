
import type { PlayerId } from './effects';

/**
 * SkillAPI - 标准化技能操作接口
 * 隔离技能逻辑与 Pinia/System 各类副作用
 */
export interface SkillAPI {
  // --- 资源与手牌操作 ---
  drawCards: (playerId: PlayerId, count: number) => void;
  changeTp: (playerId: PlayerId, amount: number) => void;
  discardCard: (playerId: PlayerId, cardId: string) => void;

  // --- 战斗信息与通知 ---
  addLog: (message: string, type?: 'info' | 'clash' | 'damage' | 'event') => void;
  addNotification: (message: string, type?: 'info' | 'warning') => void;

  // --- 持续效果与数值加成 ---
  addTemporaryBonus: (params: {
    playerId: PlayerId;
    bonusType: 'strength' | 'cost';
    amount: number;
    duration: number;
    description: string;
    cardType?: string;
  }) => void;

  // --- 异步交互系统 ---
  viewOpponentHand: (playerId: PlayerId, options: {
    count: number;
    source: string;
    title: string;
  }) => Promise<void>;

  // --- 环境信息查询 ---
  getOpponentId: (playerId: PlayerId) => PlayerId;
  getPlayerName: (playerId: PlayerId) => string;
}
