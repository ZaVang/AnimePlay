# Scout Report — Iteration 5 (minigames hub + higher/lower)

> 接地于真实代码/数据，2026-06-17。已亲自核对所有路径行号与字段覆盖率。
> **重要纠正**：审计报告与 CLAUDE.md/pitfalls 多处把存档版本写作「v6」，但代码里 `SAVE_VERSION = 7`（B1 周任务/连签已升 v7）。**本轮是 v7 → v8，不是 v6→v7。** 审计报告 §Technical Health-4 写「v7→v8」是对的，正文别的地方的 v6 口径已过期。

---

## A. 约束与可行性（给 Planner）

### [数据] 高低牌维度真实覆盖率——逐字段实测（决定性结论）
后端服务的真实文件 = `data/selected_anime/all_cards.json`（250 番剧）+ `data/selected_character/all_cards.json`（665 角色）（`backend/server.py:39,53` 确认；anime 仅 `pop("main_characters")`，**其余字段原样下发，前端拿得到**）。实测覆盖率与 distinct 值（distinct 高 = 平局少 = 好玩）：

| 卡类型 | 字段 | 覆盖率 | 值域 | distinct/总数 | 高低牌适用判断 |
|---|---|---|---|---|---|
| **角色** | `popularity_score` | **100%** | 13–4050 | 458/665 | ✅ **角色首选维度**，区间宽、平局少 |
| **角色** | `comprehensive_popularity` | **100%** | 109–3914 | 491/665 | ✅ 角色第二维度，distinct 比 popularity 还高 |
| **角色** | `anime_count` | 100% | 1–8 | 7/665 | ⚠️ 仅 7 个 distinct → 海量平局，**不适合**高低牌（可做"≥/≤"但体验差） |
| **角色** | `rating_rank` / `date` | **0%** | — | — | ❌ 角色卡**根本没有**这两个字段，别用 |
| **番剧** | `rating_rank` | **100%** | **1–1983** | **250/250（全不重复！）** | ✅ **番剧首选维度**，零平局；注意值域是 1–1983（全球真实排名）**不是审计说的 1–250** |
| **番剧** | `date` | **100%** | 1993-10-16 .. 2025-04-12 | 220/250 | ✅ 番剧第二维度（"谁更早放送"），取 `date.slice(0,4)` 比年份 |
| **番剧** | `rating_score` | 100% | 7.1–9.2 | **仅 20/250** | ❌ **确认审计警告**：值挤、平局多，**别用裸 rating_score** |
| **番剧** | `rating_total` | 100% | 6277–34793 | 249/250 | ✅ 备选（"谁评分人数多"），distinct 很高 |
| **番剧** | `popularity_score` | **0%** | — | — | ❌ 番剧卡**没有** popularity_score（审计提案 #1 写"番剧用 popularity_score"是错的） |

**给 Planner 的硬约束**：
1. **维度按卡类型分桶，不能混用**：角色模式只能用 `popularity_score`/`comprehensive_popularity`（角色无 rank/date）；番剧模式只能用 `rating_rank`/`date`/`rating_total`（番剧无 popularity_score）。
2. **三个推荐可玩维度**：角色 `popularity_score`（13–4050）、番剧 `rating_rank`（1–1983，零平局，最佳）、番剧 `date`（年份，1993–2025）。这三个覆盖率 100%、distinct 高，是安全选择。
3. **平局处理**：番剧 `rating_rank` 全不重复（永不平局）；角色 `popularity_score`/番剧 `date` 有少量重复，纯逻辑里要决定平局算"对"还是"重抽"——建议**平局时该题判对**（用户友好）或选卡时跳过同值卡。
4. 数据 100% 覆盖 → 不会出现"一堆 undefined 没法比"的问题（审计担心的坑不存在，只要按上表分桶选维度）。

