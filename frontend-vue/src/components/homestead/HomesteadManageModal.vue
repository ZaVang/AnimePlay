<script setup lang="ts">
/**
 * 家园入住管理（S13-B 切片3）。从拥有的角色里选 ≤HOMESTEAD_SLOTS 个入住挂机；按稀有度降序展示。
 * 入住/移出走门面 userStore.placeInHomestead/unplaceFromHomestead（内部先结算再改动 + 存档）。
 * 注：拥有角色集是抽卡得来的子集，规模温和；若将来很大可改用 VirtualGrid。
 */
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { HOMESTEAD_SLOTS } from '@/config/homestead';
import { computeBondBonus } from '@/engine';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useHomesteadStore } from '@/stores/homestead';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { Rarity } from '@/types/card';

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: [] }>();

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();
const homestead = useHomesteadStore();

const RARITY_RANK: Record<Rarity, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

const ownedCharacters = computed(() =>
  gameData.allCharacterCards
    .filter(c => collection.getCharacterCardCount(c.id) > 0)
    .slice()
    .sort((a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)),
);

const placedCount = computed(() => placedCards.value.length);
const canPlaceMore = computed(() => homestead.placedCharacterIds.length < HOMESTEAD_SLOTS);
function isPlaced(id: number): boolean {
  return homestead.placedCharacterIds.includes(id);
}

// ★ S15-T2-E 决策页显形：当前入住组合命中的羁绊（复用 engine 纯函数，无新口径/无新存档）。
// 这里是「选谁入住」的唯一物理决策点——把羁绊反馈从结果页搬到决策处（避免「方向盘装后备箱」）。
const placedCards = computed(() =>
  homestead.placedCharacterIds
    .map(id => gameData.getCharacterCardById(id))
    .filter((c): c is NonNullable<typeof c> => c != null),
);
const bond = computed(() => computeBondBonus(placedCards.value.map(c => c.anime_names)));
const bondHits = computed(() => bond.value.hits);
const bondBonusPct = computed(() => bond.value.bonusPct);

// ── ★ S16-T6 入住决策的「关系预告」：把命中羁绊从「结果 chip（+6%）」翻译成情感语言 ──
// 复用 bondHits（既有 computeBondBonus 派生），只加一层「命中组 → 同住角色名 → 偶遇预告文案」，
// 零新数值逻辑、零存档、纯展示（守「名字≠行为」镜像：这是「行为的预告」，不驱动任何数值）。
const bondPreviews = computed(() =>
  bondHits.value.map(hit => {
    const names = placedCards.value
      .filter(c => (c.anime_names ?? []).includes(hit.anime))
      .map(c => c.name);
    return { anime: hit.anime, names };
  }),
);

// 已入住角色所属的「命中同作品组」集合（供决策网格头像高亮：谁和谁会成一伙）。
const highlightedAnimeSet = computed(() => new Set(bondHits.value.map(h => h.anime)));
/** 某角色是否属于「已入住且命中同作品组」——是则头像加语义色光环，视觉连起「谁和谁一伙」。 */
function isBondHighlighted(id: number): boolean {
  if (!isPlaced(id)) return false;
  const card = gameData.getCharacterCardById(id);
  if (!card) return false;
  return (card.anime_names ?? []).some(a => highlightedAnimeSet.value.has(a));
}

function toggle(id: number) {
  if (isPlaced(id)) userStore.unplaceFromHomestead(id);
  else userStore.placeInHomestead(id);
}

function rarityClass(rarity: Rarity): string {
  return GAME_CONFIG.characterSystem.rarityConfig[rarity]?.c || 'bg-gray-500';
}
function cellClass(id: number): string {
  // ★ S16-T6 同作品已入住角色加 highlight 语义色光环——让「谁和谁会成一伙」在决策网格视觉连起来。
  if (isBondHighlighted(id)) return 'border-highlight ring-2 ring-highlight bg-surface-2';
  if (isPlaced(id)) return 'border-accent ring-2 ring-accent bg-surface-2';
  if (!canPlaceMore.value) return 'border-line opacity-40 cursor-not-allowed';
  return 'border-line hover:border-accent';
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="bg-surface text-ink rounded-2xl border border-line w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
      <header class="px-5 py-4 border-b border-line">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold">管理入住</h2>
            <p class="text-sm text-ink-2">选角色入住家园挂机成长（{{ placedCount }}/{{ HOMESTEAD_SLOTS }}）。稀有度越高知识点越多；<b class="text-ink">同作品 ≥2 人同住触发羁绊，全产出加成</b>。</p>
          </div>
          <button class="btn-ghost px-3 py-1.5 text-sm flex-none" @click="emit('close')">关闭</button>
        </div>
        <!-- ★ S15-T2-E 当前入住组合命中的羁绊（决策处显形，复用 computeBondBonus 纯计算） -->
        <div class="mt-2 flex flex-wrap items-center gap-1.5" aria-label="入住羁绊">
          <span class="text-xs font-bold text-ink-3">入住羁绊</span>
          <template v-if="bondHits.length > 0">
            <span class="text-xs font-extrabold text-accent">全产出 +{{ Math.round(bondBonusPct * 100) }}%</span>
            <span
              v-for="hit in bondHits"
              :key="hit.anime"
              class="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-accent bg-accent/10 border border-accent/30 max-w-full truncate"
              :title="`${hit.anime} · 同住 ${hit.members} 人`"
            >{{ hit.anime }} ×{{ hit.members }} · +{{ Math.round(hit.pct * 100) }}%</span>
          </template>
          <span v-else class="text-xs text-ink-3">同作品 ≥2 人同住可触发加成</span>
        </div>
        <!-- ★ S16-T6 关系预告：把「加成」隐去、把「会发生什么」显出来（情感语言，纯展示、零数值） -->
        <div v-if="bondPreviews.length > 0" class="mt-2 flex flex-col gap-1" aria-label="关系预告">
          <p
            v-for="pv in bondPreviews"
            :key="pv.anime"
            class="text-[11px] leading-snug text-ink-2 flex items-start gap-1.5 rounded-lg bg-accent/[0.06] border border-accent/20 px-2 py-1"
          >
            <span class="text-accent flex-none" aria-hidden="true">♡</span>
            <span>
              <b class="text-ink">{{ pv.names.join('、') }}</b>
              是《{{ pv.anime }}》的同伴 · 住一起会在广场偶遇聊天
            </span>
          </p>
        </div>
      </header>

      <div class="p-4 overflow-y-auto">
        <p v-if="ownedCharacters.length === 0" class="text-center text-ink-2 py-12">
          还没有拥有的角色——先去抽卡转出角色吧。
        </p>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <button
            v-for="c in ownedCharacters"
            :key="c.id"
            class="relative rounded-xl border p-1.5 text-left transition disabled:cursor-not-allowed"
            :class="cellClass(c.id)"
            :disabled="!isPlaced(c.id) && !canPlaceMore"
            :title="isPlaced(c.id) ? '点击移出家园' : (canPlaceMore ? '点击入住家园' : '入住已满')"
            @click="toggle(c.id)"
          >
            <img
              :src="thumbImageSrc('character', c.id)"
              :alt="c.name"
              class="w-full aspect-square object-cover rounded-lg"
              @error="onThumbError"
            />
            <span class="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" :class="rarityClass(c.rarity)">{{ c.rarity }}</span>
            <span v-if="isPlaced(c.id)" class="absolute top-1 right-1 text-sm" aria-label="已入住">✅</span>
            <span class="block mt-1 text-xs text-ink truncate">{{ c.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
