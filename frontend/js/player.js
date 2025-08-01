// frontend/js/player.js
window.Game = window.Game || {};

Game.Player = (function() {

    // --- Private State ---
    let _currentUser = '';
    let _allCards = [];
    let _rateUpCards = [];

    // Anime system state
    let _animeCollection = new Map();
    let _animeGachaHistory = [];
    let _animePityState = { 
        totalPulls: 0, 
        pullsSinceLastHR: 0 
    };
    
    // Character system state (unified with anime system)
    let _characterCollection = new Map();
    let _characterGachaHistory = [];
    let _characterPityState = { 
        totalPulls: 0, 
        pullsSinceLastHR: 0  // Unified with anime system
    };
    
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
                    decks: { '默认卡组': [] },
                    activeDeckName: '默认卡组',
                };
            } else {
                const savedCollection = data.animeCollection || [];
                _animeCollection.clear();
                savedCollection.forEach(([id, count]) => {
                    const card = _allCards.find(c => c.id === id);
                    if (card) _animeCollection.set(id, { card, count });
                });

                _animePityState = data.animePity || { totalPulls: 0, pullsSinceLastHR: 0 };
                _characterPityState = data.characterPity || { totalPulls: 0, pullsSinceLastHR: 0 };
                _playerState = data.state || { ...window.GAME_CONFIG.playerInitialState };
                _animeGachaHistory = data.animeHistory || [];
                _characterGachaHistory = data.characterHistory || [];
                
                // Load character collection (characters won't exist in _allCards, handled separately)  
                const savedCharacterCollection = data.characterCollection || [];
                _characterCollection.clear();
                savedCharacterCollection.forEach(([id, count]) => {
                    // Characters will be loaded by CharacterGacha module, just store the structure for now
                    _characterCollection.set(id, { character: { id, name: 'Loading...' }, count });
                });
                
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
            _animeCollection.clear();
            _characterCollection.clear();
            _animePityState = { totalPulls: 0, pullsSinceLastHR: 0 };
            _characterPityState = { totalPulls: 0, pullsSinceLastLegendary: 0, pullsSinceLastMasterpiece: 0 };
            _animeGachaHistory = [];
            _characterGachaHistory = [];
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
        
        // Trigger character data update if character system is ready
        if (Game.CharacterGacha && Game.CharacterGacha.isInitialized()) {
            // Force update character collection with proper data
            document.dispatchEvent(new CustomEvent('playerLoggedIn'));
        }
        
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
        _characterPityState = { totalPulls: 0, pullsSinceLastLegendary: 0, pullsSinceLastMasterpiece: 0 };
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
                Game.UI.logMessage(`等级提升至 ${_playerState.level}！获得动画券x${rewards.tickets || 0}，角色券x${rewards.characterTickets || 0}，知识点x${rewards.knowledge || 0}。`, 'level-up');
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

                const { rateUp } = window.GAME_CONFIG.animeSystem;
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
        getState: () => _playerState,

        // Anime system getters
        getAnimeCollection: () => _animeCollection,
        getAnimeGachaHistory: () => _animeGachaHistory,
        getAnimePityState: () => _animePityState,
        
        // Character system getters
        getCharacterCollection: () => _characterCollection,
        getCharacterGachaHistory: () => _characterGachaHistory,
        getCharacterPityState: () => _characterPityState,
        
        // Setters for controlled mutation
        setState: (newState) => { _playerState = newState; },
        setAnimeCollection: (newCollection) => { _animeCollection = newCollection; },
        setAnimeGachaHistory: (newHistory) => { _animeGachaHistory = newHistory; },
        setAnimePityState: (newPity) => { _animePityState = newPity; },
        
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
