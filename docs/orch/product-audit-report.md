# 家园 hub 产品体验审计报告（S16 第 5 轮 · 收官 re-audit）

> Reviewer 镜头 = Product Experience Reviewer（功能体验 / 审美品味 / 产品想象力）。
> 本轮 = 5 轮弧线收官轮，切片 = **打磨 + 晒图 + 收尾**。做一次整体体验回顾 + 全面抓回归 + 聚焦第 5 轮给可落地建议。
> 审计基线：亲读 `HomesteadView.vue`(1366 行)、`homesteadDialogues.ts`、`homesteadDaily.ts`、`nurture.ts`(BOND_MILESTONES)、`homestead.ts`(FURNITURE_CATALOG)、既有出图范式 `ShareCard.vue` + `shareImage.ts` + `wrapped/buildWrappedStats.ts`，以及 `gen_status.md` / `eval.md` / SPRINT + plan。
> 审计时间：2026-07-07。**只写本报告、不改源码。**

---

## Executive Summary

### 家园整体成熟度评分：**8.3 / 10**（收官前）

一句话结论：**四轮把家园从「数值挂机面板」结结实实做成了「有人住、会说话、摆着我的东西、每天不一样」的基地**——情感回路闭环、投入可见、回访有钩，架构纪律零破窗（4 轮全零升档、零素材、零数值污染）。距离满分只差**最后一口气 = 情感高点的「隆重度」和一个「晒得出去的出口」**，这正是第 5 轮的两把刀。评分不到 9 的唯一原因就是「高峰时刻被做平了」+「家园还没有对外的脸」——两者都是本轮切片的靶心。

### 5 轮演进回顾（家园从壁纸到基地的四级跳）

| 轮次 | 一句话定调 | 落地的「情感动词」 | 成熟度贡献 |
|---|---|---|---|
| 第 1 轮 | **角色对你说话** | 里程碑家园显形+领取 / tap 互动 / 台词库 | 关系回路闭合（产好感→当场消费→有台词） |
| 第 2 轮 | **角色对彼此说话** | 同作品偶遇对话 / 多气泡并发 / 入住关系预告 | 968 番真实数据首个可见差异化落点 |
| 第 3 轮 | **你的东西出现在你家里** | 7 家具进场景 emoji 槽位 + y-sort / 陈列 X/7 | 补掉「场景是壁纸不是基地」的审美断裂 |
| 第 4 轮 | **你抽到的角色陈列在你家 + 明天回来不一样** | UR 收藏橱窗 / date-seeded 今日特殊角色 / 季节浮层 | 补掉「和最大资产零咬合」+「每天一模一样」 |
| **第 5 轮（本轮）** | **让高峰时刻隆重 + 给家园一张对外的脸** | 里程碑 fanfare 分级 / 收取庆祝 / **家园快照晒图** | 把情感高点打磨到位 + 长留存外化出口 |

**弧线判断**：节奏几乎教科书级——「情感回路 → 投入可见 → 回访/展示」的三段式，每轮都在数值口径**旁边**开非数值回报轴，从未污染 `computeIdleYield` 单口径。前四轮把「有什么」做全了；本轮该把「有多爽」和「能不能秀」补上。这是最后一轮，应当是**打磨轮**而非「再塞一个大系统」——克制地把已有的东西擦亮，比新增第 N 个功能更对。

### 本轮三句话建议

