# Product Audit Report — S14-F 第 3/3 轮（product-loop `--tier1 on --mode all`）

> 体验官视角（三镜头：功能体验 / 审美品味 / 产品想象力）。
> 本轮指派切片 = **SF-T8｜家园日常委托（P3-10）**——S14 家园 hub 深化的收官任务。
> 本轮做两件事：① 复审 R1（SF-T1/T4/T7）+ R2（SF-T2/T3/T5/T6 + 两条 refine）已落地改动有无回归/新体验坑；② 聚焦 SF-T8 给 refine（做多深够、怎样防退化、验收卡什么）。作为 S14 收官轮，兼顾整体一致性。
> 方法：无 `get_page_state.js`，全程源码审读（daily.ts / dailyTasks.ts / HomesteadHubView / HomesteadView / config.nurture / config.homestead / userStore.settleHomestead + 门面 / NurtureView / InventoryPanel / persistence schema）。

---

## Executive Summary

**总评分：8.4 / 10**（较 R2 的 8.1 微升——R2 四项打磨真落地，补习从苦役变决策、驻留有了生命感、封顶断崖消除、墙钟卫生补齐，S14 家园 hub 已从「功能骨架」长成「有节奏的日常」）。

- **功能体验（8.5）**：R2 后家园 hub 的养成/挂机/经济三条链都补上了「决策感」——补习 `×10`/`补到下一级` 逐份扣费守成本语义、驻留 60s 刷预览 + 封顶进度条、softCap 消除堆装备断崖。SF-T8 是最后一块拼图：hub 缺「今天为什么要回来」的钩子。**关键风险 = 委托与既有每日任务（daily）心智撞车**，若做成「第二套进度条」会加认知负担而非减。
- **审美品味（8.2）**：语义令牌合规、进度条/chip 复用现成过渡、`↻ 回到家园` 收尾补得克制。SF-T3 驻留卡与未来 SF-T8 委托位将同处 home 面板右侧 ops-panel，**视觉共存是收官轮最该盯的一致性点**——两个都带进度条的卡叠在一起容易糊。
- **产品想象力（8.0）**：委托是把「已有玩法成功点」包一层动机外壳的低成本高杠杆项。真正的想象力不在「加第三条进度条」，而在**「今日全清 bonus 收尾正反馈」**（回答「委托 vs daily 有何不同」）与措辞上的「家园本地」定位。叙事化/角色请求制是 S15+ 的大想象，本轮克制不做。

**本轮切片最关键一条 refine**：SF-T8 委托**必须与每日任务（daily）视觉分区 + 措辞差异化定位为「家园本地小事」**（挂机一次 / 打一层塔 / 强化一件——全在 hub 内闭环，不用跳出去），并配一个**「今日全清 bonus」收尾正反馈**；否则它只是 daily 的换皮进度条，加认知负担而非制造「每天回家看一眼」的钩子。

---

## Phase 1: 功能体验

### 复审：R1 + R2 已落地改动（回归 / 新坑扫查）

逐项 Read 源码核实，**全部真实现、无回归、无新体验坑**：

- **SF-T1/T1-refine（hero 循环示意）**：`HomesteadHubView.vue` L346-358 已是纯 `→` 箭头连接的流程文字（`.hub-loop` 无按钮/卡片态），`↻ 回到家园` 收尾词补齐（`.hub-loop-return` `--c-ink-3` 斜体轻提示）。回环读得完整、不再误导为可点 tab。✅ 无回归。
- **SF-T4/T4-refine（战力口径）**：编队面板补了敌方基准条（`.squad-baseline` L407-426）复用 explore 同源三档 `readinessHint`；「（同口径）」黑话已去，改为「我方战力 / 第 N 层敌方战力 / 敌方战力」+ readinessHint 里「（敌我同一把尺衡量）」自然点名。✅ 一致。**微观察（🟢）**：`readinessHint` 里仍保留「（敌我同一把尺衡量）」这半句括号注释——比「（同口径）」白话得多，可留；若想更干净可只在编队页首次出现处点一次。
- **SF-T7（齐套 chip + 双 sink）**：`NurtureView.vue` L304-315 套装进度 chip 复用 `setProgressFor(三槽 defId)` 单一真相源，`setPowerDelta` 由「含套装 − 不含套装」派生（**未双算 setBonusFor**，L313-315 注释明确）；`InventoryPanel.vue` L272-281 对 `count>1` 游离重复件补「重复件也可作强化燃料」对称提示。✅ 数据源正确、无双算。
- **SF-T2（补习递增 + 批量）**：`config/nurture.ts` `tutoringCost(level)=100+level×15` 严格递增（L28-31），单价随级不降（注释 L18-21 算清 0.274→0.666）；批量走门面 `tutorCharacterBatch`（userStore L701-710）整批存一次 + `markProgress('nurture', times)`。✅ 逐份扣费守成本语义。
- **SF-T3（驻留定时结算）**：`HomesteadView.vue` L197-226 `nowTick` + 60s `setInterval`（只刷预览）、`projectedYield` 复用 `computeIdleYield`（同喂 `facilityLevels`）、`capProgress`/`capReached`「已达上限，回来收取吧」。定时器 `onUnmounted clearInterval`（命门达标）。✅ 有生命感，无泄漏。
- **SF-T5（封顶软化）**：`softCap(x,cap)=cap·(1−e^(−x/cap))`（L144-147）替换三处硬顶，设施乘区/comfort 独立乘子未入 cap（L197-202）。✅ 断崖消除、单调递增。
- **SF-T6（墙钟回拨钳位）**：`userStore.settleHomestead` L437-440 guard 放在首次基线判定之后，`now<lastSettleAt → 记 0 + 夹 lastSettleAt 到 now`。✅ 卫生级、覆盖所有 settle 入口（place/unplace/upgradeFacility 都先调 settle）。

