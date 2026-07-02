# Product Research Audit — S14-F 第 3/3 轮（product-loop `--tier1 on --mode all`）

> 设计研究员视角。本轮指派切片 = **SF-T8｜家园日常委托（P3-10，代表性中期项）**——S14 家园 hub 深化的收官任务。
> 四镜头（核心假设质疑 / 相邻领域研究 / 逻辑完备性 / 替代设计提案），聚焦 SF-T8 的设计选择，给本质替代 + tradeoff。
> **前情校准（已核实，勿再误判）**：Round 1（SF-T1/T4/T7）+ Round 2（SF-T2/T3/T5/T6 + 两条 refine）均已 **COMPLETE**——`docs/orch/eval.md` R2 记录 851 tests 全绿、`userStore.settleHomestead` L434-440 已见 SF-T6 回拨钳位、`config/nurture.ts` `tutoringCost` 批量补习已落地。**收官轮仍须复核前轮真落地**（勿因跑到 R3 默认前轮完成——SA-T6/S14-B 暴击 UI/S14-E R1 收口被漏教训在前），但地基确已成立，本报告聚焦 SF-T8 本体。

---

## Executive Summary

- **当前设计基于的关键假设**（均已核实源码）：
  1. 「回归钩子 = 每日小目标清单」——委托被理解为「daily task 的家园分身」，天然复用 `daily` store 的 `todayKey`/`ensureToday` 跨天口径 + `markProgress`/`claim` 双阶段范式。
  2. 「委托的成功点已经存在，只差埋点」——三类目标对应的 action 全部**已在 `userStore` 门面中转且带 `saveToServer` 事务边界**：`settleHomestead`(L422)、`completeFloor`(L749)/`sweepFloor`(L770)、`enhanceEquipment`(L661)；`markProgress` 已在 gacha/battleWin/watch/nurture/minigame 五处焊接（L161/365/537/603/692/704），新埋点与之同构同位。
  3. 「委托是内容缺口而非机制缺口」——不引入新玩法，只把已有玩法完成行为再包一层动机外壳。
  4. 「奖励量级 = 挂机零头级」——委托奖励须小额，绝不盖过塔/看番/小游戏主动收入，也不架空图鉴大 sink（守 `config/homestead.ts` 顶部基线）。
  5. 「能不升存档就不升」——SPRINT.md 明令：委托进度优先派生/复用 daily 跨天口径，只有确需独立进度记录才升 v19（一 sprint 只升一次）。

- **最大研究发现落在「逻辑完备性」维度**：`DailyTaskType`（`gacha|battleWin|watch|nurture|minigame`，见 `config/dailyTasks.ts` L9）**恰好不覆盖家园三大成功点**——idle/tower/enhance 全无对应 taskType。这意味着 SF-T8 无论怎么实现都**必然新增 3 个埋点 + 一组委托模板**；真正的岔路只在「模板/进度桶挂在哪个命名空间」（扩通用枚举 vs daily 内平行子域）。

- **一句话最有价值的突破方向**：**把「家园委托」实现为 `daily` store 内的平行 `commission` 子域**（复用 `todayKey`/`ensureToday`/claim 机制，但用独立 `COMMISSIONS` 模板 + 独立 `commissionProgress`/`commissionClaimed` 桶 + 独立 `markCommission(kind)` 埋点），而非扩 `DailyTaskType` 通用枚举——家园语义不污染全站留存引擎、跨天口径 100% 复用（零新跨天逻辑），三个新埋点直接挂 `userStore` 已有的四个门面处，与现有 5 个 `markProgress` 埋点同位于 `saveToServer` 事务前。

---

## Phase 1: 核心假设质疑

### 假设清单（★ = 可质疑 / 本轮需拍板）

