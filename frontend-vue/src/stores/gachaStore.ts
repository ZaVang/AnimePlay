import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCollectionStore } from './modules/collectionStore';
import { useGameDataStore } from './gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool } from '@/utils/gachaRotation';
import { type Card, type Rarity } from '@/types/card';
import { GachaEngine } from '@/core/calculation/GachaEngine';

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
        
        let rateUpCards: Card[] = [];
        try {
            const { urId, hrId } = getCurrentUpPool(gachaType);
            rateUpCards = allCards.filter(c => c.id === urId || c.id === hrId);
        } catch (error) {
            console.warn('Failed to get current UP pool:', error);
            rateUpCards = [];
        }

        // 调用抽卡引擎执行逻辑
        const result = GachaEngine.execute(
            config as any,
            { ...pityState },
            allCards as any,
            rateUpCards as any,
            count
        );

        // 同步保底状态回 CollectionStore
        if (gachaType === 'anime') {
            collectionStore.animePityState = { ...result.newPityState };
        } else {
            collectionStore.characterPityState = { ...result.newPityState };
        }

        return result.cards.map(card => ({ ...card } as DrawnCard));
    }
    
    return {
        lastResult,
        performGachaLogic,
    };
});
