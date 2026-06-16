# Generator 执行报告 — Evolution 第 1 轮（E1-T1/T2/T3）

> Code Generator 自报。主题：给「玩法齐全但没动机」的产品装留存引擎。
> 状态：**PASSED** —— 三任务全部实现并真实可用，三条验收命令全绿，且经真实后端走通登录→玩法埋点→领奖→重开保真闭环。

---

## 完成的任务

### E1-T1：每日任务 + 每日登录奖励 ✅
- **新建 `stores/daily.ts`**：照 shop.ts 跨天判定（复制 `todayKey()`，读时比对 date 过期归零，不存定时器）+ guess.ts 三件套（serialize/deserialize/reset）。状态：`date / progress(Record<taskId,number>) / claimed(string[]) / lastLoginDate`。暴露 `markProgress(type,amount)` / `claim(taskId)` / `claimLoginReward()`。领域 store 自身不调 saveToServer。
- **静态任务定义 `config/dailyTasks.ts`**：4 条任务（抽卡1次/赢1场宅理论战/收观看1次/养成互动1次），发奖以券为主、知识点为辅（用 `profile.earn`）。另有 `DAILY_LOGIN_REWARDS`（1 动画券 + 1 角色券）。
- **主页面板 `components/DailyTasksPanel.vue`**：插在 HomeView `<PlayerStatus/>` 与 `<WatchQueue/>` 之间。进度条 + 领取按钮 + 未登录守卫，全语义色（bg-surface/text-ink/text-accent/border-line + .btn-primary）。
- **每日登录奖励**：在 `userStore.login()` 的 `loadFromServer()` 后调 `claimLoginReward()`，跨天首次发放并 saveToServer。
- **埋点**：抽卡（drawCards）/ 收观看（collectFromViewingQueue 返回值守卫）/ 养成互动（新增 withNurtureProgress 包装三个互动入口）均在现有 saveToServer 前加 `markProgress`；对战在 **battleFlow.endGame 的 isLoggedIn 块内、仅 winner==='playerA' 时**单独埋。

### E1-T2：图鉴/收集完成度 + 里程碑 ✅
- **CollectionsView 加第 4 个 tab `'codex'`**（另加第 5 个 `'achievements'` 给 T3）。
- **`components/CodexPanel.vue`**：完成度为纯派生 computed（遍历 gameDataStore.allXxxCards，对每张标 owned = collection.getXxxCardCount(id)>0）；总数/各稀有度分母全用 `.length` + filter，**未硬编码 665**（实测显示 0/665、UR 0/66、SSR 0/133… 全部数据派生）。未拥有卡走 VirtualGrid 渲染灰位剪影（opacity-40 grayscale + 「未拥有」角标）。
- **里程碑**：静态阈值表 `config/codexMilestones.ts`（角色 50/100/300/500、动画 50/100/300、UR 集齐×2 共 9 条）；达成可领一次性奖励（profile.earn）。
- **最小新 store `stores/codex.ts`**：只管 `claimedMilestones: string[]` + 完成度 getter；唯一进存档的是已领里程碑 id 数组。
- **顺手**：CollectionsView 的 `enableVirtualization` 调试开关收成内部常量 `ENABLE_VIRTUALIZATION`（scout C-4）。

### E1-T3：成就系统 ✅
- **新建 `stores/achievements.ts`**（同构）：`unlocked: string[]` 进存档 + 会话级累计 stats（不进档，解锁靠 id 幂等）。`check(event, payload)` 事件驱动判定，返回本次新解锁 id。
- **静态成就 `config/achievements.ts`**：18 条（首张 UR/SSR、抽卡 10/100、对战 1/10/50、观看 1/50、养成 1/50/满级、猜角色 1/连对5/50、爬塔 5/20、图鉴里程碑）。
- **成就墙 `components/AchievementsPanel.vue`**（CollectionsView 内 `achievements` tab）：已解锁/未解锁（🔒）+ 徽章 emoji + 奖励，全语义色。
- **同批埋点追加 `check(...)`**：与 daily 同一批 6 个成功点一次改完（抽卡传 rarities、对战胜利、观看、养成传 characterMaxLevel、猜对 + 猜错 resetGuessStreak、爬塔传 floor、图鉴里程碑领取联动 codex check）。

### 存档协议 v5→v6 ✅
- `schema.ts`：SAVE_VERSION 5→6；加 DailySave 接口 + SavePayload 末尾三键（daily/codexMilestones/achievements）+ createDefaultDaily 工厂 + 顶部块注释。
- `migrations.ts`：migrate() 末尾加三键 v5→v6 迁移（migrateDaily 局部纯函数字段级兜底；codexMilestones/achievements 数组守卫）。
- `stores/persistence.ts`：buildPayload/applyPayload/resetAllDomains 各加三行 + 顶部 import 三个新 store。
- 测试：migrations.test 加「v6 新键缺省 + v6 存档原样保留 + v6 局部损坏兜底」；persistence.test 的 populateAllDomains 塞三域新状态 + 往返断言 + 「payload 全键列表」加三键。**既有 v1~v5 断言一字未改。**

---

## 未完成的

无。三任务全部完成。

---

## 验收命令真实输出

```
# cd frontend-vue && npm run type-check
> vue-tsc --build
（0 错误，无任何额外输出）

# cd frontend-vue && npm run test
 Test Files  28 passed (28)
      Tests  336 passed (336)
（基线 310+；本轮新增 3 个测试文件 daily/codex/achievements + migrations.test 的 v6 断言
  + persistence.test 的三域往返断言，总计 +26 用例）

# cd frontend-vue && npm run build
✓ 290 modules transformed.
✓ built in 10.66s
（生产构建成功）

# npx eslint <每个新增/改动文件>（单文件，不带 --fix）
（修掉 CodexPanel 一处 unused import 后，全部 0 error 0 warning）
```

