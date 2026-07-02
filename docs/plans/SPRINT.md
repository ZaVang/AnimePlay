# AnimePlay — SPRINT 合同（S14-F：P3 打磨 · 一致性与内容缺口 · S14 收官）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-F 全部任务（SF-T1..SF-T8）**——S14 家园 hub 深化的最后一块（P3 打磨）。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S14-F，**绝不表示可以跳过本轮被指派的 SF-T 任务**（S14-A SA-T6、S14-B 暴击UI显形、S14-E R1 收口均曾因此/中断被漏，严禁重演；见 pitfalls）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14-F、`docs/orch/homestead-hub-audit-report.md`（P3-1/3/5/6/7/8/10 + P2-28 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 相关面：`views/HomesteadHubView.vue`（hero 循环胶囊 + 五 tab + 编队/探索面板战力展示）、`views/HomesteadView.vue`（设施/离线收益/驻留结算）、`stores/homestead.ts` + `config/homestead.ts`（`computeIdleYield`/`HOMESTEAD_EFFECT_CAP`）、`stores/facility.ts`、`stores/userStore.ts`（`settleHomestead`/`tutorCharacter`）、`config/nurture.ts`（补习）、`stores/daily.ts`（跨天 `todayKey`）、`components/nurture/{EquipPickerModal,InventoryPanel}.vue`（套装/分解/强化）、`engine/squad/{tower,thresholds}.ts`（floorPower/战力）、`stores/profile.ts`（spend/earn）；存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（当前 SAVE_VERSION=18）。
- 本 Sprint = **S14-F P3 打磨**：把 A~E 落地后残留的一致性 / 手感 / 内容缺口收干净，让 S14 家园 hub 完整收官。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/`Math.random`；纯函数 + 注入 RNG）/ 依赖只向下 / **货币只走 `profile.spend·earn`** / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改养成或挂机规则前先看对应 `*.test.ts`。**别破坏 S14-A/B/C/D/E 已成 25 项**（战力单一 seam `resolveEquipBonus`/`resolveMemberBattleStats`+`resolveEquipModifiers`、facility v17、装备强化 v18、套装、暴击轴、扫荡日循环、塔软门槛、编队编辑、预览同源…）。
**存档变更协议（仅 SF-T8 可能需要）**：新增/改存档字段必须 **schema + migrations + 装配器三处同改 + 往返测试**；SAVE_VERSION 现=18，若确需（家园委托进度）则升 **19**（一次 sprint 只升一次）；**能派生/复用 daily 跨天口径就别新增字段**。其余 SF 任务预期零存档。

## 任务清单（S14-F = SF-T1..SF-T8）

