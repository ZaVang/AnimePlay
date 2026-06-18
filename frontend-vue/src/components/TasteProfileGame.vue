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
import { useCollectionStore } from '@/stores/collection';
import { buildTasteReport, recommendFromTaste } from '@/utils/tasteProfile';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { AnimeCard } from '@/types/card';
import VirtualGrid from '@/components/VirtualGrid.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';

const userStore = useUserStore();
const gameData = useGameDataStore();
const minigames = useMiniGamesStore();
const collection = useCollectionStore();

// 右键查看详情（复用图鉴/对战的卡详情弹窗）
const detailCard = ref<AnimeCard | null>(null);
const detailCount = computed(() => (detailCard.value ? collection.getAnimeCardCount(detailCard.value.id) : 0));
function openDetail(card: AnimeCard) {
  detailCard.value = card;
}

const view = ref<'pick' | 'report'>('pick');
const search = ref('');
const onlyWatched = ref(false);
const filterTag = ref('all');
const yearFrom = ref('all'); // 起始年（'all' = 不限下界）
const yearTo = ref('all');   // 结束年（'all' = 至今/不限上界）
type SortKey = 'name' | 'newest' | 'oldest' | 'rating';
const pickSort = ref<SortKey>('name');

const allAnime = computed(() => gameData.allAnimeCards);
const watchedCount = computed(() => minigames.tasteWatchedCount);

/** 取番剧放送年（无有效年份返回 null）。 */
function yearOf(a: AnimeCard): number | null {
  return typeof a.date === 'string' && /^\d{4}/.test(a.date) ? parseInt(a.date.slice(0, 4), 10) : null;
}
/** 按当前排序键比较两张卡。 */
function compareBySort(a: AnimeCard, b: AnimeCard): number {
  if (pickSort.value === 'rating') return (b.rating_score ?? 0) - (a.rating_score ?? 0) || a.name.localeCompare(b.name, 'zh-Hans-CN');
  if (pickSort.value === 'newest') return (yearOf(b) ?? -1) - (yearOf(a) ?? -1) || a.name.localeCompare(b.name, 'zh-Hans-CN');
  if (pickSort.value === 'oldest') return (yearOf(a) ?? 9999) - (yearOf(b) ?? 9999) || a.name.localeCompare(b.name, 'zh-Hans-CN');
  return a.name.localeCompare(b.name, 'zh-Hans-CN');
}

/** 标签 / 年份选项严格取自库里实际数据。 */
const allTags = computed(() => {
  const s = new Set<string>();
  for (const a of allAnime.value) for (const t of a.synergy_tags ?? []) s.add(t);
  return [...s].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
});
const allYears = computed(() => {
  const s = new Set<string>();
  for (const a of allAnime.value) if (typeof a.date === 'string' && /^\d{4}/.test(a.date)) s.add(a.date.slice(0, 4));
  return [...s].sort((a, b) => Number(b) - Number(a));
});

function isWatched(id: number): boolean {
  return minigames.tasteWatchedIds.has(id);
}

/** 选番列表：关键字 + 标签 + 年份范围 + 「只看已选」过滤，按所选排序。 */
const pickList = computed(() => {
  const kw = search.value.trim().toLowerCase();
  const hasYearBound = yearFrom.value !== 'all' || yearTo.value !== 'all';
  return allAnime.value
    .filter(a => {
      if (onlyWatched.value && !isWatched(a.id)) return false;
      if (kw && !a.name.toLowerCase().includes(kw)) return false;
      if (filterTag.value !== 'all' && !(a.synergy_tags ?? []).includes(filterTag.value)) return false;
      if (hasYearBound) {
        const y = yearOf(a);
        if (y === null) return false;
        if (yearFrom.value !== 'all' && y < Number(yearFrom.value)) return false;
        if (yearTo.value !== 'all' && y > Number(yearTo.value)) return false;
      }
      return true;
    })
    .slice()
    .sort(compareBySort);
});

const hasPickFilter = computed(
  () =>
    search.value.trim() !== '' ||
    filterTag.value !== 'all' ||
    yearFrom.value !== 'all' ||
    yearTo.value !== 'all' ||
    onlyWatched.value,
);
function clearPickFilters() {
  search.value = '';
  filterTag.value = 'all';
  yearFrom.value = 'all';
  yearTo.value = 'all';
  onlyWatched.value = false;
}

const watchedAnime = computed<AnimeCard[]>(() => allAnime.value.filter(a => isWatched(a.id)));
const report = computed(() => buildTasteReport(watchedAnime.value, allAnime.value));
const recommendations = computed(() => recommendFromTaste(watchedAnime.value, allAnime.value, 8));

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
  return thumbImageSrc('anime', id);
}

