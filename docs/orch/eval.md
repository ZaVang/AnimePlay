# QA Evaluator — S14-D 收尾轮（product-loop --tier1 on --mode all，切片 = SD-T2 + SD-T4 + SD-T3）

> 注：orchestration 传入「第 undefined 轮 / 切片 [native code]」是未渲染模板占位符。以 SPRINT.md 收尾轮段 + gen_status.md 为准：**本轮 = S14-D 收尾轮，指派切片 = SD-T2 + SD-T4 + SD-T3**（Round 1 已落地 SD-T1+SD-T5）。

## 决策：COMPLETE（tier1 on 为信息性；本轮指派 SD-T2/T3/T4 均真实现，非空跑）

一句话结论：五条验收命令我已亲自全部重跑通过；本轮指派的 SD-T2 + SD-T4 + SD-T3 **均真实落地**（非回归空跑），S14-D 整体完成（SD-T1..T5 全 `[x]`）；决策 = COMPLETE。

---

## 1. Checkbox 状态核对（SPRINT.md + FUTURE.md）
- SPRINT.md 主清单：SD-T1..SD-T5 全 `[x]`；收尾轮决策-11..20 全 `[x]`；收尾轮验收全 `[x]`。
- FUTURE.md S14-D：五条全 `[x]`，各附落地实况（与实现一致）。
- 本轮指派切片 = SD-T2/T3/T4，均已勾选且**代码属实**（见 §5）。

## 2. 验收命令实际重跑输出（Evaluator 亲跑，非采信自报）
1. `npm run type-check` → `vue-tsc --build` 无输出、0 错误 ✅
2. `npm run test` → **Test Files 63 passed (63) / Tests 765 passed (765)**，Duration 10.53s ✅
3. `npm run build` → `✓ built in 8.09s`，dist 齐全（index-B0Pi8Q8J.js 294.18kB gzip 101.25kB）✅
4. `.venv/Scripts/python.exe backend/test_security.py` → `RESULT: PASS`，**EXIT=0**（鉴权/越权 401/并发 409/原子写/邀请码全 PASS）✅
5. `grep -rn "debug=True" backend/server.py api/index.py` → **GREP_EXIT=1（零命中）** ✅

## 3. 自报 vs 实际对比
完全一致。gen_status 报 765/765、build ✓、security PASS、debug 零命中——逐条复跑吻合，无夸大。

## 4. pitfalls 合规
- engine 纯净：`grep "Math.random|@/stores|from 'pinia'" src/engine/` 仅命中注释与 rng.ts defaultRng，**无新增违规** ✅
- 货币口径：nurture/equipment/InventoryPanel/NurtureView 无 `core.knowledgePoints` 直改；分解走 `profile.earn`、补习 `profile.spend`、溢出 `profile.earn` ✅
- 存档：SAVE_VERSION 保持 **17 未动**（三任务无新字段）✅
- 颜色：EquipPicker delta 用 `deltaClass` 语义色；`text-white` 唯一命中在 rarity `bg-gradient-to-r` 徽章（文档固定例外）✅
- 未破坏 S14-A/B/C 与 Round 1 facility 域：63 测试文件全绿含 migrations/homestead/facility 往返 ✅

## 5. 真实性抽查结论（Read/Grep，未改码）
**SD-T2 — 真实现**：catalog homeEffect 产出%实测全部 ≤0.06（弱化到位）、comfort 保留、`resolveHomeEffect` 单一口径；EquipPickerModal `sumHomeForSlots` 三槽求和 → homeRows current→next(+Δ) 语义色，⭐ delta 子项落地。
**SD-T4 — 真实现**：`getRequiredExpForLevel=round((level-1)^1.6×900)` 注释标定 + 严格单调递增守卫测试；`addCharacterExp` 满级分支算**净溢出额**（非全量）+ carry 结转 + 满 2000 自动 earn；`tutoringExpGain(level)=400+level×20` + NurtureView 动态文案。
**SD-T3 — 真实现**：`dismantleValueForRarity`(R50..UR3000) 明显低于兑换价防套利；`dismantleItem` 登录+findEquippedBy 守卫+earn KP+日志；`userStore.dismantleEquipment` 门面+saveToServer；InventoryPanel 仅游离件显示按钮（双保险）；equipment.test 覆盖分解/已装备拒绝/只删指定件/未登录拒绝。

## 6. 失败原因
无。

## 7. 新坑待追加
- 满级经验 carry 存运行态 Map（不进存档），重启丢失 <2000 未满一份的结转——有意取舍（避免微收益升档），可接受，Generator 已标注。
