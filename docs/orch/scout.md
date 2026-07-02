# Scout Report — Iteration 3 / 3（S14-E 第 3 轮，指派切片 = SE-T2｜确定性套装 / 原型条件加成）

> product-loop `--tier1 on --mode all`。前两轮 SE-T1（装备强化 v18）+ SE-T3（EquipmentDef 战斗 modifier）均已在工作树落地并经 Evaluator 亲验全绿（见 eval.md：815 测试通过、type-check/build PASS、SAVE_VERSION=18）。本轮做 **SE-T2**，收尾 S14-E。
> **范围纪律**：SE-T2 是 Sprint 合同内的第 3 个任务、当前 checkbox 仍 `[ ]`（SPRINT.md line 28）——**它是 in-scope，必须真实现，严禁降级为「回归确认」**（前车之鉴 SA-T6 / S14-B 暴击 UI）。tier1-on 跑满轮次 ≠ 目标达成；Orchestrator 收尾须核对 SE-T1..T3 全 `[x]`。

---

## A. 约束与可行性（给 Planner）

### A0. 三审方案在代码里成立性核实（本轮切片 SE-T2）
SPRINT 拍板（line 28-29）：加**确定性套装（EquipmentDef 加 setId，齐 N 件额外加成）**或**原型条件加成（装备带原型倾向标签，戴匹配 archetype/role 角色给条件加成，复用 SC-T1 resolveRole）**；**随机副词条不做**（单机向定位）；套装/条件加成经既有 seam 进战力；**无存档改动**（派生自 equipped defIds + 角色 role）。核实结论：**两条路都成立，但成立性/成本差异大**——

| 方案 | 依赖面 | 是否需跨 store 依赖 | 与「预览≠实战」坑的距离 | 推荐 |
|---|---|---|---|---|
| **A｜确定性套装（setId）** | 仅 equipped 三槽 defIds | 否（纯 config 派生） | 中（需同步 EquipPickerModal 预览，见 C-1） | **首选** |
| B｜原型条件加成（role） | equipped defIds + 角色 archetype | **是**（equipment store 需 gameDataStore.getCharacterCardById + squadSkillKits.getArchetypeForCharacter） | 高（预览需拿到 char 才能算，seam 更复杂） | 次选/可叠加 |

**给 Planner 的拍板建议**：**首版只做方案 A（确定性套装）**，与 SPRINT「优先套装」一致、无跨 store 依赖、纯 defIds 派生最干净。方案 B（role 条件加成）若要做，把它当第二条正交加成叠加，但它引入 `equipment store → gameDataStore` 依赖（当前 equipment store 只依赖 profile），且预览 seam 需 char 参数——成本明显更高，建议本轮不做或仅留类型口子。**无论 A/B，核心风险都是「新加成必须在所有 4 个 resolveEquipBonus 消费点同源生效」，见 A2 + C-1。**

### A1. 存档：确认无需升档，SAVE_VERSION 维持 18
- SE-T2 派生自 `equipped` 三槽 defId（方案 A）或 + 角色 role（方案 B），**均不新增/改存档字段**。SAVE_VERSION 维持 18（schema.ts:48），**本轮不碰 schema / migrations / 装配器**（与 SE-T3 同为「纯静态派生无存档」）。
- setId 是 `EquipmentDef` 静态字段（同 SE-T3 的 `modifier?`），**不进 `EquipmentItemSave`**（否则触发升档，违反本轮「无存档改动」）。

### A2. 战力单一 seam：套装/条件加成必须经 `resolveEquipBonus` 汇入（不另拼口径）
- 铁律（SPRINT line 20 + pitfalls S13-C2）：**装备强化/套装/modifier 三者最终都要经既有战力 seam 进战力，别各拼各的口径**。
- 五维加成（含套装额外五维）的单一 seam = `stores/equipment.ts resolveEquipBonus(charId)`（equipment.ts:241）。**套装的额外五维加成应在此函数内、逐件 `enhancedBonus` 求和之后追加**（作为「装备整体」附加项，不属任一单件、不参与强化放大——套装加成是确定性固定值，**不套 enhancedBonus**，与 SE-T3 modifier 恒定同理，见 C-4）。
- **若套装额外加成走 modifier 维（如齐套 +critRate）而非五维**，则应改经 `resolveEquipModifiers`（equipment.ts:263）而非 `resolveEquipBonus`。首版建议**套装只给五维加成**（走 resolveEquipBonus，复用 engine `sumStatBonus`），不碰 modifier 维，避免又要动 View 注入 seam。
- **严禁**新建第 N 套战力汇总函数。`resolveMemberBattleStats`（utils/battleStats.ts:37）是玩家侧唯一战力口径，吃 `resolveEquipBonus(charId)` 产物——套装加成进了 resolveEquipBonus 就自动进全站战力。

