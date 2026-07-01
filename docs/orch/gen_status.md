# Generator Status — S14-A 第 4 轮（纠偏）：SA-T6 落地

> 纠偏缘由：第 3 轮 Planner 把 SA-T6 误判为「新范围」跳过，S14-A 只完成 5/6。
> 本轮唯一目标 = 实现 SA-T6（Plan A），让 S14-A 全部 6 项完成。SA-T1..T5 已落地功能未动。

## 状态：PASSED

SA-T6 已实现；直达进战红线满足；5 条验收全绿；S14-A SA-T1..SA-T6 现全 `[x]`。

## 完成任务

**SA-T6｜消解三 tab 结构冗余（Plan A）** — 已完成。

Plan A 三面落地：
1. **squad tab = 唯一编队入口**：保持 SA-T1，本轮零改动。
2. **explore tab = 预览 + 「开始挑战」直达进战**：
   - `HomesteadHubView.vue` 探索面板新增「出战小队」开战卡（`.start-card`）：展示 `selectedSquad` 名/战力/满编数 + 校验态。
   - `startBattleFromExplore()` 用 `canStartBattle`（同口径 `validateTowerSquadMembers` + 已登录 + 当前层未通过）拦截：合法则设 `battleEntrySquadId = selectedSquad.id` + `switchTab('battle')`；不合法留 explore 显示 `startBattleIssue`，不进战。
   - 原「进入战斗」空切按钮 → 「去编队」跳 squad tab（不再空切 battle tab 让用户重编队）。
3. **battle tab = 仅承载战斗演出**：
   - `SquadBattleView` 加 props `entrySquadId: number|null`（默认 null）+ `embedded: boolean`（默认 false）+ emit `exit-to-explore`。
   - battle tab 以 `:entry-squad-id="battleEntrySquadId" :embedded="true" @exit-to-explore="handleBattleExit"` 驱动。

**直达进战红线**（round3 强调，冗余不复活）：
- `SquadBattleView.onMounted` 调 `tryEnterFromEntry()`：带合法 `entrySquadId` 即调用已有 `startTowerBattle(squadId)` 把 `currentPhase` 推到 `'battle'`，**不渲染 towerMode 编成器**。
- 挂载时敌人/登录未就绪的兜底：`watch([isLoggedIn, allCharacterCards.length])` 就绪后自动补一次直达。
- 优雅降级：`embedded && currentPhase==='towerMode'`（无合法 entrySquadId，如深链/刷新 `?tab=battle`）不渲染整套 towerMode 编成器，改为最小占位「从『探索』选择小队开始挑战」+「去探索选队」按钮（emit `exit-to-explore` → hub `handleBattleExit` 切 explore）。
- 结算：result 演出正常显示；embedded 下「继续」经 `restart()` → `emit('exit-to-explore')` 切回 explore，不落 towerMode。
- stale id 防护：`watch(activeTab)` 离开 battle tab 即清 `battleEntrySquadId`。

**顺带清理（round1 lint 债）**：`SquadBattleView.vue:82` `ref<any>` → `ref<TowerFloorSquad | null>`（`generateTowerFloorEnemies` 准确返回类型，从 `@/engine` 导入 `TowerFloorSquad`）。无回归。

## 未完成 / 卡点

无。SA-T6 全部落地，5 条验收命令全绿。

## 每条验收命令实际输出

### 1. `cd frontend-vue && npm run type-check` — 通过（EXITCODE=0）
```
> frontend-vue@0.0.0 type-check
> vue-tsc --build

EXITCODE=0
```
（0 错误）

### 2. `cd frontend-vue && npm run test` — 通过（EXITCODE=0）
```
> frontend-vue@0.0.0 test
> vitest run

 RUN  v4.1.8 D:/work/AnimePlay/frontend-vue

 Test Files  58 passed (58)
      Tests  653 passed (653)
   Duration  11.16s

EXITCODE=0
```

### 3. `cd frontend-vue && npm run build` — 通过（EXITCODE=0）
```
> frontend-vue@0.0.0 build
> run-p type-check "build-only {@}" --
> vite build
✓ 381 modules transformed.
dist/assets/HomesteadHubView-CeyQls45.js   101.00 kB │ gzip: 32.80 kB
dist/assets/index-CbG0_-j1.js              287.44 kB │ gzip: 99.14 kB
✓ built in 9.13s

EXITCODE=0
```
（唯一 stderr 是 Browserslist caniuse-lite 数据 7 个月旧的告警，非错误，不影响构建成功）

### 4. `python backend/test_security.py` — 通过（EXITCODE=0，全 PASS）
```
== app.debug 关闭 ==            PASS  server.app.debug is False
== 未带 token 读存档 → 401 ==    PASS
== 错密码 login → 401 ==         PASS (register 200 / wrong pw 401)
== 对密码 login → 拿到 token ==   PASS
== 带 token 读写自己存档 → 成功 == PASS (POST/GET 200, saveVersion=1)
== 用 A 的 token 写 B 的存档 → 被拒 == PASS (401/401)
== saveVersion 乐观并发 ==        PASS (stale 409 / correct 200 v2)
== 原子写失败后原存档完整 ==       PASS
== 邀请码门控 ==                  PASS

RESULT: PASS — all security checks passed
EXITCODE=0
```
（用 `.venv\Scripts\python.exe` 运行，仿 pitfalls S10）

### 5. `grep -rn "debug=True" backend/server.py api/index.py` — 零命中（EXITCODE=1）
```
（无输出）
EXITCODE=1
```
grep 无匹配返回退出码 1 = 期望的「零命中」。

## 新坑

- 无新代码坑。engine 未碰（纯视图层），未升 schema，颜色全走语义令牌（`.start-card` 用 `--c-accent/--c-ink/--c-highlight/--c-success` 等，无 text-white / 无动态色类），按钮走全局 `.btn-primary/.btn-secondary/.btn-ghost`。SquadBattleView 未新增 setTimeout（复用既有 `schedule()`/`clearBattleTimers()` 纪律）。
- 一条实现提醒（非坑）：`SquadBattleView` 加的 props 有默认值（entrySquadId=null / embedded=false），保证「独立进 battle tab / 未来非内嵌引用」优雅降级；当前它仅被 hub 内嵌引用。

## 文件结构变更

无新增/删除文件。改动两处源码 + 两处文档：
- `frontend-vue/src/views/SquadBattleView.vue`：+props(entrySquadId/embedded) +emit(exit-to-explore) +tryEnterFromEntry() + onMounted 直达 + watch 就绪补进战 + restart embedded 退出 + embedded towerMode 最小占位模板 + `ref<any>`→`ref<TowerFloorSquad|null>` + import TowerFloorSquad。
- `frontend-vue/src/views/HomesteadHubView.vue`：+battleEntrySquadId ref + explore 开战校验 computed（currentFloorCleared/exploreSquadValidation/canStartBattle/startBattleIssue）+ startBattleFromExplore/handleBattleExit + watch(activeTab) 清 stale id + explore「出战小队」开战卡（.start-card 模板 + 样式）+ 头部按钮改「去编队」+ battle tab 传 props/事件。
- `docs/plans/SPRINT.md`：SA-T6 `[ ]`→`[x]` + 新增「## 第 4 轮（纠偏）：SA-T6 落地」。
- `docs/orch/gen_status.md`：本文件（覆盖写）。
