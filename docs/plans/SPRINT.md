# AnimePlay — SPRINT 合同（S14-E：装备深度）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-E 全部任务（SE-T1..SE-T3）**。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S14-E，**绝不表示可以跳过本轮被指派的 SE-T 任务**（S14-A SA-T6、S14-B 暴击UI显形均曾因此被漏，严禁重演；见 pitfalls）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14-E、`docs/orch/homestead-hub-audit-report.md`（P1-7 / P2-14 / P2-15 / P2-16 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 相关面：装备 `config/equipment.ts`（`EquipmentDef` 目录 + bonus 五维 + homeEffect + 兑换价 + `dismantleValueForRarity`）+ `stores/equipment.ts`（inventory/equip/`resolveEquipBonus`/`dismantleItem`）+ `components/nurture/{EquipPickerModal,InventoryPanel}.vue`；战力口径 `engine/squad/combat.ts`（`generateBattleStats`）+ `utils/battleStats.ts`（`resolveMemberBattleStats`）+ `engine/squad/formulas.ts`（`BattleModifiers`：critRate/critDamage/damageUp/damageTakenUp/healUp/shieldUp）；战斗建 setup `views/SquadBattleView.vue`；养成后战力单一 seam `engine/nurture/rules.ts resolveNurturedBattleStats`；存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（当前 SAVE_VERSION=17）。
- 本 Sprint = **S14-E 装备深度**：把「装备拿到即毕业、纯线性五维、无搭配维度」补成「装备有可持续消耗（强化）、有搭配空间（套装/条件加成）、能够到更多战斗旋钮（modifier），装备开始塑造角色定位」。

## 现状根因（S14-E 逐个拆解）
1. 装备拿到即毕业（P1-7）：`EquipmentItemSave` 仅 `{uid,defId}`，数值恒等于 def 静态值，无强化/等级，拿到同槽 UR 即永久毕业、无可持续消耗。
2. 无搭配维度（P2-14/16）：任意角色戴任意、稀有度纯线性预算、无套装/条件加成，`InventoryPanel` 按稀有度排序即最优解。
3. 战斗旋钮够不到（P2-15）：`formulas.ts` 已内建 critRate/critDamage/damageUp/healUp 等且真实消费（SB-T3 已激活暴击），但 `EquipmentDef.bonus` 只支持五维，装备够不到这些旋钮。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/IO/`Math.random`；强化/套装/modifier 解析走纯函数，随机走注入 RNG）/ 依赖只向下 / **货币只走 `profile.spend·earn`**（强化花 KP 必须走它）/ 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改战斗或装备规则前先看对应 `*.test.ts`。**别破坏 S14-A/B/C/D 已成 22 项**（尤其：养成后战力单一 seam `resolveNurturedBattleStats`/`resolveMemberBattleStats`——装备强化/套装/modifier 必须经既有 seam 进战力，**严禁另拼第 N 套战力口径**；SB-T3 暴击轴；SD-T2 装备 homeEffect 弱化 + comfort 保留；SD-T3 dismantleItem）。
**存档变更协议（SE-T1 需要）**：新增/改存档字段必须 **schema + migrations + 装配器（stores/persistence.ts）三处同改 + 往返测试**；SAVE_VERSION 现=17，本 Sprint 升 **18**（一次 sprint 只升一次，`EquipmentItemSave` 加强化字段 + 任何其它新字段共用同一 bump；v17→v18 迁移把旧档实例补默认强化等级 0）。SE-T2/SE-T3 若走静态 def 派生则无需存档。

## 任务清单（S14-E = SE-T1..SE-T3）

