import type { AnimeCard } from '@/types/card';

// 将需要带有卡面效果的 anime 卡登记在此映射中：
// key 为 anime 卡 id，value 为该卡的 effects 列表。
// 示例：
//  12345: [
//    { trigger: 'onPlay', effectId: 'DRAW_1' },
//    { trigger: 'beforeResolve', effectId: 'STRENGTH_PLUS_2' },
//  ]

export const animeEffectsMap: Record<number, NonNullable<AnimeCard['effects']>> = {
  // 示例配置：
  847: [
    { trigger: 'onPlay', effectId: 'DRAW_1' },
  ],
  965: [
    { trigger: 'beforeResolve', effectId: 'STRENGTH_PLUS_2' },
  ],
};


