# AnimePlay — SPRINT 合同（S14-C：角色差异化与养成长线）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-C 全部任务（SC-T1..SC-T6）**。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S14-C，**绝不表示可以跳过本轮被指派的 SC-T 任务**（S14-A SA-T6、S14-B 暴击UI显形均曾因此被漏，本轮严禁重演；见 pitfalls）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14-C、`docs/orch/homestead-hub-audit-report.md`（P#-# 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 相关面：角色养成/配装页 `frontend-vue/src/views/NurtureView.vue`（内嵌于家园 hub characters 面板）+ `stores/nurture.ts` + `config/nurture.ts` + `engine/nurture/rules.ts`；技能差异化 `data/squadSkillKits.ts`（含 SA-T4 落地的 `SIGNATURE_KIT_OVERRIDES` + `inferArchetype`）/ `data/urCharacterSkills.ts` / `characterSkillsMap.ts`；塔准入 `engine/squad/eligibility.ts`；收藏计数 `stores/collection.ts`（`getCharacterCardCount`）；存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（当前 SAVE_VERSION=15）。
- 本 Sprint = **S14-C 角色差异化与养成长线**：把「角色定位靠脆弱正则、HR 无个人技、养成仅等级+好感两薄轴、好感一次性榨干、塔不看养成、角色页壳冗余」补成有稳定定位、有长期养成目标、好感有永久意义、塔要求养成的收集向深度。

## 现状根因（S14-C 逐个拆解）
1. 定位靠正则：`data/squadSkillKits.ts inferArchetype` 拼文本跑 6 条正则 first-match-wins，误判频发（阿尔托莉雅被 `圣剑|Fate` 判成魔法师…）。
2. HR 无个人技：`urCharacterSkillMap` 只登记 UR，HR 名与效果 100% 走原型模板，而塔允许 HR 出战。
3. 养成两轴太薄：仅等级(加点)+好感(里程碑)，无 rank/星级/突破，重复角色卡无处消化。
4. 好感一次性：`config/nurture.ts` 里程碑只给一次性 KP，好感无战力/永久意义、领完即废。
5. 塔不看养成：`engine/squad/eligibility.ts` 只校验稀有度/技能包，Lv.1 生角色可直接进塔。
6. 角色页壳冗余：hub characters 面板原样内嵌整页 `NurtureView`，双标题/双空态/长滚。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/IO/`Math.random`；成长/突破/门槛逻辑进纯层，随机走注入 RNG）/ 依赖只向下 / 货币只走 `profile.spend·earn` / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改战斗或养成规则前先看对应 `*.test.ts`。**别破坏 S14-A/S14-B 已成的 11 项**（编队编辑 / towerFloorEnemySeed / 确定加点 / SIGNATURE_KIT 10 UR 差异化 / 扫荡日循环 v15 / Plan A 三tab / 超时HP%裁决 / 手动大招无跳变选目标 / 暴击激活+显形 / 站位减伤 / buff累加）。
**存档变更协议（SC-T3/可能 SC-T4 需要）**：新增/改存档字段必须 **schema + migrations + 装配器（stores/persistence.ts）三处同改 + 往返测试**；SAVE_VERSION 现=15，需要则升 16（一次 sprint 只升一次，多任务共用同一次 bump）。

## 任务清单（S14-C = SC-T1..SC-T6）

- [x] **SC-T1｜废弃正则 inferArchetype，改显式 archetype 映射（P2-7）**
  - 目标：角色定位改为「显式 archetype 映射优先 → 未命中回落现有正则」。以 SA-T4 已定的 `SIGNATURE_KIT_OVERRIDES` 里 10 UR 的 role 为种子，扩充一张显式 `characterId → archetype` 映射（人工校对头部 UR，覆盖易误判者如 Fate/音乐/爆裂系）。不新增存档字段（映射是静态数据）。
  - 验收：显式映射命中角色的 archetype 稳定正确、不再被正则误判；`squadSkillKits.test.ts` 增「显式优先 / 回落正则 / 已知误判角色被纠正」用例；不破坏 SIGNATURE_KIT/kit 生成；type-check/test/build 通过。
- [x] **SC-T2｜HR 角色补个人技能绑定（P2-8）**
  - 目标：为 HR 角色补个人技能**名**映射（让 HR 技能名不再 100% 走原型通名），长期至少 1 条差异化被动。范围可先覆盖已拥有池/塔可出战的 HR。走 `describeSquadSkill` 自动派生描述，**严禁「描述≠行为」**。
  - 验收：HR 角色 kit 技能名带个人特色（非纯原型通名）且描述=effect；`squadSkillKits.test.ts` 覆盖 HR 命中/回落；不破坏 UR 路径；type-check/test/build 通过。
