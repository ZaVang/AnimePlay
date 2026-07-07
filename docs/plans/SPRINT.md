# AnimePlay — SPRINT 合同（S16：家园 hub 玩法进一步深化）

> product-loop 执行合同（本次启动：`--tier1 on --mode all --max_iter 5`，北极星 = **家园 hub `/homestead` 的玩法进一步优化**）。
> **本 Sprint 北极星 = 把家园 hub 从「数值挂机面板」进一步做成「有决策、有循环、有情感回报的基地玩法」**。具体「要做什么」由 Tier1 三审（体验/进化/研究）审计当前家园 hub 后生成，Planner 逐轮拍板并追加到本文件；每轮 Generator 落地、Evaluator 独立复验。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/orch/scout.md`（本轮接地）、以及三份审计报告（`docs/orch/{product,evolution,research}-audit-report.md`）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。登录：字母数字用户名+密码，首登即注册。
- **本 Sprint 聚焦面 = 家园 hub `/homestead`**（HomesteadHubView 五面板：home/characters/squad/explore/battle）。核心相关面：
  - `views/HomesteadView.vue`（家园广场 WALKABLE_ZONES / 设施 / 家具 / 入住 / 离线收益 / 驻留定时器，~1121 行）
  - `stores/homestead.ts`（入住名单）+ `config/homestead.ts`（`computeIdleYield` / comfort 软加成 / 设施乘区 / 家具 comfort / softCap / 离线封顶）
  - `engine/homestead/bonds.ts`（`computeBondBonus` 同作品羁绊，纯函数）
  - `stores/facility.ts`（设施乘区，v17 域）、`stores/furniture.ts`（家具域，v20）
  - `stores/userStore.ts`（`settleHomestead` 含回拨钳位 + 家具/设施门面编排）、`stores/daily.ts`（跨天/周判定 + 委托子域）
  - `components/homestead/HomesteadManageModal.vue`（入住/家具/羁绊显形的唯一物理决策点）
  - 存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（**SAVE_VERSION 权威在 `schema.ts` 顶部，当前 =20**）

## 当前家园 hub 已有机制（进化的地基，别推倒重来）
1. **离线挂机**：6 入住槽，每角色 flat exp(200/h)/affection(5/h) + 按稀有度加权 KP(2/h×系数)，离线 12h 封顶（随设施总级数每级 +0.5h）。
2. **三设施**（exp/bond/knowledge）：KP 指数成本无底 sink，每级 +8% 对应单一产出（独立乘子，不受装备 0.6 cap 钳制）。
3. **家具**（7 件名梗风目录，v20）：KP buy-out sink，只贡献 comfort，复用 comfort 软加成轴（每 10 点 +1%，与装备共用 +20% 硬顶）。
4. **入住羁绊**（S15-T3，派生免存档）：同作品 ≥2 人 → 队伍级独立乘子并入 `computeIdleYield`，`HomesteadManageModal` 显形命中羁绊。
5. **comfort 软加成 / softCap 平滑封顶 / 墙钟回拨钳位**：守「挂机不盖过主动收入」基线（满挂机一次 ≈ 一趟塔零头）。
6. **hub 统一入口**：explore（爬塔/扫荡）、squad（编队）、battle（半自动战斗演出）、characters（养成/配装）都从 `/homestead` 进。

## 架构铁律（不可违反）
- engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/`Math.random`/IO；挂机/羁绊/掉落走纯函数 + 注入 RNG/时钟）
- 依赖只向下（views→components→stores→engine）
- **货币只走 `profile.spend·earn`**
- 颜色走皮肤语义令牌（禁 `text-white` 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）
- 组件 `setTimeout`/`rAF` 登记并卸载清除；改文件前先 Read；改挂机/养成规则前先看对应 `*.test.ts`
- **收益/战力加成经既有 `computeIdleYield` / `resolveEquipBonus` 口径汇入，严禁另拼**（预览=结算同源，最易漏的半迁移点）
- 别破坏 S14-A~F / S15 已成机制（战力单一 seam / facility v17 / 装备强化+套装+modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 / 羁绊 / pity v20 / 墙钟钳位）

## 存档变更协议
新增/改存档字段必须 **schema + migrations + 装配器三处同改 + 往返测试**；SAVE_VERSION 权威在 `schema.ts` 顶部（当前 **=20**）。**一次 sprint 最多升一次**——本 Sprint 若需升档，全部新域共用同一次 bump（→21），第一次动存档的那轮做，后续轮复用绝不再升。**能派生免存档就优先派生**（仿 S15-T3 羁绊）。

## 任务清单（由 Tier1 三审 + Planner 逐轮生成，追加于文末）

> Reviewer 审计 → Planner 拍板后在下方按轮追加。每轮务必保持验收命令全绿、每子项独立可合并。

### 第 1 轮追加任务（S16 product-loop --tier1 on --mode all，指派切片 = 关系回路接通 S16-T1/T2/T3，零升档）

> 本轮承诺 = 把家园从「产好感却通往另一个 tab 才能消费」补成「家园产好感 → 家园当场消费 → 角色跟你说话」这条最短情感回路。**关键拍板**：据 Scout 接地校正三审"好感→void"前提——养成域已有好感里程碑（v14 `claimedBondMilestones`）+ 每日羁绊互动（v16 `lastBondInteractionDate`），本轮**复用不重造**、**零升档纯派生**；真缺口是"关系机制没搬进家园 + 缺情感/叙事层（无台词数据）"。**家具空间化 + 邻接加成走哪条轴的拍板留给第 3 轮**（Planner 倾向开新的非数值回报轴，不折进 comfort +20% 硬顶）。详见 `docs/orch/plan.md`。

- [x] **S16-T1｜好感里程碑在家园显形 + 领取（P0，最高杠杆）**
  - 目标：把养成域已有的好感里程碑（6 档）搬进家园入住/运营视野，让玩家在家园就能看到入住角色"好感达阈值、有里程碑可领"并一键领取（发放既有 KP + 称号 + 永久加成），闭合"家园产好感 → 家园消费好感"回路。
  - 验收：① 家园里能看到入住角色好感里程碑进度/可领状态（**可见性命门**：不显形=死数值反模式，不通过）；② 家园领取后奖励实际入账，已领状态与养成页同源一致（双向）；③ 领取走既有 `profile.earn`，不新拼货币口径；④ 零新增存档字段、SAVE_VERSION 不变；type-check/test/build 全绿。
- [x] **S16-T2｜广场角色 tap 互动 + 每日封顶（P0，与 T1 配套）**
  - 目标：家园广场漫步的入住角色可被"互动"——点击角色除现有驻足/详情外，每日给一次少量好感 + 一句情境反馈（台词见 T3），每日每角色封顶防刷（跨天重置）。把"纯装饰漫步"接入好感轴。
  - 验收：① 点击入住角色当日首次给好感增益 + 情境反馈可见，同日再点不重复发放（有"今日已互动"态）；② 跨天后可再互动；③ 好感增益温和克制（守挂机/互动不盖过主动收入基线，量级参照养成域每日互动）；④ 零新增存档字段、SAVE_VERSION 不变；涉及跨天/时序，test 连跑 3 次稳定全绿。
- [x] **S16-T3｜情境台词层（P0 情感内核，纯 config 零存档）**
  - 目标：建一个**纯 config 情境台词库**，为家园关系时刻（里程碑达成/领取、tap 互动、可选进家园问候）提供"角色对你说的话"，让 T1/T2 从"数值变化"变成"角色在跟你说话"。首版允许通用模板兜底（按里程碑档位/互动类型），不要求逐角色专属；缺台词回落通用模板不报错。
  - 验收：① 里程碑达成/领取时、tap 互动时能看到与情境匹配的台词（**可见性命门**：情感层必须在家园 UI 显形）；② 缺专属台词的情境有通用兜底不报错不空白；③ 台词库纯 config、零存档、**不携带任何数值效果**（台词改文本不影响奖励，守"名字≠行为"红线）；④ type-check/test/build 全绿。

### 第 2 轮追加任务（S16 product-loop --tier1 on --mode all，指派切片 = 关系深化：角色↔角色偶遇 + 入住决策关系权重 S16-T4/T5/T6，零升档）

> 本轮承诺 = 把第 1 轮闭合的「角色↔玩家」关系扩到「角色↔角色」——让命中同作品羁绊的两个入住角色在广场里**偶遇并对话**，并让「选谁入住」在决策点承载关系权重。**关键拍板**：三审罕见高度一致——第 1 轮 6 个入住角色彼此零交集、「谁和谁是一伙」（同作品羁绊）早已算好却只显示成 `+6%` 百分比；本轮把它变成广场里肉眼可见的偶遇对话（本产品 968 番真实数据差异化首个可见落点）。**偶遇一律纯展示、零好感、零升档、零数值效果**（三审一致强烈建议 + 红线）；**绝不为偶遇引入 CP 关系值/进度条新数值轴**（那会逼升 schema，本 sprint 唯一 bump 留第 3 轮家具坐标）。复用第 1 轮三块地基（漫步 walk 循环 / 台词库 `homesteadDialogues.ts` 的 `pickFrom` 范式 / `computeBondBonus` 的 `hits`），唯一实质工程增量 = 广场循环里一次 pet-to-pet 邻近检测。**叠 UI 前强烈建议先拆 `HomesteadView.vue`（已 1239 行）的漫步/偶遇场景层为 composable**（软约束）。详见 `docs/orch/plan.md`。

- [x] **S16-T4｜广场同作品偶遇对话（P0，本轮成败命门）**
  - 目标：让命中同作品羁绊的两个入住角色在广场漫步中偶发一次对话——两人短暂驻足面向对方 → A 冒一句 → 约 1.2s 后 B 错峰回一句 → 两人之间冒一个 ♡/✧ 小符号轻轻上浮消失 → 各自散开。把藏在右栏 chip 的 `+6%` 变成广场里肉眼可见、此刻正在发生的在场偶遇。**偶遇纯展示、零好感、零数值轴。**
  - 验收：① **可见性命门（第一条）**：广场里肉眼可见两同作品角色靠近时错峰弹出彼此对话气泡 + 中间上浮小符号，且视觉可分辨「双角色偶遇」与「单角色 tap 回应」（只在内存配对不冒气泡 = 死数值 = 白做）；② 只在同作品羁绊命中的角色对之间触发，缺专属对话回落通用偶遇池不报错不空白；③ 偶遇**纯展示、零好感、零数值效果**（守「名字≠行为」红线）；④ 零新增存档字段、SAVE_VERSION 不变、偶遇冷却纯内存态；⑤ 涉 tick/挂机时序，test 连跑 3 次稳定全绿，type-check/build 全绿。
- [x] **S16-T5｜广场气泡多角色并发模型（P0，T4 前置技术项）**
  - 目标：把当前单值 `petBubble` 升级为支持多角色同时/错峰冒泡的模型（按 petId 索引），让「两角色一来一回对话」技术上成立。必须完全兼容第 1 轮 tap 行为（单角色气泡 + 好感 +N 不回归）；所有气泡 setTimeout 一律登记 `dialogueTimers` + `onUnmounted` 清除。
  - 验收：① 两角色能同时/错峰各自冒气泡且互不顶掉（T4 依赖此能力）；② 第 1 轮 tap 单角色气泡 + 好感增益 + 每日封顶/跨天行为**无回归**；③ 所有气泡 setTimeout 登记 `dialogueTimers` 并 `onUnmounted` 清除、无泄漏；④ type-check/test/build 全绿。
- [x] **S16-T6｜入住决策的关系预告（P1，让切片闭环、对冲伪决策）**
  - 目标：在 `HomesteadManageModal` 把羁绊从「结果 chip（+6%）」升级为「关系预告」——选中/悬停组合命中同作品组时加一层情感语言「和 XX、YY 是《作品名》的同伴 · 住一起会在广场偶遇聊天」+ 高亮已入住同作品角色头像。**不改任何数值**（挂机大卡 +% 口径不变），复用现有 `bondHits`，只加「命中组→偶遇预告文案」翻译。与 T4 互为闭环（决策点预告 → 广场兑现）。
  - 验收：① **可见性命门**：入住决策处肉眼可见关系预告 + 同作品已入住头像高亮（关系权重必须在决策点可见，否则死数值）；② 预告不改任何数值、纯展示不驱动奖励；③ 无命中同作品组时不显示预告、不报错不空白；④ 零新增存档字段、SAVE_VERSION 不变；type-check/test/build 全绿。

### 第 3 轮追加任务（S16 product-loop --tier1 on --mode all，指派切片 = 家具空间化：已摆放家具进广场场景可见 S16-T7，零升档 · 零素材）

> 本轮承诺 = 把家园最贵的资产（16:9 可行走场景）第一次和家具系统缝起来——让**已摆放家具**（`placedIds`）从「右栏一行字」落地进广场场景的固定槽位，**用零素材 emoji/图标 + 名牌肉眼可见**「我买的家具摆在我的基地里」，补上三审首轮点名的「最致命审美断裂：场景是壁纸不是基地」。**两个关键拍板**（详见 `docs/orch/plan.md` + `docs/orch/negotiation.md`）：**① 回报轴 = 视觉可见的所有权本身（endowment / 陈列满足感）——不开数值、不折进 comfort +20% 硬顶、绝不新增进 `computeIdleYield` 的乘子；成套/主题房完成度评分留第 4 轮（7 件 + 零标签撑不起）**；**② 摆位模型 = 固定槽位零升档（坐标写死 config 常量，`placedIds` 决定摆哪几件、config 决定摆哪个位，`SAVE_VERSION` 保持 20，三处存档装配器不动）——自定义拖拽摆位留 backlog，不耗掉本 sprint 唯一 v21 bump（留第 4 轮陈列 UR / 偶遇去重）。** 全仓零家具美术 → 可见性唯一解 = emoji/CSS 图标，别依赖不存在的 png。家具是纯派生静态层（不进 rAF/tick），z-order 必须接进角色 y-sort（别做固定背景层）。复用第 2 轮抽出的 `usePlazaWalk.ts` 场景坐标系（`%` 坐标 + 脚点锚定 + `zIndex=按脚点 y` 同一公式）。**家具数值仍走既有 `sumFurnitureComfort → comfortBonusPct → computeIdleYield` 口径，本轮 `config/homestead.ts` 数值区零改。** 详见 `docs/orch/plan.md`。

- [x] **S16-T7｜已摆放家具进广场场景可见（P0，本轮成败命门）**
  - 目标：让已摆放的家具（`placedIds`）从「右栏一行字」落地到广场 16:9 场景的**固定槽位坐标**上，用**零素材 emoji/CSS 图标 + 名牌**渲染，肉眼可见「我买的家具摆在我的基地里」。摆放一件 → 它出现在场景对应槽位；收纳一件 → 它从场景消失。把家具系统与家园最贵的资产（可行走场景）第一次缝起来，补上「场景是壁纸不是基地」的审美断裂。**回报轴 = 视觉可见的所有权本身，不开数值、不折 comfort、不碰 computeIdleYield；固定槽位零升档。**
  - 验收：① **可见性命门（第一条）**：广场场景里肉眼可见已摆放的每件家具以 emoji/图标 + 名牌出现在其固定槽位，**摆放一件即时出现、收纳即时消失**（场景里即时反映摆放状态）——只在右栏显示、场景看不见 = 白做；② 家具与漫步角色**按深度正确互相遮挡**（接进角色同一 y-sort、非固定背景层），家具不落水池/悬崖、不严重挡角色主漫步区；③ 家具卡/名牌用 **surface 卡片非白字压图**（语义令牌，短名压底图可沿用 `pet-name` 的 `#fff` 例外），无未定义令牌/动态拼色类/反斜杠透明度；④ **零素材**（不引入家具 png/远程图）、**零升档**（`SAVE_VERSION`=20，`schema.ts`/`migrations.ts`/`stores/persistence.ts` 未触碰）、**零数值改**（`config/homestead.ts` comfort/cost/`computeIdleYield`/`sumFurnitureComfort`/`canonicalizeFurnitureIds` 口径不变，`HomesteadView` 的 comfort 汇入行未动）；⑤ 家具是纯派生静态层、**不进 rAF/tick**（不给家具加定时器/动画循环），`usePlazaWalk` 的 rAF 循环未因家具改动；⑥ 建议补特征测试：`FURNITURE_CATALOG` 每件都有对应槽位坐标 + 图标、坐标在 `[0,100]`；⑦ `type-check`/`test`/`build` 全绿，`test` 连跑 3 次稳定。
