# Plan — S14-B 第 3/3 轮（product-loop --tier1 on --mode all，收尾轮）

**本轮指派切片 = SB-T2（手动大招选目标 + 平滑推进，P2-5）** —— S14-B 最后一块、也是最难一块。
前情：第 1 轮已落地 SB-T3（base critRate 0.05 + critRateUp 加成轴）+ SB-T5（buff 按来源累加 shared helper）；第 2 轮已落地 SB-T1（超时三态裁决 + 倒计时 UI）+ SB-T4（站位单体减伤）。**SB-T2 是 S14-B 唯一剩余任务。**

> **范围纪律（S14-A 教训，pitfalls L84）**：「不开新范围」= 不超出 S14-B（SB-T1..T5）；**绝不表示可跳过本轮指派的 SB-T2**。SB-T2 必须真实现落地，严禁只做回归/验收再确认。收窄形态可以（研究报告授权），整项跳过不可以。

---

## 本轮最核心的设计结论（决定成败，先读）

三份报告共识 + research Phase1-A4 深挖点破：**现状「手动开大 → 从 t=0 整场重算 → cursor 对齐」之所以「碰巧不跳」，唯一前提是「插入 order 后 t=0..elapsedMs 这段 RNG 消费次数/消费点完全不变」。这个前提在『选目标』落地后必然破**——选不同目标 → 不同暴击（SB-T3 已让全体可暴，暴击=一次 `rng.chance`）/ 不同击杀 / 不同能量连锁 → RNG 序列在插入点后错位，甚至因 `nextManualAt` 进入 `Math.min` 使 tick 边界前移、污染过去事件时间戳。

**故：本轮若只加 targetId 不改重算模型 = 把「碰巧不跳」升级成「一定会跳」的半死系统**（正是 SPRINT 反复警告的腐化）。**「选目标」与「无跳变」不是两个可分别妥协的目标，而是同一个干净机制（冻结已呈现前缀 + 只重算当前时刻之后 + RNG 状态承接）的两个自然结果，必须同轮一起做对。**

---

## 任务（按依赖顺序）

### 任务 1 ｜本轮-7：SB-T2 手动大招前缀冻结平滑推进

- **目标**：手动开大 / 切换 autoUltimates 后，**已回放到 `elapsedMs` 的事件前缀一字不改、游标不回退、无时间倒流 / HP-能量跳变**；重算或续跑只影响当前时刻之后；RNG 从「seed 头部重建」升级为「承接消费到 `elapsedMs` 的状态」，使后缀错位不回溯污染前缀随机结果。
- **依赖**：无（engine 侧独立，View 侧改 `handleManualUltimate`/`handleToggleAutoUltimates`/`regenerateBattleSimulation` 的重算触发方式）。
- **设计拍板**：SPRINT 拍板 1（方案 A 精神最小实现 = 前缀冻结；红线拒绝方案 B 伪平滑；方案 C 逐帧 backlog）、拍板 2（RNG 状态承接）、拍板 6（目标解析统一 helper 与任务 2 共用）。
- **验收**：新增 engine 特征测试断言「插入一条手动大招 order 后，`at <= 插入时刻` 的事件前缀与插入前逐条相同（无过去被重写 / 时间倒流）」；**不破坏** `timedBattle.test.ts:261-291` auto/manual ultimate 既有护栏；若采纳过渡形态须在实现说明/注释写明前缀冻结保证；type-check/test/build 通过。
- **来源**：SPRINT.md SB-T2（L29-31）+ 第 3 轮追加清单本轮-7；research-audit R2 + Phase1-A4 + Phase4 方案 A；homestead-hub-audit P2-5（L143-146）。

### 任务 2 ｜本轮-8：SB-T2 手动大招可选目标（单体覆盖，AOE 忽略）+ 边界完备

