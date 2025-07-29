// frontend/js/player.js
window.Game = window.Game || {};

Game.Player = (function() {

    // --- Private State ---
    let _currentUser = '';
    let _allCards = [];
    let _rateUpCards = [];
    let _playerCollection = new Map();
    let _gachaHistory = [];
    let _pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
    
    let _playerState = {
        ...window.GAME_CONFIG.playerInitialState,
        exp: 0,
        viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
        decks: { '默认卡组': [] },
        activeDeckName: '默认卡组',
    };

    // --- Private Methods ---
    async function _saveState(showAlert = false) {
        if (!_currentUser) return;

        const payload = {
            collection: Array.from(_playerCollection.entries()).map(([id, data]) => [id, data.count]),
            pity: _pityState,
            history: _gachaHistory,
            state: _playerState
        };

        try {
            const response = await fetch('/api/user/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: _currentUser, payload }),
            });
            if (!response.ok) throw new Error(`服务器错误: ${response.statusText}`);
            if (showAlert) alert("存档已成功保存到服务器！");
        } catch (error) {
            console.error("保存失败:", error);
            if (showAlert) alert("存档失败，请检查控制台日志。");
        }
    }

    async function _loadState() {
        if (!_currentUser) return;
        try {
            const response = await fetch(`/api/user/data?username=${_currentUser}`);
            if (!response.ok) throw new Error(`服务器错误: ${response.statusText}`);
            const data = await response.json();

            if (data.isNewUser) {
                _playerCollection.clear();
                _pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
                _gachaHistory = [];
                _playerState = {
                    ...window.GAME_CONFIG.playerInitialState,
                    exp: 0,
                    viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                    decks: { '默认卡组': [] },
                    activeDeckName: '默认卡组',
                };
            } else {
                const savedCollection = data.collection || [];
                _playerCollection.clear();
                savedCollection.forEach(([id, count]) => {
                    const card = _allCards.find(c => c.id === id);
                    if (card) _playerCollection.set(id, { card, count });
                });

                _pityState = data.pity || { totalPulls: 0, pullsSinceLastHR: 0 };
                _playerState = data.state || { ...window.GAME_CONFIG.playerInitialState };
                _gachaHistory = data.history || [];
                
                // --- FIX: Make viewing queue length compatible with current config ---
                const configuredSlots = window.GAME_CONFIG.gameplay.viewingQueue.slots;
                let loadedQueue = _playerState.viewingQueue || []; 

                if (loadedQueue.length < configuredSlots) {
                    // Pad the array with nulls if the save file has fewer slots than the current config
                    loadedQueue = loadedQueue.concat(Array(configuredSlots - loadedQueue.length).fill(null));
                } else if (loadedQueue.length > configuredSlots) {
                    // Truncate the array if the config has fewer slots (less common)
                    loadedQueue = loadedQueue.slice(0, configuredSlots);
                }
                _playerState.viewingQueue = loadedQueue;
                // --- END FIX ---

                _playerState.decks = _playerState.decks && Object.keys(_playerState.decks).length > 0 ? _playerState.decks : { '默认卡组': [] };
                _playerState.activeDeckName = _playerState.activeDeckName || Object.keys(_playerState.decks)[0];
            }
        } catch (error) {
            console.error("加载存档失败:", error);
            alert("加载存档失败，将使用初始设置。");
            // Reset to default state on error
             _playerCollection.clear();
            _pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
            _gachaHistory = [];
            _playerState = {
                ...window.GAME_CONFIG.playerInitialState,
                exp: 0,
                viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                decks: { '默认卡组': [] },
                activeDeckName: '默认卡组',
            };
        }
    }

    async function _login(username) {
        if (!username || !username.match(/^[a-zA-Z0-9]+$/)) {
            alert("用户名只能包含字母和数字。");
            return;
        }
        _currentUser = username;
        Game.UI.showLoggedInUser(_currentUser);
        Game.UI.hideLoginModal();
        await _loadState();
        Game.UI.renderAll();
    }
    
    async function _logout() {
        await _saveState(false);
        _currentUser = '';
        _playerCollection.clear();
        _gachaHistory = [];
        _pityState = { totalPulls: 0, pullsSinceLastHR: 0 };
        _playerState = {
            ...window.GAME_CONFIG.playerInitialState,
            exp: 0,
            viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
            decks: { '默认卡组': [] },
            activeDeckName: '默认卡组',
        };
        Game.UI.showLoginModal();
        Game.UI.renderAll();
    }
    
    function _addExp(amount) {
        _playerState.exp += amount;
        Game.UI.logMessage(`获得了 ${amount} 点经验值。`);
        _checkForLevelUp();
        Game.UI.renderPlayerState();
    }

    function _checkForLevelUp() {
        const { levelXP, levelUpRewards } = window.GAME_CONFIG.gameplay;
        let currentLevel = _playerState.level;
        let requiredExp = levelXP[currentLevel] || Infinity;

        while (_playerState.exp >= requiredExp) {
            _playerState.level++;
            _playerState.exp -= requiredExp;
            const rewards = levelUpRewards[_playerState.level];
            if (rewards) {
                if (rewards.tickets) _playerState.gachaTickets += rewards.tickets;
                if (rewards.knowledge) _playerState.knowledgePoints += rewards.knowledge;
                Game.UI.logMessage(`等级提升至 ${_playerState.level}！获得邂逅券x${rewards.tickets || 0}，知识点x${rewards.knowledge || 0}。`, 'level-up');
           }
            currentLevel = _playerState.level;
            requiredExp = levelXP[currentLevel] || Infinity;
        }
    }


    // --- Public API ---
    return {
        init: async function() {
            try {
                console.log("Player module: fetching all_cards.json...");
                const response = await fetch('../data/anime/all_cards.json?t=' + new Date().getTime());
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                _allCards = await response.json();
                console.log("Player module: Cards loaded:", _allCards.length);

                const { rateUp } = window.GAME_CONFIG;
                _rateUpCards = rateUp.ids.map(id => _allCards.find(c => c.id === id)).filter(Boolean);
                
                Game.UI.elements.loginBtn.addEventListener('click', () => _login(Game.UI.elements.loginInput.value.trim()));
                
            } catch (error) {
                console.error("Critical initialization failed:", error);
                alert(`加载核心数据时发生严重错误: ${error.message}`);
            }
        },
        
        // Getters to expose state safely
        getCurrentUser: () => _currentUser,
        getAllCards: () => _allCards,
        getRateUpCards: () => _rateUpCards,
        getPlayerCollection: () => _playerCollection,
        getGachaHistory: () => _gachaHistory,
        getPityState: () => _pityState,
        getState: () => _playerState,
        
        // Setters for controlled mutation
        setState: (newState) => { _playerState = newState; },
        setPlayerCollection: (newCollection) => { _playerCollection = newCollection; },
        setGachaHistory: (newHistory) => { _gachaHistory = newHistory; },
        setPityState: (newPity) => { _pityState = newPity; },
        
        // Actions
        saveState: _saveState,
        logout: _logout,
        addExp: _addExp,
        
        addToViewingQueue: function(cardId, slotIndex) {
            _playerState.viewingQueue[slotIndex] = { cardId, startTime: new Date().toISOString() };
            Game.UI.elements.viewingQueueModal.modal.classList.add('hidden');
            Game.UI.renderViewingQueue();
            _saveState();
        },

        collectFromViewingQueue: function(slotIndex) {
            const slot = _playerState.viewingQueue[slotIndex];
            if (!slot) return;

            const card = _allCards.find(c => c.id === slot.cardId);
            const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[card.rarity];
            
            _addExp(rewards.exp);
            _playerState.knowledgePoints += rewards.knowledge;
            Game.UI.logMessage(`《${card.name}》观看完毕！获得经验x${rewards.exp}，知识点x${rewards.knowledge}。`, 'reward');

            _playerState.viewingQueue[slotIndex] = null;
            Game.UI.renderViewingQueue();
            Game.UI.renderPlayerState();
            _saveState();
        }
    };
})();
