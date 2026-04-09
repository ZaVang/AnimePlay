import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';
import { runEffect } from '@/skills';
import type { EffectContext, CombatRole, PlayerId } from '@/types/effects';
import type { SkillAPI } from '@/types/skill-api';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard, CharacterCard } from '@/types/card';
import { StatusEffectSystem } from '@/core/systems/StatusEffectSystem';
import { isAnimeCard, isCharacterCard, setCardTreatedAsAnyType, isCardTreatedAsAnyType } from '@/utils/typeGuards';
import { systemRegistry } from '@/core/di/registry';

/**
 * 创建基于真实 Store 的 SkillAPI 实现
 */
const createRealSkillAPI = (): SkillAPI => {
  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const interactionSystem = systemRegistry.getInteractionSystem();

  return {
    drawCards: (playerId, count) => playerStore.drawCards(playerId, count),
    changeTp: (playerId, amount) => playerStore.changeTp(playerId, amount),
    discardCard: (playerId, cardId) => playerStore.discardCardFromHand(playerId, cardId),
    addLog: (message, type) => historyStore.addLog(message, type as any || 'info'),
    addNotification: (message, type) => gameStore.addNotification(message, type || 'info'),
    addTemporaryBonus: (params) => {
      if (params.bonusType === 'strength') {
        if (params.cardType) {
          persistentSystem.addCardTypeStrengthBonus(params.playerId, params.cardType, params.amount, params.duration);
        } else {
          persistentSystem.addTemporaryBonus({
            playerId: params.playerId,
            bonusType: 'strength',
            amount: params.amount,
            duration: params.duration,
            description: params.description
          });
        }
      } else if (params.bonusType === 'cost') {
        persistentSystem.addCardTypeCostReduction(params.playerId, params.cardType || 'Any', params.amount, params.duration);
      }
    },
    viewOpponentHand: async (playerId, options) => {
      try {
        await interactionSystem.viewOpponentHand(playerId, {
          ...options,
          source: options.source as 'hand' | 'deck'
        });
      } catch (e) {
        console.warn('ViewOpponentHand failed in API:', e);
      }
    },
    getOpponentId: (playerId) => playerId === 'playerA' ? 'playerB' : 'playerA',
    getPlayerName: (playerId) => playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name
  };
};

