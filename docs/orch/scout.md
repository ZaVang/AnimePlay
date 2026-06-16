# Scout Report — Iteration 3 (evolution)

> Code Scout 侦察产出（只读）。方向来源：`docs/orch/evolution-audit-report.md` Round 3「Prioritized Recommendations」。
> Planner 最可能选 🔴-1 新人 onboarding + 🟡-2 可分享 Wrapped 成绩卡（两者零后端、几乎不动存档、一 Sprint 可并落）。
> 本轮所有结论均已核到源码行号。**注意：CLAUDE.md/pitfalls.md 个别处仍写 schema v4——实际已是 v6**（见 §A1/§C1）。

---

## A. 约束可行性

### A1. schema 现状是 v6（不是 v4/v5，文档有滞后）
- `infra/persistence/schema.ts:24` → `export const SAVE_VERSION = 6 as const;`
- v6（evolution-1）已纳入 `daily` / `codexMilestones` / `achievements`，迁移在 `migrations.ts:114-116`。
- **坑**：`frontend-vue/CLAUDE.md` 仍写「schema v4」「Save protocol gaps 已在 S5 解决（v2）」；根 `docs/plans/pitfalls.md:11` 写「当前 v4」。这两处是历史快照，**别据此判断版本**。当前权威：`SAVE_VERSION = 6`。
- 三处同改铁律仍成立：`schema.ts` + `migrations.ts`（`migrate()` 内 + 一个 `migrateXxx` 字段兜底函数）+ `stores/persistence.ts`（`buildPayload`/`applyPayload`）。迁移补默认 + 不破坏现有往返测试。

### A2. onboarding 状态：用 localStorage（设备级，**不进存档**）——强 reviewer 共识 + 有现成模板
- reviewer 明确建议（audit:157、178）：「已看过引导」用 localStorage / 一个布尔即可，**不一定需要升 schema**；若要随账号漫游再进 v7，否则 localStorage 足够。
- **现成模板**：`stores/theme.ts:21-34`（`readLocalSkin`）与 `:43-47`（写）——try/catch 包裹、key 常量、node 无 DOM 静默回落。`stores/settings.ts:44/54` 同款（`ui-settings`）。**照抄这个 pattern 写 onboarding 标志**，零新依赖、零存档改动、不触发三处同改。
- 推荐：新建一个轻量 composable 或新 onboarding store，读写 `localStorage['onboarding-done']`（或类似 key）。引擎纯净铁律只约束 `engine/`，stores 层用 localStorage 合法（theme/settings 已先例）。
- **engine 铁律不受影响**：onboarding/成绩卡都在 views/components/stores 层，不碰 `engine/`（`engine/index.ts:7` 禁 localStorage/DOM，但那只管 engine 目录）。

### A3. 成绩卡：纯前端、零后端、零存档、零联机——本轮最低风险项
- 所有数据源都是现成派生 getter（见 §B5），无需新字段、无需迁移。
- **无 SVG/Canvas 导出先例**：全仓 grep `toBlob/toDataURL/createObjectURL/download/html2canvas` 命中为 0（唯一 canvas 用法是 `components/GuessCharacter.vue:61/87`，那是猜角色剪影遮罩，非导出）。→ **成绩卡的「出图 + 下载」要纯新写**，但都是标准 Web API，无需引重依赖（别引 html2canvas）。实现路径见 §B6。
- 颜色铁律：成绩卡若用 DOM/SVG 渲染界面壳，界面色走语义类 / `rgb(var(--c-*))`；但**导出图本体建议用固定色自绘**（Canvas/SVG 字符串），因为导出物要脱离皮肤 token 独立成图（截图分享场景），这属于「图片压片」类的固定色合理例外（pitfalls 第24条 / CLAUDE 颜色例外）。

### A4. 验证口径
- 测试 `npm run test`（vitest，约 340）；类型 `npm run type-check`；构建 `npm run build`。**不要跑 `npm run lint`（带 --fix 全仓重排）**，单文件用 `npx eslint <path>`（pitfalls:22 / CLAUDE）。
- onboarding 组件 + 成绩卡新组件二者都无 store 持久化改动 → 不需补迁移测试；只有 Planner 顺带做 🟡-3 周任务/连签（升 v7）才需补迁移测试（§C2）。

---

## B. 代码地图 + 坑

