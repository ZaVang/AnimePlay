// frontend/js/unified_collection.js
window.Game = window.Game || {};

/**
 * 统一的收藏系统
 * 管理动画和角色收藏的展示、筛选和操作
 */
Game.UnifiedCollection = (function() {
    
    let currentCollectionType = 'anime'; // 'anime' or 'character'
    let animeFilters = { name: '', rarity: '', tag: '' };
    let characterFilters = { name: '', rarity: '', gender: '' };

    // 切换收藏类型
    function _switchCollectionType(type) {
        currentCollectionType = type;
        
        // 更新标签状态
        document.querySelectorAll('.collection-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`tab-collection-${type}`).classList.add('active');
        
        // 切换内容显示
        document.getElementById('anime-collection-content').classList.toggle('hidden', type !== 'anime');
        document.getElementById('character-collection-content').classList.toggle('hidden', type !== 'character');
        
        // 渲染内容和统计
        _renderCurrentCollection();
        _renderCollectionStats();
    }

    // 渲染当前收藏
    function _renderCurrentCollection() {
        if (currentCollectionType === 'anime') {
            _renderAnimeCollection();
        } else {
            _renderCharacterCollection();
        }
    }

    // 渲染动画收藏
    function _renderAnimeCollection() {
        const playerCollection = Game.Player.getPlayerCollection();
        const collectionView = document.getElementById('anime-collection-view');
        
        if (!collectionView) return;
        
        const filteredAnimes = Array.from(playerCollection.values()).filter(data => {
            const anime = data.card;
            const nameMatch = anime.name.toLowerCase().includes(animeFilters.name.toLowerCase());
            const rarityMatch = animeFilters.rarity ? anime.rarity === animeFilters.rarity : true;
            const tagMatch = animeFilters.tag ? (anime.synergy_tags || []).includes(animeFilters.tag) : true;
            return nameMatch && rarityMatch && tagMatch;
        });

        // 排序
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredAnimes.sort((a, b) => {
            const rarityA = rarityOrder.indexOf(a.card.rarity);
            const rarityB = rarityOrder.indexOf(b.card.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return a.card.name.localeCompare(b.card.name);
        });

        // 渲染
        collectionView.innerHTML = '';
        if (filteredAnimes.length === 0) {
            collectionView.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">暂无动画收藏</p>
                    <p class="text-gray-400 text-sm mt-2">去抽卡获得你的第一张动画卡片吧！</p>
                </div>
            `;
        } else {
            filteredAnimes.forEach(animeData => {
                const animeElement = Game.UI.createCardElement(animeData, 'anime-collection');
                animeElement.addEventListener('click', () => _showAnimeDetail(animeData));
                collectionView.appendChild(animeElement);
            });
        }
    }

    // 渲染角色收藏
    function _renderCharacterCollection() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const collectionView = document.getElementById('character-collection-view');
        
        if (!collectionView) return;
        
        const filteredCharacters = Array.from(playerCharacterCollection.values()).filter(data => {
            const character = data.character;
            const nameMatch = character.name.toLowerCase().includes(characterFilters.name.toLowerCase());
            const rarityMatch = characterFilters.rarity ? character.rarity === characterFilters.rarity : true;
            const genderMatch = characterFilters.gender ? character.gender === characterFilters.gender : true;
            return nameMatch && rarityMatch && genderMatch;
        });

        // 排序
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredCharacters.sort((a, b) => {
            const rarityA = rarityOrder.indexOf(a.character.rarity);
            const rarityB = rarityOrder.indexOf(b.character.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return a.character.name.localeCompare(b.character.name);
        });

        // 渲染
        collectionView.innerHTML = '';
        if (filteredCharacters.length === 0) {
            collectionView.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">暂无角色收藏</p>
                    <p class="text-gray-400 text-sm mt-2">去抽卡获得你的第一个角色吧！</p>
                </div>
            `;
        } else {
            filteredCharacters.forEach(characterData => {
                const characterElement = Game.UI.createCharacterCardElement(characterData, 'character-collection');
                characterElement.addEventListener('click', () => _showCharacterDetail(characterData));
                collectionView.appendChild(characterElement);
            });
        }
    }

    // 渲染收藏统计
    function _renderCollectionStats() {
        const statsContainer = document.getElementById('collection-stats');
        if (!statsContainer) return;

        if (currentCollectionType === 'anime') {
            _renderAnimeStats(statsContainer);
        } else {
            _renderCharacterStats(statsContainer);
        }
    }

    // 渲染动画统计
    function _renderAnimeStats(container) {
        const playerCollection = Game.Player.getPlayerCollection();
        const allAnimes = Array.from(playerCollection.values());
        const totalAnimes = allAnimes.length;
        const totalCount = allAnimes.reduce((sum, data) => sum + data.count, 0);
        const allPossibleAnimes = Game.Player.getAllCards();

        // 稀有度统计
        const rarityStats = {};
        allAnimes.forEach(data => {
            const rarity = data.card.rarity;
            rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        const rarityStatsHtml = rarityOrder.map(rarity => {
            const count = rarityStats[rarity] || 0;
            const rarityConfig = window.GAME_CONFIG.rarityConfig[rarity];
            const colorClass = rarityConfig?.color || 'text-gray-500';
            return `<span class="${colorClass} font-bold">${rarity}: ${count}</span>`;
        }).join(' | ');

        const completionRate = allPossibleAnimes.length > 0 ? ((totalAnimes / allPossibleAnimes.length) * 100).toFixed(1) : '0.0';

        container.innerHTML = `
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg border">
                <h3 class="text-lg font-semibold mb-3 text-indigo-800">动画收藏统计</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                    <div>
                        <p class="text-gray-600">独特动画</p>
                        <p class="text-2xl font-bold text-indigo-600">${totalAnimes}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">总数量</p>
                        <p class="text-2xl font-bold text-indigo-600">${totalCount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">收藏完成度</p>
                        <p class="text-2xl font-bold text-green-600">${completionRate}%</p>
                    </div>
                    <div>
                        <p class="text-gray-600">平均拥有数</p>
                        <p class="text-2xl font-bold text-blue-600">${totalAnimes > 0 ? (totalCount / totalAnimes).toFixed(1) : '0.0'}</p>
                    </div>
                </div>
                <div class="mt-4 text-center text-sm">
                    <p class="text-gray-600">稀有度分布: ${rarityStatsHtml}</p>
                </div>
            </div>
        `;
    }

    // 渲染角色统计
    function _renderCharacterStats(container) {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const allCharacters = Array.from(playerCharacterCollection.values());
        const totalCharacters = allCharacters.length;
        const totalCount = allCharacters.reduce((sum, data) => sum + data.count, 0);
        
        // 获取所有可能的角色数量 (这里假设有一个getAllCharacters方法)
        const allPossibleCharacters = Game.CharacterGacha?.getAllCharacters() || [];

        // 稀有度统计
        const rarityStats = {};
        allCharacters.forEach(data => {
            const rarity = data.character.rarity;
            rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
        });

        // 性别统计
        const genderStats = {};
        allCharacters.forEach(data => {
            const gender = data.character.gender || 'unknown';
            genderStats[gender] = (genderStats[gender] || 0) + 1;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        const rarityStatsHtml = rarityOrder.map(rarity => {
            const count = rarityStats[rarity] || 0;
            const rarityConfig = window.GAME_CONFIG.characterSystem.rarityConfig[rarity];
            const colorClass = rarityConfig?.color || 'text-gray-500';
            return `<span class="${colorClass} font-bold">${rarity}: ${count}</span>`;
        }).join(' | ');

        const genderStatsHtml = Object.entries(genderStats).map(([gender, count]) => {
            const genderText = gender === 'male' ? '男性' : gender === 'female' ? '女性' : '未知';
            return `${genderText}: ${count}`;
        }).join(' | ');

        const completionRate = allPossibleCharacters.length > 0 ? ((totalCharacters / allPossibleCharacters.length) * 100).toFixed(1) : '0.0';

        container.innerHTML = `
            <div class="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border">
                <h3 class="text-lg font-semibold mb-3 text-pink-800">角色收藏统计</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                    <div>
                        <p class="text-gray-600">独特角色</p>
                        <p class="text-2xl font-bold text-pink-600">${totalCharacters}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">总数量</p>
                        <p class="text-2xl font-bold text-pink-600">${totalCount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">收藏完成度</p>
                        <p class="text-2xl font-bold text-green-600">${completionRate}%</p>
                    </div>
                    <div>
                        <p class="text-gray-600">平均拥有数</p>
                        <p class="text-2xl font-bold text-purple-600">${totalCharacters > 0 ? (totalCount / totalCharacters).toFixed(1) : '0.0'}</p>
                    </div>
                </div>
                <div class="mt-4 text-center text-sm space-y-1">
                    <p class="text-gray-600">稀有度分布: ${rarityStatsHtml}</p>
                    <p class="text-gray-600">性别分布: ${genderStatsHtml}</p>
                </div>
            </div>
        `;
    }

    // 显示动画详情
    function _showAnimeDetail(animeData) {
        const { card, count } = animeData;
        const modal = document.getElementById('anime-detail-modal');
        const content = document.getElementById('anime-detail-content');
        
        if (!modal || !content) return;

        const { rarityConfig } = window.GAME_CONFIG;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        
        const detailHtml = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <img src="${card.image_path}" class="w-full aspect-[3/2] object-cover rounded-lg shadow-lg" onerror="this.src='https://placehold.co/300x200/e2e8f0/334155?text=图片丢失';">
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold mb-3">${card.name}</h2>
                    <div class="flex items-center gap-4 mb-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">${card.rarity}</span>
                        <span class="text-lg font-semibold text-gray-700">拥有数量: <span class="font-bold text-indigo-600">${count}</span></span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-600">点数</p>
                            <p class="text-xl font-bold text-indigo-600">${card.points}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Cost</p>
                            <p class="text-xl font-bold text-indigo-600">${card.cost}</p>
                        </div>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-4 mb-4">
                        <h3 class="font-bold text-gray-800 mb-2">Bangumi 数据</h3>
                        <div class="grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                                <p class="font-semibold text-gray-600">评分</p>
                                <p class="font-bold text-xl text-amber-600">${card.rating_score || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-600">排名</p>
                                <p class="font-bold text-xl text-amber-600">#${card.rating_rank || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-600">评价人数</p>
                                <p class="font-bold text-xl text-amber-600">${(card.rating_total || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-4">${card.description}</p>
                    <div class="mb-4">
                        <h3 class="font-bold mb-2">羁绊标签:</h3>
                        <div class="flex flex-wrap gap-2">
                            ${(card.synergy_tags || []).map(tag => `<span class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">${tag}</span>`).join('') || '<span class="text-gray-500 text-sm">无</span>'}
                        </div>
                    </div>
                    <div id="anime-dismantle-section" class="mt-6"></div>
                </div>
            </div>
        `;

        content.innerHTML = detailHtml;

        // 添加分解功能（如果有多张）
        if (count > 1) {
            const dismantleValue = Game.AnimeGacha.getDismantleValue(card.rarity);
            const dismantleSection = content.querySelector('#anime-dismantle-section');
            dismantleSection.innerHTML = `
                <div class="border-t pt-4">
                    <h3 class="font-bold mb-2">分解动画卡</h3>
                    <p class="text-sm text-gray-600 mb-3">分解一张多余的动画卡可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                    <button id="anime-dismantle-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">分解一张</button>
                </div>
            `;
            dismantleSection.querySelector('#anime-dismantle-btn').addEventListener('click', () => {
                _dismantleAnime(card.id);
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
    }

    // 显示角色详情
    function _showCharacterDetail(characterData) {
        const { character, count } = characterData;
        const modal = document.getElementById('character-detail-modal');
        const content = document.getElementById('character-detail-content');
        
        if (!modal || !content) return;

        const { rarityConfig } = window.GAME_CONFIG.characterSystem;
        const rarityColor = rarityConfig[character.rarity]?.c || 'bg-gray-500';
        
        const detailHtml = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <img src="${character.image_path}" class="w-full aspect-[3/4] object-cover rounded-lg shadow-lg" onerror="this.src='https://placehold.co/240x320/e2e8f0/334155?text=角色头像';">
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold mb-3">${character.name}</h2>
                    <div class="flex items-center gap-4 mb-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">${character.rarity}</span>
                        <span class="text-lg font-semibold text-gray-700">拥有数量: <span class="font-bold text-pink-600">${count}</span></span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-600">性别</p>
                            <p class="text-lg font-semibold text-gray-800">${character.gender === 'male' ? '男性' : character.gender === 'female' ? '女性' : '未知'}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">作品数量</p>
                            <p class="text-lg font-semibold text-gray-800">${character.anime_count || 0}部</p>
                        </div>
                    </div>
                    ${character.description ? `<p class="text-gray-600 mb-4">${character.description}</p>` : ''}
                    <div id="character-dismantle-section" class="mt-6"></div>
                </div>
            </div>
        `;

        content.innerHTML = detailHtml;

        // 添加分解功能（如果有多张）
        if (count > 1) {
            const dismantleValue = Game.CharacterGacha.getDismantleValue(character.rarity);
            const dismantleSection = content.querySelector('#character-dismantle-section');
            dismantleSection.innerHTML = `
                <div class="border-t pt-4">
                    <h3 class="font-bold mb-2">分解角色卡</h3>
                    <p class="text-sm text-gray-600 mb-3">分解一张多余的角色卡可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                    <button id="character-dismantle-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">分解一张</button>
                </div>
            `;
            dismantleSection.querySelector('#character-dismantle-btn').addEventListener('click', () => {
                _dismantleCharacter(character.id);
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
    }

    // 分解动画卡
    function _dismantleAnime(cardId) {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        
        if (!playerCollection.has(cardId)) return;
        
        const cardData = playerCollection.get(cardId);
        if (cardData.count > 1) {
            cardData.count--;
            const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity);
            playerState.knowledgePoints += dismantleValue;
            
            Game.UI.logMessage(`分解了 ${cardData.card.name}，获得 ${dismantleValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCurrentCollection();
            _renderCollectionStats();
        }
    }

    // 分解角色卡
    function _dismantleCharacter(characterId) {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const playerState = Game.Player.getState();
        
        if (!playerCharacterCollection.has(characterId)) return;
        
        const characterData = playerCharacterCollection.get(characterId);
        if (characterData.count > 1) {
            characterData.count--;
            const dismantleValue = Game.CharacterGacha.getDismantleValue(characterData.character.rarity);
            playerState.knowledgePoints += dismantleValue;
            
            Game.UI.logMessage(`分解了 ${characterData.character.name}，获得 ${dismantleValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCurrentCollection();
            _renderCollectionStats();
        }
    }

    // 一键分解所有动画重复卡
    function _dismantleAllAnimes() {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        let totalValue = 0;
        let dismantledCount = 0;

        playerCollection.forEach((cardData, cardId) => {
            if (cardData.count > 1) {
                const duplicates = cardData.count - 1;
                const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity) * duplicates;
                totalValue += dismantleValue;
                dismantledCount += duplicates;
                cardData.count = 1;
            }
        });

        if (totalValue > 0) {
            playerState.knowledgePoints += totalValue;
            Game.UI.logMessage(`一键分解了 ${dismantledCount} 张重复动画卡，获得 ${totalValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
        } else {
            Game.UI.logMessage('没有重复的动画卡可以分解。', 'info');
        }
    }

    // 一键分解所有角色重复卡
    function _dismantleAllCharacters() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const playerState = Game.Player.getState();
        let totalValue = 0;
        let dismantledCount = 0;

        playerCharacterCollection.forEach((characterData, characterId) => {
            if (characterData.count > 1) {
                const duplicates = characterData.count - 1;
                const dismantleValue = Game.CharacterGacha.getDismantleValue(characterData.character.rarity) * duplicates;
                totalValue += dismantleValue;
                dismantledCount += duplicates;
                characterData.count = 1;
            }
        });

        if (totalValue > 0) {
            playerState.knowledgePoints += totalValue;
            Game.UI.logMessage(`一键分解了 ${dismantledCount} 张重复角色卡，获得 ${totalValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
        } else {
            Game.UI.logMessage('没有重复的角色卡可以分解。', 'info');
        }
    }

    return {
        init: function() {
            // 标签切换事件
            document.getElementById('tab-collection-anime').addEventListener('click', (e) => {
                e.preventDefault();
                _switchCollectionType('anime');
            });
            
            document.getElementById('tab-collection-character').addEventListener('click', (e) => {
                e.preventDefault();
                _switchCollectionType('character');
            });

            // 动画筛选器事件
            const animeNameFilter = document.getElementById('anime-filter-name');
            const animeRarityFilter = document.getElementById('anime-filter-rarity');
            const animeTagFilter = document.getElementById('anime-filter-tag');
            const animeDismantleBtn = document.getElementById('anime-dismantle-all-btn');

            if (animeNameFilter) {
                animeNameFilter.addEventListener('input', (e) => {
                    animeFilters.name = e.target.value;
                    if (currentCollectionType === 'anime') _renderCurrentCollection();
                });
            }
            
            if (animeRarityFilter) {
                animeRarityFilter.addEventListener('change', (e) => {
                    animeFilters.rarity = e.target.value;
                    if (currentCollectionType === 'anime') _renderCurrentCollection();
                });
            }
            
            if (animeTagFilter) {
                animeTagFilter.addEventListener('change', (e) => {
                    animeFilters.tag = e.target.value;
                    if (currentCollectionType === 'anime') _renderCurrentCollection();
                });
            }

            if (animeDismantleBtn) {
                animeDismantleBtn.addEventListener('click', () => {
                    _dismantleAllAnimes();
                    _renderCurrentCollection();
                    _renderCollectionStats();
                });
            }

            // 角色筛选器事件
            const characterNameFilter = document.getElementById('character-filter-name');
            const characterRarityFilter = document.getElementById('character-filter-rarity');
            const characterGenderFilter = document.getElementById('character-filter-gender');
            const characterDismantleBtn = document.getElementById('character-dismantle-all-btn');

            if (characterNameFilter) {
                characterNameFilter.addEventListener('input', (e) => {
                    characterFilters.name = e.target.value;
                    if (currentCollectionType === 'character') _renderCurrentCollection();
                });
            }
            
            if (characterRarityFilter) {
                characterRarityFilter.addEventListener('change', (e) => {
                    characterFilters.rarity = e.target.value;
                    if (currentCollectionType === 'character') _renderCurrentCollection();
                });
            }
            
            if (characterGenderFilter) {
                characterGenderFilter.addEventListener('change', (e) => {
                    characterFilters.gender = e.target.value;
                    if (currentCollectionType === 'character') _renderCurrentCollection();
                });
            }

            if (characterDismantleBtn) {
                characterDismantleBtn.addEventListener('click', () => {
                    _dismantleAllCharacters();
                    _renderCurrentCollection();
                    _renderCollectionStats();
                });
            }

            console.log("Unified Collection system initialized.");
        },

        renderUI: function() {
            _populateFilters();
            _renderCurrentCollection();
            _renderCollectionStats();
        },

        dismantleAllAnimes: _dismantleAllAnimes,
        dismantleAllCharacters: _dismantleAllCharacters
    };

    // 填充筛选器选项
    function _populateFilters() {
        // 动画筛选器
        const animeRarityFilter = document.getElementById('anime-filter-rarity');
        const animeTagFilter = document.getElementById('anime-filter-tag');

        if (animeRarityFilter) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            animeRarityFilter.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                animeRarityFilter.appendChild(option);
            });
        }

        if (animeTagFilter) {
            const allCards = Game.Player.getAllCards();
            const allTags = new Set();
            allCards.forEach(card => {
                if (card.synergy_tags) {
                    card.synergy_tags.forEach(tag => allTags.add(tag));
                }
            });
            
            animeTagFilter.innerHTML = '<option value="">所有标签</option>';
            Array.from(allTags).sort().forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                animeTagFilter.appendChild(option);
            });
        }

        // 角色筛选器
        const characterRarityFilter = document.getElementById('character-filter-rarity');
        const characterGenderFilter = document.getElementById('character-filter-gender');

        if (characterRarityFilter) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            characterRarityFilter.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                characterRarityFilter.appendChild(option);
            });
        }

        if (characterGenderFilter) {
            characterGenderFilter.innerHTML = `
                <option value="">所有性别</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
            `;
        }
    }
})();