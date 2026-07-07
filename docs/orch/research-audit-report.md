# Research Audit Report — 家园 hub `/homestead` 设计研究（第 5 轮 = 收官 re-audit · 打磨 + 晒图 + 收尾）

> 设计研究员视角（四镜头：核心假设质疑 / 相邻领域研究 / 逻辑完备性 / 替代设计提案）。
> product-loop `--tier1 on --mode all`，S16 第 **5** 轮 = **收官轮 re-audit**。指派弧线切片 = **打磨 + 晒图 + 收尾**：把前 4 轮做齐的「关系/偶遇/家具/陈列/回访」的情感高点打磨到位、给家园一个可展示的出口（纯前端 Canvas 晒图）、收口全 Sprint。
> **本轮天然零升档**（打磨/晒图纯展示，无存档需求）。研究员延续前四轮「橱窗不是待办、惊喜不是债务、非数值回报轴」的总纪律，本轮做**收官逻辑完备性检验 + 两块切片的相邻领域硬证据**。
> 证据源（本轮精读/复读）：`components/ShareCard.vue`（**晒图的现成范式样板** — 聚合纯派生 → 手绘 Canvas → `toBlob` → 下载/系统分享）、`utils/shareImage.ts`（`canvasToPngBlob`/`shareOrDownloadImage`，**已内建下载回落 + 不引 html2canvas + 同源不 taint**）、`wrapped/buildWrappedStats.ts`(+`.test.ts`)（**零 Vue/Pinia/DOM 纯聚合函数范式**）、`config/nurture.ts`（`BOND_MILESTONES` 6 档 = 打磨的分级判据）、`config/homesteadDialogues.ts`（`pickMilestoneDialogue` 按 id 专属台词已分级）、`views/HomesteadView.vue`（里程碑领取 `onClaimBondMilestone`/`bond-float`、离线收益弹窗、**两个 dead computed `effectText`/`comfortBonusText`**）、`composables/usePlazaWalk.ts`（rAF/偶遇场景层）、第 1-4 轮产物（`gen_status.md`/`eval.md`/`scout.md`/`research-audit-report.md` 前一版）。
> **外部研究（本轮内联 WebSearch/WebFetch）**：Yu-kai Chou「High-Five vs Crowning」win-state 分级框架、ACNH Dream Address 安全异步晒图、gacha flex 文化/社交货币。
> 前一版本（第 4 轮收藏陈列 + 回访新鲜）已被本轮覆盖写。日期：2026-07-07。

---

## Executive Summary

**这是 5 轮弧线的收官轮，也是唯一一轮不新增机制、只做「情感放大 + 对外出口 + 收口」的轮次。** 前四轮把家园从「6 角色挂机乘区面板」长成了「有关系（第 1 轮）、有偶遇（第 2 轮）、有我的家具（第 3 轮）、照见我的收藏 + 明天想回来（第 4 轮）」的情感基地。本轮回答收官三问：(1) 家园里最重的情感时刻（领「命运」bond_6）现在被做得和最轻的时刻（领「初识」bond_1）一模一样——**巅峰时刻被做平了，怎么放大？**（2) 玩家在家园攒下的一切（基地/入住/陈列/家具/羁绊），凭什么只有自己看得见——**怎么给它一个能拿出去的出口？**（3) 5 轮下来「在 `computeIdleYield` 旁开非数值情感/收集轴」这条总设计哲学，收官时**逻辑上到底成不成立、有没有裂缝？**

**先给结论，五件事我要替 Planner 钉死：**

1. **情感高点打磨 = 采纳，且它的正确理论框架是「High-Five vs Crowning」（Yu-kai Chou win-state 分级）——这不是"加点动效"，是修一个被外部研究明确点名的反模式。** 当前 `onClaimBondMilestone` 领任何一档里程碑（bond_1「初识」100 好感 vs bond_6「命运」4000 好感 / 1500 KP）都走**同一个 `.bond-float` 文字飘字 + 同一个 `commission-float` 过渡**——台词文本虽按 id 分级（好），但**视觉/仪式反馈完全同量级**。Yu-kai Chou 框架的核心警告一字不差地命中这里：**"Products that celebrate everything at the same volume desensitize users to both categories"（用同一音量庆祝一切，会让大小成就都失去情感落点）**。收官轮该做的是：**让 bond_1-3 保持 High-Five（1-2s 轻飘字，现状即可），让 bond_5/bond_6 升级为 Crowning（5-10s 的隆重瞬间：全屏/卡片级庆祝 + 称号加冕 + 更强视觉，稀有到"数月一遇"才有份量）**。这是本轮最高杠杆的打磨（见 Phase 1 深挖① + Phase 2.1）。

2. **晒图 = 采纳，且这块的工程风险已被前人做到接近零——项目里已有一套成熟的「Canvas 晒图范式」可直接克隆。** 合同的晒图硬约束（纯前端 Canvas `toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`、别引 html2canvas、首版绝不嵌远程角色/封面图规避 cross-origin taint、聚合抽纯函数仿 `buildWrappedStats`）**不是要从零发明**——`components/ShareCard.vue`（成绩卡）+ `utils/shareImage.ts`（`canvasToPngBlob`/`shareOrDownloadImage` 已内建下载回落 + 系统分享 + AbortError 处理）+ `wrapped/buildWrappedStats.ts`（纯聚合 + 特征测试）**就是这套范式的活体样板，逐条对上合同每一条硬约束**。本轮晒图 = 写一个 `buildHomesteadSnapshot.ts` 纯函数（仿 buildWrappedStats）+ 一个 `HomesteadShareCard.vue`（仿 ShareCard 手绘 Canvas）+ 复用现成 `shareImage.ts`。**零新范式、零新风险、零升档**（见 Phase 2.2 + Phase 4 提案 B）。

3. **★ 晒图该放什么内容 = 「基地身份卡」而非「数据仪表盘」——放能构成社交货币 / 身份表达的东西，不放能构成 KPI / 进度焦虑的东西。** gacha flex 文化研究（见 Phase 2.3）指向：玩家想晒的是**"这些是我的、这是我的品味、这是我攒出来的样子"**（身份 + 骄傲），不是"我完成度 63%"（缺口 + 进度）。收官晒图应放：**基地名 + 入住角色的脸（本地 sprite/emoji，非远程图）+ 陈列完成度（正着念"陈列 5/7"）+ 家具数 + 命中的羁绊作品名 + 今日特殊角色**——这些是"我的家园长这样"的身份快照。**绝不放**"图鉴还差 260 个""UR 0/67"这类缺口指标（那把骄傲的晒图变成焦虑的仪表盘，踩前四轮一路守的反-completionist 红线）。这与第 4 轮陈列"正着念拥有数"的纪律一脉相承（见 Phase 1 深挖② + Phase 4 提案 B）。

