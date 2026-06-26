<script setup lang="ts">
/**
 * 多轴动画人格雷达（I3-T2）——只进**屏幕渲染区**，不进分享卡/出图 Canvas。
 *
 * 把品味报告里 5 个已算好的信号（buildTasteRadar）各折成 0–100 的人格轴，用 chart.js Radar 呈现。
 * 颜色随皮肤令牌（getComputedStyle 读 --c-accent），datalabels 显式关闭（全局插件，不关会糊顶点）。
 * 轴归一逻辑是纯函数 buildTasteRadar（tasteProfile.ts）+ 特征测试，组件只负责喂数据 + 配色。
 */
import { computed } from 'vue';
import { Radar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { TasteReport } from '@/utils/tasteProfile';
import { buildTasteRadar } from '@/utils/tasteProfile';

ChartJS.register(Tooltip, Legend, Filler, RadialLinearScale, PointElement, LineElement, ChartDataLabels);

const props = defineProps<{
  report: TasteReport;
}>();

/** 读皮肤令牌拼成 rgb()/rgba()；SSR/无 DOM 时回退到中性色。 */
function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v})` : fallback;
}
function cssVarA(name: string, alpha: number, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgba(${v.split(' ').join(', ')}, ${alpha})` : fallback;
}

const axes = computed(() => buildTasteRadar(props.report));

const chartData = computed(() => {
  const accent = cssVar('--c-accent', 'rgb(43,168,162)');
  const accentFill = cssVarA('--c-accent', 0.2, 'rgba(43,168,162,0.2)');
  return {
    labels: axes.value.map(a => a.label),
    datasets: [
      {
        label: '人格画像',
        data: axes.value.map(a => a.value),
        backgroundColor: accentFill,
        borderColor: accent,
        pointBackgroundColor: accent,
        pointBorderColor: accent,
        borderWidth: 2,
        fill: true,
      },
    ],
  };
});

const chartOptions = computed(() => {
  const ink2 = cssVar('--c-ink-2', 'rgb(110,110,110)');
  const line = cssVarA('--c-line', 0.5, 'rgba(120,120,120,0.4)');
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      // 全局已注册 datalabels；雷达顶点不显数字（否则 5 个顶点会糊数字）。
      datalabels: { display: false as const },
      tooltip: {
        callbacks: {
          label: (ctx: { parsed: { r: number } }) => `${ctx.parsed.r} / 100`,
        },
      },
    },
    scales: {
      r: {
        min: 0,
        max: 100,
        beginAtZero: true,
        ticks: { display: false, stepSize: 25 },
        grid: { color: line },
        angleLines: { color: line },
        pointLabels: {
          color: ink2,
          font: { size: 12, weight: 'bold' as const },
        },
      },
    },
  };
});
</script>

<template>
  <section class="radar-block">
    <h4 class="block-title">🕸️ 人格雷达</h4>
    <p class="radar-sub">把你的口味折成 5 条人格轴（各 0–100）：</p>
    <div class="radar-canvas">
      <Radar :data="chartData" :options="chartOptions" />
    </div>
    <div class="radar-legend">
      <span v-for="a in axes" :key="a.key" class="radar-tag">{{ a.label }} {{ a.value }}</span>
    </div>
  </section>
</template>

<style scoped>
.radar-block { margin-bottom: 1.1rem; }
.block-title { font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 0.5rem; font-size: 0.95rem; }
.radar-sub { font-size: 0.78rem; color: rgb(var(--c-ink-2)); margin-bottom: 0.5rem; }
.radar-canvas {
  position: relative; height: 320px; max-width: 420px; margin: 0 auto;
}
.radar-legend { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; margin-top: 0.5rem; }
.radar-tag {
  font-size: 0.72rem; padding: 0.15rem 0.55rem; border-radius: 999px;
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent));
  border: 1px solid rgb(var(--c-accent) / 0.3);
}
</style>