### B1. isNewUser 完整流（reviewer 说「只初始化空存档、之后 UI 再不读」——已核实，属实）
- **来源**：`infra/persistence/api.ts:58-66` `fetchUserSave` → 后端 `data.isNewUser` true 时返回 `{ isNewUser: true, raw: null }`。
- **唯一消费点**：`stores/persistence.ts:151-173` `loadFromServer`：
  - `:157` `if (result.isNewUser)` → 仅 `resetAllDomains()` + `currentSaveVersion = 0` + 一行欢迎日志（`:160` `profile.addLog('欢迎新玩家！…')`）。
  - **isNewUser 在此被消费完即丢，不外传、不存任何标志、UI 层无从读取**。reviewer 描述完全准确。
- **login 流**：`stores/userStore.ts:63-87` `login()` → `loginRequest` 拿 token → `setAuthToken` → `profile.currentUser = username` → `await loadFromServer()` → `:76` 发每日登录奖励。**login 不感知 isNewUser**（它在 loadFromServer 内部被吃掉）。
- **建议落点（onboarding 触发判定）**：
  - **方案 A（推荐，reviewer 倾向）**：纯 localStorage 设备标志，与 isNewUser 解耦。首次登录后若 `localStorage['onboarding-done']` 不存在 → 触发引导，看完/skip 写入。简单、零存档、与「老存档首次在新设备登录也想看引导」语义一致。
  - **方案 B（若想精确「服务端认定的新用户」）**：把 isNewUser 从 `loadFromServer` 透出。最小改动：`loadFromServer` 返回 `boolean`（或写入 profile/新 store 的 `isNewUser` ref），`login` 接住后置一个会话级 `shouldOnboard`。但这会动 persistence 编排签名，比 A 重。
  - **结论**：A + B 可叠加（localStorage 主判 + isNewUser 仅决定「新号自动弹、老号不弹」）。reviewer 与最低改动都指向**以 localStorage 为主**。

### B2. 主屏结构 + onboarding 引导挂点
- **登录 UI 与导航都在 `App.vue`**（非视图）：
  - 登录框/登出在 header `:64-112`；`handleLogin`（`:16-33`）调 `userStore.login`。
  - 左侧 8 项一级导航 `:122-135`（`<RouterLink>` 列表）——红点要挂这里（§C3）。
  - 路由出口 `<RouterView>` 在 `:149`，外层有数据门控（`:139-148` error / not-ready 态）。
- **遮罩引导挂点建议**：onboarding 是全屏遮罩 overlay，最合理挂在 **`App.vue` 模板顶层**（`.app-shell` 内、`<header>` 同级或末尾），`v-if="shouldOnboard"` 控制，`z-index` 高于 header（header 是 `z-50`，遮罩用更高）。这样跨路由都能盖住、且能高亮导航项。
  - 引导步骤指向系统时，可用 `useRouter().push('/gacha')` 跳页，或纯文案箭头指向 App.vue 导航项 / HomeView 面板。
- **HomeView 结构**（`views/HomeView.vue`，仅 8 行组合）：`PlayerStatus` → `DailyTasksPanel`（每日任务面板，onboarding「这是今日任务」步骤的指向目标）→ `WatchQueue` → 三栏。**onboarding 第 1 步指 DailyTasksPanel、第 2 步指导航「卡牌收藏→图鉴」、第 3 步指导航「抽卡系统」**——都现成可指。

### B3. 首抽庆祝挂点（drawCards 的 isNew 标记现成）
- `stores/userStore.ts:99-149` `drawCards`：
  - `:122` `const { isNew } = collection.addCard(...)`；`:123` `if (isNew) card.isNew = true`。**每张卡带 `isNew` 标记，已传到结果**（`DrawnCard.isNew`）。
  - `:130` 稀有卡只 `addLog('🎉 恭喜…')`（一行文字，reviewer 说的「首抽无仪式感」属实）。
  - 末尾 `:147` `saveToServer()` 后返回 `drawnCards`。
- **抽卡结果 UI 链**：`views/GachaView.vue:43` `await userStore.drawCards(...)` → `:45` `drawnCardsResult.value = drawnCards` → `:46` 开 `GachaResultModal`（`:261-266`）。
- **`GachaResultModal.vue` 已有完整仪式感地基**（逐张翻面 `:151-165`、稀有度光环 `glow-ur/hr/ssr` `:167-188`、headline「传说降临」`:51-56`）。**首抽庆祝最省做法**：
  - **挂点优先级 1**：在 `GachaResultModal` 内加「首抽特殊态」——传入 `isFirstDraw` prop（由 GachaView 判定），首抽时叠加 confetti/sparkle 层。复用现有 modal，不必新组件。
  - 「是否首抽」判定：读 `gachaStore.animeHistory.length === 0 && characterHistory.length === 0`（抽卡历史现成，见 userStore `:356-357`）——零新状态，**推荐用历史长度判定**，避免再加 localStorage 标志。
