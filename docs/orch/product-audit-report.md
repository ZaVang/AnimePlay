# 产品体验审计报告 — 动画宅的自我修养（AnimePlay）

> 审计身份：Product Experience Reviewer（兼具审美品味与产品直觉的资深体验官，非纯 QA）
> 审计轮次：**Product-Loop 第 5 轮 / 最后一轮（打磨·还债·收官轮）** · 审计日期：2026-06-24
> 数据规模 968 番 / 2021 角色 · 存档协议 v12 · 5 套换肤
> 审计手段：深度代码阅读（R4 全部新增文件全文精读 + 养成簇 5 文件 / SquadBattleView / UpBanner / onboarding 全文精读 + 硬编码色按文件硬计数复核 + confirm/alert 全仓 grep 落坐标 + 文档版本号实读对账）。本环境 get_page_state.js/截图失效、preview 端口占用，运行期核查跳过，以代码接地为主。
> 基线：第 4 轮报告 **8.2 分** + negotiation.md（Planner 长线牵引轮逐条裁决 + R5 债轮范围）+ gen_status.md（Generator 实装 I4-T1~T4，489 测试全绿、零存档四处 diff 空）。

---

## Executive Summary

**总评分：8.4 / 10（上轮 8.2，+0.2）**

第 4 轮是一次**主题极干净的长线牵引收口**：四件任务（题材集册 Genre Sets / 详情页内导航相似作品 / 设备级「正在追」Pin / ViewingStats 换源 + CardDetailModal 残留硬色清）全部干净落地，**零回归、489 测试通过、零存档（schema/migrations/装配器/codex 四处 diff 空）**。三个标志性成果——①**题材集册**用最小工程量（复用 `contentIndex.tagToAnime` 剔噪桶 + 仿 `codexMilestones` 纯派生段位）填上了产品多轮来唯一裸露的「中线长线目标」真空，且 persona 专精排序 + 缺口就地收下 + 纯展示墙护栏全守，是把"系统目标"变成"我在意的自设目标"的关键一笔；②**详情页内导航**（`viewCard` ref 替换内容、所有派生切读 viewCard）一手打通了深度发现，一手**根治了多轮未解的嵌套 modal 债**——这是本轮我最欣赏的一笔，把"加功能"和"还结构债"缝在了同一个改动里；③**Pin「正在追」**用设备级 localStorage 给了用户一个轻量自设目标，"看完→喂养看过并集→推进集册/雷达"的意图漏斗闭合。`GenreSets`/`WatchingPins`/重构后的 `CardDetailModal` 是连续第四轮的令牌纪律标杆——全程语义令牌、护栏注释到位、零硬编码。

**作为债轮的最后一轮，我把地板抬平的清单全部接地到了精确坐标**（见 Prioritized Recommendations，每条带 file:line），核心是三条：①**硬编码色债大头**——养成簇本轮硬计数复核为 **107 处 / 5 文件**（比上轮 102 微升，CharacterSelector 的稀有度 shadow 色是增量来源），其中 `CharacterProfile` 把心情/羁绊色写死在 **inline computed 对象**里、`NurtureActions`/`InteractionPanel` 写死在 **named `*_CLASSES` 映射**里——negotiation 说的"`*_COLOR_CLASSES` 反模式"准确但坐标需细化（两种形态都是同一反模式）；②**原生 confirm/alert 全仓 18 个真实调用点**（已剔除 2 个同名局部函数误报），精确分布见 1.4；③**文档版本号双重漂移**——`frontend-vue/CLAUDE.md` 写 schema **v11**、`docs/plans/pitfalls.md` 写存档协议 **v6**，实际已是 **v12**，pitfalls 漂了 6 个版本。

加 0.2 而非更多，理由：本轮是落地轮无新功能扣分项，加分来自 R4 四件全 A/A- 落地（尤其详情页内导航顺手还了嵌套 modal 债）；不加更多，因为**债轮要清的地板这一轮（R4）按计划没碰**——养成/挑战塔簇的品质水位分裂仍是产品仅存的、且因 5 套皮肤而被放大的审美裂缝，它正是 R5 的全部价值，**本报告的核心交付就是把这块地板的每一处坐标钉死，让 R5 一次清干净**。

三个维度的核心发现：

- **功能体验（8.6/10，+0.1）**：R4 把"发现深度"补齐——详情页内导航让"看一部 → 滑到同类下一部"不再叠 modal、不再断流；集册缺口就地收下让"还差 N 部"一步可补；Pin 给了自设目标。**但债轮视角下，功能层仍有三处粗糙地板**：①**原生 confirm/alert 18 处**（解锁/分解/清空记录/删卡组都跳出浏览器原生弹窗，与全站精致皮肤割裂）；②`SquadBattleView` 有**自相矛盾的死文案**——规则区 L761「每日最多挑战10次」与状态区 L638「无次数限制」直接打架（次数限制功能本身已删）；③`NurtureActions` L270-272 有一个**长达 `program.duration × 60s`（最长 60 分钟）的未登记 setTimeout**，离开养成页后仍在后台等着 `addLog`，是 CLAUDE.md 明令"必须登记并卸载清除"的反例（SquadBattleView 的 `schedule()` 是正确范式）。

- **审美品味（7.4/10，+0.2，债轮主战场）**：干净层连续第四轮扩张且质量稳（`GenreSets` 全 `rgb(var(--c-*))`、段位/进度条/缺口卡全语义令牌；`WatchingPins` 双路径提示 + 全令牌；`CardDetailModal` 4 处残留硬色已清净，仅剩 `bg-gray-500` 稀有度兜底固定例外）。**泄漏层大头按计划留到本轮（R5），我把坐标钉死**：①**养成簇 107 处 / 5 文件**（`CharacterProfile` 46 / `NurtureActions` 23 / `InteractionPanel` 20 / `CharacterSelector` 15 / `DialogueSystem` 3）——反模式有两种形态：inline computed 调色板（CharacterProfile 的 `bondLevel`/`moodStatus` 返回 `text-pink-400` 等）+ named 映射（`ACTIVITY_*_CLASSES`/`INTERACTION_COLOR_CLASSES`/`getBondLevel`）；②**`SquadBattleView` 31 处**（刷新敌人 `bg-orange-600`、一键结算 `bg-purple-600`、执行回合按钮、爬塔规则卡 `bg-blue-900/20`、血条 `bg-red-600`、难度徽章组）。**这块债的危害不是孤立的——它直接打败了 5 套皮肤令牌系统**：用户切到 `midnight`(琥珀暗)/`neon`(青霓虹) 时，养成页的粉/黄/蓝/紫硬色不跟着换，在深色底上炸出一片饱和色斑，这就是"品质水位分裂"的精确物理机制（详见 2.1）。