**结论**：R1/R2 十项零回归，S14-A..E 25 项无被破坏迹象。收官轮可放心在其上加 SF-T8。

### SF-T8 首次用户上手路径（功能维度设计走查）

以「第二天打开游戏进 /homestead」的首次用户视角走查委托应给的体验：

1. **进 home tab → 看到「今日委托 X/N」摘要**：这是 cue（习惯循环起点）。home 面板右侧 `ops-panel`（`HomesteadView.vue` L505+）现已排舒适度 / KP strip / 驻留卡 / 设施 ×3——委托位应插在这一列**驻留卡（L521-537）之下**（都是「家园日常状态」语义簇），给醒目的完成度摘要。
2. **三条委托全在 hub 内可完成**：挂机结算一次（home tab 本地）、打一层塔（explore/battle tab）、强化一件装备（characters tab 装备面板）——**闭环在 hub 内**，这是委托区别于 daily（要跳去抽卡/理论战）的定位。措辞须强化「不用离开家园」。
3. **完成即领 or 手动领**：沿用 daily `claim` 双阶段（进度满 → 领取按钮亮）最省心智，与 `stores/daily.ts` L142-158 同构。
4. **全清收尾**：三条清完给一份额外 bonus——这是「今天回家把事做完」的爽感峰值，也是委托存在的理由（daily 现在逐条领、无全清 bonus）。

**功能维度边界情况（研究审计 Phase 3 已点，本轮确认必须守）**：
- **0 入住角色**：`settleHomestead` 返回 `characterCount:0` 空 yield（`computeIdleYield` L191-192）。「挂机结算一次」若不守 `result.hours>0` 会被空结算（反复进出刷 0 产出）刷满。**必须守 `hours>0`**。
- **毕业玩家（已达塔顶）**：`completeFloor` 返回 `completed:false`（userStore L749-762），「打一层塔」必须**同埋 `sweepFloor`**（userStore L770-781，扫荡也算完成），否则毕业玩家永远做不了塔委托、卡死全清 bonus。**绝不复用 `battleWin`**（那是宅理论战 `battleFlow.endGame` 计数，语义污染）。
- **破产 / 无重复件玩家**：「强化一件」（`enhanceEquipment` L661-666）在无燃料/KP 时 `enhanceItem` 返 false。**至少一条委托保底可完成**（有入住角色即可挂机结算），否则全清 bonus 变「永远拿不到的空诺」。

---

## Phase 2: 审美品味

### 配色与视觉层次
- 全站语义令牌纪律保持得好：SF-T3 驻留进度条 `is-full`→`--c-warning`、SF-T7 chip `text-highlight`、readiness 三档 `--c-success/warning/danger`。**SF-T8 委托应复用同一套**：未完成灰（`--c-ink-3`）、可领高亮（`--c-accent`/`--c-highlight`）、全清 bonus 领取用 success 绿。禁 text-white 压浅底、禁动态色类拼接。

### 间距与信息密度（收官轮最该盯的一致性点 🟡）
- home 面板右侧 ops-panel 现已排 4 类卡：舒适度 / KP strip / **驻留卡（SF-T3 新增，带横条进度条）** / 设施 ×3。SF-T8 委托位再插进来（大概率也带进度条）→ **同一列出现两个进度条卡（驻留 + 委托）视觉容易糊**。
  - 建议：委托卡视觉上与驻留卡**明确区分**——委托用「清单勾选」隐喻（每条一行 `✓/○ 标题 · 奖励`）而非又一根横条进度条；只在 hub 级摘要（X/N）用一个小徽章，避免「两条横条谁是谁」的读图负担。

