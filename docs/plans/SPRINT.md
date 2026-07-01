# AnimePlay — SPRINT 合同（S14-B：战斗手感与深度）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-B 全部任务（SB-T1..SB-T5）**。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S14-B，**绝不表示可以跳过本轮被指派的 SB-T 任务**（S14-A 曾因把指派任务误判为「新范围」而空跑一轮，本轮严禁重演）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14-B、`docs/orch/homestead-hub-audit-report.md`（P#-# 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 战斗 = 家园 hub 的 battle 面板：`frontend-vue/src/views/SquadBattleView.vue` 消费纯引擎 `frontend-vue/src/engine/squad/timedBattle.ts`（时间轴半自动 5v5）+ `formulas.ts`/`effects.ts`/`targeting.ts`；UI 组件在 `frontend-vue/src/components/battle/squad/*`。
- 本 Sprint = **S14-B 战斗手感与深度**：把「能打但无操作、无策略、判负粗暴」的小队战补成有倒计时/合理裁决、暴击活着、站位有意义、团队增益有协同、手动大招是真杠杆的战斗。

## 战斗现状根因（S14-B 逐个拆解）
1. 暴击死系统：`formulas.ts` critRate 默认 0，全场唯一暴击源是 striker passive 10%，canCrit/critDamage 大量死代码。
2. 站位是装饰：position 仅用于 `targeting.ts` front/backEnemy 排序，`formulas.ts`/`effects.ts` 不读 position——前中后排怎么排都不影响结果。
3. buff 无协同：`effects.ts` maxRuntimeStatusValue 同 kind 取 Math.max，双辅助价值被压平。
4. 判负粗暴：`timedBattle.ts` 90s 超时一刀切判负、无倒计时，磨血占优也被判输。
5. 手动大招无杠杆：autoUltimates 默认 true、手动开大整场 `regenerateBattleSimulation` 重算致回放跳变、目标写死。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/IO/`Math.random`；暴击/裁决/站位/叠加逻辑全进 `engine/squad` 纯层，随机走注入 RNG `rng.chance` 等）/ 依赖只向下 / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改战斗规则前先看对应 `*.test.ts`（S1 起特征测试是护栏）。**别破坏 S14-A 已成的 6 项**（编队编辑 / towerFloorEnemySeed 预览同源 / 确定加点 / 10 招牌 UR 差异化覆盖 / 扫荡日循环+存档 v15 / Plan A 三 tab 消冗余）。**本 Sprint 预期不改存档**（纯战斗规则/UI；若确需改存档才 schema+migrations+装配器三处同改+往返测试）。

## 任务清单（S14-B = SB-T1..SB-T5）

- [x] **SB-T1｜90s 超时改按剩余 HP% 判胜 + 倒计时 UI（P2-4）**
  - 目标：`timedBattle.ts` 超时不再一刀切判负；改按双方剩余 HP 总量%（或存活数+HP%）裁决胜负，平局定义明确。`SquadBattlefield.vue`（或战场 UI）加醒目倒计时/进度条。
  - 验收：engine 特征测试覆盖「超时按 HP% 判胜/判负/平局」三态；UI 有倒计时；type-check/test/build 通过。
- [x] **SB-T2｜手动大招能选目标 + 平滑推进（P2-5）**
  - 目标：手动开大不再整场重算致回放跳变（改为从当前时刻平滑继续/增量推进，或等价的无跳变体验）；手动大招可由玩家选目标（至少对单体目标类大招）。默认自动大招策略由 Planner 定（可默认关或首战引导）。engine 纯净、RNG 注入不破确定性。
  - 验收：手动开大后战斗演出不发生「回放跳变/时间倒流」；单体大招可选目标并命中所选；相关 engine/UI 测试；type-check/test/build 通过。
- [x] **SB-T3｜让暴击系统活起来（P2-2 / P2-6）**
  - 目标：给全体一个基础 critRate（如 0.05，数值 Planner/Generator 定），并让至少一条既有成长/增益轴（养成 / 装备 modifier / buff）能加暴击，使 canCrit/critDamage 不再是死代码；或若判定不值得则彻底删除 crit 字段（择一，别留半死系统）。保持 rng 注入可复现。
  - 验收：暴击真实发生且可被加成影响（特征测试断言 critRate>0 时产出 critical event、加成生效）；type-check/test/build 通过。
