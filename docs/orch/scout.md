# Scout Report — Iteration 3 / 3（S14-F 收官轮 · product-loop --tier1 on --mode all）

> 本轮指派切片 = **SF-T8｜家园日常委托（P3-10）** + S14-F 收尾（确认 SF-T1..T8 全落地、S14-A..E 无回归）。
> SF-T1..T7 + 两条 refine 已在 R1/R2 落地并 COMPLETE（见 `eval.md` R2：851 tests 全绿）。本轮唯一新任务 = SF-T8，其余为收官核对。
> 三份审计（product/research/evolution）已就 SF-T8 设计**高度一致收敛**：`daily` 域内平行 `commission` 子域 + 3 新埋点 + 逐条小奖 + 今日全清 bonus。本 Scout 已 Read 全部落点，确认可行性与坑。

---

## A. 约束与可行性（给 Planner）

**SF-T8 是本轮唯一必做任务，必须真实现（不得降级为收尾核对）。** SA-T6 / S14-B 暴击 UI / S14-E R1 收口三次被漏教训在前——收官轮跑到 R3 ≠ 前轮已把 SF-T8 做了（前轮明令「不顺手做 SF-T8」，见 SPRINT L89 / plan.md L83）。**SF-T8 当前 `[ ]`（FUTURE.md L117 未勾、SPRINT L27 未勾）。**

### 命名空间拍板（三份审计一致推荐，Scout 确认）
**走「`daily` 域内平行 `commission` 子域」（研究审计替代 1 方案 B）**，不扩 `DailyTaskType` 枚举：
- 复用 `daily.ts` 的 `todayKey()`/`ensureToday()` 跨天口径（零新跨天逻辑，绝不自造 `todayKey`——两套跨天判定漂移是回归温床）。
- 新增独立 `COMMISSIONS` 模板（`config/dailyTasks.ts`）+ 独立 `commissionProgress`/`commissionClaimed` 桶 + 独立 `markCommission(kind)` 埋点 + `commissionKind = 'idle'|'tower'|'enhance'` 类型。
- 语义干净（家园委托不污染全站留存枚举，守 `daily.ts` L21「保持领域 store 自包含」），UI 天然与 daily task 分区。

### 存档决策：**升 SAVE_VERSION 18 → 19**（拍板，勿再犹豫）
研究审计倾向「不升版、`?? {}` 兜底」，但 Scout 判定**应升 v19**，理由：
- 一旦在 `DailySave` 新增 `commissionDate`/`commissionProgress`/`commissionClaimed`（3 字段），就是**存档结构变更**，SPRINT 存档协议（L16）明令「新增/改存档字段必须 schema + migrations + 装配器三处同改 + 往返测试」——这三处改动无论升不升版本号都要做，升版成本几乎为零（本 sprint 尚未升版，v19 额度就是留给 SF-T8 的，SPRINT L16 白纸黑字）。
- 升 v19 让 `migrations.test.ts` 的往返/旧档兼容测试有明确版本锚点，比「悄悄改结构不升版」更符合协议、更易审计。**一次 sprint 只升一次**——SF-T8 是唯一候选，正好用掉。
- 三处同改落点（照抄 v7 加 weekly 字段的范式，`migrateDaily` 已是「字段级缺省兜底」结构，加 3 行即可）：
  1. `infra/persistence/schema.ts`：`DailySave` interface 加 3 字段（L57-74）+ `createDefaultDaily()` 加缺省（L296-307，空串/`{}`/`[]`）+ `SAVE_VERSION` 18→19（L30，权威）+ 顶部版本注释加 v19 段（L12 附近）。
  2. `infra/persistence/migrations.ts`：`migrateDaily(raw)`（L91-106）加 3 行 `typeof raw.xxx === ... ? ... : defaults.xxx`（旧档缺 → 缺省，与 weekly 四字段同构）+ 顶部注释加 v19。
  3. `stores/daily.ts`：`serialize()`（L217-228）/`deserialize()`（L230-242）/`reset()`（L244-253）三处加新字段（deserialize 里 `?? {}`/`?? []` 兜底 + 加载后 `ensureCommissionToday()`）。
  - **SAVE_VERSION 权威在 `schema.ts:30`**；文档只指向不复述（pitfalls L61）。

