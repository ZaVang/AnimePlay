/**
 * S8c 内容批主动技测试：17 个 contentActives handler 经 runEffect 直调
 * （event:'onPlay'；skill 仅冷却重置类用到，统一传入），断言写入侧状态——
 * persistentEffects 的强度加成/限制/强制行动 + playerStore 资源变化。
 * 消费端语义（battleFlow 钳制/结算、runtime 连击反应）由各自模块负责，这里只锁写入。
 * 末段抽查 S8c 补真的 legacy 主动技（customHandlers.legacyHandlers）。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from '../index';
import { persistentEffects, clearBattleSkillState } from '../../systems';
import { usePlayerStore } from '@/stores/battle';
import type { Skill } from '@/types/skill';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { PlayerId } from '@/types/battle';

const animeCard = (id: number, tags: string[] = [], cost = 1): AnimeCard =>
  ({ id, name: `卡${id}`, cost, points: 3, synergy_tags: tags }) as unknown as AnimeCard;

const skillOf = (id: string): Skill =>
  ({ id, name: id, type: '主动技能', description: '', effectId: id }) as Skill;

const charWith = (skills: Skill[]): CharacterCard =>
  ({ id: 1, name: '测试角色', rarity: 'UR', skills }) as unknown as CharacterCard;

/** 主动技触发面（useSkill 的扣费/冷却另有测试）：直调 runEffect 锁 handler 行为。 */
const cast = (effectId: string, playerId: PlayerId = 'playerA') =>
  runEffect(effectId, { event: 'onPlay', playerId, role: 'attacker', skill: skillOf(effectId) });

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState(); // 共享追踪器是模块级单例，逐测清场
});

