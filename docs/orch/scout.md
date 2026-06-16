# Scout Report — Iteration 1 (evolution)

> 侦察兵：Code Scout（只读）。本轮接地 🔴-1 每日任务/登录奖励、🔴-2 图鉴完成度/里程碑，附带评估 🟡-3 成就、🟡-4 知识点商城。
> 已读：pitfalls.md + evolution-audit-report.md（Prioritized Recommendations）+ shop/guess/profile/collection/viewing/pve/nurture/gameDataStore/userStore/battleFlow store + schema/migrations/persistence 三件套 + 两份测试 + HomeView/PlayerStatus/CollectionsView/VirtualGrid/router。

---

## A. 约束与可行性（给 Planner —— 影响 WHAT/范围）

### 🔴-1 每日任务 + 每日登录奖励 —— 可行性：高，一轮可完成
- **理由**：领域 store 模式成熟（shop.ts 就是「按日期判定 + 跨天读取归零、不存定时器」的现成样板，daily 直接照搬）；4 个玩法成功回调全部集中在 **userStore 编排函数** 与 **battleFlow.endGame**，埋点位置清晰且少（见 B 第 3 点）；schema 加字段是 v5→v6 的标准三处同改 + 一条迁移 + 两个测试断言，已有 5 次成功先例。
- **对规划的建议**：
  - 任务定义建议**静态配置**（如 `config/dailyTasks.ts` 或写进 GAME_CONFIG），store 只存「当日进度 + 日期 + 已领标记」，存档字段才紧凑（审计隐忧 2：字段用计数/位图，别存整条任务对象）。
  - 任务集合建议 3-4 条，全部命中现有成功点：抽卡 1 次 / 赢 1 场宅理论战 / 收取 1 次观看 / 养成互动 1 次（或猜对 1 次）。**不要新增需要新埋点的任务类型**，复用现有回调即可零散落。
  - 「每日登录奖励」最轻：load 存档后比对 `lastLoginDate !== today` 即发券，复用 daily 同一个日期字段。
  - 进度检测调用应放在 **userStore 编排函数里**（成功点已在那），daily store 只暴露 `markProgress(taskType)` / `claim(taskId)`，**新逻辑不进 userStore 本体**（审计隐忧 1：userStore 已偏大，只在它的编排函数尾部加一行 `useDailyStore().markProgress('gacha')`）。

### 🔴-2 图鉴 / 收集完成度 + 里程碑奖励 —— 可行性：高，一轮可完成
- **理由**：完成度是**纯派生 computed**——`collection.animeCollection`/`characterCollection`（已拥有 id）⊆ `gameDataStore.allAnimeCards`/`allCharacterCards`（全量），无需新存任何「拥有集合」字段。灰位渲染直接复用 `VirtualGrid`（CollectionsView 已用，只需把 props.items 从「已拥有卡」换成「全量卡 + owned 标记」）。唯一进存档的只有「已领里程碑 id 数组」。
- **对规划的建议**：
  - 完成度/灰位**不需要新 store**——可在 CollectionsView 加一个「图鉴」tab + 几个 computed 即可。但「已领里程碑」需要持久化，建议**最小新 store `stores/codex.ts`** 只管 `claimedMilestones: Set<string>` + 完成度派生 getter，保持与 daily/achievements 同构。
  - **总数从数据派生，不要硬编码 665**：`gameDataStore.allCharacterCards.length` / `allAnimeCards.length` 就是权威总数（审计文案里的「665 角色」是当前数据快照，代码须用 `.length`）。各稀有度分母用 `allCharacterCards.filter(c => c.rarity === r).length`。
  - 里程碑建议**静态阈值表**（角色 100/300/500/集齐某稀有度），发奖走 `profile.earn(...)`，已领状态进 schema 一个 `string[]`。
  - 小债顺手：CollectionsView 的 `enableVirtualization` 开关（审计点名的调试残留）可在做图鉴 tab 时一并收掉（非阻塞）。

### 🟡-3 成就系统 —— 可行性：高，与 🔴-1 共享埋点模式，可同轮叠加
- **理由**：与 🔴-1 完全同构——同一批玩法成功回调里多调一个 `achievements.check(event)`，存档同样只存「已解锁 id 数组」。store 结构照搬 daily/codex。
- **建议**：若一轮想做满 2 红 + 1 黄，**🔴-1 与 🟡-3 应共用同一套「成功点埋点」**（在 userStore 编排函数尾部同时调 `daily.markProgress` 和 `achievements.check`），避免两次穿插改同一批函数。范围紧时 🟡-3 可顺延，但接入成本与 🔴-1 几乎重叠，ROI 高。

