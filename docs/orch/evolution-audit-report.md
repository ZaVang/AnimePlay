# Evolution Audit Report — S14-F 第 3 轮（product-loop `--tier1 on --mode all`）

> Reviewer：Product Evolution 镜头。本轮 = S14-F（P3 打磨，S14 **收官**）第 3/3 轮。
> 指派切片（SPRINT 排期第 3 轮）= **SF-T8｜家园日常委托（P3-10）**——S14 家园 hub 深化的最后一块。
> 方法：Read/Grep 审源码（`.claude/scripts/get_page_state.js` 不存在）+ 对照 `homestead-hub-audit-report.md`（P3-10 证据源）+ 已定稿的 `research-audit-report.md`（SF-T8 设计研究）与 `negotiation.md`（R2）+ 竞品日常委托手感（原神/明日方舟/蔚蓝档案，尊重单机向定位）。日期：2026-07-02。
> 纪律：本轮 = ① 复审 SF-T1..T7 无回归 + ② 聚焦 SF-T8 refine HOW（做多深、怎样防退化、验收卡什么）。不开新范围（超范围创意标 backlog）。

---

## Executive Summary

**产品进化成熟度：7.9 / 10（早期产品，逼近「完整可玩循环」）。**

S14 家园 hub 深化跑到收官轮。前两轮已把「结构性冗余」「无决策养成」「挂机无反馈」「经济漏洞」逐一收干净（编队接线、确定加点、个人技接通已在 S14-A..E；补习递增+批量、驻留定时结算、收益软化、墙钟钳位、套装 chip、双 sink 提示已在 S14-F R1/R2，851 测试全绿）。**hub 现在能跑、有决策、有反馈、账目也不漏了——唯一还缺的，是「一周后为什么还回来」的那个钩子。** SF-T8（家园委托）正是补这最后一块：把「挂机结算 / 打一层塔 / 强化一件装备」这三个玩家本来就在做的动作，包一层「今天回家做点小事拿小奖」的动机外壳。

四镜头判断：**核心完整性**上，这是收集向养成循环的「日回归闭环」最后一环，缺它则 hub 是「一次性通关后放置」而非「每日回来」；**竞争差距**上，原神/方舟/蔚蓝档案的日常委托是留存标配，AnimePlay 已有 daily 全站任务但**恰好不覆盖家园本地行为**（`DailyTaskType` 无 idle/tower/enhance）；**功能深度**上，委托的杠杆不在「又一条进度条」，而在「今日全清 bonus」这个 daily 现在没有的收尾正反馈；**差异化**上，长期委托应向「家园语境 / 角色请求」演化，但本轮 P3 打磨克制不做。

**最大进化机会 = 功能深度维度的「今日全清 bonus」**——它是回答「委托 vs daily 有何区别」的核心，成本极低（一个 `allDone` 派生 + 一份 bonus 奖励），却是「回来清空」习惯循环的收尾动机。

**本轮切片最关键一条建议**：SF-T8 走 `daily` store 内**平行 commission 子域**（独立模板 + 独立 progress/claimed 桶 + `markCommission(kind)` 埋点，复用 `ensureToday` 跨天口径），三个新埋点挂 `userStore` 已有门面——挂机守 `yield.hours>0`、塔委托**同埋 `completeFloor`+`sweepFloor` 且绝不复用 `battleWin`**、至少一条委托保底可完成。

---

## Phase 1: 核心完整性

### 当前核心循环分析（收官视角）
S14 收官时 hub 的循环已基本闭环：抽卡 → 养成（补习递增成本、确定加点）→ 配装（套装 chip 显形、双 sink 提示）→ 编队（可编辑、敌我同口径）→ 探索（塔 + 扫荡日循环）→ 家园（挂机驻留定时可见、收益软化封顶、墙钟钳位）。**能做的事、流程闭环、反馈到位、账目不漏——四项都已补齐。**

