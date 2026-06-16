<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useCodexStore } from '@/stores/codex';
import { useProfileStore } from '@/stores/profile';
import { CODEX_MILESTONES } from '@/config/codexMilestones';
import type { AnimeCard as AnimeCardType, Rarity } from '@/types/card';
import VirtualGrid from '@/components/VirtualGrid.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const collection = useCollectionStore();
const codex = useCodexStore();
const profile = useProfileStore();

// 图鉴内部子 tab：动画 / 角色
const codexDomain = ref<'anime' | 'character'>('character');

const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

// 虚拟化配置（与 CollectionsView 一致）
const VIRTUAL_GRID_CONFIG = {
  itemHeight: 180,
  containerHeight: 600,
  minItemWidth: 100,
  gap: 16,
};

const completion = computed(() =>
  codexDomain.value === 'anime' ? codex.animeCompletion : codex.characterCompletion,
);

/** 全量卡 + owned 标记，按稀有度→名称排序。 */
const codexCards = computed(() => {
  if (!userStore.isLoggedIn) return [];
  const allCards = codexDomain.value === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  const getCount = codexDomain.value === 'anime' ? collection.getAnimeCardCount : collection.getCharacterCardCount;

  const withOwned = allCards.map(card => ({
    ...card,
    owned: getCount(card.id) > 0,
  }));

  return withOwned.sort((a, b) => {
    const ra = rarityOrder.indexOf(a.rarity);
    const rb = rarityOrder.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
});

const overallPercent = computed(() => {
  const c = completion.value;
  return c.total > 0 ? Math.round((c.owned / c.total) * 100) : 0;
});

/** 各稀有度完成度（只展示该域实际存在的稀有度）。 */
const rarityRows = computed(() =>
  rarityOrder
    .map(r => ({ rarity: r, ...completion.value.byRarity[r] }))
    .filter(row => row.total > 0),
);

const milestones = computed(() =>
  CODEX_MILESTONES.filter(m => m.domain === codexDomain.value).map(m => ({
    ...m,
    achieved: codex.isAchieved(m),
    claimed: codex.isClaimed(m.id),
    rewardText: `${m.reward.amount} ${profile.currencyName(m.reward.currency)}`,
  })),
);

function imageSrc(card: { id: number }): string {
  return `/data/images/${codexDomain.value}/${card.id}.jpg`;
}

function claimMilestone(id: string) {
  userStore.claimCodexMilestone(id);
}
</script>

<template>
  <div>
    <div v-if="!userStore.isLoggedIn" class="text-center py-12">
      <p class="text-ink-2 text-lg font-medium">请先登录以查看图鉴完成度。</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Domain sub-tabs -->
      <div class="flex gap-3">
        <button
          class="px-4 py-2 rounded-lg font-medium text-sm border"
          :class="codexDomain === 'character'
            ? 'bg-accent text-on-accent border-accent'
            : 'bg-surface text-ink-2 border-line hover:text-ink'"
          @click="codexDomain = 'character'"
        >角色图鉴</button>
        <button
          class="px-4 py-2 rounded-lg font-medium text-sm border"
          :class="codexDomain === 'anime'
            ? 'bg-accent text-on-accent border-accent'
            : 'bg-surface text-ink-2 border-line hover:text-ink'"
          @click="codexDomain = 'anime'"
        >动画图鉴</button>
      </div>

      <!-- Overall completion -->
      <div class="bg-surface rounded-lg p-5 border border-line">
        <div class="flex justify-between items-end mb-2">
          <span class="font-bold text-ink text-lg">总完成度</span>
          <span class="text-sm text-ink-2">{{ completion.owned }} / {{ completion.total }}（{{ overallPercent }}%）</span>
        </div>
        <div class="w-full bg-surface-2 rounded-full h-4 border border-line overflow-hidden">
          <div class="bg-accent h-full rounded-full transition-all duration-500" :style="{ width: overallPercent + '%' }"></div>
        </div>

        <!-- Per-rarity bars -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-5">
          <div v-for="row in rarityRows" :key="row.rarity">
            <div class="flex justify-between text-sm mb-1">
              <span class="font-bold text-ink">{{ row.rarity }}</span>
              <span class="text-ink-2">{{ row.owned }} / {{ row.total }}</span>
            </div>
            <div class="w-full bg-surface-2 rounded-full h-2 border border-line overflow-hidden">
              <div
                class="bg-accent h-full rounded-full transition-all duration-500"
                :style="{ width: (row.total > 0 ? (row.owned / row.total) * 100 : 0) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Milestones -->
      <div class="bg-surface rounded-lg p-5 border border-line">
        <h4 class="font-bold text-ink text-lg mb-3">收集里程碑</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="m in milestones"
            :key="m.id"
            class="bg-surface-2 rounded-lg p-3 flex items-center gap-3"
            :class="{ 'opacity-60': !m.achieved }"
          >
            <div class="flex-1 min-w-0">
              <p class="font-bold text-ink truncate">{{ m.title }}</p>
              <p class="text-sm text-ink-2">{{ m.description }} · 奖励 {{ m.rewardText }}</p>
            </div>
            <div class="shrink-0">
              <span v-if="m.claimed" class="text-sm font-bold text-ink-2">已领取</span>
              <button
                v-else
                class="btn-primary text-sm px-3 py-1.5"
                :disabled="!m.achieved"
                :class="{ 'opacity-45 cursor-not-allowed': !m.achieved }"
                @click="claimMilestone(m.id)"
              >{{ m.achieved ? '领取' : '未达成' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Full grid with gray-out for unowned (VirtualGrid) -->
      <div class="bg-surface rounded-lg p-5 border border-line">
        <h4 class="font-bold text-ink text-lg mb-3">图鉴一览（灰位为未拥有）</h4>
        <VirtualGrid
          :items="codexCards"
          :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
          :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
          :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
          :gap="VIRTUAL_GRID_CONFIG.gap"
        >
          <template #default="{ item }">
            <div
              class="bg-surface rounded-lg shadow-md overflow-hidden relative h-full"
              :class="{ 'opacity-40 grayscale': !(item as AnimeCardType & { owned: boolean }).owned }"
            >
              <img
                loading="lazy"
                decoding="async"
                :src="imageSrc(item)"
                class="w-full aspect-[2/3] object-cover object-top"
              />
              <div class="absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white bg-black/60 rounded">
                {{ item.rarity }}
              </div>
              <div
                v-if="!(item as AnimeCardType & { owned: boolean }).owned"
                class="absolute inset-0 flex items-center justify-center"
              >
                <span class="text-ink-2 text-xs font-bold bg-surface/80 px-2 py-1 rounded">未拥有</span>
              </div>
              <div class="p-2">
                <p class="text-xs text-center font-bold truncate text-ink" :title="item.name">{{ item.name }}</p>
              </div>
            </div>
          </template>
        </VirtualGrid>
      </div>
    </div>
  </div>
</template>