- [x] **SE-T1｜装备强化 / 等级（P1-7，本 Sprint 唯一存档变更，v18）**
  - 目标：给 `EquipmentItemSave` 加强化等级（enhance/level），用 **KP（`profile.spend`）+ 强化燃料**（重复装备/材料，衔接 SD-T3 分解已留的 KP 回收口）升级，每级按比例提升该实例的五维加成；把毕业曲线从「拿到即满」拉长为「拿到 → 强化到满」。强化后的 bonus **必须经既有 `resolveEquipBonus` seam** 进战力（不另拼口径）。存档三处同改 + 往返测试 + **SAVE_VERSION→18**（v17→v18 旧档实例补 enhance=0）。UI 在 EquipPicker/背包给强化入口 + 等级/花费/下一级增益展示。
  - 验收：装备可 KP+燃料强化、强化真实提升五维且经 resolveEquipBonus 进战力、进度存档往返保真；engine 纯函数（强化增益/成本）测试 + v18 迁移往返测试；不破坏 SD-T3 分解与装备系统；type-check/test/build 通过。
- [x] **SE-T2｜确定性套装 / 原型条件加成（P2-14 / P2-16）**
  - 目标：加**确定性套装**（2~3 组：给 `EquipmentDef` 加 setId，同套装齐 N 件 → 额外加成）或**对匹配原型角色的条件加成**（装备带原型倾向标签，戴在匹配 archetype/role 的角色上给条件加成，复用 SC-T1 `resolveRole`）。塑造 build 搭配空间。**随机副词条不做**（审计对标：PCR rank 装是确定属性无随机 roll，随机词条=原神/暗黑刷取，与单机向定位不符——优先确定性套装/条件加成）。套装/条件加成经既有 seam 进战力。**无存档改动**（派生自 equipped defIds + 角色 role）。
  - 验收：齐套/匹配原型给确定额外加成且真进战力、不匹配不给；engine 纯函数测试（套装计数/条件命中）；不破坏 resolveEquipBonus 单件求和；type-check/test/build 通过。
- [x] **SE-T3｜扩展 EquipmentDef 支持战斗 modifier（P2-15）**
  - 目标：给 `EquipmentDef` 加可选 modifier 字段（critRate/critDamage/damageUp/healUp/shieldUp 等，`BattleModifiers` 子集），新增 `resolveEquipModifiers(charId)` 纯解析（三件已装 modifier 求和），在小队战斗建 setup 时注入 `BattleModifiers`（与 SB-T3 的 BASE_CRIT_RATE 叠加）。让装备够到五维之外的战斗旋钮。给少量装备（如 UR 武器带 critRate、supporter 带 healUp）示例填充。**无存档改动**（modifier 在静态 def）。
  - 验收：带 modifier 的装备真实改变战斗（如 critRate 装备提升暴击率，特征测试断言注入生效）、与 BASE_CRIT_RATE/critRateUp 正确叠加；engine/combat 测试；不破坏现有战斗；type-check/test/build 通过。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **SE-T1**（装备强化 v18，唯一存档变更，单独一轮做透三改+往返测试）。
> - 第 2 轮 = **SE-T3**（EquipmentDef modifier → BattleModifiers，衔接 SB-T3 暴击轴，纯静态无存档）。
> - 第 3 轮 = **SE-T2**（确定性套装/条件加成）+ 收尾（确保 SE-T1..T3 全 `[x]`、无回归）。
> 每轮务必保持验收命令全绿、每子项独立可合并。v18 bump 仅第 1 轮做一次。强化/套装/modifier 三者最终都要经既有战力 seam 汇入，别各拼各的口径。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 equipment/combat/migrations 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-E 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SE-T* 任务全部 `[x]` 并与实现一致。**S14-E 整体完成** = SE-T1..SE-T3 全 `[x]`。

---

## 第 1 轮追加任务（S14-E 第 1/3 轮，product-loop --tier1 on --mode all）

> 本轮指派切片 = **SE-T1｜装备强化 / 等级（v18，本 Sprint 唯一存档变更）**。以下为本轮承诺 + 采纳的三审 refine 子项 + 关键设计决策拍板。主清单 SE-T1 条目见上文，此处不重复其原文，只固化本轮落地边界与验收拍板。

