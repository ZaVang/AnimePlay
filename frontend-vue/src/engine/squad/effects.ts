import {
  calculateTimedDamage,
  calculateTimedHeal,
  calculateTimedShield,
  energyFromDamage,
  DEFAULT_BATTLE_MODIFIERS,
} from './formulas';
import { selectTargets } from './targeting';
import type {
  BattleModifiers,
  SkillEffect,
  SquadPosition,
  SquadSkillDef,
  SquadUnitRuntime,
  StatusKind,
  StatusRuntime,
  StatusSpec,
  TargetSelector,
  TimedBattleEvent,
  TimedBattleState,
} from './types';
import type { BattleStats } from './combat';

const NEGATIVE_STATUSES: readonly StatusKind[] = ['atkDown', 'defDown', 'spDown', 'slow', 'stun', 'silence', 'taunt', 'dot'];
const POSITIVE_STATUSES: readonly StatusKind[] = ['shield', 'atkUp', 'defUp', 'spUp', 'haste', 'critRateUp', 'hot'];

/**
 * SB-T5: 同类可叠加 buff 改按来源累加设上限（原 Math.max → Σ per source + clamp）。
 * 每 kind 上限 ≥ 现有单条最大幅度的 ~1.3-1.5 倍（squadSkillKits 现有单条最大：
 * atkUp 0.45 / critRateUp 0.25 / spUp 0.28 / atkDown 0.35 / defDown 0.2 / haste 0.2 / slow 0.25 / defUp 0.1），
 * 让双辅助累加有正收益空间又不失控、且不让现有单条招牌 buff 就触顶。
 * 控制类（stun/silence/taunt）不在此表——走布尔存在性判定，不经数值聚合；
 * shield/dot/hot 逐条独立结算，绝不进 sum-clamp。
 */
const STACKABLE_STATUS_CAPS: Readonly<Partial<Record<StatusKind, number>>> = {
  atkUp: 0.6,
  defUp: 0.6,
  spUp: 0.6,
  haste: 0.5,
  critRateUp: 0.5,
  atkDown: 0.6,
  defDown: 0.6,
  spDown: 0.6,
  slow: 0.5,
};

/**
 * 共享纯 helper：把同 kind 多来源的数值按来源求和，再按该 kind 上限 clamp。
 * 供 maxRuntimeStatusValue（旧 RuntimeStatus 数组 API）与 maxStatusAmount（实战主路径）两处调用，
 * 保证「测试口径」与「实战口径」一致（拍板 6）。未在上限表内的 kind 不 clamp（返回原始和）。
 */
export function sumStackableStatusValues(values: readonly number[], kind: StatusKind): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  const cap = STACKABLE_STATUS_CAPS[kind];
  return cap === undefined ? sum : Math.min(cap, sum);
}

/**
 * SB-T4：前中后排真实机制 —— 后排/中排承受**单体**伤害时按站位减伤。
 * 兑现 UI 已摆的前中后排槽位承诺（P2-1）：让「前排顶伤、后排站桩」的编队博弈成立。
 *  - front 系数 = 1.0（关键：既有测试单位默认 position:'front'，front 无减伤 → 现有伤害断言天然不变）。
 *  - middle ×0.95 / back ×0.85：温和档，后排明显更耐打又不至于让前排无人愿站，
 *    避开颠覆现有塔敌/我方 base atk ~50-300 量级平衡。
 *  - 仅对单体伤害生效；AOE（allEnemies/allAllies）不减伤（后排躲不过群体，符合站位取舍直觉）。
 * 纯 engine 常量（不 import config）；确定系数，不涉 RNG。
 */
export const POSITION_DAMAGE_TAKEN: Readonly<Record<SquadPosition, number>> = {
  front: 1,
  middle: 0.95,
  back: 0.85,
};

/** SB-T4：群体 selector —— 命中这些 selector 的伤害视为 AOE，不吃站位减伤。含问题③的分排选择器。 */
const AOE_SELECTORS: readonly TargetSelector[] = [
  'allEnemies', 'allAllies', 'frontRowEnemies', 'middleRowEnemies', 'backRowEnemies',
];

export function isAoeSelector(selector: TargetSelector): boolean {
  return AOE_SELECTORS.includes(selector);
}

