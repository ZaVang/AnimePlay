# Product Experience Audit — S14-B 第 3/3 轮（product-loop --tier1 on --mode all）

> 体验官（Reviewer/experience 镜头）。本轮指派切片 = **SB-T2（手动大招选目标 + 平滑推进，P2-5）**——S14-B 最后一块、也是最难一块。
> 方法：源码审读为主（`.claude/scripts/get_page_state.js` 不存在），三镜头（功能体验 / 审美品味 / 产品想象力）收敛到 SB-T2 手感 + 对前两轮 SB-T1/T3/T4/T5 的回归复审。
> 已读：SPRINT.md（第 1/2 轮追加清单）、eval.md（第 2 轮 CONTINUE，SB-T1/T4 已落地）、negotiation.md（SB-T2 已预定第 3 轮）、research-audit-report.md（本轮 SB-T2 设计研究，替代 A/B 分水岭）、homestead-hub-audit-report.md（P2-5 证据源）。
> 源码：`views/SquadBattleView.vue`、`engine/squad/{timedBattle,effects,types}.ts`、`components/battle/squad/{SquadBattlefield,SquadUnitBar}.vue`。
> 日期：2026-07-01。

---

## Executive Summary

**总评分：6.4 / 10**（较第 2 轮持平；SB-T1/T3/T4/T5 四项已把战斗从「无判负逻辑/无暴击/站位装饰/辅助压平」拉到「有裁决/有暴击/有站位/有协同」的及格线，但**本轮指派的 SB-T2 尚未落地**，手动大招仍是 S14-B 最扎眼的「半死交互」——扣分主因）。

三镜头核心发现：
- **功能体验**：SB-T2 现状 = 手动开大 → `handleManualUltimate`（View:490）push 一条**无 targetId** 的 order → `regenerateBattleSimulation(battleElapsedMs)`（从 t=0 用同种子整场重算）。这会触发 research 报告点破的**双重跳变**（共享 RNG 后缀整体位移 + 时间↔下标重映射突变）——玩家开大瞬间 HP 条/能量条会「跳一下」，敌方仿佛「换了一套打法」。且大招目标由 `skill.target` selector 写死，玩家点了「开大」却无从指定打谁。这正是 P2-5 要根治的核心，也是本轮必须真实现的指派任务。
- **审美品味**：倒计时（SB-T1）与站位减伤（SB-T4）的视觉承诺已落地且克制（`bg-accent/bg-danger`、≤10s 转告警色）。但**打击感反馈仍缺位**——暴击（SB-T3 已激活）在 UI 上无任何专属表现（无飘字、无抖动、无色彩强调），玩家感受不到「这一下暴了」；手动大招同样无演出层，开大与普攻在视觉上几乎无区别。这不是 SB-T2 的强制验收项，但是「手感」维度的最大审美债。
- **产品想象力**：research 报告的「命运预告」（拥抱预演算把开大后的确定性未来渲染成战术反馈）与「战斗分享码」（seed+units+commands 一键复现）是把 SB-T2 架构投资变现的两个高杠杆方向，值得 backlog。本轮先把 SB-T2 做实（选目标 + 无跳变），别让 UI 承诺「点击开大打谁」而代码给不了。

**范围纪律**：SB-T2 是本轮**必须真实现的指派任务**，非回归确认。SB-T1/T3/T4/T5 回归复审见 Phase 4；未发现回归。

---

## Phase 1: 功能体验

### 首次印象与上手路径（战斗核心循环）
从 hub explore 选队 → `startTowerBattle` 直达 battle 阶段（SA-T6 直达进战红线成立，无冗余编成器）。战场进场即滚动回放（180ms/条），倒计时条在顶部显形（SB-T1），站位槽位左右分列。上手路径顺畅，**问题全部集中在「玩家想介入时」**。

### 核心流程逐步走查 —— SB-T2 手动大招（本轮切片，逐帧记录感受）

