<script setup lang="ts">
/**
 * 家园（evolution-12 / S13）：俯视平面广场（动森风）。入住角色在广场里四向自由漫步，
 * 并随时间挂机成长。
 * - 入住者 = homestead.placedCharacterIds（「管理入住」里选，≤HOMESTEAD_SLOTS）。
 * - 进家园（onMounted）结算一次离线收益（settleHomestead，按 lastSettleAt 虚拟累积）。
 * - 立绘三级兜底：四向行走表 sprite（data/images/character/sprite/<id>.png，3列×4行/格48×64）
 *   → 缺表回退 Q版 chibi（chibi/<id>.png）→ 再缺回退原立绘 → 都缺才隐藏。
 *   sprite 是否存在用 new Image() 探测一次（增量填充，无需硬编码 id 名单）。
 * - 移动矢量决定朝向行（下/上/左/右），行走时 3 帧循环、静止显中间帧；y 越大越靠前（z 排序 + 轻微放大景深）。
 * 走动用单个 rAF 循环驱动（卸载时取消）。本视图允许 Math.random（非 engine 层）。
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useHomesteadStore } from '@/stores/homestead';
import { useCollectionStore } from '@/stores/collection';
import { chibiImageSrc, fullImageSrc, spriteSheetSrc } from '@/utils/cardImage';
import { IDLE_SETTLE_MODAL_MIN_HOURS, type IdleYield } from '@/config/homestead';
import type { CharacterCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import HomesteadManageModal from '@/components/homestead/HomesteadManageModal.vue';

const userStore = useUserStore();
const gameData = useGameDataStore();
const homestead = useHomesteadStore();
const collection = useCollectionStore();

// --- sprite 表规格（与 codex 产出一致：3 列行走帧 × 4 行朝向，格 48×64）---
type Dir = 'down' | 'up' | 'left' | 'right';
/** 朝向 → sheet 行号。下=正面/上=背面/左/右（若实测左右相反，只需对调此表）。 */
const ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
/** 3 帧行走循环（中间帧复用一次，RPG-Maker 惯例）；静止时显第 1 帧（站姿）。 */
const WALK_SEQ = [0, 1, 2, 1];
const FRAME_MS = 150;                 // 每帧时长
const DISP_W = 66;                    // 展示格宽（48 × 1.375）
const DISP_H = 88;                    // 展示格高（64 × 1.375）

// 广场活动范围（%）：留出顶部名牌、底部影子余量
const MIN_X = 7, MAX_X = 93, MIN_Y = 22, MAX_Y = 86;

interface Pet {
  id: number;
  name: string;
  x: number;          // 横向中心（%）
  y: number;          // 纵向脚点（%，0 顶 → 100 底）
  dir: Dir;           // 当前朝向 / 移动方向
  moving: boolean;    // 行走 or 站立
  speed: number;      // %/秒
  frame: number;      // 行走序列下标 0..WALK_SEQ.length-1
  frameT: number;     // 帧计时累加（ms）
  stateT: number;     // 当前 行走/站立 状态剩余秒数
  hasSprite: boolean; // 四向行走表是否可用（探测命中）
  hidden: boolean;    // sprite + chibi + 原立绘都缺 → 隐藏（终极兜底）
}

const pets = ref<Pet[]>([]);

function randomDir(): Dir {
  return (['down', 'up', 'left', 'right'] as const)[Math.floor(Math.random() * 4)];
}

/** 入住角色化作广场漫步者（随机初始位置/朝向/速度）。 */
function buildPets() {
  if (!userStore.isLoggedIn) { pets.value = []; return; }
  pets.value = homestead.placedCharacterIds
    .map((id): Pet | null => {
      const card = gameData.getCharacterCardById(id);
      if (!card) return null;
      return {
        id,
        name: card.name,
        x: MIN_X + Math.random() * (MAX_X - MIN_X),
        y: MIN_Y + Math.random() * (MAX_Y - MIN_Y),
        dir: randomDir(),
        moving: Math.random() < 0.7,
        speed: 3 + Math.random() * 4,
        frame: 0,
        frameT: 0,
        stateT: 0.6 + Math.random() * 2,
        hasSprite: false,
        hidden: false,
      };
    })
    .filter((p): p is Pet => p !== null);
  probeSprites();
}

