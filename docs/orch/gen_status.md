# Generator Status — Iteration 4 (B1/B2/B3)

状态：**PASSED**

3 任务全部实现并通过验收。type-check 0 错、test 372 全绿（+18，基线 354）、build 通过、改动文件 eslint 干净。三项已在浏览器活体验证（含红点出现/消失全周期）。SPRINT.md B1/B2/B3 三个 `[ ]` 已改 `[x]`。

---

## 完成的任务

### B1：周任务 + 连续登录递增（存档 v6→v7）
- `config/dailyTasks.ts`：加 `WEEKLY_TASKS`（3 条：抽 20 张 / 赢 5 场 / 追番 7 次，复用现有埋点类型，零新埋点）+ `LOGIN_STREAK_REWARDS` 递增表（第 1/3/7/14/30 天阶梯）+ `loginStreakRewardFor(streak)`（取 ≤streak 最大档）+ `getWeeklyTaskById`。
- `stores/daily.ts`：加 `weekDate/weeklyProgress/weeklyClaimed/loginStreak` + `weekKey()`（ISO-8601 周键，跨年稳定）+ `ensureThisWeek()` 读时跨周归零 + 周任务三件套（`weeklyProgressOf/isWeeklyComplete/isWeeklyClaimed/claimWeekly`）。`markProgress` 现同时遍历 DAILY_TASKS 与 WEEKLY_TASKS（6 个埋点一行未改）。`claimLoginReward()` 改为按 lastLoginDate 与今天/昨天关系维护 streak（昨日→+1，断签/首次→1，今日已领→不变），发奖 = 每日固定 + 连签档。serialize/deserialize/reset 扩字段。
- 存档三处同改：`schema.ts`（SAVE_VERSION=7、DailySave 扩 4 字段、createDefaultDaily 补缺省、v7 块注释）、`migrations.ts`（migrateDaily 补 weekDate/weeklyProgress/weeklyClaimed/loginStreak 缺省）、`stores/persistence.ts`（装配器随 serialize/deserialize 自动带，无需改）。
- `stores/userStore.ts`：加 `claimWeeklyTask` 门面（领成功才 saveToServer）。
- `components/DailyTasksPanel.vue`：加「本周任务」区 + 连续登录天数显示（🔥 连续登录 N 天）。
- 测试：daily.test 加周任务跨周重置/同周跨天不重置/做满领奖、连签递增/断签归 1/同日不变/里程碑档更厚（+11 用例）；migrations.test 加 v7 缺省断言 + v7 原样保留 + v7 局部损坏补默认 + 修正旧 v6 档迁移断言（补四字段缺省）；persistence.test daily 往返扩 weekDate/weeklyProgress/weeklyClaimed/loginStreak。

### B2：番剧年表时间轴
- 新建 `components/AnimeTimeline.vue`：遍历 `userStore.animeCollection` 已拥有 → `gameDataStore.getAnimeCardById` 取 `date` → `date.slice(0,4)` 配 `/^\d{4}$/` 守卫（缺失/非标准归「未知」沉底）→ 按年降序分组的竖向时间轴（每年节点 + 该年番剧数 + 卡片名 + 稀有度色点）。纯 computed，未登录守卫 + 空态友好。稀有度色点复用 `GAME_CONFIG.animeSystem.rarityConfig.c`（全站唯一来源，属铁律允许的稀有度识别色例外），其余全语义类。
- `views/CollectionsView.vue`：activeTab 类型加 `'timeline'`，图鉴与成就之间加「年表」tab + 内容区 `v-else-if activeTab==='timeline'`。

### B3：跨系统红点提示
- 新建 `stores/achievementsRead.ts`：设备级 localStorage 已读快照（存已读成就数量，仿 onboarding try/catch）+ `hasUnread(unlockedCount)` + `markRead(unlockedCount)`（不回退）。**不进存档、不升 schema。**
- `App.vue`：加 `homeHasSignal`（任一日/周任务做满未领 OR 今日登录奖励可领）与 `collectionsHasSignal`（图鉴里程碑达成未领 OR 成就新解锁未读）两个纯派生 computed；主页/卡牌收藏 nav 项加红点 span（v-if 信号）；CSS `.nav-dot` 用 `rgb(var(--c-danger))` 小圆点 + header 描边。
- `views/CollectionsView.vue`：watch activeTab，切到 'achievements' 即 `markRead(unlocked.length)` → 收藏红点即时消失。
- 测试：achievementsRead.test 加初始化/hasUnread/markRead 不回退/localStorage 不可用不抛（+7 用例，memory stub 仿 onboarding.test）。

