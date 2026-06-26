<script setup lang="ts">
/**
 * 「为你推荐」内容推荐条（I1-T3）。
 * 把已写好的内容推荐能力接进高频路径——基于传入的「种子番剧」给出你还没拥有/没看的相似番，
 * 并标注命中的口味标签作为推荐理由。
 *
 * 输入源降级策略由调用方决定（传 seeds）：
 *  - 抽卡结果：seeds = 本次抽到的番（新号也立即有输入，不空白）。
 *  - 收藏/图鉴：seeds = 已拥有的番（面向已有收藏立即生效）。
 * 推荐为纯派生：复用 gameDataStore 记忆化的关联索引 + 本组件内 computed 缓存，不每次渲染全量重扫。
 */
import { computed, ref } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useUserStore } from '@/stores/userStore';
import { useCollectionStore } from '@/stores/collection';
import { useProfileStore } from '@/stores/profile';
import { useWatchedAnime } from '@/composables/useWatchedAnime';
import { recommendFromSeeds } from '@/utils/contentIndex';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { useUnlockConfirm } from '@/composables/useUnlockConfirm';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { AnimeCard, Rarity } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';

const props = withDefaults(
  defineProps<{
    /** 种子番剧（推荐据此生成）。 */
    seeds: AnimeCard[];
    /** 标题（默认「🍿 为你推荐」）。 */
    title?: string;
    /** 推荐条数上限。 */
    limit?: number;
    /** 种子为空时的引导文案（空态不空白死胡同）。 */
    emptyHint?: string;
    /**
     * I2-T1：从候选中额外剔除的番剧 id（如「已拥有 ∪ 已看」全集）。
     * 不传则只排除种子（保持「抽卡结果」等出口的现有行为）。
     */
    excludeIds?: ReadonlySet<number>;
  }>(),
  {
    title: '🍿 为你推荐',
    limit: 6,
    emptyHint: '拥有或看过一些番后，这里会根据你的口味推荐相似作品。',
    excludeIds: undefined,
  },
);

const gameData = useGameDataStore();
const userStore = useUserStore();
const collection = useCollectionStore();
const profile = useProfileStore();

// I3-T4：发现卡就地落子——看过显示态读全站并集（与 I3-T1 统一口径一致）。
const { isWatched } = useWatchedAnime();
const { unlock } = useUnlockConfirm();

/** 纯派生 + 记忆化：种子/索引/排除集不变则不重算（索引本身在 store 层记忆化）。 */
const recommendations = computed(() =>
  recommendFromSeeds(props.seeds, gameData.contentIndex, props.limit, props.excludeIds),
);

/** 玩家当前知识点（解锁出口的预算）。 */
const knowledgePoints = computed(() => profile.core.knowledgePoints);

/** 是否已拥有该番（已拥有 → 不显「解锁」，改显「已拥有」）。 */
function isOwned(id: number): boolean {
  return collection.animeCollection.has(id);
}
function unlockPrice(card: { rarity: Rarity }): number {
  return getCodexUnlockPrice(card.rarity);
}
function canAfford(card: { rarity: Rarity }): boolean {
  return knowledgePoints.value >= unlockPrice(card);
}

const detailCard = ref<AnimeCard | null>(null);
function openDetail(card: AnimeCard) {
  detailCard.value = card;
}
const detailCount = computed(() =>
  detailCard.value ? collection.getAnimeCardCount(detailCard.value.id) : 0,
);

/** 就地「看过」切换（仅 anime 有意义；写走门面 toggleTasteWatched，显示态读并集）。 */
function toggleWatched(card: AnimeCard) {
  userStore.toggleTasteWatched(card.id);
}

/** 就地「解锁」（守卫/确认/错误提示全走共享解锁门面，经济安全内建）。 */
function handleUnlock(card: AnimeCard) {
  if (isOwned(card.id)) return; // 已拥有：模板本就显「已拥有」不显解锁键，这里再兜一层
  void unlock(card, 'anime');
}

function imageSrc(id: number): string {
  return thumbImageSrc('anime', id);
}
</script>