- [x] **SF-T1｜hero 循环胶囊去误导（P3-1）**：`HomesteadHubView.vue` hero 区「家园→角色→编队→探索→战斗」循环胶囊是不可点静态装饰、与下方 tab 文案 1:1 重复。删掉，或改成明显非导航的「循环示意」（箭头连接、非按钮态），消除「看着像 tab 却点不动」的误导。纯 UI。
- [x] **SF-T2｜补习升级：递增成本 + 批量/一键（P3-2）**：补习现是无决策定额 100KP→500 经验。改成本随角色等级递增（或分档）、支持批量/一键升级（如「补到下一级 / ×10」），走 `profile.spend`。engine/config 纯函数定成本-收益，UI 文案动态。**不新增存档字段**。
- [x] **SF-T3｜家园驻留低频定时结算（P3-8）**：离线收益仅进家园 onMounted 结算一次，长时间驻留静止、到期无提示。加低频定时器（60s）刷新预计累积 + 封顶进度条；**定时器登记并 onUnmounted 清除**（pitfalls 明令）。不改结算口径，只做「驻留可见」。
- [x] **SF-T4｜统一敌我战力口径（P3-6）**：编队/探索面板我方战力含养成、敌方 `floorPower` 用原始属性，两数字不同量纲同屏并列易误读。统一 `calculateBattlePower` 口径，或直接给「推荐战力/胜率」相对量（复用 SC-T5 `assessSquadReadiness`）。纯展示口径，不改战斗。
- [x] **SF-T5｜家园收益封顶改分层递减（P3-7）**：`HOMESTEAD_EFFECT_CAP`(0.6) 按全体合计硬顶，约 4 件同向 UR 即触顶、后续装备零边际。改按角色/槽分层边际递减封顶（或平滑曲线），让边际不断崖。engine/config 纯函数 + 测试。注意与 SD-T1 设施乘区（独立于 0.6 cap）口径不冲突。
- [x] **SF-T6｜墙钟回拨钳位（P2-28）**：`settleHomestead` 用 `Date.now()`，改系统时间可刷离线收益。加 `now < lastSettleAt → 记 0 并把 lastSettleAt 夹到 now` 的回拨钳位（单机向廉价卫生改动，不做权威时间）。userStore 层 guard + 测试。
- [x] **SF-T7｜S14-E backlog 收尾**：① SE-T2g 齐套瞬间套装 chip 点亮 + 战力 delta（复用既有 transition，克制正反馈，不造粒子）；② 重复装备「双 sink 信息对称」——`InventoryPanel`/分解处提示同 defId 重复件既可分解回收 KP 也是强化燃料（防新手拆光重复件再无料可强的不可逆误操作）。纯 UI。
- [x] **SF-T8｜家园日常委托（P3-10，代表性中期项）**：家园 hub 缺「每天回来」的钩子。加轻量「家园委托」——每日 N 条可完成的小目标（如「挂机结算一次 / 打一层塔 / 强化一件装备」），完成给小额 KP/经验奖励，**复用 `daily` store 跨天 `todayKey` 判定**。若需记录委托进度则复用 daily 域或升 v19（三处同改+往返测试）。engine/config 定委托模板与奖励，UI 在 home 面板给委托位。
  - **明确 backlog（本 Sprint 不做）**：轻量家具/布局经营（P3-4，furniture 新存档域，太重）、入住羁绊/差异化速率（P3-5）、装备定向掉落保底/碎片（P3-3）——这些是中期内容而非 P3 打磨，留待 S15+ 单独立项。**可暂不处理**：inferArchetype 稀有度兜底（P3-9，SC-T1 resolveRole 后已基本无可达路径）、结算复核拥有数（P3-11，无可达触发）。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **SF-T1 + SF-T4 + SF-T7**（hero 胶囊 + 战力口径统一 + S14-E backlog 收尾，UI/一致性簇，零存档）。
> - 第 2 轮 = **SF-T2 + SF-T3 + SF-T5 + SF-T6**（补习升级 + 驻留结算 + 收益封顶分层 + 墙钟钳位，挂机/养成/经济打磨，零/极少存档）。
> - 第 3 轮 = **SF-T8**（家园日常委托）+ 收尾（确保 SF-T1..T8 全 `[x]`、S14-A..F 无回归，S14 整体收官）。
> 每轮务必保持验收命令全绿、每子项独立可合并。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-F 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SF-T* 任务全部 `[x]` 并与实现一致。**S14-F 整体完成** = SF-T1..SF-T8 全 `[x]`（→ S14 家园 hub 深化全部收官）。

---

## 第 1 轮追加任务（S14-F Round 1/3 · product-loop --tier1 on --mode all）

> 本轮承诺切片 = **SF-T1 + SF-T4 + SF-T7**（UI/一致性簇，三项全为纯 UI / 纯展示口径，**零存档**，SAVE_VERSION 维持 18 不动）。
> 每项独立可合并；三项互不依赖，可并行落地。**本轮不得跳过任一指派项**（Scout 已确认三项皆低成本无风险；S14-A SA-T6 被漏教训在前）。

