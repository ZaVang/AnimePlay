/**
 * engine/skills —— 技能系统的纯部分（S4 迁入）。
 * types 效果上下文类型 · status 一次性状态追踪 · persistent 跨回合效果追踪
 * 执行（store 写入 / UI 交互）在 skills/effects 执行器层。
 * 播报表（announcements）已随 S8c 全量真实现而删除——技能要么真生效，要么不存在。
 */
export * from './types';
export * from './status';
export * from './persistent';