/**
 * SB-T2（拍板 3）：单体「敌方」selector 白名单——只有这些 selector 允许被手动大招 `targetId` 覆盖。
 * AOE / self / 己方群体 / 单个己方治疗（lowestHpAlly/firstDefeatedAlly）**不允许覆盖**：
 * 「选目标」是「对敌单体大招」的操作杠杆，越界覆盖会让治疗/自增益乱指，是反直觉的假 affordance。
 */
const SINGLE_ENEMY_SELECTORS: readonly TargetSelector[] = [
  'frontEnemy',
  'lowestHpEnemy',
  'highestAtkEnemy',
  'backEnemy',
];

/**
 * SB-T2（拍板 3）：某个 selector 是否可被手动 `targetId` 覆盖（供 engine 覆盖规则与 UI 亮起条件同一口径）。
 * UI 侧判「这个大招能否选目标」必须复用此函数，禁另造一套判据（防 UI 承诺选目标而 engine 全体命中）。
 */
export function canOverrideTarget(selector: TargetSelector): boolean {
  return SINGLE_ENEMY_SELECTORS.includes(selector);
}

/**
 * SB-T2（拍板 6）：统一的目标解析 helper——auto（selector）与 manual（`overrideTargetId` 覆盖）
 * 两条路径共用，避免 effects 长出两套目标逻辑打架（沿 SB-T5「两套聚合一致改」同类教训）。
 *
 *  - 无覆盖 / selector 不可覆盖（AOE/self/己方组）→ 走原 selector 解析。
 *  - 有覆盖且 selector 可覆盖（单体敌方）→ 命中所选**存活**单位；
 *    若所选目标已阵亡/不存在（死目标）→ **回退**默认 selector 解析（不空放，拍板 5）。
 * 复用 `selectTargets` 的现有解析，绝不重复解析出分歧（坑 C-3）。
 */
export function resolveSkillTargets(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  selector: TargetSelector,
  now: number,
  overrideTargetId?: string,
): SquadUnitRuntime[] {
  if (overrideTargetId && canOverrideTarget(selector)) {
    const chosen = state.units.find(unit => unit.id === overrideTargetId);
    if (chosen && chosen.side !== actor.side && chosen.currentHp > 0 && chosen.defeatedAt === null) {
      return [chosen];
    }
    // 死目标 / 非敌方 / 不存在 → 回退默认 selector（拍板 5）。
  }
  return selectTargets(state.units, actor, selector, now);
}

/**
 * SB-T4：按目标站位对单体伤害施减伤系数。AOE 直接返回原伤害。
 * amount 已是 calculateTimedDamage 产物（≥1）；系数相乘后 floor 并保底 ≥1（与公式口径一致，避免归零）。
 */
export function applyPositionDamageTaken(amount: number, position: SquadPosition, isAoe: boolean): number {
  if (isAoe) return amount;
  const factor = POSITION_DAMAGE_TAKEN[position] ?? 1;
  if (factor === 1) return amount;
  return Math.max(1, Math.floor(amount * factor));
}

export interface RuntimeStatus {
  id: string;
  type: StatusKind;
  value: number;
  appliedAtMs: number;
  expiresAtMs: number;
  tickIntervalMs?: number;
  nextTickAtMs?: number;
}

export interface RuntimeStatusSpec {
  id: string;
  type: StatusKind;
  value: number;
  durationMs: number;
  tickIntervalMs?: number;
}

export function activeStatusesAt(statuses: readonly RuntimeStatus[], now: number): RuntimeStatus[] {
  return statuses.filter(status => status.expiresAtMs > now);
}

function maxRuntimeStatusValue(statuses: readonly RuntimeStatus[], kind: StatusKind, now: number): number {
  const values = activeStatusesAt(statuses, now)
    .filter(status => status.type === kind)
    .map(status => status.value);
  return sumStackableStatusValues(values, kind);
}

export function hasStatus(statuses: readonly RuntimeStatus[], kind: StatusKind, now: number): boolean {
  return activeStatusesAt(statuses, now).some(status => status.type === kind);
}

export function getSpeedMultiplier(statuses: readonly RuntimeStatus[], now: number): number {
  return Math.max(0.1, 1 + maxRuntimeStatusValue(statuses, 'haste', now) - maxRuntimeStatusValue(statuses, 'slow', now));
}

export function getCritRateBonus(statuses: readonly RuntimeStatus[], now: number): number {
  return maxRuntimeStatusValue(statuses, 'critRateUp', now);
}