- [x] **SC-T3｜养成长线：星级/突破（消化重复角色卡，P2-10）**
  - 目标：加一条有决策的长线——角色达等级上限后靠**重复角色卡（碎片）突破**解锁更高上限 / 小幅永久成长。消费 `collection.getCharacterCardCount` 的重复张数（保留至少 1 张不被消耗，复用装备/家园的「拥有口径」防呆）。存档记录每角色星级/突破进度（**schema+migrations+装配器三改 + 往返测试，SAVE_VERSION→16**）。UI 在 NurtureView 角色详情加突破入口 + 进度。
  - 验收：突破消费重复卡、提升上限/永久小加成、进度存档往返保真、跨重开保真；engine 纯函数测试 + 迁移测试；不破坏 C1 养成两轴；type-check/test/build 通过。
- [x] **SC-T4｜好感等级化：给永久意义 + 回归钩子（P2-11 / P2-23）**
  - 目标：好感里程碑除一次性 KP 外给**永久小幅五维%/被动**（数值 Planner 定、克制）；加**每日好感互动**（送礼/对话，复用 daily 跨天判定）；好感溢出（领完最高档后）可转少量 KP。避免破坏 C1「好感不接战力」的克制——永久加成要小且有封顶。
  - 验收：里程碑给永久加成且真进战力、每日互动跨天重置、好感溢出转 KP；相关测试；若触存档与 SC-T3 共用 v16 bump；type-check/test/build 通过。
- [x] **SC-T5｜挑战塔加战力/等级门槛（P2-12）**
  - 目标：塔层加**推荐战力/等级提示**——低于阈值明显劣势或给醒目提示（Planner 定「硬门槛」还是「软提示+劣势」，倾向软提示避免存量小队突然不可战）。把养成重新钉进探索循环。engine 纯层给阈值/推荐，UI 展示。
  - 验收：塔层有推荐战力/门槛且 UI 可见、低于阈值有提示或机制劣势；engine 测试；不破坏现有塔流程；type-check/test/build 通过。
- [x] **SC-T6｜NurtureView 拆成无壳可内嵌组件（P2-18）**
  - 目标：消除 hub characters 面板内嵌整页 NurtureView 的双标题/双空态/长滚——把 NurtureView 拆成无壳（去 min-h-screen / 页级标题 / 独立未登录空态）可内嵌组件，或 hub 内只留一套。纯 UI 重构，不改养成逻辑。
  - 验收：hub characters 面板无双标题/双空态、无多余长滚；独立 /nurture 重定向仍可用；type-check/test/build 通过。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **SC-T1 + SC-T2 + SC-T5**（差异化 data 层 + 塔门槛，均无/极少存档改动、内聚易测）。
> - 第 2 轮 = **SC-T3**（星级/突破，唯一 SAVE_VERSION→16 的重任务，单独一轮做透存档三改+往返测试）。
> - 第 3 轮 = **SC-T4**（好感等级化，若触存档与 SC-T3 共用 v16）+ **SC-T6**（NurtureView 拆组件，纯 UI）+ 收尾（确保 SC-T1..T6 全 `[x]`、无回归）。
> 每轮务必保持验收命令全绿、每子项独立可合并。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 nurture/squadSkillKits/eligibility/migrations 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-C 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SC-T* 任务全部 `[x]` 并与实现一致。**S14-C 整体完成** = SC-T1..SC-T6 全 `[x]`。

---

## 第 1 轮追加任务（S14-C round 1/3 · 承诺切片 = SC-T1 + SC-T2 + SC-T5）

> 本轮指派切片（依排期建议 + scout + 三审一致）：**SC-T1 + SC-T2 + SC-T5**，三项本轮**必须全部真落地**（同轮啊哈缺一漏气，禁只做回归确认）。
> 均为 data 层 + engine 纯函数 + UI 展示，**零存档改动、SAVE_VERSION 仍=15**（v16 留给第 2 轮 SC-T3 独占，本轮误升即错）。
> 三审 Prioritized Recommendations 逐条回应见 `docs/orch/negotiation.md`；HOW 落点见 `docs/orch/plan.md`。

