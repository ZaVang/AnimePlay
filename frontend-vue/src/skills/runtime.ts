/**
 * 技能运行时（原 core/systems/SkillSystem，S4 迁至 skills/）。
 * 职责：卡牌/角色技能触发点 → runEffect 分发；TP/冷却校验。
 */
import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect } from './effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { statusEffects } from './systems';

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

    // TODO: Add other conditions like game phase, character status, etc.

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