- **产品想象力（8.4/10，+0.1）**：题材集册让产品**第一次有了"持续数周、永远差几部"的中线目标**，且 persona 排序把它和"我的人格身份"这条线缝起来——这是 Genshin（有图鉴无人格线）/Letterboxd（有 list 无收集快感）都没有的独特闭环，落地质量验证 negotiation 的判断成立。**经过 5 轮，产品的啊哈地图已基本完整**：抽卡仪式感（顶点）→ 收藏/图鉴成果墙 → 品味身份多轴雷达（第二啊哈）→ 小众佳作正名（价值观自洽）→ 题材集册中线牵引 + Pin 自设目标（长线）。**剩余的高价值缺口只剩一条且本轮在范围内**：onboarding 仍是 4 步止于对战（实读确认 `OnboardingGuide.vue` 无第 5 步），看过/品味雷达/集册这条"自我表达"主线对新用户是**完全无人引导的孤岛**——这是产品最强差异化（vs Genshin）却埋得最深的一条线，R5 该用一步 onboarding 点名它。

**5 轮终评（产品现在的水位与可发布性）**：**AnimePlay 现在是一个"内核完整、主题做透、单局已经很好玩、长线也接上了"的成熟产品 demo，水位在"可对外炫耀/可邀请朋友试玩"与"可正式发布"之间——卡点不在功能或玩法（这两块已经过关），而在最后一层"精致度的均匀性"**。五轮把闭环的每一段都做上瘾了（发现→收下顺手、第二啊哈升华成雷达、rarity 价值观自洽、中线集册 + 自设 Pin 长线），工程纪律连续四轮满分、零回归零存档。**差的就是这最后一轮债轮要清的三样地板**：养成/挑战塔簇的硬色色斑（切暗色皮肤一眼穿帮）、原生浏览器弹窗（一跳出就出戏）、新用户对"自我表达"主线毫无引导（最强差异化埋最深）。**这三样全是"地板"不是"天花板"——不需要任何新设计、新数据、新架构，纯粹是把已建好的令牌系统/弹窗概念/onboarding 框架铺满最后几个角落。** 清完这一轮，产品就从"很棒的 demo"跨到"可发布的成品"。后端权威化（多人/PvP）是 S12 的另一条线，不影响单机体验的可发布性。

一句话：**第 4 轮把长线真空补上了（集册中线牵引 + Pin 自设目标 + 详情页内导航顺手还了嵌套 modal 债），主题做透、纪律满分、零回归。经过 5 轮，产品内核完整、玩法过关、长线接上，水位卡在"精致度均匀性"这最后一层——本债轮（R5）要清的三块地板我已钉死坐标：养成/挑战塔簇硬色 138 处（107+31，连根拔反模式而非逐处替换）、原生 confirm/alert 18 处、onboarding 第 5 步点名品味身份。清完即从"可炫耀 demo"跨到"可发布成品"。**

---

## Phase 1: 功能体验

### 1.1 第 4 轮落地质量评估（逐项评级）

**I4-T1 题材集册 Genre Sets — 评价：A（长线真空的最小工程量补法，护栏全守）。**
`utils/genreSets.ts` 三个纯函数（`buildGenreSets`/`genreSetTier`/`genreGapAnime`）复用 codex 同构"全量分母 + 计数判 owned"蓝图，桶维度换成**剔噪后**的 `contentIndex.tagToAnime`（`minBucketSize:10` 过滤小桶 → 约 22 集册，温和不刷屏）。`GenreSets.vue`（挂 CodexPanel 动画域）：persona 专精排序（`buildTasteReport(...).topTags` 顶到前面）、纯派生段位（待开荒/青铜/白银/黄金/题材征服者）、`void collection.animeCollection.size` 显式触达响应式拥有集（解锁/抽新卡后完成度刷新）、一次只展开一个集册避免首屏过长。**展示墙护栏全守**：不强制集满、无 FOMO 倒计时、纯派生不发奖不记已领不持久化、未碰 `claimedMilestones` 领取制——这是 negotiation 钉死的"头号陷阱"，落地零越界。文案有态度（"这是展示墙不是待办：不强制集满、永远差几部就是它的乐趣"）。**negotiation 三报告收敛认定的最高 ROI 长线机制，落地完全兑现判断。**

**I4-T2 详情页内导航相似作品 + 集册缺口收下 — 评价：A（加功能顺手还结构债，本轮我最欣赏的一笔）。**
- `CardDetailModal.vue` 引入 `viewCard` ref（初始 = prop.card，`watch(props.card)` 同步重置），**模板/所有派生（标题/图/简介/资料/技能/标签/登场作品/分解/拥有数/看过/Pin）一律改读 `viewCard` 不读 props.card**，新增 `viewCount` 独立派生（导航后实时算拥有数）。相似作品「🔍 看过这部的人也喜欢」用 `recommendFromSeeds([viewCard], ..., 6, 排除已拥有∪已看)`，点一部 → `navigateTo` 替换 viewCard + 滚动归零，**不开新层**。
- **这一手同时解决了两件事**：①把发现从"列表页推荐"延伸到"详情页深潜"；②**根治了多轮未解的嵌套 modal 债**（此前 RecommendationStrip 自带 modal 嵌进详情会叠到第三层）——negotiation 三方核实后定的"详情页内导航不叠 modal"约束，落地精准。Generator 自报的陷阱（多宿主共享 prop 组件须用组件内 ref + 所有派生点切 viewCard，漏一处会"导航后信息停在旧卡"）处理到位，type-check 兜底。
- 集册缺口就地收下：`GenreSets.vue` 展开集册显示 `genreGapAnime` 缺口番（限 12），每部就地「看过/解锁」（走门面 toggleTasteWatched/unlockCodexCard，经济安全内建）。

