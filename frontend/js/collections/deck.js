// frontend/js/collections/deck.js - Hearthstone-style Deck Builder
window.Game = window.Game || {};

Game.Deck = (function() {
    
    let currentViewType = 'anime'; // 'anime' | 'character'
    let currentDeck = { anime: [], character: [] };
    let currentDeckName = '新卡组';
    let savedDecks = {}; // 保存的卡组库
    let currentInterface = 'list'; // 'list' | 'editor'

    // Collection modules for anime and character (for editor)
    let animeCollection, characterCollection;
    
    // Collection modules for list view
    let listAnimeCollection, listCharacterCollection;
    let listViewType = 'anime'; // 列表界面的当前视图类型

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
            maxDeckSize: 25,
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
        
        // 列表界面的动画收藏模块
        listAnimeCollection = Game.CollectionModule({
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
            maxDeckSize: 25,
            filterFields: ['name', 'rarity', 'tag']
        });

        // 列表界面的角色收藏模块
        listCharacterCollection = Game.CollectionModule({
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
        
        // 列表界面的收藏模块设置为浏览模式（非组卡模式）
        listAnimeCollection.setDeckMode(false);
        listCharacterCollection.setDeckMode(false);
    }

    // 切换界面（列表 <-> 编辑器）
    function _switchInterface(interfaceType) {
        currentInterface = interfaceType;
        
        const listView = document.getElementById('deck-list-view');
        const editorView = document.getElementById('deck-editor-view');
        
        if (interfaceType === 'list') {
            listView.classList.remove('hidden');
            editorView.classList.add('hidden');
            _renderDeckList();
            // 显示列表界面的收藏模块
            _showListCollection();
            // 延迟渲染收藏模块，确保DOM完全准备好并且数据已加载
            setTimeout(() => _renderListCollection(0), 200);
        } else if (interfaceType === 'editor') {
            listView.classList.add('hidden');
            editorView.classList.remove('hidden');
            _renderDeck();
            // 隐藏列表界面的收藏模块
            _hideListCollection();
        }
    }

    // 切换列表界面的视图类型
    function _switchListViewType(type) {
        listViewType = type;
        
        // 更新tab状态
        document.querySelectorAll('.collection-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.classList.add('text-gray-500', 'border-transparent');
            tab.classList.remove('text-indigo-600', 'border-indigo-500');
        });
        
        const activeTab = document.getElementById(`list-view-${type}`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            activeTab.classList.add('text-indigo-600', 'border-indigo-500');
        }
        
        // 切换筛选器显示
        document.getElementById('list-anime-filters').classList.toggle('hidden', type !== 'anime');
        document.getElementById('list-character-filters').classList.toggle('hidden', type !== 'character');
        
        // 渲染对应的收藏，延迟确保DOM更新完成
        setTimeout(() => _renderListCollection(0), 10);
    }

    // 显示列表界面的收藏模块
    function _showListCollection() {
        const collectionSection = document.getElementById('list-collection-container');
        if (collectionSection) {
            collectionSection.classList.remove('hidden');
        }
    }

    // 隐藏列表界面的收藏模块
    function _hideListCollection() {
        const collectionSection = document.getElementById('list-collection-container');
        if (collectionSection) {
            collectionSection.classList.add('hidden');
        }
    }

    // 检查数据是否真正准备好
    function _isDataReady() {
        // 检查玩家模块是否存在
        if (!Game.Player) {
            return false;
        }
        
        // 检查收藏数据是否加载（不只是占位符）
        const animeCollection = Game.Player.getAnimeCollection();
        if (animeCollection && animeCollection.size > 0) {
            // 检查第一个条目是否还是 Loading... 状态
            const firstEntry = animeCollection.values().next().value;
            if (firstEntry && firstEntry.anime && firstEntry.anime.name === 'Loading...') {
                return false;
            }
        }
        
        return true;
    }

    // 渲染列表界面的收藏区域
    function _renderListCollection(retryCount = 0) {
        const collectionView = document.getElementById('list-collection-view');
        const statsContainer = document.getElementById('list-collection-stats');
        
        if (!collectionView) {
            console.warn('List collection view not found');
            return;
        }

        // 确保收藏模块已初始化
        if (!listAnimeCollection || !listCharacterCollection) {
            if (retryCount < 5) {
                console.warn('List collection modules not initialized, reinitializing...', retryCount);
                // 如果模块未初始化，重新初始化
                _initCollectionModules();
                // 延迟重试渲染
                setTimeout(() => _renderListCollection(retryCount + 1), 100);
            } else {
                console.error('Failed to initialize list collection modules after 5 retries');
            }
            return;
        }

        // 检查数据是否真正准备好
        if (!_isDataReady()) {
            if (retryCount < 10) {
                console.warn('Data not ready yet, retrying in 100ms...', retryCount);
                setTimeout(() => _renderListCollection(retryCount + 1), 100);
            } else {
                console.error('Data still not ready after 10 retries, giving up');
            }
            return;
        }

        try {
            if (listViewType === 'anime') {
                listAnimeCollection.renderCollection(collectionView);
                if (statsContainer) {
                    listAnimeCollection.renderStats(statsContainer);
                }
            } else {
                listCharacterCollection.renderCollection(collectionView);
                if (statsContainer) {
                    listCharacterCollection.renderStats(statsContainer);
                }
            }
        } catch (error) {
            console.error('Error rendering list collection:', error);
            // 如果渲染失败，延迟重试（但有限制）
            if (retryCount < 3) {
                setTimeout(() => _renderListCollection(retryCount + 1), 200);
            } else {
                console.error('Failed to render list collection after 3 retries');
            }
        }
    }

    // 切换视图类型
    function _switchViewType(type) {
        currentViewType = type;
        
        // 更新tab状态
        document.querySelectorAll('.deck-view-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.classList.add('text-gray-500', 'border-transparent');
            tab.classList.remove('text-indigo-600', 'border-indigo-500');
        });
        
        const activeTab = document.getElementById(`deck-view-${type}`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            activeTab.classList.add('text-indigo-600', 'border-indigo-500');
        }
        
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

    // 渲染卡组主列表
    function _renderDeckList() {
        const deckGrid = document.getElementById('deck-grid');
        const emptyState = document.getElementById('empty-deck-state');
        
        if (!deckGrid) return;

        const deckCount = Object.keys(savedDecks).length;
        
        if (deckCount === 0) {
            deckGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        deckGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
        
        deckGrid.innerHTML = '';
        
        Object.keys(savedDecks).forEach(deckName => {
            const deck = savedDecks[deckName];
            const totalCards = deck.anime.length + deck.character.length;
            
            // 处理新旧封面格式
            let coverImage = 'https://placehold.co/300x180/e2e8f0/334155?text=卡组封面';
            
            if (deck.cover) {
                if (deck.cover.anime && deck.cover.anime.image_path) {
                    // 旧格式
                    coverImage = deck.cover.anime.image_path;
                } else if (deck.cover.id && deck.cover.type) {
                    // 新格式：通过ID获取封面
                    const coverCard = Game.CardResolver.getCardById(deck.cover.id, deck.cover.type);
                    if (coverCard && coverCard.image_path) {
                        coverImage = coverCard.image_path;
                    }
                }
            }
            
            const deckCard = document.createElement('div');
            deckCard.className = 'deck-list-card';
            deckCard.innerHTML = `
                <div class="deck-actions">
                    <button class="deck-action-btn delete" onclick="Game.Deck.deleteDeck('${deckName}'); event.stopPropagation();" title="删除卡组">
                        🗑️
                    </button>
                </div>
                <div class="overflow-hidden">
                    <img src="${coverImage}" class="deck-cover-img w-full" onerror="this.src='https://placehold.co/300x180/e2e8f0/334155?text=卡组封面'">
                </div>
                <div class="deck-info p-4">
                    <h3 class="deck-name-title">${deckName}</h3>
                    <div class="deck-stats-row">
                        <div class="deck-card-count">${totalCards}张卡牌</div>
                        <div class="text-white text-xs opacity-75">
                            ${deck.anime.length}动画 | ${deck.character.length}角色
                        </div>
                    </div>
                </div>
            `;
            
            deckCard.addEventListener('click', () => _editDeck(deckName));
            deckGrid.appendChild(deckCard);
        });
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
        
        // 检查是否已存在
        const itemKey = type === 'anime' ? 'anime' : 'character';
        if (deckCards.some(card => card[itemKey].id === cardData[itemKey].id)) {
            return;
        }
        
        // 检查数量限制（只有超出上限才提醒）
        if (deckCards.length + 1 > maxSize) {
            alert(`${type === 'anime' ? '动画' : '角色'}卡片已达上限（${maxSize}张）！`);
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

    // 编辑卡组
    function _editDeck(deckName) {
        if (savedDecks[deckName]) {
            const deck = savedDecks[deckName];
            
            // 使用CardResolver解析卡组数据
            currentDeck = {
                anime: _resolveDeckCards(deck.anime, 'anime'),
                character: _resolveDeckCards(deck.character, 'character')
            };
            
            currentDeckName = deck.name;
            document.getElementById('deck-name-input').value = currentDeckName;
            _switchInterface('editor');
        }
    }

    // 删除卡组
    function _deleteDeck(deckName) {
        if (confirm(`确定要删除卡组 "${deckName}" 吗？此操作不可撤销。`)) {
            delete savedDecks[deckName];
            
            // 更新本地存储
            localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
            
            // 同时从服务器删除
            if (Game.Player && Game.Player.deleteDeckFromServer) {
                Game.Player.deleteDeckFromServer(deckName);
            }
            
            _renderDeckList();
        }
    }

    // 新建卡组
    function _newDeck() {
        currentDeck = { anime: [], character: [] };
        currentDeckName = '新卡组';
        document.getElementById('deck-name-input').value = currentDeckName;
        _switchInterface('editor');
    }

    // 从列表界面新建卡组
    function _newDeckFromList() {
        _newDeck();
    }

    // 保存卡组
    function _saveDeck() {
        const nameInput = document.getElementById('deck-name-input');
        const deckName = nameInput.value.trim() || '未命名卡组';
        
        if (currentDeck.anime.length === 0 && currentDeck.character.length === 0) {
            alert('空卡组无法保存！');
            return;
        }
        
        // 使用CardResolver转换为优化的存储格式（只存储ID）
        const optimizedDeck = {
            name: deckName,
            anime: Game.CardResolver.animeToStorage(currentDeck.anime),
            character: Game.CardResolver.characterToStorage(currentDeck.character),
            cover: currentDeck.anime[0] ? {
                id: currentDeck.anime[0].anime.id,
                type: 'anime'
            } : null,
            createdAt: new Date().toISOString(),
            version: 2 // 标记为新版本格式
        };
        
        // 保存到本地存储（作为备份）
        savedDecks[deckName] = optimizedDeck;
        localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
        
        // 同时保存到服务器端用户数据
        if (Game.Player && Game.Player.saveDeckToServer) {
            Game.Player.saveDeckToServer(deckName, optimizedDeck);
        }
        
        alert(`卡组 "${deckName}" 保存成功！`);
        _updateDeckSelector();
        
        // 保存后返回列表界面
        setTimeout(() => {
            _switchInterface('list');
        }, 100);
    }

    // 加载卡组
    function _loadDeck() {
        const selector = document.getElementById('deck-selector');
        const selectedDeck = selector.value;
        
        if (selectedDeck && savedDecks[selectedDeck]) {
            const deck = savedDecks[selectedDeck];
            
            // 使用CardResolver解析卡组数据
            currentDeck = {
                anime: _resolveDeckCards(deck.anime, 'anime'),
                character: _resolveDeckCards(deck.character, 'character')
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

    // 解析卡组卡片数据（兼容新旧格式）
    function _resolveDeckCards(deckCards, type) {
        if (!deckCards || !Array.isArray(deckCards)) {
            return [];
        }

        // 检查是否是新格式（只有ID）
        const isNewFormat = deckCards.length > 0 && deckCards[0] && typeof deckCards[0].id !== 'undefined' && !deckCards[0][type];
        
        if (isNewFormat) {
            // 新格式：使用CardResolver解析
            console.log(`Loading ${type} deck cards from optimized format`);
            return Game.CardResolver.resolveCards(deckCards, type);
        } else {
            // 旧格式：直接使用（但同时迁移到新格式）
            console.log(`Loading ${type} deck cards from legacy format`);
            return deckCards.slice(); // 创建副本
        }
    }

    // 迁移旧格式卡组到新格式
    function _migrateDeckToNewFormat(deck) {
        if (!deck || deck.version === 2) {
            return deck; // 已经是新格式
        }

        console.log('Migrating deck to new format:', deck.name);
        
        const migratedDeck = {
            name: deck.name,
            anime: Game.CardResolver.migrateOldFormat(deck.anime, 'anime'),
            character: Game.CardResolver.migrateOldFormat(deck.character, 'character'),
            cover: deck.cover && deck.cover.anime ? {
                id: deck.cover.anime.id,
                type: 'anime'
            } : null,
            createdAt: deck.createdAt || new Date().toISOString(),
            version: 2
        };

        return migratedDeck;
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

        // 监听用户登录事件，重新渲染收藏
        document.addEventListener('playerLoggedIn', () => {
            console.log('Player logged in, refreshing collections...');
            // 延迟一点时间确保所有数据都已加载
            setTimeout(() => {
                if (currentInterface === 'list') {
                    _renderListCollection(0);
                }
            }, 500);
        });

        // 监听 UI 渲染完成事件（如果存在）
        document.addEventListener('uiRenderComplete', () => {
            console.log('UI render complete, refreshing collections...');
            setTimeout(() => {
                if (currentInterface === 'list') {
                    _renderListCollection(0);
                }
            }, 100);
        });
    }

    // 填充筛选器选项
    function _populateFilterOptions() {
        // 填充编辑界面的动画稀有度筛选器
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

        // 填充编辑界面的动画标签筛选器
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

        // 填充编辑界面的角色稀有度筛选器
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

        // 填充编辑界面的角色性别筛选器
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

        // 填充列表界面的动画稀有度筛选器
        const listAnimeRaritySelect = document.getElementById('list-anime-filter-rarity');
        if (listAnimeRaritySelect) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            listAnimeRaritySelect.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                listAnimeRaritySelect.appendChild(option);
            });
        }

        // 填充列表界面的动画标签筛选器
        const listAnimeTagSelect = document.getElementById('list-anime-filter-tag');
        if (listAnimeTagSelect && Game.AnimeGacha) {
            try {
                const allAnimes = Game.AnimeGacha.getAllAnimes();
                const allTags = new Set();
                allAnimes.forEach(anime => {
                    if (anime.synergy_tags && Array.isArray(anime.synergy_tags)) {
                        anime.synergy_tags.forEach(tag => allTags.add(tag));
                    }
                });
                
                listAnimeTagSelect.innerHTML = '<option value="">所有标签</option>';
                Array.from(allTags).sort().forEach(tag => {
                    const option = document.createElement('option');
                    option.value = tag;
                    option.textContent = tag;
                    listAnimeTagSelect.appendChild(option);
                });
            } catch (error) {
                console.warn('Failed to populate list anime tags:', error);
            }
        }

        // 填充列表界面的角色稀有度筛选器
        const listCharacterRaritySelect = document.getElementById('list-character-filter-rarity');
        if (listCharacterRaritySelect) {
            const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
            listCharacterRaritySelect.innerHTML = '<option value="">所有稀有度</option>';
            rarityOrder.forEach(rarity => {
                const option = document.createElement('option');
                option.value = rarity;
                option.textContent = rarity;
                listCharacterRaritySelect.appendChild(option);
            });
        }

        // 填充列表界面的角色性别筛选器
        const listCharacterGenderSelect = document.getElementById('list-character-filter-gender');
        if (listCharacterGenderSelect) {
            const genders = ['男', '女', '未知'];
            listCharacterGenderSelect.innerHTML = '<option value="">所有性别</option>';
            genders.forEach(gender => {
                const option = document.createElement('option');
                option.value = gender;
                option.textContent = gender;
                listCharacterGenderSelect.appendChild(option);
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
                    // 迁移服务器卡组到新格式
                    Object.keys(serverDecks).forEach(deckName => {
                        savedDecks[deckName] = _migrateDeckToNewFormat(serverDecks[deckName]);
                    });
                }
            }
            
            // 从本地存储加载保存的卡组（作为备份或合并）
            const saved = localStorage.getItem('savedDecks');
            if (saved) {
                try {
                    const localDecks = JSON.parse(saved);
                    // 迁移本地卡组到新格式并合并，服务器优先
                    Object.keys(localDecks).forEach(deckName => {
                        if (!savedDecks[deckName]) { // 只有服务器没有的才从本地加载
                            savedDecks[deckName] = _migrateDeckToNewFormat(localDecks[deckName]);
                        }
                    });
                    
                    // 重新保存迁移后的数据到本地存储
                    localStorage.setItem('savedDecks', JSON.stringify(savedDecks));
                } catch (e) {
                    console.error('Failed to load saved decks:', e);
                }
            }
            
            // 设置事件监听器
            _setupEventListeners();
            
            // 填充筛选器选项
            _populateFilterOptions();
            
            // 初始渲染 - 默认显示列表界面
            // 使用更长的延迟确保所有数据都已加载
            setTimeout(() => {
                _switchInterface('list');
            }, 300);
            
            // 绑定UI事件
            document.getElementById('deck-view-anime')?.addEventListener('click', (e) => {
                e.preventDefault();
                _switchViewType('anime');
            });
            document.getElementById('deck-view-character')?.addEventListener('click', (e) => {
                e.preventDefault();
                _switchViewType('character');
            });
            
            // 列表界面tab切换事件
            document.getElementById('list-view-anime')?.addEventListener('click', (e) => {
                e.preventDefault();
                _switchListViewType('anime');
            });
            document.getElementById('list-view-character')?.addEventListener('click', (e) => {
                e.preventDefault();
                _switchListViewType('character');
            });
            
            // 卡组列表界面事件
            document.getElementById('new-deck-btn-list')?.addEventListener('click', _newDeckFromList);
            document.getElementById('new-deck-btn-empty')?.addEventListener('click', _newDeckFromList);
            document.getElementById('back-to-deck-list')?.addEventListener('click', () => _switchInterface('list'));
            
            // 卡组编辑界面事件
            document.getElementById('new-deck-btn')?.addEventListener('click', _newDeck);
            document.getElementById('save-deck-btn')?.addEventListener('click', _saveDeck);
            
            // 卡组选择器自动加载
            document.getElementById('deck-selector')?.addEventListener('change', (e) => {
                if (e.target.value) {
                    _loadDeck();
                }
            });
            
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
            
            // 列表界面筛选器事件
            // 动画筛选器
            document.getElementById('list-anime-filter-name')?.addEventListener('input', (e) => {
                listAnimeCollection.handleFilterChange('name', e.target.value);
            });
            document.getElementById('list-anime-filter-rarity')?.addEventListener('change', (e) => {
                listAnimeCollection.handleFilterChange('rarity', e.target.value);
            });
            document.getElementById('list-anime-filter-tag')?.addEventListener('change', (e) => {
                listAnimeCollection.handleFilterChange('tag', e.target.value);
            });
            
            // 角色筛选器
            document.getElementById('list-character-filter-name')?.addEventListener('input', (e) => {
                listCharacterCollection.handleFilterChange('name', e.target.value);
            });
            document.getElementById('list-character-filter-rarity')?.addEventListener('change', (e) => {
                listCharacterCollection.handleFilterChange('rarity', e.target.value);
            });
            document.getElementById('list-character-filter-gender')?.addEventListener('change', (e) => {
                listCharacterCollection.handleFilterChange('gender', e.target.value);
            });
            
            // 编辑界面一键分解按钮事件
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
            
            // 列表界面一键分解按钮事件
            document.getElementById('list-anime-dismantle-all-btn')?.addEventListener('click', () => {
                listAnimeCollection.dismantleAllDuplicates();
                // 更新统计信息
                const statsContainer = document.getElementById('list-collection-stats');
                if (statsContainer) {
                    listAnimeCollection.renderStats(statsContainer);
                }
            });
            
            document.getElementById('list-character-dismantle-all-btn')?.addEventListener('click', () => {
                listCharacterCollection.dismantleAllDuplicates();
                // 更新统计信息
                const statsContainer = document.getElementById('list-collection-stats');
                if (statsContainer) {
                    listCharacterCollection.renderStats(statsContainer);
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
        removeFromDeck: _removeFromDeck,
        deleteDeck: _deleteDeck
    };
})();