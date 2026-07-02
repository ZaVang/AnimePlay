# S14-E Product Research Audit — 第 3 轮（切片 = SE-T2｜确定性套装 / 原型条件加成）

> 设计研究员报告。范围纪律：本轮切片 = **SE-T2**（确定性套装或原型条件加成，塑造 build 搭配空间，P2-14 / P2-16）。第 3 轮 = 收尾轮，同时复审 SE-T1（v18 强化，已落地）与 SE-T3（modifier，第 2 轮切片）有无回归/新体验坑。SE-T1/SE-T3 仅作上下游约束提及，超范围创意标 backlog。四镜头：核心假设质疑 / 相邻领域研究 / 逻辑完备性 / 替代设计提案。
>
> **本轮源码复验结论（关键，防漏做）**：
> - **SE-T1 已真实落地**：`enhancedBonus` / `enhanceItem` / `getEnhanceCost` / `enhanceKpCost`（targetLevel² 曲线）/ v18 schema+migration+装配器齐全，`resolveEquipBonus` 逐件套 `enhancedBonus`。✅
> - **SE-T3 已真实落地**（非漏做）：`EquipModifier` 字段 + `sumEquipModifiers`（critRate clamp ≤0.20）+ `resolveEquipModifiers(charId)` + `formatModifier` + 示例装备（wpn_ur_longinus critRate 0.07 等）均在 config/store 内。上一版报告担心的「SE-T3 排期漏做」**已排除**。✅
> - **SE-T2 确证零落地**：`grep setId|affinityArchetype|setBonus` 在 config/equipment.ts **零命中**。本轮切片是**真需求，不是回归确认**——必须真实现（前车之鉴 SA-T6 / S14-B 暴击 UI 被误判「新范围」漏做）。⚠️

## Executive Summary

**当前设计的关键假设**（SE-T2 语境）：
1. **「SE-T2 无存档改动、纯派生」** —— 套装派生自 `equipped defIds`；条件加成派生自 `defIds + 角色 archetype`，都不进存档。对**套装**成立且干净；对**条件加成**成立但有隐性接线成本（见 A2）。
2. **「加成经既有 `resolveEquipBonus` 单一 seam 进战力」** —— SPRINT 铁律。SE-T2 额外加成必须在 `resolveEquipBonus(charId)` 内、`sumStatBonus` 之后追加，绝不另拼第 N 套口径。验收明确要求「不破坏 resolveEquipBonus 单件求和」。
3. **「随机副词条不做」** —— 单机向定位，PCR rank 装口径（确定属性无 roll）。与 SE-T1 确定性强化、SE-T3 确定 modifier、整个 S14-E 定位自洽，坚持。
4. **★「套装/条件加成走五维加法基座」** —— SE-T2 数值安全命门。只碰五维（加法、边际递减、防御公式 `1000/(1000+def)` 天然压制），**绝不碰 modifier 乘/加区**（那是 SE-T3 的地盘，且有 clamp 护栏）。守住这条，SE-T2 数值腐化风险远低于 SE-T3。
5. **★「套装加成与 SE-T1 强化是加法叠加，不是乘法」** —— 强化后单件五维已 ×(1+0.08·lv)（满级 +40%，`enhancedBonus`）。套装加成若对「强化后的值」再按比例叠乘 → 出现「强化×套装」双乘膨胀。SE-T2 加成必须基于 **def 原值或固定值**加法追加，与强化正交。

**最大研究发现在哪个维度**：Phase 3（逻辑完备性）——**新发现的落地陷阱**：EquipPickerModal 的换装 delta 预览（`previewEquipBonus`，第 151-162 行）**手动重建三槽求和、不调 store 的 `resolveEquipBonus`**。若套装加成只写进 store 的 resolveEquipBonus，**delta 预览不会自动带上套装项** → 复现「预览≠实战」pitfall（S13-C2 复发点）。这是上一版报告漏掉、本轮必须钉死的护栏。

