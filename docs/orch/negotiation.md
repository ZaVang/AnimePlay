# Negotiation — S14-F Round 3/3（product-loop --tier1 on --mode all · 收官轮）

> 对三份 Reviewer 报告（product-audit / research-audit / evolution-audit）Prioritized Recommendations 逐条回应。本轮承诺切片 = **SF-T8｜家园日常委托（P3-10）** —— S14 收官任务。
> 分诊：命中 SF-T8 → 接受并本轮落地；命中收官核对 → 接受本轮做；超 S14-F → backlog（S15+）。
> 三份报告本轮镜头高度收敛（命名空间方案 B / 三守卫 / 全清 bonus / UI 清单勾选），无实质分歧，唯一需拍板项 = 「升不升 v19」——Scout 拍板**升 v19**，本 Negotiation 采信（理由见末尾）。

---

## 一、evolution-audit（R3 SF-T8 镜头）逐条回应

### 接受 + 本轮落地｜🔴 Critical SF-T8 家园日常委托
- **回应**：接受（本轮唯一必做）。采纳其全部落地判据：平行 commission 子域 + 独立模板/桶/`markCommission` 埋点 + 复用 `ensureToday` 跨天 + 三守卫（idle 守 `hours>0`... 见下修正 / tower 同埋 completeFloor+sweepFloor 绝不碰 battleWin / idle 保底可完成）+ 奖励小额走 `profile.earn` + UI 挂 home 面板与 SF-T3 共存。
- **一处强化（采纳 product-audit + research-audit 更严口径）**：idle 守卫判据 evolution-audit 写「守 `yield.hours>0`」，但 product/research 指出首次基线 / 回拨钳位 / 0 入住空结算都可能 hours 存在但产出 0 —— 本轮**采信更严口径「守实际产出」**（埋在 `settleHomestead` 全 0 产出早退之后），比单纯 `hours>0` 更稳。已写进 plan 任务 1 决策 3①。
- **行动**：写进 SPRINT 第 3 轮 SF-T8 + plan 任务 1。

### 接受 + 本轮落地｜🔴 Critical SF-T8 存档拍板
- **回应**：evolution-audit 倾向不升 v19，但 Scout 拍板升 v19，**本轮采信 Scout（升 v19）**。理由：只要动 `DailySave` 结构就必须三处同改 + 往返测试（成本与升版无关），升版有明确版本锚点、更符合 SPRINT L16 协议、v19 额度本就留给 SF-T8。**一 sprint 只升一次，SF-T8 用掉即封顶。**
- **行动**：schema `SAVE_VERSION` 18→19 + 三处同改 + `migrations.test.ts` v18→v19 往返，写进 plan 决策 7。

### 接受 + 本轮落地｜🟡 Important 今日全清 bonus
- **回应**：接受（委托区别于 daily 的核心收尾正反馈）。采纳 `allCommissionsDone` 派生 + 一份 bonus；已领标记复用 commission 已领桶特殊 key（不新增第 4 字段，Scout C 段拍板）。R3 时间紧可 fallback 留收尾，但逐条 + 三守卫 + 保底必做。
- **行动**：写进 plan 决策 4。

### 接受 + 本轮落地｜🟡 Important home 面板委托摘要（cue）
- **回应**：接受。home 第一屏可见「委托 X/N」小徽章摘要（习惯循环 cue 轻量版）。
- **行动**：写进 plan 决策 6。

### 部分接受（本轮 nice-to-have，可省）｜🟢 委托卡点击直达对应 tab
- **回应**：部分接受。顺手增强非必须；若实现成本低可带，否则不阻塞验收。不写进硬验收，标 nice-to-have。

### 接受 + 本轮做｜🟢 收官一致性巡检
- **回应**：接受。确认 SF-T1..T8 全 `[x]` + 五处视觉统一。写进 plan 任务 2。

### 拒绝本轮 / backlog｜💡 Feature Idea（委托叙事化 / 家园货币奖励 / 点名角色 / 红点接线）
- **回应**：backlog（S15+）。均需角色维度进度模型 / 家园货币域 / 全站红点系统，超 S14-F P3 打磨范围，本轮克制不做。

---

## 二、research-audit（R3 SF-T8 设计研究镜头）逐条回应

### 接受 + 本轮落地｜🔴 委托走平行 commission 子域（替代 1 方案 B）
- **回应**：接受。三审 + Scout 收敛，语义纯度 > 省 2 字段迁移成本。三埋点挂 userStore 门面 saveToServer 前，与现有 5 个 markProgress 同位。
- **行动**：plan 决策 1 + 5。

### 接受 + 本轮落地（强化）｜🔴 挂机委托守「有实际产出」而非 `hours>0`
- **回应**：接受，且这是本轮采信的更严口径（见 evolution 回应）。埋点在全 0 产出早退之后。
- **行动**：plan 决策 3①。

### 接受 + 本轮落地｜🔴 塔委托同埋 completeFloor+sweepFloor、绝不复用 battleWin
- **回应**：接受。毕业玩家靠扫荡完成；battleWin 是宅理论战计数，语义错配。
- **行动**：plan 决策 3②。

