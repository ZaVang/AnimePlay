import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect } from '@/skills';
import type { EffectContext } from '@/types/effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard, CharacterCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';
import { isAnimeCard, isCharacterCard, setCardTreatedAsAnyType, isCardTreatedAsAnyType } from '@/utils/typeGuards';

export const SkillSystem = {
  /**
   * Called when a card is played by attacker or defender.
   */
  async onCardPlayed(playerId: 'playerA' | 'playerB', card: Card) {
    // StatusEffect: NEXT_CARD_ANY_TYPE
    // If granted, we can mark the card as matching any synergy in later calculations.
    const consumedAnyType = StatusEffectSystem.consumeNextCardAnyType(playerId);
    if (consumedAnyType) {
      setCardTreatedAsAnyType(card);
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
   * 只执行影响强度计算的被动技能
   */
  getAuraStrengthBonus(card: Card | undefined, actingPlayerId: 'playerA' | 'playerB'): number {
    if (!card) return 0;
    const playerStore = usePlayerStore();

    let bonus = 0;

    // 创建一个临时的加成函数
    const addStrengthBonus = (role: 'attacker' | 'defender', amount: number) => {
      bonus += amount;
    };

    // 只检查真正影响强度的被动技能（白名单）
    const strengthPassiveSkills = [
      '安原绘麻_内向专注',  // 手牌≥7时强度+1
      'AURA_GENRE_EXPERT'  // 类型专家技能
    ];

    // 检查所有角色的被动技能
    const allChars = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
    for (const character of allChars) {
      if (!isCharacterCard(character) || !character.skills) continue;

      for (const skill of character.skills) {
        if (skill.type !== '被动光环') continue;

        // 只执行白名单中的强度加成技能
        if (skill.effectId && strengthPassiveSkills.includes(skill.effectId)) {
          try {
            // 同步调用被动技能，传入beforeResolve事件
            runEffect(skill.effectId, {
              event: 'beforeResolve',
              playerId: actingPlayerId,
              role: 'attacker',
              card: card as AnimeCard,
              addStrengthBonus
            });
          } catch (error) {
            console.warn(`执行强度加成技能 ${skill.effectId} 时出错:`, error);
          }
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
