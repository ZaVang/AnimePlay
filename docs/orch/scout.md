# Scout Report — Iteration 2（S14-C 第 2/3 轮，product-loop --tier1 on --mode all）

> 本轮指派切片（依 SPRINT 排期建议）= **SC-T3｜养成长线：星级/突破（消化重复角色卡，P2-10）**。
> 这是本 sprint 唯一 **SAVE_VERSION 15→16** 的重任务，单独一轮做透「存档三改 + 往返测试 + engine 纯函数 + UI 入口」。
> SC-T4 / SC-T6 属第 3 轮，不在本轮（第 1 轮 SC-T1/T2/T5 已 COMPLETE，见 eval.md）。
> **一句话可行性见文末。** 结论：SC-T3 可行、路径清晰，存档基建成熟（v14/v15 有现成范式），战力注入 seam 已定位。

---

## A. 约束与可行性（给 Planner）

### 全局硬约束（本轮适用）
1. **存档变更协议（本轮核心）**：新增字段必须 **schema.ts + migrations.ts + stores/persistence.ts 装配器 三处同改 + migrations.test.ts 往返测试**。SAVE_VERSION 现=15（schema.ts:37），本轮升 16（一次 sprint 只升一次，SC-T4 若第 3 轮也触存档则共用同一次 bump——本轮就把字段设计留好余量）。
2. **engine 纯净 + RNG 注入**：突破的成长/上限/消费判定逻辑进 `engine/nurture/rules.ts` 纯函数（零 Vue/Pinia/DOM/`Math.random`）。突破**建议做成确定成长**（无随机，仿 SA-T3 `distributeStatPointsByBase`），则连 RNG 都不需要——最干净。
3. **拥有口径防呆（关键）**：消费重复卡必须**保留至少 1 张不被消耗**。现有「拥有口径」范式 = `collection.getCharacterCardCount(id) > 0`（HomesteadHubView:177 `isOwned`、userStore:465）。突破可消耗张数 = `getCharacterCardCount(id) - 1`（拥有的第 1 张是「本体」永不消耗，仿装备 sanitize / homestead canonicalize 的防放大精神）。
4. **迁移白名单重建，禁 spread**（pitfalls S13-C1 明确）：`migrateNurtureData` 现在是**白名单重建对象**（migrations.ts:163-189），SC-T3 加 star/breakthrough 字段必须**在这个白名单对象里显式加缺省**，绝不改成 spread——否则删字段家族回潮。用 `migrations.test.ts` 的 `not.toHaveProperty` + 新字段缺省断言守。
5. **不破坏 C1 养成两轴 + S14-A/S14-B 11 项**：突破是**第三轴**（等级 + 好感 + 星级），加在既有两轴之上，不改等级/加点/好感的既有逻辑。

### SC-T3（星级/突破）可行性 ✅ 高

**现状确证**：
- `CharacterNurtureData`（types/nurture.ts:16-27）当前 3 结构轴：`affection` / `level+experience+totalExperience` / `statPoints`（+ `lastInteraction` + `claimedBondMilestones`）。**无任何 star/breakthrough/rank 字段** —— P2-10 根因确证（重复角色卡无处消化）。
- 等级上限 `MAX_CHARACTER_LEVEL = 100`（engine/nurture/rules.ts:10）。`addCharacterExp` 用 `Math.min(getLevelFromExp(...), MAX_CHARACTER_LEVEL)` 硬钳（nurture.ts:112）。**突破改上限**要么改这个常量钳制点为「按突破等级动态算上限」，要么突破只给永久小加成不改等级上限（见下方 Planner 决策点）。
- 重复卡计数现成：`collection.getCharacterCardCount(id)`（collection.ts:21，`characterCollection.get(id)?.count || 0`）。userStore 已 passthrough（userStore:537）。

