# S14-D 设计研究报告 — 第 2 轮（SD-T2 装备 homeEffect 剥离到设施 + SD-T4 经验曲线/满级溢出修配）

> 角色：Product Research Reviewer（设计研究员）。product-loop `--tier1 on --mode all`，S14-D 第 2/3 轮。
> 本轮指派切片（据 SPRINT 排期建议第 2 轮）：**SD-T2（装备家园 homeEffect 逐步剥离到设施 + EquipPicker 挂机 delta 预览）+ SD-T4（经验曲线/产出错配修正 + 满级经验溢出出口 + 补习递增）**。
> 范围纪律：只对 SD-T2/SD-T4 的**设计选择**给本质替代 + tradeoff，重点防经济腐化与数值失衡。超范围创意标 backlog。**本报告只 refine HOW，不代替 Generator 落地，也绝不建议跳过指派任务。**
> 前情：第 1 轮 SD-T1（facility 域 v17 + comfort 软加成 + 封顶随等级抬升）+ SD-T5（无底 KP sink，设施指数成本）已 **COMPLETE**（eval.md，745/745 测试全绿）。**本轮不再 bump 存档版本**（SD-T2/T4 纯计算改配置权重/纯函数，YAGNI，不预留字段）。
> 证据地基：`config/homestead.ts`（`computeIdleYield` 现 4 参、`HOMESTEAD_EFFECT_CAP=0.6`、设施乘区独立 cap）；`config/equipment.ts`（每件 `homeEffect{expPct/affectionPct/knowledgePct/comfort}` + `bonus`）；`components/nurture/EquipPickerModal.vue`（现只 `formatHomeEffect` 文案，无 delta）；`engine/nurture/rules.ts`（`getRequiredExpForLevel=(L-1)²×1000`、`MAX_CHARACTER_LEVEL=100`）；`stores/nurture.ts`（`addCharacterExp` 满级截断但 `totalExperience` 仍累加 = 沉没、`tutorCharacter` 定额 `TUTORING_EXP_GAIN=500`）；`config/nurture.ts`（`bondOverflowExchange` = 已有「溢出转 KP」范式，SD-T4 可复用）。

---

## Executive Summary

- **本轮两任务命中的 3 个核心假设**：
  1. 「装备一件同时承载战斗 `bonus` 与家园 `homeEffect`」——45 件目录**每件都带 homeEffect**（`equipment.ts:75-123`），战斗与家园两目标钉死在同一件、抢同三槽（P2-13）。这是 SD-T2 要推翻的对象。
  2. 「经验是单调向上的水池，满级即封口」——`getRequiredExpForLevel=(L-1)²×1000`（满级 ≈980 万），而挂机 2400/12h、塔百层每人 1040；`addCharacterExp` 满级后 `level` 截断但 `experience/totalExperience` **仍在累加**（`nurture.ts:124-127`）→ 满级角色的一切经验注入**直接蒸发**（P2-19）。这是 SD-T4 的靶心。
  3. 「补习是定额兑换」——`TUTORING_KP_COST=100 → TUTORING_EXP_GAIN=500` 恒定（`nurture.ts:177`），高级角色一次补习换来的「等级进度」随曲线陡增而趋近于零。