1. **情感高点打磨（🔴 最高杠杆）**：领 bond_6「命运」和领 bond_1「初识」现在**反馈一模一样**（都走 `commission-float` 那条淡绿飘字）——巅峰被做平了。给里程碑按档位分级庆祝：高档（4/5/6）要有可见的隆重感（金光/彩纸/更大的角色感言卡/停顿），低档保持轻。**这是本轮情感 ROI 最高的一刀，纯 CSS 零数值。**
2. **晒图（🟡 长留存外化出口）**：直接照抄既有 `ShareCard.vue` + `shareImage.ts` 范式（已有成熟 Canvas toBlob + 系统分享 + 下载回落，零 html2canvas、零远程图 taint）。聚合逻辑抽纯函数 `buildHomesteadSnapshot.ts`（仿 `buildWrappedStats.ts`），画**文字/emoji 统计卡**（基地名/入住数/陈列 X/7/收藏完成度/羁绊命中/今日特殊角色）。**别嵌远程角色图**（跨域 taint 让 toBlob 抛错，pitfalls 明令）。
3. **收尾清债（🟢 顺手）**：删两个 dead computed（`effectText`/`comfortBonusText` 在 `HomesteadView.vue:377/379`，模板零引用，已核实）；核对 T1-T11 全 `[x]`；连跑测试 3 次；确认零升档 SAVE_VERSION=20。

---

## 一、功能体验（整体回顾 + 回归抓取）

### 1.1 情感回路：闭环了，但高峰是平的

**做对的**：家园现在是一条完整的情感回路——挂机产好感 → 入住名单里看到「里程碑可领」红点（`claimableBondCount`）→ 一键领取发 KP + 称号 + 感言飘字 → tap 广场角色还能每日再攒好感。这条回路在第 1 轮就闭合了，四轮下来非常顺。tap 今日特殊角色说今日专属台词、tap 普通角色说常规问候，可分辨度好。

**没做对的（本轮靶心）**：**里程碑领取的反馈完全不分档**。核实 `onClaimBondMilestone`（`HomesteadView.vue:483-489`）——无论领的是 bond_1「初识」（threshold 100 / +50 KP）还是 bond_6「命运」（threshold 4000 / +1500 KP，全游戏角色关系的绝对巅峰），都走同一段 `bondFloat` → 复用 `commission-float` 那条淡绿飘字（`.bond-float` CSS `1133-1137`），3.2s 后消失。**领「命运」和领「初识」肉眼看不出任何区别**。BOND_MILESTONES 的 6 档设计（`nurture.ts:112-119`）在数值上是明确分层的（奖励 50→1500，30 倍差），但在**情感呈现上被压成一条直线**。这是 gen_status/eval 都没抓、但产品体验上最扎眼的缺口——**巅峰时刻被做轻**，正是合同第 5 轮 (A) 点名的债。

> 产品判断：一个养成/关系游戏里，「羁绊拉满」应该是玩家几十小时投入的高光。现在它和「刚认识」用同一个 UI，等于把烟花做成了火柴。这不是数值问题（数值是对的），是**呈现的隆重度**问题——纯前端动效可解，零风险高回报。

### 1.2 收藏橱窗：结构对，但「情绪」还差半格

**做对的**：`g-showcase` 橱窗把 UR 头像墙 + 完成度 chip 搬进了家园右栏，抽新卡即时反映（`showcaseCards` 读 `collection.characterCollection` 触发响应式），0 UR 优雅降级到最高稀有度、全空走引导态「抽到你的第一张角色卡，它会陈列在这里 ✨」。空态命门守得很干净，文案正着念「拥有 X」不念「还差 Y」，反 completionist 纪律到位。

**可打磨的**：橱窗现在是「一排小头像 + 一行 chip」，功能达标但**情绪偏冷**——它更像一个数据 chip 而非「战果墙」。web 研究印证：玩家愿意晒收藏是因为「社会认同 / 炫耀投入与欧气」（social validation / status display）。橱窗现在缺一个「哇」的瞬间——比如抽到**新 UR 时橱窗那一格的入场高光**（第 5 轮打磨候选，见建议 🟡-R4）。这不是命门，是把已有的橱窗从「合格」推到「想给人看」。

### 1.3 回访新鲜 + 季节：软钩子成立，暂不需动

