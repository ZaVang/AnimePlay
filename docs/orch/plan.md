# Iteration 1 Plan

> Sprint Planner · S13-C2（装备系统全栈）· 覆盖写。
> 设计基线以 `docs/FUTURE.md` S13 → C 段（C2 部分）+ SPRINT.md「已锁定设计」为准；本文件只定 WHAT/WHY 与验收，不指定 HOW/文件/函数/步骤。
> 本轮 `--tier1 off`：SPRINT.md 的 `[ ]` 任务即需求源，目标驱动停。
> **不升存档**：v14 已含空 equipment 域（schema/migrations/装配器三处已就位）；本轮只填行为 + 接线 + 来源 + UI。
> 上轮 `eval.md`/旧 `plan.md` 属已 COMPLETE 的 **S13-C1** 轮，与本 C2 无依赖；C2 为全新 Iteration 1，无 C2 相关上轮失败需调整（见末段）。

## 本轮任务（按依赖顺序）

1. **C2-T1：装备目录 config（旋钮集中地）**
   - 目标：建立装备系统的"唯一数据源"——物品定义（id/名/槽/稀有度/五维加成）+ 3 槽 × R..UR 起始目录 + 掉落层段表 + 兑换价表 + 槽位元数据（名/图标键），全部纯数据/纯常量。
   - 依赖：无（其余任务全部消费本目录）。
   - 来源：SPRINT C2-T1。
   - 验收：类型检查 0 错误；3 个槽各覆盖 R..UR（每槽每稀有度 ≥1 件），每件加成贴近预算（R~18/SR~35/SSR~60/HR~95/UR~140，hp 折算约 2.5×）；兑换价表与 SPRINT 给值一致（R400/SR1200/SSR4000/HR10000/UR24000）且明显高于图鉴解锁价（装备是更深 sink）；该文件零 Vue/IO，可被 engine 之外的层直接引用。

2. **C2-T2：equipment store 行为 + equipBonus 纯函数求和**
   - 目标：让背包/装备槽"活起来"——获得入库、装备/卸下（含同槽校验、换下旧件留背包）、按角色解析三件已装道具为合并五维加成；加成求和为可单测的纯函数。
   - 依赖：C2-T1（行为查 config 的物品定义与槽位）。
   - 来源：SPRINT C2-T2。
   - 验收：类型检查 0 错误；store 单测覆盖 装备 / 卸下 / 同槽换装（旧件回背包不丢失）/ 异槽装备被拒（同槽校验）/ 多件加成逐围求和正确（缺省维记 0）；一件实例唯一标识在 store 层生成；既有 serialize/deserialize/reset 保留可用、存档往返不破。

3. **C2-T3：战力接 equipBonus（口径全站一致）**
   - 目标：把 C1 留的恒 0 装备加成口换成"按角色真实解析的 equipBonus"，并保证养成页五维/战力、小队战力、进战斗属性三处用**同一个解析口径**（同源同改，避免数字打架）。
   - 依赖：C2-T2（消费 resolveEquipBonus）。
   - 来源：SPRINT C2-T3。
   - 验收：类型检查 0 错误；战力相关测试更新/补充并全绿；装上道具后角色五维与战力按 `base + 加点 + 装备` 正确变化，且养成页分行加和（base/加点/装备三段）与战力合计自洽；engine 公式签名不动、engine 保持纯净（零 Vue/Pinia/DOM/Math.random）。

4. **C2-T4：来源 — 塔掉落 + 知识点兑换**
   - 目标：给装备两个入口——挑战塔通层概率掉落（按层段定稀有度、随机槽）+ 知识点商店定向兑换；两者都成功才入库，掉落随机源可注入复现，兑换扣费只走货币出口。
   - 依赖：C2-T1（层段/价表/物品定义）、C2-T2（入库行为）。
   - 来源：SPRINT C2-T4。
   - 验收：类型检查 0 错误；掉落为纯函数 + 注入 RNG，特征测试覆盖 层段→稀有度边界（1/5/6/15/16/30/31/50/51）与 50% 概率边界、同种子可复现；兑换走 `profile.spend('knowledgePoints')`、余额不足不发货（照图鉴解锁范式，返回成败结构）、成功才入库 + 通知；**掉落仅在"真正推进新层"时给**——必须复用塔通层的"是否推进进度"返回（重复挑战已过低层不掉落、不得自行新增冗余去重守卫），跨域编排（结算+入库+存档）走门面层不在组件里直接入库。

5. **C2-T5：UI — 背包 + 配装弹窗**
   - 目标：玩家能在界面里查背包、给角色配装/卸下并即时看到收益——背包卡片网格（稀有度徽章/槽位/名梗/数值/「装备中·角色」标签 + 按槽与稀有度筛选）；角色页 3 个装备槽接配装弹窗（同槽候选含「卸下」+ 装上后「五维 当前→新值(+Δ)」与「战力 当前→新值」预览）。
   - 依赖：C2-T1..T4（消费目录/行为/战力口径/已入库道具）。
   - 来源：SPRINT C2-T5。
   - 验收：类型检查 0 错误、生产构建通过；UI 里能查背包并按槽/稀有度筛选、给角色装备/卸下、弹窗里看到五维与战力的 当前→新值 delta、确认后角色战力随之变化；稀有度色用完整字面映射（禁运行时拼 `bg-${rarity}` 类）；界面色走皮肤语义令牌（禁 text-white 压浅底，稀有度识别色为固定例外）；弹窗/任何计时器若引入须登记并在卸载时清除。

