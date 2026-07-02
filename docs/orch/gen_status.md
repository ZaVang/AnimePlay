# Generator Status — S15 第 3/3 轮（product-loop --tier1 on --mode all，Sprint 收官轮）

指派切片 = **S15-T4（装备定向掉落 = 槽位保底 pity，选项 a）+ Sprint 收尾（S15-T1..T4 全 `[x]`、S14 无回归）**。

## 状态：PASSED

## 完成任务

### S15-T4 槽位保底 pity —— 真落地（拍板 A–F 全遵；G 去重池标 backlog）

复用 v20 存档（未升 v21），engine 纯净不破（计数留 store，drops.ts 零 config import / 零 Math.random），
掉落经既有 `rollFloorDrop` 单一 seam 汇入（不另拼口径）。稀有度仍走层段（`dropRarityForFloor`），pity 只叠一层槽位下界。

- **T4-0｜config 阈值常量 + engine 纯函数（`config/equipment.ts` + `engine/squad/drops.ts`）**
  - `config/equipment.ts`：新增 `SLOT_PITY_THRESHOLD = 10`（顶部集中，改这里即调平；远小于 gacha 70，因掉落频率本就低 50%×每层一次）+ `clampSlotPity(raw)` 归一（仿 `clampEnhance`：非数/非有限→0，clamp `[0, SLOT_PITY_THRESHOLD]`，脏档巨值不放大）。
  - `engine/squad/drops.ts`：新增 `SlotPity`（3 键 weapon/armor/supporter）+ `createSlotPity()` + `TowerDropWithPity` + **`rollTowerDropWithPity(floor, rng, rarityForFloor, pity, threshold, dropChance)`** 纯函数——注入 RNG + 注入当前计数 + 注入阈值/映射，返回 `{ drop, pity }`（新副本，不改入参）。语义：① 某槽计数≥阈值→强制命中该槽跳过 chance（多槽到阈值按 DROP_SLOTS 固定序取第一个，确定性）；② chance 未过→无掉落各槽 +1；③ 命中槽归零、其余 +1。`threshold<=0` 关闭保底。空池 `rng.pick ?? 'weapon'` 兜底不抛错。
- **T4-1｜pity 计数持久化（复用 v20，`TowerProgress` 定长字段，三处同改）**
  - `types/player.ts`：`TowerProgress` 加 `slotPity: { weapon; armor; supporter }`（定长 3 键，非 Record，随层数/次数不膨胀，仿 `sweepUsedThisWeek`）。
  - `infra/persistence/schema.ts`：`createDefaultTowerProgress` 补 `slotPity: {0,0,0}`（**内联缺省，禁 import engine，避免 schema→engine 依赖环**）+ v20 沿革注释补 pity 一行。**SAVE_VERSION 保持 20（未升 21）**。
  - `infra/persistence/migrations.ts`：`migrateTowerProgress` 加 slotPity 白名单重建（**禁 spread**）——旧档无字段→补全零，三键各经 `clampSlotPity`（脏档巨值 clamp 到阈值、负数/非数→0）。import 加 `clampSlotPity`。
  - `stores/pve.ts`：`deserialize` 二次兜底再 clamp slotPity（迁移已归一，反序列化再保险，双层杜绝脏档，仿装备强化）。
- **T4-2｜store 编排 + 防退化守卫（`stores/userStore.ts`）**
  - `rollFloorDrop` 改用 `rollTowerDropWithPity`：读 `pve.towerProgress.slotPity` → 传当前计数 + `SLOT_PITY_THRESHOLD` + `DROP_CHANCE` → **无条件写回新计数**（含未掉落各槽+1 的推进）→ 命中才 addItem。仍只在 `completeFloor` 的 `pve.completeFloor(floor)===true`（推进新层）分支调用——顶层（≥999 返 false）/ 重复低层（不推进）/ 扫荡（`sweepFloor` 独立路径）**绝不推进 pity**（防墙钟/刷保底漏洞）。
- **T4-3｜UI 显形「距保底 N 次」（`views/HomesteadHubView.vue`）**
  - 新增 `pve.getSlotPityStatus()`（纯读，返 `{slot, count, remaining, ready}`，最高计数槽 + 剩余 clamp≥0 + 满即 ready）→ 门面转发 → view `slotPity` computed（并入 SLOT_META 图标/标签 + 阈值）。
  - 探索面板「奖励预览」卡新增 `.pity-line`：未满显「距 ⚔️武器 保底还差 N 次通层掉落判定」，满显「🎯 下次通新层必出 …（槽位保底已满）」高亮。**语义令牌配色**（`--c-accent` / `--c-accent-soft` / `--c-surface-2` / `--c-line` / `--c-ink-2`，全存在于 skins.css；无 text-white / 无动态色类 / 无反斜杠透明度）。无新 setTimeout/setInterval。

