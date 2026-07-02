# Plan — S14-E 第 3/3 轮（收尾轮，指派切片 = SE-T2｜确定性套装）

> product-loop `--tier1 on --mode all --max_iter 3`。前两轮 SE-T1（装备强化 v18）、SE-T3（EquipmentDef 战斗 modifier）均已在工作树落地并经 Evaluator 亲验全绿（eval.md：815 tests PASS、type-check/build PASS、SAVE_VERSION=18）。**本轮做 SE-T2 收尾 S14-E。**
> **范围纪律**：SE-T2 是 Sprint 合同内第 3 任务、checkbox 仍 `[ ]`（in-scope）——**必须真实现，严禁降级为「回归确认」**（前车之鉴 SA-T6 / S14-B 暴击 UI）。tier1-on 跑满轮次 ≠ 目标达成；收尾须核对 SE-T1..T3 全 `[x]`。
> **方案抉择拍板**：本轮**只做确定性套装（方案 A / research 替代 C：3 组取向套装）**，条件加成（archetype 亲和）**标 backlog 不做**（四审一致：套装纯 config/store 闭环、零跨 store 依赖、回归风险最低、build 深度不输而成本约 1/3）。SPRINT 主清单「复用 resolveRole」不采纳（代码无此导出，实际入口是 `getArchetypeForCharacter`，仅条件加成方案才需要，本轮不走）。

---

## 关键设计决策拍板（写进任务验收）

| 决策项 | 拍板 |
|---|---|
| 形态 | 3 组「取向」套装：攻击（偏 atk/sp）/ 坦度（偏 hp/def）/ 节奏（偏 spd/sp），跨稀有度给现有目录打 setId 标签、**不新增装备**；每套武器/防具/支援三槽各有成员；R/SR 也铺成员让啊哈前移 |
| 触发 | 单角色三槽内 setId 计数，齐 2 / 齐 3 阶梯加成；判定域严格限单 charId（不跨角色，守 `resolveEquipBonus` 单角色语义） |
| 奖励维度 | **只碰五维、纯加法、确定值**；绝不塞 modifier（守 SE-T3 暴击轴 clamp）；绝不套 `enhancedBonus`（不随强化涨、防双乘）；绝不随机 roll |
| 幅度 | 「齐套 ≈ 提升半个稀有度档」；3 套阶梯奖表集中 config 一处、测试锁死量级 |
| 单一 seam | 套装加成经既有 `resolveEquipBonus`（逐件求和后追加套装项一并 `sumStatBonus`）；严禁另拼第 N 套战力口径 |
| 预览同源（头号护栏） | `EquipPickerModal.previewEquipBonus` 用「替换当前槽后假设 defId 列表」调**同一** config 套装纯函数，防预览≠实战 |
| 显形 | 候选/背包 setId chip + 配装弹窗右栏「齐几件 / 齐套奖 delta」；复用 delta 语言不另开弹窗、不无脑追加行；颜色走语义令牌 |
| 存档 | setId 是 `EquipmentDef` 静态字段、不进 `EquipmentItemSave`；**SAVE_VERSION 维持 18**，不碰 schema/migrations/装配器 |

---

## 本轮任务（按依赖顺序）

### SE-T2a｜`EquipmentDef.setId` 静态字段 + 套装目录 + 齐套加成表
- **目标**：给 `EquipmentDef` 加可选 `setId?`（仿 SE-T3 `modifier?` 样式 + 「恒定不随强化涨」注释）；集中的 3 组取向套装目录 / 阶梯奖表（每套名称、成员 defId、齐 2/3 阶梯五维加成）；给现有目录成员打 setId 标签（三槽 + 跨稀有度含 R/SR）。
- **依赖**：无（config 起点）。
- **验收**：type-check 通过；setId 引用 defId 均存在于 catalog；每套三槽都有成员；未打标签装备缺省无 setId。
- **来源**：SPRINT SE-T2a / research 🔴-1、A6 / product 🟡-1、🟢-2 / scout B1。

### SE-T2b｜config 纯函数 `setBonusFor`（三槽 setId 计数 → 阶梯五维加成）
- **目标**：纯函数（仿 `sumEquipModifiers`/`sumHomeEffects`），入参三槽 defId 列表，按 setId 计数、齐 2/3 阶梯累加固定五维加法；不套 `enhancedBonus`、不含 modifier、零 RNG。
- **依赖**：SE-T2a。
- **验收**：`config/equipment.test.ts` 断言齐 2/3 阶梯确定加成、缺件不给、多套并存、只统计已装 defId、加成恒定且只碰五维；套装目录填充断言。
- **来源**：SPRINT SE-T2b / research 🔴-2、8 / scout B1、A2。

