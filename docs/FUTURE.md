# AnimePlay 演进 Roadmap（前进路线）

> **这是项目的单一前进任务源。** 只管「还剩什么、下一步做什么」。已完成的 Sprint（S0–S10）、产品进化层（Evo-1..Evo-9）、战斗可读性还债、2026-06-24 产品循环、**S13 家园综合系统**等**完成史已归档到 [HISTORY.md](HISTORY.md)**——要查「做过什么、怎么做的、达到什么 Exit」去那边。
>
> 每个任务的「为什么/证据」：重构主线见 [项目审计报告-2026-06-12.md](项目审计报告-2026-06-12.md)；**S14 家园 hub 深化见 [orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)**（2026-07-01 对抗性审计，任务后附 `P#-#` 编号可回查该报告的 file:line 证据）。
>
> 用法：开工前看「进度总览」找当前 Sprint → 做完勾掉任务 → 一个 Sprint 的 Exit 全满足就把它标 ✅。后续日常产品迭代的需求源在 [SPRINT.md](SPRINT.md)。

## 🎯 终点与铁律

**终点**：多人 + 排行榜 + PvP 的可上线游戏。

**四条贯穿始终的架构铁律**（每个 Sprint 都不能违反）：
1. **engine 纯净**：`src/engine/` 只有纯游戏逻辑，零 Vue / Pinia / DOM / fetch / localStorage 依赖。它是将来与服务端共享的那层。
2. **依赖只向下**：`views → components → stores → engine`，下层绝不 import 上层。engine 出现 `import @/stores` = 架构破窗，靠 lint 闸拦死。
3. **RNG 可注入**：engine 内不直接调 `Math.random()`，随机源作为依赖注入（为 PvP 防作弊 + 服务端权威 + 可测试）。
4. **Sprint 独立可合并**：每个 Sprint 做完，游戏都处于可玩状态，即使后面的不做也不破。

目标目录结构与分层详见审计报告第三节及架构讨论（engine / types / config / data / infra / stores / composables / components / views / lib）。

**状态图例**：☐ 未开始 · 🔄 进行中 · ✅ 完成

---

## 📊 进度总览

| Sprint | 主题 | 状态 | 阶段 |
|---|---|---|---|
| S0–S10 | 重构主线（文档/测试/engine 抽取/拆 store/功能闭环/视觉/技能/性能/安全） | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| — | 产品进化层 Evo-1..Evo-9 + 战斗可读性还债 + 2026-06-24 产品循环 | ✅ | 已完成 → 详见 [HISTORY.md](HISTORY.md) |
| S13 | 家园综合系统（基地养成 + 小队战斗重构 + 挑战塔闭环） | ✅ | A/A2/B/C1/C2/D1–D5 全部落地合并 → 完成史见 [HISTORY.md](HISTORY.md) |
| **S14** | **家园 hub 深化（差异化 + 决策 + 循环，audit-driven）** | 🔄 | **S14-A ✅ 已完成**（2026-07-01 product-loop）；S14-B~F 待做。源：[审计报告](orch/homestead-hub-audit-report.md) |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S0–S13 全部完成并归档（[HISTORY.md](HISTORY.md)）。**近期主线 = S14 家园 hub 深化**：S13 交付了完整骨架与数值管线，但 2026-07-01 对抗性审计发现家园 hub「能跑不崩、却缺选择空间」——本 Sprint 专补 S13 留下的深度缺口。S11 / S12 仍为远期方向（到达时再 `/think` 细化）。下方「已知债 / Backlog」是穿插其间、需独立决策的散项。

---

## 🔄 S14 — 家园 hub 深化（差异化 + 决策 + 循环，近期主线）

**背景**：S13 把家园 hub 的骨架（UI / 数据 / 数值管线）搭完了，能跑、不崩、数字算得对。但 2026-07-01 对抗性审计（8 维 × 每条 4 票投票，225 agent；50 确认 / 3 争议 / 1 否决，报告：[orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)）判定它是**「五环拼装的半成品」**——在「差异化—决策—闭环」三个决定可玩性的关节上同时断裂。

