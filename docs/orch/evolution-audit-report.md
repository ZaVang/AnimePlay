# 进化审计报告 — S14-C 角色差异化与养成长线（第 2 轮 / product-loop --tier1 on --mode all）

> 视角：Product Evolution Reviewer（进化策略师）。本轮 = S14-C 第 2/3 轮。
> 本轮指派切片（按 SPRINT.md 排期建议第 2 轮）：**SC-T3（养成长线：星级/突破，消化重复角色卡，SAVE_VERSION→16）**——本 Sprint 唯一的存档重任务，单独一轮做透「schema+migrations+装配器三改 + 往返测试」。
> 定位守则：单机向二次元收集网页游戏，对标 PCR / 蔚蓝档案仅为照见缺口，**补差异化与循环是底线，追付费深度与随机刷取则不做**。
> 方法：读 SC-T3 全部相关源码（types/nurture、config/nurture、engine/nurture/rules、stores/collection、combat.generateBattleStats、persistence schema/migrations、SquadBattleView buildCharacterStats）+ 竞品研究（PCR Ascension / 蔚蓝档案 Potential）+ 复审第 1 轮 SC-T1/T2/T5 落地改动。收敛到 SC-T3 + 回归复审。

---

## Executive Summary

**进化成熟度评分：6.3 / 10（早期产品，脊柱已立，长线待接）。**

第 1 轮（SC-T1/T2/T5）已把「定位单一真相源 + HR 有名 + 塔软门槛」三条脊柱与门槛立正（Evaluator 亲跑 5 命令全绿、687 测试通过、零存档改动、SAVE_VERSION 仍=15，见 `eval.md`）。**养成循环现在有了「对爬塔产生因果」的门槛（SC-T5），但循环本身在「达到上限之后」仍然断裂**：Lv.100 到顶后没有更高目标，重复抽到的同一角色卡（`collection.getCharacterCardCount`）除计数外零用途，好感领完即废。这正是 SC-T3 要补的收集向命脉——**「重复不浪费」**。

本轮 SC-T3 是本 Sprint 唯一触存档的重任务，四镜头核心判断：

- **核心完整性**：养成到顶=没事做的断裂，SC-T3 是主修复面。地基已就绪——`generateBattleStats` 是纯加法五维汇聚点（base+statPoints+equipBonus），突破永久小加成天然可作为第四个加数注入，engine 无需重构；`collection.dismantleCard` 已有「count>1 才可消费、保留 ≥1 张」的成熟防呆范式可直接复用。
- **竞争差距**：PCR「重复→记忆碎片→星级突破（%属性 + 5★/6★升技能，最高星门槛=角色需先满级/戴专武）」、蔚蓝档案「重复→elephs→星级 + 独立 Potential 系统（Lv.0-25 微幅 HP/ATK/治疗，门槛=5★+Lv90）」是同类标配。**两家共同点：突破门槛后置于等级上限、永久加成克制有封顶**——为 SC-T3 的数值克制与门槛设计提供强背书。
- **功能深度**：SC-T3 是把养成从「两薄轴（等级+好感）」加到「三轴」的第一条**有决策的长线**——决策点在「有限的重复卡该突破谁」。做浅了（只加数值）是纯膨胀；做对了（突破抬升等级上限 + 解锁短期目标）才是长线。
- **差异化**：SC-T3 的「零操作摩擦地消化重复卡」直接命中收集游戏最大挫败源（歪了/重复无用），是留存与口碑双赢点。项目独有的 Bangumi 数据可让突破里程碑解锁「角色档案/名台词」而非纯数值（backlog，喂后续）。

