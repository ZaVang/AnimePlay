# AnimePlay 进化审计报告 — S14-D 家园机制闭环 + 经济闭环（第 3 轮）

> product-loop `--tier1 on --mode all` · Reviewer=Evolution Strategist · 2026-07-01
> **本轮切片（排期建议）= SD-T3（重复装备回收 / 分解出口，P2-21）**。为 S14-E 装备强化留燃料，独立切片。
> 地基：`docs/orch/homestead-hub-audit-report.md`（根因 E；P2-21/20/19/13）+ `docs/plans/SPRINT.md` + 第 1 轮 `eval.md`/`negotiation.md`。
> 竞品参照（尊重单机向）：PCR 装备按 rank 消耗为素材、Arknights「Recycling」把冗余物资转化为通用货币/材料、Blue Archive 冗余装备走分解——**gear 冗余→货币/材料是收集向 gacha 的 table stakes**，本轮以内部 `collection.dismantleCard` 分解范式为一等一的落地锚。

---

## Executive Summary

**产品进化成熟度：6.5 / 10**（S14-A/B/C 补齐「差异化—决策」，S14-D 第 1 轮补齐家园经营核心 SD-T1+SD-T5；本轮 SD-T3 收口装备经济末端的最后一个「只进不出」漏斗）。

四镜头一致结论：AnimePlay 是**有骨架、有战斗深度、有养成长线的早期产品**，家园经营轴（SD-T1 设施可升级 + SD-T5 无底 sink）已在第 1 轮立起来。本轮切片 SD-T3 处理的是**经济系统里最后一个纯堆积垃圾场**——塔每层 50% 掉一件装备（`drops.ts:33`），`equipment.ts addItem` 只 `push` 从不去重、无任何 sell/dismantle/merge（`equipment.ts:68-72`），45 件目录齐装后**100% 掉落都是无用途重复实例**。这不是深度缺口，是**闭环缺口**：收集向游戏最忌讳「奖励拿到手却毫无意义」，塔越爬、重复垃圾越堆，掉落这条本该驱动「再爬一层」的正反馈边直接失效。

**最大进化机会（本轮）**：把重复装备**分解为 KP**，走已验证的 `profile.earn` + `collection.dismantleCard` 范式（按稀有度定回收价、已装备/最后一件保护、一键分解重复）。这一改动**低成本、高杠杆、零新范围**——它同时（a）让塔掉落重新有意义、（b）给第 1 轮的无底 KP sink（设施升级）再开一条**进账水龙头**形成「爬塔→分解→升设施→挂机更快→更能爬塔」的跨系统闭环、（c）为 S14-E 装备强化预留「分解得材料」的升级路径（本轮先只出 KP，材料字段属 S14-E，YAGNI 不预留）。

> **范围纪律警报（重要，须上报 Planner）**：核对 `FUTURE.md`/工作树发现 **SD-T2（homeEffect 剥离到设施）与 SD-T4（经验曲线/满级溢出）在第 2 轮并未落地**——`rules.ts:37` 仍是 `(level-1)²×1000`（满级 980 万旧曲线未压平），`EquipPickerModal.vue` 仍是静态 `formatHomeEffect` 无 before→after delta（SD-T2 的挂机 delta 预览未补）。`FUTURE.md` S14-D 中 SD-T2/T3/T4 三条均仍 `[ ]`。**「S14-D 整体完成 = SD-T1..SD-T5 全 [x]」的验收无法仅靠本轮 SD-T3 达成**。这正是 pitfalls 反复警告的「被指派任务被漏做」模式（S14-A SA-T6、S14-B 暴击UI）的复发风险。建议：本轮先真落地 SD-T3（被指派切片，不得空跑），同时把 SD-T2+SD-T4 明确标为**未完成、需补轮**，勿把 S14-D 整体标 ✅。

---

## Phase 1: 核心完整性（装备经济末端闭环）

