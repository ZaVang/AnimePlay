# Negotiation — Iteration 5（S16 家园 hub 收官 · 打磨 + 晒图 + 收尾）

> 轮次：product-loop --tier1 on --mode all，第 5 轮（**5 轮弧线收官轮**），指派切片 = **打磨（情感高点）+ 晒图（展示出口）+ 收尾**。
> 三份审计报告：product-audit（体验官，8.3/10）/ evolution-audit（进化策略师，8.3/10）/ research-audit（研究员，收官逻辑闭环无裂缝）——本轮均为**收官 re-audit**（整体体验回顾 + 全面抓回归 + 聚焦第 5 轮可落地建议）。叠加第 4 轮 eval 反馈（COMPLETE，无阻断，991 测试基线）+ 前四轮 negotiation 已收敛的排期与零升档纪律。
> 回应格式：接受 / 部分接受 / 拒绝 + 理由 + 本轮行动。超范围一律标 backlog 或排期到后续 sprint。
> **本轮定盘星**：5 轮弧线走到「打磨 + 展示出口 + 收口」收官段。前四站已做「角色对你说话 / 角色对彼此说话 / 你的东西出现在你家里 / 你抽到的角色陈列在你家 + 明天不一样」，本轮补两块：① 家园里最重的情感时刻被做平了（领命运=领初识）；② 家园攒了 5 轮的一切只有自己看得见（零展示出口）。两块全部纯前端 · 零数值 · 零升档 · 零素材。

---

## ★ 总纲：三审 + Scout 罕见全盘一致（打磨做分级不做统一动效、晒图晒身份不晒缺口、安全异步不联机、克隆现成范式、全零升档）

本轮不是开放式审议——三份收官审计的诊断、前四轮 negotiation 的零升档纪律、Scout 三段代码接地**罕见地全盘一致**，收敛到一句话：**本轮 = 把最重的情感时刻放大成配得上它的隆重（打磨=分级庆祝）+ 给攒了 5 轮的家园一个能拿出门的样子（晒图=基地身份卡），再干净收口，两块全部纯前端展示 · 零数值 · 零升档。** 论据一致：

- **打磨填的是「情感巅峰被做平」的结构性债**：领 bond_6「命运」（4000 好感 / 1500 KP，全游戏一个角色关系的绝对巅峰）和领 bond_1「初识」（100 好感）**反馈一模一样**（`onClaimBondMilestone` 无论哪档都弹同一个 `.bond-float` 淡绿飘字，仅台词文本不同）。三审代码级复核一致确认。研究员援引 Yu-kai Chou win-state 框架的决定性警告：「用同一音量庆祝一切，会让大小成就都失去情感落点」——正解是**分级音量**（低档 High-Five / 高档 Crowning），不是给所有档加同款动效。
- **晒图填的是「零展示出口」的结构性缺口**：家园攒了真实追番角色橱窗 + 家具 + 羁绊 + 今日特殊，却零对外出口。这是留存漏斗「进来 → 待着 → **出去传播**」的最后一段，也是把 968 番护城河从「我看得见」推到「给人看」的第一块砖（ACNH 梦境门牌是同品类留存神器的证明）。
- **两块全站在已有资产上、零升档**（Scout A0/A2 + evolution/research 一致核实）：项目已有一套成熟 Canvas 晒图三件套（`ShareCard.vue` 手绘范式 + `shareImage.ts` IO 层含系统分享/下载回落/AbortError + `buildWrappedStats.ts` 纯聚合 + 测试范式），逐条满足合同晒图硬约束；庆祝复用 `.settle-pop` 弹窗范式 + `CharacterAvatar` + `dialogueTimers` 清除范式。唯一实质增量 = 一个新纯函数 + 一个新组件 + 一个入口 + 一个庆祝视觉分支。
- **三方一致划红线**：打磨做分级不做统一动效（否则「都很轻→都很响」仍 desensitize）、晒图晒身份不晒缺口（正着念「陈列 5/7」绝不「还差 260」，反 completionist）、安全异步绝不联机（Canvas 出 PNG 自行发，绝不开上传/排行榜/后端，绝不「分享得奖励」dark pattern）、首版绝不嵌远程角色图（cross-origin taint → `toBlob` 抛错）、零升档（打磨/晒图天然无存档需求，唯一 v21 bump 五轮全未消耗留 backlog）、Crowning 定时器登记清除。

