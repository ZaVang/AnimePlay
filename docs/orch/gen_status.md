# Generator Status — Iteration 1 (S13-C2 装备系统全栈)

## 完成的任务
- [x] **C2-T1 装备目录 config** — 新建 `src/config/equipment.ts`：物品定义类型 `EquipmentDef`（id/name/slot/rarity/bonus）+ 3 槽 × R..UR 起始目录（每槽每稀有度 1 件，共 15 件，名值贴近预算 R~18/SR~35/SSR~60/HR~95/UR~140，hp 按 ~2.5× 折算）+ 兑换价表 `EQUIPMENT_PRICES`（R400/SR1200/SSR4000/HR10000/UR24000，高于图鉴解锁 UR12000）+ 掉落层段纯函数 `dropRarityForFloor`（1-5R/6-15SR/16-30SSR/31-50HR/51+UR）+ 槽位元数据 `SLOT_META`/`SLOT_ORDER` + 查表 helper（`getEquipmentDef`/`getEquipmentDefBySlotRarity`/`getEquipmentDefsForSlot`/`getEquipmentPrice`）。零 Vue/IO。
- [x] **C2-T2 equipment store 行为** — `src/stores/equipment.ts` 填行为：`addItem`（uid=`crypto.randomUUID()` 入库）/ `equip`（含同槽校验，异槽拒绝；换下旧件留背包；一件只能戴一处，换角色自动从原位卸下）/ `unequip` / `resolveEquipBonus`（store 查表 uid→defId→def→bonus，委托 engine 纯函数求和）/ `getEquipped`/`getItem`/`findEquippedBy`/`list`。求和纯函数 `sumStatBonus` 加进 `engine/squad/combat.ts`（engine 不 import config）。serialize/deserialize/reset 保留。单测 `equipment.test.ts`（11 例）。
- [x] **C2-T3 战力接 equipBonus** — 三处调用点同源 `equipmentStore.resolveEquipBonus(charId)`：`SquadBattleView.getSquadPower`、`SquadBattleView.createSquadMember`、`NurtureView.finalStats`/`statRows`（删除两文件的 `NO_EQUIP_BONUS` 恒 0 占位）。NurtureView 抽 `equipBonus` computed 供 finalStats + statRows 共用（避免双源），statRows 加「+N装」分段显示。engine 公式签名不动（combat.test.ts 锁定，未改其断言）。
- [x] **C2-T4 来源：塔掉落 + KP 兑换** — engine 纯函数 `engine/squad/drops.ts` `rollTowerDrop(floor, rng, rarityForFloor, dropChance=0.5)`（稀有度映射注入，engine 不 import config）；挂在 `userStore.completeFloor` 的 `pve.completeFloor()` 返回 true 分支（天然防刷低层，无冗余守卫），命中走 `equipment.addItem` + `profile.addLog` + 同事务 saveToServer，RNG 可注入（默认 `defaultRng`）。KP 兑换 `userStore.purchaseEquipment(defId)` 照图鉴解锁范式：登录校验 → `profile.spend('knowledgePoints', 价)` 失败不发货 → 成功 addItem + 日志 + saveToServer，返回 `{ok,error?}`。单测 `drops.test.ts`（13 例，层段/概率/槽/复现边界）+ `equipmentSource.test.ts`（8 例，掉落防刷/兑换三分支）。
- [x] **C2-T5 UI：背包 + 配装** — 内嵌 NurtureView（不新增路由）。新建 `components/nurture/InventoryPanel.vue`（变体 1 网格：稀有度徽章/槽位图标/名梗/数值/「装备中·角色」标签 + 按槽与稀有度筛选 + 折叠兑换商店）+ `components/nurture/EquipPickerModal.vue`（变体 A picker：同槽候选含「卸下」+ 五维「当前→新值(+Δ)」+ 战力「当前→新值」预览，delta 复用同一 resolveEquipBonus 口径）。NurtureView 3 槽占位改为可点击槽（显示已装件 + 开 picker）。稀有度色走完整字面映射 `config/equipmentColors.ts`（复用 gameConfig.rarityConfig 的 `color`/`c`，禁运行时拼类）；界面色走语义令牌；徽章白字属稀有度识别固定例外。弹窗无计时器（用 watch，无需 onUnmounted 清理）。

