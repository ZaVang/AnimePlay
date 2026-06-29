<script setup lang="ts">
/**
 * 家园（evolution-12 / S13）：入住的角色在地面上左右自动走动（桌宠风），并随时间挂机成长。
 * - 入住者 = homestead.placedCharacterIds（「管理入住」里选，≤HOMESTEAD_SLOTS）。
 * - 进家园（onMounted）结算一次离线收益（settleHomestead，按 lastSettleAt 虚拟累积），有产出弹窗展示。
 * - 桌宠图优先 Q版 chibi（data/images/character/chibi/<id>.png，增量填充），缺失回退原立绘 → 都缺才隐藏。
 * 走动用单个 rAF 循环驱动（卸载时取消）。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useHomesteadStore } from '@/stores/homestead';
import { useCollectionStore } from '@/stores/collection';
import { chibiImageSrc, fullImageSrc } from '@/utils/cardImage';
import type { IdleYield } from '@/config/homestead';
import type { CharacterCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import HomesteadManageModal from '@/components/homestead/HomesteadManageModal.vue';

const userStore = useUserStore();
const gameData = useGameDataStore();
const homestead = useHomesteadStore();
const collection = useCollectionStore();

interface Pet {
  id: number;
  name: string;
  x: number;       // 横向位置（%）
  dir: 1 | -1;     // 朝向/移动方向
  speed: number;   // %/秒
  delay: string;   // bob 动画相位错开
  pause: number;   // 剩余停顿秒数（偶尔站住）
  hidden: boolean; // chibi + 原立绘都缺才隐藏（终极兜底）
}

const pets = ref<Pet[]>([]);

/** 入住的角色化作桌宠（按 placedCharacterIds 解析；保留随机初始位置/速度）。 */
function buildPets() {
  if (!userStore.isLoggedIn) { pets.value = []; return; }
  pets.value = homestead.placedCharacterIds
    .map((id): Pet | null => {
      const card = gameData.getCharacterCardById(id);
      if (!card) return null;
      return {
        id,
        name: card.name,
        x: 4 + Math.random() * 88,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: 2.5 + Math.random() * 4,
        delay: `-${(Math.random() * 0.3).toFixed(2)}s`,
        pause: 0,
        hidden: false,
      };
    })
    .filter((p): p is Pet => p !== null);
}

const visibleCount = computed(() => pets.value.filter(p => !p.hidden).length);

/** 桌宠图三级兜底：Q版 chibi（缺）→ 原立绘（缺）→ 隐藏这只。带 guard 防 onerror 死循环。 */
function onPetImgError(e: Event, pet: Pet) {
  const img = e.target as HTMLImageElement;
  if (!img.dataset.fullFallback) {
    img.dataset.fullFallback = '1';            // chibi 缺失 → 回退原立绘
    img.src = fullImageSrc('character', pet.id);
  } else {
    pet.hidden = true;                         // 原立绘也缺失 → 隐藏
  }
}

// --- 行走循环 ---
let raf = 0;
let lastT = 0;
function tick(t: number) {
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
  lastT = t;
  for (const p of pets.value) {
    if (p.hidden) continue;
    if (p.pause > 0) { p.pause -= dt; continue; }
    p.x += p.dir * p.speed * dt;
    if (p.x <= 2) { p.x = 2; p.dir = 1; }
    else if (p.x >= 92) { p.x = 92; p.dir = -1; }
    // 偶尔站住一会 / 随机转身
    else if (Math.random() < 0.004) { p.pause = 0.5 + Math.random() * 1.5; }
    else if (Math.random() < 0.002) { p.dir = (p.dir === 1 ? -1 : 1); }
  }
  raf = requestAnimationFrame(tick);
}

// --- 点击看详情（复用卡详情弹窗） ---
const detailCard = ref<CharacterCard | null>(null);
const detailCount = computed(() => (detailCard.value ? collection.getCharacterCardCount(detailCard.value.id) : 0));
function openDetail(pet: Pet) {
  const card = gameData.getCharacterCardById(pet.id);
  if (card) detailCard.value = card;
}

// --- 入住管理 + 离线收益结算 ---
const showManage = ref(false);
const settleResult = ref<IdleYield | null>(null);

function runSettle() {
  const y = userStore.settleHomestead();
  if (y.expEach > 0 || y.affectionEach > 0 || y.knowledge > 0) settleResult.value = y;
}

// 入住名单变化（管理弹窗里增删）时重建桌宠
watch(() => homestead.placedCharacterIds.slice(), () => buildPets(), { deep: true });
// 登录态变化（重载后再登录）重建
watch(() => userStore.isLoggedIn, () => buildPets());