### 三个埋点落点（研究/产品审计已核实，Scout 复核确认）
三类目标对应的 action **全部已在 `userStore` 门面且带 `saveToServer` 事务边界**，新埋点与现有 5 个 `markProgress` 同构同位（`saveToServer()` 前）：
1. **`markCommission('idle')`｜挂机结算一次** → `userStore.settleHomestead`（L455-464 发放收益后、`saveToServer()` L464 前）。**必须守实际产出**：埋点写在 L453 早退（`if (全0) return result`）**之后**——只有真发放产出才到达该分支，天然守卫。**绝不用 `hours>0`**（首次基线 L429-431 早退 / 回拨钳位 L437-440 早退 / 0 入住空结算都可能 hours 存在但产出 0，反复进出刷委托）。
2. **`markCommission('tower')`｜打一层塔** → **两处都埋**：`completeFloor` 的 `pve.completeFloor(floor)===true` 分支（L753-760，`saveToServer` L758 前）**+** `sweepFloor` 的 `outcome.ok && outcome.reward` 分支（L772-779，`saveToServer` L778 前）。毕业玩家（塔顶，completeFloor 返回 false）靠扫荡也能完成，否则卡死全清 bonus。**绝不复用 `battleWin`**（那是宅理论战 `battleFlow.endGame` L128 计数，语义污染）。
3. **`markCommission('enhance')`｜强化一件装备** → `enhanceEquipment` 门面的 `ok===true` 分支（L661-666，`saveToServer` L664 前）。

> 埋点全在 store 编排层（userStore 门面），**绝不进 engine**（engine 纯净铁律，evolution-audit L101 已警示）。`markCommission` 幂等钳到 target（仿 `markProgress` L122-139 结构），跨天读时归零（`ensureCommissionToday` 仿 `ensureToday` L65-72）。

### 委托模板 + 保底 + 全清 bonus（拍板）
- **3 条固定委托**（target=1）：`commission_idle`（挂机结算一次）/ `commission_tower`（打一层塔，含扫荡）/ `commission_enhance`（强化一件装备）。措辞强调「家园本地小事」（今天在家里做的事，全在 hub 内闭环，不用跳去抽卡/理论战）。
- **保底可完成**：`commission_idle` 是天然保底（有入住角色即可结算挂机），确保全清 bonus 不因毕业/破产账号变「永远拿不到的空诺」（研究审计 Phase 3 场景 3）。
- **奖励量级 = 挂机零头级 / KP 为主**：逐条小额（如各 20-30 KP，对齐 daily task 30 KP 量级，守「回归补充不盖过主动收入」基线，config/homestead.ts 顶部自述）。
- **今日全清 bonus**（原神/崩坏3 范式，委托区别于 daily 的核心）：3 条清完给一份额外 bonus（如 +50 KP 或 +1 券）。实现 = `allCommissionsDone` 派生 + 全清「已领」标记复用 `commissionClaimed` 存一个特殊 key（如 `'__bonus__'`，不新增第 4 字段）+ `claimCommissionBonus()` action。**若 R3 时间紧，全清 bonus 可留 fallback，但逐条委托 + 保底项无论如何必做。**

### UI 落点（拍板）
- home tab 直接 `<HomesteadView/>`（HomesteadHubView L375-376），委托 UI **挂 `HomesteadView.vue` 的 `ops-panel`（右侧运营列，L505+）**，插在 **SF-T3 驻留卡（L521-537）之下**（同属「家园日常状态」语义簇）。
- **视觉共存复核（收官轮最该盯）**：SF-T3 驻留卡已带一条进度条（`.idle-bar`）；委托位若再叠进度条容易糊。委托卡建议用「X/N 完成度摘要 + 逐条 checkbox/领取按钮」而非又一条大进度条，与驻留卡视觉区分（product-audit L15/L42 明示）。
- 颜色走语义令牌（`--c-success`/`--c-warning`/`--c-accent`），禁 text-white 压浅底、禁拼接动态色类。