**决策**：三审核心方向 + Scout 落点接地**全盘采纳**，落为 **S16-T12（里程碑庆祝分级，命门之一）** + **S16-T13（家园快照晒图，命门之一）** + **S16-T14（Sprint 收官核对，收官必做）** + **S16-T15（收尾清 dead computed + 可选微打磨）**。以下逐条回应各报告 + 三个拍板点。

---

## ★★ 拍板点一：优先级顺序（两把刀都做实，仅定推荐落地次序）

两份审计对「谁第一」排序相反：product（R1 庆祝 → R2 晒图）；evolution（R1 晒图 → R2 庆祝）；research 并列。

### 拍板｜**先做庆祝分级（T12）再做晒图（T13）；两者互相独立、可分别合并、都必须做实**

- **理由**：Scout A1 明确——庆祝分级工程量更轻（改 1 函数 + 加 CSS + 可选 1 纯函数）、风险更低、情感 ROI 最高（product 排序）；晒图工程量更大（新纯函数 + 新组件 + 新测试）。先落低风险高 ROI 的庆祝、再落工程量大的晒图，若单轮吃不下也已各自独立可合并。**但两者都是本轮命门、都必须做实**——顺序只是推荐次序，不影响验收（两块任一没做实 = 收官轮未达成）。

---

## ★★★ 拍板点二：晒图主标题走 `profile.currentUser`「XX 的家园」，绝不为「基地名」升 v21（三审前提被 Scout 证伪）

**关键代码现实校正**：三份审计都假设晒图卡放「基地名（baseName）」，但 **Scout A3/C-1 代码核实：`stores/homestead.ts` 只有 `placedCharacterIds` + `lastSettleAt` 两个字段，无任何基地名概念**（grep「基地名/baseName/homesteadName」在 store/schema 零命中）。这是三审集体照抄「基地名」措辞、未读 store 源码的前提错误。

### 拍板｜**晒图卡主标题走 `profile.currentUser`「XX 的家园」（现成、零改、零升档），绝不新增可编辑基地名字段**

- **为什么走 `currentUser`**：现成、零改、零升档，「XX 的家园」是干净的归属核心。
- **为什么绝不新增基地名字段**：新增可编辑基地名 → 逼升 schema v21（消耗 sprint 唯一 bump 于一个纯装饰字段，三审都没主张）。**sprint 唯一 v21 bump 五轮全程未消耗，是刻意的健康纪律**（evolution/research 明确表态「留给未来自定义家具摆位 F1 这类坐标非持久化不可的功能」），绝不为装饰字段破功。
- **升档逃生门**：若 Generator 认为需要基地名字段，须回报 Planner 权衡，不得擅自升档。

---

## ★★★★ 拍板点三：Crowning 分级判据锚定 bond_4/5/6 = 高档（消解审计间分歧）

审计间对 Crowning 档位边界有轻微分歧：evolution 说「bond_5/6，可含 bond_4」；research/Scout 说「bond_4/5/6」。Planner 拍板锚定一个**可测**边界，避免 Generator 摇摆。

### 拍板｜**bond_1/2/3 = 低档 High-Five（保持轻飘字）；bond_4/5/6 = 高档 Crowning（隆重弹层）；bond_6 可再加最隆重一档**

- **判据有代码支撑**：`config/nurture.ts:112-119` 的 `BOND_MILESTONES` 本身在 `statBonusPct` 上就是 0.02（bond_1/2/3）vs 0.03（bond_4/5/6）两档分层，reward 也在 bond_3→bond_4 从 200 跳到 400——**bond_4 是数值分层的天然分界**，Crowning 从 bond_4 起有数据支撑。
- **建议抽纯函数 `milestoneCelebrationTier(id)`** 便于特征测试锁分级判据（非硬性，Generator 也可内联；research/Scout 都主张抽出便于测试）。
- **bond_6 最隆重**：全游戏关系顶点，可在 Crowning 基础上再加一档，隆重度肉眼可辨即达标。

---

## 一、对 product-audit（体验官，8.3/10）的逐条回应

### R1 里程碑庆祝按档位分级（🔴 本轮最高 ROI，情感高点打磨）
- **决策**：接受（本轮命门之一）。
- **理由**：体验官代码级确认——领 bond_6 和领 bond_1 反馈一模一样（都走 `.bond-float` 淡绿飘字），巅峰被做平，「把烟花做成了火柴」。这是数值对（BOND_MILESTONES 50→1500 30 倍差）但呈现被压成直线的问题，纯前端动效可解、零风险高回报。
- **本轮行动**：**S16-T12**。低档保持轻飘字、高档升级 Crowning 隆重弹层、bond_6 最隆重；分级判据锚定 bond_4/5/6（拍板三）。