今日特殊角色（date-seeded 恒定/次日换人/0 入住 null）+ 季节浮层（月份派生、z=3 不盖偶遇/角色、纯 CSS 不进 rAF）都干净成立。**本轮不建议动这块**——它是「明天为什么回来」的软钩子，四轮的骨架已经够用，再加内容属于「新范围」而非「打磨」。唯一可选微打磨见建议 💡-R7（把今日寄语外化到分享图上）。

### 1.4 收取瞬间：静默入账，缺一点「到手感」

核实 `runSettle`（`HomesteadView.vue:495-505`）——离线收益 ≥ `IDLE_SETTLE_MODAL_MIN_HOURS` 才弹窗，零碎收益静默入账 + 一行日志。**主动点「收取」按钮时**（`g-cta-gold`），如果不够弹窗阈值，玩家点了按钮**几乎没有即时反馈**（只有日志区一行字）。收取是家园最高频的主动动作，缺一个「到手」的微反馈（金币迸溅 / 数字跳动 / 按钮一次满足感脉冲）。这是合同 (A) 点名的「收取瞬间庆祝反馈」，属本轮打磨候选（建议 🟡-R3）。

### 1.5 回归抓取（1-4 轮机制 + S14/S15 地基）

亲读源码逐条核对，**未发现回归**：

| 机制 | 状态 | 证据 |
|---|---|---|
| 第 1 轮 里程碑显形+领取 / tap / 台词 | 在 | `residentRows`+`onClaimBondMilestone`+`pickTapDialogue` 完整 |
| 第 2 轮 偶遇 / 多气泡 / 关系预告 | 在 | `bubbleFor`+`sparks`+`is-encounter` 分支完整；`usePlazaWalk` 未被本系列改动 |
| 第 3 轮 家具进场景 / 陈列 X/7 | 在 | `placedFurniture`+`furnitureStyle`(y-sort)+`displayCount` 完整 |
| 第 4 轮 收藏橱窗 / 今日特殊 / 季节 | 在 | `showcaseCards`+`todaySpecialId`+`seasonParticles` 完整 |
| computeIdleYield 单 seam（预览=结算） | 未污染 | `hourlyYield`/`projectedYield`/`nextHourlyYield` 同喂 `facilityLevels`+`placedAnimeNames` |
| comfort 软加成 / 家具 comfort 汇入 | 在 | `homeEffect.comfort += furnitureStore.getComfort()`（1149） |
| 羁绊 bondHits 显形（同源） | 在 | `bondHits`/`bondBonusPct` 读 `hourlyYield`（口径同源） |
| 墙钟回拨钳位 / 封顶进度 | 在 | `capProgress`/`capReached`/`elapsedMs` 钳位逻辑完整 |
| setTimeout/rAF 登记清除 | 合规 | `commissionTimers`/`dialogueTimers`/`idleTimer` 全在 `onUnmounted` 清 |
| SAVE_VERSION | =20 零升档 | 4 轮全派生/date-seeded，本轮打磨/晒图天然零存档 |

**回归结论：地基稳固，可以放心在上面做打磨层。** 唯一「预存在债」是两个 dead computed（下节 1.6），非回归、非本轮引入。

### 1.6 收尾债（已核实，本轮 C 清）

- **Dead computed（核实命中）**：`HomesteadView.vue:377` `const effectText`（top-level）和 `:379` `const comfortBonusText` **模板零引用**——`grep` 确认模板只用 `row.effectText`（`residentRows` 内部字段，`:873`）和 `comfortPctText(homeEffect.comfort)`（`:804`）。这两个 top-level computed 是第 2-3 轮重构残留，删掉零风险。**建议本轮顺手清。**

---

## 二、审美品味

### 2.1 已有的审美水准：高且一致

