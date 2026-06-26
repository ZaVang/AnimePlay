<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useWatchingPinsStore, MAX_PINS } from '@/stores/watchingPins';
import { useDialog } from '@/composables/useDialog';
import { useWatchedAnime } from '@/composables/useWatchedAnime';
import { recommendFromSeeds } from '@/utils/contentIndex';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import { getEffectText, getTriggerText } from '@/skills/effects/descriptions';
import { isSkillImplemented } from '@/skills/effects';

const props = defineProps<{
  card: Card | null;
  cardType: 'anime' | 'character';
  count: number;
}>();

const emit = defineEmits(['close']);
const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const collection = useCollectionStore();
const watchingPins = useWatchingPinsStore();
const { isWatched: isWatchedUnion, watchedIds } = useWatchedAnime();
const { confirm, alert } = useDialog();

// I4-T2：详情页内导航（不叠 modal）——viewCard 是「当前正在看的卡」，初始 = prop.card，
// 点相似作品时**替换 viewCard**（不再开新层）。模板/所有派生信息一律读 viewCard（不读 props.card），
// 切换后拥有数/看过态/技能等自动随之刷新。prop.card 变化（宿主换卡或关开）时同步重置 viewCard。
const viewCard = ref<Card | null>(props.card);
watch(() => props.card, (c) => { viewCard.value = c; });

/** 当前展示卡的拥有数（导航后实时派生，不再依赖宿主传入的 count）。 */
const viewCount = computed(() => {
  const c = viewCard.value;
  if (!c) return 0;
  return props.cardType === 'anime'
    ? collection.getAnimeCardCount(c.id)
    : collection.getCharacterCardCount(c.id);
});

// I3-T1：统一「看过」口径——**显示态**读全站并集（队列看完 ∪ 手动勾选），与图鉴印章/
// 段位/主页计数对齐，消除「图鉴显看过、详情显未看」的裂缝。**写入态维持现状**：
// 切换仍走门面 toggleTasteWatched，只写手动勾选集（队列看完 vs 手动勾选是两类语义事件，
// useWatchedAnime 文档明确不合并写）。仅番剧有「看过」语义。
/** 本卡是否「看过」（显示态读并集，仅 anime 有此语义）。 */
const isWatched = computed(
  () => props.cardType === 'anime' && !!viewCard.value && isWatchedUnion(viewCard.value.id),
);
function toggleWatched() {
  if (props.cardType !== 'anime' || !viewCard.value) return;
  userStore.toggleTasteWatched(viewCard.value.id);
}

// I4-T3：设备级「正在追」Pin（自设目标，localStorage，仅番剧）。少量上限防死亡清单。
/** 本卡是否「正在追」。 */
const isPinned = computed(
  () => props.cardType === 'anime' && !!viewCard.value && watchingPins.isPinned(viewCard.value.id),
);
function togglePin() {
  if (props.cardType !== 'anime' || !viewCard.value) return;
  const ok = watchingPins.toggle(viewCard.value.id);
  if (!ok && !watchingPins.isPinned(viewCard.value.id)) {
    // T5：用导出常量 MAX_PINS 表上限（此前误用「当前已 pin 数」，凑巧相等属语义错位）。
    void alert(`「正在追」最多 ${MAX_PINS} 部，先从主页「看完」或移除几部再追新的吧。`);
  }
}

// I4-T2：相似作品「看过这部的人也喜欢」——单种子推荐，排除已拥有/已看（仅番剧维度）。
// 复用记忆化的 contentIndex；点一部 → 在详情页内导航替换 viewCard（不叠 modal）。
const similarAnime = computed(() => {
  if (props.cardType !== 'anime' || !viewCard.value) return [];
  const seed = viewCard.value as AnimeCard;
  const exclude = new Set<number>(collection.animeCollection.keys());
  for (const id of watchedIds.value) exclude.add(id);
  return recommendFromSeeds([seed], gameDataStore.contentIndex, 6, exclude);
});

/** 点相似作品 → 详情页内导航（替换当前内容，不开新层）。 */
function navigateTo(card: AnimeCard) {
  viewCard.value = card;
  // 切回顶部，让用户看到新卡的简介/资料（详情容器滚动归零）。
  if (scrollBody.value) scrollBody.value.scrollTop = 0;
}

/** 相似作品缩略图。 */
function similarImageSrc(id: number): string {
  return thumbImageSrc('anime', id);
}