**一句话最有价值突破方向**：**本轮做「确定性套装」（走替代 C：3 组取向套装标签），把套装计数纯函数 `setBonusFor(equippedDefIds)` 抽到 config/equipment.ts，让 store 的 `resolveEquipBonus` 与 EquipPicker 的 `previewEquipBonus` 两处都调它**——一处纯函数、两个消费点同源，既满足「不破坏单件求和」，又杜绝「预览≠实战」；条件加成因需 `getArchetypeForCharacter(character, active, passive)`（跨 gameData/skill store）成本 ≈ 套装 3~4 倍且 build 深度不更高，降为 backlog。

---

## Phase 1: 核心假设质疑

### 假设清单（★ = 可质疑 / 需护栏）

- A1 SE-T2 无存档改动、纯派生 —— 套装派生自 equipped defIds（在库），成立；条件加成派生自 defIds + archetype，成立但有跨 store 成本（见 A2）。
- A2 ★★ **条件加成可低成本复用 archetype 解析** —— **危险假设，本轮源码复验确认**。SPRINT 说「复用 SC-T1 resolveRole」，实名是 `getArchetypeForCharacter(character, activeSkill?, passiveSkill?)`（squadSkillKits.ts:697），**需要角色卡 + 两个技能对象**；而 `resolveEquipBonus(charId)` 现只有 charId、只 import config/equipment + engine + profile。要在 store 内算 archetype 就得引 gameDataStore（取 character）+ skill 解析——扩大耦合面 + store 初始化循环风险 + 测试要 mock 整条链。**唯一纯 charId 的入口是 `signatureRoleOf(charId)`，但它只覆盖 10 个招牌 UR**（不适合全体条件加成）。→ 条件加成的「1 行复用」是假象。
- A3 ★ 套装/条件加成走五维加法 —— 应坚持。SE-T2 不碰 modifier（防与 SE-T3 暴击轴叠爆），只在五维加法区做文章，数值天然稳。
- A4 ★ 套装加成与 SE-T1 强化正交（加法，非乘法） —— 必须护栏。加成基于 def 原值或固定值，不对「强化后的值」再乘，防双乘膨胀。
- A5 随机副词条不做 —— 与单机向定位一致，坚持。
- A6 ★ **套装「齐 N 件」判定域 = 单角色三槽（非全队）** —— 概念模糊地带。`resolveEquipBonus` 本就是单 charId；三槽异槽（weapon/armor/supporter），一个 setId 最多在一个角色身上齐 3 件（需该 set 三槽都有成员）。**必须明确套装是「单角色内」凑齐**，全队凑齐要跨 charId 聚合、破坏 resolveEquipBonus 单角色语义。齐 2 件即触发能让空间更活。
- A7 ★ 套装加成幅度 vs 单件预算 —— 套装奖励过大盖过「换更高稀有度散件」、过小玩家无感。需落在「凑齐套装 ≈ 提升半个稀有度档」量级，形成真实取舍而非必选。
- A8 ★★ **「加成写进 store 就够了」** —— **本轮新增危险假设**。EquipPicker 的 delta 预览不走 store resolveEquipBonus（手动重建），套装项若只进 store 会漏进预览。**加成计数必须抽成 config 纯函数，两个消费点同源调用**（见 Phase 3）。

### 关键假设深挖

**深挖 A2（条件加成的跨 store 成本）—— 为何本轮不做条件加成。**
`resolveEquipBonus(charId)` 现在是纯闭环：`charId → equipped slots → getItem(uid) → getEquipmentDef → enhancedBonus → sumStatBonus`，只 import config + engine + profile。条件加成要问「这个 charId 是不是 striker」，就必须取 character 卡（gameDataStore）+ active/passive skill + 调 `getArchetypeForCharacter`。这把 equipment store 从「只依赖 profile」变成「依赖 gameData + skill kit」，耦合面扩大 + 循环风险 + 测试成本陡增（套装测试只需 addItem+equip；条件加成测试需 mock 角色卡+技能+archetype 表）。→ 真实接线成本 ≈ 套装 3~4 倍。若坚持做，正确做法是**不在 store 内解析 archetype**，而让 View/util 侧（`resolveMemberBattleStats` 调用点已能拿到 character）注入 archetype——但这要改 `resolveEquipBonus` 签名，波及全部 4 个消费点（HomesteadHubView:111 / NurtureView:97 / SquadBattleView:272 / EquipPickerModal:144），回归面大。**本轮做套装（零依赖），条件加成 backlog。**

