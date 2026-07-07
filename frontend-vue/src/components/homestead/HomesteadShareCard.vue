<script setup lang="ts">
/**
 * HomesteadShareCard（S16-T13「基地身份卡」晒图）。
 * 聚合家园只读快照（buildHomesteadSnapshot）→ 手绘暖色 Canvas → toBlob → 系统分享 / 下载 PNG。
 * 零后端、零存档、零联机；**首版绝不 drawImage 任何远程角色 / 封面图**（跨域 taint → toBlob 抛 SecurityError）——
 * 角色「脸」用名字首字 + 稀有度色块自绘（Canvas fillText/roundRect），只在导出图里用固定品牌色（图片压片类合理例外）。
 * IO 复用现成 utils/shareImage.ts（canvasToPngBlob / shareOrDownloadImage），未造第二套晒图基建。
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { useProfileStore } from '@/stores/profile';
import { useHomesteadStore } from '@/stores/homestead';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCodexStore } from '@/stores/codex';
import { useFurnitureStore } from '@/stores/furniture';
import { useEquipmentStore } from '@/stores/equipment';
import {
  computeIdleYield,
  FURNITURE_CATALOG,
} from '@/config/homestead';
import { pickShowcaseRarity, pickTodaySpecialId, todayKey } from '@/config/homesteadDaily';
import { buildHomesteadSnapshot, type HomesteadSnapshotInput } from '@/wrapped/buildHomesteadSnapshot';
import { shareOrDownloadImage, canShareImage, canvasToPngBlob } from '@/utils/shareImage';
import type { Rarity } from '@/types/card';

const emit = defineEmits(['close']);

const profile = useProfileStore();
const homestead = useHomesteadStore();
const gameData = useGameDataStore();
const codex = useCodexStore();
const furniture = useFurnitureStore();
const equipment = useEquipmentStore();

const downloading = ref(false);
const downloadError = ref('');
const shareStatus = ref('');

/** 聚合 live store → 家园快照视图模型（只读派生，零副作用）。 */
const snapshot = computed(() => {
  const placedCards = homestead.placedCharacterIds
    .map(id => gameData.getCharacterCardById(id))
    .filter((c): c is NonNullable<typeof c> => c != null);

  // 收藏陈列稀有度（降级选择，0 收藏 → null；只读 codex 派生）。
  const cc = codex.characterCompletion;
  const ownedByRarity: Partial<Record<Rarity, number>> = {};
  for (const r of Object.keys(cc.byRarity) as Rarity[]) ownedByRarity[r] = cc.byRarity[r].owned;
  const scR = pickShowcaseRarity(ownedByRarity);
  const showcaseRarity = scR ? { rarity: scR, owned: cc.byRarity[scR].owned, total: cc.byRarity[scR].total } : null;

  // 基地舒适度（与家园 homeEffect.comfort 同源：逐入住装备 comfort + 家具 comfort）。
  const homeComfort =
    placedCards.reduce((sum, c) => sum + (equipment.resolveHomeEffect(c.id).comfort ?? 0), 0) +
    furniture.getComfort();
  // 羁绊命中（与家园口径同源：喂 computeIdleYield 的 bondHits）。
  const yieldRes = computeIdleYield(
    placedCards.map(c => c.rarity),
    3600_000,
    { comfort: homeComfort },
    undefined,
    placedCards.map(c => c.anime_names),
  );

  // 今日特殊角色名（date-seeded，与广场同源）。
  const todayId = pickTodaySpecialId(homestead.placedCharacterIds, todayKey());
  const todayName = todayId != null ? gameData.getCharacterCardById(todayId)?.name ?? null : null;

  const input: HomesteadSnapshotInput = {
    username: profile.currentUser || '',
    level: profile.core.level,
    placedCharacterNames: placedCards.map(c => c.name),
    furniturePlacedCount: FURNITURE_CATALOG.filter(d => furniture.isPlaced(d.id)).length,
    furnitureTotal: FURNITURE_CATALOG.length,
    showcaseRarity,
    bondHits: yieldRes.bondHits.map(h => ({ anime: h.anime, members: h.members })),
    todaySpecialName: todayName,
    comfort: homeComfort,
  };
  return buildHomesteadSnapshot(input);
});

const shareSupported = canShareImage();

