# Research Audit — S14-C 第 2/3 轮（product-loop --tier1 on --mode research）

> 设计研究员视角。本轮指派切片 = **SC-T3｜养成长线：星级/突破（消化重复角色卡，P2-10，SAVE_VERSION→16）**。
> （第 1 轮 SC-T1+T2+T5 已 COMPLETE，见 eval.md；本报告覆写第 1 轮内容，聚焦第 2 轮切片。slice 参数仍透传损坏，据排期建议 + eval 进度锁定本轮 = SC-T3。）
> 四镜头（核心假设质疑 / 相邻领域研究 / 逻辑完备性 / 替代设计提案）聚焦 SC-T3 的设计选择，给本质替代 + tradeoff，重点防长期腐化。
> 不开新范围（超范围创意标 backlog）。证据源：homestead-hub-audit-report.md（P2-10）+ SPRINT.md L34-36 + 已 Read 的 rules.ts / config/nurture.ts / types/nurture.ts / schema.ts / migrations.ts / collection.ts / SquadBattleView.buildCharacterStats。

---

## Executive Summary

**SC-T3 建立在 5 个关键假设上**：(1) 长线养成缺口的解法是「再加一条轴」（星级/突破），而非重构现有两轴；(2) 「消化重复卡」= 突破的燃料应该是重复角色卡（碎片），而非独立道具/货币；(3) 突破产出应「提升上限 + 小幅永久成长」，即它同时是「解锁闸」和「战力增量」两件事；(4) 突破进度必须落存档字段（v16），是持久状态而非派生量；(5) 永久成长要「小」——沿用 C1「养成克制」的基因。

**最大研究发现在「逻辑完备性」维度**：SC-T3 引入的「星级永久加成」是养成系统里**第三种进入战力的通路**（现有两条 = statPoints + equipBonus，见 `SquadBattleView.buildCharacterStats` → `generateBattleStats(base, statPoints, equipBonus)` 三参数），而这条新通路的注入点、量纲、与既有轴的加法/乘法关系，SPRINT 尚未拍死——这正是审计 P3-6「量纲分歧」在养成侧的重演风险。**如果突破加成的注入形态没在本轮定成「与 statPoints 同口径的增量」，SC-T4 好感永久% 落地时会撞上同一堵墙，形成两套并行的『养成后战力』口径。**

**一句话最有价值的突破方向**：**不要把突破做成「星级 → 独立 permanentStatBonus 字段 → 第三条战力通路」，而是做成「突破 → 抬高 MAX_CHARACTER_LEVEL 上限（为主）+ 若给永久成长则折算成等量 statPoints 增量」——让突破的战力收益复用现有确定加点通路（`distributeStatPointsByBase`），存档只需存一个标量 `breakthrough`（突破次数），战力口径永不分裂，SC-T4 好感%也能顺着同一个折算函数接入。** 这是「单一养成后战力口径」的最省事落地（第 1 轮三审已对『单一真相源』达成共识，此处是它在养成侧的自然延伸）。

---

## Phase 1: 核心假设质疑

### 假设清单（★ = 可质疑 / 本轮需拍板）

| # | 假设 | 出处 | 可质疑性 |
|---|---|---|---|
| A | 长线缺口靠「加第三轴」补，而非深化等级/好感两轴 | SPRINT L34「加一条有决策的长线」 | 中 |
| B ★ | 突破燃料 = **重复角色卡**（碎片），从 `getCharacterCardCount` 扣 | SPRINT L35 | 高（经济健康） |
| C ★ | 突破 = 解锁闸（抬上限）**且** 永久小加成（战力）两件事 | SPRINT L35「解锁更高上限 / 小幅永久成长」 | 高（数值膨胀 + 口径分裂） |
| D ★ | 突破进度必须落**独立存档字段**（如 `starLevel` + 可能 `permanentStatBonus`） | SPRINT L35「存档记录每角色星级/突破进度」 | 高（存档面积 vs 派生量） |
| E ★ | 永久加成「要小且有封顶」，守 C1 不接战力基因 | 类比 SC-T4 L38 | 高（这次 SPRINT 明确要它接战力，与 C1 基因张力） |
| F | 保留至少 1 张卡不被消耗（拥有口径防呆） | SPRINT L35 | 低（正确的防呆，沿用 dismantle count>1 范式） |
| G | 星级/突破是**逐角色**的，非全局 | 隐含 | 低 |

### 关键假设深挖

