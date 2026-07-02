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

- [x] **S15-T1｜flaky 测试稳定化（工程债，零玩法改动）**
  - 目标：定位并根除 S14-F 期间 back-to-back 跑偶发的 2 个 flaky 失败（standalone 全绿）。先 grep `setInterval`/`setTimeout`/`Date.now`/`new Date` in 测试与被测组件，重点查 `HomesteadView` 60s 驻留定时器、`stores/userStore.settle.test.ts`、`daily`/`settle` 跨天判定；用注入时钟 / `vi.useFakeTimers` / 固定种子替换真实时间与真随机依赖。**只改测试与（必要时）为可测性做的最小时钟注入，不改玩法数值。**
  - 验收：连跑 `npm run test` 3 次全绿（无偶发失败）；被测路径无裸 `Date.now`/`setInterval` 依赖真实时间导致的时序不稳定；type-check/build 通过。
- [x] **S15-T2｜轻量家具 / 布局系统（P3-4，本 Sprint 唯一存档重任务 v20）** ✅ 第 2 轮落地
  - 目标：新增 `furniture` 存档域（v20，独立域仿 facility），KP 兑换家具目录（名梗风、仿 `EQUIPMENT_CATALOG` 结构，纯数据 config），摆放进家园广场（复用 `WALKABLE_ZONES` 坐标或简单固定槽位），每件给**小额 comfort / 产出加成**——**经既有 comfort 软加成 / 设施乘区口径并入 `computeIdleYield`，不新拼收益口径**。存档三处同改 + 往返测试 + SAVE_VERSION→20（旧档补空家具）。UI 在 `HomesteadView` 给家具兑换 + 摆放/收纳入口。
  - 落地：`config/homestead.ts`（`FurnitureDef`/`FURNITURE_CATALOG` 7 件名梗风 + `canonicalizeFurnitureIds`/`sumFurnitureComfort`/`getFurnitureDef` 纯函数）；schema v19→**20** + `FurnitureSave`{ownedIds,placedIds} + 内联 `createDefaultFurniture`；`migrateFurniture`（白名单重建、未知/重复归一、placedIds 收敛为 ownedIds 子集）；新建 `stores/furniture.ts`（buy/place/unplace/getComfort）；`stores/persistence.ts` 四处装配；`userStore` 门面 `buyFurniture`（先结清→profile.spend→furniture.buy，失败回补）/`placeFurniture`/`unplaceFurniture`；家具 comfort 经 settle + UI `homeEffect` 同源并入 `effect.comfort`（预览=结算）；`HomesteadView` 家具面板（买/摆/收 + 产出 delta）。测试：migrations（缺省/往返/脏档/子集 5 例）、config（目录/纯函数/comfort 汇入）、furniture.test（store + 门面编排）、persistence 往返 + 全键 + reset。
  - 验收：可 KP 买家具（走 `profile.spend`）、摆放持久化跨重开保真、加成真进挂机收益（经 computeIdleYield 口径）；v20 迁移往返测试；type-check/test/build 通过。
- [x] **S15-T3｜入住羁绊 / 差异化速率（P3-5）**
  - 目标：让「选谁入住」有策略。二选一或都做（Planner 定）——(a) 入住角色差异化挂机速率（按 role/rarity 倾斜 exp/affection，复用 SC-T1 `resolveRole`）；(b) 入住组合羁绊（特定角色/同作品同住 → 小额加成）。engine 纯函数 + config，加成经 `computeIdleYield` 口径；**羁绊/速率优先派生免存档**（派生自 placedCharacterIds + role/anime）。
  - 验收：不同入住组合的挂机产出可辨、羁绊命中给确定加成/不命中不给、加成经既有口径；engine 纯函数测试（速率倾斜 / 羁绊计数）；不破坏现有挂机口径；type-check/test/build 通过。
