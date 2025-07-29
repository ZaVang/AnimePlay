// frontend/js/deck.js
window.Game = window.Game || {};

Game.Deck = (function() {

    function _addCardToDeck(cardId) {
        const playerState = Game.Player.getState();
        const deck = playerState.decks[playerState.activeDeckName];
        if (deck.includes(cardId)) return;
        
        const { deckBuilding } = window.GAME_CONFIG;
        if (deck.length >= deckBuilding.maxCards) {
            alert(`卡组已满（最多${deckBuilding.maxCards}张）`);
            return;
        }
        const card = Game.Player.getAllCards().find(c => c.id === cardId);
        const totalCost = deck.reduce((sum, id) => sum + Game.Player.getAllCards().find(c=>c.id===id).cost, 0);
        if (totalCost + card.cost > deckBuilding.maxCost) {
            alert("卡组Cost已达上限！");
            return;
        }
        deck.push(cardId);
        _renderUI();
    }

    function _removeCardFromDeck(cardId) {
        const playerState = Game.Player.getState();
        const deck = playerState.decks[playerState.activeDeckName];
        const index = deck.indexOf(cardId);
        if (index > -1) {
            deck.splice(index, 1);
            _renderUI();
        }
    }

    function _newDeck() {
        const playerState = Game.Player.getState();
        const newName = prompt("请输入新卡组的名称：", `卡组 ${Object.keys(playerState.decks).length + 1}`);
        if (newName && !playerState.decks[newName]) {
            playerState.decks[newName] = [];
            playerState.activeDeckName = newName;
            _renderUI();
        } else if (newName) {
            alert("该名称已存在！");
        }
    }

    function _renameDeck() {
        const playerState = Game.Player.getState();
        const oldName = playerState.activeDeckName;
        const newName = prompt("请输入新的名称：", oldName);
        if (newName && newName !== oldName && !playerState.decks[newName]) {
            playerState.decks[newName] = playerState.decks[oldName];
            delete playerState.decks[oldName];
            playerState.activeDeckName = newName;
            _renderUI();
        } else if (newName) {
            alert("该名称无效或已存在！");
        }
    }

    function _deleteDeck() {
        const playerState = Game.Player.getState();
        const deckName = playerState.activeDeckName;
        if (Object.keys(playerState.decks).length <= 1) {
            alert("不能删除唯一的卡组！");
            return;
        }
        if (confirm(`确定要删除卡组 " ${deckName} " 吗？`)) {
            delete playerState.decks[deckName];
            playerState.activeDeckName = Object.keys(playerState.decks)[0];
            _renderUI();
        }
    }
    
    function _switchDeck() {
        Game.Player.getState().activeDeckName = Game.UI.elements.deck.selector.value;
        _renderUI();
    }

    function _dismantleCard(cardId) {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        if (!playerCollection.has(cardId)) return;
        const cardData = playerCollection.get(cardId);
        if (cardData.count > 1) {
            cardData.count--;
            const dismantleValue = Game.Gacha.getDismantleValue(cardData.card.rarity);
            playerState.knowledgePoints += dismantleValue;
            Game.UI.logMessage(`分解了 ${cardData.card.name}, 获得 ${dismantleValue} 知识点。`, 'reward');
            Game.UI.renderPlayerState();
            _renderUI();
        } else {
           console.log(`Cannot dismantle the last copy of ${cardData.card.name}.`);
        }
    }

    function _dismantleAllDuplicates() {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        let totalKnowledgeGained = 0;
        for (const [cardId, cardData] of playerCollection.entries()) {
            if (cardData.count > 1) {
                const dismantleValue = Game.Gacha.getDismantleValue(cardData.card.rarity);
                const duplicatesToDismantle = cardData.count - 1;
                const knowledgeGained = duplicatesToDismantle * dismantleValue;
                totalKnowledgeGained += knowledgeGained;
                playerState.knowledgePoints += knowledgeGained;
                cardData.count = 1;
            }
        }

        if (totalKnowledgeGained > 0) {
            alert(`分解了所有重复卡牌，共获得 ${totalKnowledgeGained} 知识点！`);
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderUI();
        } else {
            alert("没有可分解的重复卡牌。");
        }
    }

    function _renderUI() {
        if (Game.UI.elements.deck.container.classList.contains('hidden')) return;

        const playerState = Game.Player.getState();
        const playerCollection = Game.Player.getPlayerCollection();
        const allCards = Game.Player.getAllCards();
        const { deck: deckUI, collection: collectionUI } = Game.UI.elements;
        const { deckBuilding } = window.GAME_CONFIG;

        const deck = playerState.decks[playerState.activeDeckName] || [];

        // Render Collection
        collectionUI.container.innerHTML = '';
        const nameFilter = collectionUI.filterName.value.toLowerCase();
        const rarityFilter = collectionUI.filterRarity.value;
        const tagFilter = collectionUI.filterTag.value;
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
            const cardEl = Game.UI.createCardElement(cardData, 'deck-collection');
            if (deck.includes(cardData.card.id)) {
                cardEl.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                cardEl.addEventListener('click', () => _addCardToDeck(cardData.card.id));
            }
            collectionUI.container.appendChild(cardEl);
        });

        // Render Deck
        deckUI.list.innerHTML = '';
        let totalCost = 0;
        deck.forEach(cardId => {
            const cardData = playerCollection.get(cardId);
            if(cardData){
                 const cardEl = Game.UI.createCardElement(cardData, 'deck-list');
                 cardEl.addEventListener('click', () => _removeCardFromDeck(cardId));
                 deckUI.list.appendChild(cardEl);
                 totalCost += cardData.card.cost;
            }
        });

        deckUI.costDisplay.textContent = `${totalCost} / ${deckBuilding.maxCost}`;
        deckUI.countDisplay.textContent = `${deck.length} / ${deckBuilding.maxCards}`;

        // Render Deck Selector
        deckUI.selector.innerHTML = '';
        Object.keys(playerState.decks).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            const deckSize = playerState.decks[name].length;
            const isValidSize = deckSize === 20;
            option.textContent = `${name} (${deckSize}/20)${isValidSize ? ' ✓' : ''}`;
            if (name === playerState.activeDeckName) option.selected = true;
            deckUI.selector.appendChild(option);
        });
    }


    return {
        init: function() {
            const { deck: deckUI, collection: collectionUI } = Game.UI.elements;
            deckUI.selector.addEventListener('change', _switchDeck);
            deckUI.newBtn.addEventListener('click', _newDeck);
            deckUI.renameBtn.addEventListener('click', _renameDeck);
            deckUI.deleteBtn.addEventListener('click', _deleteDeck);
            deckUI.saveBtn.addEventListener('click', () => Game.Player.saveState(true));

            collectionUI.filterName.addEventListener('input', _renderUI);
            collectionUI.filterRarity.addEventListener('change', _renderUI);
            collectionUI.filterTag.addEventListener('change', _renderUI);
            collectionUI.dismantleAllBtn.addEventListener('click', _dismantleAllDuplicates);

            console.log("Deck module initialized.");
        },
        getActiveDeck: function() {
            const playerState = Game.Player.getState();
            return playerState.decks[playerState.activeDeckName] || [];
        },
        dismantleCard: _dismantleCard,
        renderUI: _renderUI,
    };
})();
