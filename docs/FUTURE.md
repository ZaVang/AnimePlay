# AnimePlay 重构与演进 Roadmap

> **这是项目的单一任务源。** 按 Sprint 顺序一个个做，完成打勾。每个任务的「为什么/证据」见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)，本文只管「做什么、到哪了」。
>
> 用法：开工前看「进度总览」找当前 Sprint → 做完勾掉任务 → 一个 Sprint 的 Exit 全满足就把它标 ✅。

## 🎯 终点与铁律

**终点**：多人 + 排行榜 + PvP 的可上线游戏。

**四条贯穿始终的架构铁律**（每个 Sprint 都不能违反）：
1. **engine 纯净**：`src/engine/` 只有纯游戏逻辑，零 Vue / Pinia / DOM / fetch / localStorage 依赖。它是将来与服务端共享的那层。
2. **依赖只向下**：`views → components → stores → engine`，下层绝不 import 上层。engine 出现 `import @/stores` = 架构破窗，靠 lint 闸拦死。
3. **RNG 可注入**：engine 内不直接调 `Math.random()`，随机源作为依赖注入（为 PvP 防作弊 + 服务端权威 + 可测试）。
4. **Sprint 独立可合并**：每个 Sprint 做完，游戏都处于可玩状态，即使后面的不做也不破。

目标目录结构与分层详见审计报告第三节及架构讨论（engine / types / config / data / infra / stores / composables / components / views / lib）。

**状态图例**：☐ 未开始 · 🔄 进行中 · ✅ 完成

---

## 📊 进度总览

| Sprint | 主题 | 状态 | 阶段 |
|---|---|---|---|
| S0 | 文档重构 | ✅ | 已完成 |
| S1 | 测试安全网 & 架构骨架 | ✅ | 已完成 |
| S2 | engine 抽取：宅理论战 | ☐ | 解耦 |
| S3 | engine 抽取：抽卡 & 挑战塔 | ☐ | 解耦 |
| S4 | engine 抽取：技能 & 养成 & AI | ☐ | 解耦 |
| S5 | 拆 god store & 持久化 | ☐ | 解耦 |
| S6 | 功能闭环 | ☐ | 补完 |
| S7 | 视觉还债 | ☐ | 补完 |
| S8 | 技能真实现 | ☐ | 补完 |
| S9 | 性能优化 | ☐ | 上线前置 |
| S10 | 后端加固 & 安全 | ☐ | 上线前置 |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S1–S6 已细化、可直接执行；S7–S10 中等粒度；S11–S12 为方向（到达时再 `/think` 细化，依赖届时的决策）。

---

## ✅ S0 — 文档重构（已完成 2026-06-12）

- [x] 删除 4 份过时文档（旧前端/错误数值）
- [x] 归档 4 份历史 snapshot 到 `docs/archive/`
- [x] 小修 2 份（战斗系统 / UR技能）、更新 2 份（开发计划 / 前端界面）
- [x] 新建 5 份机制文档（抽卡 / 挑战塔 / 养成 / 猜角色 / 主题）
- [x] 新建根 README、docs 索引；重写前端 README、CLAUDE.md
- [x] 产出审计报告 + 本 Roadmap

---

## ✅ S1 — 测试安全网 & 架构骨架（已完成 2026-06-12）

**目标**：在动任何逻辑前铺好回归保护和边界闸，让后续重构「不瞎飞」。

- [x] 引入 vitest 4，配 `npm run test` / `test:watch`（node 环境，纯逻辑测试）
- [x] 特征测试 **5 文件 56 个**：`battleCalculator`（曲线/伤害/连击/下限/养成联动）、`RewardCalculator` 四张结果表逐格锁定 + 分档边界、`BattleEngine.resolveClash`（薄测试，空 Pinia 搭台——完整纯函数化随 S2）、抽卡（6000 抽分布/70 抽保底/66% UP 替换/十连保底 SSR，种子化确定性）
- [x] `engine/rng.ts`：RNG 接口 + `defaultRng` / `createSeededRng`(mulberry32) / `createSequenceRng`；保底测试已用种子断言「必出 UP」
- [x] 骨架目录 `engine/ infra/ lib/ composables/` 各带章程 README；`engine/index.ts` 注明迁入计划
- [x] 依赖方向闸：用 **ESLint 内置规则**实现（`no-restricted-imports` + `no-restricted-globals` + `no-restricted-properties`，零新增依赖，比 dependency-cruiser 轻）——engine 禁 import stores/components/views/infra/vue/pinia，禁 Math.random/fetch/DOM/localStorage；lib 同类约束。绊线验证：违规文件 3 类错误全拦截
- [x] 清死代码：`stores/counter.ts`、`components/CollectionStats.vue`、4 个零引用英文技能 stub（KURISU_*/SENJOUGAHARA_*；有引用的 `NEXT_CARD_ANY_TYPE`/`BIAS_HALVE_OPP` 保留）；移除错配的 `@types/chart.js`