onMounted(() => {
  runSettle();   // 进家园结算一次离线收益（按 lastSettleAt 虚拟累积）
  buildPets();
  raf = requestAnimationFrame(tick);
});
onUnmounted(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="homestead">
    <header class="hs-header">
      <div>
        <h1 class="text-2xl font-bold text-ink">🏠 家园</h1>
        <p class="text-sm text-ink-2">入住的角色会在这里散步并随时间挂机成长。点角色看详情。</p>
      </div>
      <button v-if="userStore.isLoggedIn" class="btn-primary text-sm px-3 py-2" @click="showManage = true">管理入住</button>
    </header>

    <div v-if="!userStore.isLoggedIn" class="hs-empty">请先登录，把角色放进家园挂机成长。</div>

    <div v-else class="scene">
      <!-- 背景场景（自绘像素风：天空 + 远山 + 云 + 地面）-->
      <div class="sky"></div>
      <div class="sun"></div>
      <div class="cloud cloud-a"></div>
      <div class="cloud cloud-b"></div>
      <div class="hill hill-back"></div>
      <div class="hill hill-front"></div>
      <div class="ground"></div>

      <!-- 角色桌宠 -->
      <div
        v-for="pet in pets"
        v-show="!pet.hidden"
        :key="pet.id"
        class="pet"
        :style="{ left: pet.x + '%' }"
        :title="pet.name"
        @click="openDetail(pet)"
      >
        <span class="pet-name">{{ pet.name }}</span>
        <div class="facer" :style="{ transform: `scaleX(${pet.dir})` }">
          <div class="bob" :style="{ animationDelay: pet.delay }">
            <img :src="chibiImageSrc(pet.id)" alt="" @error="onPetImgError($event, pet)" />
          </div>
        </div>
        <div class="pet-shadow"></div>
      </div>

      <div v-if="visibleCount === 0" class="hs-empty hs-empty-scene">
        还没有角色入住——点「管理入住」把角色放进来挂机吧。
      </div>
    </div>

    <!-- 离线收益弹窗 -->
    <div v-if="settleResult" class="settle-pop" @click.self="settleResult = null">
      <div class="settle-card">
        <h3 class="text-lg font-bold text-ink mb-1">🏠 离线收益</h3>
        <p class="text-sm text-ink-2 mb-3">挂机 {{ settleResult.hours.toFixed(1) }} 小时 · {{ settleResult.characterCount }} 位角色</p>
        <ul class="settle-list">
          <li><span>全员经验</span><b>+{{ settleResult.expEach }}</b></li>
          <li><span>全员好感</span><b>+{{ settleResult.affectionEach }}</b></li>
          <li><span>知识点</span><b>+{{ settleResult.knowledge }}</b></li>
        </ul>
        <button class="btn-primary w-full mt-4" @click="settleResult = null">收下</button>
      </div>
    </div>

    <HomesteadManageModal :is-open="showManage" @close="showManage = false" />
    <CardDetailModal v-if="detailCard" :card="detailCard" card-type="character" :count="detailCount" @close="detailCard = null" />
  </div>
</template>

<style scoped>
.homestead { width: 100%; }
.hs-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.hs-empty { text-align: center; padding: 3rem 1rem; color: rgb(var(--c-ink-2)); }
.hs-empty-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; text-shadow: 0 1px 3px rgb(0 0 0 / .5); }

.scene {
  position: relative; width: 100%; height: min(64vh, 540px); overflow: hidden;
  border-radius: var(--sk-radius-panel); border: 1px solid rgb(var(--c-line));
}
/* 场景为插画内容，用固定像素风配色（不随皮肤），类比卡面美术的固定色例外 */
.sky { position: absolute; inset: 0; background: linear-gradient(#8ecae6 0%, #bde0fe 55%, #e8f5ff 100%); }
.sun { position: absolute; top: 8%; right: 12%; width: 64px; height: 64px; border-radius: 50%; background: #ffe08a; box-shadow: 0 0 0 10px rgb(255 224 138 / .35); }
.cloud { position: absolute; height: 22px; background: #ffffff; border-radius: 999px; opacity: .9; }
.cloud::before, .cloud::after { content: ''; position: absolute; bottom: 0; background: #fff; border-radius: 50%; }
.cloud-a { top: 16%; left: 14%; width: 90px; }
.cloud-a::before { width: 40px; height: 40px; left: 10px; bottom: 2px; }
.cloud-a::after { width: 30px; height: 30px; right: 12px; bottom: 4px; }
.cloud-b { top: 26%; left: 60%; width: 70px; }
.cloud-b::before { width: 32px; height: 32px; left: 8px; bottom: 2px; }
.cloud-b::after { width: 24px; height: 24px; right: 10px; bottom: 4px; }
.hill { position: absolute; left: -5%; right: -5%; border-radius: 50% 50% 0 0; }
.hill-back { bottom: 86px; height: 160px; background: #95d5b2; }
.hill-front { bottom: 80px; height: 110px; left: 30%; right: -10%; background: #74c69d; }
.ground { position: absolute; left: 0; right: 0; bottom: 0; height: 96px; background: #52b788; border-top: 4px solid #40916c; }

.pet {
  position: absolute; bottom: 84px; transform: translateX(-50%);
  cursor: pointer; z-index: 2; will-change: left;
}
.facer { transform-origin: bottom center; }
.bob { animation: petbob .28s steps(1) infinite alternate; }
/* chibi/原立绘都是平滑图（非像素美术），不用 image-rendering: pixelated */
.bob img { height: 92px; width: auto; display: block; }
.pet-shadow {
  position: absolute; bottom: -6px; left: 50%; width: 38px; height: 10px; margin-left: -19px;
  border-radius: 50%; background: rgb(0 0 0 / .18);
}
.pet-name {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 4px; padding: 1px 6px; border-radius: 6px; white-space: nowrap;
  font-size: 12px; color: #fff; background: rgb(0 0 0 / .6);
  opacity: 0; transition: opacity .15s; pointer-events: none;
}
.pet:hover .pet-name { opacity: 1; }
@keyframes petbob { from { transform: translateY(0); } to { transform: translateY(-3px); } }

/* 离线收益弹窗 */
.settle-pop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / .5); padding: 1rem; }
.settle-card { background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel); padding: 1.25rem 1.5rem; width: 100%; max-width: 320px; box-shadow: 0 10px 40px rgb(0 0 0 / .25); }
.settle-list { display: flex; flex-direction: column; gap: .5rem; }
.settle-list li { display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: rgb(var(--c-ink-2)); }
.settle-list li b { color: rgb(var(--c-accent)); font-size: 1rem; }
</style>
