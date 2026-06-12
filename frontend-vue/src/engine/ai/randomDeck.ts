/**
 * 随机 AI 卡组生成（费用曲线导向）—— 纯函数（随机源注入）。
 * 原 utils/randomAIDeckGenerator；旧版 generateDiversifiedRandomAIDeck 曾在带 seed 时
 * 全局猴子补丁 Math.random 且不恢复 —— 已由 RNG 注入根除，需要可复现时传 createSeededRng(seed)。
 */
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { RNG } from '../rng';

/** 理想费用曲线（1-7 费，共 30 张）。 */
const IDEAL_MANA_CURVE: Record<number, number> = {
  1: 4,
  2: 6,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
};

export interface GeneratedDeck {
  anime: number[];
  character: number[];
}

/**
 * 生成随机 AI 卡组：
 * 1) 随机选 4 名 UR 角色；2) 角色关联动画卡必入；3) 按理想费用曲线补足；
 * 4) 不足 30 张从低费补、超出从高费删（必需卡不删）。
 */
export function generateRandomAIDeck(
  allAnime: readonly AnimeCard[],
  allCharacters: readonly CharacterCard[],
  rng: RNG,
): GeneratedDeck {
  // 1. 随机选择 4 个 UR 角色
  const urCharacters = allCharacters.filter(char => char.rarity === 'UR');
  const selectedCharacters = rng.shuffle(urCharacters).slice(0, Math.min(4, urCharacters.length));

  // 2. 收集角色关联的动画卡 ID
  const requiredAnimeIds = new Set<number>();
  for (const char of selectedCharacters) {
    if (char.anime_ids && Array.isArray(char.anime_ids)) {
      for (const id of char.anime_ids) {
        if (typeof id === 'number') requiredAnimeIds.add(id);
      }
    }
  }
  const requiredAnimeCards = Array.from(requiredAnimeIds)
    .map(id => allAnime.find(anime => anime.id === id))
    .filter((card): card is AnimeCard => card !== undefined);

  // 3. 构建卡组：先放必需卡
  const deck: number[] = [];
  const currentCurve: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const card of requiredAnimeCards) {
    deck.push(card.id);
    currentCurve[card.cost]++;
  }

  // 4. 按理想曲线补足
  for (let cost = 1; cost <= 7; cost++) {
    const needed = IDEAL_MANA_CURVE[cost] - currentCurve[cost];
    if (needed > 0) {
      const availableCards = allAnime.filter(
        card => card.cost === cost && !requiredAnimeIds.has(card.id),
      );
      for (const card of rng.shuffle(availableCards).slice(0, needed)) {
        deck.push(card.id);
        currentCurve[card.cost]++;
      }
    }
  }

  // 5. 不足 30 张：从低费开始补
  while (deck.length < 30) {
    let filled = false;
    for (let cost = 1; cost <= 7 && deck.length < 30; cost++) {
      const availableCards = allAnime.filter(card => card.cost === cost && !deck.includes(card.id));
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(rng.next() * availableCards.length)];
        deck.push(randomCard.id);
        currentCurve[randomCard.cost]++;
        filled = true;
      }
    }
    if (!filled) break; // 卡池耗尽
  }

  // 6. 超过 30 张：从高费开始删非必需卡
  while (deck.length > 30) {
    let removed = false;
    for (let cost = 7; cost >= 1 && deck.length > 30; cost--) {
      const costCards = deck.filter(id => {
        const card = allAnime.find(a => a.id === id);
        return card && card.cost === cost && !requiredAnimeIds.has(id);
      });
      if (costCards.length > 0) {
        deck.splice(deck.indexOf(costCards[0]), 1);
        currentCurve[cost]--;
        removed = true;
      }
    }
    if (!removed) break; // 只剩必需卡
  }

  return {
    anime: deck,
    character: selectedCharacters.map(c => c.id),
  };
}