**I4-T3 设备级「正在追」Pin — 评价：A（轻量铁律守得好，意图漏斗闭合）。**
- `stores/watchingPins.ts` 仿 onboarding 设备级先例（try/catch 读写、损坏 JSON 静默回落、`MAX_PINS=8` 防死亡清单、读缓存超额/脏数据截断去重），`pin/unpin/toggle/isPinned/isFull`。**不进存档、不进装配器、不升 schema。**
- `CardDetailModal` 看过开关旁加「📌 追这部/正在追」并列开关（仅 anime，满时 alert）。`WatchingPins.vue`（挂 HomeView，TasteIdentityChip 与 WatchQueue 之间，空列表自隐）：一个「看完」按钮（写看过并集 + unpin）+ 一个移除按钮。**未拥有贵卡给"诚实但不绝望"双路径提示**（"解锁需 N 知识点，或抽卡获得"），不退化成纯挫败——research 护栏落地。
- **轻量铁律守得干净**：就一个布尔标记 + 一个主页列表 + 一个按钮，没做成新系统。"看完→喂养看过并集→推进集册/雷达"的观番意图漏斗闭合。

**I4-T4 ViewingStats 换源（不删字段）+ CardDetailModal 残留硬色清 — 评价：A（护栏精确，遗漏坐标补净）。**
- `ViewingStats.vue` 的 `topGenres` 从 `stats.genreProgress`（存档字段）换成 `buildTasteReport(看过并集番卡, allAnime).topTags`（已剔噪、按集中度降序）。**存档字段 `genreProgress` 本身保留**（schema/migrations/装配器/viewing.ts 写侧零改动）——negotiation 明确纠偏的"只换消费端显示源、切忌顺手删字段"落地零越界。
- **CardDetailModal 4 处残留硬色（上轮我点名的 R5 遗漏坐标）已清净**：TP 消耗 `text-blue-600`→`text-info`、标签 chip `bg-blue-100 text-blue-800`→`bg-accent-soft text-accent`、登场作品已拥有 `bg-green-100 text-green-800`→`bg-success/15 text-success`、分解 `text-emerald-600`→`text-accent`。复核确认仅剩 L268 `bg-gray-500`（稀有度徽章渐变兜底，颜色铁律固定例外，保留正确）。**上轮我提的遗漏坐标本轮顺手清掉了。**

**整体落地纪律**：架构铁律全守（engine 纯净、纯函数放 utils、SAVE_VERSION 仍 12、四处装配器 diff 空、颜色用语义令牌），**489 测试通过**（上轮 466，本轮 +23：genreSets + watchingPins），type-check/build/后端安全测试全绿。**连续第四轮工程纪律满分。**

### 1.2 核心流程逐步走查（聚焦本轮变化）

**发现深度（打通）** — 详情页任一番剧底部现有「看过这部的人也喜欢」6 卡，点一部在**同一个 modal 内导航**（内容替换、滚动归零、拥有数/看过态/技能全刷新），用户从"看一部"自然滑到"再看一部同类"，发现从列表延伸到深潜，且全程不叠 modal、不断流。

**长线中线（接上）** — 图鉴动画域现有「📚 题材集册」：每个题材一本（"赛博朋克 7/12"），按你最专精的题材排前面，展开看"还差 N 部"缺口番并就地补番。这是产品**第一个"持续数周、永远差几部"的中线目标**。

**自设目标（给了）** — 详情页可「📌 正在追」，主页有「正在追」列表 + "看完"按钮。用户能表达"这部我主动追"的意图，看完划掉一部、喂养看过并集。

**长线牵引真空（已填，复核）** — 走完上述流程，用户现在**有了明天想回来的理由**：集册永远差几部、Pin 列表等着划掉、每日任务照常。R4 的核心缺口已补。

### 1.3 边界情况与错误处理（债轮复核 + 新发现）

**新发现（本轮，债轮地板）：**

1. **🟡 SquadBattleView 自相矛盾的死文案（新发现，一致性 bug）**：爬塔规则卡 `views/SquadBattleView.vue` **L761「每日最多挑战10次」** 与同页状态区 **L638「每层只能挑战一次，无次数限制」** 直接打架。代码侧次数限制功能已删（`startTowerBattle` L204「移除每日挑战次数限制」、L221「移除挑战次数记录」注释明确），但规则文案没跟着删。新用户读规则会以为有日限。**纯死文案，删一行即可**，应进 R5。

2. **🟡 NurtureActions 60 分钟未登记 setTimeout（新发现，违反 CLAUDE.md 明令）**：`NurtureActions.vue` **L270-272** `startTraining` 末尾 `setTimeout(() => userStore.addLog(...完成了...), program.duration * 60 * 1000)`——延迟最长 60 分钟（体力锻炼 program），**未登记、卸载不清**。CLAUDE.md 明文"组件内多步 setTimeout 必须登记并在卸载时清除（参照 SquadBattleView 的 `schedule()`）"，这是反例。另 L30-33 `startTrainingAnimation` 的 3s setTimeout 同样未登记（轻，但同类）。离开养成页后这些回调仍在后台等着 fire addLog。应进 R5（建模 SquadBattleView 的 `schedule()` + onBeforeUnmount 清）。

**复核：按计划留本轮（R5）的延后项（非回归，negotiation 已明确归宿）：**

3. **🟡 硬编码色债大头原样（R5 主项，坐标已钉死）**：养成簇 **107 处 / 5 文件** + `SquadBattleView` **31 处**。详见 Phase 2.1 的精确坐标表。

4. **🟡 原生 confirm/alert 18 处（R5，坐标已钉死）**：见 1.4。本轮新增的 `GenreSets`/`WatchingPins`/`CardDetailModal`(Pin 满) 解锁出口也沿用 alert/confirm（与既有 CodexPanel/NicheGems 模式一致，是一致的延续债）。