- **颜色纪律零破窗**：全程语义令牌（`--c-surface`/`--c-ink`/`--c-accent`/`--c-highlight`），无 `text-white` 压浅底、无动态拼色类、透明度用 `/` 斜杠。橱窗 chip = accent-soft 底 + accent-2 文，今日点名 = highlight 淡底，名牌 = surface 卡片。审美一致性很强。
- **零素材路线走得漂亮**：emoji 家具 + CSS 季节粒子 + emoji 徽章，在「全仓零家具美术」的约束下把可见性做出来了，且没有廉价感——`furniture-icon` 带 drop-shadow、`furniture-tag` 是 surface 名牌卡、今日徽章 `todaybob` 呼吸浮动。**克制且体面。**
- **深度感做到位**：家具/角色同一 `zIndex=round(y*10)` y-sort，站前后正确遮挡；`depthScale` 按 y 缩放。这是「基地感」的关键，做对了。

### 2.2 审美短板（本轮可补）

1. **情感层级扁平（最大短板）**：如 1.1 所述，UI 上「高峰=日常」。审美上，家园缺一套**明确的「重要度阶梯」视觉语言**——什么该轻描淡写（tap 闲聊）、什么该隆重（羁绊拉满 / 首张 UR / 全清委托）。现在几乎所有正反馈都用同一档「淡色飘字」。**建议本轮引入 1-2 档「隆重反馈」样式**（高档里程碑 fanfare），把阶梯拉开。
2. **右栏信息密度高、缺呼吸的高光位**：右栏堆了挂机大卡/橱窗/设施/委托/家具/入住名单 6 块，信息密度偏高。橱窗虽然是「战果墙」但视觉重量和一个设施卡差不多。**晒图入口正好可以给橱窗一个「秀出去」的出口按钮**，顺带抬升橱窗的存在感。
3. **场景左半场偏空**：家具在固定槽位、角色漫步，但 16:9 场景的视觉重心仍偏「壁纸 + 零散角色」。这是家具进场景一期的已知留白（plan 提到形态 C「场景内 UR 展示台放左半场平衡视觉重心」留后续）——**本轮不必碰**，但晒图恰好能把「场景快照感」用统计卡的形式补偿性地外化。

### 2.3 晒图的审美方向（关键）

既有 `ShareCard.vue` 的成绩卡审美（`600×800`、深紫渐变 + 金/青/橙品牌色、顶部光带、2×3 指标网格、大数字主指标）**已经很成熟且脱离皮肤 token 独立成图**（属图片压片类合理固定色例外）。家园快照应当**复用这套视觉骨架**但换成「家园」的内容与调性：

- **调性**：成绩卡是「宅修养成绩单」（冷酷数据炫耀）；家园快照应当更**暖、更「我的窝」**——暖色渐变（呼应 PCR 暖色城镇 + 夏日主题）、更强调「入住的角色 + 我的基地名」的归属感，而非纯 KPI。
- **一句话人格化**：成绩卡有「品味身份带」；家园快照可以有一句**date-seeded 派生的「今日基地寄语」**（如「今天 XX 心情特别好」）——把「回访新鲜」这个第 4 轮的软钩子外化到分享图上，形成传播钩子。

---

## 三、产品想象力

### 3.1 家园现在「是什么」，本轮该让它「成为什么」

四轮后，家园已经是一个**活的、有人住的、每天不一样的基地**。它唯一还缺的是**「对外的一张脸」**——一个能让玩家截图/生成图发到群里、朋友圈、社区的东西。web 研究非常明确：玩家晒收藏的核心驱动是**社会认同与炫耀投入**（social validation / status display / 「badge of honor」）。家园快照就是把「我经营了 N 天、住了 6 个角色、陈列满了、羁绊拉满」这份投入**外化成可传播的图**。这是**长留存的外化出口**——ACNH 的「梦境门牌」、Wrapped 的「年度总结卡」都是同一个产品直觉：让玩家的投入变成可炫耀的资产。

### 3.2 晒图该放什么最想被发出去（版式建议）

优先级从高到低（一张卡放得下的高价值信息）：

