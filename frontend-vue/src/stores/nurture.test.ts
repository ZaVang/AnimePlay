/**
 * nurture 领域 store 行为测试（S14-C SC-T3 星级/突破 + SC-T4 好感等级化）。
 * 突破消费重复卡（保留本体 1 张）、达上限/卡不足拒绝、每日互动跨天重置、好感溢出转 KP。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNurtureStore } from './nurture';
import { useCollectionStore } from './collection';
import { useProfileStore } from './profile';
import { MAX_BREAKTHROUGH } from '@/engine';
import { BOND_MAX_THRESHOLD, BOND_OVERFLOW_AFFECTION_PER_KP } from '@/config/nurture';

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
