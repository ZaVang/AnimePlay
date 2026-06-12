/**
 * infra/persistence —— 存档协议与传输（S5 建立）。
 * schema 显式定义存了什么 · migrations 历史版本迁移 · api 网络 IO。
 * 与 store 的装配（serialize/deserialize 注册）在 stores/persistence.ts —— 本层不 import 任何 store。
 */
export * from './schema';
export * from './migrations';
export * from './api';
