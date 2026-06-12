/**
 * 宅理论战回合/对撞编排（薄编排层：读 store → 调 engine → 写 store → 调度定时器）。
 * 规则全部在 engine/battle 与 engine/ai；本文件负责副作用与节奏。
 * 合并自 core/battle/TurnManager + BattleController + core/ai/AIController 的调度部分 ——
 * 三者原本互相 import 形成循环依赖，合并为单模块 + 决策外置 engine 后循环消失。
 */
import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { useSettingsStore } from '@/stores/settings';
import type { ClashInfo } from '@/types/battle';
import type { PlayerState } from '@/types';
import {
  defaultRng,
  // 回合规则
  maxTpForTurn,
  isTurnLimitReached,
  checkVictory,
  judgeFinal,
  nextRotationIndex,
  TURN_START_DRAW,
  type GameOutcome,
  // 整场结算
  calculateMatchRewards,
  VICTORY_REASON_TEXT,
  // 对撞规则
  resolveClash as engineResolveClash,
  finalStrength,
  auraStrengthBonus,
  // AI 决策
  affordableCards,
  chooseAttackCard,
  chooseAttackStyle,
  chooseDefense,
  chooseActiveSkill,
} from '@/engine';
import { SkillSystem } from '@/skills/runtime';
import { DialogueSystem } from '@/stores/battleDialogue';
import { persistentEffects } from '@/skills/systems';
import { useProfileStore } from '@/stores/profile';
import { saveToServer } from '@/stores/persistence';

function playerName(playerId: 'playerA' | 'playerB'): string {
  const playerStore = usePlayerStore();
  return playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
}

/** 计算一侧的最终强度：卡面 + 被动光环 + 持续效果。 */
function sideStrength(card: ClashInfo['attackingCard'] | undefined, ownerId: 'playerA' | 'playerB'): number {
  if (!card) return 0;
  const playerStore = usePlayerStore();
  const allCharacters = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
  const persistentBonus = persistentEffects.getStrengthBonus(
    ownerId,
    card.synergy_tags || [],
  );
  return finalStrength(card, [auraStrengthBonus(card, allCharacters), persistentBonus]);
}

/** 整场结算：记录结果 → 发放奖励（登录用户）→ 存档。结算面板由 BattleView 依据 gameStore 渲染。 */
function endGame(outcome: GameOutcome) {
  const gameStore = useGameStore();
  const historyStore = useHistoryStore();
  if (gameStore.isGameOver) return; // 防止重复结算

  gameStore.setWinner(outcome.winner, outcome.reason);
  gameStore.setPhase('game_over');

  const resultText = outcome.winner === 'draw' ? '平局' : outcome.winner === 'playerA' ? '胜利' : '败北';
  historyStore.addLog(`—— 对战结束：${resultText}（${VICTORY_REASON_TEXT[outcome.reason]}）——`, 'event');

  const rewards = calculateMatchRewards(outcome);
  gameStore.setMatchRewards(rewards);

  const profile = useProfileStore();
  if (profile.isLoggedIn) {
    profile.addExp(rewards.exp);
    profile.earn('knowledgePoints', rewards.knowledge);
    profile.addLog(
      `宅理论战${resultText}！获得 ${rewards.exp} 经验、${rewards.knowledge} 知识点。`,
      outcome.winner === 'playerA' ? 'success' : 'info',
    );
    saveToServer();
  }
}

