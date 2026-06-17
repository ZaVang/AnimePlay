# Iteration 5 Plan (evolution R1/5 — 小游戏 Hub + 高低牌)

> 需求源：`docs/orch/evolution-audit-report.md` 🔴 建议 + `docs/orch/scout.md`（Scout 实测数据纠偏）+ SPRINT 硬性交付。tier1 on。
> **本轮范围 = Hub + 猜角色迁入 + 新游戏 #1（高低牌）**。游戏 #2 = 下一轮（第 6 轮）。

## 本轮任务（按依赖顺序）

1. **MG-T1：统一小游戏 Hub + 猜角色迁入**
   - 目标：新建 `views/MiniGamesView.vue`（路由 `/minigames`），导航「🎮 小游戏」**取代**「🎭 猜角色」，`/guess` 改 redirect 到 `/minigames`。Hub 用 CollectionsView 同款 `activeTab` 样板做游戏选择器；选中「猜角色」→ 原样渲染 `<GuessCharacter />`（**不改其内部**）。上次选的游戏存 localStorage（设备级，不进存档）。
   - 依赖：无
   - 验收：导航点「🎮 小游戏」进 Hub；Hub 能在「猜角色」与「高低牌」间切换；猜角色玩法照旧（开始/猜测/计分/兑换知识点）；`/guess` 自动跳 `/minigames`；type-check/build 通过。
   - 来源：Evolution Reviewer 🔴-1

2. **MG-T2：新游戏 #1 = 高低牌 Higher/Lower**
   - 目标：给两张同类卡，猜右边某维度比左边「更高/更早」。**维度按卡类型分桶（Scout 实测铁律）**：角色模式用 `popularity_score`（13–4050）；番剧模式用 `rating_rank`（1–1983，零平局，"排名更靠前"）或 `date`（"谁更早放送"）。连对累 streak，猜错即结算。纯逻辑（选卡/比维度/判定/计分）抽 `stores/minigames/higherLower.ts` 纯函数 + **注入 RNG**（仿 `engine/gacha/draw.ts` 的 rng 用法）+ 特征测试（种子断言）。store 编排层喂 `Math.random`（猜角色先例）。
   - 依赖：MG-T1（要进 Hub）、MG-T3（最高分/连胜要持久化）
   - 验收：能玩满一局（出两卡→选高/低→对则 streak+1 继续，错则结算）；维度分桶正确（角色 popularity / 番剧 rating_rank|date，不混用）；平局判用户友好（判对或跳同值卡）；bestStreak/最高分记录并持久化；经济达标发奖且**有每日封顶防刷**；特征测试覆盖判定+计分+平局分支。
   - 来源：Evolution Reviewer 🔴-2（经 Scout 数据纠偏：弃 rating_score，番剧用 rating_rank/date，角色用 popularity_score）

3. **MG-T3：存档 v7→v8 新增 minigames 域 + 经济防刷**
   - 目标：升 `SAVE_VERSION` 7→8，新增 `minigames` 域（存高低牌 `highScore`/`bestStreak`/`playCount` + 当日已发奖计数与日期用于防刷）。**不动 v7 的 `guess` 域**（其往返断言锁在 migrations.test）。经济：高低牌按 streak 里程碑发知识点（走 `profile.earn`），当日产出封顶（仿 `daily.ts` 的 todayKey 跨天归零）。结算埋点仿 `userStore.submitGuess`（领域逻辑→profile.earn→saveToServer）。
   - 依赖：无（但 T2 依赖它）
   - 验收：v7 旧档迁移加载补 minigames 缺省、v8 往返保真、不破坏 v1~v7 既有断言；每日发奖封顶生效（超额只记 bestStreak 不发知识点）；迁移+往返+防刷特征测试全绿。
   - 来源：Evolution Reviewer 🔴-4 + Scout B5

## 来自 Reviewer 的改进项（本轮采纳的）
- 小游戏 Hub + 猜角色迁入（🔴-1）→ MG-T1
- 高低牌作为新游戏 #1（🔴-2）→ MG-T2（**按 Scout 实测改维度选型**）
- schema v8 minigames 域（🔴-4）→ MG-T3
- 每日封顶防刷（Technical Health）→ MG-T3

## 相关陷阱（从 pitfalls.md / scout.md）
- **维度必须按卡类型分桶**：角色无 rating_rank/date，番剧无 popularity_score；裸 rating_score 仅 20 distinct 不可用。选卡按维度过滤 undefined（防御性）。
- 版本是 **v7→v8**（不是文档某些地方写的 v6）；不动 guess 域。
- engine 纯净：高低牌纯逻辑放 `stores/minigames/`，注入 RNG，不进 engine、不在纯函数里 Math.random。
- 经济只走 `profile.earn`；streak 可以很长 → **必须里程碑发奖 + 每日封顶**，否则一局连对刷爆知识点。
- 颜色语义类，禁 text-white 压浅底/禁动态色类；上次选的游戏用 localStorage 不进存档。
- GuessCharacter.vue 原样迁入，别改内部；GuessView.vue 删前确认仅 router 引用。

## 验收命令（从 SPRINT 复制）
```bash
cd frontend-vue && npm run type-check     # 0 错
cd frontend-vue && npm run test           # 全绿 + 新增（不低于 372）
cd frontend-vue && npm run build          # 生产构建通过
```

## 通过标准
Hub 可用且猜角色迁入正常、高低牌可玩且维度分桶正确、经济防刷生效、存档 v8 跨重开保真、三条验收命令全绿、架构/颜色铁律不破。SPRINT「统一小游戏中心」+「新小游戏 #1」两个硬性 checkbox 勾掉（游戏 #2 留下轮）。
