# Plan — S14-F Round 3/3（product-loop --tier1 on --mode all · 收官轮）

> 本轮承诺切片 = **SF-T8｜家园日常委托（P3-10）** —— S14 家园 hub 深化的最后一块。
> 本轮唯一新任务 = SF-T8（必须真实现，不得降级为回归核对）；其余为 S14-F / S14 收官核对（Evaluator 亲自复跑 5 条验收命令 + 核对 SF-T1..T8 全 `[x]`、S14-A..E 25 项无回归）。
> 触存档：走 `daily` 内平行 `commission` 子域，**升 SAVE_VERSION 18 → 19**（一 sprint 只升一次，用掉即封顶）。

---

## 任务 1（本轮唯一必做）：SF-T8 家园日常委托（P3-10）

**目标**：补 hub 缺失的「每天为什么回来」日回归钩子。把家园三个玩家本来就在做的本地成功点（挂机结算 / 打一层塔 / 强化一件装备）包成「今日委托」，闭环全在 hub 内，逐条给小奖 + 今日全清 bonus。委托是软钩子非硬 KPI（漏做无惩罚、奖励小到「做了开心不做无损」，动森村民请求哲学 / 守 config/homestead.ts 顶部「回归补充不盖过主动收入」基线）。

**依赖**：SF-T1..T7（R1/R2 已 COMPLETE，851 tests 全绿）——SF-T8 UI 挂 `HomesteadView` ops-panel 须与 R2 落地的 SF-T3 驻留卡视觉共存。无代码级阻塞依赖。

**来源**：homestead-hub-audit-report P3-10；research-audit R3（替代 1 方案 B + 替代 2 方案 B）；evolution-audit R3（🔴 Critical SF-T8 + 🟡 全清 bonus）；product-audit R3（🔴 三守卫 + 🟡 视觉分区/清单勾选/cue）；Scout Iteration 3/3 A/B/C 段。

### 关键设计决策拍板（写进验收）

1. **命名空间 = `daily` 内平行 `commission` 子域（方案 B）**，不扩 `DailyTaskType` 枚举。复用 `daily` 跨天口径（`todayKey`/`ensureToday` 范式，读时判定跨天归零、幂等），**绝不自造第二套跨天判定**。新增独立 `COMMISSIONS` 模板 + 独立 commission 进度/已领桶 + 独立 `markCommission(kind)` 埋点 + `commissionKind='idle'|'tower'|'enhance'` 类型。理由：语义纯度 > 省 2 字段迁移成本；家园语义不污染全站留存引擎；UI 天然与 daily task 分区；可挂独立全清 bonus。

2. **委托模板 = 3 条固定（target=1）**：`commission_idle`（挂机结算一次）/ `commission_tower`（打一层塔，含扫荡）/ `commission_enhance`（强化一件装备）。措辞强调「家园本地小事 · 不用离开家园」（区别于 daily 全站行为）。逐条小额奖励（各 20~30 KP 量级，对齐现有 daily task 30 KP），走 `profile.earn`。

3. **三守卫（不做会崩，验收专项卡）**：
   - ① 挂机委托守**实际产出**——`markCommission('idle')` 埋在 `settleHomestead` 全 0 产出早退**之后**、`saveToServer` 前（只有真发放收益才到达）。**绝不用 `hours>0`**（首次基线早退 / SF-T6 回拨钳位早退 / 0 入住空结算都可能 hours 存在但产出 0，反复进出刷委托）。
   - ② 塔委托**同埋两处**——`markCommission('tower')` 同挂 `completeFloor`（`completed===true` 分支）**和** `sweepFloor`（`ok && reward` 分支），毕业玩家（塔顶 completeFloor 返 false）靠扫荡也能完成。**绝不复用 `battleWin`**（宅理论战 `battleFlow.endGame` 计数，语义污染 = 最易踩错配）。
   - ③ **保底可完成**——`commission_idle`（有入住角色即结算）是天然保底，确保全清 bonus 不因毕业/破产账号变空诺。

4. **今日全清 bonus（委托区别于 daily 的核心，本轮做）**：3 条清完给一份额外 bonus（如 +50 KP 或 +1 券）。实现 = `allCommissionsDone` 派生 + 全清「已领」标记**复用 commission 已领桶存特殊 key**（如 `'__bonus__'`，**不新增第 4 序列化字段**，跨天随委托一并归零）+ 独立领取 action。R3 时间紧则 fallback 留收尾补，但**逐条委托 + 三守卫 + 保底无论如何必做**。

5. **埋点层**：三个 `markCommission` 埋点**只挂 `userStore` 门面编排层**（与现有 5 个 `markProgress` 同构同位，写在各自 `saveToServer` 前），**绝不进 engine**（engine 纯净铁律）。委托领取门面仿 `claimDailyTask`（领取成功才 `saveToServer`）；发奖走 `profile.earn`。