5. **🟡 文档版本号双重漂移（R5，已实读对账）**：`frontend-vue/CLAUDE.md` 的 Architecture 段写「schema **v11**」+ 版本沿革表止于 v11（每日挑战 streak）；`docs/plans/pitfalls.md` L11 写「存档协议当前 **v6**」。**实际 SAVE_VERSION = 12**（schema.ts:30）。pitfalls 漂了整整 6 个版本（v6→v12），是最该同步的一处。

6. **🟢 /homestead 路由仍 active（R5 冻结项，已确认）**：`router/index.ts` L43-45 `/homestead` 路由仍注册并 lazy-import `HomesteadView.vue`（仍进构建产物），仅 App.vue L195-196 导航链接被注释隐藏。negotiation 已列 R5 彻底冻结/移出构建。

### 1.4 原生 confirm/alert 全仓坐标（R5 还债清单，已剔误报）

> grep 全仓 `confirm(`/`alert(` 命中 22 处，**剔除 2 个同名局部函数误报**（`battle/CardSelectionModal.vue:142`、`battle/TypeSelectionModal.vue:116` 是组件内名为 `confirm()` 的普通函数，非原生调用），**真实原生调用 18 处**：

| 文件:行 | 类型 | 场景 |
|---|---|---|
| `components/CardDetailModal.vue:66` | alert | Pin 已满 8 部提示 |
| `components/CardDetailModal.vue:210` | confirm | 分解卡确认 |
| `components/GenreSets.vue:87/92/95/99` | alert×3 + confirm×1 | 解锁（未登录/余额不足/确认/失败） |
| `components/RecommendationStrip.vue:91/97/100/104` | alert×3 + confirm×1 | 解锁同上 |
| `components/NicheGems.vue:60/65/68/72` | alert×3 + confirm×1 | 解锁同上 |
| `components/CodexPanel.vue:224/227` | alert + confirm | 解锁（余额不足/确认） |
| `components/TierListGame.vue:157` | confirm | 清空锐评棋盘 |
| `components/TasteProfileGame.vue:126` | confirm | 清空全部观看记录 |
| `views/CollectionsView.vue:72` | confirm | 分解所有重复卡 |
| `views/BattleView.vue:114` | confirm | 退出战斗确认 |
| `components/gacha/GachaShop.vue:27` | confirm | 商店购买确认 |
| `components/decks/DeckList.vue:21` | confirm | 删除卡组 |
| `components/decks/DeckEditor.vue:167/216/235/241/248` | alert×4 + confirm×1 | 卡组上限/命名/覆盖/保存 |
| `stores/userStore.ts:102/107/158` | alert×3 | 未登录/券不足（store 层） |
| `stores/collection.ts:113` | alert | 喜爱列表已满 |
| `stores/persistence.ts:173` | alert | 加载存档失败 |
| `stores/battleSetup.ts:39` | alert | 数据未加载 |

**债轮建议**：解锁确认（GenreSets/RecommendationStrip/NicheGems/CodexPanel **四处同模式**）是最高频出口、值得优先做统一弹窗；store 层 4 处（userStore/collection/persistence/battleSetup）的 alert 因脱离组件上下文最难替换，可降级为非阻塞 toast（复用既有 `addLog` 通知通道更省事）。**一个 `useConfirm()`/`useAlert()` composable + 一个挂 App 顶层的弹窗组件，统一吃掉全部 18 处。**

---

## Phase 2: 审美品味

### 2.1 配色与视觉层次（债轮主战场——把地板钉死）

**5 套皮肤令牌系统仍是审美脊梁，且经精读确认是真有品味的系统。** `assets/skins.css` 五皮肤（暖阳/樱花/薄荷/午夜/赛博霓虹）每套都有协调的 accent + accent-2(hover) + **on-accent 正确反相**（午夜=琥珀底配深字 `42 34 8`、霓虹=青底配深字 `0 26 22`），完整状态色（success/warning/danger/info 各皮肤微调）+ 装饰令牌（radius/shadow/glow 让皮肤改材质不只改色）。这是脊梁。

**干净层连续第四轮扩张，质量保持标杆。**
- `GenreSets.vue`：全 `rgb(var(--c-*))`——段位 emoji/进度条 fill/缺口卡 hover 反白/已征服 badge 全语义令牌，主题切换全跟着换。
- `WatchingPins.vue`：双路径提示用 `text-accent`、看完按钮 `bg-accent text-on-accent`，零硬编码。
- `CardDetailModal.vue`：R4 残留 4 硬色已清（见 I4-T4），相似作品 strip/Pin 开关全令牌。

**泄漏层大头按 negotiation 计划留本轮（R5）——以下是债轮要清的精确坐标，按文件 + 反模式形态分类：**

