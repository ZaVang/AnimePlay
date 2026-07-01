# AnimePlay 家园 hub 进化审计报告 — S14-A 第 3 轮（product-loop --tier1 on --mode all）

> 角色：Product Evolution Reviewer（进化策略师）。本轮 = S14-A 第 3/3 轮。
> 本轮切片 = **SA-T6｜消解三 tab 结构冗余（P1-3，依赖 SA-T1）** —— S14-A 最后一条主任务。
> 双职责：① 复审 SA-T1..SA-T5（前两轮已落地）有无回归 / 新体验坑；② 聚焦 SA-T6 给出「做多深才够 / 怎样防退化 / 验收卡什么」。
> tier1 on → 决策信息性、引擎跑满 3 轮，本轮不因通过而提前停。**不开新范围**（超范围创意标 backlog）。日期：2026-07-01。
> 证据源：`docs/orch/homestead-hub-audit-report.md` P1-3/P1-4、`docs/plans/SPRINT.md` SA-T6、前两轮 eval/negotiation/plan/gen_status。

---

## Executive Summary

**产品进化成熟度：6.5/10（较第 2 轮的 6/10 上升 0.5；SA-T6 落地后有望到 7/10）。**

家园 hub 已从「五环拼装的半成品」（审计初 3-4/10）走到「可玩的早期产品」。前两轮把三条致命根因逐一接线补上：SA-T1 让编队真正可编辑、SA-T2 消除「预览≠实战」假预览、SA-T3 把随机加点改成可预期成长、SA-T4 让 10 个招牌 UR 在战斗里「打一场就记住她」、SA-T5 用扫荡周循环解决「卡关即断更」。**收集向玩法的三大底线（收集有意义 / 养成有决策 / 循环有产出）第一次同时成立。**

但**产品还差最后一步「结构自洽」**：家园 hub 的五个 tab 里，编队 / 探索 / 战斗三 tab 仍在对同一件事（配一支塔队、看敌人、开打）做不同保真度的重复渲染——而 SA-T1 把 squad tab 变成可编辑之后，**这个冗余不但没消，反而恶化成「两套完全可编辑的编队编辑器」**（squad tab 一套 + battle tab 内 `SquadBattleView.towerMode` 又一套）。这是四维里**核心完整性维度**当前最大的进化机会，也正是本轮切片 SA-T6 要闭合的。SA-T6 是 S14-A 从「功能齐了」跨到「体验顺了」的临门一脚——不加新能力，而是把已有能力理成一条不折返的线。

**本轮最关键的一条建议**：SA-T6 落地 Option A（squad tab 唯一编辑入口 / explore「开始挑战」直接触发实战 / battle tab 只演出），**其成败卡点是「让 explore 的开始挑战能跳过 `SquadBattleView.towerMode` 直接进 battle 阶段」**——必须给 SquadBattleView 加一个「带指定 squadId 直接开打」的入口（prop/emit/query），否则删了两个只读 tab、用户点「开始挑战」仍会掉进 SquadBattleView 自带的第三套编队编辑器，冗余原地复活、SA-T6 白做。

---

## Phase 1: 核心完整性

### 当前核心循环（前两轮后）
「进家园 → 看角色/养成 → 编队 → 探索预览 → 战斗 → 奖励回流 → 卡关则扫荡补给」这条主循环**已闭环、可重复、有短期目标**。数据持久化（v15 存档 + 往返测试）、错误/空状态（未登录态 / 无角色态 / 无可扫层态）、可预期成长、可重复日循环都在。这是本轮切片以外「已达标」的部分，本轮不重开。

### SA-T6 = 核心完整性维度当前唯一的结构性缺口
**问题不是「缺功能」，是「同一功能出现三次、且现在有两次可编辑」。** 逐一定位（均已代码求证）：

