<script setup lang="ts">
/**
 * 锐评 Tier 表（小游戏 #6，evolution-11）。
 * 选番剧/角色 → 拖进 5 个档位行（夯/顶级/人上人/npc/拉完了）做锐评。
 * 行内 flex-wrap，超出自动换行。棋盘存 localStorage（设备级，不进存档）。
 * 桌面保留原生 HTML5 拖放；触屏/键盘通过单卡操作条完成同一套移动。
 */
import { ref, reactive, computed, watch } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import { useCollectionStore } from '@/stores/collection';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import { assetUrl } from '@/utils/assetUrl';
import type { AnimeCard, CharacterCard, Card } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import { useDialog } from '@/composables/useDialog';
import {
  TIER_ROW_IDS,
  findTierItemRow,
  moveTierItem,
  removeTierItem,
  type TierBoard,
  type TierRowId,
} from '@/utils/tierBoard';

const gameData = useGameDataStore();
const minigames = useMiniGamesStore();
const collection = useCollectionStore();
const { confirm } = useDialog();

// 档位：从夯到拉完了；颜色是 tier 表识别色（固定色，不随皮肤——同稀有度色例外）。
const TIERS = [
  { id: 'S', label: '夯', color: '#ff6b6b' },
  { id: 'A', label: '顶级', color: '#ffa94d' },
  { id: 'B', label: '人上人', color: '#ffd43b' },
  { id: 'C', label: 'npc', color: '#94d82d' },
  { id: 'D', label: '拉完了', color: '#74c0fc' },
] as const;
type RowId = TierRowId;
const ROW_IDS = [...TIER_ROW_IDS];

type Domain = 'anime' | 'character';
const domain = ref<Domain>('anime');

type Board = TierBoard;
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
  const m = new Map<number, AnimeCard | CharacterCard>();
  for (const c of allCards.value) m.set(c.id, c);
  return m;
});