**三大系统性根因**（S14 就是逐个拆解它们）：
1. **角色在战斗层零差异化**：`data/squadSkillKits.ts` 用 6 个原型模板套 200+ 角色，同原型技能数值逐字节相同只换名；项目已有的 66×2 条唯一技能资产（`/battle` 域跑着 134 个 handler）在小队战斗里被 `getSquadSkillKitForCharacter` 只取 `.name`，effect 整块丢弃。
2. **养成/配装无玩家决策**：升级随机加点（`engine/nurture/rules.ts` `distributeRandomStatPoints`）直接进实战五维、不可洗点、无 role 定位；装备任意戴任意、纯线性五维、拿到即终态。
3. **无可重复循环，卡关即断更**：挑战塔单调递增、通过层零收益（`stores/pve.ts` + `engine/squad/rewards.ts`），塔外无可重复 PvE；家园设施纯展示不可升级、comfort 是死数值。

**定位守则**：本项目是**单机向二次元收集网页游戏**，不追 PCR 的付费深度与竞技强度。对标 PCR 是为了照见缺口——**补差异化与循环是收集向玩法的底线，追付费深度 / 随机刷取词条则大可不必**。凡触 engine 的改动继续守四条铁律（确定加点 = 去 rng；position/crit/buff 叠加逻辑进 `engine/squad` 纯层；任何掉落/roll 走注入 RNG；存档字段三处同改 schema/migrations/装配器）。

> ⭐ = 低成本高收益（改动小、杠杆大，多为「已有能力接线」）。每项后括号内为审计报告编号。

### ✅ S14-A · P1 急救（把「半成品」补成「完整玩法」，多为接线级，独立可上线）— 已完成 2026-07-01

> ✅ **S14-A 全部 6 项已完成**（product-loop `--tier1 on --mode all`，3 轮 + 1 纠偏轮；17 源文件 +1124/−85，SAVE_VERSION→15，653 测试全绿，engine 纯净）。落地实况与原始设想的偏差（以实现为准）：SA-T3 走「base 五维比例确定分配」而非新增 role 存档字段（正则定位不可靠，绑上去会扩散误判）；SA-T4 = **10 个招牌 UR 纯数据覆盖**（`SIGNATURE_KIT_OVERRIDES`，description 由 `describeSquadSkill` 自动派生锁死「描述≠行为」，**严禁复用 /battle effectId**——两套运行时不通）；SA-T5 = **周期封顶 + 缩水扫荡**（`sweepFloor` 独立 action，不推进层）；SA-T6 = Plan A（explore「开始挑战」直达进战、battle tab 不复活 towerMode 编成器）。产物见 `docs/orch/`（product/evolution/research-audit-report + scout + plan + negotiation + gen_status + eval），沉淀见 `docs/plans/pitfalls.md` S14-A 段。**下一步 = S14-B（战斗手感与深度）。**