### 🟡-4 知识点商城 —— 可行性：中高，半轮~一轮，但与 2 红耦合低
- **理由**：`profile.spend('knowledgePoints', n)` 出口已存在且是唯一货币入口；`purchaseShopItem` 是现成的「校验余额→spend→发货→saveToServer」编排样板，知识点兑换可平行复制一份。但它**不依赖** 🔴-1/🔴-2 的埋点模式，是独立工作量。
- **建议**：本轮主攻 2 红，🟡-4 若同轮做会摊薄精力；建议**放到 🔴 之后或下一轮**。若一定要带，最小形态是 GachaView 商店旁加「知识点兑换」tab，用知识点换券（复用 shop 的 ticket 分支），不碰皮肤解锁（skins unlock 字段是更大工程）。

### 一句话给 Planner
**🔴-1 + 🔴-2 一轮稳做完，且 🟡-3 与 🔴-1 共享埋点几乎零边际成本，建议三者一并纳入；🟡-4 独立耦合低，留到后续。** 核心接入面收敛在「userStore 4 个编排函数 + battleFlow.endGame」加埋点 + 「schema v5→v6 三处同改」+ 「2-3 个同构领域 store」+ 「主页 1 个面板 + 图鉴 1 个 tab」。

---

## B. 代码地图与坑（给 Generator —— HOW 接地）

### 1. 领域 store 模式（新 daily/codex/achievements 照搬此结构）

**最佳样板 = `stores/shop.ts`（73 行，跨天判定）+ `stores/guess.ts`（serialize 三件套）。**

照搬要点：
- `defineStore('daily', () => { ... })` setup 写法；状态用 `ref`。
- **跨天判定复用 shop 的 `todayKey()`**（`stores/shop.ts:10-13`）：
  ```ts
  function todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }
  ```
  存「进度记录的 date 字段」，**读取时比对 date !== todayKey() 即视为过期归零**，不存定时器（与 shop 完全一致）。
- 三件套签名（照 guess.ts:250-264）：
  ```ts
  function serialize() { return { ... } }       // 返回紧凑可 JSON 化对象
  function deserialize(data) { /* data ?? 默认 */ }
  function reset() { /* 回初始态 */ }
  ```
- **领域 store 自己绝不调 saveToServer**（每个 store 文件头注释都写了「不触发存档，由门面统一控制」）。
- 需要发奖/扣费时 `import { useProfileStore }` 调 `profile.earn/spend`（collection.ts:44、viewing.ts 都这么干），**不要直改 core 数值**。

代码角色速查：
- `stores/shop.ts` — 跨天判定 + 紧凑记录样板（**daily 跨天逻辑直接抄**）
- `stores/guess.ts` — serialize/deserialize/reset 三件套 + 「会话态不入档、只存 highScore」样板
- `stores/profile.ts` — 货币唯一入口 `spend(currency, amount): boolean` / `earn(currency, amount)` / `addExp`；`CurrencyKey = 'knowledgePoints'|'animeGachaTickets'|'characterGachaTickets'`
- `stores/collection.ts` — 图鉴数据源（已拥有侧）+ 「发奖走 profile.earn」样板
- `stores/gameDataStore.ts` — 全量卡数据源（图鉴分母）

### 2. 存档协议 v5→v6：三处同改的确切落点

当前 `SAVE_VERSION = 5`（`schema.ts:23`）。S10 刚加 `saveVersion`（保存计数，乐观并发，**≠ 协议 version**，别混）。新增字段升 v6，三处 + 迁移 + 测试：

**落点 ①：`infra/persistence/schema.ts`**
- `schema.ts:23` 改 `export const SAVE_VERSION = 6 as const;`
- 顶部块注释（schema.ts:1-11）追加一行 `v6（evolution-1）：补入 daily（每日任务进度+日期+登录领取标记）/ codexMilestones（已领里程碑 id）/ achievements（已解锁 id）`。
- 在文件中部新增接口（仿 `ShopPurchaseRecord` / `GuessGameSave` / `AppearanceSave` 三个小 interface，schema.ts:25-37），例如：
  ```ts
  export interface DailySave {
    date: string;                          // 当日任务集所属日期（todayKey）
    progress: Record<string, number>;      // taskId -> 进度计数
    claimed: string[];                     // 当日已领取的 taskId
    lastLoginDate: string;                 // 每日登录奖励发放日期
  }
  ```
