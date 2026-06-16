/**
 * 图鉴里程碑静态阈值表（evolution-1）。
 * 只放不变的阈值与奖励元数据；已领里程碑 id 在 stores/codex.ts（进存档 v6）。
 * 完成度本身是纯派生（遍历全量卡 + collection 计数判定），不进存档。
 */
import type { CurrencyKey } from '@/types/player';
import type { Rarity } from '@/types/card';

export type CodexDomain = 'anime' | 'character';

/**
 * 里程碑判定维度：
 *  - 'ownedCount'：某域拥有种类数 ≥ threshold；
 *  - 'rarityComplete'：某域某稀有度全部集齐（owned === total，total 从数据派生）。
 */
export interface CodexMilestoneDef {
  id: string;
  domain: CodexDomain;
  title: string;
  description: string;
  kind: 'ownedCount' | 'rarityComplete';
  /** kind=ownedCount 时生效：拥有种类数阈值。 */
  threshold?: number;
  /** kind=rarityComplete 时生效：需集齐的稀有度。 */
  rarity?: Rarity;
  reward: { currency: CurrencyKey; amount: number };
}

export const CODEX_MILESTONES: CodexMilestoneDef[] = [
  // 角色收集种类数
  { id: 'char_owned_50', domain: 'character', title: '初识众生', description: '收集 50 种角色', kind: 'ownedCount', threshold: 50, reward: { currency: 'knowledgePoints', amount: 100 } },
  { id: 'char_owned_100', domain: 'character', title: '群英荟萃', description: '收集 100 种角色', kind: 'ownedCount', threshold: 100, reward: { currency: 'characterGachaTickets', amount: 3 } },
  { id: 'char_owned_300', domain: 'character', title: '万象图鉴', description: '收集 300 种角色', kind: 'ownedCount', threshold: 300, reward: { currency: 'characterGachaTickets', amount: 5 } },
  { id: 'char_owned_500', domain: 'character', title: '角色大成', description: '收集 500 种角色', kind: 'ownedCount', threshold: 500, reward: { currency: 'knowledgePoints', amount: 1000 } },
  // 动画收集种类数
  { id: 'anime_owned_50', domain: 'anime', title: '番剧入门', description: '收集 50 种动画', kind: 'ownedCount', threshold: 50, reward: { currency: 'knowledgePoints', amount: 100 } },
  { id: 'anime_owned_100', domain: 'anime', title: '番剧达人', description: '收集 100 种动画', kind: 'ownedCount', threshold: 100, reward: { currency: 'animeGachaTickets', amount: 3 } },
  { id: 'anime_owned_300', domain: 'anime', title: '番剧大师', description: '收集 300 种动画', kind: 'ownedCount', threshold: 300, reward: { currency: 'animeGachaTickets', amount: 5 } },
  // 稀有度集齐
  { id: 'char_ur_complete', domain: 'character', title: '集齐 UR 角色', description: '集齐全部 UR 角色', kind: 'rarityComplete', rarity: 'UR', reward: { currency: 'knowledgePoints', amount: 500 } },
  { id: 'anime_ur_complete', domain: 'anime', title: '集齐 UR 动画', description: '集齐全部 UR 动画', kind: 'rarityComplete', rarity: 'UR', reward: { currency: 'knowledgePoints', amount: 500 } },
];

export function getCodexMilestoneById(id: string): CodexMilestoneDef | undefined {
  return CODEX_MILESTONES.find(m => m.id === id);
}