## 范围决策

- **背包入口：内嵌养成页（NurtureView），不新增 `/inventory` 路由。**
  - 理由：①最小化 diff——不动 `router/index.ts`、不加导航入口与 lazy import，规避 Scout 标记的"擅自加路由扩大范围"坑；②内聚——背包与配装弹窗都消费同一 `resolveEquipBonus`，且 mock 把配装交互直接挂在角色页，背包与角色页同处一屏切换体验连贯；③养成页是装备的天然落点（角色 = 穿装备的主体）。Generator 以"养成页内 tab/区块"形态承载背包视图（变体 1 网格），不得为此新增顶层路由或全局导航项。

## 相关陷阱（从 pitfalls.md + scout.md C 段筛选）

- **[engine 纯净 / RNG 可注入]** `src/engine/` 零 Vue/Pinia/DOM/fetch/localStorage/`Math.random`。掉落与 equipBonus 求和走纯函数，掉落随机源必须注入（影响 C2-T2/T3/T4）。
- **[engine 不反向依赖 config — Scout 新坑]** equipBonus 求和若放 engine 纯函数，engine 不应 import `@/config/equipment`；最干净是 store 把"已解析的 bonus 数组"喂给 engine 求和，查表（实例→定义→加成）留 store/config 侧（影响 C2-T2）。
- **[掉落去重语义 — Scout 必查项，已核实]** 塔通层的"是否推进进度"返回对非当前层返回 false（只在推进到下一未过层时为 true），故掉落天然防刷——直接挂在该返回为真的分支即可，**不得自行新增冗余去重守卫**，也**不得忽略该返回直接掉落**（否则可反复刷低层刷装备=经济漏洞）（影响 C2-T4）。
- **[背包入口路由决策 — Scout 新坑]** 已由本 plan 拍板内嵌 NurtureView，不新增路由（见范围决策）。Generator 不得擅自加 `/inventory` 路由（影响 C2-T5）。
- **[货币只走出口]** 兑换扣知识点必须 `profile.spend('knowledgePoints')`，禁直改余额；成功才入库，余额不足不发货（照图鉴解锁范式）（影响 C2-T4）。
- **[barColor 拼类教训 / 颜色铁律]** 稀有度徽章/实底色必须用完整字面映射（现成稀有度色映射直接索引读），**禁运行时拼 `bg-${rarity}`** 这类无静态字面的类（JIT 不生成、渲染缺色）；界面色走语义令牌（bg-surface/text-ink/text-ink-2/border-line/accent），禁 text-white 压浅底（稀有度识别色为固定例外）（影响 C2-T5）。
- **[未定义令牌双形态]** 审色两种 grep 都跑：scoped CSS 的 `var(--c-ink-soft)`（未定义变量）与模板的 `text-ink-soft`（未定义工具类）；真令牌是 `--c-line`/`--c-ink-2`/`--c-ink-3`（影响 C2-T5）。
- **[依赖只向下 + 跨域编排走门面]** `views → components → stores → engine`；塔掉落入库这类跨域编排（结算+入库+存档）走门面层，不在组件里直接调入库行为（影响 C2-T4/T5）。
- **[不动 C1 成果]** 养成两轴（等级/加点 statPoints + 好感/里程碑，好感不接战力）与家园挂机·塔的加经验/加好感入口不得改动；战力仍是纯加法 `base + 加点 + 装备`、engine 公式签名不动（影响全部任务）。
- **[不碰存档协议]** 本轮不升档，完全不动 schema/migrations/装配器三处（已就位）；若误改 schema 触发升档则越界——本轮不应触发（影响全部任务）。
- **[setTimeout 假安全]** 组件内所有 setTimeout/setInterval 必须登记数组并在 onUnmounted 清除（"有 onUnmounted"≠"都登记了"）（影响 C2-T5）。
- **[JSDoc 别写 Tailwind opacity]** `bg-*/20` 这类含 `*/` 的字面量写进块注释会提前闭合注释（影响 C2-T1 config 基线注释、C2-T5 组件注释）。
- **[测试纪律]** 用 `npm run test`（vitest）；**不要跑 `npm run lint`/`--fix`**（全仓重排），单文件审色用 `npx eslint <path>`；新增 equipment store / 掉落 / equipBonus / combat 测试不得使总数倒退（影响全部任务）。
- **[后端自检环境]** 回归基线 `backend/test_security.py` 用 `./.venv/Scripts/python.exe` 跑（系统 python 无 Flask 依赖）；C2 不碰后端，期望 exit 0 全 PASS（影响验收）。

## 上轮失败分析

不适用：本 sprint（S13-C2）为全新 Iteration 1。仓内 `eval.md` 与旧 `plan.md` 均属已 COMPLETE 的 **S13-C1** 轮（养成精简 + 战力改加点制 + 存档 v14，DECISION: COMPLETE），与本 C2 无依赖、无 C2 相关失败需调整。C1 的产物（空 equipment 存档域、`generateBattleStats` 第三参 equipBonus 口）正是本轮的地基。

## 验收命令（从 SPRINT.md 原样复制）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含新增 equipment store / 掉落 / equipBonus / combat 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（C2 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且 C2-T1..C2-T5 全部 `[x]`。
