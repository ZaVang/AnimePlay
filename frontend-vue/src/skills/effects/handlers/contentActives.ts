/**
 * S8c handler 分桶：内容批主动技（17 个 UR 角色主动技）。
 * 触发路径：SkillSystem.useSkill → runEffect(effectId, { event:'onPlay', skill })——
 * TP 扣费/冷却由 useSkill 负责，本桶只写入效果。限制/奖励的消费端：
 *  - battleFlow：tp_regen_penalty / friendly_bias_bonus / perfectionist / play_limit /
 *    victory_tp / harsh_extra / reputation_shield / 强制行动钳制；
 *  - runtime.onCardPlayed：music_combo_cost / daily_combo_strength 连击反应；
 *  - persistent 追踪器写入闸：effect_shield 自动拦截敌对写入。
 */
import type { EffectContext } from '@/engine';
import type { PlayerId } from '@/types/battle';
import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';
import { persistentEffects } from '../../systems';

type EffectHandler = (ctx: EffectContext) => void | Promise<void>;

const opponentOf = (playerId: PlayerId): PlayerId =>
  playerId === 'playerA' ? 'playerB' : 'playerA';

const nameOf = (playerId: PlayerId): string => usePlayerStore()[playerId].name;

/**
 * 重置主辩手全部技能冷却（节拍调整/学生会改革）。
 * 跳过 excludeSkillId：发动中的技能不重置自身，否则刚上冷却就被清零，形成无限连发。
 */
function resetActiveCharacterCooldowns(playerId: PlayerId, excludeSkillId?: string) {
  const player = usePlayerStore()[playerId];
  const active = player.characters[player.activeCharacterIndex];
  for (const skill of active?.skills || []) {
    if (skill.id === excludeSkillId) continue;
    if (player.skillCooldowns[skill.id] > 0) player.skillCooldowns[skill.id] = 0;
  }
}