- 在 `SavePayload` interface（schema.ts:53-80）**末尾**追加字段（仿 v3/v4 的 `shopPurchases`/`guess`/`appearance`）：
  ```ts
  /** v6 新增：每日任务/登录。 */
  daily: DailySave;
  /** v6 新增：已领图鉴里程碑 id。 */
  codexMilestones: string[];
  /** v6 新增：已解锁成就 id。 */
  achievements: string[];
  ```
- 新增 `createDefaultDaily()` 工厂（仿 `createDefaultAppearance()` schema.ts:94-96）返回空进度默认值。

**落点 ②：`infra/persistence/migrations.ts`**
- 在 `migrate()` 返回对象（migrations.ts:72-99）**末尾**追加三个键的 v5→v6 迁移（缺失补默认，仿 `shopPurchases`/`appearance` 写法 migrations.ts:92-98）：
  ```ts
  daily: migrateDaily(payload.daily),                          // 缺失/损坏 → createDefaultDaily()
  codexMilestones: Array.isArray(payload.codexMilestones) ? payload.codexMilestones : [],
  achievements: Array.isArray(payload.achievements) ? payload.achievements : [],
  ```
- 建议加一个 `migrateDaily(raw)` 局部纯函数（仿 `migrateTowerProgress` migrations.ts:56-66）做字段级兜底（date/progress/claimed/lastLoginDate 各自缺省）。
- **关键坑**：迁移层是「尽力恢复 + 默认兜底」，**所有新键缺失必须补默认**，否则旧档（v1~v5）经 migrate 后缺键，applyPayload 会 deserialize undefined。

**落点 ③：`stores/persistence.ts`（装配器）**
- `buildPayload()`（persistence.ts:30-60）末尾追加（仿 `shopPurchases`/`guess`/`appearance` persistence.ts:56-58）：
  ```ts
  daily: useDailyStore().serialize(),
  codexMilestones: useCodexStore().serialize(),       // 或 achievements store
  achievements: useAchievementsStore().serialize(),
  ```
- `applyPayload()`（persistence.ts:63-93）末尾追加 `useDailyStore().deserialize(payload.daily)` 等三行（仿 persistence.ts:89-90）。
- `resetAllDomains()`（persistence.ts:96-107）追加 `useDailyStore().reset()` 等三行。
- 文件顶部 import 新 store（persistence.ts:8-17 那一组 import 区）。

**落点 ④：测试（两个文件必须改，否则 build/test 挂）**
- `infra/persistence/migrations.test.ts`：
  - 在「v1 → v2 迁移」describe 里加断言「v6 新键缺失补默认」（仿现有 `v5 新键：saveVersion` migrations.test.ts:84-86 与 `v4 新键` 块）：`expect(v6.daily).toEqual(createDefaultDaily())` 等。
  - 在「v2 存档过迁移层」describe 加「v6 存档原样保留」（仿 migrations.test.ts:117-122 saveVersion 块）。
  - 注意：现有测试变量名 `v2`/`v2in` 是历史命名，断言里 `v2.version` 仍 `toBe(SAVE_VERSION)`——SAVE_VERSION 改成 6 后这些**自动跟随**，但任何**硬编码 `.version).toBe(5)` 的地方要查**（当前全用常量，安全）。
- `stores/persistence.test.ts`：
  - `populateAllDomains()`（persistence.test.ts:39-80）里给新 store 塞可辨识状态（仿 `useShopStore().recordPurchase(...)` / `useGuessStore().highScore = 85`）。
  - 往返断言块（persistence.test.ts:82-127）加新 store 的保真断言（仿 persistence.test.ts:121-122）。
  - 「payload 带全部 schema 键」的 key 列表（persistence.test.ts:133-141）**必须加 `'daily','codexMilestones','achievements'`**，否则该用例不覆盖新键。
  - 这两个文件是「v5 往返保真 + 迁移」回归测试，pitfalls 明确要求**不破坏现有断言**——只追加，不改动既有 v1~v5 断言。

### 3. ★命脉：6 个玩法成功回调的精确落点（file:function）

