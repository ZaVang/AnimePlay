<script setup lang="ts">
/**
 * 题材集册 Genre Sets（I4-T1 + I4-T2 缺口收下）——长线中目标墙，纯展示零存档。
 *
 * 每个干净题材标签 = 一个集册：完成度条 + 纯派生段位称号 +「还差 N 部」。
 * 集册按玩家专精题材（品味报告 topTags）排前面，把系统目标变成「我在意的自设目标」。
 *
 * 护栏：展示墙非待办地狱——persona 排序、不强制集满、无 FOMO 倒计时、**纯展示不发奖不持久化**
 * （绝不复用 codex 里程碑的领取制）。展开某集册可看「还差 N 部」缺口番并就地「看过 / 解锁」
 * （I4-T2，复用既有门面，经济安全内建）。
 *
 * 性能：buildGenreSets 在 computed 记忆化（35 桶 × 968 番单遍聚合），不每帧全量重算。
 */
import { computed, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useProfileStore } from '@/stores/profile';
import { useWatchedAnime } from '@/composables/useWatchedAnime';
import { buildGenreSets, genreGapAnime } from '@/utils/genreSets';
import { buildTasteReport } from '@/utils/tasteProfile';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { useUnlockConfirm } from '@/composables/useUnlockConfirm';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { AnimeCard } from '@/types/card';

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();
const profile = useProfileStore();
const { watchedIds, isWatched } = useWatchedAnime();
const { unlock } = useUnlockConfirm();

/** 玩家专精题材顺序（persona 排序输入）：品味报告 topTags 的 tag 列表（已剔噪 + 按集中度降序）。 */
const personaOrder = computed<string[]>(() => {
  const watchedSet = watchedIds.value;
  if (watchedSet.size === 0) return [];
  const watched = gameData.allAnimeCards.filter(a => watchedSet.has(a.id));
  if (watched.length === 0) return [];
  return buildTasteReport(watched, gameData.allAnimeCards).topTags.map(t => t.tag);
});

/** 拥有判定（>0 = 已拥有）——纯派生，addCard 后集册自动联动。 */
const getCount = (id: number) => collection.getAnimeCardCount(id);

/**
 * 题材集册（纯派生 + 记忆化）。依赖：剔噪索引 + 拥有 Map + persona 顺序。
 * 用 collection.animeCollection（响应式 Map）触发重算——拥有变化时集册完成度刷新。
 */
const genreSets = computed(() => {
  // 显式触达响应式拥有集，确保解锁/抽到新卡后完成度重算。
  void collection.animeCollection.size;
  return buildGenreSets(gameData.contentIndex, getCount, {
    minBucketSize: 10,
    personaOrder: personaOrder.value,
  });
});

/** 玩家当前知识点（缺口解锁出口的预算）。 */
const knowledgePoints = computed(() => profile.core.knowledgePoints);

/** 当前展开的集册 tag（null = 全收起）。一次只展开一个，避免首屏过长。 */
const expandedTag = ref<string | null>(null);
function toggleExpand(tag: string) {
  expandedTag.value = expandedTag.value === tag ? null : tag;
}

/** 展开集册的缺口番（未拥有 ∧ 未看；I4-T2 就地收下）。纯派生差集，限 12 部。 */
const gapAnime = computed<AnimeCard[]>(() => {
  if (!expandedTag.value) return [];
  return genreGapAnime(gameData.contentIndex, expandedTag.value, getCount, watchedIds.value, 12);
});

function unlockPrice(card: AnimeCard): number {
  return getCodexUnlockPrice(card.rarity);
}
function canAfford(card: AnimeCard): boolean {
  return knowledgePoints.value >= unlockPrice(card);
}

/** 就地「看过」切换（写走门面 toggleTasteWatched，显示态读并集；仅 anime）。 */
function toggleWatched(card: AnimeCard) {
  userStore.toggleTasteWatched(card.id);
}

/** 就地「解锁」入库（守卫/确认/错误提示全走共享解锁门面，经济安全内建）。 */
function handleUnlock(card: AnimeCard) {
  void unlock(card, 'anime');
}

function imageSrc(id: number): string {
  return thumbImageSrc('anime', id);
}
</script>

