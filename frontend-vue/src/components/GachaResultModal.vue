<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { DrawnCard } from '@/stores/gachaStore';
import AnimeCard from './AnimeCard.vue';
import CharacterCard from './CharacterCard.vue';

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    cards: DrawnCard[];
    gachaType: 'anime' | 'character';
    /** E3-T1：首抽庆祝态（这个账号的第一抽），由 GachaView 抽卡前判定后传入。 */
    isFirstDraw?: boolean;
  }>(),
  { isFirstDraw: false },
);

const emit = defineEmits(['close']);

/** S7 仪式感：逐张翻面揭示；点击遮罩先跳过动画，全部亮出后再点才关闭。 */
const REVEAL_STEP_MS = 120;
const REVEAL_DURATION_MS = 500;
const skipped = ref(false);
const revealTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const fullyRevealed = ref(false);

watch(
  () => props.isOpen,
  open => {
    if (revealTimer.value) clearTimeout(revealTimer.value);
    skipped.value = false;
    fullyRevealed.value = false;
    if (open) {
      const total = props.cards.length * REVEAL_STEP_MS + REVEAL_DURATION_MS;
      revealTimer.value = setTimeout(() => { fullyRevealed.value = true; }, total);
    }
  },
);

function handleBackdropClick() {
  if (!fullyRevealed.value && !skipped.value) {
    skipped.value = true;
    fullyRevealed.value = true;
    return;
  }
  emit('close');
}

const RARITY_ORDER = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'] as const;
const bestRarity = computed(() => {
  for (const r of RARITY_ORDER) {
    if (props.cards.some(c => c.rarity === r)) return r;
  }
  return 'N';
});
const headline = computed(() => {
  if (bestRarity.value === 'UR') return { text: '✨ 传说降临！', cls: 'headline-ur' };
  if (bestRarity.value === 'HR') return { text: '💜 稀世之光！', cls: 'headline-hr' };
  if (bestRarity.value === 'SSR') return { text: '🌟 金光一闪！', cls: 'headline-ssr' };
  return null;
});

function glowClass(rarity: string) {
  if (rarity === 'UR') return 'glow-ur';
  if (rarity === 'HR') return 'glow-hr';
  if (rarity === 'SSR') return 'glow-ssr';
  return '';
}

/**
 * E3-T1 首抽庆祝：静态彩纸碎片（纯 CSS 动画，无定时器/RAF → 无需登记清除）。
 * 坐标/延时在模块加载时固定一次（非随机渲染，避免每帧重算）。
 */
const CONFETTI = Array.from({ length: 24 }, (_, i) => ({
  left: (i * 4.3 + (i % 5) * 7) % 100,
  delay: (i % 8) * 0.18,
  duration: 2.4 + (i % 4) * 0.5,
  color: ['#ff5c5c', '#ffb13d', '#3CC4BD', '#9d6fe0', '#FFD23F'][i % 5],
}));
</script>

