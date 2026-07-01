# AnimePlay 进化审计报告 — S14-B 第 3/3 轮（切片 = SB-T2 手动大招选目标 + 平滑推进）

> Reviewer 模式：evolution（进化策略，兼竞品研究）。范围：product-loop S14-B 第 3 轮，指派切片 **SB-T2**（P2-5）。
> 本轮双职责：① 复审已落地的 SB-T1/T3/T4/T5（有无回归/新体验坑）；② 聚焦 SB-T2 给 refine（做多深才够、怎样防退化、验收卡什么）。
> 已读：SPRINT.md（S14-B 全清单 + 第 3 轮 SB-T2 排期 L45-46）、homestead-hub-audit-report.md（P2-5 证据源 L143-146）、第 1/2 轮 eval.md·negotiation.md·scout.md·plan.md·gen_status.md、research-audit-report.md（第 3 轮 SB-T2 深研）、pitfalls.md（L83 三 tab 短路 / L84 别把 Sprint 内任务误判新范围）。
> 基线实测：`npm run test` = **663 passed (58 files)** 全绿（含 SB-T1/T3/T4/T5 特征测试），working tree 已含四项落地改动。
> 单机向定位：对标 PCR/蔚蓝档案/明日方舟战斗手感取「时机博弈 + 可复现」精神，**不追付费竞技/微操**。

---

## Executive Summary

**产品进化成熟度：6.0 / 10**（战斗子系统维度；较 S14-A 审计时的 3/10「战斗方法」显著抬升）。

当前阶段 = **从「能跑的战斗 demo」迈入「有手感的早期战斗产品」的临门一脚**。S14-B 前四项（第 1 轮 SB-T3 暴击活起来 + SB-T5 buff 按来源累加、第 2 轮 SB-T1 超时三态裁决 + 倒计时 UI + SB-T4 站位单体减伤）已把审计报告 P2-1/2/3/4/6 的五处「死机制/粗暴裁决」逐一接通，且全走 engine 纯层 + 特征测试护栏，零存档触点、663 测试全绿。**四镜头判断：核心完整性已补到「战斗循环闭环、裁决合理、站位/暴击/协同皆真生效」；最大的剩余进化机会集中在「差异化」维度的最后一块拼图——SB-T2 让「手动大招」从『只能改时机』升级为『能选目标 + 演出不跳变』，把玩家从『看胶片的观众』变成『能在关键帧改写结局的指挥官』。**

SB-T2 是 S14-B 收官项，也是**整个「胶片架构」第一次被真正撞墙**：手动大招插一刀会让「重算出的过去 ≠ 已放给玩家看的过去」，这不是回放对齐 bug，而是「一次性预演算 + 共享单 RNG 流」的结构性冲突。本轮最关键判断——**不要为了『强无跳变』在收官轮引入续算引擎/RNG 子流（高回归面、易超期空跑，重蹈 S14-A SA-T6 覆辙）；采纳研究报告『替代 A 严谨版』的最小可用形态：`ManualUltimateOrder` 加 `targetId`（可扩展 union）+ 单体 selector 才亮选目标 UI + engine 只对单体覆盖 + 补齐所有静默失败事件，并在验收/注释明写『弱无跳变，强无跳变（子流）标 backlog』——绝不让 UI 暗示『完全平滑』而代码做不到（防描述≠行为，CLAUDE.md 红线）。**

---

## Phase 1: 核心完整性

### 当前战斗核心循环（S14-B 四项落地后）
组队 → 进战（`SquadBattleView` 消费 `simulateTimedBattle`）→ 半自动演出（180ms/条回放）→ **可切自动/手动大招 + 手动开大**（`handleManualUltimate`）→ 90s 内 KO 或超时裁决 → 结算发奖 → 推进楼层。**循环已闭环**：不再有「磨血占优却判负」（SB-T1 三态裁决）、「站位纯装饰」（SB-T4 后排单体减伤 front/middle/back = 1/0.95/0.85）、「暴击死代码」（SB-T3 base critRate 0.05 + critRateUp 加成轴）、「双辅助被压平」（SB-T5 按来源累加设上限）。