- ⚠️ modal 已用 `setTimeout` 做揭示动画并在 watch 里 `clearTimeout`（`:25`）；加 confetti 若用定时器/RAF，**必须登记并在卸载/关闭清除**（CLAUDE startup 段「多步 setTimeout 必须登记清除」铁律，参照 SquadBattleView 的 schedule()）。

### B4. 空状态现状（死文字位置 + 加 CTA 落点）
全部已定位，CTA 改造点：
- `views/CollectionsView.vue:189` 「请先登录以查看您的收藏。」（未登录态，`v-if="!userStore.isLoggedIn"`）
- `views/CollectionsView.vue:195` 「找不到匹配的动画卡」（`filteredAnimeCards.length === 0`）→ 加「去抽卡 →」CTA（`router.push('/gacha')`）。
- `views/CollectionsView.vue:220` 「找不到匹配的角色卡」→ 同上。
- `components/CollectionPreview.vue:54` 「还没有喜爱的动画卡牌。」/ `:64` 「还没有喜爱的角色卡牌。」
- `components/decks/DeckList.vue:37` 「你还没有创建任何卡组。」
- `components/battle/CharacterSelectModal.vue:163` 「你还没有收藏任何角色」（已有条件文案，可加 CTA）
- `components/gacha/GachaHistory.vue:148` 「还没有抽卡历史记录。」
- **图鉴空态是范本（reviewer 点名最佳）**：灰位剪影 + 「🔓 X 知识点」角标已在 CodexPanel（定向解锁），其他空态可仿照「还差什么 + 怎么补」加 CTA。
- ⚠️ 注意 `CollectionsView.vue:167/179` 现有「一键分解」按钮用了 `bg-danger text-white`——**新加 CTA 按钮请用 `.btn-primary/.btn-secondary`（CLAUDE 颜色铁律），别学这个 text-white**。

### B5. 成绩卡数据源 getter（逐一核名 + 可取性，全部现成派生）
| 数据 | 来源 | getter / 字段 | 行号 | 备注 |
|---|---|---|---|---|
| 图鉴完成度（动画 owned/total + byRarity） | `stores/codex.ts` | `animeCompletion`（computed → `{owned,total,byRarity}`） | `codex.ts:57` | 纯派生，遍历全量卡 |
| 图鉴完成度（角色） | `stores/codex.ts` | `characterCompletion` | `codex.ts:58` | 同上；UR n/m 取 `.byRarity.UR` |
| 已领里程碑 / 可领 | `stores/codex.ts` | `claimableMilestones`、`claimedMilestones` | `codex.ts:83`、`:31` | 红点也用 claimableMilestones |
| 玩家等级/经验 | `stores/profile.ts` | `core.level` / `core.exp` | `profile.ts:39` | 经 userStore `playerState.level` 也可读 |
| 三货币 | `stores/profile.ts` | `core.knowledgePoints` 等 | `profile.ts:39` | |
| 成就已解锁数 N/总 | `stores/achievements.ts` | `unlocked`（string[]，`.length`=解锁数）；总数 `ACHIEVEMENTS.length`（config/achievements） | `achievements.ts:32` | `isUnlocked(id)` 现成 |
| 塔进度 | `stores/pve.ts` | `towerProgress`（`.maxFloor` / `.currentFloor`） | `pve.ts:14` | userStore `towerProgress` 也转发（`:447`） |
| 真实番剧 date（放送年） | `gameDataStore.allAnimeCards` × `collection.animeCollection` | 卡 `.date`（"2025-04-01" 取 `slice(0,4)`） | `types/card.ts:26` | CardDetailModal `:71-74` 已有取年法可复用 |
| 真实评分 | 同上 | 卡 `.rating_score` / `.rating_rank` / `.rating_total` | `types/card.ts:27-29` | audit 实测 250 张 100% 覆盖 |
| 拥有的卡集合 | `stores/collection.ts` | `animeCollection`（Map<id,{count}>）、`getAnimeCardCount` | `collection.ts:15`、`:20` | 聚合年表/平均分时遍历这个 Map + gameData 查卡 |
| 抽卡历史（欧气：本月 UR 数） | `gachaStore` | `animeHistory`/`characterHistory`（含 rarity + timestamp） | userStore `:356-357` | timestamp 现成可按月筛 |

