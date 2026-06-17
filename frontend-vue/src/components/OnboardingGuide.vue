<script setup lang="ts">
/**
 * OnboardingGuide（E3-T1，FTUE）：首登 4 步引导遮罩。
 * 由 onboarding store 的 showGuide 控制显隐；挂在 App.vue 顶层（z-index 高于 header z-50）。
 * 纯设备级（localStorage 标志），不进存档、不升 schema。
 * 颜色全走语义类 / rgb(var(--c-*))，无 text-white 压浅底。
 */
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useOnboardingStore } from '@/stores/onboarding';

const onboarding = useOnboardingStore();
const router = useRouter();

interface Step {
  icon: string;
  title: string;
  body: string;
  /** 「带我去」目标路由；最后一步可为对战入口。 */
  route?: string;
  cta?: string;
}

const steps: Step[] = [
  {
    icon: '📅',
    title: '每天来打个卡',
    body: '主页有「今日任务」面板：抽卡、赢对战、收观看都会自动累计进度，做满就能领奖。每天首次登录还有一份登录奖励，别忘了回来。',
  },
  {
    icon: '🎴',
    title: '抽卡攒你的番剧库',
    body: '用动画券/角色券在抽卡系统里开卡。这里的每张卡都是真实番剧与角色，稀有度越高越难得——首抽我们给你留了点惊喜。',
    route: '/gacha',
    cta: '去抽卡',
  },
  {
    icon: '📚',
    title: '收藏与图鉴是你的成果墙',
    body: '抽到的卡进「卡牌收藏」，图鉴会统计你的完成度（动画/角色各稀有度 X/总数）并发里程碑奖励。攒满一档稀有度很有成就感。',
    route: '/collections',
    cta: '看收藏',
  },
  {
    icon: '⚔️',
    title: '打第一场对战',
    body: '「宅理论战」是卡牌辩论：双方亮出番剧卡对撞，比的是卡角上的 ⚔ 强度——高者占上风。三种赢法：把对方声望打到 0、把议题偏向条推到自己一侧、或撑满 12 回合后声望领先。出牌时「友好安利」稳、「辛辣点评」更狠但多花 TP。也可去「小队战斗」爬挑战塔。（首次进对战会自动弹一份规则详解）',
    route: '/battle',
    cta: '去对战',
  },
];

const stepIndex = ref(0);
const current = computed(() => steps[stepIndex.value]);
const isLast = computed(() => stepIndex.value === steps.length - 1);

function next() {
  if (isLast.value) {
    finish();
    return;
  }
  stepIndex.value++;
}

function prev() {
  if (stepIndex.value > 0) stepIndex.value--;
}

function skip() {
  onboarding.finishGuide();
}

function finish() {
  onboarding.finishGuide();
}

/** 「带我去」：完成引导并跳到该系统页。 */
function goTo() {
  const target = current.value.route;
  onboarding.finishGuide();
  if (target) router.push(target);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="onboarding.showGuide"
      class="onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="新手引导"
    >
      <div class="onboarding-card bg-elevated text-ink border border-line rounded-panel shadow-pop">
        <!-- 跳过 -->
        <button class="onboarding-skip btn-ghost text-xs" @click="skip">跳过引导</button>

        <!-- 步骤进度点 -->
        <div class="flex items-center justify-center gap-2 pt-7 pb-1">
          <span
            v-for="(s, i) in steps"
            :key="i"
            class="onboarding-dot"
            :class="{ 'onboarding-dot--active': i === stepIndex, 'onboarding-dot--done': i < stepIndex }"
          />
        </div>

        <div class="px-7 pb-2 text-center">
          <div class="onboarding-icon">{{ current.icon }}</div>
          <h2 class="text-xl font-bold text-ink mb-2">{{ current.title }}</h2>
          <p class="text-sm text-ink-2 leading-relaxed">{{ current.body }}</p>
        </div>

        <p class="text-center text-xs text-ink-3 mb-3">
          第 {{ stepIndex + 1 }} / {{ steps.length }} 步
        </p>

        <div class="flex items-center justify-between gap-2 px-7 pb-6">
          <button
            class="btn-ghost text-sm"
            :disabled="stepIndex === 0"
            @click="prev"
          >
            上一步
          </button>

          <div class="flex items-center gap-2">
            <button
              v-if="current.route"
              class="btn-secondary text-sm"
              @click="goTo"
            >
              {{ current.cta }}
            </button>
            <button class="btn-primary text-sm" @click="next">
              {{ isLast ? '开始游玩' : '下一步' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.onboarding-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100; /* 高于 header 的 z-50，盖住全站 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 0.65);
  backdrop-filter: blur(2px);
  animation: onboarding-fade 0.25s ease both;
}

.onboarding-card {
  position: relative;
  width: 100%;
  max-width: 28rem;
  animation: onboarding-pop 0.32s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

.onboarding-skip {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.onboarding-icon {
  font-size: 3rem;
  line-height: 1;
  margin-bottom: 0.75rem;
}

.onboarding-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: rgb(var(--c-line-2));
  transition: all 0.2s;
}
.onboarding-dot--active {
  width: 22px;
  background: rgb(var(--c-accent));
}
.onboarding-dot--done {
  background: rgb(var(--c-accent) / 0.5);
}

@keyframes onboarding-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes onboarding-pop {
  from { opacity: 0; transform: scale(0.9) translateY(10px); }
  to { opacity: 1; transform: none; }
}
</style>
