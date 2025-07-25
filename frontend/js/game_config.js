
window.GAME_CONFIG = {
    // 玩家初始状态
    playerInitialState: {
        level: 1,
        knowledgePoints: 0,
        gachaTickets: 100,
    },
    // AI 对手配置
    aiOpponent: {
        name: "路人AI",
        deck: [2, 12, 29, 34, 43, 97, 100, 258, 265, 2166],
    },
    // 卡牌稀有度配置
    rarityConfig: {
        'UR': { p: 0.5, c: 'from-amber-400 to-red-500', dismantleValue: 1000, color: 'text-red-500' },
        'HR': { p: 1.5, c: 'from-red-500 to-purple-600', dismantleValue: 400, color: 'text-purple-600' },
        'SSR': { p: 3, c: 'from-yellow-300 to-amber-400', dismantleValue: 100, color: 'text-amber-400' },
        'SR': { p: 10, c: 'bg-purple-500', dismantleValue: 20, color: 'text-purple-500' },
        'R': { p: 25, c: 'bg-blue-500', dismantleValue: 5, color: 'text-blue-500' },
        'N': { p: 60, c: 'bg-gray-500', dismantleValue: 1, color: 'text-gray-500' }
    },
    // UP卡池配置
    rateUp: {
        ids: [1428, 253], // UP卡牌的ID
        hrChance: 0.66,   // HR稀有度时，获得UP卡牌的概率
        pityPulls: 70,    // 必定获得UP卡牌的保底抽数
    },
    // 卡组构筑限制
    deckBuilding: {
        maxCost: 150,
        maxCards: 20, // Increased from 10
        minCardsForBattle: 3,
    },
    // 抽卡设置
    gacha: {
        guaranteedSR_Pulls: 10, // 十连抽保底SR
    },
    // 战斗设置
    battle: {
        initialHP: 100,
        initialTP: 3,
        tpPerTurn: 1,
        initialHandSize: 5,
        laneSize: 3,
        removeCardCost: 2,
        maxRounds: 20, // Max rounds before a draw
    },
    // 商店配置
    shop: {
        items: [
            { cardId: 1428, cost: 10000 }, // UR card
            { cardId: 253, cost: 10000 }, // UR card
        ]
    },

    // --- Gameplay Settings ---
    gameplay: {
        // EXP required for each level (index 0 is for level 1)
        levelXP: [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000], // Up to level 10
        // Rewards for leveling up
        levelUpRewards: {
            2: { tickets: 5, knowledge: 100 },
            3: { tickets: 5, knowledge: 200 },
            4: { tickets: 10, knowledge: 300 },
            5: { tickets: 10, knowledge: 500 },
            6: { tickets: 15, knowledge: 800 },
            7: { tickets: 15, knowledge: 1000 },
            8: { tickets: 20, knowledge: 1500 },
            9: { tickets: 20, knowledge: 2000 },
            10: { tickets: 50, knowledge: 5000 },
        },
        // EXP gained from drawing cards
        gachaEXP: {
            single: 10,
            multi: 110
        },
        // Viewing queue settings
        viewingQueue: {
            slots: 3,
            // Time in minutes and rewards per rarity
            rewards: {
                'UR': { time: 240, exp: 5000, knowledge: 1000 },
                'HR': { time: 180, exp: 2500, knowledge: 400 },
                'SSR': { time: 120, exp: 1000, knowledge: 100 },
                'SR': { time: 60, exp: 400, knowledge: 20 },
                'R': { time: 30, exp: 150, knowledge: 5 },
                'N': { time: 10, exp: 50, knowledge: 1 }
            }
        }
    }
};