function startTurn() {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();

  historyStore.addLog(
    `--- 第 ${gameStore.turn} 回合：${gameStore.activePlayer === 'playerA' ? '我方' : '对方'}回合 ---`,
    'event',
  );

  // 1. 双方最大 TP 同步到当前回合值，并回满
  playerStore.syncBothPlayersMaxTp(maxTpForTurn(gameStore.turn));
  playerStore.restoreTpToMax(gameStore.activePlayer);
  const nonActivePlayer = gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA';
  playerStore.restoreTpToMax(nonActivePlayer);

  // 2. 行动方抽牌
  playerStore.drawCards(gameStore.activePlayer, TURN_START_DRAW);

  // 3. 重置行动方的轮换次数
  playerStore.resetRotationsForNewTurn(gameStore.activePlayer);

  // 4. 回合开始的持续效果与冷却递减
  persistentEffects.onTurnStart(gameStore.activePlayer);
  playerStore.reduceSkillCooldowns(gameStore.activePlayer);

  // 5. 处理待轮换标记
  if (playerStore[gameStore.activePlayer].needsRotation) {
    const player = playerStore[gameStore.activePlayer];
    playerStore.setActiveCharacter(
      gameStore.activePlayer,
      nextRotationIndex(player.activeCharacterIndex, player.characters.length),
    );
    player.needsRotation = false;
  }

  // 6. 进入行动阶段；AI 回合则调度其行动
  gameStore.setPhase('action');
  if (gameStore.activePlayer === 'playerB') {
    aiTakeTurn();
  }
}

function endTurn() {
  const gameStore = useGameStore();
  if (gameStore.isGameOver) return;

  persistentEffects.onTurnEnd(gameStore.activePlayer);

  if (isTurnLimitReached(gameStore.turn)) {
    judgeFinalWinner();
    return;
  }

  gameStore.nextTurn();
  startTurn();
}

/** 每次状态变化后的胜负检查。 */
function checkVictoryConditions() {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  if (gameStore.isGameOver) return;

  const outcome = checkVictory({
    reputationA: playerStore.playerA.reputation,
    reputationB: playerStore.playerB.reputation,
    topicBias: gameStore.topicBias,
  });
  if (outcome) endGame(outcome);
}

function judgeFinalWinner() {
  const playerStore = usePlayerStore();
  endGame(judgeFinal(playerStore.playerA.reputation, playerStore.playerB.reputation));
}

// ---------------------------------------------------------------------------
// 对撞流程
// ---------------------------------------------------------------------------

async function initiateClash(animeId: number, style: '友好安利' | '辛辣点评') {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const settingsStore = useSettingsStore();

  const attackerId = gameStore.activePlayer;
  const attacker = playerStore[attackerId];
  const defenderId = gameStore.opponentId;

  const attackingCard = attacker.hand.find(a => a.id === animeId);
  if (!attackingCard) return;

  const styleCost = style === '辛辣点评' ? 1 : 0;
  const totalCost = (attackingCard.cost || 0) + styleCost;
  if (attacker.tp < totalCost) {
    gameStore.addNotification('TP不足，无法出牌！', 'warning');
    return;
  }

  playerStore.changeTp(attackerId, -totalCost);
  playerStore.discardCardFromHand(attackerId, animeId.toString());

  const clash: ClashInfo = { attackerId, attackingCard, attackStyle: style, defenderId };
  gameStore.setClash(clash);
  gameStore.setPhase('defense');

  await SkillSystem.onCardPlayed(attackerId, attackingCard);

  historyStore.addLog(`${playerName(attackerId)} 以 [${style}] 的方式打出了 [${attackingCard.name}]。`, 'clash');

  // 辩论对话演出
  const dialogueSystem = DialogueSystem.getInstance();
  dialogueSystem.addDialogue(
    attackerId,
    dialogueSystem.generateAttackDialogue(style, attackingCard.name),
    'speech',
  );
  if (style === '辛辣点评' && Math.random() < 0.3) {
    setTimeout(() => {
      dialogueSystem.addDialogue(attackerId, dialogueSystem.generateActionDialogue('objection'), 'action', 'objection');
    }, 1500);
  }

  // 玩家进攻时调度 AI 防御；AI 进攻时等待玩家输入
  if (attackerId === 'playerA') {
    const delay = settingsStore.getBattleDelay('aiDefense');
    setTimeout(() => aiRespondToClash(), delay);
  }
}