| 文件 | 实测硬色数 | 反模式形态 + 精确坐标（R5 连根拔依据） |
|---|---|---|
| `nurture/CharacterProfile.vue` | **46** | **inline computed 调色板**（最该连根拔）：`bondLevel` 返回 `text-pink-400`/`bg-pink-500/20`/`text-red-400`/`text-purple-400`/`text-blue-400`（L22-77）；`moodStatus` 返回 `text-pink-400`/`text-yellow-400`/`text-orange-400`/`text-red-400`（L98-105）；战力卡 `from-pink-500/10 to-purple-500/10 border-pink-500/20`（L429）；经验条 `from-yellow-400 to-orange-500`（L345）；属性值 `text-pink-400`/`text-blue-400`/HP `text-red-400`/ATK `text-orange-400`/SP `text-purple-400`（L364-460）。稀有度渐变/徽章（L263-283）是固定例外保留。 |
| `nurture/NurtureActions.vue` | **23** | **named 映射 + inline**：`ACTIVITY_CARD_CLASSES`/`ACTIVITY_BTN_CLASSES`（L191-200，green/purple/yellow 三档硬色）；心情色 inline `text-accent/text-yellow-400/text-red-400`（L447-450）；战斗训练卡 `bg-red-600/10`（L558）、按钮 `bg-red-600`（L615）、知识点 `text-blue-400`（L440）、进度条 `from-red-500 to-orange-500`（L589）、属性条 `bg-pink-400/bg-blue-400`（L505-507）。 |
| `nurture/InteractionPanel.vue` | **20** | **named 映射 + inline**：`INTERACTION_COLOR_CLASSES`（L18-23，blue/pink/green/purple 四档）；快速聊天 `bg-blue-600/20`（L453）、快速送礼 `bg-pink-600/20 text-pink-400`（L469-477）、礼物稀有度边框 `border-yellow-500/50 border-purple-500/50`（L563-565）、校园活动 `from-blue-600/10 to-purple-600/10`（L662-665）、心情色 inline 五档（L707-713）。 |
| `nurture/CharacterSelector.vue` | **15** | **inline 函数调色板**：`getBondLevel` 返回 `text-pink-400/text-red-400/text-purple-400/text-blue-400/text-yellow-400`（L58-64，**与 CharacterProfile.bondLevel 重复的第二份硬色**）；选择按钮 `bg-pink-600`（L77）、选中指示器 `bg-pink-400`（L188）、稀有度 shadow `shadow-green-500/20`…`shadow-red-500/40`（L177-181）、hover `border-pink-400`（L142）。 |
| `nurture/DialogueSystem.vue` | **3** | 用户气泡 `bg-blue-600 text-white`（L401）、发送按钮 `bg-blue-600`（L473）、输入框 focus `border-blue-500`（L468）。 |
| **养成簇小计** | **107** | inline 调色板 + named 映射 + 重复定义（bondLevel 有两份）是根因——R5 应抽一份语义令牌版 bond/mood 色映射统一消费，而非逐处替换。 |
| `views/SquadBattleView.vue` | **31** | 刷新敌人 `bg-orange-600`（L647/671）、执行回合 `bg-orange-600`（L907）、一键结算 `bg-purple-600`（L913）、restart `bg-blue-600`（L959）、爬塔规则卡 `bg-blue-900/20 border-blue-500 text-blue-400`（L753-757）、敌人名 `text-red-400`、战力 `text-yellow-400`、难度徽章组 `bg-yellow-500/bg-red-500/bg-purple-500`（L662-664，**与 `bg-accent` 混用，组内不一致**）、血条 `bg-red-600`（L830/889）、回合提示 `text-blue-400/text-red-400`、位置编号 `bg-blue-500/bg-red-500`。 |

**这块债的危害机制（债轮要传达的核心论点）**：硬编码色**直接打败了 5 套皮肤令牌系统**。养成/挑战塔簇这 138 处（107+31）饱和的 pink-500/yellow-400/blue-600/orange-600 **不随 data-skin 切换**。在默认暖阳皮肤下尚不刺眼（底色本就暖白），但用户一旦切到 `midnight`（21 23 30 深底 + 琥珀 accent）或 `neon`（11 15 26 深底 + 青霓虹 accent），养成页就炸出一片**与全站皮肤完全脱节的饱和色斑**——战力卡的粉紫渐变、经验条的黄橙、训练按钮的纯蓝、爬塔规则卡的亮蓝框，全是悬浮在深色主题之上的"上个时代的 UI"。**这就是"品质水位分裂"的精确物理机制**：不是抽象的"质量不均"，是"切了暗色皮肤这一页一眼穿帮"。

**同元素双标准（连续五轮未动）**：`AnimeCard` 数量徽章 `bg-accent text-on-accent` vs `CharacterCard` `bg-pink-600 text-white`——切非默认皮肤，动画格子和角色格子的数量徽章两个颜色。一行小修，并入 R5 颜色桶。

**判断（债轮终论）**：negotiation 把硬色全量钉死 R5 是对的安排（养成是 S6 大改面，不宜在功能轮稀释主菜）。**R5 清理的正确姿势不是逐处 sed 替换，而是连根拔反模式**：①养成簇抽一份"羁绊档色/心情色"的语义令牌映射（`text-accent`/`text-warning`/`text-danger`/`text-highlight` 等）统一消费——目前 bondLevel 在 CharacterProfile 和 CharacterSelector **各写了一份硬色**，逐处替换会漏、会再长出来；②SquadBattle 的实心按钮迁 `.btn-primary/.btn-secondary`、规则卡迁 `bg-surface-2 + border-line + text-info`、难度徽章组统一到 accent/warning/danger 语义档。

### 2.2 字体与排版

与前四轮一致（Noto Sans SC 单字体、字号韵律健康、emoji 当图标系统）。`GenreSets` 字号克制（title 1rem / sub 0.78rem / count 0.78rem / gap-name 0.7rem），层级清晰。养成 `CharacterProfile` 信息密度仍过高（一屏塞羁绊/等级/养成属性/实际战斗属性/战斗力/三格统计六大块），战力卡仍是唯一跳出来的元素——未动，随 R5 硬色清理可顺手收一收密度。

### 2.3 间距与信息密度

图鉴动画域发现栈本轮再加一段（段位 → 猜你想看 → 小众佳作 → **题材集册** → 图鉴一览），五段竖排首屏更长。但 `GenreSets` 默认全收起（一次只展开一个集册）+ 约 22 集册温和不刷屏，缓解了过长风险——这是 negotiation N1 部分接受的"折叠/限量"落地。`WatchingPins` 空列表自隐，不占位。整体呼吸感可接受，发现栈偏长仍是 N 级观察。

### 2.4 动效与过渡

本轮新增动效克制（集册进度条 `width .5s ease`、缺口卡 hover 反白、详情页内导航滚动归零自然）。**但债轮该记的三处掉档原样**：挑战塔升层仍无庆祝（`endBattle` 只 push 一行 battleLog）、SquadBattle 结算仍把 battleLog 当结算面板（vs BattleView 有正式奖励卡）、养成数值变化仍无飘字 delta。这三处不是本轮范围，记 backlog。

### 2.5 整体视觉性格与风格一致性