1. ★「委托 = daily task 的家园换皮」。**可质疑**：daily task 成功点是全站行为（抽卡/理论战/看番），委托成功点是家园本地行为（挂机/塔/强化）；语义域不同，硬塞进 `DailyTaskType` 会让通用枚举承担家园细节，违反 `daily.ts` L21 注释「保持领域 store 自包含」的设计意图。
2. ★「三个委托目标一定要新埋点」。**成立且不可避免**：`DailyTaskType` 无 idle/tower/enhance，三个成功点当前从不 markProgress（已 Grep 确认）。
3. ★「委托进度不需要独立存档字段」。**可质疑**：daily 的 `progress`/`claimed` 按 taskId key 命中写入；若不扩枚举就必须给 commission 单开 record，即使不升 SAVE_VERSION 也是新增序列化字段，须 schema/migrations/装配器三处同改 + 往返测试。
4. 「委托奖励纯正向、无成本」。**基本成立**：委托是回归激励，无 sink 语义。
5. ★「委托 UI 挂 home 面板」。**可质疑**：home tab 当前直接 `<HomesteadView/>`（家园漫步 + 离线结算 + 已落地的 SF-T3 驻留定时结算），委托卡挂 HomesteadView 内 vs 挂 hub 壳 home section 头部——**影响与 SF-T3 60s 定时进度条的视觉共存**（收官轮须复核不打架）。
6. 「每日 N 条固定委托」。**基本成立**，N 取值与是否轮换是设计自由度。
7. 「委托完成即时可领 / 手动领」。**成立**，沿用 daily claim 双阶段最省心智。

### 关键假设深挖

**深挖 A（最重要）：假设 2「委托复用现有 taskType」不成立**
`DailyTaskType = gacha|battleWin|watch|nurture|minigame`，**无 idle/tower/enhance**。三个候选目标全无对应，且各自的门面守卫已核实：
- 「挂机结算一次」→ `settleHomestead`（L422）返回 `IdleYield`，**但空结算也返回对象**（L425 `empty` / L453 全 0 早退）。埋点须守**实际产出**（`result.knowledge>0 || result.expEach>0`），**不能只看 `hours>0`**——首次基线/回拨钳位/0 入住都可能 `hours` 存在但产出为 0，反复进出会刷委托。
- 「打一层塔」→ `completeFloor`（L749）仅在真通新层返回 `{completed:true}`；`sweepFloor`（L770）返回 `outcome.ok`。**`battleWin` 专指宅理论战 `battleFlow.endGame`**，绝不复用。
- 「强化一件装备」→ `enhanceEquipment`（L661）返回 `ok`，埋点挂 `ok===true` 分支（成功强化才计）。

**结论**：SF-T8 必然新增 3 埋点 + 一组委托模板。岔路只在命名空间：
- **(a) 扩 `DailyTaskType` 加 idle|tower|enhance**：委托进 `DAILY_TASKS`，进度复用现有 `progress` record，**零新存档字段**（新 taskId 是字符串 key，旧档 `|| 0` 天然兼容，无需升版无需迁移），但**通用留存枚举被家园语义污染**。
- **(b) daily 域内开平行 commission 子域**：独立模板 + 独立 progress 桶 + 独立 markCommission，**语义干净**，但**新增 2 个序列化字段**（deserialize `?? {}` 兜底与现有 `progress` 同构，可不升 SAVE_VERSION，但须过 migrations 往返测试）。

**深挖 B：假设 5「不升存档」的边界**
「不升 SAVE_VERSION」≠「不改存档结构」。方案 (a) 真正零字段（新 key 塞进现有 record，旧档缺失 `|| 0`）。方案 (b) 新增 record 字段即使不升版本号也须在 `deserialize` 补 `?? {}` + `serialize`/`reset` 同改 + 过 migrations 往返测试——技术上可不升版（与 daily 现有 `progress`/`claimed` 完全同构，见 `daily.ts` L217-253），但**这是本轮唯一可能触存档的风险点，须 Scout/Planner 拍死「升不升 v19」**。倾向：**不升**（`?? {}` 兜底即可，v19 额度留给真需要的场景；`DailySave` 结构本就是 optional 兼容型）。