- **聚合派生写哪**：建议**新建一个纯派生 computed/composable**（如 `composables/useWrappedStats.ts` 或一个只读 `stores/wrapped.ts`），把上述跨 store 数据聚合成「成绩卡视图模型」（完成度/年表跨度/平均分/最高分排名/欧气）。**不进存档、不触发 saveToServer**（纯读）。
- ⚠️ 卡类型 `AnimeCard` 的 date/rating 是可选字段且 BaseCard 有 `[key:string]:any` 兜底（`types/card.ts:13`）——读时做 `typeof === 'number'` / 存在性守卫（CardDetailModal `:85` 已是这么做，照抄）。audit 也提示可顺手补 AnimeCard 可选字段类型（小债）。

### B6. 成绩卡「出图 + 下载」实现路径（无先例，纯新写，但标准 API）
推荐**最省路径**，两条可选：
- **路径 1（最稳，推荐）：手绘 Canvas**。新组件里建 `<canvas>`，`ctx.fillText/fillRect/drawImage` 把聚合数据画上 → `canvas.toBlob(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='animeplay-wrapped.png'; a.click(); URL.revokeObjectURL(url); })`。全程标准 API，零依赖。缺点：排版要手算坐标。
- **路径 2：SVG 字符串 → `<img>` → canvas.drawImage → toBlob**。先拼 SVG 字符串（模板字面量，排版用 SVG text/rect 比 canvas 坐标好写），`new Image()` 加载 `data:image/svg+xml;base64,...`，`onload` 后 `ctx.drawImage` 再 `toBlob` 下载。缺点：SVG 引外部图片（卡封面）有跨域/taint 风险——**canvas 被 taint 后 toBlob 抛 SecurityError**。卡图是同源 `/data/images/...`（CLAUDE Data 段），同源应 OK，但仍建议**首版成绩卡用纯文字+色块+数字、不嵌封面图**（reviewer 也要求「克制信息量、4-5 个数字」），规避 taint，后续再加图。
- **避坑**：别引 `html2canvas`（重依赖、对 CSS 变量/皮肤 token 渲染不稳）；与 pitfalls「别引新重依赖」一致。
- **revoke**：`URL.createObjectURL` 用完 `revokeObjectURL`，避免泄漏（S9 性能轮刚清过泄漏，别回退）。

### B7. 成绩卡入口落点建议
- **首选：CollectionsView 顶部**。`views/CollectionsView.vue:144-151` 有「我的收藏」标题 + tab 行（动画/角色/图鉴/成就/卡组）。在标题右侧加「🎴 生成成绩卡」按钮（`.btn-primary`），最贴近「图鉴完成度/收藏」语境，也是 reviewer 说的「放收藏/图鉴页」。
- **备选**：HomeView（加一个卡片块）或 CodexPanel 内。但收藏页标题栏入口最自然、改动最小（一个按钮 + 一个 modal 组件）。
- 成绩卡本体 = 新 `WrappedCard.vue` modal/overlay（派生数据 + canvas 绘制 + 下载按钮）。

### B8. 路由现状（onboarding 跳转）
- `router/index.ts` 注册 home + 7 条 lazy 路由（gacha/collections/battle/squadBattle/nurture/settings/guess），与 App.vue 8 导航对齐。
- onboarding 引导跳转 / 空态 CTA 跳转均用 `useRouter().push('/gacha')` 等，正常。

---

## C. 新坑 / 注意事项

### C1. 文档版本滞后（非阻塞但会误导）
- `frontend-vue/CLAUDE.md` 写 schema v4、`docs/plans/pitfalls.md:11` 写 v4——**实际 v6**。Planner/Generator 若据文档判断版本会错。**以 `schema.ts:24` SAVE_VERSION=6 为准**。（顺手可收口时同步文档，但非本轮功能。）

### C2. 🟡-3 周任务/连签（若纳入）——唯一动存档项，升 v6→v7 三处同改
- **daily store 现结构**（`stores/daily.ts`）：`date`/`progress`/`claimed`/`lastLoginDate` 四个 ref + `markProgress`/`claim`/`claimLoginReward`。跨天判定用 `todayKey()`（`:18`，YYYY-M-D）「读时归零」模式（`ensureToday` `:34`）。
- **升 v7 三处同改**：
  1. `schema.ts`：`SAVE_VERSION = 7`；`DailySave`（`:33-42`）加 `weeklyProgress`/`weekKey` + `loginStreak`（`lastLoginDate` 已有，半套）；`createDefaultDaily`（`:117-120`）补对应默认。
  2. `migrations.ts`：`migrateDaily`（`:71-80`）补新字段默认（旧档无 → loginStreak=0、weeklyProgress={}）。**v5→v6 已是这个模式，照抄**。
  3. `stores/persistence.ts`：`buildPayload`（`:63` daily 行）/`applyPayload`（`:97`）已走 `useDailyStore().serialize/deserialize`，store 内部加字段即可、装配器行不用动（serialize 自带新字段）。