**深挖 A4/A5（与 SE-T1 强化、SE-T3 modifier 的叠加边界）—— 数值腐化命门。**
一件装备现在有两条会长大的轴：SE-T1 强化（五维 ×1.4 满级）+ SE-T3 modifier（静态，不随强化涨，已 clamp）。SE-T2 套装是第三条。
- **正确**：`最终五维 = Σ enhancedBonus(def.bonus, lv) + setBonusFor(defIds)（基于 def 原值/固定值）`——全加法，边际递减，稳。
- **错误**：`套装加成 = Σ enhancedBonus(...) × setPct`——对「已被强化放大的值」再乘，满级三件齐套 = 1.4 × 1.2 = 1.68×，hp 走 2.5 折算更夸张。
- **SE-T2 绝不碰 modifier**：若套装奖励塞 critRate，就绕过 SE-T3 精心设计的「双乘区不同源 + `sumEquipModifiers` 硬 clamp（critRate ≤0.20）」护栏，直接叠进暴击轴爆表。套装奖励**只能是五维加法**。

### 被隐喻限制的地方

当前隐喻是「**装备 = 逐件独立的五维加成包，求和即最优**」。这正是 P2-14「按稀有度排序即最优」的根源——逐件独立、无组合项，贪心选最高稀有度必最优。SE-T2 的本质是**引入「组合项」打破逐件独立性**：套装让「3 件同系」的整体价值 > 各件之和。隐喻应从「加成求和」升级为「**基座（逐件五维，加法，可强化）+ 组合奖励（套装匹配，仍加法但非逐件独立，不随强化涨）**」。关键：组合奖励仍留在五维加法区，只打破「逐件可分」，不打破「加法安全」。

---

## Phase 2: 相邻领域研究

（本轮 offline 审源码为主，以下为设计模式知识迁移）

- **PCR（公主连结，直接对标）**：无套装系统，装备逐件 rank 提升 + 确定属性。启示：PCR 的 build 深度来自「角色专武 + 星级 + 技能」，装备本身不承载搭配。SE-T2 让装备摸「套装」是**超出 PCR 口径的自由发挥**——需克制幅度，别让套装盖过角色养成主线（SC 系已投入的星级/好感）。
- **暗黑破坏神 / 流放之路（套装的经典范式）**：set item「齐 2/4/6 件」阶梯解锁递增 buff，是 ARPG build 核心乐趣。可迁移的正是**阶梯触发**（齐 2 件小奖、齐 3 件大奖），天然形成「凑套」目标。反面教训：暗黑套装常配随机词条 → 无限刷，SPRINT 已拒绝，取「确定阶梯」即可。
- **《杀戮尖塔》/ 卡牌 build（取向互斥）**：deckbuilding 乐趣来自「选了暴击流就放弃续航流」。迁移到 SE-T2：套装应**取向互斥**（攻击套 vs 坦度套 vs 节奏套），而非「哪套都能凑、凑了都变强」——互斥才产生决策，否则是伪深度。
- **原神圣遗物「套装 + 角色适配」（条件加成的成熟范式）**：4 件套常写「对某状态敌人额外增伤」= 条件加成，价值在「让不同角色偏好不同套装」。但原神条件加成挂在**乘区**（增伤%），SE-T2 若做条件加成必须落在**五维加法**，避免乘区。
- **RPG「职业限定装备 / class affinity」（条件加成的轻量版）**：「战士戴重甲有额外防御、法师戴则无」。这比原神状态条件更轻——SE-T2 条件加成可对标：`装备带 affinityArchetype: 'guardian'`，戴在匹配角色给固定五维加成。语义清晰、幅度可控。但仍需 archetype 解析（A2），本轮不做。

