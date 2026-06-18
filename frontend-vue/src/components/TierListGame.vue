<script setup lang="ts">
/**
 * 锐评 Tier 表（小游戏 #6，evolution-11）。
 * 选番剧/角色 → 拖进 5 个档位行（夯/顶级/人上人/npc/拉完了）做锐评。
 * 行内 flex-wrap，超出自动换行。棋盘存 localStorage（设备级，不进存档）。
 * 桌面优先：用原生 HTML5 拖放。
 */
import { ref, reactive, computed, watch } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import type { AnimeCard } from '@/types/card';

const gameData = useGameDataStore();
const minigames = useMiniGamesStore();

// 档位：从夯到拉完了；颜色是 tier 表识别色（固定色，不随皮肤——同稀有度色例外）。
const TIERS = [
  { id: 'S', label: '夯', color: '#ff6b6b' },
  { id: 'A', label: '顶级', color: '#ffa94d' },
  { id: 'B', label: '人上人', color: '#ffd43b' },
  { id: 'C', label: 'npc', color: '#94d82d' },
  { id: 'D', label: '拉完了', color: '#74c0fc' },
] as const;
type RowId = 'pool' | (typeof TIERS)[number]['id'];
const ROW_IDS: RowId[] = ['S', 'A', 'B', 'C', 'D'];

type Domain = 'anime' | 'character';
const domain = ref<Domain>('anime');

interface Board { pool: number[]; S: number[]; A: number[]; B: number[]; C: number[]; D: number[]; }
const emptyBoard = (): Board => ({ pool: [], S: [], A: [], B: [], C: [], D: [] });
const boards = reactive<Record<Domain, Board>>({ anime: emptyBoard(), character: emptyBoard() });
const board = computed(() => boards[domain.value]);

// --- localStorage 持久化（设备级） ---
const LS_KEY = 'animeplay-tierlist';
try {
  const raw = localStorage.getItem(LS_KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    for (const d of ['anime', 'character'] as Domain[]) {
      if (saved[d]) for (const k of ['pool', ...ROW_IDS] as RowId[]) {
        if (Array.isArray(saved[d][k])) boards[d][k] = saved[d][k].filter((x: unknown) => typeof x === 'number');
      }
    }
    if (saved.domain === 'anime' || saved.domain === 'character') domain.value = saved.domain;
  }
} catch { /* localStorage 不可用/损坏 → 空棋盘 */ }
watch([boards, domain], () => {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ ...boards, domain: domain.value })); } catch { /* 忽略写入失败 */ }
}, { deep: true });

// --- 卡数据 ---
const allCards = computed(() => (domain.value === 'anime' ? gameData.allAnimeCards : gameData.allCharacterCards));
const cardById = computed(() => {
  const m = new Map<number, { id: number; name: string; rarity: string }>();
  for (const c of allCards.value) m.set(c.id, c);
  return m;
});
function imageSrc(id: number): string {
  return `/data/images/${domain.value}/${id}.jpg`;
}
function nameOf(id: number): string {
  return cardById.value.get(id)?.name ?? `#${id}`;
}

// --- 候选筛选（关键字 + 标签/年份[仅动画]）---
const search = ref('');
const filterTag = ref('all');
const filterYear = ref('all');
const allTags = computed(() => {
  const s = new Set<string>();
  for (const c of gameData.allAnimeCards) for (const t of c.synergy_tags ?? []) s.add(t);
  return [...s].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
});
const allYears = computed(() => {
  const s = new Set<string>();
  for (const c of gameData.allAnimeCards) if (typeof c.date === 'string' && /^\d{4}/.test(c.date)) s.add(c.date.slice(0, 4));
  return [...s].sort((a, b) => Number(b) - Number(a));
});