- [x] **S16-T8｜陈列计数轻显形（可选加分项，非硬验收，纯派生零持久化）**
  - 目标：若 Generator 有工程余量，给场景/右栏加一个**纯派生、无持久化、无奖励**的「陈列 X/7」计数 chip（派生自 `placedIds.length`），给「摆家具」一点轻量陈列成就感——只显数字，不发奖、不记已领、不触发任何数值。**本项非本轮成败命门，可完全不做**（research 倾向连这都不做、只做可见）。
  - 验收（仅当实现时适用）：① 若实现：显示「陈列 X/7」类纯派生计数，X 随摆放/收纳即时变化，**零新增存档字段、`SAVE_VERSION` 不变、不复用 `claimedMilestones`、不发任何奖励、文案不携带数值效果**（守「名字≠行为」红线）；② 不做「主题房/成套完成度评分系统」（留第 4 轮）；③ 若不实现：不算缺陷。

### 第 4 轮追加任务（S16 product-loop --tier1 on --mode all，指派切片 = 收藏陈列 + 回访新鲜 S16-T9/T10，零升档 · 零素材）

> 本轮承诺 = 站在第 3 轮「家具进场景」的场景能力之上，把家园升级成**抽卡战果橱窗**（收藏在家园显形）+ 给一个**「明天为什么回来」的软钩子**（date-seeded 今日特殊角色）。补两块结构性缺口：家园和玩家最大的资产（收藏）零咬合、家园每天打开一模一样。**★ 本轮唯一升档拍板：维持零升档、不动用 sprint 唯一 v21 bump**——两大支柱（收藏陈列 UR 橱窗 + 完成度 chip 纯派生自 `codex.characterCompletion`/`collection`；date-seeded 今日特殊角色 `todayKey+placedCharacterIds→mulberry32`）全部纯派生 / date-seeded，`SAVE_VERSION` 保持 20、三处存档装配器一字不动。唯一真需 v21 的候选「偶遇图鉴去重」三审一致判定价值低于两大支柱、留 backlog，不耗掉唯一 bump（Scout C-2 伪需求陷阱）。**★★ 本轮唯一实现级硬约束：今日特殊角色「双倍好感」——既有 `dailyBondInteraction` 给不了双倍（好感增量写死常量无参数 + `lastBondInteractionDate` 硬锁一次/天，Scout A0-红格/C-1 三审集体漏算），本轮采纳 Scout 选项 B 收窄为纯情感**（今日显式标识 + 今日专属台词、tap 走原样标准好感），零碰 `nurture.ts`、零升档、零测试风险；绝不做「气泡显 +40 实发 20」（踩名字≠行为红线）。收藏陈列**只读** `codex.characterCompletion`、**绝不碰** `codex.claim`/`claimedMilestones`（领取制混用 = 发奖 + 升 schema 面 + 撞「展示墙非待办地狱」）；0 UR 玩家必须优雅空态（引导 / 降级墙，绝不空墙 / 缺口条）。今日标识 / 陈列 / 季节都是**纯 view 层派生叠加**，`usePlazaWalk` 的 rAF / 偶遇 / Pet 接口本轮一字不动。复用第 1 轮台词库范式（`pickTapDialogue`）、第 3 轮场景坐标系 + chip 范式、`CharacterAvatar` 现成头像组件、`mulberry32` engine 纯函数。详见 `docs/orch/plan.md` + `docs/orch/negotiation.md`。

