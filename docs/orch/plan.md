# Plan — S14-C 第 3/3 轮（最终轮，product-loop --tier1 on --mode all）

> 指派切片 = **SC-T3 + SC-T4 + SC-T6**。三项本轮**必须全部真落地**（禁只做回归确认）。
> **纠偏**：核查基线发现 **SC-T3（第 2 轮）实际未落地**（`SAVE_VERSION` 仍=15、`types/nurture.ts` 无 `breakthrough`、全仓无相关命中、无 round-2 eval）。按 pitfalls S14-A「合同内未完成任务永远 in-scope，禁当新范围跳过」，本最终轮补齐 SC-T3 + 做 SC-T4/SC-T6，凑齐 S14-C 全部 `[x]`（S14-C 完成 = SC-T1..T6 全 `[x]`）。
> **本轮唯一一次 `SAVE_VERSION` 15→16**（SC-T3 与 SC-T4 共用，禁升 17）。存档三处同改 + 往返测试。
> 已 COMPLETE（第 1 轮）：SC-T1（EXPLICIT_ARCHETYPE + resolveArchetype 单源）/ SC-T2（HR_SKILL_NAME_OVERRIDES 26 项）/ SC-T5（thresholds.ts 软门槛）。基线：59 files / 687 tests 全绿。

---

## 任务 1（先做，其余依赖其战力注入 seam）· SC-T3 星级/突破（v16）

**目标（WHAT/WHY）**：加养成第三轴——角色靠**重复角色卡（碎片）突破**得永久小加成，把「重复抽到的角色」转成成长资源（P2-10 根因：重复角色卡无处消化 + 养成仅两薄轴）。

**关键设计拍板**：
- 选项 **A**：突破**只给永久小加成、不提等级上限**（不动 `MAX_CHARACTER_LEVEL`/`addCharacterExp` 钳制）。选项 B backlog。
- 星级 **0~5**（`MAX_BREAKTHROUGH=5`），封顶不再消耗。
- 每星加成约 **+4% base 五维**，5 星累计 **≤25%**（硬上限，克制守 C1）；engine 确定成长无 RNG。
- 消耗曲线 `breakthroughCost(star)`：突破到第 N 星耗 `N` 张重复卡（5 星累计 15 张）。
- 拥有口径防呆：可消耗 = `getCharacterCardCount(id) - 1`（**永久保留本体 1 张**）；扣卡收口 collection 新增 `consumeCharacterCards(id, n)`（无 KP 副作用、防扣 <1），**禁直改 Map、禁复用 dismantleCard**。
- **战力 3 处同源**：`HomesteadHubView.vue selectedFinalStats(:114) + memberPower(:183)` + `SquadBattleView.vue buildCharacterStats(:269)` 三处 `generateBattleStats`。engine 出 `breakthroughStatBonus(star, baseStats) → StatBonus`，**强制收敛成一个共享 helper 一次改 3 处**（建议 util `resolveMemberBattleStats(character, nurtureData, equipBonus)` 或 3 处显式并入 + 测试守全覆盖）。敌方不注入。

**存档（v16）三处同改**：
- `types/nurture.ts`：`CharacterNurtureData` 加 `breakthrough: number`；文件头注释更新为三轴。
- `engine/nurture/rules.ts`：`createDefaultNurtureData()` 加 `breakthrough: 0`；新增纯函数 `breakthroughCost` / `breakthroughStatBonus` / `MAX_BREAKTHROUGH`（export 经 `engine/index.ts`，3 处 View 已从 `@/engine` import）。
- `infra/persistence/migrations.ts`：`migrateNurtureData`(:163) 白名单对象**显式加** `breakthrough: typeof data.breakthrough==='number'?data.breakthrough:0`（**禁 spread**，守 `not.toHaveProperty` 旧字段家族，pitfalls S13-C1）。
- `infra/persistence/schema.ts`：`SAVE_VERSION` 15→16（:37）+ 文件头加 v16 沿革注释。
- `stores/nurture.ts`：`getNurtureData`(:52) 兜底补 `if (data.breakthrough==null) data.breakthrough=0`；serialize/deserialize 全量 Map entries **天然覆盖新字段、装配器代码无需改**（第三处义务 = persistence.test.ts 往返断言，别硬改装配器凑数）；新增 action `breakthroughCharacter(id): boolean`（读 collection 计数、判 cost/上限、调 `consumeCharacterCards`、`breakthrough++`、addLog）；engine 出消费判定 `canBreakthrough(star, spare)` 纯函数，副作用（扣卡）留 store。
- `stores/collection.ts`：新增 `consumeCharacterCards(id, n)`。
- `stores/userStore.ts`：加门面 `breakthroughCharacter(id)`（成功才 saveToServer，仿 claimBondMilestone，别用 withSave 无脑包）。
- UI：`views/NurtureView.vue` 详情内容区加突破入口 + 星级进度（内聚小块、语义令牌、禁 text-white/禁拼动态色类）。**不动壳**（SC-T6 同轮做壳）。

**依赖**：无（最先做，其 helper 供 SC-T4 复用）。
**来源**：SPRINT SC-T3 + 第 3 轮追加；scout.md（Iteration 2）A/B 段；负因根 P2-10。

**验收**：突破消费重复卡（保留≥1）、达上限/卡不足拒绝、永久加成真进战力**且 3 处同源**、`breakthrough` 存档往返 + 跨重开保真；engine 测试（cost/bonus/边界 0★5★）+ store action 测试 + migrations v16（缺省/往返/脏档 `not.toHaveProperty`）+ persistence.test.ts 往返断言；`SAVE_VERSION=16`；不破坏 C1 两轴 / S14-A/B 11 项；type-check/test/build 通过。

