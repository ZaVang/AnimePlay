/**
 * 出牌前 / 对撞中的「最终强度预览」——与 battleFlow.sideStrength 同口径
 * （卡面 points + 被动光环 + 持续效果加成），但**非消费**：用 hasAuraSuppression
 * 查询而非 consumeAuraSuppression，避免预判时提前消费义体强化等一次性标记。
 *
 * 注意：不含 battleFlow.applyClashStrengthMods 的对撞期专属修正（完美主义/辛辣额外/
 * 辛辣惩罚等），故预览值在有这类技能时与最终结算可能略有出入——结算后以 clashInfo 的
 * 权威 attackerStrength/defenderStrength 为准。
 */
import { usePlayerStore } from '@/stores/battle';
import { auraStrengthBonus } from '@/engine';
import { statusEffects, persistentEffects } from './systems';
import type { AnimeCard } from '@/types/card';
import type { PlayerId } from '@/types/battle';

export interface StrengthBreakdown {
  /** 卡面点数 */
  base: number;
  /** 光环 + 持续效果加成合计（可负） */
  bonus: number;
  /** 最终强度 = base + bonus */
  total: number;
}

export function previewSideStrength(playerId: PlayerId, card: AnimeCard | null | undefined): StrengthBreakdown {
  if (!card) return { base: 0, bonus: 0, total: 0 };
  const playerStore = usePlayerStore();
  const allCharacters = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
  const aura = statusEffects.hasAuraSuppression(playerId) ? 0 : auraStrengthBonus(card, allCharacters);
  const persistent = persistentEffects.getStrengthBonus(playerId, card.synergy_tags || [], card.id);
  const base = card.points || 0;
  const bonus = aura + persistent;
  return { base, bonus, total: base + bonus };
}
