/**
 * engine/battle —— 宅理论战规则（S2 迁入）。
 * 模块分工：turn 回合与胜负 · clash 对撞结算 · rewards 结果表 · strength 强度组成
 *          resources 资源操作 · setup 开局构筑
 */
export * from './turn';
export * from './clash';
export * from './rewards';
export * from './strength';
export * from './resources';
export * from './setup';
