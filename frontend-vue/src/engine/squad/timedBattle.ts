import { BASE_CRIT_RATE, calculateActionIntervalMs, DEFAULT_BATTLE_MODIFIERS } from './formulas';
import {
  activeStatuses,
  executeSkill,
  gainEnergy,
  getEffectiveStats,
  getSpeedModifier,
  hasActiveStatus,
  resolveSkillTargets,
} from './effects';
import { createStatefulSeededRng, type StatefulRng } from '../rng';
import { getAliveUnits, isAlive, selectTargets } from './targeting';
import type {
  BattleEndReason,
  ManualUltimateOrder,
  SquadSkillDef,
  SquadSkillKit,
  SquadUnitRuntime,
  SquadUnitSetup,
  TimedBattleEvent,
  TimedBattleInput,
  TimedBattleResult,
  TimedBattleState,
  TimedBattleWinner,
} from './types';

// SB-T1：时限常量导出（经 engine/index re-export 给 View），供倒计时 UI 与实战裁决同源，
// 禁 UI 硬编码 90000（坑 C-2）。
export const DEFAULT_MAX_TIME_MS = 90_000;
const DEFAULT_MAX_EVENTS = 5_000;

/** SB-T1：平局 HP% 比较容差——两侧 HP 总量比差 < ε 视为相等。 */
const HP_RATIO_EPSILON = 1e-6;
const DEFAULT_ULTIMATE_COST = 1000;

const defaultNormalAttack: SquadSkillDef = {
  id: 'normal_attack',
  name: '普攻',
  slot: 'normal',
  target: 'frontEnemy',
  effects: [{ type: 'damage', atkRatio: 1, spRatio: 0, canCrit: true }],
};

function normalizeSkill(slot: SquadSkillDef['slot'], skill?: SquadSkillDef): SquadSkillDef | undefined {
  if (!skill) return slot === 'normal' ? defaultNormalAttack : undefined;
  return { ...skill, slot };
}

function createSkillKit(skills: Partial<SquadSkillKit> | undefined): SquadSkillKit {
  return {
    normalAttack: normalizeSkill('normal', skills?.normalAttack) ?? defaultNormalAttack,
    skill1: normalizeSkill('skill1', skills?.skill1),
    passive: normalizeSkill('passive', skills?.passive),
    ultimate: normalizeSkill('ultimate', skills?.ultimate),
  };
}

// 简化（2026-07-03）：出战 kit 收成 普攻 + 专属技能(skill1) + 专属被动 + 大招，移除第二个主动技能 skill2。
function defaultInitialCooldown(): number {
  return 2000;
}

function defaultCooldown(): number {
  return 8000;
}

function createRuntimeUnit(setup: SquadUnitSetup): SquadUnitRuntime {
  const skills = createSkillKit(setup.skills);
  const unit: SquadUnitRuntime = {
    id: setup.id,
    name: setup.name,
    side: setup.side,
    position: setup.position,
    baseStats: setup.stats,
    currentHp: Math.min(setup.currentHp ?? setup.stats.hp, setup.stats.hp),
    maxHp: setup.stats.hp,
    energy: Math.min(1000, Math.max(0, setup.energy ?? 0)),
    skills,
    // SB-T3: 全体基础暴击 = BASE_CRIT_RATE，落在运行时单位 base critRate（DEFAULT 保持 0）；
    // setup.modifiers 若显式给了 critRate 则以其为准（覆盖基础值）。
    modifiers: { ...DEFAULT_BATTLE_MODIFIERS, critRate: BASE_CRIT_RATE, ...setup.modifiers },
    statuses: [],
    cooldownReadyAt: {
      skill1: skills.skill1?.initialCooldownMs ?? defaultInitialCooldown(),
      ultimate: 0,
    },
    nextActionAt: 0,
    defeatedAt: null,
  };
  unit.nextActionAt = calculateActionIntervalMs(getEffectiveStats(unit, 0).spd, getSpeedModifier(unit, 0));
  return unit;
}

function aliveBySide(state: TimedBattleState, side: 'player' | 'enemy'): SquadUnitRuntime[] {
  return getAliveUnits(state.units, side);
}