const VIRTUAL_GRID_CONFIG = { itemHeight: 240, containerHeight: 540, minItemWidth: 132, gap: 14 };

// --- 报告导出图片：手绘 canvas（统计头 + 已看番 n×n 缩略图，按时间/评分排序）---
const exportSort = ref<'rating' | 'newest'>('rating');
const exporting = ref(false);
const exportError = ref('');

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : fallback;
}
function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

async function exportReport() {
  if (exporting.value) return;
  const list = watchedAnime.value.slice().sort((a, b) =>
    exportSort.value === 'rating'
      ? (b.rating_score ?? 0) - (a.rating_score ?? 0) || a.name.localeCompare(b.name, 'zh-Hans-CN')
      : (yearOf(b) ?? -1) - (yearOf(a) ?? -1) || a.name.localeCompare(b.name, 'zh-Hans-CN'),
  );
  if (list.length === 0) return;
  exporting.value = true;
  exportError.value = '';
  try {
    const CW = 110, CH = 154, GAP = 6, PAD = 18, DPR = 2, HEADER = 132;
    const cols = Math.min(12, Math.ceil(Math.sqrt(list.length)));
    const rows = Math.ceil(list.length / cols);
    const canvasW = cols * CW + (cols - 1) * GAP + PAD * 2;
    const canvasH = HEADER + rows * CH + (rows - 1) * GAP + PAD;

    const imgs = await Promise.all(list.map(a => loadImg(thumbImageSrc('anime', a.id))));

    const surface = cssVar('--c-surface', '#fff');
    const ink = cssVar('--c-ink', '#222');
    const ink2 = cssVar('--c-ink-2', '#666');
    const accent = cssVar('--c-accent', '#2ba8a2');

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * DPR;
    canvas.height = canvasH * DPR;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.scale(DPR, DPR);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 头部：人格 + 统计 + 偏好
    const r = report.value;
    ctx.textBaseline = 'top';
    ctx.fillStyle = ink;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`${r.persona.emoji} ${r.persona.title}`, PAD, PAD);
    ctx.fillStyle = ink2;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(r.persona.description, PAD, PAD + 34);
    ctx.fillText(
      `已看 ${r.count} 部 · 覆盖 ${r.coverage}% · 均分 ${r.avgRating ?? '—'} · 小众指数 ${r.nicheScore}/100`,
      PAD, PAD + 58,
    );
    const tags = r.topTags.slice(0, 5).map(t => t.tag).join(' / ');
    if (tags) {
      ctx.fillStyle = accent;
      ctx.fillText(`偏好题材：${tags}`, PAD, PAD + 80);
    }
    ctx.fillStyle = ink2;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`已看番一览（按${exportSort.value === 'rating' ? '评分' : '年份'}排序）`, PAD, HEADER - 18);

    // n×n 缩略图网格
    list.forEach((a, i) => {
      const cx = PAD + (i % cols) * (CW + GAP);
      const cy = HEADER + Math.floor(i / cols) * (CH + GAP);
      const im = imgs[i];
      if (im) ctx.drawImage(im, cx, cy, CW, CH);
      else { ctx.fillStyle = '#999'; ctx.fillRect(cx, cy, CW, CH); }
      // 角标：评分或年份
      const label = exportSort.value === 'rating' ? (a.rating_score ? `★${a.rating_score}` : '—') : String(yearOf(a) ?? '—');
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.fillRect(cx, cy + CH - 18, CW, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx + CW / 2, cy + CH - 9);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `番剧品味-${r.persona.title}-${Date.now()}.png`;
    a.click();
  } catch (e) {
    console.error('[taste export]', e);
    exportError.value = '导出失败，请重试。';
    setTimeout(() => { exportError.value = ''; }, 4000);
  } finally {
    exporting.value = false;
  }
}

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
        <select v-model="filterTag" class="p-2 border border-line rounded-lg text-ink bg-surface">
          <option value="all">所有标签</option>
          <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
        </select>
        <div class="flex items-center gap-1 text-sm text-ink-2">
          <select v-model="yearFrom" class="p-2 border border-line rounded-lg text-ink bg-surface">
            <option value="all">起始年</option>
            <option v-for="y in allYears" :key="y" :value="y">{{ y }}</option>
          </select>
          <span>–</span>
          <select v-model="yearTo" class="p-2 border border-line rounded-lg text-ink bg-surface">
            <option value="all">至今</option>
            <option v-for="y in allYears" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <select v-model="pickSort" class="p-2 border border-line rounded-lg text-ink bg-surface">
          <option value="name">名称排序</option>
          <option value="newest">年份：新→旧</option>
          <option value="oldest">年份：旧→新</option>
          <option value="rating">评分：高→低</option>
        </select>
        <label class="flex items-center gap-1.5 text-sm text-ink-2 select-none cursor-pointer">
          <input type="checkbox" v-model="onlyWatched" /> 只看已选
        </label>
        <button v-if="hasPickFilter" class="btn-ghost text-sm px-3 py-2" @click="clearPickFilters">清除筛选</button>
        <button v-if="watchedCount > 0" class="btn-ghost text-sm px-3 py-2" @click="clearAll">清空已选</button>
        <button
          class="btn-primary text-sm px-4 py-2"
          :class="{ 'opacity-45 cursor-not-allowed': watchedCount === 0 }"
          :disabled="watchedCount === 0"
          @click="showReport"
        >生成画像 →</button>
      </div>
      <p class="text-sm text-ink-2 mb-3">筛选出 {{ pickList.length }} / {{ allAnime.length }} 部 · 左键勾选、右键看详情</p>

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
          <div class="pick-card" :class="{ selected: isWatched(item.id) }" @contextmenu.prevent="openDetail(item as AnimeCard)">
            <img loading="lazy" decoding="async" :src="imageSrc(item.id)" @error="onThumbError" class="w-full aspect-[2/3] object-cover object-top" />
            <div v-if="isWatched(item.id)" class="pick-check">✓</div>
            <div class="pick-name" :title="item.name">{{ item.name }}</div>
          </div>
        </template>
      </VirtualGrid>
    </div>

    <!-- 报告模式 -->
    <div v-else>
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <button class="btn-ghost text-sm px-3 py-2" @click="view = 'pick'">← 返回选番</button>
        <div class="flex items-center gap-2">
          <span class="text-sm text-ink-2 mr-1">基于 {{ report.count }} 部</span>
          <select v-model="exportSort" class="p-1.5 border border-line rounded-lg text-sm text-ink bg-surface">
            <option value="rating">导出按评分</option>
            <option value="newest">导出按年份</option>
          </select>
          <button class="btn-primary text-sm px-3 py-1.5" :disabled="exporting" @click="exportReport">
            {{ exporting ? '导出中…' : '📷 导出图片' }}
          </button>
        </div>
      </div>
      <p v-if="exportError" class="text-xs text-danger mb-2">{{ exportError }}</p>

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

      <!-- 猜你想看（基于品味的内容推荐；点「看过」加入记录并刷新画像） -->
      <section v-if="recommendations.length" class="block">
        <h4 class="block-title">🍿 猜你想看</h4>
        <p class="text-xs text-ink-2 mb-2">根据你的题材偏好推荐你还没看的番——点「看过」加入记录可让画像更准。</p>
        <div class="rec-grid">
          <div v-for="rec in recommendations" :key="rec.anime.id" class="rec" @contextmenu.prevent="openDetail(rec.anime)">
            <img loading="lazy" decoding="async" :src="imageSrc(rec.anime.id)" @error="onThumbError" class="rec-img" />
            <div class="rec-body">
              <div class="rec-name" :title="rec.anime.name">{{ rec.anime.name }}</div>
              <div class="rec-meta">
                <span v-if="rec.anime.rating_score">⭐ {{ rec.anime.rating_score }}</span>
                <span v-if="rec.anime.date">· {{ rec.anime.date.slice(0, 4) }}</span>
              </div>
              <div class="rec-tags">
                <span v-for="t in rec.reasonTags" :key="t" class="rec-tag">{{ t }}</span>
              </div>
              <button class="rec-btn" @click="toggle(rec.anime)">+ 看过</button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <CardDetailModal
      :card="detailCard"
      card-type="anime"
      :count="detailCount"
      @close="detailCard = null"
    />
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
  position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 4px; font-size: 0.78rem; text-align: center;
  color: #fff; background: rgb(0 0 0 / 0.62); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
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

/* 猜你想看 */
.rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: 0.7rem; }
.rec {
  display: flex; flex-direction: column; border-radius: 0.5rem; overflow: hidden;
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
}
.rec-img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; object-position: top; }
.rec-body { padding: 0.3rem 0.35rem 0.4rem; display: flex; flex-direction: column; gap: 0.2rem; }
.rec-name { font-size: 0.72rem; font-weight: 700; color: rgb(var(--c-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-meta { font-size: 0.66rem; color: rgb(var(--c-ink-2)); }
.rec-tags { display: flex; flex-wrap: wrap; gap: 0.15rem; min-height: 1rem; }
.rec-tag { font-size: 0.6rem; padding: 0.05rem 0.3rem; border-radius: 999px; background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent)); }
.rec-btn {
  margin-top: 0.15rem; font-size: 0.66rem; padding: 0.2rem 0; border-radius: 0.35rem;
  background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-2)); border: 1px solid rgb(var(--c-line)); cursor: pointer;
}
.rec-btn:hover { background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent)); }
</style>