### 关键设计决策拍板（SE-T1）
- **强化等级上限 = 5 级**（Lv.0→Lv.5，有限可预期，不做无限强化）。
- **每级增益 = 确定性比例、线性档**：每级对该实例 def.bonus 五维整体 +8%（就近取整到整数，逐维），满级 Lv.5 ≈ +40% 该件。零 RNG、可预期、每级增益 > 前一级。**严禁随机 roll**。
- **增益折算走单一纯函数**（放 `config/equipment.ts`），`resolveEquipBonus` 求和前逐件套用；配装弹窗预览、候选展示、实战三处**必须同源**消费此函数（防「预览≠实战」复发）。
- **燃料 = 同 defId 的游离重复装备实例（主燃料）+ KP（走 `profile.spend`）**：每次强化消耗 1 件同 defId 游离实例 + 一档 KP 成本；KP 成本按稀有度 + 目标等级递增（指数感，「爽点前移」：低级便宜、高级贵）。**KP 成本必须远高于该件分解回收值 `dismantleValueForRarity`**（防「拆件强化」净正套利/通胀）。正在装备中的实例、被强化件自身不可当燃料（复用 `findEquippedBy` 守卫）。
- **升 SAVE_VERSION = 18**（本 Sprint 仅此一次 bump）。`EquipmentItemSave` 加 `enhance: number`（旧档补 0，clamp 到 [0,5]）。
- **modifier 恒定、不随强化涨**（为第 2 轮 SE-T3 划边界，避免 SE-T1 强化 UI 让玩家误以为 modifier 也涨）——本轮仅注释钉死，不做 SE-T3。

### 本轮承诺子项（[ ] 验收）
- [x] **SE-T1a｜enhance 存档字段 + v18 三处同改 + 往返测试**：`schema.ts`（`EquipmentItemSave.enhance` + `SAVE_VERSION=18` + 版本沿革注释）+ `migrations.ts`（`migrateEquipment` 白名单重建 `{uid,defId,enhance}`，旧实例补 `enhance:0`，clamp [0,5]）+ 装配器（`stores/persistence.ts` 经 store serialize/deserialize；`sanitizeEquipped` / `serialize` / `deserialize` 浅拷贝带上 enhance）。验收：`migrations.test.ts` 补 v17→v18——旧档 `{uid,defId}` 迁移后有 `enhance:0` 且强化前后战力不变、新档带 enhance 往返保真、`not.toHaveProperty` 守脏字段。
- [x] **SE-T1b｜强化增益纯函数 + 经 resolveEquipBonus 单一 seam 进战力**：新增 `enhancedBonus(defBonus, enhance)` 纯函数（config/equipment.ts）；`resolveEquipBonus` 逐件套用后求和。验收：`config/equipment.test.ts` 断言每级增益确定、递增、满级封顶；`stores/equipment.test.ts` 断言强化后 `resolveEquipBonus` 提升、且经 `resolveMemberBattleStats` 真进战力（不另拼口径）。
- [x] **SE-T1c｜强化 action（KP+燃料，货币走 spend，燃料先校验后扣）**：`enhanceItem(uid)` + `getEnhanceCost(uid)`（返回 KP 成本 + 所需燃料件数/剩余）；花 KP 走 `profile.spend('knowledgePoints')`，燃料吃 1 件同 defId 游离实例，正在装备/被强化件不可当燃料（`findEquippedBy` 守卫）；满级/KP 不足/燃料不足拒绝且不变更。验收：`stores/equipment.test.ts` 断言成功强化扣 KP+燃料、满级拒绝、余额/燃料不足拒绝、不吃装备中实例。
- [x] **SE-T1d｜强化 UI 入口（嵌入 EquipPickerModal，复用 delta 语言）**：选中候选件 → 展开强化子区（等级进度显形如 ●●●○○ Lv.3/5 + 下一级增益 delta + 消耗「同件×1 + N KP」+ 拥有量 + 强化按钮）；不足禁用 + 差额提示；满级置灰「已满级」。**复用 EquipPickerModal 现成「当前→新值(+Δ)」delta 语言，不另开弹窗、不无脑追加行**。背包/候选展示强化后 bonus 而非 def.bonus（同源）。
- [x] **SE-T1e｜回归**：不破坏 SD-T3 分解（`findEquippedBy` 守卫）、SD-T2 homeEffect 弱化 + comfort、facility v17、战力单一 seam；type-check / test / build 全绿。