/**
 * SB-T1：某一侧的剩余 HP 总量比 = Σ currentHp / Σ maxHp（存活单位统计，含未落血者）。
 * 用于超时裁决在「存活数相等」时作 tie-break（避免「4 残血 vs 1 满血」被纯 HP% 误判）。
 */
function sideHpRatio(units: readonly SquadUnitRuntime[]): number {
  let current = 0;
  let max = 0;
  for (const unit of units) {
    current += Math.max(0, unit.currentHp);
    max += Math.max(1, unit.maxHp);
  }
  return max > 0 ? current / max : 0;
}

/**
 * SB-T1：超时/事件上限僵持时按「先比存活数、再比剩余 HP% 总量比」裁决，代替旧的一刀切判负。
 *  - 存活数占优 → 判胜；相等再比 HP%；HP% 也相等（差 < ε）→ 真平局。
 *  - 占优 → winner='player'/reason='timeoutWin'（走发奖）；劣势 → winner='enemy'/reason='timeoutLoss'；
 *    真平局 → winner='timeout'/reason='timeoutDraw'（复用 timeout 映射 + rewards 全 0，平局不发奖）。
 */
function resolveTimeout(
  players: readonly SquadUnitRuntime[],
  enemies: readonly SquadUnitRuntime[],
): { winner: TimedBattleWinner; reason: BattleEndReason } {
  if (players.length !== enemies.length) {
    return players.length > enemies.length
      ? { winner: 'player', reason: 'timeoutWin' }
      : { winner: 'enemy', reason: 'timeoutLoss' };
  }
  const playerRatio = sideHpRatio(players);
  const enemyRatio = sideHpRatio(enemies);
  if (Math.abs(playerRatio - enemyRatio) < HP_RATIO_EPSILON) {
    return { winner: 'timeout', reason: 'timeoutDraw' };
  }
  return playerRatio > enemyRatio
    ? { winner: 'player', reason: 'timeoutWin' }
    : { winner: 'enemy', reason: 'timeoutLoss' };
}

function battleEnd(state: TimedBattleState, maxTimeMs: number, eventLimitReached: boolean): { winner: TimedBattleWinner; reason: BattleEndReason } | null {
  const players = aliveBySide(state, 'player');
  const enemies = aliveBySide(state, 'enemy');
  if (players.length === 0 && enemies.length === 0) return { winner: 'player', reason: 'victory' };
  if (enemies.length === 0) return { winner: 'player', reason: 'victory' };
  if (players.length === 0) return { winner: 'enemy', reason: 'defeat' };
  if (eventLimitReached) return resolveTimeout(players, enemies);
  if (state.now >= maxTimeMs) return resolveTimeout(players, enemies);
  return null;
}