**假设 C（突破既是解锁闸又是战力源）——最危险的双重职责。**
当前 `buildCharacterStats(character)` = `generateBattleStats(base, statPoints, equipBonus)`，战力恰好三源：角色 base、升级加点、装备。突破若引入第 4 个参数 `permanentStatBonus`，就把 `generateBattleStats` 从 3 参数拓到 4 参数，并在 `calculateBattlePower`、`getSquadPower`（SC-T5 刚统一的口径）、`buildCharacterStats`（View 层）多处同步——**这正是 SC-T5 negotiation 里研究报告提的 `resolveNurturedStats` 大统一口径被推迟的那个坑，SC-T3 把它提前引爆了。** 如果突破改为「抬 level 上限 + 折成 statPoints」，则第 4 参数根本不存在，战力通路始终是 3 源，口径零分裂。

**假设 B/E（重复卡当燃料 + 加成要小）——经济健康的双刃。**
重复角色卡目前唯一出口是 `dismantleCard`（守 count>1）。突破吃重复卡是给它开第二出口，健康。但两个风险：① 头部 UR 抽不到重复，突破长期锁死（星级成为「非酋惩罚」）；② 若加成不小，突破成了「谁重复卡多谁碾压」，与单机向「收集有意义」冲突。E 说「要小」，但 SPRINT L35 又说突破要「提升上限」——**上限抬升本身就是大战力空间**（等级 100→120 按 `getRequiredExpForLevel` 曲线 (119²-99²)×1000≈436万经验）。所以「小加成」的克制承诺，在「抬上限」面前有内在张力：真正的战力膨胀来自上限（需再投经验兑现，是延迟膨胀），不来自那点永久%。本轮须拍板：**突破是抬上限（大但延迟、被经验曲线节流）还是直给永久%（小但即时）**——两者都做会双重膨胀。

**假设 D（进度必须落独立字段）——存档面积质疑。**
可质疑：若突破只抬 level 上限，则「突破次数」是唯一需持久化的新状态（一个 `number`），`permanentStatBonus` 是派生的（不需存），上限也是派生的（`100 + breakthrough × STEP`）。**存档新增面积可压到 `CharacterNurtureData` 加一个 `breakthrough: number`**，而非新增 `permanentStatBonus: StatPoints` 子对象。派生量不落存档 = 未来调平突破数值时不写迁移（改常量即全账号重算），这是抗腐化关键。migrations 现有范式（`?? 缺省` 逐字段补、sweepUsedThisWeek 定长补 0）对补单个 `breakthrough:0` 极友好，对补 StatPoints 对象则要多写一段。

### 被隐喻限制的地方

当前隐喻是「**养成 = 往角色身上叠加数值轴**」（等级轴、好感轴、装备轴、现在再加星级轴）。「叠轴」隐喻导致每条新轴都想要自己的存档字段和自己的战力注入口，轴越多口径越碎。**替代隐喻：「养成 = 解锁角色的成长上限，成长本身走同一套确定加点」**——星级/突破/好感都只是「抬 cap 或 tilt 权重」的旋钮，最终折算成 statPoints 这一个战力载体。换隐喻后，SC-T3/T4/未来专武全部收敛到同一个 `resolveNurturedStatPoints(nurtureData)` 纯函数，不再有「第 N 条战力通路」。

---

## Phase 2: 相邻领域研究

### 领域扫描

| 领域 | 核心思想 | 可迁移点 |
|---|---|---|
| **手游星级/命座**（PCR rank / 原神命座 / FGO 灵基再临） | 突破 = 用同名重复单位/材料抬「等级上限」这道闸，等级本身仍需再喂经验兑现；命座给「小永久 buff/机制解锁」 | 把「突破抬上限」和「命座给小 buff」分清：SC-T3 应选**灵基再临式（抬上限为主）**，永久%留给 SC-T4 好感，避免两条轴都给永久% |
| **RPG prestige / 转生**（暗黑 paragon、放置游戏 prestige） | 到顶后「重置换永久乘区」，乘区是从单一计数派生的公式量，不逐项存 | 突破次数 → 派生上限/加成，**只存计数不存派生结果**（假设 D 的解法） |
| **Git tag / 版本号** | tag 是对某 commit 的轻量命名标记，不复制内容，语义 =「到此为止是一个里程碑」 | 突破进度可以是「里程碑标记」（第 N 次突破）而非「一坨永久属性快照」——存标记，属性现算 |
| **数据库：派生列 vs 存储列**（computed column） | 能从其他列算出的量不该独立存储，否则要维护一致性 | `permanentStatBonus` 是 `breakthrough` 的派生列，存 `breakthrough` 即可，加成现算（materialize on read） |
| **认知科学：能力天花板 vs 熟练度** | 上限（潜力）与当前值（熟练）是两个变量；训练抬熟练，突破抬潜力 | level=熟练、breakthrough=潜力上限——两者正交，突破不直接给战力、只解锁继续练的空间（最克制） |

