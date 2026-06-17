# AnimePlay 进化审计报告 — Evolution Round 5（小游戏扩展第 1 轮）

> Reviewer 视角：产品策略师，不是 QA。本轮服务用户的明确方向——把小游戏做成**统一的「🎮 小游戏」中心**，**把现有「🎭 猜角色」迁进去**，并**至少再扩展 2 个休闲小游戏**。
> 日期：2026-06-17 ｜ 全局迭代 5 / Evolution 第 1 轮（5 轮 run）｜ 报告是本轮 Scout/Planner 的需求源。

---

## Executive Summary

**产品进化成熟度：8.0 / 10**

AnimePlay 已经不是 demo，也不是原型——它是一个**功能密度极高的早期成熟产品**：8 大玩法、完整经济闭环（券/知识点/抽卡保底/商店限购）、留存引擎（每日+周任务、连续登录递增、成就、图鉴里程碑、跨系统红点）、新人 onboarding、可分享 Wrapped 成绩卡、5 套皮肤、305+ 特征测试与干净的 engine 分层。绝大多数早期产品死在"没东西玩"，AnimePlay 死不了——它东西多到需要导航。

但正因为如此，**当前最大的进化机会恰恰在用户指定的方向：小游戏**。原因有三个层次：

1. **结构性孤岛**：唯一的休闲小游戏「猜角色」是个**顶级路由孤儿**（`/guess`，导航项「🎭 猜角色」）。它和产品其余部分的留存机器（每日任务、成就、红点、积分榜）**几乎零联动**——猜对只触发 1 个成就检测点和知识点兑换，**没有进每日任务、没有进周任务、没有红点、没有积分榜、没有每日挑战**。它是一座功能完整但与大陆断开的岛。

2. **品类错配**：猜角色是产品里**唯一一个"5 分钟回访、随手能玩、可炫耀"的轻量循环**，而恰恰是这种循环（Wordle/Higher-Lower 式）在 2020 年后成为留存与口碑传播的最强引擎。产品有完整的重度玩法（对战/养成/塔），却只有 1 个轻度循环，且没把它做成"每日回访的理由"。

3. **数据金矿没开采**：产品手握 250 部番剧的真实 `rating_score`/`rating_rank`/`date` + 665 个角色的真实 `popularity_score`/`anime_count`——这是一座专门为休闲 quiz/Higher-Lower/排序游戏量身打造的数据矿，目前**只被猜角色用了一张图片**。

**结论与本轮主张**：把"猜角色"从孤岛升级成「🎮 小游戏中心」（Hub），是一笔确定性极高的高 ROI 投资——它把现有资产（猜角色组件、真实数据、经济/任务/成就/红点系统）重新组合，几乎不需要新的底层能力。本轮硬性交付（Hub + 猜角色迁入 + ≥2 新游戏）方向完全正确，下文给出**具体选型与可落地设计**。

---

## Phase 1：核心完整性

### 1.1 小游戏当前循环分析（能做什么 / 缺什么）

**现状（读 `stores/guess.ts` / `components/GuessCharacter.vue` / `views/GuessView.vue` / `router/index.ts` / `App.vue` 确认）**：

- **唯一游戏**：猜角色。4 阶段像素化（8→16→32→原图），模糊匹配（繁简/大小写/双向 includes），按稀有度发基础分，按尝试次数衰减倍率（×1 / ×0.75 / ×0.5 / ×0.25），`score/2` 兑换知识点。
- **经济**：走 `userStore.submitGuess` → `profile.earn('knowledgePoints', floor(score/2))`，已正确接入主经济唯一入口（不绕过 spend/earn）。**经济防刷靠 score÷2 衰减**——没有每日上限，但单局产出小（最高 UR 100 分 → 50 知识点），刷分性价比低。
- **持久化**：仅 `highScore` 进存档（schema v7 的 `guess: { highScore }`）。`gameRecords`（对局历史）是会话态，刷新即丢。
- **联动**：仅 `useAchievementsStore().check('guess')` 一处。

