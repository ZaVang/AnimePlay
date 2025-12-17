import { ref, onMounted, onUnmounted } from 'vue';

export function useTrainingTimer() {
  const trainingCooldowns = ref<Record<string, number>>({});
  const trainingAnimations = ref<Record<string, boolean>>({});
  let cooldownUpdateInterval: ReturnType<typeof setInterval> | null = null;

  // 检查训练是否在冷却中
  function isTrainingOnCooldown(programId: string): boolean {
    const cooldownEnd = trainingCooldowns.value[programId];
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  // 获取训练剩余冷却时间 (秒)
  function getTrainingCooldownRemaining(programId: string): number {
    const cooldownEnd = trainingCooldowns.value[programId];
    if (!cooldownEnd) return 0;
    return Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
  }

  // 格式化冷却时间显示
  function formatCooldownTime(seconds: number): string {
    if (seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${remainingSeconds}秒`;
  }

  // 设置训练冷却
  function setTrainingCooldown(programId: string, durationMinutes: number) {
    trainingCooldowns.value[programId] = Date.now() + (durationMinutes * 60 * 1000);
  }

  // 启动训练动画
  function startTrainingAnimation(programId: string) {
    trainingAnimations.value[programId] = true;
    setTimeout(() => {
      trainingAnimations.value[programId] = false;
    }, 3000);
  }

  // 初始化定时器
  const initTimer = () => {
    cooldownUpdateInterval = setInterval(() => {
      const now = Date.now();
      Object.keys(trainingCooldowns.value).forEach(key => {
        if (trainingCooldowns.value[key] && now >= trainingCooldowns.value[key]) {
          delete trainingCooldowns.value[key];
        }
      });
    }, 1000);
  };

  // 清理定时器
  const cleanupTimer = () => {
    if (cooldownUpdateInterval !== null) {
      clearInterval(cooldownUpdateInterval);
    }
  };

  onMounted(initTimer);
  onUnmounted(cleanupTimer);

  return {
    trainingCooldowns,
    trainingAnimations,
    isTrainingOnCooldown,
    getTrainingCooldownRemaining,
    formatCooldownTime,
    setTrainingCooldown,
    startTrainingAnimation
  };
}