**最值得借鉴的 3 个模式**：
1. **暗黑「阶梯触发套装」**：给 `EquipmentDef` 加 `setId`，同角色三槽内齐 2 件 → 小奖、齐 3 件 → 大奖（固定五维加法）。工程最干净（store 内闭环）。
2. **杀戮尖塔「取向互斥」**：套装分「攻击/坦度/节奏」三系，各偏不同维，让「凑攻击套」与「戴散装高稀有」形成真实取舍，正面对冲 P2-14。
3. **RPG「class affinity」**：条件加成的轻量对标，但需 archetype 解析 → backlog。

---

## Phase 3: 逻辑完备性

### 概念体系与模糊地带

链条（套装方案）：`EquipmentDef.setId?`（新，静态）→ **config 纯函数 `setBonusFor(equippedDefIds: string[]): Partial<StatBonus>`**（按 setId 计数、齐 2/3 阶梯固定五维加法）→ store `resolveEquipBonus` 收集三槽 defId 调 `setBonusFor`、与逐件 `sumStatBonus` 结果**加法合并** + EquipPicker `previewEquipBonus` 也调 `setBonusFor`（同源）。

**模糊地带**：
- **判定域**（A6）：套装「齐 N 件」在**单角色三槽内**判定。三槽异槽 → 一个 setId 最多在一个角色身上齐 3 件（需该 set 覆盖 weapon+armor+supporter 各 1）。若某 set 只出 2 件，则该角色最多齐 2 件——填数时保证「想齐 3 的套装三槽都有成员」。
- **强化 × 套装叠加口径**（A4）：套装加成与 `enhancedBonus` 求和结果**加法合并**，且套装加成本身**不随强化涨**（基于 def 原值/固定值）。否则强化 UI 会让玩家误以为套装加成也涨（同 SE-T3「modifier 不随强化」边界）。
- **★ 预览同源**（A8，本轮头号落地陷阱）：EquipPicker `previewEquipBonus`（EquipPickerModal.vue:151-162）**不调 store resolveEquipBonus，是手动 for 三槽 + `enhancedBonus` + `sumStatBonus`**。套装加成若只加进 store，换装 delta 预览会算不出「换上这件是否凑齐/破坏套装」→「预览≠实战」pitfall 复发。**破解：套装计数逻辑抽成 config 纯函数 `setBonusFor`，store 与 previewEquipBonus 两处都调它。**

### 极端场景检验

1. **三槽同 setId 满级强化 + 齐套**：各一件同系 UR、各满级（+40%）、齐 3 件触发大奖。套装走加法固定值 → 最终 = Σ(def×1.4) + 固定套装奖，可控；走乘法 → ×1.4×套装 双乘，需杜绝。**验收必须断言套装加成是加法、不随强化放大。**
2. **同 setId 但同槽两件（不可能戴）**：一个槽只戴一件，故同 setId 齐套必是「不同槽各一件」，setId 计数天然不超 3。config 若误把两件 weapon 设同 setId，玩家只能戴其一 → 计数最多贡献 1，无崩溃。填数需注意「一个 set 每槽最多一件才有意义」。
3. **0 件 / 散装无套装**：`resolveEquipBonus` 应与现状**逐字节一致**（套装计数全 < 阈值 → 额外加成全 0）。这是「不破坏单件求和」验收的直接体现——**空套装时 resolveEquipBonus 输出必须与 SE-T2 前完全相同**（现有 equipment.test.ts:88-116 的既有断言必须不改而全绿）。
4. **换装破坏/凑齐套装的 delta**：戴上第 3 件凑齐 → 预览应显示套装奖那一跳的 Δ；卸下打破 → 预览显示负 Δ。这要求 previewEquipBonus 同源（A8）。

### 操作缺口