### 动效与过渡
- SF-T7 chip 点亮走纯 CSS `transition-colors`（无裸 setTimeout）是对的范式。SF-T8 委托「完成瞬间勾选点亮」应同样走 CSS transition；**全清 bonus 到手**可复用现成 `.sweep-float-*` 淡入飘字（`HomesteadHubView` L786-788，克制正反馈，不造粒子）。

### 整体视觉性格
- 家园 hub 的性格现在是「温和的日常经营」——不吵、语义色克制、飘字轻。SF-T8 委托要顺这个性格：**软钩子不是硬 KPI**（漏做无惩罚、奖励小到「做了开心不做无损」，对齐动森村民请求的哲学），措辞轻松（「今天在家里做点小事」）而非任务式命令语气。

---

## Phase 3: 产品想象力

### 「如果能 XXX 就太好了」（≥3）
1. **💡 今日全清 bonus（本轮争取，SF-T8 核心差异化）**：三条委托各给极小奖 + 全清额外一份（如各 +20~30KP，全清额外 +50KP/+1 券）。这是 daily task 现在**没有**的收尾正反馈，正好回答「委托 vs 每日任务有何区别」，成本极低（一个 `allDone` 派生 + 一份 bonus）。**须配保底可完成委托**（否则毕业/破产玩家永远拿不到 bonus）。
2. **💡 委托卡可点跳转对应 tab（本轮 nice-to-have）**：「打一层塔」委托点一下 `switchTab('explore')`、「强化一件」`switchTab('characters')`——把「知道要做」到「去做」的路径抹平。非必须但顺手。
3. **💡 委托点名入住角色（S15+ backlog）**：方舟基建心智——「入住的 XX 想陪你挂机」。需角色维度进度模型，纯全局计数承载不了，超范围。
4. **💡 委托叙事化 / 角色请求制（S15+ backlog）**：委托给角色好感 + 一句台词，让家园从「数值面板」变「有人住的家」，与 S14-C 好感联动。大想象，S15+ 单独立项。
5. **💡 委托奖励给家园货币而非 KP（S15+ backlog）**：焊进 SD-T1 设施/未来家具经营闭环（做委托 → 攒家园货币 → 升设施 → 挂机更快 → 更愿回来），让委托成为家园日常燃料而非又一个通用 KP 水龙头。与 P3-4 家具 backlog 联动。

### 可以删掉的东西（≥1）
- **别做「委托进度横条」**：委托每条目标都是「1 次」量级（挂机 1 次 / 塔 1 层 / 强化 1 件），target=1 的进度条本质是布尔勾选，画成横条是过度设计 + 与驻留横条撞脸。**删掉横条，改清单勾选**（`○ → ✓`）。信息更省、视觉更轻、与 SF-T3 驻留卡天然区分。
- **别扩 `DailyTaskType` 通用枚举**（研究审计替代 1 方案 A）：把 idle/tower/enhance 塞进全站留存引擎会污染 daily 抽象纯度（`dailyTasks.ts` 顶部明写「命中现有玩法成功点」）、让委托与 daily task 更难区分。宁可 daily 内开平行 commission 子域（语义干净）——但**这会新增序列化字段，触碰存档协议**（见 Phase 4）。

### 「啊哈时刻」分析
- SF-T8 的啊哈时刻 = **第二天回来，看到「今日委托 2/3，就差强化一件」，顺手做完，全清 bonus 到手的小满足**。让它来得早：委托 cue（home 面板摘要）要在进 hub 第一屏就可见，别埋在设施列下面滚动区外。

---

## Phase 4: 一致性与对比

### 跨视图一致性（S14 收官复核）
- **hub 五 tab 心智已收敛**：hero 循环示意（非导航）+ 五真 tab，SF-T1 后不再误导。
- **战力口径已统一**：编队/探索面板同源 `calculateBattlePower` + 同一 readinessHint 三档（SF-T4）。
- **home 面板信息簇**：舒适度/KP/驻留/设施——SF-T8 委托入这一簇时须保持「家园日常状态」的统一读图逻辑（见 Phase 2 密度建议）。
- **存档协议（SF-T8 唯一触存档风险点）**：daily 域采「平行 commission 子域」= 新增 `commissionDate`/`commissionProgress`/`commissionClaimed` 序列化字段（对齐 `DailySave` L57-74 现有 `date`/`progress`/`claimed` 三件套）→ 必须 **schema + migrations（`migrateDaily` L91）+ 装配器（`daily.serialize`/`deserialize` L217-242）三处同改 + 往返测试**。技术上可不升 SAVE_VERSION（新字段 deserialize `?? {}` 兜底与现有 `progress` 完全同构，旧档缺失 → `ensureToday` 归零），但**升不升 v19 须 R3 Scout/Planner 拍死**——研究审计倾向不升，本报告认同（一 sprint 只升一次的额度留给真需要的场景；`?? {}` 兜底 + `persistence.test.ts` 覆盖旧档兼容即安全）。

