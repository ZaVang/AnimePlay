# Iteration 5 Plan（债轮·收尾轮）

> Sprint Planner 第 5 轮（mode=all 三审综合 · 最后一轮 = 打磨/还债轮）· 2026-06-24 · 覆盖写。
> 输入：product（体验 8.4）/ evolution（进化 9.2 终评）/ research（R5.1-5.7）三报告 + `docs/orch/scout.md` A 段（6 项全部纯前端零存档已亲验）+ `docs/plans/pitfalls.md` + `eval.md`（上轮 COMPLETE 无返工）。
> 基线：`schema.ts:30 SAVE_VERSION = 12`（Scout 亲验）。本轮**全部零存档**、不碰 schema/migrations/装配器/codex。
> 边界声明：本文件只定 **WHAT/WHY**，不写 HOW。file:line 落点已在 scout.md B 段，留给 Generator。

---

## 本轮取向（一句话）

把地板抬平、清技术债——**让前 4 轮的投资被新用户感知**：硬色连根拔（背刺 5 套换肤卖点）+ confirm/alert 统一弹窗（含共享解锁门面，一笔还两债）+ onboarding 点名品味身份（5 轮差异化对新用户隐形 = 最高 ROI）+ 收尾杂项三连（文档 v12 / 家园冻结 / 死代码修）。债轮项多但低风险，故纳 5 项任务、把快赢打包。

---

## 本轮任务（按依赖顺序）

> 排期硬约束（来自 Scout A/C 段）：**先抽共享基建（共享色映射 + 统一弹窗 composable + 共享解锁门面），再让各处消费**——避免逐处补导致漏/复发。T1、T2 各自先建基建再接入；T3-T5 互相独立。

### I5-T1｜养成+挑战塔硬色 138 处连根拔（抽共享色映射 + 整函数重写）
- **目标**：把养成簇（107 处 / 5 文件）+ SquadBattleView（31 处）的硬编码颜色迁到皮肤语义令牌，使养成页与挑战塔随 `data-skin` 正确换肤。
- **WHY**：这 138 处硬色不随皮肤切换 → 切 `midnight`（琥珀暗底）/`neon`（青霓虹暗底）时养成/挑战塔页炸饱和色斑，**5 套换肤卖点在这两簇直接失效**——背刺 S7 投入最大的差异化卖点，是债轮"让投资被感知"的头号目标。
- **硬约束（写进验收，防 partial-migration 漏/复发）**：
  1. **必须"抽共享色映射 + 整函数重写"，不是逐处 grep-replace 硬色行**。`bondLevel`（羁绊档色）在 `CharacterProfile.vue:20-78` 与 `CharacterSelector.vue:57-65` **各写一份**几乎逐字相同的硬色表；`moodStatus`（心情色）在 `CharacterProfile.vue:98-105` 一份、`InteractionPanel.vue:707-713` 一份——必须新建**一份共享语义色映射**（Scout 建议落点 `config/nurtureColors.ts`，纯常量/纯函数零 Vue/IO），两处 bondLevel + 两处 moodStatus + 3 个 named 映射（INTERACTION/ACTIVITY）都改成消费它。否则逐处替换会漏、加一档心情又长出新硬色。
  2. **partial-migration 陷阱**：这些函数已有零星几档迁了语义类（CharacterProfile L56/L72/L101、CharacterSelector L62/L64），其余档仍硬色——**整函数重写成调共享映射**，禁止"同一函数里半语义半硬色"。
  3. 颜色铁律不破：禁 `text-white` 压浅底、禁动态拼色 `bg-${color}`、禁未定义令牌。
- **合法例外（保留硬色，不要动）**：稀有度渐变/徽章（CharacterProfile.vue:263-283、CharacterSelector 稀有度 shadow L177-181）、CardDetailModal `bg-gray-500` 兜底、图片压片白字——颜色铁律明文的固定识别色例外。
- **取舍声明（写进验收）**：语义档去重后**羁绊 6 档会塌成 4-5 个语义色**（accent/danger/highlight/info/warning/ink），档与档颜色会重复——这是从"6 个饱和硬色"到"5 套皮肤协调色"的必然取舍。验收看的是**"切暗皮不炸色斑"**，不是"6 档全异色"；icon(emoji) 不变保留区分度。
- **范围裁决：全量 138 一轮清完**（养成 + 挑战塔同一任务，理由见下方裁决②）。
- **依赖**：无（先建 `config/nurtureColors.ts` 再接入）。
- **零存档**：是（纯模板/computed 改色，不碰持久化）。
- **来源**：product 🔴-1 / evolution 🟡 / research（硬色还债）/ scout D1+B1+C3。