- 玩家无法**看到套装进度**（凑了 2/3 件却不知齐 3 触发什么）。SE-T2 最小实现至少在 EquipPicker/背包**文案显示 setId 归属 + 当前齐几件 + 齐套奖励**，否则又是「有行为无描述」的隐性加成（CLAUDE.md「描述≠行为」铁律反面，同样违背可读性）。需 `formatSetBonus` helper（类似 `formatBonus`/`formatModifier`）。
- 无法直观区分「凑套 vs 堆稀有度」收益对比——展示 helper 让玩家决策。

### 演化瓶颈

- 套装数量增多时，「setId → 套装奖励」映射应集中 config 一处（类似 `EQUIPMENT_CATALOG` / `MODIFIER_CAPS`），别散落。
- 套装 + 条件加成若都做，两者都往 `resolveEquipBonus` 追加加法项，需保证顺序无关（纯加法天然满足）+ 各自可独立测试。
- 条件加成若进 store，会成为「装备摸 archetype」的第一个耦合点，后续易沿用脏链路——**本轮不做条件加成即避免开这个耦合口**。

---

## Phase 4: 替代设计提案

### 核心机制替代（套装 vs 条件加成的本质抉择）

**替代 A（推荐基座，本轮落地）：确定性套装（setId + 单角色三槽内阶梯触发，纯 store/config 闭环）。**
给 `EquipmentDef` 加 `setId?: string`；config 纯函数 `setBonusFor(equippedDefIds: string[]): Partial<StatBonus>`（按 setId 计数、齐 2/3 给阶梯固定五维加法）；store `resolveEquipBonus` + EquipPicker `previewEquipBonus` 两处都调 `setBonusFor`、与逐件求和加法合并。
- tradeoff：**工程最干净**（equipment store 零新依赖、测试只需 addItem+equip）、与 v18 强化正交、与 SE-T3 modifier 无交集；天然对冲 P2-14。代价：套装设计需保证「每套三槽都有成员」才能齐 3，填数略费心。**回归风险最低、性价比最高。**

**替代 B：原型条件加成（装备 archetype 亲和 + 匹配给固定五维加法）。**
给 `EquipmentDef` 加 `affinityArchetype?: SquadArchetype`；戴在匹配角色给固定五维加成。
- tradeoff：更贴合「装备塑造角色定位」叙事（S14-C 延伸）；但**必须解析 archetype**，要么污染 store（引入 gameData 依赖，A2），要么改 resolveEquipBonus 签名（波及 4 消费点）。测试成本高。**build 深度不比套装高、成本高得多，本轮不建议，backlog。**

**替代 C（概念重组，💡 推荐作为 A 的具体形态）：套装即「取向标签」，最少套装数撬动最大互斥。**
只做 **3 组取向套装**：攻击套（atk/sp 偏向）、坦度套（hp/def 偏向）、节奏套（spd/sp 偏向），每组跨 R..UR 各槽都有成员（凭 setId 归属，不限稀有度）。「凑齐一套攻击装」可能需混稀有度，`齐套奖 ≈ 半档稀有度` → 玩家在「凑套取向」与「堆最高稀有」间真实取舍。
- tradeoff：数值集中可控（3 套改一处调全体）、天然取向互斥（对冲 P2-14 最强）、填数负担小（给现有目录打 setId 标签，不新增装备）。**对单机向「少而精」定位最合适**，顺带立起「装备取向」概念，为未来 SE-T3 modifier 绑 slot 取向铺路。

### 「随机词条 / 条件加成为何本轮从简」的设计确认

- **随机词条**：坚持不做。单机向无刷取粘性；随机 roll = 变相双乘区膨胀（原神/暗黑教训）；与 SE-T1 确定性强化心智割裂（强化是确定曲线，词条是随机赌博）。
- **条件加成本轮从简**：非否定其价值，而是**成本/收益不划算**——需 archetype 解析（跨 store 或改签名），build 深度却不比套装高。backlog：待未来若确定「装备按 archetype 给加成」时一次性把 archetype 解析接线做对。

### Tradeoff 矩阵

