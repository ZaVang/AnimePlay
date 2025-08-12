// It's a good practice to define types for your configuration object.
// This will give you autocompletion and type checking.
// I'll define some basic types here based on the structure.
// You can refine them later.

interface RarityConfig {
    p: number;
    c: string;
    dismantleValue: number;
    color: string;
    chartColor: string; // Add this for chart.js
    effect?: string; // Optional for character system
}

interface RateUpConfig {
    ids: number[];
    hrChance: number;
    pityPulls: number;
}

interface GachaConfig {
    guaranteedSSR_Pulls: number;
}

interface ShopItem {
    Id: number;
    cost: number;
}

interface SystemConfig {
    itemType: string;
    rarityConfig: Record<string, RarityConfig>;
    rateUp: RateUpConfig;
    gacha: GachaConfig;
    shop: {
        items: ShopItem[];
    };
}

interface BattleResult {
    prestige: [number, number];
    tp: [number, number];
    draw: [number, number];
    log: string;
}

interface LevelUpReward {
    animeTickets: number;
    knowledge: number;
    characterTickets: number;
}

export interface ViewingQueueReward {
    time: number;
    exp: number;
    knowledge: number;
}

export interface GameConfig {
    playerInitialState: {
        level: number;
        knowledgePoints: number;
        animeGachaTickets: number;
        characterGachaTickets: number;
    };
    aiOpponent: {
        name: string;
        deck: number[];
    };
    deckBuilding: {
        AnimeMaxNum: number;
        CharacterMaxNum: number;
    };
    battle: {
        initialPrestige: number;
        victoryPrestige: number;
        initialTP: number;
        tpPerTurn: number;
        initialHandSize: number;
        maxHandSize: number;
        maxCombos: number;
        fatigueCost: number;
        actions: {
            [key: string]: { cost: number; name: string };
        };
        resultTable: {
            friendly: {
                sameCard: { [key: string]: BattleResult };
                sameTag: { [key: string]: BattleResult };
                different: { [key: string]: BattleResult };
            };
            harsh: {
                sameCard: { [key: string]: BattleResult };
                sameTag: { [key: string]: BattleResult };
                different: { [key: string]: BattleResult };
            };
        };
    };
    animeSystem: SystemConfig;
    characterSystem: SystemConfig;
    gameplay: {
        levelXP: number[];
        levelUpRewards: { [level: string]: LevelUpReward };
        animeGachaEXP: {
            single: number;
            multi: number;
        };
        characterGachaEXP: {
            single: number;
            multi: number;
        };
        viewingQueue: {
            slots: number;
            rewards: {
                [rarity: string]: ViewingQueueReward;
            };
        };
    };
}