### R2 家园快照/一键晒图（🟡 长留存外化出口）
- **决策**：接受（本轮命门之一，升级为 🔴）。
- **理由**：体验官指出家园缺「对外的一张脸」，web 研究（社会认同/炫耀投入/badge of honor）驱动玩家晒收藏；直接照抄现成 `ShareCard.vue`+`shareImage.ts` 范式、零 html2canvas、零远程图 taint、聚合抽纯函数。
- **本轮行动**：**S16-T13**。暖色基地身份卡、复用现成三件套、晒身份不晒缺口、安全异步不联机、首版不嵌远程图；入口建议放橱窗卡头（顺带抬升橱窗存在感）。

### R3 收取瞬间到手反馈 / R4 新 UR 入橱窗高光（🟡 打磨）
- **决策**：接受为**可选加分**（非硬验收）。
- **理由**：收取是最高频主动动作缺即时反馈（`runSettle` 不够弹窗阈值时只加一行日志）；新 UR 橱窗高光把「冷 chip」推向「战果墙」。都是纯 CSS 锦上添花，非命门。
- **本轮行动**：**S16-T15** 可选加分（有余量才做，纯 CSS 零数值改）。R4 若 R1/R2 吃满预算可降级。

### R5 清 dead computed / R6 Sprint 收官核对（🟢 收尾）
- **决策**：接受（R5 收尾必做 / R6 收官必做）。
- **本轮行动**：R5 → **S16-T15** 必做项（删 377/379 两行，别误删 residentRows.effectText）；R6 → **S16-T14** 显式收官核对任务。

### R7 今日寄语上分享图 / 偶遇符号微打磨（💡 想象力增强）
- **决策**：部分接受——今日寄语外化到晒图卡融入 T13 调性（date-seeded 每天生成的图不同 = 传播钩子）；偶遇符号微打磨落 T15 可选加分。
- **本轮行动**：T13 卡面可加一句今日特殊角色寄语；偶遇微抛光 → T15 可选。

### 右栏密度已临界（🟡 跨轮反复提醒）/ 场景左半场偏空（审美债）
- **决策**：接受为**本轮实现约束**（右栏别再堆）；场景左半场留白本轮不碰（晒图外化补偿）。
- **本轮行动**：晒图入口是轻量按钮（放橱窗卡头不加密度）；庆祝是弹层（不占右栏）。

---

## 二、对 evolution-audit（进化策略师，8.3/10）的逐条回应

### R1 晒图/家园快照分享图（🔴 结构性命门 + 长留存外化出口）
- **决策**：接受（本轮命门之一）。
- **理由**：进化视角——晒图是留存曲线从「我为自己玩」跃迁到「我玩给别人看/因别人看而更投入」的关键一跃，是收集+家园品类长留存的天花板动作；把 4 轮 endowment 从「我看得见」推到「给人看」。现成三件套复用 = 极低工程成本 + 已验证规避 cross-origin taint。
- **本轮行动**：**S16-T13**。复用现成三件套、聚合抽 `buildHomesteadSnapshot.ts` 纯函数、薄接入独立组件。

### R2 高档里程碑隆重庆祝（🔴 最高杠杆情感打磨债）
- **决策**：接受（本轮命门之一）。
- **理由**：进化代码级确认——`onClaimBondMilestone` bond_1..bond_6 同反馈（Phase 1.3 表格逐档确认），gacha 品类用 fanfare 分层做「投入越大越隆重」（普通一道光 / UR 整段过场 + 音乐）。
- **本轮行动**：**S16-T12**。分级 fanfare（低档保持 / 高档隆重）、庆祝纯展示零数值、Crowning setTimeout 登记 `dialogueTimers` 或走 CSS `@keyframes`。

### R3 遗留体验债收口 + Sprint 收官核对（🟡 收尾）
- **决策**：接受。
- **本轮行动**：清 dead computed → **S16-T15** 必做；收官核对（S16-T1..T11 全 `[x]` + S14/S15 33+ 机制无回归 + SAVE_VERSION=20 + test 连跑 3 次）→ **S16-T14**。

