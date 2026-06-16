<script setup lang="ts">
/**
 * ShareCard（E3-T2，可分享 Wrapped 成绩卡）。
 * 聚合纯派生数据（buildWrappedStats）→ 手绘 Canvas → toBlob → a.download 下载 PNG。
 * 零后端、零存档、零联机；首版不嵌远程封面图（规避 canvas cross-origin taint）。
 * 导出图本体用固定品牌色自绘（脱离皮肤 token 独立成图，属图片压片类合理固定色例外）。
 */
import { computed, nextTick, onMounted, ref } from 'vue';
import { useProfileStore } from '@/stores/profile';
import { useCodexStore } from '@/stores/codex';
import { useAchievementsStore } from '@/stores/achievements';
import { usePveStore } from '@/stores/pve';
import { useCollectionStore } from '@/stores/collection';
import { useGachaStore } from '@/stores/gachaStore';
import { ACHIEVEMENTS } from '@/config/achievements';
import { buildWrappedStats, type WrappedInput } from '@/wrapped/buildWrappedStats';

const emit = defineEmits(['close']);

const profile = useProfileStore();
const codex = useCodexStore();
const achievements = useAchievementsStore();
const pve = usePveStore();
const collection = useCollectionStore();
const gacha = useGachaStore();

const downloading = ref(false);
const downloadError = ref('');

/** 聚合 live store → 成绩卡视图模型。 */
const stats = computed(() => {
  const input: WrappedInput = {
    username: profile.currentUser || '匿名宅',
    level: profile.core.level,
    knowledgePoints: profile.core.knowledgePoints,
    animeCompletion: codex.animeCompletion,
    characterCompletion: codex.characterCompletion,
    achievementsUnlocked: achievements.unlocked.length,
    achievementsTotal: ACHIEVEMENTS.length,
    milestonesClaimed: codex.claimedMilestones.length,
    towerMaxFloor: pve.towerProgress.maxFloor,
    uniqueCardsOwned: collection.animeCollection.size + collection.characterCollection.size,
    history: [...gacha.animeHistory, ...gacha.characterHistory],
  };
  return buildWrappedStats(input);
});

