# Scout Report — Iteration 1

## A. 约束与可行性（给 Planner —— 影响 WHAT/范围）

- 家园运营仪表：可行性：直接可做
  - 理由：`frontend-vue/src/config/homestead.ts` 已是纯收益计算；`HomesteadView.vue` 已能读取入住角色、gameData、equipment/nurture store。
  - 对规划的建议：不升存档，用入住角色和已装备道具派生舒适度/产率/设施信息。

- 装备目录扩容：可行性：直接可做
  - 理由：装备实例只存 `defId`；静态目录扩容不影响旧档。商店直接遍历 `EQUIPMENT_CATALOG`。
  - 对规划的建议：保持旧 defId 不变，追加新目录项；每槽每稀有度多件。

- 装备效果接入家园收益：可行性：直接可做
  - 理由：`userStore.settleHomestead()` 已集中跨域编排，可在结算时读取 `equipmentStore.getEquipped/ getItem` 并把效果喂给 `computeIdleYield`。
  - 对规划的建议：效果只影响挂机收益，不进入 engine 战斗，避免破坏纯净战斗层。

- 塔掉落多样化：可行性：直接可做
  - 理由：`rollTowerDrop` 已注入 RNG；命中后由 userStore 查目录并 addItem。
  - 对规划的建议：增加 `getEquipmentDefsBySlotRarity`，命中后用同一 RNG 从候选池 pick。

## B. 代码地图与坑（给 Generator —— HOW 接地）

- 家园收益与 UI
  - 相关文件：
    - `frontend-vue/src/config/homestead.ts`：纯收益常量与 `computeIdleYield`
    - `frontend-vue/src/views/HomesteadView.vue`：家园主视图、离线弹窗、角色漫步
    - `frontend-vue/src/stores/userStore.ts`：`settleHomestead` 跨域结算入口
    - `frontend-vue/src/stores/homestead.test.ts` / `frontend-vue/src/config/homestead.test.ts`：收益与结算测试
  - 现有架构/数据流：HomesteadView onMounted 调 userStore.settleHomestead；userStore 从 homestead.placedCharacterIds、gameData 稀有度计算收益，写 nurture/profile。
  - 注意的坑：不升存档；无产出时也推进 lastSettleAt；组件计时器/rAF 要卸载清理。

- 装备目录与配装
  - 相关文件：
    - `frontend-vue/src/config/equipment.ts`：装备定义、价格、掉落层段、格式化
    - `frontend-vue/src/stores/equipment.ts`：inventory/equipped 行为与 `resolveEquipBonus`
    - `frontend-vue/src/components/nurture/InventoryPanel.vue`：背包/兑换商店
    - `frontend-vue/src/components/nurture/EquipPickerModal.vue`：配装候选与 delta 预览
    - `frontend-vue/src/stores/equipment.test.ts`：装备行为测试
  - 现有架构/数据流：装备目录是静态；实例只存 uid+defId；配装只写 equipped uid。
  - 注意的坑：`slot` prop 名会触发 eslint，继续用 `equipSlot`；稀有度色必须完整字面映射，禁止动态拼 Tailwind 类。

## C. 新发现的坑（如有，待Sprint结束追加到 pitfalls.md）

- [装备扩容] 当每槽每稀有度不止一件时，塔掉落不能继续只取第一件，否则目录扩容只服务商店、不服务掉落。