### A3. resolveEquipBonus 的 4 个消费点（新加成必须 4 处同时生效）
1. `views/SquadBattleView.vue:272` — 实战 buildCharacterStats（player 侧）。
2. `views/NurtureView.vue:97` — 养成详情 finalStats。
3. `views/HomesteadHubView.vue:111` — explore memberPower/squadPower。
4. **`components/nurture/EquipPickerModal.vue:151` previewEquipBonus — ⚠️ 不调 resolveEquipBonus，而是内联重算三槽求和**（见 C-1，「预览≠实战」历史复发点）。

前 3 处直接调 `resolveEquipBonus(charId)`，套装加成进函数即自动生效。**第 4 处 EquipPickerModal 是唯一需手动同步的地方**——它内联 for-loop 累加 `enhancedBonus(def.bonus, item.enhance)`（equipment.ts 之外重复实现），换装 delta 预览不会自动带上套装加成。

### A4. 「原型条件加成」（方案 B）复用 SC-T1 的确切 API
- SC-T1 定位单一入口：`data/squadSkillKits.ts` **`getArchetypeForCharacter(character: CharacterCard, activeSkill?, passiveSkill?): SquadArchetype`**（line 697，已 export）。返回值 `SquadArchetype = 'striker'|'guardian'|'support'|'controller'|'arcane'|'tactical'`（line 30，**该 type 本身未 export**——若 config 侧要标注 role 标签类型，需从 squadSkillKits 补 export，或在 config 就地重声明同一 union）。
- **注意**：SPRINT 写「复用 SC-T1 resolveRole」，但代码里**没有名为 `resolveRole` 的导出**——实际入口是 `getArchetypeForCharacter`（内部函数叫 `resolveArchetype`，未导出）。Planner/Generator 别去找 `resolveRole`（见 C-2）。
- 方案 B 依赖代价：`getArchetypeForCharacter` 需完整 `CharacterCard`。equipment store 目前**只 import profile store**；要在 store 层算 role 条件加成，得引入 `gameDataStore.getCharacterCardById(charId)`（HomesteadHubView.vue:105 已有此调用样板）——即 equipment store → gameDataStore 新依赖（见 C-3）。

### A5. engine 纯净 / 颜色 / 组件清理（不可违反）
- **engine 零改动**：套装/条件加成解析全在 config（纯函数）+ store（查表编排），engine 不参与。别往 engine 写 config import（pitfalls：engine 靠注入不反向依赖 config；`sumStatBonus(bonuses[])` 已是收口）。
- 若加 UI（套装齐套高亮 / 条件命中标记）：颜色走皮肤语义令牌（accent/highlight/warning…），禁 text-white 压浅底、禁动态色类拼接（`bg-${x}`）。参照 SE-T3 的 `text-highlight` + ⚡ 图标样板（EquipPickerModal / InventoryPanel）。
- 组件内 setTimeout/setInterval 登记 + onUnmounted 清除（本轮多半纯计算无定时器，但若加动画注意）。

---

## B. 代码地图与坑（给 Generator）

