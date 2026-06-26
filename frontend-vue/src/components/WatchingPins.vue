<script setup lang="ts">
/**
 * 主页「正在追」列表（I4-T3）——设备级自设目标的轻量呈现。
 *
 * 显示玩家在详情 Pin 的番剧 + 一个「看完」按钮（看完 → 写看过并取消 Pin）。
 * 进度纯派生（已拥有/已看态读 collection / 看过并集）；未拥有的贵卡给**诚实但不绝望**的
 * 双路径提示（解锁价 + 抽卡），不退化成纯挫败。
 *
 * 轻量铁律：一个标记 + 这一个列表 + 一个「看完」按钮，不做成新系统。仅番剧。
 * 颜色全程语义令牌。
 */
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useWatchingPinsStore } from '@/stores/watchingPins';
import { useWatchedAnime } from '@/composables/useWatchedAnime';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { AnimeCard } from '@/types/card';

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();
const watchingPins = useWatchingPinsStore();
const { isWatched } = useWatchedAnime();

interface PinnedRow {
  anime: AnimeCard;
  owned: boolean;
  watched: boolean;
  unlockPrice: number;
}

/** Pin 列表纯派生：id → 番卡 + 拥有/看过/解锁价（找不到的 id 跳过，防脏数据）。 */
const rows = computed<PinnedRow[]>(() => {
  void collection.animeCollection.size; // 触达响应式拥有集，入库后刷新
  const out: PinnedRow[] = [];
  for (const id of watchingPins.pinnedIds) {
    const anime = gameData.getAnimeCardById(id);
    if (!anime) continue;
    out.push({
      anime,
      owned: collection.getAnimeCardCount(id) > 0,
      watched: isWatched(id),
      unlockPrice: getCodexUnlockPrice(anime.rarity),
    });
  }
  return out;
});

/** 看完：写看过并集（门面 toggleTasteWatched）+ 取消 Pin。已看过则只取消 Pin。 */
function markDone(row: PinnedRow) {
  if (!row.watched) userStore.toggleTasteWatched(row.anime.id);
  watchingPins.unpin(row.anime.id);
}

function removePin(id: number) {
  watchingPins.unpin(id);
}

function imageSrc(id: number): string {
  return thumbImageSrc('anime', id);
}
</script>

<template>
  <div v-if="rows.length" class="bg-surface p-5 rounded-lg shadow-lg border border-line">
    <h2 class="text-xl font-bold text-ink mb-1 flex items-center gap-2">
      📌 正在追
      <span class="text-sm font-normal text-ink-2">（{{ rows.length }} 部 · 你自己钉的目标）</span>
    </h2>
    <p class="text-xs text-ink-2 mb-4">追完一部就「看完」——它会计入你的看过、喂养品味画像，并从这里移除。</p>

    <ul class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.anime.id"
        class="flex items-center gap-3 p-2 rounded-lg bg-surface-2/40 border border-line"
      >
        <img
          loading="lazy"
          decoding="async"
          :src="imageSrc(row.anime.id)"
          @error="onThumbError"
          class="w-10 h-14 object-cover object-top rounded shrink-0"
          :alt="row.anime.name"
        />
        <div class="flex-1 min-w-0">
          <p class="font-bold text-ink text-sm truncate" :title="row.anime.name">{{ row.anime.name }}</p>
          <p class="text-xs mt-0.5">
            <span v-if="row.watched" class="text-success font-semibold">✓ 已看过</span>
            <span v-else-if="row.owned" class="text-accent font-semibold">已拥有，去看完它</span>
            <!-- 诚实但不绝望的双路径提示（未拥有的贵卡不纯挫败） -->
            <span v-else class="text-ink-2">
              还没拥有 · 解锁需 <span class="text-accent font-semibold">{{ row.unlockPrice }}</span> 知识点，或抽卡获得
            </span>
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button
            class="text-xs font-bold px-2.5 py-1 rounded-full bg-accent text-on-accent hover:opacity-85"
            title="标记看完（写看过并从正在追移除）"
            @click="markDone(row)"
          >看完</button>
          <button
            class="text-lg text-ink-2 hover:text-ink leading-none px-1"
            title="移出正在追"
            @click="removePin(row.anime.id)"
          >&times;</button>
        </div>
      </li>
    </ul>
  </div>
</template>
