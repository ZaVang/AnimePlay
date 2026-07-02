# AnimePlay 进化审计报告 — S14-E 装备深度（product-loop `--tier1 on --mode all`）

> 本轮 = **S14-E 第 3/3 轮**（product-loop）。指派切片 = **SE-T2｜确定性套装 / 原型条件加成（P2-14 / P2-16，纯静态派生、无存档改动）**。
> 前情：第 1 轮 SE-T1（装备强化 v18）+ 第 2 轮 SE-T3（EquipmentDef 战斗 modifier）均已落地并经 Evaluator 亲自复跑全绿（815 tests，type-check/build/后端 PASS）。**SE-T2 是全 Sprint 最后一块未落地切片**——若本轮再降级为「回归确认」即整个 S14-E 未闭合（前车之鉴 S14-A SA-T6 / S14-B 暴击 UI 被误判「新范围」漏做，严禁重演）。
> 审源为主（`.claude/scripts/get_page_state.js` 不存在）。竞品对标 PCR（rank 装/专武）+ 原神圣遗物套装 + 明日方舟基建/潜能，尊重单机向定位（**确定性套装/条件加成优先，随机副词条不做**，全 Sprint 三审一致定调）。

## Executive Summary

**产品进化成熟度：8.5 / 10**（早期产品 → 成熟产品过渡期，本轮 +0.5 待 SE-T2 落地兑现）。

家园 hub 经 S14-A/B/C/D + S14-E 前两轮，装备系统已补齐两块深度维度：**SE-T1（强化 / 毕业曲线拉长）+ SE-T3（modifier / 够到暴击-增伤-治疗-护盾旋钮）**。装备现在有「可持续消耗 + 五维之外的战斗旋钮」，但仍缺**最后一块——「搭配空间」**：当前任意角色戴任意装、稀有度纯线性预算，`InventoryPanel` 按稀有度排序即最优解，装备不塑造角色定位（P2-14/P2-16 的核心未解）。SE-T2 补的正是这一块：**确定性套装或原型条件加成**，让「戴什么」从「无脑堆最高稀有度」变成「按角色定位/凑套装做取舍」——这是 build 深度的最后一环，也是把装备从「数值膨胀」升级为「配装决策」的关键。

**本轮切片最关键的一条设计决策（决定 SE-T2 成败）**：条件加成/套装加成**必须折进既有单一战力 seam** `resolveEquipBonus(charId)` → `resolveMemberBattleStats(base, nurture, equipBonus)`（`utils/battleStats.ts:37`，玩家侧只吃**一个** `equipBonus: StatBonus` 入参）。**严禁另拼第 N 套战力口径**（架构铁律 + S14-C/D 已成的单一 seam 不可破）。而条件加成需要角色的 role/archetype——`resolveEquipBonus` 当前不知道角色定位，这是本轮唯一的接线难点：**复用 `getSquadSkillKitForCharacter(character).role`（`squadSkillKits.ts:455` 的 `CompleteSquadSkillKit.role`，即 SC-T1 `resolveArchetype` 的对外产物）取定位，而非重新导出内部 `resolveArchetype`**（后者未 export，重复导出会开两条定位口径）。这条如果走歪，要么破坏战力单一 seam，要么再造一套 archetype 解析——两者都是本轮的头号退化风险。

---

## Phase 1: 核心完整性

### 当前装备核心循环（SE-T1+T3 后）
获取（塔掉落 50% / KP 兑换）→ 配装（3 槽任意角色任意）→ **强化（KP+同款燃料 Lv.0-5，SE-T1）** → **modifier 塑造战斗风格（暴击/治疗/护盾，SE-T3）** → 分解回收（SD-T3）。循环已闭环、有可持续消耗、有战斗旋钮。

### SE-T2 补的缺口（搭配维度）
- **闭环里唯一还「无决策」的动作 = 选哪件装备戴**：稀有度纯线性 → 同槽永远选最高稀有度，没有「A 件基础低但凑套装/匹配定位后更强」的权衡。SE-T2 就是给「戴什么」注入取舍。
- **两条可选路径的核心完整性对比**：
  - **确定性套装（setId + 齐 N 件额外加成）**：塑造「牺牲最优单件去凑套装」的横向 build 决策，玩法感强但需要玩家凑齐 2~3 件同套（背包深度要求高，早期玩家可能凑不齐 → 空窗期无感）。
  - **原型条件加成（装备带 archetype 倾向标签，戴在匹配 role 的角色上加成）**：塑造「把对的装备给对的角色」的纵向 build 决策，单件即生效、无凑套门槛、天然复用 SC-T1 `role`——**核心完整性更高（无空窗、即时可感）、接线成本更低**。
- **建议（SE-T2）**：**优先原型条件加成**（单件即生效、复用 `role`、无背包深度门槛），套装作为可选叠加。若同时做，注意二者都必须经同一 `resolveEquipBonus` seam 汇总，不得各开一路。