### I5-T2｜原生 confirm/alert 18 处统一主题化弹窗（含共享解锁门面）
- **目标**：把全仓 18 处原生 `confirm/alert` 收口为统一主题化弹窗基建；其中 4 处逐字重复的"解锁四件套"先抽成共享解锁门面，再走统一弹窗。
- **WHY**：原生 `confirm/alert` 是浏览器灰框，与 5 套皮肤完全割裂、移动端体验差、且 4 处解锁逻辑逐字重复（重复概念债）。一笔投入同时还**散落原生弹窗债 + 重复解锁概念债**——债轮 ROI 最高的清偿之一。
- **硬约束（写进验收）**：
  1. **统一弹窗须新建**——全仓无任何通用 Modal/Dialog/Confirm/Toast 组件（13 个 modal 全 feature-specific）。新建一个挂 App 顶层的主题化弹窗组件 + 一个 composable（`confirm()/alert()` 返回 Promise），**走语义令牌**（仿 OnboardingGuide 的 Teleport+backdrop 样式，禁 text-white 压浅底）。
  2. **先抽共享解锁门面再接入**：4 处解锁确认（GenreSets/RecommendationStrip/NicheGems/CodexPanel）逐字重复同一套"登录守卫 → 余额守卫 → confirm 花费 → unlockCodexCard → 失败提示"——先抽一个共享门面（Scout 建议 `composables/useUnlockConfirm.ts`），**必须收 domain 参数**（3 处 anime-only、CodexPanel 是 anime|character 双域，**别写死 anime**），4 处 `handleUnlock` 收敛到一行调用。
  3. **守卫不重复漂移**：`userStore.unlockCodexCard`（userStore.ts:233）**已自带**登录守卫 + 卡片存在 + 余额/已拥有判断并返回 `{ok, error}`——共享门面应**以 store 返回的 error 为准**，UI 只负责 confirm + 展示 error，避免守卫逻辑两层重复。
  4. **store 层 4 处降级 toast**：`userStore.ts:102/107/158`、`collection.ts:113`、`persistence.ts:173`、`battleSetup.ts:39` 脱离组件上下文，**不走 Promise 弹窗**，降级为非阻塞 toast（复用既有 `profile.addLog` 通知通道）。
- **触达面提醒（排期）**：这是债轮唯一"建新基建"而非"改已有"的项，触达 14 组件 + 4 store——虽零存档零风险，但工作量集中。
- **依赖**：无（先建弹窗组件 + composable + 解锁门面，再各处接入）。
- **零存档**：是。
- **来源**：product 🔴-2 / research R5.1 / scout D2+B2+C2+C5。

### I5-T3｜onboarding 点名品味身份（新增第 5 步，value-first 改写开场）
- **目标**：① 在 onboarding 末尾**新增第 5 步**，点名"品味/番剧人格"主线，route `/collections`，引导新用户去标记看过；② 同时把**开场第 1 步**从"每天来打个卡"的功能罗列改成 **value-first** 文案（"这里会照出你的番剧人格"），让 5 轮做的差异化主线对新用户第一眼可见。
- **WHY**（最高 ROI）：前 4 轮把"发现番剧人格/品味画像/题材集册"做成了产品主线与差异化卖点，但 onboarding 4 步只讲打卡/抽卡/收藏/对战，**对新用户完全隐形**——新用户看不见这条主线 = 5 轮差异化投资白费。evolution 终评判定这是最高 ROI 项。
- **裁决（加第 5 步 + value-first 改写，二者都做，理由见下方裁决①）**：
  - 加第 5 步：`steps` 数组（`OnboardingGuide.vue:24-51`）是 `steps.length` 派生的纯数组，末尾 push 一步对象即可，`isLast`/进度点/「开始游玩」按钮自动适配，**零逻辑改动**。
  - value-first 改写开场：**改现有第 1 步文案，不新增步**（research"每多一步都是流失点"——故只在末尾加 1 步点名品味，其余靠改文案，不堆步数）。
  - **纳入 research 的"引导里让用户标 2-3 部看过"建议**：第 5 步 cta 跳 `/collections` 引导用户标记看过 → 避免落到雷达/集册**全 0 灰墙**（首屏空态劝退）。**但不在 onboarding 流程内调用 `toggleTasteWatched`**——跳转后由用户在 `/collections` 自行触达（门面 `userStore.ts:341` 已存在），保持引导只导航不写状态。
