# Iteration 1 Plan (evolution)

> 需求来源：docs/orch/evolution-audit-report.md「Prioritized Recommendations」（Tier1 on，evolution 模式）。
> 已读 scout.md A/B/C 段 + pitfalls.md。本计划只说 WHAT/WHY；HOW 见 scout.md B 段，Generator 自主决定。

## 本轮主题：给"玩法齐全但没动机"的产品装上**留存引擎**

reviewer 核心结论：8 个玩法是孤岛，缺三样留存核心（onboarding / 每日回访 / 收集完成度）。本轮取 reviewer 明确指定的**最高 ROI 组合 🔴-1 + 🔴-2，并叠加共享埋点的 🟡-3**——三者在「现有玩法成功点埋进度检测」这一套接入模式上完全同构，一轮一并落地，边际成本最低。

## 本轮任务（按依赖顺序）

1. **E1-T1：每日任务 + 每日登录奖励**（reviewer 🔴-1）
   - 目标：装上"明天为什么回来"。新建 `stores/daily.ts` 领域 store（跨天读时归零，复用 shop 的 todayKey 模式）；静态任务定义放 config；3-4 个任务全部命中现有成功点（抽卡/赢对战/收观看/养成互动）；做满给券+知识点；外加每日登录一次性发放。主页加「今日任务」面板。
   - 依赖：无（但与 T3 共享埋点，建议同改）
   - 验收：登录后主页显示今日任务面板 + 进度；触发对应玩法进度自增；做满可领奖（券/知识点入账）；跨天重置；每日登录奖励一次性发放且跨天再发；daily store 有 serialize/deserialize/reset + 特征测试；进存档 v6 跨「重开浏览器」保真。
   - 来源：Evolution Reviewer 🔴-1

2. **E1-T2：图鉴/收集完成度 + 里程碑奖励**（reviewer 🔴-2）
   - 目标：把 665 张卡的补全欲变成有目标有奖励的进度轴。`CollectionsView` 加「图鉴」tab：动画/角色/各稀有度完成度进度条（X/总数，总数从数据 `.length` 派生不硬编码）；未拥有卡灰位剪影（复用 VirtualGrid）；静态里程碑阈值表，达成发奖（已领里程碑 id 进存档）。
   - 依赖：无
   - 验收：图鉴 tab 显示各维度完成度（拥有/总数）+ 灰位未拥有卡；达到里程碑可领一次性奖励且已领状态持久化；完成度为纯派生（不新存"拥有集合"）；进存档 v6；特征测试覆盖完成度计算与里程碑领取。
   - 来源：Evolution Reviewer 🔴-2

3. **E1-T3：成就系统**（reviewer 🟡-3，因与 T1 共享埋点纳入本轮）
   - 目标：把散落的高光时刻变成可累积可炫耀的资产。`stores/achievements.ts` + 成就墙（弹窗或视图）；~15-20 条静态成就（首张 UR / 爬塔里程碑 / 养成满级 / 猜角色连对 / 图鉴里程碑 / 知识点累计…）在同一批成功点检测解锁，给徽章 + 一次性奖励；存"已解锁 id 数组"。
   - 依赖：T1（共用同一批玩法成功点埋点，一次改完）
   - 验收：达成条件解锁成就 + 发奖 + 持久化（已解锁 id 进存档 v6）；成就墙可见已解锁/未解锁；特征测试覆盖解锁判定。
   - 来源：Evolution Reviewer 🟡-3

## 来自 Reviewer 的改进项（本轮采纳的）
- 🔴-1 每日任务/登录 → 本轮做（E1-T1）
- 🔴-2 图鉴完成度 → 本轮做（E1-T2）
- 🟡-3 成就系统 → 本轮做（E1-T3，搭车共享埋点）
- 经济失衡（知识点只进不出）→ 部分缓解：本轮 daily/里程碑/成就都发知识点会加剧"只进"，故 daily 奖励以**券**为主、知识点为辅；知识点出口（🟡-4 商城）留到第 2 轮正式做。

## 相关陷阱（从 pitfalls.md / scout.md C 段筛选）
- userStore 已偏大：新逻辑进独立领域 store，userStore/battleFlow 成功点只加一行 markProgress/check。
- 对战埋点必须在 battleFlow.endGame（唯一不在 userStore 的成功点），别漏。
- schema v5→v6：schema.ts + migrations.ts + persistence.ts 三处同改 + 旧档缺键补默认 + 两测试文件只追加不改既有断言（含 persistence.test 的「payload 全键列表」要加新键）。
- 存档字段紧凑：静态定义放 config，存档只存可变状态（进度计数/已领 id 数组）。
- 颜色语义类，禁 text-white 压浅底/禁动态色类拼接；新面板/灰位用 bg-surface/text-ink/border-line 系。
- 总数 `.length` 派生不硬编码 665；图鉴"拥有"用 collection 计数不用 favorite。
- 领域 store 自己不调 saveToServer；engine 纯净，日期/进度检测留 stores 层。

## 验收命令（回归 + 新增）
```bash
cd frontend-vue && npm run type-check     # 0 错
cd frontend-vue && npm run test           # 全绿，不低于 310 + 新增 store/迁移测试
cd frontend-vue && npm run build          # 生产构建通过
```
（后端无改动，本轮不跑 test_security.py；S10 加固保持。）

## 通过标准
三个任务的功能可见可用 + 进存档 v6 跨重开保真 + 三条验收命令全绿 + 颜色/架构铁律不破。
