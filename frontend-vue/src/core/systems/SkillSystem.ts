import { useGameStore, usePlayerStore } from '@/stores/battle';
import type { Card, Skill } from '@/types';

export const SkillSystem = {
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
  useSkill(playerId: 'playerA' | 'playerB', skill: Skill) {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();

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

    // --- Execute skill effect ---
    // This is where the magic happens. We'll add effects case by case.
    switch (skill.id) {
      case 'TPL_DRAW_1':
        playerStore.drawCards(playerId, 1);
        break;
      
      case 'TPL_GAIN_TP_2':
        playerStore.gainTp(playerId, 2);
        break;

      case 'KYON_TSUKKOMI':
        const opponentId = playerId === 'playerA' ? 'playerB' : 'playerA';
        const opponentBias = gameStore.topicBias * (opponentId === 'playerA' ? 1 : -1);
        if (opponentBias > 0) {
          const biasReduction = Math.floor(opponentBias / 2);
          gameStore.updateTopicBias(biasReduction * (opponentId === 'playerA' ? -1 : 1));
        }
        break;
      
      // Other skill effects will be added here.
      default:
        console.warn(`Skill effect for "${skill.id}" not implemented yet.`);
    }
  },
};
