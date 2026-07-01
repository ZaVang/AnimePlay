# Generator 状态报告 — S14-B 收尾①「暴击 UI 显形」（纠偏轮）

## 任务
纠偏：S14-B 第 3 轮收尾①「暴击 UI 显形」被漏做——SB-T3 已让暴击在 engine 里真实发生（`damage` 事件带
`isCritical`），但 `SquadBattleView.applyEventToUnits` 的 `case 'damage'` 只取 `hpAfter`、丢弃了
`isCritical`，战斗日志也不记伤害 → 暴击对玩家完全不可感知。本任务把已算好的 `isCritical` 接到 UI 最后一寸。
**纯 view 层改动，engine 零改动。**

## 完成内容（A + B 都做）

### A｜浮动伤害数字（打击感）
- `components/battle/squad/types.ts`：新增 `SquadFloatingDamageView`（`{ id, targetId, amount, isCritical }`）瞬态视图类型。
- `views/SquadBattleView.vue`：
  - 新增瞬态状态 `floatingDamages: SquadFloatingDamageView[]` + 自增序号 `floatingDamageSeq`。
  - 新增 `spawnFloatingDamage(event)`：只在 `playNextBattleEvent`（单条推进）里对**刚回放到的** `damage` 事件生成一条浮动数字，
    **不放在 `applyEventToUnits`**（后者在 `rebuildVisibleBattle` 里会重放全部历史事件 → 会每帧刷屏）。amount<=0 跳过。
  - 定时器分池：把原 `pendingTimers` 拆成 `playbackTimers`（回放推进链）+ `floatingTimers`（浮动数字清除，各自 TTL=900ms）。
    `schedule()` 走 playback 池；新增 `scheduleFloatingClear()` 走 floating 池；新增 `clearPlaybackTimers()` 只掐推进链
    （`playNextBattleEvent` 顶部改调它，避免掐掉浮动清除定时器致泄漏）；`clearBattleTimers()` 全清两池 + 清空 `floatingDamages`。
    reset(`restart`)/结算(`finishTimedBattle`)/`onBeforeUnmount` 均走 `clearBattleTimers` → 浮动数字与定时器一并清除。
  - 模板：`SquadBattlefield` 新增 `:floating-damages="floatingDamages"`。
- `components/battle/squad/SquadBattlefield.vue`：新增可选 `floatingDamages` prop；`floatingByTarget` 按 `targetId` 归拢；
  `floatingFor(unitId)` 分发到每个 `SquadUnitBar`（玩家阵 + 敌方阵各自传）。
- `components/battle/squad/SquadUnitBar.vue`：新增可选 `floatingDamages` prop；根容器加 `relative`；新增 `pointer-events-none`
  绝对定位浮动数字层（不挡下方选目标点击）。暴击样式 = `text-highlight`(金语义令牌) + 更大字号(text-xl/2xl) + `CRIT` 上标 +
  `squad-dmg-crit-pop` 冲击缩放/抖动动画；普通 = `text-danger` + text-base/lg。scoped `<style>` 定义 `squad-dmg-rise`
  上浮淡出 + `squad-dmg-crit-pop` 冲击关键帧，并加 `prefers-reduced-motion` 降级（仅淡入淡出）。

### B｜战斗日志记暴击
- `views/SquadBattleView.vue` `buildKeyLogs`：新增 `case 'damage'`，仅当 `isCritical` 时记「💥 暴击！X 对 Y 造成 N 伤害」，
  普通伤害不记（契合「只记关键事件」既有设计，不刷屏）。`buildKeyLogs` 对可见前缀幂等重算 → 不会重复累积。

## 架构合规
- 颜色全走皮肤语义令牌：暴击 `text-highlight`、普通 `text-danger`；无 `text-white` 压浅底、无运行时拼接动态色类。
- 所有 setTimeout 走登记式 `schedule()`/`scheduleFloatingClear()`，`onBeforeUnmount` → `clearBattleTimers()` 全清；无裸 setTimeout。
- 浮动数字跟随现有 180ms 逐条回放节奏（在 `playNextBattleEvent` 生成），不打乱 `applyEventToUnits` 主流程；reset 清空浮动数字 + 定时器。
- **engine 零改动**：本会话仅编辑 `views/SquadBattleView.vue` + `components/battle/squad/{SquadBattlefield,SquadUnitBar,types}.ts`。
  （`git status` 中 `engine/squad/*`、`engine/rng.ts` 的 dirty 是前序 SB-T2/T3/T5 轮遗留的工作树改动，非本会话所为。）

## 验收命令实际输出

### 1) `cd frontend-vue && npm run type-check`
```
> frontend-vue@0.0.0 type-check
> vue-tsc --build
```
（0 error，通过）

### 2) `npm run test`
```
 RUN  v4.1.8 D:/work/AnimePlay/frontend-vue
 Test Files  58 passed (58)
      Tests  670 passed (670)
   Duration  9.86s
```
全绿。

### 3) `npm run build`
```
vite v7.3.6 building client environment for production...
✓ 382 modules transformed.
✓ built in 10.05s
```
成功（仅 caniuse-lite 数据 7 个月旧的非致命提示 + sky-island 图 2.6MB 既有大图，均与本改动无关）。

### 4) `python backend/test_security.py`
系统全局 Python 3.13 无 flask/werkzeug（`ModuleNotFoundError: No module named 'werkzeug'`）——环境缺依赖，与本前端改动无关。
仓库 `.venv` 有依赖，用 `.venv/Scripts/python.exe backend/test_security.py` 实跑：
```
== app.debug 关闭 ==            PASS  server.app.debug is False
== 未带 token 读存档 → 401 ==   PASS (got 401)
== 错密码 login → 401 ==        PASS  register→200 / wrong password→401
== 对密码 login → 拿到 token == PASS
== 带 token 读写自己存档 ==     PASS  POST/GET own save saveVersion=1
== 用 A 的 token 写 B 的存档 == PASS  rejected (401)
== saveVersion 乐观并发 ==      PASS  stale→409 / correct→200 saveVersion=2
== 原子写 ==                    PASS  original save unchanged & fully readable / no temp leftovers
== 邀请码门控 ==                PASS  no invite→403 / wrong→403 / correct→200 / 老账号不受影响
RESULT: PASS — all security checks passed
```
全绿。

### 5) `grep -rn "debug=True" backend/server.py api/index.py`
```
（无输出，exit=1，无匹配）
```
无 `debug=True` 残留。

## 新坑 / 注意
- 系统全局 Python（3.13.12）未装 flask/werkzeug；`backend/test_security.py` 必须用仓库 `.venv/Scripts/python.exe` 运行，否则 import 即崩。
  （非本任务引入，属环境记录，供后续验收统一用 `.venv`。）
- `.venv` 里 werkzeug 无 `__version__` 属性（新版本），但 flask 正常，安全测试不受影响。

## 状态
**PASSED** — 暴击 UI 双通道显形（A 浮动伤害数字暴击醒目样式 + B 日志记暴击）；engine 零改动；5 条验收命令全绿
（type-check 0 error / 670 test 全过 / build 成功 / test_security PASS via .venv / grep 无 debug=True）。