**深挖 C：假设 1「委托 = daily 换皮」的心智陷阱**
若委托与 daily task UI 长得一样（进度条 + 领取按钮），玩家会问「这跟每日任务有什么区别？」——**委托必须有辨识度**：它是**家园本地**的（目标全在 hub 内可完成，不用跳去抽卡/理论战），措辞强调「今天在家里做的事」（挂机一次 / 爬一层 / 强化一件）。这是产品层「为什么要有第二套任务」的回答。

### 被隐喻限制的地方

**隐喻「委托 = 任务清单」在「家园即时反馈」场景下牵强**：同类游戏的「家园委托」（明日方舟基建、崩坏书院委托、动森村民请求）多是**有叙事包装的角色请求**——「XX 想让你陪她挂机」，奖励是家园语境的（好感/家具/comfort）。当前把它做成「三条干巴巴进度条」，是被「daily 引擎现成」这个技术便利限制了想象。**本轮 P3 打磨不必叙事化**，但值得记：委托长期形态应向「角色请求 / 家园语境」靠拢（见 💡）。

---

## Phase 2: 相邻领域研究

### 领域扫描

- **明日方舟「基建委托 / 干员派驻」**：委托与**驻留系统绑定**（谁挂机决定产出）。可迁移：AnimePlay 已有 `placedCharacterIds`（入住 6 槽），委托可「点名入住角色挂机」增语境，而非纯全局计数（本轮不做，backlog）。
- **原神/崩坏3「每日委托」**：4 条固定 + **全部完成给额外总奖励（daily bonus）**。核心：完成度奖励比单条奖励更能驱动「今天回来清空」。**这是 daily task 现在没有的东西**（daily 逐条领、无全清 bonus）。
- **动物森友会「村民请求」**：轻叙事、无压力、可跳过。核心：委托是**软钩子**不是硬 KPI，漏做无惩罚，奖励小到「做了开心、不做无损」。
- **行为设计「习惯循环 cue-routine-reward」**：cue（进家园看到未完成委托）→ routine（做已有玩法）→ reward（小额即时奖励）。可迁移：委托位需**未完成/可领的显形信号**（红点/高亮），复用全站红点系统（`docs/留存系统.md`）。
- **版本控制「idempotent replay」类比**：daily 的 `ensureToday()` 读时判定跨天归零、幂等——委托必须严格复用同一口径，**绝不自造 `todayKey`**（两套跨天判定漂移是回归温床）。

### 可迁移模式（选最值得借鉴）

1. **「今日全清 bonus」（原神/崩坏3）**：daily task 没有的收尾正反馈。委托做完 N 条给额外 KP——低成本（一个 `allDone` 派生 + 一份额外奖励），高动机杠杆，正好回答「委托 vs daily 有何不同」。
2. **「委托即家园本地行为」（方舟基建心智）**：三条委托全在 hub 内可完成（挂机在 home tab、塔在 explore/battle tab、强化在 characters tab 装备面板）——**闭环在 hub 内**，不像 daily 要跳去抽卡/理论战。这是委托差异化定位，措辞/图标强化「不用离开家园」。
3. **「习惯 cue = 显形信号」**：委托位需要「有可做/可领」的视觉信号；至少给 home 面板「委托 X/N 完成」醒目摘要。
4. **「幂等读时跨天」（daily 现成）**：`ensureToday()` 直接复用，零新跨天逻辑——本轮最该守死的复用点。

### 竞品设计哲学对比

