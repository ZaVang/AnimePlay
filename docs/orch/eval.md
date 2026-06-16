# Evaluator 报告 — Evolution 第 1 轮（E1-T1/T2/T3）

> QA Evaluator 独立验证。不信 Generator 自报，亲自重跑全部验收命令 + 抽查代码。
> 验证时间：2026-06-16。tier1 on：本决策为**信息性**（给下一轮 Planner），不直接终止循环。

---

## 1. Checkbox 状态（docs/SPRINT.md「Evolution 第 1 轮」段）

| 任务 | 行 | 状态 |
|---|---|---|
| E1-T1 每日任务 + 每日登录奖励 | L88 | `[x]` ✅ |
| E1-T2 图鉴/收集完成度 + 里程碑 | L91 | `[x]` ✅ |
| E1-T3 成就系统 | L94 | `[x]` ✅ |

三项全部勾掉，与合同要求一致。

---

## 2. 验收命令重跑结果（亲自跑，真实输出）

| # | 命令（frontend-vue/ 下）| 结果 | 真实输出摘录 |
|---|---|---|---|
| 1 | `npm run type-check` | ✅ PASS | `vue-tsc --build`，退出码 0，无任何错误/额外输出 |
| 2 | `npm run test` | ✅ PASS | `Test Files 28 passed (28)` / `Tests 336 passed (336)`，退出码 0，Duration 3.88s |
| 3 | `npm run build` | ✅ PASS | `✓ built in 8.80s`，退出码 0，产物正常 |

三条全绿。测试数 336 ≥ 合同下限（≥310 全绿 + 新增）。

---

## 3. Generator 自报 vs 实测对比

| 指标 | gen_status 自报 | 我的实测 | 一致？ |
|---|---|---|---|
| type-check | 0 错 | 0 错 | ✅ 一致 |
| 测试数 | 336 passed (28 files) | 336 passed (28 files) | ✅ 一致 |
| build | `✓ built`（自报 10.66s）| `✓ built in 8.80s` | ✅ 一致（耗时机器差异，不计） |
| 新测试文件 | daily/codex/achievements 三个 | 实存，用例数 10/6/7 = 23 | ✅ 一致 |
| 成就条数 | 18 | `grep id:'ach_'` = 18 | ✅ 一致 |
| 每日任务条数 | 4 | `grep id:'daily_'` = 4 | ✅ 一致 |

**无夸大、无造假。** 自报数字逐项落地。浏览器闭环部分无法复验（无后端实跑），但代码侧已交叉印证埋点链真实存在。

---

## 4. 代码抽查结果（亲自 Read 核实，逐项判定）

### 4.1 三个新 store 独立 + userStore 未被塞领域逻辑 — ✅ 属实
- `stores/daily.ts`（157 行）/ `stores/codex.ts`（132 行）/ `stores/achievements.ts`（132 行）均存在，是自包含领域 store，各带 serialize/deserialize/reset 三件套。
- `daily.ts` 自带 `todayKey()`（复制 shop 模式，未横向 import）、`ensureToday()` 读时跨天归零、`markProgress/claim/claimLoginReward`。
- `codex.ts` 完成度为 computed 纯派生，只存 `claimedMilestones: string[]`。
- `achievements.ts` 只存 `unlocked: string[]`，stats 会话级 reactive（不进档），`check()` 事件驱动幂等。
- userStore 仅在**编排函数加调用行**（markProgress/check/claimLoginReward/claim），新增 `withNurtureProgress` 包装器与 `claimDailyTask`/`claimCodexMilestone` 门面——均为薄编排，无规则下沉。

### 4.2 6 个玩法成功点埋点 — ✅ 全部命中，对战在 battleFlow（无漏）
| 成功点 | 位置 | 埋点 |
|---|---|---|
| 抽卡 | userStore.ts:143-144 | `daily.markProgress('gacha')` + `ach.check('gacha', {rarities})` |
| 收观看 | userStore.ts:354-355 | 返回值守卫内 `markProgress('watch')` + `check('watch')` |
| 养成互动 | userStore.ts:288-290（withNurtureProgress 包 3 入口）| `markProgress('nurture')` + `check('nurture', {characterMaxLevel})` |
| 猜对 | userStore.ts:257（+ 262 猜错 resetGuessStreak）| `check('guess')` |
| 爬塔 | userStore.ts:412 | 返回值守卫内 `check('tower', {floor})` |
| **对战胜利** | **battleFlow.ts:127-129** | `outcome.winner === 'playerA'` 块内 `markProgress('battleWin')` + `check('battleWin')` |

对战埋点确在 `battleFlow.endGame` 的胜利分支（scout 强调的唯一例外），**没漏**。

### 4.3 schema v5→v6 三处同改 + 测试只追加 — ✅ 属实
- `schema.ts`：`SAVE_VERSION = 6`，新增 `DailySave` 接口 + SavePayload 末尾三键（daily/codexMilestones/achievements）+ `createDefaultDaily()` 工厂 + 顶部块注释。
- `migrations.ts`：新增 `migrateDaily()` 字段级兜底，migrate() 末尾加三键（codexMilestones/achievements 数组守卫）。既有 v1~v5 迁移逻辑一字未动。
- `persistence.ts`：import 三个新 store；buildPayload/applyPayload/resetAllDomains 各加三行装配。
- `migrations.test.ts`：diff 只追加 3 个 v6 用例（缺省补默认 / v6 原样保留 / 局部损坏字段兜底），唯一 `-` 行是 import 行扩展（非断言改动），既有断言未改。
- `persistence.test.ts`：diff 只追加（三域往返断言 + 「payload 全键列表」加三键 + TODAY_KEY 辅助）。用 `TODAY_KEY` 塞值避免 deserialize 的 ensureToday 跨天清零——处理正确。