**相关陷阱**：战力 3 处漏一处 = SA-T6 半做（scout 坑1）；扣卡防扣到 0 张连锁炸编队/塔（坑2/3）；迁移禁 spread（坑4）；SAVE_VERSION 只升一次（坑5）；nurture 装配器天然覆盖别硬改（坑6）；engine 纯净 config 阈值注入或 engine 定常量（坑8）；不动 SC-T6 壳（坑9）；加成克制守 C1（坑10）；必须全链真落地非半截（坑11）。

---

## 任务 2 · SC-T4 好感等级化（与 SC-T3 共用 v16）

**目标（WHAT/WHY）**：好感里程碑除一次性 KP 外给**永久小加成**、加**每日好感互动**回归钩子、好感溢出转 KP——让好感有永久意义与循环钩子（P2-11/P2-23：好感一次性榨干、无战力/永久意义、无每日钩子）。

**关键设计拍板**：
- 6 档 `BOND_MILESTONES`（config/nurture.ts:55）每档追加克制永久五维加成，**全 6 档累计封顶 ≤ 约 +15% base**（明显小于突破 5 星，守 C1 好感克制）；加成**经与 SC-T3 同一 helper 注入同 3 处战力 seam**（`breakthroughStatBonus` + 好感永久 bonus 合并进同一 `resolveMemberBattleStats`），避免第二套注入路径；永久加成**从已领里程碑集（`claimedBondMilestones`）纯派生**（复用现有领取制，不新增「已领永久加成」字段）。
- **每日好感互动**：新动作（送礼/对话形式）给固定好感 + 少量经验，**每日一次跨天重置**，复用 `daily` store `todayKey()` 跨天判定范式（扁平字段）。**若需存档字段与 SC-T3 共用 v16**（本轮唯一 bump）；若能用现有 `lastInteraction` 派生跨天判定则零新增字段更优——二选一但**跨天重置必须正确**。
- **好感溢出转 KP**：领完最高档（`bond_6`/4000）后好感继续涨则**溢出可转少量 KP**（克制汇率，如每 N 点好感 → 1 KP，温和 sink 出口）。
- 数值克制：永久加成小且封顶，好感主体仍是关系仪表/称号，不做主战力轴。

**依赖**：任务 1（复用其 `resolveMemberBattleStats`/`breakthroughStatBonus` 注入 seam + 若需存档共用 v16 bump）。
**来源**：SPRINT SC-T4 + 第 3 轮追加；负因根 P2-11 / P2-23。

**验收**：里程碑领取给永久加成且**真进战力（同 3 处 seam）**、每日互动**跨天正确重置**、好感溢出转 KP；engine/store 测试（永久加成派生、跨天 gate、溢出汇率边界）；若触存档**共用 v16 不单独 bump**；不破坏现有里程碑一次性 KP 领取；type-check/test/build 通过。

**相关陷阱**：战力 3 处同源同任务 1（并进同一 helper 而非新第二套）；SAVE_VERSION 只升一次（与 SC-T3 共用 v16）；每日跨天判定复用 daily todayKey 范式勿造新计时器；setTimeout 若用于互动冷却须登记 onUnmounted 清除（pitfalls setTimeout 假安全）；克制守 C1。

---

## 任务 3（末做，纯 UI）· SC-T6 NurtureView 拆无壳可内嵌组件

**目标（WHAT/WHY）**：消除 hub characters 面板内嵌整页 NurtureView 的**双标题/双空态/长滚**（P2-18）。

**关键设计拍板**：
- 去 NurtureView 页级壳：`min-h-screen`(:216) / 页级 `<h1>角色养成`(:220) / 独立未登录空态(:225) / 独立无角色空态(:234) 中与 hub 重复的份，使成无壳可内嵌组件；hub characters 面板只保留**一套**标题/空态。
- **纯 UI 重构，绝不改养成逻辑/store/engine/存档**——只动模板与壳级样式；任务 1 的突破 UI 块随之平移进无壳组件（内聚）。
- `/nurture`、`/squad-battle` 兼容重定向必须仍可用（→ `/homestead?tab=characters` / `?tab=explore`），不删到 404。

**依赖**：任务 1（突破 UI 块随壳拆平移；末做避免与任务 1/2 的 diff 交叉）。
**来源**：SPRINT SC-T6 + 第 3 轮追加；负因根 P2-18。

**验收**：hub characters 面板**无双标题/双空态、无多余长滚**；`/nurture` 重定向仍工作；养成/突破/好感所有交互不回归（选角/加点/补习/里程碑/突破/每日互动均可用）；type-check/test/build 通过。

**相关陷阱**：只改消费端读源/壳，不删存档字段（pitfalls：存档字段勿删）；重定向不删到 404；养成域 store 逻辑零改动（纯 UI）。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出，别信自报）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增 nurture/breakthrough/migrations v16/persistence 往返测试；总数应 ≥ 687）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-C 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv
.venv/Scripts/python.exe backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中；`SAVE_VERSION=16`（一次 bump）；本轮 SC-T3 + SC-T4 + SC-T6 全 `[x]` 且与实现一致。**S14-C 整体完成 = SC-T1..T6 全 `[x]`**。
> 注：别跑 `npm run lint --fix`（全仓重排）；单文件 `npx eslint <path>`。
