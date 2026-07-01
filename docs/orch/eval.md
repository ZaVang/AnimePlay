# Eval — S14-A 第 3/3 轮（product-loop --tier1 on --mode all）

> 本轮切片 = SA-T4（签名覆盖表回归锁）+ SA-T5（扫荡日循环 + v15 存档回归锁），与第 2 轮同一切片。
> tier1 on → 引擎跑满 3 轮，本轮定位 = 验收再确认 + 抓回归，决策仅信息性。日期：2026-07-01。
> Evaluator 亲自重跑全部验收命令 + 独立抽查实现真实性（不改源码）。

## Checkbox 状态核对（SPRINT.md）

- SA-T1/T2/T3（第 1 轮切片）：`[x]`，非本轮范围。
- SA-T4（本轮 + 第 3 轮回归锁）：`[x]` ✓ 与实现一致。
- SA-T5（本轮 + 第 3 轮回归锁）：`[x]` ✓ 与实现一致。
- SA-T6：`[]` — 明确排第 3 轮切片之外（依赖 SA-T1），非本轮范围，正确保持未勾。

## 验收命令重跑实际输出（Evaluator 亲自跑）

1. `npm run type-check`（vue-tsc --build）→ **PASS**，0 错误、无输出。
2. `npm run test`（vitest run）→ **PASS**：`Test Files 58 passed (58) / Tests 653 passed (653)`，Duration 16.95s。
3. `npm run build` → **PASS**：`✓ built in 8.07s`，`dist/assets/HomesteadHubView-BaznqauH.js 98.55 kB / gzip 32.07 kB` 正常产出。
4. `python backend/test_security.py`（.venv python）→ **PASS**：`RESULT: PASS — all security checks passed`，`EXIT=0`（鉴权/越权 401/乐观并发 409/原子写/邀请码门控全 PASS）。
5. `grep -rn "debug=True" backend/server.py api/index.py` → **零命中**（两文件均 No matches found）。

## 自报 vs 实际对比

完全一致。Gen 自报 type-check PASS / test 653 全绿 / build 8-9s / security PASS EXIT0 / grep 零命中——逐条复跑吻合（test 数一致 653，build 产物哈希一致 HomesteadHubView-BaznqauH.js，security 全 PASS）。本轮自报「零源码改动」，与文档改动一致。

## pitfalls 合规

- engine 纯净：`grep -rn "Math.random|@/stores|from 'pinia'" frontend-vue/src/engine/` 仅命中注释/README/`rng.ts:81` 唯一 sanctioned `defaultRng`——**无违规**。
- SAVE_VERSION=15（schema.ts:37），本轮未再升 schema，符合红线。
- 扫荡字段扁平定长 `sweepWeekKey`/`sweepUsedThisWeek`（非 Record<floor,count>、未硬复用 stub `todayAttempts/lastAttemptDate`）——符合拍板②。
- 无动态色类/text-white 新增（本轮零源码改动）。

## 真实性抽查结论（Read/Grep 不改码）

- **SA-T4 属实**：`SIGNATURE_KIT_OVERRIDES`（squadSkillKits.ts:411-551）确为 **10 个招牌 UR**（3575/10440/304/706/10439/49/12393/10596/1211/303），落 8~12 区间、未扩到 20。差异全在机制层（silence 点名 / allEnemies stun+slow / self 三叠 buff / dispel+atkDown+silence / 群疗+cleanse+revive / 长 silence / energyGain+haste / 单体 dot / execute+吸血 / shield+taunt），非纯倍率。全走结构化 `effects`（无手写 description），只用 9 种 squad SkillEffect，无 /battle effectId 泄漏。`isSignatureKit` 留口存在。
- **SA-T5 属实**：`sweepFloor`（pve.ts:119-134）独立 action，只读 `hasCompletedFloor` 判资格、记 `sweepUsedThisWeek`、返回缩水 reward，**绝不调 completeFloor**、不推进 currentFloor。跨周 `ensureThisSweepWeek` 读时归零 + 回拨钳位（周键相等即不重置）。三处同改齐备：schema.ts（字段+default ''/0+v15 沿革）/ migrations.ts（类型守卫补缺省）/ pve.ts 装配器。`migrations.test.ts` 覆盖 v14→补缺省 / 计数往返一致 / 脏档回落。`rewards.test.ts` 断言缩水（sweep << 首通）+ 边际递减（high-low<60）+ 周产出 << 十层推塔（防通胀）+ 绝对封顶。
- engine 纯净复核：无新增违规。

## 失败原因

无。

## 新坑待追加

无新代码坑。既有维护性提醒（`weekKey` 在 pve.ts 与 daily.ts 双份同源，改算法两处同改）已在 pitfalls 记录，非本轮动手项。

## 决策

**COMPLETE** — 5 条验收命令全部 Evaluator 亲自复跑通过（type-check 0 / test 653 全绿 / build 通过 / security PASS EXIT0 / grep 零命中）；SA-T4 + SA-T5 回归锁本轮零改动确认，两 SA-T 真实性抽查属实、红线全部成立（SAVE_VERSION=15 未再动 / SIGNATURE_KIT=10 未扩 / 扫荡字段扁平定长 / sweepFloor 不调 completeFloor / engine 纯净）。tier1 on 决策为信息性，引擎已跑满 3 轮。