export const SkillSystem = {
  /**
   * 初始化所有角色的被动技能
   */
  async initializePassiveSkills() {
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const api = createRealSkillAPI();

    console.log('🎯 开始初始化被动技能...');

    const allCharacters = [...playerStore.playerA.characters, ...playerStore.playerB.characters];
    let passiveCount = 0;

    for (const character of allCharacters) {
      if (!isCharacterCard(character) || !character.skills) continue;

      const playerId = playerStore.playerA.characters.includes(character) ? 'playerA' : 'playerB';

      for (const skill of character.skills) {
        if (skill.type === '被动光环' || (skill.type as string) === '被动技能') {
          if (skill.effectId) {
            try {
              console.log(`🔮 激活被动技能: ${character.name} - ${skill.name} (${skill.effectId})`);

              await runEffect(skill.effectId, {
                event: 'onGameStart',
                playerId,
                role: 'supporter',
                character,
                api
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
   * 检查并激活基于条件的被动技能
   */
  async checkConditionalPassiveSkills(playerId: 'playerA' | 'playerB') {
    const playerStore = usePlayerStore();
    const player = playerStore[playerId];
    const api = createRealSkillAPI();

    const activeCharacter = player.characters[player.activeCharacterIndex];
    if (!isCharacterCard(activeCharacter) || !activeCharacter.skills) return;

    for (const skill of activeCharacter.skills) {
      if ((skill.type as string) === '被动技能' && skill.effectId) {
        try {
          await runEffect(skill.effectId, {
            event: 'onTurnStart',
            playerId,
            role: 'supporter',
            character: activeCharacter,
            api
          });
        } catch (error) {
          console.error(`❌ 检查条件被动技能失败: ${skill.effectId}`, error);
        }
      }
    }
  },

  /**
   * Called when a card is played by attacker or defender.
   */
  async onCardPlayed(playerId: 'playerA' | 'playerB', card: Card) {
    const consumedAnyType = StatusEffectSystem.consumeNextCardAnyType(playerId);
    if (consumedAnyType) {
      setCardTreatedAsAnyType(card);
    }
  },

  /**
   * Emit beforeResolve effects for both sides.
   */
  async emitBeforeResolve(clash: ClashInfo) {
    const attackerId = clash.attackerId;
    const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');
    const persistentSystem = systemRegistry.getPersistentEffectSystem();
    const api = createRealSkillAPI();

    if (clash.attackingCard?.effects) {
      const beforeResolveEffects = clash.attackingCard.effects.filter(e => e.trigger === 'beforeResolve');
      for (const e of beforeResolveEffects) {
        await runEffect(e.effectId, {
          event: 'beforeResolve',
          playerId: attackerId,
          role: 'attacker',
          card: clash.attackingCard,
          clash,
          api,
          addStrengthBonus: (amount: number) => {
            persistentSystem.addTemporaryBonus({
              playerId: attackerId, bonusType: 'strength', amount, duration: 0, description: 'beforeResolve临时加成'
            });
          }
        });
      }
    }
    if (clash.defendingCard?.effects) {
      const beforeResolveEffects = clash.defendingCard.effects.filter(e => e.trigger === 'beforeResolve');
      for (const e of beforeResolveEffects) {
        await runEffect(e.effectId, {
          event: 'beforeResolve',
          playerId: defenderId,
          role: 'defender',
          card: clash.defendingCard,
          clash,
          api,
          addStrengthBonus: (amount: number) => {
            persistentSystem.addTemporaryBonus({
              playerId: defenderId, bonusType: 'strength', amount, duration: 0, description: 'beforeResolve临时加成'
            });
          }
        });
      }
    }
  },

  /**
   * Emit afterResolve effects for both sides.
   */
  async emitAfterResolve(clash: ClashInfo) {
    const attackerId = clash.attackerId;
    const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');
    const api = createRealSkillAPI();

    if (clash.attackingCard?.effects) {
      const afterResolveEffects = clash.attackingCard.effects.filter(e => e.trigger === 'afterResolve');
      for (const e of afterResolveEffects) {
        await runEffect(e.effectId, { event: 'afterResolve', playerId: attackerId, role: 'attacker', card: clash.attackingCard, clash, api });
      }
    }
    if (clash.defendingCard?.effects) {
      const afterResolveEffects = clash.defendingCard.effects.filter(e => e.trigger === 'afterResolve');
      for (const e of afterResolveEffects) {
        await runEffect(e.effectId, { event: 'afterResolve', playerId: defenderId, role: 'defender', card: clash.defendingCard, clash, api });
      }
    }
  },

  /**
   * 获取已激活的强度加成
   */
  getAuraStrengthBonus(card: Card | undefined, actingPlayerId: 'playerA' | 'playerB'): number {
    if (!card) return 0;
    try {
      const persistentSystem = systemRegistry.getPersistentEffectSystem();
      const cardTypes = (card as AnimeCard).synergy_tags || [];
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
    if (skill.cost && player.tp < skill.cost) return false;
    if (player.skillCooldowns[skill.id] > 0) return false;
    return true;
  },

  /**
   * Executes a skill's effect.
   */
  async useSkill(playerId: 'playerA' | 'playerB', skill: Skill) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const api = createRealSkillAPI();

    if (!this.canUseSkill(playerId, skill)) {
      gameStore.addNotification('无法使用该技能！', 'warning');
      return;
    }

    if (skill.cost) playerStore.changeTp(playerId, -skill.cost);
    if (skill.cooldown) playerStore.setSkillCooldown(playerId, skill.id, skill.cooldown);
    
    gameStore.addNotification(`使用了技能: ${skill.name}`);
    const name2 = playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;
    historyStore.addLog(`${name2} 使用了技能 [${skill.name}]。`, 'event');

    if (skill.effectId) {
      await runEffect(skill.effectId, { event: 'onPlay', playerId, role: 'attacker', api });
    } else {
      console.warn(`Skill effectId missing for "${skill.id}".`);
    }
  },
};
