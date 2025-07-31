// frontend/js/character_gacha.js
window.Game = window.Game || {};

Game.CharacterGacha = (function() {
    
    let allCharacters = [];
    let isInitialized = false;

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
        playerCharacterCollection.forEach((characterData, characterId) => {
            const actualCharacter = allCharacters.find(c => c.id == characterId);
            if (actualCharacter) {
                characterData.character = actualCharacter;
            }
        });
    }

    // Get UP characters from the current UP pool
    function _getUpCharacters() {
        const { characterRateUp } = window.GAME_CONFIG.characterSystem;
        if (!characterRateUp.ids || characterRateUp.ids.length === 0) {
            return [];
        }
        return allCharacters.filter(c => characterRateUp.ids.includes(c.id));
    }

    // Set UP characters for the character gacha
    function _setUpCharacters(characterIds) {
        window.GAME_CONFIG.characterSystem.characterRateUp.ids = characterIds || [];
        console.log('Character UP pool updated:', characterIds);
    }


    // Handle character gacha draw
    function _handleCharacterDraw(count) {
        if (!Game.Player.getCurrentUser()) {
            alert("请先登录！");
            return;
        }

        const playerState = Game.Player.getState();
        console.log(`[DEBUG] Character tickets: ${playerState.characterTickets}, Need: ${count}`);
        
        // Ensure characterTickets is a number and not undefined
        const currentTickets = playerState.characterTickets || 0;
        if (currentTickets < count) {
            alert(`角色邂逅券不足！当前拥有：${currentTickets}，需要：${count}`);
            return;
        }

        // Deduct tickets and add EXP
        playerState.characterTickets = currentTickets - count;
        const expGained = count === 1 ? 
            window.GAME_CONFIG.gameplay.characterGachaEXP.single : 
            window.GAME_CONFIG.gameplay.characterGachaEXP.multi;
        Game.Player.addExp(expGained);

        // Perform gacha
        const drawnCharacters = _performCharacterGacha(count);
        
        // Update collection
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        
        drawnCharacters.forEach(character => {
            if (playerCharacterCollection.has(character.id)) {
                const existing = playerCharacterCollection.get(character.id);
                existing.count++;
                character.isDuplicate = true;
            } else {
                playerCharacterCollection.set(character.id, { character: character, count: 1 });
                character.isNew = true;
            }
        });

        // Save to gacha history
        const characterHistory = Game.Player.getCharacterGachaHistory();
        characterHistory.push(...drawnCharacters);
        
        Game.Player.saveState(false);
        _renderCharacterGachaResult(drawnCharacters);
        Game.UI.renderPlayerState();
    }

    // Perform character gacha logic (unified with anime gacha system)
    function _performCharacterGacha(count) {
        const { rarityConfig, gacha, characterRateUp } = window.GAME_CONFIG.characterSystem;
        const pityState = Game.Player.getCharacterPityState();
        const upCharacters = _getUpCharacters();
        const drawnCharacters = [];

        for (let i = 0; i < count; i++) {
            pityState.totalPulls++;
            pityState.pullsSinceLastHR++;
            
            let drawnCharacter;
            
            // Check UP pity system (unified with anime system)
            if (pityState.pullsSinceLastHR >= characterRateUp.pityPulls && upCharacters.length > 0) {
                pityState.pullsSinceLastHR = 0;
                drawnCharacter = upCharacters[Math.floor(Math.random() * upCharacters.length)];
            } else {
                // Normal probability (unified with anime system)
                const rand = Math.random() * 100;
                let cumulativeProb = 0;
                let drawnRarity = 'N';
                
                for (const rarity in rarityConfig) {
                    cumulativeProb += rarityConfig[rarity].p;
                    if (rand < cumulativeProb) { 
                        drawnRarity = rarity; 
                        break; 
                    }
                }
                
                // Check for UP character chance on HR rarity (unified with anime system)
                if (drawnRarity === 'HR' && upCharacters.length > 0 && Math.random() < characterRateUp.hrChance) {
                    pityState.pullsSinceLastHR = 0;
                    drawnCharacter = upCharacters[Math.floor(Math.random() * upCharacters.length)];
                } else {
                    // Select from normal pool
                    const pool = allCharacters.filter(c => c.rarity === drawnRarity);
                    drawnCharacter = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : 
                                   allCharacters.find(c => c.rarity === 'N');
                    
                    // Reset HR pity counter if we got HR from normal pool
                    if (drawnRarity === 'HR') pityState.pullsSinceLastHR = 0;
                }
            }

            drawnCharacters.push({ ...drawnCharacter, timestamp: Date.now() });
        }

        // Guarantee mechanism for multi-pull (unified with anime system)
        if (count >= gacha.guaranteedSR_Pulls && !drawnCharacters.some(c => ['SR', 'SSR', 'HR', 'UR'].includes(c.rarity))) {
            const pool = allCharacters.filter(c => c.rarity === 'SR');
            const indexToReplace = drawnCharacters.findIndex(c => c.rarity === 'N') ?? 0;
            if (pool.length > 0) {
                drawnCharacters[indexToReplace] = { 
                    ...pool[Math.floor(Math.random() * pool.length)], 
                    timestamp: Date.now() 
                };
            }
        }

        return drawnCharacters;
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
        const { rarityConfig, characterRateUp } = window.GAME_CONFIG.characterSystem;
        
        characterRatesContent.innerHTML = '';
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        
        rarityOrder.forEach(rarity => {
            const config = rarityConfig[rarity];
            const rateElement = document.createElement('div');
            rateElement.className = 'flex justify-between items-center p-2 bg-gray-100 rounded mb-2';
            rateElement.innerHTML = `
                <span class="font-bold ${config.color}">${rarity}</span>
                <span>${config.p}%</span>
            `;
            characterRatesContent.appendChild(rateElement);
        });

        // Add pity information (unified with anime system)
        const pityInfo = document.createElement('div');
        pityInfo.className = 'mt-4 p-3 bg-blue-50 rounded-lg text-sm';
        pityInfo.innerHTML = `
            <h4 class="font-bold text-blue-800 mb-2">保底机制</h4>
            <p class="text-blue-700">• HR邂逅时，有<span class="font-bold">${characterRateUp.hrChance * 100}%</span>概率获得UP角色</p>
            <p class="text-blue-700">• 累计<span class="font-bold">${characterRateUp.pityPulls}</span>次邂逅必定获得UP角色之一</p>
            <p class="text-blue-700">• 十连邂逅必定获得<span class="font-bold">SR</span>及以上角色</p>
        `;
        characterRatesContent.appendChild(pityInfo);
        
        characterRatesModal.classList.remove('hidden');
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
                    const { characterRateUp } = window.GAME_CONFIG.characterSystem;
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
                                <p>• HR邂逅时，有<span class="font-bold text-pink-600">${characterRateUp.hrChance * 100}%</span>概率为UP！</p>
                                <p>• 累计<span class="font-bold text-pink-600">${characterRateUp.pityPulls}</span>次邂逅必定获得UP之一！</p>
                                <p>• 十连邂逅必定获得<span class="font-bold text-pink-600">SR</span>及以上角色！</p>
                            </div>
                        </div>
                    `;
                }
            }
        },

        getAllCharacters: () => allCharacters,
        getDismantleValue: (rarity) => window.GAME_CONFIG.characterSystem.rarityConfig[rarity]?.dismantleValue || 0,
        isInitialized: () => isInitialized,
        setUpCharacters: _setUpCharacters,
        getUpCharacters: _getUpCharacters
    };

})();