- [x] **S16-T9｜收藏陈列：家园作抽卡战果橱窗（P0，本轮成败命门之一）**
  - 目标：把玩家最大的资产（收藏）在家园**肉眼显形成橱窗**——展示「已拥有的 UR 角色的脸」（头像墙）+ 一个纯派生收藏完成度 chip（如「UR 12/48 · 图鉴 63%」）。抽到一张新 UR → 它即时出现在橱窗；完成度随收藏即时变化。把家园从「看不到自己收藏的 hub」升级成「这些角色都是我的」的抽卡战果橱窗（endowment / 陈列满足感）。**纯派生自 `codex.characterCompletion` + `collection`，零升档。**
  - 验收：① **可见性命门（第一条）**：家园里肉眼可见已拥有的 UR 角色头像 / 陈列（形态 B/C）**或**至少一个纯派生完成度 chip（形态 A），**抽到 / 新增一张 UR 后陈列 / 完成度即时反映**（`collection` 响应式，非一次性快照）——收藏只在图鉴 tab 显示、家园看不见 = 白做；② **空态优雅（命门级）**：0 UR 玩家看到引导态「抽到第一张 UR 会陈列在这里」**或**降级到已拥有的最高稀有度墙，**绝不空墙 / 绝不「UR 0/318」缺口进度条**，0 入住 / 0 收藏不报错；③ **纯派生零持久化零奖励零领取制**：只读 `codex.characterCompletion` + `collection`，**零新增存档字段、`SAVE_VERSION`=20、绝不触发 `codex.claim`、绝不 push `claimedMilestones`、绝不复用领取制、不发任何奖励**，文案正着念「拥有 X」不念「还差 Y」（反 completionist / 名字≠行为红线）；④ 陈列卡 / 名牌用 **surface 卡片非白字压图**（语义令牌），稀有度识别色用完整字面映射，无未定义令牌 / 动态拼色类 / 反斜杠透明度；⑤ **复用不重造**（完成度读现成 `codex.characterCompletion`、头像用现成 `CharacterAvatar`、chip 抄第 3 轮 `display-count-chip` 范式，未造第二套遍历 / 组件）；⑥ 建议补特征测试（UR-owned computed 在有 UR / 0 UR 降级 / 0 收藏三态正确，完成度总数用 `.length` 非硬编码）；⑦ `type-check`/`test`/`build` 全绿，`test` 连跑 3 次稳定。
