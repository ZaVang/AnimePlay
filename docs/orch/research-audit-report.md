# S14-B 设计研究报告 — 第 3/3 轮（切片 = SB-T2 手动大招选目标 + 平滑推进）

> Reviewer 模式：research（设计研究）。范围：product-loop S14-B 第 3 轮，指派切片 **SB-T2**（P2-5）。收尾轮。
> 方法：四镜头（核心假设质疑 / 相邻领域研究 / 逻辑完备性 / 替代设计提案）对准 SB-T2，给本质替代 + tradeoff，重点防「半死系统」与长期腐化。
> 已读并求证：`timedBattle.ts`（一次性预演算 `simulateTimedBattle`）、`SquadBattleView.vue`（`handleManualUltimate`/`regenerateBattleSimulation`/`playNextBattleEvent`/`rebuildVisibleBattle`）、`effects.ts`（`executeEffect` = `effect.target ?? skill.target`）、`targeting.ts`、`rng.ts`（mulberry32 单状态 `a`）、`types.ts`（`ManualUltimateOrder = {atMs,unitId}`）、`timedBattle.test.ts:261-291`（auto/manual ultimate 护栏）、SPRINT.md、homestead-hub-audit-report.md（P2-5）、上一轮 eval.md（SB-T1/T4 CONTINUE）、negotiation.md（SB-T2 已预定「前缀冻结 + order.targetId 覆盖 + splittable RNG」为第 3 轮首选）。

---

## Executive Summary

**当前 SB-T2 的核心设计假设（5 条）**：

1. **「一次性预演算 + 定速回放」是呈现范式**——`simulateTimedBattle` 一口气算完整场（含 battleEnd），View 只做 180ms 逐条 `events` 回放。这是手感问题的架构底座。
2. **「手动大招 = 追加 order + 整场从 t=0 重算」**——`handleManualUltimate` 塞 `{unitId, atMs}` 后 `regenerateBattleSimulation(cursorTime)` 重跑，再用 `findIndex(event.at > cursorTime)` 把光标跳到「当前时刻之后」。
3. **「目标由 skill 静态 selector 决定」**——`ManualUltimateOrder` 无 targetId，`executeEffect` 永远走 `effect.target ?? skill.target`，玩家无从干预。
4. **「同 seed 重建 RNG 足以保证重算不跳变」**——`createSeededRng(battleSeed.value)` 每次重头消费同序列，是「重算后过去不变」的**唯一**确定性保证。
5. **「跳变靠 cursor 对齐掩盖」**——现实现承认会跳，只想把跳变点对齐到玩家当前时刻之后，属症状缓解而非根因消除。

**最大研究发现落在「核心假设质疑 + 替代设计提案」镜头**：SPRINT 授权把 SB-T2 收窄为「无跳变体验 + 选目标」，收窄方向对，但**收窄理由被误判了**。障碍不是「不能增量推进」，而是**「整场重算会重写玩家已看过的过去」**。相邻领域（rollback netcode / 确定性 lockstep / 命令插入）一句话点破：**重算只准发生在『当前时刻之后』，过去已呈现的事件必须冻结不可变**。这是 SB-T2 从「半死系统」走向「一次做对」的分水岭。

**关键新证据（比前置规划更进一步）**：假设 4「同 seed 重建」不是「够用但不优雅」，而是**「随 SB-T2 落地会主动失效」**——见 Phase1 深挖。若本轮只加 targetId 不碰重算模型，等于把一个「碰巧不跳」的系统升级成「一定会跳」的系统，正是 SPRINT 反复警告的腐化。

**一句话最有价值的突破方向**：把 SB-T2 实现为 **「命令插入 + 冻结已呈现前缀 + 从当前时刻分叉重算（rollback-forward）」**——`ManualUltimateOrder` 加 `targetId?`，engine 支持「本次调用目标覆盖」，重算侧**保留 `elapsedMs` 之前的事件与 RNG 消费状态、只重算之后**。这样「选目标」与「无跳变」不再是两个妥协，而是同一个干净机制的两个自然结果。

---

## Phase 1: 核心假设质疑

### 假设清单（★ = 可质疑 / 本轮应正面处理）