- [x] **SB-T4｜前中后排真实机制或去掉视觉（P2-1）**
  - 目标：给 position 真实战斗意义（如后排受近战/单体伤害减免、AOE 对后排衰减、前排默认承受仇恨其一即可，Planner 定最小可用机制），全部进 `engine/squad` 纯层且有测试；若判定不做，则移除前中后排的视觉承诺以免误导（择一，别让 UI 承诺机制而代码不实现）。
  - 验收：position 影响战斗结果（特征测试断言不同站位伤害/被选中差异）或视觉承诺已移除；type-check/test/build 通过。
- [x] **SB-T5｜同类可叠加 buff 改按来源累加设上限（P2-3）**
  - 目标：`effects.ts` 可叠加类状态（atkUp/defUp/spUp/haste/critRateUp/atkDown/defDown 等）从 Math.max 改为按来源累加并设合理上限；控制类（stun/silence/taunt）保持不叠加（仍取最长/不累加）。双辅助不再被压平。
  - 验收：engine 特征测试断言「同 kind 多来源累加至上限、控制类不叠加」；不破坏现有 effects 测试；type-check/test/build 通过。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **SB-T3 + SB-T5**（纯 engine formulas/effects，内聚、低 UI 风险、易测）。
> - 第 2 轮 = **SB-T1 + SB-T4**（engine 裁决/站位 + 少量战场 UI）。
> - 第 3 轮 = **SB-T2**（手动大招选目标+平滑推进，最复杂）+ 收尾（确保 SB-T1..T5 全 `[x]`、无回归）。
> 每轮务必保持验收命令全绿、每子项独立可合并。SB-T2 若「平滑增量推进」受现有「一次性预演算+回放」架构限制过大，Planner 可收窄为「无跳变体验 + 选目标」的最小可用形态并在计划中说明，但**不得整项跳过**。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 squad 战斗特征测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-B 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SB-T* 任务全部 `[x]` 并与实现一致。**S14-B 整体完成** = SB-T1..SB-T5 全 `[x]`。

---

## 第 1 轮追加任务（product-loop --tier1 on --mode all，本轮指派 = SB-T3 + SB-T5）

> 本轮承诺落地 **SB-T3（暴击活起来）+ SB-T5（buff 累加设上限）**，两者皆纯 engine（`formulas.ts`/`effects.ts`），内聚、低 UI 风险、易测，且天然协同（见拍板 3）。主清单 SB-T3/SB-T5 条目为准，此处追加的是本轮承诺 + 采纳的 refine 子项 + 关键设计决策拍板。**这两项必须真实现落地，严禁只做回归确认（S14-A SA-T6 教训）。**

### 关键设计决策拍板（写进验收）