function nextActionAt(state: TimedBattleState): number {
  const times = state.units.filter(isAlive).map(unit => unit.nextActionAt);
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function nextStatusTickAt(state: TimedBattleState): number {
  // 只统计存活单位的下一跳——必须与 processStatusTicks 的 `if (!isAlive) continue` 一致。
  // 否则「带 hot/dot 时阵亡」的单位其 nextTickAt 永不推进（死者不结算跳），却仍被这里计入 →
  // nextAt 被钉在过去时刻、state.now 不前进、事件不增长 → 主循环死转（不阵亡不易触发，5v5 常见）。
  const times = state.units
    .filter(isAlive)
    .flatMap(unit => activeStatuses(unit, state.now).map(status => status.nextTickAt ?? Number.POSITIVE_INFINITY))
    .filter(time => Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function nextStatusExpiryAt(state: TimedBattleState): number {
  const times = state.units
    .flatMap(unit => activeStatuses(unit, state.now).map(status => status.expiresAt))
    .filter(time => Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function expireStatuses(state: TimedBattleState): void {
  for (const unit of state.units) {
    const before = unit.statuses;
    unit.statuses = unit.statuses.filter(status => status.expiresAt > state.now && (status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0));
    for (const status of before) {
      if (!unit.statuses.includes(status)) {
        state.events.push({ type: 'statusExpired', at: state.now, targetId: unit.id, status: status.kind });
      }
    }
  }
}

function defeatByStatusIfNeeded(state: TimedBattleState, unit: SquadUnitRuntime): void {
  if (unit.currentHp > 0 || unit.defeatedAt !== null) return;
  unit.currentHp = 0;
  unit.defeatedAt = state.now;
  state.events.push({ type: 'defeated', at: state.now, targetId: unit.id, by: null });
}

function processStatusTicks(state: TimedBattleState): void {
  for (const unit of state.units) {
    if (!isAlive(unit)) continue;
    for (const status of unit.statuses) {
      if (status.expiresAt < state.now) continue;
      if ((status.kind !== 'dot' && status.kind !== 'hot') || !status.nextTickAt || !status.tickIntervalMs) continue;
      while (status.nextTickAt <= state.now && status.nextTickAt <= status.expiresAt && isAlive(unit)) {
        const amount = Math.max(0, Math.floor(status.amount ?? 0));
        if (status.kind === 'dot') {
          unit.currentHp = Math.max(0, unit.currentHp - amount);
          state.events.push({ type: 'statusTick', at: state.now, targetId: unit.id, status: 'dot', amount, hpAfter: unit.currentHp });
          defeatByStatusIfNeeded(state, unit);
        } else {
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
          state.events.push({ type: 'statusTick', at: state.now, targetId: unit.id, status: 'hot', amount, hpAfter: unit.currentHp });
        }
        status.nextTickAt += status.tickIntervalMs;
      }
    }
  }
}

function canCastSpecial(unit: SquadUnitRuntime, now: number): boolean {
  return !hasActiveStatus(unit, 'stun', now) && !hasActiveStatus(unit, 'silence', now);
}

function shouldAutoUltimate(state: TimedBattleState, unit: SquadUnitRuntime): boolean {
  return unit.side === 'enemy' || state.autoUltimates;
}

function ultimateReady(unit: SquadUnitRuntime): boolean {
  const skill = unit.skills.ultimate;
  const cost = skill?.energyCost ?? DEFAULT_ULTIMATE_COST;
  return Boolean(skill) && unit.energy >= cost;
}

function chooseActionSkill(state: TimedBattleState, unit: SquadUnitRuntime): SquadSkillDef {
  if (shouldAutoUltimate(state, unit) && ultimateReady(unit) && canCastSpecial(unit, state.now)) {
    return unit.skills.ultimate as SquadSkillDef;
  }

  if (!hasActiveStatus(unit, 'stun', state.now) && !hasActiveStatus(unit, 'silence', state.now)) {
    if (unit.skills.skill1 && state.now >= unit.cooldownReadyAt.skill1) return unit.skills.skill1;
  }

  return unit.skills.normalAttack;
}

function spendUltimateEnergy(unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot !== 'ultimate') return;
  unit.energy = Math.max(0, unit.energy - (skill.energyCost ?? DEFAULT_ULTIMATE_COST));
}

function applyActionEnergy(state: TimedBattleState, unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot === 'normal') gainEnergy(state, unit, 90, 'action');
  if (skill.slot === 'skill1') gainEnergy(state, unit, 120, 'action');
}

function scheduleCooldown(state: TimedBattleState, unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot === 'skill1') unit.cooldownReadyAt.skill1 = state.now + (skill.cooldownMs ?? defaultCooldown());
  if (skill.slot === 'ultimate') unit.cooldownReadyAt.ultimate = state.now + (skill.cooldownMs ?? 0);
}

function scheduleNextAction(state: TimedBattleState, unit: SquadUnitRuntime): void {
  unit.nextActionAt = state.now + calculateActionIntervalMs(getEffectiveStats(unit, state.now).spd, getSpeedModifier(unit, state.now));
}

function processUnitAction(state: TimedBattleState, unit: SquadUnitRuntime): void {
  if (!isAlive(unit)) return;
  if (hasActiveStatus(unit, 'stun', state.now)) {
    state.events.push({ type: 'actionSkipped', at: state.now, actorId: unit.id, reason: 'stun' });
    scheduleNextAction(state, unit);
    return;
  }

  const skill = chooseActionSkill(state, unit);
  if (selectTargets(state.units, unit, skill.target, state.now).length === 0) {
    state.events.push({ type: 'actionSkipped', at: state.now, actorId: unit.id, reason: 'noTarget' });
    scheduleNextAction(state, unit);
    return;
  }

  state.events.push({ type: 'action', at: state.now, actorId: unit.id, skillId: skill.id, skillName: skill.name, slot: skill.slot });
  spendUltimateEnergy(unit, skill);
  executeSkill(state, unit, skill);
  applyActionEnergy(state, unit, skill);
  scheduleCooldown(state, unit, skill);
  scheduleNextAction(state, unit);
}

function processActions(state: TimedBattleState): void {
  const actors = state.units
    .filter(unit => isAlive(unit) && unit.nextActionAt <= state.now)
    .sort((a, b) => a.nextActionAt - b.nextActionAt || a.id.localeCompare(b.id));

  for (const actor of actors) {
    processUnitAction(state, actor);
  }
}

function processManualUltimates(state: TimedBattleState, orders: readonly ManualUltimateOrder[], orderIndex: { value: number }): void {
  while (orderIndex.value < orders.length && orders[orderIndex.value].atMs <= state.now) {
    const order = orders[orderIndex.value++];
    const unit = state.units.find(u => u.id === order.unitId);
    if (!unit || !isAlive(unit) || !unit.skills.ultimate) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: order.unitId, reason: 'missingSkill' });
      continue;
    }
    if (!ultimateReady(unit)) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: unit.id, reason: 'notReady' });
      continue;
    }
    if (!canCastSpecial(unit, state.now)) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: unit.id, reason: 'controlled' });
      continue;
    }

    const skill = unit.skills.ultimate;
    // SB-T2（拍板 3/5）：单体大招优先命中 order.targetId 指定的存活敌方单位；AOE/self/己方组忽略覆盖；
    // 死目标 → executeSkill 内 resolveSkillTargets 回退默认 selector（不空放）。
    // 回退后仍无合法目标 → executeSkill 返回 false → 判 manualUltimateFailed（不扣能量，spend 在此前但仅对可释放者）。
    // 注意：为避免「死目标空放扣能量」，先探测是否有可命中目标，无目标则判 failed 不扣能量。
    const hasTarget = resolveSkillTargets(state, unit, skill.target, state.now, order.targetId).length > 0
      || skill.effects.some(effect => resolveSkillTargets(state, unit, effect.target ?? skill.target, state.now, order.targetId).length > 0);
    if (!hasTarget) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: unit.id, reason: 'noTarget' });
      continue;
    }
    state.events.push({ type: 'action', at: state.now, actorId: unit.id, skillId: skill.id, skillName: skill.name, slot: 'ultimate' });
    spendUltimateEnergy(unit, skill);
    executeSkill(state, unit, skill, order.targetId);
    scheduleCooldown(state, unit, skill);
  }
}