- **最大研究发现在「逻辑完备性」维度**：SD-T2 若把 homeEffect **直接从 45 件目录删除**，会与第 1 轮 SD-T1 的 comfort 软加成产生**跨轮口径断裂**——comfort 的**唯一来源**目前正是装备 `homeEffect.comfort`（`HomesteadView.homeEffect` 求和 → `computeIdleYield.effect.comfort`）。第 1 轮 eval 明确记录「comfort 生效逻辑未写死绑装备来源、为 SD-T2 迁来源留空间」。**若本轮剥离 homeEffect 却不同时给 comfort 一个新来源，comfort 软加成会归零 = 直接回归掉第 1 轮刚做的 SD-T1 子项**。这才是本轮真正的地雷，而非 EquipPicker 的 delta 文案。
- **一句话最有价值突破方向**：**SD-T2 用「弱化权重 + 口径透明」而非「物理删除」——把 45 件 homeEffect 的 pct 部分统一乘一个 `EQUIP_HOME_EFFECT_WEIGHT`（本轮设 0，或保守 0.25）收敛到「装备≈纯战斗」，但 comfort 来源同步迁到设施派生（如 `comfort = 三设施总级数 × k`），让 comfort 有稳定的新家**；SD-T4 则**照抄本仓已验证的 `bondOverflowExchange` 范式**——把满级经验做成「溢出转 KP（克制汇率）」，而非重标定整条曲线（重标定会冲击存量战力、波及等级/加点/突破链，风险面远大于收益）。

---

## Phase 1 · 核心假设质疑

### 假设清单（★ = 本轮可质疑 / 需守住）

| # | 假设 | 出处 | 可质疑性 |
|---|---|---|---|
| B1 | 装备每件都带 homeEffect（战斗+家园双目标钉死） | `equipment.ts:75-123` | ★★★ SD-T2 要推翻它，但**删还是弱化**是本质分叉 |
| B2 | comfort 的唯一来源是装备 `homeEffect.comfort` | `HomesteadView.homeEffect` → `computeIdleYield` | ★★★ **本轮最大地雷**：SD-T2 剥离装备后 comfort 会断供，须同步迁来源，否则回归 SD-T1 |
| B3 | 经验是单调水池，满级即封口（超额经验蒸发） | `nurture.ts:124-127` | ★★★ SD-T4 靶心。已有 `bondOverflowExchange` 现成范式可抄 |
| B4 | 满级经验曲线 `(L-1)²×1000` 与产出量级匹配 | `rules.ts:35-38` | ★★ 严重错配（980 万 vs 2400/12h），但**重标定会冲击存量战力** |
| B5 | 补习是定额兑换（100 KP → 500 exp 恒定） | `nurture.ts:177` | ★★ 高级角色补习性价比趋零；可随等级递增，但别造新 sink |
| B6 | 装备 homeEffect 受 `HOMESTEAD_EFFECT_CAP=0.6` 钳制、与设施乘区独立 | `homestead.ts:130/192-194` | ★★ SD-T2 迁移后 0.6 cap 是否还有意义？装备权重归 0 时 cap 变空转 |
| B7 | 战力单机无 PvP，曲线重标定「区间可接受」 | SPRINT SD-T4 | ★★ 真无 PvP，但塔软门槛、突破/好感加成基于当前 level 派生，重标定会连锁 |

### 关键假设深挖

**深挖 1 — B2（comfort 断供）：SD-T2 最危险的跨轮回归。**
第 1 轮把 comfort 从「死数值」接成了真软加成（每 10 点 +1%、封顶 +20%，`comfortBonusPct`），但 comfort 的**数值来源没动**——仍是装备 `homeEffect.comfort` 逐件求和喂进 `computeIdleYield` 的 `effect.comfort`。SD-T2 若「装备回归纯战斗、删/清零 homeEffect」，则 `effect.comfort` 归 0 → `comfortMult=1` → 第 1 轮刚点亮的 comfort 软加成**整条熄灭**，且 UI 的 comfort 展示归零。**这不是 SD-T2 的新特性，是 SD-T1 的回归。**
- **守法（推荐）**：本轮把 comfort **来源迁到设施派生**——如 `facilityComfort(levels) = 三设施总级数 × COMFORT_PER_FACILITY_LEVEL`（或最高级派生），让 comfort 随设施成长而非装备。这样 comfort 软加成有稳定新家，且与「家园=可经营系统」的叙事一致（设施越高越舒适，比「戴了几件装备」更合理）。第 1 轮 eval 已预留这条路（「comfort 生效逻辑未写死绑装备来源」）。
- **过渡法（更保守）**：本轮**不删** homeEffect.comfort，只弱化/剥离 pct 三项（exp/affection/knowledgePct → ×weight 或归 0），comfort 暂留装备来源。tradeoff：装备仍残留一个家园维度、剥离不彻底，但零回归风险、改动面最小。**SD-T2 措辞是「逐步剥离 / 大幅弱化权重」，本就允许过渡。**