- [x] ⭐ **接通编队编辑**（P1-3 / P1-4）：`HomesteadHubView.vue` 的 squad 面板当前全只读、formation-slot 无 `@click`；而 `stores/pve.ts` 的 `updateSquadMember` / `updateSquadName` 已存在并经 userStore 暴露。给 slot 加点击 → 复用 `CharacterSelectModal` 换人、squad-select 加改名、空位显示可点「+添加」。**纯接线。**
- [x] ⭐ **统一敌人预览种子**（P2-17，真 bug）：hub 探索面板 `enemyPreview` 用 `createSeededRng(floor*7919+17)`，而 `SquadBattleView` `refreshTowerEnemies` 用 `Math.random` → 玩家看到的敌人 ≠ 打到的敌人。让两者共用同一确定性种子（按 floor 派生），或预览读持久化的 towerEnemyData；同步决定是否保留「刷新敌人」。
- [x] **消解三 tab 结构冗余**（P1-3）：编队 / 探索 / 战斗三个 tab 与 SquadBattleView 内嵌爬塔页信息三重重复。二选一——(A) squad tab 成唯一编队入口（可点开换人）、explore 保留预览 + 「开始挑战」直接触发、battle 只承载演出；(B) 删 squad+explore 两只读 tab，把 towerMode 编成屏作为 explore 内容。
- [x] **升级加点改确定成长 + 引入 role 定位**（P1-5 / P2-9）：把 `distributeRandomStatPoints` 换成按 base 五维比例的确定分配（保总量、去 rng，一行改 store，不动存档结构）；给角色加 `role` 字段（可复用 archetype），按定位给成长倾斜（guardian 偏 hp/def、striker 偏 atk/spd），杜绝「全堆攻击的坦克」。⭐ 确定分配本身极低成本。
- [x] **让个人技能驱动至少一条差异化技能位**（P1-1 / P1-2）：让 skill1 或 ultimate 复用 `data/urCharacterSkillsGenerated.ts` 的 effectId / 数值（把 `/battle` handler 映射到 squad effect）；头部 20 个招牌 UR 优先手写唯一 kit，其余回落原型。**这是接通已有资产、直接兑现角色差异化的最高杠杆项。**
- [x] **引入一条可重复日循环**（P1-6）：扫荡 / 重复挑战已通层给缩水 KP + 经验 + 低概率装备，加每日次数封顶防通胀；或塔外单开经验 / 装备副本每日 N 次。解决「卡关即断更」。
- **Exit**：hub 内可直接换人建队；预览即所战；升级成长可预期、角色有定位；至少头部 UR 在战斗里表现不同；卡关玩家仍有每日主动产出。type-check / test / build 通过。

### ☐ S14-B · 战斗手感与深度（P2，补操作与站位策略）

- [ ] **90s 超时改按剩余 HP% 判胜 + 加倒计时**（P2-4）：`timedBattle.ts` 超时当前一刀切判负；UI（`SquadBattlefield.vue`）只显 elapsedMs 无倒计时。加醒目倒计时 / 进度条；超时按双方剩余 HP% 裁决。
- [ ] **手动大招能选目标 + 增量推进**（P2-5）：当前 autoUltimates 默认 true、手动开大会整场 `regenerateBattleSimulation` 重算导致回放跳变，且目标是 skill 写死。让手动大招能选目标；默认设关或首战引导；改增量推进而非整场重算。
- [ ] **让暴击系统活起来**（P2-2 / P2-6）：`formulas.ts` `critRate` 默认 0、全场唯一暴击源是 striker passive 的 10%，canCrit/critDamage 大量成死代码。给全体基础 critRate（如 0.05）并让装备 / 养成 / buff 能加暴击做成真实成长轴；或彻底删除 crit 字段避免死系统误导。
- [ ] **给前中后排真实机制或去掉视觉**（P2-1）：position 目前只用于 `targeting.ts` 的 front/backEnemy 排序，`formulas.ts` / `effects.ts` 完全不读 position。给它真实机制（后排近战减伤 / AOE 衰减 / 前排默认仇恨）；若不做就去掉前中后排视觉，别让 UI 承诺机制而代码没实现。
- [ ] **同类可叠加 buff 改按来源累加设上限**（P2-3）：`effects.ts` `maxRuntimeStatusValue` 现同 kind 取 Math.max → 双辅助价值被压平。可叠加类（atkUp/defDown/spUp/critRateUp）改累加设上限，控制类（stun/silence）保持不叠加。
- **Exit**：战斗有倒计时与合理超时裁决；手动大招是有意义的操作杠杆；暴击 / 站位 / 团队增益至少有一项构成真实策略；引擎特征测试覆盖新规则。

### ☐ S14-C · 角色差异化与养成长线（P2）

