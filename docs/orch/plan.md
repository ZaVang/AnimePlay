# Plan — S14-D 收尾轮（product-loop --tier1 on --mode all，切片 = SD-T2 + SD-T4 + SD-T3）

> **轮次判定（纠正模板占位符 `第 undefined 轮 / slice=[native code]`）**：以工作树实证为准。**只有 Round 1（SD-T1 + SD-T5）真实落地**（facility 域 v17 + `stores/facility.ts` 齐全）。排期建议里「第 2 轮 SD-T2+SD-T4」**从未落地**（实证见下）。故本轮 = **S14-D 收尾轮，一次补齐全部剩余任务 SD-T2 + SD-T4 + SD-T3**，让 S14-D 整体完成（SD-T1..T5 全 `[x]`）。**严禁只做回归确认而跳过任一任务**（S14-A SA-T6 / S14-B 暴击 UI 教训）。
>
> 工作树实证（Round 2 未落地）：
> - `engine/nurture/rules.ts:35 getRequiredExpForLevel` 仍 `(level-1)²×1000`（曲线未压）。
> - `components/nurture/EquipPickerModal.vue` 仅静态 `homeText`，无挂机 before→after delta。
> - `config/nurture.ts` / `stores/nurture.ts` 仅有好感溢出（SC-T4，S14-C 遗产），**无经验溢出**；`TUTORING_EXP_GAIN=500` 仍定额。
> - `config/equipment.ts EQUIPMENT_CATALOG` homeEffect 仍是「主承载」量级（如 UR expPct 0.16）；`stores/equipment.ts` 无 `dismantle*`。
>
> **本轮 SAVE_VERSION 不动（仍 v17，权威在 `infra/persistence/schema.ts:44`）**：三任务均无新存档字段——SD-T2 纯数据、SD-T4 纯计算 + `profile.earn` 溢出、SD-T3 删既有 inventory 元素 + `profile.earn` 得 KP。本 Sprint 唯一一次 bump 已在 Round 1 用掉（v17）。

---

## 任务（按依赖顺序）

### 任务 A｜SD-T2 装备家园 homeEffect 剥离到设施 + EquipPicker 挂机 delta（依赖 Round 1 已完成的设施乘区）

- **目标**：把家园挂机加成主承载从「装备 homeEffect」迁到「设施升级（Round 1 设施乘区）」，装备 homeEffect 产出%退成小额佐料；在 `EquipPickerModal` 补挂机 before→after delta 预览让配装口径透明。装备回归以战斗为主、家园为辅，二者不再抢同一杠杆。
- **依赖**：Round 1 设施乘区（`facilityBonusPct` 独立乘子，已是家园产出主体）——已完成，可直接弱化装备侧。
- **验收**：
  - 装备 homeEffect 产出% catalog 数值大幅弱化（决策-11：约 ×0.33，0.01 步进），comfort 全保留。
  - 家园产出主体由设施驱动、装备选装不再两目标打架。
  - EquipPickerModal 展示挂机 before→after delta（决策-13，仿战斗五维 delta 范式、三槽求和、语义色）。
  - `resolveHomeEffect` 唯一口径同源不破（预览==结算）；catalog homeEffect 相关断言测试同步更新全绿；不破坏挂机/装备现有测试。
  - type-check/test/build 通过。
- **来源**：SPRINT.md 主清单 SD-T2 + 本轮决策-11/12/13；FUTURE.md S14-D「装备 homeEffect 逐步剥离到设施（P2-13）」；scout.md A 段 SD-T2、C 段坑 3/4。

### 任务 B｜SD-T4 经验曲线—产出错配修正 + 满级溢出 + 补习递增（纯计算，无依赖）

- **目标**：压曲线到与产出匹配量级；满级经验给自动溢出出口（转少量 KP）不再沉没；补习产出随等级递增。
- **依赖**：无（纯计算 / 派生，立即对存量档生效——存量 totalExperience 不变，按新曲线重新派生 level 可能瞬间跳级，属预期，无需迁移）。
- **验收**：
  - `getRequiredExpForLevel` = `(level-1)^1.6×900`（决策-14，注释给标定依据）、严格单调递增（守卫测试）。
  - `rules.test.ts` 全部硬编码断言按新曲线重算 + 递增守卫（决策-15，重标定非降覆盖）。
  - 满级经验自动转少量 KP：沉没点 `addCharacterExp` 满级分支走 `profile.earn`（决策-16，仿 bondOverflow 范式，用「已满级角色继续吃经验」用例测）。
  - 补习产出随等级递增 `tutoringExpGain(level)`（决策-17，UI 文案改动态）。
  - 不破坏等级/加点/突破/好感链；货币只走 `profile.earn/spend`；type-check/test/build 通过。
- **来源**：SPRINT.md 主清单 SD-T4 + 本轮决策-14/15/16/17；FUTURE.md S14-D「修经验曲线/产出错配（P2-19）」；scout.md A 段 SD-T4、C 段坑 1/2/3、B 段坑 1/2/6。

### 任务 C｜SD-T3 重复装备分解出口（分解为 KP，无依赖）