| # | 隐含假设 | 状态 |
|---|---|---|
| A1 | 战斗必须「先算完整场再回放」（预演算范式） | ★ 隐喻锁死「平滑推进」的想象空间 |
| A2 | 手动大招 = 追加 order 后**整场从 t=0 重算** | ★★ 回放跳变的直接根因 |
| A3 | 大招目标只能由 skill 静态 selector 决定 | ★★ 本轮硬指标，`ManualUltimateOrder` 缺 targetId |
| A4 | 「同 seed 重建 RNG」足以保证重算不跳变 | ★★★ **最脆弱假设，随 SB-T2 落地主动失效** |
| A5 | 跳变靠 cursor 对齐（`event.at > cursorTime`）可接受 | ★ 症状缓解，非根因消除 |
| A6 | 玩家只对「己方、单体」大招有选目标诉求 | ○ 合理边界，作最小可用范围 |
| A7 | `autoUltimates` 默认开（玩家默认是观众） | ○ 产品取舍，SPRINT 授权 Planner 定 |

### 关键假设深挖

**深挖 A4（「同 seed 重建 RNG」是脆弱的、且会被 SB-T2 自己打破）——本报告最重要的发现。**

`regenerateBattleSimulation` 每次都 `createSeededRng(battleSeed.value)` 从头重建 RNG、重跑整场。它「不跳变」的隐含前提是：**插入一条大招 order 后，t=0..cursorTime 这段 RNG 的消费次数与消费点完全不变**，于是同 seed 前缀产出同批过去事件。

**这个前提在 SB-T2 落地后必然破**：
- 大招若「选了不同目标」→ 命中不同单位 → 触发不同暴击判定（SB-T3 已让全体可暴，暴击就是一次 `rng.chance`）→ 不同击杀 → 不同能量/连锁 → **RNG 消费序列在插入点之后立刻错位**。错位本身是对的（未来本就该变）；但当前是**从 t=0 重跑**，`processManualUltimates` 又在 `processActions` 之前执行——插入的大招会**改变同一 tick 内后续单位面对的战场**（目标已死/血量变化），进而改变它们是否行动、是否暴击，**这些扰动可能回溯到 cursorTime 之前的 tick**（因为 `nextAt = Math.min(maxTimeMs, nextManualAt, ...)` 里多了 `nextManualAt` 这一项，取值序列变了 → tick 边界位移 → 过去事件的 `at` 时间戳漂移）。
- 时间戳一漂，`findIndex(event.at > cursorTime)` 就对齐到错误位置 → 观感跳帧、甚至「已死单位复活演一遍」。

**结论**：A4 不是「够用但不优雅」，是**「随 SB-T2 落地主动失效」**。本轮若只接 targetId 不改重算模型，会把「碰巧不跳」升级成「一定会跳」——教科书级「半死系统」。**必须同轮处理重算模型。**

**深挖 A2 + A5（跳变的充要条件）**：跳变 ⟺「**已呈现的事件前缀被重写**」。只要保证「`elapsedMs` 之前的事件一字不改、重算只影响之后」，跳变在定义上消失——**无需真做逐帧增量推进**（那是架构大改）。所以 SPRINT 的收窄「无跳变体验」可达，且不必放弃 SB-T2 实质，只要「整场重算」→「冻结前缀 + 分叉重算后缀」。

### 被隐喻限制的地方

「预演算 + 回放」把战斗理解成**一盘录像带**：算好不能改，改就得重录整盘。纯自动很省事；一旦「玩家播放途中下命令」，录像带隐喻立刻牵强——你不可能「重录已放过的前半段」。相邻领域用的是**「可回滚的时间线」隐喻**（rollback）：过去只读，命令只作用于「现在」、重算「未来」。换隐喻，实现路径瞬间清晰。

---

## Phase 2: 相邻领域研究

### 领域扫描

| 领域 | 核心思想 | 可迁移点 |
|---|---|---|
| **Rollback netcode**（格斗/RTS 同步） | 收到迟到输入时回滚到该输入 tick，用修正输入**只重放该 tick 之后**；已确认的过去不动 | ★★★ 手动大招 = 迟到命令，只重算 `atMs` 之后 |
| **确定性 Lockstep**（AoE 式） | 只传命令 + 固定 tick + 注入 RNG，保证同序列同结果 | ★★ 本项目已具备（注入 RNG + order 队列）；缺的是「命令带参数（目标）」 |
| **命令插入（command insertion）** | 迟到命令按时间戳插入命令队列，从最早受影响 tick 重算 | ★★★ `manualUltimateOrders` 就是命令队列，只差「从受影响点而非 t=0 重算」 |
| **事件溯源 / event sourcing** | 事件是 append-only 只读日志；投影由事件流重建 | ★★ `TimedBattleEvent[]`=事件流、`rebuildVisibleBattle`=投影。前缀冻结 = 事件不可变 |
| **非线性视频剪辑** | in/out 点之后重渲，之前的帧缓存复用 | ★ 「cursorTime 之前缓存、之后重渲」的直觉锚点 |