- [ ] **废弃正则 inferArchetype，改显式 archetype 字段**（P2-7）：当前靠拼接文本跑 6 条正则 first-match-wins，误判频发（阿尔托莉雅被 `圣剑|Fate` 判成魔法师、含「音乐」角色一律先命中 support…）。在角色数据显式声明 archetype（生成脚本一次性人工校对 66 UR），过渡期至少按「专属技能名 > description > name > tags」加权。
- [ ] **HR 角色补个人技能绑定**（P2-8）：`urCharacterSkillMap` 只登记 UR，HR 名与效果 100% 走原型模板，而塔允许 HR 出战。为 HR 补个人技能名映射，长期给至少 1 条差异化被动。
- [ ] **补一条有决策的养成长线**（P2-10）：养成仅等级 + 好感两薄轴。建议加星级 / 突破（达上限后靠重复角色碎片突破解锁更高上限），把重复抽到的角色转化为突破资源。
- [ ] **好感等级化，给永久意义 + 回归钩子**（P2-11 / P2-23）：里程碑现只给一次性 KP、好感无战力 / 永久意义、领完后完全无用。除 KP 外给永久小幅五维% / 被动；高好感解锁剧情 / 语音 / 皮肤；加每日好感互动（送礼 / 对话）；好感溢出可转 KP。
- [ ] **挑战塔加战力 / 等级门槛**（P2-12）：`eligibility.ts` 只校验稀有度 / 技能包，Lv.1 生角色可直接进塔。给塔层加战力门槛（或推荐战力提示 + 低于阈值明显劣势），把养成重新钉进探索循环。
- [ ] **NurtureView 拆成无壳可内嵌组件**（P2-18）：角色 tab 把整页 NurtureView 原样内嵌导致双标题 / 双空态 / 长滚。去掉 min-h-screen / 页标题 / 独立空态，或删 hub 内精简摘要只留 NurtureView。
- **Exit**：角色定位判定稳定可预期；HR/UR 都有差异化技能；养成有一条长期目标线；好感不再是一次性榨干；塔要求玩家养成。

### ☐ S14-D · 家园机制闭环 + 经济闭环（P2 深度，把家园立成「经营系统」）

- [ ] **三设施做成可升级产出乘区**（P2-25 / P2-26 / P2-24，核心动作）：`HomesteadView.vue` 三设施（训练区 / 休息区 / 资料室）现纯展示、comfort 是死数值、挂机产出恒定不随进度成长。新增 facility 存档域（schema/migrations/装配器三改），用 KP 升级每级 +X% 对应产出，comfort 接一档真实软加成，封顶随设施等级抬升 → 形成「挂机产 KP → 升设施 → 挂机更快」自循环与无底 KP sink。
- [ ] **装备的家园 homeEffect 逐步剥离到设施**（P2-13）：同一件装备既定战斗五维又定家园挂机%，两套目标抢同槽、选装口径打架。把家园加成移到「设施升级」承载，装备回归纯战斗；过渡期先在 `EquipPickerModal` 补挂机 delta 预览（⭐ 低成本子项）。
- [ ] **给重复装备加回收 / 分解出口**（P2-21）：`drops.ts` 每层 50% 掉一件、`equipment.ts` addItem 只 push 从不去重，齐装后纯堆积垃圾。分解为 KP（复用 codex 分解范式）、或 N 件合成升级材料（一箭双雕做装备强化 sink）、或转碎片计数。
- [ ] **修经验曲线 / 产出错配**（P2-19）：满级需 980 万经验，而挂机 2400/12h、塔第 100 层每人才 1040，满级后经验全部沉没。把曲线压到与产出匹配（如 level^1.6）或提产出；满级经验给溢出出口（转道具 / 少量 KP）；补习产出随等级递增。
- [ ] **加无底 KP sink**（P2-20）：KP 唯一硬通货但 sink 全是买断目录（装备 45 件封顶、图鉴、补习），集齐后无处可花必然溢出贬值。装备强化 / 精炼、角色突破 / 星级、每日刷新定向兑换或塔商店限量高价物。
- **Exit**：家园从「单页面板」变成「可投资的经营系统」；KP 有长期去处；重复装备有出口；经验不再打进黑洞。

### ☐ S14-E · 装备深度（P2，塑造 build 与毕业曲线）