### 采纳的 Nice-to-have（本轮可做，不阻塞验收）
- [x] **SE-T1f（🟢）｜InventoryPanel 强化等级角标**（如 UR 徽章旁 +3），一致性加分、低成本。

---

## 第 2 轮追加任务（S14-E 第 2/3 轮，product-loop --tier1 on --mode all）

> 本轮指派切片 = **SE-T3｜扩展 EquipmentDef 支持战斗 modifier（P2-15）**——让装备够到五维之外的战斗旋钮（暴击/增伤/治疗/护盾），与 SB-T3 暴击轴天然衔接。**纯静态派生、无存档改动**（modifier 在静态 def，SAVE_VERSION 维持 18 不再 bump）。
> 前情：第 1 轮 SE-T1（装备强化 v18）已在工作树落地并经 Scout 复验全绿（type-check/test 通过、v17→v18 迁移往返测试与 enhanceItem action 测试齐备）。本轮不得把 SE-T3 降级为「回归确认」（前车之鉴 SA-T6 / S14-B 暴击 UI 被误判「新范围」漏做）。**若 SE-T1 主清单 checkbox 仍落后于代码，本轮顺手补勾并让 Evaluator 复验。**

### 关键设计决策拍板（SE-T3）
- **modifier 字段范围 = 首版只填「缺省为 0 的加法维」**：`critRate` / `damageUp` / `healUp` / `shieldUp`（纯加语义，spread 覆盖不会冲掉基数）。**`critDamage` 首版不填**（缺省 1.5 是乘区基数，装备加成语义歧义「+Δ 加到 1.5」vs「覆盖」，且 `createRuntimeUnit` 用 spread 整体覆盖会把 1.5 冲掉）；`damageTakenUp` 首版不填（负向减伤语义复杂）。字段类型 = `Partial<BattleModifiers>` 子集。
- **modifier 幅度「小而有感」**：UR 武器 `critRate ≈ +0.05~0.08`、supporter `healUp ≈ +0.10`、少量示例填充即可（不是每件都带）。**同类 modifier 求和后硬 clamp**（`critRate` 加成 ≤ 0.20，防三件叠爆暴击轴）——clamp 在纯解析函数内做。
- **注入点 = View seam 加法，engine 不改**：在小队战斗建 setup（`SquadBattleView` 的 `unitSetups`/`toSetup` factory）给 **player 侧** `SquadUnitSetup.modifiers` 填 `resolveEquipModifiers(charId)`，**敌方不给**。该 modifiers 经 `createRuntimeUnit` 以 `{ ...DEFAULT, critRate: BASE_CRIT_RATE, ...setup.modifiers }` 叠加——装备 critRate 会正确叠在 `BASE_CRIT_RATE(0.05)` 之上，与 SB-T3 暴击轴天然衔接。**engine `createRuntimeUnit` 语义不改**（spread 覆盖），故 `resolveEquipModifiers` 只填默认 0 的维即安全。
- **与暴击轴叠加上限**：装备 critRate 求和 clamp ≤ 0.20 后再注入；`BASE_CRIT_RATE`(0.05) 是 engine 内基线、由 spread 顺序保证叠加（`resolveEquipModifiers` 只返回「装备额外增量」，不含 BASE）。
- **modifier 恒定、不随强化涨**（承接第 1 轮 SE-T1 已钉死的边界）：`resolveEquipModifiers` **绝不套 `enhancedBonus`**——只有五维 bonus 走强化，modifier 是静态 def 值。两条 seam 不混用。
- **无存档改动**：modifier 在静态 `EquipmentDef`，SAVE_VERSION 维持 18。**本轮不碰 schema/migrations/装配器。**
- **与 SE-T2 正交**（SE-T2 是第 3 轮切片）：SE-T3 只碰 modifier 乘/加区、SE-T2 只碰五维加法，两条互不干扰，本轮不做 SE-T2。