**战力注入 seam（最关键，已定位全部 3 处）**：最终战斗属性统一走 `generateBattleStats(baseStats, statPoints, equipBonus)`（combat.ts:144，纯加法 base+statPoints+equipBonus）。玩家侧共 **3 个调用点**，突破永久小加成必须**全部 3 处**注入（否则 explore 预览 / 详情面板 / 实战三屏战力打架，违 SA-T2 同源）：
  1. `HomesteadHubView.vue:110 selectedFinalStats`（详情面板五维）
  2. `HomesteadHubView.vue:182 memberPower`（→ squadPower，explore/编队战力）
  3. `SquadBattleView.vue:265 buildCharacterStats`（实战真·member.battleStats，enemy 侧传 EMPTY 不受影响）
  - **建议做法**：新增 engine 纯函数 `breakthroughStatBonus(nurtureData, baseStats) → StatBonus`，把突破加成表达为**第 4 个 StatBonus 项**，塞进 `sumStatBonus([statPoints, equipBonus, breakthroughBonus])` 或直接改 3 处调用把突破 bonus 并进 statPoints 项。**收敛成一个 helper**（如 store/util 层 `resolveFinalStats(character, nurtureData, equipBonus)`）可一次改 3 处、防漏——但注意 helper 若放 store 则 View 改调 helper；放 util 则纯函数可测。推荐：engine 出 `breakthroughStatBonus` 纯函数 + 3 处调用点各自并入（3 处都已 import `@/engine`，改动小且显式）。
  - ⚠ **别只改预览不改实战**（或反之）——这是 SC-T3 最可能的漏气点，等同 SA-T6 半做。3 处必须同源。

**Planner 需拍板的决策点（HOW）**：
- **突破做「提上限」还是「永久小加成」还是两者**？SPRINT L35 原文 =「解锁更高上限 / 小幅永久成长」（斜杠=可二选一或都做）。
  - 选项 A（推荐，最内聚）：突破**只给永久小 % 或小固定五维加成**，不动 `MAX_CHARACTER_LEVEL`。改动面最小（只加 bonus 注入 3 处 + 存档字段），零回归风险，验收「提升上限/永久小加成」达标（取「永久小加成」分支）。
  - 选项 B：突破**提等级上限**（如每星 +10 级上限，`addCharacterExp` 钳制点改读 `maxLevelFor(star)`）。改动更大（碰核心升级路径 nurture.ts:112/134），需谨慎守 SA-T3 加点测试。
  - **scout 倾向 A**：单轮做透、零核心回归、验收全覆盖。B 留 backlog。
- **消费曲线**：每星消耗多少重复卡？建议阶梯（如星1需1张、星2需2张…或统一 N 张），克制（收集向不宜太肝也不宜白给）。**engine 出 `breakthroughCost(currentStar) → number`** 纯函数，config 放阈值。
- **星级上限**：建议 0~5 星（PCR 惯例），封顶后不再消耗。
- **加成克制**：守 C1 精神——每星加成要小且有封顶（如每星 base 五维 ×2%~5%，5 星累计 ≤25%）。数值 Planner 定。

**存档字段设计建议**（三处同改）：
- schema.ts：`CharacterNurtureData` 加 `breakthrough: number`（星级/突破次数，缺省 0）。单字段最省。若要记「已投入碎片」可另加，但突破次数单调可推导消耗，**单字段 `breakthrough` 足够**。
- 类型：types/nurture.ts `CharacterNurtureData` 加 `breakthrough: number`。
- 工厂：engine/nurture/rules.ts `createDefaultNurtureData()` 加 `breakthrough: 0`（rules.ts:166-176）。
- migrations.ts：`migrateNurtureData` 白名单对象加 `breakthrough: typeof data.breakthrough === 'number' ? data.breakthrough : 0`（旧档缺省 0，仿 statPoints 补缺省范式，migrations.ts:170-186）。
- 装配器：nurture store `serialize/deserialize` 走整个 `CharacterNurtureData`（nurture.ts:198-204，Map entries 全量），**新字段自动随行、装配器无需改**（这点与 v14/v15 不同——它们改的是 towerProgress/新域；nurture 域已全量序列化，只要 schema 类型 + 工厂 + 迁移到位即可）。⚠ 但 SPRINT 明列「装配器三改」——scout 判定：nurture 域装配器**天然覆盖新字段**（全量 entries），第三处「改动」体现为**确认 `applyPayload`→`nurture.deserialize` 链路对新字段保真** + persistence.test.ts 加断言。别为凑数硬改装配器。