### [Hub 路由 vs CollectionsView 式 tab] 结论：路由用单一 `/minigames`，Hub 内部用 CollectionsView 同款 `activeTab` ref 切换游戏
- `CollectionsView.vue:26` 用一个 `activeTab = ref<'anime'|...>('anime')` + 模板里 `:class="{active: activeTab==='x'}"` + `v-if/v-else-if` 渲染对应面板（`:177-302`）。这是产品内成熟的「单视图多 tab」样板，**直接照搬到 MiniGamesView 做游戏选择器**最省力、最一致。
- 不要给每个游戏单独建顶级路由（审计明确反对「导航爆炸」）。`/minigames` 一个路由，Hub 内 `selectedGame` ref 决定渲染哪个子游戏组件。
- 「上次选的游戏」是设备级偏好 → 用 localStorage（仿 theme.ts try/catch），**不进存档、不升 schema**（pitfalls「设备级状态」铁律）。

### [v8 升级范围] 结论：新开 `minigames` 域，不碰 v7 既有 `guess` 字段
- 审计 §4 + pitfalls 一致：**保留 `guess: { highScore }` 不动**（v7 的 `guess.highScore` 往返断言在 `migrations.test.ts:77,121` 锁着，动它会破测试），新游戏数据单开 `minigames` 域。
- v8 `minigames` 域建议存：各游戏 `highScore`/`bestStreak` + 累计游玩数（`playCount`）。**本轮硬性交付只需 highScore/bestStreak/playCount**；每日挑战完成日期（🟡-1）/连续完成（💡-5）是后续轮次，本轮可先在接口里预留也可不留——Planner 定。
- **不要把高低牌数据塞进 guess 域**——guess 域语义是「猜角色专属」，混进去会让 migrations 断言含糊。

### [新游戏 #2 选型] Scout 倾向：留给 Planner 决策，但数据已就绪两条都可行
- 审计 🔴-3 给两选项：Quiz（4选1，题库自动派生）或 猜番剧（剪影，复用猜角色 Canvas）。
- 本轮 SPRINT「第 5 轮」只硬性要求 **Hub + 猜角色迁入 + 新游戏 #1（高低牌）**；新游戏 #2 是「前 2 轮内」（即第 5–6 轮），**本轮（第 5 轮）可以只交付到高低牌**。Planner 确认本轮是否含 #2。
- 若做 #2：Quiz 需 `anime_names`/`anime_ids`（角色）+ `date`/`rating_rank`（番剧）派生题，数据齐全；猜番剧需番剧封面图 `/data/images/anime/{id}.jpg`（与角色图同款路径，`gameDataStore` 已给 `image_path`）。

### [经济防刷] 可行：复用 daily.ts 的 `todayKey` 跨天模式做每日产出封顶
- `stores/daily.ts:22` 有现成 `todayKey()`（`YYYY-M-D`），`ensureToday()`（`:65`，读时跨天归零，幂等无定时器）是「每日计数」的成熟样板。
- 高低牌防刷方案（Planner 定值）：在 minigames 域存「当日已发奖局数 + 日期」，仿 ensureToday 跨天归零；每日前 N 局（如 3 局）的 streak 里程碑才走 `profile.earn`，超出只记 bestStreak 不发奖。**审计强调高低牌 streak 可以很长，发奖必须按里程碑 + 每日封顶，否则一局连对 50 个刷爆知识点。**

---

## B. 代码地图与坑（给 Generator）

### B1. Hub 路由 + 导航改造（🔴-1）
- **`frontend-vue/src/router/index.ts:42-46`**：现有 `/guess → GuessView.vue`。改造：
  - 加 `{ path: '/minigames', name: 'minigames', component: () => import('../views/MiniGamesView.vue') }`。
  - 把 `/guess` 改成 `{ path: '/guess', redirect: '/minigames' }`（删掉原 component 行）。其余路由都是 lazy `() => import(...)`，照抄。
- **`frontend-vue/src/App.vue:178`**：`<li><RouterLink to="/guess" class="nav-link">🎭 猜角色</RouterLink></li>` → 改为 `to="/minigames"` + 文案「🎮 小游戏」。
  - 🟡-3 红点（若做）：仿 `homeHasSignal`（`App.vue:27-37`）/`collectionsHasSignal`（`:40-45`）纯派生 computed，加 `minigamesHasSignal`，模板里 li 加 `nav-link-dot` class + `<span v-if="minigamesHasSignal" class="nav-dot">`（样板见 `:163-167`，CSS `.nav-dot` 在 `:261-270`）。本轮没每日挑战则红点先不做（无信号源）。
