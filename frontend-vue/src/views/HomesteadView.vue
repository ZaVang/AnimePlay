<script setup lang="ts">
/**
 * 家园（evolution-12 / S13）：俯视平面广场（动森风）。入住角色在广场里四向自由漫步，
 * 并随时间挂机成长。
 * - 入住者 = homestead.placedCharacterIds（「管理入住」里选，≤HOMESTEAD_SLOTS）。
 * - 进家园（onMounted）结算一次离线收益（settleHomestead，按 lastSettleAt 虚拟累积）。
 * - **漫步 / 偶遇场景层已抽为 composable `usePlazaWalk`（S16-T4/T5）**：pets 状态 + rAF 巡游 +
 *   多气泡并发模型 + pet-to-pet 同作品偶遇对话都在那里；本视图只保留运营面板 + tap 台词编排。
 * - 立绘三级兜底：四向行走表 sprite → 缺回退 chibi → 再缺回退原立绘 → 都缺隐藏（见 composable）。
 * 本视图允许 Math.random（非 engine 层）。
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useHomesteadStore } from '@/stores/homestead';
import { useCollectionStore } from '@/stores/collection';
import { useEquipmentStore } from '@/stores/equipment';
import {
  computeIdleYield,
  comfortBonusPct,
  offlineCapHours,
  FURNITURE_CATALOG,
  getFurnitureSlot,
  IDLE_SETTLE_MODAL_MIN_HOURS,
  type FacilityKey,
  type IdleYield,
} from '@/config/homestead';
import { useFacilityStore } from '@/stores/facility';
import { useFurnitureStore } from '@/stores/furniture';
import { useCodexStore } from '@/stores/codex';
import { useDailyStore } from '@/stores/daily';
import { COMMISSIONS, COMMISSION_BONUS_REWARDS } from '@/config/dailyTasks';
import { formatHomeEffect, sumHomeEffects, SLOT_ORDER } from '@/config/equipment';
import {
  BOND_MILESTONES,
  bondTitleFor,
  isMilestoneClaimable,
  DAILY_BOND_INTERACTION_AFFECTION,
  milestoneCelebrationTier,
  type MilestoneCelebrationTier,
} from '@/config/nurture';
import { pickTapDialogue, pickMilestoneDialogue, pickTodaySpecialDialogue } from '@/config/homesteadDialogues';
import {
  todayKey as makeTodayKey,
  pickTodaySpecialId,
  pickShowcaseRarity,
  currentSeason,
} from '@/config/homesteadDaily';
import type { Rarity } from '@/types/card';
import { usePlazaWalk, type Pet } from '@/composables/usePlazaWalk';
import type { CharacterCard } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import HomesteadManageModal from '@/components/homestead/HomesteadManageModal.vue';
import HomesteadShareCard from '@/components/homestead/HomesteadShareCard.vue';
import CharacterAvatar from '@/components/CharacterAvatar.vue';

const homesteadMapSrc = new URL('../assets/homestead/sky-island-map-v1.png', import.meta.url).href;

const userStore = useUserStore();
const gameData = useGameDataStore();
const homestead = useHomesteadStore();
const collection = useCollectionStore();
const equipmentStore = useEquipmentStore();
const facilityStore = useFacilityStore();
const furnitureStore = useFurnitureStore();
const codex = useCodexStore();
const daily = useDailyStore();

// ── S16-T4/T5 广场漫步 + 偶遇场景层（composable）──
// pets / 气泡 / 偶遇符号 / rAF 循环 / 定时器全在 composable 里自管生命周期。
const isLoggedInRef = computed(() => userStore.isLoggedIn);
const placedIdsRef = computed(() => homestead.placedCharacterIds);
const plaza = usePlazaWalk({
  isLoggedIn: isLoggedInRef,
  placedCharacterIds: () => placedIdsRef.value,
  getCard: (id: number) => gameData.getCharacterCardById(id) ?? undefined,
  canTapInteract: (id: number) => userStore.canDailyBondInteract(id),
  doTapInteract: (id: number) => userStore.dailyBondInteraction(id),
  tapAffectionAmount: DAILY_BOND_INTERACTION_AFFECTION,
});
const { pets, sparks, visibleCount, bubbleFor, onPetImgError, spriteStyle, petStyle, depthScale, chibiImageSrc } =
  plaza;

// ★ S16-T10 今日特殊台词轮换计数（view 层纯展示分支，不碰 composable 的发放逻辑）。
let todaySpecialTick = 0;

/**
 * 广场角色 tap：委托 composable，台词编排留在 view 层（纯展示）。
 * ★ S16-T10：今日特殊角色被 tap 时改喂 pickTodaySpecialDialogue（今日专属台词），
 * 与普通 tap 台词可分辨；**tap 的好感发放仍走原样 dailyBondInteraction**（标准 20，未做双倍）——
 * 这里只替换台词文本，是纯展示分支，不改任何数值口径。
 */
function onPetTap(pet: Pet) {
  if (pet.id === todaySpecialId.value) {
    const idx = todaySpecialTick++;
    // 无论今日是否已互动，今日特殊角色都说今日专属台词（区别于普通问候/闲聊）。
    plaza.onPetTap(pet, () => pickTodaySpecialDialogue(idx));
  } else {
    // 逐角色专属问候：把 pet.id 透传给 pickTapDialogue（命中专属池说专属句，缺则回落通用）。
    plaza.onPetTap(pet, (gaveAffection, index) => pickTapDialogue(gaveAffection, index, pet.id));
  }
}

const placedCards = computed(() =>
  homestead.placedCharacterIds
    .map(id => gameData.getCharacterCardById(id))
    .filter((card): card is CharacterCard => card != null),
);

// ── ★ S16-T10 回访新鲜：date-seeded 今日特殊角色（纯派生、零存档）──
// 今日键 view 内联同款 YYYY-M-D（与 daily.ts/nurture.ts 跨天判定一致，零改 daily.ts，Scout C-6）。
// nowTick 每 60s 刷（onMounted 已建），跨天时 todayKey 随之更新 → 今日特殊自动换人。
const todayKey = computed(() => makeTodayKey(new Date(nowTick.value)));
/**
 * 今日特殊角色 id：由 todayKey + 入住名单 date-seeded 派生。
 * 同一天恒定、次日换人、0 入住 → null（空态优雅）。**零字段进存档。**
 */
const todaySpecialId = computed<number | null>(() =>
  pickTodaySpecialId(homestead.placedCharacterIds, todayKey.value),
);
/** 今日特殊角色卡（供右栏运营面板显式点名「今天谁心情好」）。 */
const todaySpecialCard = computed(() =>
  todaySpecialId.value != null ? gameData.getCharacterCardById(todaySpecialId.value) ?? null : null,
);

// ── ★ S16-T11 季节浮层：由真实日期派生（纯 CSS/emoji，零存档零素材）──
const season = computed(() => currentSeason(new Date(nowTick.value)));
/** 季节浮层的飘落粒子（emoji + 随位/时长错峰，纯展示）。 */
interface SeasonParticle { symbol: string; left: number; delay: number; duration: number; drift: number; }
const seasonParticles = computed<SeasonParticle[]>(() => {
  const syms = season.value.particles;
  const out: SeasonParticle[] = [];
  const COUNT = 9; // 稀疏（不糊角色脸）
  for (let i = 0; i < COUNT; i++) {
    out.push({
      symbol: syms[i % syms.length],
      left: Math.round(((i * 37 + 11) % 100)),      // 确定性铺开（非 rAF、非随机抖动）
      delay: Number((((i * 1.7) % 8)).toFixed(2)),   // 错峰起飞
      duration: 7 + (i % 4) * 1.5,                    // 7~11.5s 慢飘
      drift: (i % 2 === 0 ? 1 : -1) * (6 + (i % 3) * 4),
    });
  }
  return out;
});

const homeEffect = computed(() => {
  void equipmentStore.equipped;
  void equipmentStore.inventory;
  void furnitureStore.placedIds;
  const eff = sumHomeEffects(homestead.placedCharacterIds.map(id => equipmentStore.resolveHomeEffect(id)));
  // ★ S15-T2 家具 comfort 并入 effect.comfort（与 settleHomestead 同源，口径命脉：预览=结算）。
  // hourlyYield/projectedYield/nextHourlyYield 三处经 computeIdleYield 天然吃到家具 comfort。
  eff.comfort += furnitureStore.getComfort();
  return eff;
});

// 设施等级同源：UI 预览与 settleHomestead 结算都喂 facilityStore.getLevels()（口径同源命脉）。
const facilityLevels = computed(() => {
  void facilityStore.levels;
  return facilityStore.getLevels();
});

// ★ S15-T3 羁绊派生源：逐入住角色 anime_names（与结算同源，预览=实战）。
const placedAnimeNames = computed(() => placedCards.value.map(c => c.anime_names));

const hourlyYield = computed(() =>
  computeIdleYield(placedCards.value.map(c => c.rarity), 3600_000, homeEffect.value, facilityLevels.value, placedAnimeNames.value),
);

// ── SF-T3 驻留低频定时结算：60s 刷「自上次结算起预计累积」预览 + 封顶进度条（只刷预览、绝不 settle）──
const nowTick = ref(Date.now());
let idleTimer = 0;

/** 自上次结算起已流逝毫秒（首次 lastSettleAt=0 未建基线 → 显 0，别拿 now-0 算天量）。 */
const elapsedMs = computed(() => {
  if (homestead.lastSettleAt <= 0) return 0;
  return Math.max(0, nowTick.value - homestead.lastSettleAt);
});

/**
 * 预计累积预览：复用 computeIdleYield（喂同一 facilityLevels，与 settleHomestead 同源，防「预览≠实战」）。
 * 只读展示，不落地、不调 settleHomestead。
 */
const projectedYield = computed<IdleYield>(() =>
  computeIdleYield(placedCards.value.map(c => c.rarity), elapsedMs.value, homeEffect.value, facilityLevels.value, placedAnimeNames.value),
);

