# Evaluator — S14-B 第 3/3 轮（收尾轮，指派切片 = SB-T2）

## 决策：COMPLETE

指派切片 SB-T2（手动大招选目标 + 前缀冻结平滑推进）**真实现落地**（非空跑）；5 条验收命令全部亲自重跑通过；SB-T1..SB-T5 主清单全 `[x]` 且与实现一致；未破坏前几轮与 S14-A。

---

## 1. SPRINT 指派切片 checkbox 核对
- 主清单 SB-T1..SB-T5 全部 `[x]`（SPRINT.md:26/29/32/35/38）。
- 第 3 轮追加清单本轮-7/8/9 全部 `[x]`（SPRINT.md:147/151/155）。
- 收尾轮硬指标满足：合同全部 `[x]` 且与实现一致（非「跑满轮次≠达成」）。

## 2. 验收命令实测（Evaluator 亲自重跑）
| 命令 | 实际输出 | 结论 |
|---|---|---|
| `npm run type-check` | vue-tsc --build，无输出，EXIT=0 | PASS |
| `npm run test` | Test Files 58 passed / Tests **670 passed (670)** | PASS |
| `npm run build` | ✓ built in 8.80s，EXIT=0 | PASS |
| `python backend/test_security.py`（./.venv/Scripts/python.exe） | RESULT: PASS — all security checks passed，EXIT=0 | PASS |
| `grep debug=True server.py / api/index.py` | No matches（两处均零命中） | PASS |

## 3. 自报 vs 实际对比
- Generator 自报 670/670、type-check 0 错、build 成功、security PASS、debug 零命中 —— **逐条一致**（自报 build 11.86s / 本机 8.80s，仅耗时差异，非结果差异）。
- 自报文件结构变更（rng.ts StatefulRng / effects.ts canOverrideTarget+resolveSkillTargets / timedBattle.ts resumeTimedBattle+checkpoint / types.ts targetId / View+Battlefield 接线）—— 逐一 Read 核实属实。

## 4. pitfalls 合规
- engine 纯净：`grep -rn "Math.random|@/stores|from 'pinia'" src/engine/` 唯一 Math.random 命中 = rng.ts:118 已授权 `defaultRng`（eslint-disable），其余全是注释/文档；resumeTimedBattle RNG 走注入 StatefulSeededRng，零违规。
- 零存档触点：SAVE_VERSION 仍 15；`git diff --stat HEAD -- infra/persistence/` 空 —— schema/migrations/装配器均未动（targetId/orders 为战斗内瞬态）。
- 未扩 `TimedBattleWinner`（坑 C-1 规避，SB-T1 用 BattleEndReason 扩值区分三态）。
- 禁动态色类 / text-white 压浅底：SB-T2 UI（选目标提示条 + 高亮环）无新增违规（build 通过、复用语义令牌范式）。

## 5. 真实性抽查（Read/Grep，不改码）
- **前缀冻结平滑推进（本轮-7，拍板 1/2）真落地**：`resumeTimedBattle` = ①跑基线采 checkpoint（atMs+RNG快照+单位深拷贝+前缀事件长度+orderIndex）②取 atMs≤resumeFromMs 最后 checkpoint 作分叉、slice 复用冻结前缀 ③restore RNG 状态 + 恢复单位 + 命令游标只重算后缀。`StatefulRng.snapshot/restore`（mulberry32 单 uint32 累加器）真实现。**红线守住**：非方案 B「整场重算+截后缀」伪平滑——测试 `prefix freeze` 断言前缀逐条相同 + 时间戳单调不倒流 + 后缀确因新命令改变（proves 非伪平滑）。
- **选目标（本轮-8，拍板 3/5）真落地**：`canOverrideTarget` = 单体敌方 selector 白名单（frontEnemy/lowestHpEnemy/highestAtkEnemy/backEnemy）；`resolveSkillTargets` 单体覆盖命中存活敌方、AOE/self/己方忽略、死目标回退默认 selector。测试覆盖：单体命中所选(非默认front) / AOE 忽略仍全体 / 死目标回退不空放且扣能量 / 超时 pending order(atMs>maxTimeMs)不改裁决(elapsedMs=90000, timeoutDraw, 无 ultimate action)。
- **UI 同口径（防 P1-4 反向 affordance）真落地**：View `ultimateAllowsTargeting` 复用 engine `canOverrideTarget`；SquadBattlefield 有 targetingCasterId/Name props + selectTarget/cancelTargeting emits + 提示条 + 敌方可点选高亮环；单体才进选目标态、AOE 点一下即放 —— UI 亮起条件 == engine 覆盖生效条件（同一函数）。
- **无硬编码时限**：View import `DEFAULT_MAX_TIME_MS` 传 :max-time-ms 与 resume/regenerate maxTimeMs 同源。
- **手动路径已切换**：View 两 handler + toggle 走 resumeBattleSimulation（前缀冻结），regenerate 仅用于从 0 初始模拟。
- **前几轮护栏未破**：SB-T1 三态裁决（timeoutWin/Loss/Draw）、SB-T3 base crit 0.05、SB-T4 站位单体减伤 front×1、SB-T5 累加设上限 断言全在 670 内通过；auto/manual ultimate 护栏(:262)在。

## 6. 失败原因
无。

## 7. 新坑待追加
- [SB-T2 resume 两遍模拟成本] resumeTimedBattle 先跑基线采 checkpoint 再续跑 ≈1.x 场模拟；当前 5v5/90s（≤5000 事件）无感，未来扩规模可把 checkpoint 并入首次 simulate 缓存（backlog，非本轮阻断）。
- [UI 选目标仅单体敌方] 与 engine canOverrideTarget 同口径（有意）；未来加「单体己方增益选目标」须两处同改 SINGLE_ENEMY_SELECTORS + UI 亮起（防 P1-4）。

## 8. S14-B 收尾结论
SB-T1..SB-T5 五任务全部真实现且与实现一致，5 条验收命令实测全绿，engine 纯净、零存档、未破坏 S14-A 已成 6 项。**S14-B 整体 COMPLETE。**
