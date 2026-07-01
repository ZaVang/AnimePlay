# Negotiation — S14-B 第 3/3 轮（product-loop --tier1 on --mode all，收尾轮）

> 对三份 Tier1 审计报告的 Prioritized Recommendations 逐条回应。本轮指派切片 = **SB-T2（手动大招选目标 + 平滑推进，P2-5）**——S14-B 最后一块。
> 判定：**接受 / 部分接受 / 拒绝**，附理由 + 本轮行动。超出 SB-T2 的一律标 backlog。
> 三份报告 = 体验官（product-audit）/ 进化审计（evolution-audit）/ 设计研究（research-audit，本轮主攻 SB-T2）。
> SB-T1/T3/T4/T5 已在第 1/2 轮落地，本轮不重做；本轮收尾核对其全部 `[x]` 与实现一致。

---

## 三报告共识（先记，决定本轮成败）

三份报告在 SB-T2 上高度一致，且 research Phase1-A4 给出最关键的一条新证据：**「现状『从 t=0 整场重算』的不跳变，仅在『不选目标、只改 timing』时碰巧成立；一旦选目标，RNG 序列在插入点后错位（SB-T3 暴击=一次 `rng.chance`），甚至 tick 边界前移污染过去时间戳 → 一定跳变。」** 故本轮的 refine 主线不是「加不加 targetId」（三报告都要求加），而是**「加 targetId 的同时必须把重算模型从『seed 头部重建』改为『冻结已呈现前缀 + RNG 状态承接』，否则就是把碰巧不跳升级成一定跳的半死系统」**。这条被三报告共同定为红线，本轮全盘接受。

---

## 一、设计研究报告（research-audit-report.md，本轮主攻 SB-T2）

### 🔴 High-impact, Low-effort（本轮应直接采纳）

- **R1｜命令带目标（`ManualUltimateOrder` 加 `targetId?`，单体覆盖、AOE/self/全体忽略）** → **接受（本轮硬指标）**。
  - 本轮行动：任务 2（本轮-8）。engine 对单体 selector 优先用 `order.targetId` 命中存活单位；复用 SB-T4 已定单体/AOE 二分口径（`effect.target ?? skill.target` 同一已解析表达式，坑 C-3）。UI 只对单体大招亮「选目标」态，engine 覆盖规则与 UI 亮起条件同一口径（拍板 3）。
- **R2｜无跳变 = 冻结已呈现前缀（方案 A 精神最小实现）+ RNG 从「seed 头部重建」改「承接消费到 elapsedMs 的状态」** → **接受（本轮硬指标，最关键项）**。
  - 本轮行动：任务 1（本轮-7）。前缀冻结取最小实现（已呈现事件一字不改、游标不回退、只重算当前时刻之后）；RNG 承接 elapsedMs 状态（mulberry32 全部状态即单个数，可导出/导入），使后缀错位不回溯污染前缀（拍板 1/2）。**红线接受**：若采纳过渡形态，注释/实现说明必须写明前缀冻结保证，禁 UI/文案暗示「完全平滑」而代码做不到。
- **R3｜死目标/超时 order 显式回退** → **接受**。
  - 本轮行动：任务 2（拍板 5）。死目标 → 回退默认 selector（勿空放扣能量，`spendUltimateEnergy` 在 execute 前），回退后仍无目标才判 `manualUltimateFailed`；超时后 `atMs > maxTimeMs` 的 pending order 不改判（`nextManualAt` 已被 `Math.min(maxTimeMs,…)` 夹住，测试锁死）。
- **R4｜连点防抖/单次重算** → **接受**。
  - 本轮行动：任务 2（拍板 5）。同帧多命令入队后单次重算/续跑，避免第二次覆盖第一次 cursor 致双跳/丢单。

### 🟡 High-impact, High-effort（backlog）