- **squad tab**（`HomesteadHubView.vue:441-517`）：SA-T1 后**已全可编辑**——站位卡可点换人（`openCharacterSelect`）、队名可改（`renameSquad`）、空槽可点加人、复用 `CharacterSelectModal`、改动即时反映战力/校验。这是「正确的那一处编辑」。
- **explore tab**（`:519-596`）：只读敌人预览 + 奖励预览 + 扫荡卡 + 「进入战斗」按钮。「进入战斗」（`:525`）**只是 `switchTab('battle')`，不触发实战**。
- **battle tab**（`:598-604`）：内嵌 `<SquadBattleView/>`，而 SquadBattleView **默认进 `currentPhase='towerMode'`**（`SquadBattleView.vue:66,126,133`）——这是**第二套完整可编辑编队器**：队名输入（`:680-685`）、5 个可点站位 + picker（`:689-726`）、战力显示（`:729-731`）、开始挑战按钮（`:733-745`）、爬塔规则卡（`:750-763`）。实战只能从这里的「开始挑战」（`startTowerBattle`，`:227`）进 `battle` 阶段（`:253`）。

**用户实际路径（当前）**：在 squad tab 精心配好队 → 切 explore 看预览 → 点「进入战斗」→ **落在 battle tab 的 towerMode，被要求「再选一次小队、再点一次开始挑战」**。刚才在 squad tab 的编辑白做一遍观感；两套编辑器口径虽同源（都走 `validateTowerSquadMembers` + `updateSquadMember`）但 UI 风格/交互完全两样（一套是 hub 语义令牌大站位卡，一套是 SquadBattleView 的 tailwind 小格子）。**这是 hub 最后一处「affordance 与心智模型打架」——五 tab 里三 tab 是同一件事的不同保真度切片。**

### SA-T6「做多深才够」——收敛到 Option A（合同已给二选一）
建议押 **Option A**（squad = 唯一编辑入口 / explore = 预览 + 「开始挑战」直接触发 / battle = 只承载演出），理由：
1. **SA-T1 已把 squad tab 做成完整编辑器**——Option A 复用它、只需「拆掉 battle tab 里的第二套编辑器（towerMode 编成 UI）」，改动集中、增量最小。Option B（删 squad+explore、把 towerMode 编成屏搬进 explore）等于反过来抛弃 SA-T1 刚做的 hub 原生编辑器、把 SquadBattleView 的 tailwind 编成屏扶正，与前两轮方向相悖、返工大。
2. Option A 让每 tab 语义单一：squad=编、explore=看+发起、battle=演。符合 PCR「编成即操作页、一屏闭环」的心智，也符合本项目「单机向、别过度」定位。

**深度边界（防过度）**：
- **只做「消重复 + 接通一条不折返的线」，不做**：拖拽跨 tab、编队/探索合并成单屏大页、为 battle tab 单造新演出壳、把 SquadBattleView 拆包重写。合同「一处编辑、不重复」是唯一硬目标。
- **核心接线动作**：给 `SquadBattleView` 加「带指定 squadId 直接进 battle 阶段、跳过 towerMode 编成 UI」的入口（prop `autoStartSquadId` / emit / query 皆可，Generator 定）。explore「开始挑战」= 校验当前选中队 → 通过则切 battle tab 并携该 squadId 触发 `startTowerBattle` → SquadBattleView 直接进 battle 演出。towerMode 编成 UI 在 hub 内不再作为「编队入口」暴露。

