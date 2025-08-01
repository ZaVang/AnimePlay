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
            // Load from processed all_cards.json file
            const response = await fetch('/data/characters/all_cards.json');
            if (response.ok) {
                const characters = await response.json();
                // Limit to first 200 characters for performance while maintaining variety
                // allCharacters = characters.slice(0, 200);
                allCharacters = characters;
                
                console.log(`Loaded ${allCharacters.length} characters for gacha system`);
                console.log('Rarity distribution:', allCharacters.reduce((acc, char) => {
                    acc[char.rarity] = (acc[char.rarity] || 0) + 1;
                    return acc;
                }, {}));
                
                // Update saved character collection with proper character data
                _updatePlayerCharacterCollection();
                
                return true;
            } else {
                throw new Error('Failed to fetch character data');
            }
        } catch (error) {
            console.error('Failed to load character data:', error);
            // Fallback to sample data
            allCharacters = window.GAME_CONFIG.characterSystem.sampleCharacters;
            console.log('Using fallback sample characters');
            return false;
        }
    }

    // Update player character collection with proper character data
    function _updatePlayerCharacterCollection() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        let updatedCount = 0;
        
        playerCharacterCollection.forEach((characterData, characterId) => {
            const actualCharacter = allCharacters.find(c => c.id == characterId);
            if (actualCharacter) {
                characterData.character = actualCharacter;
                updatedCount++;
            } else {
                console.warn(`Character not found for ID: ${characterId}`);
            }
        });
        
        console.log(`Updated ${updatedCount} characters in player collection`);
        
        // Notify other modules that character data is ready
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
    function _setUpCharacters(characterIds) {
        window.GAME_CONFIG.characterSystem.rateUp.ids = characterIds || [];
        console.log('Character UP pool updated:', characterIds);
    }


    // Handle character gacha draw
    function _handleCharacterDraw(count) {
        Game.BaseGacha.performGacha(
            characterGachaConfig,
            count,
            'characterTickets',
            window.GAME_CONFIG.gameplay.characterGachaEXP,
            () => allCharacters,
            _getUpCharacters,
            Game.Player.getCharacterPityState,
            Game.Player.getCharacterCollection,
            Game.Player.getCharacterGachaHistory,
            _renderCharacterGachaResult
        );
    }


    // Render character gacha result
    function _renderCharacterGachaResult(drawnCharacters) {
        const { characterResultContainer, characterResultModal } = Game.UI.elements.characterGacha;
        
        characterResultContainer.innerHTML = '';
        drawnCharacters.forEach(character => {
            const characterData = Game.Player.getCharacterCollection().get(character.id) || { character, count: 1 };
            const characterEl = Game.UI.createCharacterCardElement(characterData, 'character-gacha-result', { 
                isDuplicate: character.isDuplicate,
                isNew: character.isNew 
            });
            characterResultContainer.appendChild(characterEl);
        });
        
        characterResultModal.classList.remove('hidden');
    }

    // Show character gacha rates (unified with anime system)
    function _showCharacterGachaRates() {
        const { characterRatesContent, characterRatesModal } = Game.UI.elements.characterGacha;
        Game.BaseGacha.showRates(characterGachaConfig, characterRatesContent, characterRatesModal);
    }

    // Switch character gacha tabs
    function _switchCharacterGachaTab(tabName) {
        const { tabs, contents } = Game.UI.elements.characterGacha;
        Object.keys(tabs).forEach(key => {
            tabs[key].classList.toggle('active', key === tabName);
            contents[key].classList.toggle('hidden', key !== tabName);
        });
        
        if (tabName === 'history') {
            Game.UI.renderCharacterGachaHistory();
        }
    }

    return {
        init: async function() {
            console.log("Initializing Character Gacha system...");
            
            // Load character data
            await _loadCharacterData();
            
            // Set up event listeners
            const { characterGacha } = Game.UI.elements;
            if (characterGacha) {
                characterGacha.singleBtn?.addEventListener('click', () => _handleCharacterDraw(1));
                characterGacha.multiBtn?.addEventListener('click', () => _handleCharacterDraw(10));
                characterGacha.showRatesBtn?.addEventListener('click', _showCharacterGachaRates);
                
                // Tab switching
                characterGacha.tabs?.pool?.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    _switchCharacterGachaTab('pool'); 
                });
                characterGacha.tabs?.history?.addEventListener('click', (e) => { 
                    e.preventDefault(); 
                    _switchCharacterGachaTab('history'); 
                });
            }
            
            isInitialized = true;
            
            // Listen for player login events to update character collection
            document.addEventListener('playerLoggedIn', () => {
                console.log('Player logged in, updating character collection...');
                _updatePlayerCharacterCollection();
            });
            
            console.log("Character Gacha system initialized successfully.");
        },
        
        renderUI: function() {
            if (!isInitialized) return;
            
            // Update UI elements specific to character gacha
            const upCharacters = _getUpCharacters();
            const { characterUpBanner } = Game.UI.elements.characterGacha || {};
            
            if (characterUpBanner) {
                if (upCharacters.length === 0) {
                    characterUpBanner.innerHTML = `
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
                    
                    characterUpBanner.innerHTML = `
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
        },

        getAllCharacters: () => allCharacters,
        getDismantleValue: (rarity) => Game.BaseGacha.getDismantleValue(rarity, window.GAME_CONFIG.characterSystem.rarityConfig),
        isInitialized: () => isInitialized,
        setUpCharacters: _setUpCharacters,
        getUpCharacters: _getUpCharacters
    };

})();