/** 探测每个角色的四向行走表是否存在（命中即切 sprite 模式，否则保持静态兜底）。 */
function probeSprites() {
  for (const pet of pets.value) {
    const img = new Image();
    img.onload = () => { pet.hasSprite = true; };
    img.onerror = () => { pet.hasSprite = false; };
    img.src = spriteSheetSrc(pet.id);
  }
}

const visibleCount = computed(() => pets.value.filter(p => !p.hidden).length);

/** 静态兜底图三级链：chibi（缺）→ 原立绘（缺）→ 隐藏。带 guard 防 onerror 死循环。 */
function onPetImgError(e: Event, pet: Pet) {
  const img = e.target as HTMLImageElement;
  if (!img.dataset.fullFallback) {
    img.dataset.fullFallback = '1';
    img.src = fullImageSrc('character', pet.id);
  } else {
    pet.hidden = true;
  }
}

// --- sprite 渲染 ---
/** 当前帧的 background-position（行走取序列帧，静止取中间帧）。 */
function spriteStyle(pet: Pet) {
  const col = pet.moving ? WALK_SEQ[pet.frame] : 1;
  const row = ROW[pet.dir];
  return {
    backgroundImage: `url(${spriteSheetSrc(pet.id)})`,
    backgroundPosition: `-${col * DISP_W}px -${row * DISP_H}px`,
  };
}

/** y 越靠下越「近」：轻微放大（0.82→1.12）+ 提升 z 排序。 */
function depthScale(y: number): number {
  const t = (Math.min(MAX_Y, Math.max(MIN_Y, y)) - MIN_Y) / (MAX_Y - MIN_Y);
  return 0.82 + t * 0.3;
}
function petStyle(pet: Pet) {
  return { left: pet.x + '%', top: pet.y + '%', zIndex: Math.round(pet.y * 10) };
}

// --- 漫步循环 ---
let raf = 0;
let lastT = 0;

/** 状态结束：在 行走/站立 间切换，行走时重选朝向。 */
function pickState(pet: Pet) {
  if (Math.random() < 0.72) {
    pet.moving = true;
    pet.dir = randomDir();
    pet.frame = 0;
    pet.frameT = 0;
    pet.stateT = 0.9 + Math.random() * 2.4;
  } else {
    pet.moving = false;
    pet.stateT = 0.6 + Math.random() * 1.8;
  }
}

/** 撞边界：钳回范围内并强制转向场内，避免贴边卡住。 */
function clampToBounds(pet: Pet) {
  if (pet.x < MIN_X) { pet.x = MIN_X; pet.dir = 'right'; pet.stateT = 1 + Math.random(); }
  else if (pet.x > MAX_X) { pet.x = MAX_X; pet.dir = 'left'; pet.stateT = 1 + Math.random(); }
  if (pet.y < MIN_Y) { pet.y = MIN_Y; pet.dir = 'down'; pet.stateT = 1 + Math.random(); }
  else if (pet.y > MAX_Y) { pet.y = MAX_Y; pet.dir = 'up'; pet.stateT = 1 + Math.random(); }
}