**缺失的关键环节（SF-T8 补的正是这个）**：hub 缺「每天回来」的**日回归钩子**。当前唯一的日循环是塔扫荡（`sweepFloor`）与全站 daily task，但：
- daily task 的成功点是**全站行为**（抽卡/理论战/看番），完成它们要**离开家园**跳去别的模块；
- 家园本地的三个成功点（挂机结算 / 通层 / 强化）**当前从不触发任何任务进度**——`DailyTaskType = gacha|battleWin|watch|nurture|minigame`，无 idle/tower/enhance。

结果：进家园的玩家没有「今天在家里有个小目标」的即时动机。SF-T8 就是把这三个本地行为包成「今日委托」，闭环全在 hub 内完成。

### 空状态与边界情况覆盖（SF-T8 必须卡的三条守卫）
research-audit Phase 3 的极端场景检验已定稿，本轮 refine 复述并锁进验收：
1. **0 入住角色**：`settleHomestead` 返回 `characterCount:0` / `hours:0` 空 yield。「挂机委托」若不守卫会被反复进出空结算刷满 → **必须守 `yield.hours>0`**（`computeIdleYield` L191 已明确 `hours<=0||count===0` 返回 `hours:0`，埋点读 `yield.hours>0` 即可）。
2. **毕业玩家 / 已达塔顶**：`completeFloor` 返回 `{completed:false}`（不推进），日常爬塔靠 `sweepFloor` 缩水扫荡。「打一层塔」委托**必须同时埋 `completeFloor`（completed 分支）+ `sweepFloor`**，否则毕业玩家塔委托永远做不了、卡死全清 bonus。**绝不复用 `battleWin`**（专指宅理论战 `battleFlow.endGame`，塞塔进去会污染宅理论战任务计数——最易踩的语义错配）。
3. **破产 / 无重复装备可强化**：`enhanceItem` 返回 false。「强化一件」在毕业+破产账号可能永远做不了。若三条委托全是「可能无法完成」的硬门槛，全清 bonus 会变「永远拿不到」→ **至少一条委托保底可完成**（有入住角色即可结算挂机，是最稳的保底项）。

### onboarding / 持久化
- 委托 UI 挂 home 面板（`HomesteadView` 内 or hub 壳 home section），须与 R2 落地的 **SF-T3 驻留定时结算进度条视觉共存**——收官轮复核二者不打架（都在 home 面板）。
- 持久化：commission 子域新增序列化字段与 daily 现有 `progress`/`claimed` **完全同构**（`?? {}` 兜底、`ensureToday` 归零），迁移风险极低。**升不升 v19 由 Scout/Planner 拍死**——research-audit 与 negotiation R2 均倾向不升（`?? {}` 兜底即可，SAVE_VERSION 一 sprint 只升一次的额度留给真需要处）；若升则 schema/migrations/装配器三处同改 + 往返测试（存档协议铁律）。

---

## Phase 2: 竞争差距

### 同类产品日常委托对比（≥2 竞品）

| 维度 | 原神每日委托 | 明日方舟基建委托 | 蔚蓝档案日常 | AnimePlay SF-T8（建议） |
|---|---|---|---|---|
| 委托本质 | 全站四处跑腿 | 设施 + 干员派驻绑定 | 咖啡厅/任务本刷取 | **家园 hub 本地行为** |
| 差异化点 | **全清给额外总奖励** + 派蒙叙事 | 与驻留角色绑定 | 体力刷本 | 与已有玩法成功点绑定（挂机/塔/强化） |
| 奖励量级 | 中（原石/摩拉，主要产出渠道） | 高（合成玉主源之一） | 中高 | **小（挂机零头级，回归动机非主产出）** |

### 本产品缺少的标配功能
- **家园本地日常任务**：三家竞品的日常都有「家园/基建/据点」语境的每日目标，AnimePlay 的 daily task 全是全站行为、无家园本地项。SF-T8 正补这个标配缺口。
- **「今日全清 bonus」**（原神/崩坏3 标配）：完成所有日常给额外总奖励，比逐条奖励更能驱动「今天回来清空」。**这是 daily task 现在没有的东西**（daily 逐条领、无全清 bonus）。SF-T8 应把它作为委托区别于 daily 的核心卖点。

