import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGameDataStore } from './gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool } from '@/utils/gachaRotation';
import { type Card } from '@/types/card';
import { performDraws, createPityState, type PityState, defaultRng } from '@/engine';

export type DrawnCard = Card & {
    isNew?: boolean;
    isDuplicate?: boolean;
};

/**
 * 抽卡 store —— 薄编排层：持有保底状态 + 调 engine/gacha。
 * 保底状态归属 gacha 域（S3 解开 userStore↔gachaStore 循环依赖）；
 * userStore 存档时从这里读写 animePity/characterPity。
 */
export const useGachaStore = defineStore('gacha', () => {
    const lastResult = ref<DrawnCard[]>([]);

    // UP 保底状态（进存档，序列化键沿用 animePity / characterPity）
    const animePity = ref<PityState>(createPityState());
    const characterPity = ref<PityState>(createPityState());

    function resetPity() {
        animePity.value = createPityState();
        characterPity.value = createPityState();
    }

    function performGachaLogic(
        gachaType: 'anime' | 'character',
        count: number
    ): DrawnCard[] {
        const gameDataStore = useGameDataStore();

        const config = gachaType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
        const pityRef = gachaType === 'anime' ? animePity : characterPity;
        const allCards = gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;

        // 获取动态轮换的 UP 卡池（失败则按无 UP 池抽取）
        let rateUpCards: Card[] = [];
        try {
            const { urId, hrId } = getCurrentUpPool(gachaType);
            rateUpCards = allCards.filter(c => c.id === urId || c.id === hrId);
        } catch (error) {
            console.warn('Failed to get current UP pool, using empty UP pool:', error);
            rateUpCards = [];
        }

        const result = performDraws({
            count,
            allCards,
            rateUpCards,
            pity: pityRef.value,
            config: {
                rarityConfig: config.rarityConfig,
                rateUp: config.rateUp,
                guaranteedSSRPulls: config.gacha.guaranteedSSR_Pulls,
            },
            rng: defaultRng,
        });

        pityRef.value = result.pity;
        return result.cards;
    }

    return {
        lastResult,
        animePity,
        characterPity,
        resetPity,
        performGachaLogic,
    };
});
