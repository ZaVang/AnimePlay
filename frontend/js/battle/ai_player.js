
window.AI_PLAYER = {
    makeDecision: function(battleState) {
        const strategies = ['aggressive', 'conservative', 'balanced'];
        const chosenStrategy = strategies[Math.floor(Math.random() * strategies.length)];

        switch (chosenStrategy) {
            case 'aggressive':
                return this.playAggressive(battleState);
            case 'conservative':
                return this.playConservative(battleState);
            case 'balanced':
            default:
                return this.playBalanced(battleState);
        }
    },

    playAggressive: function(battleState) {
        const { ai, player } = battleState;
        // Always try to use "Harsh Comment" if possible
        const harshAction = window.GAME_CONFIG.battle.actions.harsh;
        const affordableCards = ai.hand.filter(c => ai.tp >= c.cost + harshAction.cost);

        if (affordableCards.length > 0) {
            const cardToPlay = affordableCards.sort((a, b) => b.points - a.points)[0]; // Use highest point card
            return { action: 'harsh', card: cardToPlay };
        }
        return { action: 'end_turn' }; // Cannot do anything
    },

    playConservative: function(battleState) {
        const { ai, player } = battleState;
        // Prefer "Friendly Recommendation" and save TP
        const friendlyAction = window.GAME_CONFIG.battle.actions.friendly;
        const affordableCards = ai.hand.filter(c => ai.tp >= c.cost + friendlyAction.cost);

        if (affordableCards.length > 0 && player.prestige < 25) { // Only attack if player is not close to winning
            const cardToPlay = affordableCards.sort((a, b) => a.cost - b.cost)[0]; // Use lowest cost card
            return { action: 'friendly', card: cardToPlay };
        }
        return { action: 'end_turn' };
    },

    playBalanced: function(battleState) {
        const { ai, player } = battleState;
        // If AI has high TP and good cards, be aggressive. Otherwise, be conservative.
        if (ai.tp > 5 && ai.hand.some(c => c.points > 8)) {
            return this.playAggressive(battleState);
        } else {
            return this.playConservative(battleState);
        }
    },

    makeDefenseDecision: function(battleState) {
        // Simplified defense logic for now
        const { ai } = battleState;
        const disagreeAction = window.GAME_CONFIG.battle.actions.disagree;
        const agreeAction = window.GAME_CONFIG.battle.actions.agree;
        
        // 防守时只考虑行动cost，不考虑卡牌cost
        const canDisagree = ai.tp >= disagreeAction.cost;
        const canAgree = ai.tp >= agreeAction.cost;

        if (canDisagree && ai.hand.length > 0) {
            // Try to find a good counter
            const bestCard = ai.hand.reduce((best, card) => {
                const matchType = getCardMatchType(battleState.currentAttack.attackCard, card);
                const currentMatchType = getCardMatchType(battleState.currentAttack.attackCard, best);
                
                // Prioritize same card > same tag > different
                if (matchType === 'sameCard' && currentMatchType !== 'sameCard') return card;
                if (matchType === 'sameTag' && currentMatchType === 'different') return card;
                if (card.points > best.points && matchType === currentMatchType) return card;
                return best;
            }, ai.hand[0]);
            
            const matchType = getCardMatchType(battleState.currentAttack.attackCard, bestCard);
            
            // Disagree if we have a good counter or high value card
            if (matchType === 'sameCard' || matchType === 'sameTag' || bestCard.points >= 8) {
                return { action: 'disagree', card: bestCard };
            }
        }
        
        // Default to agreeing with any card we have
        if (canAgree && ai.hand.length > 0) {
            // Use lowest value card for defense when agreeing
            const lowestCard = ai.hand.reduce((lowest, card) => 
                card.points < lowest.points ? card : lowest
            , ai.hand[0]);
            return { action: 'agree', card: lowestCard };
        }
        
        // If can't afford any action, return agree with no card
        return { action: 'agree', card: null };
    }
};