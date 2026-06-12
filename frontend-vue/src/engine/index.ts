/**
 * engine —— 纯游戏逻辑层。
 *
 * 章程（违反即架构破窗，lint 会拦）：
 *  - 只做游戏规则的纯计算，零副作用倾向；
 *  - 禁止 import：vue / pinia / vue-router / @/stores / @/components / @/views / @/infra / @/composables；
 *  - 禁止直接调用 Math.random（用 ./rng 注入）、fetch、DOM、localStorage；
 *  - 它是将来与 Node 权威服务端共享的那一层。
 *
 * 迁入计划（见 docs/FUTURE.md）：
 *  S2 battle/（宅理论战） · S3 gacha/ + squad/ · S4 skills/ + nurture/ + ai/
 */

export * from './rng';
