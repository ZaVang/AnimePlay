# engine/ —— 纯游戏逻辑层

**只负责**：游戏规则的纯计算（战斗判定、抽卡、养成数值、AI 决策）。

**绝不允许**：import 任何 `vue` / `pinia` / `@/stores` / `@/components` / `@/views` / `@/infra` / `@/composables`；直接调 `Math.random`（必须用 [rng.ts](rng.ts) 注入）、`fetch`、DOM、`localStorage`。

依赖只能向下：`views → components → stores → engine`。engine 只依赖 `@/types`、`@/config`、`@/data`。

这层是将来与 Node 权威服务端**共享代码**的部分（多人/PvP/排行榜的防作弊基础），纯度就是它的全部价值。lint 已配置硬闸（见 `eslint.config.ts`），违规 import 直接报错。

迁入路线见 [docs/FUTURE.md](../../../docs/FUTURE.md)：S2 宅理论战 → S3 抽卡+挑战塔 → S4 技能+养成+AI。