- [x] **S15-T4｜装备定向掉落保底 / 碎片（P3-3）** ✅ 第 3 轮落地（选项 a 槽位保底 pity；engine 纯函数注入计数 + v20 复用 + UI 显形）
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

---

## 第 1 轮追加任务（S15 product-loop --tier1 on --mode all，指派切片 = S15-T1 + S15-T3，零升档）

> 本轮承诺 = 主清单 **S15-T1 + S15-T3** 真落地（非回归确认）。以下为采纳的 refine 子项 + 关键设计决策拍板；主清单 S15-T1/T3 条目不复述。
> **拍板：本轮零存档改动**（三份报告 + Scout 一致：T1 走注入时钟接缝/派生自现有字段，T3 派生自 placedCharacterIds+role/anime）。SAVE_VERSION 保持 19，v20 留给第 2 轮 furniture 一次性 bump。

- [x] **S15-T1｜flaky 根因根除（注入时钟接缝 T1-A 为主 + 统一 fake timers T1-B 兜底）**
  - 目标：把「back-to-back 偶发 2 失败、standalone 全绿」的时序不稳定从根上消除，而非等它复现。**拍板根因 = 缺一条统一的注入时钟接缝**：`settleHomestead` 直读 `Date.now()`、测试侧 `homestead.test.ts` 用真实 `Date.now()` 做历史算术（两次读之间的真实 ε 叠进 hours 使 `expEach===400` 精确断言在 floor 边界翻车），而 `daily.test.ts` 用 fake timers——两套不兼容时间模型在同一 vitest worker 共存，teardown 有缝时互相污染。
  - **拍板修法（HOW 由 Generator 定，此处定方向）**：(a) 给挂机结算引入可注入 `now` 接缝（与 engine「RNG 注入」原则对称地把「时钟」也降级为注入依赖），测试传固定 now，不再碰真时钟、也不受邻居文件 fake timers 影响；(b) 同时把 `homestead.test.ts` / `userStore.settle.test.ts` 的真实 `Date.now()` 算术统一改用 `vi.useFakeTimers()+vi.setSystemTime(FIXED)`（照抄 `daily.test.ts` 既有 `freezeDate` 范式，`afterEach` 严格 `vi.useRealTimers()`）。**只改测试 + 为可测性做的最小时钟注入，零玩法数值改动、零存档。**
  - **回归守卫**：新增/保留「注入 now < lastSettleAt（回拨）记 0 收益并把基线夹到 now」的确定性回归测试（SF-T6 钳位必须在注入 now 下同样成立）。
  - 验收：连跑 `npm run test` **3-5 次**全绿（单跑绿不算数）；被测/测试路径无裸真实 `Date.now()` 算术喂进时序断言；type-check/build 通过。

- [x] **S15-T3｜入住羁绊（确定性集合加成 T3-A）+ 差异化可见性**
  - 目标：把「选谁入住」从「放最高稀有度」的伪决策变成真决策。**拍板做法 = 确定性集合羁绊（PCR/原神共鸣范式），作为新的独立乘子并入 `computeIdleYield`，派生免存档**——不破 `IdleYield.expEach`/`affectionEach` 单值接口（避免 T3-B 逐角色 map 破接口+波及 UI/结算/文案+正则 archetype 漂移风险）。
  - **拍板加成口径**：羁绊倍率作为**队伍级独立乘子**并入 `computeIdleYield`（与 comfort/设施同层，经既有口径汇入，**严禁在 settle 里另拼**）；纯函数派生自 `placedCharacterIds` → 命中阈值给固定 pct（如「同作品 ≥2 人 +X%」）。
  - **拍板防退化 3 条**：① 羁绊只派生自**稳定键**（角色 `anime_names` 同作品），**不派生自正则 archetype**（避免「换数据/规则→加成无声消失」）；若并做 role 倾斜，role 倾斜也须折进**队伍级整体乘子**、不破 `...Each` 接口；② 派生源 `anime_names?` 可选可缺 → 纯函数对 undefined/空数组容忍（不命中不加成，不抛错）；③ **集合加成设硬上限**（命中即固定档、不按 C(n,2) 组合数叠加爆炸；0 入住不除零不给加成）——守 config 顶部「挂机不盖过主动收入」基线。
  - **拍板可见性（本轮成败命门，三报告共识）**：差异化/羁绊**必须在 UI 显形**，否则重蹈 comfort 死数值反模式=白做。在入住名单 `resident-pill`（或待收卡）显示「命中了哪条羁绊 +多少 pct」，命中给 accent 徽章、不命中不显/灰显；`projectedYield` 待收卡因入住组合变化而肉眼可辨地变化（口径同源，预览=结算）。
  - 验收：不同入住组合产出可辨（engine 纯函数特征测试断言两组不同 placed 的 yield 不等）；羁绊命中给确定加成 / 不命中不给（穷举边界，含 6 同作品不爆炸的硬上限断言、0 入住不除零）；加成经既有 `computeIdleYield` 口径（预览与结算同源）；UI 显式展示命中羁绊；不破坏现有挂机口径；type-check/test/build 通过。