4. **★★ 晒图的"社交"必须诚实收窄为"安全异步晒图"——本产品是单机向、无联机后端，晒图的出口是"生成一张图，你自己拿去发"，不是"上传到服务器给别人看"。** 这正是 ACNH Dream Address 的精髓：**一张冻结的快照 / 一张可下载的图，不是一个活的、能被别人闯入/改动的房间**（见 Phase 2.2）。本轮晒图=**Canvas 出一张 PNG，走系统分享面板或下载到本地**，玩家自行发到微信/推特/QQ。**绝不因为"晒图"就去开一个 headless 联机/排行榜/访问别人家园的后端**——那是 S12 权威后端的范畴，本 sprint 严禁触碰。晒图的社交价值 100% 来自"图本身好看到玩家愿意主动转发"，零来自任何联机基建。

5. **收官逻辑完备性 = 5 轮"非数值轴"哲学成立，无致命裂缝，但有三条"收官时该显式确认"的边界（首日空基地晒图 / 打磨动效的定时器清除 / dead computed 清理）。** 我逐轮复检了"关系→偶遇→家具→陈列→回访"五个概念的自洽性（Phase 3）：它们互不打架、全部纯派生/date-seeded 零升档、全部落在"展示墙非待办地狱"正确一侧、`computeIdleYield` 单口径五轮零污染——**这条哲学在收官时是自洽且闭环的**。唯一要补的收官债：① 首日/0 入住玩家的晒图必须优雅（别晒出一张空基地羞辱新人）；② 本轮若加 Crowning 庆祝动效，其 setTimeout/rAF 必须登记清除（pitfalls 明令，前四轮全守住了，本轮别破功）；③ 合同点名的两个 dead computed（`effectText`/`comfortBonusText` in `HomesteadView.vue:377/379`）**经我代码核实确为死代码**（template 零引用，与 `row.effectText` 无关），收官轮该清（见 Phase 3.3）。

**一句话定调**：本轮是「**把家园最重的情感时刻放大成配得上它的隆重（打磨），再给这份攒了 5 轮的家园一个能拿出门的样子（晒图），然后干净地收口**」——打磨的正解是**分级**（让巅峰配得上巅峰、别用同一音量庆祝一切），晒图的正解是**减法 + 诚实**（克隆现成 Canvas 范式、放身份不放 KPI、安全异步不碰联机）。**守住『巅峰要隆重、晒图晒身份不晒缺口、社交是异步不是联机』，收官轮就赢了、5 轮弧线就闭环了。**

---

## Phase 1: 核心假设质疑

### 1.1 假设清单（本轮聚焦打磨 / 晒图两维度 + 收官哲学检验，标注可质疑度）

| # | 隐含假设 | 体现在 / 来源 | 可质疑度 |
|---|---|---|---|
| A | 「情感高点打磨」= 给所有里程碑领取都加点动效/彩带 | 合同「收取瞬间庆祝反馈微打磨」的直觉读法 | 🔴 高（若所有档同量级加动效，只是把"同音量的平"换成"同音量的响"，仍desensitize） |
| B | 「晒图」要有意义就得能被别人看到 → 需要联机/上传/排行榜 | 「展示出口 / 社交货币」的直觉读法 | 🔴 高（本产品单机向无后端；ACNH Dream Address 证明"异步冻结快照"就够，联机是伪需求） |
| C | 晒图卡该放「完成度/图鉴百分比」这类硬指标才显得有料 | 成绩卡 ShareCard 已放 codexPercent 的惯性 | 🟡 中（家园晒图是"身份卡"非"成绩卡"；放缺口指标会重蹈 completionist 焦虑） |
| D | 晒图要好看必须嵌角色立绘/封面图 | 「晒图=晒角色脸」的直觉 | 🔴 高→本轮转硬约束：远程图 cross-origin 会让 `toBlob` 抛错（canvas taint），首版绝不嵌 |
| E | 5 轮"在 computeIdleYield 旁开非数值轴"的哲学，收官时可能其实是"一堆互不相关的展示层堆砌"，不成体系 | 收官自我质疑 | 🟡 中（需 Phase 3 逐概念检验自洽性——结论是成立且闭环，非堆砌） |
| F | 打磨=只碰前端动效，天然无风险 | 合同「纯前端动效，不碰数值」 | 🟢 低→但有一个真风险：Crowning 动效的定时器若不登记清除会泄漏（pitfalls 明令） |
| G | 收官轮"打磨/晒图"既然不碰机制，就不用抓前四轮回归 | 收官偷懒直觉 | 🔴 高（合同明令"全面抓回归 S14/S15 33+ 项 + 1-4 轮已成机制"，收官恰是回归总检点） |

### 1.2 关键假设深挖（选 3 个最重要的）

#### 深挖①：假设 A「打磨 = 给所有里程碑领取都加动效」——这是本轮最危险的读法，它会把"同音量的平淡"换成"同音量的吵闹"，问题没解

**当前直觉**：合同写「高档里程碑隆重庆祝」「领『命运』bond_6 和领『初识』bond_1 反馈一模一样」，最省事的读法是——给 `onClaimBondMilestone` 加一个彩带/闪光动效，所有档领取都放。**这个读法没抓住问题的本质。**

**代码级现状（Scout 已接地，我复核）**：`views/HomesteadView.vue:482` 的 `onClaimBondMilestone` 对任何 milestoneId 都做同一件事：
```
function onClaimBondMilestone(charId, milestoneId) {
  if (!userStore.claimBondMilestone(charId, milestoneId)) return;
  const line = pickMilestoneDialogue(milestoneId, dialogueTick++);   // ← 台词按 id 分级（好）
  bondFloat.value = { name, text: line };                            // ← 但视觉：同一个飘字
  scheduleDialogueClear(() => { bondFloat.value = null; }, 3200);    // ← 同一个 3.2s 文字过渡
}
```
`config/homesteadDialogues.ts:42` 的 `MILESTONE_LINES_BY_ID` **文本已经分级**（bond_1「初次见面还有点紧张…」vs bond_6「命运让我们相遇…」）。**所以问题不是"台词一样"，是"仪式一样"**——领 100 好感的「初识」和领 4000 好感 / 1500 KP 的「命运」，玩家看到的是**同一个右下角文字飘字**，无任何量级差。

**为什么"给所有档加同款动效"不解决问题（外部研究硬证据）**：Yu-kai Chou 的 win-state 设计框架把庆祝分成两类，且给出一条决定性警告：
- **High-Five（击掌）**：1-2 秒的轻反馈（pop-up / 彩带 / 音效），用于**日常/次要**成就（每日登录、上传照片）。实现成本低、即时满足。
- **Crowning（加冕）**：5-10+ 秒、命令玩家全部注意力、把玩家置于成就中心的**仪式级**反馈，用于**重大**成就。其有效性**依赖稀有**——"used weekly becomes a high-five"（每周用一次就退化成击掌）。
- **决定性警告**："**Products that celebrate everything at the same volume desensitize users to both categories**"——用同一音量庆祝一切，会让大小成就在情感上都落不了地。

**当前家园正是这个反模式的教科书案例**：所有 6 档里程碑同音量（都是轻飘字）。而"给所有档加同款彩带"只是把音量从"都很轻"调成"都很响"——**仍然是同一音量，仍然 desensitize**。正解不是调音量，是**分级音量**。