### SE-T2c｜套装加成经 `resolveEquipBonus` 单一 seam 汇入
- **目标**：改 store `resolveEquipBonus` 在逐件 `enhancedBonus` 求和之后追加 `setBonusFor(三槽 defIds)` 一并 `sumStatBonus`；不动 `resolveEquipModifiers`（SE-T3）/`enhanceItem`/`dismantleItem`（`findEquippedBy` 守卫）/存档序列化。
- **依赖**：SE-T2b。
- **验收**：`stores/equipment.test.ts` 断言齐套后 `resolveEquipBonus` 提升且经 `resolveMemberBattleStats` 真进战力、缺件不给、套装加成不随 enhance 变化；**0 套装件时 `resolveEquipBonus` 输出与 SE-T2 前逐字节一致**（既有断言不改而全绿）；敌方侧不吃套装加成。
- **来源**：SPRINT SE-T2c / research 🔴-2、8、A2/A4 / product 🔴-2 / scout A2/A3/B2。

### SE-T2d｜EquipPickerModal 换装预览同源（头号护栏）+ 套装显形
- **目标**：`previewEquipBonus` 用「替换当前槽后假设 defId 列表」调同一 `setBonusFor`，与 `currentStats` 口径一致算对 delta；配装弹窗右栏子区显示套装进度（如「攻击套 2/3」）+ 齐套奖 delta，候选卡加 setId chip；复用 SE-T3 `formatModifier`/`text-highlight` + delta 语言，颜色走语义令牌。
- **依赖**：SE-T2c。
- **验收**：换装 delta 预览含套装增量（预览 = 实战）；带 setId 装备显示归属 + 进度 + 齐套奖；type-check 通过。
- **来源**：SPRINT SE-T2d / scout C-1、B3 / research A8、7 / product 🔴-3、🟡-3。

### SE-T2e｜回归 + 收尾核对
- **目标**：不破坏 SE-T1 强化五维 seam（`resolveEquipBonus` 逐件 `enhancedBonus` 求和不被污染）、SE-T3 modifier 独立 seam、SB-T3 暴击轴、战力单一 seam、S14-A..D + SE-T1/SE-T3；**把 SE-T2 主清单 line 28 + 本轮子项从 `[ ]` 补 `[x]`，确认 SE-T1..T3 全 `[x]`**；type-check/test/build 全绿。
- **依赖**：SE-T2a..d。
- **验收**：验收命令 1-5 全绿；SE-T1..T3 全 `[x]`（S14-E 完成判据）。
- **来源**：SPRINT SE-T2e / research 🔴-2（回归护栏）/ scout C-5。

### 采纳的 Nice-to-have（不阻塞验收）
- **SE-T2f（🟢）**：套装 chip 在 InventoryPanel 背包卡显示（复用 SE-T3f ⚡ 角标位范式），语义令牌。来源：product 🟢-3 / research 🟢。
- **SE-T2g（🟢）**：齐套瞬间套装 chip 点亮 + 战力 delta 复用既有 transition（克制正反馈，不新造粒子）。来源：product 🟢-1。

---

## 相关陷阱（pitfalls / 本轮 scout 新发现）
- **C-1（🔴 头号坑）预览≠实战**：`EquipPickerModal.previewEquipBonus` 是 `resolveEquipBonus` 求和逻辑的第二份内联拷贝——只改 store、忘同步内联预览 → 换装弹窗 delta 漏套装增量、实战却生效（pitfalls S13-C2 复发点，SE-T1 已踩过）。缓解：两处同源调 `setBonusFor`。
- **C-4 双乘 / 越界**：套装加成绝不套 `enhancedBonus`（否则随强化涨、破坏「强化只放大单件五维」边界）、绝不塞 modifier（绕过 SE-T3 clamp 叠爆暴击轴）；setId 不进 `EquipmentItemSave`（进则触发升档）。
- **战力单一 seam 铁律**（SPRINT line 20 / pitfalls S13-C2）：套装加成必须经 `resolveEquipBonus` → `resolveMemberBattleStats`，严禁新建第 N 套战力汇总。
- **C-2 陷阱规避**：SPRINT 写的 `resolveRole` 代码里不存在（实际 `getArchetypeForCharacter`），仅条件加成方案才涉及——本轮不走条件加成、绕开此坑。
- **engine 纯净 / 颜色 / 组件清理**：解析全在 config（纯函数）+ store（查表编排），engine 零改动；UI 颜色走皮肤语义令牌（禁 text-white 压浅底、禁动态色类拼接）；定时器登记 + onUnmounted 清除。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 equipment 套装测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-E 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且本轮承诺 SE-T2a..e 全部 `[x]` 并与实现一致。**S14-E 整体完成** = SE-T1..SE-T3 全 `[x]`。
