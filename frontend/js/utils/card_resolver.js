// frontend/js/utils/card_resolver.js - 通用卡牌解析器
window.Game = window.Game || {};

Game.CardResolver = (function() {
    
    // 根据ID和类型获取卡牌详情
    function getCardById(id, type) {
        if (!id || !type) {
            console.warn('CardResolver: missing id or type');
            return null;
        }

        let allCards = [];
        
        try {
            if (type === 'anime') {
                if (Game.AnimeGacha && typeof Game.AnimeGacha.getAllAnimes === 'function') {
                    allCards = Game.AnimeGacha.getAllAnimes();
                } else {
                    console.warn('CardResolver: AnimeGacha not available');
                    return null;
                }
            } else if (type === 'character') {
                if (Game.CharacterGacha && typeof Game.CharacterGacha.getAllCharacters === 'function') {
                    allCards = Game.CharacterGacha.getAllCharacters();
                } else {
                    console.warn('CardResolver: CharacterGacha not available');
                    return null;
                }
            } else {
                console.warn('CardResolver: unknown type', type);
                return null;
            }
        } catch (error) {
            console.error('CardResolver: error getting cards', error);
            return null;
        }

        // 查找对应ID的卡牌
        const card = allCards.find(c => c.id == id);
        if (!card) {
            console.warn(`CardResolver: card not found for id ${id} type ${type}`);
            return null;
        }

        return card;
    }

    // 根据ID构建完整的卡牌数据对象（包含玩家收藏信息）
    function buildCardData(id, type, count = 1) {
        const card = getCardById(id, type);
        if (!card) {
            return null;
        }

        // 获取玩家收藏中的实际数量
        let actualCount = count;
        try {
            if (type === 'anime') {
                const collection = Game.Player.getAnimeCollection();
                const collectionData = collection.get(id);
                if (collectionData) {
                    actualCount = collectionData.count;
                }
            } else if (type === 'character') {
                const collection = Game.Player.getCharacterCollection();
                const collectionData = collection.get(id);
                if (collectionData) {
                    actualCount = collectionData.count;
                }
            }
        } catch (error) {
            console.warn('CardResolver: error getting collection count', error);
        }

        return {
            id: card.id,
            [type]: card,
            count: actualCount
        };
    }

    // 批量解析卡牌数据
    function resolveCards(cardIds, type) {
        if (!Array.isArray(cardIds)) {
            console.warn('CardResolver: cardIds must be an array');
            return [];
        }

        return cardIds.map(cardId => {
            // 支持不同格式的输入
            let id, count = 1;
            
            if (typeof cardId === 'object') {
                // 如果是对象格式 {id: xxx, count: xxx} 或 {id: xxx}
                id = cardId.id;
                count = cardId.count || 1;
            } else {
                // 如果是纯ID
                id = cardId;
            }

            return buildCardData(id, type, count);
        }).filter(Boolean); // 过滤掉null值
    }

    // 从完整卡牌数据中提取简化存储格式
    function extractStorageFormat(cardDataArray, type) {
        if (!Array.isArray(cardDataArray)) {
            return [];
        }

        return cardDataArray.map(cardData => {
            // 支持新旧格式的兼容
            if (cardData && cardData[type] && cardData[type].id) {
                // 新格式或完整格式
                return {
                    id: cardData[type].id,
                    count: cardData.count || 1
                };
            } else if (cardData && cardData.id) {
                // 已经是简化格式
                return {
                    id: cardData.id,
                    count: cardData.count || 1
                };
            } else {
                console.warn('CardResolver: unknown card data format', cardData);
                return null;
            }
        }).filter(Boolean);
    }

    // 检测并迁移旧格式数据
    function migrateOldFormat(data, type) {
        if (!data || !Array.isArray(data)) {
            return [];
        }

        // 检查是否是旧格式（包含完整卡牌信息）
        const hasOldFormat = data.some(item => 
            item && item[type] && typeof item[type] === 'object' && item[type].name
        );

        if (hasOldFormat) {
            console.log(`CardResolver: migrating old format data for ${type}`);
            return extractStorageFormat(data, type);
        }

        // 如果已经是新格式，直接返回
        return data;
    }

    // 验证卡牌ID是否存在
    function validateCardId(id, type) {
        const card = getCardById(id, type);
        return card !== null;
    }

    // 获取卡牌的基本信息（不包含收藏数量）
    function getCardInfo(id, type) {
        return getCardById(id, type);
    }

    // 公共接口
    return {
        // 核心方法
        getCardById,
        buildCardData,
        resolveCards,
        
        // 存储相关
        extractStorageFormat,
        migrateOldFormat,
        
        // 工具方法
        validateCardId,
        getCardInfo,

        // 便捷方法
        resolveAnimeCards: (cardIds) => resolveCards(cardIds, 'anime'),
        resolveCharacterCards: (cardIds) => resolveCards(cardIds, 'character'),
        
        // 存储格式转换
        animeToStorage: (cardDataArray) => extractStorageFormat(cardDataArray, 'anime'),
        characterToStorage: (cardDataArray) => extractStorageFormat(cardDataArray, 'character'),
        
        // 测试和调试方法
        testIntegration: function() {
            console.group('CardResolver Integration Test');
            
            try {
                // 测试获取动画卡片
                if (Game.AnimeGacha && Game.AnimeGacha.getAllAnimes) {
                    const animes = Game.AnimeGacha.getAllAnimes();
                    if (animes.length > 0) {
                        const testAnime = animes[0];
                        const resolved = getCardById(testAnime.id, 'anime');
                        console.log('✅ Anime card resolution:', resolved ? 'SUCCESS' : 'FAILED');
                        
                        // 测试存储格式转换
                        const testData = [{ anime: testAnime, count: 1 }];
                        const storage = extractStorageFormat(testData, 'anime');
                        const restored = resolveCards(storage, 'anime');
                        console.log('✅ Anime storage optimization:', storage.length > 0 && restored.length > 0 ? 'SUCCESS' : 'FAILED');
                    }
                }
                
                // 测试获取角色卡片
                if (Game.CharacterGacha && Game.CharacterGacha.getAllCharacters) {
                    const characters = Game.CharacterGacha.getAllCharacters();
                    if (characters.length > 0) {
                        const testCharacter = characters[0];
                        const resolved = getCardById(testCharacter.id, 'character');
                        console.log('✅ Character card resolution:', resolved ? 'SUCCESS' : 'FAILED');
                        
                        // 测试存储格式转换
                        const testData = [{ character: testCharacter, count: 1 }];
                        const storage = extractStorageFormat(testData, 'character');
                        const restored = resolveCards(storage, 'character');
                        console.log('✅ Character storage optimization:', storage.length > 0 && restored.length > 0 ? 'SUCCESS' : 'FAILED');
                    }
                }
                
                console.log('🎉 All CardResolver integration tests completed!');
            } catch (error) {
                console.error('❌ Integration test failed:', error);
            }
            
            console.groupEnd();
        }
    };
})();