6. **UI 落点**：委托 UI 挂 `HomesteadView` 右侧 `ops-panel`、插在 SF-T3 驻留卡之下（「家园日常状态」语义簇）。**视觉与 SF-T3 驻留横条区分**——target=1 本质布尔勾选，**用清单勾选（`○/✓ 标题·奖励`）+ hub 级「委托 X/N」小徽章摘要，不再来一条大横条进度条**。cue（X/N 摘要）进 home 第一屏可见。未登录态守卫。颜色语义令牌（未完成 `--c-ink-3`、可领 `--c-accent`/`--c-highlight`、bonus success 绿），禁 text-white / 动态色类。完成/领取点亮走 CSS transition，全清 bonus 飘字复用 `.sweep-float-*`；飘字 setTimeout 必须登记 + onUnmounted 清除。

7. **存档三处同改 + 升 v19**：commission 进度/已领桶字段（与 daily 现有 `progress`/`claimed` 同构）→
   - schema：`DailySave` 加字段 + `createDefaultDaily` 缺省 + `SAVE_VERSION` 18→19（权威）+ 顶部版本注释加 v19 段。
   - migrations：`migrateDaily` 加字段级缺省兜底（**白名单重建不用 spread**，仿 v7 weekly 四字段）+ 顶部注释 v19。
   - 装配器：daily.ts `serialize`/`deserialize`/`reset` 三处加字段，deserialize `?? {}`/`?? []` 兜底 + 加载后跨天判定归零。
   - 权威 SAVE_VERSION 在 schema.ts，文档只指向不复述。

### 相关陷阱（照抄会踩，来自 Scout B 段 + pitfalls）

- [C-SF-T8 idle 空结算刷委托] 埋点必须写在 `settleHomestead` 全 0 产出早退之后（未登录 / 首次基线 / 回拨钳位 / 0 入住空结算 4 条早退之后），绝不用 `hours>0`。
- [C-SF-T8 tower 语义错配] 绝不复用 `battleWin`；必须同埋 `completeFloor`(completed) + `sweepFloor`(ok)，毕业玩家靠扫荡完成。
- [C-SF-T8 跨天口径漂移] 委托跨天必须复用 daily 的 `todayKey`/`ensureToday` 范式，绝不自造第二套。
- [C-SF-T8 迁移 spread 陷阱] `migrateDaily` 已是白名单重建对象（非 spread），加字段照抄同结构，勿改成 spread 旧档（删/改字段迁移必须白名单重建）。
- [C-SF-T8 埋点入 engine] `markCommission` 只挂 userStore 门面，engine 纯净不得 import store。
- [C-SF-T8 UI 进度条糊] 委托卡与 SF-T3 驻留卡同处 ops-panel，委托用完成度摘要 + 逐条勾选，别再来一条大横条。
- [C-SF-T8 全清 bonus 空诺] `commission_idle` 保底必须存在。
- [C-SF-T8 daily reset 漏字段] `reset`/`serialize`/`deserialize` 三处都要加新字段，漏一处 → 登出/切账号残留或往返丢失。
- [定时器/飘字清除] 委托领取若加飘字，setTimeout 必须登记 + onUnmounted 清（HomesteadHubView 有 `timers[]`+`scheduleClear` 范式、HomesteadView 有 rAF+idleTimer onUnmounted 清范式）。
- [货币入口] 委托/bonus 发奖只走 `profile.earn`。
- [commission_bonus key 复用] 全清 bonus 已领标记复用 commission 已领桶特殊 key（如 `'__bonus__'`），不新增第 4 字段。

### 验收

- 委托走 daily 内平行 commission 子域（不扩 `DailyTaskType`、复用 `todayKey`/`ensureToday` 不自造跨天）；3 条委托模板存在、走 `profile.earn` 小额奖励。
- 三守卫全落地（idle 守实际产出非 hours>0 / tower 同埋 completeFloor+sweepFloor 不碰 battleWin / idle 保底可完成，`daily.test.ts` 断言锁）。
- 今日全清 bonus 派生 + 特殊 key 领取标记（不新增第 4 字段）。
- 三个埋点在 userStore 门面 saveToServer 前、engine 零新增 import store。
- UI 挂 ops-panel 驻留卡下、清单勾选而非横条、home 第一屏可见 X/N 摘要、未登录守卫、颜色语义令牌、飘字/定时器登记清除。
- 存档三处同改 + `SAVE_VERSION`=19 + `migrations.test.ts` v18→v19 往返全绿（旧档缺字段兜底、新档往返保真、无关字段不漏）。
- SF-T1..T8 全 `[x]`、S14-A..E 25 项无回归。

---

## 任务 2（收官核对，非新范围）：S14-F / S14 整体收官巡检

- 核对 SPRINT.md 主清单 L20-27 + 三轮追加块 SF-T1..T8 全 `[x]`（SF-T8 落地后勾）。
- 核对 `docs/FUTURE.md` S14-F 全部 `[ ]` → `[x]`、进度总览 S14 → ✅。
- 收官一致性巡检：hero 流程示意（非导航）/ 战力口径措辞（去黑话）/ 套装 chip / 驻留进度条 / 委托卡在 home 面板视觉统一无割裂。
- **Orchestrator 收尾勿只看末轮 Evaluator 决策**（S14-A SA-T6 被漏正是此坑），须核对「SF-T1..T8 全 `[x]` 且与实现一致」。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增 commission + v18→v19 迁移测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-F 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，SF-T8 真实现且 `[x]`、SF-T1..T8 全 `[x]`。**S14-F 整体完成** = SF-T1..SF-T8 全 `[x]`（→ S14 家园 hub 深化全部收官）。