/**
 * 当前入住组合命中的羁绊（与结算同源：hourlyYield 已喂同一 placedAnimeNames）。
 * 命中给作品名 + 同住人数 + 加成 pct 供 UI 显形；空 = 不显。
 */
const bondHits = computed(() => hourlyYield.value.bondHits);
const bondBonusPct = computed(() => hourlyYield.value.bondBonusPct);

/** 有效离线封顶小时数（随设施总级数抬升，与结算同口径）。 */
const capHours = computed(() => offlineCapHours(facilityLevels.value));

/** 封顶进度 [0,1]：min(1, 已累积有效小时 / 封顶小时)。首次未建基线 → 0。 */
const capProgress = computed(() => {
  if (capHours.value <= 0) return 0;
  const rawHours = elapsedMs.value / 3600_000;
  return Math.min(1, rawHours / capHours.value);
});

/** 是否已达封顶（满封顶显式提示「回来收取」）。 */
const capReached = computed(() => homestead.lastSettleAt > 0 && capProgress.value >= 1);

/** 升级后（该设施 +1 级）的每小时产出预览：与结算同函数、同口径。 */
function nextHourlyYield(key: FacilityKey) {
  const lv = { ...facilityLevels.value, [key]: facilityLevels.value[key] + 1 };
  return computeIdleYield(placedCards.value.map(c => c.rarity), 3600_000, homeEffect.value, lv, placedAnimeNames.value);
}

const FACILITY_META: Record<FacilityKey, { label: string; unit: string; field: 'expEach' | 'affectionEach' | 'knowledge' }> = {
  exp: { label: '训练区', unit: '经验', field: 'expEach' },
  bond: { label: '休息区', unit: '好感', field: 'affectionEach' },
  knowledge: { label: '资料室', unit: '知识点', field: 'knowledge' },
};
const FACILITY_ORDER: FacilityKey[] = ['exp', 'bond', 'knowledge'];

const facilityRows = computed(() =>
  FACILITY_ORDER.map(key => {
    const meta = FACILITY_META[key];
    const level = facilityLevels.value[key];
    const maxed = facilityStore.isMaxLevel(key);
    const cost = facilityStore.upgradeCost(key);
    const current = hourlyYield.value[meta.field];
    const next = maxed ? current : nextHourlyYield(key)[meta.field];
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      level,
      value: `+${current}/h`,
      bonus: facilityStore.bonusPct(key),
      maxed,
      cost,
      nextDelta: next - current,
      affordable: !maxed && Number.isFinite(cost) && knowledgePoints.value >= cost,
    };
  }),
);

const knowledgePoints = computed(() => userStore.playerState.knowledgePoints);

function onUpgradeFacility(key: FacilityKey) {
  const ok = userStore.upgradeFacility(key);
  if (!ok) userStore.addLog('升级失败：知识点不足或已满级。', 'warning');
}

// ── S15-T2 家具兑换 + 摆放/收纳（KP → 家具 → comfort，经既有软加成轴汇入） ──
/** 当前已摆放家具 comfort 合计（响应式：placedIds 变即重算）。 */
const placedFurnitureComfort = computed(() => {
  void furnitureStore.placedIds;
  return furnitureStore.getComfort();
});

/**
 * ★ S16-T7 已摆放家具进广场场景可见：从 placedIds 派生「已摆放且有固定槽位的家具」，
 * 供场景 v-for 渲染 emoji + 名牌卡。摆放/收纳靠 placedIds 响应式 computed 天然即时反映
 * （**纯静态派生层，绝不进 rAF/tick**，Scout C-4）。缺槽位/图标的 id 直接跳过（防漏配静默错位）。
 */
interface PlacedFurniture {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
}
const placedFurniture = computed<PlacedFurniture[]>(() => {
  void furnitureStore.placedIds;
  const out: PlacedFurniture[] = [];
  for (const def of FURNITURE_CATALOG) {
    if (!furnitureStore.isPlaced(def.id)) continue;
    const slot = getFurnitureSlot(def.id);
    if (!slot) continue;
    out.push({ id: def.id, name: def.name, icon: def.icon, x: slot.x, y: slot.y });
  }
  return out;
});

/**
 * 家具槽位样式：与角色 petStyle 完全同一坐标系 + 同一 y-sort 公式（zIndex=round(y*10)），
 * 接进同一深度排序 → 家具与漫步角色按脚点 y 正确互相遮挡（Scout C-2，别做固定背景层）。
 */
function furnitureStyle(item: PlacedFurniture) {
  return { left: item.x + '%', top: item.y + '%', zIndex: Math.round(item.y * 10) };
}

/** ★ S16-T8 陈列计数（纯派生、零持久化、零奖励、不复用 claimedMilestones）：仅显数字。 */
const displayCount = computed(() => {
  void furnitureStore.placedIds;
  return placedFurniture.value.length;
});
const displayTotal = FURNITURE_CATALOG.length;

// ── ★ S16-T9 收藏陈列：家园作抽卡战果橱窗（纯派生自 collection + codex，零升档）──
// 只读 codex.characterCompletion（纯派生 owned/total/byRarity，读它零副作用）+ collection owned Map。
// 🔴 绝不触碰 codex.claim / codex.claimedMilestones（那是图鉴里程碑领取制，与陈列展示墙是两回事）。
const characterCompletion = computed(() => codex.characterCompletion);
/** 整体图鉴完成度百分比（正着念「已拥有」，分母用 .length 非硬编码）。 */
const codexPercent = computed(() => {
  const c = characterCompletion.value;
  return c.total > 0 ? Math.round((c.owned / c.total) * 100) : 0;
});
/**
 * 陈列展示的稀有度：优先 UR；0 UR 降级到玩家确实拥有的最高稀有度（读同一 byRarity 次高档）。
 * 一张都没拥有 → null（走引导态，绝不空墙 / 绝不「UR 0/318」缺口条，Scout C-4 命门）。
 */
const showcaseRarity = computed<Rarity | null>(() => {
  const byR = characterCompletion.value.byRarity;
  const owned: Partial<Record<Rarity, number>> = {};
  for (const r of Object.keys(byR) as Rarity[]) owned[r] = byR[r].owned;
  return pickShowcaseRarity(owned);
});
/**
 * 橱窗内容：已拥有的「陈列稀有度」角色卡（抽到新卡即时反映，响应式读 collection）。
 * 命门守「橱窗非进度条」：只列已拥有的脸、不列未拥有缺口。头像墙横滑上限保护。
 */
const SHOWCASE_MAX = 24;
const showcaseCards = computed<CharacterCard[]>(() => {
  void collection.characterCollection; // 触发响应式（抽新卡即时反映，仿 furnitureRows 范式）
  const r = showcaseRarity.value;
  if (r == null) return [];
  const out: CharacterCard[] = [];
  for (const card of gameData.allCharacterCards) {
    if (card.rarity !== r) continue;
    if (collection.getCharacterCardCount(card.id) <= 0) continue;
    out.push(card);
    if (out.length >= SHOWCASE_MAX) break;
  }
  return out;
});
/** 陈列稀有度的「已拥有 / 总数」（正着念拥有数，如「UR 12/48」；分母来自 byRarity.total，非硬编码）。 */
const showcaseRarityCount = computed(() => {
  const r = showcaseRarity.value;
  if (r == null) return null;
  const rc = characterCompletion.value.byRarity[r];
  return { rarity: r, owned: rc.owned, total: rc.total };
});
/** comfort → 全产出软加成 pct（家具+装备合计 comfort 经同一 comfortBonusPct）。 */
function comfortPctText(comfort: number): string {
  const pct = comfortBonusPct(comfort);
  return pct > 0 ? `+${Math.round(pct * 100)}%` : '+0%';
}

const furnitureRows = computed(() => {
  void furnitureStore.ownedIds;
  void furnitureStore.placedIds;
  // 摆放一件后的全产出 delta：以「装备+家具」总 comfort 为基线，看再加该件 comfort 后软加成 pct 的增量。
  const baseComfort = homeEffect.value.comfort;
  return FURNITURE_CATALOG.map(def => {
    const owned = furnitureStore.owns(def.id);
    const placed = furnitureStore.isPlaced(def.id);
    // 摆放该件后的产出 delta（未摆放才有意义）：软加成 pct 的边际增量。
    const deltaPct = placed
      ? 0
      : comfortBonusPct(baseComfort + def.comfort) - comfortBonusPct(baseComfort);
    return {
      id: def.id,
      name: def.name,
      comfort: def.comfort,
      cost: def.cost,
      owned,
      placed,
      affordable: !owned && knowledgePoints.value >= def.cost,
      deltaPct,
    };
  });
});

function onBuyFurniture(id: string) {
  const ok = userStore.buyFurniture(id);
  if (!ok) userStore.addLog('购买失败：知识点不足或已拥有。', 'warning');
}
function onToggleFurniture(id: string) {
  if (furnitureStore.isPlaced(id)) userStore.unplaceFurniture(id);
  else userStore.placeFurniture(id);
}

const residentRows = computed(() =>
  placedCards.value.map(card => {
    const slots = equipmentStore.getEquipped(card.id);
    const equippedCount = SLOT_ORDER.filter(slot => slots[slot] != null).length;
    const effect = equipmentStore.resolveHomeEffect(card.id);
    const nurture = userStore.getNurtureData(card.id);
    const affection = nurture.affection;
    const claimedIds = nurture.claimedBondMilestones;
    // ★ S16-T1 好感里程碑在家园显形：复用养成域 BOND_MILESTONES / isMilestoneClaimable（同源、零升档）。
    // 可领 = 达阈值且未领的最低一档；下一未领档 = 进度显形（距下一档还需多少好感）。
    const claimable = BOND_MILESTONES.find(m => isMilestoneClaimable(affection, claimedIds, m)) ?? null;
    const nextUnclaimed = BOND_MILESTONES.find(m => !claimedIds.includes(m.id)) ?? null;
    const toNext = nextUnclaimed ? Math.max(0, nextUnclaimed.threshold - affection) : 0;
    return {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      level: nurture.level,
      affection,
      equippedCount,
      effectText: formatHomeEffect(effect),
      bondTitle: bondTitleFor(affection),
      claimable,
      nextUnclaimed,
      toNext,
    };
  }),
);