**深挖 2 — B3/B4（满级沉没 vs 曲线重标定）：SD-T4 的方案分叉，风险差一个数量级。**
错配是真的（980 万满级需求 vs 2400/12h 挂机），满级经验蒸发也是真的。但**两条修法风险截然不同**：
- **改曲线（B4）**：把 `getRequiredExpForLevel` 从 `(L-1)²×1000` 压到如 `(L-1)^1.6×C`。**连锁**：`getLevelFromExp` 是 `getRequiredExpForLevel` 的反函数（`rules.ts:41-47`，while 循环反推），改前者**存量角色的 level 会被重新反推**——同样的 `totalExperience` 在新曲线下会**跳到更高等级** → 一次性凭空升级 + 触发一堆加点（`rollLevelUpStatPoints`）→ **存量战力整体膨胀**，且塔软门槛/突破基线全部漂移。这是「重标定冲击存量」的具体机制，风险高。
- **加溢出出口（B3）**：曲线不动，只在 `addCharacterExp` 满级分支把「本该蒸发的经验」转成 KP（克制汇率），完全**照抄 `bondOverflowExchange` 已验证范式**。零存量冲击、改动面小、直接消灭「沉没」。**这是本轮该优先做的**。
- **结论**：SD-T4 应以「满级溢出出口」为主体（低风险、直接达成「满级经验不再沉没」验收项），曲线重标定**降级为温和微调或 backlog**——若一定要动曲线，只调**系数**（`×1000 → ×400`）不改**指数**（保持 `(L-1)²` 形状），把重标定幅度和 level 反推漂移压到最小，且必须有「存量档 level 不跳变」的回归测试。

**深挖 3 — B5（补习定额）在陡曲线下的性价比塌缩。**
`(L-1)²×1000` 下，L2→L3 需 3000 exp（6 次补习），L50→L51 需 ~99000 exp（198 次补习），L99→L100 需 ~980000 exp（1960 次补习）。定额补习在高级段等于「无效点击」。**修法**：补习产出随目标角色等级递增（`TUTORING_EXP_GAIN × f(level)`），或补习花费递增而产出更递增。**红线**：补习是「花 KP 换 exp」的 KP sink，别把它做成「exp 印钞机」反向掏空 SD-T5 的 KP 稀缺——递增产出的同时递增花费，维持「补习性价比 ≤ 挂机」的基线。

### 被隐喻限制的地方
当前「装备 = 战斗与家园的二相物」隐喻，把「一件东西必须两头都管」当成天经地义，才有了 P2-13 的抢槽。换成「**装备 = 战斗资产，家园 = 独立经营资产**」两条正交轴后，homeEffect 从「装备的附属维度」变成「设施/家园的固有产物」，抢槽问题**从根上消失**——这正是 SD-T1（设施主承载）+ SD-T2（装备退出家园）的合流终局。SD-T2 本轮做的是把这个隐喻切换**落地一半**（装备退场），comfort 迁设施是切换的**另一半**。

---

## Phase 2 · 相邻领域研究

