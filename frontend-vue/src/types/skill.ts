export type SkillType = '被动光环' | '主动技能';

import type { SkillParams } from './effects';

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  description: string;
  // For active skills
  cost?: number; // TP cost
  cooldown?: number; // Cooldown in turns
  initialCooldown?: number; // Initial cooldown at the start of a battle
  // Implementation mapping
  effectId?: string; // Links to effects registry (for active skills or passives with events)
  params?: SkillParams; // Optional parameters for effect execution (type-safe)
  // For passive skills
  // Passive effect details might be handled by the skill's implementation
}