function pctText(v: number): string {
  return v > 0 ? `+${Math.round(v * 100)}%` : '基础';
}

/** ★ S16-T1 有可领里程碑的入住角色数（入住名单摘要红点 cue，引导玩家去领）。 */
const claimableBondCount = computed(() => residentRows.value.filter(r => r.claimable).length);

// --- SF-T8 家园日常委托（清单勾选式，非横条；埋点在 userStore 门面，此处只读+领取） ---
const commissionRows = computed(() =>
  COMMISSIONS.map(def => ({
    id: def.id,
    title: def.title,
    description: def.description,
    reward: def.rewards.map(r => `+${r.amount} 知识点`).join(' '),
    complete: daily.isCommissionComplete(def.id),
    claimed: daily.isCommissionClaimed(def.id),
    claimable: daily.isCommissionComplete(def.id) && !daily.isCommissionClaimed(def.id),
  })),
);
/** 已完成条数 X / 总条数 N（home 第一屏可见的摘要 cue）。 */
const commissionDoneCount = computed(() => commissionRows.value.filter(r => r.complete).length);
const commissionTotal = computed(() => commissionRows.value.length);
const allCommissionsDone = computed(() => daily.allCommissionsDone);
const commissionBonusClaimed = computed(() => daily.isCommissionBonusClaimed());
const commissionBonusText = COMMISSION_BONUS_REWARDS.map(r => `+${r.amount} 知识点`).join(' ');

const commissionFloat = ref<string | null>(null);
const commissionTimers: ReturnType<typeof setTimeout>[] = [];
function scheduleCommissionClear(fn: () => void, ms: number) {
  const t = setTimeout(() => {
    commissionTimers.splice(commissionTimers.indexOf(t), 1);
    fn();
  }, ms);
  commissionTimers.push(t);
}

function onClaimCommission(id: string) {
  userStore.claimCommission(id);
}
function onClaimCommissionBonus() {
  userStore.claimCommissionBonus();
  if (daily.isCommissionBonusClaimed()) {
    commissionFloat.value = `今日全清 ${commissionBonusText}`;
    scheduleCommissionClear(() => { commissionFloat.value = null; }, 1800);
  }
}

// --- 点击看详情（复用卡详情弹窗；广场角色改为 tap 互动，详情从入住名单进） ---
const detailCard = ref<CharacterCard | null>(null);
const detailCount = computed(() => (detailCard.value ? collection.getCharacterCardCount(detailCard.value.id) : 0));

function openDetailById(id: number) {
  const card = gameData.getCharacterCardById(id);
  if (card) detailCard.value = card;
}

// ── S16-T1/T3 里程碑领取的角色感言飘字（tap 气泡已迁入 composable 的多气泡模型）──
// bondFloat 的 setTimeout 登记 dialogueTimers，onUnmounted 一并清除（防 false safety，pitfalls 明令）。
const bondFloat = ref<{ name: string; text: string } | null>(null);
const dialogueTimers: ReturnType<typeof setTimeout>[] = [];
let dialogueTick = 0;
function scheduleDialogueClear(fn: () => void, ms: number) {
  const t = setTimeout(() => {
    dialogueTimers.splice(dialogueTimers.indexOf(t), 1);
    fn();
  }, ms);
  dialogueTimers.push(t);
}

/**
 * ★ S16-T12 高档里程碑（bond_4/5/6）的 Crowning 隆重庆祝弹层状态（区别于低档 bondFloat 轻飘字）。
 * 纯展示：只是发放成功后的视觉分支，不携带任何数值 / 不发奖。连领多个高档时「后领覆盖前领」——
 * 一次只显一个（`v-if` 单弹层，不叠层打断，research 极端③）。可点击关闭或自动淡出。
 */
const crownCelebration = ref<{
  charId: number;
  name: string;
  title: string;
  line: string;
  tier: MilestoneCelebrationTier; // 'crowning' | 'finale'（finale = bond_6 命运，再加最隆重一档）
} | null>(null);
/** Crowning 弹层自动关闭时长（finale 停留更久，让「命运」时刻更值得截图）。 */
const CROWNING_AUTO_MS = 5200;
const FINALE_AUTO_MS = 6500;
// 自增令牌：连领多个高档时，旧的自动关闭定时器不会误关新弹层（后领覆盖前领）。
let crownToken = 0;
function closeCrownCelebration() {
  crownCelebration.value = null;
}

/**
 * ★ S16-T1 在家园领取好感里程碑（复用门面 claimBondMilestone，同源发放 KP + 已领态 + 感言）。
 * ★ S16-T12 领取成功后按档位分级庆祝（纯展示分支，发放逻辑一字不碰）：
 *  - 低档 bond_1/2/3（highfive）→ 保持现有 bondFloat 轻飘字（克制，别过度打磨低档）。
 *  - 高档 bond_4/5/6（crowning/finale）→ 升级 Crowning 隆重弹层（称号加冕 + 角色脸 + 光效 + 更长停留）。
 * 定时器一律登记 dialogueTimers + onUnmounted 清除（pitfalls 明令）；动效走 CSS @keyframes 不进 rAF。
 */
function onClaimBondMilestone(charId: number, milestoneId: string) {
  if (!userStore.claimBondMilestone(charId, milestoneId)) return;
  const card = gameData.getCharacterCardById(charId);
  const line = pickMilestoneDialogue(milestoneId, dialogueTick++);
  const tier = milestoneCelebrationTier(milestoneId);
  const milestone = BOND_MILESTONES.find(m => m.id === milestoneId);
  if (tier === 'highfive') {
    // 低档：保持轻飘字（High-Five）。
    bondFloat.value = { name: card?.name ?? '', text: line };
    scheduleDialogueClear(() => { bondFloat.value = null; }, 3200);
  } else {
    // 高档：Crowning 隆重弹层（后领覆盖前领，一次只显一个）。
    crownCelebration.value = {
      charId,
      name: card?.name ?? '',
      title: milestone?.title ?? '',
      line,
      tier,
    };
    const myToken = ++crownToken;
    // 令牌守卫：只有本次庆祝的定时器才关本次弹层，避免旧定时器误关后领的新弹层。
    scheduleDialogueClear(() => {
      if (myToken === crownToken) closeCrownCelebration();
    }, tier === 'finale' ? FINALE_AUTO_MS : CROWNING_AUTO_MS);
  }
}

// --- 入住管理 + 离线收益结算 ---
const showManage = ref(false);
const settleResult = ref<IdleYield | null>(null);
// ★ S16-T13 晒图弹窗开关（基地身份卡，纯只读快照晒图）。
const showShareCard = ref(false);

/**
 * ★ S16-T15（收取瞬间到手反馈，纯 CSS 可视化已发生的入账，product R3）：
 * 收取按钮上冒一个「+X KP」到手小飘字（只在**用户点击**收取时，非 onMounted 的初始结算）。
 * 纯展示：只可视化 settleHomestead 已发放的 knowledge，绝不改任何数值 / 不二次发奖。
 * setTimeout 登记 dialogueTimers（onUnmounted 清）。
 */
const collectFloat = ref<string | null>(null);
function runSettle(fromClick = false) {
  const y = userStore.settleHomestead();
  const has = y.expEach > 0 || y.affectionEach > 0 || y.knowledge > 0;
  if (!has) return;
  // 高价值回归才隆重弹窗；零碎收益静默入账 + 一行日志，免打断频繁进出
  if (y.hours >= IDLE_SETTLE_MODAL_MIN_HOURS) {
    settleResult.value = y;
  } else {
    userStore.addLog(`🏠 挂机已结算：经验+${y.expEach} · 好感+${y.affectionEach} · 知识点+${y.knowledge}`, 'info');
  }
  // 用户主动点「收取」且有 KP 入账 → 冒到手小飘字（初始 onMounted 结算不冒，免打断）。
  if (fromClick && y.knowledge > 0) {
    collectFloat.value = `+${y.knowledge} KP`;
    scheduleDialogueClear(() => { collectFloat.value = null; }, 1400);
  }
}

// 注：漫步者 pets 的重建（入住名单/登录态变化）+ rAF 循环 + 偶遇定时器已由 usePlazaWalk 自管。

onMounted(() => {
  runSettle();   // 进家园结算一次离线收益（按 lastSettleAt 虚拟累积）
  // SF-T3：60s 低频刷预览（只更新 nowTick 触发 projectedYield/capProgress 重算，不 settle）。
  nowTick.value = Date.now();
  idleTimer = window.setInterval(() => { nowTick.value = Date.now(); }, 60_000);
});
// SF-T3 命门：预览 setInterval 在 onUnmounted 清除，无泄漏。
// SF-T8：委托全清 bonus 飘字 setTimeout 也在此登记清除（pitfalls 明令）。
onUnmounted(() => {
  clearInterval(idleTimer);
  commissionTimers.forEach(clearTimeout);
  commissionTimers.length = 0;
  // S16-T1 里程碑感言飘字定时器一并清除。
  dialogueTimers.forEach(clearTimeout);
  dialogueTimers.length = 0;
});
</script>

