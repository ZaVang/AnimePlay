// frontend/js/collections/deck.js - Hearthstone-style Deck Builder
window.Game = window.Game || {};

Game.Deck = (function() {
    
    let currentViewType = 'anime'; // 'anime' | 'character'
    let currentDeck = { anime: [], character: [] };
    let currentDeckName = '新卡组';
    let savedDecks = {}; // 保存的卡组库

    // Collection modules for anime and character
    let animeCollection, characterCollection;

    // 初始化收藏模块
    function _initCollectionModules() {
        // 动画收藏模块
        animeCollection = Game.CollectionModule({
            type: 'anime',
            itemType: '动画',
            itemKey: 'anime',
            configKey: 'animeSystem',
            playerMethods: {
                getCollection: () => Game.Player.getAnimeCollection(),
                getPityState: () => Game.Player.getAnimePityState(),
                getGachaHistory: () => Game.Player.getAnimeGachaHistory()
            },
            cardElementCreator: Game.UI.createAnimeCardElement,
            detailModalHandler: _showAnimeDetail,
            colors: { primary: 'indigo', secondary: 'blue' },
            maxDeckSize: 20,
            filterFields: ['name', 'rarity', 'tag']
        });

        // 角色收藏模块
        characterCollection = Game.CollectionModule({
            type: 'character',
            itemType: '角色',
            itemKey: 'character',
            configKey: 'characterSystem',
            playerMethods: {
                getCollection: () => Game.Player.getCharacterCollection(),
                getPityState: () => Game.Player.getCharacterPityState(),
                getGachaHistory: () => Game.Player.getCharacterGachaHistory()
            },
            cardElementCreator: Game.UI.createCharacterCardElement,
            detailModalHandler: _showCharacterDetail,
            colors: { primary: 'pink', secondary: 'purple' },
            maxDeckSize: 5,
            filterFields: ['name', 'rarity', 'gender']
        });

        // 设置为组卡模式
        animeCollection.setDeckMode(true);
        characterCollection.setDeckMode(true);
    }

    // 切换视图类型
    function _switchViewType(type) {
        currentViewType = type;
        
        // 更新按钮状态
        document.querySelectorAll('.deck-view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`deck-view-${type}`).classList.add('active');
        
        // 切换筛选器显示
        document.getElementById('anime-deck-filters').classList.toggle('hidden', type !== 'anime');
        document.getElementById('character-deck-filters').classList.toggle('hidden', type !== 'character');
        
        // 渲染对应的收藏
        _renderCollection();
    }

    // 渲染收藏区域
    function _renderCollection() {
        const collectionView = document.getElementById('deck-collection-view');
        const statsContainer = document.getElementById('deck-collection-stats');
        
        if (!collectionView) return;

        if (currentViewType === 'anime') {
            animeCollection.setDeckCards(currentDeck.anime);
            animeCollection.renderCollection(collectionView);
            if (statsContainer) {
                animeCollection.renderStats(statsContainer);
            }
        } else {
            characterCollection.setDeckCards(currentDeck.character);
            characterCollection.renderCollection(collectionView);
            if (statsContainer) {
                characterCollection.renderStats(statsContainer);
            }
        }
    }

    // 渲染卡组封面
    function _renderDeckCover() {
        const coverElement = document.getElementById('deck-cover');
        if (!coverElement) return;

        // 获取第一张动画卡作为封面
        const firstAnimeCard = currentDeck.anime[0];
        
        if (firstAnimeCard) {
            const cardElement = Game.UI.createAnimeCardElement(firstAnimeCard, 'deck-cover');
            cardElement.classList.add('w-full', 'h-full');
            coverElement.innerHTML = '';
            coverElement.appendChild(cardElement);
            coverElement.classList.remove('border-dashed', 'border-gray-300');
            coverElement.classList.add('border-solid', 'border-blue-500');
        } else {
            // 默认封面
            coverElement.innerHTML = `
                <div class="text-center text-gray-500">
                    <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p class="text-xs">卡组封面</p>
                </div>
            `;
            coverElement.classList.add('border-dashed', 'border-gray-300');
            coverElement.classList.remove('border-solid', 'border-blue-500');
        }
    }

    // 渲染卡组统计
    function _renderDeckStats() {
        const animeCountEl = document.getElementById('anime-deck-count');
        const characterCountEl = document.getElementById('character-deck-count');
        
        if (animeCountEl) {
            animeCountEl.textContent = `${currentDeck.anime.length}/25`;
        }
        if (characterCountEl) {
            characterCountEl.textContent = `${currentDeck.character.length}/5`;
        }
        
        // 更新卡组区域标题
        const animeAreaTitle = document.querySelector('#anime-deck-area h4');
        const characterAreaTitle = document.querySelector('#character-deck-area h4');
        
        if (animeAreaTitle) {
            animeAreaTitle.textContent = `动画卡 (${currentDeck.anime.length}/25)`;
        }
        if (characterAreaTitle) {
            characterAreaTitle.textContent = `角色卡 (${currentDeck.character.length}/5)`;
        }
    }

    // 渲染卡组列表
    function _renderDeckLists() {
        const animeList = document.getElementById('anime-deck-list');
        const characterList = document.getElementById('character-deck-list');
        
        // 渲染动画卡组
        if (animeList) {
            animeList.innerHTML = '';
            currentDeck.anime.forEach((cardData, index) => {
                const listItem = document.createElement('div');
                listItem.className = 'flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer text-xs';
                listItem.innerHTML = `
                    <div class="w-6 h-8 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        <img src="${cardData.anime.image_path}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                    </div>
                    <span class="flex-1 truncate">${cardData.anime.name}</span>
                    ${index === 0 ? '<span class="text-yellow-600 text-xs">封面</span>' : ''}
                `;
                listItem.addEventListener('click', () => _removeFromDeck('anime', cardData.anime.id));
                animeList.appendChild(listItem);
            });
        }
        
        // 渲染角色卡组
        if (characterList) {
            characterList.innerHTML = '';
            currentDeck.character.forEach((cardData) => {
                const listItem = document.createElement('div');
                listItem.className = 'flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer text-xs';
                listItem.innerHTML = `
                    <div class="w-6 h-8 bg-gray-200 rounded flex-shrink-0 overflow-hidden">
                        <img src="${cardData.character.image_path}" class="w-full h-full object-cover" onerror="this.style.display='none'">
                    </div>
                    <span class="flex-1 truncate">${cardData.character.name}</span>
                `;
                listItem.addEventListener('click', () => _removeFromDeck('character', cardData.character.id));
                characterList.appendChild(listItem);
            });
        }
    }

    // 添加卡片到卡组
    function _addToDeck(type, cardData) {
        const deckCards = currentDeck[type];
        const maxSize = type === 'anime' ? 25 : 5;
        
        // 检查数量限制
        if (deckCards.length >= maxSize) {
            alert(`${type === 'anime' ? '动画' : '角色'}卡片已达上限（${maxSize}张）！`);
            return;
        }
        
        // 检查是否已存在
        const itemKey = type === 'anime' ? 'anime' : 'character';
        if (deckCards.some(card => card[itemKey].id === cardData[itemKey].id)) {
            return;
        }
        
        // 添加到卡组
        deckCards.push(cardData);
        _renderDeck();
    }

    // 从卡组移除卡片
    function _removeFromDeck(type, itemId) {
        const deckCards = currentDeck[type];
        const itemKey = type === 'anime' ? 'anime' : 'character';
        const index = deckCards.findIndex(card => card[itemKey].id === itemId);
        
        if (index > -1) {
            deckCards.splice(index, 1);
            _renderDeck();
        }
    }

    // 渲染整个卡组界面
    function _renderDeck() {
        _renderDeckCover();
        _renderDeckStats();
        _renderDeckLists();
        _renderCollection();
    }

    // 显示动画详情
    function _showAnimeDetail(animeData) {
        const { anime, count } = animeData;
        const modal = document.getElementById('anime-detail-modal');
        const content = document.getElementById('anime-detail-content');
        
        if (!modal || !content || !anime) return;

        const { rarityConfig } = window.GAME_CONFIG.animeSystem;
        const rarityColor = rarityConfig[anime.rarity]?.c || 'bg-gray-500';
        
        content.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <img src="${anime.image_path}" class="w-full aspect-[3/2] object-cover rounded-lg shadow-lg" onerror="this.src='https://placehold.co/300x200/e2e8f0/334155?text=图片丢失';">
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold mb-3">${anime.name}</h2>
                    <div class="flex items-center gap-4 mb-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">${anime.rarity}</span>
                        <span class="text-lg font-semibold text-gray-700">拥有数量: <span class="font-bold text-indigo-600">${count}</span></span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-600">点数</p>
                            <p class="text-xl font-bold text-indigo-600">${anime.points}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Cost</p>
                            <p class="text-xl font-bold text-indigo-600">${anime.cost}</p>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-4">${anime.description}</p>
                    <div class="mb-4">
                        <h3 class="font-bold mb-2">羁绊标签:</h3>
                        <div class="flex flex-wrap gap-2">
                            ${(anime.synergy_tags || []).map(tag => `<span class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">${tag}</span>`).join('') || '<span class="text-gray-500 text-sm">无</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    // 显示角色详情
    function _showCharacterDetail(characterData) {
        const { character, count } = characterData;
        const modal = document.getElementById('character-detail-modal');
        const content = document.getElementById('character-detail-content');
        
        if (!modal || !content || !character) return;

        const { rarityConfig } = window.GAME_CONFIG.characterSystem;
        const rarityColor = rarityConfig[character.rarity]?.c || 'bg-gray-500';
        
        content.innerHTML = `
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
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    // 新建卡组
    function _newDeck() {
        currentDeck = { anime: [], character: [] };
        currentDeckName = '新卡组';
        document.getElementById('deck-name-input').value = currentDeckName;
        _renderDeck();
    }

    // 保存卡组
    function _saveDeck() {
        const nameInput = document.getElementById('deck-name-input');
        const deckName = nameInput.value.trim() || '未命名卡组';
        
        if (currentDeck.anime.length === 0 && currentDeck.character.length === 0) {
            alert('空卡组无法保存！');
            return;
        }
        
        // 保存到本地存储（作为备份）
        savedDecks[deckName] = {
            name: deckName,
            anime: currentDeck.anime.slice(), // 创建副本
            character: currentDeck.character.slice(),
            cover: currentDeck.anime[0] || null,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
        
        // 同时保存到服务器端用户数据
        if (Game.Player && Game.Player.saveDeckToServer) {
            Game.Player.saveDeckToServer(deckName, {
                name: deckName,
                anime: currentDeck.anime.slice(),
                character: currentDeck.character.slice(),
                cover: currentDeck.anime[0] || null,
                createdAt: new Date().toISOString()
            });
        }
        
        alert(`卡组 "${deckName}" 保存成功！`);
        _updateDeckSelector();
    }

    // 加载卡组
    function _loadDeck() {
        const selector = document.getElementById('deck-selector');
        const selectedDeck = selector.value;
        
        if (selectedDeck && savedDecks[selectedDeck]) {
            const deck = savedDecks[selectedDeck];
            currentDeck = {
                anime: deck.anime.slice(),
                character: deck.character.slice()
            };
            currentDeckName = deck.name;
            document.getElementById('deck-name-input').value = currentDeckName;
            _renderDeck();
        }
    }

    // 更新卡组选择器
    function _updateDeckSelector() {
        const selector = document.getElementById('deck-selector');
        if (!selector) return;
        
        selector.innerHTML = '<option value="">选择卡组...</option>';
        
        Object.keys(savedDecks).forEach(deckName => {
            const deck = savedDecks[deckName];
            const option = document.createElement('option');
            option.value = deckName;
            option.textContent = `${deckName} (${deck.anime.length + deck.character.length}张)`;
            selector.appendChild(option);
        });
    }

    // 监听卡组更新事件
    function _setupEventListeners() {
        document.addEventListener('deckUpdated', (e) => {
            const { type, deckCards } = e.detail;
            if (type === 'anime') {
                currentDeck.anime = animeCollection.getDeckCards();
            } else if (type === 'character') {
                currentDeck.character = characterCollection.getDeckCards();
            }
            _renderDeck();
            
            // 更新统计信息
            const statsContainer = document.getElementById('deck-collection-stats');
            if (statsContainer) {
                if (currentViewType === 'anime') {
                    animeCollection.renderStats(statsContainer);
                } else {
                    characterCollection.renderStats(statsContainer);
                }
            }
        });
    }

    // 填充筛选器选项
    function _populateFilterOptions() {
        // 填充动画稀有度筛选器
        const animeRaritySelect = document.getElementById('deck-anime-filter-rarity');
        if (animeRaritySelect) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            animeRaritySelect.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                animeRaritySelect.appendChild(option);
            });
        }

        // 填充动画标签筛选器
        const animeTagSelect = document.getElementById('deck-anime-filter-tag');
        if (animeTagSelect && Game.AnimeGacha) {
            try {
                const allAnimes = Game.AnimeGacha.getAllAnimes();
                const allTags = new Set();
                allAnimes.forEach(anime => {
                    if (anime.synergy_tags && Array.isArray(anime.synergy_tags)) {
                        anime.synergy_tags.forEach(tag => allTags.add(tag));
                    }
                });
                
                animeTagSelect.innerHTML = '<option value="">所有标签</option>';
                Array.from(allTags).sort().forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag;
                    animeTagSelect.appendChild(option);
                });
            } catch (error) {
                console.warn('Failed to populate anime tags:', error);
            }
        }

        // 填充角色稀有度筛选器
        const characterRaritySelect = document.getElementById('deck-character-filter-rarity');
        if (characterRaritySelect) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            characterRaritySelect.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                characterRaritySelect.appendChild(option);
            });
        }

        // 填充角色性别筛选器
        const characterGenderSelect = document.getElementById('deck-character-filter-gender');
        if (characterGenderSelect) {
            const genders = ['男', '女', '未知'];
            characterGenderSelect.innerHTML = '<option value="">所有性别</option>';
            genders.forEach(gender => {
                const option = document.createElement('option');
                option.value = gender;
                option.textContent = gender;
                characterGenderSelect.appendChild(option);
            });
        }
    }

    // 公共接口
    return {
        init: function() {
            console.log('Initializing Hearthstone-style Deck Builder...');
            
            // 初始化收藏模块
            _initCollectionModules();
            
            // 从服务器加载保存的卡组
            if (Game.Player && Game.Player.getServerDecks) {
                const serverDecks = Game.Player.getServerDecks();
                if (serverDecks && Object.keys(serverDecks).length > 0) {
                    savedDecks = { ...serverDecks };
                }
            }
            
            // 从本地存储加载保存的卡组（作为备份或合并）
            const saved = localStorage.getItem('savedDecks');
            if (saved) {
                try {
                    const localDecks = JSON.parse(saved);
                    // 合并本地和服务器的卡组，服务器优先
                    savedDecks = { ...localDecks, ...savedDecks };
                } catch (e) {
                    console.error('Failed to load saved decks:', e);
                }
            }
            
            // 设置事件监听器
            _setupEventListeners();
            
            // 填充筛选器选项
            _populateFilterOptions();
            
            // 初始渲染
            _renderCollection();
            
            // 绑定UI事件
            document.getElementById('deck-view-anime')?.addEventListener('click', () => _switchViewType('anime'));
            document.getElementById('deck-view-character')?.addEventListener('click', () => _switchViewType('character'));
            
            document.getElementById('new-deck-btn')?.addEventListener('click', _newDeck);
            document.getElementById('save-deck-btn')?.addEventListener('click', _saveDeck);
            document.getElementById('load-deck-btn')?.addEventListener('click', _loadDeck);
            
            // 筛选器事件
            // 动画筛选器
            document.getElementById('deck-anime-filter-name')?.addEventListener('input', (e) => {
                animeCollection.handleFilterChange('name', e.target.value);
            });
            document.getElementById('deck-anime-filter-rarity')?.addEventListener('change', (e) => {
                animeCollection.handleFilterChange('rarity', e.target.value);
            });
            document.getElementById('deck-anime-filter-tag')?.addEventListener('change', (e) => {
                animeCollection.handleFilterChange('tag', e.target.value);
            });
            
            // 角色筛选器
            document.getElementById('deck-character-filter-name')?.addEventListener('input', (e) => {
                characterCollection.handleFilterChange('name', e.target.value);
            });
            document.getElementById('deck-character-filter-rarity')?.addEventListener('change', (e) => {
                characterCollection.handleFilterChange('rarity', e.target.value);
            });
            document.getElementById('deck-character-filter-gender')?.addEventListener('change', (e) => {
                characterCollection.handleFilterChange('gender', e.target.value);
            });
            
            // 一键分解按钮事件
            document.getElementById('deck-anime-dismantle-all-btn')?.addEventListener('click', () => {
                animeCollection.dismantleAllDuplicates();
                // 更新统计信息
                const statsContainer = document.getElementById('deck-collection-stats');
                if (statsContainer) {
                    animeCollection.renderStats(statsContainer);
                }
            });
            
            document.getElementById('deck-character-dismantle-all-btn')?.addEventListener('click', () => {
                characterCollection.dismantleAllDuplicates();
                // 更新统计信息
                const statsContainer = document.getElementById('deck-collection-stats');
                if (statsContainer) {
                    characterCollection.renderStats(statsContainer);
                }
            });
            
            // 模态框关闭事件
            document.getElementById('close-anime-detail-modal')?.addEventListener('click', () => {
                document.getElementById('anime-detail-modal').classList.add('hidden');
            });
            document.getElementById('close-character-detail-modal')?.addEventListener('click', () => {
                document.getElementById('character-detail-modal').classList.add('hidden');
            });
            
            _updateDeckSelector();
            console.log('Deck Builder initialized successfully.');
        },
        
        renderUI: function() {
            _renderDeck();
        },
        
        getCurrentDeck: function() {
            return currentDeck;
        },
        
        addToDeck: _addToDeck,
        removeFromDeck: _removeFromDeck
    };
})();