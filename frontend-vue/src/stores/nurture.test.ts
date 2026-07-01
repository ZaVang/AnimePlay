/**
 * nurture 领域 store 行为测试（S14-C SC-T3 星级/突破 + SC-T4 好感等级化）。
 * 突破消费重复卡（保留本体 1 张）、达上限/卡不足拒绝、每日互动跨天重置、好感溢出转 KP。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNurtureStore } from './nurture';
import { useCollectionStore } from './collection';
import { useProfileStore } from './profile';
import { MAX_BREAKTHROUGH, MAX_CHARACTER_LEVEL, getRequiredExpForLevel } from '@/engine';
import {
  BOND_MAX_THRESHOLD,
  BOND_OVERFLOW_AFFECTION_PER_KP,
  TUTORING_KP_COST,
  tutoringExpGain,
  EXP_OVERFLOW_PER_KP,
} from '@/config/nurture';

const CHAR = 12393;

beforeEach(() => {
  setActivePinia(createPinia());
  useProfileStore().currentUser = 'tester';
});

/** 给该角色塞 n 张卡（count=n）。 */
function ownCards(n: number) {
  const collection = useCollectionStore();
  for (let i = 0; i < n; i++) collection.addCard(CHAR, 'character');
}

describe('SC-T3 breakthroughCharacter（消化重复卡，保留本体）', () => {
  it('可用重复卡足够 → 突破成功，扣卡但保留本体 1 张', () => {
    const nurture = useNurtureStore();
    const collection = useCollectionStore();
    ownCards(3); // 本体 1 + 重复 2；到 1 星需 1 张
    expect(nurture.breakthroughCharacter(CHAR)).toBe(true);
    expect(nurture.getNurtureData(CHAR).breakthrough).toBe(1);
    expect(collection.getCharacterCardCount(CHAR)).toBe(2); // 3 - 1
  });

  it('只有本体 1 张 → 拒绝（绝不扣到 0，防连锁炸编队/塔准入）', () => {
    const nurture = useNurtureStore();
    const collection = useCollectionStore();
    ownCards(1);
    expect(nurture.breakthroughCharacter(CHAR)).toBe(false);
    expect(nurture.getNurtureData(CHAR).breakthrough).toBe(0);
    expect(collection.getCharacterCardCount(CHAR)).toBe(1); // 本体不动
  });

  it('重复卡不足下一星 cost → 拒绝', () => {
    const nurture = useNurtureStore();
    // 先突破到 1 星（需 1 张重复），再试 2 星（需 2 张）但只剩 1 张重复
    ownCards(3); // 本体1 + 重复2
    expect(nurture.breakthroughCharacter(CHAR)).toBe(true); // → 1 星，剩 count=2（重复1）
    expect(nurture.breakthroughCharacter(CHAR)).toBe(false); // 2 星需 2 张重复，只有 1
    expect(nurture.getNurtureData(CHAR).breakthrough).toBe(1);
  });

  it('满星后拒绝（即使卡再多）', () => {
    const nurture = useNurtureStore();
    ownCards(30); // 足够 1+2+3+4+5=15 张 + 富余
    for (let i = 0; i < MAX_BREAKTHROUGH; i++) {
      expect(nurture.breakthroughCharacter(CHAR)).toBe(true);
    }
    expect(nurture.getNurtureData(CHAR).breakthrough).toBe(MAX_BREAKTHROUGH);
    expect(nurture.breakthroughCharacter(CHAR)).toBe(false); // 满星
    // 5 星累计消耗 15 张，本体保留：30 - 15 = 15
    expect(useCollectionStore().getCharacterCardCount(CHAR)).toBe(15);
  });

  it('未登录 → 拒绝', () => {
    useProfileStore().currentUser = '';
    const nurture = useNurtureStore();
    ownCards(5);
    expect(nurture.breakthroughCharacter(CHAR)).toBe(false);
  });
});

describe('SC-T4 每日好感互动（跨天重置）', () => {
  it('首次互动成功给好感，同日再互动拒绝', () => {
    const nurture = useNurtureStore();
    expect(nurture.canDailyBondInteract(CHAR)).toBe(true);
    expect(nurture.dailyBondInteraction(CHAR)).toBe(true);
    expect(nurture.getNurtureData(CHAR).affection).toBeGreaterThan(0);
    expect(nurture.canDailyBondInteract(CHAR)).toBe(false);
    expect(nurture.dailyBondInteraction(CHAR)).toBe(false);
  });

  it('跨天（lastBondInteractionDate 非今天）→ 可再互动', () => {
    const nurture = useNurtureStore();
    const data = nurture.getNurtureData(CHAR);
    data.lastBondInteractionDate = '2000-1-1'; // 陈旧日期
    expect(nurture.canDailyBondInteract(CHAR)).toBe(true);
    expect(nurture.dailyBondInteraction(CHAR)).toBe(true);
  });
});