**本轮切片最关键一条建议**：**SC-T3 的突破必须「消化重复卡（碎片）→ 抬升等级上限 + 给克制的永久小加成」三件一体，且加成必须真进战力（经 `generateBattleStats` 纯加法注入，与 statPoints/equipBonus 同源同口径）**——只加「更高等级上限」而不给即时永久加成，玩家在触到旧上限前无动机突破（回报太远）；只给永久加成而不抬升等级上限，突破就退化成「一次性买断的属性包」失去长线感。两家竞品都是「星级同时管住上限 + 给%属性」，本产品应对齐这条「上限与加成绑定」的复合结构，才让突破成为真正的长线闸门而非又一个一次性目录。

---

## Phase 1: 核心完整性

### 当前核心循环分析（SC-T3 视角）
养成循环现状（第 1 轮后）：抽卡 → 收集 → 升级（确定加点，SA-T3）→ 好感里程碑（一次性 KP）→ 编队 → 爬塔（**现在有 SC-T5 软战力门槛，养成第一次对爬塔产生因果**）。**闭环仍在「达到上限」处断裂**：
- 等级到 Lv.100（`rules.ts:10 MAX_CHARACTER_LEVEL`）后无更高目标；
- 重复抽到的同一角色卡（`collection.ts:21 getCharacterCardCount`）除计数外无任何用途（P2-10）——这是 SC-T3 要接的出口；
- 好感到 4000 后无用（P2-11，SC-T4 第 3 轮补）。

**SC-T3 是把这个断裂补上的主修复面**：它给「达到上限」之后一条继续变强的路，同时把「重复角色卡」这块死资产转成突破燃料。做对之后，收集游戏的核心动机链（抽到 → 抽重了也不浪费 → 突破变强）才第一次闭合。

### 地基就绪度盘点（SC-T3 落点已勘明，降低实现风险）
- **永久加成注入点**：`combat.ts:144 generateBattleStats(base, statPoints, equipBonus)` 是纯加法五维汇聚点（`hp = base + statPoints + equipBonus`）。突破永久小加成是天然的**第四个加数**——engine 只需把签名扩成收一个额外 `StatBonus`（或让调用方在 store 侧把突破 bonus 并进 statPoints/equipBonus 之一）。`SquadBattleView.vue:265 buildCharacterStats` 是唯一玩家侧调用点，改一处即全链路（战斗 + `calculateBattlePower` 战力 + SC-T5 门槛）同步生效。**口径自洽**：突破加成走同一 `generateBattleStats`→`calculateBattlePower`，SC-T5 的战力门槛会自动把突破算进我方战力，形成「突破→战力涨→过更高层」的正反馈，无需额外接线。
- **重复卡消费范式**：`collection.ts:43 dismantleCard` 已有成熟的「`count <= 1` 拒绝、`count--` 消费」逻辑；`dismantleAllDuplicates:78 count > 1` 判定。**SC-T3 直接复用这条「保留 ≥1 张」防呆**——突破消耗 `getCharacterCardCount(id) - 1` 的可用碎片，绝不吃掉最后一张出战卡。这是 SPRINT 明示的防呆口径，代码已有先例，零新范式。
- **存档三改落点已勘明**：`schema.ts:16 CharacterNurtureData`（加突破字段）+ `schema.ts:197 characterNurtureData: [number, CharacterNurtureData][]`（序列化形态自动带上）+ `migrations.ts:255 migrateNurtureData`（v15→v16 补突破缺省）+ `rules.ts:166 createDefaultNurtureData`（新档默认）。SAVE_VERSION 现=15（`schema.ts:37`），本轮升 16（本 Sprint 唯一一次 bump，SC-T4 若触存档共用此次）。