describe('contentActives：17 个内容批主动技的效果写入', () => {
  it('同步率爆发：全类型+3（1回合）+ 自身TP恢复惩罚（撑过对方回合，己方下回合消费后过期）', async () => {
    await cast('惣流_明日香_兰格雷_同步率爆发');
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(3); // 无类型限定，任意卡都吃
    expect(persistentEffects.getStrengthBonus('playerA', [])).toBe(3);
    expect(persistentEffects.getRestriction('playerA', 'tp_regen_penalty')).toEqual({ amount: 2 });

    persistentEffects.onTurnStart('playerB'); // 对方回合开始：duration 2 → 1，仍在
    expect(persistentEffects.hasRestriction('playerA', 'tp_regen_penalty')).toBe(true);
    persistentEffects.onTurnStart('playerA'); // 己方下回合：startTurn 1.5 已读取，随后递减到 0
    expect(persistentEffects.hasRestriction('playerA', 'tp_regen_penalty')).toBe(false);
  });

  it('王者威严：奇幻/战斗+2，其他类型不沾光；友好偏向加成落旗', async () => {
    await cast('阿尔托莉雅_潘德拉贡_王者威严');
    expect(persistentEffects.getStrengthBonus('playerA', ['奇幻'])).toBe(2);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(2);
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(0);
    expect(persistentEffects.hasRestriction('playerA', 'friendly_bias_bonus')).toBe(true);
  });

  it('贝斯节奏/贝斯律动：连击限制只落在发动方（runtime.onCardPlayed 消费）', async () => {
    await cast('秋山澪_贝斯节奏');
    expect(persistentEffects.hasRestriction('playerA', 'music_combo_cost')).toBe(true);
    expect(persistentEffects.hasRestriction('playerB', 'music_combo_cost')).toBe(false);

    await cast('山田凉_贝斯律动', 'playerB');
    expect(persistentEffects.hasRestriction('playerB', 'daily_combo_strength')).toBe(true);
    expect(persistentEffects.hasRestriction('playerA', 'daily_combo_strength')).toBe(false);
  });

  it('节拍调整：重置主辩手其他技能的冷却', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [
      charWith([skillOf('伊地知虹夏_节拍调整'), skillOf('伊地知虹夏_团队协调')]),
    ];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.skillCooldowns = { 伊地知虹夏_团队协调: 3 };

    await cast('伊地知虹夏_节拍调整');
    expect(playerStore.playerA.skillCooldowns['伊地知虹夏_团队协调']).toBe(0);
  });

  it('节拍调整：不重置自身冷却（防自我无限连发）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [
      charWith([skillOf('伊地知虹夏_节拍调整'), skillOf('伊地知虹夏_团队协调')]),
    ];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.skillCooldowns = { 伊地知虹夏_节拍调整: 2, 伊地知虹夏_团队协调: 3 };

    await cast('伊地知虹夏_节拍调整');
    expect(playerStore.playerA.skillCooldowns['伊地知虹夏_节拍调整']).toBe(2);
    expect(playerStore.playerA.skillCooldowns['伊地知虹夏_团队协调']).toBe(0);
  });

  it('完美主义：perfectionist 落旗（battleFlow 对撞修正消费）', async () => {
    await cast('雪之下雪乃_完美主义');
    expect(persistentEffects.hasRestriction('playerA', 'perfectionist')).toBe(true);
  });

  it('专注演奏：限出1张 + 下张牌+3（一次性，出牌即消耗）', async () => {
    await cast('平泽唯_专注演奏');
    expect(persistentEffects.getRestriction('playerA', 'play_limit')).toEqual({ max: 1 });
    expect(persistentEffects.getStrengthBonus('playerA', ['音乐'])).toBe(3); // 任意类型均吃加成

    persistentEffects.consumeOneShotBonuses('playerA', 'strength', ['音乐']);
    expect(persistentEffects.getStrengthBonus('playerA', ['音乐'])).toBe(0);
  });

  it('认真练习：音乐+1 持续2回合（本回合及下回合）', async () => {
    await cast('中野梓_认真练习');
    expect(persistentEffects.getStrengthBonus('playerA', ['音乐'])).toBe(1);
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(0);

    persistentEffects.onTurnStart('playerB');
    expect(persistentEffects.getStrengthBonus('playerA', ['音乐'])).toBe(1); // 第2个生效回合
    persistentEffects.onTurnStart('playerA');
    expect(persistentEffects.getStrengthBonus('playerA', ['音乐'])).toBe(0);
  });

  it('狂犬突击：战斗/奇幻+2 + 自我强制辛辣', async () => {
    await cast('艾莉丝_格雷拉特_狂犬突击');
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(2);
    expect(persistentEffects.getStrengthBonus('playerA', ['奇幻'])).toBe(2);
    expect(persistentEffects.getForcedAction('playerA')).toBe('harsh_only');
  });

  it('学生会改革：重置其他技能冷却（跳过自身）+ 校园+1', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.characters = [
      charWith([skillOf('坂上智代_学生会改革'), skillOf('坂上智代_领导魅力')]),
    ];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.skillCooldowns = { 坂上智代_学生会改革: 3, 坂上智代_领导魅力: 2 };

    await cast('坂上智代_学生会改革');
    expect(playerStore.playerA.skillCooldowns['坂上智代_领导魅力']).toBe(0);
    expect(playerStore.playerA.skillCooldowns['坂上智代_学生会改革']).toBe(3);
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(1);
  });

  it('专业演奏：校园+3 + 限出1张', async () => {
    await cast('高坂丽奈_专业演奏');
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(3);
    expect(persistentEffects.getRestriction('playerA', 'play_limit')).toEqual({ max: 1 });
  });

  it('闪光剑技：科幻+3 + 胜利夺1TP旗（battleFlow.resolveClash 消费）', async () => {
    await cast('亚丝娜_结城明日奈_闪光剑技');
    expect(persistentEffects.getStrengthBonus('playerA', ['科幻'])).toBe(3);
    expect(persistentEffects.getRestriction('playerA', 'victory_tp')).toEqual({ amount: 1 });
  });

  it('AT力场：效果护盾拦下敌对写入（禁技/负向加成）+ 科幻+1', async () => {
    await cast('碇真嗣_AT力场');
    expect(persistentEffects.hasRestriction('playerA', 'effect_shield')).toBe(true);
    expect(persistentEffects.getStrengthBonus('playerA', ['科幻'])).toBe(1);

    persistentEffects.addSkillDisable('playerA', '*', 2); // 敌对禁技 → 护盾拦截
    expect(persistentEffects.isSkillDisabled('playerA', '任意技能')).toBe(false);
    persistentEffects.addTemporaryBonus({
      playerId: 'playerA', bonusType: 'strength', amount: -2, duration: 1, description: '敌对削弱',
    });
    expect(persistentEffects.getStrengthBonus('playerA', ['科幻'])).toBe(1); // 仍只有自己的+1
  });

  it('天使守护：声望护盾 + 校园+2', async () => {
    await cast('立华奏_天使守护');
    expect(persistentEffects.hasRestriction('playerA', 'reputation_shield')).toBe(true);
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(2);
  });

  it('不良委员长：校园+2 + 辛辣且校园额外+1 旗', async () => {
    await cast('藤林杏_不良委员长');
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(2);
    expect(persistentEffects.getRestriction('playerA', 'harsh_extra')).toEqual({ amount: 1, cardType: '校园' });
  });

  it('截拳道：战斗+2 + 胜利夺2TP旗', async () => {
    await cast('史派克_斯皮格尔_截拳道');
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(2);
    expect(persistentEffects.getRestriction('playerA', 'victory_tp')).toEqual({ amount: 2 });
  });

  it('偶像魅力：强制行动落在对手，校园加成落在己方', async () => {
    await cast('安和昴_偶像魅力');
    expect(persistentEffects.getForcedAction('playerB')).toBe('friendly_only');
    expect(persistentEffects.getForcedAction('playerA')).toBeUndefined();
    expect(persistentEffects.getStrengthBonus('playerA', ['校园'])).toBe(1);
    expect(persistentEffects.getStrengthBonus('playerB', ['校园'])).toBe(0);
  });
});

