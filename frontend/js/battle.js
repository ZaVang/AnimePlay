// frontend/js/battle.js
window.Game = window.Game || {};

Game.Battle = (function() {

    let _battleState = {};
    let _selectedHandCardIndex = -1;
    
    function _getCardMatchType(card1, card2) {
        if (!card1 || !card2) return "different";
        if (card1.id === card2.id) return "sameCard";
        const tags1 = new Set(card1.synergy_tags || []);
        const tags2 = new Set(card2.synergy_tags || []);
        for (const tag of tags1) {
            if (tags2.has(tag)) return "sameTag";
        }
        return "different";
    }

    function _startBattle() {
        const selectedDeckName = Game.UI.elements.battle.deckSelector.value;
        const playerState = Game.Player.getState();
        const allCards = Game.Player.getAllAnimes();
        const activeDeckIds = playerState.decks[selectedDeckName] || [];

        if (activeDeckIds.length !== 20) {
            alert(`卡组 "${selectedDeckName}" 必须正好有20张卡！`);
            return;
        }
        
        Game.UI.elements.battle.setup.classList.add('hidden');
        Game.UI.elements.battle.arenaContainer.innerHTML = '';
        Game.UI.elements.battle.arenaContainer.classList.remove('hidden');

        _battleState = {
            turn: 1,
            phase: 'player_attack',
            log: [],
            attacker: 'player',
            defender: 'ai',
            player: { prestige: 20, tp: 1, tpLimit: 1, hand: [], deck: [...activeDeckIds].map(id => ({ ...allCards.find(c => c.id === id) })), discard: [] },
            ai: { prestige: 20, tp: 1, tpLimit: 1, hand: [], deck: AI_DECK_GENERATOR.generateDeck(allCards).map(id => ({ ...allCards.find(c => c.id === id) })), discard: [] },
            currentAttack: null,
            lastDefense: null,
        };

        for (let i = 0; i < window.GAME_CONFIG.battle.initialHandSize; i++) {
            _drawCard('player');
            _drawCard('ai');
        }

        _addBattleLog("=== 战斗开始 ===", 'system');
        _addBattleLog("你的回合开始", 'turn');

        _renderBattleUI();
    }
    
    function _addBattleLog(message, type = 'info') {
        _battleState.log.push({ message, type, timestamp: new Date() });
        if (_battleState.log.length > 100) _battleState.log.shift();
    }
    
    function _drawCard(who) {
        const target = _battleState[who];
        if (target.deck.length > 0 && target.hand.length < window.GAME_CONFIG.battle.maxHandSize) {
            const card = target.deck.splice(Math.floor(Math.random() * target.deck.length), 1)[0];
            target.hand.push(card);
        }
    }
    
    function _playerAction(type) {
        if (_selectedHandCardIndex === -1) {
            alert("请先选择一张手牌！");
            return;
        }

        const player = _battleState.player;
        const card = player.hand[_selectedHandCardIndex];
        const action = window.GAME_CONFIG.battle.actions[type];
        
        const totalCost = _battleState.phase === 'player_defend' ? action.cost : card.cost + action.cost;

        if (player.tp < totalCost) {
            alert("TP不足！");
            return;
        }

        player.tp -= totalCost;
        const playedCard = player.hand.splice(_selectedHandCardIndex, 1)[0];
        _selectedHandCardIndex = -1;

        if (_battleState.phase === 'player_attack') {
            _battleState.currentAttack = { attacker: 'player', attackCard: playedCard, attackType: action.name };
            _battleState.phase = 'ai_defend';
            _addBattleLog(`你使用 [${playedCard.name}] 发动了 [${action.name}]！`, 'attack');
            setTimeout(_aiDefenseAction, 1000);
        } else if (_battleState.phase === 'player_defend') {
            const defense = { defender: 'player', defendCard: playedCard, defendType: action.name };
            _battleState.player.discard.push(playedCard);
            _resolveBattle(_battleState.currentAttack, defense);
        }
         _renderBattleUI();
    }

    function _aiAttackAction() {
        const decision = AI_PLAYER.makeDecision(_battleState);
        const ai = _battleState.ai;

        if (decision.action === 'end_turn') {
            _endAiTurn();
            return;
        }

        const action = window.GAME_CONFIG.battle.actions[decision.action];
        const card = decision.card;
        
        ai.tp -= (card.cost + action.cost);
        _battleState.currentAttack = { attacker: 'ai', attackCard: card, attackType: action.name };
        
        const handIndex = ai.hand.findIndex(c => c.id === card.id);
        if(handIndex > -1) ai.hand.splice(handIndex, 1);

        _battleState.phase = 'player_defend';
        _addBattleLog(`AI 使用 [${card.name}] 发动了 [${action.name}]！`, 'attack');
        _renderBattleUI();
    }

    function _aiDefenseAction() {
        const decision = AI_PLAYER.makeDefenseDecision(_battleState);
        const { ai, player } = _battleState;
        const action = window.GAME_CONFIG.battle.actions[decision.action];
        const card = decision.card;

        if (card) {
            ai.tp -= action.cost;
            const handIndex = ai.hand.findIndex(c => c.id === card.id);
            if(handIndex > -1) ai.hand.splice(handIndex, 1);
        }

        const defense = { defender: 'ai', defendCard: card, defendType: action.name };
        _battleState.lastDefense = defense;
        
        if (card) {
            _addBattleLog(`AI 使用 [${card.name}] 进行 [${action.name}]！`, 'defend');
            ai.discard.push(card);
        } else {
            _addBattleLog(`AI 选择了 [${action.name}]（没有出牌）`, 'defend');
        }
        
        _renderBattleUI();
        setTimeout(() => _resolveBattle(_battleState.currentAttack, defense), 1000);
    }
    
    function _resolveBattle(attack, defense) {
        const matchType = _getCardMatchType(attack.attackCard, defense.defendCard);
        const attackTypeKey = attack.attackType === '友好安利' ? 'friendly' : 'harsh';
        const defenseTypeKey = defense.defendType === '赞同' ? 'agree' : 'disagree';
        const result = window.GAME_CONFIG.battle.resultTable[attackTypeKey][matchType][defenseTypeKey];
        
        const attacker = _battleState[attack.attacker];
        const defender = _battleState[defense.defender];

        _showBattleResultBubble(result.log);
        
        let delay = 1000;
        
        setTimeout(() => {
            attacker.prestige += result.prestige[0];
            defender.prestige += result.prestige[1];
            _addBattleLog(result.log, 'result');
            _renderBattleUI();
        }, delay);
        
        delay += 500;
        
        setTimeout(() => {
            attacker.tp += result.tp[0];
            defender.tp += result.tp[1];
            _addBattleLog(`${attack.attacker === 'player' ? '你' : 'AI'} 声望 ${result.prestige[0] >= 0 ? '+' : ''}${result.prestige[0]}, ${defense.defender === 'player' ? '你' : 'AI'} 声望 ${result.prestige[1] >= 0 ? '+' : ''}${result.prestige[1]}`, 'damage');
            _renderBattleUI();
        }, delay);
        
        delay += 500;
        
        setTimeout(() => {
            for(let i=0; i<result.draw[0]; i++) _drawCard(attack.attacker);
            for(let i=0; i<result.draw[1]; i++) _drawCard(defense.defender);
            
            attacker.discard.push(attack.attackCard);
            _battleState.currentAttack = null;
            _battleState.lastDefense = null;
            _renderBattleUI();
        }, delay);
        
        delay += 500;
        
        setTimeout(() => {
            if (attacker.prestige <= 0 || defender.prestige <= 0 || attacker.prestige >= 20 || defender.prestige >= 20) {
                _endBattle();
            } else {
                if (_battleState.attacker === 'player') _battleState.phase = 'player_attack';
                else _endAiTurn();
            }
            _renderBattleUI();
        }, delay);
    }
    
    function _endPlayerTurn() {
        _battleState.turn++;
        _battleState.attacker = 'ai';
        _battleState.defender = 'player';
        _battleState.player.tpLimit++;
        _battleState.ai.tpLimit++;
        _battleState.player.tp = _battleState.player.tpLimit;
        _battleState.ai.tp = _battleState.ai.tpLimit;
        _drawCard('player');
        _drawCard('ai');
        _addBattleLog(`回合 ${_battleState.turn}：AI的回合开始`, 'turn');
        setTimeout(_aiAttackAction, 1000);
    }

    function _endAiTurn() {
        _battleState.attacker = 'player';
        _battleState.defender = 'ai';
        _addBattleLog("你的回合开始", 'turn');
        _battleState.phase = 'player_attack';
        _renderBattleUI();
    }

    function _endBattle() {
        const { player, ai } = _battleState;
        const { victoryPrestige } = window.GAME_CONFIG.battle;
        let resultText = player.prestige > ai.prestige ? '你胜利了！' : '你失败了...';
        if (player.prestige <= 0) resultText = '你失败了...';
        if (ai.prestige <= 0) resultText = '你胜利了！';
        if (player.prestige >= victoryPrestige) resultText = '你胜利了！';
        if (ai.prestige >= victoryPrestige) resultText = '你失败了...';

        const { resultModal, arenaContainer, setup } = Game.UI.elements.battle;
        resultModal.innerHTML = `<div class="bg-white p-8 rounded-lg shadow-xl text-center"><h2 class="text-3xl font-bold mb-4">${resultText}</h2><p>玩家剩余声望: ${player.prestige}</p><p>AI剩余声望: ${ai.prestige}</p><button id="close-battle-result" class="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg mt-4">返回</button></div>`;
        resultModal.classList.remove('hidden');
        document.getElementById('close-battle-result').addEventListener('click', () => {
            resultModal.classList.add('hidden');
            arenaContainer.innerHTML = '';
            setup.classList.remove('hidden');
        });
    }
    
    function _showBattleResultBubble(message, duration = 3000) {
        const battlefield = Game.UI.elements.battle.arenaContainer.querySelector('.bg-black');
        if (!battlefield) return;
        
        const bubble = document.createElement('div');
        bubble.className = 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-black font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-bounce';
        bubble.innerHTML = `<div class="text-lg">${message}</div><div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-yellow-400"></div>`;
        
        battlefield.style.position = 'relative';
        battlefield.appendChild(bubble);
        
        setTimeout(() => bubble.remove(), duration);
    }
    
    function _formatBattleLog(logEntry) {
        if (typeof logEntry === 'string') {
            return `<div class="text-gray-300 py-1">${logEntry}</div>`;
        }
        const { message, type } = logEntry;
        let colorClass = 'text-gray-300', prefix = '';
        switch(type) {
            case 'attack': colorClass = 'text-yellow-400'; prefix = '⚔️ '; break;
            case 'defend': colorClass = 'text-blue-400'; prefix = '🛡️ '; break;
            case 'damage': colorClass = 'text-red-400'; prefix = '💥 '; break;
            case 'heal': colorClass = 'text-green-400'; prefix = '💚 '; break;
            case 'turn': colorClass = 'text-purple-400 font-bold'; prefix = '🔄 '; break;
            case 'result': colorClass = 'text-orange-400 font-bold'; prefix = '📊 '; break;
            case 'system': colorClass = 'text-gray-500 italic'; prefix = 'ℹ️ '; break;
        }
        return `<div class="${colorClass} py-1 border-b border-gray-800">${prefix}${message}</div>`;
    }

    function _createBattleCard(card, context, index = -1) {
        if (!card) return '';
        const { rarityConfig } = window.GAME_CONFIG;
        const rarityColor = rarityConfig[card.rarity]?.c || 'bg-gray-500';
        const isSelected = context === 'player-hand' && index === _selectedHandCardIndex;
        return `
            <div class="battle-card ${context} bg-white rounded-lg shadow-md overflow-hidden cursor-pointer ${isSelected ? 'ring-4 ring-yellow-400 transform scale-110' : ''}" style="width: 5rem;" data-card-index="${index}">
                <div class="relative">
                    <img src="${card.image_path}" class="w-full h-20 object-cover" onerror="this.src='https://placehold.co/80x112/e2e8f0/334155?text=图片丢失';">
                    <div class="absolute top-0 right-0 px-1 py-0.5 text-xs font-bold text-white ${rarityColor} rounded-bl">${card.rarity}</div>
                    <div class="absolute top-0 left-0 bg-black bg-opacity-75 text-white text-xs px-1 py-0.5 rounded-br">Cost: ${card.cost}</div>
                </div>
                <p class="text-xs text-center font-bold p-1 truncate" title="${card.name}">${card.name}</p>
                <p class="text-xs text-center text-gray-600 pb-1">点数: ${card.points}</p>
            </div>
        `;
    }

    function _renderBattleUI() {
        const { player, ai, turn, phase, log, currentAttack } = _battleState;
        const { arenaContainer } = Game.UI.elements.battle;
        const battleConfig = window.GAME_CONFIG.battle;

        let playerStatus = `<span>玩家: ${player.prestige} 声望 | ${player.tp}/${player.tpLimit} TP | ${player.hand.length} 手牌</span>`;
        let aiStatus = `<span>AI: ${ai.prestige} 声望 | ${ai.tp}/${ai.tpLimit} TP | ${ai.hand.length} 手牌</span>`;
        let playerDeckInfo = `<div class="text-xs text-gray-400">卡组: ${player.deck.length} | 弃牌: ${player.discard.length} <button id="view-player-discard" class="ml-2 text-blue-300 hover:underline">查看弃牌</button></div>`;
        let aiDeckInfo = `<div class="text-xs text-gray-400">卡组: ${ai.deck.length} | 弃牌: ${ai.discard.length}</div>`;

        let battlefieldHTML = '';
        if (phase === 'player_defend' && currentAttack) {
            battlefieldHTML = `<div class="flex justify-between items-center w-full"><div class="flex flex-col items-center"><p class="mb-2 text-blue-400">等待你的应对...</p><div class="w-20 h-28 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"><span class="text-gray-500">?</span></div></div><div class="text-2xl">🆚</div><div class="flex flex-col items-center"><p class="mb-2 text-yellow-400">AI 攻击</p>${_createBattleCard(currentAttack.attackCard, 'ai')}</div></div>`;
        } else if (currentAttack && _battleState.attacker === 'player') {
            const defenseCard = _battleState.lastDefense?.defendCard;
            battlefieldHTML = `<div class="flex justify-between items-center w-full"><div class="flex flex-col items-center"><p class="mb-2 text-yellow-400">你的攻击</p>${_createBattleCard(currentAttack.attackCard, 'player')}</div><div class="text-2xl">🆚</div><div class="flex flex-col items-center"><p class="mb-2 text-blue-400">AI 防守</p>${defenseCard ? _createBattleCard(defenseCard, 'ai') : '<div class="w-20 h-28 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"><span class="text-gray-500">等待中...</span></div>'}</div></div>`;
        }

        let playerActionsHTML = '';
        if (phase === 'player_attack') {
            playerActionsHTML = `<h3 class="text-center font-bold mb-2">选择一张手牌和行动</h3><div class="flex justify-center gap-4"><button id="action-friendly" class="p-2 bg-green-600 rounded">${battleConfig.actions.friendly.name}</button><button id="action-harsh" class="p-2 bg-yellow-600 rounded">${battleConfig.actions.harsh.name} (-1 TP)</button><button id="action-end-turn" class="p-2 bg-gray-600 rounded">结束回合</button></div>`;
        } else if (phase === 'player_defend') {
            playerActionsHTML = `<h3 class="text-center font-bold mb-2">选择一张手牌进行应对</h3><div class="flex justify-center gap-4"><button id="action-agree" class="p-2 bg-blue-600 rounded">${battleConfig.actions.agree.name}</button><button id="action-disagree" class="p-2 bg-orange-600 rounded">${battleConfig.actions.disagree.name} (-1 TP)</button></div>`;
        }

        arenaContainer.innerHTML = `
            <div class="p-4 bg-gray-800 text-white rounded-lg">
                <h2 class="text-center font-bold text-xl mb-4">宅理论战 - 回合 ${turn}</h2>
                <div class="p-2 bg-red-900 rounded"><div class="flex justify-between items-center">${aiStatus}<div class="flex gap-1">${Array(ai.hand.length).fill('<div class="w-10 h-14 bg-red-800 rounded"></div>').join('')}</div></div>${aiDeckInfo}</div>
                <div class="my-4 p-4 bg-black min-h-[12rem] flex items-center justify-center">${battlefieldHTML}</div>
                <div class="p-2 bg-blue-900 rounded"><div class="flex justify-between items-center">${playerStatus}</div>${playerDeckInfo}</div>
                <div id="battle-log-new" class="my-2 p-2 bg-black h-40 overflow-y-auto text-sm rounded">${log.slice().reverse().map(l => _formatBattleLog(l)).join('')}</div>
                <div class="mt-4 p-2 bg-gray-900 rounded min-h-[11rem]"><div id="player-hand-cards" class="flex gap-2 justify-center mt-2">${player.hand.map((c, i) => _createBattleCard(c, 'player-hand', i)).join('')}</div></div>
                <div id="player-actions" class="mt-4 p-2 bg-gray-900 rounded">${playerActionsHTML}</div>
            </div>
        `;

        document.querySelectorAll('#player-hand-cards .battle-card').forEach((el) => {
            el.addEventListener('click', () => {
                _selectedHandCardIndex = parseInt(el.dataset.cardIndex);
                _renderBattleUI();
            });
        });

        if (phase === 'player_attack') {
            document.getElementById('action-friendly').addEventListener('click', () => _playerAction('friendly'));
            document.getElementById('action-harsh').addEventListener('click', () => _playerAction('harsh'));
            document.getElementById('action-end-turn').addEventListener('click', _endPlayerTurn);
        } else if (phase === 'player_defend') {
            document.getElementById('action-agree').addEventListener('click', () => _playerAction('agree'));
            document.getElementById('action-disagree').addEventListener('click', () => _playerAction('disagree'));
        }
    }

    return {
        init: function() {
            Game.UI.elements.battle.startBtn.addEventListener('click', _startBattle);
            console.log("Battle module initialized.");
        },
        renderSetup: function() {
            const { deckSelector, startBtn } = Game.UI.elements.battle;
            deckSelector.innerHTML = '';
            let hasValidDeck = false;
            const decks = Game.Player.getState().decks;
            
            Object.keys(decks).forEach(name => {
                const deckSize = decks[name].length;
                if (deckSize === 20) {
                    hasValidDeck = true;
                    const option = document.createElement('option');
                    option.value = name;
                    option.textContent = `${name} (20 cards)`;
                    deckSelector.appendChild(option);
                }
            });
            
            if (!hasValidDeck) {
                deckSelector.innerHTML = '<option value="" disabled selected>没有合法的卡组（需要正好20张卡）</option>';
                startBtn.disabled = true;
                startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                startBtn.disabled = false;
                startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        },
        renderBattleUI: _renderBattleUI, // Expose for internal calls if needed
    };

})();