- **目标**：`ManualUltimateOrder` 加可选 `targetId`（可扩展命令形状）；engine 对**单体 selector**（`frontEnemy/lowestHpEnemy/highestAtkEnemy/backEnemy` 及单体控制）优先用 `order.targetId` 命中存活单位，**AOE（`allEnemies/allAllies`）/ self / 治疗全体忽略覆盖**；UI 只对单体大招亮「选目标」态、AOE 点一下即放（engine 与 UI 同口径）；死目标回退默认 selector（回退后仍无目标才判 `manualUltimateFailed`）、超时 pending order 不改判、同帧连点单次重算。
- **依赖**：任务 1（共用重算/续跑机制与目标解析 helper 拍板 6）。可与任务 1 同批实现（同一 engine 文件簇 + 同一 View handler）。
- **设计拍板**：拍板 3（选目标只对己方单体、engine 覆盖规则与 UI 亮起条件同一口径，防 P1-4 式反向 affordance 欺骗）、拍板 4（命令可扩展形状、本轮只实现 ultimate）、拍板 5（三个极端场景显式处理）、拍板 6（`resolveSkillTargets` 统一 helper）。
- **验收**：新增 engine 特征测试断言「单体大招指定 `targetId` → 命中所选存活单位」+「AOE 大招忽略 `targetId`（仍全体命中）」+「死目标 → 回退默认 selector、不空放扣能量」+「超时后 `atMs > maxTimeMs` 的 pending order 不改判决」；UI 亮起条件与 engine 覆盖规则同口径（单体才可选目标）；**不破坏** 既有 manual ultimate 护栏与 SB-T1/T3/T4/T5 断言；type-check/test/build 通过。
- **来源**：SPRINT.md SB-T2 + 本轮-8；research-audit R1/R3/R4 + Phase3 极端场景 1/2/3 + Phase4 概念重组；evolution-audit Prioritized（targetId 可扩展 union + 单体覆盖 + UI 同口径）；product-audit Prioritized 1/2。

### 任务 3 ｜本轮-9：SB-T2 集成回归 + S14-B 收尾核对

- **目标**：确认前缀冻结（任务 1）与选目标（任务 2）协同 = **「选目标后仍无跳变」**（research Tradeoff 矩阵方案 A 的核心）；确认本轮零存档触点、engine 纯净（无 Vue/Pinia/DOM/`Math.random`，随机走注入 RNG）、engine 依赖方向未破坏；**核对 SB-T1..SB-T5 主清单全部 `[x]` 且与实现一致**（收尾轮硬指标，防 S14-A「跑满轮次≠目标达成」）；确认未破坏 S14-A 已成 6 项与第 1/2 轮 SB-T3/T5/T1/T4。
- **依赖**：任务 1 + 任务 2。
- **验收**：下方 5 条验收命令实测绿；SB-T1..SB-T5 全 `[x]` 与实现一致；未破坏既有护栏。
- **来源**：SPRINT.md 通过标准 + 排期建议 L45（第 3 轮收尾）；research-audit 收尾核对提示。

---

## 采纳的 Reviewer 改进项（本轮落地）

| 来源 | 建议 | 处置 |
|---|---|---|
| research R1 / evolution / product 2 | `ManualUltimateOrder` 加 `targetId?`、单体 selector 覆盖、AOE/self/全体忽略 | **接受**（任务 2，拍板 3/4） |
| research R2 / Phase1-A4 | 无跳变 = 冻结已呈现前缀 + RNG 从「seed 头部重建」改「承接消费到 elapsedMs 的状态」 | **接受**（任务 1，拍板 1/2）——本轮最关键项 |
| research R3 / Phase3 场景 2/3 | 死目标显式回退（勿空放扣能量）+ 超时 pending order 不改判 | **接受**（任务 2，拍板 5） |
| research R4 / Phase3 场景 1 | 同帧连点单次重算/防抖，避免双跳丢单 | **接受**（任务 2，拍板 5） |
| research Phase4 概念重组 / SB-T5 教训 | 抽 `resolveSkillTargets(state, actor, skill, overrideTargetId?)` 统一 auto/manual 目标路径 | **接受**（拍板 6，任务 1/2 共用） |
| research 方案 A 精神 | 前缀冻结取最小实现（不强制 full `resumeTimedBattle` 架构） | **部分接受**：本轮做「前缀冻结 + RNG 状态承接」的最小实现；full resume/splittable RNG 子流架构（R5）→ backlog |
| product / evolution | UI 只对单体大招亮「选目标」、engine 与 UI 同口径 | **接受**（任务 2，拍板 3） |
| evolution / product 红线 | 若做过渡形态必须注释写明前缀冻结保证，禁 UI 暗示「完全平滑」而代码做不到 | **接受**（任务 1 验收红线） |

