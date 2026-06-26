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
import { ONBOARDING_STEPS } from '@/config/onboardingSteps';

const onboarding = useOnboardingStore();
const router = useRouter();

// 步数据抽到 config/onboardingSteps.ts（纯数据，便于单测）；isLast/进度点/按钮全是 length 派生。
const steps = ONBOARDING_STEPS;

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
