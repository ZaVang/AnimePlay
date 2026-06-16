# Evaluator Report — Evolution 第 4 轮（B1/B2/B3，tier1 off）

> QA Evaluator 独立验证。**不信任 Generator 自报**，亲自重跑三条验收命令 + 抽查代码。
> 日期：2026-06-16。源：docs/SPRINT.md「Evolution 第 4 轮」/ plan.md / gen_status.md（自称 PASSED, test 372）。

## 1. Checkbox 核对（docs/SPRINT.md）

| 任务 | 行 | 状态 |
|---|---|---|
| B1：周任务 + 连续登录递增 | 139 | `[x]` ✅ |
| B2：番剧年表时间轴 | 142 | `[x]` ✅ |
| B3：跨系统红点提示 | 145 | `[x]` ✅ |

三项均已勾 `[x]`，与合同一致。

## 2. 验收命令亲自重跑（frontend-vue/，真实输出）

| 命令 | 退出码 | 实测结果 |
|---|---|---|
| `npm run type-check` | 0 | `vue-tsc --build` 无输出，**0 错** ✅ |
| `npm run test` | 0 | **Test Files 32 passed (32) / Tests 372 passed (372)**，Duration 3.54s ✅ |
| `npm run build` | 0 | `✓ built in 6.92s`；CollectionsView 36.85kB、index 238.28kB；**成功** ✅ |

阈值：合同要求 test ≥354（基线）+ 新增。实测 372 = 354 + 18，**达标**。

## 3. 自报 vs 实测对比

| 自报 | 实测 | 结论 |
|---|---|---|
| type-check 0 错 | 0 错 | 属实 |
| test 372 全绿（+18，基线 354） | 372 passed | **完全属实**，无夸大 |
| build 通过 | exit 0，built in 6.92s | 属实（产物体积与自报一致） |
| B1/B2/B3 → `[x]` | 三处确为 `[x]` | 属实 |

**无夸大、无缩水。** 自报数字与实测逐项吻合。

## 4. 代码抽查（亲自 Read）

### B1：schema v6→v7 三处同改 — ✅ 属实
- **schema.ts**：`SAVE_VERSION = 7`；`DailySave` 扩 4 字段（`weekDate/weeklyProgress/weeklyClaimed/loginStreak`）；`createDefaultDaily()` 补四字段缺省（weekDate '', weeklyProgress {}, weeklyClaimed [], loginStreak 0）；v7 块注释到位。
- **migrations.ts**：`migrateDaily` 补四字段缺省，逐字段类型守卫（`typeof === 'string'` / `typeof === 'object'` / `Array.isArray` / `typeof === 'number'`），旧 v6 档无此四字段→缺省。
- **装配器 stores/persistence.ts**：随 serialize/deserialize 自动带（daily store 的 serialize/deserialize 已扩字段，装配器无需改）— 自报如实，往返测试验证保真。

**测试断言未弱化 — ✅ 确认是合理更新而非掩盖回归**（逐行对比 git diff）：
- migrations.test 改动的两个 v6 用例：旧断言 `out.daily` 只有 4 个日字段，迁移后输出**合法地多了 4 个 v7 字段**，旧断言必然失败，新断言保留全部 4 个旧字段 + 验证 4 个新字段缺省 → **断言被加强，非弱化**。原 v1→v2、v4/v5、损坏兜底 describe 块**全部保留**（行 39/102/130/212 等仍在）。新增 v7 原样保留 + v7 局部损坏补默认两个用例为纯追加。
- daily.test 改动的「每日登录奖励」用例：自报承认改了一处 — 旧断言「只验固定档」，B1 后 `claimLoginReward` = `DAILY_LOGIN_REWARDS` + `loginStreakRewardFor(streak)`（首登第1档），旧断言会失败。新断言改为「固定 + 第1档求和」精确断言 → **因连签奖励变化的合理更新**，非掩盖。其余为纯追加（周任务跨周/做满/连签递增/断签归1/同日不变/里程碑更厚 +11 用例）。

**连签逻辑（daily.ts claimLoginReward）— ✅ 与合同一致，daily.test 已锁定**：
- 今日已领（lastLoginDate === today）→ 早退 return false（不变）。
- 昨日登录（lastStr === yesterdayStr）→ streak += 1。
- 断签/首次（既非昨日也非今日）→ streak = 1。
- 测试「连续两天→2」「断签（跳过一天）→1」「同日重复→不变不发奖」「首登→1+发第1档」均通过。

**周任务复用 markProgress — ✅ 属实**：`markProgress` 同时遍历 `DAILY_TASKS` 与 `WEEKLY_TASKS`，6 个埋点一行未改（自报如实）。WEEKLY_TASKS 刻意只选已有埋点类型（gacha/battleWin/watch），未引入新埋点。