### 缺失的关键环节 / 边界情况覆盖（SC-T3 必须处理）
- **等级上限与突破的耦合**：`MAX_CHARACTER_LEVEL=100` 是硬常量。SC-T3 若「突破抬升上限」，`getLevelFromExp`（`rules.ts:31`，`while getRequiredExpForLevel(level+1) <= totalExp`）不设上限地由经验反推等级——**必须让上限判定读取「基础上限 + 突破增量」而非硬 100**，否则突破抬了上限但等级仍被别处钳到 100。这是 SC-T3 最易漏的接线点，验收必须卡「突破后可练过 Lv.100」。
- **突破门槛（前置条件）**：竞品普遍把突破门槛后置于「当前上限满级」（PCR 6★需先满级戴专武，蔚蓝 Potential 需 5★+Lv90）。SC-T3 应对齐：**每一档突破要求角色达到当前等级上限**（防止 Lv.1 生角色直接突破空转），把突破钉在「练满了才值得投碎片」的正确节奏上。
- **碎片不足 / 已满突破的空态**：突破入口在碎片不足时应显示「还差 N 张（当前可用 X / 需 Y）」而非灰按钮无解释（对齐 SC-T5 已确立的「显示差多少形成短期目标」范式）；突破到顶（最高档）后入口显示「已突破至最高」不再可点。
- **往返保真边界**：旧档（v15，无突破字段）迁移必须补默认「0 星 / 0 突破」且不炸；突破进度字段类型损坏时按 0 兜底（仿 `migrateNurtureData` 已有的逐字段 `typeof` 兜底范式）。

---

## Phase 2: 竞争差距

### 同类产品「重复角色出口 + 突破长线」对比

| 维度 | PCR（公主连结） | 蔚蓝档案 | AnimePlay 现状 → SC-T3 目标 |
|---|---|---|---|
| 重复角色出口 | 重复抽 → 记忆碎片 → 星级突破 | 重复 → elephs（碎片）→ 星级 | **无出口**（重复卡纯计数，P2-10）→ SC-T3：重复卡当碎片，保留 ≥1 张 |
| 突破给什么 | %属性（HP/ATK/DEF 百分比缩放）+ 5★升 EX 技 / 6★升 UB | 星级给基础属性 + 独立 Potential 给微幅 HP/ATK/治疗 | 无 → SC-T3：克制的永久小加成（真进战力，有封顶）+ 抬等级上限 |
| 突破门槛 | 最高星需先满级 + 戴专武 | Potential 需 5★ + Lv.90 | 无 → SC-T3：要求达当前等级上限方可突破 |
| 操作摩擦 | 碎片够即一键升星 | eleph 够即升 | — → SC-T3：零操作摩擦，一键突破，防呆保留出战卡 |

### 本产品缺少的标配功能（SC-T3 相关）
- **「重复不浪费」是收集游戏的标配底线**：两家竞品都把重复角色转成突破燃料，PCR 玩家反复称赞「歪了也不心疼」。本产品当前重复卡是纯死资产（`addItem` 只 count++、`dismantleCard` 只能换 KP 而非喂养该角色成长）——SC-T3 补的正是这块。
- **突破=后置于满级的长线闸门，而非又一个买断目录**：竞品的突破门槛都后置于等级上限（满级/Lv.90），这保证突破是「练透一个角色的终局奖励」而非早期就能空转的浅目标。本产品若不设「达上限方可突破」门槛，会重蹈 P2-11「好感一次性买断」的覆辙。
- **突破加成克制有封顶**：蔚蓝 Potential 明确「minor bonuses」、最高 Lv.25 封顶。这为 SC-T3 数值克制提供强背书——**永久加成要小且分档递增有顶**，避免突破变成数值失控的膨胀源（守 pitfalls 的养成克制精神）。

### 竞品用户反馈中的机会点（SC-T3 落地要点）
- **零操作摩擦是 PCR 突破被称赞的关键**：碎片够即一键升星，无繁琐确认。**SC-T3 应保证一键突破**（复用 `getCharacterCardCount` 重复张数自动结算），二次确认仅在「消耗较多碎片」时给，避免每次点两下。
- **突破进度要显形**：蔚蓝/PCR 都清晰显示「当前星级 / 下一档需多少碎片 / 差多少」。SC-T3 的 NurtureView 突破入口应显示「当前突破档 → 下一档进度条 + 需碎片 X / 当前可用 Y」，对齐 SC-T5 已确立的「显示差多少」范式，让突破成为短期目标。

