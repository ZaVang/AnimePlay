<script setup lang="ts">
/**
 * 番剧问答 Quiz（小游戏 #2）。4 类题从真实数据派生，答对累 streak，答错结算。
 * 结算经济走 userStore.settleQuiz（与高低牌共享每日封顶）。
 */
import { ref, computed, onUnmounted } from 'vue';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import { useUserStore } from '@/stores/userStore';
import { streakReward } from '@/stores/minigames/higherLower';

const store = useMiniGamesStore();
const userStore = useUserStore();

const busy = ref(false);
const timers: number[] = [];
function schedule(fn: () => void, ms: number) { timers.push(window.setTimeout(fn, ms)); }
onUnmounted(() => timers.forEach(clearTimeout));

const finalScore = computed(() => streakReward(store.quizStreak));

function start() { store.startQuiz(); }

function choose(i: number) {
  if (busy.value || store.quizChosen !== null) return;
  busy.value = true;
  const correct = store.answerQuiz(i);
  schedule(() => {
    if (correct && !store.quizOver) {
      store.nextQuestion();
      busy.value = false;
    } else {
      userStore.settleQuiz();
      busy.value = false;
    }
  }, 1000);
}

function optionClass(i: number): string {
  if (store.quizChosen === null) return '';
  const q = store.quizQuestion;
  if (!q) return '';
  if (i === q.correctIndex) return 'quiz-opt-correct';
  if (i === store.quizChosen) return 'quiz-opt-wrong';
  return 'quiz-opt-dim';
}

function playAgain() { start(); }
function backToMenu() { store.quitQuiz(); }
</script>

<template>
  <div class="quiz-game">
    <!-- 未开始 -->
    <div v-if="!store.quizPlaying && !store.quizOver" class="quiz-menu">
      <h3 class="text-xl font-bold text-ink mb-1">❓ 番剧问答</h3>
      <p class="text-sm text-ink-soft mb-4">关于番剧/角色的 4 选 1 知识问答，答对越多分越高！</p>
      <button class="btn-primary" @click="start">开始答题</button>
      <div class="quiz-stats">
        <span>最佳连答：<b class="text-ink">{{ store.quizBestStreak }}</b></span>
        <span>历史最高分：<b class="text-ink">{{ store.quizHighScore }}</b></span>
        <span>今日还可获得：<b class="text-ink">{{ store.remainingDailyKp }}</b> 知识点</span>
      </div>
    </div>

    <!-- 答题中 -->
    <div v-else class="quiz-play">
      <div class="quiz-topbar">
        <span class="quiz-streak">🔥 连答 <b>{{ store.quizStreak }}</b></span>
        <span class="text-xs text-ink-soft">最佳 {{ store.quizBestStreak }}</span>
      </div>

      <template v-if="store.quizQuestion">
        <img
          v-if="store.quizQuestion.subjectImage"
          :src="store.quizQuestion.subjectImage"
          alt="题目图片"
          class="quiz-subject-img"
        />
        <p class="quiz-prompt">{{ store.quizQuestion.prompt }}</p>
        <div class="quiz-options">
          <button
            v-for="(opt, i) in store.quizQuestion.options"
            :key="i"
            class="quiz-opt"
            :class="optionClass(i)"
            :disabled="busy || store.quizChosen !== null"
            @click="choose(i)"
          >
            {{ opt }}
          </button>
        </div>
      </template>

      <div v-if="store.quizOver" class="quiz-over">
        <p class="quiz-over-title">答错了！</p>
        <p class="quiz-over-streak">本局连答 <b>{{ store.quizStreak }}</b> 题 · 得分 <b>{{ finalScore }}</b></p>
        <p v-if="store.quizLastAward > 0" class="quiz-over-award">🎉 兑换 {{ store.quizLastAward }} 知识点</p>
        <p v-else class="text-xs text-ink-soft">（今日小游戏奖励已达上限或未达 5 连，下次再来~）</p>
        <div class="quiz-btn-row mt-3">
          <button class="btn-primary" @click="playAgain">再来一局</button>
          <button class="btn-ghost" @click="backToMenu">换玩法</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-game { width: 100%; max-width: 600px; margin: 0 auto; text-align: center; }
.quiz-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; font-size: 0.8rem; color: rgb(var(--c-ink-soft)); margin-top: 1.25rem; }
.quiz-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.quiz-streak { font-size: 1.1rem; color: rgb(var(--c-ink)); }
.quiz-streak b { color: rgb(var(--c-accent)); }
.quiz-subject-img { width: 140px; height: 140px; object-fit: cover; border-radius: var(--sk-radius, 0.75rem); margin: 0 auto 0.75rem; border: 2px solid rgb(var(--c-border-line)); }
.quiz-prompt { font-size: 1.1rem; font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 1rem; }
.quiz-options { display: grid; gap: 0.65rem; }
.quiz-opt {
  padding: 0.75rem 1rem; border: 1.5px solid rgb(var(--c-border-line)); border-radius: var(--sk-radius, 0.6rem);
  background: rgb(var(--c-surface)); color: rgb(var(--c-ink)); font-weight: 600; cursor: pointer;
  transition: border-color .12s, background .12s;
}
.quiz-opt:hover:not(:disabled) { border-color: rgb(var(--c-accent)); }
.quiz-opt:disabled { cursor: default; }
.quiz-opt-correct { border-color: rgb(var(--c-success, 34 197 94)); background: rgb(var(--c-success, 34 197 94) / 0.12); }
.quiz-opt-wrong { border-color: rgb(var(--c-danger)); background: rgb(var(--c-danger) / 0.12); }
.quiz-opt-dim { opacity: 0.55; }
.quiz-over { margin-top: 1.25rem; }
.quiz-over-title { font-size: 1.1rem; font-weight: 700; color: rgb(var(--c-danger)); }
.quiz-over-streak { color: rgb(var(--c-ink)); margin-top: 0.25rem; }
.quiz-over-streak b { color: rgb(var(--c-accent)); }
.quiz-over-award { color: rgb(var(--c-accent)); font-weight: 700; margin-top: 0.25rem; }
.quiz-btn-row { display: flex; gap: 0.75rem; justify-content: center; }
</style>