<template>
  <div class="homestead">
    <header class="hs-header">
      <div class="hs-summary">
        <span class="hs-summary-chip"><span class="hs-summary-label">基地舒适度</span><strong>{{ homeEffect.comfort }}</strong></span>
        <span class="hs-summary-chip"><span class="hs-summary-label">可用知识点</span><strong>{{ knowledgePoints }} KP</strong></span>
      </div>
      <button v-if="userStore.isLoggedIn" class="btn-secondary hs-manage-btn" @click="showManage = true">管理入住</button>
    </header>

    <div v-if="!userStore.isLoggedIn" class="hs-empty">请先登录，把角色放进家园挂机成长。</div>

    <div v-else class="homestead-shell">
      <div class="scene-panel" aria-label="家园场景">
        <div class="scene" :data-season="season.season">
          <img class="scene-bg" :src="homesteadMapSrc" alt="" draggable="false" />

          <!-- ★ S16-T11 季节浮层（纯 CSS/emoji，零素材零存档）：垫在 bg 之上、角色之下（z-index:3），
               pointer-events:none 稀疏飘落，绝不盖偶遇气泡(pet z200+)/偶遇符号(z7)/角色脸。
               粒子纯 CSS @keyframes 驱动，**不进 usePlazaWalk 的 rAF**（仿家具静态层纪律）。 -->
          <div class="season-layer" aria-hidden="true">
            <span
              v-for="(p, i) in seasonParticles"
              :key="i"
              class="season-particle"
              :style="{
                left: p.left + '%',
                animationDelay: p.delay + 's',
                animationDuration: p.duration + 's',
                '--drift': p.drift + 'px',
              }"
            >{{ p.symbol }}</span>
          </div>

          <!-- ★ S16-T7 已摆放家具进场景可见（零素材 emoji + 名牌）：从 placedIds 派生的静态层，
               脚点锚定 + 与角色同一 zIndex=round(y*10) y-sort，站家具前后的角色正确互相遮挡。
               纯派生静态 DOM，不进 rAF/tick；摆放/收纳靠 placedFurniture 响应式即时反映。 -->
          <div
            v-for="item in placedFurniture"
            :key="item.id"
            class="furniture"
            :style="furnitureStyle(item)"
            :title="item.name"
          >
            <span class="furniture-icon" aria-hidden="true">{{ item.icon }}</span>
            <span class="furniture-tag">{{ item.name }}</span>
            <div class="furniture-shadow"></div>
          </div>

          <!-- 角色漫步者 -->
          <div
            v-for="pet in pets"
            v-show="!pet.hidden"
            :key="pet.id"
            class="pet"
            :class="{ 'is-idle': !pet.moving, 'is-today': pet.id === todaySpecialId }"
            :style="petStyle(pet)"
            :title="pet.id === todaySpecialId ? `${pet.name} · 今天心情特别好 · 点击互动` : `${pet.name} · 点击互动`"
            @click="onPetTap(pet)"
          >
            <div class="pet-inner" :style="{ transform: `scale(${depthScale(pet.y)})` }">
              <!-- ★ S16-T10 今日特殊角色显式标识：emoji 徽章 + 淡光晕（CSS，不进 rAF），与普通入住角色可分辨。 -->
              <span v-if="pet.id === todaySpecialId" class="pet-today-badge" aria-label="今日特殊角色">☀</span>
              <!-- ★ S16-T2/T3 tap 气泡 + ★ S16-T4/T5 偶遇气泡（多气泡模型，按 petId 索引；
                   kind='encounter' 加 accent 边区分「双角色偶遇」与「单角色 tap 回应」，纯展示）。 -->
              <transition name="pet-bubble">
                <div
                  v-if="bubbleFor(pet.id)"
                  class="pet-bubble"
                  :class="{ 'is-encounter': bubbleFor(pet.id)!.kind === 'encounter' }"
                >
                  <span class="pet-bubble-text">{{ bubbleFor(pet.id)!.text }}</span>
                  <span v-if="bubbleFor(pet.id)!.gain > 0" class="pet-bubble-gain">好感 +{{ bubbleFor(pet.id)!.gain }}</span>
                </div>
              </transition>
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

          <!-- ★ S16-T4 偶遇上浮小符号（♡/✧/♪）：两同作品角色偶遇时在中点轻轻上浮消失，纯展示 -->
          <transition-group name="spark" tag="div">
            <span
              v-for="spark in sparks"
              :key="spark.key"
              class="encounter-spark"
              :style="{ left: spark.x + '%', top: spark.y + '%' }"
              aria-hidden="true"
            >{{ spark.symbol }}</span>
          </transition-group>

          <div v-if="visibleCount === 0" class="hs-empty-scene">
            <div class="hs-empty-card">
              <p>还没有角色入住，把角色放进来一起挂机吧。</p>
              <button class="btn-primary text-sm px-4 py-2" @click="showManage = true">管理入住</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="ops-panel" aria-label="家园运营">
        <!-- 挂机收益主 CTA 大卡（金色收取）：SF-T3 预计累积 + 封顶进度 + 入住羁绊 -->
        <div class="g-card g-idle" aria-label="待收挂机收益">
          <div class="g-idle-top">
            <div>
              <span class="g-eyebrow">待收挂机收益</span>
              <div class="g-idle-hours">{{ projectedYield.hours.toFixed(1) }}h / 上限 {{ capHours.toFixed(1) }}h</div>
            </div>
            <span class="g-chip gold">{{ knowledgePoints }} KP</span>
          </div>
          <ul class="g-idle-amt">
            <li><small>经验</small><b>+{{ projectedYield.expEach }}</b></li>
            <li><small>好感</small><b>+{{ projectedYield.affectionEach }}</b></li>
            <li><small>知识点</small><b>+{{ projectedYield.knowledge }}</b></li>
          </ul>
          <!-- ★ S15-T3 入住羁绊显形：命中给 accent 徽章 + 加成 pct（口径同源，预览=结算）。 -->
          <div class="g-bond" aria-label="入住羁绊">
            <span class="g-bond-kicker">入住羁绊</span>
            <template v-if="bondHits.length > 0">
              <span class="g-bond-total">全产出 +{{ Math.round(bondBonusPct * 100) }}%</span>
              <ul class="g-bond-hits">
                <li v-for="hit in bondHits" :key="hit.anime" class="g-chip bond-chip" :title="`${hit.anime} · 同住 ${hit.members} 人`">
                  {{ hit.anime }} ×{{ hit.members }} · +{{ Math.round(hit.pct * 100) }}%
                </li>
              </ul>
            </template>
            <span v-else class="g-bond-empty">同作品 ≥2 人同住可触发加成</span>
          </div>
          <div class="g-bar" role="progressbar" :aria-valuenow="Math.round(capProgress * 100)" aria-valuemin="0" aria-valuemax="100">
            <i :class="capReached ? 'is-full' : 'is-growing'" :style="{ width: `${capProgress * 100}%` }"></i>
          </div>
          <div class="g-idle-foot">
            <small v-if="capReached" class="g-cap-note">已达上限，回来收取吧</small>
            <small v-else-if="homestead.lastSettleAt <= 0" class="g-cap-hint">入住角色后开始累积</small>
            <small v-else class="g-cap-hint">离开再回来即可收取当前累积</small>
            <div class="g-collect-wrap">
              <transition name="collect-float">
                <span v-if="collectFloat" class="g-collect-float">{{ collectFloat }}</span>
              </transition>
              <button type="button" class="g-cta-gold" :class="{ 'is-pulsing': collectFloat }" @click="runSettle(true)">收取</button>
            </div>
          </div>
        </div>

        <!-- ★ S16-T9 收藏陈列 + ★ S16-T10 今日特殊角色（抽卡战果橱窗 + 回访新鲜软钩子）。
             纯派生自 collection + codex.characterCompletion（只读，绝不碰 claim/claimedMilestones）。 -->
        <div class="g-card g-showcase" aria-label="收藏陈列">
          <div class="g-showcase-head">
            <span class="g-eyebrow">收藏橱窗</span>
            <div class="g-showcase-head-right">
              <!-- 完成度 chip：正着念「拥有 X」（endowment 正向），绝不念「还差 Y」（反 completionist）。 -->
              <span
                v-if="showcaseRarityCount"
                class="display-count-chip"
                :title="`已拥有 ${showcaseRarityCount.rarity} ${showcaseRarityCount.owned}/${showcaseRarityCount.total} · 图鉴完成度 ${codexPercent}%`"
              >
                {{ showcaseRarityCount.rarity }} {{ showcaseRarityCount.owned }}/{{ showcaseRarityCount.total }} · 图鉴 {{ codexPercent }}%
              </span>
              <!-- ★ S16-T13 晒图入口：把家园状态出成一张「基地身份卡」（纯本地快照，系统分享/下载 PNG）。 -->
              <button type="button" class="g-share-btn" title="生成家园基地身份卡（分享/下载）" @click="showShareCard = true">
                📤 晒基地
              </button>
            </div>
          </div>

          <!-- ★ S16-T10 今日特殊角色点名（回访钩子的「今天是谁心情好」，与广场徽章互为印证）。 -->
          <div v-if="todaySpecialCard" class="g-today">
            <span class="g-today-badge" aria-hidden="true">☀</span>
            <span class="g-today-text">
              今天 <b>{{ todaySpecialCard.name }}</b> 心情特别好，去广场找它聊两句吧
            </span>
          </div>

          <!-- UR/最高稀有度头像墙（真橱窗，横滑）；空态走引导，绝不空墙 -->
          <div v-if="showcaseCards.length > 0" class="g-showcase-wall">
            <button
              v-for="card in showcaseCards"
              :key="card.id"
              type="button"
              class="g-showcase-item"
              :title="`${card.name} · ${card.rarity}`"
              @click="openDetailById(card.id)"
            >
              <CharacterAvatar :character-id="card.id" :name="card.name" :size="44" rounded />
            </button>
          </div>
          <div v-else class="g-showcase-empty">
            抽到你的第一张角色卡，它会陈列在这里 ✨
          </div>
        </div>

        <!-- 设施快捷条：升级三设施（可升级项加角标提示） -->
        <div class="g-facil" aria-label="设施升级">
          <div v-for="row in facilityRows" :key="row.key" class="g-card g-facil-item">
            <span v-if="row.affordable" class="g-facil-up" aria-hidden="true">↑</span>
            <div class="g-facil-head">
              <b>{{ row.label }}</b>
              <span class="g-chip">Lv.{{ row.level }}</span>
            </div>
            <span class="g-facil-value">{{ row.value }}</span>
            <span class="g-facil-bonus">设施加成 {{ pctText(row.bonus) }}</span>
            <div class="g-facil-upgrade">
              <span v-if="row.maxed" class="g-facil-maxed">已满级</span>
              <template v-else>
                <span class="g-facil-next">下一级 +{{ row.nextDelta }} {{ row.unit }}/h · {{ row.cost }} KP</span>
                <button
                  type="button"
                  class="btn-primary g-facil-btn"
                  :disabled="!row.affordable"
                  @click="onUpgradeFacility(row.key)"
                >
                  升级
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- SF-T8：家园日常委托（默认展开）。收挂机/爬塔/强化都在 hub 内闭环。 -->
        <details class="g-card g-acc" open>
          <summary class="g-acc-sum">
            <span class="g-acc-ttl">
              <span class="g-ring" :style="{ '--p': commissionTotal ? (commissionDoneCount / commissionTotal) * 100 : 0 }">
                <i>{{ commissionDoneCount }}/{{ commissionTotal }}</i>
              </span>
              今日委托
            </span>
            <span class="g-chip good" :class="{ 'is-dim': !allCommissionsDone }">全清 · {{ commissionBonusText }}</span>
          </summary>
          <div class="g-acc-body">
            <ul class="commission-list">
              <li v-for="row in commissionRows" :key="row.id" class="commission-row" :class="{ 'is-complete': row.complete }">
                <span class="commission-check" aria-hidden="true">{{ row.complete ? '✓' : '○' }}</span>
                <span class="commission-body">
                  <span class="commission-title">{{ row.title }}</span>
                  <span class="commission-reward">{{ row.reward }}</span>
                </span>
                <button
                  v-if="row.claimable"
                  type="button"
                  class="btn-primary commission-claim"
                  @click="onClaimCommission(row.id)"
                >
                  领取
                </button>
                <span v-else-if="row.claimed" class="commission-state claimed">已领</span>
                <span v-else class="commission-state pending">{{ row.description }}</span>
              </li>
            </ul>
            <div class="commission-bonus">
              <span class="commission-bonus-label">今日全清 · {{ commissionBonusText }}</span>
              <button
                v-if="allCommissionsDone && !commissionBonusClaimed"
                type="button"
                class="btn-primary commission-bonus-btn"
                @click="onClaimCommissionBonus"
              >
                领全清
              </button>
              <span v-else-if="commissionBonusClaimed" class="commission-state claimed">已领</span>
              <span v-else class="commission-state pending">清完 3 条解锁</span>
            </div>
            <transition name="commission-float">
              <span v-if="commissionFloat" class="commission-float">{{ commissionFloat }}</span>
            </transition>
          </div>
        </details>

        <!-- S15-T2 家具兑换 + 摆放/收纳：KP → 家具 → comfort（经既有软加成轴，摆放持久化） -->
        <details class="g-card g-acc">
          <summary class="g-acc-sum">
            <span class="g-acc-ttl">家具布置</span>
            <!-- ★ S16-T8 陈列计数（纯派生显数字，摆放/收纳即时变化；无奖励、不进存档、不复用领取制） -->
            <span class="display-count-chip" :title="`已摆放 ${displayCount} / ${displayTotal} 件家具，摆在广场场景里`">
              陈列 {{ displayCount }}/{{ displayTotal }}
            </span>
            <span class="g-chip" :title="`已摆放家具舒适度合计 ${placedFurnitureComfort}`">
              舒适 +{{ placedFurnitureComfort }} · 全产出 {{ comfortPctText(homeEffect.comfort) }}
            </span>
          </summary>
          <div class="g-acc-body">
            <ul class="furniture-list">
              <li v-for="row in furnitureRows" :key="row.id" class="furniture-row" :class="{ 'is-placed': row.placed }">
                <span class="furniture-body">
                  <span class="furniture-name">{{ row.name }}</span>
                  <span class="furniture-meta">舒适 +{{ row.comfort }}<template v-if="!row.owned"> · {{ row.cost }} KP</template></span>
                </span>
                <template v-if="!row.owned">
                  <span v-if="row.deltaPct > 0" class="furniture-delta">摆放后全产出 +{{ Math.round(row.deltaPct * 100) }}%</span>
                  <button
                    type="button"
                    class="btn-primary furniture-btn"
                    :disabled="!row.affordable"
                    @click="onBuyFurniture(row.id)"
                  >
                    购买
                  </button>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="furniture-btn"
                    :class="row.placed ? 'btn-secondary' : 'btn-primary'"
                    @click="onToggleFurniture(row.id)"
                  >
                    {{ row.placed ? '收纳' : '摆放' }}
                  </button>
                </template>
              </li>
            </ul>
          </div>
        </details>

        <!-- 入住名单折叠（★ S16-T1 好感里程碑在家园显形 + 领取，同源养成域 claimBondMilestone） -->
        <details class="g-card g-acc" open>
          <summary class="g-acc-sum">
            <span class="g-acc-ttl">入住名单</span>
            <span class="g-chip" :class="{ good: claimableBondCount > 0 }">
              <template v-if="claimableBondCount > 0">{{ claimableBondCount }} 个里程碑可领</template>
              <template v-else>入住 {{ residentRows.length }}</template>
            </span>
          </summary>
          <div class="g-acc-body">
            <div v-if="residentRows.length === 0" class="resident-empty">
              还没有入住角色
            </div>
            <div v-else class="resident-list">
              <div
                v-for="row in residentRows"
                :key="row.id"
                class="resident-pill"
                :class="{ 'has-claim': row.claimable }"
              >
                <button type="button" class="resident-main" @click="openDetailById(row.id)">
                  <CharacterAvatar
                    class="resident-avatar"
                    :character-id="row.id"
                    :size="34"
                    rounded
                  />
                  <span class="resident-info">
                    <span class="resident-name">{{ row.name }}</span>
                    <span class="resident-meta">{{ row.rarity }} · Lv.{{ row.level }} · 装备{{ row.equippedCount }}/3</span>
                    <span class="resident-bond">
                      羁绊「{{ row.bondTitle }}」 · 好感 {{ row.affection }}<template v-if="row.nextUnclaimed"> · 距「{{ row.nextUnclaimed.title }}」还需 {{ row.toNext }}</template><template v-else> · 里程碑全达成</template>
                    </span>
                    <span class="resident-effect">{{ row.effectText || '基础产出' }}</span>
                  </span>
                </button>
                <button
                  v-if="row.claimable"
                  type="button"
                  class="btn-primary resident-claim"
                  @click="onClaimBondMilestone(row.id, row.claimable.id)"
                >
                  领取「{{ row.claimable.title }}」+{{ row.claimable.reward }} KP
                </button>
              </div>
            </div>
            <transition name="commission-float">
              <span v-if="bondFloat" class="bond-float">「{{ bondFloat.name }}」：{{ bondFloat.text }}</span>
            </transition>
          </div>
        </details>
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

    <!-- ★ S16-T12 高档里程碑 Crowning 隆重庆祝弹层（bond_4/5/6；bond_6=finale 再加最隆重一档）。
         纯展示：发放成功后的视觉分支，零数值 / 零发奖。光效走 CSS @keyframes 不进 rAF。
         点击遮罩或「收下」关闭；自动淡出定时器已登记 dialogueTimers（onUnmounted 清）。 -->
    <transition name="crown-pop">
      <div
        v-if="crownCelebration"
        class="crown-pop"
        :class="`is-${crownCelebration.tier}`"
        @click.self="closeCrownCelebration"
      >
        <div class="crown-card">
          <div class="crown-rays" aria-hidden="true"></div>
          <div class="crown-sparkles" aria-hidden="true">
            <span v-for="n in 6" :key="n" class="crown-sparkle" :style="{ '--i': n }">✦</span>
          </div>
          <span class="crown-kicker">{{ crownCelebration.tier === 'finale' ? '关系的顶点 · 命运降临' : '羁绊里程碑达成' }}</span>
          <div class="crown-avatar-ring">
            <CharacterAvatar :character-id="crownCelebration.charId" :name="crownCelebration.name" :size="96" rounded />
          </div>
          <h3 class="crown-title">「{{ crownCelebration.title }}」达成</h3>
          <p class="crown-name">{{ crownCelebration.name }}</p>
          <p class="crown-line">{{ crownCelebration.line }}</p>
          <button type="button" class="btn-primary crown-close" @click="closeCrownCelebration">收下</button>
        </div>
      </div>
    </transition>

    <HomesteadManageModal :is-open="showManage" @close="showManage = false" />
    <CardDetailModal v-if="detailCard" :card="detailCard" card-type="character" :count="detailCount" @close="detailCard = null" />

    <!-- ★ S16-T13 家园基地身份卡晒图（纯只读快照聚合 → Canvas → 系统分享/下载 PNG，零升档零联机） -->
    <HomesteadShareCard v-if="showShareCard" @close="showShareCard = false" />
  </div>