- **周任务埋点 100% 复用 markProgress**（`daily.ts:64`）：周任务只是另一张 `WEEKLY_TASKS` 表 + 按周键重置的 `weeklyProgress`，遍历逻辑同构。
- **登录连签**：`userStore.login:76` 已调 `claimLoginReward()`（`daily.ts:99-113`，固定奖励）；连签把固定改为按 `loginStreak` 递增、断签归零（`lastLoginDate` 比对）。
- **隐藏的「连续观看 7 天发券」**在 `viewing.ts:90-94`（`consecutiveDays >= 7 && %7===0` 发券，绑收看动作）。audit 建议可提到日历里被看见，但**那是观看 streak、不是登录 streak，别混用**（一个绑收看、一个绑登录）。
- 需补迁移测试（旧 v6 档 → v7 默认值往返，不破坏现有 `migrations.test.ts`）。

### C3. 🟢-4 红点数据源（大多现成 getter，零新存档；成就侧有坑）
导航在 `App.vue:122-135`。「可领信号」源：
- **图鉴可领里程碑**：`codex.ts:83` `claimableMilestones`（达成且未领）→ 非空即红点。**现成**。
- **每日任务可领**：`daily.ts:49` `isComplete(taskId)` && `!isClaimed(taskId)`——store 无现成聚合 getter，**要新加一个纯派生 computed**（遍历 `DAILY_TASKS`）。
- **成就侧坑**：`achievements.ts` 是「解锁即发奖」无「待领」态（`check()` 内 `:95` 直接 `profile.earn`）。**成就没有「可领」概念**，要做「新解锁红点」需额外引「已读」状态（session 级 seen 标志或 localStorage seen）。→ **红点首版聚焦 codex + daily 两个真有「可领」态的**，成就红点列 backlog 或 localStorage seen 单独处理。
- 红点 = App.vue 导航项加一个聚合 computed badge（读上述 getter），零存档。

### C4. 通用铁律复述（Generator 必守）
- **engine 纯净**：onboarding/成绩卡/红点都在 views/components/stores 层，**不碰 `engine/`**（`engine/index.ts:7` 禁 DOM/localStorage/fetch/Math.random，仅约束该目录）。
- **货币只走 `profile.spend()/earn()`**——本轮功能基本只读，若 onboarding 送新手奖励，走 `userStore.earn`/`profile.earn`，别直改 `core`。
- **颜色语义类**：界面 UI 用 `bg-surface/text-ink/accent` 或 `rgb(var(--c-*))` + `.btn-*`；禁 `text-white` 压浅底、禁拼接 `bg-${x}`。**导出图（成绩卡 PNG）固定色自绘是合理例外**（脱离皮肤独立成图）。
- **setTimeout/RAF 登记清除**：首抽 confetti、成绩卡动画若用定时器，组件卸载/关闭时清（参照 GachaResultModal `:25` clearTimeout、SquadBattleView schedule()）。
- **localStorage 合法层**：stores/components 用 localStorage 有 theme/settings 先例；engine 层才禁。
- **验证**：`npm run test` + `type-check` + `build`；别全仓 `lint --fix`，单文件 `npx eslint`。

---

## 一句话给 Planner
🔴-1 onboarding 与 🟡-2 成绩卡的所有接入点已核到行号且**零后端、零存档**：onboarding 触发用 localStorage（照抄 `theme.ts` pattern）、遮罩挂 `App.vue` 顶层、引导步骤指 HomeView 的 DailyTasksPanel + 导航「收藏/抽卡」；首抽庆祝复用 `GachaResultModal`（首抽判定用抽卡历史长度，零新状态）；空态 CTA 七处已定位；成绩卡入口挂 `CollectionsView` 标题栏，数据源 11 个 getter 已逐一核名，出图纯新写 Canvas（无先例但标准 API，首版不嵌封面图规避 taint）。唯一动存档的是可选 🟡-3 周任务/连签（升 v6→v7，三处同改照抄 v5→v6）。**最大文档坑：schema 实为 v6 而 CLAUDE.md/pitfalls 仍写 v4，以 `schema.ts:24` 为准。**