**当前循环（装备侧）**：抽卡不产装备 → 装备唯一来源 = 塔通层 50% 掉落（`drops.ts`）+ KP 定向兑换（`userStore` exchangeEquipment，R400..UR24000）。获得走 `addItem` 单纯 push 入 `inventory`。配装三槽 weapon/armor/supporter，换下旧件留背包。**出口：无。** `equipment.ts` 全域无 dismantle/sell/merge（Grep 零命中）。

**断裂点（本轮 SD-T3 要补）**：
- **重复实例永久堆积**：`addItem` 不去重，同一 defId 可无限堆。齐装（每槽戴最优）后，后续所有掉落均为重复垃圾，背包只增不减、UI 越翻越长。
- **掉落正反馈边失效**：塔掉落本应是「再爬一层」的短期驱动力，但齐装后掉落 = 无意义。P2-21 的核心即此。
- **对照内部已有范式**：角色卡侧早已闭环——`collection.dismantleCard(cardId)` 按 `rarityConfig.dismantleValue`（UR200/HR100/SSR50/SR25/R10/N3）走 `profile.earn('knowledgePoints')`，且有「只有一张 → 拒绝分解」保护 + `dismantleAllDuplicates` 一键分解。**装备侧缺的正是这套现成范式的平移。**

**边界与空状态（验收须卡）**：
- **已装备保护**：`findEquippedBy(uid)` 已存在——分解前必须校验该 uid 未被任何角色任意槽占用（防误分解在用装备）。
- **"最后一件"语义**：装备不像角色卡有「本体卡」概念（角色 `count>1` 才可分解保本体）。装备分解的合理保护 = **仅重复实例可分解**（同 defId 保留至少 1 件，或直接「只分解未装备的重复件」），而非按 uid 无脑分解。这是本轮最需要拍死的语义边界（下方深度节详述）。
- **空状态**：无重复可分解时，一键分解应给「没有可分解的重复装备」提示（复用 `dismantleAllDuplicates` 的 info 日志范式），而非静默。

---

## Phase 2: 竞争差距（gear 回收是 table stakes）

| 产品 | 冗余装备/物资出口 | 对 AnimePlay SD-T3 的启示 |
|---|---|---|
| **PCR（公主连结）** | 装备按 rank 被角色「消耗」进阶，冗余低级装可采购/被高需求消化；不存在「拿到即纯垃圾」 | 装备应有下游消耗去处（本轮先做「分解回 KP」，S14-E 再做「装备强化燃料」两级消化） |
| **Arknights** | Recycling（回收）把冗余物资/凭证转化为通用货币或材料 | 「冗余 → 通用硬通货（KP）」是最省事、单机向友好的第一步，本轮采纳 |
| **Blue Archive** | 冗余装备/物品可分解回收，喂给强化系统 | 分解产物长期应能喂「强化」（S14-E），本轮 KP、S14-E 材料，分两阶段不返工 |
| **AnimePlay（现状）** | **无任何出口，纯堆积** | 这是明确的 table stakes 缺口，SD-T3 补上即达行业底线 |

**结论**：任何一款收集向 gacha 都不会让「掉落物拿到手毫无意义」。SD-T3 不是创新、是补底线。**单机向定位下无需做复杂回收商店/兑换券**——一条「分解回 KP」+「一键分解重复」即足，走 `profile.earn`。

**竞品用户反馈机会点**：这类游戏玩家对回收的最大抱怨是「一件一件点太累」和「误分解在用的」。→ 本轮直接内建 `dismantleAllDuplicates`-式一键分解 + 已装备/唯一件双重保护，一次性堵住这两个痛点。

## Phase 3: 功能深度（分解语义要一次做对）

现有 `collection.dismantleCard` 范式是「浅但对」的样板，SD-T3 应平移其**深度而非仅表面**：