### 本轮承诺子项（[ ] 验收）
- [x] **SE-T3a｜`EquipmentDef.modifier` 静态字段**：给 `EquipmentDef` 加可选 `modifier?: Partial<BattleModifiers>`（config/equipment.ts），首版只用 `critRate/damageUp/healUp/shieldUp` 子集；给少量示例装备填充（UR 武器带 critRate、supporter 带 healUp）。验收：type-check 通过；示例装备 def 含 modifier；不影响未带 modifier 的装备（缺省不生成 modifier）。
- [x] **SE-T3b｜`resolveEquipModifiers(charId)` 纯解析 + 同类 clamp**：新增 store action（仿 `resolveEquipBonus` 结构，三槽已装 modifier 逐维求和），**不套 `enhancedBonus`**（modifier 恒定）；同类维求和后硬 clamp（critRate ≤ 0.20）。验收：`stores/equipment.test.ts` 断言三槽 modifier 正确求和、缺省维为 0、clamp 生效（三件叠加不超上限）、modifier 不随 enhance 变化。
- [x] **SE-T3c｜View seam 注入（player 侧，敌方不给）+ 与 BASE_CRIT_RATE 叠加**：在 `SquadBattleView` 建 setup 时给 player 侧 `SquadUnitSetup.modifiers` 填 `resolveEquipModifiers(member.character.id)`，敌方 setup 不填。验收：特征测试断言装备 critRate 经 setup→`createRuntimeUnit` 正确叠在 `BASE_CRIT_RATE` 之上（runtime modifiers.critRate = BASE + 装备增量）、装备 healUp/damageUp/shieldUp 注入生效；敌方无装备 modifier。
- [x] **SE-T3d｜EquipPicker/背包文案显示 modifier（可读性）**：带 modifier 的装备在配装弹窗/候选/背包显示 modifier 文案（`formatModifier` helper，如「暴击率 +5%」「治疗量 +10%」），与五维 bonus 并列展示；不带 modifier 的装备不显示该行。**颜色走皮肤语义令牌**，复用现有 delta/分区语言，不另开弹窗。验收：type-check 通过；带 modifier 装备显示对应文案；不带的不显示。
- [x] **SE-T3e｜回归**：不破坏 SE-T1 强化五维 seam（`resolveEquipBonus` 与 `resolveEquipModifiers` 是两条独立 seam）、SB-T3 暴击轴、战力单一 seam、S14-A..D + SE-T1 各项；**顺手核对并补勾 SE-T1 主清单 checkbox**（若仍落后于代码）；type-check / test / build 全绿。

### 采纳的 Nice-to-have（本轮可做，不阻塞验收）
- [x] **SE-T3f（🟢）｜modifier 装备在 InventoryPanel/角标视觉标记**（⚡ 图标 + text-highlight 语义色标，背包卡/配装候选/商店三处并列展示）（如带 modifier 的装备加一枚「暴击/治疗」图标或色标），一致性加分、低成本；颜色走语义令牌。

---

## 第 3 轮追加任务（S14-E 第 3/3 轮，收尾轮，product-loop --tier1 on --mode all）

> 本轮指派切片 = **SE-T2｜确定性套装（P2-14 / P2-16）**——S14-E 最后一块拼图，把装备从「一维稀有度条」补成「强化(纵) × modifier(横) × 套装(搭配)」三维 build 空间。**必须真落地、严禁降级为「回归确认」**（前车之鉴 SA-T6 / S14-B 暴击 UI 被误判「新范围」漏做；本轮 SE-T2 是 Sprint 合同内第 3 任务、checkbox 仍 `[ ]`，属 in-scope）。
> **方案抉择拍板：本轮只做「确定性套装」（方案 A / research 替代 C），条件加成（原型/archetype 亲和）标 backlog 本轮不做**——四审一致收敛：套装纯 config/store 闭环、零跨 store 依赖、回归风险最低、build 深度不输条件加成而成本仅约 1/3；条件加成需解析 `getArchetypeForCharacter`（引入 equipment store → gameDataStore 新依赖或改 `resolveEquipBonus` 签名波及 4 消费点），性价比不划算。**SPRINT 主清单 line 29 写的「复用 SC-T1 resolveRole」不采纳（且代码里无 `resolveRole` 导出），随之整条条件加成路径 backlog。**
> **纯静态派生、无存档改动**：套装派生自 equipped 三槽 defId，SAVE_VERSION 维持 18（不再 bump），不碰 schema / migrations / 装配器。