| 玩法成功事件 | 精确落点 | 埋点说明 |
|---|---|---|
| **抽卡成功** | `stores/userStore.ts` → `drawCards()`（**第 90-136 行**）。券扣减 + 入库 + 加经验都在此；成功路径在 `saveToServer()` 前（userStore.ts:134）。 | 在 `saveToServer()` 之前加 `useDailyStore().markProgress('gacha', count)` + `useAchievementsStore().check('gacha', ...)`。注意 count 是抽卡次数。 |
| **对战结算（胜利）** | `stores/battleFlow.ts` → `endGame(outcome)`（**第 102-126 行**）。`outcome.winner === 'playerA'` 即玩家胜利（battleFlow.ts:110、:122）；已 `import { useProfileStore }` 和 `saveToServer`（battleFlow.ts:39-40）。 | 在 `if (profile.isLoggedIn)` 块内、`saveToServer()`（battleFlow.ts:124）前加埋点；**只在 `outcome.winner === 'playerA'` 时记「赢 1 场」**（平局/败北也可记「打 1 场」，按任务定义）。这是唯一不在 userStore 的成功点——battleFlow 自身触发存档，直接在此调 daily/achievements。 |
| **收取观看队列** | `stores/userStore.ts` → `collectFromViewingQueue`（**门面第 315-317 行**，委托 `viewing.collectFromViewingQueue` 返回 bool）。真实发奖在 `stores/viewing.ts:43-99`。 | 在 userStore 门面 `if (viewing.collectFromViewingQueue(slotIndex)) { useDailyStore().markProgress('watch'); saveToServer(); }`。**用返回值守卫**（false=未到时间，不记进度）。 |
| **养成互动** | `stores/userStore.ts` 门面（**第 333-336 行**）：`increaseAffection`/`interactWithCharacter`/`giveGift` 经 `withSave(...)` 包裹。底层 `stores/nurture.ts:68/85/95`。 | 改造 `withSave` 调用或单独包一层：互动后 `useDailyStore().markProgress('nurture')`。`withSave` 是 `(fn)=>(...args)=>{fn(...args);saveToServer()}`（userStore.ts:253-256），可在其后追加。 |
| **爬塔通层** | `stores/userStore.ts` → `completeFloor`（**门面第 355-357 行**，委托 `pve.completeFloor` 返回 bool）。**实际调用方在 `views/SquadBattleView.vue:379`**（`userStore.completeFloor(currentTowerFloor.value)`）。底层 pve.ts:45-51。 | 在门面 `if (pve.completeFloor(floor)) { useDailyStore().markProgress('tower'); saveToServer(); }`。**用返回值守卫**（floor 不匹配返回 false 不记）。 |
| **猜对角色** | `stores/userStore.ts` → `submitGuess`（**第 231-249 行**）。`result.correct === true` 即猜对（userStore.ts:236）；已发知识点 + saveToServer（userStore.ts:244）。 | 在 `if (result.correct)` 块内、`saveToServer()` 前加 `useDailyStore().markProgress('guess')`。 |