- **`frontend-vue/src/views/GuessView.vue`**（47 行）：现在只是 `<GuessCharacter />` 的薄壳。`/guess` 改 redirect 后此文件**不再被路由引用**——可删，或留着不管（无害）。Generator 建议删，但删前确认无别处 import（已查：仅 router 引用）。

### B2. 猜角色迁入 Hub（🔴-1）——`GuessCharacter.vue` 几乎零改
- **`frontend-vue/src/components/GuessCharacter.vue`**（501 行）：自包含组件，内部直接 `useGuessStore()` + `useUserStore()`（`:8-9`），**原样 `<GuessCharacter />` 渲进 Hub 即可，无需改内部**。审计 🔴-1 明确「原样迁入不重写」。
- 它的空态/未开始 CTA（`:210-235`）会和 Hub 自己的游戏选择器有点重叠，但不冲突——选中猜角色 → 渲染该组件 → 它自己显示「开始游戏」。Generator 不必动这块。
- 🟢-2（可选）：审计建议砍 `gameRecords` 逐局历史 UI（`GuessCharacter.vue:405-438` 模板 + `stores/guess.ts` 的 `gameRecords`）和清死代码 `getOriginalImageUrl()`（`stores/guess.ts:116-119`，永远返回 `''`）。**这是 Nice-to-have，非硬交付**，Planner 定要不要本轮做。注意若删 `gameRecords` 要同步删 `GuessCharacter.vue:179-188` 的 `formatTime`。