### 边界与空状态
- **不匹配/不齐套时必须「不给加成」且 UI 明示**（验收：不匹配不给）——不能静默 0，否则玩家不知道为何某件"看起来没用"。这是 SE-T2 的核心完整性红线（对齐 CLAUDE.md「不 ship 宣称未执行的效果」）。
- **敌方塔单位不吃条件加成**（与 SE-T3 敌方不给 modifier 一致，防塔层缩放联动）——`buildCharacterStats` 敌方走 `generateBattleStats(base, EMPTY, EMPTY)`（`SquadBattleView.vue:270`），天然隔离，SE-T2 只需保证条件加成在玩家侧 `resolveEquipBonus` 内解析。

## Phase 2: 竞争差距

| 产品 | 装备"搭配"深度机制 | 与 AnimePlay SE-T2 的关系 |
|---|---|---|
| **PCR（公主连结）** | rank 装是**确定属性、无随机词条**；深度靠专武（角色专属）+ 星级 | ★ 对标核心：SE-T2 走确定性套装/条件加成、拒随机 roll，与 PCR 定位完全一致（三审已定调） |
| **原神圣遗物** | 2 件套 / 4 件套触发确定性套装效果（但底层词条随机） | 借鉴其**套装分档触发**（齐 N 件给确定加成）的确定性部分，弃其随机词条部分 |
| **明日方舟** | 潜能（重复干员→永久小加成）+ 基建 buff 按职业分组 | 借鉴其**「按职业/定位分组加成」**思路 = SE-T2 原型条件加成的直接原型 |

**桌上赌注（table stakes）判断**：主流收集向养成，「同槽装备之间有非稀有度的搭配权衡」是标配（否则装备退化为纯数值条）。AnimePlay 在 SE-T2 之前正缺这一块——**SE-T2 是补齐 table stakes，不是超前创新**。竞品共识：**确定性套装/条件加成是单机向的正解，随机副词条是重氪刷取的取舍**（P2-16 异议已采信）。

## Phase 3: 功能深度

- **SE-T2 让装备第一次有「非稀有度的选择维度」**：强化（SE-T1）是纵向深度（同件越强）、modifier（SE-T3）是横向风格（暴击/治疗流派）、**套装/条件加成（SE-T2）是搭配深度（组合 > 单件）**——三者正交，共同把装备从「一维稀有度条」升级为「三维 build 空间」。
- **power-user 路径**：SE-T2 落地后，高玩可以「为 striker 角色专门凑攻击套 / 为 guardian 凑坦度套」，装备开始承接角色定位（补 P2-14「装备不塑造角色定位」）。
- **深度上限自律**：套装组数首版 2~3 组即可、条件加成幅度「小而有感」（对齐 SE-T3 modifier 的克制原则），**避免让套装成为「不凑就打不过」的硬门槛**（单机向不做军备竞赛）。条件加成建议 ≤ 该件基础预算的 15~20%（与突破 ≤20%、强化 +40% 同量级克制）。

## Phase 4: 差异化与 Wow Factor

> 均标 backlog（超 SE-T2 范围，不进本轮）。

- 💡 **叙事套装（backlog）**：套装按「同作品/同阵营」组队（如「EVA 三机体套」「Fate 从者套」），凑齐给主题加成 + 一句梗台词——把套装从数值机制升级为「收集同好角色的情感钩子」，是单机向收集游戏独有的口碑传播点（竞品的套装多是纯数值，叙事套装是差异化机会）。
- 💡 **条件加成可视化「适配度」（backlog）**：配装弹窗给每件装备对当前角色打一个「适配★」（匹配 role = 高适配），把 SE-T2 的隐性条件显性成一眼可读的推荐——降低新手「为何这件对她更强」的理解成本。
- 💡 **满强化 + 齐套双 buff 的「毕业特效」（backlog）**：三件满强化 + 齐套时给角色卡一个视觉徽章/光效，作为长线养成的成就展示（承接 S14-F）。
- **口碑传播点**：叙事套装（"凑齐 EVA 三人有隐藏台词"）是最可能被玩家自发分享的点——它把数值决策裹进了 IP 情感，这是 AnimePlay 相对通用养成框架的独特资产（拥有 Bangumi 全量作品/角色关系数据）。
- **值得简化的东西**：**若 SE-T2 同时做套装 + 条件加成两条，建议本轮只做一条（优先条件加成）**——两条都做会让 `resolveEquipBonus` 一次性膨胀、UI 要同时展示套装进度 + 适配度两套语言，增大退化面。宁可一条做透、另一条标 backlog。

## Technical Health