</template>

<style scoped>
.homestead { width: 100%; }
/* [A] 纤细摘要条：hub HUD 已显身份/资源，这里只留一行摘要 + 管理入住 */
.hs-header {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  margin-bottom: .85rem; padding: .4rem .2rem;
}
.hs-summary { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
.hs-summary-chip {
  display: inline-flex; align-items: baseline; gap: .4rem;
  padding: .28rem .7rem; border-radius: 999px;
  background: rgb(var(--c-surface-2) / .7); border: 1px solid rgb(var(--c-line));
}
.hs-summary-label { font-size: .68rem; font-weight: 700; color: rgb(var(--c-ink-3)); }
.hs-summary-chip strong { font-size: .92rem; font-weight: 800; color: rgb(var(--c-accent)); font-variant-numeric: tabular-nums; }
.hs-manage-btn { font-size: .82rem; padding: .4rem 1rem; white-space: nowrap; }
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
.ops-panel { display: flex; flex-direction: column; gap: .7rem; min-width: 0; }

/* ============ 外壳共同语言（与样稿一致的类名/质感）============ */
/* 胖卡：面 + 1px 线边 + 圆角 + 柔和投影 + 顶部 40% 高光 */
.g-card {
  position: relative; background: rgb(var(--c-surface));
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  box-shadow: var(--sk-shadow-card);
}
.g-card::before {
  content: ''; position: absolute; inset: 0 0 auto 0; height: 40%; pointer-events: none;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
  background: linear-gradient(180deg, rgb(255 255 255 / .5), transparent);
}
.g-eyebrow {
  display: inline-block; font-size: .62rem; font-weight: 900; letter-spacing: .12em;
  text-transform: uppercase; color: rgb(var(--c-accent-2));
}
/* 胶囊 chip：语义令牌淡底 + 同色字 */
.g-chip {
  display: inline-flex; align-items: center; gap: .3rem; font-size: .66rem; font-weight: 800;
  padding: .16rem .5rem; border-radius: 999px;
  background: rgb(var(--c-accent-soft)); color: rgb(var(--c-accent-2));
  max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.g-chip.warn { background: rgb(var(--c-warning) / .16); color: rgb(var(--c-warning)); }
.g-chip.good { background: rgb(var(--c-success) / .16); color: rgb(var(--c-success)); }
.g-chip.good.is-dim { background: rgb(var(--c-surface-2) / .8); color: rgb(var(--c-ink-3)); }
.g-chip.gold { background: rgb(var(--c-highlight) / .16); color: rgb(var(--c-highlight)); }
/* 金色主 CTA：由 highlight 深浅两档组成 + 立体下缘 */
.g-cta-gold {
  flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: .84rem; padding: .5rem 1.2rem; white-space: nowrap;
  border: 0; cursor: pointer; border-radius: var(--sk-radius-control);
  color: rgb(var(--c-on-accent));
  background: linear-gradient(180deg, rgb(var(--c-highlight)), rgb(var(--c-highlight) / .82));
  box-shadow: 0 3px 0 rgb(var(--c-highlight) / .55), 0 6px 14px rgb(var(--c-highlight) / .4);
  transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
}
.g-cta-gold:hover { filter: brightness(1.05); }
.g-cta-gold:active { transform: translateY(1px); box-shadow: 0 1px 0 rgb(var(--c-highlight) / .55); }
/* ★ S16-T15 收取瞬间到手反馈（纯 CSS，只可视化已入账的 KP，零数值改） */
.g-collect-wrap { position: relative; display: inline-flex; }
.g-cta-gold.is-pulsing { animation: collectPulse .5s ease; }
@keyframes collectPulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.08); box-shadow: 0 3px 0 rgb(var(--c-highlight) / .55), 0 6px 18px rgb(var(--c-highlight) / .55); }
  100% { transform: scale(1); }
}
.g-collect-float {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 4px;
  padding: .12rem .5rem; border-radius: 999px; white-space: nowrap; pointer-events: none;
  font-size: .74rem; font-weight: 900; font-variant-numeric: tabular-nums;
  color: rgb(var(--c-on-accent)); background: rgb(var(--c-highlight));
  box-shadow: 0 3px 10px rgb(var(--c-highlight) / .5);
}
.collect-float-enter-active { transition: opacity .2s ease, transform .3s ease; }
.collect-float-leave-active { transition: opacity .5s ease, transform .6s ease; }
.collect-float-enter-from { opacity: 0; transform: translateX(-50%) translateY(6px); }
.collect-float-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }
/* 进度条 */
.g-bar {
  width: 100%; height: 8px; border-radius: 999px; overflow: hidden;
  background: rgb(var(--c-surface-2)); border: 1px solid rgb(var(--c-line));
}
.g-bar i { display: block; height: 100%; border-radius: 999px; transition: width .5s ease; }
.g-bar i.is-growing { background: linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent-2))); }
.g-bar i.is-full { background: linear-gradient(90deg, rgb(var(--c-highlight)), rgb(var(--c-highlight) / .8)); }