- [x] **S16-T10｜回访新鲜：date-seeded 今日特殊角色（P0，本轮成败命门之一）**
  - 目标：给家园一个「明天为什么回来」的软钩子——**每天由 date-seeded 派生选出一个入住角色作「今日特殊角色」**（今天心情特别好），在广场给它**显式标识**（徽章 / 淡光晕）+ tap 它说一句**今日专属台词**。同一天恒定、次日自动换人、零存储。让家园从「每天打开一模一样」变成「今天是谁心情好 + 它对我说了句特别的话」。**date-seeded 纯派生（`todayKey+placedCharacterIds→mulberry32`），零升档；回访主菜=纯情感，不做双倍好感（tap 走原样标准好感）。**
  - 验收：① **可见性命门（第一条）**：广场里肉眼可见今日特殊角色的**显式标识**（徽章 / 光晕，与普通入住角色可分辨）+ tap 它时说**今日专属台词**（与普通 tap 台词可分辨）——无标识 / 台词与平时一样 = 白做；② **date-seeded 确定性**：同一天 + 同入住名单 → 今日特殊角色恒定（同 seed 同结果）、跨天 → 自动换人，这两条有特征测试锁死，**零字段进存档、`SAVE_VERSION`=20**；③ **回访主菜=纯情感、tap 走原样口径**：今日特殊角色 tap 拿标准好感（走原样 `dailyBondInteraction`、与普通角色同 20、共用同一 `lastBondInteractionDate` 每日封顶），**未新造奖励口径、未碰 `nurture.ts`、未做「双倍」数值**（守合同「回访是惊喜非债务」+ 双倍收窄，见 plan ★★★ 拍板）；④ **空态优雅**：0 入住 → 今日特殊 null、标识 / 特殊台词分支不显示不报错；⑤ **纯 view 层叠加、零改 composable**：`usePlazaWalk` 的 rAF / 偶遇 / Pet 接口未因今日特殊角色改动（今日标识是模板 `:class` 叠加、今日台词是 view 层 `onPetTap` 展示分支），今日光晕若有动画走 CSS `@keyframes` 不进 rAF；⑥ 台词纯 config、零存档、**不携带数值效果**（改台词文本不影响任何发放），缺专属今日特殊台词回落通用池不报错不空白；⑦ `type-check`/`test`/`build` 全绿，`test` 连跑 3 次稳定（涉跨天 / date-seed）。
