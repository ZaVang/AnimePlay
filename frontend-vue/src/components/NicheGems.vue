<script setup lang="ts">
/**
 * 小众佳作雷达（I3-T3）——把「评分高 ∧ 人气低 ∧ 玩家未拥有未看」的冷门佳作在发现层显形、表彰。
 *
 * 弥合 rarity 价值观裂缝：抽卡权重把冷门佳作贬为低价值，这里按真实 Bangumi 评分 × (1−人气百分位)
 * 重新排序、表彰它们。纯派生（pickNicheGems 纯函数 + 本组件 computed 记忆化，不每帧全库重排）。
 *
 * 经济安全：解锁走门面 unlockCodexCard（内建余额/已拥有校验），组件只展示 ok/error。
 */
import { computed, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useProfileStore } from '@/stores/profile';
import { useWatchedAnime } from '@/composables/useWatchedAnime';
import { pickNicheGems } from '@/utils/tasteProfile';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { useUnlockConfirm } from '@/composables/useUnlockConfirm';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { AnimeCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';

const props = withDefaults(
  defineProps<{
    /** 展示条数上限。 */
    limit?: number;
  }>(),
  { limit: 12 },
);

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();
const profile = useProfileStore();
const { watchedIds } = useWatchedAnime();
const { unlock } = useUnlockConfirm();

/** 玩家当前知识点（解锁出口的预算）。 */
const knowledgePoints = computed(() => profile.core.knowledgePoints);

/** 排除集 = 已拥有 ∪ 已看（不在发现层推自己已有/已看的番）。 */
const excludeIds = computed<Set<number>>(() => {
  const ex = new Set<number>(collection.animeCollection.keys());
  for (const id of watchedIds.value) ex.add(id);
  return ex;
});

/** 纯派生 + 记忆化：库/排除集不变则不重排（对 968 番不每帧重算）。 */
const gems = computed(() =>
  pickNicheGems(gameData.allAnimeCards, excludeIds.value, { limit: props.limit }),
);

function unlockPrice(card: AnimeCard): number {
  return getCodexUnlockPrice(card.rarity);
}
function canAfford(card: AnimeCard): boolean {
  return knowledgePoints.value >= unlockPrice(card);
}

/** 解锁（守卫/确认/错误提示全走共享解锁门面，经济安全内建）。 */
function handleUnlock(card: AnimeCard) {
  void unlock(card, 'anime');
}

const detailCard = ref<AnimeCard | null>(null);
function openDetail(card: AnimeCard) {
  detailCard.value = card;
}
const detailCount = computed(() =>
  detailCard.value ? collection.getAnimeCardCount(detailCard.value.id) : 0,
);

function imageSrc(id: number): string {
  return thumbImageSrc('anime', id);
}
</script>

<template>
  <section class="niche">
    <h4 class="niche-title">💎 小众佳作雷达</h4>
    <p class="niche-sub">高分却冷门、你还没拥有的好番——抽卡权重低估了它们，这里替它们正名。</p>

    <p v-if="gems.length === 0" class="niche-empty">
      暂时没有合格的小众佳作（你大概已经把冷门好番收得差不多了）。
    </p>

    <div v-else class="niche-grid">
      <div v-for="gem in gems" :key="gem.anime.id" class="gem">
        <button class="gem-cover" :title="`查看 ${gem.anime.name} 详情`" @click="openDetail(gem.anime)">
          <img
            loading="lazy"
            decoding="async"
            :src="imageSrc(gem.anime.id)"
            @error="onThumbError"
            class="gem-img"
            :alt="gem.anime.name"
          />
          <span v-if="gem.anime.rating_score" class="gem-score">⭐ {{ gem.anime.rating_score }}</span>
        </button>
        <div class="gem-body">
          <div class="gem-name" :title="gem.anime.name">{{ gem.anime.name }}</div>
          <div class="gem-meta">
            <span v-if="gem.anime.rating_total">{{ gem.anime.rating_total }} 人评</span>
            <span v-if="gem.anime.date">· {{ gem.anime.date.slice(0, 4) }}</span>
          </div>
          <button
            class="gem-unlock"
            :disabled="userStore.isLoggedIn && !canAfford(gem.anime)"
            :title="userStore.isLoggedIn
              ? (canAfford(gem.anime) ? '花知识点解锁入库' : '知识点不足')
              : '登录后可解锁'"
            @click="handleUnlock(gem.anime)"
          >🔓 {{ unlockPrice(gem.anime) }} 知识点</button>
        </div>
      </div>
    </div>

    <CardDetailModal
      :card="detailCard"
      card-type="anime"
      :count="detailCount"
      @close="detailCard = null"
    />
  </section>
</template>

<style scoped>
.niche { color: rgb(var(--c-ink)); }
.niche-title { font-weight: 700; color: rgb(var(--c-ink)); font-size: 1rem; margin-bottom: 0.3rem; }
.niche-sub { font-size: 0.78rem; color: rgb(var(--c-ink-2)); margin-bottom: 0.7rem; }
.niche-empty {
  font-size: 0.82rem; color: rgb(var(--c-ink-2)); text-align: center;
  padding: 0.85rem 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface-2) / 0.5);
}
.niche-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.7rem; }
.gem {
  display: flex; flex-direction: column; border-radius: var(--sk-radius-control); overflow: hidden;
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
}
.gem-cover {
  position: relative; display: block; padding: 0; cursor: pointer; border: none; background: none;
}
.gem-img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; object-position: top; display: block; }
.gem-score {
  position: absolute; left: 4px; bottom: 4px; font-size: 0.66rem; font-weight: 700;
  padding: 0.1rem 0.35rem; border-radius: 999px;
  background: rgb(0 0 0 / 0.6); color: #fff;
}
.gem-body { padding: 0.3rem 0.4rem 0.45rem; display: flex; flex-direction: column; gap: 0.2rem; }
.gem-name {
  font-size: 0.74rem; font-weight: 700; color: rgb(var(--c-ink));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gem-meta { font-size: 0.64rem; color: rgb(var(--c-ink-2)); }
.gem-unlock {
  margin-top: 0.15rem; font-size: 0.66rem; padding: 0.25rem 0; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent));
  border: 1px solid rgb(var(--c-accent) / 0.4); cursor: pointer; transition: background .12s, color .12s;
}
.gem-unlock:hover:not(:disabled) {
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent));
}
.gem-unlock:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
