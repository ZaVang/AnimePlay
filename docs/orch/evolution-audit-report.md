# AnimePlay — Evolution Audit Report

> Evolution Reviewer（产品策略师）· 第 3 轮（5 轮 evolution 之 R3，全局迭代 7）· 2026-06-17
> 范围：硬性交付（小游戏 Hub 内 3 游戏）已达成后的**开放新功能探索**——探索什么能让产品更黏、更值得回访、更有差异化与传播力。
> 方法：读 SPRINT.md + negotiation.md + 全量扫小游戏 Hub / minigames store / daily store / achievements store / userStore 编排 / RNG 引擎；竞品研究 5 路（Wordle / GeoGuessr / Duolingo / AnimeQuiz.net / AniDoku）。验收基线：`npm run test` 392 全绿、`type-check` 0 错。

---

## Executive Summary

**产品进化成熟度：8.0 / 10**（维持上轮基线——本轮是探索轮，未减分但也未自动加分；下面指出的联动空白若补上可冲 8.5+）。

AnimePlay 已经是一个**功能罕见地齐全的早期产品**：8 大玩法 + 一整套留存引擎（每日/周任务、连续登录递增、图鉴完成度、里程碑、成就墙、onboarding、Wrapped 成绩卡、番剧年表、跨系统红点）+ 统一「🎮 小游戏」Hub（猜角色 / 高低牌 / 番剧问答 3 游戏）+ S1-S10 重构加固。这个完整度远超绝大多数同类 demo。

**但本轮审计发现一个刺眼的结构性断点，它正是本轮最大的机会**：

> **小游戏 Hub 是一座孤岛。** 它接了经济（`profile.earn` + 每日封顶 120 KP），但**完全没有接入留存引擎**——`settleHigherLower` / `settleQuiz` 不调 `daily.markProgress`、daily/weekly 任务里**根本没有"玩小游戏"这个任务类型**（`DailyTaskType` 只有 `gacha|battleWin|watch|nurture`）、achievements 的 `guess` 事件只盖猜角色、**高低牌和 Quiz 一个成就都没有**。换句话说：产品花大力气造了「每天回来玩」的引擎（任务/连签/红点），又花大力气造了「最上瘾的玩法形态」（休闲小游戏），**却没把这两者焊在一起**。

四维度核心发现：

| 维度 | 评价 | 一句话 |
|---|---|---|
| **核心完整性** | 🟡 有明显缺口 | 小游戏与留存引擎脱节；小游戏缺「每天有理由回来」的钩子（无每日挑战、无每日任务联动、无小游戏成就、无历史最佳/统计展示） |
| **竞争差距** | 🔴 缺一个品类桌上赌注 | 直接同类竞品（AnimeQuiz.net / AniDoku）**已把"每日挑战 + 全员同题 + streak + 分享"做成动画品类标配**，AnimePlay 有全部底层能力（种子 RNG、题生成、Wrapped 出图）却没拼出这个形态 |
| **功能深度** | 🟢 底子厚但浅尝 | 3 个小游戏各自只有"开局→连胜→结算"单循环；缺统计仪表盘、缺个性化、缺把"真实数据"这个独特资产端到端用透 |
| **差异化** | 🟢 资产独特，待引爆 | "Bangumi 真实数据 + 抽卡收集 + 小游戏"的组合竞品做不出；最强口碑点 = 把每日挑战成绩做成可分享卡（Wrapped 基建已在） |

**本轮最该做的事（高 ROI、纯前端、ROI 倒挂的低垂果实）**：
**① 小游戏每日挑战（Wordle 式全员同题，固定种子）+ ② 把它焊进留存引擎（每日任务"完成今日挑战"+ 小游戏 streak + 小游戏成就 + 红点）。** 这两件事共用同一套底层能力，是一个连贯的功能包，且每一块基建都已在位（`mulberry32` 种子 RNG、`generateQuestion` 注入 RNG、`daily.markProgress` 遍历机制、`achievements.check` 事件机制、`App.vue` 红点机制、`ShareCard` Canvas 出图）。详见 Prioritized Recommendations 的 🔴。

---

## Phase 1：核心完整性

### 当前核心循环分析

小游戏 Hub 的循环目前是闭环的、但**很浅、且与产品其余部分隔离**：