/** 详情滚动容器（导航后归零滚动）。 */
const scrollBody = ref<HTMLElement | null>(null);

const cardRarityConfig = computed(() => {
    if (!viewCard.value) return { p: 0, c: '', dismantleValue: 0, color: '', chartColor: '' };
    const config = props.cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    return config.rarityConfig[viewCard.value.rarity] || { p: 0, c: '', dismantleValue: 0, color: '', chartColor: '' };
});

// FIXED: Added `const` back
const dismantleValue = computed(() => {
    return cardRarityConfig.value.dismantleValue || 0;
});

// --- NEW: Computed properties for skills ---
const activeSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && viewCard.value) {
    const charCard = viewCard.value as CharacterCard;
    // Assumes a getter in your store, which you may need to implement
    return gameDataStore.getSkillById(charCard.activeSkillId);
  }
  return undefined;
});

const passiveSkill = computed<Skill | undefined>(() => {
  if (props.cardType === 'character' && viewCard.value) {
    const charCard = viewCard.value as CharacterCard;
    // Assumes a getter in your store
    return gameDataStore.getSkillById(charCard.passiveSkillId);
  }
  return undefined;
});
// --- END NEW ---

// --- NEW: Anime effects descriptions ---
const animeEffectsDescriptions = computed(() => {
  if (props.cardType !== 'anime' || !viewCard.value) return [] as string[];
  const anime = viewCard.value as AnimeCard;
  return (anime.effects || []).map(e => {
    const t = getTriggerText(e.trigger);
    const desc = getEffectText(e.effectId);
    return `${t}：${desc}`;
  });
});

// --- E2-T2: 番剧真实元数据（Bangumi 送达，竞品物理上拿不到） ---
const animeMeta = computed(() => {
  if (props.cardType !== 'anime' || !viewCard.value) return null;
  return viewCard.value as AnimeCard;
});

/** 放送年：date 取前 4 位（如 "2025-04-01" → "2025"），缺失/非法返回空。 */
const releaseYear = computed(() => {
  const date = animeMeta.value?.date;
  if (!date || typeof date !== 'string' || date.length < 4) return '';
  const year = date.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : '';
});

const characterMeta = computed(() => {
  if (props.cardType !== 'character' || !viewCard.value) return null;
  return viewCard.value as CharacterCard;
});

/** 角色性别中文化（未知/缺失返回空 → 不显示该行）。 */
const characterGender = computed(() => {
  const g = characterMeta.value?.gender;
  if (typeof g !== 'string') return '';
  const key = g.trim().toLowerCase();
  if (key === 'female' || key === '女') return '女';
  if (key === 'male' || key === '男') return '男';
  return ''; // 其它/未知不展示
});

/** 角色生日（"未知"/空 → 空，守卫不显示）。 */
const characterBirthday = computed(() => {
  const b = characterMeta.value?.birthday;
  if (typeof b !== 'string') return '';
  const t = b.trim();
  return t && t !== '未知' ? t : '';
});

/** anime 卡是否有任一真实资料可展示。 */
const hasAnimeMeta = computed(() => {
  const m = animeMeta.value;
  return !!m && (typeof m.rating_score === 'number' || typeof m.rating_rank === 'number' || !!releaseYear.value);
});

/** character 卡是否有任一真实资料可展示。 */
const hasCharacterMeta = computed(() => {
  const m = characterMeta.value;
  if (!m) return false;
  return typeof m.anime_count === 'number'
    || typeof m.popularity_score === 'number'
    || typeof m.comprehensive_popularity === 'number'
    || !!characterGender.value
    || !!characterBirthday.value;
});

const processedAnimeNames = computed(() => {
    if (props.cardType !== 'character' || !viewCard.value) return [];
    const charCard = viewCard.value as CharacterCard;
    if (!charCard.anime_names) return [];
    
    return charCard.anime_names.map((name: string) => {
        const animeCard = gameDataStore.allAnimeCards.find((c: AnimeCard) => c.name === name);
        const isOwned = animeCard ? userStore.animeCollection.has(animeCard.id) : false;
        return { name, isOwned };
    });
});

function closeModal() {
  emit('close');
}


