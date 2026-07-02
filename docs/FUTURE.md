# AnimePlay 演进 Roadmap（前进路线）

> **这是项目的单一前进任务源。** 只管「还剩什么、下一步做什么」。已完成的 Sprint（S0–S10）、产品进化层（Evo-1..Evo-9）、战斗可读性还债、2026-06-24 产品循环、**S13 家园综合系统**、**S14 家园 hub 深化（A~F 共 33 项，audit-driven）**等**完成史已归档到 [HISTORY.md](HISTORY.md)**——要查「做过什么、怎么做的、达到什么 Exit」去那边。
>
> 每个任务的「为什么/证据」：重构主线见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)；**S14 家园 hub 深化见 [orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)**（2026-07-01 对抗性审计，任务后附 `P#-#` 编号可回查该报告的 file:line 证据）。
>
> 用法：开工前看「进度总览」找当前 Sprint → 做完勾掉任务 → 一个 Sprint 的 Exit 全满足就把它标 ✅。后续日常产品迭代的需求源在 [SPRINT.md](SPRINT.md)。

## 🎯 终点与铁律

**终点**：多人 + 排行榜 + PvP 的可上线游戏。

**四条贯穿始终的架构铁律**（每个 Sprint 都不能违反）：
1. **engine 纯净**：`src/engine/` 只有纯游戏逻辑，零 Vue / Pinia / DOM / fetch / localStorage 依赖。它是将来与服务端共享的那层。
2. **依赖只向下**：`views → components → stores → engine`，下层绝不 import 上层。engine 出现 `import @/stores` = 架构破窗，靠 lint 闸拦死。
3. **RNG 可注入**：engine 内不直接调 `Math.random()`，随机源作为依赖注入（为 PvP 防作弊 + 服务端权威 + 可测试）。
4. **Sprint 独立可合并**：每个 Sprint 做完，游戏都处于可玩状态，即使后面的不做也不破。

目标目录结构与分层详见审计报告第三节及架构讨论（engine / types / config / data / infra / stores / composables / components / views / lib）。

**状态图例**：☐ 未开始 · 🔄 进行中 · ✅ 完成

---

## 📊 进度总览

| Sprint | 主题 | 状态 | 阶段 |
|---|---|---|---|
| S0–S10 | 重构主线（文档/测试/engine 抽取/拆 store/功能闭环/视觉/技能/性能/安全） | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| — | 产品进化层 Evo-1..Evo-9 + 战斗可读性还债 + 2026-06-24 产品循环 | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| S13 | 家园综合系统（基地养成 + 小队战斗重构 + 挑战塔闭环） | ✅ | A/A2/B/C1/C2/D1–D5 全部落地合并 → 完成史见 [HISTORY.md](HISTORY.md) |
| S14 | 家园 hub 深化（差异化 + 决策 + 循环，audit-driven，A~F 共 33 项） | ✅ | A/B/C/D/E/F 全部落地合并 → 完成史见 [HISTORY.md](HISTORY.md)（源：[审计报告](orch/homestead-hub-audit-report.md)） |
| S15 | 家园 hub 内容补完 + 测试稳定（S14 遗留收尾，T1..T4） | ✅ | flaky 根除(注入时钟) + 家具 v20 + 入住羁绊 + 掉落保底 pity 全部落地（详见下方 S15 节，917 测试全绿） |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S0–S14 已归档 [HISTORY.md](HISTORY.md)（S14 家园 hub 深化 A~F 共 33 项 audit-driven，源：[审计报告](orch/homestead-hub-audit-report.md)）；**S15 家园 hub 内容补完 + 测试稳定已全部完成**（T1..T4，flaky 根除 + 家具 v20 + 入住羁绊 + 掉落保底 pity，详见下方 S15 节，可择机与 S14 一并归档 HISTORY）。**下一主线 = S11 React 视图迁移 / S12 权威后端+多人/PvP/排行榜**（远期方向，到达时再 `/think` 细化）。下方「已知债 / Backlog」是穿插其间、需独立决策的散项。

---

## ✅ S15 — 家园 hub 内容补完 + 测试稳定（S14 遗留收尾）— 全部完成 2026-07-02

