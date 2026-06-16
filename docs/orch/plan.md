# Iteration 3 Plan (evolution) — 收口轮

> 需求来源：docs/orch/evolution-audit-report.md（Round 3，最后一轮）。已读 scout.md A/B/C + negotiation 上轮 + pitfalls。
> 本计划只说 WHAT/WHY；HOW（精确落点/行号）见 scout.md B 段。

## 本轮主题：把前两轮造的系统**让新人感知到、让老玩家带出去**

reviewer 收口诊断：系统层很完整（R1 动机引擎、R2 图鉴枢纽），但新人感知=零（isNewUser 消费完即丢、首抽无庆祝、空态死文字），老玩家也没"把成果带出去"的传播出口。取最高 ROI 组合 🔴-1 + 🟡-2：一头补"愿意上手"，一尾补"愿意安利"，**都零后端、几乎不动存档、一轮可一并落地**。

## 本轮任务（按依赖顺序）

1. **E3-T1：新人 onboarding（FTUE 点火）**（reviewer 🔴-1）
   - 目标：让新人登录后第一天能感知到产品的系统。三件：
     a. 首登引导遮罩（localStorage 设备标志触发，3-4 步指向：每日任务面板 → 抽卡 → 收藏/图鉴 → 第一场对战），可跳过。
     b. 首抽庆祝（首次抽卡在 GachaResultModal 叠特殊庆祝态，首抽判定用 gachaStore 历史为空）。
     c. 空状态 CTA（scout 定位的 7 处死文字加引导按钮，如"找不到匹配的卡"→"去抽卡"）。
   - 依赖：无（用 localStorage，不进存档、不升 schema）
   - 验收：新设备首登出现引导遮罩、可跳过、跳过后不再弹（localStorage 标志）；首抽有庆祝态、非首抽无；至少主要空态（收藏/图鉴）有可点 CTA；type-check/build 通过。
   - 来源：Evolution Reviewer 🔴-1

2. **E3-T2：可分享 Wrapped 成绩卡（传播喇叭）**（reviewer 🟡-2）
   - 目标：一键生成可下载的炫耀图，聚合玩家成果（图鉴完成度 X/总数、等级、已解锁成就数、塔进度、欧气/收藏数等纯派生数据）。Canvas 绘制 → 下载 PNG。零后端、纯派生、不进存档。
   - 依赖：无（数据源是现成 getter）
   - 验收：CollectionsView 标题栏有"生成成绩卡"入口；点击生成包含真实成绩数据的图片并可下载（Canvas toBlob + a.download）；不引 html2canvas 等重依赖；首版不嵌远程封面图（规避 canvas taint）；颜色语义/品牌一致；type-check/build 通过。
   - 来源：Evolution Reviewer 🟡-2

3. **E3-T3：收口杂项（文档纠偏 + loop 收尾）**
   - 目标：scout 发现 `frontend-vue/CLAUDE.md` 与 `docs/plans/pitfalls.md` 仍写存档协议 v4（实际已 v6，经 S10 saveVersion→v5、evo-1→v6）——纠正为 v6，免后续误判。更新 FUTURE.md/README 反映 3 轮 evolution 成果（可选）。
   - 依赖：T1/T2
   - 验收：CLAUDE.md / pitfalls.md 的存档版本号与实际一致（v6）。

## 来自 Reviewer 的改进项（本轮采纳的）
- 🔴-1 onboarding → 本轮做（E3-T1），localStorage 触发不动存档
- 🟡-2 可分享成绩卡 → 本轮做（E3-T2），纯前端 Canvas
- 🟡-3 周任务/连签 / 🟢-4 红点 → 不做（见 negotiation）

## 相关陷阱（从 scout.md C 段 / pitfalls 筛选）
- onboarding 状态用 localStorage（设备级，reviewer + scout 一致），不进存档、不升 schema。
- 成绩卡用标准 Canvas API（toBlob/createObjectURL/a.download），别引 html2canvas；首版不嵌远程图防 canvas taint。
- 空态 CTA 别学旁边的 `bg-danger text-white`，用 `.btn-*` 语义类。
- ★scout C 段大坑：schema 实为 **v6**，但 CLAUDE.md/pitfalls 文档仍写 v4——E3-T3 纠偏，且本轮 2 主任务本就不动 schema。
- engine 纯净；颜色语义类禁 text-white 压浅底。

## 验收命令
```bash
cd frontend-vue && npm run type-check     # 0 错
cd frontend-vue && npm run test           # 全绿，不低于 340
cd frontend-vue && npm run build          # 生产构建通过
```

## 通过标准
新人引导/首抽庆祝/空态 CTA 可见可用；成绩卡可生成下载且含真实成绩；文档版本号纠偏；三条验收命令全绿；架构/颜色铁律不破。