- [x] **S16-T11｜季节性场景微调（可选加分项，非硬验收，纯派生零素材 CSS 浮层）**
  - 目标：若 Generator 有工程余量，给广场场景加一层**随真实日期派生的季节氛围**（今天 2026-07 盛夏 → 🌻/☀️ 浮层；可预留秋 🍂/冬 ❄️/春 🌸），给回访新鲜一点长期常驻的季节回响。**本项非本轮成败命门，可完全不做**（回访新鲜命门由 S16-T10 达成）。
  - 验收（仅当实现时适用）：① 若实现：广场有随真实月份派生的季节氛围浮层（当前盛夏可见），**零新增存档字段、`SAVE_VERSION`=20**；② 季节浮层 `pointer-events:none`、**不盖偶遇气泡 / 偶遇符号 / 角色脸**（z-index 合规，垫底则 z 介于 0-200），**粒子纯 CSS `@keyframes` 不进 rAF**（`usePlazaWalk` rAF 未因季节改动），别一次铺满四季（首版当前季 + 可预留 1-2 显著季）；③ 若不实现：不算缺陷。

### 第 5 轮追加任务（收官）（S16 product-loop --tier1 on --mode all，指派切片 = 打磨 + 晒图 + 收尾 S16-T12/T13/T14/T15，零升档 · 零素材）