---

## 第 2 轮追加任务（S15 product-loop --tier1 on --mode all，指派切片 = S15-T2 + 收尾 T2-E，本 Sprint 唯一升档 v20）

> 本轮承诺 = 主清单 **S15-T2** 真落地（家具 v20 唯一存档重任务，非回归确认）+ 附带收尾子项 **T2-E**（上一切片 S15-T3 显形债）。以下为采纳的 refine 子项 + 关键设计决策拍板；主清单 S15-T2 条目不复述。
> **拍板：SAVE_VERSION 19→20（本 Sprint 唯一 bump，furniture 域一次性）**；第 3 轮 S15-T4 pity 若持久化复用同一 v20，**绝不升 v21**（防版本漂移，Scout C-1）。
> **拍板：家具收益走既有口径（方案 1 = comfort 轴复用），零新口径、零新乘子、不改 `computeIdleYield` 签名**（三报告 + Scout 一致）。

- [x] **S15-T2｜轻量家具 / 布局系统（v20，本 Sprint 唯一存档重任务）** ✅ 落地（拍板 A–E 全遵，见主清单落地摘要）
  - 目标：把家园从「数据面板」补上「KP → 家具 → 小额 comfort + 更好看的家」这条继设施之后的**第二条 KP sink**（广度 buy-out 目录 sink，与设施无底指数 sink 互补，不重叠）。让「投入 KP」除了「数值更快」还有「看得见的所有权」。
  - **拍板-A｜收益口径 = 方案 1（家具只贡献 comfort，复用既有 comfort 软加成轴）**：家具各给 comfort 分，settle/预览把「家具 comfort 合计」并入传给 `computeIdleYield` 的 `effect.comfort`（与装备 comfort 相加），走既有 `comfortBonusPct`（每 10 点 +1%，封顶 +20%）。**零新增口径、零新乘子、不改 `computeIdleYield` 签名。** 拒绝方案 2（独立乘子改签名 + 全调用点）。家具与装备共用 +20% 硬顶**是有意的**（守「挂机不盖过主动收入」基线，别给家具单开突破口径）。
  - **拍板-B｜摆放模型 = 固定槽位「拥有 + 摆放清单」，不绑 WALKABLE_ZONES**：首版做「已拥有家具 + 已摆放家具清单（摆放的给 comfort）」，**不做广场像素可视化渲染**（验收只要求「摆放持久化 + 加成进收益」）。广场可视化摆放标 backlog；若将来做须**独立固定槽位常量**，WALKABLE_ZONES（角色漫步区）一字不改。
  - **拍板-C｜存档 = furniture 独立域，v19→v20，四处一次性对齐 + 往返测试**：仿 v17 facility 域模板（schema type + 默认工厂 + migration + persistence 装配器 + config）。**禁 spread 浅拷贝旧档**（白名单重建，pitfalls S13-C1）；`createDefaultFurniture` **内联空态、禁 import config**（避免 schema→config→engine 循环依赖环）。旧档无 furniture 键 → 补空家具。
  - **拍板-D｜家具目录 = 纯数据 config（名梗风，仿 EQUIPMENT_CATALOG）+ KP 兑换走 profile.spend**：每件 `{ id, name, comfort, cost }`，名梗风（对标装备「死亡笔记/超电磁炮/AT力场」），零 Vue/Pinia 依赖；买家具走 `profile.spend('knowledgePoints', cost)` 成功才入库，余额不足拒绝。
  - **拍板-E｜口径同源命脉（最易漏的半迁移点）**：家具 comfort 必须 settle（`settleHomestead` 的 `sumHomeEffects`）+ UI 三处（hourlyYield/projectedYield/nextHourlyYield）**全部**并入 `effect.comfort` 喂进 `computeIdleYield`，别只改一半（预览≠实战，P2-17 换域重演，Scout C-2）。`buyFurniture`/`placeFurniture` 前**先 `settleHomestead()` 结清**（同 upgradeFacility，防家具改 comfort 回溯放大已挂时间）。
  - 验收：可 KP 买家具（走 `profile.spend`）、余额不足不发货；摆放持久化跨重开保真；家具 comfort 真进挂机收益（经 `computeIdleYield` 口径，预览=结算同源，满 12h 封顶断言使 floor 后可辨）；v20 迁移往返测试（v19 旧档缺 furniture 补空家具不崩、v20 往返保真、脏档/未知 id 反序列化被归一或丢弃）；`SAVE_VERSION=20`（一次性 bump）；engine 纯净 / 货币只走 profile.spend / 颜色语义令牌（禁 text-white/动态拼色类）/ 定时器登记清除；type-check/test/build 全绿。

