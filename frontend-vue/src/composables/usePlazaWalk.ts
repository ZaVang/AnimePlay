/**
 * 家园广场「漫步 + 偶遇」场景层（S16-T4/T5，从 HomesteadView 抽出的 composable）。
 *
 * 职责（view 层的事，engine 保持纯净）：
 *  - 入住角色化作广场漫步者（pets），rAF 单循环驱动四向巡游 + sprite 帧推进。
 *  - **多气泡并发模型（S16-T5）**：气泡按 petId 索引（Map），支持两角色同时/错峰各自冒泡、互不顶掉。
 *    第 1 轮 tap 的单角色气泡是其子集（kind='tap'），完全兼容。
 *  - **同作品偶遇对话（S16-T4）**：tick 里做 pet-to-pet 邻近检测，命中 computeBondPairs 的同作品对
 *    且不在冷却时触发一次偶遇：两人驻足面向 → A 冒 opener → ~1.2s B 冒 reply → 中间上浮 ♡ 符号 → 散开。
 *    **偶遇纯展示、零好感、零数值效果、零升档**（冷却是纯内存 Map<pairKey, ts>，不去重、不持久化）。
 *
 * 定时器纪律（pitfalls 明令）：所有偶遇 setTimeout 登记进 timers 数组，onUnmounted 一并 clear。
 * 允许 Math.random（非 engine 层）。RNG/随机只在此 view 层，engine 侧配对判据是纯函数。
 */
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { spriteSheetSrc, chibiImageSrc, fullImageSrc } from '@/utils/cardImage';
import { computeBondPairs } from '@/engine';
import { pickEncounterDialogue } from '@/config/homesteadDialogues';
import type { CharacterCard } from '@/types/card';

// --- sprite 表规格（与 codex 产出一致：3 列行走帧 × 4 行朝向，格 48×64）---
export type Dir = 'down' | 'up' | 'left' | 'right';
/** 朝向 → sheet 行号。下=正面/上=背面/左/右。 */
const ROW: Record<Dir, number> = { down: 0, up: 1, left: 2, right: 3 };
/** 3 帧行走循环（中间帧复用一次，RPG-Maker 惯例）；静止时显第 1 帧（站姿）。 */
const WALK_SEQ = [0, 1, 2, 1];
const FRAME_MS = 150; // 每帧时长
const DISP_W = 66; // 展示格宽（48 × 1.375）
const DISP_H = 88; // 展示格高（64 × 1.375）

// 广场活动范围（%）：留出顶部名牌、底部影子余量
const MIN_X = 7,
  MAX_X = 93,
  MIN_Y = 22,
  MAX_Y = 86;