function nextManualAt(orders: readonly ManualUltimateOrder[], orderIndex: number): number {
  return orders[orderIndex]?.atMs ?? Number.POSITIVE_INFINITY;
}

export function createTimedBattleState(input: TimedBattleInput): TimedBattleState {
  const state: TimedBattleState = {
    now: 0,
    units: input.units.map(createRuntimeUnit),
    events: [{ type: 'battleStart', at: 0 }],
    rng: input.rng,
    autoUltimates: input.autoUltimates ?? true,
  };
  for (const unit of state.units) {
    const passive = unit.skills.passive;
    if (!passive) continue;
    if (executeSkill(state, unit, passive)) {
      state.events.push({ type: 'passiveActivated', at: 0, actorId: unit.id, skillId: passive.id, skillName: passive.name });
    }
  }
  return state;
}

/**
 * SB-T2（拍板 1/2）：前缀冻结平滑推进的运行时快照。
 * 记录一次「完整迭代边界」（该 tick 全部处理完）后的战斗状态，使重算/续跑能从此边界续接：
 *  - atMs：该边界的 state.now（快照代表「≤ atMs 的事件已全部落定」）。
 *  - rngState：StatefulRng 内部状态（mulberry32 累加器）——续跑承接同一随机流，不从 seed 头部重建。
 *  - units：深拷贝的运行时单位（skills 定义不可变故浅引用，其余深拷贝）。
 *  - eventsLength：前缀事件条数（快照点已呈现的事件前缀长度）。
 *  - orderIndex：手动大招命令消费游标。
 */