<template>
  <section class="gsets">
    <h4 class="gsets-title">📚 题材集册</h4>
    <p class="gsets-sub">
      每个题材一本集册——你最专精的题材排在前面。这是展示墙不是待办：不强制集满、永远差几部就是它的乐趣。
    </p>

    <p v-if="genreSets.length === 0" class="gsets-empty">
      题材集册暂时无法生成（番剧数据还在加载，稍候再来）。
    </p>

    <div v-else class="gsets-list">
      <div v-for="set in genreSets" :key="set.tag" class="gset">
        <button class="gset-head" :aria-expanded="expandedTag === set.tag" @click="toggleExpand(set.tag)">
          <span class="gset-tier" :title="set.tier.title">{{ set.tier.emoji }}</span>
          <span class="gset-name">
            {{ set.tag }}
            <span v-if="set.tier.conquered" class="gset-badge">已征服</span>
          </span>
          <span class="gset-count">{{ set.owned }} / {{ set.total }}</span>
        </button>
        <div class="gset-bar">
          <div class="gset-bar-fill" :style="{ width: set.pct + '%' }"></div>
        </div>
        <div class="gset-foot">
          <span class="gset-tier-label">{{ set.tier.emoji }} {{ set.tier.title }} · {{ set.pct }}%</span>
          <span v-if="set.remaining > 0" class="gset-remaining">
            还差 <strong>{{ set.remaining }}</strong> 部
            <button class="gset-collect" @click="toggleExpand(set.tag)">
              {{ expandedTag === set.tag ? '收起' : '去补番 ›' }}
            </button>
          </span>
          <span v-else class="gset-done">这本集册已集满 🎉</span>
        </div>

        <!-- I4-T2：集册缺口「还差 N 部」就地一步收下（看过 / 解锁，复用既有门面） -->
        <div v-if="expandedTag === set.tag" class="gset-gap">
          <p v-if="gapAnime.length === 0" class="gset-gap-empty">
            这本集册剩下的番你已经全部看过或拥有了，差的只是入库。
          </p>
          <div v-else class="gset-gap-grid">
            <div v-for="a in gapAnime" :key="a.id" class="gap-card">
              <img
                loading="lazy"
                decoding="async"
                :src="imageSrc(a.id)"
                @error="onThumbError"
                class="gap-img"
                :alt="a.name"
              />
              <div class="gap-name" :title="a.name">{{ a.name }}</div>
              <div class="gap-actions">
                <button
                  class="gap-act"
                  :class="{ on: isWatched(a.id) }"
                  :aria-pressed="isWatched(a.id)"
                  :title="isWatched(a.id) ? '点击取消「看过」' : '标记为「看过」'"
                  @click="toggleWatched(a)"
                >{{ isWatched(a.id) ? '👁 已看' : '＋ 看过' }}</button>
                <button
                  class="gap-act unlock"
                  :disabled="userStore.isLoggedIn && !canAfford(a)"
                  :title="userStore.isLoggedIn
                    ? (canAfford(a) ? '花知识点解锁入库' : '知识点不足')
                    : '登录后可解锁'"
                  @click="handleUnlock(a)"
                >🔓 {{ unlockPrice(a) }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.gsets { color: rgb(var(--c-ink)); }
.gsets-title { font-weight: 700; color: rgb(var(--c-ink)); font-size: 1rem; margin-bottom: 0.3rem; }
.gsets-sub { font-size: 0.78rem; color: rgb(var(--c-ink-2)); margin-bottom: 0.8rem; }
.gsets-empty {
  font-size: 0.82rem; color: rgb(var(--c-ink-2)); text-align: center;
  padding: 0.85rem 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface-2) / 0.5);
}
.gsets-list { display: flex; flex-direction: column; gap: 0.7rem; }
.gset {
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2) / 0.4); padding: 0.6rem 0.75rem;
}
.gset-head {
  display: flex; align-items: center; gap: 0.55rem; width: 100%;
  background: none; border: none; padding: 0; cursor: pointer; text-align: left;
}
.gset-tier { font-size: 1.15rem; line-height: 1; flex-shrink: 0; }
.gset-name {
  flex: 1; min-width: 0; font-weight: 700; font-size: 0.9rem; color: rgb(var(--c-ink));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gset-badge {
  margin-left: 0.4rem; font-size: 0.6rem; font-weight: 700; vertical-align: middle;
  padding: 0.05rem 0.4rem; border-radius: 999px;
  background: rgb(var(--c-accent) / 0.16); color: rgb(var(--c-accent));
}
.gset-count { flex-shrink: 0; font-size: 0.78rem; color: rgb(var(--c-ink-2)); font-weight: 600; }
.gset-bar {
  width: 100%; height: 8px; margin: 0.45rem 0 0.4rem;
  background: rgb(var(--c-surface-2)); border: 1px solid rgb(var(--c-line));
  border-radius: 999px; overflow: hidden;
}
.gset-bar-fill {
  height: 100%; border-radius: 999px; background: rgb(var(--c-accent));
  transition: width .5s ease;
}
.gset-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  font-size: 0.74rem; color: rgb(var(--c-ink-2));
}
.gset-tier-label { font-weight: 600; }
.gset-remaining { color: rgb(var(--c-ink-2)); }
.gset-remaining strong { color: rgb(var(--c-accent)); }
.gset-done { color: rgb(var(--c-accent)); font-weight: 700; }
.gset-collect {
  margin-left: 0.4rem; font-size: 0.72rem; font-weight: 700; cursor: pointer;
  background: none; border: none; color: rgb(var(--c-accent)); padding: 0;
}
.gset-collect:hover { text-decoration: underline; }

/* I4-T2 缺口收下网格 */
.gset-gap {
  margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px solid rgb(var(--c-line));
}
.gset-gap-empty { font-size: 0.76rem; color: rgb(var(--c-ink-2)); text-align: center; padding: 0.3rem 0; }
.gset-gap-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.55rem;
}
.gap-card {
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
}
.gap-img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; object-position: top; display: block; }
.gap-name {
  font-size: 0.7rem; font-weight: 700; color: rgb(var(--c-ink)); padding: 0.25rem 0.35rem 0.1rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gap-actions { display: flex; gap: 0.2rem; padding: 0 0.35rem 0.35rem; }
.gap-act {
  flex: 1; min-width: 0; font-size: 0.62rem; padding: 0.2rem 0.15rem; cursor: pointer;
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-2)); border: 1px solid rgb(var(--c-line));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: background .12s, color .12s, border-color .12s;
}
.gap-act:hover:not(:disabled) { color: rgb(var(--c-ink)); border-color: rgb(var(--c-accent)); }
.gap-act.on {
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent));
}
.gap-act.unlock {
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent)); border-color: rgb(var(--c-accent) / 0.4);
}
.gap-act.unlock:hover:not(:disabled) {
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent));
}
.gap-act:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
