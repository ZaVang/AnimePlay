import type { Card, AnimeCard, CharacterCard } from '@/types/card';

// 类型守卫：检查是否为动画卡片
export function isAnimeCard(card: Card): card is AnimeCard {
  return 'cost' in card && typeof (card as AnimeCard).cost === 'number';
}

// 类型守卫：检查是否为角色卡片
export function isCharacterCard(card: Card): card is CharacterCard {
  return 'activeSkillId' in card && 'passiveSkillId' in card;
}

// 扩展卡片类型，支持临时状态标记
export type ExtendedCard = Card & {
  __treatedAsAnyType?: boolean;
}

// 类型守卫：检查是否为扩展卡片（带临时状态）
export function isExtendedCard(card: Card): card is ExtendedCard {
  return '__treatedAsAnyType' in card;
}

// 安全地设置卡片的临时状态
export function setCardTreatedAsAnyType(card: Card): ExtendedCard {
  (card as ExtendedCard).__treatedAsAnyType = true;
  return card as ExtendedCard;
}

// 安全地检查卡片是否被视为任意类型
export function isCardTreatedAsAnyType(card: Card): boolean {
  return (card as ExtendedCard).__treatedAsAnyType === true;
}