## 未完成的任务
无。C2-T1..T5 全部完成。

## 验收命令输出

### 1. `cd frontend-vue && npm run type-check`（期望 0 错误）
```
> vue-tsc --build
（无输出，退出码 0）
```
PASS — 0 错误。

### 2. `cd frontend-vue && npm run test`（期望全绿）
```
 Test Files  50 passed (50)
      Tests  563 passed (563)
   Duration  8.31s
```
PASS — 563 全绿（含新增 equipment store 11 + drops 13 + equipmentSource 8 = 32 例；总数较 C1 增加，未倒退）。

### 3. `cd frontend-vue && npm run build`（期望成功）
```
✓ built in 8.68s
（NurtureView 产物 23.17 kB，含背包/配装组件）
```
PASS。

### 4. `./.venv/Scripts/python.exe backend/test_security.py`（期望退出码 0、全 PASS）
```
RESULT: PASS — all security checks passed
EXIT=0
```
PASS — 全 PASS，退出码 0（C2 未碰后端）。

### 5. `grep -rn "debug=True" backend/server.py api/index.py`（期望零命中）
```
EXIT=1
```
PASS — 零命中（grep 无匹配，exit 1）。

### 附：新/改文件 ESLint（`npx eslint <path>`，单文件审色）
新建/改的 7 个 C2 文件零错误。`SquadBattleView.vue` 报 6 条 **pre-existing** 错误（unused `computed`/`RouterLink`/`clearState`/`startBattle`/`returnToTowerMode`、`ref<any>`），经 `git diff HEAD` 核实均在本轮 diff 之外（本轮只改两处 generateBattleStats 调用 + import 行，净 -1 行），非 C2 引入，按 pitfalls「不跑全仓 lint --fix」未处理。

## 新发现的陷阱
- **[vue 模板 prop 名禁用 `slot`]** 配装弹窗 prop 起名 `slot` → 模板绑定 `:slot=` 被 `vue/no-deprecated-slot-attribute` 误判为废弃的 slot 语法（eslint error）。改名 `equipSlot`（模板 `:equip-slot=`）规避。装备/槽位相关组件 prop 勿用 `slot` 裸名。
- **[engine 不 import config 的落地姿势]** 掉落纯函数把「层段→稀有度映射」作参数注入（`rollTowerDrop(floor, rng, rarityForFloor)`），equipBonus 求和把「已解析 bonus 数组」喂给 `sumStatBonus(bonuses)`——两处都让 engine 只收纯数据，查表/边界留 config/store，engine 零 `@/config` import（验证通过）。

## 文件结构变更（防漂移自报）
- 新增文件：`src/config/equipment.ts`、`src/config/equipmentColors.ts`、`src/engine/squad/drops.ts`、`src/components/nurture/InventoryPanel.vue`、`src/components/nurture/EquipPickerModal.vue` + 3 个测试（`stores/equipment.test.ts`、`engine/squad/drops.test.ts`、`stores/equipmentSource.test.ts`）。
- 改模块职责：`stores/equipment.ts`（空域→长出行为）、`engine/squad/combat.ts`（+sumStatBonus）、`engine/squad/index.ts`（+export drops）、`stores/userStore.ts`（+塔掉落/KP兑换/配装编排）、`views/NurtureView.vue`+`views/SquadBattleView.vue`（接 equipBonus + UI）。
- 不升存档：schema/migrations/persistence 装配器三处未动（v14 已含空 equipment 域）。
- `docs/project_structure.md`：项目无此文件，跳过。

## 状态
PASSED
