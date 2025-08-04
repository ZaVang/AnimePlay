// frontend/js/collections/collection_module.js
window.Game = window.Game || {};

// 通用收藏模块工厂函数 - 支持炉石风格的收藏+组卡界面
Game.CollectionModule = function(config) {
    let filters = {};
    let currentDeckCards = { anime: [], character: [] };
    let currentDeckName = '新卡组';
    let isDeckMode = false; // 是否处于组卡模式

    // 从配置中提取必要信息
    const {
        type,                    // 'anime' | 'character'
        itemType,               // '动画' | '角色'
        itemKey,                // 'anime' | 'character'
        configKey,              // 'animeSystem' | 'characterSystem'
        playerMethods,          // 玩家相关方法
        cardElementCreator,     // 卡片元素创建函数
        detailModalHandler,     // 详情弹窗处理函数
        colors = {              // 主题颜色
            primary: 'indigo',
            secondary: 'blue'
        },
        maxDeckSize = 20,       // 该类型卡片在卡组中的最大数量
        filterFields = []       // 支持的筛选字段
    } = config;

    // 初始化筛选器
    filterFields.forEach(field => {
        filters[field] = '';
    });

    // 获取所有可用卡片
    function _getAllItems() {
        const playerCollection = playerMethods.getCollection();
        return Array.from(playerCollection.values()).filter(data => {
            const item = data[itemKey];
            return item && item.name && item.name !== 'Loading...';
        });
    }

    // 应用筛选器
    function _applyFilters(items) {
        return items.filter(data => {
            const item = data[itemKey];
            
            // 名称筛选
            if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) {
                return false;
            }
            
            // 稀有度筛选
            if (filters.rarity && item.rarity !== filters.rarity) {
                return false;
            }
            
            // 标签筛选（仅动画）
            if (filters.tag && type === 'anime') {
                if (!item.synergy_tags || !item.synergy_tags.includes(filters.tag)) {
                    return false;
                }
            }
            
            // 性别筛选（仅角色）
            if (filters.gender && type === 'character') {
                if (item.gender !== filters.gender) {
                    return false;
                }
            }
            
            return true;
        });
    }

    // 排序卡片
    function _sortItems(items) {
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        return items.sort((a, b) => {
            const itemA = a[itemKey];
            const itemB = b[itemKey];
            const rarityA = rarityOrder.indexOf(itemA.rarity);
            const rarityB = rarityOrder.indexOf(itemB.rarity);
            if (rarityA !== rarityB) return rarityA - rarityB;
            return itemA.name.localeCompare(itemB.name);
        });
    }

    // 渲染收藏区域
    function _renderCollection(containerElement) {
        if (!containerElement) return;

        const allItems = _getAllItems();
        const filteredItems = _applyFilters(allItems);
        const sortedItems = _sortItems(filteredItems);

        containerElement.innerHTML = '';
        
        if (sortedItems.length === 0) {
            containerElement.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">暂无${itemType}收藏</p>
                    <p class="text-gray-400 text-sm mt-2">去抽卡获得你的第一张${itemType}卡片吧！</p>
                </div>
            `;
            return;
        }

        sortedItems.forEach(itemData => {
            const itemElement = cardElementCreator(itemData, `${type}-collection-deck`);
            
            // 检查是否已在当前卡组中
            const isInDeck = currentDeckCards[type].some(deckCard => deckCard.id === itemData[itemKey].id);
            
            if (isDeckMode) {
                if (isInDeck) {
                    // 在卡组中的卡片显示为已选中状态
                    itemElement.classList.add('opacity-50', 'ring-2', 'ring-green-500');
                    itemElement.title = '已在卡组中';
                } else {
                    // 可添加到卡组的卡片
                    itemElement.classList.add('cursor-pointer', 'hover:ring-2', 'hover:ring-blue-500');
                    itemElement.title = '左键添加到卡组，右键查看详情';
                }

                // 左键添加到卡组
                itemElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (!isInDeck) {
                        _addToDeck(itemData);
                    }
                });
            } else {
                // 纯收藏模式，只能查看详情
                itemElement.classList.add('cursor-pointer');
                itemElement.title = '点击查看详情';
                itemElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    _showDetailWithDismantle(itemData);
                });
            }

            // 右键查看详情（组卡模式下）
            if (isDeckMode) {
                itemElement.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    _showDetailWithDismantle(itemData);
                });
            }

            containerElement.appendChild(itemElement);
        });
    }

    // 添加卡片到卡组
    function _addToDeck(itemData) {
        const currentTypeCards = currentDeckCards[type];
        
        // 检查数量限制
        if (currentTypeCards.length >= maxDeckSize) {
            alert(`${itemType}卡片已达上限（${maxDeckSize}张）！`);
            return;
        }

        // 检查是否已存在
        if (currentTypeCards.some(card => card[itemKey].id === itemData[itemKey].id)) {
            return;
        }

        // 添加到卡组
        currentTypeCards.push({
            id: itemData[itemKey].id,
            [itemKey]: itemData[itemKey],
            count: itemData.count
        });

        // 通知外部deck系统
        if (window.Game && window.Game.Deck && window.Game.Deck.addToDeck) {
            window.Game.Deck.addToDeck(type, itemData);
        }
        
        // 触发卡组更新事件
        document.dispatchEvent(new CustomEvent('deckUpdated', {
            detail: { type, deckCards: currentDeckCards }
        }));
    }

    // 从卡组移除卡片
    function _removeFromDeck(itemId) {
        const currentTypeCards = currentDeckCards[type];
        const index = currentTypeCards.findIndex(card => card.id === itemId);
        
        if (index > -1) {
            currentTypeCards.splice(index, 1);
            _render();
            
            // 触发卡组更新事件
            document.dispatchEvent(new CustomEvent('deckUpdated', {
                detail: { type, deckCards: currentDeckCards }
            }));
        }
    }

    // 渲染卡组区域
    function _renderDeck(containerElement) {
        if (!containerElement || !isDeckMode) return;

        const deckCards = currentDeckCards[type];
        containerElement.innerHTML = '';

        // 卡组标题和统计
        const headerDiv = document.createElement('div');
        headerDiv.className = 'mb-4 text-center';
        headerDiv.innerHTML = `
            <h3 class="text-lg font-bold text-${colors.primary}-600 mb-2">${itemType}卡组</h3>
            <p class="text-sm text-gray-600">${deckCards.length}/${maxDeckSize}张</p>
        `;
        containerElement.appendChild(headerDiv);

        if (deckCards.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center py-8 text-gray-400';
            emptyDiv.innerHTML = `
                <p class="text-sm">暂无${itemType}卡片</p>
                <p class="text-xs mt-1">从左侧添加卡片</p>
            `;
            containerElement.appendChild(emptyDiv);
            return;
        }

        // 渲染卡组中的卡片
        const deckGrid = document.createElement('div');
        deckGrid.className = 'grid grid-cols-5 gap-2';
        
        deckCards.forEach((cardData, index) => {
            const cardElement = cardElementCreator(cardData, `${type}-deck-view`);
            cardElement.classList.add('cursor-pointer', 'hover:ring-2', 'hover:ring-red-500');
            cardElement.title = '点击移出卡组';
            
            // 添加卡组位置标识
            if (index === 0) {
                const coverBadge = document.createElement('div');
                coverBadge.className = 'absolute top-0 left-0 bg-yellow-500 text-white text-xs px-1 rounded-br';
                coverBadge.textContent = '封面';
                cardElement.querySelector('.relative').appendChild(coverBadge);
            }

            // 点击移出卡组
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                _removeFromDeck(cardData.id);
            });

            deckGrid.appendChild(cardElement);
        });

        containerElement.appendChild(deckGrid);
    }

    // 渲染统计信息
    function _renderStats(containerElement) {
        if (!containerElement) return;

        const allItems = _getAllItems();
        const totalItems = allItems.length;
        const totalCount = allItems.reduce((sum, data) => sum + data.count, 0);

        // 获取所有可能的卡片数量来计算完成率
        let allPossibleItems = [];
        let completionRate = '0.0';
        
        try {
            if (type === 'anime') {
                allPossibleItems = Game.AnimeGacha?.getAllAnimes() || [];
            } else if (type === 'character') {
                allPossibleItems = Game.CharacterGacha?.getAllCharacters() || [];
            }
            completionRate = allPossibleItems.length > 0 ? ((totalItems / allPossibleItems.length) * 100).toFixed(1) : '0.0';
        } catch (error) {
            console.warn('Failed to get all possible items for completion rate:', error);
        }

        // 稀有度统计
        const rarityStats = {};
        allItems.forEach(data => {
            const rarity = data[itemKey].rarity;
            rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        const rarityStatsHtml = rarityOrder.map(rarity => {
            const count = rarityStats[rarity] || 0;
            const rarityConfig = window.GAME_CONFIG[configKey].rarityConfig[rarity];
            const colorClass = rarityConfig?.color || 'text-gray-500';
            return `<span class="${colorClass} font-bold">${rarity}: ${count}</span>`;
        }).join(' | ');

        // 性别统计（仅角色）
        let genderStatsHtml = '';
        if (type === 'character') {
            const genderStats = {};
            allItems.forEach(data => {
                const gender = data[itemKey].gender || 'unknown';
                genderStats[gender] = (genderStats[gender] || 0) + 1;
            });

            genderStatsHtml = Object.entries(genderStats).map(([gender, count]) => {
                let genderText = '未知';
                if (gender === '男' || gender === 'male') genderText = '男性';
                else if (gender === '女' || gender === 'female') genderText = '女性';
                return `${genderText}: ${count}`;
            }).join(' | ');
        }

        // 动态列数布局
        const gridCols = type === 'character' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3';

        containerElement.innerHTML = `
            <div class="bg-gradient-to-r from-${colors.primary}-50 to-${colors.secondary}-50 p-4 rounded-lg border">
                <h3 class="text-lg font-semibold mb-3 text-${colors.primary}-800">${itemType}收藏统计</h3>
                <div class="grid ${gridCols} gap-4 text-center text-sm">
                    <div>
                        <p class="text-gray-600">独特${itemType}</p>
                        <p class="text-2xl font-bold text-${colors.primary}-600">${totalItems}/${allPossibleItems.length}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">总数量</p>
                        <p class="text-2xl font-bold text-${colors.primary}-600">${totalCount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">完成率</p>
                        <p class="text-2xl font-bold text-${colors.secondary}-600">${completionRate}%</p>
                    </div>                
                </div>
                <div class="mt-4 text-center text-sm space-y-2">
                    <p class="text-gray-600">稀有度分布: ${rarityStatsHtml}</p>
                    ${type === 'character' && genderStatsHtml ? `<p class="text-gray-600">性别分布: ${genderStatsHtml}</p>` : ''}
                </div>
            </div>
        `;
    }

    // 主渲染函数
    function _render() {
        // 由具体实现来处理渲染
        document.dispatchEvent(new CustomEvent(`${type}CollectionRender`));
        
        // 同时触发统计信息更新
        const statsContainer = document.getElementById('deck-collection-stats');
        if (statsContainer) {
            _renderStats(statsContainer);
        }
    }

    // 显示带分解功能的详情弹窗
    function _showDetailWithDismantle(itemData) {
        // 首先调用原来的详情处理函数
        detailModalHandler(itemData);
        
        // 然后添加分解功能（如果有多张）
        const count = itemData.count;
        if (count > 1) {
            const gachaModule = type === 'anime' ? Game.AnimeGacha : Game.CharacterGacha;
            const dismantleValue = gachaModule.getDismantleValue(itemData[itemKey].rarity);
            
            // 找到详情弹窗内容区域
            const modalId = type === 'anime' ? 'anime-detail-modal' : 'character-detail-modal';
            const modal = document.getElementById(modalId);
            if (!modal) return;
            
            const contentArea = modal.querySelector(`#${type}-detail-content`);
            if (!contentArea) return;
            
            // 查找或创建分解区域
            let dismantleSection = contentArea.querySelector(`#${type}-dismantle-section`);
            if (!dismantleSection) {
                dismantleSection = document.createElement('div');
                dismantleSection.id = `${type}-dismantle-section`;
                dismantleSection.className = 'mt-6';
                contentArea.appendChild(dismantleSection);
            }
            
            dismantleSection.innerHTML = `
                <div class="border-t pt-4">
                    <h3 class="font-bold mb-2">分解${itemType}卡</h3>
                    <p class="text-sm text-gray-600 mb-3">分解一张多余的${itemType}卡可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                    <button id="${type}-dismantle-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">分解一张</button>
                </div>
            `;
            
            // 绑定分解按钮事件
            const dismantleBtn = dismantleSection.querySelector(`#${type}-dismantle-btn`);
            if (dismantleBtn) {
                dismantleBtn.addEventListener('click', () => {
                    _dismantleItem(itemData[itemKey].id);
                    modal.classList.add('hidden');
                });
            }
        }
    }

    // 分解单张卡片
    function _dismantleItem(itemId) {
        const playerCollection = playerMethods.getCollection();
        const playerState = Game.Player.getState();
        
        if (!playerCollection.has(itemId)) return;
        
        const itemData = playerCollection.get(itemId);
        if (itemData.count > 1) {
            itemData.count--;
            const gachaModule = type === 'anime' ? Game.AnimeGacha : Game.CharacterGacha;
            const dismantleValue = gachaModule.getDismantleValue(itemData[itemKey].rarity);
            playerState.knowledgePoints += dismantleValue;
            
            Game.UI.logMessage(`分解了 ${itemData[itemKey].name}，获得 ${dismantleValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _render();
        }
    }

    // 批量分解重复卡片
    function _dismantleAllDuplicates() {
        const playerCollection = playerMethods.getCollection();
        const playerState = Game.Player.getState();
        let totalValue = 0;
        let dismantledCount = 0;

        const gachaModule = type === 'anime' ? Game.AnimeGacha : Game.CharacterGacha;

        playerCollection.forEach((itemData, itemId) => {
            if (itemData.count > 1 && itemData[itemKey]) {
                const duplicates = itemData.count - 1;
                const dismantleValue = gachaModule.getDismantleValue(itemData[itemKey].rarity) * duplicates;
                totalValue += dismantleValue;
                dismantledCount += duplicates;
                itemData.count = 1;
            }
        });

        if (totalValue > 0) {
            playerState.knowledgePoints += totalValue;
            Game.UI.logMessage(`一键分解了 ${dismantledCount} 张重复${itemType}卡，获得 ${totalValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _render();
        } else {
            Game.UI.logMessage(`没有重复的${itemType}卡可以分解。`, 'info');
        }
    }

    // 公共接口
    return {
        // 设置筛选器
        setFilter: function(field, value) {
            if (filters.hasOwnProperty(field)) {
                filters[field] = value;
                _render();
            }
        },

        // 渲染方法
        renderCollection: _renderCollection,
        renderDeck: _renderDeck,
        renderStats: _renderStats,

        // 卡组操作
        setDeckMode: function(enabled) {
            isDeckMode = enabled;
            _render();
        },

        getDeckCards: function() {
            return currentDeckCards[type];
        },

        setDeckCards: function(cards) {
            currentDeckCards[type] = cards || [];
            _render();
        },

        setDeckName: function(name) {
            currentDeckName = name;
        },

        getDeckName: function() {
            return currentDeckName;
        },

        // 工具方法
        dismantleItem: _dismantleItem,
        dismantleAllDuplicates: _dismantleAllDuplicates,
        getAllItems: _getAllItems,

        // 事件处理
        handleFilterChange: function(field, value) {
            this.setFilter(field, value);
        }
    };
};