| 领域 | 核心思想 | 可迁移到 SD-T2/T4 的点 |
|---|---|---|
| **RPG 装备/词条系统（Diablo、原神圣遗物）** | 战斗属性与「生活/采集」加成分属不同装备类别，不塞进同一件 | SD-T2：家园加成本就该由「家园设施」承载，装备专注战斗——正交化是成熟范式，非激进 |
| **经验溢出/转化（多数放置+养成游戏）** | 满级后 EXP 自动转为通用货币/材料（如「满级经验 → 金币」），杜绝沉没 | SD-T4 满级溢出转 KP，直接对标；本仓 `bondOverflowExchange` 已是同款范式的内部先例 |
| **等级曲线设计（多项式 vs 指数）** | 多项式（`L^k`）比指数更可控；改曲线必须处理「存量玩家等级重算」的迁移 | SD-T4：若动曲线只动系数不动指数，且必须回归测「存量 level 不跳变」 |
| **递减边际兑换（补习/训练所）** | 高级段兑换性价比递减是正常设计，但要给「大额一次性」出口避免无效点击疲劳 | SD-T5 的补习递增：产出随等级涨，但花费同步涨，维持性价比曲线单调 |
| **软迁移 / 特性开关（feature flag / weight）** | 用一个权重常量渐进关掉旧机制，而非硬删——可回滚、可灰度 | SD-T2：`EQUIP_HOME_EFFECT_WEIGHT` 常量（0=全关/0.25=保守），比删 45 件 homeEffect 安全，且第 3 轮/后续可微调 |

### 最值得借鉴的 3 个模式
1. **权重开关式软剥离（SD-T2 该抄）**：不删 `equipment.ts` 的 45 条 homeEffect（删了要改 45 行 + 波及 catalog 测试 + drops），而是在 `computeIdleYield`/`sumHomeEffects` 消费侧乘一个 `EQUIP_HOME_EFFECT_WEIGHT`（config 常量）。本轮设 0（装备≈纯战斗）或 0.25（保守过渡）。可回滚、改动面小、口径集中一处。
2. **满级 EXP → 货币溢出（SD-T4 该抄，且有内部先例）**：`bondOverflowExchange` 已证「溢出转 KP、克制汇率、只兑整份、余数保留」范式在本仓跑通。SD-T4 照此加 `expOverflowExchange(totalExp, level)`：满级后超出 L100 阈值的经验每 N 点转 1 KP，纯函数 + rules 测试。
3. **改曲线只动系数不动指数（SD-T4 若动曲线的护栏）**：保持 `(L-1)²` 形状、只降 `×1000` 系数，能压低满级需求量级又把 level 反推漂移最小化；配「存量 totalExperience → 新 level 不跳变或跳变可控」的回归测试。

### 竞品设计哲学对比
- **原神/崩铁的「圣遗物 vs 尘歌壶」**：战斗装备与家园系统彻底分家，家园加成（洞天宝钱等）由家园自身产出，装备只管战斗。AnimePlay 现状（装备两头管）比它们更耦合；SD-T2 是向成熟范式收敛，不是标新。**结论：SD-T2 剥离方向正确，且 comfort 迁设施与「家园自产家园加成」哲学一致。**

---

## Phase 3 · 逻辑完备性

### 概念体系（本轮改动后的关系）
```
装备 bonus ────────────────→ 战斗战力（resolveNurturedBattleStats，本轮不碰）
装备 homeEffect.pct ──×WEIGHT(本轮→0/0.25)──→ computeIdleYield（收敛，SD-T2）
装备 homeEffect.comfort ──?──┐
                             ├─(本轮迁来源)──→ comfort → comfortBonusPct → 全产出软加成（守 SD-T1）
设施 facility.level ─────────┘（推荐 comfort 新来源 = 设施派生）

经验注入(挂机/塔/补习/互动) → addCharacterExp
   ├─ level < 100 → 升级 + 加点（不变）
   └─ level = 100 → 【现状：experience 仍累加但蒸发】→ 【SD-T4：溢出转 KP，抄 bondOverflowExchange】
补习 100KP→500exp 定额 → 【SD-T4：随 level 递增产出（+同步递增花费，守 KP 稀缺）】
```
**模糊地带（必须在实现里澄清）**：
1. **comfort 剥离到什么程度**：装备 comfort 也迁走（彻底）还是暂留（过渡）？（建议：pct 三项本轮收敛到 0/低权重；comfort 来源迁设施派生，让 SD-T1 软加成不断供——这是本轮唯一必须钉死的口径）。
2. **溢出转 KP 的触发点**：在 `addCharacterExp` 满级分支即时转（自动入账）还是像好感那样「手动领取」？（建议自动转、一次性汇总播报，与挂机静默入账口径一致，避免又一个「要手动点」的埋没出口）。
3. **溢出的 `experience/totalExperience` 记账**：转 KP 后 `totalExperience` 是否还累加？（建议：`totalExperience` 保留累加做统计，但满级后把「超出 L100 阈值的整份」计为已兑，避免重复兑——需一个「已兑溢出量」的记账。**注意：若这需要新存档字段，与「本轮不 bump」冲突**——可用「`totalExperience - L100阈值` 的整份差量、每次只兑增量」的无状态算法规避存档字段，见极端场景 3）。