**Exit 达成**：56 测试全绿；绊线文件被 lint 拦下（exit 1，3 类错误）；`type-check` 0 错。
> 移交 S4 的发现：`skills/effects/index.ts` 有 18 处历史 lint 债（unused `ctx` 参数，S1 之前已存在），随技能系统重构一并处理。

---

## ☐ S2 — engine 抽取：宅理论战（解耦）

**目标**：把宅理论战规则搬进 `engine/battle`，与 Pinia 解耦，打破循环依赖。

- [ ] `TurnManager` 规则部分 → `engine/battle/turn.ts`（状态转换纯函数化）
- [ ] `BattleEngine` → `engine/battle/clash.ts`（已纯，迁移）
- [ ] `RewardCalculator` → `engine/battle/rewards.ts`
- [ ] 移除 `core/battle` 对 `@/stores` 的全部 import；battle store 改为「持有状态 + 调 engine」
- [ ] 打破 `TurnManager↔AIController↔BattleController` 循环依赖
- [ ] `InteractionSystem` 不再持 `any` 类型 UI 实例（改回调/事件注入）

**Exit**：宅理论战可正常对战（手测）；`engine/battle` 零 store import（lint 过）；相关测试通过。

---

## ☐ S3 — engine 抽取：抽卡 & 挑战塔（解耦）

**目标**：抽卡与小队战逻辑入 engine，消除复制公式，解开 userStore↔gachaStore 循环。

- [ ] `gachaStore.performGachaLogic` → `engine/gacha/draw.ts`（用注入 rng）
- [ ] `gachaRotation` → `engine/gacha/rotation.ts`
- [ ] 保底状态逻辑归并进 gacha 域（解 `userStore↔gachaStore` 循环依赖）
- [ ] squad 伤害/战力公式 → `engine/squad/combat.ts`（**消除 `SquadBattleView` 内复制的那份公式**）
- [ ] `aiSquadGenerator` 塔层生成 → `engine/squad/tower.ts`（用 rng）
- [ ] 替换这两个域内的 `Math.random` → rng

**Exit**：抽卡/爬塔正常；伤害公式只剩一份；`engine/gacha`+`engine/squad` 零 store import。

---

## ☐ S4 — engine 抽取：技能 & 养成 & AI（解耦）

**目标**：剩余逻辑入 engine，提炼技能参数化原语，`core/` 旧目录清空。

- [ ] `skills/effects` → `engine/skills`（注册表 + handlers）
- [ ] 提炼参数化原语（加成 / 抽牌 / 查看手牌 / 强制类型… ~10 个），为 S8 真实现铺路
- [ ] nurture 等级/属性/训练规则 → `engine/nurture`
- [ ] `core/ai` → `engine/ai`（给定 state 纯函数化）
- [ ] 替换剩余全部 `Math.random` → rng
- [ ] 清理 `skills/effects/index.ts` 历史 lint 债（18 处 unused `ctx`，S1 移交）

**Exit**：技能/养成/AI 正常；`engine/` 整体零 store/Vue import；`core/` 清空或仅留兼容壳。

---

## ☐ S5 — 拆 god store & 持久化（解耦）

**目标**：userStore（1178 行）拆成领域 store，持久化显式化，**顺手修掉「小队/塔进度刷新丢失」bug**。

- [ ] 拆 userStore → `profile / collection / deck / nurture / pve / gacha` 领域 store
- [ ] `profile` store 暴露 `spend()/earn()` 作为**唯一货币入口**，消灭 4 处组件直改 `knowledgePoints`
- [ ] `infra/persistence`：显式 schema 的 serialize / deserialize / migrate
- [ ] ★ 把 `presetSquads` / `towerProgress` 纳入存档协议（修复刷新丢进度）
- [ ] 各领域 store 注册到 persistence

**Exit**：存档完整（小队/塔进度刷新不丢）；货币只能经 action 改；各 store < 300 行。

---

## ☐ S6 — 功能闭环（补完）

**目标**：把 8 个模块的断点补齐，游戏「感觉完整」。

- [ ] 宅理论战结算 UI + 奖励发放（`endGame` 接 `setWinner` + `RewardCalculator`）
- [ ] 登出按钮接上 `logout()`
- [ ] 设置 ✕ 关闭按钮生效
- [ ] 商店每日限购真实计数
- [ ] 训练冷却持久化（移出组件内存）
- [ ] 猜角色：最高分持久化 + 接入主经济（得分换知识点）
- [ ] 移除暴露的调试 UI（「AI手牌数量」、虚拟化开关）；清 150+ `console.log`
- [ ] （可选）AI 会使用角色技能

**Exit**：8 模块核心循环全闭环；无调试残留。

---

## ☐ S7 — 视觉还债（补完）

**目标**：消除泛白，建立配色一致性。