interface BattleCheckpoint {
  atMs: number;
  rngState: number;
  units: SquadUnitRuntime[];
  eventsLength: number;
  orderIndex: number;
}

/** 深拷贝运行时单位（skills 定义在战斗内不可变，浅引用；其余可变字段深拷贝）。 */
function cloneUnit(unit: SquadUnitRuntime): SquadUnitRuntime {
  return {
    ...unit,
    baseStats: { ...unit.baseStats },
    modifiers: { ...unit.modifiers },
    statuses: unit.statuses.map(status => ({ ...status })),
    cooldownReadyAt: { ...unit.cooldownReadyAt },
  };
}

function cloneUnits(units: readonly SquadUnitRuntime[]): SquadUnitRuntime[] {
  return units.map(cloneUnit);
}

interface BattleLoopResult {
  end: { winner: TimedBattleWinner; reason: BattleEndReason };
  checkpoints: BattleCheckpoint[];
}

/**
 * SB-T2：可续跑的战斗主循环。
 * 每完成一次迭代（把 state.now 推进到下一事件时刻并处理完），登记一个 checkpoint，
 * 供 resumeTimedBattle 从「≤ resumeFromMs 的最后一个干净边界」承接（前缀冻结 + RNG 状态承接）。
 * 修改本循环规则前先看 timedBattle.test.ts:261-291 auto/manual ultimate 护栏（架构铁律）。
 */
function runBattleLoop(
  state: TimedBattleState,
  rng: StatefulRng,
  manualOrders: readonly ManualUltimateOrder[],
  orderIndex: { value: number },
  maxTimeMs: number,
  maxEvents: number,
  collectCheckpoints: boolean,
): BattleLoopResult {
  const checkpoints: BattleCheckpoint[] = [];

  // 安全阀（防浏览器死锁）：正常战斗迭代数 = 事件时刻数，远小于此。若 state.now 因任何未来 bug
  // 停止前进（如死者残留 hot/dot 的幽灵跳把 nextAt 钉在过去），此处强制推进到 maxTimeMs 走超时裁决，
  // 而不是同步死循环卡死主线程（客户端引擎里死循环 = 整个页面冻结、连 F12 都按不了）。
  // 上限按最坏情形留足余量：maxTimeMs 内每 1ms 一个事件（90000）× 单位数 × 状态数的宽松倍数。
  const MAX_ITERATIONS = 2_000_000;
  let iterations = 0;
  let lastNow = -1;
  let end = battleEnd(state, maxTimeMs, false);
  while (!end) {
    const nextAt = Math.min(
      maxTimeMs,
      nextManualAt(manualOrders, orderIndex.value),
      nextStatusTickAt(state),
      nextStatusExpiryAt(state),
      nextActionAt(state),
    );

    // 时间必须严格前进；若 nextAt 不前进（<= 上一 now）或非有限，直接跳到 maxTimeMs 收尾，绝不原地打转。
    if (!Number.isFinite(nextAt) || nextAt <= lastNow) {
      state.now = maxTimeMs;
    } else {
      state.now = nextAt;
    }
    lastNow = state.now;

    if (++iterations > MAX_ITERATIONS) {
      state.now = maxTimeMs; // 迭代护栏兜底：强制超时裁决，宁可判个超时也不冻结页面。
      end = battleEnd(state, maxTimeMs, true) ?? resolveTimeout(aliveBySide(state, 'player'), aliveBySide(state, 'enemy'));
      break;
    }

    processStatusTicks(state);
    expireStatuses(state);
    processManualUltimates(state, manualOrders, orderIndex);
    processActions(state);

    if (collectCheckpoints) {
      checkpoints.push({
        atMs: state.now,
        rngState: rng.snapshot(),
        units: cloneUnits(state.units),
        eventsLength: state.events.length,
        orderIndex: orderIndex.value,
      });
    }

    end = battleEnd(state, maxTimeMs, state.events.length >= maxEvents);
  }

  return { end, checkpoints };
}