### B1. `config/equipment.ts`（核心改动地，纯数据 + 纯函数）
- **EquipmentDef 接口**（line 42-58）：加可选 `setId?: string`（方案 A）或/和 `archetypeAffinity?: SquadArchetype`（方案 B）。**仿 SE-T3 的 `modifier?` 字段样式**（同一处、同样是静态可选字段、同样带「恒定不随强化涨」注释）。
- **套装目录 + 齐套加成表**：新增 `EQUIPMENT_SETS: Record<setId, { name; pieces: readonly defId[]; bonus: Partial<StatBonus>（齐套额外五维）; requiredCount? }>`。给 **2~3 组套装**（SPRINT line 28）——从 EQUIPMENT_CATALOG（line 236-290）选同主题件挂 setId（如同系 UR 武器+防具+支援凑一套；EVA 系 arm_ur_atfield/arm_ur_plug_suit 之类是现成主题）。
- **新增纯函数 `resolveSetBonus(equippedDefIds: readonly string[]): Partial<StatBonus>`**（config，store 与测试共用）：统计每套已装件数，齐 N 件 → 累加该套 bonus；返回逐维求和（**不套 enhancedBonus，恒定值**）。仿 `sumEquipModifiers`（line 194）/ `sumHomeEffects`（line 363）的结构与注释风格。
- **展示文案 helper**：仿 `formatModifier`（line 218）加 `formatSetBonus` 或复用 `formatBonus`（line 348），供 UI 显示「齐套 X 件：ATK+N…」。
- **测试**：`config/equipment.test.ts` 已有 SE-T1/SE-T3 分节样板（describe 在 line 105/121/163/199/240/253）。SE-T2 补 describe：`resolveSetBonus`（齐套给加成、缺件不给、多套并存、只统计已装 defId）+ 套装目录填充断言（setId 引用的 defId 都存在于 catalog、pieces 数合理）。

### B2. `stores/equipment.ts`（编排，把套装加成汇入单一 seam）
- **改 `resolveEquipBonus`（line 241-255）**：现在 = 三槽逐件 `enhancedBonus` → `sumStatBonus`。SE-T2 在返回前**追加套装加成**：收集三槽 defId 列表 → 调 config `resolveSetBonus(defIds)` → 并入 `sumStatBonus([...perItemBonuses, setBonus])`。**这一处改完，A3 前 3 个消费点自动生效**（A4 的 EquipPickerModal 需另手动同步，见 C-1）。
- 若做方案 B（role 条件加成）：在此追加 `resolveConditionalBonus`——需 `gameDataStore.getCharacterCardById(charId)` → `getArchetypeForCharacter(char)` → 匹配 `def.archetypeAffinity` 命中则加条件加成。**引入 gameDataStore 依赖**（本 store 首次依赖它，方向安全：gameDataStore 不反向 import equipment）。
- **不要动** `resolveEquipModifiers`（line 263，SE-T3 seam，两条独立）、`enhanceItem`/`getEnhanceCost`（SE-T1）、`dismantleItem`（SD-T3，`findEquippedBy` 守卫别破坏）、`sanitizeEquipped`/`serialize`/`deserialize`（存档，本轮不碰）。
- **测试**：`stores/equipment.test.ts`（有 SE-T1b「强化经 resolveEquipBonus 单一 seam」样板 line 193-224）。SE-T2 补：齐套后 `resolveEquipBonus` 提升、且经 `resolveMemberBattleStats` 真进战力（line 218 样板）；缺件不给；套装加成**不随 enhance 变化**（恒定，仿 SE-T3 恒定断言 line 387-393）。

### B3. `components/nurture/EquipPickerModal.vue`（⚠️ 预览必须同源，见 C-1）
- `previewEquipBonus`（line 151-162）内联重算三槽 `enhancedBonus` 求和——**必须把套装加成也算进去**（用「替换当前槽后的假设 defId 列表」调同一个 config `resolveSetBonus`），否则换装 delta 预览不含套装增量 → 预览≠实战复发。
- `currentStats`（line 144）走 `resolveEquipBonus(props.charId)`（真实解析，改完自动含套装）；`previewStats`（line 164）走 `previewEquipBonus`（假设值，需手动加套装）。**两者口径必须一致**才能算对 delta。
- 候选行展示（line 128-136 区域）可加套装归属标记（复用 SE-T3 `formatModifier`/`text-highlight` 样板）。

### B4. `components/nurture/InventoryPanel.vue`（Nice-to-have UI 标记）
- 仿 SE-T3f 的 ⚡ modifier 角标做套装归属视觉标记（背包卡/候选/商店三处并列），颜色走语义令牌。低成本一致性加分，不阻塞验收。