| 维度 | 原神每日委托 | 方舟基建委托 | AnimePlay SF-T8（建议） |
|---|---|---|---|
| 委托本质 | 全站四处跑腿 | 设施 + 干员派驻 | **家园 hub 本地行为** |
| 差异化点 | 全清 bonus + 派蒙叙事 | 与驻留角色绑定 | 与已有玩法成功点绑定（挂机/塔/强化） |
| 奖励量级 | 中（原石/摩拉） | 高（合成玉主源之一） | **小（挂机零头级，守回归补充基线）** |
| 存档负担 | 服务端 | 服务端 | **优先复用 daily 跨天，尽量零/极少字段** |

**设计哲学差异**：原神/方舟委托是**主要产出渠道**（为奖励而做）；AnimePlay 单机向委托应是**回归动机**（为「今天有点小目标」而做，奖励点缀）。故奖励须克制、不做成「不做就吃亏」的硬 KPI。

---

## Phase 3: 逻辑完备性

### 概念体系评估（文字关系图）

```
daily domain（跨天真相源 todayKey/ensureToday）
├── DAILY_TASKS（gacha/battleWin/watch/nurture/minigame）——全站行为，markProgress 遍历
├── WEEKLY_TASKS（同 taskType，weekKey 跨周）
├── login streak（连签）
└── [新增] COMMISSIONS（家园本地：idle/tower/enhance）——markCommission 遍历
        ↑ 复用 ensureToday/claim 机制，独立 commissionProgress/commissionClaimed 桶
        ↓ 埋点挂 userStore.settleHomestead / completeFloor+sweepFloor / enhanceEquipment
```

**模糊地带**：
- **「委托」与「每日任务」概念重叠**：都是「每天重置的小目标 + 领奖」。消除法：委托强调「家园本地 + 全清 bonus」，daily 强调「全站行为」，UI 分区展示。
- **「爬塔委托」与 `battleWin` 语义边界**：`battleWin` 专指宅理论战（`battleFlow.endGame`）。**绝不能把塔通层塞进 `battleWin`**（会污染宅理论战任务计数）——最易踩的语义错配。
- **「挂机结算一次」的触发定义**：`settleHomestead` 在登录静默 + 进家园 + 升设施 + place/unplace 多处调用（L477/486/504 均先 settle）。委托「挂机一次」应只认**有实际产出**（`knowledge>0 || expEach>0`），否则反复进出刷 0 产出也能完成。

### 极端场景检验

1. **0 个入住角色**：`settleHomestead` 返回 `characterCount:0` 空 yield（L425）。「挂机一次」若不守卫会被空结算刷满——**须守实际产出**。成立性：**需显式守卫**。
2. **已达塔顶 / 无未通层**：`completeFloor` 返回 `{completed:false}`（不推进）；`sweepFloor` 是缩水扫荡。「打一层塔」应认**扫荡也算**（否则毕业玩家无法完成塔委托、卡死全清）——**须同时埋 `completeFloor`(completed) + `sweepFloor`(ok)**。
3. **无重复装备可强化 / KP 不足**：`enhanceEquipment` 返回 false。「强化一件」在毕业/破产账号可能永远做不了——若三条委托全是「可能无法完成」的硬门槛，全清 bonus 会变「永远拿不到」。**须至少一条委托保底可完成**（有入住角色即可结算挂机）。成立性：**边界脆弱，需保底委托**。

### 操作缺口（玩家想做但做不到）

- 玩家想知道「今天委托做完没」→ 需 hub 级摘要（X/N），当前无。
- 玩家想一眼看到委托奖励 → daily task 有 reward 展示，委托应对齐。
- 玩家想跳转去做委托 → 委托卡若能点击直达对应 tab（塔→explore、强化→characters）顺手——增强非必须，本轮可省。

### 演化瓶颈

- 委托将来若要**点名角色**（方舟式）→ 当前纯全局计数模型承载不了「特定角色」维度（本轮不做，backlog）。
- 委托若要**叙事化 / 好感联动** → 需角色→委托模板映射，静态 `COMMISSIONS` 数组承载不了（backlog）。

---

## Phase 4: 替代设计提案

### 核心机制替代方案（对 SF-T8 给 2 个本质替代 + tradeoff）

