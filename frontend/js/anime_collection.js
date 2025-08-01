// frontend/js/anime_collection.js
window.Game = window.Game || {};

/**
 * 动画收藏系统
 * 管理动画收藏的展示、筛选和操作
 */
Game.AnimeCollection = (function() {
    
    let currentFilters = {
        name: '',
        rarity: '',
        tag: ''
    };

    // 渲染动画收藏视图
    function _renderCollection() {
        const animeCollectionContainer = document.getElementById('anime-collection-view');
        if (!animeCollectionContainer) return;

        const playerCollection = Game.Player.getPlayerCollection();
        const allAnimes = Array.from(playerCollection.values());
        
        // 应用筛选器
        const filteredAnimes = allAnimes.filter(animeData => {
            const anime = animeData.card;
            
            // 名称筛选
            if (currentFilters.name && !anime.name.toLowerCase().includes(currentFilters.name.toLowerCase())) {
                return false;
            }
            
            // 稀有度筛选
            if (currentFilters.rarity && anime.rarity !== currentFilters.rarity) {
                return false;
            }
            
            // 标签筛选
            if (currentFilters.tag && (!anime.synergy_tags || !anime.synergy_tags.includes(currentFilters.tag))) {
                return false;
            }
            
            return true;
        });

        // 按稀有度排序，然后按名称排序
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        filteredAnimes.sort((a, b) => {
            const rarityDiff = rarityOrder.indexOf(a.card.rarity) - rarityOrder.indexOf(b.card.rarity);
            if (rarityDiff !== 0) return rarityDiff;
            return a.card.name.localeCompare(b.card.name);
        });

        // 渲染收藏
        animeCollectionContainer.innerHTML = '';
        
        if (filteredAnimes.length === 0) {
            animeCollectionContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-gray-400 mb-4">
                        <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-lg font-medium">暂无动画收藏</p>
                    <p class="text-gray-400 text-sm mt-2">去抽卡获得你的第一张动画卡片吧！</p>
                </div>
            `;
        } else {
            filteredAnimes.forEach(animeData => {
                const animeElement = Game.UI.createCardElement(animeData, 'anime-collection');
                
                // 添加收藏特有的点击事件
                animeElement.addEventListener('click', () => _showAnimeDetail(animeData));
                
                animeCollectionContainer.appendChild(animeElement);
            });
        }

        // 更新统计信息
        _updateCollectionStats(allAnimes, filteredAnimes);
    }

    // 更新收藏统计信息
    function _updateCollectionStats(allAnimes, filteredAnimes) {
        const statsContainer = document.getElementById('anime-collection-stats');
        if (!statsContainer) return;

        const totalAnimes = allAnimes.length;
        const totalCount = allAnimes.reduce((sum, animeData) => sum + animeData.count, 0);
        const shownCount = filteredAnimes.length;

        // 稀有度统计
        const rarityStats = {};
        allAnimes.forEach(animeData => {
            const rarity = animeData.card.rarity;
            rarityStats[rarity] = (rarityStats[rarity] || 0) + 1;
        });

        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        const rarityStatsHtml = rarityOrder.map(rarity => {
            const count = rarityStats[rarity] || 0;
            const rarityConfig = window.GAME_CONFIG.rarityConfig[rarity];
            const colorClass = rarityConfig?.color || 'text-gray-500';
            return `<span class="${colorClass} font-bold">${rarity}: ${count}</span>`;
        }).join(' | ');

        statsContainer.innerHTML = `
            <div class="bg-white p-4 rounded-lg shadow-sm mb-6">
                <h3 class="text-lg font-semibold mb-3">收藏统计</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                    <div>
                        <p class="text-gray-600">独特动画</p>
                        <p class="text-2xl font-bold text-indigo-600">${totalAnimes}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">总数量</p>
                        <p class="text-2xl font-bold text-indigo-600">${totalCount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">当前显示</p>
                        <p class="text-2xl font-bold text-gray-600">${shownCount}</p>
                    </div>
                    <div>
                        <p class="text-gray-600">收藏完成度</p>
                        <p class="text-2xl font-bold text-green-600">${((totalAnimes / Game.Player.getAllCards().length) * 100).toFixed(1)}%</p>
                    </div>
                </div>
                <div class="mt-4 text-center text-sm">
                    <p class="text-gray-600">稀有度分布: ${rarityStatsHtml}</p>
                </div>
            </div>
        `;
    }

    // 显示动画详情
    function _showAnimeDetail(animeData) {
        const { card, count } = animeData;
        const modal = document.getElementById('anime-detail-modal');
        const content = document.getElementById('anime-detail-content');
        
        if (!modal || !content) return;

        const { rarityConfig } = window.GAME_CONFIG;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        
        const detailHtml = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="md:w-1/3 flex-shrink-0">
                    <img src="${card.image_path}" class="w-full aspect-[3/2] object-cover rounded-lg shadow-lg" onerror="this.src='https://placehold.co/300x200/e2e8f0/334155?text=图片丢失';">
                </div>
                <div class="md:w-2/3">
                    <h2 class="text-3xl font-bold mb-3">${card.name}</h2>
                    <div class="flex items-center gap-4 mb-4">
                        <span class="px-3 py-1 text-sm font-bold text-white ${rarityColor.includes('from') ? 'bg-gradient-to-r' : ''} ${rarityColor} rounded-full">${card.rarity}</span>
                        <span class="text-lg font-semibold text-gray-700">拥有数量: <span class="font-bold text-indigo-600">${count}</span></span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-sm text-gray-600">点数</p>
                            <p class="text-xl font-bold text-indigo-600">${card.points}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Cost</p>
                            <p class="text-xl font-bold text-indigo-600">${card.cost}</p>
                        </div>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-4 mb-4">
                        <h3 class="font-bold text-gray-800 mb-2">Bangumi 数据</h3>
                        <div class="grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                                <p class="font-semibold text-gray-600">评分</p>
                                <p class="font-bold text-xl text-amber-600">${card.rating_score || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-600">排名</p>
                                <p class="font-bold text-xl text-amber-600">#${card.rating_rank || 'N/A'}</p>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-600">评价人数</p>
                                <p class="font-bold text-xl text-amber-600">${(card.rating_total || 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <p class="text-gray-600 mb-4">${card.description}</p>
                    <div class="mb-4">
                        <h3 class="font-bold mb-2">羁绊标签:</h3>
                        <div class="flex flex-wrap gap-2">
                            ${(card.synergy_tags || []).map(tag => `<span class="bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded-full">${tag}</span>`).join('') || '<span class="text-gray-500 text-sm">无</span>'}
                        </div>
                    </div>
                    <div id="anime-dismantle-section" class="mt-6"></div>
                </div>
            </div>
        `;

        content.innerHTML = detailHtml;

        // 添加分解功能（如果有多张）
        if (count > 1) {
            const dismantleValue = Game.AnimeGacha.getDismantleValue(card.rarity);
            const dismantleSection = content.querySelector('#anime-dismantle-section');
            dismantleSection.innerHTML = `
                <div class="border-t pt-4">
                    <h3 class="font-bold mb-2">分解动画卡</h3>
                    <p class="text-sm text-gray-600 mb-3">分解一张多余的动画卡可获得 <span class="font-bold text-emerald-600">${dismantleValue}</span> 知识点。</p>
                    <button id="anime-dismantle-btn" class="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">分解一张</button>
                </div>
            `;
            dismantleSection.querySelector('#anime-dismantle-btn').addEventListener('click', () => {
                _dismantleAnime(card.id);
                modal.classList.add('hidden');
            });
        }

        modal.classList.remove('hidden');
    }

    // 分解动画卡
    function _dismantleAnime(cardId) {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        
        if (!playerCollection.has(cardId)) return;
        
        const cardData = playerCollection.get(cardId);
        if (cardData.count > 1) {
            cardData.count--;
            const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity);
            playerState.knowledgePoints += dismantleValue;
            
            Game.UI.logMessage(`分解了 ${cardData.card.name}，获得 ${dismantleValue} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCollection();
        }
    }

    // 批量分解多余动画卡
    function _dismantleAllDuplicates() {
        const playerCollection = Game.Player.getPlayerCollection();
        const playerState = Game.Player.getState();
        let totalKnowledge = 0;
        let dismantledCount = 0;

        playerCollection.forEach((cardData, cardId) => {
            if (cardData.count > 1) {
                const excessCount = cardData.count - 1;
                const dismantleValue = Game.AnimeGacha.getDismantleValue(cardData.card.rarity);
                const totalValue = dismantleValue * excessCount;
                
                totalKnowledge += totalValue;
                dismantledCount += excessCount;
                cardData.count = 1;
            }
        });

        if (totalKnowledge > 0) {
            playerState.knowledgePoints += totalKnowledge;
            Game.UI.logMessage(`批量分解了 ${dismantledCount} 张动画卡，获得 ${totalKnowledge} 知识点。`, 'reward');
            Game.Player.saveState();
            Game.UI.renderPlayerState();
            _renderCollection();
        } else {
            alert('没有可分解的多余动画卡！');
        }
    }

    // 设置筛选器
    function _setFilters(filters) {
        currentFilters = { ...currentFilters, ...filters };
        _renderCollection();
    }

    // 初始化筛选器选项
    function _populateFilters() {
        const nameFilter = document.getElementById('anime-filter-name');
        const rarityFilter = document.getElementById('anime-filter-rarity');
        const tagFilter = document.getElementById('anime-filter-tag');

        if (!nameFilter || !rarityFilter || !tagFilter) return;

        // 稀有度筛选器
        const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
        rarityFilter.innerHTML = '<option value="">所有稀有度</option>';
        rarityOrder.forEach(rarity => {
            const option = document.createElement('option');
            option.value = rarity;
            option.textContent = rarity;
            rarityFilter.appendChild(option);
        });

        // 标签筛选器
        const allCards = Game.Player.getAllCards();
        const allTags = new Set();
        allCards.forEach(card => {
            if (card.synergy_tags) {
                card.synergy_tags.forEach(tag => allTags.add(tag));
            }
        });
        
        tagFilter.innerHTML = '<option value="">所有标签</option>';
        Array.from(allTags).sort().forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            tagFilter.appendChild(option);
        });

        // 绑定事件
        nameFilter.addEventListener('input', (e) => _setFilters({ name: e.target.value }));
        rarityFilter.addEventListener('change', (e) => _setFilters({ rarity: e.target.value }));
        tagFilter.addEventListener('change', (e) => _setFilters({ tag: e.target.value }));
    }

    return {
        renderUI: function() {
            _populateFilters();
            _renderCollection();
        },
        
        dismantleAllDuplicates: _dismantleAllDuplicates,
        
        init: function() {
            // 绑定批量分解按钮
            const dismantleAllBtn = document.getElementById('anime-dismantle-all-btn');
            if (dismantleAllBtn) {
                dismantleAllBtn.addEventListener('click', _dismantleAllDuplicates);
            }

            // 绑定详情模态框关闭按钮
            const closeDetailBtn = document.getElementById('close-anime-detail-modal');
            if (closeDetailBtn) {
                closeDetailBtn.addEventListener('click', () => {
                    document.getElementById('anime-detail-modal').classList.add('hidden');
                });
            }

            console.log("Anime Collection system initialized.");
        }
    };
})();