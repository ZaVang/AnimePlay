<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useCodexStore } from '@/stores/codex';
import { useProfileStore } from '@/stores/profile';
import { CODEX_MILESTONES } from '@/config/codexMilestones';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import type { AnimeCard as AnimeCardType, CharacterCard as CharacterCardType, Rarity } from '@/types/card';
import VirtualGrid from '@/components/VirtualGrid.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const collection = useCollectionStore();
const codex = useCodexStore();
const profile = useProfileStore();

// 图鉴内部子 tab：动画 / 角色
const codexDomain = ref<'anime' | 'character'>('character');

const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

// --- 图鉴一览筛选（关键字 / 稀有度 / 标签 / 拥有状态）---
const search = ref('');
const filterRarity = ref<Rarity | 'all'>('all');
const filterTag = ref('all');
const filterOwned = ref<'all' | 'owned' | 'unowned'>('all');

/** 动画域所有 synergy 标签（去重排序），仅用于动画图鉴的标签下拉。 */
const allAnimeTags = computed(() => {
  const tags = new Set<string>();
  for (const card of gameDataStore.allAnimeCards) {
    for (const t of card.synergy_tags ?? []) tags.add(t);
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
});

// 切换动画/角色子域时重置筛选，避免残留无效条件（如角色域选了动画标签）。
watch(codexDomain, () => {
  search.value = '';
  filterRarity.value = 'all';
  filterTag.value = 'all';
  filterOwned.value = 'all';
});

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

/** 全量卡 + owned 标记，应用关键字/稀有度/标签/拥有筛选后按稀有度→名称排序。 */
const codexCards = computed(() => {
  if (!userStore.isLoggedIn) return [];
  const allCards = codexDomain.value === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  const getCount = codexDomain.value === 'anime' ? collection.getAnimeCardCount : collection.getCharacterCardCount;
  const kw = search.value.trim().toLowerCase();

  const withOwned = allCards
    .map(card => ({ ...card, owned: getCount(card.id) > 0 }))
    .filter(card => {
      // 关键字：名称；角色域附带按登场作品名匹配。
      if (kw) {
        const inName = card.name.toLowerCase().includes(kw);
        const inAnime =
          codexDomain.value === 'character' &&
          ((card as CharacterCardType).anime_names ?? []).some(n => n.toLowerCase().includes(kw));
        if (!inName && !inAnime) return false;
      }
      // 稀有度
      if (filterRarity.value !== 'all' && card.rarity !== filterRarity.value) return false;
      // 标签（仅动画域）
      if (codexDomain.value === 'anime' && filterTag.value !== 'all') {
        if (!((card as AnimeCardType).synergy_tags ?? []).includes(filterTag.value)) return false;
      }
      // 拥有状态
      if (filterOwned.value === 'owned' && !card.owned) return false;
      if (filterOwned.value === 'unowned' && card.owned) return false;
      return true;
    });

  return withOwned.sort((a, b) => {
    const ra = rarityOrder.indexOf(a.rarity);
    const rb = rarityOrder.indexOf(b.rarity);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  });
});

/** 当前域全量卡数（用于「筛选出 X / 总 Y」展示）。 */
const codexTotalCount = computed(() =>
  codexDomain.value === 'anime' ? gameDataStore.allAnimeCards.length : gameDataStore.allCharacterCards.length,
);

/** 是否有任一筛选条件生效（用于空态文案 + 一键清除）。 */
const hasActiveFilter = computed(
  () =>
    search.value.trim() !== '' ||
    filterRarity.value !== 'all' ||
    filterTag.value !== 'all' ||
    filterOwned.value !== 'all',
);

function clearFilters() {
  search.value = '';
  filterRarity.value = 'all';
  filterTag.value = 'all';
  filterOwned.value = 'all';
}

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

// --- 定向解锁（evolution-2 / E2-T1）：灰位未拥有卡花知识点直接入库 ---

/** 玩家当前知识点（解锁出口的预算）。 */
const knowledgePoints = computed(() => profile.core.knowledgePoints);

type CodexGridCard = AnimeCardType & { owned: boolean };

/** 某卡的定向解锁价（按稀有度取）。 */
function unlockPrice(card: { rarity: Rarity }): number {
  return getCodexUnlockPrice(card.rarity);
}

/** 余额是否够解锁该卡。 */
function canAfford(card: { rarity: Rarity }): boolean {
  return knowledgePoints.value >= unlockPrice(card);
}

/** 点击灰位卡 → 确认（显示价格）→ 调门面解锁。已拥有的卡不触发。 */
function handleUnlock(card: CodexGridCard) {
  if (card.owned) return;
  const price = unlockPrice(card);
  if (!canAfford(card)) {
    alert(`知识点不足，解锁 [${card.rarity}] ${card.name} 需 ${price} 知识点（你当前有 ${knowledgePoints.value}）。`);
    return;
  }
  if (!confirm(`花费 ${price} 知识点定向解锁 [${card.rarity}] ${card.name}？\n你当前有 ${knowledgePoints.value} 知识点。`)) {
    return;
  }
  userStore.unlockCodexCard(card.id, codexDomain.value);
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
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h4 class="font-bold text-ink text-lg">图鉴一览（点击灰位卡可花知识点解锁）</h4>
          <span class="text-sm text-ink-2">我的知识点：<span class="font-bold text-accent">{{ knowledgePoints }}</span></span>
        </div>

        <!-- 筛选条：关键字 / 稀有度 / 标签（仅动画）/ 拥有状态 -->
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <input
            type="text"
            v-model="search"
            :placeholder="codexDomain === 'character' ? '搜角色名或登场作品…' : '搜动画名称…'"
            class="p-2 border border-line rounded-lg flex-grow min-w-0 text-ink bg-surface"
          />
          <select v-model="filterRarity" class="p-2 border border-line rounded-lg text-ink bg-surface">
            <option value="all">所有稀有度</option>
            <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}</option>
          </select>
          <select
            v-if="codexDomain === 'anime'"
            v-model="filterTag"
            class="p-2 border border-line rounded-lg text-ink bg-surface"
          >
            <option value="all">所有标签</option>
            <option v-for="tag in allAnimeTags" :key="tag" :value="tag">{{ tag }}</option>
          </select>
          <select v-model="filterOwned" class="p-2 border border-line rounded-lg text-ink bg-surface">
            <option value="all">全部</option>
            <option value="owned">已拥有</option>
            <option value="unowned">未拥有</option>
          </select>
          <button
            v-if="hasActiveFilter"
            class="btn-ghost text-sm px-3 py-2"
            @click="clearFilters"
          >清除筛选</button>
        </div>
        <p class="text-sm text-ink-2 mb-3">筛选出 {{ codexCards.length }} / {{ codexTotalCount }} 张</p>

        <div v-if="codexCards.length === 0" class="text-center py-12 text-ink-2">
          <p class="font-medium">没有符合条件的卡牌。</p>
          <button v-if="hasActiveFilter" class="btn-secondary text-sm px-3 py-1.5 mt-3" @click="clearFilters">
            清除筛选
          </button>
        </div>
        <VirtualGrid
          v-else
          :items="codexCards"
          :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
          :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
          :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
          :gap="VIRTUAL_GRID_CONFIG.gap"
        >
          <template #default="{ item }">
            <div
              class="bg-surface rounded-lg shadow-md overflow-hidden relative h-full"
              :class="[
                !(item as CodexGridCard).owned ? 'opacity-40 grayscale' : '',
                !(item as CodexGridCard).owned ? 'cursor-pointer hover:opacity-60 transition-opacity' : '',
              ]"
              :title="!(item as CodexGridCard).owned ? `花 ${unlockPrice(item)} 知识点解锁` : ''"
              @click="handleUnlock(item as CodexGridCard)"
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
                v-if="!(item as CodexGridCard).owned"
                class="absolute inset-0 flex flex-col items-center justify-center gap-1"
              >
                <span class="text-ink-2 text-xs font-bold bg-surface/80 px-2 py-1 rounded">未拥有</span>
                <span
                  class="text-xs font-bold px-2 py-0.5 rounded bg-surface/85"
                  :class="canAfford(item) ? 'text-accent' : 'text-ink-2'"
                >🔓 {{ unlockPrice(item) }} 知识点</span>
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
