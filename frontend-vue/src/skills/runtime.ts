/**
 * 技能运行时（原 core/systems/SkillSystem，S4 迁至 skills/）。
 * 职责：卡牌/角色技能触发点 → runEffect 分发；TP/冷却/禁用校验。
 *
 * S8a 接通被动光环事件管线（onPlay/beforeResolve/afterResolve）；
 * S8b/c 扩展：turnStart/turnEnd（battleFlow 回合钩子调用）、onSkillUsed（双方被动
 * 响应技能使用，支持 技能无效化/冷却干扰/用技能得益 类被动）、出牌计数记录、
 * 技能 TP 费减免（tp_cost 一次性加成）、连击类主动技的回合内反应。
 */
import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect, hasEventHandler } from './effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { statusEffects, persistentEffects } from './systems';
import type { EffectInvocation } from './effects';

/**
 * 被动光环事件管线（S8a 接通）：
 *  - 只触发**主辩手**的被动（绑定轮换机制，与「场上全角色」的强度光环刻意区分）；
 *  - 只分发有真实现的 effectId——播报式占位被动保持静默（UI 已标「未实装」，不再假播报）。
 */
async function emitActivePassives(
  playerId: 'playerA' | 'playerB',
  invocation: Omit<EffectInvocation, 'playerId'>,
) {
  const player = usePlayerStore()[playerId];
  const active = player.characters[player.activeCharacterIndex];
  for (const skill of active?.skills || []) {
    if (skill.type !== '被动光环' || !skill.effectId) continue;
    // 只分发事件 handler：费用修饰器型（银发王选等）与基础设施型（光环/迷路小学生）
    // 在各自消费点生效，进 runEffect 只会刷未注册告警
    if (!hasEventHandler(skill.effectId)) continue;
    await runEffect(skill.effectId, { ...invocation, playerId });
  }
}

/** 技能实际 TP 费 = 面板费 − tp_cost 减免（下限 0）。 */
function effectiveSkillCost(playerId: 'playerA' | 'playerB', skill: Skill): number {
  return Math.max(0, (skill.cost || 0) - persistentEffects.getSkillCostReduction(playerId));
}

