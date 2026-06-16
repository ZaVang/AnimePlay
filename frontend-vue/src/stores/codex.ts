/**
 * codex 领域 store（evolution-1）：图鉴完成度（纯派生）+ 里程碑领取。
 * 完成度遍历 gameDataStore 全量卡 + collection 计数判定，不新存「拥有集合」。
 * 唯一进存档的是已领里程碑 id 数组；发奖走 profile.earn。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  CODEX_MILESTONES,
  getCodexMilestoneById,
  type CodexDomain,
  type CodexMilestoneDef,
} from '@/config/codexMilestones';
import type { Rarity } from '@/types/card';
import { useGameDataStore } from './gameDataStore';
import { useCollectionStore } from './collection';
import { useProfileStore } from './profile';

export interface DomainCompletion {
  owned: number;
  total: number;
  /** 各稀有度的 owned/total。 */
  byRarity: Record<Rarity, { owned: number; total: number }>;
}

const RARITIES: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

export const useCodexStore = defineStore('codex', () => {
  /** 已领里程碑 id（唯一进存档的可变状态）。 */
  const claimedMilestones = ref<string[]>([]);

  /** 计算某域完成度（纯派生：全量卡分母 + collection 计数判 owned）。 */
  function completionFor(domain: CodexDomain): DomainCompletion {
    const gameData = useGameDataStore();
    const collection = useCollectionStore();
    const allCards = domain === 'anime' ? gameData.allAnimeCards : gameData.allCharacterCards;
    const getCount = domain === 'anime' ? collection.getAnimeCardCount : collection.getCharacterCardCount;

    const byRarity = {} as Record<Rarity, { owned: number; total: number }>;
    for (const r of RARITIES) byRarity[r] = { owned: 0, total: 0 };

    let owned = 0;
    for (const card of allCards) {
      const rarity = (card.rarity as Rarity) || 'N';
      if (!byRarity[rarity]) byRarity[rarity] = { owned: 0, total: 0 };
      byRarity[rarity].total++;
      if (getCount(card.id) > 0) {
        owned++;
        byRarity[rarity].owned++;
      }
    }

    return { owned, total: allCards.length, byRarity };
  }

  const animeCompletion = computed(() => completionFor('anime'));
  const characterCompletion = computed(() => completionFor('character'));

  /** 某里程碑是否已达成（纯派生，不看是否已领）。 */
  function isAchieved(milestone: CodexMilestoneDef): boolean {
    const completion = milestone.domain === 'anime' ? animeCompletion.value : characterCompletion.value;
    if (milestone.kind === 'ownedCount') {
      return completion.owned >= (milestone.threshold ?? Infinity);
    }
    // rarityComplete：该稀有度 owned === total 且 total > 0
    const r = milestone.rarity;
    if (!r) return false;
    const rc = completion.byRarity[r];
    return !!rc && rc.total > 0 && rc.owned >= rc.total;
  }

  function isAchievedById(milestoneId: string): boolean {
    const m = getCodexMilestoneById(milestoneId);
    return m ? isAchieved(m) : false;
  }

  function isClaimed(milestoneId: string): boolean {
    return claimedMilestones.value.includes(milestoneId);
  }

  /** 可领取（已达成且未领）的里程碑列表。 */
  const claimableMilestones = computed(() =>
    CODEX_MILESTONES.filter(m => isAchieved(m) && !isClaimed(m.id)),
  );

  /** 领取里程碑奖励。返回是否成功（决定调用方是否存档）。 */
  function claim(milestoneId: string): boolean {
    const milestone = getCodexMilestoneById(milestoneId);
    if (!milestone) return false;
    if (claimedMilestones.value.includes(milestoneId)) return false;
    if (!isAchieved(milestone)) return false;

    const profile = useProfileStore();
    claimedMilestones.value.push(milestoneId);
    profile.earn(milestone.reward.currency, milestone.reward.amount);
    profile.addLog(
      `图鉴里程碑「${milestone.title}」达成！获得 ${milestone.reward.amount} ${profile.currencyName(milestone.reward.currency)}。`,
      'success',
    );
    return true;
  }

  // --- 持久化装配（只存已领里程碑 id） ---

  function serialize(): string[] {
    return claimedMilestones.value;
  }

  function deserialize(data: string[] | null | undefined) {
    claimedMilestones.value = Array.isArray(data) ? data : [];
  }

  function reset() {
    claimedMilestones.value = [];
  }

  return {
    claimedMilestones,
    animeCompletion,
    characterCompletion,
    completionFor,
    isAchieved,
    isAchievedById,
    isClaimed,
    claimableMilestones,
    claim,
    serialize,
    deserialize,
    reset,
  };
});
