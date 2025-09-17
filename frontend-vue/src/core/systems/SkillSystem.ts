import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect } from '@/skills';
import type { EffectContext, CombatRole } from '@/types/effects';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard, CharacterCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';
import { isAnimeCard, isCharacterCard, setCardTreatedAsAnyType, isCardTreatedAsAnyType } from '@/utils/typeGuards';
import { systemRegistry } from '@/core/di/registry';

export const SkillSystem = {
  /**
   * 初始化所有角色的被动技能
   * 在游戏开始时调用，激活所有永久被动效果
   */
  async initializePassiveSkills() {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();

    console.log('🎯 开始初始化被动技能...');

    // 收集所有角色的被动技能
    const allCharacters = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
    let passiveCount = 0;

    for (const character of allCharacters) {
      if (!isCharacterCard(character) || !character.skills) continue;

      // 确定角色所属的玩家
      const playerId = playerStore.playerA.characters.includes(character) ? 'playerA' : 'playerB';

      for (const skill of character.skills) {
        // 只激活被动技能类型（不包括主动技能）
        if (skill.type === '被动光环' || skill.type === '被动技能') {
          if (skill.effectId) {
            try {
              console.log(`🔮 激活被动技能: ${character.name} - ${skill.name} (${skill.effectId})`);

              // 调用被动技能效果，传入初始化事件
              await runEffect(skill.effectId, {
                event: 'onGameStart',
                playerId,
                role: 'supporter',
                character
              });

              passiveCount++;

              historyStore.addLog(
                `${character.name} 的被动技能「${skill.name}」已激活`,
                'info'
              );
            } catch (error) {
              console.error(`❌ 激活被动技能失败: ${skill.effectId}`, error);
            }
          }
        }
      }
    }

    console.log(`✅ 被动技能初始化完成，共激活 ${passiveCount} 个被动技能`);
    historyStore.addLog(`游戏开始：已激活 ${passiveCount} 个被动技能`, 'event');
  },

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
  async emitBeforeResolve(clash: ClashInfo, addStrengthBonus: (side: CombatRole, amount: number) => void) {
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
   * 获取已激活的强度加成（不执行技能，只查询现有效果）
   */
  getAuraStrengthBonus(card: Card | undefined, actingPlayerId: 'playerA' | 'playerB'): number {
    if (!card) return 0;

    try {
      const persistentSystem = systemRegistry.getPersistentEffectSystem();
      const cardTypes = (card as AnimeCard).synergy_tags || [];

      // 只查询已有的强度加成，不执行技能
      return persistentSystem.getStrengthBonus(actingPlayerId, cardTypes);
    } catch (error) {
      console.warn('PersistentEffectSystem not available in getAuraStrengthBonus:', error);
      return 0;
    }
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