export const SkillSystem = {
  /**
   * Called when a card is played by attacker or defender.
   * Minimal demo: if an anime card has '日常'标签，则为该玩家抽1张牌。
   */
  async onCardPlayed(playerId: 'playerA' | 'playerB', card: Card) {
    const playerStore = usePlayerStore();
    const gameStore = useGameStore();
    const historyStore = useHistoryStore();

    // Demo anime effect: synergy tag '日常' → draw 1
    const isAnime = 'cost' in card && card.cost !== undefined;
    if (isAnime && card.synergy_tags?.includes('日常')) {
      playerStore.drawCards(playerId, 1);
      const name = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 触发卡面效果：日常系抽1张。`, 'info');
      gameStore.addNotification('日常系：抽1张', 'info');
    }

    // StatusEffect: NEXT_CARD_ANY_TYPE
    // 标记本张卡视为任意类型（S8c 起由 auraStrengthBonus 真实消费）。
    const consumedAnyType = statusEffects.consumeNextCardAnyType(playerId);
    if (consumedAnyType) {
      (card as Card & { __treatedAsAnyType?: boolean }).__treatedAsAnyType = true;
    }

    if (isAnime) {
      const anime = card as AnimeCard;

      // S8b：出牌计数（「每回合第一张X」「与上一张同类型」等被动条件的数据源）
      statusEffects.recordPlay(playerId, anime.synergy_tags);

      // S8c：连击类主动技的回合内反应（贝斯节奏/贝斯律动 施加的回合限制驱动）
      if (
        persistentEffects.hasRestriction(playerId, 'music_combo_cost') &&
        anime.synergy_tags?.includes('音乐')
      ) {
        persistentEffects.addTemporaryBonus({
          playerId, bonusType: 'cost', amount: 1, duration: 1, oneShot: 'next-play',
          description: '贝斯节奏：下张卡牌-1费',
        });
      }
      if (
        persistentEffects.hasRestriction(playerId, 'daily_combo_strength') &&
        anime.synergy_tags?.includes('日常')
      ) {
        persistentEffects.addTemporaryBonus({
          playerId, bonusType: 'strength', amount: 1, duration: 1, oneShot: 'next-play',
          description: '贝斯律动：下张卡牌+1强度',
        });
      }

      // Standardized per-card effects (onPlay)
      const onPlayEffects = anime.effects?.filter(e => e.trigger === 'onPlay') || [];
      for (const e of onPlayEffects) {
        await runEffect(e.effectId, { event: 'onPlay', playerId, role: 'attacker', card: anime });
      }
      // S8a：出牌方主辩手的被动响应 onPlay（如 科学逻辑「打出科幻卡 30% 抽1」）
      await emitActivePassives(playerId, { event: 'onPlay', role: 'attacker', card: anime });
    }
  },

  /** S8b：回合开始钩子（battleFlow.startTurn 在 TP 回复与冷却递减后调用）。 */
  async emitTurnStart(playerId: 'playerA' | 'playerB') {
    await emitActivePassives(playerId, { event: 'turnStart', role: 'attacker' });
  },

  /** S8b：回合结束钩子（battleFlow.endTurn 调用；省力主义等「本回合没出牌」判定）。 */
  async emitTurnEnd(playerId: 'playerA' | 'playerB') {
    await emitActivePassives(playerId, { event: 'turnEnd', role: 'attacker' });
  },

  /**
   * Emit beforeResolve effects for both sides.
   */
  async emitBeforeResolve(clash: ClashInfo, addStrengthBonus: (side: 'attacker'|'defender', amount: number) => void) {
    const attackerId = clash.attackerId;
    const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');

    if (clash.attackingCard?.effects) {
      const beforeResolveEffects = clash.attackingCard.effects.filter(e => e.trigger === 'beforeResolve');
      for (const e of beforeResolveEffects) {
        await runEffect(e.effectId, { event: 'beforeResolve', playerId: attackerId, role: 'attacker', card: clash.attackingCard, clash, addStrengthBonus });
      }
    }
    if (clash.defendingCard?.effects) {
      const beforeResolveEffects = clash.defendingCard.effects.filter(e => e.trigger === 'beforeResolve');
      for (const e of beforeResolveEffects) {
        await runEffect(e.effectId, { event: 'beforeResolve', playerId: defenderId, role: 'defender', card: clash.defendingCard, clash, addStrengthBonus });
      }
    }
    // S8a：双方主辩手被动响应 beforeResolve（携带各自的出牌；强度注入经 addStrengthBonus）
    await emitActivePassives(attackerId, { event: 'beforeResolve', role: 'attacker', card: clash.attackingCard, clash, addStrengthBonus });
    await emitActivePassives(defenderId, { event: 'beforeResolve', role: 'defender', card: clash.defendingCard, clash, addStrengthBonus });
  },

  /**
   * Emit afterResolve effects for both sides.
   */
  async emitAfterResolve(clash: ClashInfo) {
    const attackerId = clash.attackerId;
    const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');
    if (clash.attackingCard?.effects) {
      const afterResolveEffects = clash.attackingCard.effects.filter(e => e.trigger === 'afterResolve');
      for (const e of afterResolveEffects) {
        await runEffect(e.effectId, { event: 'afterResolve', playerId: attackerId, role: 'attacker', card: clash.attackingCard, clash });
      }
    }
    if (clash.defendingCard?.effects) {
      const afterResolveEffects = clash.defendingCard.effects.filter(e => e.trigger === 'afterResolve');
      for (const e of afterResolveEffects) {
        await runEffect(e.effectId, { event: 'afterResolve', playerId: defenderId, role: 'defender', card: clash.defendingCard, clash });
      }
    }
    // S8a：双方主辩手被动响应 afterResolve
    await emitActivePassives(attackerId, { event: 'afterResolve', role: 'attacker', card: clash.attackingCard, clash });
    await emitActivePassives(defenderId, { event: 'afterResolve', role: 'defender', card: clash.defendingCard, clash });
  },

  /**
   * Checks if a skill can be used by the player.
   */
  canUseSkill(playerId: 'playerA' | 'playerB', skill: Skill): boolean {
    const playerStore = usePlayerStore();
    const player = playerStore[playerId];

    // S8b：TP 校验按减免后实际费（黄前久美子/藤原千花 的「下次技能-1费」）
    if (player.tp < effectiveSkillCost(playerId, skill)) {
      return false; // Not enough TP
    }

    if (player.skillCooldowns[skill.id] > 0) {
      return false; // Skill on cooldown
    }

    // S8a：消费禁技限制（如 绝对沉默/电子战 的「对手技能禁用」，'*' 为全体禁用）
    if (persistentEffects.isSkillDisabled(playerId, skill.id)) {
      return false;
    }

    return true;
  },

  /**
   * Executes a skill's effect.
   */
  async useSkill(playerId: 'playerA' | 'playerB', skill: Skill) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();

    if (!this.canUseSkill(playerId, skill)) {
      gameStore.addNotification('无法使用该技能！', 'warning');
      return;
    }

    // Pay TP cost（按减免后实际费；一次性技能费减免随后消费）
    const cost = effectiveSkillCost(playerId, skill);
    if (cost > 0) {
      playerStore.changeTp(playerId, -cost);
    }
    persistentEffects.consumeOneShotBonuses(playerId, 'tp_cost');

    // Set cooldown
    if (skill.cooldown) {
      playerStore.setSkillCooldown(playerId, skill.id, skill.cooldown);
    }

    gameStore.addNotification(`使用了技能: ${skill.name}`);
    const name2 = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name2} 使用了技能 [${skill.name}]。`, 'event');

    // S8c：双方被动响应技能使用（对手侧先发——沉默威严的无效化要赶在效果执行前落旗）
    const opponentId = playerId === 'playerA' ? 'playerB' : 'playerA';
    await emitActivePassives(opponentId, { event: 'onSkillUsed', role: 'defender', skill, skillUserId: playerId });
    await emitActivePassives(playerId, { event: 'onSkillUsed', role: 'attacker', skill, skillUserId: playerId });

    // S8c：技能无效化（沉默威严落旗）——费用与冷却已付，效果取消
    if (statusEffects.consumeSkillNegation(playerId)) {
      historyStore.addLog(`[${skill.name}] 被无效化了！`, 'event');
      gameStore.addNotification(`${skill.name} 被无效化！`, 'warning');
      return;
    }

    // --- Execute skill effect via effectId (preferred path) ---
    if (skill.effectId) {
      await runEffect(skill.effectId, { event: 'onPlay', playerId, role: 'attacker', skill });
    } else {
      console.warn(`Skill effectId missing for "${skill.id}". Consider adding effectId -> handler mapping.`);
    }
  },
};