**埋点统一原则**：
- 5/6 个成功点都在 **userStore.ts 编排函数**里，**只需在每个函数现有 `saveToServer()` 调用前加一行 markProgress/check**——这是最小侵入，不重构 userStore。
- 唯一例外是对战，在 **battleFlow.ts:endGame** 里（它自带 saveToServer，且能拿到 `outcome.winner` 判胜负）。
- **import 方向安全**：daily/codex/achievements 是 stores 层，userStore/battleFlow 也是 stores 层，平级互调不违反「依赖只向下」（engine 才禁止 import store）。
- 进度检测**禁止写进 engine/**（pitfalls 铁律：engine 零 Pinia）。

### 4. 每日重置 / 日期判定（daily 复用）

- **权威样板 = `stores/shop.ts:10-44`**：`todayKey()` 生成 `YYYY-M-D` 字符串；记录存 `{ date, count }`；`purchasedToday()` 读时比对 `record.date !== todayKey()` 即视为 0。**daily 的「当日任务进度」直接套这个模式**：存档存 `{ date, progress }`，load/读取时若 `date !== todayKey()` 则进度全清零（且换上今天的任务集）。
- 另有 `viewing.ts:77-94` 的「连续天数」逻辑（用 `toDateString()` + 昨日比对）——daily **不需要这个**（那是连续签到累计，daily 任务是当天重置），但若做「连续登录 N 天」奖励可参考其昨日判定。
- `pve.ts:58-64` 的 `canAttemptToday/recordTowerAttempt` 已是空壳（每日限制已移除），**不要参考它**。
- 坑：`todayKey()` 用本地时区，跨设备/跨时区可能不一致，但全仓 shop 已是此行为，**保持一致即可**，别引入 UTC 制造分裂。

### 5. 图鉴完成度数据源 + 灰位渲染

- **已拥有侧**：`collection.animeCollection` / `characterCollection` 是 `Map<number, {count}>`（collection.ts:15-16）。`getAnimeCardCount(id)` / `getCharacterCardCount(id)` getter 判拥有。
- **全量侧（分母）**：`gameDataStore.allAnimeCards` / `allCharacterCards`（数组，gameDataStore.ts:13-14）。**总数 = `.length`，各稀有度数 = `.filter(c => c.rarity === r).length`**。`gameDataStore.getAnimeCardById/getCharacterCardById` 取卡详情。
- **完成度 computed 样板**：CollectionsView 的 `filteredAnimeCards`（CollectionsView.vue:82-104）已演示「遍历 collection.entries() + getCardById 拼详情」。图鉴只需**反过来**遍历 `allXxxCards`，对每张标 `owned = collection.getXxxCardCount(card.id) > 0`，未拥有渲染灰位。
- **灰位渲染复用 `VirtualGrid`**（`components/VirtualGrid.vue`）：props `items / itemHeight / containerHeight / minItemWidth / gap`，emit `itemClick`（VirtualGrid.vue:5-16）。CollectionsView.vue:194-231 是现成用法。把 items 换成「全量卡数组（含 owned 标记）」即可；卡片组件按 owned 决定是否灰度/剪影。
  - **坑（S9 已修但要懂）**：VirtualGrid 列数 `Math.max(1, floor(...))` 钳到 ≥1（VirtualGrid.vue:29），弹窗内首帧宽度为 0 时靠 ResizeObserver 修正——图鉴若放弹窗/tab 切换里，沿用即可，别再引入「列数为负全空」回归。
- **里程碑**：阈值建议静态表（如 `config/codexMilestones.ts`）；已领状态 `codex.serialize()` 返回 `string[]`，发奖 `profile.earn`。完成度是纯派生，**唯一进存档的是已领 id**。

### 6. 主页面板挂哪

- `views/HomeView.vue`（39 行）用 `<div class="space-y-8">` 纵向堆叠组件：`PlayerStatus` → `WatchQueue` → 三列 grid（ActivityLog/CollectionPreview/ViewingStats）。
- **「今日任务」面板**：新建 `components/DailyTasksPanel.vue`（仿 `PlayerStatus.vue` 结构：`bg-surface p-6 rounded-lg shadow-lg border border-line` 卡片壳 + `text-ink/text-accent/text-ink-2` 语义色），**插在 `<PlayerStatus />` 之后、`<WatchQueue />` 之前**（HomeView.vue:13-15 之间）。
- **未登录态**：PlayerStatus.vue:55-57 是样板（`v-else` 显示「请先登录」），daily 面板同样需要 `userStore.isLoggedIn` 守卫。
- **颜色铁律**（pitfalls + CLAUDE.md）：语义类 `bg-surface/bg-surface-2/text-ink/text-ink-2/text-accent/border-line`，按钮用 `.btn-primary/.btn-secondary`，**禁止 `text-white` 压浅底、禁止拼接 `bg-${color}` 动态类**。注意 CollectionsView.vue:163 有个历史 `bg-danger text-white`（图片压片白字例外不算违规，但新代码别学这处）。
- **图鉴入口**：router（router/index.ts）目前 8 路由无独立 codex 路由。审计建议「CollectionsView 增加图鉴 tab」——CollectionsView 已有 `activeTab: 'anime'|'character'|'decks'`（CollectionsView.vue:144-146），**加第 4 个 tab `'codex'` 最省**，不必新增路由。若 Planner 要独立页，则在 router/index.ts:46 后加一条 lazy route。

### 7. 货币出口（🟡-4 复用）

- `profile.spend('knowledgePoints', n): boolean`（profile.ts:61-66）——余额不足返回 false 不扣，是唯一扣减入口。`profile.earn(...)` 唯一增加入口。
- **购买流程样板 = `userStore.purchaseShopItem`（userStore.ts:161-227）**：校验登录 → `shop.canPurchase`（限购）→ `profile.spend`（扣费，失败给提示）→ `shop.recordPurchase` → switch 发货（ticket/currency/booster）→ `saveToServer()`。知识点兑换平行复制：把 `spend('knowledgePoints', cost)` 当扣费、发券走 `earn('animeGachaTickets', n)`。
- `shop.ts` 的限购计数（dailyPurchases）可直接复用做「知识点商品每日限兑」。

### 8. 约束 / 坑汇总（Generator 必读）

- **userStore 别塞新逻辑**（审计隐忧 1 + pitfalls）：新建独立领域 store，userStore 编排函数里只加「一行 markProgress/check 调用」。
- **存档字段紧凑**（审计隐忧 2）：daily 存进度计数/已领 id 数组，**别存整条任务/成就对象**（静态定义放 config，存档只存可变状态）。`watchedAnime: number[]` / 各 collection 的 id 数组是「紧凑 id 数组」的既有样板。
- **保存串行合并已存在**（persistence.ts:109-136）：新 store 的变更同样靠门面 `saveToServer()` 落盘，连发坍缩为一次，**领域 store 自己不调 saveToServer**。
- **不破坏 v5 往返/迁移测试**：migrations.test.ts + persistence.test.ts 只追加断言，既有 v1~v5 断言一字不动；新键全部「缺失补默认」。
- **engine 纯净铁律**：进度/日期/成就检测全在 stores 层，engine/ 零 Pinia/Date 副作用（engine 已禁 Math.random，RNG 注入）。日期判定（new Date）放 store，不进 engine。
- **颜色语义类**：禁 text-white 压浅底、禁动态颜色类拼接（见第 6 点）。
- **验证命令**：`npm run test`（vitest）+ `npm run build`（type-check + 构建）。**不要跑 `npm run lint`**（--fix 全仓重排）；单文件 `npx eslint <path>`。
- **总数别硬编码**：审计文案「665 角色」是数据快照，代码一律 `allCharacterCards.length`（数据可能增减）。

---

## C. 新发现的坑

1. **对战胜利埋点的特殊性**：6 个成功点里只有「对战」不在 userStore，而在 `battleFlow.ts:endGame`。它自带 `saveToServer()` 且能拿 `outcome.winner` 判胜负。Generator 若把「所有埋点统一放 userStore」会漏掉对战——**对战必须在 battleFlow.endGame 单独埋**。且 endGame 的 `if (profile.isLoggedIn)` 守卫已在（battleFlow.ts:117），埋点放进这个块内即可避免未登录误记。BattleView.vue 不直接调 endGame（对撞流程内部自动触发），别去 BattleView 找埋点。

2. **`addExp` 的双触发存档**：userStore 的 `addExp`（userStore.ts:269-272）和 `submitGuess`/`drawCards` 都会 `saveToServer()`。daily 发奖建议用 `profile.earn`（券/知识点）而非 `addExp`，避免和升级逻辑（addExp 内部又 earn 升级奖励）纠缠，也避免重复存档。

3. **图鉴「拥有」判定别用 favorite**：collection 有 `favoriteAnime/favoriteCharacters`（喜爱，上限 10）和 `animeCollection/characterCollection`（拥有，无上限）。完成度判定**用后者**（getAnimeCardCount > 0），别误用 favorite。

4. **`enableVirtualization` 调试残留**（审计 §Technical Health 点名）：CollectionsView.vue:37 的 `enableVirtualization = ref(true)` 是面向用户暴露的虚拟化开关，属调试性质。做图鉴 tab 时若复用 VirtualGrid，建议顺手把这个开关收成内部常量（非阻塞，但同文件改动顺带做成本低）。

5. **shop.ts 的 `todayKey()` 未导出**：daily 要复用同款日期判定，但 `todayKey` 是 shop.ts 的模块内私有函数（未 export）。Generator 需在 daily store 内**复制一份**（4 行，无依赖）——建议复制而非横向 import，与现有 shop/viewing 各自实现日期逻辑的风格一致，保持领域 store 自包含。

6. **养成成功点有三个入口**：`increaseAffection`/`interactWithCharacter`/`giveGift`（userStore.ts:333-335）都算「养成互动」。`interactWithCharacter`（nurture.ts:85）不发经验只记对话，另两个发经验。若 daily 任务是「互动 1 次」，三者任一触发即可——建议在 `withSave` 包装层统一埋，或针对最常用的对话/好感入口埋，避免三处散落。
