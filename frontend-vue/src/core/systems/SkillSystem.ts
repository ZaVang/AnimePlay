import { usePlayerStore } from '@/stores/battle';
import type { PlayerState, Skill } from '@/types';

export const SkillSystem = {
  /**
   * Checks if a skill can be used by a player.
   * @param player - The player state.
   * @param skill - The skill to check.
   * @returns True if the skill can be used, false otherwise.
   */
  canUseSkill(player: PlayerState, skill: Skill): boolean {
    // 1. Check if it's an active skill
    if (skill.type !== '主动技能') {
      console.log(`Skill [${skill.name}] is not an active skill.`);
      return false;
    }

    // 2. Check for TP cost
    if (skill.cost && player.tp < skill.cost) {
      console.log(`Not enough TP for skill [${skill.name}].`);
      return false;
    }

    // 3. Check for cooldown
    if (player.skillCooldowns[skill.id] > 0) {
      console.log(`Skill [${skill.name}] is on cooldown.`);
      return false;
    }

    return true;
  },

  /**
   * Use a skill for a player.
   * This function assumes validation (canUseSkill) has already been passed.
   * @param playerId - The ID of the player using the skill.
   * @param skill - The skill being used.
   */
  useSkill(playerId: 'playerA' | 'playerB', skill: Skill) {
    const playerStore = usePlayerStore();
    const player = playerStore[playerId];

    console.log(`${playerId} used skill: ${skill.name}`);

    // 1. Spend TP
    if (skill.cost) {
      playerStore.changeTp(playerId, -skill.cost);
    }

    // 2. Set cooldown
    if (skill.cooldown) {
      player.skillCooldowns[skill.id] = skill.cooldown;
    }

    // 3. Flag for rotation
    playerStore.flagForRotation(playerId);

    // 4. TODO: Execute the actual skill effect
    // This will be handled by a separate effect system later.
    console.log(`Executing effect for skill [${skill.name}]...`);
  },
};
