// frontend/js/base_gacha.js
window.Game = window.Game || {};

/**
 * 统一的抽卡系统基类
 * 处理动画卡和角色卡的通用抽卡逻辑
 */
Game.BaseGacha = (function() {

    /**
     * 通用抽卡处理逻辑
     * @param {Object} config - 抽卡配置
     * @param {number} count - 抽卡数量
     * @param {string} ticketType - 券类型 ('gachaTickets' | 'characterTickets')
     * @param {Object} expConfig - 经验配置
     * @param {Function} getItems - 获取所有物品函数
     * @param {Function} getRateUpItems - 获取UP物品函数
     * @param {Function} getPityState - 获取保底状态函数
     * @param {Function} getCollection - 获取收藏函数
     * @param {Function} getHistory - 获取历史函数
     * @param {Function} renderResult - 渲染结果函数
     */
    function performGacha(config, count, ticketType, expConfig, getItems, getRateUpItems, getPityState, getCollection, getHistory, renderResult) {
        const playerState = Game.Player.getState();
        
        // 检查登录状态
        if (!Game.Player.getCurrentUser()) {
            alert("请先登录！");
            return;
        }
        
        // 检查券数量
        const currentTickets = playerState[ticketType] || 0;
        if (currentTickets < count) {
            const ticketName = ticketType === 'animeGachaTickets' ? '番剧抽卡券' : '角色抽卡券';
            alert(`${ticketName}不足！当前拥有：${currentTickets}，需要：${count}`);
            return;
        }

        // 消耗券并增加经验
        playerState[ticketType] = currentTickets - count;
        if (expConfig) {
            const expGained = count === 1 ? expConfig.single : expConfig.multi;
            Game.Player.addExp(expGained);
        }


        // 执行抽卡
        const drawnItems = _performGachaLogic(config, count, getItems, getRateUpItems, getPityState);
        
        // 更新收藏
        const collection = getCollection();
        drawnItems.forEach(item => {
            if (collection.has(item.id)) {
                const existing = collection.get(item.id);
                existing.count++;
                item.isDuplicate = true;
            } else {
                collection.set(item.id, { [config.itemKey]: item, count: 1 });
                item.isNew = true;
            }
        });

        // 保存历史记录
        const history = getHistory();
        history.push(...drawnItems);
        
        Game.Player.saveState(false);
        renderResult(drawnItems);
        Game.UI.renderPlayerState();
    }

    /**
     * 统一的抽卡逻辑实现
     */
    function _performGachaLogic(config, count, getItems, getRateUpItems, getPityState) {
        const { rarityConfig, gacha, rateUp } = config;
        const pityState = getPityState();
        const rateUpItems = getRateUpItems();
        const allItems = getItems();
        let drawnItems = [];

        for (let i = 0; i < count; i++) {
            pityState.totalPulls++;
            pityState.pullsSinceLastHR++;
            
            let drawnItem;
            
            // 检查UP保底机制
            if (rateUp.pityPulls > 0 && pityState.pullsSinceLastHR >= rateUp.pityPulls && rateUpItems.length > 0) {
                pityState.pullsSinceLastHR = 0;
                drawnItem = rateUpItems[Math.floor(Math.random() * rateUpItems.length)];
            } else {
                // 正常概率抽取
                const rand = Math.random() * 100;
                let cumulativeProb = 0;
                let drawnRarity = 'N';
                
                for (const rarity in rarityConfig) {
                    cumulativeProb += rarityConfig[rarity].p;
                    if (rand < cumulativeProb) { 
                        drawnRarity = rarity; 
                        break; 
                    }
                }
                
                // 检查HR时的UP概率
                if (drawnRarity === 'HR' && rateUpItems.length > 0 && Math.random() < rateUp.hrChance) {
                    pityState.pullsSinceLastHR = 0;
                    drawnItem = rateUpItems[Math.floor(Math.random() * rateUpItems.length)];
                } else {
                    // 从普通池中选择
                    const pool = allItems.filter(item => item.rarity === drawnRarity);
                    drawnItem = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : 
                              allItems.find(item => item.rarity === 'N'); // Fallback
                    
                    if (drawnRarity === 'HR') pityState.pullsSinceLastHR = 0;
                }
            }

            drawnItems.push({ ...drawnItem, timestamp: Date.now() });
        }

        // 十连保底机制
        if (count >= gacha.guaranteedSR_Pulls && !drawnItems.some(item => ['SR', 'SSR', 'HR', 'UR'].includes(item.rarity))) {
            const pool = allItems.filter(item => item.rarity === 'SR');
            const indexToReplace = drawnItems.findIndex(item => item.rarity === 'N') ?? 0;
            if (pool.length > 0) {
                drawnItems[indexToReplace] = { 
                    ...pool[Math.floor(Math.random() * pool.length)], 
                    timestamp: Date.now() 
                };
            }
        }

        return drawnItems;
    }

    /**
     * 通用的概率显示函数
     */
    function showRates(config, ratesContent, ratesModal) {
        const { rarityConfig, rateUp, itemType } = config;
        ratesContent.innerHTML = '';
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        
        rarityOrder.forEach(rarity => {
            const rarityData = rarityConfig[rarity];
            if (!rarityData) return;
            
            const rateElement = document.createElement('div');
            rateElement.className = 'flex justify-between items-center p-2 bg-gray-100 rounded mb-2';
            rateElement.innerHTML = `
                <span class="font-bold ${rarityData.color}">${rarity}</span>
                <span>${rarityData.p}%</span>
            `;
            ratesContent.appendChild(rateElement);
        });

        const pityInfo = document.createElement('div');
        pityInfo.className = 'mt-4 p-3 bg-blue-50 rounded-lg text-sm';
        pityInfo.innerHTML = `
            <h4 class="font-bold text-blue-800 mb-2">保底机制</h4>
            <p class="text-blue-700">• HR抽卡时，有<span class="font-bold">${rateUp.hrChance * 100}%</span>概率获得UP${itemType}</p>
            <p class="text-blue-700">• 累计<span class="font-bold">${rateUp.pityPulls}</span>次抽卡必定获得UP${itemType}之一</p>
            <p class="text-blue-700">• 十连抽卡必定获得<span class="font-bold">SR</span>及以上${itemType}</p>
        `;
        ratesContent.appendChild(pityInfo);
        
        ratesModal.classList.remove('hidden');
    }

    /**
     * 通用的历史记录渲染函数
     */
    function renderHistory(history, rarityConfig, historyList, historyChartCanvas, existingChart, itemType = '卡片') {
        const rarityCounts = Object.keys(rarityConfig).reduce((acc, r) => ({...acc, [r]: 0}), {});
        history.forEach(item => { if (rarityCounts[item.rarity] !== undefined) rarityCounts[item.rarity]++; });
        
        if (existingChart) {
            existingChart.destroy();
        }
        
        let newChart = null;
        if (historyChartCanvas) {
            newChart = new Chart(historyChartCanvas.getContext('2d'), {
                type: 'bar',
                data: { 
                    labels: Object.keys(rarityCounts), 
                    datasets: [{ 
                        label: `${itemType}抽卡数量`, 
                        data: Object.values(rarityCounts), 
                        backgroundColor: itemType === '角色' ? '#ec4899' : '#4f46e5'
                    }] 
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, 
                    plugins: { legend: { display: false } } 
                }
            });
        }

        if (historyList) {
            historyList.innerHTML = '';
            if (history.length === 0) {
                historyList.innerHTML = `<p class="text-gray-500 text-center">暂无${itemType}抽卡历史。</p>`;
            } else {
                 [...history].reverse().forEach((item, index) => {
                    const rarityData = rarityConfig[item.rarity];
                    const textColorClass = rarityData?.color || 'text-gray-800';
                    const historyItem = document.createElement('div');
                    historyItem.className = 'p-2 bg-white rounded shadow-sm flex justify-between items-center';
                    historyItem.innerHTML = `
                        <div>
                            <span class="font-bold text-gray-500 mr-2">#${history.length - index}</span>
                            <span class="font-bold ${textColorClass}">[${item.rarity}]</span>
                            <span>${item.name}</span>
                        </div>
                        <span class="text-sm text-gray-400">${new Date(item.timestamp || Date.now()).toLocaleString()}</span>
                    `;
                    historyList.appendChild(historyItem);
                });
            }
        }
        return newChart;
    }

    /**
     * 获取分解价值
     */
    function getDismantleValue(rarity, rarityConfig) {
        return rarityConfig[rarity]?.dismantleValue || 0;
    }

    return {
        performGacha,
        showRates,
        renderHistory,
        getDismantleValue
    };
})();