<template>
  <section class="rec-strip">
    <h4 class="rec-title">{{ title }}</h4>

    <p v-if="recommendations.length === 0" class="rec-empty">{{ emptyHint }}</p>

    <div v-else>
      <p class="rec-sub">根据你的口味，这些你可能也会喜欢：</p>
      <div class="rec-grid">
        <!-- I3-T4：整卡由单 button 改为 div（消除 button-in-button a11y 隐患）；
             主体区点击进详情，底部动作行就地「看过 / 解锁」。 -->
        <div
          v-for="rec in recommendations"
          :key="rec.anime.id"
          class="rec-card"
        >
          <button class="rec-main" :title="`查看 ${rec.anime.name} 详情`" @click="openDetail(rec.anime)">
            <img
              loading="lazy"
              decoding="async"
              :src="imageSrc(rec.anime.id)"
              @error="onThumbError"
              class="rec-img"
              :alt="rec.anime.name"
            />
            <div class="rec-body">
              <div class="rec-name" :title="rec.anime.name">{{ rec.anime.name }}</div>
              <div class="rec-meta">
                <span v-if="rec.anime.rating_score">⭐ {{ rec.anime.rating_score }}</span>
                <span v-if="rec.anime.date">· {{ rec.anime.date.slice(0, 4) }}</span>
              </div>
              <div class="rec-tags">
                <span v-for="t in rec.reasonTags" :key="t" class="rec-tag">{{ t }}</span>
              </div>
            </div>
          </button>
          <!-- 就地动作行：看过 toggle + 解锁（守卫未登录/已拥有/余额） -->
          <div class="rec-actions">
            <button
              class="rec-act"
              :class="{ on: isWatched(rec.anime.id) }"
              :aria-pressed="isWatched(rec.anime.id)"
              :title="isWatched(rec.anime.id) ? '点击取消「看过」' : '标记为「看过」'"
              @click="toggleWatched(rec.anime)"
            >{{ isWatched(rec.anime.id) ? '👁 已看' : '＋ 看过' }}</button>
            <span v-if="isOwned(rec.anime.id)" class="rec-owned">已拥有</span>
            <button
              v-else
              class="rec-act unlock"
              :disabled="userStore.isLoggedIn && !canAfford(rec.anime)"
              :title="userStore.isLoggedIn
                ? (canAfford(rec.anime) ? '花知识点解锁入库' : '知识点不足')
                : '登录后可解锁'"
              @click="handleUnlock(rec.anime)"
            >🔓 {{ unlockPrice(rec.anime) }}</button>
          </div>
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
.rec-strip { color: rgb(var(--c-ink)); }
.rec-title { font-weight: 700; color: rgb(var(--c-ink)); font-size: 1rem; margin-bottom: 0.4rem; }
.rec-sub { font-size: 0.78rem; color: rgb(var(--c-ink-2)); margin-bottom: 0.6rem; }
.rec-empty {
  font-size: 0.82rem; color: rgb(var(--c-ink-2));
  padding: 0.85rem 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface-2, var(--c-surface)) / 0.5); text-align: center;
}
.rec-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.7rem; }
.rec-card {
  display: flex; flex-direction: column; overflow: hidden;
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
  transition: transform .12s, border-color .12s;
}
.rec-card:hover { transform: translateY(-2px); border-color: rgb(var(--c-accent)); }
.rec-main {
  display: flex; flex-direction: column; text-align: left; padding: 0; cursor: pointer;
  background: none; border: none; width: 100%;
}
.rec-img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; object-position: top; }
.rec-body { padding: 0.3rem 0.4rem 0.45rem; display: flex; flex-direction: column; gap: 0.2rem; }
.rec-name {
  font-size: 0.74rem; font-weight: 700; color: rgb(var(--c-ink));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rec-meta { font-size: 0.66rem; color: rgb(var(--c-ink-2)); }
.rec-tags { display: flex; flex-wrap: wrap; gap: 0.15rem; min-height: 1rem; }
.rec-tag {
  font-size: 0.6rem; padding: 0.05rem 0.3rem; border-radius: 999px;
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent));
}

/* I3-T4 就地动作行 */
.rec-actions {
  display: flex; align-items: stretch; gap: 0.25rem; padding: 0 0.4rem 0.45rem;
}
.rec-act {
  flex: 1; min-width: 0; font-size: 0.64rem; padding: 0.22rem 0.2rem; cursor: pointer;
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2)); color: rgb(var(--c-ink-2)); border: 1px solid rgb(var(--c-line));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: background .12s, color .12s, border-color .12s;
}
.rec-act:hover:not(:disabled) { color: rgb(var(--c-ink)); border-color: rgb(var(--c-accent)); }
.rec-act.on {
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent));
}
.rec-act.unlock {
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent)); border-color: rgb(var(--c-accent) / 0.4);
}
.rec-act.unlock:hover:not(:disabled) {
  background: rgb(var(--c-accent)); color: rgb(var(--c-on-accent)); border-color: rgb(var(--c-accent));
}
.rec-act:disabled { opacity: 0.45; cursor: not-allowed; }
.rec-owned {
  flex: 1; display: flex; align-items: center; justify-content: center;
  font-size: 0.64rem; color: rgb(var(--c-success)); border: 1px solid rgb(var(--c-success) / 0.4);
  border-radius: var(--sk-radius-control); background: rgb(var(--c-success) / 0.1);
}
</style>