- **拍板 1（SB-T3 基础 critRate 注入位置）**：**不改** `DEFAULT_BATTLE_MODIFIERS.critRate`（保持 0 = 引擎纯净默认，守住 `formulas.test.ts` 的 `DEFAULT_CRIT_RATE` 断言与 `timedBattle.test.ts` 的「default 0」断言，避免污染引擎默认语义）。基础暴击是「squad 战斗规则」而非「引擎默认」——落在 squad 运行时单位构造处，作为新常量注入每个运行时单位的 base critRate，使纯引擎战 / 塔战 / 测试三条消费端统一拿到基础暴击（不走 View 注入，View 只服务塔战、纯引擎战拿不到）。
- **拍板 2（SB-T3 基础 critRate 取值）**：基础 critRate = **0.05**（全体普攻/技能默认可暴）；critDamage 沿用现有 1.5 不动。取值放 engine 常量（engine 不 import config）。
- **拍板 3（SB-T3 加成来源 = 复用既有 critRateUp 轴，不删字段、不扩装备）**：canCrit/critDamage/isCritical 经核实**全是活代码且已被消费**（`calculateTimedDamage` → `dealDamage` 写 isCritical 事件 → UI 渲染），根问题是「无非零 base critRate 来源」这一根线断开——**按「接一根线」处理，不删 crit 字段**。加成轴复用已存在的 `critRateUp` 状态通路（`getEffectiveModifiers` 已把 critRateUp 叠加到 base critRate）；SB-T5 落地后多条 critRateUp 按来源累加 → 直接兑现合同「让至少一条既有增益轴能加暴击」。**本轮不扩 EquipmentDef 加暴击（属 P2-15 分歧项，超本轮范围，标 backlog）。**
- **拍板 4（SB-T5 可叠加 vs 不可叠加名单）**：**可叠加（按来源累加 + 上限 clamp）** = `atkUp / defUp / spUp / haste / critRateUp / atkDown / defDown / slow / spDown`（数值型增益/减益，对称处理）。**不可叠加（保持现状）** = 控制类 `stun / silence / taunt`（走布尔存在性判定，不经数值聚合，本轮不碰）；`shield / dot / hot` 保持逐条独立结算（多来源各自生效，绝不塞进 sum-clamp）。
- **拍板 5（SB-T5 上限哲学）**：每 kind 一张 engine 常量上限表，上限值 **≥ 现有单条最大 buff 幅度的 ~1.3–1.5 倍**，让「双辅助累加」有正收益空间又不失控、且不让现有单条招牌 buff 就触顶。建议档位：`atkUp/defUp/spUp ≤ 0.6`、`haste ≤ 0.5`、`critRateUp ≤ 0.5`，debuff 侧对称。Generator 落地前须核对 `data/squadSkillKits.ts` 各 kind 现有 amount 分布定标（现有单条最大 atkUp 0.45、critRateUp 0.25）。`formulas.ts` 对 critRate 已有 `clamp(0,1)` 二次兜底。
- **拍板 6（SB-T5 两套聚合函数一致改）**：`maxRuntimeStatusValue`（旧 RuntimeStatus 数组 API，特征测试消费）与 `maxStatusAmount`（实战主路径）**两处都改且语义一致**，抽共享纯 helper 供两处调用，避免「测试口径与实战口径打架」。**不动 `applyBattleStatus` 的 id 去重逻辑**（`id=kind:sourceId:targetId` 正是「按来源」的载体：同来源覆盖、不同来源并存）。

### 本轮追加清单

- [x] **本轮-1｜SB-T3 落地：全体基础暴击 0.05 + 复用 critRateUp 加成轴（拍板 1/2/3）**
  - 目标：squad 运行时单位在构造时获得基础 critRate=0.05；不改 `DEFAULT_BATTLE_MODIFIERS`；不删 crit 字段；不扩装备。critRateUp 通路（已存在）叠加到 base，SB-T5 落地后多来源 critRateUp 累加提升暴击率。
  - 验收：新增特征测试断言「base critRate=0.05 时按注入 RNG 序列确定性产出 critical event」+「叠加 critRateUp buff 后暴击率提升（可暴分支被触发）」；**不破坏** `formulas.test.ts` 的 `DEFAULT_CRIT_RATE`/default-0 断言与 `timedBattle.test.ts` crit 断言；type-check/test/build 通过。

- [x] **本轮-2｜SB-T5 落地：可叠加类 buff 改按来源累加设上限，控制类保持不叠加（拍板 4/5/6）**
  - 目标：`maxRuntimeStatusValue` 与 `maxStatusAmount` 两处从 `Math.max` 改为「按来源求和 + 每 kind 上限 clamp」（抽共享 helper）；可叠加名单见拍板 4；上限表见拍板 5；控制类 / shield / dot / hot 不进累加；不动 `applyBattleStatus` 去重。
  - 验收：新增特征测试断言「同 kind 多来源累加至上限」（≥3 条同 kind 求和触顶）+「控制类多条仍不叠加（存在性/最长）」+「dot/hot 多来源各自独立结算」；**不破坏** `effects.test.ts`（单条 atkUp 0.5 仍得 atk 150 等）与 `timedBattle.test.ts`（单条各 buff 值不变）现有断言；type-check/test/build 通过。