### SB-T2 缺失环节（本轮补的核心完整性洞）
现状 `handleManualUltimate`（View L490-498）已能手动开大，但存在三处「浅尝辄止」缺口：
1. **改不了目标**：`ManualUltimateOrder = { atMs, unitId }`（types L174-177）无 `targetId`；大招目标恒由 skill 的 `target` selector 写死（如 `frontEnemy`/`lowestHpEnemy`）。玩家开大 = 只能选时机，选不了「打谁」——手动大招的杠杆只兑现了一半。
2. **每次开大整场重算致回放跳变**：`handleManualUltimate` L496 调 `regenerateBattleSimulation(battleElapsedMs)` 从 seed 全量重跑，游标复位。因共享单 RNG 流，注入点之后**全部** RNG 消费序改变 → 玩家「已看过的过去」被换成「重算出的另一套过去」，观感 = 战局突然换一套走法。
3. **静默吞命令（现存缺陷）**：`processManualUltimates`（timedBattle L287-310）对「注入点 ≥ maxTimeMs（超窗）」无任何 `manualUltimateFailed` 事件 → 临界超时开大命令被悄悄吞掉；「选中目标在生效前已死」也需回落 + 提示，绝不放空。

### 边界/空状态覆盖（SB-T2 必须显形，别做黑箱）
- 目标已死 → 回落 skill 原 selector（研究报告 Phase 3-2）+ 发事件让 UI 提示。
- AOE/治疗大招 → **UI 层就不亮「选目标」态**（单体 selector 才亮），engine 侧 `order.targetId` 只对单体覆盖、AOE 忽略——否则「点了 A 却全体命中」= P1-4 式 affordance 欺骗反向重演（研究报告 Phase 4-2 红线）。

### 复审：SB-T1/T3/T4/T5 已落地项无回归/新体验坑
- **SB-T1（超时三态裁决 + 倒计时 UI）**：`resolveTimeout`（timedBattle L117-134）先比存活数、相等再比 `sideHpRatio`、差<ε 真平局；winner 未扩、三态经 `BattleEndReason` 显形；`DEFAULT_MAX_TIME_MS` 经 engine 导出、UI/regenerate 同源；`SquadBattlefield` 倒计时（剩余秒 + 进度条 + ≤10s 转 `bg-danger`）语义令牌合规、无裸计时器。**无回归。**
- **SB-T4（站位单体减伤）**：`applyPositionDamageTaken`（effects L388）单体乘系数、AOE 原样、front=1 短路守既有断言；复用已解析 `resolvedSelector` 判 AOE，未碰 targeting/未改 formulas 签名。**无回归。**
- **SB-T3/SB-T5**：base critRate 0.05 注入运行时单位（DEFAULT 保持 0）；buff 按来源累加设上限。第 1/2 轮 eval 已核实，本轮 663 测试全绿复证。**无回归。**

---

## Phase 2: 竞争差距

| 产品 | 手动大招/操作杠杆 | 选目标 | 演出架构 | 对 SB-T2 的启示 |
|---|---|---|---|---|
| **PCR（公主连结）** | UB 时机是唯一操作杠杆，半自动 | **不给选目标**（技能写死） | 实时引擎 | SB-T2 的「选目标」实际比 PCR 还激进——保留「时机为主」重心，选目标定位为锦上添花（限单体、默认自动、首战引导手动）。别为「比 PCR 多一点」引入 PCR 刻意规避的微操复杂度。 |
| **蔚蓝档案** | EX 技能（大招）手动点放 + 部分技能手动选放置/目标 | 部分技能可选落点 | 实时引擎 | 「大招手动 + 有限选目标」正是玩家已被教育的桌上赌注；SB-T2 单体选目标与之同频，方向正确。 |
| **明日方舟** | 干员部署/技能开时机、朝向 | 放置位即战术 | 实时引擎 | 「站位 + 时机」双杠杆 = 战术深度来源；SB-T4（站位）+ SB-T2（时机+目标）合起来才凑齐这条轴。 |

**桌上赌注差距**：三家竞品都是**实时引擎**，天然无「预演算跳变」问题——它们没这困境是因为**根本没有胶片隐喻**。AnimePlay 的「半自动预演算 + 回放」是单机向的主动取舍（低算力、可复现、易分享），不必仓促推翻。**本产品缺的不是「实时引擎」，而是「手动大招选目标」这一被蔚蓝档案/方舟教育过的标配**——SB-T2 正是补这一格。

**竞品体验中本产品可差异化的机会**：预演算架构一旦把大招建模为命令流（`seed + units + commands`），一场战斗 = 一串短命令 → **战斗分享码/翻盘复现**是三家实时竞品几乎零边际成本做不到、而本产品天然可得的差异化出口（见 Phase 4）。

---

## Phase 3: 功能深度

### 现有手动大招的深度评估：浅（只改时机）→ SB-T2 补到中（时机 + 目标）
- **当前深度**：`autoUltimates` 开关 + 点大招按钮（SquadUnitBar L107 `@cast`）→ 只塞 `{unitId, atMs}`。玩家决策空间 = 「何时开」，无「打谁」。
- **SB-T2 后深度**：单体大招可选目标（收割残血/点杀治疗/破盾指定），把「时机博弈」扩成「时机 + 目标博弈」，与 SB-T4 站位机制协同（后排点杀 vs 前排顶伤成为可操作的战术选择）。