| 方案 | 简洁性 | 数值安全 | 回归风险 | build 深度 | 跨 store 耦合 |
|---|---|---|---|---|---|
| A 套装（setId 阶梯） | 高 | **高**（五维加法） | **最低** | 中 | 无 |
| C 套装=取向标签（3 组互斥） | 高 | **高** | 最低 | **高**（互斥取舍） | 无 |
| B 条件加成（archetype 亲和） | 中 | 高 | 中高（改签名/加依赖） | 中 | **有** |
| 随机词条（拒绝） | 低 | 低 | 高 | 假深度 | — |

### 灵感炸弹

- 💡 **套装奖励偏「弱维补强」而非「强维叠强」**：攻击套若给 atk（强维叠强）会加剧堆叠；若攻击套齐反而补一点 def/hp（让脆皮输出续航一点），套装成为「补短板」而非「叠长板」，缓解数值膨胀 + 增加取向层次。呼应 S14-C「放大定位 vs 补短板」张力。注意：`enhancedBonus` 只放大已有非零维（弱维仍弱），套装若给缺省维会与该哲学有小分歧，但套装是独立组合项、可接受。
- 💡 **套装与 Bangumi 番剧维度绑定的叙事套装**（长期）：「同一部番的三件装备」齐套给主题加成，把「收集同番装备」变成叙事驱动的凑套目标，契合 AnimePlay 番剧数据底色，比抽象「攻击套」更有产品特色。可复用装备名梗的来源番。本轮不做，backlog。

---

## 复审：SE-T1 / SE-T3（均已落地）回归与新体验坑

- **SE-T1 强化**（已落地全绿）：`enhancedBonus` 只放大**已有非零维**（缺省维不凭空生成），保持「弱维仍弱」建构语义——套装填数需注意别破坏这一点。`enhanceKpCost` 走 `base×targetLevel²` 曲线（UR base 12000 → Lv5=25× = 300000 KP）且远高于分解回收值（UR 3000），防「拆件强化」套利——健康。**新体验张力**：SE-T2 上线后玩家会为「凑套」保留原本会分解/当燃料的重复件，一件重复 UR 变成「拆了回收 KP / 当强化燃料 / 留着凑套」三选一，与 SE-T1「重复件当强化燃料」争抢同一批游离件——本轮可只做套装文案，冲突提示（三条出路）记 backlog。
- **SE-T3 modifier**（已落地全绿，**上一版担心的漏做已排除**）：`resolveEquipModifiers` 三槽求和 + `sumEquipModifiers` 硬 clamp（critRate ≤0.20），**不套 enhancedBonus**（恒定），与五维 seam 正交。**SE-T2 与 SE-T3 完全正交**（SE-T2 只碰五维加法、SE-T3 碰 modifier 加区），可独立推进。SE-T2 套装奖**绝不塞 modifier**（否则绕过 clamp 叠爆暴击轴，A3）。

---

## Prioritized Research Directions

### 🔴 High-impact, Low-effort（本轮 SE-T2 应直接采纳）
1. **走替代 C：套装 = 3 组取向标签（攻击/坦度/节奏），给现有目录打 setId，不新增装备** —— 最低填数负担、天然互斥取舍、正面对冲 P2-14。
2. **套装计数抽成 config 纯函数 `setBonusFor(equippedDefIds): Partial<StatBonus>`，store `resolveEquipBonus` 与 EquipPicker `previewEquipBonus` 两处同源调用** —— 一处纯函数、双消费点，既满足单一 seam 又杜绝「预览≠实战」（A8，本轮头号护栏）。
3. **套装计数在「单角色三槽内」判定，齐 2/3 件阶梯触发固定五维加法** —— resolveEquipBonus 单 charId 闭环，零跨 store 依赖（A6）。
4. **套装加成基于 def 原值/固定值、与强化正交（加法合并、不随强化涨）** —— 防「强化×套装」双乘膨胀（A4）。
5. **套装奖励只碰五维、绝不碰 modifier** —— 守住 SE-T3 暴击轴 clamp 护栏（A3/A5）。
6. **幅度定「齐套 ≈ 半档稀有度」** —— 形成「凑套 vs 堆稀有」真实取舍，非必选也非无感（A7）。
7. **EquipPicker/背包显示 setId 归属 + 当前齐几件 + 齐套奖励**（`formatSetBonus` helper，颜色走语义令牌） —— 杜绝「有行为无描述」的隐性加成（Phase 3 操作缺口）。
8. **特征测试**：齐套/齐 2 件给确定额外加成且真经 `resolveMemberBattleStats` 进战力；**不齐套时 resolveEquipBonus 输出与 SE-T2 前逐字节一致**（守既有 equipment.test.ts:88-116 断言不改而全绿）；套装加成不随强化放大、不含任何 modifier；`setBonusFor` 纯函数计数/阈值/取向互斥独立测试。