### S15-T4-收尾｜Sprint 收官核对 —— 通过
主清单 S15-T1/T2/T2-E/T3/T4 全 `[x]`；SAVE_VERSION=20 未误升 21；S14 33 项无回归（未动 facility 乘区/softCap/comfort 硬顶/羁绊 cap/层段稀有度映射；pity 只叠一层下界不改既有掉落率）。

## 验收命令实际输出

### 1. `npm run type-check`（期望 0 错误）→ PASS
```
> vue-tsc --build
（无输出，退出 0）
```

### 2. `npm run test`（期望全绿，连跑 3 次无偶发失败）→ PASS
```
第 1 次：Test Files 67 passed (67) / Tests 917 passed (917)
第 2 次：Test Files 67 passed (67) / Tests 917 passed (917)
第 3 次：Test Files 67 passed (67) / Tests 917 passed (917)
```
（898 → 917，+19：drops.test.ts pity 特征 7 例 + migrations.test.ts v20 slotPity 迁移 4 例 + equipmentSource.test.ts 编排/防退化/显形 7 例，扣除首例逼近路径合并。）
新增/改测试：
- `engine/squad/drops.test.ts`：`rollTowerDropWithPity` 特征——未掉落各槽+1 / 命中归零其余+1（入参不被改）/ **保底边界（计数达阈值→强制命中该槽跳过 chance + 连续未出逼近路径）** / 强制命中稀有度仍走层段 / 多槽到阈值固定序 / threshold≤0 关闭 / 序列 RNG 复现。
- `infra/persistence/migrations.test.ts`：v19 旧档补全零 / 往返保真 / 脏档巨值-负数-非数 clamp / slotPity 整体非对象→全零。
- `stores/equipmentSource.test.ts`：completeFloor 未掉落各槽+1 / 命中归零其余+1 / **保底触发强制该槽** / 重复低层不推进 / 顶层不推进 / **扫荡不推进 pity** / getSlotPityStatus 显形。

### 3. `npm run build`（期望成功）→ PASS
```
✓ built in 8.26s
（HomesteadHubView-*.js 130.67 kB 等产物正常）
```

### 4. `.venv/Scripts/python.exe backend/test_security.py`（期望退出码 0、全 PASS）→ PASS
```
RESULT: PASS — all security checks passed
EXIT=0
```

### 5. `grep -rn "debug=True" backend/server.py api/index.py`（期望零命中）→ PASS
```
EXIT=1（零命中）
```

## 文件结构变更自报
- 改（无新建文件）：
  - `frontend-vue/src/config/equipment.ts`（SLOT_PITY_THRESHOLD + clampSlotPity）
  - `frontend-vue/src/engine/squad/drops.ts`（SlotPity/createSlotPity/rollTowerDropWithPity）
  - `frontend-vue/src/engine/squad/drops.test.ts`
  - `frontend-vue/src/types/player.ts`（TowerProgress.slotPity）
  - `frontend-vue/src/infra/persistence/schema.ts`（默认工厂 + 沿革注释）
  - `frontend-vue/src/infra/persistence/migrations.ts`（migrateTowerProgress slotPity）
  - `frontend-vue/src/infra/persistence/migrations.test.ts`
  - `frontend-vue/src/stores/pve.ts`（deserialize clamp + getSlotPityStatus + 导出）
  - `frontend-vue/src/stores/userStore.ts`（rollFloorDrop 接 pity + 转发 getSlotPityStatus + import）
  - `frontend-vue/src/stores/equipmentSource.test.ts`
  - `frontend-vue/src/views/HomesteadHubView.vue`（slotPity computed + .pity-line 显形 + 样式）
  - `docs/plans/SPRINT.md`（S15-T4 主清单 + 第 3 轮子项 + 收尾勾选）

## 未完成 / 卡点
无。指派切片 S15-T4 + 收尾全部真落地并验收全绿。

## 新坑 / 提醒
- **pity 计数在「判定发生」而非「掉落」时推进**：未掉落（chance 未过）也让各槽 +1（因为「这次判定没出任何槽」），故保底逼近速度按每次通新层计（约每 10 层触发一次某槽兜底）。若后续要改成「只在真掉落时计」需重定义逼近曲线与测试。
- **保底与掉落率解耦**：pity 强制命中直接给 drop（跳过 50% chance），不改 DROP_CHANCE 也不改层段稀有度——只对「槽位分布」加下界。S14 掉落数值口径未动。
- **多槽同到阈值按 weapon→armor→supporter 固定序消化**：engine `DROP_SLOTS.find` 与 store `getSlotPityStatus` 并列取序一致（确定性，无随机破坏可复现）。
- **T4 未做拍板-G 去重池叠加**（候选池优先未拥有件）：与 pity 主线正交但非验收项，成本/收益比在收官轮偏低，标 backlog（同 negotiation 中碎片/图鉴集邮/升维）。
- v20 已被 furniture（第 2 轮）+ slotPity（本轮）共用；后续升档轮才动 v21。既有 `migrations.test.ts` `expect(SAVE_VERSION).toBe(20)` 断言仍成立、未改。