**核心循环是闭环的，但它是一个"孤立的闭环"**——玩完一局，对产品其它系统没有任何涟漪。

### 1.2 缺失的关键环节（Hub 化要补的）

| 缺口 | 现状 | 影响 |
|---|---|---|
| **统一入口** | 猜角色是顶级路由，未来每加一个游戏就要加一个顶级导航项 | 导航爆炸；游戏之间无归属感；无"小游戏"这个产品概念 |
| **游戏选择器 / Hub** | 无 | 玩家没有"小游戏厅"心智；新游戏没有展示位 |
| **每日挑战** | 无（每局随机种子，无"今天的题"） | 失去 Wordle/Higher-Lower 最强的回访钩子 |
| **连胜 streak 持久化** | 猜角色无 streak 概念；成就内有 guess streak 但猜错即清且不持久 | 失去"维持连胜"的心流驱动 |
| **积分榜 / 历史统计** | `gameRecords` 会话态、刷新即丢；无累计游玩数/胜率/各游戏最高分汇总 | 玩家看不到自己的"成长"，无炫耀资本 |
| **进每日/周任务** | 猜角色不触发 `markProgress` | 玩小游戏不算"今日任务"，错失把小游戏纳入留存机器的机会 |
| **红点信号** | 小游戏导航项无红点 | 玩家不知道"今天有新挑战可玩" |
| **空状态 / 新人引导** | 猜角色有自己的空态，但 Hub 级空态/引导缺失 | 新玩家不知道有几个游戏可玩 |

### 1.3 边界与空状态

猜角色本身的空态/错误态做得不错（数据加载态、图片加载失败占位、未开始 CTA）。**Hub 级别**需要新建：游戏选择卡片（每张展示游戏名/图标/最高分/今日是否已玩），以及"今日推荐"或"每日挑战"入口。

---

## Phase 2：竞争差距（休闲小游戏品类研究）

研究了 4 类与本产品最相关的休闲小游戏品类，提炼"让小游戏黏性高、可分享、可日常回访"的设计要素。

### 2.1 Higher / Lower 类（playhigherlower.com、AO3dle、各类 "X-dle"）

- **核心循环**：给两项，猜下一项数值更高/更低，**连对累积 streak**，错一次即结算。极简、极易上瘾。
- **关键设计**：① **每日挑战**——午夜刷新，**全员同一套题/同一随机种子**，"你今天连对几个"可直接和朋友比；② **endless 无尽模式**——和自己的最高 streak 比；③ **leaderboard**——账号保存分数登榜。
- **对本产品的启示**：这是**最接地、最易上瘾、最适配真实数据**的品类（用 `popularity_score`/`rating_rank`/`date`）。**"每日同种子挑战"是产品目前完全缺失的桌上赌注**。