- [x] **SF-T1｜hero 循环胶囊去误导（P3-1）**
  - 目标：消除 `HomesteadHubView.vue` hero 区 `.hub-loop`（5 个「家园/角色/编队/探索/战斗」并排胶囊）「看着像 tab 却点不动」的视觉误导——它们与下方 `.hub-tabs` 5 个真 tab 文案 1:1 重复。
  - **设计决策拍板（采用 Scout 方案 A：改示意图，不删）**：把 5 个并列方块胶囊改成**明显非导航的「循环示意」**——用箭头连接读作「家园 → 角色 → 编队 → 探索 → 战斗」的流程说明（去掉独立卡片/按钮态外观，去方块边框感）。**不选删除（方案 B）**：保留一条极轻的流程示意能强化「五环同一入口」的心智，比留白信息更完整；但**必须真改视觉读作流程而非导航**（加 disabled 不算数——审计核心是视觉误导）。
  - 验收：hero 区不再出现「5 个并排、与 tab 同文案、看似可点」的胶囊；改后元素视觉上明确是「流程/循环示意」（有 `→` 连接或等价流向表达、无按钮/卡片态）；颜色走语义令牌（`rgb(var(--c-*))` / 语义类），无 `text-white` 压浅底、无拼接动态色类；纯静态无定时器无存档。type-check/test/build 全绿。

- [x] **SF-T4｜统一敌我战力口径（P3-6）**
  - 目标：消除「编队/探索面板我方战力与敌方 `floorPower` 两数字同屏并列、玩家不知是否同口径、编队页看不到敌方基准」的误读。
  - **设计决策拍板（口径 = 绝对同口径 + 复用 SC-T5 相对量提示，二者并存；不新写公式）**：
    1. **认知纠偏**（Scout C 段最重要项）：我方 `squadPower` 与敌方 `floorPower` **早已同调 `calculateBattlePower`（全站唯一公式，同量纲）**，审计「不同量纲」前提在 S14-A 引入 `resolveMemberBattleStats` 后已不成立。**严禁新写战力公式 / 改 `combat.ts` / 改战斗模拟 / 改 `thresholds.ts` 阈值**——本任务纯展示层收尾。
    2. **squad 编队面板补敌方基准**（P3-6「同屏并列易误读」最实补口）：把 explore 已有的 SC-T5 `assessSquadReadiness` 三档提示（战力 X / 建议 ~Y / 达标·吃紧·差距较大 + delta）**复用到 squad 编队面板**——引入当前层 `floorPower` 作基准，口径天然一致。
    3. **敌方裸数字显式标注同源**：explore 面板敌方 `floorPower` 大字旁标注「敌方战力（同口径）」或让 readiness hint 显式点名两数字同源；措辞统一为**一个口径名**（如「战力（同口径）」），消除「我方叫综合战力、敌方叫 floorPower」的措辞割裂。
  - 验收：squad 编队面板出现当前层敌方基准 + 复用 `assessSquadReadiness` 的同一三档提示（与 explore 同源、同色档 `--c-success/warning/danger`）；explore 敌方战力数字显式标注同口径；无新增战力公式、`combat.ts`/`thresholds.ts` 数值零改动；敌人预览种子 `towerFloorEnemySeed` 不动（勿复活「刷新敌人」）；纯展示零存档。type-check/test/build 全绿。