### ★ 升档拍板（收官轮明确表态：零升档、SAVE_VERSION 保持 20）
- **决策**：接受为**本轮升档拍板**。
- **理由**：进化明确——晒图是只读快照聚合（全现成派生源）、庆祝是纯动效，天然零存档需求；sprint 唯一 v21 bump 五轮全程未消耗是刻意健康纪律（「能派生的一律派生」），收官轮不该为晒图/打磨破功，留给未来「自定义家具摆位」F1。
- **本轮行动**：内化为全轮升档拍板 + T13/T14 验收「三处装配器 diff 全空、SAVE_VERSION=20」。

### Technical Health：HomesteadView 已 1366 行（🟡 收官软约束）
- **决策**：接受为**本轮收官软约束**。
- **理由**：进化指出 HomesteadView 是全仓最大单文件之一（超 CLAUDE.md 200-300 行目标 4-5 倍），5 轮累积接近可维护性拐点；收官两个新增应「薄接入」。
- **本轮行动**：晒图逻辑走独立 `buildHomesteadSnapshot.ts`（纯函数）+ 独立 `HomesteadShareCard.vue`（Canvas 绘制在组件里），view 只加入口按钮 + 弹窗开关；庆祝 fanfare 若复杂也建议抽独立组件。**别把 Canvas 绘制代码堆进 HomesteadView。**

### R4 收取微反馈 / R5 偶遇微抛光 / R6 家具名牌 hover 才显（🟢 nice-to-have）
- **决策**：部分接受——R4/R5 落 T15 可选加分；R6（家具名牌 hover）本轮不做（审美 backlog）。
- **本轮行动**：R4/R5 → **S16-T15** 可选；R6 留 backlog。

### F1 自定义家具摆位（💡 唯一值得 v21 的候选）
- **决策**：拒绝本轮 / 留 backlog。
- **理由**：坐标非持久化不可，是 sprint 唯一 v21 bump 的合理归宿，但不是收官轮（收官零升档）。留后续 sprint 被验证后做。

---

## 三、对 research-audit（研究员，收官逻辑闭环无裂缝）的逐条回应

### 深挖①：打磨 = High-Five/Crowning 分级，不是「给所有档加动效」（🔴 关键收窄）
- **决策**：接受为**本轮红线**（内化到 T12）。
- **理由**：research 援引 Yu-kai Chou win-state 框架的决定性警告——「用同一音量庆祝一切会 desensitize」；给所有档加同款彩带只是「都很轻→都很响」，仍 desensitize、问题没解。正解是分级音量（低档 High-Five 轻飘字 / 高档 Crowning 隆重弹层 + 加冕 + 角色脸 + 光效 + 更长停留），Crowning 靠稀有保份量（bond_6 需 4000 好感天然稀有）。
- **本轮行动**：T12「分级不是统一动效」写进验收第二条（本轮最易错点）；bond_1/2/3 保持轻、bond_4/5/6 隆重。

### 深挖②：晒图 = 安全异步冻结快照（破「联机才有意义」）+ 晒身份不晒缺口（破「放硬指标才有料」）（🔴 定调）
- **决策**：接受为**本轮红线**（内化到 T13）。
- **理由**：research——ACNH Dream Address 证明「异步冻结快照」就够（访客只读不可破坏），本产品单机向无联机后端，晒图出口 = Canvas 出 PNG 自行发，绝不为晒图开联机/上传/排行榜/headless 后端（S12 范畴）；flex 文化研究指向玩家晒的是身份/品味/骄傲（正着念拥有数）不是缺口/焦虑（还差 Y）。家园卡是「基地身份卡」非「图鉴成绩单」。
- **本轮行动**：T13「安全异步绝不联机 + 晒身份不晒缺口 + 绝不分享得奖励」写进验收；即使放完成度也是「陈列 X/7」局部正向计数，别做成第二张 codexPercent 成绩单。

### 深挖③：晒图首版绝不嵌远程角色图（cross-origin taint 硬约束）
- **决策**：接受为**本轮硬约束**（内化到 T13）。
- **理由**：research + 代码印证——Canvas `drawImage` 跨域图会 taint → `toBlob` 抛 `SecurityError`（`shareImage.ts:79` + `ShareCard.vue:5` 注释双印证）；AnimePlay 角色图走 `/data/images/...` 可能 offload 到 GitHub Release/OSS（跨域）。角色「脸」用 emoji/首字/稀有度色块 Canvas 自绘。
- **本轮行动**：T13「零 `drawImage` 远程图、`toBlob` 不抛错」写进验收；`CharacterAvatar` 仅屏幕预览区（DOM）用真图、Canvas 导出用文字/emoji。