来源：[playhigherlower.com](https://playhigherlower.com/)、[playhigherlower.com/daily](https://playhigherlower.com/daily)、[AO3dle Daily](https://ao3dle.com/blog/ao3dle-daily-higher-lower-game/)

### 2.2 Wordle 式每日挑战

- **founder 原话**：限制"每天一题"是病毒式爆发的**突破点**——**稀缺性**把"玩"变成"仪式"，可 savored、可 finishable。
- **可分享性**：所有人猜同一个词，**分享的是过程（emoji 网格）不只是结果**——这是爆炸式传播的核心。
- **难度甜区**：研究表明挑战难度**高于玩家当前水平约 4–6%** 时心流最深，Wordle 几乎精准命中。
- **心理满足**：自主性（autonomy）+ 归属感（belongingness）——分享成绩让人感到与社群连接。
- **对本产品的启示**：① **每日挑战必须"全员同题"**（用日期当种子，纯前端可做，零后端）；② **结果要可分享**——产品已有 Canvas Wrapped 成绩卡的先例（`E3-T2`），小游戏成绩同款可做"今日战绩卡"；③ 难度要可控（Higher-Lower 用数值差距大小天然分档）。

来源：[CNBC: 心理学](https://www.cnbc.com/2022/02/15/bite-sized-fun-the-psychology-behind-your-sudden-wordle-obsession.html)、[MoEngage: 留存](https://www.moengage.com/blog/wordle-viral-growth-story/)、[CBS: 为何流行](https://www.cbsnews.com/minnesota/news/what-is-wordle/)

### 2.3 Sporcle / 番剧 Quiz

- 全球最大 quiz 社区有大量 "Guess the Anime / Guess the Anime Character" quiz，长期高人气，证明**番剧猜谜本身有稳定需求**。
- 形态：限时/不限时、看单张角色图猜番剧、看番剧猜角色。
- **对本产品的启示**：本产品已有"看角色猜角色"，**对称地缺"看番剧封面猜番剧"和"4 选 1 知识 quiz"**——而产品有 250 部番剧的真实元数据，题库可全自动派生，零人工出题成本。

来源：[Sporcle: Guess the Anime Character](https://www.sporcle.com/games/beeginey/guess-the-anime-character)、[Sporcle: Anime by a Single Character](https://www.sporcle.com/games/Schicky/anime-by-character-slideshow)、[Sporcle anime tag](https://www.sporcle.com/games/tags/anime)

### 2.4 HoYoLAB / Genshin 网页活动 + 每日签到

- **机制**：游戏厂商在主游戏之外做**网页小活动/网页小游戏**，玩完发**游戏内货币**（原石/星琼）+ **每日签到**领奖。轻量网页活动是引流主游戏、维持日活的工具。
- **对本产品的启示**：本产品已经有"每日登录奖励 + 连续登录递增"（`B1`）——**这套签到机器现成，只需把"玩 1 局小游戏"接进每日任务、把"今日挑战完成"接进红点**，就能复用现成留存基建，让小游戏成为日活引擎的一部分。

来源：[HoYoLAB 每日签到 Wiki](https://genshin-impact.fandom.com/wiki/HoYoLAB_Community_Daily_Check-In)、[Game8 签到指南](https://game8.co/games/Genshin-Impact/archives/321404)

### 2.5 记忆翻牌 / 配对

- 经典、零学习成本、视觉型；计时/步数计分；"和自己记录比"。Steam/网页/Scratch 都有大量番剧版本，证明视觉配对 + 番剧封面是稳定组合。
- **对本产品的启示**：复用 665 张角色图/250 张番剧封面，纯前端、零数据派生成本，是 Hub 里的"轻松向"补充。

来源：[Anime - Match The Memory (Steam)](https://store.steampowered.com/app/1428290/Anime__Match_The_Memory/)、[Match The Memory: Anime](https://matchthememory.com/Stephens-anime)

### 2.6 本产品缺的"桌上赌注"（table stakes）小结

竞品普遍有、本产品没有的：**① 每日挑战（全员同种子）｜② 连胜 streak 持久化 + 历史最高｜③ 积分榜/累计统计｜④ 可分享成绩｜⑤ 多个轻量游戏组成的"游戏厅"**。这五项正是本轮 Hub 化要补齐的核心。

---

## Phase 3：功能深度（小游戏中心怎么有深度）

把小游戏从"1 个孤岛"做成"有深度的中心"，深度来自三层叠加：

### 3.1 横向深度：多游戏组成游戏厅

Hub = 游戏选择器 + 渲染选中游戏。每个游戏是可插拔模块（统一接口：`id / 名称 / 图标 / 组件 / 最高分读取 / 是否已接每日挑战`）。第一批 3 个（猜角色 + 2 新），结构上为第 7–9 轮继续加游戏留好插槽。

### 3.2 纵向深度：每个游戏的"再玩一次"驱动

- **endless / streak 模式**：和自己的历史最高比（Higher-Lower 天生适配）。
- **每日挑战模式**：用日期做种子，全员同题，**每个游戏每天一把**，完成进红点/任务，**可分享今日战绩**。这是"每天打开"的核心钩子。
- **难度甜区**：Higher-Lower 通过数值差距控制难度（差距越小越难）；Quiz 通过干扰项相近度控制；猜番剧/猜角色已有 4 阶段像素化天然分档。

### 3.3 系统深度：接入产品现有留存机器（最高 ROI，几乎零新基建）

产品**已经有**一整套留存基建，小游戏只需"接线"即可获得系统级深度：

| 现有系统 | 接线方式 | 文件锚点 |
|---|---|---|
| **每日/周任务** | 新增任务类型 `minigame`（"今日玩 1 局小游戏" / "本周玩 10 局"），在 Hub 提交结算处 `markProgress('minigame', 1)` | `config/dailyTasks.ts` 加 `DailyTaskType` + 任务定义；埋点仿 `userStore.submitGuess` |
| **成就系统** | 加小游戏成就（首胜/连胜 10/各游戏满分/每日挑战连续 7 天） | `stores/achievements.ts` `check('guess')` 已有先例，扩 `check('minigame', {...})` |
| **跨系统红点** | 小游戏导航项加红点：今日挑战未玩/有新游戏 | `App.vue` 已有 `homeHasSignal`/`collectionsHasSignal` 派生红点先例，加 `minigamesHasSignal` |
| **积分/统计** | Hub 顶部展示各游戏最高分 + 累计游玩数 + 今日挑战连胜 | 存档扩 `minigames` 域（见 Technical Health） |
| **可分享成绩卡** | 每日挑战完成生成 Canvas 战绩卡 | `E3-T2` Wrapped 成绩卡的 `toBlob+a.download` 模式可复用 |
| **经济** | 猜对/达标走 `profile.earn`，设每日上限或递减防刷 | `submitGuess` 模式直接复制 |

**这一层是本报告最强的论点**：小游戏中心的"深度"几乎不需要新造系统——产品在 Evo 1–4 已经把任务/成就/红点/分享/经济全造好了，**小游戏只是这些系统的新接入点**。这让 Hub 化的 ROI 异常高。

---

## Phase 4：差异化与 Wow Factor

### 4.1 小游戏提案（≥4 个，按"可行性 + 趣味 + ROI"排序）

> 数据已验证（读 `data/selected_anime` / `data/selected_character`）：250 番剧（`rating_score` 7.1–9.2 中位 7.8，`rating_rank` 1–250，`date` 1993–2025）；665 角色（`popularity_score` 13–4050 中位 286，`anime_count` 1–8）。**关键洞察：`rating_score` 区间太窄（几乎都 7–9），单独用它做 Higher-Lower 接近抛硬币、不好玩；`popularity_score`、`rating_rank`、`date` 区间宽，才是好维度。**

---

#### 提案 #1 ★ 高低牌 Higher / Lower（**强烈推荐为新游戏 #1**）

- **一句话玩法**：屏幕给两张卡，左边亮数值，猜右边的"人气/排名/放送年"比左边**更高还是更低**，连对累积 streak，错一次结算。
- **用什么数据**：
  - **角色模式**：`popularity_score`（13–4050，区间宽、辨识度高，**首选维度**）。
  - **番剧模式**：`rating_rank`（1–250，排名越小越强，反直觉更刺激）或 `date`（放送年，谁更早）。
  - **避坑**：不要用裸 `rating_score`（7.1–9.2 太挤，体验差）。如要用评分，应展示"谁排名更前"而非"谁分更高"。
- **计分与经济**：streak 即分数；每达成里程碑（5/10/20 连对）走 `profile.earn` 发知识点，**设每日产出上限**（如每日前 3 局计入经济，超出只记 streak 不发奖），防无限刷。
- **为什么好玩**：① 极易上瘾（竞品验证）；② **零图片依赖**（纯数值，加载快、稳，不怕图挂）；③ 完美适配真实数据，**别的番剧游戏抄不到本产品这套 Bangumi 真实人气/排名数据**——天然差异化；④ 最适合做"每日挑战 + 全员同种子"。
- **复杂度**：**低**。纯逻辑（取卡、比数值、判对错、累 streak）可抽纯函数 + 注入 RNG 配特征测试；UI 比猜角色简单（无 Canvas 像素化）。

#### 提案 #2 ★ 番剧问答 Quiz（4 选 1）（**推荐为新游戏 #2 候选 A**）

- **一句话玩法**：4 选 1 选择题，每局 N 题，答对得分、答错或超时结束。题型从真实数据全自动派生：
  - "下列角色谁出自《X》？"（用 `anime_names`/`anime_ids`）
  - "《X》是哪一年放送的？"（用 `date`，干扰项 ±2 年）
  - "下列番剧哪部 Bangumi 排名最高？"（用 `rating_rank`）
  - "下列角色谁人气最高？"（用 `popularity_score`）
- **用什么数据**：全部真实字段，**题库零人工成本、可无限生成**。
- **计分与经济**：连对加分、每题倒计时加成；过关走 `profile.earn`，每日上限同上。
- **为什么好玩**：① 知识型成就感（宅知识自测）；② Sporcle 验证番剧 quiz 长期有需求；③ 题型多样、可做"每日 5 题"挑战。
- **复杂度**：**中**。题目生成器是纯函数（给数据 + RNG → 题目 + 干扰项），需注意干扰项去重/合理性；UI 简单（4 个按钮）。

#### 提案 #3 ★ 猜番剧（剪影 / 像素）（**推荐为新游戏 #2 候选 B，与猜角色对称、复用率最高**）

- **一句话玩法**：复刻猜角色机制，但猜的是**番剧封面**（`/data/images/anime/{id}.jpg`），4 阶段像素化逐步清晰，输入番剧名模糊匹配。
- **用什么数据**：番剧 `name`/`original_name` + 封面图 + 稀有度（发分逻辑可直接套猜角色）。
- **计分与经济**：与猜角色完全对称，`submitGuess` 逻辑可泛化复用。
- **为什么好玩**：与猜角色形成"角色 / 番剧"对子，玩家有"全都玩一遍"的收集欲。
- **复杂度**：**低–中**。`GuessCharacter.vue` 的 Canvas 像素化逻辑可抽成共享 composable，两个游戏共用——**这是迁入 Hub 时顺手做的最佳重构**。

#### 提案 #4 年代排序 Timeline（**Nice-to-have / 第 6–7 轮**）

- **一句话玩法**：给 4 张番剧卡，拖拽按**放送年**从早到晚排序，全对得分。
- **用什么数据**：`date`（1993–2025，区间宽，适合排序）。复用 `B2` 年表的数据思路。
- **计分与经济**：全对/部分对计分；过关走 `profile.earn`。
- **为什么好玩**：考"番剧史"知识，和 Higher-Lower 互补（一个二选、一个全排）。
- **复杂度**：**中**。拖拽排序交互 + 移动端适配要小心（产品当前桌面优先）。

#### 提案 #5 记忆翻牌 Memory Match（**Nice-to-have / 视觉向补充**）

- **一句话玩法**：番剧封面配对翻牌，计时/步数计分。
- **用什么数据**：番剧/角色封面图。
- **复杂度**：**中**。纯前端、零数据派生，但与"宅知识"调性弱关联，优先级低于 #1–#3。

### 4.2 哪个最能"用了回不去"

**高低牌 + 每日挑战（同种子）**。理由：① 它把产品**独有的 Bangumi 真实人气/排名数据**变成游戏机制，这是任何竞品都复制不了的护城河；② Higher-Lower 是被反复验证的成瘾循环；③ "每天一把、全员同题、连对几个发朋友圈"直接命中 Wordle 的病毒式传播公式。**单独看，高低牌是本轮 ROI 最高、最该第一个做的新游戏。**

### 4.3 可分享 / 口碑传播点

- **今日挑战战绩卡**：每日挑战完成生成 Canvas 图（"我今天高低牌连对 14 个 / 番剧 Quiz 满分"），复用 `E3-T2` 的 `toBlob+a.download`。这是把小游戏变成传播喇叭的关键——**用户会因为"晒今日 streak"而把产品带出去**。
- **"全员同题"对比**：朋友间天然产生"你今天几个？我 12"的对话——这是 Wordle 传播的核心机制，纯前端用日期种子即可实现。

### 4.4 值得删掉 / 简化的东西（≥1）

- **猜角色的会话态 `gameRecords`（对局历史列表）**：当前刷新即丢、占用组件大量篇幅，价值低（玩家更在意"最高分/连胜/今日挑战结果"而非逐局流水）。迁入 Hub 时**建议砍掉逐局历史 UI**，替换为 Hub 级的"各游戏最高分 + 今日挑战状态"汇总卡——信息密度更高、更值得持久化。
- **`stores/guess.ts` 里 `getOriginalImageUrl()` 是死代码**（永远返回 `''`），迁移时顺手清理。

---

## Technical Health（小游戏 Hub 的架构落点）

> 不是全面审计，只关注"功能越堆越多时哪些会成瓶颈"+ 落点建议（别破 engine 纯净 / 依赖只向下）。

### 架构落点建议

1. **Hub 路由**：新建 `/minigames`（`views/MiniGamesView.vue` 作 Hub 容器 = 游戏选择器 + 渲染选中游戏）。导航项「🎮 小游戏」**取代**「🎭 猜角色」；`/guess` 保留为 `redirect: '/minigames'` 兼容（router 改 1 处即可）。`GuessCharacter.vue`（501 行）**原样迁入不重写**，作为 Hub 的一个子游戏。

2. **新游戏纯逻辑放哪**：
   - **猜角色**已有先例：逻辑在 `stores/guess.ts`，`Math.random` 在 store 内（既有先例）。
   - **新游戏**：纯判定逻辑（高低牌比大小、Quiz 出题与判分、年代排序校验）**尽量抽成纯函数 + 注入 RNG + 特征测试**，符合架构铁律。建议放 `stores/minigames/`（如 `higherLower.ts` 的纯函数部分）而非污染 `engine/`——engine 当前定位是"对战/抽卡/养成规则"，小游戏逻辑更像 store 编排层。
   - **Canvas 像素化**（猜角色 + 猜番剧共用）抽成共享 composable（如 `composables/usePixelate.ts`），避免两个游戏各写一份。

3. **经济防刷（重点）**：
   - 奖励**只走 `profile.earn`**（唯一货币入口，别绕过）。
   - 每个游戏设**每日产出上限或递减**：仿猜角色 `score÷2`，再加"每日前 N 局计经济、超出只记分不发奖"或"当日累计产出封顶"。高低牌尤其要防——streak 可以很长，发奖必须按里程碑且封顶，否则一局连对 50 个能刷爆知识点。
   - 每日挑战的"全员同种子"用**日期字符串做 seed**（不依赖后端），但**每日挑战的发奖必须每天只发一次**（仿登录奖励的 `lastLoginDate` 模式，存"上次完成的日期"）。

4. **持久化（升 schema v7 → v8）**：
   - 新增 `minigames` 域：各游戏 `highScore`/`bestStreak` + `dailyChallenge` 完成日期 + 累计游玩数。**按既有"三处同改 + 迁移 + 测试"**：`infra/persistence/schema.ts`（加 `MiniGamesSave` 接口 + `createDefaultMiniGames()`）/ `migrations.ts`（旧档补缺省）/ `stores/persistence.ts`（装配器）。
   - **建议保留现有 `guess: { highScore }` 不动、新游戏单开域**（迁移更安全，不动 v7 既有断言）。设备级 UI 偏好（如"上次选的游戏"）用 localStorage，不升 schema。

5. **颜色 / 样式铁律**：新组件一律语义类（`bg-surface`/`text-ink`/`accent`），按钮用 `.btn-*`，禁 `text-white` 压浅底、禁动态色类拼接。稀有度色是既有固定色例外（注意猜角色现用了 `rarityColors` 内联 hex + 一处 `text-white` 压稀有度底，属图片压片白字类例外，可沿用）。

6. **不会成为瓶颈的点**：数据量小（250+665），纯前端计算无性能问题；无 N+1；测试基建成熟（305+ 特征测试，纯函数易测）。**唯一要盯的**是 Canvas 像素化在两个游戏间的复用别复制粘贴，以及每日挑战种子逻辑的时区一致性（复用 `daily.ts` 已验证的 `todayKey`/`weekKey`）。

---

## Prioritized Recommendations

> 标注是否服务**硬性交付**（统一小游戏 Tab + 猜角色迁入 + ≥2 新游戏）。

### 🔴 Critical（缺失的标配 / 阻止硬性交付达成）

- **🔴-1 小游戏 Hub 地基 + 猜角色迁入**【**硬性交付**】
  新建 `/minigames` + `MiniGamesView.vue`（游戏选择器卡片 + 渲染选中游戏）；导航「🎮 小游戏」**取代**「🎭 猜角色」；`/guess` 改 `redirect`。`GuessCharacter.vue` 原样迁入作为子游戏。Hub 顶部展示各游戏最高分。**这是本轮一切的地基。**

- **🔴-2 新游戏 #1 = 高低牌 Higher / Lower**【**硬性交付**】
  角色 `popularity_score` / 番剧 `rating_rank` / `date` 三维度（**不用裸 rating_score**）；连对 streak，错即结算；纯函数 + 注入 RNG + 特征测试。接经济（里程碑发知识点，**每日封顶防刷**）+ 持久化 `bestStreak`。**ROI 最高、最该第一个做、最强差异化（独有真实数据）。**

- **🔴-3 新游戏 #2 = 番剧 Quiz（4 选 1）或 猜番剧（剪影）二选一**【**硬性交付**】
  - 选 **Quiz**：知识型、题库自动派生、与猜角色调性差异大（推荐，丰富 Hub 玩法谱）。
  - 选 **猜番剧**：与猜角色对称、Canvas 复用率最高、复杂度最低（保守稳妥）。
  - **Planner 决策建议**：若本轮想"省力稳交付"选猜番剧（复用猜角色）；若想"玩法多样性"选 Quiz。**至此 Hub 内 ≥3 游戏，硬性交付达成。**

- **🔴-4 存档升 v8：新增 `minigames` 域**【服务硬性交付】
  各游戏 `highScore`/`bestStreak` + 累计游玩数持久化。三处同改 + 迁移 + 测试，**不动 v7 既有 `guess` 字段与断言**（新游戏单开域更安全）。

### 🟡 Important（显著提升完整度）

- **🟡-1 每日挑战（全员同种子）**【强化硬性交付的留存价值】
  用日期做 seed，每个游戏每天一把全员同题；完成发"每日挑战"奖励（每天仅一次，仿 `lastLoginDate`）。**这是 Wordle/Higher-Lower 最强回访钩子，建议第 5–6 轮内至少给高低牌做。**

- **🟡-2 小游戏接入每日/周任务**【复用现成留存机器】
  `config/dailyTasks.ts` 加任务类型 `minigame`（"今日玩 1 局小游戏" / "本周玩 10 局"）；Hub 结算处 `markProgress('minigame', 1)`。让小游戏成为日活引擎的一环。

- **🟡-3 小游戏导航红点**【复用现成红点系统】
  `App.vue` 加 `minigamesHasSignal`（今日挑战未玩则亮）。仿 `homeHasSignal` 纯派生。

### 🟢 Nice-to-have（power-user / 体验优化）

- **🟢-1 小游戏成就**：首胜 / 连胜 10 / 各游戏满分 / 每日挑战连续 7 天。扩 `achievements.ts` `check('minigame', {...})`。
- **🟢-2 砍逐局历史 UI + 清死代码**：迁移时删猜角色会话态 `gameRecords` 列表 UI（替换为 Hub 汇总卡）、清 `guess.ts` 的 `getOriginalImageUrl()` 死代码。
- **🟢-3 Canvas 像素化抽共享 composable**：猜角色 + 猜番剧共用 `usePixelate.ts`，避免复制粘贴。
- **🟢-4 endless 与 daily 双模式切换**：每个游戏给"无尽（刷新最高）/ 每日挑战（同种子）"两个模式入口。

### 💡 Feature Idea（差异化创新，入 backlog，第 7–9 轮）

- **💡-1 可分享"今日战绩卡"**：每日挑战完成生成 Canvas 图（"高低牌连对 14 / Quiz 满分"），复用 `E3-T2` 的 `toBlob+a.download`。**口碑传播喇叭**——用户晒 streak 把产品带出去。
- **💡-2 小游戏积分榜（前置 S12 后端）**：当前纯前端只能做"自己 vs 历史最高"。真正的全服排行榜需 S12 权威后端，**先在前端做好 bestStreak/统计的本地结构，为后端登榜铺路**。
- **💡-3 年代排序 Timeline + 记忆翻牌**：作为 Hub 第 4、5 个游戏，丰富玩法谱（提案 #4/#5）。
- **💡-4 "数据驱动" Higher-Lower 新维度**：随产品演进可扩展更多对比维（如 `anime_count` 登场作品数、`comprehensive_popularity`），保持高低牌长期新鲜。
- **💡-5 每日挑战连续完成奖励**：仿连续登录递增，"连续 N 天完成每日挑战"给递增奖励，把小游戏纳入连签经济。

---

## 给 Scout / Planner 的一句话

本轮方向毫无争议——**先做 🔴-1（Hub + 猜角色迁入）+ 🔴-2（高低牌）+ 🔴-3（Quiz 或猜番剧）达成硬性交付**，🔴-4 存档随之升 v8。**高低牌是本轮 ROI 最高、差异化最强（独有 Bangumi 真实数据）的新游戏，应优先。** 🟡-1/🟡-2/🟡-3（每日挑战 + 任务 + 红点）把小游戏接入产品现成的留存机器，是"几乎零新基建、纯接线"的高 ROI 跟进项，能在第 6 轮内顺手完成。

---

## Sources（竞品 / 品类研究）

- Higher/Lower 每日挑战与 streak：[playhigherlower.com](https://playhigherlower.com/) ｜ [/daily](https://playhigherlower.com/daily) ｜ [AO3dle Daily](https://ao3dle.com/blog/ao3dle-daily-higher-lower-game/)
- Wordle 留存/分享/心理：[CNBC](https://www.cnbc.com/2022/02/15/bite-sized-fun-the-psychology-behind-your-sudden-wordle-obsession.html) ｜ [MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/) ｜ [CBS News](https://www.cbsnews.com/minnesota/news/what-is-wordle/)
- 番剧 Quiz 品类：[Sporcle: Guess the Anime Character](https://www.sporcle.com/games/beeginey/guess-the-anime-character) ｜ [Sporcle: Anime by a Single Character](https://www.sporcle.com/games/Schicky/anime-by-character-slideshow) ｜ [Sporcle anime tag](https://www.sporcle.com/games/tags/anime)
- HoYoLAB 网页活动 / 每日签到：[Fandom Wiki](https://genshin-impact.fandom.com/wiki/HoYoLAB_Community_Daily_Check-In) ｜ [Game8](https://game8.co/games/Genshin-Impact/archives/321404)
- 记忆翻牌：[Anime - Match The Memory (Steam)](https://store.steampowered.com/app/1428290/Anime__Match_The_Memory/) ｜ [Match The Memory: Anime](https://matchthememory.com/Stephens-anime)