### 与同类产品对比
- **原神/崩坏3 每日委托**：4 条固定 + 全清 bonus。可迁移 = 全清 bonus（daily task 现在没有的收尾）。
- **方舟基建委托**：与驻留角色绑定。AnimePlay 已有 `placedCharacterIds`，但「点名角色」需角色维度进度模型，本轮 backlog。
- **动森村民请求**：软钩子、漏做无惩罚、奖励小。这是 AnimePlay 单机向委托最该学的哲学——**委托是回归动机，不是硬产出渠道**。

---

## Prioritized Recommendations

### 🔴 Critical（SF-T8 逻辑完备性，不做会崩）
- **[SF-T8] 委托走「daily 内平行 commission 子域」，三个新埋点挂 userStore 既有门面**：`markCommission('idle')` 挂 `settleHomestead`（**守 `result.hours>0`**，防空结算刷委托）、`markCommission('tower')` **同埋 `completeFloor`（completed 分支）+ `sweepFloor`（ok 分支）**（毕业玩家扫荡也算，**绝不复用 `battleWin`** 污染宅理论战计数）、`markCommission('enhance')` 挂 `enhanceEquipment`（成功分支）。复用 `ensureToday` 跨天口径，**绝不自造 `todayKey`**（两套跨天判定漂移是回归温床）。
- **[SF-T8] 至少一条委托保底可完成**：有入住角色即可完成的「挂机结算一次」作保底，否则全清 bonus 因毕业/破产玩家永远拿不到，变空诺。
- **[SF-T8] 存档三处同改 + 往返测试**：若采平行 commission 子域，新增字段必须 schema + migrations + daily 装配器三处同改，`persistence.test.ts` 覆盖旧档（无 commission 字段）反序列化 `?? {}` 兜底不崩。升不升 v19 由 Scout/Planner 拍死（倾向不升）。

### 🟡 Important（体验，应本轮做）
- **[SF-T8] 委托必须与每日任务视觉分区 + 措辞差异化定位「家园本地小事」**（本轮最关键 refine）：三条全在 hub 内闭环（挂机/塔/强化），措辞强调「不用离开家园」；UI 与 daily task 分区展示，避免「两套任务系统」认知负担。
- **[SF-T8] 委托 cue 在 home 第一屏可见**：home 面板给「今日委托 X/N」醒目摘要（小徽章即可），别埋在设施列滚动区外——cue 看不见 = 习惯循环起不来。
- **[SF-T8 / SF-T3] 委托卡与驻留卡视觉共存复核**：两者同处 ops-panel，**委托用清单勾选（`○/✓`）而非又一根横条进度条**，与 SF-T3 驻留横条天然区分，避免「两条进度条谁是谁」。

### 🟢 Nice-to-have（锦上添花）
- **[SF-T8] 委托卡可点跳转对应 tab**（塔→explore、强化→characters），抹平「知道要做」到「去做」的路径。
- **[SF-T4-refine 余味] readinessHint 括号注释可再收一档**：「（敌我同一把尺衡量）」比黑话好读，若想更干净可只在编队页首次出现处点一次。非必须。

### 💡 Feature Idea（backlog，S15+，不进本轮）
- 💡 今日全清 bonus 之上的**委托红点接全站红点系统**（`docs/留存系统.md`）。
- 💡 **委托点名入住角色**（方舟基建心智，需角色维度进度模型）。
- 💡 **委托叙事化 / 角色请求制**（与 S14-C 好感联动，家园从数值面板变「有人住的家」）。
- 💡 **委托奖励给家园货币而非 KP**（焊进设施/家具经营闭环，与 P3-4 家具 backlog 联动）。

### 收官轮附注（勿默认前轮已完成）
- 已 Read 核实 R1（SF-T1/T4/T7）+ R2（SF-T2/T3/T5/T6 + 两 refine）**全部真落地**（非空跑，代码机制真生效）。R3 Evaluator 仍须亲自复跑 5 条验收命令验 SF-T8 真实现；SF-T8 完成后确认 SF-T1..T8 全 `[x]` 方为 S14-F / S14 家园 hub 深化整体收官。
