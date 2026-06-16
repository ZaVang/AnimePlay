# Iteration 2 Plan (evolution)

> 需求来源：docs/orch/evolution-audit-report.md（Round 2）「Prioritized Recommendations」。已读 scout.md A/B/C + negotiation 上轮 + pitfalls。
> 本计划只说 WHAT/WHY + 平衡设计决策；HOW（精确落点）见 scout.md B 段。

## 本轮主题：让"图鉴"从只读面板进化成**全产品的价值枢纽**

reviewer Round 2 核心：第 1 轮装了动机引擎，但图鉴还是死的、知识点出口锁死在 UP 轮换、Bangumi 真实数据（评分/放送年）100% 送达却没展示。取 reviewer 最高 ROI 组合 🔴-1 + 🟡-3，二者都以图鉴/卡详情为枢纽、复用现成 spend/addCard/纯派生、几乎不进新存档。

## 本轮任务（按依赖顺序）

1. **E2-T1：图鉴定向解锁（经济闭环主菜）**（reviewer 🔴-1）
   - 目标：把知识点变成"想要哪张卡点哪张"的有意义出口。CodexPanel 灰位未拥有卡可点击 → 花知识点直接解锁（addCard 入库）。对标 Marvel Snap Token Shop：是"心仪卡的长期保底出口"，不是抽卡替代品。
   - 依赖：无（复用第 1 轮 CodexPanel + 现成 spend/addCard）
   - **★平衡设计决策（Planner 定，Generator 按此实现）**：定价按稀有度静态表，**显著高于分解回收、UR 尤贵**，使定向解锁是"长期攒钱拿心仪卡"而非"花钱跳过抽卡"。基准档（Generator 可微调但须守住"UR 远贵、阶梯递增、明显高于回收"原则）：R 200 / SR 600 / SSR 2000 / HR 5000 / UR 12000 知识点。
   - 验收：CodexPanel 未拥有卡可发起解锁；余额够则扣知识点 + 入收藏 + 完成度 +1 + 存档；余额不足/已拥有给提示不扣费；走 userStore 门面编排（不在领域 store 调存档）；无需新 schema 字段（collection 已持久化）；特征测试覆盖解锁成功/余额不足/已拥有三分支。
   - 来源：Evolution Reviewer 🔴-1

2. **E2-T2：真实评分/放送年可视化（差异化护城河）**（reviewer 🟡-3）
   - 目标：把 Bangumi 真实元数据搬上台面——竞品物理上做不到的展示。CardDetailModal 加「番剧资料」区块：anime 卡显示真实评分（rating_score）/排名（rating_rank）/放送年（date）；character 卡显示登场作品数（anime_count）/人气（popularity_score）等。
   - 依赖：无（数据已送达前端，纯展示）
   - 验收：CardDetailModal 对 anime 卡显示真实评分/排名/放送年、对 character 卡显示作品数/人气；字段缺失时该行不显示（v-if 守卫）；types/card.ts 补显式可选字段（不裸读 any）；颜色语义类；type-check/build 通过。
   - 来源：Evolution Reviewer 🟡-3

## 来自 Reviewer 的改进项（本轮采纳的）
- 🔴-1 图鉴定向解锁 → 本轮做（E2-T1），定价守住"不架空抽卡"原则
- 🟡-3 真实数据可视化 → 本轮做（E2-T2），先做 CardDetailModal 展示，"番剧年表"时间轴留余量/下轮
- 经济闭环：E2-T1 正是产品方上轮留给本轮的"知识点出口"主题，现以图鉴为出口落地

## 相关陷阱（从 pitfalls.md / scout.md C 段筛选）
- 定向解锁定价是设计要点不是实现细节：守住 UR 远贵、阶梯递增、明显高于回收（C-1）。
- 解锁前必须判已拥有（getXxxCardCount>0 拒重复购买）；spend 返 false 不 addCard；门面负责 saveToServer。
- BaseCard 索引签名让真实字段裸读不报错，但补显式可选字段更安全（C-2）。
- CardDetailModal 有历史硬编码色（text-blue-600），新区块坚持语义类（C-3）。
- 声优维度不在本轮（server.py:44 剥离 main_characters，前端无 actors 数据）。
- schema 现 v6：本轮 2 任务不动 schema（解锁靠 collection 已有持久化、可视化纯展示）。

## 验收命令（回归 + 新增）
```bash
cd frontend-vue && npm run type-check     # 0 错
cd frontend-vue && npm run test           # 全绿，不低于 336 + 新增解锁编排测试
cd frontend-vue && npm run build          # 生产构建通过
```

## 通过标准
定向解锁可用且扣费/入库/完成度联动正确、定价守平衡原则；CardDetailModal 真实数据展示正确；三条验收命令全绿；颜色/架构铁律不破。
