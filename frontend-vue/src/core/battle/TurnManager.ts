import { useGameStore } from '@/stores/battle';
import { usePlayerStore } from '@/stores/battle';
import { useHistoryStore } from '@/stores/battle';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { AnimeCard, CharacterCard, Card, Skill } from '@/types';
import type { Deck } from '@/stores/userStore';

// Maps character IDs to an array of skill IDs
const CharacterSkillMap: Record<number, string[]> = {
  1007: ['KYON_TSUKKOMI', 'PASSIVE_PLACEHOLDER'], // 阿虚
  49: ['ACTIVE_PLACEHOLDER', 'HARUHI_AURA'],    // 凉宫春日
  265: ['ACTIVE_PLACEHOLDER', 'PASSIVE_PLACEHOLDER'],  // 泉此方
  // Lower rarity characters can get template skills
  72355: ['TPL_DRAW_1', 'AURA_GENRE_EXPERT'], // 随便一个R角色
};

// Helper function to inject skills into a character card
function injectSkills(character: CharacterCard): CharacterCard {
  const gameDataStore = useGameDataStore();
  const skillIds = CharacterSkillMap[character.id] || [];
  
  const skills: Skill[] = skillIds
    .map(id => gameDataStore.getSkillById(id)) // Use the store's getter
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
  initializeGameWithDeck(playerADeck: Deck) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();

    if (!gameDataStore.allAnimeCards.length || !gameDataStore.allCharacterCards.length) {
      console.error("Game data is not loaded. Cannot start the game.");
      return;
    }

    historyStore.clearLog();
    historyStore.addLog('游戏开始！正在构筑卡组...', 'event');

    // Player A uses the selected deck
    const playerA_deck = playerADeck.anime
      .map(id => gameDataStore.getAnimeCardById(id))
      .filter((c): c is AnimeCard => c !== undefined);
      
    const playerA_chars = playerADeck.character
      .map(id => gameDataStore.getCharacterCardById(id))
      .filter((c): c is CharacterCard => c !== undefined)
      .map(injectSkills);

    // Player B (AI) gets a random deck
    const playerB_deck = [...gameDataStore.allAnimeCards].sort(() => 0.5 - Math.random()).slice(0, 30);
    const playerB_chars = [...gameDataStore.allCharacterCards]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(injectSkills);
    
    gameStore.startGame();
    playerStore.setupPlayers(playerA_deck, playerA_chars, playerB_deck, playerB_chars);

    playerStore.shuffleDeck('playerA');
    playerStore.shuffleDeck('playerB');

    // Draw initial hands for both players
    playerStore.drawCards('playerA', 5);
    playerStore.drawCards('playerB', 5);

    this.startTurn();
  },

  /**
   * Initializes a game with random decks for both players.
   */
  initializeRandomGame() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();

    if (!gameDataStore.allAnimeCards.length || !gameDataStore.allCharacterCards.length) {
      console.error("Game data is not loaded. Cannot start the game.");
      return;
    }

    historyStore.clearLog();
    historyStore.addLog('游戏开始！正在随机化卡组...', 'event');

    // Get random decks and characters directly from the store
    const playerA_deck = [...gameDataStore.allAnimeCards].sort(() => 0.5 - Math.random()).slice(0, 30);
    const playerA_chars = [...gameDataStore.allCharacterCards]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(injectSkills);
    const playerB_deck = [...gameDataStore.allAnimeCards].sort(() => 0.5 - Math.random()).slice(0, 30);
    const playerB_chars = [...gameDataStore.allCharacterCards]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4)
      .map(injectSkills);

    gameStore.startGame();
    playerStore.setupPlayers(playerA_deck, playerA_chars, playerB_deck, playerB_chars);

    // Shuffle decks at the start of the game
    playerStore.shuffleDeck('playerA');
    playerStore.shuffleDeck('playerB');

    // Draw initial hands
    playerStore.drawCards('playerA', 5);
    playerStore.drawCards('playerB', 5);

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

    // 1. Restore TP
    playerStore.restoreTpForNewTurn(gameStore.activePlayer, gameStore.turn);

    // 2. Draw a card
    playerStore.drawCards(gameStore.activePlayer, 1);

    // 3. Handle character skill cooldowns reduction
    playerStore.reduceSkillCooldowns(gameStore.activePlayer);
    
    // 4. Handle character rotation if needed
    if (playerStore[gameStore.activePlayer].needsRotation) {
      const player = playerStore[gameStore.activePlayer];
      const newIndex = (player.activeCharacterIndex + 1) % player.characters.length;
      playerStore.setActiveCharacter(gameStore.activePlayer, newIndex);
      player.needsRotation = false; // Reset the flag
    }

    // 5. Set phase to action
    gameStore.setPhase('action');

    // 6. If it's the AI's turn, trigger its action
    if (gameStore.activePlayer === 'playerB') {
      AIController.takeTurn();
    }
  },

  /**
   * Ends the current player's turn and proceeds to the next.
   */
  endTurn() {
    const gameStore = useGameStore();
    
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