/**
 * SB-T2：完整（从 t=0）模拟一场战斗。生产/塔战/测试三条消费端主入口。
 * 若需在演出中手动开大 / 切换自动大招后「无跳变」续跑，改用 resumeTimedBattle（前缀冻结）。
 */
export function simulateTimedBattle(input: TimedBattleInput): TimedBattleResult {
  const maxTimeMs = input.maxTimeMs ?? DEFAULT_MAX_TIME_MS;
  const maxEvents = input.maxEvents ?? DEFAULT_MAX_EVENTS;
  const state = createTimedBattleState(input);
  const manualOrders = [...(input.manualUltimateOrders ?? [])].sort((a, b) => a.atMs - b.atMs);
  const orderIndex = { value: 0 };

  // 快照续跑要求 StatefulRng；调用方可传任意 RNG，但只有 StatefulRng 能被 resume 承接状态。
  const rng = state.rng as StatefulRng;
  const canSnapshot = typeof rng.snapshot === 'function';

  const { end } = runBattleLoop(state, rng, manualOrders, orderIndex, maxTimeMs, maxEvents, canSnapshot);

  state.events.push({ type: 'battleEnd', at: state.now, winner: end.winner, reason: end.reason });
  return {
    winner: end.winner,
    reason: end.reason,
    elapsedMs: state.now,
    units: state.units,
    events: state.events,
  };
}

export interface ResumeTimedBattleInput {
  /** 战斗种子（重建同一 StatefulRng 随机流）。 */
  seed: number;
  units: readonly SquadUnitSetup[];
  autoUltimates: boolean;
  /** 新的完整手动大招命令集（含刚插入的那条；engine 内部排序 + 前缀冻结续跑）。 */
  manualUltimateOrders: readonly ManualUltimateOrder[];
  /** 已回放到的时刻——`at <= resumeFromMs` 的事件前缀一字不改（拍板 1）。 */
  resumeFromMs: number;
  maxTimeMs?: number;
  maxEvents?: number;
}

/**
 * SB-T2（拍板 1/2/6）核心：**前缀冻结 + RNG 状态承接**的平滑续跑。
 *
 * 无跳变的充要条件 = 「已呈现（回放到 resumeFromMs）的事件前缀一字不改，重算只影响 resumeFromMs 之后」。
 * 本函数据此实现：
 *  1. 先以完整 seed 跑一遍并逐迭代登记 checkpoint（含 RNG 快照 + 单位深拷贝 + 前缀事件长度）；
 *  2. 取「atMs <= resumeFromMs 的最后一个 checkpoint」作为分叉点，**冻结**其之前的事件前缀（slice 直接复用）；
 *  3. 从该 checkpoint 恢复单位状态 + RNG 状态 + 命令游标，带**新命令集**只重算 resumeFromMs 之后的后缀。
 *
 * 关键卫生（拍板 2）：RNG 承接「消费到分叉点为止的状态」而非从 seed 头部重建 —— 使插入命令后的后缀错位
 * **不回溯污染**已呈现前缀的随机结果（选目标改变暴击/击杀/能量连锁时，前缀仍字节一致）。
 * 这让「选目标」与「无跳变」成为同一干净机制的两个结果（research 方案 A），而非「碰巧不跳→一定跳」的半死系统。
 *
 * 边界（拍板 5）：新命令若 atMs > maxTimeMs（超时后 pending），因 nextManualAt 被 Math.min(maxTimeMs,…) 夹住
 * 而永不生效，不改变超时裁决（SB-T1 三态）——由测试锁死。
 *
 * engine 纯净：零 Vue/Pinia/DOM/Math.random（RNG 走注入的 StatefulSeededRng），零存档触点。
 */
