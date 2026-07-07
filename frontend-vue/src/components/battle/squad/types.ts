import type { StatusKind } from '@/engine';

export interface SquadBattleUnitView {
  id: string;
  characterId: number;
  name: string;
  imagePath: string;
  /** 稀有度（战斗头像框按稀有度描边用；复用既有稀有度识别色）。 */
  rarity: string;
  side: 'player' | 'enemy';
  position: number;
  // PCR 式职业 + 固有站位（展示层，由角色 role 推导；与战斗站位同源）。
  roleLabel: string;
  roleIcon: string;
  positionLabel: string;
  positionOrder: number;
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

// SB-T3 收尾①：浮动伤害数字的瞬态视图。engine 已产 isCritical，此处只做「最后一寸」显形。
// id 唯一（同一 targetId 短时间可叠多条），View 用定时器清除并在 reset/卸载时清空。
export interface SquadFloatingDamageView {
  id: number;
  targetId: string;
  amount: number;
  isCritical: boolean;
}