### 可迁移模式（最值得借鉴的 3 个）

1. **灵基再临式「抬上限为主」**（FGO/PCR）：突破主收益是抬 `MAX_CHARACTER_LEVEL`（每突破 +N 级 + 解锁一个星星图标），战力增量由玩家「再投经验练上去」兑现，而非突破瞬间直给。**好处**：突破是「延迟且需继续投入」的膨胀，天然被经验曲线节流，不一突破就战力跳变；重复卡消费与「继续养」形成二段循环。**tradeoff**：即时爽感弱于直给永久%（可靠突破解锁的星图标/称号补爽感，零战力成本）。

2. **存计数不存派生**（DB computed column / prestige）：`CharacterNurtureData.breakthrough: number` 是唯一新存档字段；上限 = `MAX_CHARACTER_LEVEL_BASE + breakthrough × STEP`（config 常量），永久加成（若有）= `f(breakthrough)` 纯函数现算。**好处**：迁移只补一个 `breakthrough: 0` 缺省；未来调平改 config 常量即全账号即时重算，永不写第二次迁移；抗腐化最强。

3. **单一养成后战力口径**（把 statPoints 当唯一战力载体）：突破的永久成长（若本轮决定要给）**折算成等量 statPoints 增量**，复用 `distributeStatPointsByBase`（按 base 倾斜，定位一致），不新增 `generateBattleStats` 参数。**好处**：`buildCharacterStats` / `getSquadPower`（SC-T5 口径）零改动，SC-T4 好感%将来顺同一折算函数接入，彻底消灭「第 N 条战力通路」。

### 竞品设计哲学对比（非功能对比）

- **PCR rank + 星级双轴**：rank（装备阶）管战力大头、星级（重复卡/母猪石）管上限+专武解锁。哲学 =「重复卡专职抬上限/解锁，不直接堆战力」。**AnimePlay 应学这条哲学**：SC-T3 重复卡 → 抬上限 + 解锁（图标/称号/未来 HR 差异化被动），战力交给等级/装备既有轴，避免重复卡直接变战力导致「非酋差异化」。
- **原神命座**：重复角色 → 6 层命座，每层给 buff/机制，是「直给永久增量」哲学，但原神有付费保底、命座是可选深度。**AnimePlay 单机向不宜照搬**（无保底，重复靠运气，直给增量会放大运气差）。

---

## Phase 3: 逻辑完备性

### 概念体系评估（关系图，文字）

```
角色战力 = calculateBattlePower(generateBattleStats(base, statPoints, equipBonus))
            └ base：角色固有（不变）
            └ statPoints：等级确定加点（distributeStatPointsByBase，随 level 增长） ← 战力通路 1
            └ equipBonus：装备（resolveEquipBonus）                                 ← 战力通路 2
好感 affection ──（当前）──> 一次性 KP 里程碑（不接战力，C1 基因）
                 ──（SC-T4 将来）──> 永久小% ??? ← 通路 3 悬空
突破 breakthrough ──（SC-T3 本轮）──> ①抬 level 上限（间接经通路 1）？ ②直给永久 stat（通路 4）？ ← 模糊地带
```

**模糊地带（本轮必须消除）**：突破加成走「间接抬上限→通路 1」还是「直给→新通路 4」。SPRINT L35「提升上限 / 小幅永久成长」用了「/」——两者都要，但没说加成怎么进战力。**这是整个 SC-T3 设计的唯一真空，也是最高杠杆的拍板点。** 建议：主收益走①（抬上限，间接经通路 1），若给永久成长则折成 statPoints 增量并进通路 1（不开通路 4）。

### 极端场景检验

