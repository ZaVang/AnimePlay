// frontend/js/gacha.js
window.Game = window.Game || {};

Game.AnimeGacha = (function() {

    // 动画抽卡配置
    const animeGachaConfig = {
        itemType: '动画',
        itemKey: 'card',
        rarityConfig: window.GAME_CONFIG.rarityConfig,
        gacha: window.GAME_CONFIG.gacha,
        rateUp: window.GAME_CONFIG.rateUp
    };

    function _handleDraw(count) {
        Game.BaseGacha.performGacha(
            animeGachaConfig,
            count,
            'gachaTickets',
            window.GAME_CONFIG.gameplay.gachaEXP,
            Game.Player.getAllCards,
            Game.Player.getRateUpCards,
            Game.Player.getPityState,
            Game.Player.getPlayerCollection,
            Game.Player.getGachaHistory,
            _renderGachaResult
        );
    }
    
    function getDismantleValue(rarity) {
        return Game.BaseGacha.getDismantleValue(rarity, window.GAME_CONFIG.rarityConfig);
    }

    function _renderGachaResult(drawnCards) {
        const { resultContainer, resultModal } = Game.UI.elements.gacha;
        
        const existingSummary = resultModal.querySelector('#gacha-dismantle-summary');
        if(existingSummary) existingSummary.remove();

        resultContainer.innerHTML = '';
        drawnCards.forEach(card => {
            const cardData = Game.Player.getPlayerCollection().get(card.id) || { card, count: 1 };
            const cardEl = Game.UI.createCardElement(cardData, 'gacha-result', { isDuplicate: card.isDuplicate });
            resultContainer.appendChild(cardEl);
        });
        
        resultModal.classList.remove('hidden');
    }

    function _showGachaRates() {
        const { ratesContent, ratesModal } = Game.UI.elements.gacha;
        Game.BaseGacha.showRates(animeGachaConfig, ratesContent, ratesModal);
    }
    
    function _renderShop() {
        const { shopItems } = Game.UI.elements.gacha;
        const allCards = Game.Player.getAllCards();
        const playerCollection = Game.Player.getPlayerCollection();
        shopItems.innerHTML = '';

        window.GAME_CONFIG.shop.items.forEach(item => {
            const card = allCards.find(c => c.id === item.cardId);
            if (!card) return;

            const isOwned = playerCollection.has(card.id);
            const { c: rarityColor } = window.GAME_CONFIG.rarityConfig[card.rarity] || {};
            
            const shopItem = document.createElement('div');
            shopItem.className = 'bg-gray-50 rounded-lg shadow-md p-4 flex flex-col items-center';
            shopItem.innerHTML = `
                <img src="${card.image_path}" class="w-24 h-36 object-cover rounded-md mb-2" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <p class="font-bold text-center">${card.name}</p>
                <p class="text-sm ${rarityColor} text-white px-2 py-0.5 rounded-full my-1">${card.rarity}</p>
                <p class="font-bold text-lg text-emerald-600">${item.cost.toLocaleString()} 知识点</p>
                <button class="buy-btn mt-2 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '兑换'}
                </button>
            `;
            if (!isOwned) {
                shopItem.querySelector('.buy-btn').addEventListener('click', () => _buyFromShop(item, card));
            }
            shopItems.appendChild(shopItem);
        });
    }

    function _buyFromShop(item, card) {
        const playerState = Game.Player.getState();
        if (playerState.knowledgePoints < item.cost) {
            alert("知识点不足！");
            return;
        }
        if (Game.Player.getPlayerCollection().has(card.id)) {
            alert("你已经拥有这张卡了！");
            return;
        }

        if (confirm(`确定要花费 ${item.cost} 知识点兑换 ${card.name} 吗？`)) {
            playerState.knowledgePoints -= item.cost;
            Game.Player.getPlayerCollection().set(card.id, { card, count: 1 });
            alert("兑换成功！");
            Game.UI.renderPlayerState();
            _renderShop();
            Game.Player.saveState();
        }
    }

    function _switchGachaTab(tabName) {
        // Use the unified tab switching in UI module
        Game.UI.switchGachaTab(tabName);
    }

    return {
        init: function() {
            const { gacha } = Game.UI.elements;
            gacha.singleBtn.addEventListener('click', () => _handleDraw(1));
            gacha.multiBtn.addEventListener('click', () => _handleDraw(10));
            gacha.showRatesBtn.addEventListener('click', _showGachaRates);
            
            gacha.tabs.pool.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('pool'); });
            gacha.tabs.history.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('history'); });
            gacha.tabs.shop.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('shop'); });
            console.log("Anime Gacha module initialized.");
        },
        renderUI: function() {
            const rateUpCards = Game.Player.getRateUpCards();
            const { upBanner } = Game.UI.elements.gacha;
            if (rateUpCards.length === 0) return;
            let cardHtml = rateUpCards.map(card => `<div class="w-24 flex-shrink-0"><img src="${card.image_path}" class="w-full h-auto rounded-md shadow-lg"><p class="text-center text-xs font-bold truncate mt-1">${card.name}</p></div>`).join('');
            upBanner.innerHTML = `<h3 class="text-xl font-bold mb-4 text-center text-purple-600">当前UP卡池</h3><div class="flex items-center justify-center gap-6 flex-wrap">${cardHtml}<div class="text-gray-600 text-sm"><p>・HR邂逅时，有<span class="font-bold text-indigo-600">${window.GAME_CONFIG.rateUp.hrChance * 100}%</span>概率为UP！</p><p>・累计<span class="font-bold text-indigo-600">${window.GAME_CONFIG.rateUp.pityPulls}</span>次邂逅必定获得UP之一！</p><p>・十连邂逅必定获得<span class="font-bold text-indigo-600">SR</span>及以上卡片！</p></div></div>`;
            _renderShop();
        },
        getDismantleValue: getDismantleValue,
    };

})();