/* ============ [C-1] 挂机收益主卡 ============ */
.g-idle {
  padding: .95rem; overflow: hidden;
  background:
    linear-gradient(135deg, rgb(var(--c-accent-soft) / .9), rgb(var(--c-surface)) 66%);
}
.g-idle-top { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; }
.g-idle-hours { margin-top: .15rem; font-size: .72rem; font-weight: 700; color: rgb(var(--c-ink-2)); }
.g-idle-amt { display: flex; gap: 1rem; margin: .55rem 0 .4rem; padding: 0; list-style: none; }
.g-idle-amt li { display: flex; flex-direction: column; gap: .05rem; }
.g-idle-amt small { font-size: .62rem; color: rgb(var(--c-ink-3)); }
.g-idle-amt b { font-size: 1.1rem; font-weight: 900; color: rgb(var(--c-ink)); font-variant-numeric: tabular-nums; }
/* 入住羁绊显形（命中给 accent，无 text-white / 动态色类） */
.g-bond { display: flex; flex-direction: column; gap: .3rem; margin: .1rem 0 .5rem; }
.g-bond-kicker { font-size: .66rem; font-weight: 800; letter-spacing: .04em; color: rgb(var(--c-ink-3)); }
.g-bond-total { font-size: .78rem; font-weight: 800; color: rgb(var(--c-accent-2)); }
.g-bond-hits { display: flex; flex-wrap: wrap; gap: .32rem; margin: 0; padding: 0; list-style: none; }
.g-chip.bond-chip { background: rgb(var(--c-accent) / .12); color: rgb(var(--c-accent-2)); border: 1px solid rgb(var(--c-accent) / .3); }
.g-bond-empty { font-size: .66rem; color: rgb(var(--c-ink-3)); }
.g-idle-foot { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-top: .55rem; }
.g-idle-foot small { font-size: .68rem; line-height: 1.3; }
.g-cap-note { color: rgb(var(--c-warning)); font-weight: 700; }
.g-cap-hint { color: rgb(var(--c-ink-3)); }