export function calculateEffectiveStats(base: BattleStats, statuses: readonly RuntimeStatus[], now: number): BattleStats {
  const atkMod = 1 + maxRuntimeStatusValue(statuses, 'atkUp', now) - maxRuntimeStatusValue(statuses, 'atkDown', now);
  const defMod = 1 + maxRuntimeStatusValue(statuses, 'defUp', now) - maxRuntimeStatusValue(statuses, 'defDown', now);
  const spMod = 1 + maxRuntimeStatusValue(statuses, 'spUp', now) - maxRuntimeStatusValue(statuses, 'spDown', now);
  return {
    hp: base.hp,
    atk: Math.max(1, Math.floor(base.atk * atkMod)),
    def: Math.max(0, Math.floor(base.def * defMod)),
    sp: Math.max(0, Math.floor(base.sp * spMod)),
    spd: base.spd,
  };
}

function addRuntimeStatus(
  statuses: readonly RuntimeStatus[],
  spec: RuntimeStatusSpec,
  now: number,
): RuntimeStatus[] {
  const next: RuntimeStatus = {
    id: spec.id,
    type: spec.type,
    value: spec.value,
    appliedAtMs: now,
    expiresAtMs: now + spec.durationMs,
  };
  if (spec.tickIntervalMs) {
    next.tickIntervalMs = spec.tickIntervalMs;
    next.nextTickAtMs = now + spec.tickIntervalMs;
  }
  return [...statuses, next];
}

export function activeStatuses(unit: SquadUnitRuntime, now: number): StatusRuntime[] {
  return unit.statuses.filter(status => status.expiresAt > now && (status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0));
}

function maxStatusAmount(unit: SquadUnitRuntime, kind: StatusKind, now: number): number {
  const amounts = activeStatuses(unit, now)
    .filter(status => status.kind === kind)
    .map(status => status.amount ?? 0);
  return sumStackableStatusValues(amounts, kind);
}

export function hasActiveStatus(unit: SquadUnitRuntime, kind: StatusKind, now: number): boolean {
  return activeStatuses(unit, now).some(status => status.kind === kind);
}

export function getEffectiveStats(unit: SquadUnitRuntime, now: number): BattleStats {
  const atkMod = 1 + maxStatusAmount(unit, 'atkUp', now) - maxStatusAmount(unit, 'atkDown', now);
  const defMod = 1 + maxStatusAmount(unit, 'defUp', now) - maxStatusAmount(unit, 'defDown', now);
  const spMod = 1 + maxStatusAmount(unit, 'spUp', now) - maxStatusAmount(unit, 'spDown', now);
  return {
    hp: unit.baseStats.hp,
    atk: Math.max(1, Math.floor(unit.baseStats.atk * atkMod)),
    def: Math.max(0, Math.floor(unit.baseStats.def * defMod)),
    sp: Math.max(0, Math.floor(unit.baseStats.sp * spMod)),
    spd: unit.baseStats.spd,
  };
}

export function getEffectiveModifiers(unit: SquadUnitRuntime, now: number): BattleModifiers {
  return {
    ...DEFAULT_BATTLE_MODIFIERS,
    ...unit.modifiers,
    critRate: (unit.modifiers.critRate ?? DEFAULT_BATTLE_MODIFIERS.critRate) + maxStatusAmount(unit, 'critRateUp', now),
  };
}

export function getSpeedModifier(unit: SquadUnitRuntime, now: number): { haste: number; slow: number } {
  return {
    haste: maxStatusAmount(unit, 'haste', now),
    slow: maxStatusAmount(unit, 'slow', now),
  };
}

export function gainEnergy(
  state: TimedBattleState,
  target: SquadUnitRuntime,
  amount: number,
  reason: Extract<TimedBattleEvent, { type: 'energy' }>['reason'],
): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  target.energy = Math.min(1000, target.energy + Math.floor(amount));
  state.events.push({ type: 'energy', at: state.now, targetId: target.id, amount: Math.floor(amount), energyAfter: target.energy, reason });
}

function defeatIfNeeded(state: TimedBattleState, target: SquadUnitRuntime, by: string | null): void {
  if (target.currentHp > 0 || target.defeatedAt !== null) return;
  target.currentHp = 0;
  target.defeatedAt = state.now;
  state.events.push({ type: 'defeated', at: state.now, targetId: target.id, by });
}