> ✅ **S15 全部 4 项已完成**（product-loop `--tier1 on --mode all`，3 轮，R2/R3 各遇一次 API 中断后 resume；917 测试全绿、连跑 3 次无 flaky、engine 纯净、SAVE_VERSION 19→20、S14 无回归）。落地实况：S15-T1 = **注入时钟接缝** `settleHomestead(nowOverride)`（把「时钟」与 RNG 一样降级为注入依赖，根除 `homestead.test.ts` 真实 `Date.now()` 双读 × 邻居 fake-timers 的跨 worker flaky，并为 S12 权威时间预留唯一入口）+ 统一 fake timers；S15-T3 = `engine/homestead/bonds.ts` `computeBondBonus`（同作品 ≥2 人等确定性集合羁绊，硬上限，**队伍级独立乘子经 `computeIdleYield` 口径**，派生免存档）+ 三处 UI 显形（含决策页 `HomesteadManageModal`）；S15-T2 = `furniture` 独立存档域 **v20**（KP 兑换家具目录 + 广场摆放 + 加成复用 `EquipmentHomeEffect` 形状经 `sumHomeEffects` 并入 `computeIdleYield`，三处同改 + 往返/脏档/子集测试）；S15-T4 = 槽位**保底 pity** `rollTowerDropWithPity`（engine 纯函数注入 RNG+计数、复用 v20、**防墙钟守卫：重复低层/顶层 999/扫荡均不推进 pity**、脏档 clamp、UI 显形）。产物见 `docs/orch/`。**中期内容剩项（家具布局深化/更多羁绊/碎片兑换）与 flaky 已根除——家园 hub 内容层补完。下一主线 = S11 / S12。**

**背景**：S14（A~F，33 项）已把家园 hub 从「半成品」补成完整玩法并全部合并归档。收尾时留下两类未做项——① 一处 flaky 测试（S14-F 复验时 back-to-back 跑偶发 2 失败、standalone 全绿，疑与 SF-T3 60s 定时器 / SF-T6 settle 的 `Date` 或并行争用相关）；② S14-F 明确标「留 S15+」的中期内容（比 P3 打磨重、属内容扩展而非收尾）。本 Sprint 把这两类收干净，让家园 hub 内容层也补完。**证据源**：[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)（P3-3/4/5）+ S14 完成史见 [HISTORY.md](HISTORY.md)。

**定位守则**：延续 S14——单机向二次元收集网页游戏，内容做「轻量、确定性、塑造选择」，不追随机刷取/付费深度。凡触 engine 守四条铁律；存档变更三处同改（schema/migrations/装配器）+ 往返测试，本 Sprint 至多升一次 SAVE_VERSION（现 19 → 20）。战力/收益仍走既有单一 seam（`resolveEquipBonus`/`resolveMemberBattleStats`/`computeIdleYield`），别另拼口径。

- [x] **S15-T1｜flaky 测试稳定化（工程债，零玩法改动）**：定位 S14-F 期间偶发的 2 个 flaky 失败（先 grep `setInterval`/`Date.now`/`new Date` in 测试与被测组件，重点查 `HomesteadView` 60s 定时器、`userStore.settle.test.ts`、`daily`/`settle` 的跨天判定）。用注入时钟 / `vi.useFakeTimers` / 固定种子替换真实时间与真随机依赖，消除时序/争用型不稳定。**Exit**：连跑 `npm run test` 3 次全绿、无真实 `Date.now`/裸 `setInterval` 泄漏进被测路径。
- [x] **S15-T2｜轻量家具 / 布局系统（P3-4）**：新增 `furniture` 存档域（v20），KP 兑换家具目录（名梗风，仿 equipment catalog），摆放进家园广场（复用 `WALKABLE_ZONES` 坐标或简单固定槽位），每件给小额 comfort/产出加成（**经既有 comfort 软加成 / 设施乘区口径汇入 `computeIdleYield`，不新拼收益口径**）。家园从「固定底图」变「可自定义基地」。存档三处同改 + 往返测试。**Exit**：可 KP 买家具、摆放持久化、加成真进挂机收益、往返保真。
- [x] **S15-T3｜入住羁绊 / 差异化速率（P3-5）**：让「选谁入住」有策略——给入住角色差异化挂机速率（按 role/rarity 倾斜 exp/affection，复用 SC-T1 `resolveRole`）或入住组合羁绊（特定角色/作品同住给小额加成）。engine 纯函数 + config，加成经 `computeIdleYield` 口径；羁绊/速率优先派生免存档。**Exit**：不同入住组合产出可辨、羁绊命中给确定加成、纯函数测试覆盖。
- [x] **S15-T4｜装备定向掉落保底 / 碎片（P3-3）**：塔掉落加**保底**（连续 N 次未出某槽/稀有度后保底该类）或碎片定向兑换（成就/周任务发碎片 → 换指定装备），缓解「纯随机掉落无定向」。保底计数若需持久化则复用 v20 bump（三处同改）；掉落 RNG 注入不破确定性测试。**Exit**：保底/定向真生效、pity 计数存档保真、掉落纯函数测试覆盖概率与保底边界。

> **排期建议**：第 1 轮 = S15-T1（测试稳定，先把地基夯实）+ S15-T3（入住羁绊，engine/config 轻量）；第 2 轮 = S15-T2（家具 v20，唯一存档重任务）；第 3 轮 = S15-T4（定向掉落）+ 收尾。合同见 [SPRINT.md](plans/SPRINT.md)（已就绪，`product-loop --tier1 on --mode all --max_iter 3` 可跑）。

---