```
进 Hub → 选游戏（猜角色/高低牌/Quiz）→ 一局（连胜滚动）→ 错即结算 → profile.earn 知识点（每日封顶 120 共享）→ 更新 highScore/bestStreak/playCount → 再来一局
```

闭环是真的（结算幂等、封顶防刷、最高分持久化 v9、注入 RNG + 特征测试，工程质量很高）。但循环的**外沿全是断的**：

### 缺失的关键环节（按影响排序）

**1. 🔴 小游戏完全不进留存引擎（最大断点）**

证据（源码级）：
- `userStore.settleHigherLower`（`stores/userStore.ts:312`）和 `settleQuiz`（:325）只做 `profile.earn` + `saveToServer`，**没有任何 `daily.markProgress(...)` 调用**。
- `config/dailyTasks.ts` 的 `DailyTaskType = 'gacha' | 'battleWin' | 'watch' | 'nurture'`——**没有 `minigame` 类型**，4 条日任务 + 3 条周任务里没有任何一条和小游戏有关。
- `config/achievements.ts` 的 `AchievementEvent` 有 `guess`（只盖猜角色），**高低牌和 Quiz 没有对应 event，连一个成就都拿不到**。`submitGuess`（:299）调了 `achievements.check('guess')`，但 `settleHigherLower`/`settleQuiz` 一个 check 都没调。

后果：玩家在 Hub 里玩得再起劲，每日任务面板纹丝不动、成就墙不亮、红点不响、连签不受益。**留存引擎对小游戏完全无感**——这是把两套现成的好系统隔开了，修复成本极低、收益极高。

**2. 🔴 没有"每天回来玩"的钩子（缺每日挑战）**

现在 Hub 的每一局都是即时随机的，**玩一百局和玩一局没有结构差异**——没有"今天的题"这个概念。竞品全部都有（见 Phase 2）。这是小游戏品类**最核心的回访驱动**：一个有限的、每天刷新的、全员相同的挑战，配 streak 和分享。AnimePlay 缺这一块。

**3. 🟡 小游戏没有历史展示/统计**

`highScore`/`bestStreak`/`playCount` 都存了（v9），但 Hub 选择器只在卡片角落显示一行"最佳连胜 N"。玩家看不到：我玩了多少局、各游戏分别表现如何、今天 vs 历史、我擅长哪类题。`guess.ts` 甚至有完整的 `gameRecords[]`（对局历史）但**会话态、不持久化、UI 几乎不展示**——造了又没用。

**4. 🟡 空状态/引导薄**

`MiniGamesView` 直接平铺 3 张游戏卡，没有"今天玩什么"的入口引导，新玩家不知道从哪开始。onboarding 系统（`stores/onboarding.ts`）已存在但未覆盖小游戏 Hub。

### 边界与健壮性（值得肯定）

工程侧边界处理很扎实：`pickRound` 保证两值不等无平局歧义、`cappedAward` 防刷封顶、`settle` 幂等保护、卡池耗尽收尾（`nextRound` 的 `!newRight → isGameOver`）、组件 `onUnmounted` 清 timer。这部分不用动。

---

## Phase 2：竞争差距

研究了 5 个产品。**关键发现：有两个直接同类竞品（动画品类）已经把"每日挑战"做成桌上赌注，而 AnimePlay 拥有全部底层能力却没做。**

### 竞品功能对比

| 功能 | Wordle | GeoGuessr Daily | Duolingo | **AnimeQuiz.net** | **AniDoku** | **AnimePlay** |
|---|---|---|---|---|---|---|
| 每日挑战（全员同题、午夜刷新） | ✅ 核心 | ✅ 五地点同图 | — | ✅ 3 题/天 | ✅ 每日 3×3 | ❌ **缺** |
| 每日 streak（连续天数，断签归零） | ✅ | ✅（用户呼声高） | ✅ 留存第一引擎 | ✅ | ✅ | 🟡 有"登录连签"但小游戏无独立 streak |
| 成绩可分享（emoji/卡片，剧透安全） | ✅ 病毒核心 | ✅ 比分 | — | ✅ share your score | ✅ | 🟡 有 Wrapped 但不含每日挑战 |
| 排行榜/全球对比 | 朋友圈式 | ✅ 全球榜 | ✅ 周联赛 | 🟡 全球榜 | ✅ 全球/好友榜 | ❌ 缺（无后端，本地化变体可做） |
| 当日成绩回看/统计仪表盘 | ✅ Stats | ✅ 结果页 | ✅ | 🟡 | ✅ 跟踪并对比 | ❌ 缺 |
| 任务/成就/经济联动 | — | — | ✅ XP 串起一切 | ✅ 奖励系统 | ✅ 成就 | 🟡 经济有、任务/成就**断开** |