> **本轮 = 5 轮弧线收官轮。** 前 4 轮把「关系/偶遇/家具/陈列/回访」做齐，三审罕见全盘一致（product 8.3、evolution 8.3、research 收官逻辑闭环无裂缝）：本轮只需两把刀 + 一次收尾——**刀一（打磨）** 把情感高点擦亮：领 bond_6「命运」（4000 好感巅峰）和领 bond_1「初识」现在**反馈一模一样**（都走同一个 `.bond-float` 淡绿飘字），巅峰时刻被做平了（Yu-kai Chou win-state 框架点名的「同音量庆祝一切 → desensitize」反模式）；正解 = **分级音量**（低档 High-Five 轻飘字 / 高档 Crowning 隆重弹层），纯 CSS 零数值。**刀二（晒图）** 给家园一张对外的脸：把攒了 5 轮的一切（基地/入住真实番剧角色/陈列/家具/羁绊/今日特殊）聚合成一张**纯前端 Canvas「基地身份卡」**（安全异步晒图，仿 ACNH 梦境门牌冻结快照），系统分享/下载 PNG——长留存外化出口 + 968 番护城河社交传播首块砖。**收尾** = 清两个 pre-existing dead computed + 一个显式 Sprint 收官核对任务。**★ 三个拍板：① 先庆祝（T12）后晒图（T13），两者独立、都做实；② 晒图主标题走 `profile.currentUser`「XX 的家园」——`stores/homestead.ts` 无基地名字段（Scout 核实），绝不为装饰字段升 v21；③ Crowning 锚定 bond_4/5/6 = 高档（有 `statBonusPct` 0.02/0.03 分层 + reward 200→400 跳变数据支撑）。★ 升档拍板：本轮天然零升档（打磨=纯动效、晒图=只读快照聚合）、`SAVE_VERSION`=20 不变、三处存档装配器一字不动——sprint 唯一 v21 bump 五轮全程未消耗，是刻意的健康纪律，留 backlog（给未来「自定义家具摆位」F1）。★ 晒图硬约束（pitfalls 明令）：纯 Canvas `toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`、**别引 html2canvas**、**首版绝不 `drawImage` 远程角色/封面图**（跨域 taint → `toBlob` 抛 `SecurityError`，角色脸用 emoji/首字/色块自绘）、**聚合抽纯函数**仿 `buildWrappedStats.ts`（零 Vue/Pinia/DOM 便于单测）、**只读快照**（零 claim/earn/spend）、**晒身份不晒缺口**（正着念「陈列 5/7」绝不「还差 260」）、**安全异步绝不联机**（绝不开上传/排行榜/后端、绝不「分享得奖励」dark pattern）、**空态优雅**（0 入住/空基地愿景文案软化、聚合容错不 NaN、特征测试锁死）。复用现成三件套 `ShareCard.vue`+`shareImage.ts`+`buildWrappedStats.ts` + `CharacterAvatar`（仅屏幕预览用真图、Canvas 导出用文字）；庆祝复用 `.settle-pop` 弹窗范式 + `dialogueTimers` 清除范式。详见 `docs/orch/plan.md` + `docs/orch/negotiation.md`。

