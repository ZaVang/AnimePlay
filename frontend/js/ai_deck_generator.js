
window.AI_DECK_GENERATOR = {
    generateDeck: function(allCards) {
        const rarityConfig = {
            'N': 5,
            'R': 5,
            'SR': 4,
            'SSR': 3,
            'HR': 2,
            'UR': 1
        };

        let deck = [];
        const cardPool = [...allCards];

        for (const rarity in rarityConfig) {
            const count = rarityConfig[rarity];
            const filteredCards = cardPool.filter(c => c.rarity === rarity);
            
            for (let i = 0; i < count; i++) {
                if (filteredCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * filteredCards.length);
                    const selectedCard = filteredCards.splice(randomIndex, 1)[0];
                    deck.push(selectedCard.id);
                }
            }
        }
        return deck;
    }
};