- [x] **S15-T2-E｜羁绊 / 家具决策页显形（附带收尾子项，上一切片 S15-T3 显形债）** ✅ 落地
  - 落地：`HomesteadManageModal` 头部新增「入住羁绊」显形（复用 `computeBondBonus` 纯计算，无新口径/无新存档：当前入住组合命中作品 + 同住人数 chip + 全产出 +N%），副标题补「同作品 ≥2 人触发羁绊」；家具面板每件显 comfort + 未拥有件显「摆放后全产出 +N%」delta（复用 `comfortBonusPct` 边际增量，语义令牌 chip/accent）。
  - 目标：补上一切片 S15-T3「差异化看得见吗」只答对一半的收尾债——把羁绊反馈从「收益卡（结果页）」搬进 `HomesteadManageModal`（选谁入住的**唯一物理决策点**，副标题至今仍只讲稀有度），并顺带给家具兑换/摆放面板加 delta 预览。避免「方向盘装后备箱」+ 避免家具成为第二个 comfort 死数值。
  - **拍板方向**：`HomesteadManageModal` 显示当前入住组合命中的羁绊（**复用第 1 轮 `computeBondBonus` 纯计算，无新口径/无新存档**）+ 同作品可辨分组信号；家具兑换/摆放面板显示每件 comfort 及「摆放后全产出 +N%」delta。复用既有 chip/accent/delta 范式 + 语义令牌。命中瞬间 chip 微亮动效顺手则加、否则 backlog。
  - **范围守则**：**低成本、无新口径、无新存档**。**与 T2 存档主线冲突时 T2 优先，此项可降为 T2 内 nice-to-have**（不阻塞 T2 验收全绿）。
  - 验收：管理弹窗能看到当前入住组合命中的羁绊（+N%）及同作品分组信号；家具面板有 comfort/产出 delta；不破坏预览=结算同源；type-check/test/build 全绿。