### 极端场景检验
1. **全员满级 + 持续挂机**：现状经验全蒸发。SD-T4 后每次结算把满级角色的经验份额转 KP → **反而给 SD-T5 的 KP sink 供了新的 KP 源**。需检查：这条新 KP 源会不会又制造通胀？（克制汇率 + 挂机经验本就是零头量级 → 转出的 KP 也是零头，安全；但要在测试里锁「溢出汇率 ≤ 补习逆汇率」，别让「挂机满级刷经验转 KP」比正经赚 KP 还快）。
2. **SD-T2 权重设 0 后，`HOMESTEAD_EFFECT_CAP=0.6` 变空转**：装备 pct 全归 0，则 cap 永不触发。**不是 bug 但是死代码信号**——本轮可保留 cap（为 comfort 若仍走装备、或权重设非 0 时兜底），但要在注释标明「装备权重降后 cap 多为空转，SD-T2 过渡期保留」。别删（删了若回滚权重就裸奔）。
3. **溢出转 KP 的「无状态增量」算法**：为避免新存档字段，用 `expOverflowExchange` 设计成**幂等增量**——记 `settledOverflowKp` 会需要字段；替代：让**每次 addCharacterExp 调用只处理「本次注入落在 L100 之上的那一段 exp」**（本次注入前已满级 → 整份本次注入都是溢出；本次注入跨越满级 → 只有超过阈值的部分是溢出），转 KP 后**这段 exp 不再进 `totalExperience`**（或进但标记）。这样无需「已兑总量」字段。**Generator 须验证幂等性**：同一段 exp 不会被兑两次。**这是 SD-T4 不 bump 存档的关键设计约束**，必须在 rules 纯函数层解决。

### 操作缺口（Agent/玩家想做但做不到）
- SD-T2 后玩家无法一眼看出「这件装备现在对家园还有没有用」——SPRINT 已要求 EquipPicker 补挂机 delta 预览（本轮做，让口径透明）。delta 预览必须与 `computeIdleYield` **同源**（同样的 WEIGHT/facility 口径），否则又是「预览≠实战」。
- SD-T4 后玩家不知道「满级角色的经验去哪了」——溢出转 KP 必须有播报/UI 提示，否则又变成静默埋没（把「蒸发」换成「静默转账」不算解决体验）。

### 演化瓶颈
- comfort 来源若本轮迁到「设施派生」，则未来家具系统（P3-4 backlog）接入 comfort 时，comfort 已是「可累加软加成池」而非「装备专属」——迁得正是时候。
- SD-T4 若本轮走「溢出转 KP 无状态增量」而不 bump，则将来若要做「满级经验转专属道具（如天赋点）」，需要新字段——本轮不预留（YAGNI），到时再 bump。

---

## Phase 4 · 替代设计提案

### 核心机制替代（SD-T2 = homeEffect 剥离形态）