### 边界情况与空状态（SA-T6 必须守，否则从「结构冗余」退化成「结构断裂」）
SA-T6 是「删/合并 UI + 改流程」，最容易在边界处制造死路。必须覆盖的空/错态：
1. **队伍未满编 / 校验不过时点「开始挑战」**：明确反馈（禁用 + 原因文案），**不能静默切到 battle tab 又卡在无法开打**。当前 explore「进入战斗」无校验（纯切 tab），Option A 让它变「直接开打」后必须补校验闸（复用 `validateTowerSquadMembers`）。
2. **本层已通过（`hasCompletedFloor(currentFloor)`）**：主线该层已过不能重复推进——「开始挑战」应置灰/提示「本层已通过（可扫荡）」，引导去扫荡卡，别让用户开一场不给奖励的空战。
3. **敌人未就绪 / 未登录 / 无可用队**：explore「开始挑战」在这些态禁用并给因由，不能切进 battle tab 后白屏或卡「载入敌人中」。
4. **战斗结束 / 失败后返回**：battle tab「返回探索预览」（`:600`）与 SquadBattleView 内部 result 的 retry（`:793`）两条返回路径必须一致收敛。**若 towerMode 编成 UI 仍作 result→retry 的落点，冗余从后门复活**——SA-T6 须一并处理 retry 落点（建议原队重开 / 回 explore，不回 towerMode 编成屏）。
5. **深链兼容**：`/squad-battle → tab=explore`、`/nurture → tab=characters`（`router/index.ts:28-36`）+ `?tab=battle` 直链**不能破**。用户直接深链 `tab=battle`（未经 explore 发起、无进行中战斗）时 battle tab 该如何回落——**这是 SA-T6 最刁钻的设计决策点**（见 Recommendations SA-T6-C）。

---

## Phase 2: 竞争差距（尊重单机向定位）

对标 PCR / 蔚蓝档案 / 明日方舟的**信息架构**（非付费/竞技深度）：

- **PCR / 蔚蓝档案**：编成即操作页——一屏内配队、看敌方、开打，绝不「两屏只读预览 + 第三屏可编辑同内容」。本项目当前正是 PCR 明确规避的反模式。**SA-T6 Option A 正向这条标配靠拢。**
- **明日方舟**：关卡 → 编队（一次）→ 直接开始行动，编队页即发起页，中间无折返。本项目 explore「进入战斗」不发起、battle tab 又要二次编队，属「多一跳且折返」的桌上赌注缺失。
- **标配缺口（SA-T6 正补的）**：「配队页 = 发起页、发起后直接进战斗演出、无二次配队」是三家共同标配。本产品差的就是这一跳的顺滑，SA-T6 补齐即达平价。

**差异化机会（backlog，非本轮）**：三家编成页普遍**信息密度过载**。本项目 hub 分 tab 的克制布局对单机休闲向更友好——SA-T6 后可作为「轻量清爽编成」差异点保留，**别为对标而把三 tab 硬压成一屏过载页**（这也是 Option A 优于「合并单屏」的隐性理由）。

---

## Phase 3: 功能深度（本轮聚焦 SA-T6，附前轮回归复审）

### SA-T1..SA-T5 回归复审（本轮职责①）——结论：无回归，可安全叠加 SA-T6
逐条代码求证 + 交叉前两轮 eval：

- **SA-T1（编队编辑）**：`HomesteadHubView.vue:209-257` 换人/改名/空槽加人经 `updateSquadMember`/`updateSquadName` 即时刷新战力校验；picker 复用 `CharacterSelectModal`、置灰已占用（`editingUsedCharacterIds`）。**无回归。** SA-T6 Option A 正是把它扶正为唯一入口——方向一致、互相加固。
- **SA-T2（敌人同源）**：`HomesteadHubView.vue:260-269` 与 `SquadBattleView.vue:602-606` 均走 `towerFloorEnemySeed(floor)` 确定性种子；刷新按钮已移除。**⚠ SA-T6 回归红线**：改动 battle tab 挂载 / SquadBattleView 入口时**不得破坏 `ensureTowerEnemies` 的 watch（`:603-606`）与 explore 预览的同源**——两处仍须读同一 `towerFloorEnemySeed(floor)`。删 towerMode 编成 UI 时别连带删了敌人载入逻辑。
- **SA-T3（确定成长）**：走 base 五维比例，与 UI 结构无耦合。**SA-T6 不触碰，无回归风险。**
- **SA-T4（签名 kit）**：`SIGNATURE_KIT_OVERRIDES` 纯数据覆盖 + `filter(isSquadSkillKitReady)` 集合不变守住 SA-T2 同源。**SA-T6 不触碰，无回归风险。**
- **SA-T5（扫荡周循环）**：扫荡卡落 explore 面板（`HomesteadHubView.vue:560-594`）。**⚠ SA-T6 回归红线**：Option A 改造 explore（加「开始挑战」发起 + 校验闸）时**扫荡卡必须原样保留在 explore**，别在重排布局时误伤 N/M 进度条 / 一键结算飘字 / setTimeout 登记清除。