1. **0 张重复卡的角色（头部 UR 只有 1 张）**：突破入口应显示「需 N 张重复卡（当前 0/N）」灰态，绝不允许扣到 count≤1（沿用 dismantle count>1 防呆）。**成立前提**：突破消费必须 `getCharacterCardCount(id) - 1 >= cost`。若不做此防呆 → 把出战角色的唯一卡吃掉、角色从收藏消失，灾难。
2. **突破满级（breakthrough 达设计上限，如 5 星）后继续投重复卡**：必须硬封顶，UI 显「已达最高突破」，多余重复卡仍可走 dismantle。**成立前提**：`breakthrough` 有 `MAX_BREAKTHROUGH` clamp（schema 迁移也 clamp 脏档，仿 sweepUsedThisWeek 范式）。
3. **旧档（v15）迁移**：无 `breakthrough` 字段的角色补 0，上限回落 100，战力不变（无突破=无加成）。**成立前提**：migrations 对 `characterNurtureData` 每条补 `breakthrough: 0`——**这正是「存计数不存派生」方案更省事的证据：只补一个 0，不补一个 StatPoints 对象**。

### 操作缺口（Agent/玩家想做但做不到）

- **预览突破收益**：突破前看不到「突破后上限/加成变多少」→ 应给 delta 预览（复用 SC-T5 delta 展示范式，措辞人话化）。
- **批量突破**：一次点一星、重复卡够多要点很多次 → backlog（本轮单次即可，但设计上把 cost 留成 `cost(fromStar, toStar)` 纯函数便于将来批量）。
- **突破材料来源单一**：只吃重复角色卡，非酋头部 UR 永远突破不了 → backlog（未来可加「通用突破石」兜底，本轮不做，但别把 cost 写死成「只接受该角色卡」的封闭结构）。

### 演化瓶颈

若本轮把突破做成独立 `permanentStatBonus: StatPoints` 字段 + `generateBattleStats` 第 4 参数，则：
- SC-T4 好感永久%落地时，要么复用这个字段（语义混淆：好感和突破共用一个 bonus 桶，无法分别调平），要么再开第 5 参数（口径彻底碎裂）。
- SC-T5 刚统一的 `getSquadPower` 口径要跟着改 `buildCharacterStats`。
- 未来专武、羁绊又各要一个字段/参数。
**「存计数 + 折成 statPoints」方案则无此瓶颈**：所有养成轴都 `resolveNurturedStatPoints(nurtureData) → StatPoints`，一个函数收口，SC-T4 只是往里加一项。

---

## Phase 4: 替代设计提案

### 核心机制替代方案

**机制一：突破加成的战力注入形态**

- **方案 α（SPRINT 字面 / 独立永久属性桶）**：新增 `permanentStatBonus: StatPoints`，`generateBattleStats` 加第 4 参数。直观、即时膨胀可控。**代价**：开第 4 条战力通路，口径分裂，SC-T4/专武接踵而至，SC-T5 口径回改。
- **方案 β（推荐 / 抬上限为主 + 折成 statPoints）**：突破主收益 = 抬 `MAX_CHARACTER_LEVEL`（config 常量派生）；若给即时永久成长，folded 成 statPoints 增量经 `resolveNurturedStatPoints` 进通路 1。存档只加 `breakthrough: number`。**代价**：即时爽感弱（用星图标/称号补），需玩家再投经验兑现上限。**收益**：零新战力通路、迁移最小、SC-T4 顺接、抗腐化最强。
- **方案 γ（纯解锁，零战力）**：突破**完全不给战力**，只抬上限 + 解锁（未来 HR 差异化被动 / 剧情 / 皮肤 / 称号）。最克制、最守 C1 基因。**代价**：与 SPRINT L35「小幅永久成长」字面不符（需 negotiation 拍板是否降级为纯解锁）；玩家可能觉得「不给力」。

**机制二：突破燃料与经济**

- **方案 A（重复角色卡直扣，SPRINT 字面）**：`getCharacterCardCount(id)-1 >= cost` 才可突破，扣重复卡。给重复卡开出口，健康。**代价**：头部 UR 非酋锁死。
- **方案 B（重复卡 → 碎片计数，可跨角色兜底）**：重复卡先转「该角色碎片」计数（存档存碎片而非直接扣 collection），未来可加通用碎片兑换。**代价**：本轮存档面积更大（每角色碎片数），超范围。**本轮取 A**，但 cost 结构留成 `cost(star)` 纯函数，不写死封闭。

### 概念重组方案

**把「等级上限」从常量提升为派生量**：`MAX_CHARACTER_LEVEL` 现在是 rules.ts 里的 `const 100`。重组为 `maxLevelFor(breakthrough) = 100 + breakthrough × STEP` 纯函数，`getLevelFromExp` / 加点逻辑读它。这样突破天然嵌入现有等级系统，不是「平行的星级轴」而是「等级轴的上限旋钮」——概念更少、闭环更紧（呼应 Phase 1 换隐喻）。