**facade 规则 — ✅**：daily.ts 从不调 saveToServer（grep 零命中）；周任务领取走 `userStore.claimWeeklyTask`（领成功才 saveToServer）。

### B2：纯派生零存档 — ✅ 属实
- AnimeTimeline.vue：遍历 `userStore.animeCollection` → `getAnimeCardById(id).date` → `date.slice(0,4)` 配 `/^\d{4}$/` 守卫（缺失/非标准归「未知」沉底）→ 按年降序分组。纯 computed，未登录守卫 + 空态友好。
- **date 缺失有守卫**：`typeof card.date === 'string'` + 正则，非法归 UNKNOWN_YEAR。
- **不新存字段**：schema 仅因 B1 升 v7，B2 未追加任何存档字段（schema.ts 无 timeline 相关字段）。

### B3：成就已读用 localStorage 不升 schema — ✅ 属实
- `stores/achievementsRead.ts`：localStorage（key `achievements-read-count`），仿 onboarding 的 try/catch；存「已读数量」而非进存档。**未给成就加存档字段**（schema.ts achievements 仍是 `string[]` 已解锁 id，未动）。
- **红点信号是派生 computed**：App.vue `homeHasSignal`（日/周任务做满未领 OR 登录奖励可领）+ `collectionsHasSignal`（里程碑可领 `codexStore.claimableMilestones.length>0` OR 成就未读 `hasUnread`）均为纯 computed。依赖的 `codexStore.claimableMilestones` 确实存在（非幻象引用）。
- **领取/查看后红点消失（响应式）**：CollectionsView watch activeTab → 切 'achievements' 即 `markRead` → collectionsHasSignal 重算消失；领日任务 → isClaimed 变 → homeHasSignal 重算消失。
- achievementsRead.test：init/hasUnread/markRead 不回退/localStorage 不可用不抛（7 用例，内存 stub 仿 onboarding.test）✅。

### 颜色 — ✅ 无违规
- AnimeTimeline.vue：grep `text-white|bg-${` 零命中；全语义类（text-ink/text-ink-2/text-ink-3/text-accent/bg-surface-2/border-line）。稀有度色点复用 `GAME_CONFIG.animeSystem.rarityConfig.c`（全站唯一来源，属铁律允许的稀有度识别色例外，已注释说明）。
- App.vue 红点：`.nav-dot` 用 `rgb(var(--c-danger))` + `rgb(var(--c-header))` 描边，语义令牌，无硬编码。
- DailyTasksPanel.vue：grep `text-white|bg-${` 零命中。

### engine 纯净 — ✅
grep `WEEKLY_TASKS|loginStreak|weekKey|AnimeTimeline|achievementsRead|nav-dot|hasSignal` 于 `engine/`：**零命中**。周任务/年表/红点逻辑全在 config/stores/components/views，未污染 engine。

## 5. pitfalls 合规

- ✅ 升 schema 照 evo-1 三处同改 + 迁移 + 测试模式，旧档 v1~v6 缺省补齐，只追加不破坏既有断言。
- ✅ markProgress 复用遍历，6 埋点零改。
- ✅ B3 localStorage 设备级（仿 onboarding try/catch），不进存档；vitest node 环境用内存 stub。
- ✅ B2 纯派生不新存字段，date 缺失守卫。
- ✅ 颜色语义类，无 text-white 压浅底。
- ✅ 发奖走 profile.earn；领域 store 不调 saveToServer（门面负责）。

## 6. 结构漂移检查

项目**无 `docs/project_structure.md`**（已确认不存在）→ **跳过结构漂移核对**。新增 2 源文件 + 1 测试（AnimeTimeline.vue / achievementsRead.ts / achievementsRead.test.ts）均落在惯例目录（components/ / stores/），符合既有结构。

## 7. 失败分析

**无失败项。** 三条验收命令全绿，B1/B2/B3 全 `[x]`，代码抽查全部属实，无测试弱化、无误升 schema、无颜色违规、engine 纯净。

## 8. 决策

- Checkbox：B1/B2/B3 全 `[x]` ✅
- 验收命令：type-check 0 错 / test 372 全绿 / build 成功 ✅
- 自报 vs 实测：完全吻合，无夸大缩水 ✅
- 代码抽查：v6→v7 三处同改属实、测试断言为合理更新非掩盖回归、成就已读用 localStorage 不升 schema、纯派生零存档、颜色合规、engine 纯净 — **全部属实** ✅

满足 COMPLETE 全部条件。

DECISION: COMPLETE
