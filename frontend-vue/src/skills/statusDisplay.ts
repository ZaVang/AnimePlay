/**
 * 把 persistentEffects 追踪器里玩家身上的隐藏状态（护盾/强制/限制/临时加成）
 * 翻译成可读的「状态芯片」，供对战 UI 常驻展示——让原本只事后弹通知的机制变成可观察的当前状态。
 * 纯读取：调用方需在响应式上下文里自行挂依赖（如战斗日志长度/回合数）以触发重算。
 */
import type { PlayerId } from '@/types/battle';
import { persistentEffects } from './systems';

export type StatusTone = 'buff' | 'debuff' | 'neutral';

export interface StatusChip {
  icon: string;
  label: string;
  tone: StatusTone;
}

/** 限制类型 → 展示映射（data 携带附加字段时拼进标签）。 */
function describeRestriction(type: string, data: unknown): StatusChip | null {
  const d = (data ?? {}) as Record<string, unknown>;
  switch (type) {
    case 'effect_shield':
      return { icon: '🛡', label: '效果护盾·免疫敌对削弱/控制', tone: 'buff' };
    case 'reputation_shield':
      return { icon: '🛡', label: '声望护盾·本回合声望免伤', tone: 'buff' };
    case 'card_target_shield':
      return { icon: '🛡', label: `${d.cardType ?? ''}卡防点名`.trim(), tone: 'buff' };
    case 'extra_turn':
      return { icon: '⏱', label: '额外回合', tone: 'buff' };
    case 'victory_tp':
      return { icon: '🏆', label: `胜利夺取${d.amount ?? 1}TP`, tone: 'buff' };
    case 'perfectionist':
      return { icon: '🎯', label: '优势对撞额外+1强度', tone: 'buff' };
    case 'harsh_extra':
      return { icon: '🗯', label: '辛辣点评额外+强度', tone: 'buff' };
    case 'friendly_bias_bonus':
      return { icon: '👑', label: '友好安利议题额外+1', tone: 'buff' };
    case 'hand_hidden':
      return { icon: '🙈', label: '手牌对对手隐藏', tone: 'buff' };
    case 'forced_action':
      return d.actionType === 'harsh_only'
        ? { icon: '🔒', label: '被强制：只能辛辣点评', tone: 'debuff' }
        : { icon: '🔒', label: '被强制：只能友好安利', tone: 'debuff' };
    case 'forced_card_type':
      return { icon: '🔒', label: `被强制出${d.type ?? '指定'}类卡`, tone: 'debuff' };
    case 'skill_disabled':
      return { icon: '🚫', label: d.skillId === '*' ? '技能全部被禁用' : '技能被禁用', tone: 'debuff' };
    case 'harsh_penalty':
      return { icon: '🗯', label: `下次辛辣点评-${d.amount ?? 0}强度`, tone: 'debuff' };
    case 'tp_regen_penalty':
      return { icon: '⚡', label: `下回合TP恢复-${d.amount ?? 0}`, tone: 'debuff' };
    case 'play_limit':
      return { icon: '✋', label: `本回合限出${d.max ?? 1}张牌`, tone: 'neutral' };
    // 纯连击驱动/内部计数类，无需打扰玩家
    case 'music_combo_cost':
    case 'daily_combo_strength':
      return null;
    default:
      return { icon: '•', label: type, tone: 'neutral' };
  }
}

/** 汇总某玩家当前所有可展示状态芯片（限制 + 临时加成 + 持续效果）。 */
export function describePlayerStatus(playerId: PlayerId): StatusChip[] {
  const chips: StatusChip[] = [];

  for (const r of persistentEffects.getActiveRestrictions(playerId)) {
    const chip = describeRestriction(r.type, r.data);
    if (chip) chips.push(chip);
  }

  for (const b of persistentEffects.getActiveBonuses(playerId)) {
    if (b.bonusType === 'strength') {
      chips.push({ icon: '⚔', label: b.description, tone: b.amount >= 0 ? 'buff' : 'debuff' });
    } else if (b.bonusType === 'cost') {
      // 正 amount = 减费（增益）；负 amount = 加费（敌对削弱）
      chips.push({ icon: '💰', label: b.description, tone: b.amount >= 0 ? 'buff' : 'debuff' });
    } else {
      chips.push({ icon: '✨', label: b.description, tone: 'buff' });
    }
  }

  for (const e of persistentEffects.getActiveEffects(playerId)) {
    chips.push({ icon: '✨', label: e.description, tone: 'neutral' });
  }

  return chips;
}
