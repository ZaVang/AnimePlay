import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCollectionStore } from './modules/collectionStore';
import { useGameDataStore } from './gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool } from '@/utils/gachaRotation';
import { type Card, type Rarity } from '@/types/card';

export type DrawnCard = Card & {
    isNew?: boolean;
    isDuplicate?: boolean;
};

export const useGachaStore = defineStore('gacha', () => {
    const lastResult = ref<DrawnCard[]>([]);

    function performGachaLogic(
        gachaType: 'anime' | 'character',
        count: number
    ): DrawnCard[] {
        const collectionStore = useCollectionStore();
        const gameDataStore = useGameDataStore();

        const config = gachaType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
        const pityState = gachaType === 'anime' ? collectionStore.animePityState : collectionStore.characterPityState;
        const allCards = gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
        
        // 获取动态轮换的UP卡池
        let rateUpCards: Card[] = [];
        try {
            const { urId, hrId } = getCurrentUpPool(gachaType);
            rateUpCards = allCards.filter(c => c.id === urId || c.id === hrId);
        } catch (error) {
            console.warn('Failed to get current UP pool, using empty UP pool:', error);
            rateUpCards = [];
        }

        const drawnCards: DrawnCard[] = [];

        const effectiveRarityEntries = Object.entries(config.rarityConfig).filter(
            ([, rarityData]) => rarityData.p > 0
        );
        if (effectiveRarityEntries.length === 0) {
            return [];
        }
        const totalEffectiveProbability = effectiveRarityEntries.reduce(
            (sum, [, rarityData]) => sum + rarityData.p,
            0
        );

        for (let i = 0; i < count; i++) {
            pityState.totalPulls++;
            pityState.pullsSinceLastHR++;
            pityState.pullsSinceLastUR++;

            let drawnCard: Card | undefined;

            // UR保底检查（优先级最高）
            if (config.rateUp.urPityPulls > 0 && pityState.pullsSinceLastUR >= config.rateUp.urPityPulls && rateUpCards.length > 0) {
                pityState.pullsSinceLastUR = 0;
                pityState.pullsSinceLastHR = 0; // UR也会重置HR计数
                // 优先选择UP池中的UR卡
                const upURCards = rateUpCards.filter(c => c.rarity === 'UR');
                if (upURCards.length > 0) {
                    drawnCard = upURCards[Math.floor(Math.random() * upURCards.length)];
                } else {
                    drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
                }
            }
            // HR保底检查
            else if (config.rateUp.hrPityPulls > 0 && pityState.pullsSinceLastHR >= config.rateUp.hrPityPulls && rateUpCards.length > 0) {
                pityState.pullsSinceLastHR = 0;
                // 优先选择UP池中的HR卡
                const upHRCards = rateUpCards.filter(c => c.rarity === 'HR');
                if (upHRCards.length > 0) {
                    drawnCard = upHRCards[Math.floor(Math.random() * upHRCards.length)];
                } else {
                    drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
                }
            } else {
                const rand = Math.random() * totalEffectiveProbability;
                let cumulativeProb = 0;
                let drawnRarity: Rarity = 'N';

                for (const [rarity, rarityData] of effectiveRarityEntries) {
                    cumulativeProb += rarityData.p;
                    if (rand < cumulativeProb) {
                        drawnRarity = rarity as Rarity;
                        break;
                    }
                }

                // UP卡逻辑：UR或HR稀有度时都有概率获得UP卡
                if ((drawnRarity === 'HR' || drawnRarity === 'UR') && rateUpCards.length > 0 && Math.random() < config.rateUp.hrChance) {
                    // 重置相应的pity计数
                    if (drawnRarity === 'UR') {
                        pityState.pullsSinceLastUR = 0;
                        pityState.pullsSinceLastHR = 0; // UR也会重置HR计数
                    } else if (drawnRarity === 'HR') {
                        pityState.pullsSinceLastHR = 0;
                    }

                    // 根据抽到的稀有度选择对应的UP卡
                    const upCardsOfRarity = rateUpCards.filter(c => c.rarity === drawnRarity);
                    if (upCardsOfRarity.length > 0) {
                        drawnCard = upCardsOfRarity[Math.floor(Math.random() * upCardsOfRarity.length)];
                    } else {
                        // 如果没有对应稀有度的UP卡，随机选择一个UP卡
                        drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
                    }
                } else {
                    const pool = allCards.filter(c => c.rarity === drawnRarity);

                    if (pool.length > 0) {
                        drawnCard = pool[Math.floor(Math.random() * pool.length)];
                    } else {
                        // Fallback if no cards of the drawn rarity exist
                        console.warn(`No cards found for rarity "${drawnRarity}" in ${gachaType} pool. Falling back to a random card.`);
                        drawnCard = allCards.length > 0 ? allCards[Math.floor(Math.random() * allCards.length)] : undefined;
                    }

                    // 重置相应的pity计数
                    if (drawnRarity === 'UR') {
                        pityState.pullsSinceLastUR = 0;
                        pityState.pullsSinceLastHR = 0; // UR也会重置HR计数
                    } else if (drawnRarity === 'HR') {
                        pityState.pullsSinceLastHR = 0;
                    }
                }
            }
            if (drawnCard) {
                drawnCards.push({ ...drawnCard });
            }
        }
        
        const highRarities: Rarity[] = ['SSR', 'HR', 'UR'];
        if (count >= config.gacha.guaranteedSSR_Pulls && !drawnCards.some(card => highRarities.includes(card.rarity))) {
            const ssrPool = allCards.filter(c => c.rarity === 'SSR');
            const indexToReplace = drawnCards.findIndex(c => c.rarity === 'N' || c.rarity === 'R' || c.rarity === 'SR') ?? 0;
            if (ssrPool.length > 0 && indexToReplace !== -1) {
                drawnCards[indexToReplace] = { ...ssrPool[Math.floor(Math.random() * ssrPool.length)] };
            }
        }

        return drawnCards;
    }
    
    return {
        lastResult,
        performGachaLogic,
    };
});