export function dealDamage(
  state: TimedBattleState,
  actor: SquadUnitRuntime | null,
  target: SquadUnitRuntime,
  amount: number,
  isCritical: boolean,
): void {
  if (amount <= 0 || target.currentHp <= 0) return;

  let remaining = amount;
  let absorbed = 0;
  for (const shield of target.statuses.filter(status => status.kind === 'shield' && status.expiresAt > state.now && (status.shieldRemaining ?? 0) > 0)) {
    const spend = Math.min(remaining, shield.shieldRemaining ?? 0);
    shield.shieldRemaining = (shield.shieldRemaining ?? 0) - spend;
    remaining -= spend;
    absorbed += spend;
    if (remaining <= 0) break;
  }

  target.statuses = target.statuses.filter(status => status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0);
  const hpDamage = Math.min(target.currentHp, remaining);
  target.currentHp = Math.max(0, target.currentHp - hpDamage);
  state.events.push({
    type: 'damage',
    at: state.now,
    actorId: actor?.id ?? 'status',
    targetId: target.id,
    amount: hpDamage,
    hpAfter: target.currentHp,
    isCritical,
    absorbed,
  });

  // 受击充能 × 定位系数（onHit）：坦克受击充能快、后排慢（问题②，由 View 注入）。
  gainEnergy(state, target, energyFromDamage(hpDamage, target.maxHp) * target.energyGain.onHit, 'damage');
  defeatIfNeeded(state, target, actor?.id ?? null);
  if (target.defeatedAt === state.now && actor) {
    gainEnergy(state, actor, 120 * actor.energyGain.onAttack, 'kill');
  }
}

function healTarget(state: TimedBattleState, actor: SquadUnitRuntime, target: SquadUnitRuntime, amount: number): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
  state.events.push({ type: 'heal', at: state.now, actorId: actor.id, targetId: target.id, amount, hpAfter: target.currentHp });
}

function statusRuntime(actor: SquadUnitRuntime, target: SquadUnitRuntime, spec: StatusSpec, now: number): StatusRuntime {
  const sourceId = spec.sourceId ?? actor.id;
  const tickIntervalMs = spec.tickIntervalMs;
  return {
    ...spec,
    sourceId,
    id: `${spec.kind}:${sourceId}:${target.id}`,
    appliedAt: now,
    expiresAt: now + spec.durationMs,
    nextTickAt: tickIntervalMs ? now + tickIntervalMs : undefined,
  };
}

function applyBattleStatus(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  spec: StatusSpec,
): void {
  if (target.currentHp <= 0) return;
  const runtime = statusRuntime(actor, target, spec, state.now);
  const existing = target.statuses.find(status => status.id === runtime.id);
  if (existing && spec.kind !== 'shield' && spec.kind !== 'dot' && spec.kind !== 'hot') {
    existing.amount = spec.amount ?? existing.amount;
    existing.expiresAt = runtime.expiresAt;
    existing.nextTickAt = runtime.nextTickAt;
  } else {
    target.statuses.push(runtime);
  }
  state.events.push({
    type: 'statusApplied',
    at: state.now,
    actorId: actor.id,
    targetId: target.id,
    status: spec.kind,
    amount: spec.amount ?? 0,
    expiresAt: runtime.expiresAt,
  });
}

export function applyStatus(statuses: readonly RuntimeStatus[], spec: RuntimeStatusSpec, now: number): RuntimeStatus[];
export function applyStatus(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  spec: StatusSpec,
): void;
export function applyStatus(
  first: TimedBattleState | readonly RuntimeStatus[],
  second: SquadUnitRuntime | RuntimeStatusSpec,
  third: SquadUnitRuntime | number,
  fourth?: StatusSpec,
): RuntimeStatus[] | void {
  if (Array.isArray(first)) {
    return addRuntimeStatus(first, second as RuntimeStatusSpec, third as number);
  }

  applyBattleStatus(first as TimedBattleState, second as SquadUnitRuntime, third as SquadUnitRuntime, fourth as StatusSpec);
}

function addShield(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  amount: number,
  durationMs: number,
): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  const shield = statusRuntime(actor, target, { kind: 'shield', amount, durationMs }, state.now);
  shield.shieldRemaining = amount;
  target.statuses.push(shield);
  state.events.push({ type: 'shield', at: state.now, actorId: actor.id, targetId: target.id, amount, expiresAt: shield.expiresAt });
}

