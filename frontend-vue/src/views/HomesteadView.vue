<script setup lang="ts">
/**
 * 家园（evolution-12）：抽到的 UR/HR 角色像素小人在地面上左右自动走动（桌宠风）。
 * 像素 sprite 由 backend/pixelize_characters.py 预生成在 data/images/character/pixel/。
 * 走动用单个 rAF 循环驱动（卸载时取消）；每只到边界折返、按朝向镜像、独立相位 bob。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import type { CharacterCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();

const MAX_PETS = 24;

interface Pet {
  id: number;
  name: string;
  x: number;       // 横向位置（%）
  dir: 1 | -1;     // 朝向/移动方向
  speed: number;   // %/秒
  delay: string;   // bob 动画相位错开
  pause: number;   // 剩余停顿秒数（偶尔站住）
  hidden: boolean; // sprite 缺失则隐藏
}

const pets = ref<Pet[]>([]);

/** 已拥有且有像素 sprite（UR/HR）的角色，随机取若干只入园。 */
function buildPets() {
  if (!userStore.isLoggedIn) { pets.value = []; return; }
  const owned = gameData.allCharacterCards.filter(
    c => (c.rarity === 'UR' || c.rarity === 'HR') && collection.getCharacterCardCount(c.id) > 0,
  );
  // 洗牌（无 Math.random 限制——这是组件层，可用）
  for (let i = owned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [owned[i], owned[j]] = [owned[j], owned[i]];
  }
  pets.value = owned.slice(0, MAX_PETS).map(c => ({
    id: c.id,
    name: c.name,
    x: 4 + Math.random() * 88,
    dir: Math.random() < 0.5 ? 1 : -1,
    speed: 2.5 + Math.random() * 4,
    delay: `-${(Math.random() * 0.3).toFixed(2)}s`,
    pause: 0,
    hidden: false,
  }));
}

const visibleCount = computed(() => pets.value.filter(p => !p.hidden).length);

function pixelSrc(id: number): string {
  return `/data/images/character/pixel/${id}.png`;
}
function onSpriteError(pet: Pet) {
  pet.hidden = true;
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

// 登录态变化（如重载后再登录）时重建入园角色
watch(() => userStore.isLoggedIn, () => buildPets());

onMounted(() => {
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
        <p class="text-sm text-ink-2">抽到的 UR / HR 角色会在这里散步。点一下看详情。</p>
      </div>
      <button v-if="userStore.isLoggedIn && visibleCount > 0" class="btn-ghost text-sm px-3 py-2" @click="buildPets">换一批</button>
    </header>

    <div v-if="!userStore.isLoggedIn" class="hs-empty">请先登录，抽到的角色就会来这儿安家。</div>

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
            <img :src="pixelSrc(pet.id)" alt="" @error="onSpriteError(pet)" />
          </div>
        </div>
        <div class="pet-shadow"></div>
      </div>

      <div v-if="visibleCount === 0" class="hs-empty hs-empty-scene">
        还没有 UR / HR 角色入住——去抽卡转出稀有角色吧，他们会自动来散步。
      </div>
    </div>
  </div>
</template>

<style scoped>
.homestead { width: 100%; }
.hs-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.hs-empty { text-align: center; padding: 3rem 1rem; color: rgb(var(--c-ink-2)); }
.hs-empty-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; text-shadow: 0 1px 3px rgb(0 0 0 / .5); }

.scene {
  position: relative; width: 100%; height: min(64vh, 540px); overflow: hidden;
  border-radius: var(--sk-radius, 0.75rem); border: 1px solid rgb(var(--c-line));
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
.bob img { height: 92px; width: auto; display: block; image-rendering: pixelated; filter: drop-shadow(0 0 0 transparent); }
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
</style>