### 极端①：首日/0 入住/空基地晒图必须优雅（🔴 命门级收官债）
- **决策**：接受为**本轮命门级验收**（内化到 T13）。
- **理由**：research——新玩家晒出空基地卡 = 羞辱新人 + 负面宣传；`buildHomesteadSnapshot` 须容忍 0 输入不崩/不 NaN/不 undefined（仿 `buildWrappedStats` 的 `safePercent` 容错），空基地用愿景文案软化不显缺口条。
- **本轮行动**：T13 命门级验收「空态优雅 + 聚合容错 + 特征测试锁死空态」。

### 极端③：连领多个高档 Crowning 一次只弹一个（收官边界）
- **决策**：接受（内化到 T12）。
- **理由**：research——`claimableBondCount` 可能 >1，每领一个高档都弹全屏 Crowning 会连续打断烦躁。首版「一次弹一个 + 需手动关」即可。
- **本轮行动**：T12 验收「连领不叠弹」。

### 收官逻辑完备性检验：5 轮「非数值轴」哲学成立、自洽、闭环、无裂缝（🟢 收官正式表态）
- **决策**：接受为**收官定性**（融入 plan 5 轮演进总结）。
- **理由**：research Phase 3.1 逐概念检验七个概念（关系/偶遇/家具/陈列/回访/打磨/晒图）全部非数值、全部零升档、全部落「展示墙非待办地狱」正确一侧、彼此不打架、computeIdleYield 五轮零污染——证伪了「一堆展示层堆砌」的自我质疑（假设 E）。
- **本轮行动**：写入 plan「5 轮演进总结」的收官定性表态。

### 清 dead computed（提案 C，合同 C 明列）
- **决策**：接受（收尾必做）。
- **理由**：research 代码核实 `effectText`(`:377`)/`comfortBonusText`(`:379`) 确为死代码（template 零引用，与 residentRows 里的 per-row `effectText` 无关）。
- **本轮行动**：**S16-T15** 必做项（只删 377/379，别误删 residentRows.effectText）。

### 收取/偶遇微打磨（提案 D）/ 禁用态正向提示（提案 C）
- **决策**：接受为**可选加分**（非命门）。
- **本轮行动**：**S16-T15** 可选加分；禁用态提示走正向文案（「再攒 X KP 可购」）非焦虑条。

### 提案 E 晒图联动 Crowning（bond_6 达成即生成命运纪念卡）/ 提案 F 自定义策展 roster（唯一值得 v21 候选）
- **决策**：拒绝本轮 / 留 backlog。
- **理由**：E 是「打磨×晒图」联动增强，A/B 各自达标即闭环，非本轮承诺（A/B 都做完有大余量才考虑）；F 需持久化，唯一 v21 bump 留后续。
- **本轮行动**：N/A（backlog）。

---

## 四、承接第 4 轮 Evaluator 反馈

第 4 轮 eval 决策 = **COMPLETE（信息性）**，5 条验收命令全绿（type-check 0 / test 991×3 全绿 / build 4.21s / backend security exit 0 / debug 零命中），命门全过（收藏橱窗肉眼可见 + 抽新卡即时反映 + 今日特殊角色显式标识 + 今日专属台词 + 季节浮层 z 分层合规），零升档且合规（SAVE_VERSION=20、三处装配器 diff 全空）。对本轮的有效沉淀：

- **测试基线更新**：第 4 轮末 test = **991 passed（72 files）**（较第 3 轮 970 +21，来自 `homesteadDaily.test.ts`）。本轮 Generator/Evaluator 以此为回归基线（本轮加庆祝分级判据测试 + 晒图 `buildHomesteadSnapshot` 纯函数测试，测试数只增不减、既有全绿不回归）。
- **可见性命门是硬判据**（第 4 轮 eval 亲审 diff + 活体 DOM 核对橱窗即时反映）：本轮 Evaluator 同样须**实机/读码确认庆祝分级肉眼可辨 + 晒图肉眼可出图**，「领命运=领初识 / 晒图点了没图 / 图里看不到家园身份」= 死展示 = 不通过。
- **零升档结构性锁死**（第 4 轮把「零升档」锁进拍板 + 验收 + SPRINT 三处）：本轮延续——升档拍板 + T13/T14 验收「三处装配器未触碰、SAVE_VERSION=20」+ SPRINT 任务描述三处锁死。
- **未提交累积属正常**（pitfalls 已载 + Scout C-8）：第 1-4 轮产物（`homesteadDialogues.ts`/`homesteadDaily.ts`/家具层/`usePlazaWalk.ts`/橱窗等）在未提交工作树累积，本轮在其上加打磨/晒图层，属 product-loop 多轮累积非脏树；Evaluator 核回归以「合同 T1-T11 全 `[x]` 且与实现一致」为准。
- **新陷阱收录建议**（第 4 轮 gen_status 提出 3 条：date-seed 从排序副本取 / computed 惰性引用后置 ref / 季节落程用容器高非 100vh）：建议 orchestrator 收录 pitfalls.md（非本轮阻断项）。