**替代 1：委托进度桶命名空间——「扩 DailyTaskType」vs「daily 内平行 commission 子域」**

- **方案 A：扩 `DailyTaskType` 加 idle|tower|enhance，委托进 `DAILY_TASKS`**
  - Tradeoff：✅ **零新存档字段**（新 taskId 字符串 key，旧档 `|| 0` 天然兼容，无需升版无需迁移）；✅ 复用 markProgress/claim/isComplete 全套，代码最少。❌ **通用留存引擎被家园语义污染**（`daily.ts` L21 明写「保持领域 store 自包含」，塞入「塔/强化」破坏抽象纯度）；❌ 委托与 daily task UI 更难区分，回答不了「为什么两套任务」。
- **方案 B：daily 内开 `COMMISSIONS` 平行子域（独立模板 + `commissionProgress`/`commissionClaimed` + `markCommission`）**
  - Tradeoff：✅ **语义干净**（家园委托独立概念，不污染 DailyTaskType）；✅ 跨天口径 100% 复用 `ensureToday`（零新跨天逻辑）；✅ UI 天然与 daily task 分开；✅ 可挂独立「全清 bonus」不影响 daily。❌ **新增 2 序列化字段**（deserialize `?? {}` 兜底与现有 `progress` 同构，可不升版，须过 migrations 往返测试）。
  - **推荐 B**：语义纯度 > 省 2 字段的迁移成本。新字段与既有 `progress`/`claimed` 完全同构、迁移风险极低（旧档缺失 → `?? {}` → `ensureToday` 归零）。**升不升 v19 由 Scout/Planner 定，倾向不升**（`?? {}` 兜底即可）。

**替代 2：委托奖励结构——「逐条固定奖励」vs「逐条小奖 + 全清 bonus」**

- **方案 A（daily 现状克隆）**：每条各给固定小 KP/经验，无全清 bonus。✅ 最简单、与 daily 同构。❌ 缺「今天清空」收尾动机，委托沦为 daily 纯换皮。
- **方案 B（原神/崩坏3）**：每条极小奖 + **今日全清额外一份 bonus**（如 3 条各 +20KP，全清额外 +50KP/+1 券）。✅ 制造「回来清空」habit loop 收尾正反馈，是委托区别于 daily 的核心；✅ 成本极低（`allDone` 派生 + 一份 bonus）。❌ 须处理「毕业账号做不了某条」导致全清 bonus 拿不到的边界（Phase 3 场景 3）——缓解：至少一条委托「总能做」。
  - **推荐 B + 保底可完成委托**。若 R3 时间紧，可先做逐条奖励、全清 bonus 收尾补——但保底委托无论如何要有。

### 概念重组方案

**把「委托」定位为「家园本地 daily」而非「第二套泛任务」**：不新增顶层概念，明确委托 = daily 家族里「成功点全在 hub 内」的子集。UI 卡片可复用（进度条 + 领取）但**分区展示**（委托在 home 面板、daily 在留存中心），措辞强化家园语境，避免「两套任务系统」认知负担。

### Tradeoff 矩阵

| 方案 | 简洁性 | 语义纯度 | 存档负担 | 差异化(vs daily) | 推荐 |
|---|---|---|---|---|---|
| 命名空间 A：扩 DailyTaskType | ★★★ | ★ | 零字段 | ★ | |
| 命名空间 B：平行 commission 子域 | ★★ | ★★★ | 2 字段(倾向不升版) | ★★★ | ✅ |
| 奖励 A：逐条固定 | ★★★ | — | — | ★ | |
| 奖励 B：小奖+全清 bonus | ★★ | — | — | ★★★ | ✅ |

### 灵感炸弹（不受当前架构约束）

