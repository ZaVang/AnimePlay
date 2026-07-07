<script setup lang="ts">
defineProps<{
  logs: string[];
}>();
</script>

<template>
  <section class="log-card">
    <div class="log-head">
      <span class="log-eyebrow">Battle Log</span>
      <h3>关键战斗日志</h3>
    </div>
    <div class="log-list">
      <div
        v-for="(log, index) in logs.slice().reverse()"
        :key="`${index}-${log}`"
        class="log-row"
      >
        {{ log }}
      </div>
      <div v-if="logs.length === 0" class="log-empty">
        战斗事件准备中
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 紧凑 g-card：面 + 线 + 面板圆角 + 柔和投影 + 顶部高光。 */
.log-card {
  position: relative; overflow: hidden;
  padding: .85rem 1rem;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); box-shadow: var(--sk-shadow-card);
}
.log-card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 40%; z-index: 0;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
  background: linear-gradient(180deg, rgb(var(--c-elevated) / .5), transparent);
  pointer-events: none;
}
.log-card > * { position: relative; z-index: 1; }

.log-head { display: flex; align-items: baseline; gap: .5rem; margin-bottom: .6rem; }
.log-eyebrow {
  font-size: .58rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase;
  color: rgb(var(--c-accent-2));
}
.log-head h3 { font-size: .95rem; font-weight: 900; color: rgb(var(--c-ink)); }

.log-list { max-height: 12rem; overflow-y: auto; padding-right: .25rem; display: flex; flex-direction: column; gap: .35rem; }
.log-row {
  padding: .4rem .6rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .6); font-size: .8rem; color: rgb(var(--c-ink-2)); line-height: 1.4;
}
.log-empty {
  padding: .4rem .6rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .6); font-size: .8rem; color: rgb(var(--c-ink-3));
}
</style>
