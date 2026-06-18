<script setup lang="ts">
/**
 * 番剧品味画像（小游戏 #5，evolution-10）。
 * 玩法：勾选「看过」的番剧 → 生成一份品味分析报告（题材/年代/来源/评分/小众指数 + 人格标签）。
 * 纯分析（buildTasteReport，可单测）；勾选集持久化（minigames.tasteProfile，存档 v12）。
 */
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import { buildTasteReport } from '@/utils/tasteProfile';
import type { AnimeCard } from '@/types/card';
import VirtualGrid from '@/components/VirtualGrid.vue';

const userStore = useUserStore();
const gameData = useGameDataStore();
const minigames = useMiniGamesStore();

const view = ref<'pick' | 'report'>('pick');
const search = ref('');
const onlyWatched = ref(false);

const allAnime = computed(() => gameData.allAnimeCards);
const watchedCount = computed(() => minigames.tasteWatchedCount);

function isWatched(id: number): boolean {
  return minigames.tasteWatchedIds.has(id);
}

/** 选番列表：关键字 + 「只看已选」过滤，按已选优先→名称排序。 */
const pickList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  return allAnime.value
    .filter(a => {
      if (onlyWatched.value && !isWatched(a.id)) return false;
      if (kw && !a.name.toLowerCase().includes(kw)) return false;
      return true;
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const watchedAnime = computed<AnimeCard[]>(() => allAnime.value.filter(a => isWatched(a.id)));
const report = computed(() => buildTasteReport(watchedAnime.value, allAnime.value));

function toggle(item: AnimeCard) {
  userStore.toggleTasteWatched(item.id);
}

function clearAll() {
  if (watchedCount.value === 0) return;
  if (confirm(`确定清空全部 ${watchedCount.value} 条观看记录？`)) {
    userStore.clearTasteWatched();
  }
}

function showReport() {
  if (watchedCount.value > 0) view.value = 'report';
}

function imageSrc(id: number): string {
  return `/data/images/anime/${id}.jpg`;
}

const VIRTUAL_GRID_CONFIG = { itemHeight: 170, containerHeight: 460, minItemWidth: 96, gap: 12 };

/** 评分对比文案。 */
const ratingDeltaText = computed(() => {
  const d = report.value.ratingDelta;
  if (d === null) return '';
  if (d > 0) return `高于大盘 +${d.toFixed(1)}`;
  if (d < 0) return `低于大盘 ${d.toFixed(1)}`;
  return '与大盘持平';
});
</script>

<template>
  <div class="taste">
    <!-- 选番模式 -->
    <div v-if="view === 'pick'">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 class="text-lg font-bold text-ink">📊 番剧品味画像</h3>
          <p class="text-sm text-ink-2">勾选你看过的番剧，生成专属品味报告。</p>
        </div>
        <div class="text-sm text-ink-2">已选 <span class="font-bold text-accent">{{ watchedCount }}</span> / {{ allAnime.length }}</div>
      </div>

      <p v-if="!userStore.isLoggedIn" class="text-xs text-warning mb-3">⚠️ 未登录，勾选仅本次会话有效；登录后可永久保存观看记录。</p>

      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input
          v-model="search"
          type="text"
          placeholder="搜番剧名称…"
          class="p-2 border border-line rounded-lg flex-grow min-w-0 text-ink bg-surface"
        />
        <label class="flex items-center gap-1.5 text-sm text-ink-2 select-none cursor-pointer">
          <input type="checkbox" v-model="onlyWatched" /> 只看已选
        </label>
        <button v-if="watchedCount > 0" class="btn-ghost text-sm px-3 py-2" @click="clearAll">清空</button>
        <button
          class="btn-primary text-sm px-4 py-2"
          :class="{ 'opacity-45 cursor-not-allowed': watchedCount === 0 }"
          :disabled="watchedCount === 0"
          @click="showReport"
        >生成画像 →</button>
      </div>

      <div v-if="pickList.length === 0" class="text-center py-10 text-ink-2">
        <p>没有符合条件的番剧。</p>
      </div>
      <VirtualGrid
        v-else
        :items="pickList"
        :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
        :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
        :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
        :gap="VIRTUAL_GRID_CONFIG.gap"
        @item-click="toggle($event as AnimeCard)"
      >
        <template #default="{ item }">
          <div class="pick-card" :class="{ selected: isWatched(item.id) }">
            <img loading="lazy" decoding="async" :src="imageSrc(item.id)" class="w-full aspect-[2/3] object-cover object-top" />
            <div v-if="isWatched(item.id)" class="pick-check">✓</div>
            <div class="pick-name" :title="item.name">{{ item.name }}</div>
          </div>
        </template>
      </VirtualGrid>
    </div>

    <!-- 报告模式 -->
    <div v-else>
      <div class="flex items-center justify-between mb-3">
        <button class="btn-ghost text-sm px-3 py-2" @click="view = 'pick'">← 返回选番</button>
        <span class="text-sm text-ink-2">基于 {{ report.count }} 部已看番剧</span>
      </div>

      <!-- 人格标签 -->
      <div class="persona">
        <div class="persona-emoji">{{ report.persona.emoji }}</div>
        <div>
          <div class="persona-title">{{ report.persona.title }}</div>
          <div class="persona-desc">{{ report.persona.description }}</div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="stat-row">
        <div class="stat">
          <div class="stat-num">{{ report.count }}</div>
          <div class="stat-label">已看 · 覆盖 {{ report.coverage }}%</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ report.avgRating ?? '—' }}</div>
          <div class="stat-label">{{ ratingDeltaText || '平均分' }}</div>
        </div>
        <div class="stat">
          <div class="stat-num">{{ report.nicheScore }}</div>
          <div class="stat-label">小众指数 / 100</div>
        </div>
      </div>

      <!-- 题材偏好 -->
      <section v-if="report.topTags.length" class="block">
        <h4 class="block-title">题材偏好</h4>
        <div v-for="t in report.topTags" :key="t.tag" class="bar-row">
          <span class="bar-label">{{ t.tag }}</span>
          <div class="bar-track"><div class="bar-fill" :style="{ width: t.pct + '%' }"></div></div>
          <span class="bar-val">{{ t.count }}</span>
        </div>
      </section>

      <!-- 年代分布 -->
      <section v-if="report.eras.length" class="block">
        <h4 class="block-title">年代分布</h4>
        <div v-for="e in report.eras" :key="e.label" class="bar-row">
          <span class="bar-label">{{ e.label }}</span>
          <div class="bar-track"><div class="bar-fill alt" :style="{ width: e.pct + '%' }"></div></div>
          <span class="bar-val">{{ e.count }}</span>
        </div>
      </section>

      <!-- 原作来源 + 稀有度 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section v-if="report.sourceMix.length" class="block">
          <h4 class="block-title">原作来源</h4>
          <div class="chip-wrap">
            <span v-for="s in report.sourceMix" :key="s.source" class="chip">{{ s.source }} · {{ s.count }}</span>
          </div>
        </section>
        <section v-if="report.rarityMix.length" class="block">
          <h4 class="block-title">稀有度构成</h4>
          <div class="chip-wrap">
            <span v-for="r in report.rarityMix" :key="r.rarity" class="chip">{{ r.rarity }} · {{ r.count }}</span>
          </div>
        </section>
      </div>

      <!-- 代表作高亮 -->
      <section class="block">
        <h4 class="block-title">代表作</h4>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div v-if="report.highlights.highestRated" class="hl">
            <span class="hl-tag">⭐ 最高分</span>
            <span class="hl-name" :title="report.highlights.highestRated.name">{{ report.highlights.highestRated.name }}</span>
            <span class="hl-sub">{{ report.highlights.highestRated.rating_score }} 分</span>
          </div>
          <div v-if="report.highlights.mostNiche" class="hl">
            <span class="hl-tag">🔍 最小众</span>
            <span class="hl-name" :title="report.highlights.mostNiche.name">{{ report.highlights.mostNiche.name }}</span>
            <span class="hl-sub">{{ report.highlights.mostNiche.rating_total }} 人评</span>
          </div>
          <div v-if="report.highlights.oldest" class="hl">
            <span class="hl-tag">📼 最早</span>
            <span class="hl-name" :title="report.highlights.oldest.name">{{ report.highlights.oldest.name }}</span>
            <span class="hl-sub">{{ report.highlights.oldest.date?.slice(0, 4) }}</span>
          </div>
          <div v-if="report.highlights.newest" class="hl">
            <span class="hl-tag">🌱 最新</span>
            <span class="hl-name" :title="report.highlights.newest.name">{{ report.highlights.newest.name }}</span>
            <span class="hl-sub">{{ report.highlights.newest.date?.slice(0, 4) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.taste { color: rgb(var(--c-ink)); }

/* 选番卡 */
.pick-card {
  position: relative; height: 100%; border-radius: 0.5rem; overflow: hidden;
  border: 2px solid transparent; background: rgb(var(--c-surface)); box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
}
.pick-card.selected { border-color: rgb(var(--c-accent)); box-shadow: 0 0 0 1px rgb(var(--c-accent)); }
.pick-card:not(.selected) img { opacity: 0.85; }
.pick-check {
  position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: 999px;
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); font-weight: 800; font-size: 0.8rem;
  display: flex; align-items: center; justify-content: center;
}
.pick-name {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 2px 4px; font-size: 0.68rem; text-align: center;
  color: #fff; background: rgb(0 0 0 / 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* 人格 */
.persona {
  display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; margin-bottom: 1rem;
  border: 1px solid rgb(var(--c-line)); border-radius: 0.75rem;
  background: linear-gradient(135deg, rgb(var(--c-accent) / 0.12), rgb(var(--c-surface)));
}
.persona-emoji { font-size: 2.5rem; line-height: 1; }
.persona-title { font-weight: 800; font-size: 1.15rem; color: rgb(var(--c-ink)); }
.persona-desc { font-size: 0.85rem; color: rgb(var(--c-ink-2)); margin-top: 0.15rem; }

/* 统计卡片 */
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
.stat {
  text-align: center; padding: 0.75rem 0.5rem; border: 1px solid rgb(var(--c-line));
  border-radius: 0.6rem; background: rgb(var(--c-surface));
}
.stat-num { font-size: 1.5rem; font-weight: 800; color: rgb(var(--c-accent)); }
.stat-label { font-size: 0.72rem; color: rgb(var(--c-ink-2)); margin-top: 0.15rem; }

/* 区块 + 条形图 */
.block { margin-bottom: 1.1rem; }
.block-title { font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 0.5rem; font-size: 0.95rem; }
.bar-row { display: grid; grid-template-columns: 4.5rem 1fr 2rem; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
.bar-label { font-size: 0.8rem; color: rgb(var(--c-ink-2)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bar-track { height: 0.7rem; border-radius: 999px; background: rgb(var(--c-surface-2)); overflow: hidden; }
.bar-fill { height: 100%; border-radius: 999px; background: rgb(var(--c-accent)); transition: width 0.4s; min-width: 2px; }
.bar-fill.alt { background: rgb(var(--c-accent) / 0.6); }
.bar-val { font-size: 0.75rem; color: rgb(var(--c-ink-2)); text-align: right; }

/* 标签胶囊 */
.chip-wrap { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  font-size: 0.78rem; padding: 0.2rem 0.6rem; border-radius: 999px;
  background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-2)); border: 1px solid rgb(var(--c-line));
}

/* 高亮代表作 */
.hl {
  display: flex; flex-direction: column; gap: 0.15rem; padding: 0.5rem; border-radius: 0.5rem;
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
}
.hl-tag { font-size: 0.7rem; color: rgb(var(--c-accent)); font-weight: 700; }
.hl-name { font-size: 0.8rem; color: rgb(var(--c-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hl-sub { font-size: 0.7rem; color: rgb(var(--c-ink-2)); }
</style>