### 机会点（尊重单机向定位）
竞品委托是**主要产出渠道**（为奖励而做，做成硬 KPI）；AnimePlay 单机向委托应是**回归动机**（为「今天有点小目标」而做，奖励点缀）。故奖励须克制、不该做成「不做就吃亏」的硬 KPI——这是 AnimePlay 相对氪金手游的差异化取舍，也守 `config/homestead.ts` 顶部「挂机是回归补充不盖过主动收入」基线。

---

## Phase 3: 功能深度

### SF-T8 的深度杠杆点
- **浅尝辄止版**（要避免）：三条干巴巴进度条 + 逐条领奖 = daily task 纯换皮，玩家会问「这跟每日任务有什么区别」。research-audit 的心智陷阱警告成立。
- **有深度版**（推荐）：三条委托全在 hub 内闭环（挂机在 home tab、塔在 explore/battle tab、强化在 characters tab）+ **今日全清 bonus** 收尾。差异化定位 = 「家园本地 + 全清激励」，措辞/图标强化「不用离开家园」。

### 命名空间深度取舍（refine 拍板：平行子域）
research-audit 替代 1 的两方案，本轮采信其推荐 **B（daily 内平行 commission 子域）**：
- **方案 A（扩 `DailyTaskType` 加 idle|tower|enhance）**：零新存档字段、代码最少，但**通用留存引擎被家园语义污染**（daily.ts 顶部明写「保持领域 store 自包含」），且委托与 daily task 更难区分。
- **方案 B（平行 commission 子域）**：语义干净、跨天口径 100% 复用 `ensureToday`（零新跨天逻辑）、UI 天然与 daily 分区、可挂独立全清 bonus 不影响 daily。代价仅新增 2 序列化字段（与既有 `progress`/`claimed` 同构，可不升版）。**语义纯度 > 省 2 字段的迁移成本，采信 B。**

### 集成/自定义可能性（本轮不做，backlog）
- 委托点名入住角色（方舟基建心智）需角色维度进度模型，纯全局计数承载不了 → backlog。
- 委托叙事化 / 角色请求制需角色→模板映射，静态数组承载不了 → backlog。

---

## Phase 4: 差异化与 Wow Factor

### 「如果能 XXX 就太酷了」（≥3，均标 backlog，不进本轮）
1. 💡 **委托叙事化：角色请求制**——「入住的 XX 想看你打一层塔给她看」，完成给该角色好感 + 一句台词。把委托从「留存 KPI」变成「角色关系触点」，与 S14-C 好感系统联动，让家园从「数值面板」向「有人住的家」演化。→ backlog S15+。
2. 💡 **委托驱动家园经营正循环**——委托奖励不给 KP 而给「家园货币 / comfort / 家具碎片」，焊进 SD-T1 设施经营闭环（做委托 → 攒家园货币 → 升设施/买家具 → 挂机更快）。让委托成为家园日常燃料而非又一个通用 KP 水龙头。→ 与 P3-4 家具 backlog 联动，S15+。
3. 💡 **委托红点 / cue 显形接全站红点系统**——进家园看到未完成委托的显形信号（习惯循环 cue），复用 `docs/留存系统.md` 红点。本轮至少给 home 面板「委托 X/N 完成」醒目摘要（轻量版可做），完整红点接线 → backlog。

### 口碑传播点
「今天回家发现有三件小事可做、做完还有额外奖励」的日常仪式感是留存黏性的来源，但**单机向委托不追求硬 KPI**——它的口碑点是「轻松、无压力、做了开心不做无损」（动森村民请求哲学），而非「不做就落后」。这是相对氪金手游的差异化气质。

### 值得删掉或简化的东西（≥1）
- **不要给委托做独立于 daily 的第二套 claim/跨天/红点全家桶**——委托 = daily 家族里「成功点全在 hub 内」的子集，UI 卡片复用（进度条+领取）但分区展示。**严禁自造 `todayKey`**（两套跨天判定漂移是回归温床，必须复用 `ensureToday`）。「委托」不是新顶层概念，不新增一整套留存基础设施。

---

## Technical Health（附带）