describe('legacy 主动技 S8c 补真抽查', () => {
  it('和谐演奏：双方各抽1；牌库顶主类型相同 → 己方+2TP', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.maxTp = 10; // changeTp 会被 maxTp 封顶，放宽以观测+2
    playerStore.playerA.tp = 2;
    playerStore.playerA.deck = [animeCard(11, ['日常']), animeCard(12, ['音乐'])];
    playerStore.playerB.deck = [animeCard(21, ['科幻']), animeCard(22, ['音乐', '校园'])];

    await cast('黄前久美子_和谐演奏');
    expect(playerStore.playerA.hand).toHaveLength(1);
    expect(playerStore.playerB.hand).toHaveLength(1);
    expect(playerStore.playerA.tp).toBe(4); // 同抽「音乐」主类型 → +2TP
  });

  it('和谐演奏：主类型不同 → 不给TP', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.maxTp = 10;
    playerStore.playerA.tp = 2;
    playerStore.playerA.deck = [animeCard(11, ['音乐'])];
    playerStore.playerB.deck = [animeCard(21, ['科幻'])];

    await cast('黄前久美子_和谐演奏');
    expect(playerStore.playerA.tp).toBe(2);
  });

  it('吐槽连击：按对手校园手牌数给TP，封顶3', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.maxTp = 10;
    playerStore.playerA.tp = 0;
    playerStore.playerB.hand = [
      animeCard(1, ['校园']), animeCard(2, ['校园']), animeCard(3, ['校园']),
      animeCard(4, ['校园']), animeCard(5, ['日常']),
    ];

    await cast('阿良良木历_吐槽连击');
    expect(playerStore.playerA.tp).toBe(3); // 4张校园 → 封顶3
  });

  it('咬咬攻击：己方手牌≥6 → 对手下张卡牌-2（一次性，出牌即消耗）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [1, 2, 3, 4, 5, 6].map(i => animeCard(i));

    await cast('八九寺真宵_咬咬攻击');
    expect(persistentEffects.getStrengthBonus('playerB', ['日常'])).toBe(-2);

    persistentEffects.consumeOneShotBonuses('playerB', 'strength', ['日常']);
    expect(persistentEffects.getStrengthBonus('playerB', ['日常'])).toBe(0);
  });

  it('圣剑解放：奇幻/战斗+4强度 + 己方声望-3（补真：原 +4 强度只播报未落地）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.reputation = 20;
    await cast('珂朵莉_诺塔_瑟尼欧里斯_圣剑解放');
    expect(persistentEffects.getStrengthBonus('playerA', ['奇幻'])).toBe(4);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(4);
    expect(persistentEffects.getStrengthBonus('playerA', ['日常'])).toBe(0);
    expect(playerStore.playerA.reputation).toBe(17);
  });

  it('精灵加护：双方声望+3 + 己方奇幻+1强度（补真：原奇幻+1只播报未落地）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.reputation = 20;
    playerStore.playerB.reputation = 20;
    await cast('艾米莉娅_精灵加护');
    expect(playerStore.playerA.reputation).toBe(23);
    expect(playerStore.playerB.reputation).toBe(23);
    expect(persistentEffects.getStrengthBonus('playerA', ['奇幻'])).toBe(1);
    expect(persistentEffects.getStrengthBonus('playerA', ['战斗'])).toBe(0);
  });

  it('魔法指导：选中手牌被真实标记 __treatedAsAnyType（替代原零消费的 card_type_override）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.hand = [animeCard(1, ['奇幻']), animeCard(2, ['战斗'])];
    await cast('洛琪希_米格路迪亚_格雷拉特_魔法指导'); // 无 UI 时 selectFromHand 取 hand[0]
    expect((playerStore.playerA.hand[0] as { __treatedAsAnyType?: boolean }).__treatedAsAnyType).toBe(true);
    expect((playerStore.playerA.hand[1] as { __treatedAsAnyType?: boolean }).__treatedAsAnyType).toBeUndefined();
  });
});