### 可扩展形状（低成本向前兼容，本轮顺手做）
- **命令类型写成可扩展 discriminated union**：落 `targetId` 时把 `ManualUltimateOrder` 写成 `{ kind:'ultimate', atMs, unitId, targetId? }` 形状，为未来「换目标策略/手动技能/暂停」预留（研究报告 Prioritized 🔴 + Phase 4）。零额外成本，避免二次重构。

### 集成/协作/自定义可能性（backlog，非本轮）
- **per-unit 自动大招策略**（每单位「攒满即放/见血才放」）→ backlog（超 SB-T2）。
- **PlayerCommand 泛化**（换目标/手动技能/暂停统一命令流）→ backlog。
- **实时步进 / fixed-timestep 引擎**（渲染逻辑解耦，为真实时铺路）→ 远期 backlog。

---

## Phase 4: 差异化与 Wow Factor

### 「如果能 XXX 就太酷了」（≥3，不受本轮 Sprint 限制）
1. **💡「命运预告」而非「无跳变」**：与其耗力让重算不跳变，不如**拥抱预演算**——开大瞬间用已算好的 events 直接渲染一条战术预告（大招命中 X、预计削 Y HP、战局走向缩略），把「胶片已定」从缺点变成卖点（玩家看到自己这一下如何改写结局）。**零续算/零子流成本**——只需 diff 新旧 events 高亮变化。对单机休闲定位可能比「工业级无跳变」更对味。（backlog，但强烈建议作为 SB-T2 跳变问题的**产品化解法候选**记入 FUTURE。）
2. **💡 战斗分享码**：大招建模为命令流后，一场战斗 = `seed + units + commands` 短字符串 → 玩家一键复现翻盘战。收集向单机罕见的、几乎零边际成本的社交/炫耀出口，三家实时竞品做不到。（backlog）
3. **💡 大招技能名横幅 + 伤害飘字**：手动开大时全屏技能名横幅 + 命中飘字，把「关键帧改写结局」的操作感演出出来（体验官报告 Nice-to-have）。（backlog，UI 打击感层）

### 口碑传播点
- **战斗分享码**（上 #2）= 最强口碑点：翻盘战一键复现可直接发社群，天然裂变。
- **命运预告**（上 #1）= 独有战术反馈，「我这一下大招如何改写结局」的确定性未来展示，是实时引擎给不了的预演算专属体验。

### 值得删掉或简化的东西（≥1）
- **`SquadBattleView.vue:126` 恒等三元噪声**：`currentPhase: currentPhase.value === 'towerMode' ? 'towerMode' : 'towerMode'` 永远返回 'towerMode'（scout 坑 C-5 已记）——死代码噪声。**建议简化为直接 'towerMode'**（本轮 SB-T2 若碰到 View saveState 顺手清；否则标 backlog，别为它单开范围）。

---

## Technical Health（附带）

- **架构扩展性风险（SB-T2 正撞墙）**：「一次性预演算（`simulateTimedBattle` 跑到底黑箱）+ 共享单 RNG 流」是所有 SB-T2 难题的总根。research 报告论证：真正无跳变的最小充分条件 = 「注入点之前的战斗状态可精确重建为续算初值」，而这被「一次性预演算」挡住。**长期正解 = 把引擎升级为可从 `TimedBattleState` 快照续跑的 `simulateFrom(state, orders)`（原函数退化为其调用者以零破坏现有测试）+ splittable/按 unitId 派生 RNG 子流**——一次投资根治前缀跳变 + 铺路暂停/步进/分享码。**但这是架构级改动、回归面大，收官轮不做**（否则易超期空跑）。本轮走替代 A 最小可用 + 明确标债。
- **性能瓶颈**：预演算一次算完、180ms 定速回放，无 N+1/大列表风险；`index.js` 287KB gzip 99KB，健康。SB-T2 加 `targetId` 不增算力。
- **测试覆盖**：58 文件 663 测试，engine/squad 特征测试护栏密（SB-T1/T3/T4/T5 各有断言）。**SB-T2 必须补**：targetId 单体覆盖命中所选、AOE 忽略 targetId、目标已死回落、超窗/未就绪/被控三类 `manualUltimateFailed` 事件、「前缀相等」测试（若做前缀冻结）。**若未来做 `simulateFrom`，必立「续跑逐事件 == 跑到底」等价性护栏**，否则重构即引入不可见回归。
- **安全/隐私**：SB-T2 纯前端战斗规则/UI，零后端/存档触点，无新增攻击面。