### 可迁移模式（3 个最值得借鉴）

1. **Rollback「只重放输入点之后」**（最高杠杆）——engine 侧最小实现：提供 `resumeTimedBattle(snapshot, newOrders)`，或让 `simulateTimedBattle` 接受「resume 快照 = {units 状态, rngState, events 前缀, now}」；从 `now` 继续，**过去事件前缀原样保留拼接**。插入大招在定义上无法触碰过去，跳变根除。
2. **命令带参数（parameterized command）**——`ManualUltimateOrder` 扩为 `{atMs, unitId, targetId?}`；`processManualUltimates` 把 `targetId` 传进 `executeSkill`，后者对**单体伤害/单体控制**用「显式目标覆盖」替代 `effect.target` 解析，AOE/self/全体忽略覆盖（复用 SB-T4 已定的单体/AOE 二分）。纯 engine、可测「命中所选目标」。
3. **RNG 状态快照（seekable PRNG）**——mulberry32 全部状态就是一个 `a: number`。让 RNG 可导出/导入内部状态（`snapshot()`/`restore(a)`），resume 时把 RNG 恢复到「消费到 `elapsedMs` 为止」的状态，后缀错位就**不再回溯污染前缀**。这是把 A4 从「碰巧对」升级为「结构上对」的关键卫生改动，且极廉价。

### 竞品设计哲学对比（PCR 半自动 vs 本项目）

PCR 的哲学是**「自动是默认、手动 UB timing 是唯一但足够的杠杆」**：玩家不选普攻目标、不打断、不换技能，唯一操作是「何时点大招」——但 PCR 大招目标/效果是 **per-character 固定**，所以**不需要选目标**。本项目分歧点：小队战大招目标由通用 selector（`frontEnemy` 等）决定，缺 PCR 那种「角色自带明确目标语义」，于是**「选目标」在本项目比在 PCR 里更必要**（否则玩家点了大招却打在系统选的错位目标上，操作感落空）。**结论：SB-T2 选目标不是抄 PCR，而是补上本项目 selector 抽象带来的「目标不可预期」缺口——合理且必要，不是过度设计。** 自动模式仍应保留（单机向「配好队看戏」定位），选目标是「关掉自动后的手动增强」。

---

## Phase 3: 逻辑完备性

### 概念体系评估（关系与模糊地带）

命令链：`manualUltimateOrders`（命令队列）→ `processManualUltimates`（tick 内执行）→ `executeSkill`→`executeEffect`（`effect.target ?? skill.target` 解析）→ `dealDamage`。呈现侧：`simulateTimedBattle`（只读 `events`）→ `regenerateBattleSimulation`（重算+cursor）→ `playNextBattleEvent`（180ms 回放）→ `rebuildVisibleBattle`（投影为 UI）。

**模糊地带**：
- **「命令的目标」与「skill 的目标」概念未分离**——目前只有后者。引入前者必须明确：**命令目标只覆盖单体、只覆盖伤害/单体控制**，AOE/治疗全体/自身不受影响（给「全体 AOE」指定单个目标无意义）。这条边界须写进验收，否则长成「指定了目标但对 AOE 无效、玩家不知为何」的黑箱（SB-T4「UI 承诺、代码不实现」的镜像）。
- **「重算」与「回放」时间基准未统一**——`regenerate(cursorTime)` 用 `battleElapsedMs`（回放时刻），`handleManualUltimate` 用 `battleElapsedMs + 1` 作 orderAt。若回放时刻与 engine tick 边界不对齐，order 可能落在两 tick 之间被吞/延迟。需定「命令时间戳量化到下一 tick」规则。

### 极端场景检验（3 个）

1. **同一 180ms 帧内连点两个单位大招**：现 `handleManualUltimate` 每次都 `regenerate`+`playNext`，两次重算叠加，第二次可能覆盖第一次 cursor → 丢单/双跳。**不成立**，需「命令入队后单次重算」或防抖。
2. **目标在命令生效前已死亡**（选敌 A，A 在 atMs 前被磨死）：`processManualUltimates` 现只校验施法者 `!isAlive(unit)`，不校验目标；加 targetId 后需处理「目标已死」→ 回退 selector 默认目标 或 判 `manualUltimateFailed`。**需显式定义回退**，否则 `selectTargets` 拿死目标返回空、大招空放却已 `spendUltimateEnergy`（扣能量在 execute 前）。
3. **超时裁决时刻正好有 pending 大招**（SB-T1 三态 × SB-T2 交叉）：`nextManualAt` 已被 `Math.min(maxTimeMs, ...)` 夹住，atMs > maxTimeMs 的 order 不会触发。**成立**，但需测试断言「超时后 pending order 不改判决」。

