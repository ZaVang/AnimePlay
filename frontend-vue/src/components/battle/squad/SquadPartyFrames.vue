<script setup lang="ts">
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import CharacterAvatar from '@/components/CharacterAvatar.vue';
import type { SquadBattleUnitView } from './types';

const props = defineProps<{
  units: SquadBattleUnitView[];
  side: 'player' | 'enemy';
  autoUltimates: boolean;
  battleEnded: boolean;
}>();

const emit = defineEmits<{ castUltimate: [unitId: string] }>();

// 稀有度识别色（既有例外）：复用 gameConfig 角色稀有度表的 chartColor（每档一枚固定 hex），
// 不自造新 hex。用于头像框稀有度描边。
const RARITY_CONF = GAME_CONFIG.characterSystem.rarityConfig as Record<string, { chartColor: string }>;
function rarityColor(rarity: string): string {
  return RARITY_CONF[rarity]?.chartColor ?? RARITY_CONF.N?.chartColor ?? '#4b5563';
}

// 状态图标映射（复用 SquadStageUnit 原 statusLabels）。
const statusLabels: Record<string, string> = {
  shield: '盾', atkUp: '攻', atkDown: '弱', defUp: '防', defDown: '破', spUp: '术', spDown: '封',
  haste: '速', slow: '缓', critRateUp: '暴', stun: '晕', silence: '默', taunt: '嘲', dot: '伤', hot: '愈',
};
// buff / debuff 归类：决定状态图标底色（success / danger）。
const BUFF_KINDS = new Set(['shield', 'atkUp', 'defUp', 'spUp', 'haste', 'critRateUp', 'hot']);
const isBuff = (kind: string) => BUFF_KINDS.has(kind);

const clamp = (v: number) => Math.max(0, Math.min(100, v));

interface FrameVM {
  id: string;
  name: string;
  characterId: number;
  rarityColor: string;
  hpPercent: number;
  hpLow: boolean;
  energyPercent: number;
  statuses: { key: string; label: string; buff: boolean }[];
  defeated: boolean;
  /** PCR 黄框可点释放：己方 + 手动模式 + 大招就绪 + 存活。 */
  charged: boolean;
}

const frames = computed<FrameVM[]>(() =>
  props.units.map(unit => {
    const hpPercent = clamp(unit.maxHp > 0 ? (unit.hp / unit.maxHp) * 100 : 0);
    return {
      id: unit.id,
      name: unit.name,
      characterId: unit.characterId,
      rarityColor: rarityColor(unit.rarity),
      hpPercent,
      hpLow: hpPercent <= 30,
      energyPercent: clamp(unit.energy / 10),
      statuses: unit.statuses.slice(0, 4).map((s, i) => ({
        key: `${s.kind}-${s.expiresAt}-${i}`,
        label: statusLabels[s.kind] ?? s.kind,
        buff: isBuff(s.kind),
      })),
      defeated: unit.defeated,
      charged:
        props.side === 'player' &&
        !props.autoUltimates &&
        unit.ultimateReady &&
        !unit.defeated,
    };
  }),
);

function onFrameClick(f: FrameVM) {
  if (f.charged) emit('castUltimate', f.id);
}
</script>

<template>
  <div class="party-frames" :class="`side-${side}`">
    <div
      v-for="f in frames"
      :key="f.id"
      class="pf"
      :class="{ enemy: side === 'enemy', charged: f.charged, defeated: f.defeated }"
    >
      <span v-if="f.charged" class="ult-tag">大招就绪 ▶</span>
      <button
        type="button"
        class="avatar"
        :style="{ '--rr': f.rarityColor }"
        :disabled="!f.charged"
        :title="f.name"
        @click="onFrameClick(f)"
      >
        <CharacterAvatar class="por-img" :character-id="f.characterId" :size="80" rounded />
        <span v-if="f.statuses.length" class="st">
          <i
            v-for="s in f.statuses"
            :key="s.key"
            :class="s.buff ? 'buff' : 'deb'"
            :title="s.label"
          >{{ s.label }}</i>
        </span>
        <span v-if="f.defeated" class="ko">✖</span>
      </button>
      <div class="bar hp">
        <i :class="{ low: f.hpLow }" :style="{ width: `${f.hpPercent}%` }"></i>
      </div>
      <div class="bar en">
        <i :style="{ width: `${f.energyPercent}%` }"></i>
      </div>
    </div>
  </div>