---

## Phase 3: 功能深度

### 现有功能的深度评估（SC-T3 视角）
- **养成从「两薄轴」到「三轴有决策长线」**：当前养成=等级（确定加点，无决策——SA-T3 有意去随机）+好感（一次性里程碑，无决策）。**SC-T3 是第一条引入真决策的养成轴**——决策点不在「怎么突破」（应零摩擦）而在「有限的重复卡，优先突破谁」（碎片是稀缺资源，玩家要选主力）。这是把养成从「纯灌资源」升级为「资源分配博弈」的关键一步，正对根因 B「养成无玩家决策」。
- **突破的深度边界（防做浅/做过）**：
  - **做浅的风险**：只给「更高等级上限」而无即时永久加成 → 回报太远（要先把角色从旧上限练到新上限才见收益），玩家无动机突破。**必须突破即给克制的永久小加成**，让每次突破有即时正反馈。
  - **做过的风险**：给复杂的「星级 × 每星多档 × 每档随机属性」→ 违背单机向克制、膨胀失控。**应做成确定性分档**（第 N 突破 = 固定 +X% base 或固定小额五维），无随机 roll（对齐单机向定位，避免把刷取误挂进来）。

### 可能的 power-user 路径（SC-T3 相关）
- **突破投资规划**：显示「突破到下一档需 X 碎片 / 当前 Y / 每层敌方战力」让硬核玩家精确规划「先突破哪个角色能过 SC-T5 卡住的那层」——SC-T3 与 SC-T5 天然联动（突破涨战力 → SC-T5 门槛变绿），把两个任务串成「卡关 → 看差多少 → 突破补战力」的完整决策链。engine 侧给突破加成的确定值，UI 展示对战力的预估增量。

### 集成、协作、自定义的可能性（SC-T3 相关）
- **突破进度是「可 CI 校验的存档字段」**：SC-T3 的存档往返测试（SPRINT 明示）就是防退化守卫——突破档位/碎片消耗的纯函数应可单测（给定当前档 + 可用碎片 → 返回可否突破 + 消耗量 + 新上限 + 新加成），engine 纯层注入而非依赖 store，守住架构铁律。

---

## Phase 4: 差异化与 Wow Factor

### 「如果能 XXX 就太酷了」（≥3 个功能提议，标 backlog）
1. **💡 突破里程碑解锁「角色档案/名台词」而非纯数值（backlog，喂 SC-T3/SC-T4）**：项目坐拥 Bangumi 角色简介/番剧数据。突破到关键档（如满突破）时解锁角色 mini 档案或名台词卡——低成本、高情感回报、单机向友好，对标蔚蓝 MomoTalk 的口碑点。本轮 SC-T3 只做数值突破，此为后续增值口，留口即可（突破档位数据结构预留「解锁内容」字段的可能性，但本轮不实现）。
2. **💡 SC-T3 ↔ SC-T4 互锁：突破抬升好感等级上限（backlog，喂第 3 轮）**：对标蔚蓝档案「星级突破抬升好感上限」。若第 3 轮 SC-T4 做好感等级化，让 SC-T3 的突破档同时抬升好感上限，两个孤立任务串成「突破 → 更高好感上限 → 更多永久加成」的复合长线。**本轮 SC-T3 不实现，但字段设计上让「突破档」保持可被 SC-T4 读取的清晰形态**（第 3 轮 Planner 决策）。
3. **💡 突破消耗「跨角色碎片池 / 通用突破石」（backlog，远期）**：竞品有「用其它角色碎片/通用道具替代」的宽松路径（PCR 记忆碎片可换、蔚蓝 eligma 买 eleph）。本产品远期可加「通用突破石」让冷门角色也能突破，但**本轮严格走「自身重复卡」单一路径**（最内聚、零新存档域），跨角色池是超范围创新。

