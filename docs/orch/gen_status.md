# Generator Status — S14-D 收尾轮（product-loop --tier1 on --mode all，切片 = SD-T2 + SD-T4 + SD-T3）

## 完成任务

本轮一次补齐 S14-D 全部剩余任务，至此 SD-T1..T5 全部 `[x]` = S14-D 整体完成。

### SD-T2｜装备家园 homeEffect 剥离到设施 + EquipPicker 挂机 delta — DONE
- `config/equipment.ts`：`EQUIPMENT_CATALOG` 每件 `homeEffect` 产出%（expPct/affectionPct/knowledgePct）统一 ×0.33 弱化并就近取整到 0.01 步进（0.03/0.04→0.01、0.05/0.06→0.02、0.08/0.1→0.03、0.11/0.12/0.13→0.04、0.16→0.05、0.18→0.06）；**comfort 全部保留不动**。只改 catalog 纯数据，`resolveHomeEffect` 唯一求和口 + 两调用点口径未动（决策-11/12）。
- `components/nurture/EquipPickerModal.vue`：新增家园挂机 before→after delta——`sumHomeForSlots(pickCurrentSlot)` 仿 `previewEquipBonus` 三槽求和（替换当前槽），`currentHome`/`previewHome`/`homeRows` computed，展示经验%/好感%/知识%/舒适的 current→next(+Δ)，用 `deltaClass` 语义色（决策-13）。数据源 `getEquipped + def.homeEffect`，无新 seam。
- 测试：`config/equipment.test.ts` 加「产出% ≤0.06」「comfort 保留」断言；`stores/equipment.test.ts` resolveHomeEffect 断言 0.06→0.02；`stores/homestead.test.ts` 装备离线结算 expEach 424→408、totalExperience 424→408。

### SD-T4｜经验曲线—产出错配修正 + 满级溢出 + 补习递增 — DONE
- `engine/nurture/rules.ts`：`getRequiredExpForLevel` = `round((level-1)^1.6 × 900)`（满级 Lv.100 = 1,403,650，旧 980 万的 ~1/7），注释给标定依据；严格单调递增（决策-14）。
- `engine/nurture/rules.test.ts`：关键节点按新曲线重算（f2=900/f3=2728/f10=30271/f100=1403650）、getLevelFromExp 边界（899/900/2728/30270/30271）、getLevelProgress（1814→50%）；新增「曲线严格单调递增」守卫测试（决策-15）。
- `config/nurture.ts`：`tutoringExpGain(level)=400+level×20`（TUTORING_EXP_BASE/PER_LEVEL 常量）；满级溢出 `EXP_OVERFLOW_PER_KP=2000` + `expOverflowExchange(gained, carry)` 纯函数（带 carry 结转，仿 bondOverflowExchange）（决策-16/17）。
- `stores/nurture.ts`：`addCharacterExp` 满级分支——计算本次跨过满级阈值的溢出净额，走运行态 `expOverflowCarry` Map 累进，满 2000 自动 `profile.earn('knowledgePoints')` + 日志（不进存档，重启归零）；`tutorCharacter` 改用 `tutoringExpGain(nurtureData.level)`（决策-16/17）。
- `views/NurtureView.vue`：补习按钮文案改动态 `tutorExpGain` computed（去「+500 经验」静态文案）。
- 测试：`config/nurture.test.ts`（新建）覆盖 tutoringExpGain 递增/钳制 + expOverflowExchange carry；`stores/nurture.test.ts` 加补习递增、满级溢出自动转 KP、跨次结转、未满级不触发四组用例。