---

## 未完成

无。

---

## 验收命令真实输出

```
$ npm run type-check
> vue-tsc --build
（无输出，0 错）

$ npm run test
 Test Files  32 passed (32)
      Tests  372 passed (372)
   Duration  3.56s

$ npm run build
✓ 302 modules transformed.
dist/assets/CollectionsView-DgTtPUvD.js   36.85 kB │ gzip: 11.75 kB
dist/assets/index-BsmIGJVF.js            238.28 kB │ gzip: 81.49 kB
✓ built in 7.79s

$ npx eslint <7 changed files>
（无输出，0 问题）
```

活体验证（dev :5273 + backend :5001，新建测试账号，已清理 user_data/auth/credentials）：
- B1：登录后「今日任务」「本周任务」两区渲染，显示「连续登录 1 天」（claimLoginReward 登录即发、streak=1）。
- B2：「年表」tab 在图鉴↔成就间；空态「还没有可以排进年表的番剧」正常；塞 6 部不同年番剧后渲染「共 6 部番剧，跨越 6 个年份」、年份降序 2011→1998。
- B3：daily 做满 + 未读成就 → 主页/卡牌收藏两红点亮（danger 色 rgb(226,92,61)）；访问成就 tab → 收藏红点消失 + localStorage achievements-read-count=1；领日任务 → 主页红点消失。全周期响应式正确。

---

## 新坑

- **claimLoginReward 现叠加连签档奖励**：B1 后登录奖励 = `DAILY_LOGIN_REWARDS`（每日固定）+ `loginStreakRewardFor(streak)`（连签档）。旧 daily.test「每日登录奖励」用例只断言固定档会失败，已更新为「固定 + 第1档」求和断言。后续改登录奖励数值需同步此测试。
- **markProgress 现双推**：同一类型埋点同时推进日任务与周任务。新增同类型周任务零成本；但若未来周任务想用 DAILY_TASKS 没有的类型（如 tower 通塔），需在对应玩法成功点补一行 markProgress（当前 userStore completeFloor 只 check('tower') 无 markProgress，故本轮周任务刻意只选已有埋点的 gacha/battleWin/watch）。
- **weekKey 用 ISO-8601 周**（周一为周首、含周四定年），跨年稳定；测试与 persistence.test 各复制了一份同款算法（领域 store 自包含原则，与 todayKey 同例）。
- **achievementsRead 存已读数量而非 id 全集**：因 achievements.unlocked 数组只增不减，比数量足以判「有无新解锁」。若未来成就可被撤销（数量会减），需改存 id 集合。

---

## 文件结构变更自报

新增（2 个源文件 + 1 个测试）：
- `frontend-vue/src/components/AnimeTimeline.vue`（B2 时间轴组件）
- `frontend-vue/src/stores/achievementsRead.ts`（B3 成就已读 localStorage store）
- `frontend-vue/src/stores/achievementsRead.test.ts`（B3 特征测试）

修改：
- `frontend-vue/src/config/dailyTasks.ts`（B1：WEEKLY_TASKS + LOGIN_STREAK_REWARDS + 取档/查询函数）
- `frontend-vue/src/stores/daily.ts`（B1：周任务 + 连签 + weekKey）
- `frontend-vue/src/stores/userStore.ts`（B1：claimWeeklyTask 门面）
- `frontend-vue/src/components/DailyTasksPanel.vue`（B1：周任务区 + 连签显示）
- `frontend-vue/src/infra/persistence/schema.ts`（B1：v7 + DailySave 扩字段 + createDefaultDaily）
- `frontend-vue/src/infra/persistence/migrations.ts`（B1：migrateDaily 补 v7 缺省）
- `frontend-vue/src/views/CollectionsView.vue`（B2：年表 tab；B3：成就 tab markRead watcher）
- `frontend-vue/src/App.vue`（B3：信号 computed + nav 红点 + CSS）
- `frontend-vue/src/stores/daily.test.ts`（B1 用例 + 修正登录奖励断言）
- `frontend-vue/src/infra/persistence/migrations.test.ts`（B1 v7 断言）
- `frontend-vue/src/stores/persistence.test.ts`（B1 daily 往返扩字段）
- `docs/SPRINT.md`（B1/B2/B3 → [x]）