---

## 五、本轮 Planner 自主发现的改进方向（不在 Reviewer 报告中的）

- **「基地名不存在」是三审集体前提错误（Scout A3/C-1），Planner 定夺走 `currentUser`**：三份审计都写晒图卡放「基地名」，语气像照抄现成，但 Scout 读 `stores/homestead.ts` 发现**无此字段**（只有 placedCharacterIds/lastSettleAt）。Planner 采纳 Scout 判断，拍板晒图主标题走 `profile.currentUser`「XX 的家园」，绝不为一个装饰字段耗掉五轮未消耗的唯一 v21 bump。**这与第 4 轮「双倍好感」教训同构**：审计「放/复用某现成 X」的断言必须经 Scout 读源码核实「X 是否真存在/真能做那事」——「审计说有」≠「代码里有」。

- **Crowning 档位边界审计间分歧，Planner 锚定 bond_4/5/6（拍板三）**：evolution 说「bond_5/6 可含 bond_4」、research/Scout 说「bond_4/5/6」，边界模糊会让 Generator 摇摆。Planner 锚定 bond_4/5/6 = Crowning，理由是 `BOND_MILESTONES` 本身在 `statBonusPct`（0.02 vs 0.03）+ reward（bond_3→bond_4 从 200 跳 400）就是天然两档分层——**分级判据有数据支撑、可测**，不是拍脑袋。

- **晒图「薄接入」需结构性锁死（evolution Technical Health）**：`HomesteadView.vue` 已 1366 行。Planner 要求把「Canvas 绘制在独立 `HomesteadShareCard.vue`、聚合抽独立 `buildHomesteadSnapshot.ts` 纯函数、view 只加入口 + 弹窗开关」写进 T13 验收——理由：晒图 Canvas 绘制代码若堆进 HomesteadView 会把这个已超标 4-5 倍的文件推过可维护性拐点。成本极低（本就该抽纯函数便于单测），锁死收益高。

- **收官核对「勿误读 `docs/SPRINT.md` 的 S11/S12 残留」（research Phase 3.3 + Scout D）**：仓库有两个 SPRINT 文件——活跃合同 `docs/plans/SPRINT.md`（S16，T1-T11 全 `[x]`，本轮加 T12-T15）与 `docs/SPRINT.md`（含 S11/S12 未来路线图残留的 `[ ]`）。Planner 要求 T14 收官核对明确「核 `docs/plans/SPRINT.md`、`docs/SPRINT.md` 的 `[ ]` 是未来项勿误判」——理由：Evaluator 若 grep 到 `docs/SPRINT.md` 的 S11/S12 `[ ]` 会误报「有未勾选任务」。

- **收官核对以「合同全部 `[x]` 且与实现一致」为硬判据，非只看末轮 Evaluator（pitfalls S14-A 教训）**：product-loop 曾把 Sprint 内未完成任务误判为「不开新范围」跳过，导致跑满轮次但目标未达、Evaluator 却报 COMPLETE。Planner 把 T14 收官核对独立成一个显式任务（而非隐含在验收里），理由：收官轮是把 5 轮成果封存的最后关卡，必须有一个「显式核对全部勾选 + 无回归 + 零升档 + 命令全绿」的任务，而不是默认「跑满就完了」。

- **晒图今日寄语外化 = 传播钩子（product R7 深化）**：Planner 提醒 T13 卡面可加一句 date-seeded「今日特殊角色寄语」——每天生成的图不同 → 鼓励玩家重复晒，把第 4 轮「回访新鲜」软钩子外化到分享图上形成传播闭环。这是「回访轴 × 晒图轴」的自然联动（零成本，读现成 `todaySpecialId`）。