</template>

<style scoped>
.party-frames {
  display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; padding: 12px;
  border-radius: var(--sk-radius-panel);
}
.side-enemy { background: linear-gradient(180deg, rgb(var(--c-danger) / .08), transparent); }
.side-player { background: linear-gradient(0deg, rgb(var(--c-accent-soft) / .5), transparent); }

.pf {
  width: 92px; display: flex; flex-direction: column; align-items: center; gap: 4px;
  position: relative;
}

.avatar {
  width: 80px; height: 80px; border-radius: var(--sk-radius-control); position: relative;
  overflow: hidden; display: block; padding: 0; border: 0; background: rgb(var(--c-surface-2));
  box-shadow: inset 0 0 0 3px var(--rr), 0 2px 6px rgb(var(--c-ink) / .25);
  cursor: default;
}
.avatar:disabled { cursor: default; }
.pf.enemy .avatar { filter: saturate(.9); }
.por-img { width: 100%; height: 100%; display: block; }

/* charged（PCR 黄框可点释放）：己方能量满 + 手动模式 → 金框脉冲 + 可点。 */
.pf.charged .avatar {
  cursor: pointer;
  box-shadow: inset 0 0 0 3px var(--rr), 0 0 0 2px rgb(var(--c-highlight)), 0 0 16px rgb(var(--c-highlight) / .75);
  animation: chargedPulse 1.1s ease-in-out infinite;
}
@keyframes chargedPulse {
  0%, 100% { box-shadow: inset 0 0 0 3px var(--rr), 0 0 0 2px rgb(var(--c-highlight)), 0 0 14px rgb(var(--c-highlight) / .6); }
  50% { box-shadow: inset 0 0 0 3px var(--rr), 0 0 0 3px rgb(var(--c-highlight)), 0 0 22px rgb(var(--c-highlight) / .9); }
}
.ult-tag {
  position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
  font-size: .64rem; font-weight: 900; color: rgb(var(--c-ink));
  background: rgb(var(--c-highlight)); padding: .06rem .5rem; border-radius: 999px;
  white-space: nowrap; box-shadow: var(--sk-shadow-pop); z-index: 2;
}

/* 状态图标：buff=success 底 / debuff=danger 底。 */
.st { position: absolute; top: -4px; right: 4px; display: flex; gap: 2px; }
.st i {
  width: 16px; height: 16px; border-radius: 5px; font-style: normal; font-size: .62rem;
  font-weight: 900; display: grid; place-items: center; color: rgb(var(--c-on-accent));
}
.st .buff { background: rgb(var(--c-success)); }
.st .deb { background: rgb(var(--c-danger)); }

/* HP / 能量条：HP=success（≤30% danger）、能量=highlight。 */
.bar {
  width: 88px; height: 8px; border-radius: 999px; background: rgb(var(--c-surface-2));
  overflow: hidden; border: 1px solid rgb(var(--c-line) / .7);
}
.bar i { display: block; height: 100%; border-radius: 999px; transition: width .2s ease; }
.bar.hp i { background: rgb(var(--c-success)); }
.bar.hp i.low { background: rgb(var(--c-danger)); }
.bar.en i { background: rgb(var(--c-highlight)); }

/* KO：阵亡灰化 + ✖ 覆盖。 */
.pf.defeated .avatar { filter: grayscale(1); opacity: .55; }
.ko {
  position: absolute; inset: 0; display: grid; place-items: center;
  font-size: 2.2rem; font-weight: 900; color: rgb(var(--c-danger));
  text-shadow: 0 1px 3px rgba(0, 0, 0, .6);
}

@media (prefers-reduced-motion: reduce) {
  .pf.charged .avatar { animation: none; }
}
</style>
