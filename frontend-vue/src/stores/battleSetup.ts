/**
 * 宅理论战开局编排（薄编排层：读 store → 调 engine → 写 store）。
 * 规则在 engine/battle/setup.ts 与 engine/ai/randomDeck.ts；本文件只做数据装配与 store 写入。
 * 原 core/battle/TurnManager 的 initialize* 部分。
 */
import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useProfileStore } from '@/stores/profile';
import { useUserStore, type Deck } from '@/stores/userStore';
import { getAIProfileById, pickDefaultAIProfile, type AIProfile } from '@/config/aiProfiles';
import { urCharacterSkillMap } from '@/data/urCharacterSkills';
import type { AnimeCard, CharacterCard } from '@/types';
import {
  defaultRng,
  injectSkills,
  buildCardsFromIds,
  randomAnimeDeck,
  randomCharacterPicks,
  generateRandomAIDeck,
  INITIAL_HAND_SIZE,
} from '@/engine';
import { BattleFlow } from './battleFlow';

/** 数据层映射缺失时的遗留技能绑定（UR 表 + 历史散点）。 */
const LEGACY_SKILL_MAP: Record<number, string[]> = {
  ...urCharacterSkillMap,
  1007: ['KYON_TSUKKOMI', 'AURA_GENRE_EXPERT'], // 阿虚(非UR)；S8c：占位被动换真实现光环
  72355: ['TPL_DRAW_1', 'AURA_GENRE_EXPERT'],
};

function inject(character: CharacterCard): CharacterCard {
  const gameDataStore = useGameDataStore();
  return injectSkills(character, id => gameDataStore.getSkillById(id), LEGACY_SKILL_MAP);
}

function ensureDataLoaded(): boolean {
  const gameDataStore = useGameDataStore();
  if (!gameDataStore.allAnimeCards.length || !gameDataStore.allCharacterCards.length) {
    console.error('游戏数据未加载，无法开始游戏。');
    // 脱离组件上下文：降级为非阻塞 toast（复用 addLog 通知通道），不弹原生 alert。
    useProfileStore().addLog('游戏数据未加载完成，请刷新页面重试。', 'warning');
    return false;
  }
  return true;
}

function resolveAiProfile(aiProfileId?: string): AIProfile {
  return aiProfileId ? getAIProfileById(aiProfileId) || pickDefaultAIProfile() : pickDefaultAIProfile();
}

/** 装配 AI 一侧的卡组与角色。 */
function buildAiSide(aiProfile: AIProfile): { deck: AnimeCard[]; chars: CharacterCard[] } {
  const gameDataStore = useGameDataStore();

  if (aiProfile.id === 'random-ai') {
    const generated = generateRandomAIDeck(
      gameDataStore.allAnimeCards,
      gameDataStore.allCharacterCards,
      defaultRng,
    );
    return {
      deck: buildCardsFromIds(generated.anime, id => gameDataStore.getAnimeCardById(id)),
      chars: buildCardsFromIds(generated.character, id => gameDataStore.getCharacterCardById(id)).map(inject),
    };
  }

  return {
    deck: aiProfile.anime.length
      ? buildCardsFromIds(aiProfile.anime, id => gameDataStore.getAnimeCardById(id))
      : randomAnimeDeck(gameDataStore.allAnimeCards, defaultRng),
    chars: (aiProfile.character.length
      ? buildCardsFromIds(aiProfile.character, id => gameDataStore.getCharacterCardById(id))
      : randomCharacterPicks(gameDataStore.allCharacterCards, defaultRng)
    ).map(inject),
  };
}

/** 双方就位后的共同开局流程。 */
function startMatch(
  playerDeck: AnimeCard[],
  playerChars: CharacterCard[],
  aiProfile: AIProfile,
) {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const userStore = useUserStore();

  const aiSide = buildAiSide(aiProfile);

  gameStore.startGame();
  playerStore.setupPlayers(playerDeck, playerChars, aiSide.deck, aiSide.chars);

  playerStore.playerA.name = userStore.currentUser || '你';
  playerStore.playerB.name = aiProfile.name;

  playerStore.shuffleDeck('playerA');
  playerStore.shuffleDeck('playerB');

  playerStore.drawCards('playerA', INITIAL_HAND_SIZE);
  playerStore.drawCards('playerB', INITIAL_HAND_SIZE);

  BattleFlow.startTurn();
}

export const BattleSetup = {
  /** 用玩家自选卡组开局。 */
  initializeGameWithDeck(playerADeck: Deck, aiProfileId?: string) {
    if (!ensureDataLoaded()) return;
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();

    historyStore.clearLog();
    historyStore.addLog('游戏开始！正在构筑卡组...', 'event');

    const playerDeck = buildCardsFromIds(playerADeck.anime, id => gameDataStore.getAnimeCardById(id));
    const playerChars = buildCardsFromIds(playerADeck.character, id =>
      gameDataStore.getCharacterCardById(id),
    ).map(inject);

    startMatch(playerDeck, playerChars, resolveAiProfile(aiProfileId));
  },

  /** 双方随机卡组开局。 */
  initializeRandomGame(aiProfileId?: string) {
    if (!ensureDataLoaded()) return;
    const gameDataStore = useGameDataStore();
    const historyStore = useHistoryStore();

    historyStore.clearLog();
    historyStore.addLog('游戏开始！正在随机化卡组...', 'event');

    const playerDeck = randomAnimeDeck(gameDataStore.allAnimeCards, defaultRng);
    const playerChars = randomCharacterPicks(gameDataStore.allCharacterCards, defaultRng).map(inject);

    startMatch(playerDeck, playerChars, resolveAiProfile(aiProfileId));
  },
};