### 收官核对（本轮必须一并确认）
- SF-T1..T7 + 两条 refine 全 `[x]` 且真落地（R2 eval + product-audit R3 复审已逐项 Read 确认无回归；Evaluator 仍须亲自复跑 5 条验收命令）。
- SF-T8 落地后：FUTURE.md L109-118 的 S14-F 全部 `[ ]` → `[x]`、进度总览 S14 → ✅、SPRINT L27 勾选。

---

## B. 代码地图与坑（给 Generator）

### 落点文件（角色说明）
- **`frontend-vue/src/config/dailyTasks.ts`**（151 行）——静态模板。加 `CommissionKind = 'idle'|'tower'|'enhance'` 类型 + `CommissionDef` interface（复用 `DailyReward`）+ `COMMISSIONS: CommissionDef[]`（3 条）+ `COMMISSION_BONUS_REWARDS`（全清 bonus）+ `getCommissionById`。**勿动 `DailyTaskType`**（不扩枚举）。
- **`frontend-vue/src/stores/daily.ts`**（286 行）——委托运行时。加 `commissionDate`/`commissionProgress`/`commissionClaimed` refs + `ensureCommissionToday()`（仿 `ensureToday` L65-72）+ `commissionProgressOf`/`isCommissionComplete`/`isCommissionClaimed`（仿 L84-99）+ `markCommission(kind, amount=1)`（仿 `markProgress` L122-139，**只遍历 COMMISSIONS，不碰 weekly**）+ `claimCommission(id)`（仿 `claim` L142-158，发奖走 `profile.earn`）+ `allCommissionsDone` 派生 + `claimCommissionBonus()` + serialize/deserialize/reset 三处加字段。**导出全部新函数**（return 块 L255-277）。
- **`frontend-vue/src/infra/persistence/schema.ts`**——`DailySave` +3 字段（L57-74）、`createDefaultDaily` +3 缺省（L296-307）、`SAVE_VERSION` 18→19（L30，权威）、顶部版本注释加 v19 段（L12 附近）。
- **`frontend-vue/src/infra/persistence/migrations.ts`**——`migrateDaily` +3 行缺省兜底（L91-106，仿 v7 weekly 四字段）、顶部注释加 v19。
- **`frontend-vue/src/stores/userStore.ts`**——3 埋点：`settleHomestead` L453 之后（idle）/ `completeFloor` L753-760 分支（tower）/ `sweepFloor` L772-779 分支（tower）/ `enhanceEquipment` L661-666 ok 分支（enhance）。委托领取门面 `claimCommission`/`claimCommissionBonus`（仿 `claimDailyTask` L629-631：`if (useDailyStore().claimCommission(id)) saveToServer()`）。
- **`frontend-vue/src/views/HomesteadView.vue`**（790 行）——委托 UI 挂 `ops-panel`（L505+）驻留卡（L521-537）之下。读 `useDailyStore()` 的委托 getter，领取走 `userStore.claimCommission`。**未登录态守卫**（`userStore.isLoggedIn`，仿 L461）。

### 测试落点
- **`frontend-vue/src/stores/daily.test.ts`**（已有 markProgress/claim/跨天 范式，L20 `freezeDate` helper）——补 commission 断言：markCommission 推进 + 完成判定 + 跨天归零（freezeDate 换日）+ claim 发奖 + allCommissionsDone/全清 bonus + 幂等钳 target。
- **`frontend-vue/src/infra/persistence/migrations.test.ts`**——v18→v19 往返：旧档缺 commission 3 字段 → 缺省（`?? {}`/`?? []`）、新档往返保真、`not.toHaveProperty` 无关字段不漏。仿现有 daily v7 迁移测试。

