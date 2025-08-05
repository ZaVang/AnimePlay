import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUserStore } from './userStore';
import { useGameDataStore, type Card, type Rarity } from './gameDataStore';

// 从旧的 game_config.js 迁移过来的配置
// TODO: 后续可以考虑将这些配置也通过 API 从后端获取
const GACHA_CONFIG = {
    anime: {
        rarityConfig: {
            'UR': { p: 0.5, dismantleValue: 500 },
            'HR': { p: 2.5, dismantleValue: 100 },
            'SSR': { p: 7, dismantleValue: 50 },
            'SR': { p: 20, dismantleValue: 10 },
            'R': { p: 30, dismantleValue: 2 },
            'N': { p: 40, dismantleValue: 1 } // N卡通常不直接抽出
        },
        rateUp: {
            ids: [],
            hrChance: 0.5,
            pityPulls: 80
        },
        guaranteedSR_Pulls: 10
    },
    character: {
        rarityConfig: {
            'UR': { p: 0.5, dismantleValue: 1000 },
            'HR': { p: 2.5, dismantleValue: 200 },
            'SSR': { p: 7, dismantleValue: 100 },
            'SR': { p: 20, dismantleValue: 20 },
            'R': { p: 30, dismantleValue: 4 },
            'N': { p: 40, dismantleValue: 2 }
        },
        rateUp: {
            ids: [],
            hrChance: 0.5,
            pityPulls: 80
        },
        guaranteedSR_Pulls: 10
    }
};

export interface DrawnCard extends Card {
    isNew?: boolean;
    isDuplicate?: boolean;
}

export const useGachaStore = defineStore('gacha', () => {
    const lastResult = ref<DrawnCard[]>([]);

    function performGachaLogic(
        gachaType: 'anime' | 'character',
        count: number
    ): DrawnCard[] {
        const userStore = useUserStore();
        const gameDataStore = useGameDataStore();
        
        const config = GACHA_CONFIG[gachaType];
        const pityState = gachaType === 'anime' ? userStore.animePityState : userStore.characterPityState;
        const allCards = gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
        const rateUpCards = allCards.filter(c => config.rateUp.ids.includes(c.id));

        const drawnCards: DrawnCard[] = [];

        for (let i = 0; i < count; i++) {
            pityState.totalPulls++;
            pityState.pullsSinceLastHR++;

            let drawnCard: Card | undefined;

            if (config.rateUp.pityPulls > 0 && pityState.pullsSinceLastHR >= config.rateUp.pityPulls && rateUpCards.length > 0) {
                pityState.pullsSinceLastHR = 0;
                drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
            } else {
                const rand = Math.random() * 100;
                let cumulativeProb = 0;
                let drawnRarity: Rarity = 'N';

                for (const rarity in config.rarityConfig) {
                    cumulativeProb += (config.rarityConfig as any)[rarity].p;
                    if (rand < cumulativeProb) {
                        drawnRarity = rarity as Rarity;
                        break;
                    }
                }

                if (drawnRarity === 'HR' && rateUpCards.length > 0 && Math.random() < config.rateUp.hrChance) {
                    pityState.pullsSinceLastHR = 0; // Reset pity on getting UP HR
                    drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
                } else {
                    const pool = allCards.filter(c => c.rarity === drawnRarity);

                    if (pool.length > 0) {
                        drawnCard = pool[Math.floor(Math.random() * pool.length)];
                    } else {
                        // Fallback if no cards of the drawn rarity exist
                        console.warn(`No cards found for rarity "${drawnRarity}" in ${gachaType} pool. Falling back to a random card.`);
                        drawnCard = allCards.length > 0 ? allCards[Math.floor(Math.random() * allCards.length)] : undefined;
                    }
                    
                    if (drawnRarity === 'HR' || drawnRarity === 'UR') {
                        pityState.pullsSinceLastHR = 0;
                    }
                }
            }
            if (drawnCard) {
                drawnCards.push({ ...drawnCard });
            }
        }
        
        const highRarities: Rarity[] = ['SR', 'SSR', 'HR', 'UR'];
        if (count >= config.guaranteedSR_Pulls && !drawnCards.some(card => highRarities.includes(card.rarity))) {
            const srPool = allCards.filter(c => c.rarity === 'SR');
            const indexToReplace = drawnCards.findIndex(c => c.rarity === 'N' || c.rarity === 'R') ?? 0;
            if (srPool.length > 0 && indexToReplace !== -1) {
                drawnCards[indexToReplace] = { ...srPool[Math.floor(Math.random() * srPool.length)] };
            }
        }

        return drawnCards;
    }
    
    return {
        lastResult,
        performGachaLogic,
    };
});
