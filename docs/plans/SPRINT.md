# AnimePlay — SPRINT 合同（S15：家园 hub 内容补完 + 测试稳定 · S14 遗留收尾）

> product-loop 执行合同（建议 `--tier1 on --mode all --max_iter 3`）。**尚未开始**——本文件即 S15 合同，说「跑 S15」即可启动。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S15 全部任务（S15-T1..S15-T4）**。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S15，**绝不表示可以跳过本轮被指派的 S15-T 任务**（历史教训 SA-T6/暴击UI/SE-T1收口/SF-T8-resume 均因误判「新范围」或中断被漏，Evaluator 须对空跑判 CONTINUE；见 pitfalls）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S15、`docs/HISTORY.md` S14 节（33 项已落地机制）、`docs/orch/homestead-hub-audit-report.md`（P3-3/4/5 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 相关面：`views/HomesteadView.vue`（家园广场 WALKABLE_ZONES / 设施 / 离线收益 / 60s 驻留定时器）、`stores/homestead.ts` + `config/homestead.ts`（`computeIdleYield` / comfort 软加成 / `HOMESTEAD_EFFECT_CAP` softCap）、`stores/facility.ts`（设施乘区，v17）、`stores/userStore.ts`（`settleHomestead` 含回拨钳位）、`stores/daily.ts`（`ensureToday`/`todayKey` + commission 子域 v19）、`data/squadSkillKits.ts`（`resolveRole` 定位单源，SC-T1）、`engine/squad/drops.ts` + `config/equipment.ts`（塔掉落 / 目录 / dismantle / 强化 / 套装）、`stores/collection.ts`（`getCharacterCardCount`）、`stores/profile.ts`（spend/earn）；存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（当前 **SAVE_VERSION=19**）。
- 本 Sprint = **S15 家园 hub 内容补完 + 测试稳定**：收干净 S14 遗留的 flaky 测试 + 补上 S14-F 标「留 S15+」的中期内容（家具 / 入住羁绊 / 装备定向掉落）。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/`Math.random`；掉落/羁绊/家具加成走纯函数 + 注入 RNG）/ 依赖只向下 / **货币只走 `profile.spend·earn`** / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改养成或挂机规则前先看对应 `*.test.ts`。**别破坏 S14-A~F 已成 33 项**（战力单一 seam / facility v17 / 装备强化 v18+套装+modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成 / softCap 分层封顶 / 墙钟钳位…）。
**存档变更协议（S15-T2 必、S15-T4 可能）**：新增/改存档字段必须 **schema + migrations + 装配器三处同改 + 往返测试**；SAVE_VERSION 现=19，本 Sprint 升 **20**（一次 sprint 只升一次，furniture 域 + pity 计数等共用同一 bump；v19→v20 迁移旧档补默认）。S15-T1/S15-T3 预期零存档。**收益/战力加成经既有 `computeIdleYield` / `resolveEquipBonus` 口径汇入，严禁另拼。**

## 任务清单（S15 = S15-T1..S15-T4）

- [ ] **S15-T1｜flaky 测试稳定化（工程债，零玩法改动）**
  - 目标：定位并根除 S14-F 期间 back-to-back 跑偶发的 2 个 flaky 失败（standalone 全绿）。先 grep `setInterval`/`setTimeout`/`Date.now`/`new Date` in 测试与被测组件，重点查 `HomesteadView` 60s 驻留定时器、`stores/userStore.settle.test.ts`、`daily`/`settle` 跨天判定；用注入时钟 / `vi.useFakeTimers` / 固定种子替换真实时间与真随机依赖。**只改测试与（必要时）为可测性做的最小时钟注入，不改玩法数值。**
  - 验收：连跑 `npm run test` 3 次全绿（无偶发失败）；被测路径无裸 `Date.now`/`setInterval` 依赖真实时间导致的时序不稳定；type-check/build 通过。
- [ ] **S15-T2｜轻量家具 / 布局系统（P3-4，本 Sprint 唯一存档重任务 v20）**
  - 目标：新增 `furniture` 存档域（v20，独立域仿 facility），KP 兑换家具目录（名梗风、仿 `EQUIPMENT_CATALOG` 结构，纯数据 config），摆放进家园广场（复用 `WALKABLE_ZONES` 坐标或简单固定槽位），每件给**小额 comfort / 产出加成**——**经既有 comfort 软加成 / 设施乘区口径并入 `computeIdleYield`，不新拼收益口径**。存档三处同改 + 往返测试 + SAVE_VERSION→20（旧档补空家具）。UI 在 `HomesteadView` 给家具兑换 + 摆放/收纳入口。
  - 验收：可 KP 买家具（走 `profile.spend`）、摆放持久化跨重开保真、加成真进挂机收益（经 computeIdleYield 口径）；v20 迁移往返测试；type-check/test/build 通过。
- [ ] **S15-T3｜入住羁绊 / 差异化速率（P3-5）**
  - 目标：让「选谁入住」有策略。二选一或都做（Planner 定）——(a) 入住角色差异化挂机速率（按 role/rarity 倾斜 exp/affection，复用 SC-T1 `resolveRole`）；(b) 入住组合羁绊（特定角色/同作品同住 → 小额加成）。engine 纯函数 + config，加成经 `computeIdleYield` 口径；**羁绊/速率优先派生免存档**（派生自 placedCharacterIds + role/anime）。
  - 验收：不同入住组合的挂机产出可辨、羁绊命中给确定加成/不命中不给、加成经既有口径；engine 纯函数测试（速率倾斜 / 羁绊计数）；不破坏现有挂机口径；type-check/test/build 通过。
- [ ] **S15-T4｜装备定向掉落保底 / 碎片（P3-3）**
  - 目标：缓解「塔掉落纯随机无定向」。二选一（Planner 定）——(a) **保底**：连续 N 次未出某槽/稀有度后保底该类（pity 计数）；(b) **碎片定向兑换**：成就/周任务/扫荡发碎片 → 换指定装备。掉落 RNG 注入不破确定性测试；pity 计数若需持久化则复用 v20 bump（三处同改）；碎片走 `profile` 货币口径或独立计数。
  - 验收：保底/定向真生效（特征测试断言 pity 边界 / 碎片兑换）、若持久化则往返保真、掉落纯函数注入 RNG 可复现；type-check/test/build 通过。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **S15-T1 + S15-T3**（测试稳定夯地基 + 入住羁绊 engine/config 轻量，零存档）。
> - 第 2 轮 = **S15-T2**（家具 v20，唯一存档重任务，单独做透三改+往返测试）。
> - 第 3 轮 = **S15-T4**（定向掉落/保底）+ 收尾（确保 S15-T1..T4 全 `[x]`、S14 无回归）。
> 每轮务必保持验收命令全绿、每子项独立可合并。v20 bump 仅在做 furniture/pity 的那轮做一次。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，S15-T1 要求连跑 3 次无偶发失败）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S15 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS，S15-T1 起 test 连跑 3 次稳定全绿），命令 5 零命中，且当轮承诺的 S15-T* 任务全部 `[x]` 并与实现一致。**S15 整体完成** = S15-T1..S15-T4 全 `[x]`。