const DIR_VEC: Record<Dir, { dx: number; dy: number }> = {
  down: { dx: 0, dy: 1 },
  up: { dx: 0, dy: -1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function tick(t: number) {
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
  lastT = t;
  for (const p of pets.value) {
    if (p.hidden) continue;
    p.stateT -= dt;
    if (p.stateT <= 0) pickState(p);
    if (!p.moving) continue;

    const v = DIR_VEC[p.dir];
    p.x += v.dx * p.speed * dt;
    p.y += v.dy * p.speed * dt;
    clampToBounds(p);

    // 行走帧推进
    p.frameT += dt * 1000;
    if (p.frameT >= FRAME_MS) {
      p.frameT -= FRAME_MS;
      p.frame = (p.frame + 1) % WALK_SEQ.length;
    }
  }
  raf = requestAnimationFrame(tick);
}

// --- 点击看详情（复用卡详情弹窗） ---
const detailCard = ref<CharacterCard | null>(null);
const detailCount = computed(() => (detailCard.value ? collection.getCharacterCardCount(detailCard.value.id) : 0));
function openDetail(pet: Pet) {
  const card = gameData.getCharacterCardById(pet.id);
  if (card) detailCard.value = card;
  // 被点到就驻足一下回应（点击反馈，避免「点的人跑了才弹窗」的割裂感）
  pet.moving = false;
  pet.stateT = Math.max(pet.stateT, 0.8);
}

// --- 入住管理 + 离线收益结算 ---
const showManage = ref(false);
const settleResult = ref<IdleYield | null>(null);

function runSettle() {
  const y = userStore.settleHomestead();
  const has = y.expEach > 0 || y.affectionEach > 0 || y.knowledge > 0;
  if (!has) return;
  // 高价值回归才隆重弹窗；零碎收益静默入账 + 一行日志，免打断频繁进出
  if (y.hours >= IDLE_SETTLE_MODAL_MIN_HOURS) {
    settleResult.value = y;
  } else {
    userStore.addLog(`🏠 挂机已结算：经验+${y.expEach} · 好感+${y.affectionEach} · 知识点+${y.knowledge}`, 'info');
  }
}

// 入住名单变化（管理弹窗里增删）时重建漫步者
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
        <p class="text-sm text-ink-2">入住的角色会在广场里四处漫步并随时间挂机成长。点角色看详情。</p>
      </div>
      <button v-if="userStore.isLoggedIn" class="btn-primary text-sm px-3 py-2" @click="showManage = true">管理入住</button>
    </header>

    <div v-if="!userStore.isLoggedIn" class="hs-empty">请先登录，把角色放进家园挂机成长。</div>

    <div v-else class="scene">
      <!-- 俯视广场背景（自绘像素风：草地 + 中央广场 + 装饰，固定配色不随皮肤）-->
      <div class="field"></div>
      <div class="plaza"></div>
      <div class="deco tree tree-1"></div>
      <div class="deco tree tree-2"></div>
      <div class="deco tree tree-3"></div>
      <div class="deco flower flower-1"></div>
      <div class="deco flower flower-2"></div>
      <div class="deco flower flower-3"></div>
      <div class="deco flower flower-4"></div>

      <!-- 角色漫步者 -->
      <div
        v-for="pet in pets"
        v-show="!pet.hidden"
        :key="pet.id"
        class="pet"
        :class="{ 'is-idle': !pet.moving }"
        :style="petStyle(pet)"
        :title="pet.name"
        @click="openDetail(pet)"
      >
        <div class="pet-inner" :style="{ transform: `scale(${depthScale(pet.y)})` }">
          <span class="pet-name">{{ pet.name }}</span>
          <div class="pet-shadow"></div>
          <!-- 四向行走表 -->
          <div v-if="pet.hasSprite" class="sprite" :style="spriteStyle(pet)"></div>
          <!-- 静态兜底（chibi → 原立绘）：无四向表的角色，左右移动时水平翻转 -->
          <div v-else class="bob">
            <img
              :src="chibiImageSrc(pet.id)"
              alt=""
              :style="{ transform: `scaleX(${pet.dir === 'left' ? -1 : 1})` }"
              @error="onPetImgError($event, pet)"
            />
          </div>
        </div>
      </div>

      <div v-if="visibleCount === 0" class="hs-empty-scene">
        <div class="hs-empty-card">
          <p>还没有角色入住——把角色放进来一起挂机吧。</p>
          <button class="btn-primary text-sm px-4 py-2" @click="showManage = true">管理入住</button>
        </div>
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
.hs-empty-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 9999; }
.hs-empty-card { display: flex; flex-direction: column; align-items: center; gap: .75rem; max-width: 80%; padding: 1rem 1.5rem; border-radius: 12px; background: rgb(0 0 0 / .45); color: #fff; text-align: center; font-size: .9rem; }

.scene {
  position: relative; width: 100%; height: min(64vh, 540px); overflow: hidden;
  border-radius: var(--sk-radius-panel); border: 1px solid rgb(var(--c-line));
}

/* 场景为插画内容，用固定像素风配色（不随皮肤），类比卡面美术的固定色例外 */
/* 俯视草地：基底绿 + 极淡网格暗示地砖 */
.field {
  position: absolute; inset: 0;
  background:
    repeating-linear-gradient(0deg, rgb(255 255 255 / .045) 0 26px, transparent 26px 52px),
    repeating-linear-gradient(90deg, rgb(0 0 0 / .035) 0 26px, transparent 26px 52px),
    radial-gradient(130% 100% at 50% 18%, #bbe6a8 0%, #8ad08a 45%, #5fb872 100%);
}
/* 中央广场（浅色圆形铺地） */
.plaza {
  position: absolute; left: 50%; top: 56%; width: 64%; height: 56%;
  transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, #ece0c4 0%, #ddcba4 78%, #d3bf94 100%);
  border-radius: 50%; opacity: .94;
  box-shadow: inset 0 0 0 5px rgb(255 255 255 / .22), 0 2px 8px rgb(0 0 0 / .08);
}

/* 装饰（始终在角色之下，z 低） */
.deco { position: absolute; z-index: 1; pointer-events: none; }
.tree { width: 0; height: 0; }
.tree::before { /* 树冠 */
  content: ''; position: absolute; width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #7cc77a, #3f9d56);
  box-shadow: 0 6px 10px rgb(0 0 0 / .18); left: -23px; top: -40px;
}
.tree::after { /* 树干 */
  content: ''; position: absolute; width: 10px; height: 16px; border-radius: 2px;
  background: #8a5a32; left: -5px; top: 0;
}
.tree-1 { left: 9%; top: 24%; }
.tree-2 { left: 88%; top: 30%; }
.tree-3 { left: 78%; top: 84%; }
.flower { width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 0 3px rgb(255 255 255 / .35); }
.flower::after { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #ffe08a; }
.flower-1 { left: 24%; top: 70%; background: #ef8fb2; }
.flower-2 { left: 64%; top: 40%; background: #9bb8ff; }
.flower-3 { left: 40%; top: 30%; background: #f3a3e0; }
.flower-4 { left: 56%; top: 78%; background: #ef8fb2; }

/* 漫步者：脚点锚定在 (x,y) */
.pet {
  position: absolute; transform: translate(-50%, -100%);
  cursor: pointer; will-change: left, top; transition: transform .09s ease;
}
.pet:active { transform: translate(-50%, -100%) scale(.94); }
.pet-inner { position: relative; transform-origin: bottom center; }
.bob { animation: petbob .28s steps(1) infinite alternate; }
/* sprite / chibi / 原立绘均为平滑图（非像素美术），不用 image-rendering: pixelated */
.bob img { height: 88px; width: auto; display: block; }
.sprite {
  width: 66px; height: 88px;               /* 48×64 单格 × 1.375 */
  background-size: 198px 352px;            /* 整表 144×256 × 1.375 = 3×4 格 */
  background-repeat: no-repeat;
}
/* 待机呼吸：站住时极轻纵向起伏（行走时关闭、只跑帧），从脚底起伏 */
.pet.is-idle .sprite { animation: petbreath 2.6s ease-in-out infinite; transform-origin: bottom center; }
@keyframes petbreath { from { transform: scaleY(1); } to { transform: scaleY(1.018); } }
.pet-shadow {
  position: absolute; bottom: -5px; left: 50%; width: 40px; height: 11px; margin-left: -20px;
  border-radius: 50%; background: rgb(0 0 0 / .2); filter: blur(.5px);
}
.pet-name {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 4px; padding: 1px 6px; border-radius: 6px; white-space: nowrap;
  font-size: 11px; color: #fff; background: rgb(0 0 0 / .42);
  opacity: .62; transition: opacity .15s, background .15s; pointer-events: none; z-index: 2;
}
.pet:hover .pet-name { opacity: 1; background: rgb(0 0 0 / .62); }
@keyframes petbob { from { transform: translateY(0); } to { transform: translateY(-3px); } }

/* 离线收益弹窗 */
.settle-pop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / .5); padding: 1rem; }
.settle-card { background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel); padding: 1.25rem 1.5rem; width: 100%; max-width: 320px; box-shadow: 0 10px 40px rgb(0 0 0 / .25); }
.settle-list { display: flex; flex-direction: column; gap: .5rem; }
.settle-list li { display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: rgb(var(--c-ink-2)); }
.settle-list li b { color: rgb(var(--c-accent)); font-size: 1rem; }
</style>