### 口碑传播点分析（用户会因为什么推荐给朋友？）
- **「重复卡不浪费」是留存与口碑双赢点**：玩家最痛恨「歪了/抽重复无用」，PCR 自动转碎片被反复称赞。SC-T3 做好 = 消除一个核心挫败源，是收集游戏留存的直接杠杆。
- **突破+SC-T5 联动的「卡关有解」体验**：卡在某塔层时，SC-T5 告诉你「差多少战力」，SC-T3 给你「突破主力补战力」的明确解法——「卡住有事做、有目标」正是根因 C「卡关即断更」的反面，是玩家愿意回归的理由。

### 值得删掉或简化的东西（≥1 个）
- **警惕过度设计 SC-T3 的星级层数**：**不要做成「1★→6★ 六档 × 每档多级」的复杂矩阵**。单机向定位下，3-5 档突破、每档确定加成足矣。删繁就简：突破档位是**确定性小整数序列**（如 0→1→2→3），每档需碎片数递增、给固定小加成、抬固定上限增量。避免引入随机属性 roll、避免多维度交叉矩阵。
- **不要为 SC-T3 新开独立存档域**：突破进度天然属于 `CharacterNurtureData`（per-character 养成数据），应作为该结构的新字段（如 `breakthroughLevel: number`），**复用既有 `characterNurtureData` 序列化/迁移管线**，而非新建平行的 `breakthroughData` 域。最内聚、迁移最省事、往返测试复用 `migrateNurtureData` 范式。

---

## Technical Health（附带）

- **架构扩展性风险（SC-T3）**：
  - **engine 纯净**：突破的「可否突破 / 消耗碎片 / 新上限 / 新加成」逻辑必须落 `engine/nurture/rules.ts`（已是纯层，零 Vue/Pinia/IO/Math.random）的纯函数，store 只负责「读碎片数 → 调纯函数 → 写存档字段 + 扣 collection count」的薄编排。突破加成走 `generateBattleStats` 纯加法注入，不引入乘算失控。
  - **存档三改协议**：SPRINT 明示 schema + migrations + 装配器三处同改 + 往返测试。落点已勘明（见 Phase 1）。SAVE_VERSION 15→16，本 Sprint 唯一一次 bump。**风险点：突破字段若同时改「等级上限判定」，务必让 `getLevelFromExp` / 加点结算读「base 上限 + 突破增量」的单一函数，避免上限常量散落多处不一致**（当前 `MAX_CHARACTER_LEVEL` 是硬常量，需收敛成「有效上限 = 基础 + 突破」的单一入口）。
- **性能瓶颈**：突破加成是 per-character 静态存档值，O(1) 读取，无新瓶颈。`buildCharacterStats` 每次重建（无 memo）是既有现状，SC-T3 不加剧。
- **测试与质量保障状态**：第 1 轮后 687 测试全绿（`eval.md`）。SC-T3 的测试卡点：
  - **engine 纯函数测试**（`rules.test.ts` 或新 nurture 突破测试）：给定当前突破档 + 可用碎片 → 断言「可否突破 / 消耗量 / 新上限 / 新加成」确定正确；边界（碎片不足拒绝、已满突破拒绝、达上限方可突破的门槛判定）。
  - **迁移往返测试**（`migrations.test.ts` 或 persistence 往返）：v15 旧档（无突破字段）迁移补默认 0 且不炸；突破字段类型损坏兜底 0；序列化→反序列化→再序列化保真（含突破进度）。**这是 SPRINT 的硬验收，必须有。**
  - **不破坏 C1 养成两轴**：断言现有 statPoints/好感路径不受突破字段引入影响；`generateBattleStats` 若扩签名，现有 combat 测试（`combat.test.ts:100`）需同步更新且旧行为（突破=0 时）与原结果逐字节一致。