### 操作缺口（玩家想做但做不到）

- 选目标（本轮补）。
- 取消/改派已下达未生效的大招 → backlog。
- 「能量满自动放但让我选目标」半手动 → backlog（见 W2）。

### 演化瓶颈

未来若加「多段/连锁/引导类（跨多 tick）大招」，当前「命令 = 单点 tick 执行」会卡。本轮不需预支，但只要 resume/快照接口留干净（`resumeTimedBattle(snapshot, orders)`），未来有落脚点。

---

## Phase 4: 替代设计提案

### 核心机制替代方案（针对「平滑推进」）

**方案 A（推荐·一次做对）｜冻结前缀 + 分叉重算（rollback-forward）**
- engine：`resumeTimedBattle(snapshot, newOrders)`——snapshot = `{units 深拷贝, rngState:number, now, eventsPrefix}`；从 `now` 继续跑，**过去事件前缀原样拼接**；RNG 用 mulberry32 状态导入保证后缀确定。
- View：`handleManualUltimate` 不再从 seed 头重建；取「回放到 `elapsedMs` 的 engine 快照」→ resume →**新事件只追加在 cursor 之后**，已播放的一律不动。
- 跳变在定义上消失，选目标经 `order.targetId` 落地。
- Tradeoff：需 engine 暴露 RNG 状态导出/导入 + resume 入口（约 30-50 行 engine + 测试）；换来根因级修复、无长期腐化。

**方案 B（更省·妥协）｜整场重算但严格冻结「已呈现事件」**
- 保留 `createSeededRng(seed)` 整场重算，但 View 侧**不用新算的过去**：只截 `at > elapsedMs` 后缀，拼到「已播放旧前缀」。
- 前提：整场重算前缀**必须**与已播放前缀逐字节相同——Phase1-A4 已证此前提**在选目标后会破**（RNG 序列在插入点后错位甚至 tick 边界前移）。所以方案 B 只在「不选目标、只改 timing」时安全，**一旦选目标就退化为跳变**。
- Tradeoff：改动更小（纯 View），但**是半死系统**（选目标与无跳变二选一）。**不推荐作终态，仅可作 targetId 尚未接入时的过渡。**

**方案 C（最干净·超范围）｜真·逐帧驱动（去预演算）**
- engine 暴露 `step(dtMs)`，View 用 rAF 每帧推进，命令直接注入「当前」。彻底消灭预演算/回放二相。
- Tradeoff：改 engine 核心循环 + 全套测试重写 + 与 SB-T1/T3/T4/T5 已建的「事件流特征测试」范式冲突。**明确 backlog，本轮严禁。**

### 概念重组方案

- **`ManualUltimateOrder` 泛化为 `BattleCommand`**（`{atMs, unitId, kind:'ultimate', targetId?}`），为未来「手动技能/换位/撤退」留统一命令口。本轮只实现 ultimate，但用可扩展形状。
- **抽 `resolveSkillTargets(state, actor, skill, overrideTargetId?)`** 统一 auto（selector）与 manual（override）两条路径，避免 effects.ts 长出两套目标逻辑打架（SB-T5 拍板 6「两套聚合一致改」同类教训）。

### Tradeoff 矩阵

| 维度 | 方案A 冻结前缀+resume | 方案B 整场重算+截后缀 | 方案C 逐帧驱动 |
|---|---|---|---|
| 无跳变（选目标后仍成立） | ✅ 定义上成立 | ❌ 选目标即破 | ✅ |
| 选目标 | ✅ | ✅（但会跳） | ✅ |
| engine 改动量 | 中（resume+RNG快照） | 无（纯View） | 大（核心循环） |
| 长期腐化风险 | 低（根因修复） | **高（半死系统）** | 低 |
| 与现有特征测试兼容 | ✅ 增量 | ✅ | ❌ 需重写 |
| 本轮可落地 | ✅ 推荐 | ⚠ 仅过渡 | ❌ backlog |

### 灵感炸弹（≥2）

- 💡 **W1｜命令进事件流 → 可复盘对局**：把玩家每次大招命令也 append 进 `events`（如 `commandIssued`），回放/复盘能重现「玩家第 X 秒对 Y 下大招」。战斗从「录像」升级为「带操作轨迹的可复盘对局」，为未来「回放分享/教学/PvP 预测-校正」埋线，几乎零成本（命令队列已存在）。
- 💡 **W2｜目标预测高亮**：即使不选目标，也用当前 selector 预演「这个大招现在会打谁」（engine 已有 `selectTargets`，纯查询无副作用）。把「选目标」从必需降级为「不满意再改」，同时让 selector 抽象不再是黑箱、降低操作负担。