- **架构扩展性**：commission 子域寄生在 daily store 是正确的轻量选择——复用跨天引擎、不新开 store。风险点仅在「新增序列化字段」若走升版则须三处同改 + 往返测试（存档协议已成熟，风险可控）。
- **埋点一致性风险**：三个 `markCommission` 埋点须挂在 `userStore` 门面（`settleHomestead` L422 / `completeFloor` L749+`sweepFloor` L770 / `enhanceEquipment` L661），与现有 5 个 `markProgress` 埋点同构同层——**勿散落到 engine**（engine 纯净铁律，不得 import store）。塔委托双埋 completeFloor+sweepFloor、绝不碰 battleWin 是本任务最易踩的语义错配，验收须专项核对。
- **回归复审（SF-T1..T7，收官轮勿默认前轮已完成）**：R2 eval 已亲自复跑确认 SF-T2/T3/T5/T6 + 两 refine 真落地（851 测试全绿、softCap 替换硬顶、批量补习逐份扣费、驻留定时器 onUnmounted 清除、墙钟钳位 guard + 新建 settle 单测）。收官轮 Evaluator **仍须亲自复跑验收命令**验 SF-T1..T7 无回归，SF-T8 完成后确认 SF-T1..T8 全 `[x]` 方为 S14-F 收官。
- **测试与质量**：SF-T8 须补 commission 子域单测——三守卫（挂机 hours>0 才计 / 塔 completeFloor+sweepFloor 均计且不碰 battleWin / 保底委托可完成）+ 全清 bonus 派生 + 跨天归零往返；若升 v19 则 migrations 往返覆盖新字段旧档兼容（`?? {}`）。

---

## Prioritized Recommendations

> 每条尽量标 SF-T# 或 backlog。本轮切片 = SF-T8。

### 🔴 Critical（缺失的日回归标配，S14 收官必交付）
- **SF-T8｜家园日常委托**：走 `daily` 内平行 commission 子域（独立模板 + progress/claimed 桶 + `markCommission(kind)` 埋点，复用 `ensureToday`）；三守卫必须落地——① 挂机委托守 `yield.hours>0`（防空结算刷）；② 塔委托**同埋 `completeFloor`+`sweepFloor`、绝不复用 `battleWin`**（防毕业玩家卡死 + 防污染宅理论战计数）；③ **至少一条委托保底可完成**（挂机项，防全清 bonus 永远拿不到）。奖励小额（挂机零头级），走 `profile.earn`。UI 挂 home 面板与 SF-T3 进度条共存。
- **SF-T8 存档拍板**：commission 字段与 daily 现有 `progress`/`claimed` 同构，**倾向不升 v19**（`?? {}` 兜底）；若确需升则 schema/migrations/装配器三处同改 + 往返测试。Scout/Planner 拍死。

### 🟡 Important（显著提升委托完整度，本轮争取）
- **SF-T8 今日全清 bonus**：三条委托全清给额外一份小奖（如各 +小额、全清额外 +1 券/小额 KP）——委托区别于 daily 的核心收尾正反馈，成本低（`allDone` 派生 + 一份 bonus）。若时间紧可先逐条奖励、全清 bonus 收尾补，但优先争取。
- **SF-T8 home 面板委托摘要**：给 home 面板「委托 X/N 完成」醒目摘要（习惯循环 cue 的轻量版），让「有可做/可领」显形。

### 🟢 Nice-to-have（体验优化）
- **委托卡点击直达对应 tab**（塔→explore、强化→characters、挂机→home）——顺手增强，非必须。
- **收官一致性巡检**：确认 SF-T1..T8 全 `[x]`、hero 流程示意 / 战力口径措辞 / 套装 chip / 驻留进度条 / 委托卡在 home 面板视觉统一，S14 整体收官无割裂。

### 💡 Feature Idea（差异化创新，backlog S15+）
- 委托叙事化 / 角色请求制（与 S14-C 好感联动，家园从数值面板变「有人住的家」）。
- 委托奖励给家园货币而非 KP（焊进设施/家具经营闭环，委托成为家园日常燃料，与 P3-4 家具 backlog 联动）。
- 委托点名入住角色（方舟基建心智，需角色维度进度模型）。
- 委托红点接全站留存红点系统（完整 cue 显形）。