- [x] **SF-T7｜S14-E backlog 收尾（齐套 chip + 双 sink 提示）**
  - 目标：把两处「已有能力/机制但未在正确页面显形」的缺口补齐。均纯 UI 零存档零风险。
  - **① 齐套瞬间套装 chip 点亮 + 战力 delta（SE-T2g）**
    - 设计决策拍板：在角色装备槽位主面板（`NurtureView.vue` 三槽面板下方）加「套装进度 chip 区」，**直接复用 `config/equipment.ts` 的 `setProgressFor(三槽 defId)` 纯查询**（唯一真相源，勿从 picker 拷贝第二份推导）——`tier>0`（齐 2/齐 3）时 chip 点亮（`text-highlight`，与现套装 chip 同色 + 「套名 齐N」），未齐显灰进度 `count/3`。
    - 「瞬间点亮」**用纯 CSS transition**（`transition-colors` / 仿现成 `.sweep-float-*` 淡入），**不引 setTimeout**（若确需延迟则登记 timers 数组 + onUnmounted 清除，pitfalls 明令）。
    - 「战力 delta」= 齐套贡献的战力增量，由「含套装 − 不含套装」派生或直接折算 `currentBonus`；**绝不在 chip 里再叠一次 `setBonusFor` 进战力**（`resolveEquipBonus` 已含 `setBonusFor`，双算 = 复现「预览≠实战」家族）。
  - **② 重复装备「双 sink 信息对称」**
    - 设计决策拍板：在 `InventoryPanel.vue` 分解按钮/title 处，当该 defId 有 `count>1`（游离重复件）时**补一句对称提示**「重复件也可作强化燃料」（点明分解回收 KP 与强化燃料双用途），防新手拆光重复件后无料可强的不可逆误操作。**纯文案 + 条件渲染**，不改 `dismantleEquipment` 逻辑、**不加确认弹窗**破坏顺手体验；提示只挂 `count>1` 的游离卡（避免对唯一一件误报「拆了还能当燃料」）。
  - 验收：角色装备槽位主面板出现套装进度 chip（齐套点亮、未齐灰显进度），chip 数据源 = `setProgressFor`（非拷贝推导），点亮走 CSS transition 无裸 setTimeout，战力 delta 不双算 setBonusFor；InventoryPanel 对 `count>1` 游离重复件显示「也可作强化燃料」对称提示、分解逻辑与确认体验不变；颜色走语义令牌无 text-white 压浅底；纯展示零存档。type-check/test/build 全绿（若加纯函数派生沿用/不破坏既有 `equipment.test.ts` 套装/强化断言）。

---

## 第 2 轮追加任务（S14-F Round 2/3 · product-loop --tier1 on --mode all）

> 本轮承诺切片 = **SF-T2 + SF-T3 + SF-T5 + SF-T6**（补习升级 / 家园驻留定时结算 / 收益封顶分层递减 / 墙钟回拨钳位——挂机·养成·经济打磨簇）。
> **全部零存档**：SAVE_VERSION 维持 18，不碰 schema / migrations / 装配器（SF-T6 仅运行期把已有 `lastSettleAt` 夹到 now，非存档协议变更）。
> 四项互不依赖，可并行落地。**本轮不得跳过任一指派项、不得降级为「回归确认」**（SA-T6 / S14-B 暴击 UI / S14-E R1 收口三次被漏教训在前）。**不顺手做 SF-T8**（第 3 轮）。
> 采纳 R1 落地后复审的 SF-T4 措辞 refine（去「（同口径）」黑话）+ SF-T1 `↻` 收尾——作为本轮顺手带的零风险微调（见下 SF-T4-refine / SF-T1-refine）。

