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
import { useEquipmentStore } from '@/stores/equipment';
import { chibiImageSrc, fullImageSrc, spriteSheetSrc } from '@/utils/cardImage';
import { computeIdleYield, IDLE_SETTLE_MODAL_MIN_HOURS, type IdleYield } from '@/config/homestead';
import { formatHomeEffect, sumHomeEffects, SLOT_ORDER } from '@/config/equipment';
import type { CharacterCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import HomesteadManageModal from '@/components/homestead/HomesteadManageModal.vue';

const homesteadMapSrc = new URL('../assets/homestead/sky-island-map-v1.png', import.meta.url).href;

const userStore = useUserStore();
const gameData = useGameDataStore();
const homestead = useHomesteadStore();
const collection = useCollectionStore();
const equipmentStore = useEquipmentStore();

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

type WalkZone =
  | { kind: 'rect'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

// D-map-2 的第一版可行走区域：中央广场 + 主路 + 各建筑入口平台。
// 使用百分比坐标，保持 scene 为 16:9 时与底图稳定对齐。
const WALKABLE_ZONES: WalkZone[] = [
  { kind: 'ellipse', cx: 50, cy: 53, rx: 17, ry: 12 },
  { kind: 'rect', x1: 28, y1: 42, x2: 74, y2: 59 },
  { kind: 'rect', x1: 43, y1: 25, x2: 58, y2: 83 },
  { kind: 'ellipse', cx: 19, cy: 26, rx: 13, ry: 11 },
  { kind: 'rect', x1: 18, y1: 24, x2: 47, y2: 39 },
  { kind: 'ellipse', cx: 21, cy: 60, rx: 10, ry: 15 },
  { kind: 'rect', x1: 13, y1: 49, x2: 38, y2: 70 },
  { kind: 'ellipse', cx: 71, cy: 28, rx: 13, ry: 10 },
  { kind: 'rect', x1: 57, y1: 31, x2: 86, y2: 53 },
  { kind: 'ellipse', cx: 50, cy: 83, rx: 9, ry: 7 },
];

interface Pet {
  id: number;
  name: string;
  x: number;          // 横向中心（%）
  y: number;          // 纵向脚点（%，0 顶 → 100 底）
  dir: Dir;           // 当前朝向 / 移动方向
  moving: boolean;    // 行走 or 站立
  speed: number;      // %/秒
  targetX: number;    // 当前巡游目标点（%）
  targetY: number;
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

function isInZone(x: number, y: number, zone: WalkZone): boolean {
  if (zone.kind === 'rect') {
    return x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2;
  }
  const dx = (x - zone.cx) / zone.rx;
  const dy = (y - zone.cy) / zone.ry;
  return dx * dx + dy * dy <= 1;
}

function isWalkable(x: number, y: number): boolean {
  return WALKABLE_ZONES.some(zone => isInZone(x, y, zone));
}

function randomWalkablePoint(): { x: number; y: number } {
  for (let i = 0; i < 120; i++) {
    const x = MIN_X + Math.random() * (MAX_X - MIN_X);
    const y = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
    if (isWalkable(x, y)) return { x, y };
  }
  return { x: 50, y: 53 };
}

function dirToward(fromX: number, fromY: number, toX: number, toY: number): Dir {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

function assignTarget(pet: Pet) {
  const target = randomWalkablePoint();
  pet.targetX = target.x;
  pet.targetY = target.y;
  pet.dir = dirToward(pet.x, pet.y, target.x, target.y);
}

/** 入住角色化作广场漫步者（随机初始位置/朝向/速度）。 */
function buildPets() {
  if (!userStore.isLoggedIn) { pets.value = []; return; }
  pets.value = homestead.placedCharacterIds
    .map((id): Pet | null => {
      const card = gameData.getCharacterCardById(id);
      if (!card) return null;
      const start = randomWalkablePoint();
      return {
        id,
        name: card.name,
        x: start.x,
        y: start.y,
        dir: randomDir(),
        moving: Math.random() < 0.7,
        speed: 3 + Math.random() * 4,
        targetX: start.x,
        targetY: start.y,
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

const placedCards = computed(() =>
  homestead.placedCharacterIds
    .map(id => gameData.getCharacterCardById(id))
    .filter((card): card is CharacterCard => card != null),
);

const homeEffect = computed(() => {
  void equipmentStore.equipped;
  void equipmentStore.inventory;
  return sumHomeEffects(homestead.placedCharacterIds.map(id => equipmentStore.resolveHomeEffect(id)));
});

const hourlyYield = computed(() =>
  computeIdleYield(placedCards.value.map(c => c.rarity), 3600_000, homeEffect.value),
);

const facilityRows = computed(() => [
  { key: 'exp', label: '训练区', value: `+${hourlyYield.value.expEach}/h`, bonus: homeEffect.value.expPct },
  { key: 'bond', label: '休息区', value: `+${hourlyYield.value.affectionEach}/h`, bonus: homeEffect.value.affectionPct },
  { key: 'knowledge', label: '资料室', value: `+${hourlyYield.value.knowledge}/h`, bonus: homeEffect.value.knowledgePct },
]);

const effectText = computed(() => formatHomeEffect(homeEffect.value));

const residentRows = computed(() =>
  placedCards.value.map(card => {
    const slots = equipmentStore.getEquipped(card.id);
    const equippedCount = SLOT_ORDER.filter(slot => slots[slot] != null).length;
    const effect = equipmentStore.resolveHomeEffect(card.id);
    const nurture = userStore.getNurtureData(card.id);
    return {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      level: nurture.level,
      affection: nurture.affection,
      equippedCount,
      effectText: formatHomeEffect(effect),
    };
  }),
);

function pctText(v: number): string {
  return v > 0 ? `+${Math.round(v * 100)}%` : '基础';
}

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
    assignTarget(pet);
    pet.frame = 0;
    pet.frameT = 0;
    pet.stateT = 0.9 + Math.random() * 2.4;
  } else {
    pet.moving = false;
    pet.stateT = 0.6 + Math.random() * 1.8;
  }
}

function tick(t: number) {
  const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
  lastT = t;
  for (const p of pets.value) {
    if (p.hidden) continue;
    if (!isWalkable(p.x, p.y)) {
      const point = randomWalkablePoint();
      p.x = point.x;
      p.y = point.y;
      p.targetX = point.x;
      p.targetY = point.y;
      assignTarget(p);
    }
    p.stateT -= dt;
    if (p.stateT <= 0) pickState(p);
    if (!p.moving) continue;

    if (!Number.isFinite(p.targetX) || !Number.isFinite(p.targetY) || !isWalkable(p.targetX, p.targetY)) {
      assignTarget(p);
    }
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.65) {
      pickState(p);
      continue;
    }
    p.dir = dirToward(p.x, p.y, p.targetX, p.targetY);
    const step = Math.min(dist, p.speed * dt);
    const nextX = p.x + (dx / dist) * step;
    const nextY = p.y + (dy / dist) * step;
    if (isWalkable(nextX, nextY)) {
      p.x = nextX;
      p.y = nextY;
    } else {
      assignTarget(p);
      p.stateT = 0.35 + Math.random() * 0.9;
    }

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

function openDetailById(id: number) {
  const card = gameData.getCharacterCardById(id);
  if (card) detailCard.value = card;
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
        <span class="hs-eyebrow">LIVING QUARTERS</span>
        <h1 class="text-2xl font-bold text-ink">🏠 家园</h1>
        <p class="text-sm text-ink-2">角色会在基地里漫步、休息和训练；装备词条会转化为离线成长效率。</p>
      </div>
      <button v-if="userStore.isLoggedIn" class="btn-primary text-sm px-3 py-2" @click="showManage = true">管理入住</button>
    </header>

    <div v-if="!userStore.isLoggedIn" class="hs-empty">请先登录，把角色放进家园挂机成长。</div>

    <div v-else class="homestead-shell">
      <div class="scene-panel" aria-label="家园场景">
        <div class="scene">
          <img class="scene-bg" :src="homesteadMapSrc" alt="" draggable="false" />

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
              <p>还没有角色入住，把角色放进来一起挂机吧。</p>
              <button class="btn-primary text-sm px-4 py-2" @click="showManage = true">管理入住</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="ops-panel" aria-label="家园运营">
        <div class="ops-card ops-card-main">
          <span class="ops-kicker">基地舒适度</span>
          <div class="comfort-row">
            <strong>{{ homeEffect.comfort }}</strong>
            <span class="resident-count">入住 {{ residentRows.length }}</span>
          </div>
          <small>{{ effectText || '暂无装备加成' }}</small>
        </div>

        <div class="facility-grid" aria-label="设施产出">
          <div v-for="row in facilityRows" :key="row.key" class="ops-card">
            <span class="ops-kicker">{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
            <small>装备加成 {{ pctText(row.bonus) }}</small>
          </div>
        </div>

        <div class="resident-strip">
          <div class="resident-heading">
            <span>入住名单</span>
            <small>点击查看详情</small>
          </div>
          <div v-if="residentRows.length === 0" class="resident-empty">
            还没有入住角色
          </div>
          <button
            v-for="row in residentRows"
            :key="row.id"
            type="button"
            class="resident-pill"
            @click="openDetailById(row.id)"
          >
            <span class="resident-name">{{ row.name }}</span>
            <span class="resident-meta">{{ row.rarity }} · Lv.{{ row.level }} · 装备{{ row.equippedCount }}/3</span>
            <span class="resident-effect">{{ row.effectText || '基础产出' }}</span>
          </button>
        </div>
      </aside>
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
          <li><span>舒适度</span><b>{{ settleResult.comfort }}</b></li>
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
.hs-eyebrow { display: block; margin-bottom: .2rem; font-size: .72rem; font-weight: 800; color: rgb(var(--c-accent)); }
.hs-empty { text-align: center; padding: 3rem 1rem; color: rgb(var(--c-ink-2)); }
.hs-empty-scene { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 9999; }
.hs-empty-card {
  display: flex; flex-direction: column; align-items: center; gap: .75rem;
  max-width: min(360px, 86%); padding: 1rem 1.25rem; border-radius: 8px;
  background: rgb(12 24 30 / .72); color: #fff; text-align: center; font-size: .9rem;
  border: 1px solid rgb(255 255 255 / .18); box-shadow: 0 16px 36px rgb(0 0 0 / .24);
}

.homestead-shell {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 1rem; align-items: stretch;
}
.scene-panel { min-width: 0; }
.ops-panel { display: flex; flex-direction: column; gap: .75rem; min-width: 0; }
.facility-grid { display: grid; grid-template-columns: 1fr; gap: .75rem; }
.ops-card {
  min-height: 92px; padding: .9rem; border: 1px solid rgb(var(--c-line));
  border-radius: 8px; background: rgb(var(--c-surface) / .94);
  display: flex; flex-direction: column; justify-content: space-between;
  box-shadow: 0 12px 30px rgb(37 47 58 / .08);
}
.ops-card-main {
  min-height: 132px; overflow: hidden; position: relative;
  background:
    linear-gradient(135deg, rgb(var(--c-accent-soft) / .84), rgb(var(--c-surface) / .96) 62%),
    linear-gradient(90deg, rgb(var(--c-highlight) / .18), transparent);
}
.ops-card-main::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 5px;
  background: linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-highlight)), rgb(var(--c-info)));
}
.ops-kicker { font-size: .75rem; font-weight: 700; color: rgb(var(--c-ink-2)); }
.ops-card strong { display: block; font-size: 1.35rem; line-height: 1.15; color: rgb(var(--c-ink)); }
.ops-card small { display: block; min-height: 1rem; font-size: .72rem; line-height: 1.35; color: rgb(var(--c-ink-3)); }
.comfort-row { display: flex; align-items: flex-end; justify-content: space-between; gap: .75rem; }
.comfort-row strong { font-size: 2.35rem; }
.resident-count {
  flex: 0 0 auto; padding: .22rem .5rem; border-radius: 6px;
  background: rgb(var(--c-elevated) / .8); border: 1px solid rgb(var(--c-line));
  color: rgb(var(--c-ink-2)); font-size: .72rem; font-weight: 700;
}
.resident-strip {
  display: flex; flex-direction: column; gap: .55rem; min-width: 0;
  padding-top: .15rem;
}
.resident-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; }
.resident-heading span { font-size: .86rem; font-weight: 800; color: rgb(var(--c-ink)); }
.resident-heading small { font-size: .7rem; color: rgb(var(--c-ink-3)); }
.resident-pill {
  min-height: 76px; padding: .7rem .75rem; border: 1px solid rgb(var(--c-line));
  border-radius: 8px; background: rgb(var(--c-surface-2) / .82);
  text-align: left; transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
.resident-pill:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); box-shadow: 0 10px 24px rgb(37 47 58 / .08); }
.resident-name { display: block; font-size: .86rem; font-weight: 800; color: rgb(var(--c-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.resident-meta { display: block; margin-top: .18rem; font-size: .72rem; color: rgb(var(--c-ink-2)); }
.resident-effect { display: block; margin-top: .22rem; font-size: .68rem; color: rgb(var(--c-accent)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.resident-empty { padding: 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: 8px; color: rgb(var(--c-ink-2)); text-align: center; }

.scene {
  position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden;
  border-radius: var(--sk-radius-panel); border: 1px solid rgb(var(--c-line));
  background: #dff6ff; box-shadow: 0 18px 42px rgb(37 47 58 / .13);
}
.scene::before {
  content: ''; position: absolute; inset: 0; z-index: 8; pointer-events: none;
  background:
    linear-gradient(180deg, rgb(255 255 255 / .08), transparent 35%),
    linear-gradient(0deg, rgb(34 68 98 / .16), transparent 30%);
}
.scene-bg {
  position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%;
  object-fit: cover; user-select: none; pointer-events: none;
}

/* 漫步者：脚点锚定在 (x,y) */
.pet {
  position: absolute; transform: translate(-50%, -100%);
  cursor: pointer; will-change: left, top; transition: transform .09s ease;
}
.pet:active { transform: translate(-50%, -100%) scale(.94); }
.pet-inner { position: relative; transform-origin: bottom center; }
.bob {
  position: relative; display: flex; align-items: flex-end; justify-content: center;
  min-width: 58px; height: 88px; animation: petbob .28s steps(1) infinite alternate;
}
.bob::after {
  content: ''; position: absolute; left: 50%; bottom: -3px; width: 52px; height: 8px;
  transform: translateX(-50%); border-radius: 50%; background: rgb(65 128 91 / .28);
}
/* sprite / chibi / 原立绘均为平滑图（非像素美术），不用 image-rendering: pixelated */
.bob img {
  position: relative; z-index: 1; height: 88px; width: auto; max-width: 78px;
  display: block; object-fit: contain; filter: drop-shadow(0 7px 7px rgb(44 64 54 / .22));
}
.bob img[data-full-fallback="1"] {
  padding: 2px; border: 1px solid rgb(255 255 255 / .72); border-radius: 8px;
  background: rgb(255 255 255 / .74); box-shadow: inset 0 1px 0 rgb(255 255 255 / .5);
}
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

@media (max-width: 1120px) {
  .homestead-shell { grid-template-columns: 1fr; }
  .ops-panel { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); align-items: stretch; }
  .facility-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .resident-strip {
    grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  }
  .resident-heading { grid-column: 1 / -1; }
}
@media (max-width: 760px) {
  .ops-panel { grid-template-columns: 1fr; }
  .facility-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .resident-strip { display: flex; flex-direction: column; }
}
@media (max-width: 560px) {
  .hs-header { align-items: flex-start; flex-direction: column; }
  .homestead-shell { gap: .75rem; }
  .facility-grid { grid-template-columns: 1fr; }
  .comfort-row { align-items: flex-start; flex-direction: column; }
}
</style>
