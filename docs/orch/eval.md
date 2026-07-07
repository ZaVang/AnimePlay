# QA Evaluator 报告 — S16 第 5 轮（收官：打磨 + 晒图 + 收尾）+ Sprint 整体收官验收

> 独立验证：亲自重跑 5 条验收命令 + 亲自审 diff + Sprint 整体收官核对，不改源码、不信自报。
> 复验时间：2026-07-07。本轮任务 = S16-T12（庆祝分级 High-Five/Crowning，命门）+ S16-T13（家园晒图基地身份卡，命门）+ S16-T14（Sprint 收官核对）+ S16-T15（收尾清 dead computed + 可选微打磨）。
> **决策：COMPLETE。** 5 命令全绿；S16-T1..T15 全 `[x]` 与实现一致；S14/S15 + 1-4 轮机制无回归；SAVE_VERSION=20 全程零升档。

## 1. Checkbox 核对（SPRINT.md 全 Sprint）

`grep "\[ \].*S16-T" docs/plans/SPRINT.md` → **零命中（exit 1）**。S16-T1..T15 全部 `[x]`：

| 任务 | 勾选 | 实现核实 | 结论 |
|---|---|---|---|
| S16-T1..T11（1-4 轮） | 全 `[x]` | 前轮已复验，本轮抓回归全在（见 §5） | 一致 |
| S16-T12 庆祝分级 High-Five/Crowning（P0 命门） | `[x]` | `milestoneCelebrationTier` 纯函数 + `.crown-pop`/`.crown-card` 隆重弹层 + `is-finale` 分支；低档保持 `bondFloat` 轻飘字 | 一致 |
| S16-T13 家园晒图基地身份卡（P0 命门） | `[x]` | `buildHomesteadSnapshot.ts` 纯函数 + `HomesteadShareCard.vue` Canvas 手绘 + `📤 晒基地`入口 | 一致 |
| S16-T14 Sprint 收官核对（P0） | `[x]` | 本报告即独立复核（§1/§5/§6） | 一致 |
| S16-T15 收尾清 dead computed + 可选微打磨 | `[x]` | 删 2 个 top-level dead computed + 收取到手飘字（可选，已做 1） | 一致 |

注：`docs/SPRINT.md`（非 `docs/plans/SPRINT.md`）里的 `[ ]` 是 S11/S12 路线图残留，非 S16 项，未误判。

## 2. 验收命令重跑（Evaluator 亲跑，cwd 见各条）

```
# 1. cd frontend-vue && npm run type-check        → EXIT 0，无输出（vue-tsc --build，0 错误）
# 2. cd frontend-vue && npm run test（连跑 3 次）
   run 1: Test Files 73 passed (73) | Tests 1009 passed (1009)  Duration 24.04s
   run 2: Test Files 73 passed (73) | Tests 1009 passed (1009)  Duration 11.40s
   run 3: Test Files 73 passed (73) | Tests 1009 passed (1009)  Duration  5.63s
   （三次稳定全绿，1009 与自报一致；基线 991 → 1009）
# 3. cd frontend-vue && npm run build             → ✓ built in 5.62s（含 shareImage-*.js chunk = IO 复用，未造第二套）
# 4. .venv/Scripts/python.exe backend/test_security.py → RESULT: PASS — all security checks passed（EXIT 0，全 PASS）
# 5. grep -rn "debug=True" backend/server.py api/index.py → 零命中（GREP_EXIT=1）
```

**5 命令全绿。**

## 3. 本轮命门审查（亲自审 diff）

- **晒图零 cross-origin taint**：`grep html2canvas src/` 唯一命中是 `shareImage.ts:6` 注释「不引 html2canvas」，无 import。`HomesteadShareCard.vue` 的 `drawImage` 仅出现在注释/标签（:5/:120「绝不 drawImage」），IO 走复用的 `canvasToPngBlob`/`shareOrDownloadImage`；角色脸用「名字首字 + 圆块」`ctx.arc`+`fillText` 自绘。零 taint 出图路径成立。✅
- **晒图聚合是纯函数 + 有测试**：`buildHomesteadSnapshot.ts` 零 Vue/Pinia/DOM（仅 `type` import），`safeCount`/`cleanNames` 兜底 NaN/负数/undefined/空串，正着念模型无缺口字段，`isEmpty` 空态优雅。`buildHomesteadSnapshot.test.ts` **13 条**特征测试（满配/0 入住/0 收藏/空基地 + 正着念 + 去重 + 裁上限 + 脏输入兜底 + 分母兜底防「陈列 8/7」）。✅
- **庆祝分级可见 + 判据抽纯函数锁死**：`milestoneCelebrationTier(id)` 白名单 bond_4/5/6=crowning、bond_6=finale、未知回落 highfive；`nurture.test.ts` 5 组断言锁死（低档→highfive / 高档→crowning / bond_6→finale / 未知→highfive）。低档保持 `bondFloat` 轻飘字、高档才升 Crowning 弹层，肉眼可辨。✅
- **名字≠行为（零发奖）**：`onClaimBondMilestone` 唯一发放调用是 pre-existing `userStore.claimBondMilestone`（有 return 守卫），tier 分支只写 `bondFloat`/`crownCelebration` 纯视觉 ref，无新 `spend/earn/claim`。`HomesteadShareCard.vue` 6 个 store 全 import 只读，无 `.claim/.earn/.spend/dailyBond/.place/.buy` 调用。收取到手飘字 `collectFloat` 只可视化 `runSettle` 已发放的 `y.knowledge`，不二次发奖。✅
- **dead computed 安全删**：top-level `const effectText` / `const comfortBonusText` 已删（grep exit 1）；`residentRows` 内部字段 `effectText: formatHomeEffect(effect)`（:400）**保留**，模板 `row.effectText`（:940）真实数据源未断。入住名单效果显示无回归。✅
- **零升档**：`schema.ts:57 SAVE_VERSION=20`；`git diff HEAD -- infra/persistence/{schema,migrations}.ts stores/persistence.ts` **全空**。sprint 唯一 v21 bump 五轮全程未消耗，留 backlog。✅
- **不污染 computeIdleYield**：`git diff homestead.ts` 无 `computeIdleYield` 改动行（exit 1），diff 是 1-4 轮家具/展示字段且明注「不进 sumFurnitureComfort/canonicalizeFurnitureIds」。三处预览 computed 仍单 seam 同喂。✅
- **setTimeout 登记清除**：`bondFloat`/`crownCelebration`/`collectFloat` 全走 `scheduleDialogueClear`→`dialogueTimers`，`onUnmounted` 清除；Crowning 加 `crownToken` 自增守卫防旧定时器误关后领弹层。动效纯 CSS `@keyframes`，`usePlazaWalk` rAF 未动。✅
- **颜色令牌零违规**：Crowning 弹层/晒图入口走 `rgb(var(--c-accent/--c-highlight/--c-ink))`；`:class="`is-${tier}`"` 是状态修饰类（值域固定）非动态拼色类。`HomesteadShareCard.vue` 无 `text-white`/反斜杠透明度（grep exit 1）。Canvas 内绘制色用字面色值属合规例外。✅