- **分解回收价按稀有度分档**：不要一口价。复用 `EQUIPMENT_PRICES`（R400..UR24000 兑换价）为锚，回收价取兑换价的一个折扣系数（如 20~30%，即 R~100 / UR~6000），确保「回收价 < 兑换价」（否则刷分解套利）。此系数应是 `config/equipment.ts` 里的 config 常量 + engine/config 纯函数 `dismantleValueForRarity(rarity)`，可测。**这是本轮最该卡的数值卫生**：分解 KP 必须显著低于兑换/掉落获取成本，杜绝经济穿底。
- **"只分解重复未装备件"是正确的默认深度**：
  - power-user 想要「一键分解所有重复」→ 提供 `dismantleAllDuplicates` 式批量出口（每 defId 保留 1 件、跳过已装备）。
  - 谨慎件想要「逐件分解」→ 单件 `dismantleEquipment(uid)` 带 `findEquippedBy` 保护。
  - 两条都走同一 engine/config 纯函数算 KP，store 执行 `profile.earn` + 存档。
- **背包 UI 深度**：`InventoryPanel.vue` 已按稀有度排序，补「重复」角标 + 「分解」入口即可，无需重构。

**集成/协作**：SD-T3 产物本轮限定 KP（无底 sink 的进账端）。**为 S14-E 强化留燃料 = 设计意图（不是本轮实现）**——分解函数签名保持「输入装备实例 → 输出 { knowledgePoints }」，S14-E 时扩为 `{ knowledgePoints, materials }` 不破坏调用面。本轮**不新增材料字段/存档域**（YAGNI，v17 已用于 facility，本轮 SD-T3 不需要新存档字段——分解只删 inventory + earn KP）。

## Phase 4: 差异化与 Wow Factor

> 均标 backlog，不进本轮 SD-T3。本轮聚焦「补底线闭环」，差异化留后续 sprint。

- 💡 **「装备图鉴/毕业墙」**（backlog）：把分解与收集对立起来——首次获得某 defId 记入「装备图鉴」，之后重复件才可无痛分解。让分解不产生「我是不是毁了收集」的焦虑。这是单机收集向的差异化点（竞品多无收集顾虑）。
- 💡 **「熔铸/合成」升阶**（backlog，S14-E 邻接）：N 件同稀有度重复件 → 合成 1 件高一档，比纯 KP 分解多一条「攒垃圾换毕业」的长线，口碑传播点（「肝出来的毕业装」）。
- 💡 **分解返还「精粹」软货币**（backlog）：分解除 KP 外产极少量「装备精粹」，专用于 S14-E 强化——把装备经济与 KP 经济解耦，避免装备产出稀释 KP sink 深度。**本轮不做（YAGNI），但函数签名为其预留扩展位。**

**值得删掉/简化的东西**：塔掉落 50% 概率（`DROP_CHANCE=0.5`）在齐装后纯产垃圾——SD-T3 落地后掉落有了分解去处，可**保留** 50%；但若 SD-T3 未做，应考虑把齐装后的掉落**直接转 KP**（掉落即分解）作为退路。SD-T3 是更好的方案，因它保留了「攒重复件换强化」的 S14-E 空间。

## Technical Health（附带）

- **架构扩展性**：SD-T3 应严守分层——分解 KP 计算走 `config/equipment.ts` 纯函数（`dismantleValueForRarity` / `sumDismantleValue`），`stores/equipment.ts` 加 `dismantleItem(uid)` / `dismantleAllDuplicates()`（删 inventory 实例），KP 入账 + 存档由 **`userStore` 门面**编排（`profile.earn('knowledgePoints', v)` + `saveToServer()`），组件禁直改 `core.knowledgePoints`（对齐第 1 轮 `upgradeFacility` 门面范式）。engine 不涉及（无随机、无战斗规则），无需碰 `engine/**`。
- **存档**：SD-T3 **无需升 SAVE_VERSION**（v17 已由第 1 轮 facility 占用；分解只是删 inventory 元素，`EquipmentSave` 结构不变）。这是本轮相对第 1 轮的显著简化——不动 schema/migrations。
- **数据一致性风险（本轮必测）**：分解删除 inventory 实例时，若该 uid 仍被 `equipped` 引用会产生孤儿槽引用。虽 `sanitizeEquipped` 载入边界会兜底清孤儿，但**运行时分解必须先过 `findEquippedBy` 保护拒绝已装备件**，不能依赖载入兜底（否则「分解后当场战力凭空掉」= 隐性回归）。
- **测试卫生**：`equipment.test.ts` 已存在——加 `dismantleItem`（已装备拒绝 / 唯一件保护 / 重复件成功返 KP）+ `dismantleAllDuplicates`（保留 1 件、跳过已装备、空状态返 false）+ config `dismantleValueForRarity`（各档 + 回收价 < 兑换价断言）三组测试。
- **回归复审（第 1 轮 SD-T1/T5 已落地面）**：抽查确认第 1 轮 facility 域 v17 / `upgradeFacility` 门面 / computeIdleYield 口径同源均在工作树中；本轮 SD-T3 不触及 homestead/facility 面，无交叉回归风险。**唯一需并行复审的是 SD-T2/T4 缺口**（见 Executive Summary 警报）。

