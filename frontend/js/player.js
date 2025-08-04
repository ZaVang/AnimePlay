// frontend/js/player.js
window.Game = window.Game || {};

Game.Player = (function() {

    // --- Private State ---
    let _currentUser = '';

    // Anime system state
    let _animeCollection = new Map();
    let _animeGachaHistory = [];
    let _animePityState = { 
        totalPulls: 0, 
        pullsSinceLastHR: 0 
    };
    
    // Character system state
    let _characterCollection = new Map();
    let _characterGachaHistory = [];
    let _characterPityState = { 
        totalPulls: 0, 
        pullsSinceLastHR: 0
    };
    
    let _playerState = {
        ...window.GAME_CONFIG.playerInitialState,
        exp: 0,
        viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
        savedDecks: {} // 新的炉石风格卡组编辑器数据
    };

    // --- Private Methods ---
    async function _saveState(showAlert = false) {
        if (!_currentUser) return;

        const payload = {
            animeCollection: Array.from(_animeCollection.entries()).map(([id, data]) => [id, data.count]),
            animePity: _animePityState,
            animeHistory: _animeGachaHistory,
            characterCollection: Array.from(_characterCollection.entries()).map(([id, data]) => [id, data.count]),
            characterPity: _characterPityState,
            characterHistory: _characterGachaHistory,
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
                _animeCollection.clear();
                _characterCollection.clear();
                _animePityState = { totalPulls: 0, pullsSinceLastHR: 0 };
                _characterPityState = { totalPulls: 0, pullsSinceLastHR: 0 };
                _animeGachaHistory = [];
                _characterGachaHistory = [];
                _playerState = {
                    ...window.GAME_CONFIG.playerInitialState,
                    exp: 0,
                    viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                    savedDecks: {} // 新用户初始化空的savedDecks
                };
            } else {
                // Load anime collection (just IDs and counts)
                const savedAnimeCollection = data.animeCollection || [];
                _animeCollection.clear();
                savedAnimeCollection.forEach(([id, count]) => {
                    _animeCollection.set(id, { anime: { id, name: 'Loading...' }, count });
                });

                _animePityState = data.animePity || { totalPulls: 0, pullsSinceLastHR: 0 };
                _characterPityState = data.characterPity || { totalPulls: 0, pullsSinceLastHR: 0 };
                _playerState = data.state || { ...window.GAME_CONFIG.playerInitialState };
                _animeGachaHistory = data.animeHistory || [];
                _characterGachaHistory = data.characterHistory || [];
                
                // Load character collection (just IDs and counts)
                const savedCharacterCollection = data.characterCollection || [];
                _characterCollection.clear();
                savedCharacterCollection.forEach(([id, count]) => {
                    _characterCollection.set(id, { character: { id, name: 'Loading...' }, count });
                });
                
                // --- FIX: Make viewing queue length compatible with current config ---
                const configuredSlots = window.GAME_CONFIG.gameplay.viewingQueue.slots;
                let loadedQueue = _playerState.viewingQueue || []; 

                if (loadedQueue.length < configuredSlots) {
                    loadedQueue = loadedQueue.concat(Array(configuredSlots - loadedQueue.length).fill(null));
                } else if (loadedQueue.length > configuredSlots) {
                    loadedQueue = loadedQueue.slice(0, configuredSlots);
                }
                _playerState.viewingQueue = loadedQueue;
                // --- END FIX ---

                _playerState.savedDecks = _playerState.savedDecks || {}; // 确保savedDecks字段存在
            }
        } catch (error) {
            console.error("加载存档失败:", error);
            alert("加载存档失败，将使用初始设置。");
            // Reset to default state on error
            _animeCollection.clear();
            _characterCollection.clear();
            _animePityState = { totalPulls: 0, pullsSinceLastHR: 0 };
            _characterPityState = { totalPulls: 0, pullsSinceLastHR: 0 };
            _animeGachaHistory = [];
            _characterGachaHistory = [];
            _playerState = {
                ...window.GAME_CONFIG.playerInitialState,
                exp: 0,
                viewingQueue: Array(window.GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
                savedDecks: {}
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
        
        // Notify other modules that player has logged in
        document.dispatchEvent(new CustomEvent('playerLoggedIn'));
        
        Game.UI.renderAll();
    }
    
    async function _logout() {
        await _saveState(false);
        _currentUser = '';
        _animeCollection.clear();
        _characterCollection.clear();
        _animeGachaHistory = [];
        _characterGachaHistory = [];
        _animePityState = { totalPulls: 0, pullsSinceLastHR: 0 };
        _characterPityState = { totalPulls: 0, pullsSinceLastHR: 0 };
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
                if (rewards.animeTickets) _playerState.animeGachaTickets += rewards.animeTickets;
                if (rewards.characterTickets) _playerState.characterGachaTickets += rewards.characterTickets;
                if (rewards.knowledge) _playerState.knowledgePoints += rewards.knowledge;
                Game.UI.logMessage(`等级提升至 ${_playerState.level}！获得动画券x${rewards.animeTickets || 0}，角色券x${rewards.characterTickets || 0}，知识点x${rewards.knowledge || 0}。`, 'level-up');
           }
            currentLevel = _playerState.level;
            requiredExp = levelXP[currentLevel] || Infinity;
        }
    }

    // --- Public API ---
    return {
        init: async function() {
            // Login button event listener is now in UI.init
        },
        
        // Getters to expose state safely
        getCurrentUser: () => _currentUser,
        getState: () => _playerState,

        // Anime system getters
        getAnimeCollection: () => _animeCollection,
        getAnimeGachaHistory: () => _animeGachaHistory,
        getAnimePityState: () => _animePityState,
        
        // Character system getters
        getCharacterCollection: () => _characterCollection,
        getCharacterGachaHistory: () => _characterGachaHistory,
        getCharacterPityState: () => _characterPityState,
        
        // Actions
        saveState: _saveState,
        login: _login,
        logout: _logout,
        addExp: _addExp,
        
        addToViewingQueue: function(Id, slotIndex) {
            _playerState.viewingQueue[slotIndex] = { Id, startTime: new Date().toISOString() };
            Game.UI.elements.viewingQueueModal.modal.classList.add('hidden');
            Game.UI.renderViewingQueue();
            _saveState();
        },

        collectFromViewingQueue: function(slotIndex) {
            const slot = _playerState.viewingQueue[slotIndex];
            if (!slot) return;
            
            // Get card data from the AnimeGacha module
            const allAnimes = Game.AnimeGacha.getAllAnimes();
            const anime = allAnimes.find(c => c.id === slot.Id);

            if (!anime) {
                console.error(`番剧 with id ${slot.Id} not found in AnimeGacha`);
                return;
            }

            const rewards = window.GAME_CONFIG.gameplay.viewingQueue.rewards[anime.rarity];
            
            _addExp(rewards.exp);
            _playerState.knowledgePoints += rewards.knowledge;
            Game.UI.logMessage(`《${anime.name}》观看完毕！获得经验x${rewards.exp}，知识点x${rewards.knowledge}。`, 'reward');

            _playerState.viewingQueue[slotIndex] = null;
            Game.UI.renderViewingQueue();
            Game.UI.renderPlayerState();
            _saveState();
        },

        // 卡组编辑器相关方法
        saveDeckToServer: function(deckName, deckData) {
            if (!_playerState.savedDecks) {
                _playerState.savedDecks = {};
            }
            _playerState.savedDecks[deckName] = deckData;
            _saveState();
            console.log(`卡组 "${deckName}" 已保存到服务器`);
        },

        getServerDecks: function() {
            return _playerState.savedDecks || {};
        },

        deleteDeckFromServer: function(deckName) {
            if (_playerState.savedDecks && _playerState.savedDecks[deckName]) {
                delete _playerState.savedDecks[deckName];
                _saveState();
                console.log(`卡组 "${deckName}" 已从服务器删除`);
                return true;
            }
            return false;
        }
    };
})();