- [ ] **加装备强化 / 等级**（P1-7，多数票 P1 但资源紧张可作 P2）：`EquipmentItemSave` 现仅 `{uid,defId}`，数值恒等于 def 静态值、拿到即毕业。给实例加 level/enhance（schema+migrations+装配器三改），用重复装备 / 材料做强化燃料，把毕业曲线从「拿到即满」拉长为「拿到 → 强化到满」。（与 S14-D 的分解出口互为燃料。）
- [ ] **加确定性套装 / 原型条件加成**（P2-14 / P2-16）：装备任意戴任意、稀有度纯线性、无搭配维度。**优先做确定性套装**（2~3 组，塑造 build），或对匹配原型角色给条件加成（复用 archetype）。**随机副词条谨慎**——审计对标指出 PCR rank 装恰是确定属性无随机 roll，随机词条是把原神 / 暗黑刷取误挂 PCR 名下，与本项目单机向定位不符。
- [ ] **扩展 EquipmentDef 支持战斗 modifier**（P2-15，增强项）：`formulas.ts` 已内建 critRate/critDamage/damageUp/healUp 等且真实消费，但装备只能改 5 维。可选：给 EquipmentDef 加 modifier 字段，resolveEquipModifiers 注入 BattleModifiers，让装备够到更多战斗旋钮。
- **Exit**：装备有可持续消耗（强化）与搭配空间（套装 / 条件加成）；装备开始塑造角色定位而非纯线性堆数值。

### ☐ S14-F · P3 打磨（一致性与内容缺口，穿插进行）

- [ ] ⭐ hero 区「家园→角色→编队→探索→战斗」循环胶囊是不可点静态装饰、与 tab 1:1 重复（P3-1）→ 删掉或做成明显非导航示意图。
- [ ] ⭐ 补习升级：成本随等级递增 + 批量 / 一键升级 + 分档经验道具（P3-2）。
- [ ] 家园驻留低频定时结算（60s）刷新预计累积 + 封顶进度条，卸载清除（P3-8）。
- [ ] 统一敌我战力口径：我方含养成、敌方 floorPower 用原始属性，两数字不同量纲同屏并列（P3-6）→ 统一 `calculateBattlePower` 或直接给推荐战力线 / 胜率。
- [ ] 家园收益封顶改分层递减：现按全体合计硬顶 0.6，约 4 件同向 UR 即触顶（P3-7）。
- [ ] 墙钟回拨钳位（P2-28 的廉价卫生改动）：`settleHomestead` 用 `Date.now()`，改系统时间可刷。加 `now < lastSettleAt → 记 0 并把 lastSettleAt 夹到 now`；单机向危害有限，仅作卫生改动。
- [ ] 中期内容：轻量家具 / 布局系统（P3-4，落 furniture 存档域）、入住羁绊 / 差异化速率（P3-5）、家园日常委托（P3-10，引已有 daily store 入口进家园）、装备定向掉落保底 / 碎片（P3-3）。
- **可暂不处理**（经模拟证实当前无可达触发路径，玩家不可感知，留待开放弃卡 / 脏档校验时再补）：inferArchetype 稀有度兜底（P3-9）、结算前复核当前拥有数（P3-11）。

### 🗳️ 审计争议项（决策参考，不默认排期）

- **战斗是「预演算 + 回放」玩家近观众**（争议 2/4）：证据属实，但「手动大招时机 + 战前配队配装」已达 PCR 半自动平价；**不推倒战斗模型**，归入 S14-B 打磨即可。
- **tab 缺 tablist/aria 语义 + home 深链被 replace 抹空**（争议 2/4）：降为 P3，其它 UI 改动时顺手补 role/aria。
- **装备加成占比过低**（❌ 已否决 1/4）：该发现用 `STAT_DISPLAY_REF`（`config/nurture.ts` 明确标注仅显示用、不进战斗）当分母，是幽灵分母；真实 battle_stats 口径下 UR 武器 atk+108 是 40%+ 增量。**不作为任务，勿据此调低装备权重。**

**S14 整体 Exit**：家园 hub 从「能跑的半成品」变成「有收集意义的完整玩法」——角色在战斗里有差异、养成 / 配装有玩家决策、循环有可重复产出（卡关不断更）、家园是可投资的经营系统。每个 S14 子阶段独立可合并、做完游戏都可玩。

> **最脆弱假设**：一次性给全部 HR/UR 手写差异化技能会膨胀。变形求生：S14-A 只接通「个人技驱动一条技能位 + 头部 20 UR 手写」，其余回落原型；差异化按角色热度增量补齐，绝不上线「描述≠行为」的假技能（CLAUDE.md Known Debt 明令根除）。