- [ ] **172 处 `text-white` → 主题文字色变量**（全站泛白根因）
- [ ] 按钮色阶统一走主题 accent
- [ ] 抽卡结果弹窗加仪式感
- [ ] 战斗日志重新配色（脱离深色残留）
- [ ] 图片 `onerror` 兜底（消灭裂图）
- [ ] `index.html` 标题（"Vite App" → 项目名）
- [ ] Tailwind 动态类（`bg-${color}-600/10`）safelist 或改写
- [ ] 决策：移动端响应式 vs 明确「桌面优先」砍掉

**Exit**：浅色主题下无泛白；视觉一致。
> 注：`text-white` 这一项零风险、可随时插队提前做（士气 buff）。

---

## ☐ S8 — 技能真实现（补完）

**目标**：消除「说一套做一套」，让 112 处假技能变真。

- [ ] 用 S4 的参数化原语重写 112 处假实现（分批，可增量）
- [ ] 暂未实装的技能在 UI 明确标注「未实装」
- [ ] 补 #36 志摩凛 / #37 三笠 的技能设计

**Exit**：技能描述与实际行为一致；无「播报式假实现」。

---

## ☐ S9 — 性能优化（上线前置）

**目标**：首屏体积、图片、列表、定时器全部达标。

- [ ] 后端 `all_animes` 剥离 `main_characters` 字段（−92%，7.2MB → ~0.5MB）
- [ ] 开 gzip（Flask-Compress）
- [ ] 恢复图片 `Cache-Control` 长缓存 + 缩略图 + `loading="lazy"`
- [ ] 补虚拟化（`CharacterSelectModal` / `CharacterSelector` 等可达 665 项的大列表）
- [ ] 修定时器泄漏（`performanceMonitor` interval、squad 自动战斗 setTimeout 链）
- [ ] `main.ts` 非阻塞挂载 + loading/超时兜底

**Exit**：首屏 < 1MB；大列表流畅；无定时器泄漏。

---

## ☐ S10 — 后端加固 & 安全（上线前置）

**目标**：堵死审计两条安全红线，达到「单人在线」可部署。

- [ ] 存档接口加鉴权（token / 会话）—— 当前任意用户名免密读写任何人存档
- [ ] `debug=True` → `False`
- [ ] 存档加版本号 + 并发保护（防后写覆盖 / 写入截断损坏）
- [ ] CORS 收敛；vite `host` / `allowedHosts` 收敛
- [ ] 部署方案确定（单人在线版）

**Exit**：可安全部署为单人在线版。

---

## ☐ S11 — React 视图迁移（演进）

**目标**：视图层换 React，盖在已干净的 engine 上，拿到单一 TS 栈。

- [ ] 新建 React 应用骨架，直接复用 `engine / types / config / data / infra`
- [ ] 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」）
- [ ] `views` / `components` 按域用 React 重写
- [ ] 对照功能逐页验收

**Exit**：React 版功能对齐；engine 复用率 > 50%。
> 粗粒度。前置依赖 S2–S5 的 engine 必须已干净。到达时再 `/think` 细化。

---

## ☐ S12 — 权威后端 & 多人/PvP/排行榜（终点）

**目标**：达成多人闭环。

- [ ] `engine` 提升为前后端共享包（monorepo）
- [ ] Node 权威服务端（战斗/抽卡服务端计算，客户端预测）
- [ ] 排行榜（战绩/收集进度）
- [ ] PvP 匹配 + 对战

**Exit**：多人对战与排行榜上线。
> 粗粒度。决策门控（数据库选型、匹配机制等），到达时再 `/think`。

---

## 🆓 自由项（零依赖，可随时插队）

不依赖任何 Sprint，想做就做：

- [ ] `text-white` 泛白修复（S7 的一项，可提前）
- [ ] 后端 `debug=True` 关掉（一行）
- [ ] `index.html` 标题
- [ ] 清死代码 / `console.log`（也在 S1/S6）

---

## 🔗 附录：审计问题 → Sprint 映射（确保无遗漏）

| 审计章节 | 问题 | 落在 |
|---|---|---|
| 一.2 | 宅理论战无结算无奖励 | S6 |
| 一.2 | 小队/塔进度刷新丢失 | S5 |
| 一.3 | 登出/限购/训练冷却/猜角色/设置关闭 | S6 |
| 三.1 | core→stores 反向依赖、3 处循环依赖 | S2 / S3 / S4 |
| 三.2 | userStore god object | S5 |
| 三.3 | 78% 假技能 | S4（结构）+ S8（内容） |
| 三.4 | 两套引擎、SquadBattleView 复制公式 | S2 / S3 |
| 三.5 | 配置散落、组件直改货币 | S5 |
| 四 | 172 text-white、配色、移动端、裂图 | S7 |
| 五.1 | 7.2MB 首屏、图片缓存、定时器泄漏 | S9 |
| 五.2 | 无鉴权、debug=True、存档并发 | S10 |
| 六 | 全前端架构 → engine 化 / 权威后端 | S2–S4 / S11 / S12 |
| 工程 | 无测试、死代码、console | S1 / S6 |

---
*创建于 2026-06-12。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。*