- [x] **SC-T1（本轮）｜显式 archetype 映射做成「单一定位真相源」，正则降为兜底**
  - 拍板决策：
    - 定位解析收敛成**单一入口**（seed = `SIGNATURE_KIT_OVERRIDES[id].role`（现有 10 UR）→ 扩充的显式 `id→archetype` 表 → 未命中回落现有正则 → 现有兜底）。**采纳三审一致的「resolveRole 单源」而非「又一张平行表」**（方案 1a）。
    - **修掉暗坑**：`getSquadSkillKitForCharacter` 现在 archetype 走 `inferArchetype` 而 `override.role` 声明了却没用（已核实 squadSkillKits.ts:563/571）——本轮让 kit 生成的定位改读单一入口，`override.role` 终于生效。
    - 显式表覆盖范围：**10 个 override UR（种子）+ 已知误判者**（Fate/圣剑系如阿尔托莉雅、音乐/BanG Dream 系、爆裂系）+ 头部 UR 人工校对易误判者。长尾允许回落正则（不强求全量手工分类——头部靠 override per-character，archetype 只兜长尾）。
    - 净减法：删除 P3-9 已证不可达的稀有度兜底死分支（或标 dead branch）。生成脚本落 role 字段（方案 1b）= backlog，本轮不做。
  - 验收：显式命中优先且稳定正确、已知误判角色（阿尔托莉雅不再判 arcane、音乐系不被强判 support）被纠正、未命中干净回落正则；**新增测试断言「10 个 override 的显式 archetype === 其 override.role」**（补上 S14-A 残留的 CI 守卫缺口）；`filter(isSquadSkillKitReady)` 全角色集合不变、`validateSquadSkillCoverage` 仍全绿；type-check/test/build 通过。

- [x] **SC-T2（本轮）｜HR 补个人技能名，守死双红线**
  - 拍板决策：
    - 覆盖范围：**塔可出战/已拥有池的未覆盖 HR**（scout 已核实 26 个 HR 无个人技名走原型通名；29/55 已覆盖者不动，别推倒重来）。
    - 本轮只做「技能**名**差异化」——**effect 仍回落原型模板可接受**，描述一律 `describeSquadSkill` 自动派生（禁手写 description）。是否给差异化被动 = 长期项，**本轮不做**（标 backlog，待 SC-T3 突破上线后 HR 突破解锁被动）。
    - **红线 1（描述=行为）**：不得手写华丽假名 + 假描述。**红线 2（名字不暗示冲突机制）**：HR 名偏中性人设/名台词，**不得**暗示与其原型 effect 冲突的机制（如原型是 striker 打人却起名「铁壁守护」）——名字须与定位一致或中性。
    - 落点走「名覆盖」路（不塞生成文件 `urCharacterSkillsGenerated.ts`；若指 `activeSkillId` 须指向真·个人 Skill、非 `TPL_*`/`AURA_*`）。
  - 验收：未覆盖 HR 技能名带个人特色（非纯原型通名）且 `description===describeSquadSkill`、名不暗示冲突机制；测试覆盖「HR 命中个人名/未命中回落原型通名/description=派生/不破坏 UR 路径/HR kit 仍过 validateSquadSkillKit」；type-check/test/build 通过。

- [x] **SC-T5（本轮）｜塔层软战力门槛 + delta 展示（本轮最大功能缺口）**
  - 拍板决策：
    - **软提示，不硬拦**（方案 5a，三审一致 + SPRINT 明示，守「存量小队不突然不可战」）——**绝不改 `eligibility.ts` / `canStartBattle` / `canStartTowerBattle`**。
    - engine 新增纯函数（落 `engine/squad/` 新文件或 tower.ts）：`recommendedPowerForFloor(floorPower)`（= 敌方同口径 floorPower × 系数）+ `assessSquadReadiness(playerPower, floorPower) → { ratio, level: 'ready'|'risky'|'underpowered', ... }`。零 config import（系数作参数注入）、零 RNG、可单测。
    - **口径铁律**：我方战力复用现有 `squadPower`/`getSquadPower`（`generateBattleStats(base+statPoints+equipBonus)→calculateBattlePower`），敌方用现成 `floorPower`（同 `calculateBattlePower`）——**双方同一口径**，顺带收敛审计 P3-6 量纲分歧。**别另拼第三套战力口径。**
    - 阈值贴近真实胜负线（建议 ready ≥0.9 / risky 0.7~0.9 / underpowered <0.7，Generator 可微调），避免「层层皆红」使提示失效。
    - UI 两处**共用同一 engine 判据**：HomesteadHubView explore start-card / enemy-preview（已同屏 squadPower + floorPower）+ SquadBattleView 编成/战斗阶段。措辞人话化（「战力 480 / 建议 ~1200 · 差距较大，先养成或扫荡」），放进现有 start-hint 行不新增卡片（防信息重复回潮）。状态色走皮肤语义令牌（danger/warning），禁 text-white 压浅底、禁运行时拼动态色类。
    - 「诊断化」（指出缺 guardian / def 偏低）= backlog 超范围，本轮只做单标量 delta + 三档软提示。
  - 验收：engine 纯函数单测（给定 player/floor power 返回正确 level + 边界值）；explore 与 SquadBattleView 两处均可见推荐战力 + delta + 软提示且共用同一判据；低于阈值有醒目提示；不破坏 `canStartBattle`/`canStartTowerBattle`/塔流程；type-check/test/build 通过。