> **第 3 轮预告（非本轮）**：S15-T4（装备定向掉落保底 / 碎片，P3-3）+ 收尾（确保 S15-T1..T4 全 `[x]`、S14 无回归）。**pity 若持久化 → 复用本轮 v20 bump，绝不升 v21**；本轮 Generator 不要动 `drops.ts` / `completeFloor`。

---

## 第 3 轮追加任务（S15 product-loop --tier1 on --mode all，指派切片 = S15-T4 + 收尾，本 Sprint 收官轮，复用 v20 绝不升 v21）

> 本轮承诺 = 主清单 **S15-T4** 真落地（装备定向掉落缓解，非回归确认）+ Sprint 收官（确保 S15-T1..T4 全 `[x]`、S14 33 项无回归）。以下为采纳的 refine 子项 + 关键设计决策拍板；主清单 S15-T4 条目不复述。
> **拍板：S15-T4 = 选项 (a) 槽位保底（slot pity），拒绝选项 (b) 碎片兑换**（三报告分歧，Planner 定；碎片/图鉴集邮/去重池升维全标 backlog）。理由见下。
> **拍板：pity 计数持久化复用 v20（本 Sprint 唯一 bump，第 2 轮已用于 furniture）——挂进既有 `TowerProgress` 扁平字段，migration 对旧档补 0，SAVE_VERSION 保持 20，绝不升 v21**（Scout C-1 / 三报告一致钉死版本漂移）。

