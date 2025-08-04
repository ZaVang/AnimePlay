// frontend/js/deck.js
window.Game = window.Game || {};

Game.Deck = (function() {

    let currentDeckView = 'anime'; // 'anime', 'character', 'mixed'

    function _addCardToDeck(cardId) {
        const playerState = Game.Player.getState();
        const deck = playerState.decks[playerState.activeDeckName];
        if (deck.includes(cardId)) return;
        
        const { deckBuilding } = window.GAME_CONFIG;
        if (deck.length >= deckBuilding.maxCards) {
            alert(`卡组已满（最多${deckBuilding.maxCards}张）`);
            return;
        }
        const anime = Game.Player.getAllAnimes().find(c => c.id === cardId);
        const totalCost = deck.reduce((sum, id) => sum + Game.Player.getAllAnimes().find(c=>c.id===id).cost, 0);
        if (totalCost + anime.cost > deckBuilding.maxCost) {
            alert("卡组Cost已达上限！");
            return;
        }
        deck.push(anime.id);
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
            const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity);
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
                const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity);
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

    // 切换卡组视图
    function _switchDeckView(viewType) {
        currentDeckView = viewType;
        
        // 更新按钮状态
        document.querySelectorAll('.deck-view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`deck-view-${viewType}`).classList.add('active');
        
        // 切换视图
        document.getElementById('deck-anime-collection').classList.toggle('hidden', viewType !== 'anime');
        document.getElementById('deck-character-collection').classList.toggle('hidden', viewType !== 'character');
        document.getElementById('deck-mixed-collection').classList.toggle('hidden', viewType !== 'mixed');
        
        _renderCollectionView();
    }

    // 渲染收藏视图
    function _renderCollectionView() {
        switch (currentDeckView) {
            case 'anime':
                _renderAnimeCollection();
                break;
            case 'character':
                _renderCharacterCollection();
                break;
            case 'mixed':
                _renderMixedCollection();
                break;
        }
    }

    // 渲染动画收藏
    function _renderAnimeCollection() {
        const playerCollection = Game.Player.getPlayerCollection();
        const collectionView = document.getElementById('collection-view');
        const nameFilter = document.getElementById('collection-filter-name').value.toLowerCase();
        const rarityFilter = document.getElementById('collection-filter-rarity').value;
        const tagFilter = document.getElementById('collection-filter-tag').value;
        
        if (!collectionView) return;
        collectionView.innerHTML = '';
        
        const filteredCards = Array.from(playerCollection.values()).filter(data => {
            const card = data.card;
            const nameMatch = card.name.toLowerCase().includes(nameFilter);
            const rarityMatch = rarityFilter ? card.rarity === rarityFilter : true;
            const tagMatch = tagFilter ? (card.synergy_tags || []).includes(tagFilter) : true;
            return nameMatch && rarityMatch && tagMatch;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredCards.sort((a, b) => {
            const rarityA = rarityOrder.indexOf(a.card.rarity);
            const rarityB = rarityOrder.indexOf(b.card.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return b.card.points - a.card.points;
        }).forEach(cardData => {
            const cardEl = Game.UI.createAnimeCardElement(cardData, 'deck-collection');
            const playerState = Game.Player.getState();
            const deck = playerState.decks[playerState.activeDeckName] || [];
            
            if (deck.includes(cardData.card.id)) {
                cardEl.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                cardEl.addEventListener('click', () => _addCardToDeck(cardData.card.id));
            }
            collectionView.appendChild(cardEl);
        });
    }

    // 渲染角色收藏
    function _renderCharacterCollection() {
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const collectionView = document.getElementById('deck-character-collection-view');
        const nameFilter = document.getElementById('deck-character-filter-name').value.toLowerCase();
        const rarityFilter = document.getElementById('deck-character-filter-rarity').value;
        const genderFilter = document.getElementById('deck-character-filter-gender').value;
        
        if (!collectionView) return;
        collectionView.innerHTML = '';
        
        const filteredCharacters = Array.from(playerCharacterCollection.values()).filter(data => {
            const character = data.character;
            const nameMatch = character.name.toLowerCase().includes(nameFilter);
            const rarityMatch = rarityFilter ? character.rarity === rarityFilter : true;
            const genderMatch = genderFilter ? character.gender === genderFilter : true;
            return nameMatch && rarityMatch && genderMatch;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredCharacters.sort((a, b) => {
            const rarityA = rarityOrder.indexOf(a.character.rarity);
            const rarityB = rarityOrder.indexOf(b.character.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return a.character.name.localeCompare(b.character.name);
        }).forEach(characterData => {
            const characterEl = Game.UI.createCharacterCardElement(characterData, 'deck-character-collection');
            // 注意：目前角色卡不能添加到卡组，这里只是展示
            collectionView.appendChild(characterEl);
        });
    }

    // 渲染混合收藏
    function _renderMixedCollection() {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerCharacterCollection = Game.Player.getCharacterCollection();
        const collectionView = document.getElementById('deck-mixed-collection-view');
        const nameFilter = document.getElementById('deck-mixed-filter-name').value.toLowerCase();
        const typeFilter = document.getElementById('deck-mixed-filter-type').value;
        const rarityFilter = document.getElementById('deck-mixed-filter-rarity').value;
        
        if (!collectionView) return;
        collectionView.innerHTML = '';
        
        let allItems = [];
        
        // 添加动画卡
        if (!typeFilter || typeFilter === 'anime') {
            Array.from(playerCollection.values()).forEach(data => {
                allItems.push({ type: 'anime', data: data });
            });
        }
        
        // 添加角色卡
        if (!typeFilter || typeFilter === 'character') {
            Array.from(playerCharacterCollection.values()).forEach(data => {
                allItems.push({ type: 'character', data: data });
            });
        }
        
        // 应用筛选
        const filteredItems = allItems.filter(item => {
            const itemData = item.type === 'anime' ? item.data.card : item.data.character;
            const nameMatch = itemData.name.toLowerCase().includes(nameFilter);
            const rarityMatch = rarityFilter ? itemData.rarity === rarityFilter : true;
            return nameMatch && rarityMatch;
        });
        
        // 排序
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredItems.sort((a, b) => {
            const itemA = a.type === 'anime' ? a.data.card : a.data.character;
            const itemB = b.type === 'anime' ? b.data.card : b.data.character;
            const rarityA = rarityOrder.indexOf(itemA.rarity);
            const rarityB = rarityOrder.indexOf(itemB.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return itemA.name.localeCompare(itemB.name);
        });
        
        // 渲染
        filteredItems.forEach(item => {
            let element;
            if (item.type === 'anime') {
                element = Game.UI.createAnimeCardElement(item.data, 'deck-mixed-collection');
                const playerState = Game.Player.getState();
                const deck = playerState.decks[playerState.activeDeckName] || [];
                
                if (deck.includes(item.data.card.id)) {
                    element.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    element.addEventListener('click', () => _addCardToDeck(item.data.card.id));
                }
            } else {
                element = Game.UI.createCharacterCardElement(item.data, 'deck-mixed-collection');
                // 角色卡暂时不能加入卡组
                element.classList.add('opacity-75');
            }
            
            // 添加类型标识
            const typeIndicator = document.createElement('div');
            typeIndicator.className = `absolute top-1 left-1 px-1 py-0.5 text-xs font-bold rounded ${
                item.type === 'anime' ? 'bg-indigo-500 text-white' : 'bg-pink-500 text-white'
            }`;
            typeIndicator.textContent = item.type === 'anime' ? '动' : '角';
            element.querySelector('.relative').appendChild(typeIndicator);
            
            collectionView.appendChild(element);
        });
    }

    function _renderUI() {
        if (Game.UI.elements.deck.container.classList.contains('hidden')) return;

        const playerState = Game.Player.getState();
        const playerCollection = Game.Player.getPlayerCollection();
        const { deck: deckUI } = Game.UI.elements;
        const { deckBuilding } = window.GAME_CONFIG;

        const deck = playerState.decks[playerState.activeDeckName] || [];

        // Render Collection based on current view
        _renderCollectionView();

        // Render Deck
        deckUI.list.innerHTML = '';
        let totalCost = 0;
        deck.forEach(cardId => {
            const cardData = playerCollection.get(cardId);
            if(cardData){
                 const cardEl = Game.UI.createAnimeCardElement(cardData, 'deck-list');
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
            const { deck: deckUI } = Game.UI.elements;

            const animeCollectionUI = {
                filterName: document.getElementById('collection-filter-name'),
                filterRarity: document.getElementById('collection-filter-rarity'),
                filterTag: document.getElementById('collection-filter-tag'),
                dismantleAllBtn: document.getElementById('collection-dismantle-all-btn')
            };

            deckUI.selector.addEventListener('change', _switchDeck);
            deckUI.newBtn.addEventListener('click', _newDeck);
            deckUI.renameBtn.addEventListener('click', _renameDeck);
            deckUI.deleteBtn.addEventListener('click', _deleteDeck);
            deckUI.saveBtn.addEventListener('click', () => Game.Player.saveState(true));

            if (animeCollectionUI.filterName) animeCollectionUI.filterName.addEventListener('input', _renderUI);
            if (animeCollectionUI.filterRarity) animeCollectionUI.filterRarity.addEventListener('change', _renderUI);
            if (animeCollectionUI.filterTag) animeCollectionUI.filterTag.addEventListener('change', _renderUI);
            if (animeCollectionUI.dismantleAllBtn) animeCollectionUI.dismantleAllBtn.addEventListener('click', _dismantleAllDuplicates);

            // 视图切换按钮
            document.getElementById('deck-view-anime').addEventListener('click', () => _switchDeckView('anime'));
            document.getElementById('deck-view-character').addEventListener('click', () => _switchDeckView('character'));
            document.getElementById('deck-view-mixed').addEventListener('click', () => _switchDeckView('mixed'));

            // 角色收藏筛选器
            const characterNameFilter = document.getElementById('deck-character-filter-name');
            const characterRarityFilter = document.getElementById('deck-character-filter-rarity');
            const characterGenderFilter = document.getElementById('deck-character-filter-gender');
            const characterDismantleBtn = document.getElementById('deck-character-dismantle-all-btn');

            if (characterNameFilter) characterNameFilter.addEventListener('input', _renderUI);
            if (characterRarityFilter) characterRarityFilter.addEventListener('change', _renderUI);
            if (characterGenderFilter) characterGenderFilter.addEventListener('change', _renderUI);
            if (characterDismantleBtn) {
                characterDismantleBtn.addEventListener('click', () => {
                    if (Game.UnifiedCollection && Game.UnifiedCollection.dismantleAllCharacters) {
                        Game.UnifiedCollection.dismantleAllCharacters();
                    }
                });
            }

            // 混合视图筛选器
            const mixedNameFilter = document.getElementById('deck-mixed-filter-name');
            const mixedTypeFilter = document.getElementById('deck-mixed-filter-type');
            const mixedRarityFilter = document.getElementById('deck-mixed-filter-rarity');

            if (mixedNameFilter) mixedNameFilter.addEventListener('input', _renderUI);
            if (mixedTypeFilter) mixedTypeFilter.addEventListener('change', _renderUI);
            if (mixedRarityFilter) mixedRarityFilter.addEventListener('change', _renderUI);

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