/* ============ [C-2] 设施快捷条 ============ */
.g-facil { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
.g-facil-item { padding: .6rem .55rem; display: flex; flex-direction: column; gap: .22rem; }
.g-facil-up {
  position: absolute; top: -6px; right: -6px; z-index: 2;
  width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center;
  font-size: .7rem; font-weight: 900; color: rgb(var(--c-on-accent));
  background: rgb(var(--c-success)); box-shadow: 0 2px 5px rgb(var(--c-success) / .4);
}
.g-facil-head { display: flex; align-items: center; justify-content: space-between; gap: .35rem; }
.g-facil-head b { font-size: .74rem; font-weight: 800; color: rgb(var(--c-ink)); }
.g-facil-head .g-chip { padding: .1rem .4rem; font-size: .6rem; background: rgb(var(--c-accent-soft) / .8); }
.g-facil-value { font-size: .9rem; font-weight: 900; color: rgb(var(--c-ink)); font-variant-numeric: tabular-nums; }
.g-facil-bonus { font-size: .6rem; color: rgb(var(--c-ink-3)); }
.g-facil-upgrade { display: flex; flex-direction: column; gap: .3rem; margin-top: .15rem; }
.g-facil-next { font-size: .6rem; line-height: 1.3; color: rgb(var(--c-ink-2)); }
.g-facil-btn { width: 100%; font-size: .72rem; padding: .28rem .4rem; }
.g-facil-btn:disabled { opacity: .5; cursor: not-allowed; }
.g-facil-maxed { font-size: .68rem; font-weight: 700; color: rgb(var(--c-ink-3)); }

/* ============ [C-3/4/5] 折叠收纳 <details> ============ */
.g-acc { padding: 0; overflow: hidden; }
.g-acc > .g-acc-sum {
  list-style: none; cursor: pointer; user-select: none;
  display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  padding: .7rem .85rem;
}
.g-acc > .g-acc-sum::-webkit-details-marker { display: none; }
.g-acc-sum:focus-visible { outline: 2px solid rgb(var(--c-accent)); outline-offset: -2px; border-radius: var(--sk-radius-panel); }
.g-acc-ttl { display: flex; align-items: center; gap: .45rem; font-size: .82rem; font-weight: 800; color: rgb(var(--c-ink)); }
.g-acc-ttl::after {
  content: '▾'; margin-left: .1rem; font-size: .7rem; color: rgb(var(--c-ink-3));
  transition: transform .18s ease;
}
.g-acc[open] > .g-acc-sum .g-acc-ttl::after { transform: rotate(180deg); }
.g-acc-body { padding: 0 .85rem .8rem; }
/* 进度环 */
.g-ring {
  --p: 0; width: 32px; height: 32px; flex: 0 0 auto; border-radius: 50%;
  display: grid; place-items: center; font-size: .55rem; font-weight: 900; color: rgb(var(--c-accent-2));
  background: conic-gradient(rgb(var(--c-accent)) calc(var(--p) * 1%), rgb(var(--c-surface-2)) 0);
}
.g-ring i {
  width: 24px; height: 24px; border-radius: 50%; font-style: normal;
  display: grid; place-items: center; background: rgb(var(--c-surface));
  font-variant-numeric: tabular-nums;
}
/* SF-T8 家园委托（清单勾选，语义令牌，无 text-white / 动态色类） */
.g-acc { position: relative; }
.commission-list { display: flex; flex-direction: column; gap: .4rem; margin: 0; padding: 0; list-style: none; }
.commission-row { display: flex; align-items: center; gap: .55rem; }
.commission-check {
  flex: 0 0 auto; width: 1.1rem; text-align: center; font-weight: 800; font-size: .95rem;
  color: rgb(var(--c-ink-3)); transition: color .3s ease;
}
.commission-row.is-complete .commission-check { color: rgb(var(--c-success)); }
.commission-body { display: flex; flex-direction: column; gap: .05rem; min-width: 0; flex: 1 1 auto; }
.commission-title { font-size: .82rem; font-weight: 700; color: rgb(var(--c-ink)); }
.commission-reward { font-size: .68rem; color: rgb(var(--c-ink-3)); }
.commission-claim { flex: 0 0 auto; font-size: .72rem; padding: .22rem .7rem; }
.commission-bonus-btn { flex: 0 0 auto; font-size: .72rem; padding: .22rem .7rem; }
.commission-state { flex: 0 0 auto; font-size: .7rem; }
.commission-state.claimed { color: rgb(var(--c-success)); font-weight: 700; }
.commission-state.pending { color: rgb(var(--c-ink-3)); max-width: 9rem; text-align: right; line-height: 1.2; }
.commission-bonus {
  display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  margin-top: .1rem; padding-top: .5rem; border-top: 1px dashed rgb(var(--c-line));
}
.commission-bonus-label { font-size: .74rem; font-weight: 700; color: rgb(var(--c-highlight)); }
.commission-float {
  position: absolute; top: .5rem; right: .9rem; padding: .2rem .55rem; border-radius: 6px;
  background: rgb(var(--c-success) / .16); color: rgb(var(--c-success)); font-size: .74rem; font-weight: 800;
  pointer-events: none;
}
.commission-float-enter-active { transition: opacity .3s ease, transform .3s ease; }
.commission-float-leave-active { transition: opacity .6s ease, transform .6s ease; }
.commission-float-enter-from { opacity: 0; transform: translateY(6px); }
.commission-float-leave-to { opacity: 0; transform: translateY(-8px); }
/* S15-T2 家具布置（语义令牌，无 text-white / 动态色类） */
.furniture-list { display: flex; flex-direction: column; gap: .4rem; margin: 0; padding: 0; list-style: none; }
.furniture-row {
  display: flex; align-items: center; gap: .55rem;
  padding: .35rem .5rem; border-radius: var(--sk-radius-control); border: 1px solid rgb(var(--c-line));
  background: rgb(var(--c-surface-2) / .5); transition: border-color .15s ease, background .15s ease;
}
.furniture-row.is-placed { border-color: rgb(var(--c-accent) / .5); background: rgb(var(--c-accent-soft) / .35); }
.furniture-body { display: flex; flex-direction: column; gap: .05rem; min-width: 0; flex: 1 1 auto; }
.furniture-name { font-size: .82rem; font-weight: 700; color: rgb(var(--c-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.furniture-meta { font-size: .68rem; color: rgb(var(--c-ink-3)); }
.furniture-delta { flex: 0 0 auto; font-size: .68rem; font-weight: 700; color: rgb(var(--c-success)); text-align: right; line-height: 1.2; }
.furniture-btn { flex: 0 0 auto; font-size: .72rem; padding: .24rem .7rem; }
.furniture-btn:disabled { opacity: .5; cursor: not-allowed; }
/* 入住名单（★ S16-T1 好感里程碑显形 + 领取） */
.resident-list { display: grid; grid-template-columns: 1fr; gap: .5rem; }
.resident-pill {
  display: flex; flex-direction: column; gap: .5rem;
  padding: .7rem .75rem; border: 1px solid rgb(var(--c-line));
  border-radius: var(--sk-radius-control); background: rgb(var(--c-surface-2) / .82);
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
.resident-pill.has-claim { border-color: rgb(var(--c-accent) / .55); background: rgb(var(--c-accent-soft) / .3); }
.resident-pill:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); box-shadow: 0 10px 24px rgb(37 47 58 / .08); }
.resident-main {
  display: flex; align-items: center; gap: .6rem; width: 100%; text-align: left;
  background: transparent; border: 0; padding: 0; cursor: pointer;
}
.resident-avatar { flex: none; }
.resident-info { min-width: 0; flex: 1 1 auto; }
.resident-name { display: block; font-size: .86rem; font-weight: 800; color: rgb(var(--c-ink)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.resident-meta { display: block; margin-top: .18rem; font-size: .72rem; color: rgb(var(--c-ink-2)); }
.resident-bond { display: block; margin-top: .18rem; font-size: .7rem; color: rgb(var(--c-highlight)); }
.resident-effect { display: block; margin-top: .22rem; font-size: .68rem; color: rgb(var(--c-accent)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.resident-claim { align-self: stretch; font-size: .74rem; padding: .3rem .7rem; }
.resident-empty { padding: 1rem; border: 1px dashed rgb(var(--c-line)); border-radius: 8px; color: rgb(var(--c-ink-2)); text-align: center; }
/* ★ S16-T1 里程碑领取后的角色感言飘字（复用 commission-float 过渡） */
.bond-float {
  display: block; margin-top: .5rem; padding: .35rem .6rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-accent-soft) / .5); border: 1px solid rgb(var(--c-accent) / .4);
  color: rgb(var(--c-ink)); font-size: .74rem; font-weight: 700;
}

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

/* ★ S16-T7 场景可见家具（零素材 emoji + surface 名牌，脚点锚定；zIndex 走内联 y-sort 接进角色景深） */
.furniture {
  position: absolute; transform: translate(-50%, -100%);
  display: flex; flex-direction: column; align-items: center; pointer-events: none;
  will-change: left, top;
}
.furniture-icon {
  font-size: 34px; line-height: 1; display: block;
  filter: drop-shadow(0 6px 6px rgb(44 64 54 / .3));
}
/* 名牌用 surface 卡片 + ink 文（语义令牌，非白字压图；短名安全在场景底图上可读） */
.furniture-tag {
  margin-top: 3px; padding: 1px 7px; border-radius: 7px; white-space: nowrap;
  font-size: 10px; font-weight: 700; color: rgb(var(--c-ink));
  background: rgb(var(--c-surface) / .92); border: 1px solid rgb(var(--c-line));
  box-shadow: 0 2px 6px rgb(0 0 0 / .18); opacity: .9;
}
.furniture-shadow {
  position: absolute; bottom: -4px; left: 50%; width: 34px; height: 9px; margin-left: -17px;
  border-radius: 50%; background: rgb(0 0 0 / .18); filter: blur(.5px);
}
/* ★ S16-T8 陈列计数 chip（纯派生显数字，无奖励语义） */
.display-count-chip {
  display: inline-flex; align-items: center; gap: .3rem;
  padding: .12rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 700;
  color: rgb(var(--c-ink-2)); background: rgb(var(--c-surface));
  border: 1px solid rgb(var(--c-line));
}

/* ★ S16-T9 收藏陈列橱窗（surface 卡片非白字压图，纯派生展示墙无奖励语义） */
.g-showcase { padding: .8rem .85rem; display: flex; flex-direction: column; gap: .55rem; }
.g-showcase-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; flex-wrap: wrap; }
.g-showcase-head-right { display: inline-flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.g-showcase-head .display-count-chip { background: rgb(var(--c-accent-soft)); color: rgb(var(--c-accent-2)); border-color: rgb(var(--c-accent) / .3); }
/* ★ S16-T13 晒图入口按钮（语义令牌，非白字压浅底 / 非动态拼色类） */
.g-share-btn {
  display: inline-flex; align-items: center; gap: .25rem; flex: 0 0 auto;
  font-size: .68rem; font-weight: 800; padding: .2rem .55rem; border-radius: 999px; cursor: pointer;
  color: rgb(var(--c-accent-2)); background: rgb(var(--c-accent-soft));
  border: 1px solid rgb(var(--c-accent) / .35); white-space: nowrap;
  transition: background .15s ease, transform .12s ease, border-color .15s ease;
}
.g-share-btn:hover { background: rgb(var(--c-accent) / .18); border-color: rgb(var(--c-accent) / .55); }
.g-share-btn:active { transform: translateY(1px); }
.g-share-btn:focus-visible { outline: 2px solid rgb(var(--c-accent)); outline-offset: 2px; }
/* 今日特殊角色点名（highlight 语义色淡底，非白字压图） */
.g-today {
  display: flex; align-items: center; gap: .45rem;
  padding: .4rem .55rem; border-radius: var(--sk-radius-control);
  background: rgb(var(--c-highlight) / .12); border: 1px solid rgb(var(--c-highlight) / .32);
}
.g-today-badge { flex: 0 0 auto; font-size: 1rem; line-height: 1; }
.g-today-text { font-size: .72rem; line-height: 1.35; color: rgb(var(--c-ink-2)); }
.g-today-text b { color: rgb(var(--c-highlight)); font-weight: 800; }
/* UR/最高稀有度头像墙：横滑橱窗（overflow-x:auto 不撑爆右栏） */
.g-showcase-wall {
  display: flex; gap: .4rem; overflow-x: auto; overflow-y: hidden;
  padding: .1rem .1rem .3rem; margin: -.1rem;
  scrollbar-width: thin;
}
.g-showcase-item {
  flex: 0 0 auto; padding: 0; border: 0; background: transparent; cursor: pointer;
  border-radius: var(--sk-radius-control); line-height: 0;
  transition: transform .12s ease, box-shadow .12s ease;
}
.g-showcase-item:hover { transform: translateY(-2px); box-shadow: 0 6px 14px rgb(37 47 58 / .16); }
.g-showcase-item:focus-visible { outline: 2px solid rgb(var(--c-accent)); outline-offset: 2px; }
.g-showcase-empty {
  padding: .9rem .75rem; border: 1px dashed rgb(var(--c-line)); border-radius: var(--sk-radius-control);
  color: rgb(var(--c-ink-2)); font-size: .74rem; text-align: center; line-height: 1.4;
}

/* ★ S16-T10 今日特殊角色显式标识：emoji 徽章 + 淡光晕（CSS，不进 rAF） */
.pet.is-today .pet-inner {
  filter: drop-shadow(0 0 6px rgb(var(--c-highlight) / .75)) drop-shadow(0 0 14px rgb(var(--c-highlight) / .45));
}
.pet-today-badge {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 20px; z-index: 3; pointer-events: none;
  font-size: 15px; line-height: 1;
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / .35));
  animation: todaybob 2.4s ease-in-out infinite;
}
@keyframes todaybob {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-3px); }
}

/* ★ S16-T11 季节浮层（纯 CSS/emoji 稀疏飘落，z 垫在 bg 之上、角色之下；pointer-events:none 不糊脸） */
.season-layer {
  position: absolute; inset: 0; z-index: 3; overflow: hidden;
  pointer-events: none;
}
.season-particle {
  position: absolute; top: -6%;
  font-size: 15px; line-height: 1; opacity: 0;
  will-change: transform, opacity;
  animation-name: seasonfall; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes seasonfall {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
  12% { opacity: .5; }
  88% { opacity: .5; }
  100% { opacity: 0; transform: translate(var(--drift, 8px), 118vh) rotate(220deg); }
}
/* 场景高度有限，用容器高度而非视口高度收束落程（避免超长飘出）。 */
.scene .season-particle { animation-name: seasonfallscene; }
@keyframes seasonfallscene {
  0% { opacity: 0; transform: translate(0, 0) rotate(0deg); }
  12% { opacity: .55; }
  85% { opacity: .5; }
  100% { opacity: 0; transform: translate(var(--drift, 8px), 340px) rotate(200deg); }
}

/* ★ S16-T2/T3 tap 互动情境气泡（语义令牌 surface 卡片，非白字压图） */
.pet-bubble {
  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
  margin-bottom: 22px; width: max-content; max-width: 176px; padding: .32rem .5rem;
  border-radius: 10px; background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line));
  box-shadow: 0 6px 18px rgb(0 0 0 / .22); z-index: 6; pointer-events: none;
  display: flex; flex-direction: column; gap: .12rem; text-align: center;
}
.pet-bubble::after {
  content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 6px solid transparent; border-top-color: rgb(var(--c-surface));
}
.pet-bubble-text { font-size: 11px; line-height: 1.3; color: rgb(var(--c-ink)); white-space: normal; }
.pet-bubble-gain { font-size: 10px; font-weight: 800; color: rgb(var(--c-success)); }
.pet-bubble-enter-active { transition: opacity .2s ease, transform .2s ease; }
.pet-bubble-leave-active { transition: opacity .45s ease, transform .45s ease; }
.pet-bubble-enter-from { opacity: 0; transform: translateX(-50%) translateY(6px); }
.pet-bubble-leave-to { opacity: 0; transform: translateX(-50%) translateY(-6px); }
/* ★ S16-T4 偶遇气泡：accent 语义色边框 + 淡底，视觉区分「双角色偶遇」与「单角色 tap」 */
.pet-bubble.is-encounter {
  border-color: rgb(var(--c-accent) / .55);
  background: rgb(var(--c-accent-soft) / .96);
}
.pet-bubble.is-encounter::after { border-top-color: rgb(var(--c-accent-soft) / .96); }
.pet-bubble.is-encounter .pet-bubble-text { color: rgb(var(--c-accent-2)); }