// ===== 基地身份卡品牌固定色（暖色，导出图压片脱离皮肤独立成图） =====
const CARD_W = 600;
const CARD_H = 800;
const COL = {
  bgTop: '#fff3e0',
  bgMid: '#ffd9a8',
  bgBottom: '#ffbe86',
  panel: 'rgba(255,255,255,0.62)',
  panelLine: 'rgba(180,110,50,0.28)',
  ink: '#5a3a1e',
  inkSoft: '#8a6640',
  accent: '#e8792b',
  accent2: '#c9531a',
  gold: '#f2a52e',
  chipBg: 'rgba(255,255,255,0.7)',
};
/** 稀有度识别色（固定字面映射，压片合理例外）。 */
const RARITY_COL: Record<string, string> = {
  UR: '#ff6b6b',
  HR: '#f2a52e',
  SSR: '#a06bff',
  SR: '#3aa0ff',
  R: '#4bbf73',
  N: '#9aa0a6',
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 首字（角色名的第一个可见字，作 emoji 替身脸位，绝不 drawImage 远程图）。 */
function firstChar(name: string): string {
  const trimmed = (name || '').trim();
  return trimmed ? Array.from(trimmed)[0] : '?';
}

/** 把基地身份卡画到给定 canvas 上（供预览与下载复用）。 */
function drawCard(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = snapshot.value;
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // 暖色背景渐变
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, COL.bgTop);
  grad.addColorStop(0.55, COL.bgMid);
  grad.addColorStop(1, COL.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 顶部装饰光带
  const band = ctx.createLinearGradient(0, 0, CARD_W, 0);
  band.addColorStop(0, COL.gold);
  band.addColorStop(0.5, COL.accent);
  band.addColorStop(1, COL.accent2);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, CARD_W, 8);

  ctx.textAlign = 'center';

  // 品牌 eyebrow
  ctx.fillStyle = COL.accent2;
  ctx.font = '700 18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('☀ 我的基地 · 家园身份卡', CARD_W / 2, 52);

  // 主标题「XX 的家园」
  ctx.fillStyle = COL.ink;
  ctx.font = '800 42px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(s.title, CARD_W / 2, 104);
  ctx.fillStyle = COL.inkSoft;
  ctx.font = '600 18px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`Lv. ${s.level} · 基地舒适度 ${s.comfort}`, CARD_W / 2, 134);

  if (s.isEmpty) {
    // ── 空态优雅：愿景文案软化，绝不晒空网格 / 缺口条 ──
    ctx.fillStyle = COL.panel;
    roundRect(ctx, 40, 200, CARD_W - 80, 300, 20);
    ctx.fill();
    ctx.fillStyle = COL.accent2;
    ctx.font = '800 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('我的家园刚起步 ✨', CARD_W / 2, 300);
    ctx.fillStyle = COL.ink;
    ctx.font = '500 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('让角色入住、布置家具、收集角色卡，', CARD_W / 2, 348);
    ctx.fillText('这张卡会慢慢丰盈起来。', CARD_W / 2, 380);
    ctx.fillStyle = COL.inkSoft;
    ctx.font = '500 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('快来一起玩！', CARD_W / 2, 430);
    drawFooter(ctx);
    return;
  }

  // ── 入住阵容脸位（名字首字 + 暖色圆块自绘，绝不嵌远程图）──
  let y = 176;
  ctx.textAlign = 'left';
  ctx.fillStyle = COL.accent2;
  ctx.font = '700 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`入住阵容 · ${s.residentCount} 位`, 44, y);
  y += 16;
  const faces = s.residentNames;
  const faceSize = 64;
  const faceGap = 18;
  const totalW = faces.length * faceSize + (faces.length - 1) * faceGap;
  let fx = Math.max(44, (CARD_W - totalW) / 2);
  const fy = y;
  faces.forEach((name, i) => {
    const cx = fx + faceSize / 2;
    // 圆形底
    ctx.beginPath();
    ctx.arc(cx, fy + faceSize / 2, faceSize / 2, 0, Math.PI * 2);
    const fg = ctx.createLinearGradient(fx, fy, fx, fy + faceSize);
    fg.addColorStop(0, COL.gold);
    fg.addColorStop(1, COL.accent);
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
    // 首字
    ctx.fillStyle = '#fff';
    ctx.font = '800 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(firstChar(name), cx, fy + faceSize / 2 + 11);
    // 名字（截断）
    ctx.fillStyle = COL.ink;
    ctx.font = '500 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    const short = name.length > 5 ? name.slice(0, 5) + '…' : name;
    ctx.fillText(short, cx, fy + faceSize + 16);
    fx += faceSize + faceGap;
    void i;
  });
  const overflow = s.residentCount - faces.length;
  if (overflow > 0) {
    ctx.fillStyle = COL.inkSoft;
    ctx.font = '600 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`…等 ${s.residentCount} 位角色入住`, CARD_W / 2, fy + faceSize + 40);
  }

  // ── 2x2 正向指标网格（全部正着念，绝不缺口）──
  const gridTop = fy + faceSize + (overflow > 0 ? 58 : 40);
  const cells: { label: string; value: string; color: string }[] = [
    { label: '入住角色', value: `${s.residentCount} 位`, color: COL.accent },
    { label: '家具陈列', value: `${s.furniturePlaced}/${s.furnitureTotal}`, color: COL.gold },
    {
      label: s.showcase ? `拥有 ${s.showcase.rarity}` : '收藏',
      value: s.showcase ? `${s.showcase.owned}/${s.showcase.total}` : '起步中',
      color: s.showcase ? (RARITY_COL[s.showcase.rarity] ?? COL.accent) : COL.inkSoft,
    },
    { label: '同好羁绊', value: s.bondCount > 0 ? `${s.bondCount} 组` : '待结缘', color: COL.accent2 },
  ];
  const cellW = (CARD_W - 80 - 16) / 2;
  const cellH = 82;
  const gap = 16;
  cells.forEach((cell, i) => {
    const px = 40 + (i % 2) * (cellW + gap);
    const py = gridTop + Math.floor(i / 2) * (cellH + gap);
    ctx.fillStyle = COL.panel;
    roundRect(ctx, px, py, cellW, cellH, 16);
    ctx.fill();
    ctx.strokeStyle = COL.panelLine;
    ctx.lineWidth = 1;
    roundRect(ctx, px, py, cellW, cellH, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = cell.color;
    ctx.font = '800 30px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(cell.value, px + cellW / 2, py + 42);
    ctx.fillStyle = COL.inkSoft;
    ctx.font = '600 15px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(cell.label, px + cellW / 2, py + 66);
  });

  // ── 羁绊作品名带（社交货币：真实追番信息）──
  let by = gridTop + 2 * cellH + gap + 34;
  if (s.bondAnimes.length > 0) {
    ctx.fillStyle = COL.panel;
    roundRect(ctx, 40, by - 24, CARD_W - 80, 76, 16);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = COL.accent2;
    ctx.font = '700 14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('同作品羁绊', 60, by);
    ctx.fillStyle = COL.ink;
    ctx.font = '700 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    const line = s.bondAnimes.map(a => `《${a.length > 12 ? a.slice(0, 12) + '…' : a}》`).join('  ');
    ctx.fillText(line.length > 30 ? line.slice(0, 30) + '…' : line, 60, by + 26);
    by += 76;
  }

  // ── 今日特殊角色寄语（date-seeded，每天不同 → 鼓励重复晒）──
  if (s.todaySpecialName) {
    ctx.textAlign = 'center';
    ctx.fillStyle = COL.accent2;
    ctx.font = '600 17px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`☀ 今天「${s.todaySpecialName}」心情特别好`, CARD_W / 2, Math.min(by + 30, 720));
  }

  drawFooter(ctx);
}

function drawFooter(ctx: CanvasRenderingContext2D) {
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.inkSoft;
  ctx.font = '500 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('我的番剧宅修 · 家园基地 · 一起来玩', CARD_W / 2, 774);
}

const previewCanvas = ref<HTMLCanvasElement | null>(null);
function renderPreview() {
  if (previewCanvas.value) drawCard(previewCanvas.value);
}
onMounted(() => {
  nextTick(renderPreview);
});

/** 一键分享（复用 shareImage.ts）：支持环境调起系统分享面板，否则回落下载。 */
async function shareOrDownload() {
  if (downloading.value) return;
  downloading.value = true;
  downloadError.value = '';
  shareStatus.value = '';
  try {
    const canvas = document.createElement('canvas');
    drawCard(canvas);
    const blob = await canvasToPngBlob(canvas);
    const filename = `animeplay-homestead-${snapshot.value.username || 'base'}.png`;
    const result = await shareOrDownloadImage(blob, filename, {
      title: '我的家园基地身份卡',
      text: '来看看我的家园！《动画宅的自我修养》',
    });
    if (result === 'shared') shareStatus.value = '已调起分享面板';
    else if (result === 'downloaded') shareStatus.value = '已下载到本地';
  } catch (e) {
    downloadError.value = e instanceof Error ? e.message : '生成图片失败。';
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
    @click="emit('close')"
  >
    <div
      class="bg-elevated text-ink border border-line rounded-panel shadow-pop max-w-md w-full max-h-[92vh] overflow-y-auto p-5"
      @click.stop
    >
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-ink">🏠 我的基地身份卡</h2>
        <button class="btn-ghost text-sm" @click="emit('close')">关闭</button>
      </div>

      <p class="text-sm text-ink-2 mb-3">
        把你的家园入住阵容、陈列、收藏和羁绊生成一张暖色身份卡，分享或下载都行。
      </p>

      <div class="share-preview-wrap">
        <canvas ref="previewCanvas" class="share-preview-canvas" />
      </div>

      <p v-if="downloadError" class="text-danger text-sm mt-2">{{ downloadError }}</p>
      <p v-else-if="shareStatus" class="text-ink-2 text-sm mt-2">{{ shareStatus }}</p>

      <div class="flex gap-2 mt-4">
        <button class="btn-secondary flex-1" @click="renderPreview">刷新预览</button>
        <button class="btn-primary flex-1" :disabled="downloading" @click="shareOrDownload">
          {{ downloading ? '生成中…' : (shareSupported ? '📤 分享 / 保存' : '下载 PNG') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.share-preview-wrap {
  display: flex;
  justify-content: center;
  background: rgb(var(--c-surface-2));
  border: 1px solid rgb(var(--c-line));
  border-radius: var(--sk-radius-control, 0.5rem);
  padding: 0.75rem;
}
.share-preview-canvas {
  width: 100%;
  max-width: 300px;
  height: auto;
  border-radius: 0.5rem;
  display: block;
}
</style>