- **目标**：给背包重复/多余装备加分解出口——分解为 KP（走 `profile.earn`），已装备件与保护件不被误分解。为 S14-E 装备强化留经济位（本轮只做 KP 回收，不做材料/合成）。
- **依赖**：无（equipment 域 v14 已存，inventory 是既有数组，删元素 + earn KP 无需新字段）。
- **验收**：
  - `dismantleItem(uid)`：移除背包实例 + 按稀有度得 KP（`dismantleValueForRarity` 纯函数，明显低于兑换价 `EQUIPMENT_PRICES`，决策-18）。
  - 已装备件不可分解（`findEquippedBy` 守卫 + UI 禁用，双保险，决策-19）。
  - 门面走 `userStore.dismantleEquipment(uid)` + saveToServer（决策-19）；组件禁直改 inventory/货币。
  - engine/store/config 分层不破（决策-20，分解纯计算放 config，副作用在 store）。
  - engine/store 分解测试（已装备拒绝、稀有度产出、count 保护）；type-check/test/build 通过。
- **来源**：SPRINT.md 主清单 SD-T3 + 本轮决策-18/19/20；FUTURE.md S14-D「重复装备加回收/分解出口（P2-21）」；审计报告 P2-21；参照 codex `collection.dismantleCard` 范式。

---

## 采纳的 Reviewer / Scout 改进项（钉进 HOW 边界）

- **SD-T2 走「弱化」而非「彻底归零」**（scout A 路径 1）：更平滑、观感自然（毕业角色仍有微弱家园收益），不砸档、不动签名。
- **SD-T2 只改 catalog 数据、禁第二口径**（scout 坑 4）：`resolveHomeEffect` 单一求和口 + 两调用点同源，Round 1 焊死的口径命脉不许破。
- **SD-T2 comfort 留装备**（scout C 段坑 4）：comfort 是独立软加成轴（Round 1 已接真加成），剥离的是产出%不是 comfort。
- **SD-T4 主走「压曲线」而非「提产出」**（scout C 段坑 1）：改一处 engine 曲线 vs 改多处产出常量，前者更内聚、副作用可控。`rewards.ts` 有两处 characterExp 常量（`:71 characterExpEach` / `:99 characterExp`），提产出会踩口径混淆，故不走提产出。
- **SD-T4 溢出自动转、沉没点在 `addCharacterExp`**（scout 坑 2 / A 段建议自动）：避免「攒了不领」死数值；出口必须加在 `addCharacterExp` 满级分支（挂机/塔仍照灌），非已拒收的 `tutorCharacter`。
- **SD-T3 只做 KP 回收、不做材料/合成、不升档**（YAGNI，S14-E 才做强化）：本 Sprint 唯一 bump 已用掉，本轮不预留任何字段。
- **SD-T3 已装备件保护 + 门面 saveToServer**（对齐 codex `dismantleCard` count>1 保护范式 + 既有装备门面）。

## 相关陷阱（pitfalls.md + scout C 段）

1. **曲线是「牵一发」**：`rules.test.ts` 5+ 处硬编码曲线值（1000/4000/81000/9801000 + getLevelFromExp 边界 + getLevelProgress 绝对值）全要按新公式重算，不是删。`getLevelFromExp` 靠 `while` 反推 → 新曲线必须严格单调递增（加守卫测试）。
2. **满级沉没点是 `addCharacterExp`（nurture.ts:117）不是 tutorCharacter**：tutorCharacter 满级已拒（L168），但挂机/塔仍照灌 `addCharacterExp`——溢出出口加在此分支。
3. **压曲线 = 存量档瞬间跳级**：level 是 `f(totalExperience)` 派生，上线即批量跳级+加点，属预期，注释说明，**不需要 migration**（别误以为要写迁移）。
4. **SD-T2 装备 homeEffect 消费已同源**：`resolveHomeEffect` 唯一口 + 两调用点，弱化只改 catalog 数据，别在单个消费点打折（否则破 Round 1 口径命脉）。
5. **EquipPicker 挂机 delta 别用 catalog 静态值冒充「该角色 delta」**：必须算三槽求和差值（仿 `previewEquipBonus`），不是单件文案。
6. **补习改函数要传 level**：`tutorCharacter` 先取 `nurtureData.level` 再调 `tutoringExpGain(level)`；UI 静态「+500 经验」文案改动态。
7. **货币只走 profile.spend/earn**：SD-T4 溢出转 KP / SD-T3 分解得 KP = `profile.earn('knowledgePoints')`；补习扣费 `profile.spend`。别直改 core.knowledgePoints。
8. **engine 纯净**：曲线改动纯计算留 engine；补习递增/溢出汇率/分解产出（含查表/常量）放 config 纯函数，engine 只收 number。
9. **颜色令牌**：EquipPicker 新增 delta 行用 `text-success`/`text-danger`/`text-ink-3`（复用 `deltaClass`），禁 text-white 压浅底、禁拼接动态色类、禁反斜杠透明度（`bg-accent\15` 静默失效）。
10. **别开新范围但别跳任务**：本轮必须真落地 SD-T2 + SD-T4 + SD-T3 三个，全部在验收里可勾，不得只做回归确认。
11. **SD-T2 弱化后某件 homeEffect 若被削到全 0**：`formatHomeEffect` 对空 effect 返回空串（`v-if="c.homeText"` 已守）——弱化保留数值故一般不空，但要确认边界不崩。
12. **grep catalog homeEffect 断言测试**：弱化前先 `grep -rn "expPct\|homeEffect\|resolveHomeEffect" src/**/*.test.ts` 全量核对同步更新。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮更新的 rules/nurture/equipment/EquipPicker 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-D 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且 **SD-T2/SD-T3/SD-T4 主清单全 `[x]`（至此 SD-T1..T5 全 `[x]` = S14-D 整体完成）**、FUTURE.md S14-D 三条同步勾、SAVE_VERSION 保持 v17。