### B5. SC-T1 定位入口（方案 B 才用）
- `data/squadSkillKits.ts:697 getArchetypeForCharacter` + `SquadArchetype` union（line 30，需 export 才能给 config 标注类型）。方案 A 完全用不到。

---

## C. 新发现的坑

### C-1（🔴 高危，本轮头号坑）｜EquipPickerModal 预览 seam 与 resolveEquipBonus 不同源
`EquipPickerModal.vue:151 previewEquipBonus` **不调 `resolveEquipBonus`，而是内联重算三槽 `enhancedBonus` 求和**（equipment.ts 求和逻辑的第二份拷贝）。这是 pitfalls S13-C2 明列的「预览≠实战」复发点——SE-T1 时已被 Scout C-2 提醒、Generator 靠内联补 `enhancedBonus` 才对齐。**SE-T2 加套装加成时，若只改 store `resolveEquipBonus`、忘同步 EquipPickerModal 内联预览，换装弹窗算出的战力 delta 会漏套装增量、实战却生效 → 玩家看到「装上第 3 件套装件预览没涨、进战斗却涨了」的口径打架。** 缓解：`previewEquipBonus` 用「替换当前槽后的假设 defId 列表」调同一个 config `resolveSetBonus`，与 store 端同源。（根治办法是把 previewEquipBonus 重构成复用 store 求和，超出本轮范围，首版同源即可。）

### C-2（🟡 中危）｜SPRINT 的「resolveRole」在代码里不存在，实际是 getArchetypeForCharacter
SPRINT line 29 写「复用 SC-T1 resolveRole」，但全仓**无 `resolveRole` 导出**。实际定位入口 = `squadSkillKits.getArchetypeForCharacter(character, activeSkill?, passiveSkill?)`（line 697），内部函数 `resolveArchetype`/`inferArchetypeByText` 未导出。Planner/Generator 若照字面找 `resolveRole` 会扑空。方案 B 才涉及此项；方案 A 无关。

### C-3（🟡 中危）｜方案 B 引入 equipment store → gameDataStore 新依赖
equipment store 当前依赖面极窄（只 import profile）。role 条件加成要在 store 层算，必须 `getCharacterCardById`（gameDataStore）+ `getArchetypeForCharacter`（data 层）。这是本 store 首次依赖 gameDataStore 与 data 层。方向上安全（gameDataStore 不反向依赖 equipment），但**测试成本上升**（equipment.test.ts 要 mock/装 gameDataStore 与角色卡）。**这是建议首版只做方案 A、把方案 B 留作可选叠加或后续轮次的核心理由。**

### C-4（🟢 低危）｜套装加成不套 enhancedBonus、也不进 EquipmentItemSave
套装加成是「装备整体」的确定性附加项，不属任一单件、不随强化放大（与 SE-T3 modifier 恒定同理）。别误在 `resolveSetBonus` 里套 `enhancedBonus`（会让套装加成随强化涨、破坏「强化只放大单件五维」的钉死边界）。setId 是 `EquipmentDef` 静态字段，**不进 `EquipmentItemSave`**（否则触发升档）。

### C-5（🟢 低危）｜checkbox 收尾核对（末轮）
本轮为 S14-E 末轮：Generator/Evaluator 完成 SE-T2 后须把 SPRINT.md line 28 的 SE-T2 主条目 + 其子项从 `[ ]` 补 `[x]`，并确认 SE-T1/SE-T3 仍 `[x]`（前两轮 eval 已确认无落后）。Orchestrator 收尾须核对 SE-T1..T3 全 `[x]` 才算 S14-E 完成（tier1-on 跑满 ≠ 达成）。

---

**一句话回执**：scout.md 已写。SE-T2 可行性——**方案 A（确定性套装 setId）首选、完全成立**（纯 config 派生、经 `resolveEquipBonus` 单一 seam 进战力、无存档改动 SAVE_VERSION 维持 18，唯一必须手动同源的是 EquipPickerModal 内联预览 C-1）；**方案 B（原型条件加成）成立但成本更高**（需 equipment store 新引 gameDataStore 依赖、SPRINT 说的「resolveRole」实为 `getArchetypeForCharacter`），建议本轮只做方案 A 收尾 S14-E、方案 B 作可选叠加或不做。