export const GAME_CONFIG: GameConfig = {
    // 玩家初始状态
    playerInitialState: {
        level: 1,
        knowledgePoints: 0,
        animeGachaTickets: 100,
        characterGachaTickets: 100, // 初始角色卡券
    },
    // AI 对手配置
    aiOpponent: {
        name: "路人AI",
        deck: [2, 12, 29, 34, 43, 97, 100, 258, 265, 2166],
    },
    // 卡组构筑限制
    deckBuilding: {
        AnimeMaxNum: 30,
        CharacterMaxNum: 4,
    },
    // 战斗设置
    battle: {
        initialPrestige: 10,
        victoryPrestige: 20,
        initialTP: 2,
        tpPerTurn: 1, // TP gain is currentTurn + tpPerTurn
        initialHandSize: 5,
        maxHandSize: 10,
        maxCombos: 4, // Max attacks per turn
        fatigueCost: 1, // Extra TP cost for each attack after the first
        actions: {
            friendly: { cost: 0, name: '友好安利' },
            harsh: { cost: 1, name: '辛辣点评' },
            agree: { cost: 0, name: '赞同' },
            disagree: { cost: 1, name: '反驳' }
        },
        // The core battle result table
        resultTable: {
            // Attacker uses FRIENDLY (+0 TP)
            friendly: {
                sameCard: {
                    agree:    { prestige: [ 3,  1], tp: [0, 0], draw: [0, 1], log: '太有共鸣了！' },
                    disagree: { prestige: [ 1,  2], tp: [1, 0], draw: [0, 0], log: '我觉得有些过誉了' }
                },
                sameTag: {
                    agree:    { prestige: [ 2,  0], tp: [1, 0], draw: [0, 1], log: '类似的我也看过' },
                    disagree: { prestige: [ 0,  1], tp: [1, 0], draw: [0, 1], log: '我看的那个更好' }
                },
                different: {
                    agree:    { prestige: [ 4, -1], tp: [0, 0], draw: [0, 2], log: '跨界安利成功！' },
                    disagree: { prestige: [ 1,  0], tp: [1, 0], draw: [0, 1], log: '我更喜欢XX类型' }
                }
            },
            // Attacker uses HARSH (+1 TP)
            harsh: {
                sameCard: {
                    agree:    { prestige: [ 2, -1], tp: [0, 0], draw: [0, 2], log: '确实，我想多了' },
                    disagree: { prestige: [-2,  4], tp: [0, 0], draw: [1, 0], log: '你这是恶意黑！' }
                },
                sameTag: {
                    agree:    { prestige: [ 3, -2], tp: [0, 0], draw: [0, 2], log: '你说得对，惭愧' },
                    disagree: { prestige: [-1,  3], tp: [0, 1], draw: [1, 0], log: 'XX才是真正的神作' }
                },
                different: {
                    agree:    { prestige: [ 4, -3], tp: [0, 0], draw: [0, 3], log: '降维打击！' },
                    disagree: { prestige: [ 0,  2], tp: [0, 1], draw: [1, 0], log: '但是XX更符合我口味' }
                }
            }
        }
    },
    
    // --- Anime System ---
    animeSystem: {
        itemType: '动画',
        rarityConfig: {
            'UR': { 
                p: 0.5, 
                c: 'from-amber-400 to-red-500', 
                dismantleValue: 1000, 
                color: 'text-red-600', 
                chartColor: '#dc2626', 
                effect: 'border-4 border-amber-600 shadow-amber-600/70 shadow-[0_0_25px_var(--tw-shadow-color)]'
            },
            'HR': { 
                p: 2.5, 
                c: 'from-red-500 to-purple-600', 
                dismantleValue: 400, 
                color: 'text-purple-700', 
                chartColor: '#7c3aed', 
                effect: 'border-4 border-red-600 shadow-red-600/70 shadow-[0_0_20px_var(--tw-shadow-color)]'
            },
            'SSR': { 
                p: 7, 
                c: 'from-yellow-300 to-amber-400', 
                dismantleValue: 100, 
                color: 'text-amber-600', 
                chartColor: '#d97706', 
                effect: 'border-4 border-yellow-600 shadow-yellow-500/70 shadow-[0_0_15px_var(--tw-shadow-color)]'
            },
            'SR': { 
                p: 20, 
                c: 'from-indigo-400 to-blue-500',  // 改为蓝紫渐变，避免和HR重复
                dismantleValue: 20, 
                color: 'text-indigo-600', 
                chartColor: '#4f46e5',
                effect: 'border-2 border-indigo-500 shadow-indigo-500/60 shadow-[0_0_10px_var(--tw-shadow-color)]'
            },
            'R': { 
                p: 30, 
                c: 'from-green-400 to-teal-500',  // 改为绿色渐变
                dismantleValue: 5, 
                color: 'text-green-600', 
                chartColor: '#059669',
                effect: 'border-2 border-green-500 shadow-green-500/50 shadow-[0_0_8px_var(--tw-shadow-color)]'
            },
            'N': { 
                p: 0, 
                c: 'from-gray-400 to-gray-600',  // 灰色渐变
                dismantleValue: 1, 
                color: 'text-gray-600', 
                chartColor: '#4b5563',
                effect: 'border border-gray-400'  // 普通边框即可
            }
        },
        rateUp: {
            ids: [326, 876], // UP卡牌的ID
            hrChance: 0.66,   // HR稀有度时，获得UP卡牌的概率
            pityPulls: 70,    // 必定获得UP卡牌的保底抽数
        },
        gacha: {
            guaranteedSSR_Pulls: 10, // 十连抽保底SSR
        },
        // 商店配置
        shop: {
            items: [
                { Id: 326, cost: 10000 }, // UR card
                { Id: 876, cost: 10000 }, // UR card
            ]
        },
    },

    // --- Character System ---
    characterSystem: {
        itemType: '角色',
        rarityConfig: {
            'UR': { 
                p: 0.5, 
                c: 'from-amber-400 to-red-500', 
                dismantleValue: 1000, 
                color: 'text-red-600', 
                chartColor: '#dc2626', 
                effect: 'border-4 border-amber-600 shadow-amber-600/70 shadow-[0_0_25px_var(--tw-shadow-color)]'
            },
            'HR': { 
                p: 2.5, 
                c: 'from-red-500 to-purple-600', 
                dismantleValue: 400, 
                color: 'text-purple-700', 
                chartColor: '#7c3aed', 
                effect: 'border-4 border-red-600 shadow-red-600/70 shadow-[0_0_20px_var(--tw-shadow-color)]'
            },
            'SSR': { 
                p: 7, 
                c: 'from-yellow-300 to-amber-400', 
                dismantleValue: 100, 
                color: 'text-amber-600', 
                chartColor: '#d97706', 
                effect: 'border-4 border-yellow-600 shadow-yellow-500/70 shadow-[0_0_15px_var(--tw-shadow-color)]'
            },
            'SR': { 
                p: 20, 
                c: 'from-indigo-400 to-blue-500',  // 改为蓝紫渐变，避免和HR重复
                dismantleValue: 20, 
                color: 'text-indigo-600', 
                chartColor: '#4f46e5',
                effect: 'border-2 border-indigo-500 shadow-indigo-500/60 shadow-[0_0_10px_var(--tw-shadow-color)]'
            },
            'R': { 
                p: 30, 
                c: 'from-green-400 to-teal-500',  // 改为绿色渐变
                dismantleValue: 5, 
                color: 'text-green-600', 
                chartColor: '#059669',
                effect: 'border-2 border-green-500 shadow-green-500/50 shadow-[0_0_8px_var(--tw-shadow-color)]'
            },
            'N': { 
                p: 0, 
                c: 'from-gray-400 to-gray-600',  // 灰色渐变
                dismantleValue: 1, 
                color: 'text-gray-600', 
                chartColor: '#4b5563',
                effect: 'border border-gray-400'  // 普通边框即可
            }
        },
        // Character UP pool configuration (identical to anime system)
        rateUp: {
            ids: [12393, 304], // UP character IDs - example characters for testing
            hrChance: 0.66, // HR rarity时，获得UP角色的概率
            pityPulls: 70, // 必定获得UP角色的保底抽数
        },
        // Character gacha settings (identical to anime system)
        gacha: {
            guaranteedSSR_Pulls: 10, // 10-pull guarantees at least SSR (identical to anime)
        },
        // 商店配置
        shop: {
            items: [
                { Id: 12393, cost: 10000 }, // UR character
                { Id: 304, cost: 10000 }, // HR character
            ]
        },
    },

    // --- Gameplay Settings ---
    gameplay: {
        // EXP required for each level (index 0 is for level 1)
        levelXP: [0, 100, 250, 500, 800, 1200, 1800, 2500, 3500, 5000], // Up to level 10
        // Rewards for leveling up
        levelUpRewards: {
            "2": { animeTickets: 5, knowledge: 100, characterTickets: 3 },
            "3": { animeTickets: 5, knowledge: 200, characterTickets: 3 },
            "4": { animeTickets: 10, knowledge: 300, characterTickets: 5 },
            "5": { animeTickets: 10, knowledge: 500, characterTickets: 5 },
            "6": { animeTickets: 15, knowledge: 800, characterTickets: 8 },
            "7": { animeTickets: 15, knowledge: 1000, characterTickets: 8 },
            "8": { animeTickets: 20, knowledge: 1500, characterTickets: 10 },
            "9": { animeTickets: 20, knowledge: 2000, characterTickets: 10 },
            "10": { animeTickets: 50, knowledge: 5000, characterTickets: 20 },
        },
        // Anime gacha EXP
        animeGachaEXP: {
            single: 10,
            multi: 110
        },
        // Character gacha EXP
        characterGachaEXP: {
            single: 15,
            multi: 160
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