**5 轮净效果：干净层已覆盖抽卡/收藏/图鉴/年表/对战/小游戏新层/雷达/小众佳作/集册/正在追/详情枢纽——产品主路径已基本统一在皮肤令牌系统下、有一致的精致手感。** 泄漏层只剩养成 + 挑战塔两簇（138 处），且 negotiation 已锁定为 R5 一次性清理目标——**这是有计划的暂留，不是失控的债**。债轮清完这两簇，全站视觉性格才真正均匀。本轮最该记下的论点：**硬色债的危害不在默认皮肤下显不显眼，而在它让"5 套换肤"这个卖点在养成/挑战塔页失效——一个号称 5 套皮肤的产品，有两个核心系统页切了暗色皮肤就穿帮，这是对自家卖点的背刺。**

---

## Phase 3: 产品想象力

> 本轮是债轮，重心是把地板抬平，不重列已实装项（集册/相似作品/Pin/雷达/小众佳作/落子/保底）。本节给"5 轮终评的啊哈地图"+"可删"+ onboarding 缺口。

### 3.1 5 轮啊哈地图（终评：产品的情绪曲线现在长什么样）

经过 5 轮，AnimePlay 的啊哈链条已基本完整且分层清晰：

1. **抽卡仪式感（顶点啊哈，即时）** — 开盲盒 + 保底进度条可视，对标 Genshin/FGO 的掌控感。
2. **收藏/图鉴成果墙（积累啊哈）** — 抽到的卡进收藏，图鉴完成度 + 里程碑奖励。
3. **品味身份多轴雷达（第二啊哈，自我表达）** — 看过 ≥3 部解锁 5 轴人格雷达，对标 Letterboxd YIR 的"立体的我"。
4. **小众佳作正名（价值观啊哈）** — 被抽卡权重贬低的冷门佳作在发现层被表彰，产品价值观自洽。
5. **题材集册中线 + Pin 自设目标（长线啊哈，R4 新增）** — "永远差几部"的完成度墙 + 自己钉的追番清单，给"明天想回来"的理由。

**地图唯一的断点（R5 在范围内）**：第 3 项（品味身份）是产品**最强差异化**（Genshin 有图鉴无人格线、Letterboxd 有 list 无收集快感，AnimePlay 是两者交叉点），却**埋在三级页 + 对新用户完全无引导**。onboarding 4 步走完，新用户根本不知道"标几部看过的番能解锁你的番剧人格"这条线存在。**这是产品把最好的牌藏在了袖子里。** R5 该用一步 onboarding 把它亮出来（见 3.3）。

### 3.2 可以删掉的东西（≥1，债轮收口）

1. **删 `*_COLOR_CLASSES` / inline 调色板反模式（连根拔，R5 硬色清理时一并）** — 不是删功能，是删一个**会自我繁殖且已重复定义的反模式**：bondLevel 色在 `CharacterProfile`/`CharacterSelector` **各写了一份硬色**，moodStatus 色在 CharacterProfile/InteractionPanel 各写一份。R5 清养成簇 107 处时应抽**一份**语义令牌色映射统一消费，否则逐处替换治标不治本、下次加一档心情又长出新硬色。

2. **冻结 `/homestead`（R5 已规划，确认仍 active）** — 路由 L43-45 仍注册 + lazy-import HomesteadView 进构建产物，只是导航隐藏。SD 像素素材短期不就绪（本地 4070Ti 计划未落地），应彻底从 router 移出/注释，别让一个进不去的页占构建体积和心智。

3. **删 SquadBattleView 死文案 + 收 NurtureActions setTimeout 卫生** — L761「每日最多挑战10次」与功能已删的事实矛盾，删一行；NurtureActions 60 分钟未登记 setTimeout 改 schedule()。

### 3.3 onboarding 第 5 步点名品味身份（R5 在范围，啊哈地图唯一断点的补法）

**实读确认 `OnboardingGuide.vue` 是 4 步**：①每日打卡 → ②抽卡 → ③收藏图鉴 → ④第一场对战（止于此）。`steps` 数组无第 5 步，`maybeStartGuide` 在 App.vue:72 登录触发。**看过/品味雷达/集册/小众佳作这条"自我表达 + 长线"主线对新用户是完全无人引导的孤岛。** R5 加第 5 步（复用现成 step 结构 + route/cta 框架，零新组件）：

```
{ icon: '🎭', title: '解锁你的番剧人格',
  body: '在收藏或图鉴里把你真看过的番标记「👁 看过」——攒够几部，「🎮 小游戏 → 番剧品味画像」会给你一张专属的多轴人格雷达，还能解锁题材集册、把你追的番钉进「正在追」。这是只属于你的自我表达。',
  route: '/collections', cta: '去标记看过' }
```

**这一步把产品最强差异化（人格雷达/自我表达，vs Genshin）从袖子里亮出来，是 onboarding 唯一缺的一块。** 把"开始游玩"按钮挪到第 5 步。

---

## Phase 4: 一致性与对比

### 4.1 跨视图 / 跨页面体验一致性

**一致性强项（5 轮累积）**：看过口径全站统一（详情/图鉴印章/段位/主页计数/推荐条/小众佳作/集册缺口都读 union 显示态）；详情枢纽 `CardDetailModal` 现是干净层（导航/Pin/相似作品/4 硬色清）；发现出口（推荐条/小众佳作/集册缺口）就地落子手感一致。

**一致性裂缝（按严重度，债轮终版，全带坐标）：**
1. **品质水位分裂（坐标已硬计数，R5 主项）**：干净层（主路径全部）vs 泄漏层（养成 107 + SquadBattle 31 = 138 处）。**危害= 5 套换肤卖点在这两簇页失效**（2.1 详述）。
2. **原生弹窗 vs 主题化 UI（18 处，坐标已钉死，R5）**：confirm/alert 跳出皮肤语言（1.4 表）。
3. **同元素双标准（连续五轮）**：AnimeCard vs CharacterCard 数量徽章（accent vs pink-600）；SquadBattle 难度徽章组（accent 与 yellow/red/purple 混用）。
4. **死文案自相矛盾（新发现）**：SquadBattleView L761 vs L638 次数限制打架。
5. **结算体验不一致**：BattleView 有奖励结算卡，SquadBattle 把日志当结算。
6. **文档版本漂移（新发现，R5）**：CLAUDE.md v11 / pitfalls v6 vs 实际 v12。