const onBoardIds = computed(() => new Set<number>([board.value.pool, ...ROW_IDS.map(r => board.value[r])].flat()));
const candidates = computed(() => {
  const onBoard = onBoardIds.value;
  const kw = search.value.trim().toLowerCase();
  return allCards.value
    .filter(c => {
      if (onBoard.has(c.id)) return false;
      if (kw && !c.name.toLowerCase().includes(kw)) return false;
      if (domain.value === 'anime') {
        if (filterTag.value !== 'all' && !((c as AnimeCard).synergy_tags ?? []).includes(filterTag.value)) return false;
        const d = (c as AnimeCard).date;
        if (filterYear.value !== 'all' && !(typeof d === 'string' && d.slice(0, 4) === filterYear.value)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
});

const ADD_ALL_CAP = 60;

// --- 候选多选 + 批量导入 ---
const selected = ref<Set<number>>(new Set());
watch(domain, () => { selected.value = new Set(); });

function toggleSelect(id: number) {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
}
/** 导入勾选中的候选到待评区。 */
function importSelected() {
  for (const id of selected.value) if (!onBoardIds.value.has(id)) board.value.pool.push(id);
  selected.value = new Set();
}
function addAllFiltered() {
  for (const c of candidates.value.slice(0, ADD_ALL_CAP)) board.value.pool.push(c.id);
}
/** 从「番剧品味」已勾选的看过番批量导入（仅动画域）。 */
const tasteImportCount = computed(() =>
  domain.value === 'anime'
    ? [...minigames.tasteWatchedIds].filter(id => !onBoardIds.value.has(id) && cardById.value.has(id)).length
    : 0,
);
function importFromTaste() {
  for (const id of minigames.tasteWatchedIds) {
    if (!onBoardIds.value.has(id) && cardById.value.has(id)) board.value.pool.push(id);
  }
}
function removeFromBoard(id: number) {
  for (const k of ['pool', ...ROW_IDS] as RowId[]) {
    const i = board.value[k].indexOf(id);
    if (i >= 0) board.value[k].splice(i, 1);
  }
}
function clearBoard() {
  if (onBoardIds.value.size === 0) return;
  if (confirm('清空当前锐评棋盘？')) boards[domain.value] = emptyBoard();
}

// --- 拖放 ---
const dragId = ref<number | null>(null);
const dragFrom = ref<RowId | null>(null);
const dragOverRow = ref<RowId | null>(null);

function onDragStart(id: number, from: RowId) {
  dragId.value = id;
  dragFrom.value = from;
}
function onDrop(to: RowId) {
  dragOverRow.value = null;
  if (dragId.value == null || dragFrom.value == null) return;
  const fromArr = board.value[dragFrom.value];
  const i = fromArr.indexOf(dragId.value);
  if (i >= 0) fromArr.splice(i, 1);
  if (!board.value[to].includes(dragId.value)) board.value[to].push(dragId.value);
  dragId.value = null;
  dragFrom.value = null;
}
// 候选区拖入棋盘：dragstart 用特殊来源 'cand'
function onCandDragStart(id: number) {
  dragId.value = id;
  dragFrom.value = null; // 来自候选区，不在任何行内
}
function onDropFromAny(to: RowId) {
  dragOverRow.value = null;
  if (dragId.value == null) return;
  if (dragFrom.value !== null) {
    const fromArr = board.value[dragFrom.value];
    const i = fromArr.indexOf(dragId.value);
    if (i >= 0) fromArr.splice(i, 1);
  }
  if (!onBoardIds.value.has(dragId.value)) board.value[to].push(dragId.value);
  else if (!board.value[to].includes(dragId.value)) board.value[to].push(dragId.value);
  selected.value.delete(dragId.value);
  dragId.value = null;
  dragFrom.value = null;
}

// --- 一键导出图片：手绘 canvas（无依赖、same-origin 图片直接绘制，稳定可控）---
const exporting = ref(false);
const exportError = ref('');

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : fallback;
}
function loadImg(id: number): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = imageSrc(id); // same-origin → canvas 不污染
  });
}

async function exportImage() {
  if (exporting.value) return;
  exporting.value = true;
  exportError.value = '';
  try {
    const TW = 80, TH = 112, GAP = 6, PAD = 10, LABELW = 96, ROWGAP = 4, DPR = 2, TITLE_H = 46;
    const cols = Math.max(5, Math.floor((1120 - LABELW - PAD * 2) / (TW + GAP)));
    const canvasW = LABELW + PAD * 2 + cols * TW + (cols - 1) * GAP;

    // 预加载所有上榜图片
    const imgMap = new Map<number, HTMLImageElement>();
    await Promise.all(
      TIERS.flatMap(t => board.value[t.id]).map(async id => {
        const im = await loadImg(id);
        if (im) imgMap.set(id, im);
      }),
    );

    const rowH = TIERS.map(t => {
      const rows = Math.max(1, Math.ceil(board.value[t.id].length / cols));
      return rows * TH + (rows - 1) * GAP + PAD * 2;
    });
    const canvasH = TITLE_H + rowH.reduce((a, b) => a + b, 0) + ROWGAP * (TIERS.length - 1) + PAD;

    const surface = cssVar('--c-surface', '#ffffff');
    const surface2 = cssVar('--c-surface-2', '#eee');
    const ink = cssVar('--c-ink', '#222');

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * DPR;
    canvas.height = canvasH * DPR;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.scale(DPR, DPR);
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(`锐评 Tier 表 · ${domain.value === 'anime' ? '番剧' : '人物'}`, PAD, TITLE_H / 2);

    let y = TITLE_H;
    TIERS.forEach((t, ti) => {
      const h = rowH[ti];
      ctx.fillStyle = surface2;
      ctx.fillRect(LABELW, y, canvasW - LABELW, h);
      ctx.fillStyle = t.color;
      ctx.fillRect(0, y, LABELW, h);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t.label, LABELW / 2, y + h / 2);
      ctx.textAlign = 'left';
      board.value[t.id].forEach((id, i) => {
        const cx = LABELW + PAD + (i % cols) * (TW + GAP);
        const cy = y + PAD + Math.floor(i / cols) * (TH + GAP);
        const im = imgMap.get(id);
        if (im) ctx.drawImage(im, cx, cy, TW, TH);
        else { ctx.fillStyle = '#999'; ctx.fillRect(cx, cy, TW, TH); }
      });
      y += h + ROWGAP;
    });

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `锐评-${domain.value === 'anime' ? '番剧' : '人物'}-${Date.now()}.png`;
    a.click();
  } catch (e) {
    console.error('[tierlist export]', e);
    exportError.value = '导出失败，请重试。';
    setTimeout(() => { exportError.value = ''; }, 4000);
  } finally {
    exporting.value = false;
  }
}
</script>

