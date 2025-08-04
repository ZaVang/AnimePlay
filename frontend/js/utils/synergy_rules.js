// Synergy Rules Engine v2.0
window.SYNERGY_RULES = {

    // --- Rule Definitions ---
    // Each rule has a `type` and an `effect` function.
    // `type: 'deck'` - Evaluated once at the start of the battle.
    // `type: 'field'` - Evaluated every time the board state changes.
    // `type: 'play'` - Evaluated when a card is played (not yet implemented).

    rules: {
        mangaAdaptation: {
            type: 'deck',
            description: "卡组中【漫画改】卡牌达到5/10张时，所有【漫画改】卡牌Cost-1/-2。",
            effect: (battleState) => {
                const mangaCards = battleState.player.deck.map(id => allCards.find(c => c.id === id)).filter(c => c.synergy_tags.includes('漫画改'));
                let costReduction = 0;
                if (mangaCards.length >= 10) {
                    costReduction = 2;
                } else if (mangaCards.length >= 5) {
                    costReduction = 1;
                }

                if (costReduction > 0) {
                    // This is a permanent modification for this battle
                    [...battleState.player.hand, ...battleState.player.deck.map(id => allCards.find(c => c.id === id))].forEach(card => {
                        if (card.synergy_tags.includes('漫画改')) {
                            card.currentCost = Math.max(0, card.cost - costReduction);
                        }
                    });
                    // We need a way to log this! Add to a log array in battleState.
                    battleState.log.push(`羁绊触发：[漫画改] Cost -${costReduction}`);
                }
            }
        },
        novelAdaptation: {
            type: 'deck',
            description: "卡组中【小说改】卡牌达到4张时，战斗开始时看穿对手一张手牌。",
            effect: (battleState) => {
                const novelCardsCount = battleState.player.deck.filter(id => allCards.find(c => c.id === id).synergy_tags.includes('小说改')).length;
                if (novelCardsCount >= 4 && battleState.ai.hand.length > 0) {
                    const revealedIndex = Math.floor(Math.random() * battleState.ai.hand.length);
                    battleState.ai.hand[revealedIndex].isRevealed = true;
                    battleState.log.push("羁绊触发：[小说改] 已看穿一张敌方手牌！");
                }
            }
        },
        mechaPower: {
            type: 'field',
            description: "同一路有2张【机战】卡牌时，该路所有【机战】卡牌点数+15。",
            effect: (playerLanes, opponentLanes, bonuses) => {
                for (let i = 0; i < 3; i++) {
                    const mechaCards = playerLanes[i].filter(c => c.synergy_tags.includes('机战'));
                    if (mechaCards.length >= 2) {
                        mechaCards.forEach(c => {
                            SYNERGY_RULES.addBonus(bonuses, c.id, 15, '机战x2');
                        });
                    }
                }
            }
        },
        sciFiVsFantasy: {
            type: 'field',
            description: "当己方【科幻】与对方【奇幻】同台竞技时，己方点数+20。",
            effect: (playerLanes, opponentLanes, bonuses) => {
                for (let i = 0; i < 3; i++) {
                    const playerHasSciFi = playerLanes[i].some(c => c.synergy_tags.includes('科幻'));
                    const opponentHasFantasy = opponentLanes[i].some(c => c.synergy_tags.includes('奇幻'));
                    if (playerHasSciFi && opponentHasFantasy) {
                        playerLanes[i].forEach(c => {
                            if (c.synergy_tags.includes('科幻')) {
                                SYNERGY_RULES.addBonus(bonuses, c.id, 20, '克制:奇幻');
                            }
                        });
                    }
                    // Reverse check
                    const playerHasFantasy = playerLanes[i].some(c => c.synergy_tags.includes('奇幻'));
                    const opponentHasSciFi = opponentLanes[i].some(c => c.synergy_tags.includes('科幻'));
                    if (playerHasFantasy && opponentHasSciFi) {
                        playerLanes[i].forEach(c => {
                            if (c.synergy_tags.includes('奇幻')) {
                                SYNERGY_RULES.addBonus(bonuses, c.id, 20, '克制:科幻');
                            }
                        });
                    }
                }
            }
        },
        gameAdaptation: {
            type: 'deck',
            description: "卡组中【游戏改】卡牌达到3张时，随机一张点数翻倍，另一张减半。",
            effect: (battleState) => {
                const gameCardsInHand = battleState.player.hand.filter(c => c.synergy_tags.includes('游戏改'));
                if (gameCardsInHand.length >= 2) {
                    const indices = Array.from(Array(gameCardsInHand.length).keys());
                    const buffIndex = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
                    const debuffIndex = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];

                    const buffCard = gameCardsInHand[buffIndex];
                    buffCard.currentPoints = buffCard.points * 2;
                    buffCard.isBuffed = true;

                    const debuffCard = gameCardsInHand[debuffIndex];
                    debuffCard.currentPoints = Math.ceil(debuffCard.points / 2);
                    debuffCard.isDebuffed = true;

                    battleState.log.push(`羁绊触发：[游戏改] ${buffCard.name} 点数翻倍, ${debuffCard.name} 点数减半!`);
                }
            }
        },
        combatChain: {
            type: 'play',
            description: "你每打出一张【战斗】卡牌，下一张【战斗】卡牌点数+5（可叠加）。",
            condition: (playedCard) => {
                return (playedCard.synergy_tags || []).includes('战斗');
            },
            effect: (playedCard, battleState) => {
                const bonus = battleState.combatCombo * 5;
                if (bonus > 0) {
                    SYNERGY_RULES.addBonus(battleState.bonuses, playedCard.id, bonus, `战斗连击x${battleState.combatCombo}`);
                }
                battleState.combatCombo++; // Increment for the next combat card
            },
            reset: (playedCard, battleState) => {
                if (!(playedCard.synergy_tags || []).includes('战斗')) {
                    battleState.combatCombo = 0; // Reset if a non-combat card is played
                }
            }
        },
        romanceAndYuri: {
            type: 'play',
            description: "打出【恋爱】或【百合】牌时，可弃掉另一张【恋爱】/【百合】手牌，使打出的牌点数+50%。",
            condition: (playedCard, playerHand) => {
                const playedTags = playedCard.synergy_tags || [];
                const isPlayable = playedTags.includes('恋爱') || playedTags.includes('百合');
                if (!isPlayable) return false;

                return playerHand.some(cardInHand => 
                    cardInHand.id !== playedCard.id && 
                    ((cardInHand.synergy_tags || []).includes('恋爱') || (cardInHand.synergy_tags || []).includes('百合'))
                );
            },
            effect: (playedCard, playerHand, battleState) => {
                // This will be handled via a confirmation modal in the main app logic
                // The effect here is just to define the bonus
                return { bonus_multiplier: 0.5 };
            }
        }
    },

    // --- Main Calculation Functions ---
    applyDeckSynergies: function(battleState) {
        Object.values(this.rules).forEach(rule => {
            if (rule.type === 'deck') {
                rule.effect(battleState);
            }
        });
    },

    calculateFieldBonuses: function(playerLanes, opponentLanes) {
        let bonuses = {};
        Object.values(this.rules).forEach(rule => {
            if (rule.type === 'field') {
                rule.effect(playerLanes, opponentLanes, bonuses);
            }
        });
        return bonuses;
    },

    // --- Helper ---
    addBonus: function(bonuses, cardId, amount, reason) {
        if (!bonuses[cardId]) {
            bonuses[cardId] = { totalBonus: 0, reasons: [] };
        }
        bonuses[cardId].totalBonus += amount;
        bonuses[cardId].reasons.push(reason);
    }
};