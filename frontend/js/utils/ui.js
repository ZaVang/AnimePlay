// frontend/js/ui.js
window.Game = window.Game || {};

Game.UI = (function() {

    const elements = {
        loginModal: document.getElementById('user-login-modal'),
        loginInput: document.getElementById('username-input'),
        loginBtn: document.getElementById('login-btn'),
        userDisplay: document.getElementById('user-display'),
        navLinks: document.querySelectorAll('.nav-link'),
        mainSections: document.querySelectorAll('main section'),
        home: {
            level: document.getElementById('player-level'),
            animeGachaTickets: document.getElementById('anime-gacha-tickets'),
            characterGachaTickets: document.getElementById('character-gacha-tickets'),
            knowledge: document.getElementById('knowledge-points'),
            expBar: document.getElementById('player-exp-bar'),
            expText: document.getElementById('player-exp-text'),
            viewingQueue: document.getElementById('viewing-queue'),
            logArea: document.getElementById('log-area'),
        },
        gacha: {
            typeAnimeBtn: document.getElementById('gacha-type-anime'),
            typeCharacterBtn: document.getElementById('gacha-type-character'),
            animeContent: document.getElementById('anime-gacha-content'),
            characterContent: document.getElementById('character-gacha-content'),
        },
        animeGacha: {
            tabs: { 
                pool: document.getElementById('tab-anime-pool'), 
                history: document.getElementById('tab-anime-history'), 
                shop: document.getElementById('tab-anime-shop') 
            },
            contents: { 
                pool: document.getElementById('anime-gacha-pool-content'), 
                history: document.getElementById('anime-gacha-history-content'), 
                shop: document.getElementById('anime-gacha-shop-content') 
            },
            UpBanner: document.getElementById('anime-up-banner'),
            singleBtn: document.getElementById('anime-gacha-btn-single'),
            multiBtn: document.getElementById('anime-gacha-btn-multi'),
            ResultModal: document.getElementById('anime-gacha-result-modal'),
            ResultContainer: document.getElementById('anime-gacha-result-cards'),
            closeResultBtn: document.getElementById('close-anime-gacha-result-modal'),
            HistoryChartCanvas: document.getElementById('anime-gacha-history-chart'),
            HistoryList: document.getElementById('anime-gacha-history-list'),
            RatesModal: document.getElementById('anime-gacha-rates-modal'),
            RatesContent: document.getElementById('anime-gacha-rates-content'),
            showRatesBtn: document.getElementById('show-anime-gacha-rates'),
            closeRatesBtn: document.getElementById('close-anime-gacha-rates-modal'),
            shopItems: document.getElementById('anime-shop-items'),
        },
        characterGacha: {
            tabs: { 
                pool: document.getElementById('tab-character-pool'), 
                history: document.getElementById('tab-character-history'), 
                shop: document.getElementById('tab-character-shop') 
            },
            contents: { 
                pool: document.getElementById('character-gacha-pool-content'), 
                history: document.getElementById('character-gacha-history-content'),
                shop: document.getElementById('character-gacha-shop-content') 
            },
            UpBanner: document.getElementById('character-up-banner'),
            singleBtn: document.getElementById('character-gacha-btn-single'),
            multiBtn: document.getElementById('character-gacha-btn-multi'),
            ResultModal: document.getElementById('character-gacha-result-modal'),
            ResultContainer: document.getElementById('character-gacha-result-cards'),
            closeResultBtn: document.getElementById('close-character-gacha-result-modal'),
            HistoryChartCanvas: document.getElementById('character-gacha-history-chart'),
            HistoryList: document.getElementById('character-gacha-history-list'),
            RatesModal: document.getElementById('character-gacha-rates-modal'),
            RatesContent: document.getElementById('character-gacha-rates-content'),
            showRatesBtn: document.getElementById('show-character-gacha-rates'),
            closeRatesBtn: document.getElementById('close-character-gacha-rates-modal'),
            shopItems: document.getElementById('character-shop-items'),
        },
        deck: {
            container: document.getElementById('deck-and-collection'),
            selector: document.getElementById('deck-selector'),
            newBtn: document.getElementById('new-deck-btn'),
            renameBtn: document.getElementById('rename-deck-btn'),
            deleteBtn: document.getElementById('delete-deck-btn'),
            saveBtn: document.getElementById('save-deck-btn-new'),
            costDisplay: document.getElementById('deck-cost-display'),
            countDisplay: document.getElementById('deck-count-display'),
            list: document.getElementById('current-deck-list'),
        },
        animeCollection: {
            CollectionContainer: document.getElementById('anime-collection-view'),
            FilterName: document.getElementById('anime-filter-name'),
            FilterRarity: document.getElementById('anime-filter-rarity'),
            FilterTag: document.getElementById('anime-filter-tag'),
            DismantleAllBtn: document.getElementById('anime-dismantle-all-btn'),
            DetailModal: document.getElementById('anime-detail-modal'),
            DetailContent: document.getElementById('anime-detail-content'),
            closeDetailBtn: document.getElementById('close-anime-detail-modal'),
        },
        characterCollection: {
            CollectionContainer: document.getElementById('character-collection-view'),
            FilterName: document.getElementById('character-filter-name'),
            FilterRarity: document.getElementById('character-filter-rarity'),
            FilterGender: document.getElementById('character-filter-gender'),
            DismantleAllBtn: document.getElementById('character-dismantle-all-btn'),
            DetailModal: document.getElementById('character-detail-modal'),
            DetailContent: document.getElementById('character-detail-content'),
            closeDetailBtn: document.getElementById('close-character-detail-modal'),
        },
        battle: {
            container: document.getElementById('battle'),
            setup: document.getElementById('battle-setup-new'),
            arenaContainer: document.getElementById('battle-arena-container'),
            deckSelector: document.getElementById('battle-deck-selector'),
            startBtn: document.getElementById('start-battle-btn-new'),
            resultModal: document.getElementById('battle-result-modal'),
            log: document.getElementById('battle-log-new'),
        },
        viewingQueueModal: {
            modal: document.getElementById('viewing-queue-modal'),
            collection: document.getElementById('viewing-queue-collection'),
            closeBtn: document.getElementById('close-viewing-queue-modal'),
        }
    };

    const chartInstances = {
        anime: null,
        character: null
    };

    function _createUnifiedCardElement(itemData, itemConfig, context, options = {}) {
        const { count } = itemData;
        const item = itemData[itemConfig.itemKey];
        
        if (!item) {
            const element = document.createElement('div');
            element.className = 'card bg-white rounded-lg shadow-md overflow-hidden flex items-center justify-center';
            element.style.height = '240px';
            const itemId = itemData.id || 'unknown';
            element.innerHTML = `<div class="text-center p-2"><p class="font-bold text-gray-500">加载中...</p><p class="text-xs text-gray-400">ID: ${itemId}</p></div>`;
            return element;
        }

        const { rarityConfig } = itemConfig;
        const rarityData = rarityConfig[item.rarity] || {};
        const rarityColor = rarityData.c || 'bg-gray-500';
        const effectClass = rarityData.effect && rarityData.effect !== 'none' ? rarityData.effect : '';
        
        const element = document.createElement('div');
        element.className = `card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group relative ${effectClass}`;

        let countBadge = '';
        if (context.includes('collection') && count > 1) {
            const badgeColor = itemConfig.itemType === '角色' ? 'bg-pink-600' : 'bg-indigo-600';
            countBadge = `<div class="absolute bottom-1 right-1 ${badgeColor} text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">x${count}</div>`;
        }
        
        let overlay = '';
        if (context === 'deck-collection' && itemConfig.itemType === '动画' && Game.Deck.getActiveDeck().includes(item.id)) {
            overlay = '<div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center"><span class="text-white font-bold text-lg">已在卡组</span></div>';
        }

        const image_placeholder = itemConfig.itemType === '角色' ? '角色头像' : '图片丢失';
        
        let cardBottom = '';
        if (itemConfig.itemType === '角色') {
            cardBottom = `
                <div class="p-2">
                    <p class="text-xs text-center font-bold truncate" title="${item.name}">${item.name}</p>
                    ${item.anime_count > 0 ? `<p class="text-xs text-center text-gray-500 mt-1">${item.anime_count}部作品</p>` : ''}
                </div>`;
        } else {
            cardBottom = `<p class="text-xs text-center font-bold p-1 truncate" title="${item.name}">${item.name}</p>`;
        }

        element.innerHTML = `
            <div class="relative">
                <img src="${item.image_path}" class="w-full aspect-[2/3] object-contain" onerror="this.src='https://placehold.co/240x360/e2e8f0/334155?text=${image_placeholder}';">
                <div class="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-bl-lg rounded-tr-lg">${item.rarity}</div>
                ${countBadge}
                ${overlay}
            </div>
            ${cardBottom}`;

        if (options.isDuplicate) {
             element.firstElementChild.insertAdjacentHTML('beforeend', `<div class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-center p-1"><span class="text-white font-bold text-2xl">+1</span></div>`);
        }
        if (options.isNew) {
            element.firstElementChild.insertAdjacentHTML('beforeend', `<div class="absolute top-1 left-1 bg-green-500 text-white text-xs font-bold px-1 rounded">NEW</div>`);
        }

        element.dataset.itemId = item.id;
        element.dataset.itemType = itemConfig.itemType;
        
        return element;
    }

    function _createAnimeCardElement(animeData, context, options = {}) {
        const config = {
            itemType: '动画',
            itemKey: 'anime',
            rarityConfig: window.GAME_CONFIG.animeSystem.rarityConfig
        };
        return _createUnifiedCardElement(animeData, config, context, options);
    }

    function _createCharacterCardElement(characterData, context, options = {}) {
        const config = {
            itemType: '角色',
            itemKey: 'character',
            rarityConfig: window.GAME_CONFIG.characterSystem.rarityConfig
        };
        return _createUnifiedCardElement(characterData, config, context, options);
    }

    function _logMessage(message, type = 'info') {
        const logEntry = document.createElement('p');
        let icon = '';
        if (type === 'level-up') icon = '&#11088;';
        if (type === 'reward') icon = '&#127873;';
        logEntry.innerHTML = `${icon} ${message}`;
        elements.home.logArea.prepend(logEntry);
        if (elements.home.logArea.children.length > 20) {
            elements.home.logArea.lastChild.remove();
        }
    }
    
    function _renderPlayerState() {
        const playerState = Game.Player.getState();
        const { levelXP } = window.GAME_CONFIG.gameplay;
        elements.home.level.textContent = playerState.level;
        elements.home.animeGachaTickets.textContent = playerState.animeGachaTickets;
        elements.home.characterGachaTickets.textContent = playerState.characterGachaTickets || 0;
        elements.home.knowledge.textContent = playerState.knowledgePoints.toLocaleString();

        const requiredExp = levelXP[playerState.level] || Infinity;
        const expPercent = requiredExp === Infinity ? 100 : (playerState.exp / requiredExp) * 100;
        elements.home.expBar.style.width = `${expPercent}%`;
        elements.home.expText.textContent = `${playerState.exp.toLocaleString()} / ${requiredExp.toLocaleString()}`;
    }

    function _renderAll() {
        _renderPlayerState();
        if (Game.AnimeGacha && Game.AnimeGacha.isInitialized()) Game.AnimeGacha.renderUI();
        if (Game.CharacterGacha && Game.CharacterGacha.isInitialized()) Game.CharacterGacha.renderUI();
        if (Game.UnifiedCollection) Game.UnifiedCollection.renderUI();
        Game.Deck.renderUI();
        _renderViewingQueue();
    }

    function _openViewingQueueModal(slotIndex) {
        const collectionContainer = elements.viewingQueueModal.collection;
        collectionContainer.innerHTML = '';
        const cardsInQueue = Game.Player.getState().viewingQueue.filter(s => s).map(s => s.Id);
        const availableCards = Array.from(Game.Player.getAnimeCollection().values())
                                    .filter(data => data.anime && !cardsInQueue.includes(data.anime.id));

        if (availableCards.length === 0) {
            collectionContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center">没有可添加的卡牌了。</p>';
        } else {
            availableCards.forEach(animeData => {
                const animeEl = _createAnimeCardElement(animeData, 'viewing-queue-selection');
                animeEl.addEventListener('click', () => Game.Player.addToViewingQueue(animeData.anime.id, slotIndex));
                collectionContainer.appendChild(animeEl);
            });
        }
        elements.viewingQueueModal.modal.classList.remove('hidden');
    }

    function _renderViewingQueue() {
        const queueContainer = elements.home.viewingQueue;
        const playerState = Game.Player.getState();
        const allAnimes = Game.AnimeGacha.getAllAnimes(); 
        if (!queueContainer || !playerState || !allAnimes || allAnimes.length === 0) return;

        queueContainer.innerHTML = '';
        playerState.viewingQueue.forEach((slot, index) => {
            const slotElement = document.createElement('div');
            slotElement.className = 'h-48 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300';

            if (slot) {
                const anime = allAnimes.find(c => c.id === slot.Id);
                if (!anime) return; 
                
                const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[anime.rarity];
                
                if (!rewards) {
                    console.error(`观看队列错误: 稀有度 '${anime.rarity}' (番剧: ${anime.name}) 没有在 game_config.js 中配置奖励。`);
                    slotElement.innerHTML = `<div class="text-center p-2"><p class="font-bold text-red-500">配置错误</p><p class="text-xs text-gray-500 truncate" title="${anime.name}">${anime.name}</p></div>`;
                    queueContainer.appendChild(slotElement);
                    return;
                }

                const endTime = new Date(slot.startTime).getTime() + rewards.time * 60 * 1000;
                const now = Date.now();

                if (now >= endTime) {
                    slotElement.innerHTML = `
                        <div class="text-center cursor-pointer" data-slot-index="${index}">
                            <img src="${anime.image_path}" class="w-20 aspect-[3/2] object-cover rounded-md mx-auto mb-2" onerror="this.src='https://placehold.co/120x80/e2e8f0/334155?text=图片丢失';">
                            <p class="font-bold">${anime.name}</p>
                            <button class="collect-btn mt-2 bg-green-500 text-white font-bold py-1 px-3 rounded-lg">收获</button>
                        </div>`;
                    slotElement.querySelector('.collect-btn').addEventListener('click', () => Game.Player.collectFromViewingQueue(index));
                } else {
                    const remainingTime = endTime - now;
                    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
                    slotElement.innerHTML = `
                        <div class="text-center">
                            <img src="${anime.image_path}" class="w-20 aspect-[3/2] object-cover rounded-md mx-auto mb-2" onerror="this.src='https://placehold.co/120x80/e2e8f0/334155?text=图片丢失';">
                            <p class="font-bold">${anime.name}</p>
                            <p class="text-sm text-gray-600">剩余: ${hours}h ${minutes}m ${seconds}s</p>
                        </div>`;
                }
            } else {
                slotElement.innerHTML = `
                    <button class="add-to-queue-btn text-gray-400 hover:text-indigo-600" data-slot-index="${index}">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        <span class="font-bold">添加动画</span>
                    </button>`;
                slotElement.querySelector('.add-to-queue-btn').addEventListener('click', () => _openViewingQueueModal(index));
            }
            queueContainer.appendChild(slotElement);
        });
    }

    function _switchGachaType(type) {
        const { typeAnimeBtn, typeCharacterBtn, animeContent, characterContent } = elements.gacha;
        typeAnimeBtn.classList.toggle('active', type === 'anime');
        typeCharacterBtn.classList.toggle('active', type === 'character');
        animeContent.classList.toggle('hidden', type === 'character');
        characterContent.classList.toggle('hidden', type === 'anime');
    }

    function _switchGachaTab(tabName, type) {
        const config = type === 'character' ? elements.characterGacha : elements.animeGacha;

        Object.keys(config.tabs).forEach(key => {
            if (config.tabs[key]) {
                config.tabs[key].classList.toggle('active', key === tabName);
            }
        });

        Object.keys(config.contents).forEach(key => {
            if (config.contents[key]) {
                config.contents[key].classList.toggle('hidden', key !== tabName);
            }
        });
        
        if (tabName === 'history') {
            renderGachaHistory(type);
        } else if (tabName === 'shop') {
            // 渲染商店内容
            if (type === 'character' && Game.CharacterGacha && Game.CharacterGacha.isInitialized()) {
                // 调用角色抽卡的renderUI来更新商店
                Game.CharacterGacha.renderUI();
            } else if (type === 'anime' && Game.AnimeGacha && Game.AnimeGacha.isInitialized()) {
                // 调用动画抽卡的renderUI来更新商店
                Game.AnimeGacha.renderUI();
            }
        }
    }

    function renderGachaHistory(type) {
        chartInstances[type] = Game.BaseGacha.renderHistory(
            type === 'character' ? Game.Player.getCharacterGachaHistory() : Game.Player.getAnimeGachaHistory(),
            window.GAME_CONFIG[type + 'System'].rarityConfig,
            elements[type + 'Gacha'].HistoryList,
            elements[type + 'Gacha'].HistoryChartCanvas,
            chartInstances[type],
            type === "character" ? "角色" : "番剧"
        );
    }

    return {
        init: function() {
            elements.loginBtn?.addEventListener('click', async () => {
                const username = elements.loginInput.value.trim();
                if (username) {
                    await Game.Player.login(username);
                }
            });
             elements.loginInput?.addEventListener('keyup', async (event) => {
                if (event.key === 'Enter') {
                    const username = elements.loginInput.value.trim();
                    if (username) {
                        await Game.Player.login(username);
                    }
                }
            });
            window.addEventListener('hashchange', () => {
                let hash = window.location.hash || '#home';
                elements.mainSections.forEach(s => s.classList.toggle('hidden', `#${s.id}` !== hash));
                elements.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === hash));
                if (hash === '#deck-and-collection') Game.Deck.renderUI();
                if (hash === '#gacha') {
                    if(Game.AnimeGacha.isInitialized()) Game.AnimeGacha.renderUI();
                    if(Game.CharacterGacha.isInitialized()) Game.CharacterGacha.renderUI();
                }
                if (hash === '#collection' && Game.UnifiedCollection) Game.UnifiedCollection.renderUI();
                if (hash === '#battle') Game.Battle.renderSetup();
            });
            
            location.hash = '#home';
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            elements.viewingQueueModal.closeBtn?.addEventListener('click', () => elements.viewingQueueModal.modal.classList.add('hidden'));
            elements.gacha.typeAnimeBtn?.addEventListener('click', () => _switchGachaType('anime'));
            elements.gacha.typeCharacterBtn?.addEventListener('click', () => _switchGachaType('character'));

            setInterval(_renderViewingQueue, 1000);

            console.log("UI module initialized.");
        },
        elements: elements,
        createAnimeCardElement: _createAnimeCardElement,
        createCharacterCardElement: _createCharacterCardElement,
        logMessage: _logMessage,
        renderPlayerState: _renderPlayerState,
        renderAll: _renderAll,
        switchGachaTab: _switchGachaTab,
        switchGachaType: _switchGachaType,
        showLoggedInUser: function(username) {
            elements.userDisplay.innerHTML = `当前用户: <span class="font-bold text-indigo-600">${username}</span> <button id="logout-btn" class="ml-4 text-sm text-red-500 hover:underline">[切换用户]</button>`;
            document.getElementById('logout-btn').addEventListener('click', Game.Player.logout);
        },
        hideLoginModal: () => elements.loginModal.classList.add('hidden'),
        showLoginModal: () => elements.loginModal.classList.remove('hidden'),
        renderViewingQueue: _renderViewingQueue,
    };
})();