// ===== 成绩卡品牌固定色（导出图压片，脱离皮肤独立成图） =====
const CARD_W = 600;
const CARD_H = 800;
const COL = {
  bgTop: '#1a1340',
  bgBottom: '#2d1b5e',
  accent: '#ffb13d',
  accent2: '#ff5c5c',
  teal: '#3CC4BD',
  purple: '#9d6fe0',
  gold: '#FFD23F',
  ink: '#f4f1ff',
  inkSoft: '#b8aede',
  panel: 'rgba(255,255,255,0.06)',
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

/** 把成绩卡画到给定 canvas 上（同时供预览 onMounted 与下载复用）。 */
function drawCard(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const s = stats.value;
  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // 背景渐变
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, COL.bgTop);
  grad.addColorStop(1, COL.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 顶部装饰光带
  const band = ctx.createLinearGradient(0, 0, CARD_W, 0);
  band.addColorStop(0, COL.accent2);
  band.addColorStop(0.5, COL.accent);
  band.addColorStop(1, COL.gold);
  ctx.fillStyle = band;
  ctx.fillRect(0, 0, CARD_W, 8);

  ctx.textAlign = 'center';

  // 品牌名
  ctx.fillStyle = COL.inkSoft;
  ctx.font = '600 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('动画宅的自我修养 · 成绩卡', CARD_W / 2, 56);

  // 用户名 + 等级
  ctx.fillStyle = COL.ink;
  ctx.font = '800 40px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(s.username, CARD_W / 2, 110);
  ctx.fillStyle = COL.accent;
  ctx.font = '700 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`Lv. ${s.level}`, CARD_W / 2, 144);

  // 主指标：图鉴完成度大数字
  ctx.fillStyle = COL.teal;
  ctx.font = '800 96px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`${s.codexPercent}%`, CARD_W / 2, 256);
  ctx.fillStyle = COL.inkSoft;
  ctx.font = '500 20px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText(`图鉴完成度  ${s.codexOwned} / ${s.codexTotal}`, CARD_W / 2, 290);

  // 进度条
  const barX = 80;
  const barW = CARD_W - 160;
  const barY = 312;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, barX, barY, barW, 14, 7);
  ctx.fill();
  const fillW = Math.max(0, Math.min(barW, (barW * s.codexPercent) / 100));
  if (fillW > 0) {
    const bg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    bg.addColorStop(0, COL.teal);
    bg.addColorStop(1, COL.accent);
    ctx.fillStyle = bg;
    roundRect(ctx, barX, barY, fillW, 14, 7);
    ctx.fill();
  }

  // 2x3 指标网格
  const cells: { label: string; value: string; color: string }[] = [
    { label: '解锁成就', value: `${s.achievementsUnlocked}/${s.achievementsTotal}`, color: COL.gold },
    { label: '图鉴里程碑', value: `${s.milestonesClaimed}`, color: COL.purple },
    { label: '挑战塔最高', value: `${s.towerMaxFloor} 层`, color: COL.accent2 },
    { label: '拥有卡种', value: `${s.uniqueCardsOwned}`, color: COL.teal },
    { label: '累计抽卡', value: `${s.totalPulls}`, color: COL.accent },
    { label: 'UR 入手', value: `${s.urPulls}`, color: COL.gold },
  ];
  const gridTop = 372;
  const cellW = (CARD_W - 80) / 2;
  const cellH = 96;
  const gap = 16;
  cells.forEach((cell, i) => {
    const cx = 40 + (i % 2) * (cellW + 0);
    const cy = gridTop + Math.floor(i / 2) * (cellH + gap);
    const px = cx + (i % 2 === 0 ? 0 : gap);
    const pw = cellW - gap / 2;
    ctx.fillStyle = COL.panel;
    roundRect(ctx, px, cy, pw, cellH, 14);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = cell.color;
    ctx.font = '800 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(cell.value, px + pw / 2, cy + 50);
    ctx.fillStyle = COL.inkSoft;
    ctx.font = '500 17px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(cell.label, px + pw / 2, cy + 78);
  });

  // 欧气小结
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.ink;
  ctx.font = '600 19px "PingFang SC", "Microsoft YaHei", sans-serif';
  const luck =
    s.totalPulls === 0
      ? '还没开始抽卡，去攒第一张番剧卡吧！'
      : `高稀有率 ${s.luckyPercent}% · 近一月入手 ${s.urThisMonth} 张 UR`;
  ctx.fillText(luck, CARD_W / 2, 740);

  // 页脚
  ctx.fillStyle = COL.inkSoft;
  ctx.font = '500 15px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.fillText('我的番剧宅修养成绩 · 一起来玩', CARD_W / 2, 772);
}

const previewCanvas = ref<HTMLCanvasElement | null>(null);

function renderPreview() {
  if (previewCanvas.value) drawCard(previewCanvas.value);
}

onMounted(() => {
  // 等 DOM 挂载后画首帧预览
  nextTick(renderPreview);
});

function download() {
  if (downloading.value) return;
  downloading.value = true;
  downloadError.value = '';
  try {
    // 用一个离屏 canvas 出图，避免预览 canvas 被 DPR 缩放干扰
    const canvas = document.createElement('canvas');
    drawCard(canvas);
    canvas.toBlob(blob => {
      if (!blob) {
        downloadError.value = '生成图片失败，请重试。';
        downloading.value = false;
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `animeplay-wrapped-${stats.value.username}.png`;
      a.click();
      URL.revokeObjectURL(url); // S9 性能轮清过泄漏，用完即释放
      downloading.value = false;
    }, 'image/png');
  } catch (e) {
    downloadError.value = e instanceof Error ? e.message : '生成图片失败。';
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
        <h2 class="text-lg font-bold text-ink">🎴 我的成绩卡</h2>
        <button class="btn-ghost text-sm" @click="emit('close')">关闭</button>
      </div>

      <p class="text-sm text-ink-2 mb-3">
        把你的图鉴完成度、成就和欧气生成一张图，下载后即可分享。
      </p>

      <!-- 预览（按比例缩放显示，下载用全尺寸离屏 canvas） -->
      <div class="share-preview-wrap">
        <canvas ref="previewCanvas" class="share-preview-canvas" />
      </div>

      <p v-if="downloadError" class="text-danger text-sm mt-2">{{ downloadError }}</p>

      <div class="flex gap-2 mt-4">
        <button class="btn-secondary flex-1" @click="renderPreview">刷新预览</button>
        <button class="btn-primary flex-1" :disabled="downloading" @click="download">
          {{ downloading ? '生成中…' : '下载 PNG' }}
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