1. **基地名 + 入住角色阵容**（emoji 头像位或纯名字列表，**别嵌远程角色图**——taint 陷阱）——这是「我的窝、我的人」的归属核心。
2. **陈列完成度 X/7 家具 + 收藏完成度**（UR X/N · 图鉴 X%）——投入的可炫耀量化。
3. **羁绊命中**（「XX ×2 · YY ×3」同作品同住）——本产品 968 番真实数据的差异化炫耀点，别人的图和你的不一样。
4. **今日特殊角色寄语**（date-seeded）——传播钩子 + 每天生成的图都不同（鼓励重复晒）。
5. **一句品牌页脚 + 基地舒适度/知识点**（本地可得数据）——留存叙事与品牌回流。

**版式**：竖版 `600×800`（复用 ShareCard 尺寸，适配手机竖屏分享），暖色渐变，顶部基地名大标题，中部阵容 + 完成度网格，底部今日寄语 + 页脚。**全文字/emoji/CSS-Canvas 绘制，零远程图。**

### 3.3 更远的想象（留 backlog，非本轮）

- **家园快照带二维码/短码**（真「梦境门牌」，需后端，S12+ 多人化才有意义）——本轮不做。
- **偶遇相册**（记已看过哪些偶遇对，唯一真需 v21 的候选）——三审一致判定价值低于本轮切片，留 backlog。
- **主题房 / 成套完成度评分**（家具扩容后）——留后续 sprint。

---

## 四、Prioritized Recommendations（聚焦第 5 轮，可落地）

> 图例：🔴 本轮必做（情感高点/晒图命门） · 🟡 强烈建议（打磨/晒图增强） · 🟢 收尾清债 · 💡 nice-to-have。
> 全部纯前端 · 零数值 · 零升档 · 零素材（emoji/CSS/Canvas 自绘），符合本轮硬约束。

### 🔴 R1 — 里程碑庆祝按档位分级（情感高点打磨，最高 ROI）
**问题**：领 bond_6「命运」和领 bond_1「初识」反馈一模一样（都走 `.bond-float` 淡绿飘字，`HomesteadView.vue:483-489`+`1133-1137`）。巅峰被做平。
**落地**：给 `onClaimBondMilestone` 按 `milestone` 档位分级——
- 低档（bond_1/2/3）：保持现有轻飘字。
- 高档（bond_4/5/6）：升级为一个**居中的庆祝浮层**（角色名 + 称号 + 感言 + 金色描边/彩纸 CSS 动效 + 略长停留），bond_6「命运」再加一档最隆重（如全屏淡金闪 + 更大的角色感言卡）。纯 CSS `@keyframes`，setTimeout 登记 `dialogueTimers` 清除。
**验收**：领 bond_1 vs bond_6 肉眼可辨的隆重度差异；零数值、零存档；测试连跑 3 次绿。
**为什么本轮**：合同 (A) 第一条明确点名「高档里程碑隆重庆祝」，ROI 最高、风险最低（纯动效）。第 2 轮 negotiation N-1 / evolution E6 也已排到本轮。

### 🔴 R2 — 家园快照 / 一键晒图（长留存外化出口）
**落地**：
1. 新增纯函数 `wrapped/buildHomesteadSnapshot.ts`（仿 `buildWrappedStats.ts`，零 Vue/Pinia/DOM，可单测）——聚合基地名/入住数+阵容名/陈列 X/7/收藏 UR owned·total/图鉴%/羁绊命中/今日特殊角色名/舒适度。
2. 新增 `components/homestead/HomesteadShareCard.vue`（仿 `ShareCard.vue`）——Canvas 手绘暖色统计卡 → 复用 `shareImage.ts` 的 `canvasToPngBlob`+`shareOrDownloadImage`（系统分享 + 下载回落，**已现成，零新增基建**）。
3. `HomesteadView.vue` 加一个晒图入口按钮（建议放橱窗卡头，顺带抬升橱窗存在感）。
**硬约束（pitfalls 明令，务必守）**：**别引 html2canvas**；**绝不嵌远程角色/封面图**（跨域 taint 让 toBlob 抛错）——用文字/emoji/CSS-Canvas 绘制的统计卡；聚合逻辑抽纯函数便于单测。
**验收**：点晒图 → 生成一张纯本地数据的暖色家园卡 → 系统分享或下载 PNG 成功；0 入住/0 收藏优雅（不炸、有引导文案）；补 `buildHomesteadSnapshot.test.ts` 特征测试；零升档。