**验收测试落点**：
- `migrations.test.ts`：加「v15 旧档无 breakthrough → 缺省 0」+「已存 breakthrough → 往返保留」+「v14 瘦身迁移仍 `not.toHaveProperty` 旧字段且带 breakthrough:0」。
- `stores/persistence.test.ts`：现有往返用例（:84 set statPoints/claimedBondMilestones）加 `data.breakthrough = 3` + :191 断言往返保真。
- engine 纯函数测试（`rules.test.ts` 或新块）：`breakthroughCost` / `breakthroughStatBonus` / `maxBreakthrough` 边界（0 星、满星、消耗曲线）。
- 突破动作（store 层 `breakthroughCharacter`）：消费重复卡（保留≥1）、达上限拒绝、卡不足拒绝、成功后 star+1 + 存档触发。

### 验收命令（Evaluator 亲跑）
`cd frontend-vue && npm run type-check` / `npm run test` / `npm run build`；`.venv/Scripts/python.exe backend/test_security.py`（本轮不碰后端，全 PASS）；`grep -rn "debug=True" backend/server.py api/index.py`（零命中）。**别跑 `npm run lint --fix`**（全仓重排）；单文件 `npx eslint <path>`。

---

## B. 代码地图与坑（给 Generator）

### 核心文件（本轮 SC-T3）
- **`frontend-vue/src/types/nurture.ts`**（27 行）：`CharacterNurtureData` 加 `breakthrough: number`。轴说明在文件头注释——顺手更新为「三轴：等级 + 好感 + 星级」。
- **`frontend-vue/src/engine/nurture/rules.ts`**（176 行，engine 主战场）：
  - `createDefaultNurtureData()`（:166）加 `breakthrough: 0`。
  - `MAX_CHARACTER_LEVEL`（:10）——选项 A 不动它；选项 B 才碰。
  - 新增纯函数：`breakthroughCost(star)` / `breakthroughStatBonus(star, baseStats)` / `MAX_BREAKTHROUGH`。仿 `distributeStatPointsByBase`（:130）确定成长范式（无 RNG）。
  - export 走 `engine/index.ts:19 export * from './nurture'`——新函数自动可从 `@/engine` import（3 处 View 已这么用）。
- **`frontend-vue/src/config/nurture.ts`**（77 行）：突破阈值/加成常量放这里（仿 `BOND_MILESTONES`/`TUTORING_KP_COST` 集中可调范式）。engine 纯函数**不 import config**——阈值作参数传入 engine（仿 thresholds.ts 注入范式），或 engine 定常量、config 只放 UI 文案。二选一，Planner 定；scout 倾向 engine 定数值常量（与 MAX_CHARACTER_LEVEL/POINTS_PER_LEVEL 同处，:10/:13）。
- **`frontend-vue/src/stores/nurture.ts`**（226 行）：
  - 加 `breakthroughCharacter(characterId): boolean` action：读 `collection.getCharacterCardCount`（需 import useCollectionStore）、判 `count-1 ≥ cost`、判 `breakthrough < MAX`、消耗（`collection` 需要一个「扣重复卡」的口子——见坑 3）、`nurtureData.breakthrough++`、addLog。**注意 engine 纯净**：消费判定可进 engine（`canBreakthrough(star, availableSpare)`），执行副作用（扣卡/存档）留 store。
  - `getNurtureData` 防御性补全（:52-53）加 `if (data.breakthrough == null) data.breakthrough = 0`（运行时新建/手改兜底，仿 statPoints/claimedBondMilestones）。
  - `serialize/deserialize`（:198-204）全量 Map entries——**新字段自动随行，无需改**（见 A 段装配器说明）。
