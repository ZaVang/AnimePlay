// frontend/js/character_collection.js
window.Game = window.Game || {};

Game.CharacterCollection = (function() {
    
    let currentFilters = {
        name: '',
        rarity: '',
        gender: '',
        anime: ''
    };

    // Render character collection view
    function _renderCollection() {
        const { characterCollectionContainer } = Game.UI.elements.characterCollection || {};
        if (!characterCollectionContainer) return;

        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const allCharacters = Array.from(playerCharacterCollection.values());
        
        // Apply filters
        const filteredCharacters = allCharacters.filter(characterData => {
            const character = characterData.character;
            
            // Name filter
            if (currentFilters.name && !character.name.toLowerCase().includes(currentFilters.name.toLowerCase())) {
                return false;
            }
            
            // Rarity filter
            if (currentFilters.rarity && character.rarity !== currentFilters.rarity) {
                return false;
            }
            
            // Gender filter
            if (currentFilters.gender && character.gender !== currentFilters.gender) {
                return false;
            }
            
            return true;
        });

        // Sort by rarity, then by name
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredCharacters.sort((a, b) => {
            const rarityDiff = rarityOrder.indexOf(a.character.rarity) - rarityOrder.indexOf(b.character.rarity);
            if (rarityDiff !== 0) return rarityDiff;
            return a.character.name.localeCompare(b.character.name);
        });

        characterCollectionContainer.innerHTML = '';
        
        if (filteredCharacters.length === 0) {
            characterCollectionContainer.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>暂无匹配的角色</p>
                    <p class="text-sm mt-2">尝试调整筛选条件或进行角色邂逅</p>
                </div>
            `;
            return;
        }

        filteredCharacters.forEach(characterData => {
            const characterEl = Game.UI.createCharacterCardElement(characterData, 'character-collection');
            characterEl.addEventListener('click', () => _showCharacterDetail(characterData));
            characterCollectionContainer.appendChild(characterEl);
        });
    }

    // Show character detail modal
    function _showCharacterDetail(characterData) {
        const { character, count } = characterData;
        const { rarityConfig } = window.GAME_CONFIG.characterSystem;
        const rarityColor = rarityConfig[character.rarity]?.c || 'bg-gray-500';
        
        let detailHtml = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <div class="relative">
                        <img src="${character.image_path}" class="w-full h-auto object-cover rounded-lg shadow-lg" 
                             onerror="this.src='https://placehold.co/300x400/e2e8f0/334155?text=角色头像';">
                        <div class="absolute top-2 right-2 px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">
                            ${character.rarity}
                        </div>
                    </div>
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold mb-1">${character.name}</h2>
                    ${character.original_name && character.original_name !== character.name ? `
                    <p class="text-lg text-gray-600 mb-3">${character.original_name}</p>
                    ` : ''}
                    <div class="mb-4 flex items-center gap-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">
                            ${character.rarity}
                        </span>
                        <span class="text-lg font-semibold text-gray-700">
                            拥有数量: <span class="font-bold text-pink-600">${count}</span>
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div class="bg-gray-100 p-3 rounded-lg">
                            <h4 class="font-bold text-gray-800 mb-1">性别</h4>
                            <p class="text-gray-600">${character.gender === 'male' ? '男性' : character.gender === 'female' ? '女性' : '未知'}</p>
                        </div>
                        <div class="bg-gray-100 p-3 rounded-lg">
                            <h4 class="font-bold text-gray-800 mb-1">生日</h4>
                            <p class="text-gray-600">${character.birthday || '未知'}</p>
                        </div>
                    </div>

                    ${character.stats ? `
                    <div class="mb-4 p-3 bg-blue-50 rounded-lg">
                        <h4 class="font-bold text-blue-800 mb-2">人气数据</h4>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div class="text-center">
                                <p class="font-semibold text-blue-600">收藏数</p>
                                <p class="font-bold text-xl text-blue-800">${character.stats.collects || 0}</p>
                            </div>
                            <div class="text-center">
                                <p class="font-semibold text-blue-600">评论数</p>
                                <p class="font-bold text-xl text-blue-800">${character.stats.comments || 0}</p>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="mb-4">
                        <h4 class="font-bold text-gray-800 mb-2">角色简介</h4>
                        <p class="text-gray-600 text-sm leading-relaxed">${character.description}</p>
                    </div>

                    ${character.anime_names && character.anime_names.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-bold text-gray-800 mb-2">出演作品 (${character.anime_count}部)</h4>
                        <div class="flex flex-wrap gap-2">
                            ${character.anime_names.map(name => `
                                <span class="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full">
                                    ${name}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    ` : (character.anime_ids && character.anime_ids.length > 0 ? `
                    <div class="mb-4">
                        <h4 class="font-bold text-gray-800 mb-2">出演作品</h4>
                        <div class="flex flex-wrap gap-2">
                            ${character.anime_ids.map(id => `
                                <span class="bg-purple-100 text-purple-800 px-2 py-1 text-xs rounded-full">
                                    作品ID: ${id}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                    ` : '')}

                    <div id="character-dismantle-section" class="mt-6"></div>
                </div>
            </div>
        `;

        const { characterDetailModal, characterDetailContent } = Game.UI.elements.characterCollection || {};
        if (characterDetailContent) {
            characterDetailContent.innerHTML = detailHtml;

            // Add dismantle section if player has multiple copies
            if (count > 1) {
                const dismantleValue = Game.CharacterGacha.getDismantleValue(character.rarity);
                const dismantleSection = characterDetailContent.querySelector('#character-dismantle-section');
                if (dismantleSection) {
                    dismantleSection.innerHTML = `
                        <div class="border-t pt-4">
                            <h4 class="font-bold text-gray-800 mb-2">分解角色卡</h4>
                            <p class="text-sm text-gray-600 mb-3">
                                分解一张多余的角色卡可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。
                            </p>
                            <button id="dismantle-character-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">
                                分解一张
                            </button>
                        </div>
                    `;
                    
                    dismantleSection.querySelector('#dismantle-character-btn').addEventListener('click', () => {
                        _dismantleCharacter(character.id);
                        characterDetailModal?.classList.add('hidden');
                    });
                }
            }
        }
        
        characterDetailModal?.classList.remove('hidden');
    }

    // Dismantle character
    function _dismantleCharacter(characterId) {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const characterData = playerCharacterCollection.get(characterId);
        
        if (!characterData || characterData.count <= 1) {
            alert("无法分解：只有一张角色卡！");
            return;
        }

        const dismantleValue = Game.CharacterGacha.getDismantleValue(characterData.character.rarity);
        
        if (confirm(`确定要分解一张 ${characterData.character.name} 吗？将获得 ${dismantleValue} 知识点。`)) {
            characterData.count--;
            const playerState = Game.Player.getState();
            playerState.knowledgePoints += dismantleValue;
            
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCollection();
            
            Game.UI.logMessage(`分解了一张 ${characterData.character.name}，获得 ${dismantleValue} 知识点`, 'reward');
        }
    }

    // Dismantle all duplicate characters
    function _dismantleAllDuplicates() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const playerState = Game.Player.getState();
        let totalValue = 0;
        let dismantledCount = 0;

        playerCharacterCollection.forEach((characterData, characterId) => {
            if (characterData.count > 1) {
                const duplicateCount = characterData.count - 1;
                const dismantleValue = Game.CharacterGacha.getDismantleValue(characterData.character.rarity);
                const totalFromThisCharacter = duplicateCount * dismantleValue;
                
                totalValue += totalFromThisCharacter;
                dismantledCount += duplicateCount;
                characterData.count = 1;
            }
        });

        if (dismantledCount === 0) {
            alert("没有多余的角色卡可以分解！");
            return;
        }

        if (confirm(`确定要分解 ${dismantledCount} 张重复角色卡吗？将获得 ${totalValue} 知识点。`)) {
            playerState.knowledgePoints += totalValue;
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCollection();
            
            Game.UI.logMessage(`一键分解了 ${dismantledCount} 张重复角色卡，获得 ${totalValue} 知识点`, 'reward');
        }
    }

    // Update filters
    function _updateFilters() {
        const { characterFilterName, characterFilterRarity, characterFilterGender } = Game.UI.elements.characterCollection || {};
        
        currentFilters.name = characterFilterName?.value || '';
        currentFilters.rarity = characterFilterRarity?.value || '';
        currentFilters.gender = characterFilterGender?.value || '';
        
        _renderCollection();
    }

    // Populate filter dropdowns
    function _populateFilters() {
        const { characterFilterRarity, characterFilterGender } = Game.UI.elements.characterCollection || {};
        
        // Populate rarity filter
        if (characterFilterRarity) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            characterFilterRarity.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                characterFilterRarity.appendChild(option);
            });
        }

        // Populate gender filter
        if (characterFilterGender) {
            characterFilterGender.innerHTML = `
                <option value="">所有性别</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="unknown">未知</option>
            `;
        }
    }

    return {
        init: function() {
            console.log("Initializing Character Collection system...");
            
            // Set up event listeners
            const { characterCollection } = Game.UI.elements;
            if (characterCollection) {
                // Filter event listeners
                characterCollection.filterName?.addEventListener('input', _updateFilters);
                characterCollection.filterRarity?.addEventListener('change', _updateFilters);
                characterCollection.filterGender?.addEventListener('change', _updateFilters);
                
                // Dismantle all button
                characterCollection.dismantleAllBtn?.addEventListener('click', _dismantleAllDuplicates);
            }
            
            _populateFilters();
            console.log("Character Collection system initialized.");
        },

        renderUI: function() {
            _renderCollection();
        },

        showCharacterDetail: _showCharacterDetail,
        updateFilters: _updateFilters,
        renderCollection: _renderCollection
    };

})();