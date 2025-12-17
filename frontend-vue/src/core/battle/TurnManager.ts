import { useGameStore } from '@/stores/battle';
import { usePlayerStore } from '@/stores/battle';
import { useHistoryStore } from '@/stores/battle';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useAuthStore } from '@/stores/modules/authStore';
import type { Deck } from '@/stores/userStore';
import { getAIProfileById, pickDefaultAIProfile, type AIProfile } from '@/core/ai/aiProfiles';
import type { AnimeCard, CharacterCard, Skill } from '@/types';
import type { Rarity } from '@/types/card';
// removed duplicate Deck import

import { urCharacterSkillMap } from '@/data/urCharacterSkills';
import { systemRegistry } from '@/core/di/registry';
import { generateRandomAIDeck } from '@/utils/randomAIDeckGenerator';
import { clearSkillCache } from '@/skills';
import { SkillSystem } from '@/core/systems/SkillSystem';

// 辅助函数：正确的数组洗牌
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues for better randomness if available
    let randomValue;
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const randomArray = new Uint32Array(1);
      window.crypto.getRandomValues(randomArray);
      randomValue = randomArray[0] / (0xFFFFFFFF + 1);
    } else {
      randomValue = Math.random();
    }
    
    const j = Math.floor(randomValue * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Maps character IDs to an array of skill IDs
const CharacterSkillMap: Record<number, string[]> = {
  // --- UR Character Skills (优先级最高) ---
  ...urCharacterSkillMap,
  
  // --- Non-UR Character Skills ---
  1007: ['KYON_TSUKKOMI', 'PASSIVE_PLACEHOLDER'], // 阿虚(非UR)
  // Lower rarity characters can get template skills
  72355: ['TPL_DRAW_1', 'AURA_GENRE_EXPERT'], // 随便一个R角色
};

// Default skill templates by rarity (fallback when a character has no bound skills)
const DefaultActiveByRarity: Partial<Record<Rarity, string>> = {
  N: 'TPL_DRAW_1',
  R: 'TPL_GAIN_TP_2',
  SR: 'TPL_DRAW_1',
};
const DefaultPassiveByRarity: Partial<Record<Rarity, string>> = {
  N: 'AURA_GENRE_EXPERT', // 简单被动示例
  R: 'AURA_GENRE_EXPERT',
  SR: 'AURA_GENRE_EXPERT',
};

// Helper function to inject skills into a character card
function injectSkills(character: CharacterCard): CharacterCard {
  const gameDataStore = useGameDataStore();
  // Preferred source: character.activeSkillId / passiveSkillId from data layer mapping
  const preferredIds: string[] = [];
  if (character.activeSkillId) preferredIds.push(character.activeSkillId);
  if (character.passiveSkillId) preferredIds.push(character.passiveSkillId);

  // Fallback to legacy map if not provided
  const fallbackIds = CharacterSkillMap[character.id] || [];
  let skillIds = preferredIds.length > 0 ? preferredIds : fallbackIds;

  // If still empty, apply default templates by rarity
  if (skillIds.length === 0) {
    const activeDefault = DefaultActiveByRarity[character.rarity];
    const passiveDefault = DefaultPassiveByRarity[character.rarity];
    const defaults = [activeDefault, passiveDefault].filter((s): s is string => !!s);
    if (defaults.length) {
      skillIds = defaults;
    }
  }

  const skills: Skill[] = skillIds
    .map(id => gameDataStore.getSkillById(id))
    .filter((s): s is Skill => s !== undefined);

  return { ...character, skills };
}

import { AIController } from '@/core/ai/AIController';

/**
 * Manages the game's turn flow and phases.
 * It interacts with Pinia stores to update the game state.
 */
export const TurnManager = {
  /**
   * Initializes a game with a specific deck for Player A.
   * @param playerADeck - The deck selected by Player A.
   */
  async initializeGameWithDeck(playerADeck: Deck, aiProfileId?: string) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();
    const authStore = useAuthStore();

    console.log('🎮 TurnManager.initializeGameWithDeck 调用');
    console.log('📊 游戏数据状态:', {
      animeCards: gameDataStore.allAnimeCards.length,
      characterCards: gameDataStore.allCharacterCards.length
    });

    if (!gameDataStore.allAnimeCards.length || !gameDataStore.allCharacterCards.length) {
      console.error("❌ 游戏数据未加载。无法开始游戏。");
      alert('游戏数据未加载完成，请刷新页面重试。');
      return;
    }

    historyStore.clearLog();
    
    // 清理技能缓存以确保新游戏的状态干净
    clearSkillCache();
    historyStore.addLog('游戏开始！正在构筑卡组...', 'event');

    // Player A uses the selected deck
    const playerA_deck = playerADeck.anime
      .map(id => gameDataStore.getAnimeCardById(id))
      .filter((c): c is AnimeCard => c !== undefined);
      
    const playerA_chars = playerADeck.character
      .map(id => gameDataStore.getCharacterCardById(id))
      .filter((c): c is CharacterCard => c !== undefined)
      .map(injectSkills);

    // Player B (AI) uses configured profile or random fallback
    const aiProfile: AIProfile = aiProfileId ? (getAIProfileById(aiProfileId) || pickDefaultAIProfile()) : pickDefaultAIProfile();
    
    let playerB_deck: AnimeCard[];
    let playerB_chars: CharacterCard[];
    
    if (aiProfile.id === 'random-ai') {
      // 使用随机AI卡组生成器
      const randomDeck = generateRandomAIDeck(gameDataStore.allAnimeCards, gameDataStore.allCharacterCards);
      playerB_deck = randomDeck.anime
        .map(id => gameDataStore.getAnimeCardById(id))
        .filter((c): c is AnimeCard => c !== undefined);
      playerB_chars = randomDeck.character
        .map(id => gameDataStore.getCharacterCardById(id))
        .filter((c): c is CharacterCard => c !== undefined)
        .map(injectSkills);
    } else {
      // 使用预配置的AI档案或简单随机
      playerB_deck = (aiProfile.anime.length
        ? aiProfile.anime.map(id => gameDataStore.getAnimeCardById(id)).filter((c): c is AnimeCard => c !== undefined)
        : shuffleArray([...gameDataStore.allAnimeCards]).slice(0, 30));
      playerB_chars = (aiProfile.character.length
        ? aiProfile.character.map(id => gameDataStore.getCharacterCardById(id)).filter((c): c is CharacterCard => c !== undefined).map(injectSkills)
        : shuffleArray([...gameDataStore.allCharacterCards])
            .slice(0, 4)
            .map(injectSkills));
    }
    
    // Debug: Check AI deck generation and available cards
    console.log('🤖 AI卡组生成调试:', {
      profileName: aiProfile.name,
      profileAnimeCount: aiProfile.anime.length,
      generatedDeckSize: playerB_deck.length,
      generatedCharCount: playerB_chars.length,
      totalAvailableAnime: gameDataStore.allAnimeCards.length,
      totalAvailableChar: gameDataStore.allCharacterCards.length,
      sampleDeckCards: playerB_deck.slice(0, 3).map(c => c.name),
      // 显示前20个可用的动画卡牌ID，用于配置AI卡组
      availableAnimeIds: gameDataStore.allAnimeCards.slice(0, 20).map(c => `${c.id}(${c.name})`),
      availableCharIds: gameDataStore.allCharacterCards.slice(0, 10).map(c => `${c.id}(${c.name})`)
    });
    
    gameStore.startGame();
    playerStore.setupPlayers(playerA_deck, playerA_chars, playerB_deck, playerB_chars);

    // Debug: Check after setupPlayers
    console.log('📋 setupPlayers后状态:', {
      playerA_deckSize: playerStore.playerA.deck.length,
      playerA_handSize: playerStore.playerA.hand.length,
      playerB_deckSize: playerStore.playerB.deck.length,
      playerB_handSize: playerStore.playerB.hand.length
    });

    // Set player names: logged-in user vs AI profile name
    playerStore.playerA.name = authStore.currentUser || '你';
    playerStore.playerB.name = aiProfile.name;

    playerStore.shuffleDeck('playerA');
    playerStore.shuffleDeck('playerB');

    // Debug: Check after shuffling
    console.log('🔀 洗牌后状态:', {
      playerA_deckSize: playerStore.playerA.deck.length,
      playerB_deckSize: playerStore.playerB.deck.length
    });

    // Draw initial hands for both players
    playerStore.drawCards('playerA', 5);
    playerStore.drawCards('playerB', 5);

    // Debug: Check after drawing initial hands
    console.log('🃏 初始抽牌后状态:', {
      playerA_hand: playerStore.playerA.hand.length,
      playerA_deck: playerStore.playerA.deck.length,
      playerB_hand: playerStore.playerB.hand.length,
      playerB_deck: playerStore.playerB.deck.length
    });

    // 🎯 初始化所有角色的被动技能
    await SkillSystem.initializePassiveSkills();

    this.startTurn();
  },

  /**
   * Initializes a game with random decks for both players.
   */
  async initializeRandomGame(aiProfileId?: string) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();
    const authStore = useAuthStore();

    console.log('🎲 TurnManager.initializeRandomGame 调用');
    console.log('📊 游戏数据状态:', {
      animeCards: gameDataStore.allAnimeCards.length,
      characterCards: gameDataStore.allCharacterCards.length
    });

    if (!gameDataStore.allAnimeCards.length || !gameDataStore.allCharacterCards.length) {
      console.error("❌ 游戏数据未加载。无法开始游戏。");
      alert('游戏数据未加载完成，请刷新页面重试。');
      return;
    }

    historyStore.clearLog();
    
    // 清理技能缓存以确保新游戏的状态干净
    clearSkillCache();
    historyStore.addLog('游戏开始！正在随机化卡组...', 'event');

    // Get random decks for Player A; AI uses configured profile or random fallback
    const playerA_deck = [...gameDataStore.allAnimeCards].sort(() => 0.5 - Math.random()).slice(0, 30);
    const playerA_chars = [...gameDataStore.allCharacterCards]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(injectSkills);

    const aiProfile: AIProfile = aiProfileId ? (getAIProfileById(aiProfileId) || pickDefaultAIProfile()) : pickDefaultAIProfile();
    
    let playerB_deck: AnimeCard[];
    let playerB_chars: CharacterCard[];
    
    if (aiProfile.id === 'random-ai') {
      // 使用随机AI卡组生成器
      const randomDeck = generateRandomAIDeck(gameDataStore.allAnimeCards, gameDataStore.allCharacterCards);
      playerB_deck = randomDeck.anime
        .map(id => gameDataStore.getAnimeCardById(id))
        .filter((c): c is AnimeCard => c !== undefined);
      playerB_chars = randomDeck.character
        .map(id => gameDataStore.getCharacterCardById(id))
        .filter((c): c is CharacterCard => c !== undefined)
        .map(injectSkills);
    } else {
      // 使用预配置的AI档案或简单随机
      playerB_deck = (aiProfile.anime.length
        ? aiProfile.anime.map(id => gameDataStore.getAnimeCardById(id)).filter((c): c is AnimeCard => c !== undefined)
        : shuffleArray([...gameDataStore.allAnimeCards]).slice(0, 30));
      playerB_chars = (aiProfile.character.length
        ? aiProfile.character.map(id => gameDataStore.getCharacterCardById(id)).filter((c): c is CharacterCard => c !== undefined).map(injectSkills)
        : shuffleArray([...gameDataStore.allCharacterCards])
            .slice(0, 4)
            .map(injectSkills));
    }

    gameStore.startGame();
    playerStore.setupPlayers(playerA_deck, playerA_chars, playerB_deck, playerB_chars);

    // Shuffle decks at the start of the game
    // Set player names: logged-in user vs AI profile name
    playerStore.playerA.name = authStore.currentUser || '你';
    playerStore.playerB.name = aiProfile.name;

    playerStore.shuffleDeck('playerA');
    playerStore.shuffleDeck('playerB');

    // Draw initial hands
    playerStore.drawCards('playerA', 5);
    playerStore.drawCards('playerB', 5);

    // 🎯 初始化所有角色的被动技能
    await SkillSystem.initializePassiveSkills();

    this.startTurn();
  },

  /**
   * Starts a new turn for the active player.
   */
  startTurn() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    
    historyStore.addLog(`--- 第 ${gameStore.turn} 回合：${gameStore.activePlayer === 'playerA' ? '我方' : '对方'}回合 ---`, 'event');

    // 1. Sync both players' max TP based on current turn and restore TP to max for active player
    // Max TP starts at 2 and increases by 1 every turn for both players, so both always equal.
    const syncedMaxTp = 2 + (gameStore.turn - 1);
    playerStore.syncBothPlayersMaxTp(syncedMaxTp);
    playerStore.restoreTpToMax(gameStore.activePlayer);
    // For non-active player, TP = max(TP+ syncedMaxTP//2, syncedMaxTP)
    // 双方都恢复至最大TP
    const nonActivePlayer = gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA';
    playerStore.restoreTpToMax(nonActivePlayer);

    // 2. Draw a card for both players (at the start of each turn)
    playerStore.drawCards('playerA', 1);
    playerStore.drawCards('playerB', 1);
    historyStore.addLog('双方各抽取1张卡牌', 'event');
    
    // 3. Reset character rotation count for the active player
    playerStore.resetRotationsForNewTurn(gameStore.activePlayer);
    
    // Debug: Check hand sizes after drawing
    console.log(`回合 ${gameStore.turn} 开始 - 双方各抽1张牌后状态:`, {
      playerA_hand: playerStore.playerA.hand.length,
      playerA_deck: playerStore.playerA.deck.length,
      playerB_hand: playerStore.playerB.hand.length,
      playerB_deck: playerStore.playerB.deck.length,
      activePlayer: gameStore.activePlayer
    });

    // 4. Process persistent effects at start of turn
    systemRegistry.getPersistentEffectSystem().onTurnStart(gameStore.activePlayer);

    // 4.5. Check conditional passive skills (动态被动技能检查)
    SkillSystem.checkConditionalPassiveSkills(gameStore.activePlayer);

    // 5. Handle character skill cooldowns reduction
    playerStore.reduceSkillCooldowns(gameStore.activePlayer);
    
    // 6. Handle character rotation if needed
    if (playerStore[gameStore.activePlayer].needsRotation) {
      const player = playerStore[gameStore.activePlayer];
      const newIndex = (player.activeCharacterIndex + 1) % player.characters.length;
      playerStore.setActiveCharacter(gameStore.activePlayer, newIndex);
      player.needsRotation = false; // Reset the flag
    }

    // 7. Set phase to action
    gameStore.setPhase('action');

    // 8. If it's the AI's turn, trigger its action
    if (gameStore.activePlayer === 'playerB') {
      AIController.takeTurn();
    }
  },

  /**
   * Ends the current player's turn and proceeds to the next.
   */
  endTurn() {
    const gameStore = useGameStore();
    
    // Process persistent effects at end of turn
    systemRegistry.getPersistentEffectSystem().onTurnEnd(gameStore.activePlayer);
    
    if (gameStore.turn >= 12) {
      this.judgeFinalWinner();
      return;
    }

    gameStore.nextTurn();
    this.startTurn();
  },

  /**
   * Checks for victory conditions after any state change.
   */
  checkVictoryConditions() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    if (gameStore.isGameOver) return;

    // Check for reputation victory
    if (playerStore.playerA.reputation <= 0) {
      this.endGame('playerB', 'reputation');
      return;
    }
    if (playerStore.playerB.reputation <= 0) {
      this.endGame('playerA', 'reputation');
      return;
    }

    // Check for topic bias victory
    if (gameStore.topicBias >= 10) {
      this.endGame('playerA', 'topic_bias');
      return;
    }
    if (gameStore.topicBias <= -10) {
      this.endGame('playerB', 'topic_bias');
      return;
    }
  },

  /**
   * Determines the winner at the end of 12 turns.
   */
  judgeFinalWinner() {
    const playerStore = usePlayerStore();
    const repA = playerStore.playerA.reputation;
    const repB = playerStore.playerB.reputation;

    if (repA > repB) {
      this.endGame('playerA', 'final_decision');
    } else if (repB > repA) {
      this.endGame('playerB', 'final_decision');
    } else {
      this.endGame('draw', 'draw');
    }
  },

  /**
   * Ends the game and sets the winner.
   * @param winnerId - The ID of the winning player or 'draw'.
   * @param reason - The reason for the victory.
   */
  endGame(winnerId: 'playerA' | 'playerB' | 'draw', reason: 'reputation' | 'topic_bias' | 'final_decision' | 'draw' | 'concede') {
    const gameStore = useGameStore();
    if (gameStore.isGameOver) return; // Prevent multiple endings

    gameStore.setPhase('game_over');
    console.log(`Game Over! Winner: ${winnerId}, Reason: ${reason}`);
    // We can store the winner in the gameStore later if needed.
  },
};