---

## 第 3 轮（最终轮）追加任务（S14-C round 3/3 · 承诺切片 = SC-T3 + SC-T4 + SC-T6）

> **纠偏说明（关键）**：核查代码基线发现 **SC-T3 第 2 轮并未真正落地**——`schema.ts SAVE_VERSION` 仍 = 15、`types/nurture.ts` 无 `breakthrough` 字段、全仓无 `breakthrough/consumeCharacterCards/breakthroughStatBonus` 命中（round 2 的 scout.md 只写了 SC-T3 计划，代码产物缺失、无 round-2 eval）。按 pitfalls S14-A 铁律「Sprint 合同内未完成任务永远 in-scope，严禁当作『新范围』跳过」（SA-T6/暴击UI 前车之鉴），本最终轮**必须补齐 SC-T3**，与 SC-T4、SC-T6 一并交付，凑齐 S14-C 全部 `[x]`。
> 本轮切片：**SC-T3（星级/突破，v15→v16）+ SC-T4（好感等级化，共用同一次 v16 bump）+ SC-T6（NurtureView 拆无壳组件，纯 UI）**。三项本轮必须全部真落地。
> **一次 sprint 只升一次 SAVE_VERSION**：SC-T3 与 SC-T4 若各自需存档字段，**共用同一次 15→16**（禁升到 17）。存档三处同改（schema + migrations + 装配器）+ 往返测试。
> 三审 Prioritized Recommendations 逐条回应见 `docs/orch/negotiation.md`；HOW 落点见 `docs/orch/plan.md`。

- [x] **SC-T3（本轮）｜养成第三轴：星级/突破（消化重复角色卡，v16）**
  - 拍板决策：
    - **做「永久小加成」不提等级上限（选项 A）**：突破只给克制的永久五维加成，**不动 `MAX_CHARACTER_LEVEL=100` 与 `addCharacterExp` 钳制点**（零核心升级路径回归，单轮做透）。选项 B（提上限）标 backlog。
    - **星级 0~5（`MAX_BREAKTHROUGH=5`）**，封顶后不再消耗、突破按钮置灰。
    - **加成幅度封顶**：每星按角色 base 五维小幅提升（每星约 +4% base、5 星累计约 +20%，克制守 C1「养成不做战力火箭」；数值可在 config 微调，但**5 星累计 ≤25%** 是硬上限）。加成经 engine 纯函数**确定成长**（无 RNG）。
    - **消耗曲线**：突破到第 N 星消耗 `N` 张重复角色卡（星1需1张、星2需2张…5星累计 15 张），阶梯递增、克制。engine 出 `breakthroughCost(currentStar)` 纯函数。
    - **拥有口径防呆（红线）**：可消耗张数 = `getCharacterCardCount(id) - 1`（**永久保留本体 1 张不被消耗**，防角色掉到 0 张连锁炸编队/塔准入）。扣卡收口到 collection store 新增 `consumeCharacterCards(id, n)`（无 KP 副作用、防扣到 <1），**禁在 nurture store 直改 collection 的 Map**、禁复用语义不符的 `dismantleCard`。
    - **战力 3 处同源（红线，最易漏气）**：突破加成必须**同时**注入 `HomesteadHubView selectedFinalStats + memberPower` 与 `SquadBattleView buildCharacterStats` 三处 `generateBattleStats`（否则详情/explore/实战战力打架，等同 SA-T6 半做）。**强制收敛成一个共享 helper**（engine 纯函数 `breakthroughStatBonus(star, baseStats) → StatBonus`，三处调用并入，或抽 util `resolveMemberBattleStats`）一次收口防漏。敌方侧不注入。
    - **存档（v16）**：`types/nurture.ts` 加 `breakthrough: number` + `createDefaultNurtureData` 补 `0` + `migrateNurtureData` 白名单对象**显式加缺省**（`typeof data.breakthrough==='number'?…:0`，**禁 spread**，守 `not.toHaveProperty` 旧字段家族）+ `getNurtureData` 运行时兜底补 0。nurture 域 serialize/deserialize 全量 Map entries **天然覆盖新字段、装配器代码无需改**，第三处义务 = persistence.test.ts 往返断言。`SAVE_VERSION` 15→16 单点改 + schema 文件头注释加 v16 沿革。
    - UI 只加在 **NurtureView 详情内容区**（突破入口 + 星级进度），**本轮不动壳**（min-h-screen/h1/未登录空态是 SC-T6 的活，避免 diff 交叉）——但 SC-T6 同轮做，故突破块要写成内聚小块便于随 SC-T6 平移。
  - 验收：突破消费重复卡（保留≥1）、达上限/卡不足拒绝、永久小加成**真进战力且 3 处同源**、`breakthrough` 存档往返保真 + 跨重开保真；engine 纯函数测试（`breakthroughCost`/`breakthroughStatBonus`/边界 0★/5★）+ store action 测试 + migrations v16 缺省/往返/脏档 `not.toHaveProperty` 测试 + persistence.test.ts 往返断言；不破坏 C1 养成两轴与 S14-A/B 11 项；`SAVE_VERSION=16`；type-check/test/build 通过。