---

## Prioritized Recommendations

### 🔴 Critical（本轮 SB-T2 必须真实现，严禁降级为回归确认——S14-A SA-T6 教训 / pitfalls L84）
- **[SB-T2] `ManualUltimateOrder` 加 `targetId`（写成可扩展 union）+ engine 单体大招 `executeEffect` 对单体 selector 优先用 `order.targetId` 命中存活单位、AOE/治疗忽略**。接入点：`effects.ts:367 resolvedSelector`（复用已解析表达式判单体/AOE，坑 C-3 同口径，别重复解析）。
- **[SB-T2] 单体 selector 才亮「选目标」UI（SquadUnitBar/Battlefield 层判定），engine 覆盖规则与 UI 亮起条件同一口径**——防 P1-4 式「UI 承诺、代码不给」反向重演（研究报告红线 2）。
- **[SB-T2] 补齐所有静默失败事件**：现存「超窗吞单」（`processManualUltimates` 未处理 `atMs ≥ maxTimeMs`）补 `manualUltimateFailed reason:'expired'`；「目标已死」回落原 selector + 发事件提示。所有「命令没生效」分支都要发事件，不留悄悄吞单（研究报告红线 3）。

### 🟡 Important（本轮采纳的最小可用路线 + 防退化验收）
- **[SB-T2] 采纳「替代 A 严谨版」= 前缀事件冻结 + 后缀重算 + targetId 覆盖，达成『弱无跳变』**（已放画面不回退），**并在验收/注释明写「后缀仍重算、强无跳变待 splittable 子流」**——绝不让 UI/文案暗示「完全平滑」（研究报告红线 1，CLAUDE.md 描述≠行为红线）。若「完整 runtime 重建」成本过高，Planner 可收窄为「无跳变体验最小形态 + 选目标」并在计划说明（SPRINT L46 已授权收窄，但不得整项跳过）。
- **[SB-T2] 回放插值补间（HP 条平滑滑动）**：与「无跳变」正交、不碰 engine 的「平滑」另一半，体感收益大风险低——是最划算的「平滑」子项，本轮可顺手（复用 SquadBattlefield 现有 `transition-[width]` 范式，别新建裸计时器）。
- **[收尾] 确认 SB-T1..SB-T5 全 `[x]` 且与实现一致**：本轮是 S14-B 收官轮，Evaluator 须核对合同全绿而非只看末轮决策（pitfalls L84：tier1-on 跑满 ≠ 目标达成）。

### 🟢 Nice-to-have（体验优化，本轮可缓）
- **[SB-T4 backlog] 站位语义 tooltip**（后排减伤% 标注）——机制已立（第 2 轮），说明层补齐让「摆后排更耐打」可解释（negotiation 已标本轮不做 / backlog）。
- **[SB-T1 backlog] TIME UP 全屏横幅 / 顿帧**——超时裁决已立，横幅是额外演出层（第 2 轮 negotiation 已标 backlog）。
- **[清理] `SquadBattleView.vue:126` 恒等三元死代码**简化为 'towerMode'（碰到 saveState 顺手，否则 backlog）。

### 💡 Feature Idea（差异化创新，入 backlog）
- **「命运预告」**：拥抱预演算把开大后确定性未来渲染成战术预告，化胶片为卖点（零续算/零子流，是 SB-T2 跳变的产品化解法候选）。
- **战斗分享码**：`seed+units+commands` 一键复现翻盘战，把架构投资变现为社交内容（差异化口碑点，三家实时竞品做不到）。
- **架构投资 `simulateFrom` 可续跑引擎 + splittable RNG 子流**：达「强无跳变」+ 铺路暂停/步进/分享码的唯一一次性投资；收官轮不做，建议正式排入紧邻的战斗深度轮，别无限顺延成永久债。
- **per-unit 自动大招策略 / PlayerCommand 泛化 / fixed-timestep 步进**：远期战斗深度演化，超 S14-B。

---

**一句话收尾**：S14-B 前四项已把战斗从「死机制半成品」补成「有裁决、有站位、有暴击、有协同的早期产品」（成熟度 3→6）；SB-T2 是收官的最后一格——**本轮把「手动大招选目标 + 弱无跳变（明确标债）+ 静默失败清零」做实即达标，切忌为『强无跳变』在收官轮引入续算引擎/RNG 子流而超期空跑；『命运预告』与『战斗分享码』是预演算架构专属、竞品给不了的差异化 Wow，值得入 backlog。**