### 🟡 R3 — 收取瞬间到手反馈（打磨）
**问题**：主动点「收取」但不够弹窗阈值时，几乎无即时反馈（`runSettle:495-505` 只加一行日志）。
**落地**：点收取时给按钮一次满足感脉冲 + 收益数字轻跳/金色微迸溅（纯 CSS，`g-cta-gold` 已有 `:active`，可扩一个成功态动效 + 一个「+X KP」小飘字）。零数值改（只是把已发生的入账可视化）。
**为什么**：合同 (A) 点名「收取瞬间庆祝反馈」；收取是最高频主动动作，值得一点手感。

### 🟡 R4 — 新 UR 入橱窗高光（打磨，可选）
**落地**：`showcaseCards` 里最新拥有的那张（或本次会话新增的）给一个入场高光/描边脉冲（纯 CSS）。把橱窗从「冷 chip」推向「战果墙」。
**为什么**：web 研究——收藏炫耀的爽点在「新到手的那一下」。若 R1/R2 吃满预算可降级到 💡。

### 🟢 R5 — 清 dead computed（收尾）
删 `HomesteadView.vue:377` `effectText` + `:379` `comfortBonusText`（模板零引用，已核实）。零风险。合同 (C) 点名。

### 🟢 R6 — Sprint 收官核对（本轮必做的收官任务）
- 核对主清单 + T1-T11(+本轮新 T) 全 `[x]` 且与实现一致（grep 未勾选项零命中）。
- S14/S15 33+ 项机制无回归（本报告 §1.5 已抽查主干无回归，Evaluator 亲验 diff）。
- 确认 SAVE_VERSION=20 零升档（晒图/打磨天然零存档）。
- `npm run test` 连跑 3 次全绿（基线 991，+晒图纯函数测试后应升）。

### 💡 R7 — 今日寄语上分享图 + 偶遇符号/气泡微打磨（想象力增强）
把 date-seeded「今日特殊角色寄语」画到家园快照上（每天生成的图不同 → 鼓励重复晒）；顺带偶遇符号/气泡的微打磨（合同 A 点名）。纯 config/派生/CSS，非命门。

---

## 附：给 Planner / Generator 的一句话

**这是收官轮，克制比堆功能更对。** 前四轮把「有什么」做全了，本轮只需两把刀：**R1 把情感高点擦到发亮**（纯 CSS 分级庆祝，最高 ROI），**R2 给家园一张对外的脸**（直接抄 `ShareCard`+`shareImage` 范式，零新基建，守住「别引 html2canvas / 别嵌远程图」两条 pitfalls）。R3/R4 有余量再做，R5/R6 顺手收尾。全轮零数值、零升档、零素材——和前四轮同一条纪律线收官。

---

## Sources（web 研究引用）

- [Why Gacha Games Are So Addictive: Psychology, Rewards, and Player Behavior](https://www.gamenguide.com/articles/108013/20260515/why-gacha-games-are-so-addictive-psychology-rewards-player-behavior.htm) — 社会认同/炫耀投入驱动晒收藏（social validation / status display / badge of honor）
- [The User Experience of Gacha Games: A Deep Dive into Engagement and Addiction](https://www.cjdyas.design/blog/the-user-experience-of-gacha-games-a-deep-dive-into-engagement-and-addiction) — 收藏完成度与成就展示的心理驱动
- [Animal Crossing New Horizons - All Island Milestones](https://www.nettosgameroom.com/2020/03/animal-crossing-new-horizons-all-island.html) — 里程碑/稀有奖励作为记忆点的设计范式（K.K. 演出/岛屿里程碑）