**如果假设不破会怎样**：领「命运」（一个角色好感 4000、5 轮陪伴的巅峰时刻）和领「初识」得到一样的反馈 → 玩家对"里程碑"这个词脱敏 → 前四轮辛苦建立的"角色在跟我建立关系"的情感内核，在最该 payoff 的巅峰时刻被做轻 → 情感高点塌陷。

**拍板（替 Planner 定夺 A/F）**：**打磨做「分级庆祝」，不做「统一动效」：**
- **bond_1/bond_2/bond_3（初识/熟络/要好，低档，High-Five）**：保持现状的轻飘字（`bond-float`），至多加一个极轻的 ✨ 微光——1-2s，不打断。**低档就该轻，这是对的，别过度打磨。**
- **bond_4/bond_5/bond_6（挚友/羁绊/命运，高档，Crowning）**：升级为**隆重瞬间**——一个卡片级/半屏的庆祝弹层（可复用离线收益弹窗 `.settle-pop` 的范式），带：① 大号称号加冕（"「命运」达成"）+ 角色名 + 角色的脸（本地 `CharacterAvatar`，非远程图）；② 更强但**纯 CSS `@keyframes`** 的视觉（光晕/星屑上浮，别进 rAF）；③ 停留更久（4-6s 或点击关闭）。**bond_6 是全游戏一个角色的情感顶点，值得一个"你会截图发出去"的瞬间**（这也顺带喂给晒图——见提案 B 的联动）。
- **分级判据现成**：`BOND_MILESTONES` 的 index（0-5）或 `statBonusPct`（低档 0.02 / 高档 0.03）或直接按 id 白名单（bond_4/5/6 = 高档），一个纯函数 `milestoneCelebrationTier(id): 'highfive' | 'crowning'` 即可，可测。
- **红线**：庆祝**纯展示、零数值**（`claimBondMilestone` 的发放逻辑一字不碰，庆祝只是发放成功后的视觉分支）；Crowning 弹层的任何 setTimeout/rAF **登记数组 + onUnmounted 清除**（复用现有 `dialogueTimers` 范式，pitfalls 明令，假设 F 的真风险）。

#### 深挖②：假设 B/C「晒图要有意义就得能被别人看到 / 得放硬指标」——ACNH Dream Address 证明"异步冻结快照"就够，且晒图卡该晒"身份"不晒"缺口"

**当前直觉**：合同写「晒图/展示出口 = 长留存的外化出口」「社交货币」，两个危险的滑坡读法：(B) "要社交就得联机上传给别人看" / (C) "要有料就得放完成度百分比"。**两个读法都错，且第二个直接踩前四轮守的反-completionist 红线。**

**破 B（联机是伪需求，异步冻结快照就够）**：ACNH 的 Dream Address 是"安全异步晒图"的黄金范式——
- Dream Island 是玩家岛屿的**冻结快照**（saved snapshot）：访客看到的是"你上传那一刻的岛"，**不是活的岛**——访客**不能改动、不能踩你的花、不能偷你的东西**（"without worrying about them trampling your flowers, stealing your items, or changing anything"）。
- 关键洞察：**晒图的社交价值不需要"实时联机"，只需要"一个能拿出去的、冻结的、好看的产物"**。Dream Address 是个"你自己拿去分享的码"，AnimePlay 晒图是"你自己拿去发的一张 PNG"——同构。
- 本产品**单机向、无联机后端**（CLAUDE.md：多人/权威后端是 S12）。所以晒图的正确出口 = **`Canvas.toBlob` → `navigator.share`（系统面板）或 `a.download`（下载 PNG）**，玩家自行发到社交平台。**`utils/shareImage.ts` 已经把这条路铺好了**（`canShareImage()` 特性检测 → `shareOrDownloadImage()` 支持则调系统分享、否则回落下载、AbortError 不报错）。本轮零新基建。
- **拍板**：晒图 = 纯前端 Canvas 出图 + 系统分享/下载。**绝不为"晒图"开任何联机/上传/排行榜/headless 后端**（那是 S12，本 sprint 严禁）。

**破 C（晒身份不晒缺口）**：gacha flex 文化研究指向——玩家愿意主动转发的图，晒的是**身份、品味、骄傲、"我攒出来的样子"**，不是缺口指标。而家园晒图是**"基地身份卡"**（我的家长这样），不是**"图鉴成绩单"**（我还差多少）。第 4 轮已经为陈列立下"正着念拥有数、绝不念还差 Y"的纪律，晒图必须延续：
- **该放（身份/骄傲侧）**：基地名 + 入住角色的脸（本地 sprite/头像，非远程）+ 陈列完成度**正着念**（"陈列 5/7 件家具"）+ 家具数 + 命中的羁绊作品名（"《XX》同伴同住"）+ 今日特殊角色 + 玩家名/等级。这些构成"我的家园身份"。
- **绝不放（缺口/焦虑侧）**："图鉴还差 260 个""UR 0/67""完成度 13%"这类缺口/低完成度指标。**同一个数字，"陈列 5/7"是骄傲，"还差 2 件"是焦虑——晒图一律正着念**（与第 4 轮陈列纪律、Phase 2.3 flex 研究一致）。
- ⚠️ **注意 ShareCard 成绩卡放了 codexPercent（完成度大数字）**——那是"成绩卡"的定位（回顾全局战绩），可以有；但**家园晒图是"基地卡"定位（此刻我的家长这样），主体应是基地/角色/家具/羁绊的身份表达，完成度即使放也是"陈列 X/7"这种局部正向计数**，别把家园卡做成第二张图鉴成绩单。

#### 深挖③：假设 D「晒图要好看必须嵌角色立绘/封面图」——这是会让 `toBlob` 直接抛错的硬约束，首版必须纯 CSS-Canvas 绘制

**当前直觉**：晒角色的游戏，晒图不放角色立绘怎么好看？**但这在技术上是本轮最容易翻车的地雷。**

**硬约束（合同 pitfalls 明令 + 代码印证）**：Canvas 一旦 `drawImage` 了一张**跨域**（cross-origin）图片，canvas 就被 **taint（污染）**，之后 `toBlob`/`toDataURL` 会**抛 `SecurityError`**——晒图直接失败。`utils/shareImage.ts:79` 的 `canvasToPngBlob` 注释已经明写"toBlob 失败（含跨域 taint）时 reject"，`ShareCard.vue:5` 注释也明写"首版不嵌远程封面图（规避 canvas cross-origin taint）"。**这是前人踩过并写进代码的坑。**
- AnimePlay 的角色图走 `/data/images/[type]/[id].jpg`（CLAUDE.md），且合同提到图片可能 offload 到 GitHub Release / OSS（`VITE_IMAGE_BASE_URL`）——**一旦图片是跨域来源，嵌进 canvas 必 taint**。
- **拍板（替 Planner 定夺 D）**：**首版晒图绝不 `drawImage` 任何远程角色/封面图**。角色"脸"用**纯 CSS-Canvas 绘制的替代**：① emoji（如每个入住角色画一个 emoji 头像位 + 名字）；② 或纯色/渐变圆底 + 角色名首字；③ 稀有度色块。**基地名/入住数/陈列度/家具数/羁绊/今日角色全是本地可得的文字/数字/emoji**，Canvas 手绘即可（仿 ShareCard 的 `fillText`/`roundRect`/`createLinearGradient` 全套已有工具函数）。
  - 若未来要嵌真实卡面美术，须先解决 CORS（图片服务加 `Access-Control-Allow-Origin` + `img.crossOrigin='anonymous'`），那是后续轮的美术管线债，**本轮不碰**。