- **`frontend-vue/src/stores/collection.ts`**（收藏计数 + 扣卡）：`getCharacterCardCount`（:21）现成读。**扣重复卡需新增/复用一个消耗口**——现有 `dismantleCard`（:43）是「分解换 KP」语义不合（会给 KP + 有 count>1 门槛）。SC-T3 应新增 `consumeCharacterCards(id, n)`（扣 count，防扣到 <1，无 KP 副作用）或复用底层 Map 操作。**扣卡逻辑收口到 collection store**（货币/资源单一入口精神），别在 nurture store 直改 collection 的 Map。
- **`frontend-vue/src/stores/userStore.ts`**（门面）：加 `breakthroughCharacter: (id) => { if (nurture.breakthroughCharacter(id)) { saveToServer(); return true; } return false; }`（仿 :648 claimBondMilestone 范式——成功才存档）。别用 `withSave` 无脑包（突破失败不该存档）。
- **`frontend-vue/src/infra/persistence/schema.ts`**：`CharacterNurtureData` 类型从 `@/types/nurture` import（:27），改类型只改 types 即可；`SAVE_VERSION = 15`（:37）→ `16`；文件头注释加 v16 沿革条目（仿 v14/v15 注释范式 :20-23）。
- **`frontend-vue/src/infra/persistence/migrations.ts`**：`migrateNurtureData`（:163-189）白名单对象加 `breakthrough` 缺省——**必须在白名单里显式加，禁 spread**（pitfalls S13-C1）。
- **`frontend-vue/src/stores/persistence.ts`**：装配器（buildPayload:60 `nurture.serialize()` / applyPayload:96 `nurture.deserialize`）——nurture 域全量序列化，新字段随行，**装配器代码无需改**（但这是 SPRINT「三处」的第三处：确认链路 + persistence.test.ts 加断言即算覆盖）。

### UI 落点（SC-T3 突破入口 + 进度）
- **`frontend-vue/src/views/NurtureView.vue`**（角色养成/配装页，hub characters 面板内嵌）：角色详情区加「突破」入口 + 星级进度显示。现有详情结构：`selectedCharacter`（:55）、五维 rows、好感里程碑区、补习按钮。突破卡片仿好感里程碑/补习区排布。⚠ 本轮**不改 NurtureView 壳**（min-h-screen:216 / `<h1>角色养成`:220 / 未登录空态:229）——那是 **SC-T6（第 3 轮）** 的活，本轮只在详情**内容区**加突破 UI，别顺手动壳。
- 战力注入 3 处（见 A 段 seam）：`HomesteadHubView.vue:110/:182` + `SquadBattleView.vue:265`。**突破加成必须并进这 3 处**的 `generateBattleStats`，否则战力不显形（等于突破无意义）。
- 星级显示可用现成 `bondTitleFor`/`bondTier` 同款语义色范式；星级图标/文案走皮肤令牌，**禁 text-white 压浅底、禁运行时拼动态色类**。

### 测试基建（现成，直接扩）
- `frontend-vue/src/infra/persistence/migrations.test.ts`（508 行）：v14 养成瘦身块（:149-215）+ v15 towerProgress 块（:296-333）是**直接照抄的往返范式**。SC-T3 加 v16 breakthrough 块（缺省 + 往返 + 脏档类型守卫）。
- `frontend-vue/src/stores/persistence.test.ts`（:70-84 设值 → :191 断言往返）：加 breakthrough 设值 + 断言。
- `frontend-vue/src/engine/nurture/rules.test.ts`（若存在，否则新建）：突破纯函数单测。
- `frontend-vue/src/engine/squad/combat.test.ts`：`generateBattleStats` 纯加法测试（:100-127）——若走「第 4 StatBonus 项」注入，此处逻辑不变（仍纯加法），但可加「突破 bonus 并入后战力提升」断言。

