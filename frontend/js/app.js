
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
            setup: document.getElementById('battle-setup-new'),
            arenaContainer: document.getElementById('battle-arena-container'),
            deckSelector: document.getElementById('battle-deck-selector'),
            startBtn: document.getElementById('start-battle-btn-new'),
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

    function renderBattleSetup() {
        ui.battle.deckSelector.innerHTML = '';
        Object.keys(playerState.decks).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = `${name} (${playerState.decks[name].length} / ${deckBuilding.maxCards} cards)`;
            ui.battle.deckSelector.appendChild(option);
        });
    }

    // --- Battle Logic V4.0 ---
    let battleState = {}; // Holds all data for the current battle
    let selectedHandCardIndex = -1; // Tracks the selected card in hand

    function startBattle() {
        const selectedDeckName = ui.battle.deckSelector.value;
        const activeDeckIds = playerState.decks[selectedDeckName] || [];

        if (activeDeckIds.length < 10) { // Example validation
            alert(`卡组 “${selectedDeckName}” 至少需要10张卡！`); 
            return; 
        }
        
        ui.battle.setup.classList.add('hidden');
        ui.battle.arenaContainer.innerHTML = ''; // Clear previous battle UI
        ui.battle.arenaContainer.classList.remove('hidden');

        // --- Initialize Battle State ---
        battleState = {
            turn: 1,
            phase: 'player_attack', // player_attack, player_defend, ai_attack, ai_defend
            log: ["战斗开始！"],
            attacker: 'player',
            defender: 'ai',
            combo: { count: 0, fatigue: 0 },
            player: {
                prestige: window.GAME_CONFIG.battle.initialPrestige,
                tp: window.GAME_CONFIG.battle.initialTP,
                tpLimit: window.GAME_CONFIG.battle.initialTP,
                hand: [],
                deck: [...activeDeckIds].map(id => ({ ...allCards.find(c => c.id === id) })),
                states: []
            },
            ai: {
                prestige: window.GAME_CONFIG.battle.initialPrestige,
                tp: window.GAME_CONFIG.battle.initialTP,
                tpLimit: window.GAME_CONFIG.battle.initialTP,
                hand: [],
                deck: [...aiOpponent.deck].map(id => ({ ...allCards.find(c => c.id === id) })),
                states: []
            },
            currentAttack: null // To hold info about the ongoing attack
        };

        // --- Initial Draw ---
        for (let i = 0; i < window.GAME_CONFIG.battle.initialHandSize; i++) {
            drawCard('player');
            drawCard('ai');
        }

        renderBattleUI();
    }

    function drawCard(who) {
        const target = battleState[who];
        if (target.deck.length > 0 && target.hand.length < window.GAME_CONFIG.battle.maxHandSize) {
            const card = target.deck.splice(Math.floor(Math.random() * target.deck.length), 1)[0];
            target.hand.push(card);
        }
    }

    function getCardMatchType(card1, card2) {
        if (card1.id === card2.id) return "sameCard";
        const tags1 = new Set(card1.synergy_tags || []);
        const tags2 = new Set(card2.synergy_tags || []);
        for (const tag of tags1) {
            if (tags2.has(tag)) return "sameTag";
        }
        return "different";
    }

    function playerAction(type) {
        if (selectedHandCardIndex === -1) {
            alert("请先选择一张手牌！");
            return;
        }

        const player = battleState.player;
        const card = player.hand[selectedHandCardIndex];
        const action = window.GAME_CONFIG.battle.actions[type];
        const totalCost = card.cost + action.cost;

        if (player.tp < totalCost) {
            alert("TP不足！");
            return;
        }

        player.tp -= totalCost;
        const playedCard = player.hand.splice(selectedHandCardIndex, 1)[0];
        selectedHandCardIndex = -1;

        if (battleState.phase === 'player_attack') {
            battleState.currentAttack = {
                attacker: 'player',
                attackCard: playedCard,
                attackType: action.name
            };
            battleState.phase = 'ai_defend';
            battleState.log.push(`你使用 [${playedCard.name}] 发动了 [${action.name}]！`);
            setTimeout(aiDefenseAction, 1000);
        } else if (battleState.phase === 'player_defend') {
            const defense = {
                defender: 'player',
                defendCard: playedCard,
                defendType: action.name
            };
            resolveBattle(battleState.currentAttack, defense);
        }
    }

    function aiAttackAction() {
        // Simplified AI attack logic
        const ai = battleState.ai;
        if (ai.hand.length === 0) {
            endAiTurn();
            return;
        }
        const card = ai.hand[0];
        const action = window.GAME_CONFIG.battle.actions.friendly; // AI always uses friendly for now
        if (ai.tp >= card.cost + action.cost) {
            ai.tp -= (card.cost + action.cost);
            battleState.currentAttack = {
                attacker: 'ai',
                attackCard: card,
                attackType: action.name
            };
            ai.hand.splice(0, 1);
            battleState.phase = 'player_defend';
            battleState.log.push(`AI 使用 [${card.name}] 发动了 [${action.name}]！`);
            renderBattleUI();
        } else {
            endAiTurn();
        }
    }

    function aiDefenseAction() {
        // Simplified AI defense logic
        const ai = battleState.ai;
        if (ai.hand.length === 0) {
            // No cards to defend with, must agree
            resolveBattle(battleState.currentAttack, { defender: 'ai', defendCard: null, defendType: '赞同' });
            return;
        }
        const card = ai.hand[0];
        const action = window.GAME_CONFIG.battle.actions.agree; // AI always agrees for now
        if (ai.tp >= card.cost + action.cost) {
            ai.tp -= (card.cost + action.cost);
            const defense = {
                defender: 'ai',
                defendCard: card,
                defendType: action.name
            };
            ai.hand.splice(0, 1);
            resolveBattle(battleState.currentAttack, defense);
        } else {
            resolveBattle(battleState.currentAttack, { defender: 'ai', defendCard: null, defendType: '赞同' });
        }
    }

    function resolveBattle(attack, defense) {
        const matchType = defense.defendCard ? getCardMatchType(attack.attackCard, defense.defendCard) : 'different';
        const attackTypeKey = attack.attackType === '友好安利' ? 'friendly' : 'harsh';
        const defenseTypeKey = defense.defendType === '赞同' ? 'agree' : 'disagree';

        const result = window.GAME_CONFIG.battle.resultTable[attackTypeKey][matchType][defenseTypeKey];
        
        const attacker = battleState[attack.attacker];
        const defender = battleState[defense.defender];

        attacker.prestige += result.prestige[0];
        defender.prestige += result.prestige[1];
        attacker.tp += result.tp[0];
        defender.tp += result.tp[1];
        for(let i=0; i<result.draw[0]; i++) drawCard(attack.attacker);
        for(let i=0; i<result.draw[1]; i++) drawCard(defense.defender);

        battleState.log.push(result.log);
        battleState.log.push(`> ${attack.attacker === 'player' ? '你' : 'AI'} 声望 ${result.prestige[0] >= 0 ? '+' : ''}${result.prestige[0]}, ${defense.defender === 'player' ? '你' : 'AI'} 声望 ${result.prestige[1] >= 0 ? '+' : ''}${result.prestige[1]}`);
        battleState.currentAttack = null;

        if (attacker.prestige <= 0 || defender.prestige <= 0) {
            // end game
        } else {
            // Continue turn or switch
            if (battleState.attacker === 'player') {
                battleState.phase = 'player_attack';
            } else {
                // AI has finished its attack, now it's player's turn
                endAiTurn();
            }
        }
        renderBattleUI();
    }

    function endPlayerTurn() {
        battleState.turn++;
        battleState.attacker = 'ai';
        battleState.defender = 'player';
        // Update TP limits and draw cards for new turn
        battleState.player.tpLimit++;
        battleState.ai.tpLimit++;
        battleState.player.tp = battleState.player.tpLimit;
        battleState.ai.tp = battleState.ai.tpLimit;
        drawCard('player');
        drawCard('ai');

        battleState.log.push(`你的回合结束，轮到AI行动...`);
        setTimeout(aiAttackAction, 1000);
    }

    function aiAttackAction() {
        // Simplified AI attack logic
        const ai = battleState.ai;
        if (ai.hand.length === 0) {
            endAiTurn();
            return;
        }
        const card = ai.hand[0];
        const action = window.GAME_CONFIG.battle.actions.friendly; // AI always uses friendly for now
        if (ai.tp >= card.cost + action.cost) {
            ai.tp -= (card.cost + action.cost);
            battleState.currentAttack = {
                attacker: 'ai',
                attackCard: card,
                attackType: action.name
            };
            ai.hand.splice(0, 1);
            battleState.phase = 'player_defend';
            battleState.log.push(`AI 使用 [${card.name}] 发动了 [${action.name}]！`);
            renderBattleUI();
        } else {
            endAiTurn();
        }
    }

    function aiDefenseAction() {
        // Simplified AI defense logic
        const ai = battleState.ai;
        if (ai.hand.length === 0) {
            // No cards to defend with, must agree
            resolveBattle(battleState.currentAttack, { defender: 'ai', defendCard: null, defendType: '赞同' });
            return;
        }
        const card = ai.hand[0];
        const action = window.GAME_CONFIG.battle.actions.agree; // AI always agrees for now
        if (ai.tp >= card.cost + action.cost) {
            ai.tp -= (card.cost + action.cost);
            const defense = {
                defender: 'ai',
                defendCard: card,
                defendType: action.name
            };
            ai.hand.splice(0, 1);
            resolveBattle(battleState.currentAttack, defense);
        } else {
            resolveBattle(battleState.currentAttack, { defender: 'ai', defendCard: null, defendType: '赞同' });
        }
    }

    function endAiTurn() {
        battleState.attacker = 'player';
        battleState.defender = 'ai';
        battleState.log.push("AI回合结束，轮到你行动...");
        battleState.phase = 'player_attack';
        renderBattleUI();
    }

    function renderBattleUI() {
        const { player, ai, turn, phase, log, currentAttack } = battleState;
        const arena = ui.battle.arenaContainer;
        const battleConfig = window.GAME_CONFIG.battle;

        let playerStatus = `<span>玩家: ${player.prestige} 声望 | ${player.tp}/${player.tpLimit} TP | ${player.hand.length} 手牌</span>`;
        let aiStatus = `<span>AI: ${ai.prestige} 声望 | ${ai.tp}/${ai.tpLimit} TP | ${ai.hand.length} 手牌</span>`;

        let battlefieldHTML = '';
        if (phase === 'player_defend' && currentAttack) {
            battlefieldHTML = `
                <div class="flex flex-col items-center">
                    <p class="mb-2">AI 使用 [${currentAttack.attackCard.name}] 发动了 [${currentAttack.attackType}]!</p>
                    ${createBattleCard(currentAttack.attackCard, 'ai')}
                </div>
            `;
        }

        let playerActionsHTML = '';
        if (phase === 'player_attack') {
            playerActionsHTML = `
                <h3 class="text-center font-bold mb-2">选择一张手牌和行动</h3>
                <div class="flex justify-center gap-4">
                    <button id="action-friendly" class="p-2 bg-green-600 rounded">${battleConfig.actions.friendly.name}</button>
                    <button id="action-harsh" class="p-2 bg-yellow-600 rounded">${battleConfig.actions.harsh.name} (-1 TP)</button>
                    <button id="action-end-turn" class="p-2 bg-gray-600 rounded">结束回合</button>
                </div>
            `;
        } else if (phase === 'player_defend') {
            playerActionsHTML = `
                <h3 class="text-center font-bold mb-2">选择一张手牌进行应对</h3>
                <div class="flex justify-center gap-4">
                    <button id="action-agree" class="p-2 bg-blue-600 rounded">${battleConfig.actions.agree.name}</button>
                    <button id="action-disagree" class="p-2 bg-orange-600 rounded">${battleConfig.actions.disagree.name} (-1 TP)</button>
                </div>
            `;
        }

        arena.innerHTML = `
            <div class="p-4 bg-gray-800 text-white rounded-lg">
                <h2 class="text-center font-bold text-xl mb-4">宅理论战 V4.0 - 回合 ${turn}</h2>
                <!-- AI Info -->
                <div class="flex justify-between p-2 bg-red-900 rounded">${aiStatus}</div>
                
                <!-- Battlefield -->
                <div class="my-4 p-4 bg-black min-h-[12rem] flex items-center justify-center">
                    ${battlefieldHTML}
                </div>

                <!-- Player Info -->
                <div class="flex justify-between p-2 bg-blue-900 rounded">${playerStatus}</div>
                
                <!-- Player Hand -->
                <div class="mt-4 p-2 bg-gray-900 rounded min-h-[11rem]">
                    <div id="player-hand-cards" class="flex gap-2 justify-center mt-2">
                        ${player.hand.map((c, i) => createBattleCard(c, 'player-hand', i)).join('')}
                    </div>
                </div>

                <!-- Player Actions -->
                <div id="player-actions" class="mt-4 p-2 bg-gray-900 rounded">
                    ${playerActionsHTML}
                </div>

                <!-- Log -->
                <div class="mt-4 p-2 bg-black h-32 overflow-y-auto">${log.map(l => `<div>${l}</div>`).join('')}</div>
            </div>
        `;

        // Add event listeners
        document.querySelectorAll('#player-hand-cards .battle-card').forEach((el, i) => {
            el.addEventListener('click', () => {
                selectedHandCardIndex = i;
                renderBattleUI(); // Re-render to show selection
            });
        });

        if (phase === 'player_attack') {
            document.getElementById('action-friendly').addEventListener('click', () => playerAction('friendly'));
            document.getElementById('action-harsh').addEventListener('click', () => playerAction('harsh'));
            document.getElementById('action-end-turn').addEventListener('click', endPlayerTurn);
        } else if (phase === 'player_defend') {
            document.getElementById('action-agree').addEventListener('click', () => playerAction('agree'));
            document.getElementById('action-disagree').addEventListener('click', () => playerAction('disagree'));
        }
    }

    function createBattleCard(card, owner, handIndex = -1) {
        const isSelected = handIndex === selectedHandCardIndex;
        return `
            <div class="battle-card w-24 h-36 relative group ${isSelected ? 'border-4 border-yellow-400' : ''}">
                <img src="${card.image_path}" class="w-full h-full object-cover rounded-lg" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <div class="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-base font-bold w-7 h-7 flex items-center justify-center rounded-full">${card.cost}</div>
                <div class="absolute top-1 right-1 bg-black bg-opacity-70 text-white text-base font-bold w-7 h-7 flex items-center justify-center rounded-full">${card.points}</div>
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-center text-xs font-bold p-1 truncate">${card.name}</div>
            </div>
        `;
    }
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

            // The start battle button is now part of the battle setup, not the main UI
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
                if (hash === '#deck-and-collection') {
                    renderDeckAndCollection();
                } else if (hash === '#battle') {
                    renderBattleSetup();
                    ui.battle.setup.classList.remove('hidden');
                    ui.battle.arenaContainer.innerHTML = ''; // Clear any previous battle
                }
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