describe('SC-T4 好感溢出转 KP', () => {
  it('领完最高档后溢出整份兑 KP，扣对应好感，余数保留', () => {
    const nurture = useNurtureStore();
    const profile = useProfileStore();
    const kpBefore = profile.core.knowledgePoints;
    const data = nurture.getNurtureData(CHAR);
    // 最高档阈值 + 2.5 份溢出 + 余数
    data.affection = BOND_MAX_THRESHOLD + BOND_OVERFLOW_AFFECTION_PER_KP * 2 + 7;
    const kp = nurture.claimBondOverflow(CHAR);
    expect(kp).toBe(2);
    expect(profile.core.knowledgePoints).toBe(kpBefore + 2);
    // 扣掉 2 份好感，余数 7 保留
    expect(data.affection).toBe(BOND_MAX_THRESHOLD + 7);
  });

  it('未过最高档 → 不兑换、不变更', () => {
    const nurture = useNurtureStore();
    const data = nurture.getNurtureData(CHAR);
    data.affection = BOND_MAX_THRESHOLD - 1;
    expect(nurture.claimBondOverflow(CHAR)).toBe(0);
    expect(data.affection).toBe(BOND_MAX_THRESHOLD - 1);
  });
});

describe('SD-T4 补习产出随等级递增（tutoringExpGain）', () => {
  it('高等级补习经验多于低等级（严格递增，量级匹配新曲线）', () => {
    expect(tutoringExpGain(50)).toBeGreaterThan(tutoringExpGain(1));
    expect(tutoringExpGain(99)).toBeGreaterThan(tutoringExpGain(50));
  });

  it('tutorCharacter 按当前等级发放递增经验（走 profile.spend 扣 KP）', () => {
    const nurture = useNurtureStore();
    const profile = useProfileStore();
    profile.earn('knowledgePoints', 10000);
    const data = nurture.getNurtureData(CHAR);
    // 拉到一个中间等级再补习：注入足够经验到 Lv.20 附近
    data.totalExperience = getRequiredExpForLevel(20);
    data.level = 20;
    const kpBefore = profile.core.knowledgePoints;
    const expBefore = data.totalExperience;
    expect(nurture.tutorCharacter(CHAR)).toBe(true);
    expect(profile.core.knowledgePoints).toBe(kpBefore - TUTORING_KP_COST);
    expect(data.totalExperience).toBe(expBefore + tutoringExpGain(20));
  });
});

describe('SD-T4 满级经验溢出自动转 KP（addCharacterExp 满级分支）', () => {
  it('满级角色继续吃经验 → 溢出满一份自动 earn KP（不再净沉没）', () => {
    const nurture = useNurtureStore();
    const profile = useProfileStore();
    const data = nurture.getNurtureData(CHAR);
    // 推到满级
    data.totalExperience = getRequiredExpForLevel(MAX_CHARACTER_LEVEL);
    data.level = MAX_CHARACTER_LEVEL;
    const kpBefore = profile.core.knowledgePoints;
    // 灌入正好 2 份溢出的经验
    nurture.addCharacterExp(CHAR, EXP_OVERFLOW_PER_KP * 2);
    expect(profile.core.knowledgePoints).toBe(kpBefore + 2);
    expect(data.level).toBe(MAX_CHARACTER_LEVEL); // 仍满级
  });

  it('未满一份的溢出结转累加，跨次灌入满一份才兑', () => {
    const nurture = useNurtureStore();
    const profile = useProfileStore();
    const data = nurture.getNurtureData(CHAR);
    data.totalExperience = getRequiredExpForLevel(MAX_CHARACTER_LEVEL);
    data.level = MAX_CHARACTER_LEVEL;
    const kpBefore = profile.core.knowledgePoints;
    nurture.addCharacterExp(CHAR, EXP_OVERFLOW_PER_KP - 100); // 不足一份
    expect(profile.core.knowledgePoints).toBe(kpBefore); // 未兑
    nurture.addCharacterExp(CHAR, 100); // 补满一份
    expect(profile.core.knowledgePoints).toBe(kpBefore + 1);
  });

  it('未满级角色不触发溢出（正常升级路径）', () => {
    const nurture = useNurtureStore();
    const profile = useProfileStore();
    const kpBefore = profile.core.knowledgePoints;
    nurture.addCharacterExp(CHAR, EXP_OVERFLOW_PER_KP * 3); // 大量经验但未满级
    expect(nurture.getNurtureData(CHAR).level).toBeLessThan(MAX_CHARACTER_LEVEL);
    expect(profile.core.knowledgePoints).toBe(kpBefore); // 未满级 → 不兑 KP
  });
});

describe('SC-T3 collection.consumeCharacterCards（扣卡收口，防呆）', () => {
  it('保留本体 1 张：可消耗 = count - 1', () => {
    const collection = useCollectionStore();
    ownCards(3);
    expect(collection.consumeCharacterCards(CHAR, 2)).toBe(true);
    expect(collection.getCharacterCardCount(CHAR)).toBe(1);
    // 再扣任何数量都失败（本体保留）
    expect(collection.consumeCharacterCards(CHAR, 1)).toBe(false);
    expect(collection.getCharacterCardCount(CHAR)).toBe(1);
  });

  it('数量非法 / 不存在的卡 → false', () => {
    const collection = useCollectionStore();
    ownCards(3);
    expect(collection.consumeCharacterCards(CHAR, 0)).toBe(false);
    expect(collection.consumeCharacterCards(CHAR, -1)).toBe(false);
    expect(collection.consumeCharacterCards(999999, 1)).toBe(false);
  });
});