**方案 A（推荐·基线）— 权重开关软剥离 + comfort 迁设施派生**
- `computeIdleYield`/`sumHomeEffects` 消费侧乘 `EQUIP_HOME_EFFECT_WEIGHT`（config 常量，本轮 = 0，装备≈纯战斗）。45 条 homeEffect 数据**不删**（可回滚）。
- comfort 来源迁到设施派生（`facilityComfort(levels)`），接进 `computeIdleYield` 的 comfort 入参 → 守住 SD-T1 软加成不断供。
- EquipPicker 补挂机 delta 预览（同源 WEIGHT）。
- **tradeoff**：改动面最小（不动 45 行目录、不 bump、可回滚）、零 SD-T1 回归、口径集中一处。缺点：装备 homeEffect 数据变「僵尸字段」（权重 0 时不生效但仍在），需注释说明「SD-T2 软剥离、数据留待可能回滚」。

**方案 B（替代）— 物理删除 45 件 homeEffect，装备类型定义去掉 homeEffect 字段**
- 直接删 `EquipmentDef.homeEffect`，clean。
- **tradeoff**：最彻底、无僵尸字段。但改 45 行 + `sumHomeEffects`/`formatHomeEffect`/EquipPicker/catalog 测试全波及，且 comfort 来源必须同轮迁（否则 SD-T1 硬回归），改动面和回归面都大，不可回滚。**列为后续轮/S14-E 的 clean-up backlog，本轮不做**（SD-T2 措辞明确「逐步剥离」，软剥离更贴切）。

**方案 C（SD-T4 侧替代）— 全面重标定曲线（`(L-1)^1.6` 或降系数）**
- 把满级需求从 980 万压到与产出匹配。
- **tradeoff**：治本（曲线本身合理化），但触发存量 level 反推跳变、加点/突破/塔门槛连锁漂移，回归面大。**降级为 backlog 或「只降系数不改指数 + 存量不跳变回归测试」的温和版**，主体让位给溢出出口（方案 A' 见下）。

**方案 A'（SD-T4 推荐主体）— 满级溢出转 KP（抄 bondOverflowExchange）+ 补习随等级递增**
- `addCharacterExp` 满级分支：本次注入落在 L100 之上的 exp 段 → `expOverflowExchange` 克制汇率转 KP（无状态增量，不 bump）。
- 补习产出 `TUTORING_EXP_GAIN × f(level)`，花费同步递增，维持性价比单调。
- **tradeoff**：零存量冲击、直接达成「满级经验不沉没 + 补习不定额沉没」两条验收项、有内部范式先例。缺点：不治「曲线本身过陡」的本（但那是低优、高风险，可 backlog）。

### 概念重组
- **把 homeEffect 从「装备维度」重组为「家园/设施维度」**：SD-T1 已让设施成为家园产出主体，SD-T2 本轮把 comfort 也迁过去，homeEffect 概念从装备侧**整体退场**——重组后「装备只管战斗、家园只管家园」两轴正交，是本 Sprint 根因 D/E 的收口。

### Tradeoff 矩阵（vs 现状）

| 维度 | 现状 | SD-T2 方案 A（推荐） | SD-T2 方案 B | SD-T4 方案 A'（推荐） | SD-T4 方案 C |
|---|---|---|---|---|---|
| 解决抢槽/两目标 | ✗ | ✓ 权重收敛 | ✓ 彻底 | — | — |
| 满级沉没修复 | ✗ | — | — | ✓ 溢出转 KP | ✓ 曲线合理化 |
| 存量冲击 | — | ✓ 零 | △ comfort 须同迁 | ✓ 零 | ✗ level 跳变 |
| 需 bump 存档 | — | ✓ 否 | ✓ 否 | ✓ 否（无状态增量） | ✓ 否 |
| SD-T1 回归风险 | — | ✓ 低（comfort 迁设施） | ✗ 高（须同迁） | ✓ 无 | ✓ 无 |
| 可回滚 | — | ✓（权重常量） | ✗ | ✓ | ✗ |
| 本轮范围契合 | — | **✓ 契合 SD-T2** | △ 偏重 | **✓ 契合 SD-T4** | ✗ 偏险 |