- [x] **SF-T2｜补习升级：递增成本 + 批量/一键（P3-2）**
  - 目标：修「唯一主动养成动作（补习）要点近千次的苦役」+「产出随级涨、成本永远 100/次 → 越高级越便宜的经济漏洞」——把补习从「几百次点击」变成「一次决策的投资」。
  - **设计决策拍板**：
    1. **成本随等级递增（新纯函数 `tutoringCost(level)`）**——修掉「越高级越便宜」漏洞。曲线拍板：**分档或 `base + level×k` 线性缓增**（沿用 SD-T4 `tutoringExpGain` 同风格；导出常量供测试）。方向约束：成本增速须 ≥ 产出增速使**单位经验单价随级不降**（守 config 顶部「补习是 KP sink 不是提款机」自述基线），避免高级补习性价比畸高。**勿动 `tutoringExpGain` 逻辑**（产出侧 SD-T4 已递增，只在批量里逐份按当前 level 累加）。
    2. **批量入口**（`补到下一级` / `×10` / 可选`一键花光可用 KP`）——走 `profile.spend`，**逐份 spend(tutoringCost(当前level)) → addCharacterExp(tutoringExpGain(当前level)) 循环**，每份后 level 变化再算下一份（**严禁「先算总经验一次灌」跳过中间档成本递增 = 逃成本**）。
    3. **中途终止语义**：任一份余额不足 / 已满级 → **停止并返回已完成份数**（别静默扣钱不给量、别满级还扣），复用现有满级/余额守卫。
    4. **批量飘字简化**：批量后飘字改**「本批合计 +N 经验、升 M 级」一次性汇总**（勿逐次飘字，一次补 10 级逐字闪烁语义崩坏）。
    5. **整批只存一次档**（别每份 saveToServer）；daily `markProgress('nurture', N)` 传批量份数。
  - 验收：`tutoringCost(level)` 纯函数存在且**严格随级递增**（测试锁）、单位经验单价随级**不降**（守 KP sink 基线）；补习按钮文案动态显示当前成本（非写死 `TUTORING_KP_COST`）；出现批量入口（至少「补到下一级」或「×10」其一）；批量逐份扣费、余额不足/满级中途终止返回已完成数（stores/nurture.test.ts 断言）；批量飘字为一次性汇总；`tutoringExpGain` 逻辑零改动；货币全走 `profile.spend`；**零存档**（SAVE_VERSION=18）。type-check/test/build 全绿。

- [x] **SF-T3｜家园驻留低频定时结算（P3-8）**
  - 目标：补挂机类玩法「实时累积可见 + 到顶明确提示」的基础反馈——`HomesteadView` 现仅 `onMounted` 结算一次，长时间驻留数字静止、离线封顶到期无任何提示（「回来收菜」的爽感被埋）。
  - **设计决策拍板**：
    1. **加 60s 低频 `setInterval`** 刷「自上次结算起的预计累积」computed + 封顶进度条。预览口径 = **复用 `computeIdleYield(rarities, now - lastSettleAt, homeEffect, facilityLevels)` 纯算**（喂同一 `facilityStore.getLevels()`，与 `settleHomestead` 同源，防「预览≠实战」家族），封顶进度 = `min(1, cappedHours / offlineCapHours)`。
    2. **只刷预览、绝不调 `settleHomestead`**（避免频繁写档；真结算仍走既有 onMounted/settle 口径，不改结算逻辑）。
    3. **满封顶显式提示**「已达上限，回来收取」（或等价文案）——把「攒满了该收了」显形。
    4. **定时器命门（pitfalls 明令）**：`setInterval` **必须 `onUnmounted` `clearInterval`**（仿本文件既有 rAF `cancelAnimationFrame(raf)` onUnmounted 范式，同块清除）。
    5. **首次基线守卫**：`lastSettleAt===0`（未建基线）显 0 / 引导，别拿 `now-0` 算天量。
    6. 进度条颜色走语义令牌（`--c-warning`/`--c-success`），禁 text-white。
  - 验收：驻留家园 ≥60s 预计累积数字刷新、封顶进度条显现、满封顶有到顶提示；定时器 `onUnmounted` 已 `clearInterval`（无泄漏）；预览与结算同口径（同喂 `getLevels()`）；不改结算口径、不新增存档；颜色走语义令牌。type-check/test/build 全绿。

