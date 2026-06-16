# Scout Report — Iteration 4 (evolution backlog, tier1 off)

> 接地 reviewer 未做的 3 项：B1 周任务+连签（升 schema v7）、B2 番剧年表、B3 跨系统红点。
> orchestrator 直接接地（已读 daily.ts/App.vue/CollectionsView/codex.ts/achievements.ts，路径行号亲自核对）。

## A. 约束与可行性（给 Planner）
- **B1 周任务+连签**：可行，一轮可做，**唯一动存档项**（v6→v7）。daily.ts 已是成熟样板（todayKey 跨天判定 + 三件套）；周任务照搬加 weekKey、连签照 viewing.ts 昨日判定。范围控制：周任务 2-3 条、连签递增奖励一张静态表。
- **B2 番剧年表**：可行，纯前端零存档零后端。完成度/分组是从 collection（已拥有）+ gameDataStore（date 字段）纯派生。放 CollectionsView 新 tab 最省（已有 5 tab 模式）。
- **B3 红点**：可行，纯前端。daily/codex 可领态现成派生；成就无可领态（解锁即发奖）→「新解锁未读」用 localStorage（设备级，不升 schema，仿 onboarding）。范围：导航 2 个模块（主页、卡牌收藏）足够，别过度。
- **一句话**：3 项一轮可做完；只有 B1 升 schema v7，B2/B3 不动存档。

## B. 代码地图与坑（给 Generator）

### B1 周任务 + 连续登录递增
- **相关文件**：
  - `stores/daily.ts`（157 行）：现有 `date/progress/claimed/lastLoginDate` + `todayKey()` + `ensureToday()` 跨天归零 + 三件套。**扩它**：加 `weekDate/weeklyProgress/weeklyClaimed`（仿 daily 三字段，用 weekKey + ensureThisWeek）+ `loginStreak: number`。`claimLoginReward()` 改为按 loginStreak 给递增奖励、并维护 streak（昨日登录过→+1，断签→归 1）。
  - `config/dailyTasks.ts`：现有 `DAILY_TASKS`（{id,type,title,target,rewards}）+ `DAILY_LOGIN_REWARDS` + `getDailyTaskById`。**加** `WEEKLY_TASKS`（同结构，2-3 条）+ `LOGIN_STREAK_REWARDS`（按天数递增表，如第1/3/7天）+ `getWeeklyTaskById`。
  - `infra/persistence/schema.ts`（SAVE_VERSION=**6**）：`DailySave` 接口扩字段；升 **6→7**；块注释加 v7 行；`createDefaultDaily()` 补默认。
  - `infra/persistence/migrations.ts`：`migrateDaily()`（daily 段）补新字段缺省（weekDate ''/weeklyProgress {}/weeklyClaimed []/loginStreak 0）；migrate() 的 version 跟随 SAVE_VERSION。
  - 测试：`migrations.test.ts` 加 v7 断言（新字段缺省）；`stores/persistence.test.ts` 的 daily 往返断言扩字段；`stores/daily.test.ts` 加周任务跨周重置 + 连签递增/断签归 1 用例。
  - 埋点：周任务命中现有 6 玩法成功点——`markProgress` 已按 type 遍历 DAILY_TASKS，**让它也遍历 WEEKLY_TASKS**（同一次埋点同时推进日/周任务，零新埋点）。主页 `DailyTasksPanel.vue` 加周任务区 + 连签显示。
- **现有架构**：ensureToday 读时跨天归零。周任务用 weekKey（建议年+ISO 周序号字符串）同款读时跨周归零。连签：load 时 `claimLoginReward` 在 userStore.login 调（evo-3 已接），按 lastLoginDate 与今天/昨天关系更新 streak。
- **坑**：① weekKey 跨年要稳（用年+周序号字符串）；② 连签"昨日"判定用 `toDateString()` 比对（viewing.ts:77-94 样板），跨天/断签逻辑写测试锁定；③ 新字段三处同改 + 旧档（v1~v6）缺省补齐，不破坏既有断言；④ 发奖走 profile.earn 不用 addExp。

### B2 番剧年表时间轴
- **相关文件**：
  - `views/CollectionsView.vue`：`activeTab` 类型（:21）+ tab 链接（:165-169，`<a @click.prevent="activeTab='...'">`）+ tab 内容区。**加第 6 个 tab `'timeline'`**（类型加 'timeline'、加一个 tab `<a>`、加内容区 `v-else-if activeTab==='timeline'`）。
  - 新建 `components/AnimeTimeline.vue`：遍历 `collection.animeCollection`（已拥有 id）→ `gameDataStore.getAnimeCardById(id)` 取 `date` → 按年（`date.slice(0,4)`，`/^\d{4}$/` 守卫）分组 → 时间轴渲染（每年一行/一段，显示该年拥有番剧数 + 卡缩略）。纯 computed。
  - 数据：`stores/collection.ts` animeCollection（Map<id,{count}>）；`gameDataStore.allAnimeCards`/`getAnimeCardById`；`types/card.ts` AnimeCard.date（evo-2 已补）。
- **坑**：① date 可能缺失/非标准 → 该卡归"未知年"或跳过（守卫）；② 纯派生不新存字段；③ 颜色语义类，未登录守卫（仿 CodexPanel）。

### B3 跨系统红点
- **相关文件**：
  - `App.vue`：侧边 `<nav>`（:127-138）每项 `<li><RouterLink to="/x" class="nav-link">`。**主页(/)与卡牌收藏(/collections) 的 li 加红点角标**（小圆点 span，v-if 对应"有信号"computed）。
  - 红点数据源（computed，放 App.vue 或一个小 store/composable）：
    - 主页：`daily` 有任一 `isComplete && !isClaimed` 的任务 OR `claimLoginReward` 今日可领（lastLoginDate !== today）。
    - 卡牌收藏：`codex` 有任一里程碑 `isAchieved && !isClaimed`（codex.ts:61/78 现成）OR 成就"新解锁未读"。
  - 成就"已读"：`achievements.unlocked`（已解锁 id 数组）；**localStorage 存"已读快照"**（如已读 id 集合或已读数量），unlocked 超出已读 → 有新；访问成就 tab 时把当前 unlocked 写入已读 localStorage（仿 `stores/onboarding.ts` 的 localStorage try/catch 模式）。
- **坑**：① 别给成就加存档字段（用 localStorage，设备级 UX）；② 红点是"信号"派生，别在 engine；③ 角标颜色用语义类（如 bg-accent 或 bg-danger 小圆点），别 text-white 压浅底；④ 领取/查看后红点要即时消失（响应式依赖 daily/codex/localStorage 状态）。

## C. 新发现的坑
1. **markProgress 复用**：daily 的 markProgress 已按 type 遍历 DAILY_TASKS，周任务只要让它同时遍历 WEEKLY_TASKS，**6 个埋点一行不用改**——这是 B1 最省的接法。
2. **schema 现 v6**（evo-3 已纠正 CLAUDE.md/pitfalls）：B1 升 v7 照 evo-1 的 v5→v6 三处同改模式抄。
3. **localStorage 已有两处先例**（theme.ts 皮肤缓存、onboarding.ts 首登标志）：B3 成就已读照 onboarding 的 try/catch 包装写，vitest node 环境无 localStorage 需 stub（见 onboarding.test 的 memory stub 写法）。
4. **CollectionsView 已有历史 `bg-danger text-white`**（:186/198 分解按钮）：新 tab/红点别学，用语义类。