### 接受 + 本轮落地｜🔴 至少一条委托保底可完成
- **回应**：接受。`commission_idle`（有入住即结算）天然保底，防全清 bonus 空诺。
- **行动**：plan 决策 3③。

### 接受 + 本轮落地｜🟡 今日全清 bonus（替代 2 方案 B）
- **回应**：接受（同 evolution 全清 bonus）。

### 部分接受｜🟡 委托红点 / cue 显形
- **回应**：部分接受。全站红点接线 backlog；本轮做 home 面板「委托 X/N」摘要（轻量 cue）。

### 存档拍板分歧｜research-audit 倾向不升 v19
- **回应**：research-audit 与 evolution 均倾向不升 v19，但**本轮采信 Scout 拍板升 v19**（存档结构变更三处同改成本与升版无关，升版有版本锚点更符合协议，v19 额度本就留 SF-T8）。这是本轮唯一实质分歧，已拍死。

### 拒绝本轮 / backlog｜🟢🟢 命名空间方案 A 退路 + 🟢 委托与 SF-T3 UI 共存 + 💡 Wild
- **回应**：方案 A（扩枚举）退路**不采用**（三审收敛方案 B）；SF-T3 UI 共存 → 接受（plan 决策 6，清单勾选而非横条区分）；💡 委托叙事化 / 家园货币奖励 → backlog S15+。

---

## 三、product-audit（R3 体验镜头）逐条回应

### 接受 + 本轮落地｜🔴 委托平行子域 + 三埋点挂门面 + 复用 ensureToday
- **回应**：接受（同上）。

### 接受 + 本轮落地｜🔴 至少一条委托保底可完成
- **回应**：接受（`commission_idle` 保底）。

### 接受 + 本轮落地｜🔴 存档三处同改 + 往返测试
- **回应**：接受。product-audit 亦把「升不升 v19」留给 Scout/Planner —— 本轮拍板升 v19。

### 接受 + 本轮落地（本轮最关键 refine）｜🟡 委托与每日任务视觉分区 + 措辞差异化「家园本地小事」
- **回应**：接受（product-audit 标为本轮最关键一条 refine）。三条全在 hub 内闭环、措辞强调「不用离开家园」、UI 与 daily task 分区。
- **行动**：plan 决策 2 + 6。

### 接受 + 本轮落地｜🟡 委托 cue 在 home 第一屏可见
- **回应**：接受。home 面板「委托 X/N」醒目摘要，别埋在设施列滚动区外。
- **行动**：plan 决策 6。

### 接受 + 本轮落地｜🟡 委托卡与驻留卡视觉共存（清单勾选而非横条）
- **回应**：接受（本轮收官轮最该盯的一致性点）。委托 target=1 本质布尔勾选，用 `○/✓` 清单 + X/N 小徽章，不再来一条大横条进度条，与 SF-T3 驻留横条天然区分。
- **行动**：plan 决策 6 + 「可删掉的东西：别做委托进度横条」采纳。

### 部分接受｜🟢 委托卡可点跳转对应 tab
- **回应**：部分接受（nice-to-have，可省，不阻塞验收）。

### 部分接受｜🟢 SF-T4-refine 余味：readinessHint 括号注释再收一档
- **回应**：部分接受但**本轮不动**。R2 已把「（同口径）」黑话改为「（敌我同一把尺衡量）」白话，product-audit 亦评「可留」。为避免收官轮在已 COMPLETE 的 SF-T4 上开新改动引回归，本轮不碰；若 Generator 顺手且零风险可微收，非硬验收。

### 拒绝本轮 / backlog｜💡 Feature Idea（红点接线 / 点名角色 / 叙事化 / 家园货币奖励）
- **回应**：backlog（S15+），超本轮 P3 打磨范围。

### 接受 + 本轮做｜收官轮附注（勿默认前轮已完成）
- **回应**：接受。Evaluator 亲自复跑 5 条验收命令，SF-T8 完成后核对 SF-T1..T8 全 `[x]` 方为收官。写进 plan 任务 2。

---

## 四、存档拍板小结（本轮唯一实质分歧，已拍死）

- **分歧**：research-audit + evolution-audit 倾向「不升 v19，`?? {}` 兜底」；Scout 拍板「升 v19」。
- **本轮采信 Scout：升 SAVE_VERSION 18 → 19。**
- **理由**：动 `DailySave` 结构必须 schema + migrations + 装配器三处同改 + 往返测试（成本与升不升版号无关）；升 v19 给 `migrations.test.ts` 明确版本锚点，更符合 SPRINT L16 存档协议、更易审计；v19 额度本就留给 SF-T8，一 sprint 只升一次，用掉即封顶。避免「改了结构却不升版」的隐性协议违规。

## 五、超范围明确 backlog（本 Sprint 不做，S15+）

- 委托叙事化 / 角色请求制（与 S14-C 好感联动）。
- 委托奖励给家园货币 / comfort / 家具碎片（焊进 SD-T1 设施 + P3-4 家具 backlog 经营闭环）。
- 委托点名入住角色（方舟基建心智，需角色维度进度模型）。
- 委托红点接全站留存红点系统（完整 cue 显形，`docs/留存系统.md`）。
- 命名空间方案 A（扩 `DailyTaskType` 枚举）——不采用，三审收敛方案 B。