async function handleDismantle() {
    if (!viewCard.value) return;
    const ok = await confirm(
        `确定要分解一张 [${viewCard.value.rarity}] ${viewCard.value.name} 吗？\n你将获得 ${dismantleValue.value} 知识点。`,
        { confirmText: '分解', danger: true },
    );
    if (ok && viewCard.value) {
        userStore.dismantleCard(viewCard.value.id, props.cardType);
        closeModal();
    }
}
</script>

<template>
  <div 
    v-if="card" 
    @click="closeModal"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
  >
    <div 
      @click.stop 
      class="bg-elevated p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col text-ink"
    >
      <div class="flex-shrink-0 flex justify-between items-start gap-3 mb-4">
        <h2 class="text-2xl font-bold">{{ viewCard?.name }}</h2>
        <div class="flex items-center gap-2 shrink-0">
          <!-- I4-T3：「正在追」Pin 开关（仅番剧；设备级自设目标） -->
          <button
            v-if="cardType === 'anime'"
            class="text-sm font-bold px-3 py-1.5 rounded-full border"
            :class="isPinned
              ? 'bg-info text-on-accent border-info'
              : 'bg-surface text-ink-2 border-line hover:text-ink'"
            :aria-pressed="isPinned"
            :title="isPinned ? '点击取消「正在追」' : '加入「正在追」（主页可见）'"
            @click="togglePin"
          >{{ isPinned ? '📌 正在追' : '📌 追这部' }}</button>
          <!-- I2-T2：「看过」开关（仅番剧；一处覆盖推荐条/图鉴/品味页/对战全站详情入口） -->
          <button
            v-if="cardType === 'anime'"
            class="text-sm font-bold px-3 py-1.5 rounded-full border"
            :class="isWatched
              ? 'bg-accent text-on-accent border-accent'
              : 'bg-surface text-ink-2 border-line hover:text-ink'"
            :aria-pressed="isWatched"
            :title="isWatched ? '点击取消「看过」' : '标记为「看过」'"
            @click="toggleWatched"
          >{{ isWatched ? '👁 已看过' : '＋ 看过' }}</button>
          <button @click="closeModal" class="text-2xl text-ink-2 hover:text-ink leading-none">&times;</button>
        </div>
      </div>
      <p v-if="cardType === 'anime' && !userStore.isLoggedIn" class="flex-shrink-0 -mt-2 mb-3 text-xs text-warning">
        ⚠️ 未登录，「看过」仅本次会话有效；登录后可永久保存。
      </p>

      <div ref="scrollBody" class="flex-grow overflow-y-auto pr-4 -mr-4">
        <div v-if="viewCard" class="flex flex-col md:flex-row gap-6">
          <!-- Left side: Image -->
          <div class="md:w-1/3 flex-shrink-0">
            <img loading="lazy" decoding="async" :src="viewCard.image_path" class="w-full rounded-md shadow-lg" :alt="viewCard.name">
            <div class="mt-4 text-center">
                <span
                    class="font-bold px-3 py-1 rounded-full text-white"
                    :class="cardRarityConfig.c?.includes('from') ? `bg-gradient-to-r ${cardRarityConfig.c}` : cardRarityConfig.c || 'bg-gray-500'"
                >
                    {{ viewCard.rarity }}
                </span>
            </div>
            <div class="mt-2 text-center text-sm text-ink-2">
                拥有数量: <span class="font-bold">{{ viewCount }}</span>
            </div>
          </div>

          <!-- Right side: Details -->
          <div class="md:w-2/3">
            <div v-if="viewCard.description" class="prose max-w-none">
              <h3 class="font-bold text-lg mb-2">简介</h3>
              <p class="text-sm whitespace-pre-wrap">{{ viewCard.description }}</p>
            </div>

            <!-- E2-T2: 番剧资料（Bangumi 真实元数据，缺失字段不显示该行） -->
            <div v-if="hasAnimeMeta || hasCharacterMeta" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">番剧资料</h3>
              <!-- Anime 真实评分 / 排名 / 放送年 -->
              <div v-if="cardType === 'anime' && animeMeta" class="text-sm space-y-2">
                <div v-if="typeof animeMeta.rating_score === 'number'">
                  <strong>Bangumi 评分:</strong>
                  <span class="font-semibold text-accent">{{ animeMeta.rating_score }}</span>
                  <span v-if="typeof animeMeta.rating_total === 'number'" class="text-ink-2"> · {{ animeMeta.rating_total }} 人评分</span>
                </div>
                <div v-if="typeof animeMeta.rating_rank === 'number'">
                  <strong>排名:</strong> <span class="font-semibold text-ink">#{{ animeMeta.rating_rank }}</span>
                </div>
                <div v-if="releaseYear">
                  <strong>放送年:</strong> <span class="font-semibold text-ink">{{ releaseYear }}</span>
                </div>
              </div>
              <!-- Character 登场作品数 / 人气 / 性别 / 生日 -->
              <div v-if="cardType === 'character' && characterMeta" class="text-sm space-y-2">
                <div v-if="characterGender">
                  <strong>性别:</strong> <span class="font-semibold text-ink">{{ characterGender }}</span>
                </div>
                <div v-if="characterBirthday">
                  <strong>生日:</strong> <span class="font-semibold text-ink">{{ characterBirthday }}</span>
                </div>
                <div v-if="typeof characterMeta.anime_count === 'number'">
                  <strong>登场作品数:</strong> <span class="font-semibold text-ink">{{ characterMeta.anime_count }}</span>
                </div>
                <div v-if="typeof characterMeta.popularity_score === 'number'">
                  <strong>人气值:</strong> <span class="font-semibold text-accent">{{ characterMeta.popularity_score }}</span>
                </div>
                <div v-if="typeof characterMeta.comprehensive_popularity === 'number'">
                  <strong>综合人气:</strong> <span class="font-semibold text-ink">{{ characterMeta.comprehensive_popularity }}</span>
                </div>
              </div>
            </div>

            <!-- NEW: Battle Information Section -->
            <div class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">战斗信息</h3>
              <!-- Anime Card Battle Info -->
              <div v-if="cardType === 'anime'" class="text-sm space-y-2">
                <div><strong>TP 消耗:</strong> <span class="font-semibold text-info">{{ (viewCard as AnimeCard).cost }}</span></div>
                <div v-if="(viewCard as AnimeCard).effectDescription"><strong>效果:</strong> <span class="italic">{{ (viewCard as AnimeCard).effectDescription }}</span></div>
                <div v-if="animeEffectsDescriptions.length" class="mt-2">
                  <strong>卡面效果:</strong>
                  <ul class="mt-2 space-y-2">
                    <li v-for="line in animeEffectsDescriptions" :key="line"
                        class="px-3 py-2 rounded-md border text-sm"
                        :class="[
                          'bg-gradient-to-r from-accent/10 to-info/10',
                          'border-accent/50',
                          'text-ink'
                        ]"
                    >
                      <span class="inline-block mr-2 px-2 py-0.5 rounded bg-accent text-on-accent text-xs">效果</span>
                      <span class="font-medium">{{ line }}</span>
                    </li>
                  </ul>
                </div>
              </div>
              <!-- Character Card Battle Info -->
              <div v-if="cardType === 'character'" class="space-y-4">
                <div v-if="activeSkill" class="p-3 bg-danger/10 rounded-lg">
                  <h4 class="font-bold text-danger">主动技能: {{ activeSkill.name }}
                    <span v-if="!isSkillImplemented(activeSkill)" class="badge-unimplemented" title="该技能尚未实装：当前不产生实际效果（S8 实装中）">⚠️ 未实装</span>
                  </h4>
                  <p class="text-xs text-ink-2 mt-1">[消耗: {{ activeSkill.cost || 0 }} TP] [冷却: {{ activeSkill.cooldown || 0 }} 回合]</p>
                  <p class="text-sm mt-2">{{ activeSkill.description }}</p>
                  <div v-if="activeSkill.effectId" class="mt-2">
                    <ul class="mt-1">
                      <li class="px-3 py-2 rounded-md border text-sm"
                          :class="[
                            'bg-gradient-to-r from-danger/10 to-warning/10',
                            'border-danger/50',
                            'text-ink'
                          ]"
                      >
                        <span class="inline-block mr-2 px-2 py-0.5 rounded bg-danger text-white text-xs">技能</span>
                        <span class="font-medium">{{ getEffectText(activeSkill.effectId) }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-if="passiveSkill" class="p-3 bg-accent-soft rounded-lg">
                  <h4 class="font-bold text-accent">被动光环: {{ passiveSkill.name }}
                    <span v-if="!isSkillImplemented(passiveSkill)" class="badge-unimplemented" title="该技能尚未实装：当前不产生实际效果（S8 实装中）">⚠️ 未实装</span>
                  </h4>
                  <p class="text-sm mt-2">{{ passiveSkill.description }}</p>
                  <div v-if="passiveSkill.effectId" class="mt-2">
                    <ul class="mt-1">
                      <li class="px-3 py-2 rounded-md border text-sm"
                          :class="[
                            'bg-gradient-to-r from-accent/10 to-info/10',
                            'border-accent/50',
                            'text-ink'
                          ]"
                      >
                        <span class="inline-block mr-2 px-2 py-0.5 rounded bg-accent text-on-accent text-xs">光环</span>
                        <span class="font-medium">{{ getEffectText(passiveSkill.effectId) }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <!-- END NEW -->
            
            <div v-if="viewCard.synergy_tags && viewCard.synergy_tags.length" class="mt-4 border-t pt-4">
                <h3 class="font-bold text-lg mb-2">标签</h3>
                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in viewCard.synergy_tags" :key="tag" class="bg-accent-soft text-accent text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {{ tag }}
                    </span>
                </div>
            </div>

            <div v-if="cardType === 'character' && (viewCard as CharacterCard)?.anime_names && (viewCard as CharacterCard)?.anime_names?.length" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">登场作品</h3>
              <div class="flex flex-wrap gap-2">
                <span v-for="anime in processedAnimeNames" :key="anime.name"
                  class="text-xs font-semibold px-2.5 py-1 rounded-full"
                  :class="anime.isOwned ? 'bg-success/15 text-success' : 'bg-surface-2 text-ink-2'"
                >
                  {{ anime.name }}
                </span>
              </div>
            </div>

            <!-- I4-T2：相似作品「看过这部的人也喜欢」——详情页内导航（点一部→替换内容，不叠 modal）。仅番剧。 -->
            <div v-if="cardType === 'anime' && similarAnime.length" class="mt-4 border-t pt-4">
              <h3 class="font-bold text-lg mb-2">🔍 看过这部的人也喜欢</h3>
              <p class="text-xs text-ink-2 mb-3">点一部直接在这里切换查看（已拥有/已看过的不再推荐）。</p>
              <div class="similar-grid">
                <button
                  v-for="rec in similarAnime"
                  :key="rec.anime.id"
                  class="similar-card"
                  :title="`查看 ${rec.anime.name}`"
                  @click="navigateTo(rec.anime)"
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    :src="similarImageSrc(rec.anime.id)"
                    @error="onThumbError"
                    class="similar-img"
                    :alt="rec.anime.name"
                  />
                  <div class="similar-name" :title="rec.anime.name">{{ rec.anime.name }}</div>
                  <div v-if="rec.reasonTags.length" class="similar-tags">
                    <span v-for="t in rec.reasonTags" :key="t" class="similar-tag">{{ t }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dismantle Section -->
      <div v-if="viewCount > 1 && viewCard" class="flex-shrink-0 border-t mt-4 pt-4">
          <h3 class="font-bold mb-2">分解卡牌</h3>
          <p class="text-sm text-ink-2 mb-3">分解一张多余的 [{{ viewCard.rarity }}] {{ viewCard.name }} 可获得 <span class="font-bold text-accent">{{ dismantleValue }}</span> 知识点。</p>
          <button @click="handleDismantle" class="bg-danger text-white font-bold py-2 px-4 rounded-lg hover:opacity-85 text-sm">
              分解一张
          </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.badge-unimplemented {
  @apply ml-1 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning border border-warning/40;
}

/* I4-T2 相似作品网格（详情页内导航，不叠 modal） */
.similar-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 0.55rem;
}
.similar-card {
  display: flex; flex-direction: column; overflow: hidden; text-align: left; padding: 0; cursor: pointer;
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
  transition: transform .12s, border-color .12s;
}
.similar-card:hover { transform: translateY(-2px); border-color: rgb(var(--c-accent)); }
.similar-img { width: 100%; aspect-ratio: 2 / 3; object-fit: cover; object-position: top; display: block; }
.similar-name {
  font-size: 0.68rem; font-weight: 700; color: rgb(var(--c-ink)); padding: 0.25rem 0.35rem 0.1rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.similar-tags { display: flex; flex-wrap: wrap; gap: 0.12rem; padding: 0 0.35rem 0.35rem; min-height: 0.9rem; }
.similar-tag {
  font-size: 0.56rem; padding: 0.04rem 0.28rem; border-radius: 999px;
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent));
}
</style>