- **硬约束（写进验收）**：完成标志走设备级 localStorage（`stores/onboarding.ts`，仿既有先例），**不进存档、不升 schema**；新步骤颜色走语义令牌。
- **依赖**：无。
- **零存档**：是（onboarding 完成标志设备级 localStorage）。
- **来源**：product D3 / evolution 🔴-1 / research R5.2 / scout D3+B3。

### I5-T4｜/homestead 完整冻结（路由守卫 + 移出构建）
- **目标**：把家园页从"导航已藏但路由仍 active"改为**完整冻结**——手敲 `/homestead` 不再渲染半成品。
- **WHY**：现状导航已注释隐藏（`App.vue:195-197`）但路由仍注册 + lazy-import（`router/index.ts:42-46`），手敲 URL 仍渲染 `HomesteadView.vue` 半成品 → 新用户/分享链接可触达未完成功能，露馅。research R5.3 明确要"完整冻结路由守卫"，非只藏导航。
- **硬约束（写进验收）**：路由层 `redirect:'/'` + **删 component import**（HomesteadView 移出构建产物，连带省构建体积）；App.vue:195-197 导航注释块一并删除。`HomesteadView.vue` 仅被 router 引用（Scout grep 确认无别处 import），无连带影响。view 文件本身保留（**冻结不删除**，路由/代码保留口径延续 0007e8b commit）。
- **依赖**：无。
- **零存档**：是。
- **来源**：product 快赢 / evolution 🟡 / research R5.3 / scout D5+B4。

### I5-T5｜收尾杂项三连（文档 v12 + 死代码 + setTimeout 登记）
- **目标**：打包三类低风险还债——① 文档版本同步 v12；② 两处死代码修（SquadBattle 矛盾文案 + CardDetailModal 用 MAX_PINS）；③ NurtureActions 未登记 setTimeout 收口。
- **WHY**：文档漂移会误导后续轮按旧版本判断存档结构（pitfalls 是全角色必读文档，自身漂 6 版最危险）；死代码/矛盾文案露给用户即降低专业感；裸 setTimeout 违反计时器铁律（"有 onUnmounted"≠"所有计时器都登记了"的假安全）。三项都是债轮该一次性扫掉的地板灰尘。
- **裁决：三连打包成一个任务**（理由见下方裁决③）。
- **子项与硬约束（写进验收）**：
  1. **文档 v12 同步**（纯文档零代码）：`frontend-vue/CLAUDE.md` 版本沿革表 v11 → 补 v12 一行（tasteProfile 持久化）；`docs/plans/pitfalls.md` L11 + L34「存档协议 v6」→ v12（漂了 6 版，最该修）。权威值 `schema.ts:30 SAVE_VERSION = 12`，根目录无 CLAUDE.md。
  2. **SquadBattle 矛盾文案**：删 `SquadBattleView.vue:761`「每日最多挑战10次」整行（与 L638「无次数限制」矛盾，代码侧限制已删，注释 L204/L221 为证）。
  3. **CardDetailModal Pin 满文案**：`CardDetailModal.vue:66` 用 `watchingPins.pinnedIds.length`（当前已 pin 数）表上限属语义错位（凑巧 = 8）→ 改用导出常量 `MAX_PINS`（`watchingPins.ts:18`）。
  4. **NurtureActions setTimeout 登记**：`NurtureActions.vue:30-33`（3s 动画）+ `L270-272`（最长 60min 训练播报）两处裸 `setTimeout` 未登记，违反计时器铁律——现有 `onUnmounted`(L425-428) 只清 setInterval。仿 `SquadBattleView.vue:570-571` 的 `schedule()`（登记进集合）+ L597（卸载 forEach clearTimeout）收口。**坑接受声明**：60min 训练播报卸载清除后离开养成页不再 fire，是体验性日志非状态变更，可接受。
- **依赖**：无（与 T1 SquadBattle 改色互不冲突——T5 改文案/计时器，T1 改颜色，同文件需注意合并）。
- **零存档**：是。
- **来源**：product 快赢三连 / scout D4+D6+B5+B6+C1+C4。