1. **切「自动大招：关」**（SquadBattlefield:60-68）——按钮语义清晰，`handleToggleAutoUltimates` 也走 `regenerateBattleSimulation(cursorTime)` 重算。此处切换本身也有轻微跳变风险（同 RNG 后缀移位），但因是玩家主动切策略、频率低，观感影响小于开大。
2. **等能量攒满**——`ultimateReady = energy >= 1000`（View:347），UnitBar 亮起「大招就绪」。反馈即时，符合 PCR 式「攒条开大」直觉。**这一步体验是对的。**
3. **点单位开大**——`handleManualUltimate(unitId)`（View:490-498）：
   - **感受 A（跳变）**：push `{ unitId, atMs: battleElapsedMs+1 }` → `regenerateBattleSimulation(battleElapsedMs)` 从头重算整场。共享 `state.rng`（timedBattle 单流）导致注入点之后**所有** RNG 抽取（暴击/方差）整体移位；`rebuildVisibleBattle` 按新 events 重放 `slice(0,cursor)` → **同一游标位置事件语义变了 → HP/能量瞬间跳一下**。这是 research 报告 Phase 1 深挖 A3+A4 的实测确认：**弱无跳变都不稳**。
   - **感受 B（选不了目标）**：`ManualUltimateOrder`（types:174-177）**只有 `atMs`+`unitId`，无 `targetId`**；engine `processManualUltimates`（timedBattle:287-310）直接 `executeSkill(state, unit, skill)`，目标全由 `skill.target` selector 决定（effects:367 `effect.target ?? skill.target`）。玩家点「开大」= 只能选「谁开大」，选不了「打谁」。对单体大招（`frontEnemy`/`lowestHpEnemy`）尤其别扭：想集火某个残血敌人却只能听天由命。**这是 P2-5「手动大招是真杠杆」承诺的直接落空。**
   - **感受 C（临界超时静默吞单）**：`atMs = battleElapsedMs+1`，若接近 90s 上限，`processManualUltimates` 的 `orders[i].atMs <= state.now` 可能永不成立 → 命令被静默吞掉、**无 `manualUltimateFailed reason:'expired'`**（research Phase 3 极端场景 1 的现存缺陷）。玩家点了开大却「什么也没发生」，无任何反馈——描述≠行为的隐性重演。
4. **大招命中**——因无 targetId，命中由 selector 决定；若玩家「以为」自己在指挥集火，实际是引擎自选，属**认知错位**。

**小结**：SB-T2 三大坑（跳变 / 选不了目标 / 静默吞单）**全部未修**，是本轮必须落地的核心。

### 边界情况与错误处理
- `manualUltimateFailed` 已覆盖 `notReady/controlled/missingSkill` 三态并有日志（View:457-461）——**已有基础设施**，SB-T2 补 `expired`（超窗）+ 目标已死回落只需顺着这套加，成本低。
- **目标已死回落缺口**：SB-T2 加 targetId 后，若所选目标在大招生效前已死，engine 需回落 skill 原 selector 并发事件提示，绝不放空（research Phase 3 场景 2）。当前无此逻辑（因还没 targetId）。

---

## Phase 2: 审美品味

### 配色与视觉层次
倒计时（SB-T1）用 `bg-accent`→`bg-danger`（≤10s）语义令牌切换，进度条 `bg-surface-2` 底 + 语义前景，层次清晰、无 text-white 压浅底、无动态色类拼接（SquadBattlefield:44-57）——**合规且克制**。VS 分隔、左右阵营色（`text-info`/`text-danger`）语义一致。

### 打击感与动效（手感维度最大审美债，非 SB-T2 强制项）
- **暴击无视觉反馈**：SB-T3 已让暴击真实发生（`isCritical` 事件写入、UI 消费 hpAfter），但 `applyEventToUnits`（View:355-416）对 `damage` 事件**只更新 hp，不区分 `isCritical`**——暴击与普通伤害在画面上**完全一样**。玩家感受不到「暴了」，SB-T3 的机制价值在体验层被埋没。**这是「打击感」最该补的一刀**（伤害飘字 + 暴击专属色/放大）。
- **手动大招无演出**：开大与普攻在战场上视觉几乎无差异（仅日志有「释放大招」文字，View:427）。手动开大作为玩家唯一操作杠杆，**缺一个「值得点」的仪式感**（技能名横幅 / 短暂高亮 / 命中特效）。
- **回放节奏定速 180ms/条**：事件稠密时（多单位同时行动）会显得「跳跃」。research 报告的「HP 条插值补间」（平滑滑动而非瞬移）是与「无跳变」正交、不碰 engine 的「平滑」另一半，体感收益大、风险低——**值得纳入 SB-T2 或紧邻轮**。