function aiRespondToClash() {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();

  if (gameStore.phase !== 'defense') return;
  if (!gameStore.clashInfo) return;

  const defenderId = gameStore.opponentId;
  const defender: PlayerState = playerStore[defenderId];
  const dialogueSystem = DialogueSystem.getInstance();

  const decision = chooseDefense(
    defender.hand,
    defender.tp,
    gameStore.clashInfo.attackingCard?.points || 0,
    defaultRng,
  );

  if (decision.defend && decision.card && decision.style) {
    historyStore.addLog(`${playerName(defenderId)} 使用 [${decision.card.name}] 进行 [${decision.style}]。`, 'clash');

    dialogueSystem.addDialogue(
      defenderId,
      dialogueSystem.generateDefenseDialogue(
        decision.style,
        gameStore.clashInfo.attackingCard.name || '',
        decision.card.name,
      ),
      'speech',
    );
    if (decision.style === '反驳' && Math.random() < 0.4) {
      setTimeout(() => {
        dialogueSystem.addDialogue(defenderId, dialogueSystem.generateActionDialogue('counterattack'), 'action', 'counterattack');
      }, 2000);
    }

    respondToClash(decision.card.id, decision.style);
  } else {
    historyStore.addLog(`${playerName(defenderId)} 选择不响应，跳过防御。`, 'info');
    dialogueSystem.addDialogue(defenderId, '这个...我暂时没有好的反驳...', 'speech');
    passDefense();
  }
}

async function passDefense() {
  const gameStore = useGameStore();
  if (!gameStore.clashInfo) return;

  const defenderId = gameStore.opponentId;
  const dialogueSystem = DialogueSystem.getInstance();
  dialogueSystem.addDialogue(
    defenderId,
    defenderId === 'playerA' ? '这个观点...确实有些道理...' : '这个...我暂时没有好的反驳...',
    'speech',
  );

  // 默认以「赞同」方式防守，不出卡（强度为 0）
  await resolveClash({ ...gameStore.clashInfo, defenseStyle: '赞同', defendingCard: undefined });
}

async function respondToClash(defendingAnimeId: number, defenseStyle: '赞同' | '反驳') {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  if (!gameStore.clashInfo) return;

  const defenderId = gameStore.opponentId;
  const defender = playerStore[defenderId];
  const defendingCard = defender.hand.find(a => a.id === defendingAnimeId);
  if (!defendingCard) return;

  const styleCost = defenseStyle === '反驳' ? 1 : 0;
  const totalCost = (defendingCard.cost || 0) + styleCost;
  if (defender.tp < totalCost) {
    gameStore.addNotification('TP不足！', 'warning');
    return;
  }

  playerStore.changeTp(defenderId, -totalCost);
  playerStore.discardCardFromHand(defenderId, defendingAnimeId.toString());

  const finalClashInfo: ClashInfo = { ...gameStore.clashInfo, defenderId, defendingCard, defenseStyle };

  await SkillSystem.onCardPlayed(defenderId, defendingCard);

  const dialogueSystem = DialogueSystem.getInstance();
  dialogueSystem.addDialogue(
    defenderId,
    dialogueSystem.generateDefenseDialogue(defenseStyle, gameStore.clashInfo.attackingCard.name || '', defendingCard.name),
    'speech',
  );
  if (defenseStyle === '反驳' && Math.random() < 0.4) {
    setTimeout(() => {
      dialogueSystem.addDialogue(defenderId, dialogueSystem.generateActionDialogue('counterattack'), 'action', 'counterattack');
    }, 2000);
  }

  await resolveClash(finalClashInfo);
}