### SD-T3｜重复装备分解出口 — DONE
- `config/equipment.ts`：`EQUIPMENT_DISMANTLE_VALUES`（R50/SR150/SSR500/HR1200/UR3000，约兑换价 1/8）+ `dismantleValueForRarity(rarity)` 纯函数，明显低于 `EQUIPMENT_PRICES` 防套利（决策-18/20）。
- `stores/equipment.ts`：`dismantleItem(uid)`——登录校验 + `findEquippedBy` 守卫（已装备件拒绝）+ 移除 inventory 实例 + `profile.earn` KP + 日志（决策-18/19）。
- `stores/userStore.ts`：门面 `dismantleEquipment(uid)`（登录校验 → store 成功 → saveToServer，仿 unequipItem）（决策-19）。
- `components/nurture/InventoryPanel.vue`：游离件（freeUid != null）显示「🔨 分解 (+N KP)」按钮走门面，已装备件不显示（双保险）。
- 测试：`config/equipment.test.ts` dismantleValueForRarity（>0 且 <兑换价、随稀有度递增、未知稀有度 0）；`stores/equipment.test.ts` 分解游离件得 KP、已装备件拒绝、卸下后可分解且只删指定实例、未登录/未知 uid 拒绝。

## 未完成（卡点）
无。三任务全部落地。

## 每条验收命令实际输出

### 1. `npm run type-check`
```
> vue-tsc --build
```
（0 错误，无输出即通过）

### 2. `npm run test`
```
 Test Files  63 passed (63)
      Tests  765 passed (765)
   Duration  10.34s
```

### 3. `npm run build`
```
✓ built in 10.15s
（dist 产物齐全，index-B0Pi8Q8J.js 294.18 kB gzip 101.25 kB 等）
```

### 4. 后端安全基线（.venv/Scripts/python.exe backend/test_security.py）
```
RESULT: PASS — all security checks passed
```
（全部 PASS：鉴权/越权拒绝/乐观并发 409/原子写/邀请码门控）

### 5. `grep -rn "debug=True" backend/server.py api/index.py`
```
grep exit: 1
```
（零命中，退出码 1 = no match）

## 新坑
- `stores/equipment.ts` 之前不 import profile；SD-T3 分解需 earn KP，已加 `import { useProfileStore } from './profile'`（store 层惰性调用 useProfileStore()，无循环依赖问题——equipment 不被 profile import）。
- 满级溢出 carry 存运行态 Map（不进存档）：重启丢失极少量未满一份（<2000）的结转经验，属可接受取舍，避免为微收益升 SAVE_VERSION。已在代码注释与本报告标注。
- SD-T2 弱化后 comfort 6 点（<10）→ comfortBonusPct=0，故 homestead 装备结算测试 expEach 由「expPct 主导」变小，是预期口径变化（已同步测试）。

## 文件结构变更自报
- 新增：`frontend-vue/src/config/nurture.test.ts`（tutoringExpGain + expOverflowExchange 纯函数测试）。
- 改：`engine/nurture/rules.ts`、`engine/nurture/rules.test.ts`、`config/nurture.ts`、`config/equipment.ts`、`config/equipment.test.ts`、`stores/nurture.ts`、`stores/nurture.test.ts`、`stores/equipment.ts`、`stores/equipment.test.ts`、`stores/homestead.test.ts`、`stores/userStore.ts`、`components/nurture/EquipPickerModal.vue`、`components/nurture/InventoryPanel.vue`、`views/NurtureView.vue`。
- 文档：`docs/FUTURE.md` S14-D 三条勾 `[x]`（附实况）、`docs/plans/SPRINT.md` 主清单 SD-T2/T3/T4 + 收尾轮决策-11..20 + 验收全勾。
- **SAVE_VERSION 保持 v17 不变**（三任务均无新存档字段，本 Sprint 唯一 bump 已在 Round 1 用掉）。

## 状态
PASSED — SD-T2 + SD-T4 + SD-T3 全部真实现，S14-D 整体完成（SD-T1..T5 全 `[x]`）；验收命令 1/2/3/4 全绿、命令 5 零命中；SAVE_VERSION v17 未动，未破坏 S14-A/B/C 既有项与 Round 1 facility 域。