---

## Prioritized Recommendations

> 每条标 SD-T# 或 backlog。本轮被指派切片 = SD-T3，必须真落地。

### 🔴 Critical（本轮必做，缺失即 S14-D 无法收口）
- **SD-T3｜装备分解出口**：`config/equipment.ts` 加 `DISMANTLE_RATIO` 常量 + `dismantleValueForRarity(rarity)` / `sumDismantleValue(defs)` 纯函数（回收价 = 兑换价×20~30%，锁「回收价 < 兑换价」）；`stores/equipment.ts` 加 `dismantleItem(uid)`（`findEquippedBy` 拒绝已装备 + 同 defId 保留≥1 件保护 + 删 inventory）与 `dismantleAllDuplicates()`（保留 1/件、跳过已装备、空返 false）；`userStore` 加 `dismantleEquipment` 门面（`profile.earn` + 日志 + `saveToServer`）；`InventoryPanel.vue` 补「重复」角标 + 单件/一键分解入口 + 防呆确认。**无需升 SAVE_VERSION**。engine 不碰。测试三组。type-check/test/build/security 全绿 + `debug=True` 零命中。
- **⚠️ 上报 Planner｜SD-T2 + SD-T4 未落地**：第 2 轮排期任务实际缺失（exp 曲线仍 980 万未压、EquipPicker 无挂机 delta）。**不得因本轮做完 SD-T3 就把 S14-D 整体标 ✅**；需补一轮完成 SD-T2/SD-T4，或明确记入 FUTURE.md 为未完成。

### 🟡 Important（提升完整度，本轮可顺手）
- **SD-T3 数值卫生**（SD-T3 子项）：回收价必须显著低于「获取成本」——不只低于兑换价，也应低于「爬同层重出该稀有度的期望 KP」，防「爬塔刷分解」套利。测试断言锁死。
- **一键分解防呆**（SD-T3 子项）：批量分解前给「将分解 N 件、获得 M KP」二次确认，避免误触（复用 `useDialog` 范式）。

### 🟢 Nice-to-have（power-user / 打磨）
- 背包按「可分解重复件」筛选视图（backlog / SD-T3 可选）。
- 分解结果 toast 汇总（分解 N 件 / +M KP），复用 profile.addLog success 范式（SD-T3 子项，低成本）。

### 💡 Feature Idea（差异化，进 backlog）
- 装备图鉴/毕业墙：首次获得记图鉴、重复件才无痛分解，消解收集焦虑（backlog）。
- N 件同档合成升阶「熔铸」：攒垃圾换毕业装，肝度口碑点（backlog，S14-E 邻接）。
- 分解产「装备精粹」软货币解耦装备经济与 KP sink（backlog；本轮仅在分解函数签名预留扩展位，不实现）。

---

**一句话收尾**：本轮切片 SD-T3 是补经济系统最后一个「只进不出」漏斗——用内部 `collection.dismantleCard` 范式（按稀有度回收价 + 已装备/唯一件保护 + 一键分解）平移到装备，走 `profile.earn` 入账、无需升存档版本、engine 不碰；同时须向 Planner 上报 SD-T2/SD-T4 在第 2 轮实际未落地，S14-D 不可仅凭 SD-T3 收官。
