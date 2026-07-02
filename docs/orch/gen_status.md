# Gen Status — S14-F Round 3/3（product-loop --tier1 on --mode all · 收官轮）

本轮承诺切片 = **SF-T8｜家园日常委托（P3-10）**。真实现，**触存档：升 SAVE_VERSION 18 → 19**（三处同改 + 往返测试）。S14-F（SF-T1..T8）整体收官。

## 完成任务

### SF-T8 家园日常委托（P3-10）

命名空间走「`daily` 域内平行 `commission` 子域」（不扩 `DailyTaskType`），复用 daily 跨天 `todayKey` 口径，绝不自造第二套跨天判定。

- **`config/dailyTasks.ts`**：新增 `CommissionKind='idle'|'tower'|'enhance'` 类型 + `CommissionDef` interface（复用 `DailyReward`）+ `COMMISSIONS`（3 条固定，target=1：收挂机 30KP / 爬一层塔 30KP / 强化装备 20KP，措辞「不用离开家园」）+ `COMMISSION_BONUS_REWARDS`（全清 +50KP）+ `COMMISSION_BONUS_KEY='__bonus__'` + `getCommissionById`。
- **`stores/daily.ts`**：新增 `commissionDate`/`commissionProgress`/`commissionClaimed` refs + `ensureCommissionToday()`（仿 `ensureToday` 读时归零，复用 `todayKey`）+ getter（`commissionProgressOf`/`isCommissionComplete`/`isCommissionClaimed`）+ `markCommission(kind, amount=1)`（幂等钳 target，只遍历 COMMISSIONS）+ `claimCommission(id)`（发奖走 `profile.earn`）+ `allCommissionsDone` 派生 + `isCommissionBonusClaimed`/`claimCommissionBonus()`（复用 claimed 桶特殊 key，不新增第 4 字段）+ serialize/deserialize/reset 三处加字段（deserialize `?? {}`/`?? []` 兜底 + 加载后 `ensureCommissionToday`）+ return 块导出全部。
- **`stores/userStore.ts`（三守卫埋点，全在门面 saveToServer 前，engine 零 import）**：
  - ① idle：`markCommission('idle', 1)` 埋在 `settleHomestead` 全 0 产出早退**之后**、`saveToServer` 前（守实际产出，绝不用 `hours>0`）。
  - ② tower 同埋两处：`completeFloor` 的 `completed===true` 分支 + `sweepFloor` 的 `ok && reward` 分支（毕业玩家靠扫荡完成；绝不复用 `battleWin`）。
  - ③ 保底：`commission_idle`（有入住即可结算）天然可完成，全清 bonus 不空诺。
  - enhance：`enhanceEquipment` 门面 `ok===true` 分支。
  - 领取门面 `claimCommission`/`claimCommissionBonus`（仿 `claimDailyTask`，成功才 saveToServer）。
- **存档三处同改 + 升 v19**：
  - `infra/persistence/schema.ts`：`DailySave` +3 字段 + `createDefaultDaily` +3 缺省 + `SAVE_VERSION` 18→19（权威）+ 顶部版本注释加 v19 段。
  - `infra/persistence/migrations.ts`：`migrateDaily` 白名单重建加 3 行字段级缺省兜底（仿 v7 weekly 四字段，禁 spread）。
  - `stores/daily.ts`：serialize/deserialize/reset 三处（上）。
- **`views/HomesteadView.vue` UI**：委托卡挂 `ops-panel`、插在 SF-T3 驻留卡（idle-card）之下。清单勾选（`○/✓ 标题·奖励`）而非横条；hub 级「委托 X/N」小徽章（在 home tab = `<HomesteadView/>` 第一屏 ops-panel 可见）；逐条「领取」按钮 + 今日全清 bonus 行（清完 3 条解锁）；未登录态由外层 `v-if="userStore.isLoggedIn"` 守卫（委托卡在 `v-else` 分支内）；颜色全走语义令牌（未完成 `--c-ink-3`、完成/已领 `--c-success`、bonus label `--c-highlight`），无 text-white / 动态色类；完成点亮走 CSS transition；全清 bonus 飘字 `setTimeout` 登记 `commissionTimers[]` + onUnmounted 一并 clear（与既有 rAF/idleTimer 同块清除）。
- **测试**：
  - `stores/daily.test.ts`：+9 断言（markCommission 推进/幂等钳/amount<=0 无操作、claim 发奖+重复领拒、跨天归零含 bonus 标记、全清 bonus 前置+重复领拒、保底守卫、序列化往返、旧档缺字段兜底跨天归零）。
  - `infra/persistence/migrations.test.ts`：+4 断言（SAVE_VERSION=19、v18 旧档补 commission 缺省保留日/周字段、v19 含 commission 往返保真、commission 损坏字段白名单重建补默认、缺 daily 整键含 commission 缺省）+ 同步修正 3 处既有 daily `toEqual` 全量断言补 3 字段。

## 文件结构变更自报

- 无新增文件。改动：`config/dailyTasks.ts`、`stores/daily.ts`、`stores/userStore.ts`、`infra/persistence/{schema,migrations}.ts`、`views/HomesteadView.vue`、`stores/daily.test.ts`、`infra/persistence/migrations.test.ts`；文档 `docs/plans/SPRINT.md`（SF-T8 勾选）、`docs/FUTURE.md`（S14-F 全勾 + 进度表 S14 → ✅）。
- **SAVE_VERSION 18 → 19**（本 sprint 唯一存档变更，v19 额度用掉即封顶）。

## 验收命令实际输出

1. `npm run type-check` → **通过**（vue-tsc --build，0 错误，无输出）。
2. `npm run test` → **全绿**：`Test Files 65 passed (65) · Tests 865 passed (865)`（R2 为 851，本轮 +14 新测试）。
3. `npm run build` → **成功**：`✓ built in 8.28s`（HomesteadHubView 126.42 kB / index 302.63 kB）。
4. `.venv/Scripts/python.exe backend/test_security.py` → **PASS**：`RESULT: PASS — all security checks passed`，`EXIT=0`。
5. `grep -rn "debug=True" backend/server.py api/index.py` → **零命中**（grep exit=1）。

## 新坑

- 既有 `migrations.test.ts` 有 3 处对 `daily` 做整对象 `toEqual` 全量断言——新增存档字段时**这三处必须同步补字段否则红**（本轮已修）。新增 daily 子字段者注意此耦合。

## 收官核对

- SF-T1..T8 全 `[x]`（SPRINT.md 主清单 L20-27 + 三轮追加块）；FUTURE.md S14-F 全 `[x]` + 进度表 S14 → ✅。
- S14-A..E 25 项无回归：865 tests 全绿（含既有 equipment/nurture/homestead/facility/migrations 特征测试），engine 未新增 import store，货币仅走 profile.earn。

## 状态

**PASSED** — SF-T8 真实现（三守卫全落地 + 全清 bonus + 升 v19 三处同改 + 往返测试），5 条验收命令全绿，S14-F（SF-T1..T8）整体收官。