<template>
  <div class="tier">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div>
        <h3 class="text-lg font-bold text-ink">🔥 锐评 Tier 表</h3>
        <p class="text-sm text-ink-2">把番剧/角色拖进档位，从「夯」到「拉完了」。棋盘自动保存在本机。</p>
      </div>
      <div class="flex flex-wrap gap-2 items-center">
        <button
          class="px-3 py-1.5 rounded-lg text-sm border"
          :class="domain === 'anime' ? 'bg-accent text-on-accent border-accent' : 'bg-surface text-ink-2 border-line'"
          @click="domain = 'anime'"
        >动漫</button>
        <button
          class="px-3 py-1.5 rounded-lg text-sm border"
          :class="domain === 'character' ? 'bg-accent text-on-accent border-accent' : 'bg-surface text-ink-2 border-line'"
          @click="domain = 'character'"
        >人物</button>
        <button class="btn-primary text-sm px-3 py-1.5" :disabled="exporting" @click="exportImage">
          {{ exporting ? '导出中…' : '📷 导出图片' }}
        </button>
      </div>
    </div>

    <p v-if="exportError" class="text-xs text-danger mb-2">{{ exportError }}</p>

    <!-- Tier 棋盘 -->
    <div class="tier-board">
      <div
        v-for="t in TIERS"
        :key="t.id"
        class="tier-row"
        :class="{ 'tier-row-over': dragOverRow === t.id }"
        @dragover.prevent="dragOverRow = t.id"
        @dragleave="dragOverRow = (dragOverRow === t.id ? null : dragOverRow)"
        @drop="onDropFromAny(t.id)"
      >
        <div class="tier-label" :style="{ background: t.color }">{{ t.label }}</div>
        <div class="tier-zone">
          <div
            v-for="id in board[t.id]"
            :key="id"
            class="tier-item"
            draggable="true"
            :title="nameOf(id)"
            @dragstart="onDragStart(id, t.id)"
          >
            <img :src="imageSrc(id)" loading="lazy" decoding="async" />
            <button class="tier-item-x" title="移出棋盘" @click="removeFromBoard(id)">×</button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-2 mt-3 mb-2">
      <h4 class="font-bold text-ink">待评区 / 选取</h4>
      <button v-if="onBoardIds.size > 0" class="btn-ghost text-sm px-3 py-1.5" @click="clearBoard">清空棋盘</button>
    </div>

    <!-- 待评区（未分级，拖回此处即取消分级）-->
    <div
      class="pool-zone"
      :class="{ 'tier-row-over': dragOverRow === 'pool' }"
      @dragover.prevent="dragOverRow = 'pool'"
      @dragleave="dragOverRow = (dragOverRow === 'pool' ? null : dragOverRow)"
      @drop="onDropFromAny('pool')"
    >
      <div
        v-for="id in board.pool"
        :key="id"
        class="tier-item"
        draggable="true"
        :title="nameOf(id)"
        @dragstart="onDragStart(id, 'pool')"
      >
        <img :src="imageSrc(id)" loading="lazy" decoding="async" />
        <button class="tier-item-x" title="移出棋盘" @click="removeFromBoard(id)">×</button>
      </div>
      <p v-if="board.pool.length === 0" class="text-xs text-ink-2 p-2">从下方选取对象添加到这里，再拖进档位。</p>
    </div>

    <!-- 选取候选 -->
    <div class="flex flex-wrap items-center gap-2 mt-4 mb-2">
      <input
        v-model="search"
        type="text"
        :placeholder="domain === 'anime' ? '搜番剧名…' : '搜角色名…'"
        class="p-2 border border-line rounded-lg flex-grow min-w-0 text-ink bg-surface"
      />
      <select v-if="domain === 'anime'" v-model="filterTag" class="p-2 border border-line rounded-lg text-ink bg-surface">
        <option value="all">所有标签</option>
        <option v-for="t in allTags" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-if="domain === 'anime'" v-model="filterYear" class="p-2 border border-line rounded-lg text-ink bg-surface">
        <option value="all">所有年份</option>
        <option v-for="y in allYears" :key="y" :value="y">{{ y }}</option>
      </select>
      <button class="btn-secondary text-sm px-3 py-2" :disabled="candidates.length === 0" @click="addAllFiltered">
        添加筛选结果（≤{{ ADD_ALL_CAP }}）
      </button>
      <button
        class="btn-primary text-sm px-3 py-2"
        :class="{ 'opacity-45 cursor-not-allowed': selected.size === 0 }"
        :disabled="selected.size === 0"
        @click="importSelected"
      >导入选中（{{ selected.size }}）</button>
      <button
        v-if="domain === 'anime' && tasteImportCount > 0"
        class="btn-ghost text-sm px-3 py-2"
        @click="importFromTaste"
      >导入品味已看（{{ tasteImportCount }}）</button>
    </div>
    <p class="text-xs text-ink-2 mb-2">点缩略图多选、再「导入选中」批量加入；也可直接把缩略图拖进档位（共 {{ candidates.length }} 个可选）。</p>
    <div class="cand-strip">
      <div
        v-for="c in candidates.slice(0, 120)"
        :key="c.id"
        class="cand-item"
        :class="{ 'cand-selected': selected.has(c.id) }"
        :title="c.name"
        draggable="true"
        @dragstart="onCandDragStart(c.id)"
        @click="toggleSelect(c.id)"
      >
        <img :src="imageSrc(c.id)" loading="lazy" decoding="async" />
        <span v-if="selected.has(c.id)" class="cand-check">✓</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tier { width: 100%; color: rgb(var(--c-ink)); }