---

## 裁决点（Planner 定夺 + 理由）

### 裁决①：onboarding —— 加第 5 步 **且** value-first 改写开场（二者都做）
- product/evolution 要"加第 5 步点名品味"，research 要"value-first 改写现有步不新增步"——两者目标一致（让新用户看见品味主线），分歧在加步 vs 改文案。
- **裁决：都做，但克制**——末尾**只加 1 步**点名品味（route `/collections`），**同时改第 1 步开场文案**为 value-first。理由：① Scout 核实加步是 `steps.length` 派生零逻辑改、风险最低；② research"每多一步都是流失点"成立，故**只加 1 步、不堆步数**，其余 value 靠改文案吸收——既点名品味又不增流失面。两建议非互斥，取并集是最小代价最大收益。
- **research"引导里标 2-3 部看过点亮雷达/集册"：纳入**——第 5 步 cta 跳 `/collections` 引导标记，避免新号落到全 0 灰墙（首屏空态劝退）。但**引导内不调用 `toggleTasteWatched`**（保持引导只导航不写状态，门面已存在用户可自行触达），避免引导流程内嵌业务写入。

### 裁决②：硬色 —— 全量 138 **一轮清完**（不分两步）
- **裁决：养成 107 + 挑战塔 31 同一任务一轮清完**。理由：① 债轮低风险、Scout 已把全量坐标 + 两份 bondLevel/两份 moodStatus 重复点 + 共享映射落点全部接地，信息完备无需分批探路；② **核心成本在"抽共享色映射"这一次性基建**，养成与挑战塔都消费同一套语义令牌（skins.css 5 皮肤已定义齐全），分两步反而要把基建拆两半、徒增协调成本；③ 分步会留"半个页面换肤、半个不换"的中间态，比一次清完更难验收。
- **硬约束（必写进验收，防 partial-migration 复发）**：**抽共享色映射 + 整函数重写**，禁止逐处 grep-replace 硬色行（已有半迁移档，逐处替换必留半语义半硬色）。

### 裁决③：死代码三连 + 文档同步 + 家园冻结 —— **家园冻结拆出独立 T4，其余三连打包 T5**
- **裁决**：家园冻结（T4）独立，文档 v12 + 死代码 + setTimeout（T5）打包。理由：① 家园冻结改 router + App.vue 导航、有"移出构建产物"的连带效果，是**一个语义完整的"冻结"动作**，独立成任务验收点清晰（手敲 `/homestead` redirect 到首页）；② 文档 v12 / SquadBattle 文案 / MAX_PINS / setTimeout 四个子项是**互不相关的零散地板灰尘**，逐个立任务过碎，打包成"收尾杂项"一次扫掉、一组验收命令覆盖最省协调。债轮就该把碎债打包清。

---

## 本轮明确不做

- **品味社交亲和度对照（evolution 💡 / research R5.5-5.7）= 5 轮后最大剩余机会，记为 S12 backlog 路标**。
  - **是什么**：用已有的品味画像/人格雷达数据做"玩家间品味亲和度对照"（找到品味相近的人、对照雷达重合度、社交化的品味发现），把单机的"番剧人格"升级为"可比较、可社交"的身份资产。
  - **为什么本轮不做**：需后端（用户间数据交换/匹配/存储）+ 跨栈，**触 schema 与后端权威**，与本轮"零存档纯前端债轮"取向根本冲突。这是 5 轮纯前端打磨能做的天花板之上、**唯一需要架构升级才能解锁的最大增量**。
  - **路标**：归入 SPRINT.md 既有 S12（PvP/排行榜/后端权威）同一波后端化浪潮，建议届时 `/think` 先定数据模型与隐私边界。
- **品味字段彻底删除/升档**：第 4 轮保留的 `genreProgress` 等存档字段彻底清理需升 v13（三处同改 + 迁移测试），**本轮零存档不做**。
- **SquadBattleView ~1000 行拆分**（S6 历史 refactor target）——大重构，债轮不碰。
- **声优维度**（数据被 server.py 剥离，需后端配合）——非前端可解。

---

## 来自 Reviewer 的改进项（采纳的）