### 坑清单（本轮特别注意）
1. **[战力 3 处同源，最易漏气]** 突破加成必须同时进 `HomesteadHubView selectedFinalStats(:110) + memberPower(:182)` 与 `SquadBattleView buildCharacterStats(:265)`。只改一处 = explore 预览/详情/实战战力打架（违 SA-T2）。**强烈建议收敛成一个 helper 一次改 3 处**（或 engine 出 `breakthroughStatBonus` + 3 处各自并入并加测试守全覆盖）。SC-T5 已有「口径同源」教训，别重蹈。
2. **[拥有口径防呆]** 可消耗重复卡 = `getCharacterCardCount(id) - 1`（保留本体 1 张）。突破消费**绝不能把角色扣到 0 张**（否则角色消失、编队/塔准入连锁炸）。仿 homestead canonicalizePlacedIds / equipment sanitize 的防放大精神。
3. **[扣卡收口 collection store]** 别在 nurture store 直接操作 `collection.characterCollection` 的 Map。新增 `collection.consumeCharacterCards(id, n)`（无 KP 副作用，防扣到 <1），资源变更单一入口。`dismantleCard`（:43）语义是「分解换 KP + count>1 门槛」，不可复用作突破消费。
4. **[迁移禁 spread]** `migrateNurtureData` 是白名单重建（migrations.ts:170），加 `breakthrough` 必须在白名单对象里显式补缺省，**不能改成 `{...data, breakthrough}`**——否则 v14 删掉的旧字段（attributes/battleEnhancements…）随 spread 回潮，`not.toHaveProperty` 测试会挂（pitfalls S13-C1）。
5. **[SAVE_VERSION 只升一次]** 15→16 一次 bump，SC-T4（第 3 轮若触存档）共用。本轮别升到 17。schema.ts:37 单点改 + 文件头注释加 v16 条目。
6. **[nurture 装配器天然覆盖]** nurture 域 serialize/deserialize 是全量 Map entries（nurture.ts:198-204），新字段自动随行——**别为凑「三处同改」硬改装配器代码**，第三处体现为往返测试断言覆盖。真正需改的三处 = **types + 工厂 + migrations**（schema 类型 alias 自 types）。
7. **[选项 A vs B]** 若选 B（提等级上限），碰 `addCharacterExp` 的 `MAX_CHARACTER_LEVEL` 钳制（nurture.ts:112/134）= 核心升级路径，须守 SA-T3 确定加点测试不破。scout 倾向 A（永久小加成，零核心回归）——单轮做透。
8. **[engine 纯净]** 突破成长/消费判定进 engine 纯函数（确定成长，无 RNG 最干净）；阈值若查表作参数注入或 engine 定常量，**零 config import**（仿 thresholds.ts / rollTowerDrop 注入范式）。
9. **[不动 SC-T6 壳]** 本轮突破 UI 只加在 NurtureView 详情内容区，**别动 min-h-screen/h1/未登录空态**（那是第 3 轮 SC-T6）。避免范围交叉污染 diff。
10. **[克制加成守 C1]** 每星加成小且封顶（scout 建议每星 base ×2~5%、5 星累计 ≤25%，Planner 定）。突破是「有决策的长线」不是「战力火箭」。
11. **[范围纪律]** SC-T3 必须真落地全链（字段 + 迁移 + engine + store action + collection 扣卡 + 3 处战力注入 + NurtureView UI + 全套测试），不得只做半截（如只加字段不接战力 = 突破无意义 = SA-T6 漏做重演）。