### 4.4 图鉴完成度纯派生 + 不硬编码 665 — ✅ 属实
- `CodexPanel.vue:38` 用 `gameDataStore.allAnimeCards` / `allCharacterCards`；完成度走 `codex.animeCompletion/characterCompletion`（computed）。
- `codex.ts` `completionFor()` 分母 = `allCards.length`，owned 用 `collection.getXxxCardCount(id) > 0` 判定。
- **全仓 `grep 665` 在 src/ 命中 4 处，均为注释/AI 配置/技能数据 id，CodexPanel 与 codex.ts 零硬编码 665。**

### 4.5 颜色铁律 — ✅ 合规（一处 text-white 是合法例外，非违规）
- `grep "text-white\|bg-\${"`：DailyTasksPanel / AchievementsPanel **零命中**。CodexPanel 命中 **1 处**：
  - `CodexPanel.vue:185` `text-white bg-black/60` —— 这是**卡图右上角稀有度角标的压片白字**（白字压在 `bg-black/60` 半透明深色 badge 上，且整体浮在卡片图片上）。这正是 CLAUDE.md 明列的允许例外：「图片压片白字是仅有的固定色例外」。**判定：合规，不算违规。**
  - 「未拥有」灰位遮罩用 `text-ink-2` / `bg-surface/80`（语义色），灰位用 `opacity-40 grayscale`（非颜色类）。
- 无任何 `bg-${...}` 动态色类拼接。

### 4.6 engine 纯净 — ✅ 属实
- `grep "defineStore|from 'pinia'|new Date()|useProfileStore|markProgress"` 扫 `engine/`：**零命中**。日期/进度/成就判定全在 stores 层，engine 未被塞 Pinia/Date 副作用。

---

## 5. pitfalls 合规

| pitfalls 条目 | 合规 |
|---|---|
| engine 纯净（零 Vue/Pinia/Date/IO）| ✅ engine 零命中 |
| 依赖只向下 | ✅ 新逻辑在 stores，组件→store→config，无反向 |
| 存档新增字段三处同改 + 旧档缺省 + 测试只追加 | ✅ schema/migrations/persistence 全改，测试只 append |
| 领域 store 自己不调 saveToServer | ✅ 三 store 均不触发存档，由门面统一 |
| 颜色语义类，禁 text-white 压浅底/禁动态色类 | ✅ 唯一 text-white 是图片压片合法例外 |
| 总数 .length 派生不硬编码 665 | ✅ 完成度全派生 |
| userStore 已偏大，新逻辑进独立 store，成功点只加一行 | ✅ userStore 只加编排行 + 薄门面 |

---

## 6. 结构漂移核查

项目无 `docs/project_structure.md` —— **跳过结构漂移核查**。新增文件（3 store + 3 component + 3 config + 3 test = 12 个）布局符合既有 stores/components/config/ 约定。

---

## 7. 失败分析

无失败项。三条验收命令全绿，代码抽查全部属实，无缩水/夸大/埋点漏/颜色违规/测试造假。

---

## 8. 新发现的坑（补充 Generator 已记录的）

Generator 已记录 4 条坑（UR 同命中 SSR 档、round-trip 与跨天清零张力、MAX_CHARACTER_LEVEL=100、data/auth 运行时目录），均属实且有价值。Evaluator 补充：

- **[git 状态] evolution-1 全部改动仍未提交**（working tree dirty：12 个改动文件 + 12 个新文件）。git log 顶是 S10（204f836）+ skills 清理（3f9d99f），本轮成果未落 commit。下一轮/收口前需提交，否则有丢失风险。
- **[测试隔离] persistence.test 依赖真实系统时钟**：用 `new Date()` 算 TODAY_KEY 塞值。当前可过，但若测试跨午夜运行（塞值时刻与 deserialize 时刻分属两天）理论上有偶发风险。概率极低，记录备查。

---

## 9. 决策（tier1 on，仅信息性）

**DECISION: COMPLETE**

依据：
- 三条验收命令亲自重跑全绿（type-check 0 错 / test 336 passed / build 成功），与 Generator 自报逐项一致，无夸大。
- E1-T1/T2/T3 三 checkbox 全 `[x]`，功能埋点链代码侧交叉印证真实存在。
- 代码抽查 6 大项（独立 store / 6 成功点埋点 / schema 三处同改 / 完成度纯派生 / 颜色铁律 / engine 纯净）**全部属实**。
- 唯一 text-white 命中为图片压片合法例外，非违规。
- pitfalls 全条合规。

本轮「留存引擎」三件套（每日任务/登录、图鉴完成度/里程碑、成就系统）质量达标、诚实交付。

**给下一轮 Planner 的提示**：
1. 本轮成果尚未 commit，建议下一轮开工前先落 commit 固化。
2. 经济「只进不出」张力仍在——daily 已以券为主缓解，但里程碑/成就仍发知识点。reviewer 🟡-4 知识点出口（商城扩展）建议下一轮正式做，对齐 plan.md 留的尾。
3. daily 当前每类型仅 1 条任务（markProgress 已按类型遍历为多任务预留），若要丰富每日任务池，config 直接扩即可，无需改 store。