- 💡 **委托叙事化：角色请求制**——「入住的 XX 想看你打一层塔给她看」，完成给该角色好感 + 一句台词。把委托从「留存 KPI」变成「角色关系触点」，与 S14-C 好感系统联动，让家园从「数值面板」向「有人住的家」演化。**本轮不做，S15+ 立项。**
- 💡 **委托驱动家园经营正循环**——委托奖励不给 KP 而给「家园货币 / comfort / 家具碎片」，焊进 SD-T1 设施经营闭环（做委托 → 攒家园货币 → 升设施/买家具 → 挂机更快 → 更愿回来）。让委托成为家园日常燃料而非又一个通用 KP 水龙头。**与 P3-4 家具系统 backlog 联动，S15+ 一并设计。**

---

## Prioritized Research Directions

### 🔴 High-impact, Low-effort（本轮落地）

- **委托走「daily 内平行 commission 子域」（替代 1 方案 B）**：语义干净 + 跨天口径 100% 复用 + 与 daily 视觉分区。三个新埋点 `markCommission('idle'|'tower'|'enhance')` 挂 userStore 已有门面处（`settleHomestead` L459 产出发放后 / `completeFloor` L759 completed 分支 + `sweepFloor` L778 ok 分支 / `enhanceEquipment` L664 ok 分支），与现有 5 个 `markProgress` 埋点同位于 `saveToServer` 事务前。
- **「挂机结算」委托守卫「有实际产出」而非 `hours>0`**：只在 `result.knowledge>0 || result.expEach>0` 时 `markCommission('idle')`（防空结算/首次基线/回拨钳位刷委托——场景 1）。
- **「塔委托」同时埋 `completeFloor`(completed) + `sweepFloor`(ok)**：让毕业玩家用扫荡也能完成（场景 2），**绝不复用 `battleWin`**（语义错配污染宅理论战计数）。
- **至少一条委托「保底可完成」**：避免全清 bonus 因毕业/破产账号永远拿不到（场景 3）。挂机委托只需有入住角色即可结算，是天然保底项。

### 🟡 High-impact, High-effort（本轮争取 / 否则收尾补）

- **今日全清 bonus（替代 2 方案 B）**：委托区别于 daily 的核心设计，成本不高但需处理保底可完成边界——若本轮时间紧可先做逐条奖励、全清 bonus 留收尾补。
- **委托红点 / cue 显形**：接全站红点系统成本视现状而定；至少给 home 面板「委托 X/N」醒目摘要。

### 🟢 Thought-provoking（长期）

- **委托点名入住角色（方舟基建心智）**：需角色维度进度模型，纯全局计数承载不了。
- **委托位与 SF-T3 驻留定时结算的 UI 共存**：二者都在 home 面板，收官轮须复核视觉不打架（假设 5）。

### 💡 Wild idea

- **委托叙事化 / 角色请求制**（与好感联动，家园从数值面板变「有人住的家」）。
- **委托奖励给家园货币而非 KP**（焊进设施/家具经营闭环，委托成为家园日常燃料）。

---

## 收官轮附注（S14 整体一致性）

- 前轮已核实真落地（eval.md R2 = 851 tests 全绿 / SF-T6 钳位见 `userStore` L437-440 / SF-T2 批量补习见 `userStore` L701）。收官轮 Evaluator 仍须亲自复跑验收命令，SF-T8 完成后确认 SF-T1..T8 全 `[x]` 方为 S14-F 收官。
- SF-T8 若采用平行 commission 子域并新增 daily 序列化字段，须与 SF-T3（驻留定时结算，已落地）在 home 面板 UI 共存复核，且 persistence 往返测试须覆盖新字段旧档兼容。
- **命名空间拍板留给 Scout/Planner**：本报告倾向方案 B（语义纯度）+ 不升 v19（`?? {}` 兜底）；若 Scout 判定 `?? {}` 迁移测试成本不划算，方案 A（扩枚举、真零字段）是可接受的退路——但 A 须在 UI 分区上补偿差异化，避免「委托 = daily 换皮」认知塌陷。