- [x] **SF-T5｜家园收益封顶改分层递减（P3-7）**
  - 目标：修 `HOMESTEAD_EFFECT_CAP`（0.6）对已求和装备 pct 的 `Math.min` **硬顶断崖**（触顶后再堆同向装备边际=0，与 S14-E 装备深度自我抵消）——改边际递减、不断崖。
  - **设计决策拍板**：
    1. **曲线拍板 = 平滑软化（渐近上界）**，替换 `cappedPct` 的 `Math.min(value, cap)`。推荐 `softCap(x, cap) = cap*(1 - exp(-x/cap))`（x→∞ 渐近 cap、小 x 近似线性无断崖）**或**分段（前段全额、后段打折）二选一，Generator 择一实现即可；硬约束：**渐近上界 ≈ 0.6 量级**（守「挂机不盖过主动收入」基线）、**对 x 严格单调递增（边际>0，永不出现「加装备反降收益」）**。
    2. **只软化装备 pct 的 cap**——**设施乘区 `facExp/facBond/facKp`（决策-5，独立乘子）与 comfort 软加成（`comfortMult`，决策-6）绝不卷进 cap**（否则无底 KP sink SD-T5 失效）。
    3. **同步重算 `config/homestead.test.ts` 现有硬顶断言**（L84-97「装备家园收益倍率受上限保护」用 `Math.min` 口径 `expPct:9 → 恰 +0.6`）——软化后渐近 <0.6，**同一 commit 内**改成 `toBeCloseTo(softCap(9,0.6))` / 范围断言，**别漏改导致 test 红**；补三条新断言：小 pct 近似线性、大 pct 渐近不超 cap、严格单调递增。
  - 验收：`cappedPct` 硬顶被软化曲线替换（渐近 ≈0.6、单调递增、无断崖）；设施乘区与 comfort 仍独立不入 cap（`computeIdleYield` L189-194 结构不变）；`config/homestead.test.ts` 硬顶断言已同步重算 + 补单调/近似线性/渐近三断言全绿；engine/config 纯函数，纯计算零存档。type-check/test/build 全绿。

- [x] **SF-T6｜墙钟回拨钳位（P2-28）**
  - 目标：`settleHomestead` 用 `Date.now()` 裸信任墙钟，改系统时间可刷离线收益；且 `lastSettleAt` 若停在未来会让后续正常时间也被吞。加廉价卫生级回拨钳位。
  - **设计决策拍板**：
    1. 在 `settleHomestead` 首次基线判定（`lastSettleAt===0` 建基线分支）**之后**、正常结算之前加 guard：`if (now < lastSettleAt) { setLastSettleAt(now); return empty }`（**本次记 0 收益 + 把 `lastSettleAt` 夹到 now**，避免负时长喂进 `computeIdleYield`、避免未来基线吞掉后续正常时间）。`empty` 沿用现对象（`characterCount` 已按 placed.length 填）。
    2. **不做权威时间 / 不做每日 24h 总时长封顶**（决策：单机向廉价卫生改动，P2-28 定性 P3，只做①回拨钳位不做②每日封顶——别过度设计；权威时间是 S12 后端）。
    3. **零存档**：只钳制运行期读值，复用既有 `lastSettleAt` 字段，不碰 schema/migrations/装配器（SAVE_VERSION=18）。钳位在 settle 内部，自动覆盖 place/unplace/upgradeFacility 等所有先调 settle 的入口。
  - 验收：`settleHomestead` 有 `now < lastSettleAt → 记 0 + 夹 lastSettleAt 到 now` guard（放在首次基线判定之后）；**新建** userStore settle 单测（现全仓零 settle 单测）：`vi.spyOn(Date,'now')` 回拨 → 断言收益 0 且 `lastSettleAt` 被夹到 now（不再停在旧的更大值），正常前进结算不受影响；不做权威时间/每日封顶；零存档。type-check/test/build 全绿。

- [x] **SF-T4-refine（顺手带，采纳 R1 复审）｜去「（同口径）」黑话 + 措辞统一**：R1 落地的 explore/squad 面板出现 3 处「（同口径）」开发者黑话，玩家读不懂。数字标签精简为「我方战力 / 第 N 层敌方战力」（去掉「（同口径）」），靠并排同尺 + `readinessHint`「建议 ~Y / 差 N」自然传达可比性（或只在 readiness 提示里点一次「同一把尺衡量」）。纯文案微调零风险。验收：UI 不再出现「（同口径）」黑话、措辞统一为一套；不改数据源与三档色。
- [x] **SF-T1-refine（顺手带，采纳 R1 复审）｜hero `↻` 收尾**：hero 流程末尾 `战斗 ↻` 回环箭头悬空（后无元素）。改为单向 `→` 收束、或补显式「↻ 回到家园」收尾词，让「循环」读得完整。纯 UI 零风险。