// 右键查看详情（复用图鉴/对战的卡详情弹窗）
const detailCard = ref<Card | null>(null);
const detailCount = computed(() => {
  if (!detailCard.value) return 0;
  return domain.value === 'anime'
    ? collection.getAnimeCardCount(detailCard.value.id)
    : collection.getCharacterCardCount(detailCard.value.id);
});
function openDetail(id: number) {
  const c = cardById.value.get(id);
  if (c) detailCard.value = c;
}
function imageSrc(id: number): string {
  return assetUrl(`/data/images/${domain.value}/${id}.jpg`); // 原图：导出用
}
function thumbSrc(id: number): string {
  return thumbImageSrc(domain.value, id); // 缩略图：网格显示用
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
const selectedItemId = ref<number | null>(null);
const selectedRow = computed(() => selectedItemId.value == null
  ? null
  : findTierItemRow(board.value, selectedItemId.value));
watch(domain, () => {
  selected.value = new Set();
  selectedItemId.value = null;
  detailCard.value = null;
});

function toggleSelect(id: number) {
  if (selected.value.has(id)) selected.value.delete(id);
  else selected.value.add(id);
}
function activateCandidate(id: number) {
  selectedItemId.value = id;
  toggleSelect(id);
}
function selectBoardItem(id: number) {
  selectedItemId.value = id;
}
function moveItem(id: number, target: RowId) {
  boards[domain.value] = moveTierItem(board.value, id, target);
  selectedItemId.value = id;
  selected.value.delete(id);
}
function moveSelectedItem(target: RowId) {
  if (selectedItemId.value == null) return;
  moveItem(selectedItemId.value, target);
}
/** 导入勾选中的候选到待评区。 */
function importSelected() {
  const ids = [...selected.value];
  for (const id of ids) if (!onBoardIds.value.has(id)) moveItem(id, 'pool');
  if (ids.length > 0) selectedItemId.value = ids[ids.length - 1];
  selected.value = new Set();
}
function addAllFiltered() {
  const cards = candidates.value.slice(0, ADD_ALL_CAP);
  for (const c of cards) moveItem(c.id, 'pool');
  if (cards.length > 0) selectedItemId.value = cards[cards.length - 1].id;
}
/** 从「番剧品味」已勾选的看过番批量导入（仅动画域）。 */
const tasteImportCount = computed(() =>
  domain.value === 'anime'
    ? [...minigames.tasteWatchedIds].filter(id => !onBoardIds.value.has(id) && cardById.value.has(id)).length
    : 0,
);
function importFromTaste() {
  let lastImported: number | null = null;
  for (const id of minigames.tasteWatchedIds) {
    if (!onBoardIds.value.has(id) && cardById.value.has(id)) {
      moveItem(id, 'pool');
      lastImported = id;
    }
  }
  if (lastImported != null) selectedItemId.value = lastImported;
}
function removeFromBoard(id: number) {
  boards[domain.value] = removeTierItem(board.value, id);
  if (selectedItemId.value === id) selectedItemId.value = null;
}
function removeSelectedItem() {
  if (selectedItemId.value != null) removeFromBoard(selectedItemId.value);
}
function openSelectedDetail() {
  if (selectedItemId.value != null) openDetail(selectedItemId.value);
}
async function clearBoard() {
  if (onBoardIds.value.size === 0) return;
  if (await confirm('清空当前锐评棋盘？', { confirmText: '清空', danger: true })) {
    boards[domain.value] = emptyBoard();
    selectedItemId.value = null;
  }
}

// --- 拖放 ---
const dragId = ref<number | null>(null);
const dragFrom = ref<RowId | null>(null);
const dragOverRow = ref<RowId | null>(null);

function onDragStart(id: number, from: RowId) {
  dragId.value = id;
  dragFrom.value = from;
}
// 候选区拖入棋盘：dragstart 用特殊来源 'cand'
function onCandDragStart(id: number) {
  dragId.value = id;
  dragFrom.value = null; // 来自候选区，不在任何行内
}
function onDropFromAny(to: RowId) {
  dragOverRow.value = null;
  if (dragId.value == null) return;
  moveItem(dragId.value, to);
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

    <div v-if="selectedItemId != null" class="tier-operations" aria-live="polite">
      <span class="tier-operations-title">
        已选：{{ nameOf(selectedItemId) }} · {{ selectedRow === null ? '候选区' : (selectedRow === 'pool' ? '待评区' : `${selectedRow} 档`) }}
      </span>
      <button
        v-if="selectedRow === null"
        type="button"
        class="btn-primary text-sm px-3 py-1.5"
        @click="moveSelectedItem('pool')"
      >导入待评区</button>
      <template v-else>
        <button
          v-for="t in TIERS"
          :key="t.id"
          type="button"
          class="tier-operation-btn"
          :disabled="selectedRow === t.id"
          @click="moveSelectedItem(t.id)"
        >移到 {{ t.label }}（{{ t.id }}）</button>
        <button
          type="button"
          class="tier-operation-btn"
          :disabled="selectedRow === 'pool'"
          @click="moveSelectedItem('pool')"
        >回待评区</button>
      </template>
      <button type="button" class="tier-operation-btn" @click="openSelectedDetail">查看详情</button>
      <button
        v-if="selectedRow !== null"
        type="button"
        class="tier-operation-btn tier-operation-danger"
        @click="removeSelectedItem"
      >移出棋盘</button>
    </div>

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
            :class="{ 'tier-item-selected': selectedItemId === id }"
            draggable="true"
            :title="nameOf(id)"
            @contextmenu.prevent="openDetail(id)"
            @dragstart="onDragStart(id, t.id)"
          >
            <button
              type="button"
              class="tier-item-select"
              :aria-label="`选择 ${nameOf(id)}，当前在 ${t.label} 档`"
              :aria-pressed="selectedItemId === id"
              @click.stop="selectBoardItem(id)"
            >
              <img :src="thumbSrc(id)" loading="lazy" decoding="async" @error="onThumbError" />
            </button>
            <button
              type="button"
              class="tier-item-action tier-item-detail"
              title="查看详情"
              :aria-label="`查看 ${nameOf(id)} 详情`"
              @click.stop="openDetail(id)"
            >i</button>
            <button
              type="button"
              class="tier-item-action tier-item-x"
              title="移出棋盘"
              :aria-label="`将 ${nameOf(id)} 移出棋盘`"
              @click.stop="removeFromBoard(id)"
            >×</button>
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
        :class="{ 'tier-item-selected': selectedItemId === id }"
        draggable="true"
        :title="nameOf(id)"
        @contextmenu.prevent="openDetail(id)"
        @dragstart="onDragStart(id, 'pool')"
      >
        <button
          type="button"
          class="tier-item-select"
          :aria-label="`选择待评区中的 ${nameOf(id)}`"
          :aria-pressed="selectedItemId === id"
          @click.stop="selectBoardItem(id)"
        >
          <img :src="imageSrc(id)" loading="lazy" decoding="async" />
        </button>
        <button
          type="button"
          class="tier-item-action tier-item-detail"
          title="查看详情"
          :aria-label="`查看 ${nameOf(id)} 详情`"
          @click.stop="openDetail(id)"
        >i</button>
        <button
          type="button"
          class="tier-item-action tier-item-x"
          title="移出棋盘"
          :aria-label="`将 ${nameOf(id)} 移出棋盘`"
          @click.stop="removeFromBoard(id)"
        >×</button>
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
    <p class="text-xs text-ink-2 mb-2">点缩略图多选、再「导入选中」批量加入；也可选择单卡后用上方操作条导入、分档或看详情。桌面仍可直接拖放（共 {{ candidates.length }} 个可选）。</p>
    <div class="cand-strip">
      <div
        v-for="c in candidates.slice(0, 120)"
        :key="c.id"
        class="cand-item"
        :class="{ 'cand-selected': selected.has(c.id), 'cand-active': selectedItemId === c.id }"
        :title="c.name"
        draggable="true"
        role="button"
        tabindex="0"
        :aria-label="`选择候选 ${c.name}`"
        :aria-pressed="selected.has(c.id)"
        @dragstart="onCandDragStart(c.id)"
        @click="activateCandidate(c.id)"
        @keydown.enter.prevent="activateCandidate(c.id)"
        @keydown.space.prevent="activateCandidate(c.id)"
        @contextmenu.prevent="openDetail(c.id)"
      >
        <img :src="thumbSrc(c.id)" loading="lazy" decoding="async" @error="onThumbError" />
        <span v-if="selected.has(c.id)" class="cand-check">✓</span>
      </div>
    </div>

    <CardDetailModal
      :card="detailCard"
      :card-type="domain"
      :count="detailCount"
      @close="detailCard = null"
    />
  </div>
</template>

<style scoped>
.tier { width: 100%; color: rgb(var(--c-ink)); }

.tier-operations {
  display: flex; flex-wrap: wrap; align-items: center; gap: .45rem;
  margin-bottom: .75rem; padding: .7rem; border: 1px solid rgb(var(--c-accent) / .45);
  border-radius: .65rem; background: rgb(var(--c-accent) / .08);
}
.tier-operations-title { width: 100%; font-size: .82rem; font-weight: 700; color: rgb(var(--c-ink)); }
.tier-operation-btn {
  padding: .38rem .65rem; border: 1px solid rgb(var(--c-line)); border-radius: .5rem;
  background: rgb(var(--c-surface)); color: rgb(var(--c-ink)); font-size: .75rem;
}
.tier-operation-btn:hover:not(:disabled), .tier-operation-btn:focus-visible { border-color: rgb(var(--c-accent)); }
.tier-operation-btn:disabled { opacity: .45; cursor: not-allowed; }
.tier-operation-danger { color: rgb(var(--c-danger)); }

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

.tier-item { position: relative; width: 72px; height: 102px; border-radius: 4px; cursor: grab; background: rgb(var(--c-surface)); }
.tier-item-selected { outline: 3px solid rgb(var(--c-accent)); outline-offset: 1px; }
.tier-item-select { display: block; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 4px; overflow: hidden; cursor: grab; background: transparent; }
.tier-item-select:focus-visible { outline: 3px solid rgb(var(--c-accent)); outline-offset: -3px; }
.tier-item-select img { width: 100%; height: 100%; object-fit: cover; object-position: top; pointer-events: none; }
.tier-item-action {
  position: absolute; top: 0; width: 20px; height: 20px; line-height: 18px; text-align: center;
  font-size: 14px; font-weight: 800; color: #fff; background: rgb(0 0 0 / 0.68); border: 0; cursor: pointer;
  opacity: .82; transition: opacity .12s;
}
.tier-item-detail { left: 0; font-family: serif; font-style: italic; }
.tier-item-x {
  right: 0;
}
.tier-item:hover .tier-item-action, .tier-item-action:focus-visible { opacity: 1; }

.cand-strip {
  display: flex; flex-wrap: wrap; gap: 5px; max-height: 360px; overflow-y: auto;
  padding: 7px; border: 1px solid rgb(var(--c-line)); border-radius: 0.5rem; background: rgb(var(--c-surface));
}
.cand-item { position: relative; width: 72px; height: 102px; border-radius: 4px; overflow: hidden; cursor: pointer; background: rgb(var(--c-surface-2)); transition: transform .1s; }
.cand-item:hover { transform: translateY(-2px); outline: 2px solid rgb(var(--c-accent)); }
.cand-item:focus-visible, .cand-active { outline: 3px solid rgb(var(--c-accent)); outline-offset: 1px; }
.cand-item img { width: 100%; height: 100%; object-fit: cover; object-position: top; pointer-events: none; }
.cand-selected { outline: 3px solid rgb(var(--c-accent)); }
.cand-check {
  position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; line-height: 18px; text-align: center;
  border-radius: 999px; background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); font-size: 12px; font-weight: 800;
}
</style>