### 间距与信息密度
战场左右分列 + 倒计时区 `max-w-md` 收窄，密度舒适。UnitBar 承载 hp/energy/statuses/大招按钮，信息集中但未拥挤。**无明显债。**

### 整体视觉性格
战斗视觉「功能正确但缺性格」——它把状态说清楚了（谁掉血、还剩多久、谁能开大），但**没有情绪**（暴击不燃、开大不爽、超时不紧张）。这是从「及格」到「好玩」的关键落差，但多属 SB-T2 之外的打击感层（backlog）。

---

## Phase 3: 产品想象力

### 「如果能 XXX 就太好了」（≥3 个提议）
1. **💡「命运预告」——把预演算从缺点变卖点（research 灵感炸弹 1）**：与其耗力让重算不跳变，不如在开大瞬间用已算好的 events 直接渲染「这一下如何改写结局」（大招命中 X、预计削减 Y HP、战局走向）。对单机休闲定位，可能比「工业级无跳变」更对味，且零续算/零子流成本（重算后 diff 新旧 events 高亮变化即可）。**超本轮 SB-T2 最小验收，标 backlog，但方向极诱人。**
2. **💡 战斗分享码（research 灵感炸弹 2）**：SB-T2 一旦把大招建模为命令流（`seed+units+commands`），一场翻盘战 = 一个短字符串，可一键复现。引擎纯净 + RNG 注入使其天然可复现——收集向单机罕见的、几乎零边际成本的「可炫耀」社交出口。**backlog。**
3. **💡 暴击/大招飘字 + 打击感层**：伤害飘字（暴击专属放大+色）、大招技能名横幅、命中顿帧。把 SB-T3 已激活的暴击机制「显形」为爽感，是当前投入产出比最高的体验升格。**backlog（SB-T2 之外）。**

### 可以删掉的东西（≥1）
- **`handleToggleAutoUltimates` 的整场重算**（View:482-488）：切换自动大招也走 `regenerateBattleSimulation` 从头重算，若 SB-T2 落地续算/前缀冻结架构，此处应一并复用无跳变推进，删掉「切策略也重算全场」的冗余重算路径，避免两套不一致的推进逻辑长期并存。

### 「啊哈时刻」分析
战斗的「啊哈」应是**「我卡准时机开大，一发逆转战局」**（PCR 式时机博弈）。当前被三件事拦住：① 开大跳变让「逆转」看着像 bug 不像操作；② 选不了目标让「集火」无从谈起；③ 暴击/大招无演出让「逆转」不燃。**SB-T2 落地（无跳变 + 选目标）是让啊哈时刻成立的前提；打击感层（backlog）是让它更强烈。**

---

## Phase 4: 一致性与对比（含前两轮回归复审）

### 前两轮 SB-T 回归复审（本轮附带，非空跑）
- **SB-T1（超时三态裁决 + 倒计时）**：`resolveTimeout`（timedBattle:117-134）存活数优先→HP% tie-break→ε 平局，三态经 `BattleEndReason` 显形；倒计时 UI 时限经 `DEFAULT_MAX_TIME_MS` 同源（View:300/839）。**无回归。**
- **SB-T3（暴击激活）**：`BASE_CRIT_RATE` 注入运行时单位 base critRate（timedBattle:79），DEFAULT 保持 0。机制真生效。**唯一体验债 = UI 无暴击反馈（见 Phase 2，非回归、属打击感 backlog）。**
- **SB-T4（站位单体减伤）**：`applyPositionDamageTaken`（effects:85）AOE 原样、单体乘系数、front=1 短路，damage 分支接入（effects:388）。**无回归。体验债 = 站位减伤对玩家不可见（无 tooltip 讲解），玩家可能「摆了后排但不知道为什么更耐打」——属 backlog 站位可解释性 UI。**
- **SB-T5（buff 按来源累加设上限）**：`sumStackableStatusValues`（effects:52）+ 共享 helper 两处一致。**无回归。**

