# Iteration 4 Plan (evolution backlog, tier1 off)

> 需求来源：docs/SPRINT.md「Evolution 第 4 轮」3 个 `[ ]`（reviewer 前三轮提出未做、用户选定）。tier1 off 无审计报告无 negotiation。已读 scout.md A/B/C + pitfalls。

## 本轮任务（按依赖顺序）

1. **B1：周任务 + 连续登录递增**（唯一动存档项）
   - 目标：留存纵深。扩 daily.ts 加每周任务（weekKey 跨周重置，2-3 条命中现有玩法成功点）+ 连续登录天数 loginStreak（昨日判定递增、断签归 1）+ 递增登录奖励。静态定义进 config。升存档 v6→v7。
   - 依赖：无
   - 验收：周任务跨周重置/做满领奖、连签递增与断签归 1、登录奖励随连签变化、进存档 v7 跨重开保真、特征测试（周任务跨周 + 连签递增/断签）。
   - 来源：Evolution Reviewer（Round 3 🟡-2）

2. **B2：番剧年表时间轴**（纯前端差异化）
   - 目标：CollectionsView 加「年表」tab，已拥有动画按放送年（date）分组成可视化时间轴。纯派生、零后端、零存档。
   - 依赖：无（复用 evo-2 已展示的 date 数据）
   - 验收：按年正确分组展示拥有番剧、空态友好、纯派生不新存字段、颜色语义类、type-check/build 通过。
   - 来源：Evolution Reviewer（💡 差异化）

3. **B3：跨系统红点提示**（纯前端体验）
   - 目标：App.vue 侧边导航对主页（每日任务/登录奖励可领）、卡牌收藏（图鉴里程碑达成未领 / 成就新解锁未读）加红点。daily/codex 可领态纯派生；成就「已读」用 localStorage（不升 schema）。
   - 依赖：B1（主页红点含每日/登录信号，B1 落地后信号更全；但 B3 可独立做）
   - 验收：有奖可领/新解锁时亮红点、领取/查看后消失、成就已读用 localStorage 不升 schema、颜色语义类、type-check/build 通过。
   - 来源：Evolution Reviewer（Round 3 🟢-4）

## 相关陷阱（从 pitfalls.md / scout.md C 段）
- B1 升 schema v7 照 evo-1 的 v5→v6 三处同改 + 迁移 + 测试模式（schema/migrations/装配器），旧档 v1~v6 缺省补齐，**只追加不破坏既有断言**。
- markProgress 已按 type 遍历 DAILY_TASKS，让它也遍历 WEEKLY_TASKS → 6 个埋点一行不用改（最省）。
- B3 成就已读用 localStorage（设备级，仿 onboarding try/catch），**别给成就加存档字段**；vitest node 环境无 localStorage，测试需 memory stub（仿 onboarding.test）。
- B2 纯派生不新存字段；date 缺失/非标准做守卫（归"未知年"或跳过）。
- 颜色语义类，禁 text-white 压浅底；CollectionsView 已有历史 bg-danger text-white 别学。
- 发奖走 profile.earn 不用 addExp；领域 store 不调 saveToServer（门面负责）。

## 验收命令
```bash
cd frontend-vue && npm run type-check     # 0 错
cd frontend-vue && npm run test           # 全绿，不低于 354 + 新增
cd frontend-vue && npm run build          # 生产构建通过
```

## 通过标准
3 项功能可见可用；B1 进存档 v7 跨重开保真；红点/年表正确；三条验收命令全绿；架构/颜色铁律不破。三项全 [x] 且验收全过 → Evaluator 输出 DECISION: COMPLETE。