### Tradeoff 矩阵

| 维度 | α 独立属性桶 | β 抬上限+折statPoints（推荐） | γ 纯解锁零战力 |
|---|---|---|---|
| 简洁性 | 中（新字段+新参数） | 高（一个 number 字段） | 高（一个 number 字段） |
| 战力口径 | 分裂（通路4） | 单一（通路1） | 单一（无战力） |
| 存档/迁移成本 | 高（补 StatPoints 对象+调平写迁移） | 低（补 0 + 改常量即重算） | 低 |
| SC-T4 顺接 | 差（撞口径） | 好（同折算函数） | 好 |
| 即时爽感 | 高 | 中（星图标补） | 低（靠解锁补） |
| 数值膨胀风险 | 中（直给需封顶） | 低（上限需再投经验兑现，天然节流） | 无 |
| 守 C1 克制基因 | 弱 | 中 | 强 |

### 灵感炸弹 💡

1. **突破 =「毕业照」而非「数值」**：每次突破给角色解锁更高星阶立绘框/称号/一句名台词（零战力、纯收集荣誉），战力全交给「抬上限后再练」。把收集向游戏的突破做成「情感里程碑」而非「战力军备竞赛」——最贴单机向定位，且与 SC-T4「好感解锁剧情」共用一套「情感解锁」框架。（本轮可只做 number+上限+星图标，台词/立绘 backlog）
2. **突破与好感互锁（SC-T3↔T4）**：突破抬「好感上限档位」、高好感反哺「突破折扣」——两条长线互相喂养而非并列。**本轮不做（backlog，negotiation 已标）**，但 SC-T3 存档字段命名时预留语义空间——建议叫 `breakthrough`（次数）而非 `starLevel`，以免将来和好感星混淆。

---

## Prioritized Research Directions

### 🔴 High-impact, Low-effort（本轮应采纳）
- **突破取方案 β（抬 `MAX_CHARACTER_LEVEL` 为主 + 若给永久成长则折成 statPoints 经 `resolveNurturedStatPoints` 进通路 1），存档只加 `breakthrough: number` 一个标量字段，`permanentStatBonus`/上限均为派生量不落存档。** 迁移只补 `breakthrough: 0`，调平改 config 常量。彻底避免第 4 条战力通路。
- **突破消费严守 `getCharacterCardCount(id) - 1 >= cost` 防呆**（保留至少 1 张，复用 dismantle count>1 范式），`breakthrough` 有 `MAX_BREAKTHROUGH` clamp（schema 迁移也 clamp 脏档，仿 sweepUsedThisWeek）。
- **cost 写成 `breakthroughCost(fromStar)` engine 纯函数**（零 RNG），为将来批量/通用碎片兜底留口，别写死封闭。

### 🟡 High-impact, High-effort（backlog）
- 抽出 `resolveNurturedStatPoints(nurtureData): StatPoints` 单一养成后战力口径，缝合 statPoints + 突破折算 +（SC-T4）好感折算。本轮突破若走 β 可先只加突破项，SC-T4 再补好感项——但接口本轮就定型最省事。
- 突破 ↔ 好感互锁（SC-T3↔T4 互相喂养）。

### 🟢 Thought-provoking（长期研究）
- 把「等级上限」从常量重组为 `maxLevelFor(breakthrough)` 派生量，让突破成为「等级轴的上限旋钮」而非平行星级轴（概念收敛）。
- 通用突破石兜底非酋头部 UR，解耦「突破燃料」与「特定角色重复卡」。

### 💡 Wild idea
- 突破做成「情感里程碑/毕业照」（立绘框/称号/名台词，零战力），与 SC-T4 好感解锁剧情共用「情感解锁」框架——把突破从军备竞赛改成收集荣誉，最贴单机向定位。
- 突破进度用 Git-tag 式「里程碑标记」建模：存标记不存属性快照，属性永远现算——概念上把养成状态分成「里程碑（存）+ 派生属性（算）」两层，根治养成存档膨胀。

---

**一句话收尾**：SC-T3 的唯一真空是「突破加成如何进战力」，本轮务必拍死为方案 β（抬上限为主 + 若给成长则折成 statPoints、只存 `breakthrough` 一个标量），否则 SC-T4 好感永久%会撞上第二套『养成后战力』口径——现在多想 30 分钟，省掉一次 v17 迁移和一次 getSquadPower 口径回改。