### 浏览器真实闭环验证（Flask 后端 :5001 + dev :5273）
经真实后端账号 `evotest1` 走通（验证后已清理存档 + credentials 还原为空）：
1. **未登录**：主页「今日任务」面板显示「请先登录以查看今日任务」守卫 ✅
2. **登录**：系统日志出现「每日登录奖励到账：1 动画券、1 角色券！」，券从基线 100→**101** ✅
3. **今日任务面板**：4 条任务全渲染，进度条 0/1 + 「进行中」+ 奖励标签 + 「已完成 0/4」计数 ✅
4. **图鉴 tab**：总完成度 **0/665（派生非硬编码）**、UR 0/66 / SSR 0/133 等各稀有度条、5 条角色里程碑「未达成」、灰位「未拥有」剪影网格（真实角色名） ✅
5. **成就 tab**：18 条成就锁态（🔒）+ 徽章 + 奖励 + 「已解锁 0/18」 ✅
6. **埋点链**：`user.drawCards('anime',1)` → daily_gacha 进度 0→1（任务完成）+ achievements.stats.gachaCount 0→1 ✅
7. **领奖**：`claimDailyTask('daily_gacha')` → 已领 + 知识点 0→30 + 触发存档 ✅
8. **v6 重开保真**：**整页 reload + 重新登录后** gachaProgress=1 / gachaClaimed=true / lastLoginDate='2026-6-16' / knowledgePoints=30 全部从后端存档恢复 ✅

---

## 新发现的坑

1. **UR 同时命中 SSR 档成就**：成就 `ach_first_ssr` 的条件是 rarities 含 SSR/HR/UR，故抽到 UR 会同时解锁「欧皇降临」(200) + 「小有所获」(50)=250。这是有意设计（UR 也是稀有），但写测试时易误判奖励数值——已在 achievements 测试里显式断言组合值。
2. **round-trip 测试与 daily 跨天清零的张力**：populateAllDomains 给 daily 塞固定未来日期会被 deserialize 内的 ensureToday 判为「非今天」而清零。解决：测试用「今天」的真实 todayKey 塞值，使 deserialize 不触发跨天重置。（daily 对「非今日」存档一律清零是正确行为——含时钟偏移的未来日期。）
3. **MAX_CHARACTER_LEVEL 真值是 100 不是 30**：满级成就判定从 `@/engine` import 常量（engine/nurture/rules.ts），不硬编码，避免与引擎漂移。
4. **data/auth/ 是后端运行时目录**：S10 鉴权把密码哈希写 `data/auth/credentials.json`（git 未跟踪）。浏览器验证创建的 evotest1 凭据已清理还原为空。

---

## 文件结构变更自报

> 项目无 docs/project_structure.md，此处自报。

**新增 store（3）**：
- `frontend-vue/src/stores/daily.ts` — 每日任务进度 + 登录奖励领域 store
- `frontend-vue/src/stores/codex.ts` — 图鉴完成度（纯派生）+ 里程碑领取
- `frontend-vue/src/stores/achievements.ts` — 成就解锁判定 + 已解锁 id

**新增 component（3）**：
- `frontend-vue/src/components/DailyTasksPanel.vue` — 主页今日任务面板
- `frontend-vue/src/components/CodexPanel.vue` — 图鉴 tab（完成度条 + 里程碑 + 灰位网格）
- `frontend-vue/src/components/AchievementsPanel.vue` — 成就墙 tab

**新增 config（3）**：
- `frontend-vue/src/config/dailyTasks.ts` — 4 条每日任务 + 登录奖励静态定义
- `frontend-vue/src/config/codexMilestones.ts` — 9 条图鉴里程碑阈值表
- `frontend-vue/src/config/achievements.ts` — 18 条成就静态定义 + 解锁条件

**新增测试（3）**：
- `frontend-vue/src/stores/daily.test.ts`（跨天重置/markProgress/claim/登录/序列化往返）
- `frontend-vue/src/stores/codex.test.ts`（完成度派生/里程碑达成与领取/序列化）
- `frontend-vue/src/stores/achievements.test.ts`（解锁判定/幂等/连对/楼层/满级/序列化）

**改动文件**：
- `frontend-vue/src/infra/persistence/schema.ts`（v6 + DailySave + 三键 + createDefaultDaily）
- `frontend-vue/src/infra/persistence/migrations.ts`（migrateDaily + 三键迁移）
- `frontend-vue/src/infra/persistence/migrations.test.ts`（v6 断言，只追加）
- `frontend-vue/src/stores/persistence.ts`（装配器三处 + import）
- `frontend-vue/src/stores/persistence.test.ts`（三域往返 + 全键列表，只追加）
- `frontend-vue/src/stores/userStore.ts`（5 处埋点 + withNurtureProgress + login 奖励 + claim 门面）
- `frontend-vue/src/stores/battleFlow.ts`（endGame 对战胜利埋点）
- `frontend-vue/src/views/CollectionsView.vue`（codex/achievements 两 tab + 虚拟化开关收口）
- `frontend-vue/src/views/HomeView.vue`（插入 DailyTasksPanel）
- `docs/SPRINT.md`（E1-T1/T2/T3 勾 [x]）

---

## 状态：PASSED