**来源**：[Wordle 心理学（ChoiceHacking）](https://www.choicehacking.com/2022/01/31/how-wordle-uses-psychology/)、[GeoGuessr Daily Challenge](https://www.geoguessr.com/daily-challenges)、[Duolingo 游戏化案例（Trophy.so）](https://trophy.so/blog/duolingo-gamification-case-study)、[AnimeQuiz.net 每日挑战](https://www.animequiz.net/)、[AniDoku 每日动画 trivia](https://anidoku.com/)。

### 本产品缺少的标配功能（桌上赌注）

1. **每日挑战（全员同题）** —— 同品类两个竞品都有，是动画 quiz 品类的标配。AnimePlay 缺。
2. **小游戏维度的连续 streak** —— Duolingo 数据：7+ 天 streak 用户留存是无 streak 用户的 **2.4 倍**；streak wager 让 D14 留存 +14%。AnimePlay 有"登录连签"，但**小游戏本身没有 streak 概念**。
3. **统一指标把系统串起来** —— Duolingo 的洞察："XP 作为共享货币，完成一课同时推进 streak、联赛、成就。"AnimePlay 的"知识点"已经是这个共享货币，但**小游戏的产出没有喂给任务/成就**，没把这条价值链接通。

### 竞品反馈中的机会点

- GeoGuessr 用户在 Canny 上**反复请求**"Daily Challenge Streak leaderboard"和"How'd I do（当日成绩回看）"——说明**当日成绩回看 + streak 展示**是高频痛点，做了就是顺民意。
- Wordle 的病毒性核心是**emoji 成绩分享（剧透安全）**——把当日挑战做成不剧透答案的成绩卡（🟩🟨⬛ 式）是被验证过的传播引擎。AnimePlay 的 `ShareCard` Canvas 基建已在，差一个"每日挑战版"。

---

## Phase 3：功能深度

### 现有系统深度评估

| 系统 | 深度 | 浅在哪 / 可深挖 |
|---|---|---|
| 小游戏 | 🟡 浅尝 | 每个游戏只有"单局连胜"一个循环。可深挖：每日挑战模式、难度选择、限时模式、连胜里程碑可视化、各游戏统计 |
| 收集/图鉴 | 🟢 已较深 | evo-1/2 已做完成度/里程碑/定向解锁/年表，是产品最深的系统 |
| 真实数据资产 | 🟡 用了一半 | `rating_score`/`popularity_score`/`date` 在 CardDetailModal、高低牌、Quiz、年表都用了，但**没有一个"以数据为主角"的探索/对比视图**（如"番剧 Tier List""我的收藏数据画像"） |
| 统计仪表盘 | ❌ 缺 | 全产品没有一个"我的数据中心"——把抽卡数、对战胜率、小游戏战绩、收集完成度、连签天数聚到一处。这是 power-user 的回访理由 |

### 可能的 power-user 路径

1. **每日挑战的"专家模式"**：普通挑战固定题数，专家挑战连续到错为止（无限题、计 streak），喂给独立的专家 streak 成就。
2. **统计仪表盘（"我的数据画像"）**：聚合所有系统的数字（已经全部存在 store / 存档里，纯派生即可），是把"完整产品"感知到的最低成本方式。
3. **小游戏维度切换的深化**：高低牌目前 3 维度（角色人气/番剧口碑/番剧年代），可加"混合模式"或"难度（缩小数值差距 = 更难）"。

### 集成/协作/自定义

纯前端约束下，"协作/排行榜"需要后端（S12 路线）。但有一个**纯前端的伪社交**很值：**每日挑战的分享卡**——把"我今天 X 连胜，击败了昨天的我 / 我的历史最佳"做成可下载图，是零后端的口碑传播（Wordle 模式）。

---

## Phase 4：差异化与 Wow Factor

### "如果能 XXX 就太酷了"（≥3 个提案，不限本轮）

**💡 提案 A：小游戏每日挑战「今日番剧脑力赛」（最该做、最能传播）**
> 每天一道固定挑战：当日固定种子（`mulberry32(dateSeed)`）生成一组题（如 5 题混合：3 题 Quiz + 2 局高低牌），**全世界玩家同题**，每人**一天一次**（Wordle 式稀缺性）。完成后出一张**剧透安全的成绩卡**（🟩🟩🟨⬛⬛ 式逐题对错 + 今日 streak + "击败历史最佳"），一键下载分享。
> **为什么酷**：把 Wordle 最被验证的留存三件套（稀缺性 + streak + 剧透安全分享）原样移植到动画品类，而 AnimePlay 拥有 Wordle 没有的资产——真实番剧/角色数据和图片。**这是本轮最强的口碑传播点**，且每块基建都已在位。

**💡 提案 B：「我的动画数据画像」统计仪表盘**
> 一个聚合页：抽卡总数 / UR 数 / 对战胜率 / 小游戏三项战绩 / 收集完成度雷达图 / 连签天数 / 我最爱的放送年代（从已拥有番剧的 `date` 派生）。纯派生、零后端、零新存档字段。
> **为什么酷**：让玩家第一次"看见自己的全貌"，是 power-user 回访理由，也是二次分享素材。数据全部已存在，是 ROI 极高的"把现成数字摆出来"。

**💡 提案 C：「番剧 Tier List / 数据擂台」**
> 用真实 `rating_score`/`popularity_score` 让玩家把自己拥有的卡排进 Tier，或看"我的收藏 vs 全站平均"的数据对比。把独特数据资产做成一个独立的探索玩法。
> **为什么酷**：竞品（纯 quiz 类）做不出——它们没有"你拥有的收藏"这一层。这是抽卡收集 + 真实数据交叉出的独特方向。

### 口碑传播点分析

用户会因为什么把产品推荐给朋友？排序：
1. **每日挑战成绩卡（提案 A）** —— 最强。剧透安全 + 每日新鲜 + "你也来挑战今天的题"是天然的对战邀请。Wordle/AnimeQuiz.net 已验证。
2. **数据画像（提案 B）** —— 中。"晒成就/晒数据"型传播，一次性强、复发弱。
3. 现有 Wrapped 成绩卡 —— 已有，但是"年度总结"型，频次低；每日挑战卡补上了"高频分享"这一格。

### 值得删掉或简化的东西（≥1）

- **🗑️ `guess.ts` 的 `gameRecords[]` + `getOriginalImageUrl()` 死代码**：`gameRecords` 维护了完整对局历史却几乎不展示、不持久化（会话态），是"造了没用"；`getOriginalImageUrl()` 永远返回 `''`（:116-119）是纯死代码。要么把 `gameRecords` 接进统计仪表盘（提案 B）让它有意义，要么删掉减负。**建议：在做提案 B 时把它接通；否则删。**（negotiation.md 上轮已记此为可清死代码，本轮再次确认。）
- **简化**：Hub 选择器卡片底部那行"最佳连胜 N"信息密度太低，可换成"今日挑战入口 + 是否已完成"更有回访拉力。

---

## Technical Health（附带）

整体健康度高（392 测试全绿、type-check 0 错、build 通过、架构铁律未破）。本轮新功能视角下的几点：

- **架构扩展性**：留存引擎的扩展模式非常干净——`daily.markProgress` 遍历任务表、`achievements.check` 按 event 分发，**加一个 `minigame` 任务类型 / 一组小游戏成就只需改 config + 加埋点调用，零架构改动**。这是上一轮设计留下的红利，本轮直接吃。
- **每日挑战的纯前端可行性已确认**：`engine/rng.ts` 的 `mulberry32(seed)` + `createSeededRng` 已在位；`generateQuestion`（quiz.ts）和 `pickRound`（higherLower.ts）**都已注入 RNG**——喂当日日期派生的种子即可"全员同题"，零后端、零数据改动。这是本轮 ROI 最高的技术前提。
- **存档扩展成本可控**：每日挑战的 streak / 已完成日期需持久化 → 按既有"三处同改 + 迁移 + 测试"升 v9→v10（minigames 域加 `dailyChallenge` 子域）。模式成熟、风险低。
- **性能**：无新瓶颈。每日挑战是一次性小批量取卡，远小于已虚拟化的 665 项列表。
- **测试**：纯逻辑（种子→题集生成、streak 推进、断签归零）应抽纯函数 + 注入 RNG + 特征测试，与现有 `higherLower.test.ts` / `quiz.test.ts` 同款。注意 streak 跨天/断签判定建议复用 `daily.ts` 的 `parseLocalKey` + `toDateString` 比对模式（已验证的连签逻辑），避免重造时区 bug。
- **死代码**：`guess.ts:116` `getOriginalImageUrl` 永返空串；`gameRecords[]` 维护未用（见 Phase 4）。

---

## Prioritized Recommendations

> 每条标：实现复杂度 · 数据可行性 · 是否纯前端。

### 🔴 Critical — 本轮（第 7 轮）最该做的 1-2 个高 ROI 纯前端功能

**🔴-1：小游戏「每日挑战」（Wordle 式全员同题 + 小游戏 streak）**
- **是什么**：Hub 顶部加"今日挑战"入口。点开 = 当日固定种子（`mulberry32` 喂 `YYYYMMDD` 派生 seed）生成一组固定题（建议 **5 题混合：3 题 Quiz + 2 局高低牌**，复用现成 `generateQuestion`/`pickRound`），**每人每天一次**。完成后：记当日得分、维护**小游戏 streak**（昨日完成→+1，断签→归 1，复用 `daily.ts` 连签判定模式）、出**剧透安全成绩卡**（逐题 🟩🟨⬛ + streak + "今日得分/历史最佳"，复用 `ShareCard` Canvas 基建）。
- **为什么是它**：① 同品类两个直接竞品（AnimeQuiz.net/AniDoku）已把它做成桌上赌注，AnimePlay 缺；② 所有基建已在位（种子 RNG、注入式题生成、Canvas 出图）；③ 它是"每天回来"的最强结构性钩子（稀缺性 + streak 损失厌恶）；④ 成绩卡是本产品最强口碑点。
- **复杂度**：中（一个 `stores/minigames/dailyChallenge.ts` 纯逻辑 + 注入 RNG + 一个 Hub 内挑战视图 + 成绩卡复用 ShareCard；升存档 v9→v10 加 `dailyChallenge` 子域）。
- **数据可行性**：✅ 完全够（题全部从现成 `generateQuestion`/`pickRound` 派生，零新数据）。
- **纯前端**：✅ 100%（午夜刷新 = 本地日期种子；"全员同题"靠确定性种子，无需后端同步）。

**🔴-2：把小游戏焊进留存引擎（每日任务 + 成就联动）—— 与 🔴-1 是一个功能包**
- **是什么**（三个零架构改动的小改）：
  1. **每日任务加"玩小游戏"类型**：`config/dailyTasks.ts` 的 `DailyTaskType` 加 `minigame`，加 1 条日任务（如"完成 1 次每日挑战"或"玩 1 局小游戏"）+ 可选 1 条周任务；在 `settleHigherLower`/`settleQuiz`/每日挑战完成处调 `daily.markProgress('minigame')`（埋点机制现成，`markProgress` 自动遍历日/周任务）。
  2. **小游戏成就**：`config/achievements.ts` 的 `AchievementEvent` 加 `minigame`，加一组成就（如"高低牌 10 连胜""Quiz 答对 50 题""每日挑战连续 7 天"），在结算处调 `achievements.check('minigame', {...})`（`check` 机制现成）。
  3. **红点**：`App.vue` 给「🎮 小游戏」导航加红点——"今日挑战未完成"或"有小游戏成就可领"（红点机制现成，纯派生）。
- **为什么是它**：这是把两套现成好系统焊起来，**单位投入的留存收益是全产品最高的**——填的是 Phase 1 指出的最大结构性断点。Duolingo 的核心洞察就是"共享指标把 streak/任务/成就串起来"。
- **复杂度**：低（改 2 个 config + 加 ~3 处埋点调用 + 1 处红点派生；无新 store、无架构改动）。
- **数据可行性**：✅（纯 config + 埋点）。
- **纯前端**：✅ 100%。

> **本轮选型建议**：🔴-1 + 🔴-2 作为**一个连贯功能包**交付——每日挑战是"骨"，留存联动是"焊点"。两者共用同一批基建，分开做反而割裂。若工作量需取舍：**先 🔴-2（半天级、零风险、立刻让小游戏对留存引擎可见），再 🔴-1（每日挑战，本轮核心 wow）**。

### 🟡 Important

**🟡-3：小游戏统计 / "我的数据画像"仪表盘**
- Hub 内或独立页聚合三游戏 highScore/bestStreak/playCount + 每日挑战 streak + 历史。顺带把 `guess.ts` 的 `gameRecords` 接通（持久化或至少会话内展示），消化死代码。
- 复杂度：中 · 数据可行性 ✅（全部已存在）· 纯前端 ✅。可作第 8 轮主项。

**🟡-4：每日挑战成绩卡独立化（口碑放大）**
- 若 🔴-1 先做了简版成绩展示，本项把它升级成精致的剧透安全分享卡（Wordle emoji 网格风 + 品牌色）。
- 复杂度：低-中（复用 ShareCard）· 数据 ✅ · 纯前端 ✅。

### 🟢 Nice-to-have

**🟢-5：每日挑战"专家模式"** —— 连续到错为止，独立 streak + 专家成就。复杂度低（复用现有连胜逻辑）· 纯前端 ✅。
**🟢-6：高低牌难度/混合维度** —— 缩小数值差距 = 更难，或多维度混合。复杂度低 · 纯前端 ✅。
**🟢-7：清死代码** —— `getOriginalImageUrl`（永返空串）删除；`gameRecords` 若 🟡-3 不接通则删。复杂度极低。

### 💡 Feature Idea（backlog，差异化创新）

**💡-A：番剧 Tier List / 数据擂台** —— 用真实评分/人气让玩家排 Tier、对比"我的收藏 vs 全站平均"。竞品做不出（它们没有"你的收藏"层）。纯前端 ✅。
**💡-B：每日挑战本地"幽灵榜"** —— 无后端也能做的伪排行：记录设备上历史每日得分，挑战时显示"昨天的你 / 你的历史最佳"作为对手（GeoGuessr "How'd I do" 的本地版）。纯前端 ✅。
**💡-C：声优维度收集** —— 已知需后端吐 `角色id→声优` 映射（`main_characters[].actors` 被 server.py 剥离），跨栈项，维持暂缓。**非纯前端**。

---

## 给 Scout / Planner 的接地提示

- **每日挑战种子**：用 `mulberry32(dateNum)` 其中 `dateNum` 从 `YYYYMMDD` 派生（如 `20260617`）。`createSeededRng` 已导出（`engine/rng.ts:64`），`generateQuestion`/`pickRound` 已接受 `RNG` 参数 —— 直接喂种子化 RNG 即"全员同题"，零改动。
- **streak 断签判定**：复用 `daily.ts` 的 `parseLocalKey` + `new Date().toDateString()` / 昨日 `toDateString()` 比对模式（已验证、已测），不要重造。
- **联动埋点落点**：`userStore.settleHigherLower`（:312）/ `settleQuiz`（:325）/ 新每日挑战结算处加 `useDailyStore().markProgress('minigame')` + `useAchievementsStore().check('minigame', payload)`，与 `submitGuess`（:299 已有 `check('guess')`）同款。
- **存档**：升 v9→v10，minigames 域加 `dailyChallenge: { lastPlayedDate, streak, bestStreak, history? }`；三处同改（schema / migrations / 装配器）+ 迁移缺省 + 往返测试，不破坏 v1~v9 断言。
- **config 扩展零架构成本**：`DailyTaskType` 加 `'minigame'`、`AchievementEvent` 加 `'minigame'` 后，`markProgress` 的遍历和 `check` 的 event 分发自动覆盖——这是上一轮设计留下的红利。

---

*Reviewer 结论：本轮不是"再加一个小游戏"，而是**把已造好的两座金矿（留存引擎 + 小游戏 Hub）用一条隧道（每日挑战 + 联动埋点）打通**。这是全产品当前 ROI 最高、最纯前端、最有传播潜力的一步。建议 🔴-1 + 🔴-2 作为第 7 轮的连贯功能包。*