### 灵感炸弹 💡
1. **EquipPicker 的挂机 delta 显示「换装后家园净变化」而非绝对值**：既然装备 homeEffect 权重降到 0，delta 会显示「±0」——这本身就是最诚实的 UI：直接告诉玩家「装备已不影响家园，放心按战斗选」，把 SD-T2 的意图**可视化**成教学，比藏起来更好。
2. **满级溢出转 KP 的汇率挂钩「角色星级/好感」**：满级 + 高星角色溢出汇率略优——给「练满一个角色」一个持续正反馈的尾巴，把「满级即毕业」变成「满级后仍有微收益」。（超范围创意，标 backlog，本轮先做定额克制汇率）。

---

## Prioritized Research Directions

### 🔴 High-impact, Low-effort（本轮 SD-T2/T4 应直接采纳）
- **SD-T2 走权重开关软剥离（方案 A）+ comfort 来源迁设施派生**：这是本轮**唯一必须钉死的口径**——剥离 pct 权重的同时给 comfort 一个设施新家，否则硬回归第 1 轮 SD-T1 的 comfort 软加成。改动集中在 config 常量 + comfort 来源一处，可回滚。
- **SD-T4 主体 = 满级溢出转 KP（方案 A'，抄 `bondOverflowExchange`）+ 无状态增量算法（不 bump 存档）**：直接达成「满级经验不沉没」验收，零存量冲击。**关键约束**：溢出算法必须幂等（同段 exp 不兑两次），用「本次注入超阈段」而非「已兑总量字段」实现。
- **补习随目标等级递增产出 + 同步递增花费**：解决高级段补习无效点击，同时守 KP 稀缺（性价比 ≤ 挂机，别做成 exp 印钞机）。
- **EquipPicker 挂机 delta 与 computeIdleYield 同源**：权重 0 时显示「装备不再影响家园」的诚实提示（灵感 1），避免「预览≠实战」。

### 🟡 High-impact, High-effort（backlog）
- **SD-T4 曲线本体重标定（方案 C）**：只在有「存量 level 不跳变」回归测试护航、且只降系数不改指数的前提下做；否则放 backlog（本轮溢出出口已达成核心验收，曲线过陡是低优）。
- **SD-T2 物理删除 45 件 homeEffect（方案 B）**：clean-up，待 comfort 完全迁设施稳定后，S14-E/后续轮做，本轮软剥离足矣。

### 🟢 Thought-provoking（长期）
- **家具系统接入 comfort 软加成池**（P3-4）：本轮把 comfort 迁成「设施派生的可累加软加成」即为其铺路。
- **满级角色的「毕业后成长」尾巴**（星级/好感挂钩溢出汇率，灵感 2）：把「满级即终点」变成长尾微收益。

### 💡 Wild idea
- **EquipPicker「装备已不影响家园」教学化提示**（灵感 1）：把 SD-T2 的机制变更直接讲给玩家，减少「为什么这件装备家园数值没了」的困惑。
- **满级经验转「专属天赋点」而非 KP**（需新字段，明确 backlog + 未来 bump）：给满级一个比 KP 更有意义的去向，但超本轮范围。

---

**Sources**：内部先例 `config/nurture.ts bondOverflowExchange`（本仓已验证的「溢出转 KP、克制汇率、只兑整份」范式，SD-T4 直接复用）· 第 1 轮 `docs/orch/eval.md`（comfort 生效逻辑未写死绑装备来源、为 SD-T2 迁来源留空间的跨轮提示）· [The Math of Idle Games — Kongregate](https://blog.kongregate.com/the-math-of-idle-games-part-iii/amp/)（曲线/成本边际递减）。