- [x] **S16-T12｜里程碑庆祝按档位分级：High-Five / Crowning（P0，本轮命门之一）**
  - 目标：把里程碑领取反馈从「所有档一个模板」升级成**分级音量**——低档（bond_1/2/3）保持现有轻飘字（High-Five，克制），高档（bond_4/5/6）升级为**居中/半屏隆重庆祝弹层**（Crowning：大号称号加冕「XX 达成」+ 角色名 + 角色的脸 + 光效 + 略长停留/点击关闭），bond_6「命运」可再加最隆重一档。让「领命运」和「领初识」**肉眼可辨隆重度差异**，把玩家最大的关系投入隆重化。**纯 CSS 动效、零数值、零存档、零升档。**
  - 验收：① **可见性命门（第一条）**：领 bond_6「命运」（或任一 bond_4/5/6 高档）与领 bond_1「初识」（或任一 bond_1/2/3 低档）**反馈肉眼可分辨**（高档 Crowning 隆重弹层 + 称号加冕 + 角色脸 + 光效 + 更长停留、低档 High-Five 轻飘字）——领命运和领初识反馈一样 = 白做；② **分级不是统一动效**（research 深挖① 唯一危险读法）：给 6 档全加同款彩带只是「都很轻→都很响」仍 desensitize，必须低档轻/高档隆重；分级判据锚定 bond_4/5/6=Crowning（建议抽纯函数 `milestoneCelebrationTier(id)` 便于特征测试锁分级判据）；③ **纯展示零数值零发奖**：`claimBondMilestone` 发放逻辑一字未碰、庆祝仅是发放成功后视觉分支、不携带数值/不发奖/不改奖励（审 diff 确认庆祝分支无 `spend/earn/claim` 新调用），守「名字≠行为」红线；④ **定时器登记清除 + 不进 rAF**：Crowning 弹层若用 setTimeout 自动关闭须登记 `dialogueTimers` + `onUnmounted` 清除无泄漏，动效走 CSS `@keyframes`，`usePlazaWalk` 的 rAF 未因庆祝改动；⑤ **连领不叠弹**：多个高档同时可领时（`claimableBondCount`>1）Crowning 一次只弹一个（不叠层打断，首版「一次弹一个 + 需手动关」即可）；⑥ 颜色令牌零违规（庆祝弹层走 `rgb(var(--c-*))`/`--c-highlight`/`--c-accent`，无 `text-white` 压浅底/动态拼色类/未定义令牌/反斜杠透明度）；⑦ `type-check`/`test`/`build` 全绿，`test` 连跑 3 次稳定。
- [x] **S16-T13｜家园快照晒图：一键出「基地身份卡」（P0，本轮命门之一）**
  - 目标：给家园一个**对外的脸**——加「晒图/分享基地」入口，点击把家园状态聚合成一张**纯前端 Canvas 绘制的暖色「基地身份卡」**（主标题「XX 的家园」走 `profile.currentUser` + 入住真实番剧角色名 + 陈列完成度正着念 + 家具数 + 命中羁绊作品名 + 今日特殊角色 + 舒适度等本地可得数据），系统分享面板/下载 PNG 出图。把 5 轮攒下的一切从「我看得见」推到「给人看」，成为长留存外化出口 + 968 番护城河社交传播首块砖。**纯前端只读快照聚合、零升档、零 cross-origin 风险。**
  - 验收：① **可见性命门（第一条）**：家园有「晒图/分享基地」入口，点击**生成一张纯本地数据的暖色基地身份卡**（「XX 的家园」+ 入住真实番剧角色名 + 陈列/家具/羁绊命中/今日特殊），可**系统分享或下载 PNG 成功**，**968 番差异化务必显形**（入住角色名 + 羁绊作品名 = 社交货币）——点了没图/图里看不到家园身份 = 白做；② **零 cross-origin taint**：Canvas 零 `drawImage` 远程图（角色用 emoji/首字/色块自绘），`toBlob` 不抛 `SecurityError`，未引 html2canvas；③ **晒身份不晒缺口**：正着念「陈列 X/7」「入住 N」「拥有 UR X/N」「《XX》羁绊命中」，**绝无**「还差 Y」「UR 0/N」「完成度 13%」缺口/焦虑指标（反 completionist）；④ **空态优雅（命门级）**：0 入住/0 收藏/空基地 → `buildHomesteadSnapshot` 不崩/不 NaN/不 undefined，空基地愿景文案软化不显缺口条/不晒羞辱空卡，特征测试锁死空态；⑤ **纯派生只读零升档零奖励零联机**：只读现成派生源（`profile`/`homestead.placedCharacterIds`/`codex.characterCompletion`/`collection`/`furnitureStore.placedIds`/`hourlyYield.bondHits`/`todaySpecialId`），**零新增存档字段、`SAVE_VERSION`=20、`schema.ts`/`migrations.ts`/`stores/persistence.ts` 未触碰、零 claim/earn/spend、绝不「分享得奖励」、绝不联机/上传/排行榜后端**（审 diff 确认）；⑥ **聚合抽纯函数 + 薄接入**：`buildHomesteadSnapshot.ts` 零 Vue/Pinia/DOM（仿 `buildWrappedStats.ts`）+ `.test.ts` 特征测试（满配/0 入住/0 收藏三态 + 正着念计数），Canvas 绘制在独立 `HomesteadShareCard.vue`、**未把绘制代码堆进已 1366 行的 HomesteadView**；⑦ **复用不重造**（IO 复用 `shareImage.ts` 的 `canvasToPngBlob`/`shareOrDownloadImage`、聚合仿 `buildWrappedStats.ts`、手绘仿 `ShareCard.vue`、弹窗挂载仿 `CollectionsView.vue`，未造第二套晒图基建）；⑧ `type-check`/`test`/`build` 全绿，`test` 连跑 3 次稳定。
