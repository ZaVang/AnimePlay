<script setup lang="ts">
import { rarityStyle } from '@/config/equipmentColors';
import type { Rarity } from '@/types/card';
import type { SquadBattleRewardView } from './types';

const props = defineProps<{
  result: 'victory' | 'defeat' | null;
  rewards: SquadBattleRewardView;
  canRetry: boolean;
}>();

defineEmits<{
  continue: [];
  retry: [];
}>();

// 装备掉落稀有度色：走既有稀有度识别色映射（rarityStyle 返回完整字面 text-* 类），不自造 hex。
const dropRarityTextClass = () =>
  props.rewards.equipmentDrop ? rarityStyle(props.rewards.equipmentDrop.rarity as Rarity).text : '';
</script>

<template>
  <section class="result-card" :class="result === 'victory' ? 'is-win' : 'is-lose'">
    <span class="result-eyebrow">{{ result === 'victory' ? 'Victory' : 'Defeat' }}</span>
    <h2 class="result-title" :class="result === 'victory' ? 'text-accent' : 'text-danger'">
      {{ result === 'victory' ? '战斗胜利' : '战斗失败' }}
    </h2>

    <div class="reward-grid">
      <div class="reward-box">
        <span class="reward-label">角色经验</span>
        <strong class="reward-val num text-accent">+{{ rewards.characterExp }}</strong>
      </div>
      <div class="reward-box">
        <span class="reward-label">知识点</span>
        <strong class="reward-val num text-highlight">+{{ rewards.knowledgePoints }}</strong>
      </div>
      <div class="reward-box">
        <span class="reward-label">装备掉落</span>
        <strong class="reward-val drop">
          <template v-if="rewards.equipmentDrop">
            <span class="drop-rarity" :class="dropRarityTextClass()">[{{ rewards.equipmentDrop.rarity }}]</span>
            <span class="text-ink">{{ rewards.equipmentDrop.name }}</span>
          </template>
          <span v-else class="text-ink-3">无</span>
        </strong>
      </div>
    </div>

    <div class="result-actions">
      <button type="button" class="btn-continue" @click="$emit('continue')">
        {{ result === 'victory' ? '继续挑战' : '返回爬塔' }}
      </button>
      <button v-if="canRetry" type="button" class="btn-retry" @click="$emit('retry')">
        再次挑战
      </button>
    </div>
  </section>
</template>

<style scoped>
/* 手游结算卡：g-card 底子 + 顶部 40% 高光；胜/负用 accent / danger 顶边强调。 */
.result-card {
  position: relative; overflow: hidden; text-align: center;
  padding: 1.75rem 1.25rem 1.5rem;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); box-shadow: var(--sk-shadow-card);
}
.result-card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 42%; z-index: 0;
  pointer-events: none;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
}
.result-card.is-win::before { background: linear-gradient(180deg, rgb(var(--c-accent-soft) / .85), transparent); }
.result-card.is-lose::before { background: linear-gradient(180deg, rgb(var(--c-danger) / .12), transparent); }
.result-card > * { position: relative; z-index: 1; }

.result-eyebrow {
  display: inline-block; font-size: .64rem; font-weight: 800; letter-spacing: .18em;
  text-transform: uppercase; color: rgb(var(--c-ink-3));
}
.result-title { margin: .15rem 0 1.1rem; font-size: 2rem; font-weight: 900; line-height: 1.1; }

.reward-grid {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem;
  max-width: 44rem; margin: 0 auto 1.4rem;
}
.reward-box {
  display: flex; flex-direction: column; gap: .3rem; padding: .9rem .6rem;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / .7);
}
.reward-label { font-size: .72rem; color: rgb(var(--c-ink-2)); }
.reward-val { font-size: 1.5rem; font-weight: 900; }
.reward-val.drop { font-size: .95rem; font-weight: 800; display: flex; flex-direction: column; gap: .1rem; align-items: center; justify-content: center; }
.drop-rarity { font-weight: 900; }

.result-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; }
/* 继续：胖 info 按钮（立体下缘）；重试：胖 accent 按钮。 */
.btn-continue, .btn-retry {
  min-height: 2.85rem; min-width: 9rem; padding: .55rem 1.4rem;
  border: 0; border-radius: var(--sk-radius-control); cursor: pointer;
  font-size: .92rem; font-weight: 800; color: rgb(var(--c-on-accent));
  transition: filter .12s, transform .12s, box-shadow .12s;
}
.btn-continue { background: rgb(var(--c-info)); box-shadow: 0 3px 0 rgb(var(--c-info) / .5), var(--sk-shadow-card); }
.btn-retry { background: rgb(var(--c-accent)); box-shadow: 0 3px 0 rgb(var(--c-accent-2) / .6), var(--sk-shadow-card); }
.btn-continue:hover, .btn-retry:hover { filter: brightness(1.05); }
.btn-continue:active { transform: translateY(1px); box-shadow: 0 1px 0 rgb(var(--c-info) / .5); }
.btn-retry:active { transform: translateY(1px); box-shadow: 0 1px 0 rgb(var(--c-accent-2) / .6); }

@media (max-width: 560px) {
  .reward-grid { grid-template-columns: 1fr; }
}
</style>