### 关键设计决策拍板（SE-T2）
- **形态 = 3 组「取向」套装（攻击 / 坦度 / 节奏），跨稀有度打标签，不新增装备**（research 替代 C + product 🟡-1）。攻击套偏 atk/sp、坦度套偏 hp/def、节奏套偏 spd/sp；每组在武器/防具/支援三槽各有成员（凭 setId 归属，不限稀有度）。凑齐一套可能需混稀有度 → 玩家在「凑套取向」与「堆最高稀有」之间产生**真实互斥取舍**（对冲 P2-14「按稀有度排序即最优解」），这是本轮最该守住的产品意图。**低稀有度（R/SR）也铺可凑套成员，让「凑套 > 单件」的啊哈前移**（product 🟢-2）。
- **触发 = 单角色三槽内 setId 计数，齐 2 / 齐 3 件阶梯加成**（阶梯式、齐 2 就先给一档、齐 3 给满档），判定域严格限单角色三槽（不跨 charId，守 `resolveEquipBonus` 单角色语义）。
- **奖励只碰五维、纯加法、确定值**：套装奖励是「装备整体」的确定性五维加法附加项（不属任一单件）。**绝不塞 critRate/damageUp 等 modifier**（否则绕过 SE-T3 的暴击轴 clamp 护栏叠爆战斗旋钮）；**绝不套 `enhancedBonus`**（不随强化放大，与强化正交、防「强化 × 套装」双乘膨胀）；**绝不随机 roll**（随机副词条本 Sprint 已拒绝，与单机向定位 + SE-T1 确定曲线心智一致）。
- **幅度 = 「齐套 ≈ 提升半个稀有度档」**（product 🟡-2 / research A7）：太大 → 套装必选、散件无意义；太小 → 玩家无感退回按稀有度排序。3 套的阶梯奖表**集中在 config 一处**（类似 `EQUIPMENT_PRICES`），改一处调全体、测试锁死量级。
- **单一 seam：套装加成经既有 `resolveEquipBonus` 汇入**（在逐件 `enhancedBonus` 求和之后追加套装项，一并进 `sumStatBonus`）——改这一处，实战 / 养成详情 / 家园 explore 三个消费点自动生效。**严禁另拼第 N 套战力口径。**
- **头号护栏：EquipPickerModal 换装预览必须与实战同源**（scout C-1 / research A8 本轮头号坑）：`previewEquipBonus` 内联重算三槽求和，必须用「替换当前槽后的假设 defId 列表」调**同一个** config 套装纯函数，否则「装上第 3 件套装件预览没涨、进战斗却涨了」的预览≠实战复发（pitfalls S13-C2）。
- **有行为必有描述**（product 🔴-3）：候选/背包显示 setId 归属 chip + 配装弹窗显示「齐几件 / 齐套奖励 delta」，否则套装隐形 = 没做。信息密度分工：候选卡只加 setId chip，进度「2/3」+ 齐套奖 delta 放右栏子区（仿「装备强化」子区分隔线范式），复用现有 delta 语言，不无脑追加行、不另开弹窗。
- **无存档改动**：setId 是 `EquipmentDef` 静态字段（同 SE-T3 的 `modifier?`），**不进 `EquipmentItemSave`**（进则触发升档，违反本轮无存档改动）；SAVE_VERSION 维持 18。
- **与 SE-T1 / SE-T3 正交**：SE-T2 只碰五维加法，SE-T1 强化只放大单件五维、SE-T3 只碰 modifier 加/乘区，三条互不干扰。