**backlog（本轮不做）**：方案 C 逐帧 `step(dtMs)` 去预演算（R7）；full `resumeTimedBattle` + splittable/按 unitId 派生 RNG 子流（R5，强无跳变的架构级投资）；`BattleCommand` 泛化命令模型（R6，本轮只实现 ultimate 但留可扩展形状）；目标预测高亮（R8/W2）；命令轨迹进事件流可复盘（W1）；「意图队列」半手动（W2）；autoUltimates 默认关 / 首战引导（拍板 7）；战术预告 / 分享码 / 回放节奏自适应；TIME UP 横幅 / 伤害飘字（上轮已 backlog）。

---

## 相关陷阱（本轮必须避）

- **别造半死系统（pitfalls L84 / SPRINT 反复警告）**：只加 targetId 不改重算模型 = 「碰巧不跳→一定跳」。任务 1（前缀冻结 + RNG 承接）与任务 2（选目标）必须同轮做对。
- **engine 纯净（pitfalls L6-8）**：命令目标覆盖、重算/续跑、RNG 状态导出/导入全进 `engine/squad` 纯层，随机仍走注入 RNG，零 Vue/Pinia/DOM/`Math.random`。
- **复用已解析 selector，别重复解析（scout 坑 C-3）**：单体/AOE 二分复用 `effects.ts:367 resolvedSelector = effect.target ?? skill.target` 同一表达式，别在目标覆盖处重新解析出分歧。
- **UI 承诺 = 代码兑现（P1-4 反向 affordance 欺骗）**：UI「选目标」亮起条件必须 == engine 覆盖生效条件（单体才可选、AOE 点一下即放）。禁「UI 承诺选目标、代码全体命中」。
- **描述≠行为红线（CLAUDE.md Known Debt）**：若采纳过渡形态，注释/实现说明必须诚实写明「前缀冻结如何保证、后缀为何不污染前缀」，禁 UI/文案暗示「完全平滑」。
- **改战斗规则前先看对应 test（架构铁律）**：改 `timedBattle.ts`/`effects.ts`/`types.ts` 前先读 `timedBattle.test.ts:261-291`（auto/manual ultimate 护栏），保持既有断言不破。
- **计时器登记清除（pitfalls L59）**：View 侧复用现有 `schedule()`/`clearBattleTimers()`，不新建裸 setTimeout；同帧连点单次重算避免多次 `playNextBattleEvent` 叠加。
- **不扩 `TimedBattleWinner`（scout 坑 C-1，SB-T1 已守）**：SB-T2 不涉 winner 类型，勿顺手改动。
- **本 Sprint 预期零存档触点（架构铁律）**：SB-T2 纯战斗规则 + UI，不新增/改存档字段；`manualUltimateOrders`/`targetId` 是战斗内瞬态，不入 schema。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 SB-T2 特征测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-B 不碰后端，期望退出码 0、全 PASS）；跑它用 ./.venv/Scripts/python.exe
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且本轮承诺的 SB-T2（本轮-7/8/9）全部 `[x]` 并与实现一致。**S14-B 整体完成** = SB-T1..SB-T5 全 `[x]`（收尾轮硬核对）。