### 跨视图一致性
`manualUltimateFailed` 的日志文案（View:457-461）与 engine reason 口径一致；补 `expired` 时须同步 `manualFailLabel` 映射（否则新 reason 落到默认「技能缺失」——文案错位）。

### 与同类产品对比（PCR）
PCR 半自动**不给选目标**（UB 目标由技能写死），SB-T2 的「选目标」实际比 PCR 更激进。research 报告已提醒：选目标限定单体大招、默认自动、首战引导手动——保留 PCR 式「时机为主」重心，选目标是锦上添花而非核心。**这条对 SB-T2 落地粒度至关重要：别为「比 PCR 多」引入 PCR 刻意规避的微操复杂度。**

---

## Prioritized Recommendations

### 🔴 Critical（SB-T2 本轮必须真实现，非回归确认）
1. **【SB-T2】手动大招无跳变推进**：现状 `handleManualUltimate`→`regenerateBattleSimulation` 从 t=0 整场重算（View:490-498）会致 HP/能量跳变。**至少做到「已回放前缀冻结、游标不回退」的弱无跳变**（research 替代 A），若工期允许优先 research 推荐的**替代 B `simulateFrom(state, orders)` 可续跑引擎**（前缀真快照/零重算，且为 SB-T4 调试/暂停/分享码铺路）。**红线：若只做弱无跳变，必须在验收/注释明写「后缀仍重算、强无跳变待 splittable 子流」，绝不让 UI/文案暗示「完全平滑」而代码做不到**（描述≠行为，CLAUDE.md 明令根除）。
2. **【SB-T2】手动大招可选目标（限单体 selector）**：`ManualUltimateOrder` 加可选 `targetId`（写成可扩展 discriminated union 为 PlayerCommand 泛化留形状）；engine 对**单体 selector** 优先用 `order.targetId` 命中存活单位、AOE/治疗忽略；**UI 侧只对单体 selector 亮起「选目标」态**（AOE 大招点一下即放）——engine 覆盖规则与 UI 亮起条件必须同一口径，防 P1-4 式「UI 承诺选目标、代码全体命中」反向 affordance 欺骗。

### 🟡 Important（SB-T2 落地时应顺手补，防半死系统）
3. **【SB-T2】命令静默失败清零**：补 `manualUltimateFailed reason:'expired'`（注入点 ≥ maxTimeMs 超窗，timedBattle:288 现静默吞单）+ `targetId` 目标已死时回落 skill 原 selector 并发事件——所有「命令没生效」分支都要有反馈，同步补 `manualFailLabel` 映射（View:457）。
4. **【SB-T2】续算若做必立等价性护栏**：`simulateFrom` 从头跑必须逐事件等于 `simulateTimedBattle`（后者退化为前者调用者，对外 API 零破坏守住现有断言）——否则主循环重构即引入不可见回归。

### 🟢 Nice-to-have（SB-T2 之外，体验/审美升格）
5. **回放 HP 条插值补间**（超范围/backlog）：与「无跳变」正交、不碰 engine 的「平滑」另一半，180ms 定速稠密时的跳跃感可大幅缓解，风险低体感高。
6. **暴击 UI 反馈**（超范围/backlog）：`applyEventToUnits` 的 damage 分支已有 `isCritical` 可用（types:214），加飘字/暴击专属色让 SB-T3 机制显形为爽感——当前投入产出比最高的打击感补丁。
7. **站位减伤可解释性 UI**（超范围/backlog）：后排 tooltip 标注「承受单体伤害 −15%」，让 SB-T4 机制「摆后排更耐打」被玩家理解而非黑箱。

### 💡 Feature Idea（backlog，不进本轮）
8. **「命运预告」**（超范围）：拥抱预演算，把开大后的确定性未来渲染成战术预告，化胶片为卖点（零续算/零子流）。
9. **战斗分享码**（超范围）：`seed+units+commands` 一键复现翻盘战，把 SB-T2 命令流架构投资变现为社交内容。
10. **splittable / 按 unitId 派生 RNG 子流**（超范围/紧邻轮）：达成「注入点后未波及单位不变」的强无跳变的必要条件，A/B 谁都绕不开——别无限顺延成永久债，建议正式排入 SB-T2 收尾或紧邻深度轮。
