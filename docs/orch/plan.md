# Iteration 1 Plan

## 本轮任务（按依赖顺序）

1. PL1-T1: 装备目录扩容与效果模型
   - 目标：每槽每稀有度提供多件装备，并为装备增加可展示、可计算的家园效果。
   - 依赖：无
   - 验收：装备目录测试证明每个槽/稀有度有多个候选；效果格式化可读；旧 defId 保留。
   - 来源：进化策略师建议 / 研究员建议

2. PL1-T2: 家园收益接入装备效果
   - 目标：入住角色已装备道具的家园效果真实影响离线经验、好感、知识点收益，并受上限控制。
   - 依赖：PL1-T1
   - 验收：homestead 纯函数测试和 userStore 结算测试覆盖加成生效。
   - 来源：体验官建议 / 研究员建议

3. PL1-T3: 家园页基地运营层
   - 目标：家园首屏展示舒适度、设施产率、入住角色装备效果，形成基地 hub。
   - 依赖：PL1-T2
   - 验收：type-check/build 通过；UI 不使用动态 Tailwind 色类。
   - 来源：体验官建议 / Planner 自主判断

4. PL1-T4: 装备背包与配装弹窗展示效果
   - 目标：装备卡、兑换商店、配装候选都展示效果词条，玩家能比较“数值 + 家园效果”。
   - 依赖：PL1-T1
   - 验收：type-check/build 通过，装备效果文案不只是静态说明，而与结算逻辑同源。
   - 来源：进化策略师建议

## 来自 Reviewer 的改进项（采纳的）

- 家园运营仪表 → 本轮行动：新增派生产率/设施/居民状态 UI。
- 装备从纯数值变成有用途 → 本轮行动：新增装备效果并接入离线收益。
- 掉落多样性不足 → 本轮行动：目录扩容后塔掉落从候选池随机。

## 相关陷阱（从 pitfalls.md 筛选）

- engine 纯净：装备效果不写入 engine 战斗层；随机仍由注入 RNG。
- 不升存档：复用 v14 homestead/equipment 域，新增静态目录和派生计算。
- 颜色规则：稀有度色用完整字面映射；界面色走语义令牌。
- 装备系统：`resolveEquipBonus` 仍是战力同源口径，家园效果单独派生。

## 上轮失败分析

- 无上轮失败；本轮从已完成 S13-C2 上继续扩展。

## 验收命令

```bash
cd frontend-vue && npm run type-check
cd frontend-vue && npm run test
cd frontend-vue && npm run build
python backend/test_security.py
grep -rn "debug=True" backend/server.py api/index.py
```
