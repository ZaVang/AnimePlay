<script setup lang="ts">
/**
 * 番剧年表时间轴（B2）。纯派生：遍历已拥有动画 → 取 gameDataStore 的 date 字段 → 按放送年分组。
 * 零存档、零后端。date 缺失/非标准归「未知」，用 /^\d{4}$/ 守卫年份。颜色全语义类。
 */
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { AnimeCard as AnimeCardType, Rarity } from '@/types/card';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const UNKNOWN_YEAR = '未知';
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

interface YearGroup {
  year: string;
  cards: AnimeCardType[];
}

/** 从已拥有动画收藏派生按年分组（年降序，组内按稀有度后名称）。 */
const yearGroups = computed<YearGroup[]>(() => {
  if (!userStore.isLoggedIn) return [];

  const byYear = new Map<string, AnimeCardType[]>();
  for (const [id] of userStore.animeCollection.entries()) {
    const card = gameDataStore.getAnimeCardById(id);
    if (!card) continue;
    const raw = typeof card.date === 'string' ? card.date.slice(0, 4) : '';
    const year = /^\d{4}$/.test(raw) ? raw : UNKNOWN_YEAR;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(card);
  }

  const groups: YearGroup[] = [];
  for (const [year, cards] of byYear.entries()) {
    cards.sort((a, b) => {
      const ra = rarityOrder.indexOf(a.rarity);
      const rb = rarityOrder.indexOf(b.rarity);
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
    groups.push({ year, cards });
  }

  // 年降序排列；「未知」永远沉底。
  groups.sort((a, b) => {
    if (a.year === UNKNOWN_YEAR) return 1;
    if (b.year === UNKNOWN_YEAR) return -1;
    return Number(b.year) - Number(a.year);
  });
  return groups;
});

const totalOwned = computed(() => yearGroups.value.reduce((sum, g) => sum + g.cards.length, 0));
const knownYearCount = computed(() => yearGroups.value.filter(g => g.year !== UNKNOWN_YEAR).length);

/**
 * 稀有度识别色（属铁律允许的「稀有度识别色固定例外」）。
 * 复用 GAME_CONFIG.animeSystem.rarityConfig.c（全站稀有度渐变的唯一来源），配 bg-gradient-to-br 成色点。
 */
function rarityDotClass(rarity: Rarity): string {
  return GAME_CONFIG.animeSystem.rarityConfig[rarity]?.c || 'from-gray-400 to-gray-600';
}
</script>

<template>
  <div>
    <div v-if="!userStore.isLoggedIn" class="text-center py-12">
      <p class="text-ink-2 text-lg font-medium">请先登录以查看番剧年表。</p>
    </div>

    <div v-else-if="yearGroups.length === 0" class="text-center py-12">
      <p class="text-ink-2 text-lg font-medium mb-1">还没有可以排进年表的番剧</p>
      <p class="text-ink-3 text-sm">去抽卡收集番剧，它们会按放送年份排成时间轴。</p>
    </div>

    <div v-else>
      <p class="text-sm text-ink-2 mb-6">
        共 {{ totalOwned }} 部番剧，跨越 {{ knownYearCount }} 个年份。
      </p>

      <!-- 时间轴：每年一段，左侧年份节点 + 竖线，右侧该年番剧 -->
      <div class="relative pl-6 border-l-2 border-line space-y-8">
        <div v-for="group in yearGroups" :key="group.year" class="relative">
          <!-- 年份节点 -->
          <span
            class="absolute -left-[1.65rem] top-1 w-4 h-4 rounded-full bg-accent border-2 border-surface"
            aria-hidden="true"
          ></span>

          <div class="flex items-baseline gap-3 mb-3">
            <h3 class="text-xl font-bold text-accent">{{ group.year }}</h3>
            <span class="text-xs text-ink-3">{{ group.cards.length }} 部</span>
          </div>

          <ul class="flex flex-wrap gap-2">
            <li
              v-for="card in group.cards"
              :key="card.id"
              class="flex items-center gap-2 bg-surface-2 border border-line rounded-lg px-3 py-1.5"
            >
              <span class="w-2 h-2 rounded-full shrink-0 bg-gradient-to-br" :class="rarityDotClass(card.rarity)" aria-hidden="true"></span>
              <span class="text-sm text-ink truncate max-w-[12rem]">{{ card.name }}</span>
              <span class="text-[0.65rem] text-ink-3 shrink-0">{{ card.rarity }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