---

## ☐ S11 — React 视图迁移（演进）

**目标**：视图层换 React，盖在已干净的 engine 上，拿到单一 TS 栈。

- [ ] 新建 React 应用骨架，直接复用 `engine / types / config / data / infra`
- [ ] 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」）
- [ ] `views` / `components` 按域用 React 重写
- [ ] 对照功能逐页验收

**Exit**：React 版功能对齐；engine 复用率 > 50%。
> 粗粒度。前置依赖 S2–S5 的 engine 必须已干净（已达成，见 HISTORY.md）。详细拆解在 [SPRINT.md](SPRINT.md)（仍决策门控/未激活）。到达时再 `/think` 细化。

---

## ☐ S12 — 权威后端 & 多人/PvP/排行榜（终点）

**目标**：达成多人闭环。

- [ ] `engine` 提升为前后端共享包（monorepo）
- [ ] Node 权威服务端（战斗/抽卡服务端计算，客户端预测）
- [ ] 排行榜（战绩/收集进度）
- [ ] PvP 匹配 + 对战

**Exit**：多人对战与排行榜上线。
> 粗粒度。决策门控（数据库选型、匹配机制等），到达时再 `/think`。下方 Backlog 的三项（品味契合度对照 / 声优维度 / beforeResolve 决策中除外）多数需后端配合，归此 Sprint 一并消化。
> 注：S14-F 的「墙钟回拨钳位」只是单机卫生改动；离线挂机的**权威时间**最终由本 Sprint 的权威后端解决。

---

## 🧾 已知债 / Backlog

穿插在 S11/S12 之间、需独立决策或后端配合的散项。**不属任何已完成 Sprint**，需要时单独立项。

### 🎮 gameplay 决策（可独立做，无后端依赖）

- ⚠️ **beforeResolve 临时强度计入结算档位的去留——已修复，待回访确认是否为最终设计**：原 bug（`battleFlow.resolveClash` 把 `addStrengthBonus` 只加进展示强度、rewards 档位用不含它的 `baseStrengths`，导致学霸气质/圆环理/运动天赋/SOS团氛围等 beforeResolve「+N强度」被动**不影响胜负**只改显示数字）已于 2026-06-17 由提交 `3c359cd` 修复：现在 engine 拿到的最终强度已含临时加成，展示与判定一致（`frontend-vue/src/stores/battleFlow.ts:441-453`）。**当前选择是「计入档位（增强）」**而非「从展示剔除（诚实）」。保留于此仅作回访路标：若将来做技能数值平衡时需要重新权衡这两条路径，从这里接着想；否则可视为已闭环。交叉引用：`frontend-vue/CLAUDE.md` Known Debt 的「行为=描述」簇。

### 🔌 需后端配合（归 S12，未做）

- ☐ **品味契合度对照 / taste-social compatibility**（玩家间品味重合度 / 社交化发现，"你和 X 87% 契合"）：2026-06-24 产品循环浮现的 #1 剩余结构性机会——persona 当前被困为单人镜子。需后端 + 触存档 schema，故归 S12。SPRINT.md 明确「本轮不做」。**前置可做**：纯前端异步「品味码」能在投入后端前先验证形态。
- ☐ **声优收集维度 / voice-actor dimension**（按声优收集 / seiyuu 相关玩法）：跨栈，需后端吐 `角色id→声优` 映射。actor 数据在 S9 性能优化时被 `server.py` 在服务 `all_animes` 路径上剥离（占体积 94%），前端拿不到，任何声优功能都需后端先恢复该映射。归 S12。
  > 注：此项在历史上以两处不同措辞出现（Evolution 尾注的「按声优收集维度」与 2026-06-24 循环 round 1 的「声优维度」），是**同一个**跨栈/需后端项，此处已合并为一条，勿再拆。

---
*本文只列「还剩什么」。完成史在 [HISTORY.md](HISTORY.md)；日常产品迭代需求源在 [SPRINT.md](SPRINT.md)。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。最后整理 2026-07-01（S13 全部完成归档 HISTORY；新增 S14 家园 hub 深化，源自对抗性审计 [orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)）。*