### 1.3 本轮切片在「乘区面板 vs 情感基地」大命题里的位置（收官定位）

前四轮沿"在 `computeIdleYield` 单口径旁开非数值回报轴"依次开了：**关系/台词轴**（第 1-2 轮）、**空间/所有权轴**（第 3 轮家具）、**收藏/时间轴**（第 4 轮陈列 + 回访）。**本轮不开新轴，而是做两件收官动作：**
- **打磨 = 把已开的"关系轴"的情感峰值放大**——bond_6「命运」是关系轴的终点，第 1 轮把它做出来了但做平了，收官轮给它配得上的隆重。这是"把已有轴的高点抬起来"，非开新轴。
- **晒图 = 给整个情感基地一个"外化快照"出口**——把 5 轮攒下的关系/偶遇/家具/陈列/回访聚合成一张可拿出门的身份卡。这是"给已有的一切一个出口"，非开新轴。

**两者都天然 100% 非数值**：打磨是纯展示动效（庆祝不发奖），晒图是只读快照（聚合不写状态、不发奖、零升档）。**这让 5 轮弧线在收官时形成完美闭环**：家园从"6 角色挂机乘区面板"→"有关系、有偶遇、有我的家具、照见我的收藏、明天想回来"→**"最重的情感时刻配得上它的隆重、且这份家园能拿出门给人看"**。收官不推倒任何东西，只做放大 + 出口 + 收口。

---

## Phase 2: 相邻领域研究

### 2.1 里程碑庆祝的分级（High-Five vs Crowning）——打磨切片的理论骨架

| 框架 / 产品 | 分级形态 | 机制内核 | 对本轮打磨的启示 |
|---|---|---|---|
| **Yu-kai Chou「High-Five vs Crowning」** | High-Five=1-2s 轻反馈（次要成就）；Crowning=5-10s+ 仪式（重大成就） | **proportionality（比例原则）**：庆祝量级必须匹配成就量级；同音量庆祝一切 = 双向 desensitize | **bond_1-3 保持 High-Five 轻飘字、bond_4-6 升级 Crowning 隆重弹层**。这是本轮打磨的核心判据。 |
| **Crowning 的"稀有"要件** | "used weekly becomes a high-five"——加冕用滥就退化 | 巅峰庆祝靠**稀有**保住份量（数月一遇才隆重） | bond_6「命运」需 4000 好感，是天然稀有的巅峰——正配 Crowning。别给低档也上 Crowning（那就滥了）。 |
| **通用 juice / game feel** | 音效 + 屏幕反馈 + 动画时长 + 停顿匹配事件权重 | 反馈的"厚度"是情感落点的载体 | 高档 Crowning 可加：更大字号称号加冕、角色脸、纯 CSS 星屑/光晕、更长停留、一次轻停顿。 |
| **成就系统的"无 fanfare"反例（Xbox 100% 完成无庆祝）** | 玩家抱怨达成大成就却"没有任何 fanfare" | 大成就无隆重 = 情感亏欠感 | 印证：巅峰时刻（领命运）若无隆重，玩家会隐性感到"这么大的事就这样？" |

**决定性结论**：打磨的正解**不是"加动效"，是"分级动效"**。Yu-kai Chou 框架给了可操作的二分：**低档 High-Five（现状即合格，至多微光）/ 高档 Crowning（隆重弹层 + 加冕 + 稀有）**。这把合同"高档里程碑隆重庆祝"从直觉变成有理论支撑的设计判据。**且分级判据在代码里现成**（`BOND_MILESTONES` 的档位 index / statBonusPct）。

