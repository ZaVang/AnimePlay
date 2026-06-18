/**
 * 小游戏注册表（evolution-11：Hub + 每游戏独立路由共享）。
 * 纯元数据，不含组件引用——Hub 用它渲染入口卡片，PlayView 用它做标题/校验。
 * 组件映射在 `views/MiniGamePlayView.vue`（按 id → 组件）。
 */
export type MiniGameId = 'guess' | 'higherlower' | 'quiz' | 'dailychallenge' | 'tasteprofile' | 'tierlist';

export interface MiniGameMeta {
  id: MiniGameId;
  icon: string;
  title: string;
  desc: string;
}

export const MINIGAMES: MiniGameMeta[] = [
  { id: 'guess', icon: '🎭', title: '猜角色', desc: '像素图逐级揭晓，越早猜中分越高' },
  { id: 'higherlower', icon: '🔼', title: '高低牌', desc: '比人气/口碑/年代，连对冲榜' },
  { id: 'quiz', icon: '❓', title: '番剧问答', desc: '4 选 1 知识问答，连答冲分' },
  { id: 'dailychallenge', icon: '🗓️', title: '每日挑战', desc: '全员同题，每天一次，首通领奖' },
  { id: 'tasteprofile', icon: '📊', title: '番剧品味', desc: '勾选看过的番，生成品味画像报告' },
];

export function isMiniGameId(v: unknown): v is MiniGameId {
  return typeof v === 'string' && MINIGAMES.some(g => g.id === v);
}