- [x] **S15-T4｜装备定向掉落 = 槽位保底 pity（选项 a，engine 纯函数注入计数 + v20 复用 + UI 显形）** ✅ 落地（拍板 A–F 全遵；G 去重池未叠加，标 backlog）
  - **拍板-A｜选 pity 拒绝碎片**：三报告分歧（体验官/研究员倾向碎片，进化策略师强推 pity）。**Planner 定 pity**，理由：① 本 Sprint 收官轮，pity 改动面 + 退化风险最小（进化审计：碎片是「小 sink 重体验」，需新货币口径 + 新兑换 UI + 新发放埋点，改动面 2~3 倍）；② pity 复用项目自家 `gachaStore` 已验证的保底范式（连续未命中→计数→阈值强制给），零外部依赖；③ pity 持久化落点已被 Scout/研究员钉死（`TowerProgress` 扁平字段复用 v20），存档协议干净；④ 直接对应 SPRINT 主清单 S15-T4 选项 (a)。碎片方案的「定向到 defId 粒度 + 分解重复件闭环 + 图鉴集邮」价值确实更高，但属独立轮次工程量 → **全标 backlog**（见 negotiation）。
  - **拍板-B｜pity 维度 = 槽位（slot），拒绝稀有度 pity**：三报告一致——塔掉落稀有度**已由层段单向决定**（`dropRarityForFloor`，玩家不缺稀有度数量），再叠稀有度 pity 是**双重保证冗余**；真痛点是「命中了却总不是想要的槽（三武器零支援）」。故做**槽位 pity**：连续 N 次「掉落判定发生」未出某槽 → 下次强制命中该槽（稀有度仍走层段）。单维度计数，**拒绝「稀有度×槽」二维矩阵**（字段爆炸 + 心智负担）。
  - **拍板-C｜engine 纯净不破**：判定逻辑走 engine 纯函数 + 注入 RNG + 注入计数（仿 `gachaStore` 的「传入当前 pity 值 → 返回新值 → 调用方持久化」范式，对齐 `rollTowerDrop` 已有的注入 RNG 风格）。**pity 计数状态留在 store 层，`engine/squad/drops.ts` 保持纯**（若需感知 pity 只加纯入参 / 返回新计数，绝不在 engine 内维护计数或碰持久化）。config 顶部集中一个 pity 阈值常量（改这里即调平），阈值取「体感能感知但不破坏惊喜」的中低值（远小于 gacha 70，因掉落频率本就低）。
  - **拍板-D｜存档 = 复用 v20，扁平塞 `TowerProgress`，三处同改 + 往返测试**：pity 是「连续未命中累积历史」**无法派生、必须持久化**（不同于 T3 羁绊派生免存档）。落点 = `TowerProgress` 扁平字段（语义同域「塔状态」，仿 `sweepUsedThisWeek` 定长扁平、不用 Record）。三处同改（schema type/默认工厂 + migrations 补默认 + persistence 装配器）+ 往返保真 + **旧档补 0** 迁移测试。**SAVE_VERSION 保持 20 绝不升 21**（本 Sprint 唯一 bump 已用于 furniture）；脏档 pity 巨值必须 clamp 到 [0, 阈值]（migration + action 共用，仿 `clampEnhance`），防篡改放大获取。
  - **拍板-E｜防墙钟/刷取退化 3 条（回归守卫，本轮命脉）**：① pity 计数**只在 `completeFloor` 推进新层的真掉落判定分支累加**——顶层（floor≥999，`completeFloor` 返 false）/ 重复挑战低层（不推进）/ 扫荡（`sweepFloor` 独立路径）**绝不推进 pity**（否则毕业玩家扫荡刷保底 = 墙钟/刷取漏洞）；② 保底强制命中的槽仍走目录候选池 `rng.pick` 兜底、空池不抛错（目录全覆盖，防御）；③ pity 触发命中后立即重置计数。**新增确定性回归测试断言顶层/重复层/扫荡不推进 pity。**
  - **拍板-F｜显形（本轮成败命门，与 T3/T2-E 显形债同型教训）**：pity 若只后台记数不显形 = 又一个 comfort 死数值 = 挫败没缓解 = 白做。**必须在爬塔/探索/结算处显形「距下次槽位保底还差 N 层」进度**（accent 语义令牌、就近取整、满即高亮），命中瞬间给一次「保底触发！」文案高亮（顺手则加，否则 backlog 但进度显形非选做）。
  - **拍板-G（nice-to-have，非验收必需）｜去重池叠加**：若成本极低（研究员 A3：`rollFloorDrop` 候选池优先未拥有件，`candidates` 过滤已拥有满强化 defId，全拥有再回退全池，零存档 <10 行），可顺手叠加提升「集齐进度感」。**与 pity 主线冲突则降 backlog，不阻塞 T4 验收**。
  - 验收：槽位保底真生效（engine 纯函数特征测试断言 pity 边界：连 N 次未出某槽 → 第 N+1 次必出该槽，序列 RNG 可复现）；顶层/重复低层/扫荡不推进 pity（确定性回归测试）；pity 计数往返保真（v20 旧档补 0、脏档巨值被 clamp）；`SAVE_VERSION` 仍 =20（未误升 21）；UI 显形「距保底 N 层」；不破坏现有掉落口径 / S14 33 项；type-check/test（连跑 3 次全绿）/build 通过。

- [x] **S15-T4-收尾｜Sprint 收官核对（S15-T1..T4 全 `[x]` + S14 无回归）** ✅ 落地（5 条验收命令全绿、test 连跑 3 次 917 全通、SAVE_VERSION=20 未误升 21、S14 无回归）
  - 目标：本轮是 S15 收官轮。落 T4 后复跑全套验收命令，确认 S15-T1/T2/T2-E/T3/T4 全 `[x]` 与实现一致、S14 的 33 项（战力单一 seam / facility v17 / 装备强化套装 modifier / 暴击轴 / 扫荡+委托日循环 / comfort 软加成 / softCap / 墙钟钳位…）无回归。
  - 验收：主清单 S15-T1..T4 全 `[x]`；`npm run test` 连跑 3 次全绿（898+ 用例，含 T4 新增 pity 特征/回归测试）；type-check/build/后端安全基线/debug-grep 全绿；`SAVE_VERSION===20` 断言未被误改成 21。