### B3. 高低牌纯逻辑落点（🔴-2）——放 `stores/minigames/`，不进 engine
- **铁律核对（pitfalls + CLAUDE.md）**：`engine/` 零 Vue/Pinia/DOM/`Math.random`。高低牌选卡/比维度/计分是「纯函数 + 注入 RNG」**可以**进 engine，但审计 §Technical Health-2 明确建议放 `stores/minigames/`（如 `higherLower.ts`）而非污染 engine——engine 定位是对战/抽卡/养成规则。**Scout 同意放 stores/minigames/**。
- **纯逻辑写法**：抽成纯函数 `pickRound(cards, dimension, rng)` / `judge(left, right, dimension, guess)` / `scoreStreak(...)`，**RNG 通过参数注入**（不在纯函数里直接 `Math.random`）。可仿 engine 的 RNG 接口：`engine/rng.ts` 定义 `RNG` 接口（`{ next(): number }`），`engine/gacha/draw.ts:7,35,46,65` 是「注入 rng + `rng.next()`」的标准用法样例。**纯函数注入 RNG → 配特征测试**（vitest，给定种子断言确定输出）。
- store 编排层（`stores/minigames/higherLower.ts` 的 store 部分，或并入一个 minigames store）里可以用 `Math.random()` 喂给纯函数（猜角色先例：`stores/guess.ts:139` 直接 `Math.random()` 在 store 内合法）。
- 数据访问：`useGameDataStore()` → `allCharacterCards` / `allAnimeCards`（`gameDataStore.ts:13-14`），`getCharacterCardById`/`getAnimeCardById`（`:23-31`）。字段直接读 `card.popularity_score` / `card.rating_rank` / `card.date`（`types/card.ts:28-29,41-42` 已声明可选字段，`BaseCard` 有 `[key]:any` 索引签名兜底）。**选卡时按维度过滤掉该字段为 undefined 的卡**（虽实测 100% 覆盖，防御性写法更稳）。

### B4. 经济钩子样板（🔴-2）——仿 `submitGuess`
- **`frontend-vue/src/stores/userStore.ts:284-307`** `submitGuess` 是经济埋点的精确样板：
  ```
  function submitGuess(guess): {...} {
    const result = guessStore.guessCharacter(guess);   // 调领域 store 纯/半纯逻辑
    if (result.correct && profile.isLoggedIn) {
      knowledgeAwarded = Math.floor(guessStore.currentScore / 2);
      if (knowledgeAwarded > 0) profile.earn('knowledgePoints', knowledgeAwarded);  // 唯一货币入口
      useAchievementsStore().check('guess');             // 留存埋点
      saveToServer();                                     // 统一存档
    }
    return { ...result, knowledgeAwarded };
  }
  ```
- **高低牌的结算点照此写**：在 userStore 里加 `submitHigherLowerRound` 或 `endHigherLowerGame`（结算时），里程碑达标 → `profile.earn('knowledgePoints', ...)`（带每日封顶，见 A 段防刷）→ `markProgress('minigame', 1)`（若做 🟡-2）→ `check('minigame', {...})`（若做 🟢-1）→ `saveToServer()`。
- **`profile.earn`/`spend`**（`stores/profile.ts:61-76`）是唯一货币入口，`earn` 对 amount<=0 静默 no-op。**别绕过它直改 core**。
- **埋点位置铁律**（pitfalls「留存埋点」）：基于玩法事件的新功能挂在玩法成功点的 `saveToServer()` 前。高低牌走 userStore 编排函数（同 submitGuess），**不是**对战那种特殊位置。

### B5. 存档三处同改 v7→v8（🔴-4）——确切函数/行号
按既有「三处同改 + 迁移 + 测试」，照 v6→v7（B1 周任务）的模式复制：
1. **`frontend-vue/src/infra/persistence/schema.ts`**：
   - `SAVE_VERSION = 7` → `8`（`:25`）。
   - 加 `export interface MiniGamesSave { ... }`（仿 `GuessGameSave`/`DailySave`，`:33-55`）。建议结构：`{ higherLower: { highScore: number; bestStreak: number; playCount: number }, ... }` 或扁平按游戏 id。
   - `SavePayload` 接口（`:75-108`）加 `minigames: MiniGamesSave;` 字段。
   - 加 `export function createDefaultMiniGames(): MiniGamesSave`（仿 `createDefaultDaily()` `:127-138`）。
   - 顶部版本注释加 v8 行（仿 `:11-12` 的 v6/v7 注释）。
2. **`frontend-vue/src/infra/persistence/migrations.ts`**：
   - 加 `function migrateMiniGames(raw): MiniGamesSave`（仿 `migrateDaily` `:74-89`，字段级缺省兜底）。
   - `migrate()` 的返回对象（`:92-126`）加一行 `minigames: migrateMiniGames(payload.minigames),`。
   - **旧档（无 minigames 键）→ `createDefaultMiniGames()`**。`SAVE_VERSION` 改 8 后这里自动打新版本号。
3. **`frontend-vue/src/stores/persistence.ts`**：
   - `buildPayload()`（`:33-66`）加 `minigames: useMiniGamesStore().serialize(),`（仿 `:62 daily: useDailyStore().serialize()`）。
   - `applyPayload()`（`:69-102`）加 `useMiniGamesStore().deserialize(payload.minigames);`（仿 `:97`）。
   - `resetAllDomains()`（`:105-119`）加 `useMiniGamesStore().reset();`（仿 `:115`）。
   - 顶部 import 加 `import { useMiniGamesStore } from './minigames/...';`（仿 `:18 import { useDailyStore }`）。
4. **测试**：`frontend-vue/src/infra/persistence/migrations.test.ts` 加 v8 新键断言（仿 `:88-99` v6/v7 块）：旧档缺 `minigames` → `createDefaultMiniGames()`；v7 档过迁移补 minigames 缺省；v8 档原样保留。**别动现有 v1–v7 断言**（尤其 `:77,121` 的 `guess.highScore`）。`createDefaultMiniGames` 也要在 test 顶部 import（仿 `:7`）。

### B6. minigames store（新建）
- 仿 `stores/guess.ts`（295 行）或 `stores/daily.ts`：`defineStore('minigames', ...)`，含各游戏 `highScore`/`bestStreak`/`playCount` 的 ref + `serialize()/deserialize()/reset()`（持久化装配三件套，每个领域 store 都有，见 guess.ts:250-264 / daily.ts:217-253）。
- **不触发存档**（领域 store 自己不存档，由门面 userStore 统一 `saveToServer()`——pitfalls 铁律 + 所有领域 store 一致）。
- 放 `stores/minigames/`（目录现不存在，需新建）。高低牌纯逻辑 `higherLower.ts` 也放这目录（纯函数部分 + store 部分可同文件或拆分，Planner 定）。

### B7. 可分享战绩卡（💡-1，若本轮做）——复用 Canvas 样板
- **`frontend-vue/src/wrapped/buildWrappedStats.ts`**（纯函数，零 Vue/Pinia/DOM）+ `components/ShareCard.vue`（`CollectionsView.vue:17` 引用）是 E3-T2 的 Canvas 战绩卡样板。
- pitfalls 铁律：用标准 Canvas（`toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`），**别引 html2canvas**；**首版别嵌远程封面图**（cross-origin canvas taint 让 toBlob 抛错）。高低牌是纯数值，天然无图，安全。
- **这是 💡 Feature Idea / 第 7–9 轮**，本轮硬交付不含，Planner 定。

---

## C. 新发现的坑

1. **存档版本口径全仓不一致（必须以代码为准）**：CLAUDE.md（`frontend-vue/CLAUDE.md` 持久化段写「schema v6」）、pitfalls.md（`:11` 写「当前 v6」）、审计报告正文多处写 v6——**全部过期**。代码真值 `schema.ts:25 SAVE_VERSION = 7`，schema 顶部注释 `:12` 已记 v7（B1 周任务/连签）。**本轮升 v7 → v8**。Generator 别被旧文档误导成 v6→v7。

2. **审计报告 §4.1 的数据描述有两处实测错误，按本报告 A 段为准**：
   - 「番剧 `rating_rank` 1–250」**错**，实测 **1–1983**（全球真实排名，反而更宽更好玩，零平局）。
   - 「番剧模式用 `popularity_score`」**错**，番剧卡**没有** popularity_score（0% 覆盖）；popularity_score 是**角色**字段。提案 #1 的「角色模式 popularity_score / 番剧模式 rating_rank 或 date」方向对，但「番剧 popularity_score」的措辞会误导，**维度必须按卡类型分桶**（A 段表）。
   - `rating_score` 7.1–9.2 仅 20 个 distinct（不是简单的"区间窄"，是离散值极少）——审计「别用裸 rating_score」的警告**实测成立且更严重**。

3. **`anime_count` 看似可做高低牌维度，实则不行**：100% 覆盖、值域 1–8，但只有 **7 个 distinct 值**（665 角色挤在 1–8）→ 海量平局，体验等于抛硬币。审计提案没把它列为高低牌维度是对的，Generator 别自作主张拿它当维度。`comprehensive_popularity`（角色，491 distinct）反而是比 `popularity_score` 更优的隐藏维度，可作角色第二维度。

4. **`GuessView.vue` 与 `GuessCharacter.vue` 是两层**：`GuessView.vue`（视图壳，被路由引用）只包了 `<GuessCharacter />`（真正的 501 行组件）。迁入 Hub 时直接在 MiniGamesView 里渲 `<GuessCharacter />`，`GuessView.vue` 这层壳作废（随 `/guess` 改 redirect 一起退役）。别误把 501 行的 GuessCharacter 当成 GuessView。

5. **`fuzzyMatch` 死代码冗余**（`stores/guess.ts:67-73`）：`:68` 已做双向 includes 判断并 return true，`:73` 又写了一遍同样的双向 includes return——第二个 return 永远走不到。与本轮高低牌无关，但若 Generator 顺手清死代码（🟢-2）可一并提；**不是本轮硬交付，别扩大范围**。

6. **验证命令**（pitfalls 工程铁律）：`npm run test`（vitest，改存档/加纯函数后必跑）、`npm run build`（type-check + 构建，加路由/组件后必跑）。**别跑 `npm run lint`（带 --fix 全仓重排）**，单文件用 `npx eslint <path>`。新组件颜色用语义类（`bg-surface`/`text-ink`/`accent`）+ `.btn-*`，禁 `text-white` 压浅底、禁动态色类拼接（稀有度色内联 hex 是既有例外，见 `GuessCharacter.vue:20-27 rarityColors`）。
