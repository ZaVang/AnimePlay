# Generator Status — Iteration 5 (evolution R1: 小游戏 Hub + 高低牌)

> 注：本轮 Generator subagent 在 32 tool-use 处 socket 掉线（仅改完 schema.ts+migrations.ts）；orchestrator 接管续做完成全部任务（pitfalls「掉线可接管续做」）。

## 完成的任务
- [x] **MG-T1 小游戏 Hub + 猜角色迁入** — 新建 `views/MiniGamesView.vue`（CollectionsView 同款选择器，游戏卡切换 + 各游戏最高分）；`router/index.ts` 加 `/minigames`、`/guess` 改 redirect；`App.vue` 导航「🎭 猜角色」→「🎮 小游戏」`/minigames`；`<GuessCharacter />` 原样迁入不改内部；上次选的游戏存 localStorage（设备级）；删除孤立 `views/GuessView.vue`。
- [x] **MG-T2 高低牌 Higher/Lower** — `stores/minigames/higherLower.ts`（纯函数 cardValue/pickCard/pickRound/judge/streakReward/cappedAward + 注入 RNG）+ `components/HigherLowerGame.vue`（三维度选择/揭示动画/连胜/结算）。**维度按卡类型分桶**（Scout 实测铁律）：角色 `popularity_score` / 番剧 `rating_total` / 番剧 `date` 年份——三者皆「数值大=更多」，无 rating_rank 方向歧义、不混用。平局由 pickRound 保证两值不等而消除。
- [x] **MG-T3 存档 v7→v8 + 经济防刷** — schema.ts（SAVE_VERSION=8、MiniGamesSave 接口、createDefaultMiniGames、v8 注释，**不动 guess 域**）；migrations.ts（migrateMiniGames 字段级缺省）；persistence.ts 装配器三处注册；`userStore.settleHigherLower`（仿 submitGuess：minigames.settle→profile.earn→saveToServer）；防刷 = 连胜里程碑发奖（streakReward 每 5 连 +15）+ 每日封顶 120 知识点（todayKey 跨天归零记账）。

## 未完成的任务
- 新小游戏 #2（SPRINT 留 [ ]）—— 本轮范围只到 Hub + 游戏 #1，#2 是第 6 轮。

## 验收命令输出（orchestrator 亲跑）
- `npm run type-check` → 0 错误。
- `npm run test` → **Test Files 33 passed / Tests 383 passed**（基线 372 + 11 新增：高低牌纯逻辑/选卡/封顶 + store 流程 + settle 经济封顶 + v8 迁移默认 + persistence minigames 往返 + payload 键）。
- `npm run build` → ✓ 306 modules / built in 2.82s。

## 新发现的陷阱
- [数据] 高低牌维度**必须按卡类型分桶**：角色无 rating_rank/date，番剧无 popularity_score（实测 0% 覆盖）；裸 rating_score 仅 20 distinct 不可用。审计报告的「番剧用 popularity_score / rating_rank 1–250」是错的，Scout 实测纠正为番剧 rating_rank 1–1983 / 用 rating_total 更稳。
- [store] Pinia setup store 的持久化字段若要被测试 seed/assert，必须在 return 里导出（awardDate/awardedToday 初版漏导出，type-check + 往返测试同时报错——补导出后双绿）。
- [经济] streak 可无限长 → 必须里程碑发奖 + 每日封顶，否则一局连对刷爆知识点。

## 文件结构变更（防漂移自报）
- 新增：`views/MiniGamesView.vue`、`components/HigherLowerGame.vue`、`stores/minigames/higherLower.ts`(+`.test.ts`)。
- 删除：`views/GuessView.vue`（/guess 改 redirect 后零引用）。
- 改职责：schema/migrations/persistence 加 minigames 域；router/App 导航；userStore 加 settleHigherLower。
- 项目无 `docs/project_structure.md`，无需同步。

## 状态
PASSED
