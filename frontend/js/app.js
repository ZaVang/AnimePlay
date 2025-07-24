
document.addEventListener('DOMContentLoaded', async function() {
    // --- Use config from game_config.js ---
    const { 
        playerInitialState, 
        aiOpponent, 
        rarityConfig, 
        rateUp, 
        deckBuilding, 
        gacha, 
        battle 
    } = window.GAME_CONFIG;

    // --- App State ---
    let allCards = [], currentUser = '', playerCollection = new Map(), gachaHistory = [], pityState = {}, gachaHistoryChartInstance = null;
    let playerState = { 
        ...playerInitialState,
        exp: 0,
        viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
        decks: { '默认卡组': [] },
        activeDeckName: '默认卡组',
    };

    // --- Config ---
    const RATE_UP_IDS = rateUp.ids;
    let rateUpCards = [];

    // --- UI Elements ---
    const ui = {
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
            ratesModal: document.getElementById('gacha-rates-modal'),
            ratesContent: document.getElementById('gacha-rates-content'),
            showRatesBtn: document.getElementById('show-gacha-rates'),
            closeRatesBtn: document.getElementById('close-gacha-rates-modal'),
        },
        deckAndCollection: {
            deckSelector: document.getElementById('deck-selector'),
            newDeckBtn: document.getElementById('new-deck-btn'),
            renameDeckBtn: document.getElementById('rename-deck-btn'),
            deleteDeckBtn: document.getElementById('delete-deck-btn'),
            saveDeckBtn: document.getElementById('save-deck-btn-new'),
            filterName: document.getElementById('collection-filter-name'),
            filterRarity: document.getElementById('collection-filter-rarity'),
            filterTag: document.getElementById('collection-filter-tag'),
            dismantleAllBtn: document.getElementById('dismantle-all-btn-new'),
        },
        battle: {
            setup: document.getElementById('battle-setup'),
            arena: document.getElementById('battle-arena'),
            startBtn: document.getElementById('start-battle-btn'),
            resultModal: document.getElementById('battle-result-modal'),
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

    // --- User & Data Management ---
    async function login(username) {
        if (!username || !username.match(/^[a-zA-Z0-9]+$/)) {
            alert("用户名只能包含字母和数字。");
            return;
        }
        currentUser = username;
        // localStorage.setItem('lastUser', currentUser); // Removed localStorage
        ui.loginModal.classList.add('hidden');
        ui.userDisplay.innerHTML = `当前用户: <span class="font-bold text-indigo-600">${currentUser}</span> <button id="logout-btn" class="ml-4 text-sm text-red-500 hover:underline">[切换用户]</button>`;
        document.getElementById('logout-btn').addEventListener('click', logout);
        await loadState();
        renderAll();
    }

    async function logout() {
        // Save state before logging out
        await saveState(false);
        currentUser = '';
        // localStorage.removeItem('lastUser'); // Removed localStorage
        ui.loginModal.classList.remove('hidden');
        playerCollection.clear();
        gachaHistory = [];
        pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
        playerState = { 
            ...playerInitialState,
            exp: 0,
            viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
            decks: { '默认卡组': [] },
            activeDeckName: '默认卡组',
        };
        renderAll();
    }

    async function saveState(showAlert = false) {
        if (!currentUser) return;

        // --- Deck Validation ---
        const activeDeck = playerState.decks[playerState.activeDeckName] || [];
        const hasDuplicates = new Set(activeDeck).size !== activeDeck.length;
        if (hasDuplicates) {
            alert(`错误：卡组 “${playerState.activeDeckName}” 中包含重复的同名卡，无法保存！`);
            return; // Stop saving
        }
        // --- End Validation ---

        const payload = {
            collection: Array.from(playerCollection.entries()).map(([id, data]) => [id, data.count]),
            pity: pityState,
            history: gachaHistory,
            state: playerState // Decks are now part of playerState
        };

        try {
            const response = await fetch('/api/user/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: currentUser, payload }),
            });
            if (!response.ok) {
                throw new Error(`服务器错误: ${response.statusText}`);
            }
            if (showAlert) {
                alert("存档已成功保存到服务器！");
            }
        } catch (error) {
            console.error("保存失败:", error);
            if (showAlert) {
                alert("存档失败，请检查控制台日志。");
            }
        }
    }

    async function loadState() {
        if (!currentUser) return;
        try {
            const response = await fetch(`/api/user/data?username=${currentUser}`);
            if (!response.ok) {
                throw new Error(`服务器错误: ${response.statusText}`);
            }
            const data = await response.json();

            if (data.isNewUser) {
                // New user, use default initial state
                playerCollection.clear();
                pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
                playerState = {
                    ...playerInitialState,
                    exp: 0,
                    viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                    decks: { '默认卡组': [] },
                    activeDeckName: '默认卡组',
                };
                gachaHistory = [];
                gachaHistory = [];
            } else {
                // Existing user, load data from server
                const savedCollection = data.collection || [];
                playerCollection.clear();
                savedCollection.forEach(([id, count]) => {
                    const card = allCards.find(c => c.id === id);
                    if (card) playerCollection.set(id, { card, count });
                });

                pityState = data.pity || { totalPulls: 0, pullsSinceLastHR: 0 };
                playerState = data.state || { ...playerInitialState };
                // --- Compatibility for old saves ---
                if (playerState.exp === undefined) {
                    playerState.exp = 0;
                }
                if (playerState.viewingQueue === undefined) {
                    playerState.viewingQueue = Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null);
                }
                // --- End compatibility ---
                gachaHistory = data.history || [];
                // Load decks, ensuring backward compatibility
                if (data.state && data.state.decks) {
                    playerState.decks = data.state.decks;
                    playerState.activeDeckName = data.state.activeDeckName || Object.keys(data.state.decks)[0] || '默认卡组';
                } else {
                    playerState.decks = { '默认卡组': [] };
                    playerState.activeDeckName = '默认卡组';
                }
            }
        } catch (error) {
            console.error("加载存档失败:", error);
            alert("加载存档失败，将使用初始设置。请检查控制台日志。");
            // Reset to default state on error
            playerCollection.clear();
            pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
            playerState = {
                ...playerInitialState,
                exp: 0,
                viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                decks: { '默认卡组': [] },
                activeDeckName: '默认卡组',
            };
            gachaHistory = [];
        }
    }
    
    // --- Gacha Logic ---
    function handleDraw(count) {
        if (!currentUser) { alert("请先登录！"); return; }
        if (playerState.gachaTickets < count) {
            alert("邂逅券不足！");
            return;
        }
        playerState.gachaTickets -= count;
        const expGained = count === 1 ? window.GAME_CONFIG.gameplay.gachaEXP.single : window.GAME_CONFIG.gameplay.gachaEXP.multi;
        addExp(expGained);
        
        let drawnCards = [];
        for (let i = 0; i < count; i++) {
            pityState.totalPulls++;
            pityState.pullsSinceLastHR++;
            let drawnCard;
            if (pityState.pullsSinceLastHR >= rateUp.pityPulls && rateUpCards.length > 0) {
                pityState.pullsSinceLastHR = 0;
                drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
            } else {
                const rand = Math.random() * 100;
                let cumulativeProb = 0;
                let drawnRarity = 'N';
                for (const rarity in rarityConfig) {
                    cumulativeProb += rarityConfig[rarity].p;
                    if (rand < cumulativeProb) { drawnRarity = rarity; break; }
                }
                if (drawnRarity === 'HR' && rateUpCards.length > 0 && Math.random() < rateUp.hrChance) {
                    pityState.pullsSinceLastHR = 0;
                    drawnCard = rateUpCards[Math.floor(Math.random() * rateUpCards.length)];
                } else {
                    const pool = allCards.filter(c => c.rarity === drawnRarity);
                    drawnCard = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : allCards.find(c => c.rarity === 'N');
                }
            }
            const newCard = {...drawnCard, timestamp: Date.now()}; // Add timestamp
            drawnCards.push(newCard);
        }
        if (count >= gacha.guaranteedSR_Pulls && !drawnCards.some(c => ['SR', 'SSR', 'HR', 'UR'].includes(c.rarity))) {
            const pool = allCards.filter(c => c.rarity === 'SR');
            drawnCards[drawnCards.findIndex(c => c.rarity === 'N') ?? 0] = pool[Math.floor(Math.random() * pool.length)];
        }
        gachaHistory.push(...drawnCards);

        let dismantledKnowledge = 0;
        const drawnCardsWithInfo = drawnCards.map(c => ({...c})); 

        drawnCardsWithInfo.forEach(card => {
            if (playerCollection.has(card.id)) {
                // Card is a duplicate, increase its count
                const existingCardData = playerCollection.get(card.id);
                existingCardData.count++;
                card.isDuplicate = true; // Mark as duplicate for result display
            } else {
                // New card, add to collection with count 1
                playerCollection.set(card.id, { card: card, count: 1 });
                card.isNew = true;
            }
        });
        
        saveState(false);

        const existingSummary = ui.gacha.resultModal.querySelector('#gacha-dismantle-summary');
        if(existingSummary) existingSummary.remove();

        ui.gacha.resultContainer.innerHTML = '';
        drawnCardsWithInfo.forEach(card => {
            const cardData = playerCollection.get(card.id) || { card, count: 1 };
            ui.gacha.resultContainer.appendChild(createCardElement(cardData, 'gacha-result', { isDuplicate: card.isDuplicate }));
        });

        if (dismantledKnowledge > 0) {
            const summaryEl = document.createElement('p');
            summaryEl.id = 'gacha-dismantle-summary';
            summaryEl.className = 'text-center mt-4 text-lg text-emerald-600 font-bold';
            summaryEl.textContent = `分解重复卡片，获得 ${dismantledKnowledge} 知识点！`;
            ui.gacha.resultContainer.parentElement.insertBefore(summaryEl, ui.gacha.resultContainer.nextSibling);
        }
        
        ui.gacha.resultModal.classList.remove('hidden');
        renderAll();
    }

    function showGachaRates() {
        const ratesContent = ui.gacha.ratesContent;
        ratesContent.innerHTML = ''; // Clear previous content
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        rarityOrder.forEach(rarity => {
            const rate = rarityConfig[rarity].p;
            const colorClass = rarityConfig[rarity].color || 'text-gray-800';
            const rateElement = document.createElement('div');
            rateElement.className = 'flex justify-between items-center p-2 bg-gray-100 rounded';
            rateElement.innerHTML = `
                <span class="font-bold ${colorClass}">${rarity}</span>
                <span>${rate}%</span>
            `;
            ratesContent.appendChild(rateElement);
        });
        ui.gacha.ratesModal.classList.remove('hidden');
    }

    // --- Deck & Collection Logic ---
    function renderDeckAndCollection() {
        const deck = playerState.decks[playerState.activeDeckName] || [];
        const collectionContainer = document.getElementById('collection-view');
        const deckContainer = document.getElementById('current-deck-list');
        const deckSelector = document.getElementById('deck-selector');

        // Render Collection
        collectionContainer.innerHTML = '';
        const nameFilter = document.getElementById('collection-filter-name').value.toLowerCase();
        const rarityFilter = document.getElementById('collection-filter-rarity').value;
        const tagFilter = document.getElementById('collection-filter-tag').value;
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

        const filteredCards = Array.from(playerCollection.values()).filter(data => {
            const card = data.card;
            const nameMatch = card.name.toLowerCase().includes(nameFilter);
            const rarityMatch = rarityFilter ? card.rarity === rarityFilter : true;
            const tagMatch = tagFilter ? (card.synergy_tags || []).includes(tagFilter) : true;
            return nameMatch && rarityMatch && tagMatch;
        });

        filteredCards.sort((a, b) => {
            const rarityA = rarityOrder.indexOf(a.card.rarity);
            const rarityB = rarityOrder.indexOf(b.card.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return b.card.points - a.card.points;
        }).forEach(cardData => {
            const cardEl = createCardElement(cardData, 'deck-collection');
            if (deck.includes(cardData.card.id)) {
                cardEl.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                cardEl.addEventListener('click', () => addCardToDeck(cardData.card.id));
            }
            collectionContainer.appendChild(cardEl);
        });

        // Render Deck
        deckContainer.innerHTML = '';
        let totalCost = 0;
        deck.forEach(cardId => {
            const card = allCards.find(c => c.id === cardId);
            if (card) {
                const cardData = playerCollection.get(cardId);
                const cardEl = createCardElement(cardData, 'deck-list');
                cardEl.addEventListener('click', () => removeCardFromDeck(cardId));
                deckContainer.appendChild(cardEl);
                totalCost += card.cost;
            }
        });

        document.getElementById('deck-cost-display').textContent = `${totalCost} / ${deckBuilding.maxCost}`;
        document.getElementById('deck-count-display').textContent = `${deck.length} / ${deckBuilding.maxCards}`;

        // Render Deck Selector
        deckSelector.innerHTML = '';
        Object.keys(playerState.decks).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (name === playerState.activeDeckName) option.selected = true;
            deckSelector.appendChild(option);
        });
    }

    function addCardToDeck(cardId) {
        const deck = playerState.decks[playerState.activeDeckName];
        if (deck.includes(cardId)) return; // Silently prevent duplicates

        if (deck.length >= deckBuilding.maxCards) {
            alert(`卡组已满（最多${deckBuilding.maxCards}张）`);
            return;
        }
        const card = allCards.find(c => c.id === cardId);
        const totalCost = deck.reduce((sum, id) => sum + allCards.find(c=>c.id===id).cost, 0);
        if (totalCost + card.cost > deckBuilding.maxCost) {
            alert("卡组Cost已达上限！");
            return;
        }
        deck.push(cardId);
        renderDeckAndCollection();
    }

    function removeCardFromDeck(cardId) {
        const deck = playerState.decks[playerState.activeDeckName];
        const index = deck.indexOf(cardId);
        if (index > -1) {
            deck.splice(index, 1);
            renderDeckAndCollection();
        }
    }

    function newDeck() {
        const newName = prompt("请输入新卡组的名称：", `卡组 ${Object.keys(playerState.decks).length + 1}`);
        if (newName && !playerState.decks[newName]) {
            playerState.decks[newName] = [];
            playerState.activeDeckName = newName;
            renderDeckAndCollection();
        } else if (newName) {
            alert("该名称已存在！");
        }
    }

    function renameDeck() {
        const oldName = playerState.activeDeckName;
        const newName = prompt("请输入新的名称：", oldName);
        if (newName && newName !== oldName && !playerState.decks[newName]) {
            playerState.decks[newName] = playerState.decks[oldName];
            delete playerState.decks[oldName];
            playerState.activeDeckName = newName;
            renderDeckAndCollection();
        } else if (newName) {
            alert("该名称无效或已存在！");
        }
    }

    function deleteDeck() {
        const deckName = playerState.activeDeckName;
        if (Object.keys(playerState.decks).length <= 1) {
            alert("不能删除唯一的卡组！");
            return;
        }
        if (confirm(`确定要删除卡组 “${deckName}” 吗？`)) {
            delete playerState.decks[deckName];
            playerState.activeDeckName = Object.keys(playerState.decks)[0];
            renderDeckAndCollection();
        }
    }

    function switchDeck() {
        const selectedDeck = document.getElementById('deck-selector').value;
        playerState.activeDeckName = selectedDeck;
        renderDeckAndCollection();
    }

    // --- Dismantle Logic ---
    function dismantleCard(cardId) {
        if (!playerCollection.has(cardId)) return;
        const cardData = playerCollection.get(cardId);
        if (cardData.count > 1) {
            cardData.count--;
            const dismantleValue = rarityConfig[cardData.card.rarity]?.dismantleValue || 0;
            playerState.knowledgePoints += dismantleValue;
            console.log(`Dismantled ${cardData.card.name}, got ${dismantleValue} knowledge points.`);
        } else {
            console.log(`Cannot dismantle the last copy of ${cardData.card.name}.`);
        }
    }

    function dismantleAllDuplicates() {
        let totalKnowledgeGained = 0;
        for (const [cardId, cardData] of playerCollection.entries()) {
            if (cardData.count > 1) {
                const dismantleValue = rarityConfig[cardData.card.rarity]?.dismantleValue || 0;
                const duplicatesToDismantle = cardData.count - 1;
                const knowledgeGained = duplicatesToDismantle * dismantleValue;
                totalKnowledgeGained += knowledgeGained;
                playerState.knowledgePoints += knowledgeGained;
                cardData.count = 1;
            }
        }

        if (totalKnowledgeGained > 0) {
            alert(`分解了所有重复卡牌，共获得 ${totalKnowledgeGained} 知识点！`);
            renderDeckAndCollection();
            renderPlayerState();
            saveState(); // Save changes to server
        } else {
            alert("没有可分解的重复卡牌。");
        }
    }

    // --- Battle Logic ---
    function startBattle() {
        const activeDeckIds = playerState.decks[playerState.activeDeckName] || [];
        if (activeDeckIds.length < deckBuilding.minCardsForBattle) { 
            alert(`卡组 “${playerState.activeDeckName}” 至少需要${deckBuilding.minCardsForBattle}张卡才能战斗！`); 
            return; 
        }
        location.hash = '#battle';
        ui.battle.setup.classList.add('hidden');
        ui.battle.arena.classList.remove('hidden');
        
        const aiDeck = aiOpponent.deck.map(id => allCards.find(c => c.id === id)).filter(Boolean);
        let playerHand = activeDeckIds.map(id => allCards.find(c => c.id === id));
        let aiHand = [...aiDeck], playerScore = 0, aiScore = 0, round = 1;
        ui.battle.arena.innerHTML = `<div class="text-center mb-4"><h2 class="text-2xl font-bold">第 <span id="round-counter">1</span> 回合</h2></div><div class="grid grid-cols-3 items-center"><div class="text-center"><h3 class="font-bold text-xl">${currentUser}</h3><p id="player-score" class="text-2xl font-bold text-blue-600">0</p></div><div id="battlefield" class="flex justify-center items-center gap-8 min-h-[200px]"></div><div class="text-center"><h3 class="font-bold text-xl">${aiOpponent.name}</h3><p id="ai-score" class="text-2xl font-bold text-red-600">0</p></div></div><div class="mt-8 text-center"><h3 class="font-bold mb-2">你的手牌</h3><div id="player-hand" class="flex justify-center gap-2 flex-wrap"></div></div><div id="battle-log" class="mt-4 p-2 bg-gray-800 text-white rounded-lg h-24 overflow-y-auto text-sm"></div>`;
        const battleLog = document.getElementById('battle-log');
        
        function playRound() {
            if (playerHand.length === 0 || aiHand.length === 0 || round > battle.maxRounds) { endBattle(); return; }
            document.getElementById('round-counter').textContent = round;
            const playerHandContainer = document.getElementById('player-hand');
            playerHandContainer.innerHTML = '';
            playerHand.forEach(card => {
                const cardEl = createCardElement({ card, count: 1 }, 'player-hand');
                cardEl.addEventListener('click', () => playerAction(card));
                playerHandContainer.appendChild(cardEl);
            });
        }

        function playerAction(playedCard) {
            playerHand = playerHand.filter(c => c.id !== playedCard.id);
            const aiCard = aiHand.splice(Math.floor(Math.random() * aiHand.length), 1)[0];
            document.getElementById('battlefield').innerHTML = createCardElement({card: playedCard, count: 1}, 'battle-card player').outerHTML + createCardElement({card: aiCard, count: 1}, 'battle-card opponent').outerHTML;
            let roundWinner = '平局';
            if (playedCard.points > aiCard.points) { playerScore++; roundWinner = currentUser; }
            else if (aiCard.points > playedCard.points) { aiScore++; roundWinner = aiOpponent.name; }
            battleLog.innerHTML += `<div>第${round}回合: ${currentUser} (${playedCard.points}) vs ${aiOpponent.name} (${aiCard.points}). ${roundWinner} 胜利!</div>`;
            battleLog.scrollTop = battleLog.scrollHeight;
            document.getElementById('player-score').textContent = playerScore;
            document.getElementById('ai-score').textContent = aiScore;
            round++;
            setTimeout(playRound, 2000);
        }

        function endBattle() {
            let resultText = playerScore > aiScore ? '你胜利了！' : (aiScore > playerScore ? '你失败了...' : '平局！');
            ui.battle.resultModal.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-xl text-center"><h2 class="text-3xl font-bold mb-4">${resultText}</h2><button id="close-battle-result" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg">返回</button></div>`;
            ui.battle.resultModal.classList.remove('hidden');
            document.getElementById('close-battle-result').addEventListener('click', () => {
                ui.battle.resultModal.classList.add('hidden');
                ui.battle.setup.classList.remove('hidden');
                ui.battle.arena.classList.add('hidden');
            });
        }
        playRound();
    }

    // --- Rendering ---
    function createCardElement(cardData, context, options = {}) {
        const { card, count } = cardData;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        const element = document.createElement('div');
        element.className = 'card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer group relative';

        const activeDeck = playerState.decks[playerState.activeDeckName] || [];
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

        if (options.isDuplicate && context === 'gacha-result') {
            element.firstElementChild.innerHTML += `<div class="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-center p-1"><span class="text-white font-bold text-2xl">+1</span></div>`;
        }

        // Click handlers based on context
        element.addEventListener('click', (event) => {
            event.preventDefault();
            if (context === 'deck-collection') {
                addCardToDeck(card.id);
            } else if (context === 'deck-list') {
                removeCardFromDeck(card.id);
            }
        });

        element.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            showCardDetail(cardData);
        });

        return element;
    }
    function showCardDetail(cardData) {
        const { card, count } = cardData;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        
        // Basic details
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

        ui.detailModal.content.innerHTML = detailHtml;

        // Add dismantle button if applicable
        if (count > 1) {
            const dismantleValue = rarityConfig[card.rarity]?.dismantleValue || 0;
            const dismantleSection = ui.detailModal.content.querySelector('#dismantle-section');
            dismantleSection.innerHTML = `
                <h3 class="font-bold">分解卡牌</h3>
                <p class="text-sm text-gray-600">分解一张多余的卡牌可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                <button id="dismantle-btn" class="mt-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">分解一张</button>
            `;
            dismantleSection.querySelector('#dismantle-btn').addEventListener('click', () => {
                dismantleCard(card.id);
                // Close modal and re-render collection to show updated state
                ui.detailModal.modal.classList.add('hidden');
                renderDeckAndCollection();
                renderPlayerState();
            });
        }

        ui.detailModal.modal.classList.remove('hidden');
    }
    function renderCollection() {
        ui.collection.container.innerHTML = '';
        const nameFilter = ui.collection.filterName.value.toLowerCase();
        const rarityFilter = ui.collection.filterRarity.value;
        const tagFilter = ui.collection.filterTag.value;

        // Define rarity order for sorting
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

        const filteredCards = Array.from(playerCollection.values()).filter(data => {
            const card = data.card;
            const nameMatch = card.name.toLowerCase().includes(nameFilter);
            const rarityMatch = rarityFilter ? card.rarity === rarityFilter : true;
            const tagMatch = tagFilter ? (card.synergy_tags || []).includes(tagFilter) : true;
            return nameMatch && rarityMatch && tagMatch;
        });

        if (filteredCards.length === 0) {
            ui.collection.container.innerHTML = '<p class="text-gray-500 col-span-full text-center">知识库为空或无符合筛选的卡片。</p>';
        } else {
            filteredCards.sort((a, b) => {
                const rarityA = rarityOrder.indexOf(a.card.rarity);
                const rarityB = rarityOrder.indexOf(b.card.rarity);
                if (rarityA !== rarityB) {
                    return rarityA - rarityB;
                }
                // If rarity is the same, sort by points (descending)
                return b.card.points - a.card.points;
            }).forEach(cardData => ui.collection.container.appendChild(createCardElement(cardData, 'collection')));
        }
        renderCollectionSummary();
    }
    function renderDeckBuilder() {
        ui.deckbuilder.collection.innerHTML = '';
        Array.from(playerCollection.values()).sort((a, b) => b.card.points - a.card.points).forEach(data => ui.deckbuilder.collection.appendChild(createCardElement(data, 'deckbuilder-collection')));
        renderDeck();
    }
    function renderDeck() {
        ui.deckbuilder.deck.innerHTML = '';
        let totalCost = 0;
        playerDeck.forEach(card => {
            const cardData = playerCollection.get(card.id);
            const cardEl = createCardElement(cardData, 'deckbuilder-deck');
            ui.deckbuilder.deck.appendChild(cardEl);
            totalCost += card.cost;
        });
        ui.deckbuilder.cost.textContent = `${totalCost} / ${deckBuilding.maxCost}`;
    }
    function renderUpBanner() {
        if (rateUpCards.length === 0) return;
        let cardHtml = rateUpCards.map(card => `<div class="w-24 flex-shrink-0"><img src="${card.image_path}" class="w-full h-auto rounded-md shadow-lg"><p class="text-center text-xs font-bold truncate mt-1">${card.name}</p></div>`).join('');
        ui.gacha.upBanner.innerHTML = `<h3 class="text-xl font-bold mb-4 text-center text-purple-600">当前UP卡池</h3><div class="flex items-center justify-center gap-6 flex-wrap">${cardHtml}<div class="text-gray-600 text-sm"><p>・HR邂逅时，有<span class="font-bold text-indigo-600">${rateUp.hrChance * 100}%</span>概率为UP！</p><p>・累计<span class="font-bold text-indigo-600">${rateUp.pityPulls}</span>次邂逅必定获得UP之一！</p><p>・十连邂逅必定获得<span class="font-bold text-indigo-600">SR</span>及以上卡片！</p></div></div>`;
    }
    function renderUpBanner() {
        if (rateUpCards.length === 0) return;
        let cardHtml = rateUpCards.map(card => `<div class="w-24 flex-shrink-0"><img src="${card.image_path}" class="w-full h-auto rounded-md shadow-lg"><p class="text-center text-xs font-bold truncate mt-1">${card.name}</p></div>`).join('');
        ui.gacha.upBanner.innerHTML = `<h3 class="text-xl font-bold mb-4 text-center text-purple-600">当前UP卡池</h3><div class="flex items-center justify-center gap-6 flex-wrap">${cardHtml}<div class="text-gray-600 text-sm"><p>・HR邂逅时，有<span class="font-bold text-indigo-600">${rateUp.hrChance * 100}%</span>概率为UP！</p><p>・累计<span class="font-bold text-indigo-600">${rateUp.pityPulls}</span>次邂逅必定获得UP之一！</p><p>・十连邂逅必定获得<span class="font-bold text-indigo-600">SR</span>及以上卡片！</p></div></div>`;
    }

    // --- Gameplay Loop (EXP, Level, Queue) ---
    function addExp(amount) {
        playerState.exp += amount;
        logMessage(`获得了 ${amount} 点经验值。`);
        checkForLevelUp();
        renderPlayerState();
    }

    function checkForLevelUp() {
        const { levelXP, levelUpRewards } = window.GAME_CONFIG.gameplay;
        let currentLevel = playerState.level;
        let requiredExp = levelXP[currentLevel] || Infinity;

        while (playerState.exp >= requiredExp) {
            playerState.level++;
            playerState.exp -= requiredExp;
            const rewards = levelUpRewards[playerState.level];
            if (rewards) {
                if (rewards.tickets) playerState.gachaTickets += rewards.tickets;
                if (rewards.knowledge) playerState.knowledgePoints += rewards.knowledge;
                logMessage(`等级提升至 ${playerState.level}！获得邂逅券x${rewards.tickets || 0}，知识点x${rewards.knowledge || 0}。`, 'level-up');
            }
            currentLevel = playerState.level;
            requiredExp = levelXP[currentLevel] || Infinity;
        }
    }

    function renderPlayerState() {
        const { levelXP } = window.GAME_CONFIG.gameplay;
        ui.home.level.textContent = playerState.level;
        ui.home.tickets.textContent = playerState.gachaTickets;
        ui.home.knowledge.textContent = playerState.knowledgePoints.toLocaleString();

        const requiredExp = levelXP[playerState.level] || Infinity;
        const expPercent = requiredExp === Infinity ? 100 : (playerState.exp / requiredExp) * 100;
        ui.home.expBar.style.width = `${expPercent}%`;
        ui.home.expText.textContent = `${playerState.exp.toLocaleString()} / ${requiredExp.toLocaleString()}`;
    }

    function renderViewingQueue() {
        const queueContainer = ui.home.viewingQueue;
        queueContainer.innerHTML = '';
        playerState.viewingQueue.forEach((slot, index) => {
            const slotElement = document.createElement('div');
            slotElement.className = 'h-48 flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300';

            if (slot) {
                const card = allCards.find(c => c.id === slot.cardId);
                const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[card.rarity];
                const endTime = new Date(slot.startTime).getTime() + rewards.time * 60 * 1000;
                const now = Date.now();

                if (now >= endTime) {
                    // Finished
                    slotElement.innerHTML = `
                        <div class="text-center cursor-pointer" data-slot-index="${index}">
                            <img src="${card.image_path}" class="w-20 h-28 object-cover rounded-md mx-auto mb-2">
                            <p class="font-bold">${card.name}</p>
                            <button class="collect-btn mt-2 bg-green-500 text-white font-bold py-1 px-3 rounded-lg">收获</button>
                        </div>
                    `;
                    slotElement.querySelector('.collect-btn').addEventListener('click', () => collectFromViewingQueue(index));
                } else {
                    // In progress
                    const remainingTime = endTime - now;
                    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
                    slotElement.innerHTML = `
                        <div class="text-center">
                            <img src="${card.image_path}" class="w-20 h-28 object-cover rounded-md mx-auto mb-2">
                            <p class="font-bold">${card.name}</p>
                            <p class="text-sm text-gray-600">剩余: ${hours}h ${minutes}m ${seconds}s</p>
                        </div>
                    `;
                }
            } else {
                // Empty slot
                slotElement.innerHTML = `
                    <button class="add-to-queue-btn text-gray-400 hover:text-indigo-600" data-slot-index="${index}">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                        <span class="font-bold">添加动画</span>
                    </button>
                `;
                slotElement.querySelector('.add-to-queue-btn').addEventListener('click', () => openViewingQueueModal(index));
            }
            queueContainer.appendChild(slotElement);
        });
    }

    function openViewingQueueModal(slotIndex) {
        const collectionContainer = ui.viewingQueueModal.collection;
        collectionContainer.innerHTML = '';
        const cardsInQueue = playerState.viewingQueue.filter(s => s).map(s => s.cardId);
        const availableCards = Array.from(playerCollection.values()).filter(data => !cardsInQueue.includes(data.card.id));

        if (availableCards.length === 0) {
            collectionContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center">没有可添加的卡牌了。</p>';
        } else {
            availableCards.forEach(cardData => {
                const cardEl = createCardElement(cardData, 'viewing-queue-selection');
                cardEl.addEventListener('click', () => addToViewingQueue(cardData.card.id, slotIndex));
                collectionContainer.appendChild(cardEl);
            });
        }
        ui.viewingQueueModal.modal.classList.remove('hidden');
    }

    function addToViewingQueue(cardId, slotIndex) {
        playerState.viewingQueue[slotIndex] = { cardId, startTime: new Date().toISOString() };
        ui.viewingQueueModal.modal.classList.add('hidden');
        renderViewingQueue();
        saveState();
    }

    function collectFromViewingQueue(slotIndex) {
        const slot = playerState.viewingQueue[slotIndex];
        if (!slot) return;

        const card = allCards.find(c => c.id === slot.cardId);
        const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[card.rarity];
        
        addExp(rewards.exp);
        playerState.knowledgePoints += rewards.knowledge;
        logMessage(`《${card.name}》观看完毕！获得经验x${rewards.exp}，知识点x${rewards.knowledge}。`, 'reward');

        playerState.viewingQueue[slotIndex] = null;
        renderViewingQueue();
        renderPlayerState();
        saveState();
    }

    function logMessage(message, type = 'info') {
        const logArea = ui.home.logArea;
        const logEntry = document.createElement('p');
        let icon = '';
        if (type === 'level-up') icon = '&#11088;'; // Star
        if (type === 'reward') icon = '&#127873;'; // Gift
        logEntry.innerHTML = `${icon} ${message}`;
        logArea.prepend(logEntry);
        if (logArea.children.length > 20) { // Keep log size manageable
            logArea.lastChild.remove();
        }
    }
    function renderCollectionSummary() {
        const rarityCounts = Object.keys(rarityConfig).reduce((acc, r) => ({...acc, [r]: 0}), {});
        let totalCount = 0;
        for (const item of playerCollection.values()) {
            if (rarityCounts[item.card.rarity] !== undefined) {
                rarityCounts[item.card.rarity]++;
                totalCount++;
            }
        }
        ui.collection.summary.innerHTML = `<span class="font-bold text-gray-700">总计: ${totalCount}</span>` + Object.keys(rarityCounts).map(r => `<span class="font-semibold text-gray-600">${r}: <span class="text-indigo-600 font-bold">${rarityCounts[r]}</span></span>`).join('');
    }
    function renderGachaHistoryChart() {
        const rarityCounts = Object.keys(rarityConfig).reduce((acc, r) => ({...acc, [r]: 0}), {});
        gachaHistory.forEach(card => { if (rarityCounts[card.rarity] !== undefined) rarityCounts[card.rarity]++; });
        if (gachaHistoryChartInstance) gachaHistoryChartInstance.destroy();
        gachaHistoryChartInstance = new Chart(ui.gacha.historyChartCanvas.getContext('2d'), {
            type: 'bar',
            data: { labels: Object.keys(rarityCounts), datasets: [{ label: '邂逅数量', data: Object.values(rarityCounts), backgroundColor: '#4f46e5' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
        });
    }

    function renderGachaHistoryList() {
        const historyContainer = document.getElementById('gacha-history-list');
        historyContainer.innerHTML = '';
        if (gachaHistory.length === 0) {
            historyContainer.innerHTML = '<p class="text-gray-500 text-center">暂无邂逅历史。</p>';
            return;
        }

        [...gachaHistory].reverse().forEach((card, index) => {
            const rarityData = rarityConfig[card.rarity];
            const textColorClass = rarityData?.color || 'text-gray-800';

            const historyItem = document.createElement('div');
            historyItem.className = 'p-2 bg-white rounded shadow-sm flex justify-between items-center';
            historyItem.innerHTML = `
                <div>
                    <span class="font-bold text-gray-500 mr-2">#${gachaHistory.length - index}</span>
                    <span class="font-bold ${textColorClass}">[${card.rarity}]</span>
                    <span>${card.name}</span>
                </div>
                <span class="text-sm text-gray-400">${new Date(card.timestamp || Date.now()).toLocaleString()}</span>
            `;
            historyContainer.appendChild(historyItem);
        });
    }
        function renderAll() {
        renderPlayerState();
        renderUpBanner();
        renderShop();
        renderViewingQueue();
        // Only render the deck view if it's currently visible
        const deckSection = document.getElementById('deck-and-collection');
        if (deckSection && !deckSection.classList.contains('hidden')) {
            renderDeckAndCollection();
        }
    }

    function switchGachaTab(tabName) {
        Object.keys(ui.gacha.tabs).forEach(key => {
            ui.gacha.tabs[key].classList.toggle('active', key === tabName);
            ui.gacha.contents[key].classList.toggle('hidden', key !== tabName);
        });
        if (tabName === 'history') {
            renderGachaHistoryChart();
            renderGachaHistoryList();
        }
    }

    // --- Shop Logic ---
    function renderShop() {
        const shopContainer = document.getElementById('shop-items');
        shopContainer.innerHTML = '';
        window.GAME_CONFIG.shop.items.forEach(item => {
            const card = allCards.find(c => c.id === item.cardId);
            if (!card) return;

            const isOwned = playerCollection.has(card.id);
            const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';

            const shopItem = document.createElement('div');
            shopItem.className = 'bg-gray-50 rounded-lg shadow-md p-4 flex flex-col items-center';
            shopItem.innerHTML = `
                <img src="${card.image_path}" class="w-24 h-36 object-cover rounded-md mb-2" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <p class="font-bold text-center">${card.name}</p>
                <p class="text-sm ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} text-white px-2 py-0.5 rounded-full my-1">${card.rarity}</p>
                <p class="font-bold text-lg text-emerald-600">${item.cost.toLocaleString()} 知识点</p>
                <button class="buy-btn mt-2 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '兑换'}
                </button>
            `;

            if (!isOwned) {
                shopItem.querySelector('.buy-btn').addEventListener('click', () => buyFromShop(item, card));
            }

            shopContainer.appendChild(shopItem);
        });
    }

    function buyFromShop(item, card) {
        if (playerState.knowledgePoints < item.cost) {
            alert("知识点不足！");
            return;
        }

        if (playerCollection.has(card.id)) {
            alert("你已经拥有这张卡了！");
            return;
        }

        if (confirm(`确定要花费 ${item.cost} 知识点兑换 ${card.name} 吗？`)) {
            playerState.knowledgePoints -= item.cost;
            playerCollection.set(card.id, { card, count: 1 });
            alert("兑换成功！");
            renderPlayerState();
            renderShop();
            saveState();
        }
    }

    function populateFilters() {
        // Populate Rarity Filter
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        ui.deckAndCollection.filterRarity.innerHTML = '<option value="">所有稀有度</option>'; // Reset
        rarityOrder.forEach(rarity => {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            ui.deckAndCollection.filterRarity.appendChild(option);
        });

        // Populate Tag Filter
        const allTags = new Set();
        allCards.forEach(card => {
            (card.synergy_tags || []).forEach(tag => allTags.add(tag));
        });
        ui.deckAndCollection.filterTag.innerHTML = '<option value="">所有标签</option>'; // Reset
        Array.from(allTags).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            ui.deckAndCollection.filterTag.appendChild(option);
        });
    }

    // --- Init ---
    async function initialize() {
        console.log("Initializing application...");
        try {
            console.log("Attempting to fetch all_cards.json...");
            const response = await fetch('/data/all_cards.json?t=' + new Date().getTime());
            console.log("Fetch response received:", response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log("Attempting to parse JSON...");
            allCards = await response.json();
            console.log("JSON parsed successfully. Total cards loaded:", allCards.length);

            rateUpCards = RATE_UP_IDS.map(id => allCards.find(c => c.id === id)).filter(Boolean);
            populateFilters(); // Populate filters with card data
            
            // Bind all events
            ui.loginBtn.addEventListener('click', () => login(ui.loginInput.value.trim()));
            ui.gacha.singleBtn.addEventListener('click', () => handleDraw(1));
            ui.gacha.multiBtn.addEventListener('click', () => handleDraw(10));
            ui.gacha.showRatesBtn.addEventListener('click', showGachaRates);
            ui.gacha.closeRatesBtn.addEventListener('click', () => ui.gacha.ratesModal.classList.add('hidden'));
            ui.gacha.closeResultBtn.addEventListener('click', () => ui.gacha.resultModal.classList.add('hidden'));
            ui.detailModal.closeBtn.addEventListener('click', () => ui.detailModal.modal.classList.add('hidden'));
            ui.viewingQueueModal.closeBtn.addEventListener('click', () => ui.viewingQueueModal.modal.classList.add('hidden'));
            
            // Deck & Collection Listeners
            ui.deckAndCollection.deckSelector.addEventListener('change', switchDeck);
            ui.deckAndCollection.newDeckBtn.addEventListener('click', newDeck);
            ui.deckAndCollection.renameDeckBtn.addEventListener('click', renameDeck);
            ui.deckAndCollection.deleteDeckBtn.addEventListener('click', deleteDeck);
            ui.deckAndCollection.saveDeckBtn.addEventListener('click', () => saveState(true));
            ui.deckAndCollection.filterName.addEventListener('input', renderDeckAndCollection);
            ui.deckAndCollection.filterRarity.addEventListener('change', renderDeckAndCollection);
            ui.deckAndCollection.filterTag.addEventListener('change', renderDeckAndCollection);
            ui.deckAndCollection.dismantleAllBtn.addEventListener('click', dismantleAllDuplicates);

            ui.battle.startBtn.addEventListener('click', startBattle);
            ui.gacha.tabs.pool.addEventListener('click', (e) => { e.preventDefault(); switchGachaTab('pool'); });
            ui.gacha.tabs.history.addEventListener('click', (e) => { e.preventDefault(); switchGachaTab('history'); });
            ui.gacha.tabs.shop.addEventListener('click', (e) => { e.preventDefault(); switchGachaTab('shop'); });

            // We no longer use localStorage to remember the last user.
            // The user will need to log in each time.
            ui.loginModal.classList.remove('hidden');

            // Navigation
            window.addEventListener('hashchange', () => {
                let hash = window.location.hash || '#home';
                ui.mainSections.forEach(s => s.classList.toggle('hidden', `#${s.id}` !== hash));
                ui.navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === hash));
                if (hash === '#deck-and-collection') renderDeckAndCollection();
            });
            location.hash = '#home';
            window.dispatchEvent(new HashChangeEvent('hashchange'));

            // Start the queue update timer
            setInterval(renderViewingQueue, 1000);

        } catch (error) {
            console.error("Critical initialization failed:", error);
            alert(`加载核心数据时发生严重错误，请检查浏览器控制台（F12）获取详细信息。\n\n错误详情: ${error.message}`);
        }
    }
    initialize();
});