### 后续轮落点线索（非本轮，第 3 轮 Planner 参考）
- **SC-T4（好感等级化，第 3 轮，可与 SC-T3 共用 v16）**：`config/nurture.ts BOND_MILESTONES`（:55）加永久加成字段 + `stores/nurture.ts claimBondMilestone`（:174）领取逻辑 + daily 跨天判定（复用 `daily` store，仿 SA-T5 `sweepWeekKey` 扁平字段范式）做每日好感互动。永久加成走**同 SC-T3 的战力注入 seam**（3 处）——若 SC-T4 也给永久五维%，可与突破 bonus 合并进同一 helper。好感溢出转 KP。⚠ 若 SC-T4 需新存档字段（如每日互动跨天标记），**与 SC-T3 共用 v16 bump**（本轮字段设计可预留）。
- **SC-T6（NurtureView 拆无壳组件，第 3 轮，纯 UI）**：`NurtureView.vue` 去 min-h-screen(:216)/页级 h1(:220)/独立未登录空态(:229) → hub characters 面板内嵌无双标题/双空态。`/nurture` router 重定向须仍可用。⚠ SC-T6 会大改 NurtureView 模板——**SC-T3 本轮加的突破 UI 要写得内聚**（独立小块），方便第 3 轮 SC-T6 整体重构时平移。

---

## C. 新发现的坑

1. **[nurture 装配器与 v14/v15 不同型]** SPRINT 反复强调「装配器三改」，但 nurture 域的 serialize/deserialize 是**全量 Map entries 透传**（nurture.ts:198-204），加字段无需改装配器代码——这与 v14（改 towerProgress 具名字段）/v15（改 sweep 字段）的「装配器逐字段」不同型。Generator 若照抄「三处都要改代码」会在装配器无处下手而困惑。**真实三改 = types(字段) + rules 工厂(缺省) + migrations(迁移缺省)**；schema 类型自 types alias；装配器/store 序列化天然覆盖。第三处的「验证」义务 = persistence.test.ts 往返断言。
2. **[战力注入是 3 处 View 而非 store]** 战斗属性组装（`generateBattleStats`）散落在 3 个 View（HomesteadHubView×2 + SquadBattleView×1），**没有统一的 store/util 组装函数**。SC-T3 突破加成注入面 = 这 3 处。这是既有架构债（战力组装未收口到 store），SC-T3 可顺手引入一个共享 helper（如 `utils/battleStats.ts` `resolveMemberBattleStats(character, nurtureData, equipBonus)` 或 store getter）一次收口 3 处——**低成本收敛 + 防漏气 + 利于 SC-T4 复用**。若不收口，务必 3 处逐一改 + 测试守全覆盖。
3. **[扣卡口缺失]** collection store **没有**「消耗 N 张重复角色卡且保留本体」的现成口——`dismantleCard`(:43) 语义不符（换 KP + count>1 门槛且一次只扣 1 张逻辑）。SC-T3 需新增 `consumeCharacterCards(id, n)`。这是本轮唯一需在 collection 域动的地方，别绕过它直改 Map。
4. **[docs/orch/eval.md 是第 1 轮的]** 现存 eval.md 记录第 1 轮 SC-T1/T2/T5 COMPLETE（687 tests / 59 files 全绿基线），本轮完成后测试数会增。可作回归基线参照（本轮新增测试后总数应 ≥ 687）。

---

## 一句话可行性
scout.md 已写（Iteration 2，聚焦 SC-T3）；**SC-T3｜星级突破可行 ✅ 高**——存档三改真实义务 = types 加 `breakthrough` 字段 + rules 工厂缺省 + migrations 白名单缺省（nurture 装配器全量透传天然覆盖，SAVE_VERSION 15→16 一次 bump），消费走新增 `collection.consumeCharacterCards`（保留本体 1 张，拥有口径防呆），突破永久小加成经 engine 纯函数（建议确定成长无 RNG）**必须同时注入 3 处战力 seam**（HomesteadHubView selectedFinalStats/memberPower + SquadBattleView buildCharacterStats，强烈建议收敛成共享 helper 防漏气），UI 加在 NurtureView 详情内容区（不动壳，壳是第 3 轮 SC-T6），scout 倾向「永久小加成不提等级上限」的选项 A 以零核心回归单轮做透。