### 本轮承诺子项（[ ] 验收）
- [x] **SE-T2a｜`EquipmentDef.setId` 静态字段 + 套装目录 + 齐套加成表**：给 `EquipmentDef` 加可选 `setId?`（config，仿 SE-T3 `modifier?` 样式 + 「恒定不随强化涨」注释）；新增集中的套装目录 / 阶梯奖表（3 组取向套装，含每套名称、成员 defId、齐 2 / 齐 3 阶梯五维加成）；给现有 EQUIPMENT_CATALOG 成员打 setId 标签（覆盖三槽 + 跨稀有度含 R/SR）。验收：type-check 通过；setId 引用的 defId 都存在于 catalog；每套三槽都有成员；未打标签的装备缺省无 setId。
- [x] **SE-T2b｜config 纯函数 `setBonusFor`（单角色三槽内 setId 计数 → 阶梯五维加成）**：新增纯函数（仿 `sumEquipModifiers` / `sumHomeEffects` 结构与注释），入参 = 三槽 defId 列表，按 setId 计数、齐 2 / 齐 3 阶梯累加固定五维加法；**不套 `enhancedBonus`、不含任何 modifier、零 RNG**。验收：`config/equipment.test.ts` 断言齐 2 / 齐 3 阶梯给确定加成、缺件不给、多套并存正确、只统计已装 defId、加成恒定且只碰五维；套装目录填充断言。
- [x] **SE-T2c｜套装加成经 `resolveEquipBonus` 单一 seam 汇入**：改 store `resolveEquipBonus` 在逐件求和之后追加 `setBonusFor(三槽 defIds)` 一并 `sumStatBonus`（前 3 个消费点自动生效）；**不动** `resolveEquipModifiers`（SE-T3）/`enhanceItem`/`dismantleItem`（`findEquippedBy` 守卫）/存档序列化。验收：`stores/equipment.test.ts` 断言齐套后 `resolveEquipBonus` 提升且经 `resolveMemberBattleStats` 真进战力、缺件不给、套装加成不随 enhance 变化；**0 套装件时 `resolveEquipBonus` 输出与 SE-T2 前逐字节一致**（既有断言不改而全绿）；敌方侧不吃套装加成。
- [x] **SE-T2d｜EquipPickerModal 换装预览同源（头号护栏）+ 套装显形**：`previewEquipBonus` 用「替换当前槽后假设 defId 列表」调同一 `setBonusFor`，与 `currentStats` 口径一致算对 delta；配装弹窗右栏子区显示套装进度（如「攻击套 2/3」）+ 齐套奖 delta，候选卡加 setId chip。**颜色走皮肤语义令牌**，复用 SE-T3 `formatModifier` / `text-highlight` + delta 语言，不另开弹窗、不无脑追加行。验收：换装 delta 预览含套装增量（预览 = 实战）；带 setId 装备显示归属 + 进度 + 齐套奖；type-check 通过。
- [x] **SE-T2e｜回归 + 收尾核对**：不破坏 SE-T1 强化五维 seam（`resolveEquipBonus` 逐件 `enhancedBonus` 求和不被污染）、SE-T3 modifier 独立 seam、SB-T3 暴击轴、战力单一 seam、S14-A..D + SE-T1/SE-T3；**收尾把 SE-T2 主清单 line 28 + 本轮子项从 `[ ]` 补 `[x]`，确认 SE-T1..T3 全 `[x]`**（S14-E 完成判据）；type-check / test / build 全绿。

### 采纳的 Nice-to-have（本轮可做，不阻塞验收）
- [x] **SE-T2f（🟢）｜套装 chip 在 InventoryPanel 背包卡显示**（复用 SE-T3f ⚡ 角标位范式，与配装弹窗一致），一致性加分、低成本；颜色走语义令牌。
- [ ] **SE-T2g（🟢）｜齐套瞬间套装 chip 点亮 + 战力 delta 复用既有 transition**（product 🟢-1，克制的正反馈，不新造粒子）。 — 未做：配装确认后弹窗即关闭，无「齐套瞬间」的常驻动画位；不阻塞验收，标 backlog。