### 🟡 High-impact, High-effort（backlog）
- 原型条件加成（替代 B）：待未来确定「装备按 archetype 给加成」时一次性把 archetype 解析接线做对（避免本轮单独开跨 store 耦合口）。
- 💡 灵感炸弹 1「套装补短板」：套装奖偏弱维补强而非强维叠强，需数值调优验证。

### 🟢 Thought-provoking（长期）
- 重复 UR 的「拆 / 当燃料 / 凑套」三选一张力（SE-T1×SE-T2 交互）——UI 上如何让玩家看清三条出路而不误操作。
- 套装是否随 SE-T1 强化成长（当前边界：不涨，与 SE-T3「modifier 不随强化」一致）。

### 💡 Wild idea
- 💡 灵感炸弹 2「叙事套装」：按 Bangumi 番剧维度绑套装（同番三件齐套给主题加成），把凑套变成叙事驱动的收集目标，契合 AnimePlay 番剧数据底色，比抽象「攻击套」更有产品特色。可能重塑整个套装填数逻辑与收集动机。

---

## 给 Refine 的收敛结论（本轮 SE-T2）

- **做多深才够**：给 `EquipmentDef` 加 `setId?`（走替代 C：3 组取向套装，打标签不新增装备）+ **config 纯函数 `setBonusFor(equippedDefIds)`**（单角色三槽内按 setId 计数、齐 2/3 阶梯固定五维加法）+ store `resolveEquipBonus` 与 EquipPicker `previewEquipBonus` **两处同源加法合并** + 文案 `formatSetBonus`（setId 归属/齐几件/奖励，语义色）+ 特征测试。**不改存档、不碰 modifier、不引入跨 store 依赖。**
- **怎样防腐化/失衡**：① 套装加成走五维加法、绝不碰 modifier（守 SE-T3 暴击轴 clamp）；② 基于 def 原值/固定值、与强化正交（防双乘）；③ 判定域限单角色三槽（不跨 charId 破坏 resolveEquipBonus 单角色语义）；④ 幅度「齐套 ≈ 半档稀有度」（真取舍非必选）；⑤ 取向互斥（攻击/坦度/节奏偏不同维）对冲 P2-14。
- **为何优先套装、不做条件加成**：条件加成需解析 `getArchetypeForCharacter(character, active, passive)`（跨 gameData/skill store 或改 resolveEquipBonus 签名波及 4 消费点），成本 ≈ 套装 3~4 倍，build 深度却不更高；套装在 store/config 内闭环、零依赖、性价比碾压。条件加成 backlog。
- **验收卡什么**：齐套/齐 2 件给确定额外加成且真进战力（经 resolveMemberBattleStats）；**不齐套时 resolveEquipBonus 与 SE-T2 前逐字节一致**（不破坏单件求和，既有测试不改而全绿）；**EquipPicker 换装 delta 预览含套装项（同源 setBonusFor，防预览≠实战）**；套装加成不随强化放大、不含任何 modifier；文案正确显示套装进度；type-check/test/build 全绿。**收尾轮确认 SE-T1..T3 全 `[x]`**（本轮源码复验：SE-T1/SE-T3 均已真落地，无漏做；SE-T2 为本轮唯一待实现切片）。
