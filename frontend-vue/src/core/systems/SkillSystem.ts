import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect, type EffectContext } from '@/skills/effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';

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
    const isAnime = (card as any).cost !== undefined;
    if (isAnime && card.synergy_tags?.includes('日常')) {
      playerStore.drawCards(playerId, 1);
      const name = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
      historyStore.addLog(`${name} 触发卡面效果：日常系抽1张。`, 'info');
      gameStore.addNotification('日常系：抽1张', 'info');
    }

    // StatusEffect: NEXT_CARD_ANY_TYPE
    // If granted, we can mark the card as matching any synergy in later calculations.
    const consumedAnyType = StatusEffectSystem.consumeNextCardAnyType(playerId);
    if (consumedAnyType) {
      (card as any).__treatedAsAnyType = true; // lightweight flag consumed within this clash window
    }

    // Standardized per-card effects (onPlay)
    if (isAnime) {
      const anime = card as AnimeCard;
      const onPlayEffects = anime.effects?.filter(e => e.trigger === 'onPlay') || [];
      for (const e of onPlayEffects) {
        const ctx: EffectContext = { event: 'onPlay', playerId, role: 'attacker', card: anime };
        await runEffect(e.effectId, ctx);
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

  /**
   * Aggregates passive aura bonuses that affect strength.
   * Minimal demo: AURA_GENRE_EXPERT → 同类型（日常）+1 强度
   */
  getAuraStrengthBonus(card: Card | undefined, actingPlayerId: 'playerA' | 'playerB'): number {
    if (!card) return 0;
    const playerStore = usePlayerStore();

    let bonus = 0;
    const allChars = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
    for (const character of allChars) {
      const skills = (character as any).skills as Skill[] | undefined;
      if (!skills) continue;
      for (const s of skills) {
        if (s.type !== '被动光环') continue;
        // Demo passive: 类型专家
        if (s.id === 'AURA_GENRE_EXPERT' && card.synergy_tags?.includes('日常')) {
          bonus += 1;
        }
      }
    }
    return bonus;
  },
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
