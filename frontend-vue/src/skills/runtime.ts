/**
 * 技能运行时（原 core/systems/SkillSystem，S4 迁至 skills/）。
 * 职责：卡牌/角色技能触发点 → runEffect 分发；TP/冷却校验。
 */
import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect, isEffectImplemented } from './effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { statusEffects, persistentEffects } from './systems';
import type { EffectInvocation } from './effects';

/**
 * S8a 第四钩子：角色被动光环的事件管线。
 * 此前被动技能从未被分发（仅 AURA_GENRE_EXPERT 经 engine/battle/strength 生效），
 * customHandlers 里 27 个已写好的真被动一直是死代码。现在：
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
    if (skill.effectId === 'AURA_GENRE_EXPERT') continue; // 强度光环走 engine 结算
    if (!isEffectImplemented(skill.effectId)) continue;
    await runEffect(skill.effectId, { ...invocation, playerId });
  }
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
    // If granted, we can mark the card as matching any synergy in later calculations.
    const consumedAnyType = statusEffects.consumeNextCardAnyType(playerId);
    if (consumedAnyType) {
      // 仅本次对撞窗口内有效的轻量标记
      (card as Card & { __treatedAsAnyType?: boolean }).__treatedAsAnyType = true;
    }

    // Standardized per-card effects (onPlay)
    if (isAnime) {
      const anime = card as AnimeCard;
      const onPlayEffects = anime.effects?.filter(e => e.trigger === 'onPlay') || [];
      for (const e of onPlayEffects) {
        await runEffect(e.effectId, { event: 'onPlay', playerId, role: 'attacker', card: anime });
      }
      // S8a：出牌方主辩手的被动响应 onPlay（如 科学逻辑「打出科幻卡 30% 抽1」）
      await emitActivePassives(playerId, { event: 'onPlay', role: 'attacker', card: anime });
    }
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

  // getAuraStrengthBonus 已移除：S2 起由 engine/battle/strength.auraStrengthBonus 提供（battleFlow 调用），此处零引用。

  /**
   * Checks if a skill can be used by the player.
   */
  canUseSkill(playerId: 'playerA' | 'playerB', skill: Skill): boolean {
    const playerStore = usePlayerStore();
    const player = playerStore[playerId];

    if (skill.cost && player.tp < skill.cost) {
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

    // Pay TP cost
    if (skill.cost) {
      playerStore.changeTp(playerId, -skill.cost);
    }

    // Set cooldown
    if (skill.cooldown) {
      playerStore.setSkillCooldown(playerId, skill.id, skill.cooldown);
    }
    
    gameStore.addNotification(`使用了技能: ${skill.name}`);
    const name2 = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name2} 使用了技能 [${skill.name}]。`, 'event');

    // --- Execute skill effect via effectId (preferred path) ---
    if (skill.effectId) {
      await runEffect(skill.effectId, { event: 'onPlay', playerId, role: 'attacker' });
    } else {
      console.warn(`Skill effectId missing for "${skill.id}". Consider adding effectId -> handler mapping.`);
    }
  },
};