function removeStatuses(
  target: SquadUnitRuntime,
  kinds: readonly StatusKind[],
  now: number,
): StatusRuntime[] {
  const removed: StatusRuntime[] = [];
  target.statuses = target.statuses.filter(status => {
    const shouldRemove = status.expiresAt > now && kinds.includes(status.kind);
    if (shouldRemove) removed.push(status);
    return !shouldRemove;
  });
  return removed;
}

function executeEffect(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  skill: SquadSkillDef,
  effect: SkillEffect,
  overrideTargetId?: string,
): boolean {
  // SB-T4：单体/AOE 判据复用同一已解析 selector 表达式（scout 坑 C-3），避免重复解析出分歧。
  const resolvedSelector = effect.target ?? skill.target;
  // SB-T2（拍板 3/6）：手动大招 targetId 只覆盖单体敌方 selector 的「命中谁」，
  // 不改变「是否 AOE」——isAoe 仍以 resolvedSelector 判定（AOE selector 忽略覆盖、后排照吃）。
  const targets = resolveSkillTargets(state, actor, resolvedSelector, state.now, overrideTargetId);
  if (targets.length === 0) return false;

  const isAoe = isAoeSelector(resolvedSelector);

  for (const target of targets) {
    switch (effect.type) {
      case 'damage': {
        const damage = calculateTimedDamage({
          attacker: getEffectiveStats(actor, state.now),
          defender: getEffectiveStats(target, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          defenderModifiers: getEffectiveModifiers(target, state.now),
          rng: state.rng,
          atkRatio: effect.atkRatio,
          spRatio: effect.spRatio,
          flatPower: effect.flatPower,
          canCrit: effect.canCrit,
        });
        // SB-T4：后排/中排承受单体伤害按站位减伤（front×1 天然不变，AOE 不减）。
        const finalAmount = applyPositionDamageTaken(damage.amount, target.position, isAoe);
        dealDamage(state, actor, target, finalAmount, damage.isCritical);
        break;
      }
      case 'heal': {
        const amount = calculateTimedHeal({
          caster: getEffectiveStats(actor, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          atkRatio: effect.atkRatio,
          spRatio: effect.spRatio,
          flatPower: effect.flatPower,
        });
        healTarget(state, actor, target, amount);
        break;
      }
      case 'shield': {
        const amount = calculateTimedShield({
          caster: getEffectiveStats(actor, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          spRatio: effect.spRatio,
          defRatio: effect.defRatio,
          flatPower: effect.flatPower,
        });
        addShield(state, actor, target, amount, effect.durationMs);
        break;
      }
      case 'applyStatus':
        applyStatus(state, actor, target, effect.status);
        break;
      case 'cleanse': {
        const removed = removeStatuses(target, effect.kinds ?? NEGATIVE_STATUSES, state.now);
        for (const status of removed) {
          state.events.push({ type: 'statusExpired', at: state.now, targetId: target.id, status: status.kind });
        }
        break;
      }
      case 'energyGain':
        gainEnergy(state, target, effect.amount, 'effect');
        break;
      case 'dispel': {
        const removed = removeStatuses(target, effect.kinds ?? POSITIVE_STATUSES, state.now);
        for (const status of removed) {
          state.events.push({ type: 'statusExpired', at: state.now, targetId: target.id, status: status.kind });
        }
        break;
      }
      case 'revive':
        if (target.currentHp <= 0) {
          const amount = Math.max(1, Math.floor(target.maxHp * effect.hpRatio));
          target.currentHp = amount;
          target.defeatedAt = null;
          state.events.push({ type: 'revive', at: state.now, actorId: actor.id, targetId: target.id, amount, hpAfter: target.currentHp });
        }
        break;
      case 'execute':
        if (target.currentHp / target.maxHp <= effect.hpRatioThreshold) {
          dealDamage(state, actor, target, target.currentHp, false);
        }
        break;
    }
  }

  return true;
}

export function executeSkill(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  skill: SquadSkillDef,
  overrideTargetId?: string,
): boolean {
  let affected = false;
  for (const effect of skill.effects) {
    affected = executeEffect(state, actor, skill, effect, overrideTargetId) || affected;
  }
  return affected;
}
