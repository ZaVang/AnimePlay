# Eval — S14-C 第 3/3 轮（最终轮，product-loop --tier1 on --mode all）

> 指派切片 = **SC-T3 + SC-T4 + SC-T6**。tier1 on → 决策仅信息性（引擎跑满 3 轮）；但仍须核对合同全 `[x]` 且真实现。

## Checkbox 状态（SPRINT.md）
- 主清单 SC-T1..SC-T6 全 `[x]`；第 3 轮追加子项 SC-T3/T4/T6 均 `[x]`。
- 本轮三项经代码抽查确认**真落地**（非空跑）。S14-C 六任务齐备。

## 验收命令重跑实际输出（Evaluator 亲自复跑）
1. `npm run type-check` → **PASS**（vue-tsc --build，0 错误，无输出）。
2. `npm run test` → **PASS**：`Test Files 60 passed (60) / Tests 714 passed (714)`（与自报一致）。
3. `npm run build` → **PASS**：`✓ built in 8.36s`。
4. `.venv/Scripts/python.exe backend/test_security.py` → **PASS**：`RESULT: PASS — all security checks passed`，`EXIT=0`（全断言 PASS）。
5. `grep debug=True backend/server.py api/index.py` → **零命中**（两文件均 No matches）。
- 附：`SAVE_VERSION=16`（schema.ts:40 确认，本 sprint 唯一 bump，v15→v16）。
- 附：engine 纯净 grep（`Math.random|@/stores|from 'pinia'`）→ 仅注释/README/rng.ts 注入点命中，**零新增违规**。

## 自报 vs 实际对比
- 完全一致：type-check/test(714)/build/security(EXIT=0)/debug 零命中；SAVE_VERSION=16。
- 自报的三处战力同源、collection 扣卡、迁移三改、UI 均经抽查证实无夸大。

## pitfalls 合规
- engine 纯净：✅（突破/好感 engine 纯函数无 RNG、无 config import，pct 由调用方注入）。
- 存档三处同改 + 往返测试：✅ schema(SAVE_VERSION=16) + migrations(白名单显式加 breakthrough/lastBondInteractionDate，**非 spread**，clamp+类型守卫) + 装配器义务落在 persistence.test.ts 往返断言。migrations.test.ts 有 `not.toHaveProperty` 旧字段家族守卫（防 spread 回潮）。
- 一次 sprint 只升一次：✅ SC-T3/T4 共用 v16，未升 17。
- 禁动态色类/text-white 压浅底：NurtureView/hub 突破 UI 走语义令牌（text-warning/bg-accent/15 等），未见违规。
- 未破坏 S14-A/B 11 项 + C1 养成两轴：突破/好感永久加成折进既有 statPoints 走 generateBattleStats 纯加法，不动 MAX_CHARACTER_LEVEL/addCharacterExp 钳制点。

## 真实性抽查结论
- **SC-T3（星级/突破 v16）真实现**：engine `breakthroughCost`(阶梯 star+1，满星 Infinity)/`breakthroughStatBonus`(base×star×4%，5★=+20%≤25%)/`canBreakthrough`/`resolveNurturedStatPoints` 纯函数齐备；collection `consumeCharacterCards` 保留本体 1 张(spare=count-1)、无 KP 副作用、禁直改 Map；store `breakthroughCharacter` 判上限/卡量→扣卡→breakthrough++。存档 v16 三改 + 全套测试（migrations 缺省/往返/脏档 clamp/not.toHaveProperty + persistence 往返）。战力 **3 处同源**（HomesteadHubView memberPower、SquadBattleView buildCharacterStats 玩家侧、NurtureView finalStats）经**单一 helper `resolveMemberBattleStats`** 收口，敌方侧仍 EMPTY_STAT_BONUS 不注入。UI 突破入口+进度+cost+满星置灰齐备。
- **SC-T4（好感等级化，共用 v16）真实现**：BOND_MILESTONES 每档 statBonusPct，累计 0.02×3+0.03×3=**+15% ≤ 突破 20%**（守 C1）；`bondPermanentBonusPct` 从已领里程碑集**纯派生**（不新增字段），经同一 helper 注入同 3 处战力 seam；`dailyBondInteraction` 跨天读 `lastBondInteractionDate` vs `todayKey()` 正确重置（测试锁）；`bondOverflowExchange` 仅过 bond_6/4000 后整份兑 KP、余数保留、走 profile.earn。UI 每日互动/溢出兑换/里程碑 % 齐备。
- **SC-T6（NurtureView 拆无壳，纯 UI）真实现**：NurtureView 去 min-h-screen/页级 h1/独立未登录空态（仅留紧凑无角色兜底）；hub characters 面板**单一标题（角色面板）+ 单一空态**（登录/无角色由 hub 壳统一 gate）内嵌无壳 NurtureView；SC-T3/T4 UI 随壳平移进无壳组件。`/nurture`、`/squad-battle` 重定向 router 原样保留（→ ?tab=characters / ?tab=explore）。
- 前轮切片 SC-T1（resolveRole/EXPLICIT_ARCHETYPE）/SC-T5（thresholds.ts assessSquadReadiness 用于两视图）仍在位，S14-C 六任务完整。

## 失败原因
无。

## 新坑待追加
- [战力单一口径] 突破/好感永久加成折成 statPoints 增量走既有 `generateBattleStats`（不加第 4 参），SC-T5 门槛口径自动含突破收益、SC-T4 顺同一函数——避免口径碎裂。全站玩家侧 generateBattleStats 应统一改调 `resolveMemberBattleStats`（utils/battleStats.ts），敌方侧仍直调。
- [SC-T6 拆壳连带死代码] hub 拆壳须连带删原 summary 镜像 computed + 清死 import（tsconfig 无 noUnusedLocals，type-check 不报）。已连根删。

## 决策
**COMPLETE**（tier1 on 已跑满 3 轮；本最终轮指派 SC-T3+SC-T4+SC-T6 三项均真实现，S14-C SC-T1..T6 全 `[x]` 且与实现一致，5 条验收命令亲自复跑全绿）。
