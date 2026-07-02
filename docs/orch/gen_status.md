# Gen Status — S14-E 第 3/3 轮（收尾轮，指派切片 = SE-T2｜确定性套装）

## 完成任务（本轮真实现，非回归确认）
S14-E 收尾：**SE-T2 确定性取向套装**（方案 A）全部落地，S14-E 三任务（SE-T1/SE-T2/SE-T3）主清单全 `[x]`。

- **SE-T2a｜setId 静态字段 + 套装目录 + 阶梯奖表**（config/equipment.ts）
  - `EquipmentDef` 加可选 `setId?: EquipmentSetId`（仿 `modifier?` 样式 + 「恒定不随强化涨、不进存档」注释）。
  - 新增 `EquipmentSetId = 'attack'|'tank'|'tempo'`、`EquipmentSet` 接口、集中的 `EQUIPMENT_SETS` 目录（3 组取向套装：锋锐组曲=攻击偏 atk/sp、磐石壁垒=坦度偏 hp/def、疾风节拍=节奏偏 spd/sp）+ 阶梯奖表（bonus2/bonus3，齐 3 取代非叠加）+ `SET_TIER2_COUNT=2 / SET_TIER3_COUNT=3` + `getEquipmentSet`。
  - 给现有 EQUIPMENT_CATALOG 成员打 setId 标签：**每套三槽（weapon/armor/supporter）都有成员 + 跨稀有度含 R/SR**（凑套常需混稀有度，对冲「按稀有度排序即最优」）。散件（如 wpn_r_stage_mic）缺省无 setId 不参与计数。
- **SE-T2b｜纯函数 `setBonusFor` + `setProgressFor`**（config/equipment.ts）
  - `setBonusFor(equippedDefIds)`：三槽 defId 计数 → 齐 3 取 bonus3 / 齐 2 取 bonus2 / 不足 2 不给；多套并存各自结算后 `sumStatBonus` 求和。**只碰五维、纯加法、恒定值**（不套 enhancedBonus、不含 modifier、零 RNG）；未知/无 setId 件不计数。
  - `setProgressFor`：UI 显形用（每套件数 + tier 0/2/3 + 当前档奖），只列至少装 1 件成员的套。
  - config 首次引入 `sumStatBonus` 值导入（依赖向下 config→engine，与既有 `type StatBonus` 同源，engine 未反向依赖 config）。
- **SE-T2c｜套装加成经 `resolveEquipBonus` 单一 seam 汇入**（stores/equipment.ts）
  - `resolveEquipBonus` 逐件 `enhancedBonus` 求和后追加 `setBonusFor(三槽 defId)` 一并 `sumStatBonus`。前 3 消费点（实战/养成详情/家园 explore）自动生效。
  - **未动** `resolveEquipModifiers`（SE-T3）/`enhanceItem`/`dismantleItem`（findEquippedBy 守卫）/serialize·deserialize（存档）。0 套装件时 setBonusFor 全 0，输出与 SE-T2 前一致。
- **SE-T2d｜EquipPickerModal 换装预览同源（头号护栏 C-1）+ 套装显形**
  - 新增 `previewDefIds`（替换当前槽后假设 defId 列表）；`previewEquipBonus` 用同一 `setBonusFor(previewDefIds)`，与 store 口径一致 → 预览 = 实战。
  - 右栏「套装搭配」子区：每套进度 count/3 + 齐档标记 + 当前档奖 delta（复用 `formatBonus`/语义令牌）；候选卡加 🎯 setId chip（text-accent 语义色）。
- **SE-T2e｜回归 + 收尾**：SE-T1 五维 seam / SE-T3 modifier 独立 seam / SB-T3 暴击轴 / 战力单一 seam / S14-A..D 均未破坏（835 测试全绿，原 815 + 本轮 +20）。SPRINT 主清单 SE-T2 + SE-T2a..f 补 `[x]`，SE-T1/SE-T3 确认仍 `[x]`。
- **SE-T2f（🟢）｜InventoryPanel 套装 chip**：背包卡加 🎯 套装短名（复用 ⚡ modifier 角标位范式，语义令牌）。

## 未完成（卡点）
- **SE-T2g（🟢，nice-to-have，不阻塞验收）**：齐套瞬间 chip 点亮动画未做——配装确认后弹窗即关闭，无「齐套瞬间」常驻动画位可挂 transition；标 backlog。核心 SE-T2a..e + f 全部落地。

## 验收命令实际输出
1. `npm run type-check` → **PASS**（vue-tsc --build，0 错误，无输出）。
2. `npm run test` → **PASS**：`Test Files 64 passed (64) / Tests 835 passed (835)`，Duration 12.03s。
3. `npm run build` → **PASS**：`✓ built in 17.84s`，产物正常（index-BPj4yscF.js 298.45 kB）。
4. 后端 `.venv/Scripts/python.exe backend/test_security.py` → **PASS**：`RESULT: PASS — all security checks passed`，EXIT=0。
5. `grep -rn "debug=True" backend/server.py api/index.py` → **零命中**（EXIT=1）。

**全部 5 条验收命令绿。**

## 新坑 / 注意
- config/equipment.ts 现在值导入 `sumStatBonus`（此前仅 type）。`setBonusFor`/`setProgressFor` 内调 `getEquipmentDef`（函数声明已 hoist），且这两个纯函数不在模块加载期执行，前向引用 catalog 安全。
- 套装「齐 3 取代齐 2 非叠加」是刻意设计（bonus3 已含更高量级），测试已锁死 `out.atk !== bonus2+bonus3`，改奖表时保持此语义。
- 套装奖励恒定不随 enhance：store 测试断言「强化一件后 resolveEquipBonus 的 atk 增量 = 该件强化增量」，反证套装项未被 enhancedBonus 二次放大。

## 文件结构变更自报
- 改：`frontend-vue/src/config/equipment.ts`（+setId 字段 / EQUIPMENT_SETS 目录 / setBonusFor / setProgressFor / getEquipmentSet / catalog setId 标签 / sumStatBonus 值导入）
- 改：`frontend-vue/src/stores/equipment.ts`（resolveEquipBonus 追加 setBonusFor）
- 改：`frontend-vue/src/components/nurture/EquipPickerModal.vue`（previewDefIds 同源 / 套装进度子区 / 候选 setId chip）
- 改：`frontend-vue/src/components/nurture/InventoryPanel.vue`（背包卡 setId chip）
- 改：`frontend-vue/src/config/equipment.test.ts`（+SE-T2 setBonusFor/setProgressFor/目录填充断言）
- 改：`frontend-vue/src/stores/equipment.test.ts`（+SE-T2 resolveEquipBonus seam 汇入断言）
- 改：`docs/plans/SPRINT.md`（SE-T2 + SE-T2a..f 勾 [x]；SE-T2g 标 backlog）
- 无新增文件；无存档改动（SAVE_VERSION 维持 18，未碰 schema/migrations/装配器）。

## 状态
**PASSED** — SE-T2（确定性套装）真实现落地，S14-E 三任务 SE-T1/SE-T2/SE-T3 全 `[x]`，5 条验收命令全绿。