<template>
  <!-- 遮罩层 -->
  <div
    v-if="isOpen"
    @click="handleBackdropClick"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
  >
    <!-- E3-T1 首抽庆祝：彩纸层（仅首抽显示，纯 CSS 动画无定时器） -->
    <div v-if="isFirstDraw" class="confetti-layer" aria-hidden="true">
      <span
        v-for="(p, i) in CONFETTI"
        :key="i"
        class="confetti-piece"
        :style="{
          left: p.left + '%',
          animationDelay: p.delay + 's',
          animationDuration: p.duration + 's',
          backgroundColor: p.color,
        }"
      />
    </div>

    <!-- 弹窗内容 -->
    <div
      @click.stop="handleBackdropClick"
      class="gacha-result-card bg-elevated p-6 rounded-panel shadow-pop max-w-4xl w-full max-h-[90vh] flex flex-col"
      :class="{ 'first-draw-frame': isFirstDraw }"
    >
      <!-- 首抽专属横幅 -->
      <div v-if="isFirstDraw" class="first-draw-banner">
        🎉 欢迎来到动画宅的世界 · 你的第一抽！
      </div>
      <h2 class="text-2xl font-bold mb-1 text-center text-ink">抽卡结果</h2>
      <p v-if="headline" class="gacha-headline" :class="headline.cls">{{ headline.text }}</p>
      <p v-else class="text-center text-xs text-ink-3 mb-3">点击任意处跳过动画</p>
      <div class="overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4" :class="{ 'reveal-all': skipped }">
          <div
            v-for="(card, i) in cards"
            :key="`${card.id}-${i}`"
            class="reveal-item"
            :class="glowClass(card.rarity)"
            :style="{ animationDelay: `${i * REVEAL_STEP_MS}ms` }"
          >
            <AnimeCard
              v-if="gachaType === 'anime'"
              :anime="(card as any)"
              :is-new="card.isNew"
              :is-duplicate="card.isDuplicate"
            />
            <CharacterCard
              v-else-if="gachaType === 'character'"
              :character="card"
              :is-new="card.isNew"
              :is-duplicate="card.isDuplicate"
            />
          </div>
        </div>
      </div>
      <div class="text-center mt-6">
        <button @click.stop="emit('close')" class="btn-primary font-bold px-6">
          确认
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 弹窗入场 */
.gacha-result-card {
  position: relative;
  animation: gacha-pop 0.35s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

/* ===== E3-T1 首抽庆祝 ===== */
.first-draw-frame {
  box-shadow: 0 0 0 2px rgba(255, 209, 63, 0.7), 0 0 30px 6px rgba(255, 177, 61, 0.35),
    var(--sk-shadow-pop, 0 20px 40px rgba(0, 0, 0, 0.3));
}
.first-draw-banner {
  text-align: center;
  font-weight: 700;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
  margin-bottom: 0.5rem;
  padding: 0.4rem 0.75rem;
  border-radius: 9999px;
  background: linear-gradient(90deg, #ff5c5c, #ffb13d, #ffd23f);
  background-size: 200% 100%;
  color: #4a2a00; /* 暖底上的深字，固定色（庆祝横幅压片，脱离皮肤 token） */
  animation: first-draw-shimmer 2.4s linear infinite;
}
@keyframes first-draw-shimmer {
  to { background-position: 200% 0; }
}

/* 彩纸：从顶部飘落，纯 CSS keyframe，无定时器 */
.confetti-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
.confetti-piece {
  position: absolute;
  top: -8%;
  width: 8px;
  height: 12px;
  border-radius: 2px;
  opacity: 0.9;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes confetti-fall {
  0% { transform: translateY(-10vh) rotateZ(0deg); opacity: 0; }
  10% { opacity: 0.95; }
  100% { transform: translateY(110vh) rotateZ(540deg); opacity: 0.7; }
}

@keyframes gacha-pop {
  from { opacity: 0; transform: scale(0.88) translateY(12px); }
  to { opacity: 1; transform: none; }
}

/* 高稀有度横幅 */
.gacha-headline {
  text-align: center;
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  letter-spacing: 0.08em;
  animation: headline-in 0.6s 0.25s both;
}
.headline-ssr { color: #d4a017; }
.headline-hr { color: #9d6fe0; }
.headline-ur {
  background: linear-gradient(90deg, #ff5c5c, #ffb13d, #ff5c5c);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: headline-in 0.6s 0.25s both, ur-shimmer 1.8s linear infinite;
}
@keyframes headline-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
}
@keyframes ur-shimmer {
  to { background-position: 200% 0; }
}

/* 逐张 3D 翻面揭示 */
.reveal-item {
  border-radius: 0.5rem;
  animation: card-reveal 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both;
}
@keyframes card-reveal {
  0% { opacity: 0; transform: perspective(640px) rotateY(82deg) translateY(14px) scale(0.86); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: none; }
}
/* 跳过：全部立即亮出 */
.reveal-all .reveal-item {
  animation-delay: 0ms !important;
  animation-duration: 0.18s;
}

/* 稀有度光环（识别色固定，不随皮肤） */
.glow-ssr {
  box-shadow: 0 0 14px 2px rgba(250, 204, 21, 0.5);
  animation: card-reveal 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both, pulse-ssr 1.8s ease-in-out 0.6s infinite;
}
.glow-hr {
  box-shadow: 0 0 16px 3px rgba(168, 85, 247, 0.55);
  animation: card-reveal 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both, pulse-hr 1.6s ease-in-out 0.6s infinite;
}
.glow-ur {
  box-shadow: 0 0 18px 4px rgba(239, 68, 68, 0.55), 0 0 34px 8px rgba(255, 177, 61, 0.35);
  animation: card-reveal 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) both, pulse-ur 1.4s ease-in-out 0.6s infinite;
}
@keyframes pulse-ssr {
  50% { box-shadow: 0 0 20px 4px rgba(250, 204, 21, 0.75); }
}
@keyframes pulse-hr {
  50% { box-shadow: 0 0 24px 5px rgba(168, 85, 247, 0.8); }
}
@keyframes pulse-ur {
  50% { box-shadow: 0 0 26px 6px rgba(239, 68, 68, 0.85), 0 0 44px 12px rgba(255, 177, 61, 0.5); }
}
</style>
