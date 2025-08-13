import type { AnimeCard } from '@/types/card';

// 为不同稀有度提供默认卡面效果（仅在该卡未定义 effects 且未在映射中指定时生效）
export const animeDefaultEffects: Partial<Record<AnimeCard['rarity'], NonNullable<AnimeCard['effects']>>> = {
  R: [
    { trigger: 'onPlay', effectId: 'DRAW_1' },
  ],
  SR: [
    { trigger: 'onPlay', effectId: 'GAIN_TP_1' },
  ],
  SSR: [
    { trigger: 'beforeResolve', effectId: 'STRENGTH_PLUS_1' },
  ],
  HR: [
    { trigger: 'afterResolve', effectId: 'TOPIC_BIAS_PLUS_1' },
  ],
};