## 4. bonds engine 纯度（跨轮回归）

`bonds.ts` 新增 `computeBondPairs`（纯函数，第 2 轮偶遇配对）+ `BondPair` interface；`git diff bonds.ts` 无 Vue/Pinia/DOM/Math.random 注入（exit 1），engine 纯净守住。

## 5. Sprint 整体收官验收（S14/S15 + 1-4 轮机制无回归）

- **测试全绿即基线守住**：73 文件 1009 测试连跑 3 次稳定全绿，覆盖 computeIdleYield 单 seam / facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap / 家具 v20 y-sort / 羁绊 bondHits 同源 / pity v20 / 墙钟回拨钳位。
- **1-4 轮机制在**：好感里程碑显形+领取（T1）、tap 互动+每日封顶（T2）、台词库（T3）、同作品偶遇（T4/T5）、入住关系预告（T6）、家具进场景（T7）、陈列计数（T8）、收藏橱窗（T9）、今日特殊角色（T10）、季节浮层（T11）—— diff 与新文件（`usePlazaWalk.ts`/`homesteadDialogues.ts`/`homesteadDaily.ts`）全在。
- **零升档全程**：SAVE_VERSION=20 五轮未升，存档三件套 diff 全空。

## 6. 自报 vs 实际

| 项 | 自报（gen_status） | 实际复验 | 一致 |
|---|---|---|---|
| type-check | 0 错 | EXIT 0 | ✅ |
| test（连跑 3 次） | 1009 稳定 | 1009 × 3 稳定 | ✅ |
| build | ✓ 8.78s | ✓ 5.62s（时间机器差异，均成功） | ✅ |
| backend security | PASS EXIT 0 | PASS EXIT 0 | ✅ |
| debug grep | 零命中 | 零命中 | ✅ |
| SAVE_VERSION | 20 零升档 | 20，三件套 diff 全空 | ✅ |
| 晒图纯函数测试数 | 「20 条」 | 实际 13 条 `it()` | ⚠️ 数字偏差（gen_status 自报 20，实测 13）；不影响验收，覆盖满配/0 入住/0 收藏/空态/正着念/去重/裁上限/脏输入全在，命门达成 |

唯一偏差：gen_status 自报晒图特征测试「20 条」，实测 `buildHomesteadSnapshot.test.ts` 为 13 条 `it()`。属自报计数不准（可能把 `milestoneCelebrationTier` 5 组 + 其它并入口算），**非缺陷**——测试全绿、覆盖全，命门（满配/空态/正着念）均锁死。

## 7. 决策

**COMPLETE。** S16 5 轮弧线收官闭环：
- 5 条验收命令全绿（type-check 0 / test 连跑 3 次稳定 1009 / build 成功 / 后端安全 EXIT 0 全 PASS / debug 零命中）。
- 全 Sprint S16-T1..T15 全 `[x]` 且与实现一致（`grep "\[ \].*S16-T"` 零命中）。
- 本轮命门全过：晒图纯 Canvas 无远程 taint（无 html2canvas、聚合纯函数有测试）、庆祝分级肉眼可辨、dead computed 安全删、零升档（SAVE_VERSION=20、存档三件套 diff 空）、不污染 computeIdleYield、名字≠行为、setTimeout 登记清除、颜色令牌零违规。
- S14/S15 + 1-4 轮机制无回归（测试基线守住 + diff 审阅）、SAVE_VERSION=20 全程零升档、sprint 唯一 v21 bump 五轮全程未消耗（刻意的健康纪律，留 backlog）。