export const contentActives: Record<string, EffectHandler> = {
  /** 本回合所有己方论述+3强度；反噬：下回合 TP 恢复-2（battleFlow.startTurn 消费）。 */
  '惣流_明日香_兰格雷_同步率爆发': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'strength', amount: 3, duration: 1,
      description: '同步率爆发：本回合所有论述+3强度',
    });
    persistentEffects.addRestriction(ctx.playerId, 'tp_regen_penalty', { amount: 2 }, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动同步率爆发！本回合+3强度，下回合TP恢复减少。`, 'event');
    useGameStore().addNotification('同步率爆发：+3强度，下回合TP恢复-2', 'warning');
  },

  /** 本回合奇幻/战斗+2强度；友好安利的议题偏向额外+1（battleFlow.resolveClash 消费）。 */
  '阿尔托莉雅_潘德拉贡_王者威严': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '奇幻', 2, 1);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '战斗', 2, 1);
    persistentEffects.addRestriction(ctx.playerId, 'friendly_bias_bonus', {}, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展现王者威严！奇幻/战斗+2强度，友好安利偏向+1。`, 'event');
    useGameStore().addNotification('王者威严：奇幻/战斗+2强度', 'info');
  },

  /** 本回合每打出一张音乐牌 → 下张卡牌-1费（runtime.onCardPlayed 反应）。 */
  '秋山澪_贝斯节奏': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'music_combo_cost', {}, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 设定贝斯节奏：本回合音乐连击，下张卡牌减费。`, 'event');
    useGameStore().addNotification('贝斯节奏：音乐连击减费', 'info');
  },

  /** 重置主辩手全部技能冷却（不含自身）。 */
  '伊地知虹夏_节拍调整': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    resetActiveCharacterCooldowns(ctx.playerId, ctx.skill?.id);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 进行节拍调整：主辩手技能冷却已重置。`, 'event');
    useGameStore().addNotification('节拍调整：技能冷却重置', 'info');
  },

  /** 本回合己方对撞强度≥对方时额外+1（battleFlow.applyClashStrengthMods 消费）。 */
  '雪之下雪乃_完美主义': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'perfectionist', {}, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展现完美主义：本回合优势对撞额外+1强度。`, 'event');
    useGameStore().addNotification('完美主义：优势对撞+1强度', 'info');
  },

  /** 本回合只能再打出1张牌（battleFlow 出牌闸），该牌+3强度（一次性，出牌即消耗）。 */
  '平泽唯_专注演奏': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'play_limit', { max: 1 }, 1);
    persistentEffects.addTemporaryBonus({
      playerId: ctx.playerId, bonusType: 'strength', amount: 3, duration: 1,
      oneShot: 'next-play', description: '专注演奏：下张卡牌+3强度',
    });
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 专注演奏：本回合限出1张，该牌+3强度。`, 'event');
    useGameStore().addNotification('专注演奏：单牌+3强度', 'info');
  },

  /** 设计调整：原「下3张音乐牌各+1」简化为「本回合及下回合音乐牌+1强度」（跨回合张数无追踪）。 */
  '中野梓_认真练习': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '音乐', 1, 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 认真练习：两回合内音乐卡牌+1强度。`, 'event');
    useGameStore().addNotification('认真练习：音乐+1强度（2回合）', 'info');
  },

  /** 本回合每打出一张日常牌 → 下张卡牌+1强度（runtime.onCardPlayed 反应）。 */
  '山田凉_贝斯律动': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'daily_combo_strength', {}, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 设定贝斯律动：本回合日常连击，下张卡牌强化。`, 'event');
    useGameStore().addNotification('贝斯律动：日常连击强化', 'info');
  },

  /** 战斗/奇幻+2强度（1回合）；副作用：自己被强制只能辛辣点评（battleFlow 风格钳制）。 */
  '艾莉丝_格雷拉特_狂犬突击': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '战斗', 2, 1);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '奇幻', 2, 1);
    persistentEffects.addForcedAction(ctx.playerId, 'harsh_only', 2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动狂犬突击：战斗/奇幻+2强度，但无法友好安利！`, 'event');
    useGameStore().addNotification('狂犬突击：战斗/奇幻+2，强制辛辣', 'warning');
  },

  /** 重置主辩手技能冷却（不含自身）+ 校园+1强度（1回合）。 */
  '坂上智代_学生会改革': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    resetActiveCharacterCooldowns(ctx.playerId, ctx.skill?.id);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 1, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 推行学生会改革：技能冷却重置，校园卡牌+1强度。`, 'event');
    useGameStore().addNotification('学生会改革：冷却重置 + 校园+1', 'info');
  },

  /** 校园+3强度（1回合），代价：本回合只能再打出1张牌。 */
  '高坂丽奈_专业演奏': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 3, 1);
    persistentEffects.addRestriction(ctx.playerId, 'play_limit', { max: 1 }, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 专业演奏：校园卡牌+3强度，本回合限出1张。`, 'event');
    useGameStore().addNotification('专业演奏：校园+3强度，限1张牌', 'info');
  },

  /** 科幻+3强度（1回合）；本回合赢下对撞额外+1TP（battleFlow.resolveClash 消费）。 */
  '亚丝娜_结城明日奈_闪光剑技': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '科幻', 3, 1);
    persistentEffects.addRestriction(ctx.playerId, 'victory_tp', { amount: 1 }, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 发动闪光剑技：科幻+3强度，胜利夺取1TP！`, 'event');
    useGameStore().addNotification('闪光剑技：科幻+3强度', 'info');
  },

  /** 本回合免疫敌对技能效果（effect_shield，追踪器写入闸自动拦截）+ 科幻+1强度。 */
  '碇真嗣_AT力场': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'effect_shield', {}, 1);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '科幻', 1, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展开AT力场：本回合免疫敌对技能效果，科幻+1强度。`, 'event');
    useGameStore().addNotification('AT力场：技能免疫 + 科幻+1', 'info');
  },

  /** 本回合免疫声望损失（battleFlow.resolveClash applyRep 消费）+ 校园+2强度。 */
  '立华奏_天使守护': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addRestriction(ctx.playerId, 'reputation_shield', {}, 1);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 2, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展开天使守护：本回合声望免伤，校园卡牌+2强度。`, 'event');
    useGameStore().addNotification('天使守护：声望免疫 + 校园+2', 'info');
  },

  /** 校园+2强度；本回合辛辣点评且打出校园牌再+1（battleFlow.applyClashStrengthMods 消费）。 */
  '藤林杏_不良委员长': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 2, 1);
    persistentEffects.addRestriction(ctx.playerId, 'harsh_extra', { amount: 1, cardType: '校园' }, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展现不良委员长气场：校园+2强度，辛辣点评再+1。`, 'event');
    useGameStore().addNotification('不良委员长：校园+2，辛辣再+1', 'info');
  },

  /** 战斗+2强度（1回合）；本回合赢下对撞获得2TP。 */
  '史派克_斯皮格尔_截拳道': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '战斗', 2, 1);
    persistentEffects.addRestriction(ctx.playerId, 'victory_tp', { amount: 2 }, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 施展截拳道：战斗+2强度，胜利夺取2TP。`, 'event');
    useGameStore().addNotification('截拳道：战斗+2强度', 'info');
  },

  /** 对手下回合被强制友好安利（敌对限制，受对方 effect_shield 拦截）+ 己方校园+1强度。 */
  '安和昴_偶像魅力': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    const opp = opponentOf(ctx.playerId);
    persistentEffects.addForcedAction(opp, 'friendly_only', 2);
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '校园', 1, 1);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 展现偶像魅力：${nameOf(opp)} 只能友好安利了，校园+1强度。`, 'event');
    useGameStore().addNotification('偶像魅力：强制对手友好安利', 'warning');
  },

  /** 蕾塞（炸弹恶魔）：战斗+3强度（1回合），代价己方声望-2——高爆发带反噬。 */
  '蕾塞_爆弹冲击': (ctx) => {
    if (ctx.event !== 'onPlay') return;
    persistentEffects.addCardTypeStrengthBonus(ctx.playerId, '战斗', 3, 1);
    usePlayerStore().changeReputation(ctx.playerId, -2);
    useHistoryStore().addLog(`${nameOf(ctx.playerId)} 引爆爆弹冲击：战斗卡牌+3强度，代价声望-2。`, 'event');
    useGameStore().addNotification('爆弹冲击：战斗+3强度，声望-2', 'warning');
  },
};
