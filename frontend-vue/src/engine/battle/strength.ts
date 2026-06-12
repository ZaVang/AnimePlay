/**
 * 卡牌最终强度的组成规则 —— 纯函数。
 * 持续效果加成等外部状态由调用方查询后以数字传入。
 */
import type { Card, CharacterCard } from '@/types';

/**
 * 被动光环强度加成：扫描场上所有角色的「被动光环」技能。
 * 目前唯一实装规则：AURA_GENRE_EXPERT —— 打出「日常」标签卡 +1 强度。
 */
export function auraStrengthBonus(card: Card, allCharacters: readonly CharacterCard[]): number {
  // S8c：NEXT_CARD_ANY_TYPE / 魔法精通 把卡标记为任意类型——光环的类型判定按通配处理
  // （该标志此前零消费者，S8c 起在此真实生效）
  const anyType = (card as Card & { __treatedAsAnyType?: boolean }).__treatedAsAnyType === true;
  let bonus = 0;
  for (const character of allCharacters) {
    if (!character.skills) continue;
    for (const skill of character.skills) {
      if (skill.type !== '被动光环') continue;
      if (skill.id === 'AURA_GENRE_EXPERT' && (anyType || card.synergy_tags?.includes('日常'))) {
        bonus += 1;
      }
    }
  }
  return bonus;
}

/** 最终强度 = 卡面点数 + 各项加成；未出卡为 0（加成不生效）。 */
export function finalStrength(card: Card | undefined, bonuses: readonly number[] = []): number {
  if (!card) return 0;
  return (card.points || 0) + bonuses.reduce((sum, b) => sum + b, 0);
}
