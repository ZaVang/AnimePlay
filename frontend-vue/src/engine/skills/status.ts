/**
 * 一次性/短时状态标记追踪器 —— 纯类（S4 纯化，S8b/c 扩展）。
 * 实例由 skills/systems.ts 持有；对局结束 clearAll；将来服务端可按对局各建一份。
 *
 * S8b 新增「回合出牌计数」：被动技能的「每回合第一张X」「与上一张同类型」
 * 「累计N种不同类型」等条件全靠这里。约定：卡牌主类型 = synergy_tags[0]
 * （数据层把题材标签放在首位；形式标签 TV/日本 等在后）。
 * 记录时机：出牌扣费后、效果分发前（SkillSystem.onCardPlayed）。
 */
import type { PlayerId } from '@/types/battle';

interface TurnPlays {
  /** 本回合按出牌顺序的主类型列表。 */
  types: string[];
  /** 最近一张牌的完整标签（跨回合保留，「与上一张同类型」按主类型比较）。 */
  lastTags: string[] | null;
}

export class StatusEffectTracker {
  private nextCardAnyType = new Set<PlayerId>();
  private turnPlays = new Map<PlayerId, TurnPlays>();
  /** 对局内累计出过的主类型集合（丰收之神/音乐狂热的「N种不同类型」阈值）。 */
  private allTypes = new Map<PlayerId, Set<string>>();
  /** 对局内一次性标记（markOnce）：阈值奖励只发一次。 */
  private onceKeys = new Set<string>();
  /** 下一次对撞中被压制光环的一方（义体强化）。 */
  private auraSuppressed = new Set<PlayerId>();
  /** 下一个技能被无效化的玩家（沉默威严）。 */
  private skillNegation = new Set<PlayerId>();

  // ===== NEXT_CARD_ANY_TYPE（S1 起已有） =====

  grantNextCardAnyType(playerId: PlayerId) {
    this.nextCardAnyType.add(playerId);
  }

  hasNextCardAnyType(playerId: PlayerId): boolean {
    return this.nextCardAnyType.has(playerId);
  }

  consumeNextCardAnyType(playerId: PlayerId): boolean {
    if (!this.nextCardAnyType.has(playerId)) return false;
    this.nextCardAnyType.delete(playerId);
    return true;
  }

  // ===== S8b：回合出牌计数 =====

  /** 记录一次出牌（攻或防）。 */
  recordPlay(playerId: PlayerId, tags: readonly string[] | undefined) {
    const primary = tags?.[0] ?? '未知';
    const plays = this.turnPlays.get(playerId) ?? { types: [], lastTags: null };
    plays.types.push(primary);
    plays.lastTags = [...(tags ?? [])];
    this.turnPlays.set(playerId, plays);

    const all = this.allTypes.get(playerId) ?? new Set<string>();
    all.add(primary);
    this.allTypes.set(playerId, all);
  }

  /** 本回合已出牌数（recordPlay 之前查询时不含正要打出的这张）。 */
  playsThisTurn(playerId: PlayerId): number {
    return this.turnPlays.get(playerId)?.types.length ?? 0;
  }

  /** 本回合已出的主类型序列。 */
  typesPlayedThisTurn(playerId: PlayerId): readonly string[] {
    return this.turnPlays.get(playerId)?.types ?? [];
  }

  /** 最近一张出牌的完整标签（跨回合）；从未出过牌返回 null。 */
  lastPlayedTags(playerId: PlayerId): readonly string[] | null {
    return this.turnPlays.get(playerId)?.lastTags ?? null;
  }

  /** 对局累计出过的不同主类型数。 */
  distinctTypesAll(playerId: PlayerId): number {
    return this.allTypes.get(playerId)?.size ?? 0;
  }

  /** 对局内一次性标记：首次返回 true，此后同 key 返回 false（阈值奖励防重发）。 */
  markOnce(playerId: PlayerId, key: string): boolean {
    const fullKey = `${playerId}_${key}`;
    if (this.onceKeys.has(fullKey)) return false;
    this.onceKeys.add(fullKey);
    return true;
  }

  /** 回合开始时清空该玩家的回合内计数（lastTags 跨回合保留）。 */
  resetTurnCounters(playerId: PlayerId) {
    const plays = this.turnPlays.get(playerId);
    if (plays) plays.types = [];
  }

  // ===== S8c：对撞光环压制（义体强化） =====

  suppressAuraFor(playerId: PlayerId) {
    this.auraSuppressed.add(playerId);
  }

  /** 结算取强度时消费（一次对撞有效）。 */
  consumeAuraSuppression(playerId: PlayerId): boolean {
    if (!this.auraSuppressed.has(playerId)) return false;
    this.auraSuppressed.delete(playerId);
    return true;
  }

  // ===== S8c：技能无效化（沉默威严） =====

  /** 标记某玩家的下一个技能将被无效化。 */
  flagSkillNegation(playerId: PlayerId) {
    this.skillNegation.add(playerId);
  }

  consumeSkillNegation(playerId: PlayerId): boolean {
    if (!this.skillNegation.has(playerId)) return false;
    this.skillNegation.delete(playerId);
    return true;
  }

  clearAll() {
    this.nextCardAnyType.clear();
    this.turnPlays.clear();
    this.allTypes.clear();
    this.onceKeys.clear();
    this.auraSuppressed.clear();
    this.skillNegation.clear();
  }
}