### SA-T6 功能深度评估：这是「减法带来的深度」
SA-T6 不加能力，但**把「一处编辑」立起来后反而给未来功能腾出结构位**：squad tab 成唯一编辑入口后，日后「拖拽排序 / 一键最优 / 队伍模板 / 推荐战力提示（S14-C）」都有明确落点（squad tab），不再分裂到三处。**当前三 tab 冗余正是这些深度功能无法干净落地的结构障碍。** SA-T6 是「为深度清地基」，杠杆比看起来大。

---

## Phase 4: 差异化与 Wow Factor

> 均超本轮切片 → 全部 backlog，仅记录，不进 S14-A。尊重单机向定位。

- **💡「一键出征」丝滑感（SA-T6 顺势 wow，backlog 微增强）**：Option A 后 explore「开始挑战」→ 直接看战斗演出，这条「一键从预览到开打」相对当前「折返二次配队」是体验跃迁。**本轮只做「能直接开打」，动效/转场打磨归 backlog**——但这一跳做顺了是玩家「随手再爬一层」意愿的隐形推手。
- **💡 同番羁绊编队 buff**（backlog，S14-D/F 护城河）：squad tab 成唯一入口后，未来编队时显示「同番角色 +X% 羁绊」是最自然的差异化落点——护城河数据（番剧关系）在编队环节露头。SA-T6 的「一处编辑」是其前置结构。
- **💡 队伍预设模板 / 编队分享码**（backlog）：单机向可做「导出/导入编队码」让玩家在社区分享 build——口碑传播点，同样依赖「一处编辑」的干净结构。

**值得删掉或简化的东西（本轮正在做）**：**battle tab 内 `SquadBattleView.towerMode` 的编队 UI（`:670-748`）+ 爬塔规则卡（`:750-763`）在 hub 语境下是纯冗余**——squad tab 已承担编队、explore 已承担预览与规则暗示。SA-T6 删/隐藏它正是「值得简化」的兑现。**注意**：`/squad-battle` 深链仍重定向到 hub，SquadBattleView 组件不能删；towerMode 逻辑作为「内部兜底/深链落点」可保留代码，但**不作为 hub 主流程编队入口暴露**（删的是「暴露」不是「代码」，避免深链 404）。

---

## Technical Health（附带）

- **架构扩展性**：SquadBattleView（~1000 行，CLAUDE.md 已标 S6 重构目标）承载 towerMode 编成 + battle 演出 + result 三态。**SA-T6 加「直接开打入口」时切忌再往 SquadBattleView 塞逻辑**——优先用轻量 prop/emit 让父级（HomesteadHubView）编排 phase，别在 view 里再加 sessionStorage 分支（现有 `saveState` 的 `currentPhase: towerMode ? 'towerMode' : 'towerMode'` 已是可疑死逻辑，`:108`，触及该文件顺手可清）。
- **性能瓶颈**：无本轮新增风险。删 towerMode 编成 UI 反而略减 battle tab 渲染负担。
- **测试与质量**：前两轮 653 test 全绿 / type-check 0 / build 通过 / security PASS（eval 亲验）。**SA-T6 是 UI/流程改动，测试覆盖天然薄**——必须补：① explore「开始挑战」校验闸测试（未满编→禁用、本层已过→禁用、就绪→发起）；② 深链回归（`/squad-battle`/`/nurture` 重定向不破、`?tab=battle` 直链不白屏）。别让「流程改动无测试」成为悄悄回归的温床。
- **既有 lint 债**：`SquadBattleView.vue:82 towerEnemyData = ref<any>`（`no-explicit-any`）——SA-T6 必然触及 SquadBattleView 入口，**顺手类型化**（前轮 N-2 顺手项，触及即做）。

