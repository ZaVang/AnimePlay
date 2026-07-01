import type { StatusKind } from '@/engine';

export interface SquadBattleUnitView {
  id: string;
  name: string;
  imagePath: string;
  side: 'player' | 'enemy';
  position: number;
  hp: number;
  maxHp: number;
  energy: number;
  statuses: { kind: StatusKind; expiresAt: number; amount?: number }[];
  defeated: boolean;
  ultimateName: string;
  ultimateReady: boolean;
}

export interface SquadBattleRewardView {
  characterExp: number;
  knowledgePoints: number;
  equipmentDrop: {
    name: string;
    rarity: string;
  } | null;
}