### 4.2 与同类产品对比（5 轮终评）

**战略定位结论同前轮**（"抽卡仪式感 + Letterboxd 式自我表达 + Bangumi 真实数据"的三角交叉点几无竞品占据）。**5 轮累积的进展**：①第二啊哈从"一行字"升级成多轴人格雷达（对标 Letterboxd YIR）；②小众佳作雷达让价值观自洽（Letterboxd 式为冷门正名）；③保底进度条补上 Genshin/FGO 掌控感；④**R4 题材集册 + Pin 补上了长线收集牵引**——这是产品多轮来对标的最后关键差距，且 AnimePlay 把"收集完成"和"我的人格身份"缝起来（集册 persona 排序），**这是 Genshin（有图鉴无人格线）和 Letterboxd（有 list 无收集快感）都没有的独特闭环**。

**5 轮后产品 vs 竞品的水位**：玩法深度、长线牵引、自我表达三条线都已接上且做出了差异化护城河（真实观番 × 收集快感 × 人格身份）。**剩余差距不在功能而在打磨均匀度**——养成/挑战塔簇的视觉水位 + 原生弹窗 + onboarding 没亮出最强牌。这三样全是 R5 范围内的地板活，清完产品就具备"可发布"的精致度均匀性。

---

## Prioritized Recommendations

> 已排除 R1-R4 全部已实装项（CSS 变量修复 / 看过印章+段位 / 推荐引擎 / 排除契约 / 详情看过开关 / 派生 union / 人格雷达 / 主页 chip+Wrapped+分享 / C1 口径统一 / 小众佳作雷达 / 发现卡落子 / 保底进度 / **题材集册** / **详情页内导航相似作品** / **Pin 正在追** / **ViewingStats 换源** / **CardDetailModal 4 硬色清**）。**本债轮重心：把地板抬平，每条带精确坐标供 Planner/Generator 直接引用。**

### 🔴 Critical（功能 / 一致性缺陷，应优先）

*本轮无 Critical。* R4 四件全 A/A- 落地、零回归、489 测试、零存档——延续 R3 以来的收口质量。债轮的问题全是"地板"级（应做但不阻塞发布的精致度债），非阻塞缺陷。

### 🟡 Important（R5 债轮主线，应做）

**D1.（R5 头号债）养成 + 挑战塔簇硬编码色 138 处 — 连根拔反模式，非逐处替换。**
养成簇 **107 处 / 5 文件**（`CharacterProfile` 46 / `NurtureActions` 23 / `InteractionPanel` 20 / `CharacterSelector` 15 / `DialogueSystem` 3）+ `SquadBattleView` **31 处**。坐标见 Phase 2.1 表。**正确姿势**：①养成抽**一份**语义令牌版"羁绊档色/心情色"映射统一消费（目前 bondLevel 在 CharacterProfile + CharacterSelector 各一份硬色、moodStatus 两份——逐处替换会漏会复发）；②SquadBattle 实心按钮迁 `.btn-primary/.btn-secondary`、规则卡迁 `bg-surface-2/border-line/text-info`、难度徽章统一 accent/warning/danger 语义档。**危害论点（写进验收）：这 138 处不随 data-skin 切换，切 midnight/neon 暗色皮肤养成/挑战塔页一眼穿帮——5 套换肤卖点在这两簇失效。** 稀有度/资源识别色保留固定例外。

**D2.（R5）原生 confirm/alert 18 处 → 统一主题化弹窗。**
精确坐标见 Phase 1.4 表（已剔 2 误报）。一个 `useConfirm()`/`useAlert()` composable + 挂 App 顶层的弹窗组件，统一吃掉 18 处。**优先解锁确认四处同模式**（GenreSets:95 / RecommendationStrip:100 / NicheGems:68 / CodexPanel:227）；store 层 4 处（userStore:102/107/158、collection:113、persistence:173、battleSetup:39）脱离组件上下文，降级为非阻塞 toast（复用 `addLog` 通知通道）。

**D3.（R5）onboarding 第 5 步点名品味身份 — 亮出产品最强差异化。**
`OnboardingGuide.vue` 实读为 4 步止于对战，`steps` 数组加第 5 步（route `/collections`、cta「去标记看过」、文案见 Phase 3.3），把"开始游玩"挪到第 5 步。**复用现成 step 结构 + route/cta 框架，零新组件。** 这是啊哈地图唯一断点的补法——看过/人格雷达/集册这条自我表达主线（vs Genshin 的核心差异化）目前对新用户完全无引导。

**D4.（R5）文档版本号同步 v12。**
`frontend-vue/CLAUDE.md` Architecture 段「schema v11」+ 版本沿革表 → 补 v12 一行、改持久化标注为 v12；`docs/plans/pitfalls.md` L11「存档协议当前 v6」→ 改 v12（漂了 6 个版本，最该修）。实际 `schema.ts:30 SAVE_VERSION = 12`。

**D5.（R5）/homestead 彻底冻结/移出构建。**
`router/index.ts` L43-45 路由仍注册 + lazy-import HomesteadView 进构建产物（导航 App.vue:195-196 仅注释隐藏）。SD 像素素材短期不就绪，应从 router 注释/移出，别让进不去的页占构建体积。

**D6.（R5，新发现）SquadBattleView 死文案 + NurtureActions setTimeout 卫生。**
①`SquadBattleView.vue:761`「每日最多挑战10次」与 L638「无次数限制」+ 代码已删次数限制矛盾，删该行。②`NurtureActions.vue:270-272` 60 分钟未登记 setTimeout（+ L30-33 3s 同类）违反 CLAUDE.md 明令，建模 SquadBattleView 的 `schedule()` + onBeforeUnmount 清。

### 🟢 Nice-to-have（锦上添花，本轮可选/记 backlog）

