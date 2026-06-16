/**
 * onboarding 状态（E3-T1，FTUE 点火）。
 * 设备级 localStorage 标志（仿 theme.ts 的读写 pattern）：是否已看过首登引导。
 * **不进存档、不升 schema**——引导是「这台设备的新人是否需要被带一遍」，与账号漫游无关。
 * engine 纯净铁律只约束 engine/ 目录；stores 层用 localStorage 有 theme/settings 先例。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'onboarding-done';

/** 读设备标志：已完成/已跳过引导返回 true。node/无 DOM 环境静默回落 false（视作新设备）。 */
function readDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    /* localStorage 不可用时静默回落「未完成」——大不了多弹一次，不阻塞。 */
    return false;
  }
}

function writeDone() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* 写不进就算了：这一会话内仍靠 ref 不再弹，下次再触发也只是再走一遍引导。 */
  }
}

export const useOnboardingStore = defineStore('onboarding', () => {
  /** 设备是否已看过引导（初始化即读设备缓存）。 */
  const hasSeenGuide = ref<boolean>(readDone());
  /** 引导遮罩是否正在显示（会话级，由登录触发开、跳过/完成关）。 */
  const showGuide = ref<boolean>(false);

  /** 登录成功后调用：设备未看过引导则开遮罩。 */
  function maybeStartGuide() {
    if (!hasSeenGuide.value) {
      showGuide.value = true;
    }
  }

  /** 跳过或完成引导：关遮罩 + 落设备标志，不再自动弹。 */
  function finishGuide() {
    showGuide.value = false;
    hasSeenGuide.value = true;
    writeDone();
  }

  /** 手动重看引导（设置项可调用）：不清设备标志，仅本次显示。 */
  function replayGuide() {
    showGuide.value = true;
  }

  return { hasSeenGuide, showGuide, maybeStartGuide, finishGuide, replayGuide };
});