- [x] **本轮-3｜SB-T3 与 SB-T5 协同回归**
  - 目标：确认「base critRate + 多来源 critRateUp 累加」构成一条完整暴击成长轴（同一测试文件覆盖两端）；确认本轮零存档触点、engine 保持纯净（无 Vue/Pinia/DOM/`Math.random`，随机走注入 RNG）。
  - 验收：全部验收命令（下方 5 条）实测绿；未破坏 S14-A 已成 6 项。

---

## 第 2 轮追加任务（product-loop --tier1 on --mode all，本轮指派 = SB-T1 + SB-T4）

> 本轮承诺落地 **SB-T1（90s 超时改按 HP% 判胜 + 倒计时 UI）+ SB-T4（前中后排真实机制）**：SB-T1 = engine 裁决改写 + 少量战场 UI；SB-T4 = 纯 engine 伤害层站位机制。两者互不耦合、可并行、可各自独立合并。主清单 SB-T1/SB-T4 条目为准，此处追加的是本轮承诺 + 采纳的 refine 子项 + 关键设计决策拍板。**这两项必须真实现落地，严禁只做回归确认（S14-A SA-T6 教训，pitfalls L84）。SB-T4 明确选「做机制」而非「删视觉」。**

### 关键设计决策拍板（写进验收）

- **拍板 1（SB-T1 平局定义）**：平局 = 超时刻双方存活方剩余 HP% 相等（差 < ε）。判胜口径 = **先比存活单位数，存活数相等再比剩余 HP 总量比（Σ currentHp / Σ maxHp）**——避免「4 个残血 vs 1 个满血」被纯 HP% 误判。存活数与 HP% 都相等 = 真平局。
- **拍板 2（SB-T1 winner/reason 类型抉择——不扩 winner，只扩 reason，避开三处波及）**：**不给 `TimedBattleWinner` 加 `'draw'`**（会波及 types + `SquadBattleView.vue:501` 二分映射 + `rewards.ts` + 多测试断言，scout 坑 C-1）。改法：超时 HP% 占优 → `winner='player'`、判负 → `winner='enemy'`（直接复用现有胜负映射与发奖分支）；**真平局 → 保持 `winner='timeout'`**（走现有 timeout→defeat 映射与 rewards 全 0，语义等同「未推进」，产品可接受平局不发奖）。用 **`BattleEndReason` 扩值**区分三态（如 `timeoutWin`/`timeoutLoss`/`timeoutDraw`，具体值名 Generator 定），供 UI/日志/测试判读，不改 winner 类型。
- **拍板 3（SB-T1 超时占优即发奖 = 产品期望）**：超时按 HP% 占优改判 `winner='player'` 后自动走 `rewards.ts` progressed 发奖分支 + View `settleTowerBattle` 的 `completeFloor` 推进——正是「磨血占优不再判输」的产品目标，不额外加闸。Generator 须确认此推进链路符合预期（胜即推进）。
- **拍板 4（SB-T1 倒计时 UI 数据源——engine 单一真相，禁 UI 硬编码 90000）**：`DEFAULT_MAX_TIME_MS` 从 engine 导出（经 `engine/index.ts` re-export），View import 后同时传给 `SquadBattlefield` 的倒计时 prop **和** `regenerateBattleSimulation` 的 maxTimeMs，保持 UI 显示时限与实战裁决时限同源。倒计时 UI = 剩余秒（max−elapsed）+ 进度条，复用现有 UnitBar 语义令牌条形范式（`bg-accent/bg-highlight`），不新建裸 setTimeout（复用 View 已有 `schedule()`/`clearBattleTimers()`）。
- **拍板 5（SB-T4 最小可用站位机制 = 后排受单体伤害减免，front 系数=1）**：position 真实机制取 scout 推荐候选 1——**后排/中排承受「单体」伤害时按站位减伤**（建议 back ×0.85 / middle ×0.95 / **front ×1.0**），接入点在 `effects.ts` damage 分支读 `target.position`。**front 系数必须=1**（现有测试单位默认 position:'front'，front 无减伤则既有伤害断言天然不变，scout 坑 C-6）。数值放 engine 常量表（如 `POSITION_DAMAGE_TAKEN`），engine 不 import config。AOE 是否同样衰减由 Generator 定粒度（拍板 6）。
- **拍板 6（SB-T4 单体 vs AOE 粒度）**：本轮最小可用形态 = **只对单体伤害施站位减伤**（体现「后排站桩安全、前排顶伤」的编队博弈）；AOE（群体 selector `allEnemies`/`allAllies`）**不施站位减伤**（后排躲不过 AOE，符合站位取舍直觉，也避免 AOE 全体缩水冲淡机制感）。判单体/AOE 复用 `executeEffect` 已解析的 `effect.target ?? skill.target` 表达式（scout 坑 C-3），别重复解析出分歧。若 Generator 判定「全部伤害都减伤」更易测且平衡可接受，可收窄为该形态并在实现说明——但必须保 front=1、必须有测试断言不同站位伤害差。
- **拍板 7（SB-T4 数值温和，不颠覆现有平衡）**：减伤系数取温和档（back ×0.85 / middle ×0.95），避免颠覆现有塔敌/我方 base atk ~50-300 量级平衡。数值放 engine 常量、Generator 可微调，但须保「后排明显比前排耐打、又不至于让前排无人愿站」的正收益空间。