## ☐ S11 — React 视图迁移（演进）

**目标**：视图层换 React，盖在已干净的 engine 上，拿到单一 TS 栈。

- [ ] 新建 React 应用骨架，直接复用 `engine / types / config / data / infra`
- [ ] 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」）
- [ ] `views` / `components` 按域用 React 重写
- [ ] 对照功能逐页验收

**Exit**：React 版功能对齐；engine 复用率 > 50%。
> 粗粒度。前置依赖 S2–S5 的 engine 必须已干净（已达成，见 HISTORY.md）。详细拆解在 [SPRINT.md](SPRINT.md)（仍决策门控/未激活）。到达时再 `/think` 细化。

---

## ☐ S12 — 权威后端 & 多人/PvP/排行榜（终点）

**目标**：达成多人闭环。

- [ ] `engine` 提升为前后端共享包（monorepo）
- [ ] Node 权威服务端（战斗/抽卡服务端计算，客户端预测）
- [ ] 排行榜（战绩/收集进度）
- [ ] PvP 匹配 + 对战

**Exit**：多人对战与排行榜上线。
> 粗粒度。决策门控（数据库选型、匹配机制等），到达时再 `/think`。下方 Backlog 的三项（品味契合度对照 / 声优维度 / beforeResolve 决策中除外）多数需后端配合，归此 Sprint 一并消化。
> 注：S14-F 的「墙钟回拨钳位」只是单机卫生改动；离线挂机的**权威时间**最终由本 Sprint 的权威后端解决。

---

## 🧾 已知债 / Backlog

穿插在 S11/S12 之间、需独立决策或后端配合的散项。**不属任何已完成 Sprint**，需要时单独立项。

### 🎮 gameplay 决策（可独立做，无后端依赖）

- ⚠️ **beforeResolve 临时强度计入结算档位的去留——已修复，待回访确认是否为最终设计**：原 bug（`battleFlow.resolveClash` 把 `addStrengthBonus` 只加进展示强度、rewards 档位用不含它的 `baseStrengths`，导致学霸气质/圆环理/运动天赋/SOS团氛围等 beforeResolve「+N强度」被动**不影响胜负**只改显示数字）已于 2026-06-17 由提交 `3c359cd` 修复：现在 engine 拿到的最终强度已含临时加成，展示与判定一致（`frontend-vue/src/stores/battleFlow.ts:441-453`）。**当前选择是「计入档位（增强）」**而非「从展示剔除（诚实）」。保留于此仅作回访路标：若将来做技能数值平衡时需要重新权衡这两条路径，从这里接着想；否则可视为已闭环。交叉引用：`frontend-vue/CLAUDE.md` Known Debt 的「行为=描述」簇。

### 🔌 需后端配合（归 S12，未做）

- ☐ **品味契合度对照 / taste-social compatibility**（玩家间品味重合度 / 社交化发现，"你和 X 87% 契合"）：2026-06-24 产品循环浮现的 #1 剩余结构性机会——persona 当前被困为单人镜子。需后端 + 触存档 schema，故归 S12。SPRINT.md 明确「本轮不做」。**前置可做**：纯前端异步「品味码」能在投入后端前先验证形态。
- ☐ **声优收集维度 / voice-actor dimension**（按声优收集 / seiyuu 相关玩法）：跨栈，需后端吐 `角色id→声优` 映射。actor 数据在 S9 性能优化时被 `server.py` 在服务 `all_animes` 路径上剥离（占体积 94%），前端拿不到，任何声优功能都需后端先恢复该映射。归 S12。
  > 注：此项在历史上以两处不同措辞出现（Evolution 尾注的「按声优收集维度」与 2026-06-24 循环 round 1 的「声优维度」），是**同一个**跨栈/需后端项，此处已合并为一条，勿再拆。

---
*本文只列「还剩什么」。完成史在 [HISTORY.md](HISTORY.md)；日常产品迭代需求源在 [SPRINT.md](SPRINT.md)。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。最后整理 2026-07-02（S13 归档 HISTORY；**S14 家园 hub 深化 A~F 全部完成**——A 六项 P1 急救 + B 五项战斗手感 + C 六项角色差异化与养成长线(v16) + D 五项家园机制/经济闭环(facility v17) + E 三项装备深度(强化 v18 + 套装 + modifier) + F 八项 P3 打磨(战力口径/补习/驻留/封顶/回拨钳位/套装chip/家园委托 v19)，共 33 项、865 测试全绿、存档 v15→v19；源自对抗性审计 [orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)。**S15 家园 hub 内容补完 + 测试稳定 T1..T4 全部完成**——注入时钟根除 flaky + 家具 v20 + 入住羁绊 + 掉落保底 pity，917 测试全绿(连跑 3 次无 flaky)、存档 v19→v20。**下一主线 = S11 React 迁移 / S12 权威后端+多人**；均 product-loop `--tier1 on --mode all` 落地）。*