async function resolveClash(clashInfo: ClashInfo) {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const settingsStore = useSettingsStore();

  // 1. beforeResolve 技能效果注入临时强度
  let extraAttacker = 0;
  let extraDefender = 0;
  await SkillSystem.emitBeforeResolve(clashInfo, (side, amount) => {
    if (side === 'attacker') extraAttacker += amount;
    else extraDefender += amount;
  });

  // 2. 最终强度（卡面 + 光环 + 持续效果），交给 engine 结算
  //    注意：奖励基于不含 beforeResolve 临时加成的强度计算（沿袭原行为），
  //    临时加成只影响展示强度。
  const clashResult = engineResolveClash(clashInfo, {
    attacker: sideStrength(clashInfo.attackingCard, clashInfo.attackerId),
    defender: sideStrength(clashInfo.defendingCard, clashInfo.defenderId),
  });
  clashResult.attackerStrength += extraAttacker;
  clashResult.defenderStrength += extraDefender;
  const { rewards } = clashResult;

  // 3. 应用结果
  playerStore.changeReputation(clashInfo.attackerId, rewards.attackerReputationChange);
  if (clashInfo.defenderId) {
    playerStore.changeReputation(clashInfo.defenderId, rewards.defenderReputationChange);
  }
  gameStore.updateTopicBias(rewards.topicBiasChange);

  historyStore.addLog(
    `声望变化: ${playerName(clashInfo.attackerId)} ${rewards.attackerReputationChange}, ${playerName(clashInfo.defenderId)} ${rewards.defenderReputationChange}。`,
    'damage',
  );
  historyStore.addLog(`议题偏向变化: ${rewards.topicBiasChange > 0 ? '+' : ''}${rewards.topicBiasChange}。`, 'info');

  gameStore.setClash({ ...clashInfo, ...clashResult });

  // 4. afterResolve 技能效果
  await SkillSystem.emitAfterResolve({ ...clashInfo, ...clashResult });

  // 5. 展示间隔后清场、查胜负；AI 进攻结算完即结束其回合
  const delay = settingsStore.getBattleDelay('settle');
  setTimeout(() => {
    gameStore.clearClash();
    gameStore.setPhase('action');
    checkVictoryConditions();

    if (clashInfo.attackerId === 'playerB' && !gameStore.isGameOver) {
      endTurn();
    }
  }, delay);
}

// ---------------------------------------------------------------------------
// AI 回合调度（决策在 engine/ai/decisions.ts）
// ---------------------------------------------------------------------------

function aiTakeTurn() {
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const settingsStore = useSettingsStore();
  const aiPlayer = playerStore.playerB;

  historyStore.addLog(`${aiPlayer.name} 正在思考...`, 'info');

  const delay = settingsStore.getBattleDelay('aiThink');
  setTimeout(async () => {
    const playable = affordableCards(aiPlayer.hand, aiPlayer.tp);
    const cardToPlay = chooseAttackCard(playable, defaultRng);

    if (cardToPlay) {
      const style = chooseAttackStyle(cardToPlay, aiPlayer.tp, defaultRng);
      historyStore.addLog(`${aiPlayer.name} 打出了 [${cardToPlay.name}]。`, 'clash');
      initiateClash(cardToPlay.id, style);
      return;
    }

    // S6: 没牌可出时先尝试主动技能（回费/抽牌自救），再试一次出牌
    const activeCharacter = aiPlayer.characters[aiPlayer.activeCharacterIndex];
    const skill = chooseActiveSkill(activeCharacter?.skills, aiPlayer.tp, aiPlayer.skillCooldowns);
    if (skill) {
      await SkillSystem.useSkill('playerB', skill);
      const retryCard = chooseAttackCard(affordableCards(aiPlayer.hand, aiPlayer.tp), defaultRng);
      if (retryCard) {
        const style = chooseAttackStyle(retryCard, aiPlayer.tp, defaultRng);
        historyStore.addLog(`${aiPlayer.name} 打出了 [${retryCard.name}]。`, 'clash');
        initiateClash(retryCard.id, style);
        return;
      }
    }

    historyStore.addLog(`${aiPlayer.name} 选择结束回合。`, 'event');
    endTurn();
  }, delay);
}

function skipTurn() {
  const gameStore = useGameStore();
  if (gameStore.phase === 'action' && gameStore.activePlayer === 'playerA') {
    endTurn();
  } else if (gameStore.phase === 'defense' && gameStore.activePlayer === 'playerB') {
    passDefense();
  }
}

export const BattleFlow = {
  startTurn,
  endTurn,
  skipTurn,
  checkVictoryConditions,
  initiateClash,
  respondToClash,
  passDefense,
  aiRespondToClash,
  resolveClash,
};