### 本轮追加清单

- [x] **本轮-4｜SB-T1 落地：超时改按存活数+HP% 三态裁决 + 倒计时 UI（拍板 1/2/3/4）**
  - 目标：`timedBattle.ts battleEnd` 的超时/事件上限分支不再一刀切 `winner='timeout'`；改按「存活数优先、HP% 打破平手」裁决 → 占优判 `winner='player'`、劣势判 `winner='enemy'`、真平局保留 `winner='timeout'`，三态经扩展的 `BattleEndReason` 区分（不扩 winner 类型）。`SquadBattlefield.vue` 加醒目倒计时（剩余秒）+ 进度条，时限值经 engine 导出的 `DEFAULT_MAX_TIME_MS` 传入（禁硬编码）。KO 分支不动。
  - 验收：新增/更新 engine 特征测试覆盖「超时按 HP% 判胜（winner=player 走发奖）/判负（winner=enemy）/真平局（winner=timeout，elapsedMs=90000）」三态；**同步更新** `timedBattle.test.ts:401-413`「双方满血僵持」断言为平局态（不再期望旧一刀切 timeout→defeat 语义）；**不破坏** KO 双亡分支（:377-399）、default-crit-0（:63-81）、rewards timeout 全 0（:416-441，平局仍走 timeout 值）等既有断言；UI 有倒计时且时限与 engine 同源；type-check/test/build 通过。

- [x] **本轮-5｜SB-T4 落地：后排/中排单体伤害减免，前排系数=1（拍板 5/6/7）**
  - 目标：给 position 真实战斗机制——在 `effects.ts` damage 分支按 `target.position` 对**单体伤害**施减伤系数（back ×0.85 / middle ×0.95 / front ×1.0），engine 常量表承载、engine 不 import config；AOE 不施减伤（拍板 6）；不碰 `targeting.ts`（避开其护栏）、不改 `formulas.ts calculateTimedDamage` 签名（在 effects 层乘系数）。选「做机制」而非「删视觉」。
  - 验收：新增 engine 特征测试断言「同攻击对 back/middle 目标伤害 < 对 front 目标（front 系数=1）」+「AOE 对不同站位不因站位衰减」（若采纳拍板 6 的 AOE 不减伤）；测试须显式造 middle/back 单位对比，**不改** `timedBattle.test.ts` 的 `unit()` helper 默认 `position:'front'`（scout 坑 C-6）；**不破坏** 既有单体伤害/能量/击败数断言（front 系数=1 天然守住）、`targeting.test.ts` 全 3 条、SB-T3/T5 断言；type-check/test/build 通过。

