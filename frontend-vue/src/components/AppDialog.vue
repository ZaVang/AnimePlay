<script setup lang="ts">
/**
 * AppDialog（I5-T2）：全站统一主题化弹窗（替代原生 confirm/alert）。
 * 挂在 App.vue 顶层；由 useDialog composable 的模块级单例状态驱动显隐。
 * 颜色全走皮肤语义令牌 / rgb(var(--c-*))，无 text-white 压浅底——随 data-skin 切换。
 * 可达性：Teleport+backdrop+role=dialog；Esc 取消、回车确认、自动聚焦确认键。
 */
import { watch, nextTick, ref } from 'vue';
import { useDialogHost } from '@/composables/useDialog';

const { active, settle } = useDialogHost();

const confirmBtn = ref<HTMLButtonElement | null>(null);

function onConfirm() {
  settle(true);
}
function onCancel() {
  settle(false);
}
/** 键盘：Esc 取消、回车确认（alert 的回车也算确认）。 */
function onKeydown(e: KeyboardEvent) {
  if (!active.value) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    onCancel();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    onConfirm();
  }
}

// 弹窗出现时聚焦确认键（键盘可直接回车），便于可达性。
watch(active, async cur => {
  if (cur) {
    await nextTick();
    confirmBtn.value?.focus();
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="active"
      class="app-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="active.title || '提示'"
      tabindex="-1"
      @keydown="onKeydown"
      @click.self="onCancel"
    >
      <div class="app-dialog-card bg-elevated text-ink border border-line rounded-panel shadow-pop">
        <h2 v-if="active.title" class="text-lg font-bold text-ink mb-2">{{ active.title }}</h2>
        <p class="text-sm text-ink-2 leading-relaxed app-dialog-msg">{{ active.message }}</p>

        <div class="flex items-center justify-end gap-2 mt-5">
          <button
            v-if="active.kind === 'confirm'"
            class="btn-ghost text-sm"
            @click="onCancel"
          >
            {{ active.cancelText || '取消' }}
          </button>
          <button
            ref="confirmBtn"
            class="text-sm"
            :class="active.danger ? 'btn-danger' : 'btn-primary'"
            @click="onConfirm"
          >
            {{ active.confirmText || (active.kind === 'confirm' ? '确认' : '知道了') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110; /* 高于 onboarding(100) 与 header(50)：弹窗最顶层 */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(0 0 0 / 0.6);
  backdrop-filter: blur(2px);
  animation: app-dialog-fade 0.18s ease both;
}

.app-dialog-card {
  position: relative;
  width: 100%;
  max-width: 24rem;
  padding: 1.5rem;
  animation: app-dialog-pop 0.24s cubic-bezier(0.2, 1.3, 0.4, 1) both;
}

.app-dialog-msg {
  white-space: pre-line; /* 支持业务文案里的 \n 换行 */
  word-break: break-word;
}

@keyframes app-dialog-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes app-dialog-pop {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: none; }
}
</style>