- [x] **S16-T14｜Sprint 收官核对（P0 收官任务，本轮必做）**
  - 目标：本轮是 S16 收官轮，落完打磨/晒图后做一次显式的全 Sprint 收官核对——确认全部任务勾选与实现一致、S14/S15 既有机制无回归、验收命令全绿、零升档。这是收官轮独有的、把 5 轮成果封存的核对任务。
  - 验收：① **勾选一致**：`docs/plans/SPRINT.md` 的 S16-T1..T11 全 `[x]`（已核实、`grep "\[ \].*S16-T"` 主线零命中）+ 本轮 S16-T12/T13（+T15 若做）全 `[x]` 且与实现一致（打磨分级肉眼可辨/晒图肉眼可出图，非仅内存态）——**注意** `docs/SPRINT.md`（非 `docs/plans/SPRINT.md`）里的 `[ ]` 是 S11/S12 未来路线图残留、**非 S16 项勿误判**；② **S14/S15 + 1-4 轮机制无回归**（亲验 diff/读码）：computeIdleYield 单 seam（预览=结算）/ facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 y-sort / 羁绊 bondHits 同源 / pity v20 / 墙钟回拨钳位 / setTimeout·rAF 全登记清除 / 收藏橱窗+今日特殊+季节 均在；③ **零升档**：`schema.ts:57 SAVE_VERSION`=20 不变、`infra/persistence/{schema,migrations}.ts`+`stores/persistence.ts` 本轮 diff 全空、sprint 唯一 v21 bump 五轮全程未消耗留 backlog；④ **5 命令全绿**：type-check 0 错 / test 连跑 3 次稳定全绿（基线 991，加晒图纯函数测试后应升）/ build 成功 / 后端安全 exit 0 全 PASS / `debug=True` 零命中。
- [x] **S16-T15｜收尾清债 + 可选微打磨（收尾必做「清 dead computed」+ 可选加分）**
  - 目标：清两个 pre-existing dead computed（收尾必做，合同 C 明列）+ 若有工程余量做几处纯 CSS 微打磨（可选加分，非硬验收）。
  - 验收：① **【必做】清 dead computed**：删 `HomesteadView.vue:377` `effectText` + `:379` `comfortBonusText`（两个 top-level computed，模板零引用，已核实模板只用 `row.effectText`（residentRows 内部字段）+ `comfortPctText(homeEffect.comfort)`）；⚠️ **别误删 `residentRows` 里的 `effectText: formatHomeEffect(...)`**（那是模板 `row.effectText` 的真实数据源，删了炸入住名单效果显示）——只删 377/379 两行 top-level；`type-check`/`test`/`build` 全绿、入住名单效果显示无回归；② **【可选加分，有余量才做，非硬验收】**收取瞬间到手反馈（`g-cta-gold` 成功态脉冲 +「+X KP」小飘字，纯 CSS 零数值改）/ 新 UR 入橱窗高光（`showcaseCards` 最新那张入场描边脉冲）/ 偶遇符号·气泡缓动微抛光（别破 `usePlazaWalk` rAF/偶遇符号 z 分层）/ 禁用态正向提示（「再攒 X KP 可购」正向文案非焦虑条）——一律纯 CSS/派生、零数值、零存档、颜色令牌合规；③ 若不做可选项：不算缺陷。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿；涉及时序/挂机的改动要求连跑 3 次无偶发失败）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S16 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS，涉及挂机时序的改动 test 连跑 3 次稳定全绿），命令 5 零命中，且当轮承诺的任务全部 `[x]` 并与实现一致。

---