- [x] **本轮-6｜SB-T1 与 SB-T4 集成回归**
  - 目标：确认 SB-T1 裁决改写与 SB-T4 站位机制互不干扰（两者在不同接入点：battleEnd 裁决 vs effects damage 分支）；确认本轮零存档触点、engine 纯净（无 Vue/Pinia/DOM/`Math.random`）；`DEFAULT_MAX_TIME_MS` 导出未破坏 engine 依赖方向；倒计时 UI 复用登记式计时器无泄漏。
  - 验收：下方 5 条验收命令实测绿；未破坏 S14-A 已成 6 项与第 1 轮 SB-T3/T5。

---

## 第 3 轮追加任务（product-loop --tier1 on --mode all，本轮指派 = SB-T2，收尾轮）

> 本轮承诺落地 **SB-T2（手动大招选目标 + 平滑推进，P2-5）**——S14-B 最后一块、也是最难一块。主清单 SB-T2 条目为准，此处追加的是本轮承诺 + 采纳的 refine 子项 + 关键设计决策拍板。**这项必须真实现落地，严禁只做回归确认（S14-A SA-T6 教训，pitfalls L84）。收窄可以，整项跳过不可以。** 收尾轮同时确认 SB-T1..SB-T5 全 `[x]` 且与实现一致、无回归。
>
> **本轮最关键的一条设计结论（三份报告共识 + research Phase1-A4 深挖）**：现状「手动开大 → 从 t=0 整场重算 → cursor 对齐」之所以「碰巧不跳」，唯一前提是「插入 order 后过去那段 RNG 消费次数/消费点完全不变」。**这个前提在『选目标』落地后必然破**（选不同目标 → 不同暴击/击杀/能量连锁 → RNG 序列在插入点后错位，甚至 tick 边界前移污染过去时间戳）。因此本轮若只加 targetId 不改重算模型，等于把「碰巧不跳」升级成「一定会跳」的半死系统。**「选目标」与「无跳变」不是两个可分别妥协的目标，而是同一个干净机制（冻结已呈现前缀 + 只重算当前时刻之后）的两个自然结果——必须同轮一起做对。**

### 关键设计决策拍板（写进验收）

