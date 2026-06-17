# Evaluator Report — Iteration 5 (evolution R1/5：小游戏 Hub + 高低牌)

> QA Evaluator 独立验收，2026-06-17。不信任 Generator 自报，亲自重跑三命令 + 抽查代码。
> 工作根目录 D:\work\AnimePlay，分支 restructure（本轮交付在工作区未提交，git status 已确认）。

## 1. SPRINT 硬性交付 Checkbox 核对

| 硬交付项 | SPRINT 标记 | 实测结论 |
|---|---|---|
| 统一小游戏中心 | `[x]` | ✅ 达成：`/minigames` 路由 + `MiniGamesView.vue`（选择器 Hub）+ 导航「🎮 小游戏」取代「🎭 猜角色」+ `/guess` redirect + 猜角色原样迁入 |
| 新小游戏 #1（高低牌） | `[x]` | ✅ 达成：`stores/minigames/higherLower.ts` 纯逻辑 + `HigherLowerGame.vue` + 经济（profile.earn 封顶）+ 存档 v8 持久化 |
| 新小游戏 #2 | `[ ]` | 未做（本轮范围只到 #1，#2 留第 6 轮）——与 SPRINT/plan 一致，非缩水 |

本轮契约范围 = Hub + 猜角色迁入 + 游戏 #1。两个本轮 checkbox 名副其实。

## 2. 验收命令重跑（Evaluator 亲跑，frontend-vue/ 下）

| 命令 | 自报 | 实测 | 结论 |
|---|---|---|---|
| `npm run type-check` | 0 错 | **0 错**（vue-tsc --build 静默通过） | ✅ 一致 |
| `npm run test` | 33 files / 383 passed | **Test Files 33 passed / Tests 383 passed**（Duration 1.28s） | ✅ 一致，≥372 基线达标 |
| `npm run build` | ✓ 306 modules / 2.82s | **✓ built in 2.65s**，`MiniGamesView-*.js 14.88kB` chunk 存在 | ✅ 成功 |

三命令全绿。自报无夸大（test 数 383 精确吻合，build 时间小幅波动正常）。

## 3. 自报 vs 实测对比

gen_status.md 自报 PASSED / test 383 — **完全属实**。socket 掉线后 orchestrator 接管续做的声明也与工作区一致（schema/migrations 已改 + 新文件齐全）。无夸大、无缩水谎报。

## 4. 代码抽查（逐项亲自 Read）

### 4.1 维度分桶铁律 ✅ 严格合规
`stores/minigames/higherLower.ts:57-71` `cardValue`：
- `charPopularity` → 只读 `(card as CharacterCard).popularity_score`
- `animeRatingTotal` → 只读 `(card as AnimeCard).rating_total`
- `animeYear` → 只读 `(card as AnimeCard).date` 取年份
- **三维度互不混用，全程不碰 `rating_score`**（grep 确认 minigames 目录零 `rating_score`）。
- 与 Scout 实测铁律一致（角色无 rating_rank/date、番剧无 popularity_score）。
- 特征测试 `higherLower.test.ts:20-27` 显式断言「角色卡读 animeRatingTotal → null」「番剧坏 date → null」——分桶有测试锁。
- `pickRound`（`:89-99`）：right 卡用 `excludeValue = cardValue(left)` 排除，**保证两值不等 → 无平局**。`judge`（`:102-104`）严格 `>`/`<`。

### 4.2 经济安全 ✅ 真生效，无刷分漏洞
- **唯一货币入口**：发奖只走 `userStore.settleHigherLower`（`userStore.ts:312-323`）→ `profile.earn('knowledgePoints', kpToAward)`。kpToAward 在 store 内已封顶，userStore 不二次计算。
- **每日封顶真生效**：`HL_DAILY_KP_CAP=120`；`cappedAward`（`:112-114`）= `max(0, min(reward, cap-awardedToday))`；`settle`（`:200-219`）跨天比对 `todayKey()` 归零 `awardedToday` 后累加。测试 `higherLower.test.ts:110-137` 三连局断言：首局 streak10→发30；同日 streak50（应得150）→只发 90（剩余额度 120-30）；第三局→发 0。**「一局连对刷爆知识点」漏洞确认关闭**：streak 即便 50 也被裁到日剩余额度。
- **streak 里程碑发奖**：`streakReward`（`:107-109`）= `floor(streak/5)*15`，streak<5 → 0。测试 `:36-43` 锁定。
- 唯一生产调用点 = `HigherLowerGame.vue:44`（grep 全仓确认），每局 game-over 触发一次（busy 锁 + revealRight 守卫防重入），无双发路径。
- 轻微瑕疵（非漏洞）：`settle()` 文档注释自称「幂等保护：仅 isGameOver 且尚未结算」，但代码无 isGameOver 守卫/已结算标志。实际单一调用点 + UI 守卫使其单次执行；即便假想双调用，`cappedAward` 仍把当日总产出钉在 120，**不构成经济漏洞**，仅注释略夸。建议后续补 isGameOver 守卫使注释名副其实。