---

## Prioritized Research Directions

### 🔴 High-impact, Low-effort（本轮 SB-T2 应直接采纳）

- **R1｜命令带目标**：`ManualUltimateOrder` 加 `targetId?`；`processManualUltimates`/`executeSkill` 支持「单体伤害/单体控制的目标覆盖」，AOE/self/全体忽略。纯 engine + 特征测试「命中所选目标」。**（本轮硬指标）**
- **R2｜无跳变 = 冻结已呈现前缀**（方案 A 精神，取最小实现）：重算/resume 只影响 `elapsedMs` 之后；已播放事件一字不改。若时间紧，**至少**把 RNG 从「seed 头部重建」改为「导入到 `elapsedMs` 的 RNG 状态」，让后缀错位不回溯污染前缀。**（本轮硬指标：验收断言「手动开大后过去事件不变、无时间倒流」）**
- **R3｜死目标/超时 order 显式回退**：目标已死 → 回退 selector 或判 `manualUltimateFailed`（勿空放扣能量）；超时后 pending order 不改判决。**（防 Phase3 场景 2/3 变隐藏 bug）**
- **R4｜连点防抖/单次重算**：同帧多命令入队后单次重算，避免双跳/丢单（Phase3 场景 1）。

### 🟡 High-impact, High-effort（backlog）

- **R5｜engine `resumeTimedBattle(snapshot, orders)` + RNG 状态 export/import**：把 R2 从「过渡」升级为「结构性根因修复」，为一切「战斗途中改状态」的未来需求（换位/撤退/道具）铺路。
- **R6｜`BattleCommand` 泛化命令模型**：统一 ultimate/技能/换位命令口，防命令概念裂变。

### 🟢 Thought-provoking（长期研究）

- **R7｜方案 C 逐帧 `step(dtMs)` 去预演算**：操作深度天花板最高；与现有事件流测试范式冲突，需专门 sprint。
- **R8｜目标预测高亮（W2）**：让 selector 抽象对玩家透明，把 SB-T2 从「补救」变「增强」。

### 💡 Wild idea

- **W1｜命令轨迹进事件流 → 可复盘对局**：回放带操作轨迹，为教学/分享/PvP 预测-校正埋线。
- **W2｜「意图队列」半手动**：为每角色预设「能量满就放，目标优先级 = 最低血敌」，介于全自动与全手动之间——把「UB timing」从实时点击降维成「策略预设」，契合单机向低操作定位又保留深度。

---

## 收尾核对提示（给 Planner/Generator/Evaluator）

- **范围纪律**：本轮只做 SB-T2；R1+R2+R3+R4 属 SB-T2 合同内（选目标 + 无跳变 + 边界完备），R5-W2 一律 backlog，勿开新范围。
- **别造半死系统**（SPRINT 反复警告）：若采纳方案 B 过渡形态，**必须**在实现说明写明「targetId 接入后前缀冻结如何保证」，否则就是把「碰巧不跳」升级成「一定跳」。首选方案 A 精神（前缀只读 + RNG 状态导入）。
- **engine 纯净**：命令目标覆盖、resume、RNG 状态导入全进 `engine/squad` 纯层，随机仍走注入 RNG，零 Vue/Pinia/DOM/`Math.random`。
- **测试护栏**：`timedBattle.test.ts:261-291`「auto/manual ultimate」既有断言必须不破；新增断言覆盖「选目标命中所选」「手动开大后 `elapsedMs` 前事件逐条不变」「死目标回退」「超时 pending order 不改判」。
- **收尾**：确认 SB-T1..SB-T5 全 `[x]` 且与实现一致，5 条验收命令实测绿，未破坏 S14-A 6 项 + 第 1/2 轮 SB-T3/T5/T1/T4。

Sources:
- [Netcode Architectures Part 2: Rollback | SnapNet](https://www.snapnet.dev/blog/netcode-architectures-part-2-rollback/)
- [Netcode Concepts Part 3: Lockstep and Rollback | Yuan Gao (Meseta)](https://meseta.medium.com/netcode-concepts-part-3-lockstep-and-rollback-f70e9297271)
- [Netcode Architectures Part 1: Lockstep | SnapNet](https://www.snapnet.dev/blog/netcode-architectures-part-1-lockstep/)
- [Preparing your game for deterministic netcode | yal.cc](https://yal.cc/preparing-your-game-for-deterministic-netcode/)
- [Auto battler — Wikipedia](https://en.wikipedia.org/wiki/Auto_battler)