- **数据隐私/安全**：SC-T3 零后端（存档走既有鉴权管线），无新增攻击面。**注意单机向存档可改**——突破碎片消耗是客户端逻辑，脏档可绕过，但与既有 collection count 同风险级别（P2-28 已定性单机向危害有限），本轮不引入新防线。

### 回归复审（第 1 轮 SC-T1/T2/T5 落地改动）
逐条 Read/Grep 核对第 1 轮成果，**未发现回归**，确认三项落地属实且干净：
1. **[确认无回归] SC-T1**：`squadSkillKits.ts:125 EXPLICIT_ARCHETYPE`（10 UR 种子 + 已知误判纠偏）+ `:152 resolveArchetype` 单一入口（显式优先 → 正则回落）+ `:697 getArchetypeForCharacter` 对外单入口 + `:703 hasExplicitArchetype` CI 守卫钩子，与 eval 描述一致。注释 `:122` 明示 `EXPLICIT_ARCHETYPE[id] === SIGNATURE_KIT_OVERRIDES[id].role` 断言守卫已在。**提醒 SC-T3 Planner**：若突破加成要按角色定位倾斜（可选），应消费单一入口 `getArchetypeForCharacter`，勿再拼正则（对齐 eval.md 第 7 节提醒）。
2. **[确认无回归] SC-T2**：`squadSkillKits.ts:622 HR_SKILL_NAME_OVERRIDES`（26 项，只改名）+ `:683 hasHrSkillNameOverride` + `:725` 名回落链，与 eval 一致。
3. **[确认无回归] SC-T5**：`engine/squad/thresholds.ts` 纯函数（`recommendedPowerForFloor` + `assessSquadReadiness`，三档 0.9/0.7，floorPower≤0 视 ready，delta/系数/阈值参数注入），零 config import、零 RNG，与 eval 一致。**SC-T3 与 SC-T5 的口径联动是本轮红利**：突破加成经 `generateBattleStats`→`calculateBattlePower` 注入我方战力后，SC-T5 门槛会自动把突破算进去，无需改 thresholds.ts。
4. **[风险·SC-T3 会碰] 存档 bump 唯一性**：`schema.ts:37 SAVE_VERSION=15` 本轮升 16。**验收必须卡：本 Sprint 只此一次 bump**——第 1 轮已确认零存档改动、v16 留给本轮，SC-T4（第 3 轮）若触存档共用此次 v16，不得再升 17。

---

## Prioritized Recommendations

### 🔴 Critical（本轮必做的指派切片，缺失则养成长线不成立）

- **SC-T3｜星级/突破三件一体：消化重复卡 → 抬等级上限 → 克制永久小加成**：
  - **消化重复卡**：突破消耗 `getCharacterCardCount(id) - 1` 的可用碎片，复用 `dismantleCard` 的「保留 ≥1 张」防呆（`collection.ts:48` 范式）。零操作摩擦，一键突破。
  - **抬等级上限**：突破档抬升有效等级上限，`getLevelFromExp`/加点结算读「基础上限 + 突破增量」单一入口，避免 `MAX_CHARACTER_LEVEL` 硬常量散落。验收卡「突破后可练过 Lv.100」。
  - **永久小加成真进战力**：突破给克制的确定性小加成，经 `generateBattleStats` 纯加法注入（第四个加数或并进 statPoints），与 SC-T5 门槛口径自洽。突破=0 时与现有战力逐字节一致。
  - **门槛**：突破要求角色达当前等级上限（对齐 PCR/蔚蓝「满级方可突破」），防 Lv.1 空转。
  - **存档三改 + 往返测试**：字段挂 `CharacterNurtureData`（如 `breakthroughLevel`），schema + `migrateNurtureData` + `createDefaultNurtureData` 三改，SAVE_VERSION 15→16（本 Sprint 唯一 bump）。engine 纯函数测试 + 迁移往返测试（SPRINT 硬验收）。
  - **UI**：NurtureView 角色详情加突破入口 + 进度（当前档 → 下一档需碎片 X / 可用 Y + 差多少，对齐 SC-T5 显形范式）；碎片不足显示差额而非无解释灰按钮；到顶显示「已突破至最高」。