### 4.3 engine 纯净 ✅
- 高低牌纯逻辑全在 `stores/minigames/`，grep `engine/` 零命中 `higherLower|minigame|popularity_score|rating_total|cardValue|streakReward` —— 无 minigame 逻辑混入 engine。
- 纯函数注入 RNG：`pickCard`/`pickRound` 收 `rng: RNG` 参数，调 `rng.pick`；store 编排层喂 `defaultRng`（`engine/rng.ts:81`，生产真随机）。minigames 目录唯一 `Math.random` 字样是注释「不在内部调用 Math.random」——纯函数体内零 Math.random。
- RNG 接口确认：`engine/rng.ts` 导出 `RNG`/`createRng`/`createSeededRng`/`defaultRng`，`pick` 方法存在（`:31`）。

### 4.4 schema v8 三处同改 ✅，不动 guess 域，测试只追加未弱化
- **schema.ts**：`SAVE_VERSION=8`（`:26`）+ `MiniGamesSave`/`HigherLowerSave` 接口（`:59-78`）+ `createDefaultMiniGames`（`:166-172`）+ v8 注释（`:13`）+ `SavePayload.minigames`（`:132`）。`GuessGameSave`（`:54-56`）原样未动。
- **migrations.ts**：`migrateMiniGames`（`:97-110`，字段级缺省）+ migrate() 注册（`:148`）。guess 迁移行（`:137` `guess.highScore`）原样未动。
- **persistence.ts**：buildPayload（`:66`）+ applyPayload（`:102`）+ resetAllDomains（`:121`）+ import（`:21`）四处装配齐全。
- **不动 v7 guess 域**：`git diff` 确认 schema/migrations 对 guess 零改动；`migrations.test.ts:77,126` 的 `guess.highScore` 往返断言（缺省 0 / 原样保留 85）原样保留。
- **测试只追加未弱化**：`git diff` 两测试文件——migrations.test 仅 +1 用例（v8 minigames 缺省补默认）；persistence.test 仅 +seed 6 行 +往返断言 5 行 + payload key 列表加 `'minigames'`。**v1~v7 既有断言一行未删未改**。

### 4.5 Hub / 路由 ✅
- `/minigames` 路由存在（`router/index.ts:42-46`）；`/guess` 改 `redirect: '/minigames'`（`:47-51`，原 component 已删）。
- `App.vue` 导航：`git diff` 确认 `🎭 猜角色`→`/guess` 改为 `🎮 小游戏`→`/minigames`。
- `views/GuessView.vue` 已删（git status `D`）。
- `GuessCharacter.vue` 内部未动：`git diff --stat` 空（零改动），Hub 内 `<GuessCharacter />` 原样渲染。

### 4.6 颜色铁律 ✅
- 新文件 `MiniGamesView.vue` / `HigherLowerGame.vue`：grep `text-white` / `bg-${` / 动态色类拼接 —— **零命中**。
- 全程语义类：`text-ink`/`text-ink-soft`/`.btn-primary`/`.btn-secondary`/`.btn-ghost` + `rgb(var(--c-*))`。卡图用 `/data/images/{type}/{id}.jpg`（图片例外，合规）。

## 5. pitfalls 合规
- engine 纯净 ✅ / RNG 可注入 ✅ / 依赖只向下（store→engine，未反向）✅。
- 存档三处同改 + 迁移测试 + 不破坏往返保真 ✅。
- 设备级偏好（上次选的游戏）用 localStorage 不进存档（`MiniGamesView.vue:14-37`）✅。
- 组件多步 setTimeout 登记并卸载清除（`HigherLowerGame.vue:15-20` timers + onUnmounted）✅。
- 未跑 `npm run lint --fix`（按铁律）。

## 6. 结构漂移
项目无 `docs/project_structure.md`，**跳过**结构漂移核对（与 Generator 自报一致）。

## 7. 决策
本轮硬交付（统一小游戏中心 + 新小游戏 #1）全部达成；三验收命令亲跑全绿（type-check 0 错 / test 383 全绿 / build 成功）；维度分桶严格分桶无混用、经济每日封顶真生效无刷分漏洞、engine 纯净、schema v8 三处同改且 v1~v7 测试未弱化、guess 域未动、颜色铁律不破。唯一发现是 `settle()` 注释「幂等保护」略夸（代码无显式 isGameOver 守卫），但单调用点 + 日封顶使其无经济风险——记为后续清洁项，不阻断本轮。

**质量门：PASS。** tier1 on 跑满 5 轮，本轮不强制停循环；本轮无需返工。

DECISION: COMPLETE