type WalkZone =
  | { kind: 'rect'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

// 第一版可行走区域：中央广场 + 主路 + 各建筑入口平台（百分比坐标，scene 16:9 对齐稳定）。
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

export interface Pet {
  id: number;
  name: string;
  x: number; // 横向中心（%）
  y: number; // 纵向脚点（%，0 顶 → 100 底）
  dir: Dir; // 当前朝向 / 移动方向
  moving: boolean; // 行走 or 站立
  speed: number; // %/秒
  targetX: number; // 当前巡游目标点（%）
  targetY: number;
  frame: number; // 行走序列下标 0..WALK_SEQ.length-1
  frameT: number; // 帧计时累加（ms）
  stateT: number; // 当前 行走/站立 状态剩余秒数
  hasSprite: boolean; // 四向行走表是否可用（探测命中）
  hidden: boolean; // sprite + chibi + 原立绘都缺 → 隐藏（终极兜底）
  /** 偶遇锁：>0 时被偶遇冻结（驻足面向对方），不参与自主巡游 / 不再被选为新偶遇。 */
  busyT: number;
}

/** 广场气泡（tap 单角色 or 偶遇双角色）。kind 供模板区分视觉。 */
export interface PetBubble {
  petId: number;
  text: string;
  /** tap 首次互动给的好感（>0 才显 +N）；偶遇一律 0（纯展示）。 */
  gain: number;
  kind: 'tap' | 'encounter';
}

/** 偶遇中间上浮的小符号（♡/✧）。 */
export interface EncounterSpark {
  key: number;
  x: number; // 两人中点（%）
  y: number;
  symbol: string;
}

/** 偶遇参数（手感自决，集中可调）。 */
const ENCOUNTER_NEAR_DIST = 9; // 触发邻近阈值（% 距离）
const ENCOUNTER_BUSY_SEC = 3.2; // 一次偶遇两人驻足时长（秒）
const ENCOUNTER_REPLY_MS = 1200; // B 错峰回应延迟
const ENCOUNTER_SPARK_MS = 2200; // ♡ 符号上浮存活
const ENCOUNTER_OPENER_MS = 2600; // opener 气泡存活
const ENCOUNTER_REPLY_BUBBLE_MS = 2400; // reply 气泡存活
const ENCOUNTER_COOLDOWN_MS = 55_000; // 同一对偶遇后冷却（约 45–90s 手感的下限，配合概率门）
const ENCOUNTER_SCAN_MS = 900; // 邻近扫描节流（避免每帧全对扫描）
const ENCOUNTER_TRIGGER_CHANCE = 0.55; // 命中邻近时的触发概率（够但不刷屏）
const ENCOUNTER_SPARKS = ['♡', '✧', '♪'] as const;

export interface PlazaWalkDeps {
  /** 是否已登录（未登录清空 pets）。 */
  isLoggedIn: Ref<boolean>;
  /** 入住角色 id 列表（响应式，管理弹窗增删即重建）。 */
  placedCharacterIds: Ref<number[]> | (() => number[]);
  /** 取角色卡（缺则该 pet 跳过）。 */
  getCard: (id: number) => CharacterCard | undefined;
  /** tap：今日是否还能给好感互动（纯读，不落地）。 */
  canTapInteract: (id: number) => boolean;
  /** tap：执行今日好感互动（落地 + 存档），返回是否发放。 */
  doTapInteract: (id: number) => boolean;
  /** tap 首次互动发放的好感数（用于气泡 +N 展示）。 */
  tapAffectionAmount: number;
}

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
/** 稳定 pairKey（小 id 在前），偶遇冷却用。 */
function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function usePlazaWalk(deps: PlazaWalkDeps) {
  const readPlaced = (): number[] =>
    typeof deps.placedCharacterIds === 'function'
      ? deps.placedCharacterIds()
      : deps.placedCharacterIds.value;

  const pets = ref<Pet[]>([]);
  /** 多气泡：按 petId 索引，支持两角色同时/错峰冒泡（S16-T5）。 */
  const bubbles = ref<Map<number, PetBubble>>(new Map());
  /** 偶遇上浮符号（同时可有多个，短命）。 */
  const sparks = ref<EncounterSpark[]>([]);
  let sparkSeq = 0;

  // 偶遇冷却纯内存态（pairKey → 下次可触发的时间戳）——不去重、不持久化、零存档。
  const encounterCooldownUntil = new Map<string, number>();
  let lastEncounterScanAt = 0;
  // tap 台词轮换计数（保持第 1 轮的确定轮换手感）。
  let tapDialogueTick = 0;
  // 偶遇台词轮换计数。
  let encounterDialogueTick = 0;

  const timers: ReturnType<typeof setTimeout>[] = [];
  function schedule(fn: () => void, ms: number) {
    const t = setTimeout(() => {
      const i = timers.indexOf(t);
      if (i >= 0) timers.splice(i, 1);
      fn();
    }, ms);
    timers.push(t);
  }

  const visibleCount = computed(() => pets.value.filter(p => !p.hidden).length);

  /** 取某 pet 当前气泡（模板用）。 */
  function bubbleFor(petId: number): PetBubble | undefined {
    return bubbles.value.get(petId);
  }
  function setBubble(petId: number, b: PetBubble, ttlMs: number) {
    const next = new Map(bubbles.value);
    next.set(petId, b);
    bubbles.value = next;
    schedule(() => {
      // 只有当前气泡仍是这一条时才清（避免清掉后来居上的新气泡）。
      const cur = bubbles.value.get(petId);
      if (cur && cur === b) {
        const m = new Map(bubbles.value);
        m.delete(petId);
        bubbles.value = m;
      }
    }, ttlMs);
  }

  /** 入住角色化作广场漫步者（随机初始位置/朝向/速度）。 */
  function buildPets() {
    if (!deps.isLoggedIn.value) {
      pets.value = [];
      bubbles.value = new Map();
      return;
    }
    pets.value = readPlaced()
      .map((id): Pet | null => {
        const card = deps.getCard(id);
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
          busyT: 0,
        };
      })
      .filter((p): p is Pet => p !== null);
    // 重建后清空过期气泡（避免指向已移除角色）。
    bubbles.value = new Map();
    probeSprites();
  }

  /** 探测每个角色的四向行走表是否存在（命中即切 sprite 模式，否则保持静态兜底）。 */
  function probeSprites() {
    for (const pet of pets.value) {
      const img = new Image();
      img.onload = () => {
        pet.hasSprite = true;
      };
      img.onerror = () => {
        pet.hasSprite = false;
      };
      img.src = spriteSheetSrc(pet.id);
    }
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
  function spriteStyle(pet: Pet) {
    const col = pet.moving ? WALK_SEQ[pet.frame] : 1;
    const row = ROW[pet.dir];
    return {
      backgroundImage: `url(${spriteSheetSrc(pet.id)})`,
      backgroundPosition: `-${col * DISP_W}px -${row * DISP_H}px`,
    };
  }
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

  /**
   * 偶遇邻近扫描（节流）：从 computeBondPairs 的同作品对里，挑一对当前靠得够近、都不忙、不在冷却的，
   * 触发一次偶遇对话。派生自入住角色 anime_names（与羁绊同源），纯展示、零好感。
   */
  function scanEncounters(nowMs: number) {
    if (nowMs - lastEncounterScanAt < ENCOUNTER_SCAN_MS) return;
    lastEncounterScanAt = nowMs;

    const list = pets.value;
    if (list.length < 2) return;
    // 已有任一角色处于偶遇中 → 本轮不再叠新偶遇（一次一对，避免刷屏）。
    if (list.some(p => p.busyT > 0)) return;

    const animeNames = list.map(p => deps.getCard(p.id)?.anime_names);
    const pairs = computeBondPairs(animeNames);
    if (pairs.length === 0) return;

    for (const pair of pairs) {
      const A = list[pair.a];
      const B = list[pair.b];
      if (!A || !B || A.hidden || B.hidden) continue;
      const key = pairKey(A.id, B.id);
      if ((encounterCooldownUntil.get(key) ?? 0) > nowMs) continue;
      const dist = Math.hypot(A.x - B.x, A.y - B.y);
      if (dist > ENCOUNTER_NEAR_DIST) continue;
      if (Math.random() > ENCOUNTER_TRIGGER_CHANCE) continue;
      triggerEncounter(A, B, pair.anime, nowMs);
      return; // 一次扫描至多起一场偶遇
    }
  }

  /** 触发一场偶遇：两人驻足面向 → A opener → 错峰 B reply → 中点 ♡ 上浮 → 冷却。 */
  function triggerEncounter(A: Pet, B: Pet, anime: string, nowMs: number) {
    encounterCooldownUntil.set(pairKey(A.id, B.id), nowMs + ENCOUNTER_COOLDOWN_MS);

    // 两人驻足、面向对方（纯展示、不移动位置）。
    A.moving = false;
    B.moving = false;
    A.busyT = ENCOUNTER_BUSY_SEC;
    B.busyT = ENCOUNTER_BUSY_SEC;
    A.stateT = Math.max(A.stateT, ENCOUNTER_BUSY_SEC);
    B.stateT = Math.max(B.stateT, ENCOUNTER_BUSY_SEC);
    A.dir = dirToward(A.x, A.y, B.x, B.y);
    B.dir = dirToward(B.x, B.y, A.x, A.y);

    const dlg = pickEncounterDialogue(anime, encounterDialogueTick++);
    // A 立即冒 opener（kind='encounter' 供模板区分双角色偶遇 vs 单角色 tap）。
    setBubble(A.id, { petId: A.id, text: dlg.opener, gain: 0, kind: 'encounter' }, ENCOUNTER_OPENER_MS);
    // B 错峰回应。
    schedule(() => {
      // 回应时两人可能已散开（角色被移出/重建），存在才冒。
      if (pets.value.some(p => p.id === B.id)) {
        setBubble(B.id, { petId: B.id, text: dlg.reply, gain: 0, kind: 'encounter' }, ENCOUNTER_REPLY_BUBBLE_MS);
      }
    }, ENCOUNTER_REPLY_MS);

    // 中点冒一个上浮小符号（♡/✧/♪）。
    const sym = ENCOUNTER_SPARKS[Math.floor(Math.random() * ENCOUNTER_SPARKS.length)];
    const spark: EncounterSpark = {
      key: sparkSeq++,
      x: (A.x + B.x) / 2,
      y: Math.min(A.y, B.y) - 6,
      symbol: sym,
    };
    sparks.value = [...sparks.value, spark];
    schedule(() => {
      sparks.value = sparks.value.filter(s => s.key !== spark.key);
    }, ENCOUNTER_SPARK_MS);
  }

  function tick(t: number) {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    const nowMs = Date.now();
    for (const p of pets.value) {
      if (p.hidden) continue;

      // 偶遇冻结：驻足倒计时，期间不巡游、不推进目标。
      if (p.busyT > 0) {
        p.busyT -= dt;
        p.moving = false;
        continue;
      }

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

    // 移动结算后做一次（节流的）偶遇邻近扫描。
    scanEncounters(nowMs);

    raf = requestAnimationFrame(tick);
  }

  /**
   * 广场角色 tap（S16-T2 行为保持）：今日首次 → 走既有每日好感互动（与养成页共用每日封顶）；
   * 今日已互动 → 只闲聊不给好感。无论哪种都弹一句情境台词气泡（kind='tap' 单角色）。
   * 奖励只由 doTapInteract 的既有数值逻辑决定；台词纯展示、不驱动任何奖励。
   */
  function onPetTap(pet: Pet, pickTapDialogue: (gaveAffection: boolean, index: number) => string) {
    // 偶遇冻结中被点：解冻并正常响应 tap（玩家意图优先）。
    pet.busyT = 0;
    pet.moving = false;
    pet.stateT = Math.max(pet.stateT, 1.4); // 被点到驻足回应
    const canInteract = deps.canTapInteract(pet.id);
    let gain = 0;
    if (canInteract && deps.doTapInteract(pet.id)) {
      gain = deps.tapAffectionAmount;
    }
    const line = pickTapDialogue(gain > 0, tapDialogueTick++);
    setBubble(pet.id, { petId: pet.id, text: line, gain, kind: 'tap' }, 2600);
  }

  // 入住名单变化（管理弹窗里增删）时重建漫步者
  watch(
    () => readPlaced().slice(),
    () => buildPets(),
    { deep: true },
  );
  watch(deps.isLoggedIn, () => buildPets());

  onMounted(() => {
    buildPets();
    raf = requestAnimationFrame(tick);
  });
  onUnmounted(() => {
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout);
    timers.length = 0;
  });

  return {
    pets,
    sparks,
    visibleCount,
    bubbleFor,
    onPetTap,
    onPetImgError,
    spriteStyle,
    petStyle,
    depthScale,
    // 供模板兜底图使用
    chibiImageSrc,
    buildPets,
  };
}