.tier-board { display: flex; flex-direction: column; gap: 3px; border-radius: 0.5rem; overflow: hidden; }
.tier-row {
  display: flex; align-items: stretch; min-height: 116px;
  background: rgb(var(--c-surface-2)); border-radius: 4px; transition: background .12s;
}
.tier-row-over { outline: 2px dashed rgb(var(--c-accent)); outline-offset: -2px; background: rgb(var(--c-accent) / 0.08); }
.tier-label {
  flex: 0 0 92px; display: flex; align-items: center; justify-content: center; text-align: center;
  font-weight: 800; font-size: 1.1rem; color: #1a1a1a; padding: 0.25rem; border-radius: 4px 0 0 4px;
  word-break: break-all;
}
.tier-zone { flex: 1; display: flex; flex-wrap: wrap; gap: 5px; padding: 5px; align-content: flex-start; }

.pool-zone {
  display: flex; flex-wrap: wrap; gap: 5px; padding: 7px; min-height: 110px;
  border: 1px dashed rgb(var(--c-line)); border-radius: 0.5rem; background: rgb(var(--c-surface) / 0.4);
}

.tier-item { position: relative; width: 72px; height: 102px; border-radius: 4px; overflow: hidden; cursor: grab; background: rgb(var(--c-surface)); }
.tier-item img { width: 100%; height: 100%; object-fit: cover; object-position: top; pointer-events: none; }
.tier-item-x {
  position: absolute; top: 0; right: 0; width: 20px; height: 20px; line-height: 18px; text-align: center;
  font-size: 14px; font-weight: 800; color: #fff; background: rgb(0 0 0 / 0.6); border: 0; cursor: pointer;
  opacity: 0; transition: opacity .12s;
}
.tier-item:hover .tier-item-x { opacity: 1; }

.cand-strip {
  display: flex; flex-wrap: wrap; gap: 5px; max-height: 360px; overflow-y: auto;
  padding: 7px; border: 1px solid rgb(var(--c-line)); border-radius: 0.5rem; background: rgb(var(--c-surface));
}
.cand-item { position: relative; width: 72px; height: 102px; border-radius: 4px; overflow: hidden; cursor: pointer; background: rgb(var(--c-surface-2)); transition: transform .1s; }
.cand-item:hover { transform: translateY(-2px); outline: 2px solid rgb(var(--c-accent)); }
.cand-item img { width: 100%; height: 100%; object-fit: cover; object-position: top; pointer-events: none; }
.cand-selected { outline: 3px solid rgb(var(--c-accent)); }
.cand-check {
  position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; line-height: 18px; text-align: center;
  border-radius: 999px; background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); font-size: 12px; font-weight: 800;
}
</style>