- **R5｜engine `resumeTimedBattle(snapshot, orders)` + RNG 状态 export/import 完整化** → **部分接受**。
  - 理由：R5 的「RNG 状态 export/import」是 R2 的必要卫生改动，**本轮采纳其最小子集**（承接 elapsedMs 状态）；但**完整 `resumeTimedBattle` 快照架构 + 深拷贝续跑入口 backlog**——那是「强无跳变 + 铺路暂停/步进/道具」的一次性架构投资，收尾轮不宜夹带大改，正式排入紧邻的战斗深度轮。
- **R6｜`BattleCommand` 泛化命令模型** → **部分接受（留形状不实现）**。
  - 本轮行动：拍板 4。`ManualUltimateOrder` 写成可扩展形状（`{atMs, unitId, targetId?}`，等价 discriminated union 的 ultimate 分支），零额外成本避免二次重构；**但本轮只实现 ultimate 命令**，其它命令类型 backlog。

### 🟢 Thought-provoking / 💡 Wild（长期，全部 backlog）

- **R7 逐帧 `step(dtMs)` 去预演算 / R8 目标预测高亮 / W1 命令轨迹进事件流可复盘 / W2「意图队列」半手动** → **全部 backlog**。理由：R7 与现有事件流特征测试范式冲突需专门 sprint（方案 C，本轮严禁）；R8/W1/W2 是增强/远期演化，超 SB-T2 合同（选目标 + 无跳变 + 边界完备）。

### 收尾核对提示 → **接受**：本轮只做 SB-T2（R1+R2+R3+R4 合同内），R5-W2 backlog；engine 纯净；`timedBattle.test.ts:261-291` 既有护栏不破 + 新增前缀冻结/选目标/死目标/超时四类断言；收尾核对 SB-T1..T5 全 `[x]`。

---

## 二、体验官报告（product-audit-report.md）

### Prioritized Recommendations

1. **【SB-T2】手动大招无跳变推进（至少「已回放前缀冻结、游标不回退」的弱无跳变；工期允许优先 research 方案 B 可续跑引擎）** → **部分接受**。
   - 接受：弱无跳变 = 前缀冻结（任务 1，拍板 1）。**红线接受**：只做弱无跳变时须在验收/注释明写「后缀仍重算、强无跳变待 splittable 子流」，绝不让 UI/文案暗示「完全平滑」。
   - **术语澄清**：体验官把「可续跑引擎」记为 research「替代 B」，实为 research 报告的**方案 A（resume 可续跑）**；research 的**方案 B（整场重算 + 截后缀）已被 Phase1-A4 判为选目标后退化跳变的半死系统，本轮明确拒绝作终态**。本轮取「方案 A 精神的最小实现（前缀冻结 + RNG 状态承接）」，full resume 架构 backlog（见 research R5 处置）。
2. **【SB-T2】手动大招可选目标（限单体 selector，写成可扩展 union；UI 只对单体亮「选目标」态，engine 与 UI 同口径）** → **接受**。本轮行动：任务 2（拍板 3/4）。
3-9.（体验官其余为 SB-T1/T3/T4/T5 无回归确认 + UI 打磨项）→ **SB-T1..T5 已落地，本轮收尾核对无回归**；伤害飘字/技能名横幅/TIME UP 横幅等 UI 打击感层 → **backlog**（超 SB-T2 engine+最小 UI 范围，上轮已 backlog）。
10. **splittable / 按 unitId 派生 RNG 子流（强无跳变必要条件）** → **部分接受方向 / backlog**。理由：强无跳变（注入点后未波及单位完全不变）需 per-unit RNG 子流，是 R5 架构投资的一部分；本轮取「单状态 RNG 承接 elapsedMs」的弱无跳变最小实现，**splittable 子流 backlog**，正式记入紧邻深度轮（别无限顺延成永久债）。

---

## 三、进化审计报告（evolution-audit-report.md）

### Prioritized Recommendations