- **拍板 1（SB-T2 平滑推进的最小可用形态 = 方案 A「冻结已呈现前缀 + 从当前时刻分叉重算」的精神，取最小实现）**：无跳变的充要条件 = **已呈现（已回放到 `elapsedMs`）的事件前缀一字不改，重算只影响 `elapsedMs` 之后**。据此收窄为「**前缀冻结**」形态：手动开大后，玩家已看过的 HP/能量/站位状态**绝不回退、不重播、不时间倒流**；新命令只改写「当前时刻之后」的演出。**明确不做**方案 C（逐帧 `step(dtMs)` 去预演算，与现有事件流特征测试范式冲突，backlog R7）。**红线：绝不采纳方案 B 那种「整场重算 + 只截后缀」的伪平滑**——research Phase1-A4 已证它在选目标后退化为跳变，是「碰巧不跳→一定跳」的半死系统。若因工期只能做过渡形态，必须在实现说明/注释明写「前缀如何保证冻结、后缀错位为何不回溯污染前缀」，**严禁让 UI/文案暗示『完全平滑』而代码做不到**（描述≠行为红线，CLAUDE.md 明令根除）。
- **拍板 2（SB-T2 前缀冻结的 RNG 卫生 = 把「seed 头部重建」升级为「消费到 elapsedMs 的 RNG 状态承接」）**：现状每次 `createSeededRng(seed)` 从头重消费，是「过去不变」的**唯一且脆弱**保证。本轮把它从「碰巧对」升级为「结构上对」：重算/续跑侧承接「已消费到 `elapsedMs` 为止的 RNG 状态」（mulberry32 全部内部状态即单个数，可导出/导入），使插入命令后的后缀错位**不再回溯污染已呈现前缀的随机结果**。RNG 仍走注入、engine 零 `Math.random`。**这是「前缀冻结」在随机维度成立的必要卫生改动，属 SB-T2 合同内**（research R2）。
- **拍板 3（SB-T2 选目标范围 = 只对『己方、单体』大招；命令目标覆盖规则与 UI 亮起条件同一口径）**：`ManualUltimateOrder` 加**可选 `targetId`**；engine 对**单体 selector**（`frontEnemy/lowestHpEnemy/highestAtkEnemy/backEnemy` 及单体控制）优先用 `order.targetId` 命中存活单位，**AOE（`allEnemies/allAllies`）/ self / 治疗全体一律忽略覆盖**（复用 SB-T4 已定的单体/AOE 二分口径，effects `effect.target ?? skill.target` 同一已解析表达式，坑 C-3 别重复解析）。**UI 侧只对单体大招亮起「选目标」态、AOE 大招点一下即放**——engine 覆盖规则与 UI 亮起条件**必须同一口径**，否则 P1-4 式「UI 承诺选目标、代码全体命中」反向 affordance 欺骗重演。
- **拍板 4（SB-T2 命令类型写成可扩展形状，为未来留形状但本轮只实现 ultimate）**：落 `targetId` 时把 `ManualUltimateOrder` 保持/演进为可扩展命令形状（`{atMs, unitId, targetId?}`，语义等价「discriminated union 的 ultimate 分支」），为未来手动技能/换位/撤退留统一命令口，**零额外成本、避免二次重构**。本轮**只实现 ultimate 命令**，不实现其它命令类型（backlog R6）。
- **拍板 5（SB-T2 边界完备 = 死目标回退 / 超时 pending order 不改判 / 连点单次重算）**：三个极端场景必须显式处理，否则本轮修复长出隐藏 bug：
  - **死目标回退**：选定 `targetId` 的单位在命令生效前已阵亡 → **回退到该大招默认 selector 目标**（而非空放已扣能量，`spendUltimateEnergy` 在 execute 前）；若回退后仍无合法目标 → 判 `manualUltimateFailed`。
  - **超时 pending order 不改判**：超时/事件上限裁决时刻（SB-T1 三态）若有 `atMs > maxTimeMs` 的未生效 order，**不得改变判决**（`nextManualAt` 已被 `Math.min(maxTimeMs, …)` 夹住，须测试断言锁死）。
  - **同帧连点单次重算**：同一回放帧内连点多个单位大招 → 命令入队后**单次重算/续跑**（或等价防抖），避免第二次重算覆盖第一次 cursor 致双跳/丢单。
- **拍板 6（SB-T2 目标解析统一 helper，避免 effects 长出两套目标逻辑）**：auto（selector）与 manual（`order.targetId` 覆盖）两条目标解析路径**抽共享纯 helper 统一**（如 `resolveSkillTargets(state, actor, skill, overrideTargetId?)`），避免 effects.ts 长出两套目标逻辑打架（沿 SB-T5 拍板 6「两套聚合一致改」同类教训）。
- **拍板 7（SB-T2 autoUltimates 默认策略）**：`autoUltimates` **默认保持开**（单机向「配好队看戏」定位，SPRINT 授权 Planner 定）；「选目标 + 无跳变」是「玩家主动关自动后的手动增强」，不强制玩家实时操作。默认关或首战引导 → 本轮不做，backlog（不影响 SB-T2 机制落地）。

### 本轮追加清单

- [x] **本轮-7｜SB-T2 落地：手动大招前缀冻结平滑推进（拍板 1/2/6）**
  - 目标：手动开大 / 切换 autoUltimates 后，**已回放到 `elapsedMs` 的事件前缀一字不改、游标不回退、无时间倒流/HP-能量跳变**；重算/续跑只影响当前时刻之后；RNG 从「seed 头部重建」升级为「承接消费到 `elapsedMs` 的状态」（拍板 2），使后缀错位不回溯污染前缀随机结果。engine 纯净（零 Vue/Pinia/DOM/`Math.random`，随机走注入 RNG），零存档触点。
  - 验收：新增 engine 特征测试断言「插入一条手动大招 order 后，`at <= 插入时刻` 的事件前缀与插入前逐条相同（无过去被重写/时间倒流）」；**不破坏** `timedBattle.test.ts:261-291` auto/manual ultimate 既有护栏；若采纳过渡形态须在实现说明写明前缀冻结保证；type-check/test/build 通过。