- [x] **SC-T4（本轮）｜好感等级化：给永久意义 + 每日回归钩子（与 SC-T3 共用 v16）**
  - 拍板决策：
    - **好感里程碑除一次性 KP 外给永久小加成**：6 档 `BOND_MILESTONES` 每档追加克制的永久五维加成（**全 6 档累计封顶 ≤ 约 +15% base 或等量小固定值**，明显小于突破 5 星、守 C1「好感克制、不做主战力轴」）。加成**经与 SC-T3 同一 helper 注入同 3 处战力 seam**（`breakthroughStatBonus` + 好感永久 bonus 合并进同一 `resolveMemberBattleStats`/并入 statPoints 项），避免两套注入路径。永久加成由**领取里程碑触发**（复用现有 `claimBondMilestone` 领取制、`claimedBondMilestones` 记录，不新增「已领永久加成」字段——加成从已领里程碑集纯派生）。
    - **每日好感互动**：加「每日互动」动作（送礼/对话形式，给固定好感 + 少量经验），**每日一次跨天重置**，复用 `daily` store 的 `todayKey` 跨天判定范式（扁平字段，如 `lastBondInteractionDate` per 角色或全局按日 gate）。**若需存档字段则与 SC-T3 共用 v16 bump**（本轮唯一一次 15→16）；若能用现有 `lastInteraction`/派生跨天判定则零新增字段更优——Generator 二选一但**跨天重置必须正确**。
    - **好感溢出转 KP**：领完最高档（`bond_6`/4000）后好感继续涨则**溢出可转少量 KP**（克制汇率，如每 N 点好感换 1 KP，给一个温和 sink 出口，防「领完即废」）。
    - 数值克制，避免破坏 C1「好感不接战力」——永久加成小且有封顶，好感主体仍是关系仪表/称号。
  - 验收：里程碑领取给永久加成且**真进战力（同 3 处 seam）**、每日互动**跨天正确重置**、好感溢出转 KP；engine/store 相关测试（永久加成派生、跨天 gate、溢出汇率边界）；若触存档与 SC-T3 **共用 v16**（不单独再 bump）；不破坏现有里程碑一次性 KP 领取；type-check/test/build 通过。

- [x] **SC-T6（本轮）｜NurtureView 拆成无壳可内嵌组件（纯 UI，不改养成逻辑）**
  - 拍板决策：
    - 消除 hub characters 面板内嵌整页 NurtureView 的**双标题/双空态/长滚**：去掉 NurtureView 的页级壳（`min-h-screen`(:216) / 页级 `<h1>角色养成`(:220) / 独立未登录空态(:225) / 独立无角色空态(:234) 中与 hub 重复的那份），使其成为可内嵌的无壳组件；hub characters 面板只保留**一套**标题/空态。
    - **纯 UI 重构，绝不改养成逻辑/store/engine/存档**——只动模板与壳级样式；SC-T3 本轮加的突破 UI 块随之平移进无壳组件（内聚小块）。
    - **`/nurture` 与 `/squad-battle` 兼容重定向必须仍可用**（重定向到 `/homestead?tab=characters` / `?tab=explore`），不能删到 404。独立访问路径（若保留）不得出现双标题。
  - 验收：hub characters 面板**无双标题/双空态、无多余长滚**（一套标题一套空态）；`/nurture` 重定向仍工作；养成/突破/好感所有交互功能不回归（登录后可选角色、加点/补习/里程碑/突破/每日互动均可用）；type-check/test/build 通过。