- **[SB-T2] `ManualUltimateOrder` 加 `targetId`（可扩展 union）+ engine 单体大招 `executeEffect` 对单体 selector 优先用 `order.targetId`、AOE/治疗忽略；接入点 `effects.ts:367 resolvedSelector` 复用已解析表达式（坑 C-3 别重复解析）** → **接受**。本轮行动：任务 2（拍板 3/6，`resolveSkillTargets` 统一 helper）。
- **[SB-T2] 单体 selector 才亮「选目标」UI（SquadUnitBar/Battlefield 层判定），engine 覆盖规则与 UI 亮起条件同一口径（防 P1-4 反向 affordance 欺骗）** → **接受**。本轮行动：任务 2（拍板 3）。
- **命令类型写成可扩展 discriminated union（`{kind:'ultimate', atMs, unitId, targetId?}`），为未来换目标策略/手动技能/暂停预留** → **接受（留形状）**。本轮行动：拍板 4，只实现 ultimate。
- **架构投资 `simulateFrom` 可续跑引擎 + splittable RNG 子流（强无跳变 + 铺路暂停/步进/分享码的一次性投资，收官轮不做）** → **接受其「收官轮不做」判断 / backlog**。本轮取最小实现，架构级投资正式排入紧邻深度轮。

### 横切提醒 / 顺手清理

- **💡「命运预告」而非「无跳变」（拥抱预演算，开大瞬间渲染战术预告，把胶片已定从缺点变卖点）** → **backlog（产品化解法候选，记入 FUTURE）**。理由：是有价值的产品化方向，但属额外演出层，超 SB-T2 合同（本轮先把「无跳变 + 选目标」机制做对）；且与本轮「前缀冻结」并不冲突，可作后续叠加。
- **`SquadBattleView.vue:126` 恒等三元噪声（`currentPhase.value === 'towerMode' ? 'towerMode' : 'towerMode'`，scout 坑 C-5）** → **部分接受**：本轮 SB-T2 若改到 View saveState/该行附近顺手清为直接 `'towerMode'`；若未碰到则 **backlog**，不为它单开范围。

---

## 四、本轮范围裁定小结

**接受并落地本轮（= 指派切片 SB-T2）**：
- 任务 1（本轮-7）：手动大招前缀冻结平滑推进 = 已呈现前缀一字不改 + 游标不回退 + 只重算当前时刻之后 + RNG 从「seed 头部重建」升级为「承接消费到 elapsedMs 的状态」。方案 A 精神最小实现，**明确拒绝方案 B 伪平滑作终态**，方案 C 逐帧 backlog。
- 任务 2（本轮-8）：`ManualUltimateOrder` 加可选 `targetId`（可扩展命令形状）+ 单体 selector 覆盖 / AOE·self·全体忽略 + UI 只对单体亮「选目标」态（engine 与 UI 同口径）+ 死目标回退默认 selector + 超时 pending order 不改判 + 同帧连点单次重算 + `resolveSkillTargets` 统一 helper。
- 任务 3（本轮-9）：集成回归（选目标后仍无跳变）+ S14-B 收尾核对（SB-T1..T5 全 `[x]` 与实现一致）。

**部分接受（采纳精神、本轮取最小实现）**：前缀冻结取「单状态 RNG 承接」最小实现（full `resumeTimedBattle` 快照架构 + splittable/per-unit RNG 子流强无跳变 → backlog）；命令模型留可扩展形状但只实现 ultimate。

**拒绝本轮 / backlog**：research 方案 B 作终态（半死系统，明确拒绝）；方案 C 逐帧去预演算（R7）；full resume + splittable 子流（R5/product 10/evolution）；`BattleCommand` 泛化实现（R6）；目标预测高亮（R8/W2）；命令轨迹可复盘（W1）；「意图队列」半手动（W2）；命运预告/战术预告（evolution 💡）；autoUltimates 默认关/首战引导（拍板 7）；TIME UP 横幅/伤害飘字/技能名横幅（UI 打击感层，上轮已 backlog）。

**范围纪律确认**：本轮 SB-T2 是**必须真实现的指派任务**，非「回归确认」（S14-A SA-T6 教训，pitfalls L84）。收窄为「前缀冻结 + 选目标」的最小可用形态已获研究报告授权，但**不得整项跳过、不得只做半死系统**。所有超 SB-T2 的建议均标 backlog，不在本轮开新范围。收尾轮硬指标 = SB-T1..SB-T5 全 `[x]` 且与实现一致。