/* ★ S16-T4 偶遇上浮符号（accent/highlight 语义色，非硬编码；轻轻上浮淡出） */
.encounter-spark {
  position: absolute; z-index: 7; transform: translate(-50%, -50%);
  font-size: 18px; line-height: 1; pointer-events: none;
  color: rgb(var(--c-highlight));
  text-shadow: 0 1px 3px rgb(0 0 0 / .28);
  animation: sparkfloat 2.2s ease-out forwards;
}
@keyframes sparkfloat {
  0%   { opacity: 0; transform: translate(-50%, -30%) scale(.6); }
  22%  { opacity: 1; transform: translate(-50%, -60%) scale(1.08); }
  100% { opacity: 0; transform: translate(-50%, -190%) scale(.9); }
}
/* transition-group 进出（与动画协同，卸载时不留残影） */
.spark-enter-active { transition: opacity .2s ease; }
.spark-leave-active { transition: opacity .4s ease; }
.spark-enter-from, .spark-leave-to { opacity: 0; }

/* 离线收益弹窗 */
.settle-pop { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / .5); padding: 1rem; }
.settle-card { background: rgb(var(--c-surface)); border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel); padding: 1.25rem 1.5rem; width: 100%; max-width: 320px; box-shadow: 0 10px 40px rgb(0 0 0 / .25); }
.settle-list { display: flex; flex-direction: column; gap: .5rem; }
.settle-list li { display: flex; align-items: center; justify-content: space-between; font-size: .9rem; color: rgb(var(--c-ink-2)); }
.settle-list li b { color: rgb(var(--c-accent)); font-size: 1rem; }

/* ★ S16-T12 高档里程碑 Crowning 隆重庆祝弹层（bond_4/5/6；finale=bond_6 命运最隆重）。
   颜色走语义令牌（accent/highlight），无 text-white 压浅底 / 无动态拼色类。光效纯 CSS @keyframes。 */
.crown-pop {
  position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center;
  background: rgb(0 0 0 / .58); padding: 1rem;
}
.crown-card {
  position: relative; overflow: hidden; text-align: center;
  width: 100%; max-width: 340px; padding: 1.6rem 1.4rem 1.4rem;
  border-radius: var(--sk-radius-panel);
  background:
    radial-gradient(120% 90% at 50% 0%, rgb(var(--c-highlight) / .22), transparent 60%),
    rgb(var(--c-surface));
  border: 1px solid rgb(var(--c-highlight) / .5);
  box-shadow: 0 18px 54px rgb(0 0 0 / .32), 0 0 0 1px rgb(var(--c-highlight) / .12) inset;
  animation: crownRise .42s cubic-bezier(.2, .9, .3, 1.15) both;
}
/* 背后旋转光芒（highlight 语义色，极淡，慢转） */
.crown-rays {
  position: absolute; top: -40%; left: 50%; width: 320px; height: 320px; margin-left: -160px;
  pointer-events: none; opacity: .5;
  background: conic-gradient(from 0deg,
    rgb(var(--c-highlight) / .18) 0deg, transparent 18deg, rgb(var(--c-highlight) / .18) 36deg,
    transparent 54deg, rgb(var(--c-highlight) / .18) 72deg, transparent 90deg,
    rgb(var(--c-highlight) / .18) 108deg, transparent 126deg, rgb(var(--c-highlight) / .18) 144deg,
    transparent 162deg, rgb(var(--c-highlight) / .18) 180deg, transparent 198deg);
  animation: crownSpin 14s linear infinite;
}
.crown-sparkles { position: absolute; inset: 0; pointer-events: none; }
.crown-sparkle {
  position: absolute; top: 50%; left: 50%; font-size: 14px; color: rgb(var(--c-highlight));
  opacity: 0; text-shadow: 0 1px 4px rgb(0 0 0 / .25);
  animation: crownSparkle 2.6s ease-out infinite;
  animation-delay: calc(var(--i) * .32s);
  transform-origin: center;
}
.crown-sparkle:nth-child(1) { transform: translate(-70px, -46px); }
.crown-sparkle:nth-child(2) { transform: translate(64px, -52px); }
.crown-sparkle:nth-child(3) { transform: translate(-84px, 30px); }
.crown-sparkle:nth-child(4) { transform: translate(80px, 22px); }
.crown-sparkle:nth-child(5) { transform: translate(-40px, -72px); }
.crown-sparkle:nth-child(6) { transform: translate(48px, 60px); }
.crown-kicker {
  position: relative; display: inline-block; margin-bottom: .7rem;
  font-size: .64rem; font-weight: 900; letter-spacing: .16em; text-transform: uppercase;
  color: rgb(var(--c-accent-2));
}
.crown-avatar-ring {
  position: relative; display: inline-flex; padding: 4px; border-radius: 50%;
  background: linear-gradient(140deg, rgb(var(--c-highlight)), rgb(var(--c-accent)));
  box-shadow: 0 0 0 4px rgb(var(--c-highlight) / .18), 0 8px 22px rgb(0 0 0 / .22);
  animation: crownGlow 2.4s ease-in-out infinite;
}
.crown-title {
  position: relative; margin: .85rem 0 .1rem; font-size: 1.5rem; font-weight: 900;
  color: rgb(var(--c-highlight)); letter-spacing: .01em;
}
.crown-name { position: relative; font-size: .82rem; font-weight: 800; color: rgb(var(--c-ink)); }
.crown-line {
  position: relative; margin: .55rem auto .95rem; max-width: 17rem; line-height: 1.5;
  font-size: .82rem; color: rgb(var(--c-ink-2));
}
.crown-close { position: relative; width: 100%; }
/* finale（bond_6 命运）再加最隆重一档：金光更强 + 卡边描金 + 大号称号 */
.crown-pop.is-finale .crown-card {
  border-color: rgb(var(--c-highlight) / .7);
  box-shadow: 0 22px 64px rgb(0 0 0 / .4), 0 0 46px rgb(var(--c-highlight) / .35), 0 0 0 1px rgb(var(--c-highlight) / .3) inset;
}
.crown-pop.is-finale .crown-rays { opacity: .8; animation-duration: 10s; }
.crown-pop.is-finale .crown-title { font-size: 1.75rem; }
.crown-pop.is-finale .crown-avatar-ring { box-shadow: 0 0 0 5px rgb(var(--c-highlight) / .28), 0 0 30px rgb(var(--c-highlight) / .5); }

@keyframes crownRise {
  from { opacity: 0; transform: translateY(18px) scale(.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes crownSpin { to { transform: rotate(360deg); } }
@keyframes crownGlow {
  0%, 100% { box-shadow: 0 0 0 4px rgb(var(--c-highlight) / .18), 0 8px 22px rgb(0 0 0 / .22); }
  50%      { box-shadow: 0 0 0 6px rgb(var(--c-highlight) / .32), 0 8px 26px rgb(0 0 0 / .26); }
}
@keyframes crownSparkle {
  0%   { opacity: 0; }
  30%  { opacity: 1; }
  100% { opacity: 0; }
}
/* 弹层进出（transition wrapper） */
.crown-pop-enter-active { transition: opacity .2s ease; }
.crown-pop-leave-active { transition: opacity .35s ease; }
.crown-pop-enter-from, .crown-pop-leave-to { opacity: 0; }

/* 桌面优先：窄屏时右栏落到场景下方，收纳仍单列堆叠不破版 */
@media (max-width: 1120px) {
  .homestead-shell { grid-template-columns: 1fr; }
  /* 单栏落地后可用更宽的横向空间：入住名单铺成自适应网格 */
  .resident-list { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
}
@media (max-width: 560px) {
  .hs-header { align-items: flex-start; flex-direction: column; }
  .homestead-shell { gap: .75rem; }
  .g-facil { grid-template-columns: 1fr; }
  .resident-list { grid-template-columns: 1fr; }
}
</style>