来源：[Yu-kai Chou — High-Five vs Crowning](https://yukaichou.com/gamification-analysis/high-fives-and-crowning-two-game-design-techniques-for-your-win-states/)、[Yu-kai Chou — Milestone Unlock 心理](https://yukaichou.com/advanced-gamification/the-power-of-milestone-unlocks-in-gamification-design/)、[Pure Xbox — Gamerscore Millionaire on 100% completion fanfare](https://www.purexbox.com/news/2026/05/xboxs-first-gamerscore-millionaire-suggests-how-to-improve-100percent-completions)。

### 2.2 安全异步晒图（ACNH Dream Address）+ 项目现成 Canvas 范式——晒图切片的形态 + 工程范式

| 来源 | 形态 | 机制内核 | 对本轮晒图的启示 |
|---|---|---|---|
| **ACNH Dream Address** | 上传岛屿→生成冻结快照+永久码；访客只读、不能改动/破坏 | **安全异步晒图**：晒的是冻结快照不是活房间；无实时联机、无被闯入风险 | 本轮晒图=生成一张冻结 PNG，玩家自行分享。**零联机、零上传后端**——异步快照就是社交出口。 |
| **Dream Address 码稳定性** | 更新岛屿→重新上传→码不变、内容更新 | 快照可迭代，出口稳定 | 家园晒图可随时重新生成（家变了图就新）——纯派生 live store，天然"随时最新快照"。 |
| **项目 `ShareCard.vue`（成绩卡）** | 聚合纯派生 → `drawCard(canvas)` 手绘 → `toBlob` → 分享/下载 | **本产品已验证的 Canvas 晒图范式** | **直接克隆**：`buildHomesteadSnapshot.ts`（仿 buildWrappedStats）+ `HomesteadShareCard.vue`（仿 ShareCard）。 |
| **项目 `utils/shareImage.ts`** | `canvasToPngBlob` + `shareOrDownloadImage`（系统分享/下载回落/AbortError 处理） | 晒图 IO 层已封装、跨环境安全 | 本轮**零新 IO 代码**，`import` 现成两函数即可。 |
| **项目 `wrapped/buildWrappedStats.ts`** | 零 Vue/Pinia/DOM 纯聚合函数 + 特征测试 | 聚合逻辑与 UI/Canvas 解耦、可单测 | 家园快照聚合**必须抄这个**：`buildHomesteadSnapshot(input): HomesteadSnapshot` 纯函数 + `.test.ts`。 |

**决定性结论**：晒图这块的**设计形态**（ACNH 式安全异步冻结快照）和**工程范式**（项目现成 Canvas 三件套）**都是现成的**——本轮晒图不是发明，是"把成绩卡范式套用到家园数据 + 换一套身份卡视觉"。合同的每一条晒图硬约束（`toBlob`/`download`/`revokeObjectURL`、别引 html2canvas、首版不嵌远程图、聚合抽纯函数仿 buildWrappedStats）**逐条已被 `ShareCard.vue`+`shareImage.ts`+`buildWrappedStats.ts` 满足**。这是本轮风险最低的一块。

来源：[Nintendo — How to Upload Your Island to the Dream Library](https://en-americas-support.nintendo.com/app/answers/detail/a_id/50095/)、[Nintendo UK — How to Visit Another Player's Dream Island](https://www.nintendo.com/en-gb/Support/Purchases-Subscriptions/Games/How-to-Visit-Another-Player-s-Dream-Island-Animal-Crossing-New-Horizons--1821306.html)、[Animal Crossing Wiki — Dream Address](https://animalcrossing.fandom.com/wiki/Dream_address)、项目 `components/ShareCard.vue` / `utils/shareImage.ts` / `wrapped/buildWrappedStats.ts`。

### 2.3 gacha flex 文化 / 社交货币——晒图该放什么内容的相邻领域证据

| 机制 | 心理内核 | 对本轮晒图内容的指导 |
|---|---|---|
| **flex / 社交货币** | 收集/展示"更有回报当有人欣赏你的努力/运气/投入"；社交验证驱动留存 | 晒图是"给我的家园一个被欣赏的机会"——放能引发"哇这基地不错"的身份表达。 |
| **玩家想晒什么** | 稀有角色入手、满命角色、**完整收藏**、"我攒出来的样子"、day-one badge of honor | 家园晒图放：入住阵容（我选了谁陪我）、陈列/家具（我攒了什么）、羁绊（我懂角色关系）、基地名（我的身份）。 |
| **展示的是骄傲不是缺口** | flex 的情绪是 pride/status（正向），非 anxiety | 晒图正着念"陈列 5/7 · 入住 6 · 羁绊《XX》命中"——骄傲；绝不"图鉴 13% · 还差 260"——焦虑。 |
| **身份表达 > 数值堆砌** | 玩家晒"我的品味/我的选择"比晒"我的分数"更有社交传播力 | 家园卡的灵魂是"这是我策展的家"（入住选择 + 家具 + 陈列 = 品味表达），非一堆百分比。 |

**决定性结论**：晒图内容的正解 = **"基地身份卡"**——放构成身份/品味/骄傲的东西（基地名 + 阵容脸 + 陈列 + 家具 + 羁绊作品 + 今日角色），**不放构成缺口/焦虑的东西**（低完成度百分比 / "还差 Y"）。这与第 4 轮陈列"正着念"纪律、Phase 1 深挖② 完全一致，是同一条反-completionist 红线在晒图域的延伸。

来源：[Game Design Skills — Gacha Game Design](https://gamedesignskills.com/game-design/gacha-game/)、[CJ Dyas — UX of Gacha Games](https://www.cjdyas.design/blog/the-user-experience-of-gacha-games-a-deep-dive-into-engagement-and-addiction)、[GameRefinery — Mobile Game Gachas Guide](https://www.gamerefinery.com/the-complete-guide-to-mobile-game-gachas-in-2022/)。

### 2.4「展示墙 vs 待办地狱」分界线在收官轮的复用（打磨/晒图自检）

第 4 轮我立的这张表，收官轮的打磨/晒图每一处仍要过：

| 是「展示墙/惊喜」（要） | 是「待办地狱/债务」（不要） |
|---|---|
| 庆祝是"你达成了巅峰"的骄傲瞬间 | 庆祝挂钩"再充/再刷才能解锁隆重版" |
| 晒图正着念"陈列 5/7 · 阵容 6" | 晒图倒着念"图鉴 13% · 还差 260" |
| 晒图纯派生只读快照、零发奖 | 晒图挂"分享得奖励"任务（诱导分享 = dark pattern） |
| 分享是"我想炫我的家"的自发 | 分享是"不分享就亏"的 FOMO |
| Crowning 靠稀有保份量（数月一遇） | 每领必 Crowning（用滥即退化成击掌） |

**收官自检**：打磨的 Crowning 靠 bond_6 天然稀有保份量（✓）、庆祝零发奖（✓）；晒图纯派生只读（✓）、正着念（✓）、**绝不做"分享得 KP"任务**（✓ 那是诱导分享 dark pattern，且会踩货币口径 + 名字≠行为线）。两块都干净落在"展示墙/惊喜"一侧。

---

## Phase 3: 逻辑完备性（收官检验 + 极端场景 + 遗留设计债）

### 3.1 收官逻辑完备性检验：5 轮"关系/偶遇/家具/陈列/回访"概念是否自洽（本轮研究员的核心收官任务）

我逐个概念检验"非数值情感/收集轴"哲学的内部自洽，看有没有裂缝：

| 概念（轮次） | 回报轴 | 是否碰数值 | 是否零升档 | 是否落"展示墙"一侧 | 与其它概念是否打架 | 裂缝？ |
|---|---|---|---|---|---|---|
| **关系**（第 1 轮 里程碑显形+tap+台词） | 关系/情感 | 好感走既有 `dailyBondInteraction` 口径，里程碑走既有 `claimBondMilestone`（未新拼） | ✅ 零升档（复用 v14/v16 既有字段） | ✅ tap 可选、里程碑领取是既有养成机制搬进家园 | 否 | 无 |
| **偶遇**（第 2 轮 同作品对话+多气泡） | 关系/在场 | ✅ 纯展示零好感零数值 | ✅ 冷却纯内存态 | ✅ 偶遇是自发惊喜、看了不领不亏 | 否（复用 computeBondPairs 的 hits，与羁绊同源） | 无 |
| **家具**（第 3 轮 进场景可见） | 空间/所有权 | ✅ 展示层零数值（comfort 仍走既有 `sumFurnitureComfort`，未新增乘子） | ✅ 固定槽位坐标写死 config | ✅ 回报=视觉所有权本身 | 否（家具 y-sort 接进角色同一公式） | 无 |
| **陈列**（第 4 轮 UR 橱窗+完成度） | 收藏/骄傲 | ✅ 只读 `codex.characterCompletion`+`collection`，零 claim/earn | ✅ 纯派生 | ✅ 正着念拥有数、0 UR 优雅降级/引导非空墙 | 否（只读，绝不碰 claimedMilestones 领取制） | 无 |
| **回访**（第 4 轮 今日特殊角色+季节） | 时间/新鲜 | ✅ tap 走原样标准好感（未做双倍）、台词纯 config | ✅ date-seeded 纯派生 | ✅ 今日角色是惊喜非债务、无红点催 | 否（date key 与 daily/nurture 跨天判定一致） | 无 |
| **打磨**（第 5 轮 分级庆祝） | 关系峰值放大 | ✅ 纯展示动效，`claimBondMilestone` 发放逻辑不碰 | ✅ 无存档需求 | ✅ 庆祝零发奖、Crowning 靠稀有保份量 | 否（放大既有关系轴的高点，非新轴） | 无 |
| **晒图**（第 5 轮 基地身份卡） | 外化出口/身份 | ✅ 只读聚合快照、零发奖零升档 | ✅ 纯派生 live store | ✅ 正着念身份、绝不"分享得奖励"、异步非联机 | 否（聚合前五轮已有数据，非新数据源） | 无 |

**收官结论（研究员对哲学成立性的正式表态）**：**这条"在 `computeIdleYield` 单口径旁开非数值情感/收集轴"的总设计哲学，在收官时是自洽、无致命裂缝、且闭环的。** 七个概念：① 全部非数值（唯一沾数值的是关系轴的好感/里程碑，但都走既有口径未新拼）；② 全部零升档（`SAVE_VERSION=20` 五轮未动）；③ 全部落"展示墙非待办地狱"正确一侧；④ 彼此不打架（关系/偶遇同源羁绊 hits、家具/陈列/回访/晒图各读独立派生源、跨天判定统一）；⑤ `computeIdleYield` 五轮**零污染**（无任何非数值轴偷偷接了乘子）。**它不是"一堆互不相关的展示层堆砌"（假设 E 的自我质疑被证伪），而是一条"家园的情感/收集维度逐层加厚、挂机数值口径始终干净"的连贯设计线**。收官轮的打磨（放大峰值）+ 晒图（外化出口）是这条线的自然收尾，非新增负担。

### 3.2 三个极端场景（收官轮晒图/打磨最易翻车处）

#### 极端①：首日 / 0 入住 / 空基地玩家的晒图

- **风险**：新玩家点"晒图"，若晒出一张"基地名：未命名 · 入住 0 · 陈列 0/7 · 家具 0 · 羁绊无"的空卡 → **反而羞辱新人、且这张空图被发出去是负面宣传**。
- **正确处理**：① 晒图入口在**基地过于空**时可温和引导（"先入住几个角色、摆点家具，你的基地卡会更好看"）或仍允许出图但**用愿景化文案软化**（"我的家园刚起步 · 快来一起玩"）；② 聚合纯函数 `buildHomesteadSnapshot` 必须容忍 0 入住/0 家具/0 陈列**不崩、不出 NaN、不出 undefined**（仿 buildWrappedStats 对 0 历史的 `safePercent` 容错）；③ 空基地不显"缺口条"（守正着念）。**补特征测试锁 0 入住/0 家具的空态聚合。**

#### 极端②：满配基地玩家的晒图（信息过载）

- **风险**：6 入住 + 7 家具全摆 + 多个羁绊命中 + 陈列满 → 一张卡塞不下所有信息、或塞下了很挤。
- **正确处理**：Canvas 卡尺寸固定（仿 ShareCard 的 600×800），**信息取舍要设计**——阵容脸最多画 6 个位（本就封顶 6 入住）、家具/陈列/羁绊用聚合数字（"家具 7 · 陈列 7/7 · 羁绊《XX》等 2 组"）而非逐条铺开。**满配是好事，卡要能优雅承载"满"的骄傲**（满墙脸 + 满陈列数 = 视觉上就很飒），别信息过载。

#### 极端③：Crowning 庆祝在快速连领时的体验

- **风险**：玩家一次进家园可能有多个角色的多档里程碑可领（`claimableBondCount` 可能 >1）。若每领一个高档都弹一个 Crowning 全屏层 → 连续弹层打断、烦躁。
- **正确处理**：① Crowning 弹层**一次只显一个**（队列或"后领覆盖前领"，别叠弹）；② 或高档 Crowning 弹层**需玩家点击关闭**（给巅峰时刻应有的停顿），低档 High-Five 自动消失不打断；③ 连领多个高档时可考虑合并为一次庆祝（"本次达成 3 个羁绊里程碑"）——**但这是打磨的 nice-to-have，首版一次弹一个 + 需手动关即可**。

### 3.3 收官遗留设计债盘点（本轮该收 + 该留档的）

| 债项 | 位置 | 性质 | 收官处理建议 |
|---|---|---|---|
| **dead computed `effectText`** | `HomesteadView.vue:377` | **经我代码核实确为死代码**：template 零引用（`row.effectText` 是 residentRows 内的独立字段，与顶层这个无关；grep 排除后零命中） | 🟡 收官轮清（合同 C 明列）。删一行 computed，零风险。 |
| **dead computed `comfortBonusText`** | `HomesteadView.vue:379` | **经我代码核实确为死代码**：template 零引用 | 🟡 收官轮清（合同 C 明列）。删这个 computed，零风险。 |
| **禁用态"差多少"提示** | 家具购买/里程碑等禁用按钮 | nice-to-have：禁用时告诉玩家"还差 X KP" | 🟢 可选加分，非命门。若做，走正向文案（"再攒 X KP 可购"）别做焦虑条。 |
| **家具 emoji 跨平台字形不一** | 第 3 轮 7 家具 emoji | 审美未尽（Win/Mac/移动端 emoji 长相差异） | 🟢 留档：真实美术管线债（后续轮）。**本轮晒图若嵌本地绘制的家具 emoji 同此债，但不阻塞**。 |
| **偶遇命中依赖同作品入住（低命中率）** | 第 2 轮偶遇 | 无同作品对的玩家看不到偶遇亮点 | 🟢 留档：第 4 轮已用"今日特殊角色（100% 命中）"对冲；晒图可顺带显"羁绊命中"让有同作品对的玩家多一份骄傲。 |
| **自定义陈列策展 / 偶遇相册（唯一值得动 v21 的候选）** | — | 需持久化，前四轮一致判定留 backlog | 💡 留档：**唯一 v21 bump 五轮全未消耗**，收官轮也无升档需求，留给未来真做"陈列做深"时。 |

**收官核对提醒（给 Planner/Evaluator，非研究员职责但顺带记）**：合同要求收官核对 S16-T1..T11 全 `[x]`（我核实活跃合同 `docs/plans/SPRINT.md` 的 T1-T11 均已 `[x]`；注意 `docs/SPRINT.md` 里的 `[ ]` 是 S11/S12 未来路线图残留，非 S16 项，勿误判）+ S14/S15 33+ 机制无回归 + `SAVE_VERSION=20` + test 连跑 3 次（当前基线 991）。**打磨/晒图天然零升档，收官应维持 `SAVE_VERSION=20`。**

---

## Phase 4: 替代设计提案

> 每个提案标注：可见性（命门）/ 升档成本 / 复用度 / 风险。按「本轮该做」优先级排。

### 提案 A（🔴 强烈建议 · 打磨命门）：里程碑分级庆祝 —— High-Five（低档）/ Crowning（高档）

- **形态**：`onClaimBondMilestone` 加一个分级分支——
  - **低档 bond_1/2/3（High-Five）**：现状 `bond-float` 轻飘字（至多加极轻 ✨ 微光），1-2s 自动消失，不打断。**低档就该轻。**
  - **高档 bond_4/5/6（Crowning）**：升级隆重弹层（复用离线收益 `.settle-pop` 弹窗范式）——大号称号加冕（"「命运」达成 · {角色名}"）+ 角色的脸（本地 `CharacterAvatar` 非远程图）+ 纯 CSS `@keyframes` 星屑/光晕 + 停留 4-6s 或点击关闭。bond_6 是全游戏关系顶点，做成"值得截图"的瞬间。
- **分级判据**：纯函数 `milestoneCelebrationTier(id): 'highfive'|'crowning'`（按 `BOND_MILESTONES` index ≥3 或 id 白名单），可测。
- **可见性**：✅ 天然满足——高档领取时肉眼可见隆重弹层，与低档飘字视觉可分辨。
- **升档**：零（纯展示动效）。**复用**：高（`.settle-pop` 弹窗范式、`CharacterAvatar`、`bond-float`、`dialogueTimers` 清除范式、`BOND_MILESTONES` 分级判据全现成）。
- **风险**：低。守三条：① 庆祝**纯展示零发奖**（`claimBondMilestone` 发放逻辑一字不碰，庆祝是发放成功后的视觉分支）；② Crowning 弹层的 setTimeout/rAF **登记 `dialogueTimers` + onUnmounted 清除**（pitfalls 明令）；③ 连领多个高档一次只弹一个（极端③）。**补测试锁分级判据（低档→highfive/高档→crowning）。**

### 提案 B（🔴 强烈建议 · 晒图命门）：家园基地身份卡 —— 克隆 ShareCard 范式，纯 Canvas 出图

- **形态**：家园加"晒图/分享"入口（按钮），点开一个 `HomesteadShareCard.vue`（仿 `ShareCard.vue`）：手绘 Canvas 卡（600×800 仿成绩卡），画**基地身份**——基地名 + 玩家名/等级 + 入住阵容（本地绘制的角色位：emoji/首字/稀有度色块，**非远程图**）+ 陈列完成度**正着念**（"陈列 7/7 家具"）+ 家具数 + 命中羁绊作品名 + 今日特殊角色 + 一句氛围文案。`toBlob` → `shareOrDownloadImage`（系统分享/下载回落，现成）。
- **聚合纯函数**：`buildHomesteadSnapshot(input): HomesteadSnapshot`（仿 `buildWrappedStats`，零 Vue/Pinia/DOM，`.test.ts` 覆盖），输入是从 store 读出的快照（基地名/placedCards/placedFurnitureIds/bondHits/todaySpecialId/陈列数），输出卡视图模型。
- **可见性**：✅ 满足——出的图肉眼可见，随家园状态即时反映（纯派生 live store）。
- **升档**：零（只读聚合快照）。**复用**：极高（`ShareCard.vue` 手绘范式 + `shareImage.ts` 的 `canvasToPngBlob`/`shareOrDownloadImage` + `buildWrappedStats` 纯函数范式 + `roundRect`/`createLinearGradient` 全套 Canvas 工具，几乎全套克隆）。
- **风险**：中。守四条：① **首版绝不 `drawImage` 远程角色/封面图**（cross-origin taint 让 `toBlob` 抛错，深挖③ + 代码印证），角色用本地 emoji/首字/色块绘制；② **正着念身份不念缺口**（陈列 X/7、入住 N、羁绊命中——绝不"图鉴 13%""还差 Y"，深挖② + Phase 2.3）；③ **0 入住/空基地优雅空态**（愿景文案软化，别晒羞辱空卡，极端①）；④ **绝不"分享得奖励"**（诱导分享 dark pattern + 踩货币口径，Phase 2.4）。**补聚合纯函数特征测试（0 入住/满配/正着念计数）。**

### 提案 C（🟡 可选加分 · 收官体验债）：清 dead computed + 禁用态正向提示

- **形态**：① 删 `HomesteadView.vue:377` `effectText` + `:379` `comfortBonusText` 两个 dead computed（经我核实 template 零引用）；② 家具购买/里程碑禁用态给正向"再攒 X KP 可购"提示（nice-to-have）。
- **可见性**：清死代码无 UI 变化；禁用态提示可见。**升档**：零。**复用**：高。**风险**：极低（删死代码零风险；提示走正向文案别做焦虑条）。
- **优先级**：收官轮该清死代码（合同 C 明列）；禁用态提示是 nice-to-have 有余量再做。

### 提案 D（🟢 小加分 · 打磨）：收取瞬间庆祝反馈 / 偶遇符号微打磨

- **形态**：合同点的"收取瞬间庆祝反馈 / 偶遇符号气泡微打磨"——如离线收益弹窗收下时一个轻 pop、偶遇 ♡/✧ 符号上浮曲线更顺、tap 气泡出现更弹。纯 CSS 微调。
- **可见性**：✅（手感更顺）。**升档**：零。**复用**：中。**风险**：低但**优先级低于 A**（A 是"巅峰被做平"的结构性打磨，D 是手感锦上添花）。**建议 A/B 达标后有余量再做。** 注意别破坏 usePlazaWalk 的 rAF 循环 + 偶遇符号 z-index 分层。

### 提案 E（💡 后续轮 · 不在本轮）：晒图联动 Crowning（bond_6 达成直接生成一张"命运卡"）

- **形态**：领 bond_6「命运」的 Crowning 瞬间，直接给一个"生成这一刻的纪念卡"入口——把"最重的情感时刻"和"晒图出口"缝起来（达成即可晒）。
- **为什么不在本轮首版**：A（分级庆祝）+ B（基地身份卡）各自达标即闭环；把两者缝起来是"打磨×晒图"的联动增强，属有余量的加分。**留档：这是收官两块最自然的联动点**，若 A/B 都做完且有余量，加这个能让巅峰时刻的社交传播力最大化（"我把某角色养到命运了，这是纪念卡"是极强的 flex）。
- **升档**：零（仍纯派生 + Canvas 出图）。

### 提案 F（💡 后续轮 · 唯一值得动 v21 的候选）：自定义陈列策展 roster / 偶遇相册

- **形态**：延续第 4 轮研究——玩家手选门面陈列角色（BA Recollection Lobby 式，需存 `curatedIds`）或偶遇相册跨会话累积（需存 `seenEncounterPairs`）。
- **为什么不在本轮**：收官轮是打磨 + 晒图 + 收口，无升档需求；**唯一 v21 bump 五轮全未消耗**。留给未来真做"陈列/关系做深"时（自定义策展对"收藏橱窗"主题情感价值最高）。

### 本轮推荐组合（研究员的最终建议）

**命门二选二做实**：提案 A（里程碑分级庆祝·打磨命门，High-Five/Crowning）+ 提案 B（家园基地身份卡·晒图命门，克隆 ShareCard 范式），**全部零升档纯展示/纯派生**。
**收官必做**：提案 C 的清 dead computed（合同 C 明列）+ Sprint 收官核对（S16-T1..T11 全 `[x]` / 33+ 机制无回归 / `SAVE_VERSION=20` / test 连跑 3 次）。
**有余量再加**：提案 D（收取/偶遇微打磨）或提案 C 的禁用态提示。
**明确不做**：任何联机/上传/排行榜后端（伪需求，S12 范畴）、晒图放缺口/低完成度指标（反-completionist）、"分享得奖励"任务（dark pattern）、给所有里程碑档统一动效（未解 desensitize 问题）、首版嵌远程角色图（cross-origin taint）、任何升档（收官零升档）。

---

## Prioritized Research Directions（给 Planner / Scout / Generator 的落地指向）

### 🔴 P0 — 本轮命门，必须做实

1. **【打磨】里程碑分级庆祝（High-Five vs Crowning）**：`onClaimBondMilestone` 加分级分支——bond_1/2/3 保持轻飘字（High-Five），bond_4/5/6 升级隆重弹层（Crowning：称号加冕 + 本地角色脸 + 纯 CSS 星屑光晕 + 更长停留/点击关闭）。分级判据纯函数 `milestoneCelebrationTier(id)`（按 `BOND_MILESTONES` 档位）可测。**庆祝纯展示零发奖**（`claimBondMilestone` 发放逻辑不碰）、**Crowning 定时器/rAF 登记 `dialogueTimers` + onUnmounted 清除**（pitfalls 明令）、连领一次只弹一个。理论依据：Yu-kai Chou「同音量庆祝一切会 desensitize」。
2. **【晒图】家园基地身份卡（克隆 ShareCard 范式）**：`buildHomesteadSnapshot.ts` 纯聚合函数（仿 `buildWrappedStats`，零 Vue/Pinia/DOM + `.test.ts`）+ `HomesteadShareCard.vue`（仿 `ShareCard.vue` 手绘 Canvas）+ 复用 `utils/shareImage.ts` 现成 `canvasToPngBlob`/`shareOrDownloadImage`。**首版绝不嵌远程角色/封面图**（cross-origin taint 让 `toBlob` 抛错——角色用本地 emoji/首字/色块）。**正着念身份**（基地名/阵容脸/陈列 X/7/家具数/羁绊作品/今日角色），**绝不放缺口指标**。**0 入住/空基地优雅空态**。**绝不联机/上传/排行榜、绝不"分享得奖励"。**

### 🟡 P1 — 收官必做 / 对冲极端场景

3. **收官核对（合同硬要求）**：S16-T1..T11 全 `[x]` 且与实现一致（活跃合同 `docs/plans/SPRINT.md`，勿误读 `docs/SPRINT.md` 的 S11/S12 未来项）+ S14/S15 33+ 机制无回归（战力单一 seam / facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 / 羁绊 / pity v20 / 墙钟钳位）+ `SAVE_VERSION=20`（收官零升档）+ test 连跑 3 次（基线 991）。
4. **三极端场景显式设计**：首日/0 入住晒图（愿景文案软化 + 聚合容错 0 值不崩不 NaN）/ 满配基地晒图（信息取舍，满配优雅承载）/ 连领多高档 Crowning（一次弹一个 + 需手动关）。**Scout 接地时把空态/边界列成显式验收点。**
5. **清 dead computed**：删 `HomesteadView.vue:377` `effectText` + `:379` `comfortBonusText`（经核实 template 零引用，合同 C 明列）。

### 🟢 P2 — 可选加分（有余量再做）

6. **收取瞬间/偶遇符号微打磨**（提案 D，纯 CSS 手感，别破 rAF/z 分层）。
7. **禁用态正向提示**（"再攒 X KP 可购"，走正向文案非焦虑条）。

### 💡 idea — 后续轮

8. **晒图联动 Crowning**（提案 E，bond_6 达成即生成"命运纪念卡"，打磨×晒图最自然联动点，flex 传播力最强）。
9. **自定义陈列策展 roster / 偶遇相册**（提案 F，唯一值得动 v21 的候选，五轮未消耗的 bump 留给它）。

### ★ 收官哲学表态（研究员对 5 轮弧线的正式结论）

**「在 `computeIdleYield` 单口径旁开非数值情感/收集轴」这条总设计哲学，收官时成立、自洽、闭环、无致命裂缝。** 七个概念（关系/偶遇/家具/陈列/回访/打磨/晒图）全部非数值、全部零升档（`SAVE_VERSION=20` 五轮未动）、全部落"展示墙非待办地狱"正确一侧、彼此不打架、`computeIdleYield` 五轮零污染。它不是展示层堆砌，而是"家园情感/收集维度逐层加厚、挂机数值口径始终干净"的连贯设计线。**收官轮做减法 + 放大 + 出口**：打磨放大关系轴巅峰（High-Five/Crowning 分级）、晒图给整个基地一个外化身份出口（克隆现成 Canvas 范式、晒身份不晒缺口、异步非联机）、清死代码收口。**守住『巅峰要隆重、晒图晒身份不晒缺口、社交是异步不是联机、收官零升档』，5 轮弧线就完美闭环。**

---

## 附：1-4 轮回归观察（收官轮 re-audit 全面体检，非本轮切片但供 orchestrator 收录）

> 研究员镜头下的体验坑，非 bug（bug 归 QA），仅记「审美/手感/未尽处 + 收官回归确认」。

1. **【收官回归·正向】前四轮机制经代码复核全部在位、无回归**：`usePlazaWalk` 的 rAF 循环（3 处 requestAnimationFrame/cancel）+ 偶遇引擎（24 处 encounter/bondPairs 引用）在位；`config/homestead.ts` 家具槽位（`FURNITURE_SLOTS`/`getFurnitureSlot`）在位；`SAVE_VERSION=20`（`schema.ts:57`）五轮未动；第 4 轮 991 测试基线。**收官地基稳，本轮打磨/晒图只在其上做放大 + 出口，不推倒任何东西。**
2. **【第 1 轮情感高点·本轮打磨主目标】里程碑领取"台词分级但仪式未分级"**：`MILESTONE_LINES_BY_ID` 文本已按 id 专属（bond_1 vs bond_6 台词不同，好），但 `onClaimBondMilestone` 的**视觉反馈同量级**（都是 `bond-float` 飘字）——这正是本轮提案 A 要修的"巅峰被做平"。**打磨命门就是给高档配上配得上的隆重仪式。**
3. **【晒图·现成范式印证】项目已有成熟 Canvas 晒图三件套**：`ShareCard.vue`（成绩卡手绘范式）+ `shareImage.ts`（IO 层含下载回落/系统分享/AbortError）+ `buildWrappedStats.ts`（纯聚合 + 测试）**逐条满足合同晒图硬约束**。本轮晒图是"套用范式到家园数据 + 换身份卡视觉"，非从零发明——**风险最低的一块，工程焦点应压在"卡好看到愿意转发"的视觉设计上，而非 IO/taint 这些已解决的问题上**。
4. **【第 3 轮家具审美·未尽·留档】家具 emoji 跨平台字形不一**：7 件 emoji 在真实底图上可见但跨平台长相有差。**本轮晒图若嵌本地绘制的家具 emoji 同此债，但不阻塞**（emoji 是本地字体渲染、不 taint canvas）。真实美术管线债留后续轮。
5. **【家园整体·松弛感收官确认】五轮全零升档、全非数值回报轴、`computeIdleYield` 零污染**：家园每日面虽密（委托/连签/tap/离线/设施/家具/入住/今日角色），但每一个都守住"看了不领不亏、无红点、惊喜非债务"。**收官轮的打磨（庆祝零发奖）+ 晒图（只读快照、绝不"分享得奖励"）必须延续这份松弛**——这不只是技术选择，是保护家园"松弛基地"气质的产品选择。若晒图滑成"分享得 KP 任务"、庆祝滑成"再刷解锁隆重版"，五轮守的松弛感会在收官轮被破功。

---

*报告完。研究员立场：收官轮做放大 + 出口 + 收口——打磨用 High-Five/Crowning 分级让巅峰配得上巅峰（修"同音量 desensitize"反模式）、晒图克隆现成 ShareCard 范式做"基地身份卡"（晒身份不晒缺口、异步非联机、首版不嵌远程图规避 taint）、清死代码收口。5 轮"非数值情感/收集轴"哲学收官成立、自洽、闭环、无致命裂缝；唯一 v21 bump 五轮未消耗、收官零升档，留后续轮做陈列/关系做深。*