- **架构扩展性（本轮头号风险）**：SE-T2 的加成必须收口进 `resolveEquipBonus(charId): StatBonus` 这个**唯一**玩家侧战力 seam（下游 `resolveMemberBattleStats` 只吃一个 `equipBonus`）。当前 `resolveEquipBonus`（`stores/equipment.ts:241`）逐件 `enhancedBonus` 求和后 `sumStatBonus`——SE-T2 需在此**末尾追加**套装/条件加成项（同样进 `sumStatBonus` 的数组），**不新增第 4 参数、不另建函数**。条件加成取 role 建议在 store 层查 `getSquadSkillKitForCharacter(char).role`（char 从 gameDataStore 按 charId 取），engine 纯净不受影响。
- **定位口径统一（退化风险）**：**只用 `CompleteSquadSkillKit.role`（SC-T1 对外产物）取定位**，不重新导出内部 `resolveArchetype`（`squadSkillKits.ts:152` 未 export）——否则装备条件加成与技能 kit 会读两条 archetype 口径，未来 role 规则改动会漂移（P2-7 已证正则误判频发，多口径必埋坑）。
- **与 SE-T1/T3 正交性（回归风险）**：SE-T2 只碰五维加法（走 `resolveEquipBonus`），SE-T3 只碰 modifier（走 `resolveEquipModifiers`），两条独立 seam 不得混用；**条件加成/套装加成绝不套 `enhancedBonus`**（那是单件强化的 seam）除非明确要让套装也随强化涨（不建议，增大数值失衡面）。
- **前两轮质量已验**：SE-T1 强化纯函数 + v18 三处同改 + 往返/迁移/clamp 测试；SE-T3 clamp + 注入特征测试；均经 Evaluator 亲自复跑全绿。SE-T2 应比照——engine/config 纯函数测试（套装计数命中 / 条件命中与不命中）+ store 测试（匹配给、不匹配不给、经 `resolveMemberBattleStats` 真进战力）。
- **测试覆盖**：当前 815 tests。SE-T2 无存档改动（派生自 equipped defIds + role），**不碰 schema/migrations/装配器，SAVE_VERSION 维持 18**——测试面集中在 config 纯解析 + store 求和 + 一条战力口径特征测试即可。

## Prioritized Recommendations

- 🔴 **Critical（SE-T2，本轮必做，不得降级为回归确认）**：加**确定性套装或原型条件加成**（首版 2~3 组套装 **或** 装备带 archetype 倾向标签 + 匹配 role 加成，**优先后者**：单件即生效、复用 `role`、无凑套空窗）。**折进既有 `resolveEquipBonus` 单一 seam → `resolveMemberBattleStats`，严禁另拼战力口径**；条件加成经 `getSquadSkillKitForCharacter(char).role` 取定位（不重导 `resolveArchetype`）；不匹配/不齐套不给加成且 UI 明示（不静默 0）；随机副词条不做。engine/config 纯函数测试（套装计数 / 条件命中与不命中）+ store 真进战力测试；type-check/test/build 全绿；SAVE_VERSION 维持 18。
- 🔴 **Critical（回归护栏）**：确认 SE-T2 不破坏 SE-T1 强化五维 seam（`resolveEquipBonus` 逐件 `enhancedBonus` 求和不受污染）、SE-T3 modifier 独立 seam、SB-T3 暴击轴、战力单一 seam、S14-A..D。敌方塔单位不吃条件加成（玩家侧 `resolveEquipBonus` 内隔离）。
- 🟡 **Important（SE-T2 UI，本轮内）**：配装弹窗/背包显示套装进度（如「攻击套 2/3」）或条件加成命中态（如「✓ 匹配 striker +12 ATK」），**复用现有 delta/分区语言，不另开弹窗、不无脑追加行**（对齐 SE-T3d 的 formatModifier 范式，颜色走皮肤语义令牌）。不匹配态明示「未匹配定位」而非留空。
- 🟢 **Nice-to-have（本轮可做，不阻塞）**：SE-T2 若做条件加成，在 InventoryPanel/候选卡给「适配度」小标（匹配当前角色 role 时高亮），一致性加分、低成本；颜色走语义令牌。
- 🟢 **Nice-to-have（backlog 但低成本）**：范围纪律——若本轮时间只够一条，**只做条件加成、套装标 backlog**（一条做透优于两条半吊子）。
- 💡 **Feature Idea（backlog，不进本轮）**：叙事套装（同作品/阵营凑齐给主题加成 + 梗台词，口碑点）；条件加成「适配★」可视化推荐；满强化+齐套毕业特效（S14-F）；装备定向掉落/碎片保底；homeEffect 彻底剥离到设施。

---

**一句话收尾**：SE-T2 是全 S14-E 最后一块拼图——把装备从「一维稀有度条」补成「强化(纵)×modifier(横)×套装/条件(搭配)」的三维 build 空间。本轮成败只系于一条：**新加成必须折进 `resolveEquipBonus` 单一战力 seam、条件加成复用 `role` 不另造口径**。做歪就破坏 S14-C/D 已成的单一 seam 或再开第二套 archetype 解析；做对则装备系统彻底立起来，S14-E 闭合。
