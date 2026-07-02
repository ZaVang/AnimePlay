# QA Evaluator — S15 第 3/3 轮（product-loop --tier1 on --mode all，Sprint 收官轮）

指派切片 = **S15-T4（装备定向掉落 = 槽位保底 pity，选项 a）+ Sprint 收尾（S15-T1..T4 全 `[x]`、S14 无回归）**。
决策：**COMPLETE**（tier1 on 已跑满 3 轮，本轮切片真落地、五条验收命令亲自复跑全绿、test 连跑 3 次稳定 917）。

## 1. Checkbox 状态（SPRINT.md 亲自核对）
主清单 + 三轮追加全 `[x]`：
- 主清单：S15-T1(L20) / S15-T2(L23) / S15-T3(L27) / S15-T4(L30) 全 `[x]`。
- 第 1 轮：S15-T1(L64) / S15-T3(L70) `[x]`。
- 第 2 轮：S15-T2(L85) / S15-T2-E(L94) `[x]`。
- 第 3 轮（本轮）：S15-T4(L111) / S15-T4-收尾(L121) `[x]`。
grep `^- \[ \]` 零命中——无遗留未勾选项。

## 2. 验收命令重跑实际输出（Evaluator 亲跑，非信自报）
1. `npm run type-check` → **PASS**（vue-tsc --build 无输出退出 0）。
2. `npm run test` **连跑 3 次**（S15-T1 核心验收）→ **3 次全绿无偶发**：
   - 第 1 次：Test Files 67 passed / Tests 917 passed（25.21s）
   - 第 2 次：Test Files 67 passed / Tests 917 passed（16.64s）
   - 第 3 次：Test Files 67 passed / Tests 917 passed（23.79s）
3. `npm run build` → **PASS**（✓ built in 13.87s；HomesteadHubView 130.67kB 产物正常）。
4. `.venv/Scripts/python.exe backend/test_security.py` → **PASS**（RESULT: PASS，EXIT=0）。
5. `grep -rn "debug=True" backend/server.py api/index.py` → **零命中**（两文件均 No matches）。

## 3. 自报 vs 实际对比
完全一致。自报 917/917 × 3 次、build 成功、security PASS、debug 零命中——逐条复跑吻合。type-check/build/test 计数与耗时量级均对得上。**无夸大、无偷跑。**

## 4. pitfalls 合规
- engine 纯净：`grep -rn "Math.random|@/stores|from 'pinia'" src/engine/` 仅命中注释 + rng.ts 内唯一合规 `defaultRng`（line 118）。drops.ts 零 config import / 零 Math.random，`rollTowerDropWithPity` 纯注入（RNG + 计数 + 阈值 + 映射），返回新副本不改入参。✔
- 货币走 profile：pity 主线不碰货币（只叠槽位分布），无违规。✔
- 存档三处同改：schema.ts（TowerProgress.slotPity 默认工厂 L386 + 沿革 L41-42）+ migrations.ts（migrateTowerProgress slotPity 白名单重建 L88-92，禁 spread，三键 clampSlotPity）+ pve.ts deserialize 二次 clamp（L179-183）。SAVE_VERSION=20 未误升 21（L57）。✔
- 定时器：UI 无新增 setTimeout/setInterval。✔
- 颜色：pity-line 全语义令牌（--c-ink-2/--c-accent/--c-accent-soft/--c-surface-2/--c-line），`/` 透明度语法正确，无 text-white / 无反斜杠 / 无动态拼色类。✔
- 收益口径未另拼：pity 只对槽位分布加下界，稀有度仍走 dropRarityForFloor 层段，DROP_CHANCE 未改，S14 掉落数值口径未动。✔

## 5. 真实性抽查结论（Read/Grep，不改码）
S15-T4 **真落地、机制真生效、非空跑**：
- **engine 纯函数注入 + 序列可复现**：drops.ts `rollTowerDropWithPity` 语义完整（到阈值强制命中固定序第一个槽跳过 chance / chance 未过各槽+1 / 命中归零其余+1 / threshold<=0 关闭 / 空池兜底 weapon）。drops.test.ts 断言到阈值强制命中、逼近路径、强制命中稀有度仍走层段、多槽固定序、threshold≤0 关闭、序列 RNG 复现（真断言非占位）。
- **store 编排 + 防退化守卫真生效**：userStore `rollFloorDrop`（L253）读 slotPity → 传阈值/DROP_CHANCE → 无条件写回新计数 → 命中才 addItem；**仅在 completeFloor 的 `pve.completeFloor(floor)===true` 分支调用**（L852-858）。pve.completeFloor：floor≠currentFloor 返 false（L75，重复低层不推进）、floor≥999 返 false（L76，顶层不推进）；sweepFloor 独立路径绝不调 completeFloor（L120）。equipmentSource.test.ts 亲测「重复低层 slotPity 不动」「顶层 999 不动」「扫荡不动」「保底触发强制该槽+归零」「getSlotPityStatus 显形 remaining/ready」——防墙钟/刷保底漏洞守死。
- **持久化往返 + 脏档 clamp**：migrations.test.ts 覆盖 v19 旧档补零 / 往返保真 / 脏档巨值·负数·非数 clamp / slotPity 非对象→全零。clampSlotPity（config/equipment.ts L138）clamp 到 [0, SLOT_PITY_THRESHOLD]。
- **UI 显形（拍板-F 验收项）**：HomesteadHubView slotPity computed（L212）+ .pity-line（L524：未满显「距 X 保底还差 N 次」，满显「🎯 下次通新层必出 X」高亮），getSlotPityStatus 固定序与 engine 一致。
- G 去重池未叠加，标 backlog（非验收项，正当）。

## 6. 失败原因
无。

## 7. 新坑待追加
- pity 计数在「判定发生」而非「掉落」时推进（未掉落各槽也+1），逼近速度按每次通新层计（≈每 10 层触发一次某槽兜底）；若后续改成「只在真掉落时计」需重定义曲线与测试。
- v20 已被 furniture（第 2 轮）+ slotPity（本轮）共用，后续升档轮才动 v21；migrations.test.ts `expect(SAVE_VERSION).toBe(20)` 仍成立。
- 多槽同到阈值按 weapon→armor→supporter 固定序消化（engine `DROP_SLOTS.find` 与 store `getSlotPityStatus` 取序一致，确定性）。

## 8. 决策
**COMPLETE** —— 本轮指派切片 S15-T4 + Sprint 收尾真实现（非回归/空跑），五条验收命令 Evaluator 亲自复跑全绿、S15-T1 核心 test 连跑 3 次稳定 917 全通、SAVE_VERSION=20 未误升 21、engine 纯净、S14 33 项无回归、UI 显形到位。S15（T1..T4）整体完成。