---

## Prioritized Recommendations

### 🔴 Critical（SA-T6 本体，本轮必做，缺则 S14-A 不闭合）

- **SA-T6-A｜落地 Option A：squad=唯一编辑 / explore=预览+「开始挑战」直接触发 / battle=只演出**。核心接线 = 给 SquadBattleView 加「带 squadId 直接进 battle 阶段、跳过 towerMode 编成 UI」入口；explore「开始挑战」校验通过后携该 squadId 触发实战。**验收卡「无三重只读/可编辑重复」+「从 hub 走『编队→探索→战斗』顺畅不折返、不二次配队」。**
- **SA-T6-B｜删/隐藏 battle tab 内 towerMode 编成 UI（`SquadBattleView.vue:670-763` 编队器+规则卡）作为 hub 编队入口**——但**保留 SquadBattleView 组件与 towerMode 代码路径**（`/squad-battle` 深链重定向依赖它，不得 404）。验收卡「旧路由/深链不破」+ router 重定向测试。
- **SA-T6-C｜发起/返回/深链空态与落点全覆盖（防「消冗余」退化成「结构断裂」）**：explore「开始挑战」在「未满编/校验不过/本层已通过/敌人未就绪/未登录」各态禁用+因由；battle 结束/失败/retry 返回落点统一收敛（原队重开 / 回 explore，不回 towerMode 编成屏）；`?tab=battle` 直链（无进行中战斗）需明确回落态。**此为 SA-T6 最刁钻决策点，Planner/Generator 须拍板并写进验收。**

### 🟡 Important（本轮顺手做，显著提升完整度）

- **SA-T6-D｜扫荡队与发起队口径统一**：SA-T5 的 `sweepSquadId`（`HomesteadHubView.vue:289-292` 另算「首个含有效成员队」）与 SA-T6 后 explore 发起用的「当前选中队」统一为**同一支当前选中队**，避免「squad tab 选了队 A、扫荡/开打却用队 B」的新困惑。SA-T6 改造 explore 时顺手消这个既有小坑。
- **SA-T6-E｜守住 SA-T2 同源 + SA-T5 扫荡卡不被误伤**（回归红线，见 Phase 3）：改动 explore 布局/battle tab 挂载时，敌人预览仍读 `towerFloorEnemySeed(floor)`、扫荡卡 N/M 进度条+飘字+setTimeout 清除原样保留；前两轮特征测试全绿。
- **SA-T6-F｜`towerEnemyData = ref<any>` 类型化**（前轮 N-2，触及即做）。

### 🟢 Nice-to-have（本轮可选，不阻断验收）

- 清 `SquadBattleView.vue:108 saveState` 的 `currentPhase: towerMode ? 'towerMode' : 'towerMode'` 死三元（触及该文件顺手）。
- explore「开始挑战」→ battle 的转场轻量过渡（丝滑感），可延到 UI 打磨轮。

### 💡 Feature Idea（backlog，不进 S14-A）

- 同番羁绊编队 buff（S14-D/F 护城河，依赖 SA-T6「一处编辑」结构）。
- 队伍预设模板 / 编队分享码（单机向口碑传播点）。
- 推荐战力/胜率提示（S14-C，与 SA-T6 后 explore 发起环节强耦合，上线后按反馈提队首）。
- 拖拽排序 / 一键最优编队（squad tab 成唯一入口后的深度增强）。
- SquadBattleView ~1000 行拆包（S6 重构目标，SA-T6 后 towerMode 编成 UI 退居兜底更好拆）。