### 坑（照抄会踩）
1. **[C-SF-T8 idle 空结算刷委托]** `settleHomestead` 有 3 条早退（未登录 L426 / 首次基线 L429-431 / 回拨钳位 L437-440）+ 全 0 产出早退（L453）。埋点**必须写在 L453 之后**（只有真发放产出才到达），否则空结算/0 入住反复进出刷委托。
2. **[C-SF-T8 tower 语义错配]** 塔委托绝不复用 `battleWin`（宅理论战计数，`battleFlow.ts` L128）；必须同埋 `completeFloor`(completed 分支) + `sweepFloor`(ok 分支)，毕业玩家靠扫荡完成。
3. **[C-SF-T8 跨天口径漂移]** 委托跨天必须复用 `daily.ts` 的 `todayKey()`（L22-25），**绝不自造第二套**（pitfalls：两套跨天判定漂移是回归温床）。`ensureCommissionToday` 仿 `ensureToday` 读时判定归零、幂等。
4. **[C-SF-T8 瘦身迁移 spread 陷阱]** `migrateDaily` 已是白名单重建对象（非 spread），加字段照抄同结构；**勿改成 spread 旧档**（S13-C1 沉淀 pitfalls L67：删/改字段迁移必须白名单重建，spread 会漏旧字段）。
5. **[C-SF-T8 埋点入 engine]** `markCommission` 埋点只挂 userStore 门面（store 编排层），engine 纯净铁律不得 import store（evolution-audit L101）。
6. **[C-SF-T8 UI 进度条糊]** 委托卡与 SF-T3 驻留卡同处 ops-panel，两条进度条叠加易糊——委托用完成度摘要（X/N）+ 逐条领取，别再来一条大进度条（product-audit L15）。
7. **[C-SF-T8 全清 bonus 空诺]** 若三条委托都可能做不了（毕业+破产账号），全清 bonus 变永远拿不到——`commission_idle` 保底（有入住即可结算）必须存在。
8. **[C-SF-T8 daily reset 漏字段]** `daily.ts` `reset()`（L244-253）+ `serialize()`（L217-228）+ `deserialize()`（L230-242）三处都要加新字段，漏一处 → 登出/切账号残留或往返丢失（migrations.test 往返测试守）。
9. **[定时器/飘字清除]** 若委托领取加飘字，setTimeout 必须登记 + onUnmounted 清（pitfalls setTimeout 假安全）；HomesteadHubView 已有 `timers[]` + `scheduleClear`（L301-312）范式，HomesteadView 有 rAF+idleTimer onUnmounted 清（L444-447）范式可仿。
10. **[货币入口]** 委托/bonus 发奖只走 `profile.earn`（daily `claim` L148-152 已是此范式），绝不绕过。

### 已验证无需担心
- `daily` 领域 store 自身不存档（由 userStore 门面统一 saveToServer，daily.ts L5 注释）——委托领取走 `userStore.claimCommission` 触发 saveToServer 即可。
- `computeIdleYield` 0 入住返回全 0 yield（settleHomestead L453 早退），idle 埋点守卫天然成立。
- schema `DailySave` 是 optional 兼容型（migrateDaily 字段级兜底），加字段迁移风险极低。

---

## C. 新发现的坑

- **[SF-T8 存档协议：升 v19 而非「悄悄改结构」]** 研究审计倾向「不升版 `?? {}` 兜底」，但只要动 `DailySave` 结构就必须三处同改 + 往返测试（成本与升版无关）；升 v19 有明确版本锚点、更符合 SPRINT L16 协议、v19 额度本就留给 SF-T8。Scout 拍板**升 19**——避免「改了结构却不升版」的隐性协议违规。**一 sprint 只升一次，SF-T8 用掉即封顶。**
- **[收官轮范围纪律]** 跑到 R3 ≠ SF-T8 已做（前两轮明令不做）。Orchestrator 收尾须核对「SF-T1..T8 全 `[x]` 且与实现一致」而非只看末轮 Evaluator 决策（S14-A SA-T6 被漏正是此坑，pitfalls L84）。SF-T8 是 S14 全局最后一块，做完 S14 家园 hub 深化整体收官。
- **[commission_bonus key 复用不新增第 4 字段]** 全清 bonus 的「已领」标记复用 `commissionClaimed: string[]` 存特殊 key（如 `'__bonus__'`），避免为 bonus 单开第 4 序列化字段——省一次 schema 面积，跨天随 `ensureCommissionToday` 一并归零。
