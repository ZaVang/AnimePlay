// frontend/js/anime_gacha.js
window.Game = window.Game || {};

Game.AnimeGacha = (function() {

    let allAnimes = [];
    let isInitialized = false;

    // 动画抽卡配置
    const animeGachaConfig = {
        itemType: '动画',
        itemKey: 'anime',
        rarityConfig: window.GAME_CONFIG.animeSystem.rarityConfig,
        gacha: window.GAME_CONFIG.animeSystem.gacha,
        rateUp: window.GAME_CONFIG.animeSystem.rateUp
    };
    
    // Load anime card data from backend
    async function _loadAnimeData() {
        try {
            const response = await fetch('/data/anime/all_cards.json?t=' + new Date().getTime());
            if (response.ok) {
                allAnimes = await response.json();
                console.log(`Loaded ${allAnimes.length} anime cards for gacha system`);
                _updatePlayerAnimeCollection();
                return true;
            } else {
                throw new Error('Failed to fetch anime data');
            }
        } catch (error) {
            console.error('Failed to load anime data:', error);
            allAnimes = [];
            return false;
        }
    }

    // Update player anime collection with proper card data
    function _updatePlayerAnimeCollection() {
        const playerAnimeCollection = Game.Player.getAnimeCollection();
        let updatedCount = 0;
        
        playerAnimeCollection.forEach((animeData, animeId) => {
            const actualAnime = allAnimes.find(c => c.id == animeId);
            if (actualAnime) {
                animeData.anime = actualAnime;
                updatedCount++;
            } else {
                console.warn(`Anime card not found for ID: ${animeId}`);
            }
        });
        
        console.log(`Updated ${updatedCount} anime cards in player collection`);
        document.dispatchEvent(new CustomEvent('animeDataReady'));
    }

    // Get UP cards from the current UP pool
    function _getUpAnime() {
        const { rateUp } = window.GAME_CONFIG.animeSystem;
        if (!rateUp.ids || rateUp.ids.length === 0) {
            return [];
        }
        return allAnimes.filter(c => rateUp.ids.includes(c.id));
    }

    // Set UP anime for the anime gacha
    function _setUpAnime(Ids) {
        window.GAME_CONFIG.animeSystem.rateUp.ids = Ids || [];
        console.log('Anime UP pool updated:', Ids);
    }


    // Handle anime gacha draw
    function _handleAnimeDraw(count) {
        Game.BaseGacha.performGacha(
            animeGachaConfig,
            count,
            'animeGachaTickets',
            window.GAME_CONFIG.gameplay.animeGachaEXP,
            () => allAnimes,
            _getUpAnime,
            Game.Player.getAnimePityState,
            Game.Player.getAnimeCollection,
            Game.Player.getAnimeGachaHistory,
            _renderAnimeGachaResult
        );
    }
    
    function getDismantleValue(rarity) {
        return Game.BaseGacha.getDismantleValue(rarity, window.GAME_CONFIG.animeSystem.rarityConfig);
    }

    // Render anime gacha result
    function _renderAnimeGachaResult(drawnCards) {
        const { ResultContainer, ResultModal } = Game.UI.elements.animeGacha;

        ResultContainer.innerHTML = '';
        drawnCards.forEach(anime => {
            const animeData = Game.Player.getAnimeCollection().get(anime.id) || { anime, count: 1 };
            const animeEl = Game.UI.createAnimeCardElement(animeData, 'anime-gacha-result', { 
                isDuplicate: anime.isDuplicate,
                isNew: anime.isNew 
            });
            ResultContainer.appendChild(animeEl);
        });
        
        ResultModal.classList.remove('hidden');
    }

    // Show anime gacha rates
    function _showAnimeGachaRates() {
        const { RatesContent, RatesModal } = Game.UI.elements.animeGacha;
        Game.BaseGacha.showRates(animeGachaConfig, RatesContent, RatesModal);
    }
    
    function _renderShop() {
        const { shopItems } = Game.UI.elements.animeGacha;
        if (!shopItems) return;
        
        const playerCollection = Game.Player.getAnimeCollection();
        shopItems.innerHTML = '';

        window.GAME_CONFIG.animeSystem.shop.items.forEach(item => {
            const anime = allAnimes.find(c => c.id === item.Id);
            if (!anime) return;

            const isOwned = playerCollection.has(anime.id);
            const { c: rarityColor } = window.GAME_CONFIG.animeSystem.rarityConfig[anime.rarity] || {};
            
            const shopItem = document.createElement('div');
            shopItem.className = 'bg-gray-50 rounded-lg shadow-md p-4 flex flex-col items-center';
            shopItem.innerHTML = `
                <img src="${anime.image_path}" class="w-24 h-36 object-cover rounded-md mb-2" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <p class="font-bold text-center">${anime.name}</p>
                <p class="text-sm ${rarityColor} text-white px-2 py-0.5 rounded-full my-1">${anime.rarity}</p>
                <p class="font-bold text-lg text-emerald-600">${item.cost.toLocaleString()} 知识点</p>
                <button class="buy-btn mt-2 w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '兑换'}
                </button>
            `;
            if (!isOwned) {
                shopItem.querySelector('.buy-btn').addEventListener('click', () => _buyFromShop(item, anime));
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
        if (Game.Player.getAnimeCollection().has(card.id)) {
            alert("你已经拥有这张卡了！");
            return;
        }

        if (confirm(`确定要花费 ${item.cost} 知识点兑换 ${card.name} 吗？`)) {
            playerState.knowledgePoints -= item.cost;
            Game.Player.getCollection('anime').set(card.id, { anime: card, count: 1 });
            alert("兑换成功！");
            Game.UI.renderPlayerState();
            _renderShop();
            Game.Player.saveState();
        }
    }

    // Switch anime gacha tabs
    function _switchGachaTab(tabName, type = "anime") {
        Game.UI.switchGachaTab(tabName, type);
    }

    return {
        init: async function() {
            console.log("Initializing Anime Gacha system...");
            
            await _loadAnimeData();
            
            const { animeGacha } = Game.UI.elements;
            if (animeGacha) {
                animeGacha.singleBtn?.addEventListener('click', () => _handleAnimeDraw(1));
                animeGacha.multiBtn?.addEventListener('click', () => _handleAnimeDraw(10));
                animeGacha.showRatesBtn?.addEventListener('click', _showAnimeGachaRates);
                
                animeGacha.tabs.pool?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('pool', 'anime'); });
                animeGacha.tabs.history?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('history', 'anime'); });
                animeGacha.tabs.shop?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('shop', 'anime'); });
                
                animeGacha.closeResultBtn?.addEventListener('click', () => animeGacha.ResultModal.classList.add('hidden'));
                animeGacha.closeRatesBtn?.addEventListener('click', () => animeGacha.RatesModal.classList.add('hidden'));
                animeGacha.closeDetailBtn?.addEventListener('click', () => animeGacha.DetailModal.classList.add('hidden'));
            }

            document.addEventListener('playerLoggedIn', () => {
                console.log('Player logged in, updating anime collection...');
                _updatePlayerAnimeCollection();
            });

            isInitialized = true;
            console.log("Anime Gacha system initialized successfully.");
        },

        renderUI: function() {
            const upAnime = _getUpAnime();
            const { UpBanner } = Game.UI.elements.animeGacha || {};

            if (UpBanner) {
                if (upAnime.length === 0) {
                    UpBanner.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center text-pink-600">番剧邂逅</h3>
                        <div class="text-center">
                            <p class="text-gray-600 mb-2">与你喜爱的动画番剧邂逅！</p>
                            <p class="text-sm text-gray-500">• 高稀有度番剧拥有特殊光效</p>
                            <p class="text-sm text-gray-500">• 十连必出SR级以上番剧</p>
                        </div>
                    `;
                } else {
                    const { rateUp } = window.GAME_CONFIG.animeSystem;
                    let animeHtml = upAnime.map(anime => `
                        <div class="w-24 flex-shrink-0">
                            <img src="${anime.image_path}" class="w-full h-auto rounded-md shadow-lg" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=番剧头像';">
                            <p class="text-center text-xs font-bold truncate mt-1">${anime.name}</p>
                        </div>
                    `).join('');
                    
                    UpBanner.innerHTML = `
                        <h3 class="text-xl font-bold mb-4 text-center text-pink-600">当前UP番剧池</h3>
                        <div class="flex items-center justify-center gap-6 flex-wrap">
                            ${animeHtml}
                            <div class="text-gray-600 text-sm">
                                <p>• HR邂逅时，有<span class="font-bold text-pink-600">${rateUp.hrChance * 100}%</span>概率为UP！</p>
                                <p>• 累计<span class="font-bold text-pink-600">${rateUp.pityPulls}</span>次邂逅必定获得UP之一！</p>
                                <p>• 十连邂逅必定获得<span class="font-bold text-pink-600">SR</span>及以上番剧！</p>
                            </div>
                        </div>
                    `;
                }
            }
            _renderShop();
        },
        getAllAnimes: () => allAnimes,
        getDismantleValue: getDismantleValue,
        isInitialized: () => isInitialized,
        setUpAnime: _setUpAnime,
        getUpAnime: _getUpAnime
    };
})();
