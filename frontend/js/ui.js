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
            tickets: document.getElementById('gacha-tickets'),
            knowledge: document.getElementById('knowledge-points'),
            expBar: document.getElementById('player-exp-bar'),
            expText: document.getElementById('player-exp-text'),
            viewingQueue: document.getElementById('viewing-queue'),
            logArea: document.getElementById('log-area'),
        },
        gacha: {
            tabs: { pool: document.getElementById('tab-gacha-pool'), history: document.getElementById('tab-gacha-history'), shop: document.getElementById('tab-gacha-shop') },
            contents: { pool: document.getElementById('gacha-pool-content'), history: document.getElementById('gacha-history-content'), shop: document.getElementById('gacha-shop-content') },
            upBanner: document.getElementById('up-banner'),
            singleBtn: document.getElementById('gacha-btn-single'),
            multiBtn: document.getElementById('gacha-btn-multi'),
            resultModal: document.getElementById('gacha-result-modal'),
            resultContainer: document.getElementById('gacha-result-cards'),
            closeResultBtn: document.getElementById('close-gacha-modal'),
            historyChartCanvas: document.getElementById('gachaHistoryChart'),
            historyList: document.getElementById('gacha-history-list'),
            ratesModal: document.getElementById('gacha-rates-modal'),
            ratesContent: document.getElementById('gacha-rates-content'),
            showRatesBtn: document.getElementById('show-gacha-rates'),
            closeRatesBtn: document.getElementById('close-gacha-rates-modal'),
            shopItems: document.getElementById('shop-items'),
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
        collection: {
            container: document.getElementById('collection-view'),
            filterName: document.getElementById('collection-filter-name'),
            filterRarity: document.getElementById('collection-filter-rarity'),
            filterTag: document.getElementById('collection-filter-tag'),
            dismantleAllBtn: document.getElementById('dismantle-all-btn-new'),
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
        detailModal: {
            modal: document.getElementById('card-detail-modal'),
            content: document.getElementById('card-detail-content'),
            closeBtn: document.getElementById('close-detail-modal'),
        },
        viewingQueueModal: {
            modal: document.getElementById('viewing-queue-modal'),
            collection: document.getElementById('viewing-queue-collection'),
            closeBtn: document.getElementById('close-viewing-queue-modal'),
        }
    };

    let gachaHistoryChartInstance = null;

    function _createCardElement(cardData, context, options = {}) {
        const { card, count } = cardData;
        const { rarityConfig } = window.GAME_CONFIG;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        const element = document.createElement('div');
        element.className = 'card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group relative';

        const activeDeck = Game.Deck.getActiveDeck();
        const isInDeck = activeDeck.includes(card.id);

        let overlay = '';
        if (context === 'deck-collection' && isInDeck) {
            overlay = '<div class="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center"><span class="text-white font-bold text-lg">已在卡组</span></div>';
        }

        let countBadge = '';
        if ((context === 'deck-collection' || context === 'collection') && count > 1) {
            countBadge = `<div class="absolute bottom-1 right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">x${count}</div>`;
        }
        
        element.innerHTML = `
            <div class="relative">
                <img src="${card.image_path}" class="w-full h-28 object-cover" onerror="this.src='https://placehold.co/120x168/e2e8f0/334155?text=图片丢失';">
                <div class="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-bl-lg rounded-tr-lg">${card.rarity}</div>
                ${countBadge}
                ${overlay}
            </div>
            <p class="text-xs text-center font-bold p-1 truncate" title="${card.name}">${card.name}</p>`;

        if (options.isDuplicate) {
             element.firstElementChild.innerHTML += `<div class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-center p-1"><span class="text-white font-bold text-2xl">+1</span></div>`;
        }

        element.dataset.cardId = card.id;

        // Click handlers are now managed in their respective modules (Deck, Battle, etc.)
        element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            _showCardDetail(cardData);
        });

        return element;
    }

    function _showCardDetail(cardData) {
        const { card, count } = cardData;
        const { rarityConfig } = window.GAME_CONFIG;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        
        let detailHtml = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <img src="${card.image_path}" class="w-full h-auto object-cover rounded-lg shadow-lg" onerror="this.src='https://placehold.co/225x318/e2e8f0/334155?text=图片丢失';">
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold">${card.name}</h2>
                    <div class="my-2 flex items-center gap-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">${card.rarity}</span>
                        <span class="text-lg font-semibold text-gray-700">拥有数量: <span class="font-bold text-indigo-600">${count}</span></span>
                    </div>
                    <p class="text-lg font-semibold text-indigo-600">点数: ${card.points} / Cost: ${card.cost}</p>
                    <div class="mt-4 p-3 bg-gray-100 rounded-lg">
                        <h3 class="font-bold text-gray-800">Bangumi 数据</h3>
                        <div class="grid grid-cols-3 gap-2 text-center mt-2 text-sm">
                            <div><p class="font-semibold text-gray-600">评分</p><p class="font-bold text-xl text-amber-600">${card.rating_score || 'N/A'}</p></div>
                            <div><p class="font-semibold text-gray-600">排名</p><p class="font-bold text-xl text-amber-600">#${card.rating_rank || 'N/A'}</p></div>
                            <div><p class="font-semibold text-gray-600">评价人数</p><p class="font-bold text-xl text-amber-600">${(card.rating_total || 0).toLocaleString()}</p></div>
                        </div>
                    </div>
                    <p class="mt-4 text-gray-600">${card.description}</p>
                    <h3 class="font-bold mt-4">羁绊标签:</h3>
                    <div class="flex flex-wrap gap-2 mt-2">${(card.synergy_tags || []).map(tag => `<span class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">${tag}</span>`).join('') || '<span class="text-gray-500 text-sm">无</span>'}</div>
                    <div id="dismantle-section" class="mt-6"></div>
                </div>
            </div>`;

        elements.detailModal.content.innerHTML = detailHtml;

        if (count > 1) {
            const dismantleValue = Game.Gacha.getDismantleValue(card.rarity);
            const dismantleSection = elements.detailModal.content.querySelector('#dismantle-section');
            dismantleSection.innerHTML = `
                <h3 class="font-bold">分解卡牌</h3>
                <p class="text-sm text-gray-600">分解一张多余的卡牌可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                <button id="dismantle-btn" class="mt-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">分解一张</button>
            `;
            dismantleSection.querySelector('#dismantle-btn').addEventListener('click', () => {
                Game.Deck.dismantleCard(card.id);
                elements.detailModal.modal.classList.add('hidden');
            });
        }
        elements.detailModal.modal.classList.remove('hidden');
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
        elements.home.tickets.textContent = playerState.gachaTickets;
        elements.home.knowledge.textContent = playerState.knowledgePoints.toLocaleString();

        const requiredExp = levelXP[playerState.level] || Infinity;
        const expPercent = requiredExp === Infinity ? 100 : (playerState.exp / requiredExp) * 100;
        elements.home.expBar.style.width = `${expPercent}%`;
        elements.home.expText.textContent = `${playerState.exp.toLocaleString()} / ${requiredExp.toLocaleString()}`;
    }

    function _renderAll() {
        _renderPlayerState();
        Game.Gacha.renderUI(); // Delegate to Gacha module
        Game.Deck.renderUI();  // Delegate to Deck module
        _renderViewingQueue(); // Add this line
    }
    
    function _populateFilters() {
        const allCards = Game.Player.getAllCards();
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        elements.collection.filterRarity.innerHTML = '<option value="">所有稀有度</option>';
        rarityOrder.forEach(rarity => {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            elements.collection.filterRarity.appendChild(option);
        });

        const allTags = new Set();
        allCards.forEach(card => (card.synergy_tags || []).forEach(tag => allTags.add(tag)));
        elements.collection.filterTag.innerHTML = '<option value="">所有标签</option>';
        Array.from(allTags).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            elements.collection.filterTag.appendChild(option);
        });
    }

    function _openViewingQueueModal(slotIndex) {
        const collectionContainer = elements.viewingQueueModal.collection;
        collectionContainer.innerHTML = '';
        const cardsInQueue = Game.Player.getState().viewingQueue.filter(s => s).map(s => s.cardId);
        const availableCards = Array.from(Game.Player.getPlayerCollection().values()).filter(data => !cardsInQueue.includes(data.card.id));

        if (availableCards.length === 0) {
            collectionContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center">没有可添加的卡牌了。</p>';
        } else {
            availableCards.forEach(cardData => {
                const cardEl = _createCardElement(cardData, 'viewing-queue-selection');
                cardEl.addEventListener('click', () => Game.Player.addToViewingQueue(cardData.card.id, slotIndex));
                collectionContainer.appendChild(cardEl);
            });
        }
        elements.viewingQueueModal.modal.classList.remove('hidden');
    }

    function _renderViewingQueue() {
        const queueContainer = elements.home.viewingQueue;
        const playerState = Game.Player.getState();
        const allCards = Game.Player.getAllCards();
        if (!queueContainer || !playerState || !allCards) return;

        queueContainer.innerHTML = '';
        playerState.viewingQueue.forEach((slot, index) => {
            const slotElement = document.createElement('div');
            slotElement.className = 'h-48 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300';

            if (slot) {
                const card = allCards.find(c => c.id === slot.cardId);
                if (!card) return; // Card might not be found if allCards is not ready
                
                const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[card.rarity];
                
                // --- FIX: Add a guard against misconfiguration ---
                if (!rewards) {
                    console.error(`观看队列错误: 稀有度 '${card.rarity}' (卡牌: ${card.name}) 没有在 game_config.js 中配置奖励。`);
                    slotElement.innerHTML = `<div class="text-center p-2"><p class="font-bold text-red-500">配置错误</p><p class="text-xs text-gray-500 truncate" title="${card.name}">${card.name}</p></div>`;
                    queueContainer.appendChild(slotElement);
                    return; // Skips to the next item in the loop
                }
                // --- END FIX ---

                const endTime = new Date(slot.startTime).getTime() + rewards.time * 60 * 1000;
                const now = Date.now();

                if (now >= endTime) {
                    slotElement.innerHTML = `
                        <div class="text-center cursor-pointer" data-slot-index="${index}">
                            <img src="${card.image_path}" class="w-20 h-28 object-cover rounded-md mx-auto mb-2" onerror="this.src='https://placehold.co/80x112/e2e8f0/334155?text=图片丢失';">
                            <p class="font-bold">${card.name}</p>
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
                            <img src="${card.image_path}" class="w-20 h-28 object-cover rounded-md mx-auto mb-2" onerror="this.src='https://placehold.co/80x112/e2e8f0/334155?text=图片丢失';">
                            <p class="font-bold">${card.name}</p>
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

    return {
        init: function() {
            // Navigation
            window.addEventListener('hashchange', () => {
                let hash = window.location.hash || '#home';
                elements.mainSections.forEach(s => s.classList.toggle('hidden', `#${s.id}` !== hash));
                elements.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === hash));
                if (hash === '#deck-and-collection') Game.Deck.renderUI();
                if (hash === '#battle') Game.Battle.renderSetup();
            });
            
             // Set initial state
            location.hash = '#home';
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            // Modal close buttons
            elements.gacha.closeResultBtn.addEventListener('click', () => elements.gacha.resultModal.classList.add('hidden'));
            elements.detailModal.closeBtn.addEventListener('click', () => elements.detailModal.modal.classList.add('hidden'));
            elements.viewingQueueModal.closeBtn.addEventListener('click', () => elements.viewingQueueModal.modal.classList.add('hidden'));
            elements.gacha.closeRatesBtn.addEventListener('click', () => elements.gacha.ratesModal.classList.add('hidden'));

            setInterval(_renderViewingQueue, 1000);

            console.log("UI module initialized.");
        },
        elements: elements,
        createCardElement: _createCardElement,
        showCardDetail: _showCardDetail,
        logMessage: _logMessage,
        renderPlayerState: _renderPlayerState,
        renderAll: _renderAll,
        populateFilters: _populateFilters,
        showLoggedInUser: function(username) {
            elements.userDisplay.innerHTML = `当前用户: <span class="font-bold text-indigo-600">${username}</span> <button id="logout-btn" class="ml-4 text-sm text-red-500 hover:underline">[切换用户]</button>`;
            document.getElementById('logout-btn').addEventListener('click', Game.Player.logout);
        },
        hideLoginModal: () => elements.loginModal.classList.add('hidden'),
        showLoginModal: () => elements.loginModal.classList.remove('hidden'),

        renderGachaHistory() {
            const history = Game.Player.getGachaHistory();
            const { rarityConfig } = window.GAME_CONFIG;

            // Render chart
            const rarityCounts = Object.keys(rarityConfig).reduce((acc, r) => ({...acc, [r]: 0}), {});
            history.forEach(card => { if (rarityCounts[card.rarity] !== undefined) rarityCounts[card.rarity]++; });
            if (gachaHistoryChartInstance) gachaHistoryChartInstance.destroy();
            gachaHistoryChartInstance = new Chart(elements.gacha.historyChartCanvas.getContext('2d'), {
                type: 'bar',
                data: { labels: Object.keys(rarityCounts), datasets: [{ label: '邂逅数量', data: Object.values(rarityCounts), backgroundColor: '#4f46e5' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
            });

            // Render list
            elements.gacha.historyList.innerHTML = '';
            if (history.length === 0) {
                elements.gacha.historyList.innerHTML = '<p class="text-gray-500 text-center">暂无邂逅历史。</p>';
                return;
            }
             [...history].reverse().forEach((card, index) => {
                const rarityData = rarityConfig[card.rarity];
                const textColorClass = rarityData?.color || 'text-gray-800';
                const historyItem = document.createElement('div');
                historyItem.className = 'p-2 bg-white rounded shadow-sm flex justify-between items-center';
                historyItem.innerHTML = `
                    <div>
                        <span class="font-bold text-gray-500 mr-2">#${history.length - index}</span>
                        <span class="font-bold ${textColorClass}">[${card.rarity}]</span>
                        <span>${card.name}</span>
                    </div>
                    <span class="text-sm text-gray-400">${new Date(card.timestamp || Date.now()).toLocaleString()}</span>
                `;
                elements.gacha.historyList.appendChild(historyItem);
            });
        },
        renderViewingQueue: _renderViewingQueue,
    };
})();