---

## 第 3 轮追加任务（S14-F Round 3/3 · product-loop --tier1 on --mode all · 收官轮）

> 本轮承诺切片 = **SF-T8｜家园日常委托（P3-10）** —— S14 家园 hub 深化的最后一块。
> **SF-T8 当前 `[ ]`，本轮必须真实现**（不得因跑到收官轮就默认「前轮已做」而降级为回归核对——SA-T6 / S14-B 暴击 UI / S14-E R1 收口三次被漏教训在前；前两轮明令「不顺手做 SF-T8」，见本文件 L89 / eval R2 / scout R3）。
> **本轮触存档**：三份审计 + Scout 收敛，命名空间走「`daily` 域内平行 `commission` 子域」（不扩 `DailyTaskType` 枚举），**升 SAVE_VERSION 18 → 19**（一 sprint 只升一次，v19 额度用掉即封顶）。三处同改 + 往返测试是存档协议铁律。
> 收官附带：SF-T8 落地后核对 SF-T1..T8 全 `[x]`、S14-A..E 25 项无回归（Evaluator 亲自复跑 5 条验收命令）。

- [x] **SF-T8｜家园日常委托（P3-10）**
  - 目标：补 hub 缺失的「每天为什么回来」日回归钩子。家园三个成功点（挂机结算 / 打一层塔 / 强化一件装备）当前从不触发任何任务进度（`DailyTaskType` 无 idle/tower/enhance），全站 daily task 又都是「要离开家园」的行为。SF-T8 把这三个玩家本来就在做的本地动作包成「今日委托」，闭环全在 hub 内，做完给小奖 + 今日全清 bonus。
  - **命名空间拍板（走研究/进化/产品三审 + Scout 收敛的方案 B：`daily` 域内平行 `commission` 子域）**：不扩 `DailyTaskType` 通用枚举（守 daily.ts「领域 store 自包含」抽象纯度、UI 天然与 daily task 分区、可挂独立全清 bonus 不污染 daily）。复用 `daily` 的跨天口径（`todayKey`/`ensureToday` 范式），**绝不自造第二套跨天判定**（两套漂移是回归温床）。新增独立 `COMMISSIONS` 模板 + 独立 commission 进度/已领桶 + 独立 `markCommission(kind)` 埋点 + `commissionKind='idle'|'tower'|'enhance'` 类型。
  - **委托模板拍板（3 条固定，target=1，措辞定位「家园本地小事·不用离开家园」）**：`commission_idle`（挂机结算一次）/ `commission_tower`（打一层塔，含扫荡）/ `commission_enhance`（强化一件装备）。逐条小额奖励（各 20~30 KP 量级，对齐现有 daily task 30 KP，走 `profile.earn`），守「回归补充不盖过主动收入」基线（config/homestead.ts 顶部自述）——委托是软钩子非硬 KPI，漏做无惩罚。
  - **三守卫拍板（不做会崩，验收专项卡）**：
    ① **挂机委托守「有实际产出」**——`markCommission('idle')` 埋在 `settleHomestead` 全 0 产出早退**之后**、`saveToServer` 前（只有真发放收益才到达）。**绝不用 `hours>0` 判定**（首次基线早退 / 回拨钳位早退 / 0 入住空结算都可能 hours 存在但产出 0，反复进出会刷委托）。
    ② **塔委托同埋两处**——`markCommission('tower')` 同时挂 `completeFloor`（`completed===true` 分支）**和** `sweepFloor`（`ok && reward` 分支），毕业玩家（塔顶 completeFloor 返 false）靠扫荡也能完成，否则卡死全清 bonus。**绝不复用 `battleWin`**（那是宅理论战 `battleFlow.endGame` 计数，塞塔进去污染宅理论战任务——最易踩的语义错配）。
    ③ **保底可完成**——`commission_idle`（有入住角色即可结算）是天然保底，确保全清 bonus 不因毕业/破产账号变「永远拿不到的空诺」。
  - **今日全清 bonus 拍板（委托区别于 daily 的核心收尾正反馈，本轮做）**：3 条清完给一份额外 bonus（如 +50 KP 或 +1 券）。实现 = `allCommissionsDone` 派生 + 全清「已领」标记**复用 commission 已领桶存一个特殊 key**（如 `'__bonus__'`，**不新增第 4 序列化字段**，跨天随委托一并归零）+ 独立领取 action。若 R3 时间紧，全清 bonus 可 fallback 留收尾补，但**逐条委托 + 三守卫 + 保底项无论如何必做**。
  - **埋点层拍板**：三个 `markCommission` 埋点**只挂 `userStore` 门面编排层**（与现有 5 个 `markProgress` 埋点同构同位，写在各自 `saveToServer` 事务边界前），**绝不进 engine**（engine 纯净铁律，不得 import store）。委托领取门面仿现有 `claimDailyTask`（领取成功才 `saveToServer`）。
  - **UI 落点拍板**：委托 UI 挂 `HomesteadView` 右侧 `ops-panel`、插在 **SF-T3 驻留卡之下**（同属「家园日常状态」语义簇）。**视觉与 SF-T3 驻留进度条区分**——委托 target=1 本质是布尔勾选，**用清单勾选（`○/✓ 标题·奖励`）+ hub 级「委托 X/N」小徽章摘要，不再来一条大横条进度条**（避免两条横条谁是谁的读图负担）。cue（X/N 摘要）须进 home 第一屏可见。未登录态守卫。颜色走语义令牌（未完成 `--c-ink-3`、可领 `--c-accent`/`--c-highlight`、全清 bonus success 绿），禁 text-white 压浅底 / 动态色类拼接。完成/领取瞬间点亮走 CSS transition，全清 bonus 飘字复用现成 `.sweep-float-*`；若加飘字 setTimeout 必须登记 + onUnmounted 清除。
  - **存档三处同改 + 升 v19 拍板**：新增 commission 进度/已领桶字段（与 daily 现有 `progress`/`claimed` 同构）→ ① schema（`DailySave` 加字段 + `createDefaultDaily` 缺省 + `SAVE_VERSION` 18→19 + 顶部版本注释）② migrations（`migrateDaily` 加字段级缺省兜底，**白名单重建不用 spread**，仿 v7 weekly 四字段）③ 装配器（daily.ts `serialize`/`deserialize`/`reset` 三处加字段，deserialize `?? {}`/`?? []` 兜底 + 加载后跨天判定归零）。**权威 SAVE_VERSION 在 schema.ts，文档只指向不复述。** 补 `daily.test.ts` commission 断言（markCommission 推进 + 跨天归零 + claim 发奖 + 三守卫 + allDone/全清 bonus + 幂等钳 target）+ `migrations.test.ts` v18→v19 往返（旧档缺字段兜底、新档往返保真、无关字段不漏）。
  - 验收：委托走 daily 内平行 commission 子域（不扩 `DailyTaskType`、复用 `todayKey`/`ensureToday` 不自造跨天）；3 条委托模板存在、走 `profile.earn` 小额奖励；三守卫全落地（idle 守实际产出非 hours>0 / tower 同埋 completeFloor+sweepFloor 不碰 battleWin / idle 保底可完成，`daily.test.ts` 断言锁）；今日全清 bonus 派生 + 特殊 key 领取标记（不新增第 4 字段）；三个埋点在 userStore 门面 saveToServer 前、engine 零 import store；UI 挂 ops-panel 驻留卡下、清单勾选而非横条、home 第一屏可见 X/N 摘要、未登录守卫、颜色语义令牌、飘字/定时器登记清除；存档三处同改 + `SAVE_VERSION`=19 + `migrations.test.ts` v18→v19 往返全绿；SF-T1..T8 全 `[x]`、S14-A..E 25 项无回归。type-check/test/build 全绿。
