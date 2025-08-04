// frontend/js/character_gacha.js
window.Game = window.Game || {};

Game.CharacterGacha = (function() {
    
    let allCharacters = [];
    let isInitialized = false;

    // 角色抽卡配置 (统一结构)
    const characterGachaConfig = {
        itemType: '角色',
        itemKey: 'character',
        rarityConfig: window.GAME_CONFIG.characterSystem.rarityConfig,
        gacha: window.GAME_CONFIG.characterSystem.gacha,
        rateUp: window.GAME_CONFIG.characterSystem.rateUp
    };

    // Load character data from backend
    async function _loadCharacterData() {
        try {
            const response = await fetch('/data/characters/all_cards.json');
            if (response.ok) {
                allCharacters = await response.json();
                console.log(`Loaded ${allCharacters.length} characters for gacha system`);
                _updatePlayerCharacterCollection();
                return true;
            } else {
                throw new Error('Failed to fetch character data');
            }
        } catch (error) {
            console.error('Failed to load character data:', error);
            allCharacters = [];
            return false;
        }
    }

    // Update player character collection with proper character data
    function _updatePlayerCharacterCollection() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        let updatedCount = 0;
        
        playerCharacterCollection.forEach((characterData, Id) => {
            const actualCharacter = allCharacters.find(c => c.id == Id);
            if (actualCharacter) {
                characterData.character = actualCharacter;
                updatedCount++;
            } else {
                console.warn(`Character not found for ID: ${Id}`);
            }
        });
        
        console.log(`Updated ${updatedCount} characters in player collection`);
        document.dispatchEvent(new CustomEvent('characterDataReady'));
    }

    // Get UP characters from the current UP pool
    function _getUpCharacters() {
        const { rateUp } = window.GAME_CONFIG.characterSystem;
        if (!rateUp.ids || rateUp.ids.length === 0) {
            return [];
        }
        return allCharacters.filter(c => rateUp.ids.includes(c.id));
    }

    // Set UP characters for the character gacha
    function _setUpCharacters(Ids) {
        window.GAME_CONFIG.characterSystem.rateUp.ids = Ids || [];
        console.log('Character UP pool updated:', Ids);
    }


    // Handle character gacha draw
    function _handleCharacterDraw(count) {
        Game.BaseGacha.performGacha(
            characterGachaConfig,
            count,
            'characterGachaTickets',
            window.GAME_CONFIG.gameplay.characterGachaEXP,
            () => allCharacters,
            _getUpCharacters,
            Game.Player.getCharacterPityState,
            Game.Player.getCharacterCollection,
            Game.Player.getCharacterGachaHistory,
            _renderCharacterGachaResult
        );
    }

    function getDismantleValue(rarity) {
        return Game.BaseGacha.getDismantleValue(rarity, window.GAME_CONFIG.characterSystem.rarityConfig);
    }

    // Render character gacha result
    function _renderCharacterGachaResult(drawnCharacters) {
        const { ResultContainer, ResultModal } = Game.UI.elements.characterGacha;
        
        ResultContainer.innerHTML = '';
        drawnCharacters.forEach(character => {
            const characterData = Game.Player.getCharacterCollection().get(character.id) || { character, count: 1 };
            const characterEl = Game.UI.createCharacterCardElement(characterData, 'character-gacha-result', { 
                isDuplicate: character.isDuplicate,
                isNew: character.isNew 
            });
            ResultContainer.appendChild(characterEl);
        });
        
        ResultModal.classList.remove('hidden');
    }

    // Show character gacha rates
    function _showCharacterGachaRates() {
        const { RatesContent, RatesModal } = Game.UI.elements.characterGacha;
        Game.BaseGacha.showRates(characterGachaConfig, RatesContent, RatesModal);
    }
    
    function _renderShop() {
        const { shopItems } = Game.UI.elements.characterGacha;
        if (!shopItems) return;

        const playerCollection = Game.Player.getCharacterCollection();
        shopItems.innerHTML = '';

        window.GAME_CONFIG.characterSystem.shop.items.forEach(item => {
            const character = allCharacters.find(c => c.id === item.Id);
            if (!character) return;

            const isOwned = playerCollection.has(character.id);
            const { c: rarityColor } = window.GAME_CONFIG.characterSystem.rarityConfig[character.rarity] || {};
            
            const shopItem = document.createElement('div');
            shopItem.className = 'bg-gray-50 rounded-lg shadow-md p-4 flex flex-col items-center';
            shopItem.innerHTML = `
                <img src="${character.image_path}" class="w-24 h-36 object-cover rounded-md mb-2" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <p class="font-bold text-center">${character.name}</p>
                <p class="text-sm ${rarityColor} text-white px-2 py-0.5 rounded-full my-1">${character.rarity}</p>
                <p class="font-bold text-lg text-emerald-600">${item.cost.toLocaleString()} 知识点</p>
                <button class="buy-btn mt-2 w-full bg-pink-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-pink-700 disabled:bg-gray-400" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '兑换'}
                </button>
            `;
            if (!isOwned) {
                shopItem.querySelector('.buy-btn').addEventListener('click', () => _buyFromShop(item, character));
            }
            shopItems.appendChild(shopItem);
        });
    }

    function _buyFromShop(item, character) {
        const playerState = Game.Player.getState();
        if (playerState.knowledgePoints < item.cost) {
            alert("知识点不足！");
            return;
        }
        if (Game.Player.getCharacterCollection().has(character.id)) {
            alert("你已经拥有该角色了！");
            return;
        }

        if (confirm(`确定要花费 ${item.cost} 知识点兑换 ${character.name} 吗？`)) {
            playerState.knowledgePoints -= item.cost;
            Game.Player.getCharacterCollection().set(character.id, { character, count: 1 });
            alert("兑换成功！");
            Game.UI.renderPlayerState();
            _renderShop();
            Game.Player.saveState();
        }
    }

    // Switch character gacha tabs
    function _switchCharacterGachaTab(tabName, type = "character") {
        Game.UI.switchGachaTab(tabName, type);
    }

    return {
        init: async function() {
            console.log("Initializing Character Gacha system...");
            
            await _loadCharacterData();
            
            const { characterGacha } = Game.UI.elements;
            if (characterGacha) {
                characterGacha.singleBtn?.addEventListener('click', () => _handleCharacterDraw(1));
                characterGacha.multiBtn?.addEventListener('click', () => _handleCharacterDraw(10));
                characterGacha.showRatesBtn?.addEventListener('click', _showCharacterGachaRates);
                
                characterGacha.tabs?.pool?.addEventListener('click', (e) => { e.preventDefault(); _switchCharacterGachaTab('pool', 'character'); });
                characterGacha.tabs?.history?.addEventListener('click', (e) => { e.preventDefault(); _switchCharacterGachaTab('history', 'character'); });
                characterGacha.tabs?.shop?.addEventListener('click', (e) => { e.preventDefault(); _switchCharacterGachaTab('shop', 'character'); });
                
                characterGacha.closeResultBtn?.addEventListener('click', () => characterGacha.ResultModal.classList.add('hidden'));
                characterGacha.closeRatesBtn?.addEventListener('click', () => characterGacha.RatesModal.classList.add('hidden'));
                characterGacha.closeDetailBtn?.addEventListener('click', () => characterGacha.DetailModal.classList.add('hidden'));
            }
            
            document.addEventListener('playerLoggedIn', () => {
                console.log('Player logged in, updating character collection...');
                _updatePlayerCharacterCollection();
            });
            
            isInitialized = true;
            console.log("Character Gacha system initialized successfully.");
        },
        
        renderUI: function() {
            const upCharacters = _getUpCharacters();
            const { UpBanner } = Game.UI.elements.characterGacha || {};
            
            if (UpBanner) {
                if (upCharacters.length === 0) {
                    UpBanner.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center text-pink-600">角色邂逅</h3>
                        <div class="text-center">
                            <p class="text-gray-600 mb-2">与你喜爱的动画角色邂逅！</p>
                            <p class="text-sm text-gray-500">• 高稀有度角色拥有特殊光效</p>
                            <p class="text-sm text-gray-500">• 十连必出SR级以上角色</p>
                        </div>
                    `;
                } else {
                    const { rateUp } = window.GAME_CONFIG.characterSystem;
                    let characterHtml = upCharacters.map(character => `
                        <div class="w-24 flex-shrink-0">
                            <img src="${character.image_path}" class="w-full h-auto rounded-md shadow-lg" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=角色头像';">
                            <p class="text-center text-xs font-bold truncate mt-1">${character.name}</p>
                        </div>
                    `).join('');
                    
                    UpBanner.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center text-pink-600">当前UP角色池</h3>
                        <div class="flex items-center justify-center gap-6 flex-wrap">
                            ${characterHtml}
                            <div class="text-gray-600 text-sm">
                                <p>• HR邂逅时，有<span class="font-bold text-pink-600">${rateUp.hrChance * 100}%</span>概率为UP！</p>
                                <p>• 累计<span class="font-bold text-pink-600">${rateUp.pityPulls}</span>次邂逅必定获得UP之一！</p>
                                <p>• 十连邂逅必定获得<span class="font-bold text-pink-600">SR</span>及以上角色！</p>
                            </div>
                        </div>
                    `;
                }
            }
            _renderShop();
        },
        getAllCharacters: () => allCharacters,
        getDismantleValue: getDismantleValue,
        isInitialized: () => isInitialized,
        setUpCharacters: _setUpCharacters,
        getUpCharacters: _getUpCharacters
    };
})();