- [x] **本轮-8｜SB-T2 落地：手动大招可选目标（单体覆盖，AOE 忽略）+ 边界完备（拍板 3/4/5）**
  - 目标：`ManualUltimateOrder` 加可选 `targetId`（可扩展命令形状，拍板 4）；engine 对单体 selector 优先用 `order.targetId` 命中存活单位、AOE/self/全体忽略（拍板 3，复用单体/AOE 二分口径）；UI 只对单体大招亮「选目标」态、AOE 点一下即放（engine 与 UI 同口径）；死目标回退默认 selector（回退后无目标才判 failed）、超时 pending order 不改判、同帧连点单次重算（拍板 5）。engine 纯净、零存档。
  - 验收：新增 engine 特征测试断言「单体大招指定 `targetId` → 命中所选存活单位」+「AOE 大招忽略 `targetId`（仍全体命中）」+「死目标 → 回退默认 selector、不空放扣能量」+「超时后 `atMs > maxTimeMs` 的 pending order 不改判决」；UI 亮起条件与 engine 覆盖规则同口径（单体才可选目标）；**不破坏** 既有 manual ultimate 护栏与 SB-T1/T3/T4/T5 断言；type-check/test/build 通过。

- [x] **本轮-9｜SB-T2 集成回归 + S14-B 收尾核对**
  - 目标：确认前缀冻结（本轮-7）与选目标（本轮-8）协同 = 「选目标后仍无跳变」（research Tradeoff 矩阵方案 A 的核心：选目标与无跳变同一机制两个结果）；确认本轮零存档触点、engine 纯净、engine 依赖方向未破坏；**核对 SB-T1..SB-T5 主清单全部 `[x]` 且与实现一致**（收尾轮硬指标，防 S14-A「跑满轮次≠目标达成」）；确认未破坏 S14-A 已成 6 项与第 1/2 轮 SB-T3/T5/T1/T4。
  - 验收：下方 5 条验收命令实测绿；SB-T1..SB-T5 全 `[x]` 与实现一致；未破坏既有护栏。

- [x] **收尾①｜暴击 UI 显形（SB-T3 最后一寸，P2-6 打击感）**
  - 背景：SB-T3 已让暴击在 engine 里真实发生（`damage` 事件带 `isCritical`），但 `SquadBattleView.applyEventToUnits` 的 `case 'damage'` 只取 `hpAfter`、丢弃 `isCritical`，日志也不记伤害 → 暴击对玩家完全不可感知。本项把已算好的 `isCritical` 接到 UI 最后一寸。**纯 view 层，engine 零改动。**
  - 做法（A+B 都做）：A 浮动伤害数字——新回放到的 `damage` 事件在目标单位上浮现 `-N`，暴击用 `text-highlight`(金) + 更大字号 + `CRIT` 标记 + 冲击缩放/抖动动画区别于普通 `text-danger`；瞬态状态放 View（`floatingDamages`，按 `targetId` 分发到 `SquadUnitBar`），定时清除走登记式 `scheduleFloatingClear()`（与回放推进定时器分池，`clearBattleTimers`/reset/`onBeforeUnmount` 全清 + 清空数组，无裸 setTimeout）。B 战斗日志——`buildKeyLogs` 把暴击作为关键事件记入（「💥 暴击！X 对 Y 造成 N 伤害」），普通伤害不记以免刷屏。浮动数字只在 `playNextBattleEvent` 单条推进时生成（不在会重放全史的 `applyEventToUnits` 里），跟随现有 180ms 回放节奏、不打乱主流程。
  - 验收：type-check / test / build / test_security / grep 五条全绿；engine 零改动（仅动 `views/SquadBattleView.vue` + `components/battle/squad/{SquadBattlefield,SquadUnitBar,types}`）；未破坏既有 670 测试与护栏。
