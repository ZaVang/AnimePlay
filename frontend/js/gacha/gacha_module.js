// frontend/js/gacha/gacha_module.js
window.Game = window.Game || {};

// 通用抽卡模块工厂函数
Game.GachaModule = function(config) {
    let allItems = [];
    let isInitialized = false;

    // 从配置中提取必要的信息
    const {
        type,                    // 'anime' | 'character'
        itemType,               // '动画' | '角色'
        itemKey,                // 'anime' | 'character'  
        dataUrl,                // 数据源URL
        configKey,              // 'animeSystem' | 'characterSystem'
        ticketType,             // 'animeGachaTickets' | 'characterGachaTickets'
        expReward,              // 经验奖励配置key
        playerMethods,          // 玩家相关方法
        uiElements,             // UI元素
        cardElementCreator,     // 卡片元素创建函数
        colors = {              // 主题颜色
            primary: 'indigo',
            secondary: 'pink'
        }
    } = config;

    // 构建抽卡配置
    const gachaConfig = {
        itemType,
        itemKey,
        rarityConfig: window.GAME_CONFIG[configKey].rarityConfig,
        gacha: window.GAME_CONFIG[configKey].gacha,
        rateUp: window.GAME_CONFIG[configKey].rateUp
    };

    // 加载数据
    async function _loadData() {
        try {
            const response = await fetch(dataUrl + (dataUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime());
            if (response.ok) {
                allItems = await response.json();
                console.log(`Loaded ${allItems.length} ${itemType} cards for gacha system`);
                _updatePlayerCollection();
                return true;
            } else {
                throw new Error(`Failed to fetch ${itemType} data`);
            }
        } catch (error) {
            console.error(`Failed to load ${itemType} data:`, error);
            allItems = [];
            return false;
        }
    }

    // 更新玩家收藏
    function _updatePlayerCollection() {
        const playerCollection = playerMethods.getCollection();
        let updatedCount = 0;
        
        playerCollection.forEach((itemData, itemId) => {
            const actualItem = allItems.find(c => c.id == itemId);
            if (actualItem) {
                itemData[itemKey] = actualItem;
                updatedCount++;
            } else {
                console.warn(`${itemType} not found for ID: ${itemId}`);
            }
        });
        
        console.log(`Updated ${updatedCount} ${itemType} cards in player collection`);
        document.dispatchEvent(new CustomEvent(`${type}DataReady`));
    }

    // 获取UP卡片
    function _getUpItems() {
        const { rateUp } = window.GAME_CONFIG[configKey];
        if (!rateUp.ids || rateUp.ids.length === 0) {
            return [];
        }
        return allItems.filter(c => rateUp.ids.includes(c.id));
    }

    // 设置UP卡片
    function _setUpItems(ids) {
        window.GAME_CONFIG[configKey].rateUp.ids = ids || [];
        console.log(`${itemType} UP pool updated:`, ids);
    }

    // 处理抽卡
    function _handleDraw(count) {
        Game.BaseGacha.performGacha(
            gachaConfig,
            count,
            ticketType,
            window.GAME_CONFIG.gameplay[expReward],
            () => allItems,
            _getUpItems,
            playerMethods.getPityState,
            playerMethods.getCollection,
            playerMethods.getGachaHistory,
            _renderGachaResult
        );
    }

    // 获取分解价值
    function getDismantleValue(rarity) {
        return Game.BaseGacha.getDismantleValue(rarity, window.GAME_CONFIG[configKey].rarityConfig);
    }

    // 渲染抽卡结果
    function _renderGachaResult(drawnCards) {
        const { ResultContainer, ResultModal } = uiElements;

        ResultContainer.innerHTML = '';
        drawnCards.forEach(item => {
            const itemData = playerMethods.getCollection().get(item.id) || { [itemKey]: item, count: 1 };
            const itemEl = cardElementCreator(itemData, `${type}-gacha-result`, { 
                isDuplicate: item.isDuplicate,
                isNew: item.isNew 
            });
            ResultContainer.appendChild(itemEl);
        });
        
        ResultModal.classList.remove('hidden');
    }

    // 显示抽卡概率
    function _showGachaRates() {
        const { RatesContent, RatesModal } = uiElements;
        Game.BaseGacha.showRates(gachaConfig, RatesContent, RatesModal);
    }

    // 渲染商店
    function _renderShop() {
        const { shopItems } = uiElements;
        if (!shopItems) return;
        
        const playerCollection = playerMethods.getCollection();
        shopItems.innerHTML = '';

        window.GAME_CONFIG[configKey].shop.items.forEach(item => {
            const card = allItems.find(c => c.id === item.Id);
            if (!card) return;

            const isOwned = playerCollection.has(card.id);
            const { c: rarityColor } = window.GAME_CONFIG[configKey].rarityConfig[card.rarity] || {};
            
            const shopItem = document.createElement('div');
            shopItem.className = 'bg-gray-50 rounded-lg shadow-md p-4 flex flex-col items-center';
            shopItem.innerHTML = `
                <img src="${card.image_path}" class="w-24 h-36 object-cover rounded-md mb-2" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=图片丢失';">
                <p class="font-bold text-center">${card.name}</p>
                <p class="text-sm ${rarityColor} text-white px-2 py-0.5 rounded-full my-1">${card.rarity}</p>
                <p class="font-bold text-lg text-emerald-600">${item.cost.toLocaleString()} 知识点</p>
                <button class="buy-btn mt-2 w-full bg-${colors.secondary}-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-${colors.secondary}-700 disabled:bg-gray-400" ${isOwned ? 'disabled' : ''}>
                    ${isOwned ? '已拥有' : '兑换'}
                </button>
            `;
            if (!isOwned) {
                shopItem.querySelector('.buy-btn').addEventListener('click', () => _buyFromShop(item, card));
            }
            shopItems.appendChild(shopItem);
        });
    }

    // 从商店购买
    function _buyFromShop(item, card) {
        const playerState = Game.Player.getState();
        if (playerState.knowledgePoints < item.cost) {
            alert("知识点不足！");
            return;
        }
        if (playerMethods.getCollection().has(card.id)) {
            alert(`你已经拥有这${itemType === '动画' ? '张卡' : '个角色'}了！`);
            return;
        }

        if (confirm(`确定要花费 ${item.cost} 知识点兑换 ${card.name} 吗？`)) {
            playerState.knowledgePoints -= item.cost;
            playerMethods.getCollection().set(card.id, { [itemKey]: card, count: 1 });
            alert("兑换成功！");
            Game.UI.renderPlayerState();
            _renderShop();
            Game.Player.saveState();
        }
    }

    // 切换抽卡标签
    function _switchGachaTab(tabName) {
        Game.UI.switchGachaTab(tabName, type);
    }

    // 渲染UP横幅
    function _renderUpBanner() {
        const upItems = _getUpItems();
        const { UpBanner } = uiElements || {};

        if (UpBanner) {
            if (upItems.length === 0) {
                UpBanner.innerHTML = `
                    <h3 class="text-xl font-bold mb-4 text-center text-${colors.secondary}-600">${itemType}抽卡</h3>
                    <div class="text-center">
                        <p class="text-gray-600 mb-2">与你喜爱的${itemType}抽卡！</p>
                        <p class="text-sm text-gray-500">• 高稀有度${itemType}拥有特殊光效</p>
                        <p class="text-sm text-gray-500">• 十连必出SR级以上${itemType}</p>
                    </div>
                `;
            } else {
                const { rateUp } = window.GAME_CONFIG[configKey];
                let itemsHtml = upItems.map(item => `
                    <div class="w-24 flex-shrink-0">
                        <img src="${item.image_path}" class="w-full h-auto rounded-md shadow-lg" onerror="this.src='https://placehold.co/96x144/e2e8f0/334155?text=${itemType}头像';">
                        <p class="text-center text-xs font-bold truncate mt-1">${item.name}</p>
                    </div>
                `).join('');
                
                UpBanner.innerHTML = `
                    <h3 class="text-xl font-bold mb-4 text-center text-${colors.secondary}-600">当前UP${itemType}池</h3>
                    <div class="flex items-center justify-center gap-6 flex-wrap">
                        ${itemsHtml}
                        <div class="text-gray-600 text-sm">
                            <p>• HR抽卡时，有<span class="font-bold text-${colors.secondary}-600">${rateUp.hrChance * 100}%</span>概率为UP！</p>
                            <p>• 累计<span class="font-bold text-${colors.secondary}-600">${rateUp.pityPulls}</span>次抽卡必定获得UP之一！</p>
                            <p>• 十连抽卡必定获得<span class="font-bold text-${colors.secondary}-600">SR</span>及以上${itemType}！</p>
                        </div>
                    </div>
                `;
            }
        }
    }

    // 返回公共接口
    return {
        init: async function() {
            console.log(`Initializing ${itemType} Gacha system...`);
            
            await _loadData();
            
            if (uiElements) {
                uiElements.singleBtn?.addEventListener('click', () => _handleDraw(1));
                uiElements.multiBtn?.addEventListener('click', () => _handleDraw(10));
                uiElements.showRatesBtn?.addEventListener('click', _showGachaRates);
                
                uiElements.tabs?.pool?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('pool'); });
                uiElements.tabs?.history?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('history'); });
                uiElements.tabs?.shop?.addEventListener('click', (e) => { e.preventDefault(); _switchGachaTab('shop'); });
                
                uiElements.closeResultBtn?.addEventListener('click', () => uiElements.ResultModal.classList.add('hidden'));
                uiElements.closeRatesBtn?.addEventListener('click', () => uiElements.RatesModal.classList.add('hidden'));
                uiElements.closeDetailBtn?.addEventListener('click', () => uiElements.DetailModal.classList.add('hidden'));
            }

            document.addEventListener('playerLoggedIn', () => {
                console.log(`Player logged in, updating ${itemType} collection...`);
                _updatePlayerCollection();
            });

            isInitialized = true;
            console.log(`${itemType} Gacha system initialized successfully.`);
        },

        renderUI: function() {
            _renderUpBanner();
            _renderShop();
        },

        getAllItems: () => allItems,
        getDismantleValue: getDismantleValue,
        isInitialized: () => isInitialized,
        setUpItems: _setUpItems,
        getUpItems: _getUpItems
    };
};