- **research R5.1**：confirm/alert 先抽共享解锁门面（用 MAX_PINS / store 返回 error 为准）再统一弹窗 → 采纳进 T2（一笔还两债）。
- **research R5.2**：onboarding value-first 改写而非纯堆步 → 采纳进 T3（加 1 步点名品味 + 改开场文案，不堆步数）。
- **research"引导里标 2-3 部看过点亮雷达/集册"** → 采纳进 T3（第 5 步 cta 跳 `/collections`，避免全 0 灰墙；引导内不写状态）。
- **research R5.3**：家园完整冻结（路由守卫 + 移出构建）而非只藏导航 → 采纳进 T4。
- **evolution 终评"onboarding 点名品味 = 最高 ROI"** → T3 排为本轮核心增量项。
- **Scout C3 partial-migration 警示 / C2 store 守卫已存在 / C4 假安全 setTimeout** → 全部写进对应任务硬约束与验收。

---

## 相关陷阱（pitfalls.md + scout C 段）

- **[共享色映射]**（C3）：硬色已"部分迁移"——Generator 若只 grep 硬色逐处替换会留"半语义半硬色"。必须**抽共享映射 + 整函数重写**，不是挑硬色行替换。映射落点 `config/nurtureColors.ts`（纯常量/纯函数零 Vue/IO，依赖只向下）。
- **[统一弹窗须新建]**（C5）：全仓 13 modal 全 feature-specific，无通用 confirm/alert/toast 基建——T2 是债轮唯一"建新基建"项，留出新建 + 全仓 14 组件接入工作量。
- **[解锁门面收 domain]**（C2 / B2 坑）：3 处 anime-only、CodexPanel 双域——门面**必须收 domain 参数别写死 anime**；`unlockCodexCard` 已自带守卫，UI 守卫是重复，以 store error 为准。
- **[setTimeout 登记清除]**（C4 计时器铁律）："有 onUnmounted"≠"所有计时器都登记了"——NurtureActions 的 setInterval 已清但两个 setTimeout 漏网。仿 SquadBattleView `schedule()` 登记 + 卸载 forEach 清。CLAUDE.md Startup 段明文："组件内多步 setTimeout 必须登记并在卸载时清除（参照 SquadBattleView 的 schedule()）"。
- **[双重守卫 / 冻结]**（B4）：家园 redirect + 删 import，导航注释一并删，view 文件保留（冻结不删除）。
- **[颜色铁律]**（pitfalls 前端工程）：语义类 / `rgb(var(--c-*))`，禁 text-white 压浅底、禁动态拼色、禁未定义令牌；稀有度/资源识别色 + 图片压片白字是固定例外。
- **[零存档铁律]**（pitfalls 存档/持久化）：本轮全部零存档——schema/migrations/装配器/codex 四处 diff 必须全空，SAVE_VERSION 仍 12。共享色映射/统一弹窗/onboarding 步/死代码修全纯前端。
- **[文档漂移自纠]**（C1）：版本号引用应集中到 `schema.ts:30`，文档只指向不复述——T5 修完建议在 pitfalls 沉淀此条避免再漂。
- **[测试纪律]**（pitfalls 前端工程）：`npm run test`（vitest），**不要跑 `npm run lint --fix`**（全仓重排）；单文件 `npx eslint <path>`；共享色映射/解锁门面若含纯函数配特征测试。

---

## 上轮分析（eval.md COMPLETE）

第 4 轮（长线牵引轮）四任务 I4-T1~T4 全部 `[x]` 真修真做、**零返工债**。Evaluator 亲跑五条验收命令全绿：type-check 0 错 / test **489 全绿 41 文件** / build 6.02s / 后端 PASS exit 0 / debug 零命中。零存档铁律坐实（schema/migrations/persistence/codex 四处 diff 全空，SAVE_VERSION=12；genreProgress 字段保留未删；Pin 走设备级 localStorage）。集册护栏（纯展示墙、不发奖/不记已领/不持久化、桶用剔噪 contentIndex、persona 排序）通过。**本轮测试基线 ≥489**，新增不弱化既有。

---

## 验收命令（从 docs/SPRINT.md 原样）

`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（≥489 全绿 + 新增，不弱化既有）/ `npm run build`（通过）；回归基线 `python backend/test_security.py`（全 PASS、退出码 0）/ `grep -rn "debug=True" backend/server.py api/index.py`（零命中）。**零存档铁律**：SAVE_VERSION 仍 12、schema/migrations/装配器三处无改动。