export function resumeTimedBattle(input: ResumeTimedBattleInput): TimedBattleResult {
  const maxTimeMs = input.maxTimeMs ?? DEFAULT_MAX_TIME_MS;
  const maxEvents = input.maxEvents ?? DEFAULT_MAX_EVENTS;
  const manualOrders = [...input.manualUltimateOrders].sort((a, b) => a.atMs - b.atMs);

  // 第一遍：用「无新命令」的原始基线跑满并采集 checkpoint。基线命令 = 只保留 atMs <= resumeFromMs 的旧命令，
  // 保证「resumeFromMs 之前」的前缀与玩家已经看到的演出一致（新命令一律在 resumeFromMs 之后）。
  const baselineOrders = manualOrders.filter(order => order.atMs <= input.resumeFromMs);
  const baseRng = createStatefulSeededRng(input.seed);
  const baseState: TimedBattleState = {
    now: 0,
    units: input.units.map(createRuntimeUnit),
    events: [{ type: 'battleStart', at: 0 }],
    rng: baseRng,
    autoUltimates: input.autoUltimates,
  };
  for (const unit of baseState.units) {
    const passive = unit.skills.passive;
    if (!passive) continue;
    if (executeSkill(baseState, unit, passive)) {
      baseState.events.push({ type: 'passiveActivated', at: 0, actorId: unit.id, skillId: passive.id, skillName: passive.name });
    }
  }
  const baseOrderIndex = { value: 0 };
  const { checkpoints } = runBattleLoop(
    baseState,
    baseRng,
    baselineOrders,
    baseOrderIndex,
    maxTimeMs,
    maxEvents,
    true,
  );

  // 取「atMs <= resumeFromMs 的最后一个 checkpoint」作分叉点；无则从 t=0 重跑（resumeFromMs < 首个事件）。
  let fork: BattleCheckpoint | null = null;
  for (const checkpoint of checkpoints) {
    if (checkpoint.atMs <= input.resumeFromMs) fork = checkpoint;
    else break;
  }

  const resumeRng = createStatefulSeededRng(input.seed);
  let resumeState: TimedBattleState;
  let resumeOrderIndex: { value: number };
  let frozenPrefix: TimedBattleEvent[];

  if (fork) {
    resumeRng.restore(fork.rngState);
    resumeState = {
      now: fork.atMs,
      units: cloneUnits(fork.units),
      events: [], // 前缀冻结：分叉点之前的事件直接复用基线切片，不重放。
      rng: resumeRng,
      autoUltimates: input.autoUltimates,
    };
    frozenPrefix = baseState.events.slice(0, fork.eventsLength);
    // 命令游标：跳过所有 atMs <= 分叉时刻的命令（它们已在冻结前缀里生效），从新命令集重新对齐。
    resumeOrderIndex = { value: 0 };
    while (resumeOrderIndex.value < manualOrders.length && manualOrders[resumeOrderIndex.value].atMs <= fork.atMs) {
      resumeOrderIndex.value++;
    }
  } else {
    // resumeFromMs 落在首个事件之前：无可冻结前缀，从头带新命令跑（等价一次全量重算）。
    resumeState = {
      now: 0,
      units: input.units.map(createRuntimeUnit),
      events: [{ type: 'battleStart', at: 0 }],
      rng: resumeRng,
      autoUltimates: input.autoUltimates,
    };
    for (const unit of resumeState.units) {
      const passive = unit.skills.passive;
      if (!passive) continue;
      if (executeSkill(resumeState, unit, passive)) {
        resumeState.events.push({ type: 'passiveActivated', at: 0, actorId: unit.id, skillId: passive.id, skillName: passive.name });
      }
    }
    frozenPrefix = [];
    resumeOrderIndex = { value: 0 };
  }

  const { end } = runBattleLoop(
    resumeState,
    resumeRng,
    manualOrders,
    resumeOrderIndex,
    maxTimeMs,
    maxEvents,
    false,
  );

  const events = [...frozenPrefix, ...resumeState.events];
  events.push({ type: 'battleEnd', at: resumeState.now, winner: end.winner, reason: end.reason });
  return {
    winner: end.winner,
    reason: end.reason,
    elapsedMs: resumeState.now,
    units: resumeState.units,
    events,
  };
}
