/**
 * engine/skills —— 技能系统的纯部分（S4 迁入）。
 * types 上下文与播报类型 · announcements 播报表（数据）
 * status 一次性状态追踪 · persistent 跨回合效果追踪
 * 执行（store 写入 / UI 交互）在 skills/effects 执行器层。
 */
export * from './types';
export * from './announcements';
export * from './status';
export * from './persistent';