### 🟡 Important（显著提升完整度，但属第 3 轮 / 需守克制）

- **SC-T4（第 3 轮）｜好感等级化给永久小加成 + 每日互动**：对标蔚蓝档案 Potential，永久加成小且封顶（守 C1「好感不接战力」克制），每日互动复用 daily 跨天判定。若触存档共用本轮 v16 bump，**不得再升 17**。
- **SC-T6（第 3 轮）｜NurtureView 拆无壳可内嵌组件**：纯 UI 重构，消除 hub characters 面板双标题/双空态/长滚。SC-T3 本轮往 NurtureView 加突破入口时，**应把突破 UI 写成可被 SC-T6 内嵌的形态**（不依赖页级标题/独立空态），减少第 3 轮返工。

### 🟢 Nice-to-have（power-user / 打磨，本轮可顺手）

- SC-T3 深度：突破入口显示「突破到下一档对战力的预估增量」，与 SC-T5 联动形成「卡关 → 突破补战力过层」的短期目标链（power-user 规划）。
- SC-T3 可维护性：突破档位/加成表做成集中可调的 config 常量（仿 `config/nurture.ts BOND_MILESTONES` 范式），便于调平，engine 纯函数消费注入的配置而非硬编码。

### 💡 Feature Idea（差异化创新，不进本 Sprint，backlog）

- **backlog｜突破里程碑解锁「角色档案/名台词」**（喂 SC-T3/SC-T4）：用 Bangumi 角色简介做情感回报，对标蔚蓝 MomoTalk 口碑点，单机向友好。本轮 SC-T3 只做数值突破。
- **backlog｜SC-T3↔SC-T4 互锁**：突破档抬升好感等级上限（对标蔚蓝档案），把两个任务串成复合长线。第 3 轮 Planner 决策；本轮字段设计保持突破档可被 SC-T4 读取的清晰形态。
- **backlog｜通用突破石 / 跨角色碎片池**：让冷门角色也能突破。远期，本轮严格走「自身重复卡」单一路径。
- **backlog｜Bangumi 真实数据驱动定位回落**（承接 SC-T1）：正则回落层未来可用真实番剧类型/评分加权替代——竞品无此数据，独有差异化。

---

**一句话收尾**：第 1 轮立正了脊柱（定位/HR/门槛），本轮 SC-T3 要接上收集向游戏最痛的那条命脉——**「重复不浪费 + 养成有终局目标」**。关键是「消化重复卡 → 抬等级上限 → 克制永久小加成」三件一体、加成真进战力且与 SC-T5 口径自洽，门槛后置于满级（对齐 PCR/蔚蓝）、数值克制有封顶（守单机向）、存档三改往返保真（SPRINT 硬验收）。地基已就绪（`generateBattleStats` 纯加法注入点 + `dismantleCard` 保留 ≥1 张防呆 + `migrateNurtureData` 迁移范式），SC-T3 是「在既有管线上接线 + 一次干净的 v16 bump」，不是重构。守住两条红线：**突破加成克制有封顶（不做膨胀源）、SAVE_VERSION 本 Sprint 只 bump 一次**。

Sources:
- [Ascension | Princess Connect Re:Dive Wiki](https://princess-connect.fandom.com/wiki/Ascension)
- [Memory Shard | Princess Connect Re:Dive Wiki](https://princess-connect.fandom.com/wiki/Memory_Shard)
- [Potential - Blue Archive Wiki](https://bluearchive.wiki/wiki/Potential)
- [Ability Release | Blue Archive Wiki](https://bluearchive.fandom.com/wiki/Ability_Release)