**N1. 同元素数量徽章双标准** — `CharacterCard` `bg-pink-600 text-white` → `bg-accent text-on-accent`，与 AnimeCard 对齐（一行小修，可并入 D1 颜色桶）。

**N2. 图鉴动画域发现栈五段竖排偏长** — 集册已默认收起缓解；若仍长可把猜你想看/小众佳作两段并排或限量。

**N3. 雷达拉到主页 chip（negotiation 明确留 R5 backlog/按需）** — 主页 chip 点击展开迷你雷达预览，让"可凝视的人格图"出现在高曝光位（屏幕渲染区无 Canvas 出图坑）。

**N4.（延续）** 模态框补 ESC + focus trap + role="dialog"（养成三个选择 modal、CardDetailModal）；UpBanner 解析失败补错误/占位态（`v-if upCards.length>0` + catch return [] 会整块静默消失）；挑战塔升层加庆祝、SquadBattle 结算面板对齐 BattleView；年表卡片可点开详情；本地占位图替代 placehold.co。

### 💡 Feature Idea（放入 backlog，不进本轮）

**F1.（R4 后续）题材集册社交化** — 集齐题材徽章可分享、好友题材集册对比（"你集齐了机甲，他还差 3 部"）。

**F2.（R4 后续）集册完成解锁题材徽章挂到 TasteIdentityChip/雷达旁** — 把"收集完成"和"我是谁"两条线进一步缝死（注意：发徽章若要持久化已领状态 = 升 v13，需独立升档轮立项，本轮零存档铁律禁止）。

**F3.（延续）推荐理由人格化** — 结合 persona 把 `reasonTags` 升级为"作为『小众考古学家』，这部冷门高分番很对你胃口"。

**F4.（延续）真实观番闭环深化** — Pin「正在追」是第一步；进一步让"看完"解锁专属对战台词/养成话题/图鉴短评，把游戏货币与真实观番绑定（唯一能做的差异化护城河）。

**F5.（延续）品味画像社交化** — 好友契合度 %、雷达对比（两个多边形叠加）、可分享短链。人格雷达已就位，是天然的社交炫耀载体。

**F6.（S12 后端轮）彻底解耦 rarity** — 拆"抽卡权重 vs 图鉴价值锚"（需动后端 + 经济平衡），小众佳作雷达是前端弥合，根治在后端轮。

---

## 本轮回报（给 Planner）

- **本轮评分：8.4 / 10（上轮 8.2，+0.2）。** R4 长线牵引轮四件全 A/A- 落地（题材集册填中线真空、详情页内导航顺手还了嵌套 modal 债、Pin 给自设目标、CardDetailModal 残留硬色清净），零回归、489 测试、零存档四处 diff 空，连续第四轮工程纪律满分。加分克制，因为债轮要清的地板（养成/挑战塔簇硬色分裂）按计划本轮没碰——它正是 R5 的全部价值。

- **5 轮终评（产品水位与可发布性）**：**产品现在是"内核完整、主题做透、单局好玩、长线接上"的成熟 demo，水位卡在"可炫耀/可邀请试玩"与"可正式发布"之间——卡点不在功能或玩法（已过关），而在最后一层"精致度的均匀性"。** 五轮把闭环每段做上瘾、第二啊哈升华成人格雷达、价值观自洽、长线用集册+Pin 接上，且做出了独特护城河（真实观番 × 收集快感 × 人格身份，Genshin/Letterboxd 都没有的交叉点）。**差的就是本债轮要清的三块地板**：①养成/挑战塔簇硬色 138 处（切暗色皮肤一眼穿帮，背刺 5 套换肤卖点）；②原生 confirm/alert 18 处（一跳出就出戏）；③onboarding 没亮出最强差异化（人格雷达/自我表达这条线对新用户是孤岛）。**这三样全是地板不是天花板——不需任何新设计/数据/架构，纯粹把已建好的令牌系统/弹窗概念/onboarding 框架铺满最后几个角落。清完即从"可炫耀 demo"跨到"可发布成品"。**

- **Top 3 债/打磨建议（含精确坐标）**：
  1. **D1 养成+挑战塔硬色 138 处连根拔**（养成 107/5 文件 + SquadBattle 31，坐标见 Phase 2.1 表）——**正确姿势是抽一份语义令牌色映射统一消费**（bondLevel/moodStatus 现各有两份重复硬色，逐处替换会漏会复发），SquadBattle 实心按钮迁 `.btn-*`。验收写进"切 midnight/neon 暗色皮肤养成/挑战塔页不再炸饱和色斑"。
  2. **D2 原生 confirm/alert 18 处统一弹窗**（坐标见 Phase 1.4 表，已剔 2 误报）——优先解锁确认四处同模式（GenreSets:95/RecommendationStrip:100/NicheGems:68/CodexPanel:227），store 层 4 处降级 toast。
  3. **D3 onboarding 第 5 步点名品味身份**（`OnboardingGuide.vue` steps 加一步，route `/collections`，文案见 Phase 3.3）——亮出产品最强差异化，补啊哈地图唯一断点。
  - 附带快赢：**D4 文档版本同步 v12**（CLAUDE.md v11 / pitfalls.md L11 v6 → v12）、**D5 /homestead 冻结**（router L43-45 仍 active）、**D6 SquadBattle 死文案 L761 + NurtureActions setTimeout L270-272**。

*报告完。第 4 轮把长线真空补上了——题材集册填中线牵引、Pin 给自设目标、详情页内导航顺手还了嵌套 modal 债，主题做透、纪律满分、零回归。经过 5 轮，产品内核完整、玩法过关、长线接上、护城河成形，水位卡在精致度均匀性这最后一层。本债轮（R5）要清的三块地板我已钉死坐标：养成/挑战塔硬色 138 处（连根拔反模式而非逐处替换，危害是背刺 5 套换肤卖点）、原生 confirm/alert 18 处（统一弹窗）、onboarding 第 5 步亮出品味身份（最强差异化埋最深）。外加文档 v12 同步 / 家园冻结 / 两处死代码三个快赢。清完这一轮，AnimePlay 就从"很棒的 demo"跨到"可发布的成品"。*
