export interface Skill {
  id: string;
  name: string;
  type: '被动光环' | '主动技能';
  description: string;
  cost?: number; // TP cost for active skills
  cooldown?: number; // Cooldown rounds for active skills
}
