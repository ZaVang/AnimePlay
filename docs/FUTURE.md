# AnimePlay 演进 Roadmap（前进路线）

> **这是项目的单一前进任务源。** 只管「还剩什么、下一步做什么」。已完成的 Sprint（S0–S10）、产品进化层（Evo-1..Evo-9）、战斗可读性还债、2026-06-24 产品循环、**S13 家园综合系统**、**S14 家园 hub 深化（A~F 共 33 项，audit-driven）**、**S15 家园 hub 内容补完 + 测试稳定（T1..T4）**等**完成史已归档到 [HISTORY.md](HISTORY.md)**——要查「做过什么、怎么做的、达到什么 Exit」去那边。
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
| S14 | 家园 hub 深化（差异化 + 决策 + 循环，audit-driven，A~F 共 33 项） | ✅ | A/B/C/D/E/F 全部落地合并 → 完成史见 [HISTORY.md](HISTORY.md)（源：[审计报告](orch/homestead-hub-audit-report.md)） |
| S15 | 家园 hub 内容补完 + 测试稳定（S14 遗留收尾，T1..T4） | ✅ | flaky 根除 + 家具 v20 + 入住羁绊 + 掉落保底 pity 全部落地合并 → 完成史见 [HISTORY.md](HISTORY.md) |
| S11 | React 视图迁移 | ☐ | 演进 |
| S12 | 权威后端 & 多人/PvP/排行榜 | ☐ | 终点 |

> S0–S15 全部完成并归档 [HISTORY.md](HISTORY.md)（S13/S14/S15 均为家园 hub 主线；S14 audit-driven 33 项，源：[审计报告](orch/homestead-hub-audit-report.md)；S15 收 S14 遗留 flaky + 中期内容 4 项）。**下一主线 = S11 React 视图迁移 / S12 权威后端+多人/PvP/排行榜**（远期方向，到达时再 `/think` 细化）。下方「已知债 / Backlog」是穿插其间、需独立决策的散项。

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

- 🔄 **小队技能 per-character 差异化 + 技能配置表拆分（纯前端，可独立做）**：SSR 开放出战后（2026-07-03，见 [HISTORY.md](HISTORY.md)），可出战池 = **318 人**（UR 67 / HR 110 / SSR 141），但**逐角色技能设计几乎没有**。审计（`squadSkillKits.ts` 全量清点 + 按线上服务名单交叉核算，2026-07-03）实测：真正专属**机制/effect** 差异只有 **10 人（全 UR，`SIGNATURE_KIT_OVERRIDES`）= 3.1%**；另 **80 人**（UR 44 + HR 36）只是**技能名**不同、effect 仍是共享的 6 套 archetype 模板；剩 **228 人（含全部 141 SSR）是名+effect 全通用克隆**。结构性天花板：`getSquadSkillKitForCharacter`（`squadSkillKits.ts:706-751`）五槽中只有 `skill1`/`ultimate` 两槽**能**承载专属 effect，`normalAttack`/`skill2`/`passive` 对任何人恒为模板；且 SSR 约 2/3（battle_stats `hpDef>atkSp` 分支）坍缩到**同一个 guardian 模板**，kit 近乎相同。
  - **配置/逻辑耦合**：`data/squadSkillKits.ts`（801 行）把**配置数据**（`EXPLICIT_ARCHETYPE` 18 / `SIGNATURE_KIT_OVERRIDES` 10 / `HR_SKILL_NAME_OVERRIDES` 26 / `archetypeEffects` 6 套模板 / labels）和**生成逻辑**（`resolveArchetype` 归类 + `getSquadSkillKitForCharacter` 装配 + `describeSquadSkill` 描述派生 + `validate*` 校验）混在一个文件。诉求 = 把 per-character 技能配置拆进固定配置文件、与主逻辑分离。
  - **建议（三步，全程保留模板兜底 → 零回归）**：① **纯拆分**（无行为变更、测试全绿）——配置表抽到 `data/squad/`（如 `archetypeTemplates.ts` + 按 id 的 `characterKits.ts`），装配/校验/描述逻辑留纯函数模块；② **统一形状**——把 3 张 override 表并成一张 per-character kit 配置（`{ role?, slots?: { skillN?: { name, target, effects } } }`），可仿 UR 技能既有 **docs→generate** 管线（`docs/UR角色技能设计.md` + `scripts/generateUrSkills.js` → `urCharacterSkillsGenerated.ts`（标「请勿手动编辑」））做一份 `docs/小队技能设计.md` + `scripts/generateSquadKits.js`；③ **逐角色补设计**，优先 SSR（141，100% 通用、收益最大）→ HR 通用 74 → UR 通用 13。工作量按「每人 1 个 role + ≥1 招牌槽」≈228 人（不必五槽全手写，参照现有 10 UR 招牌粒度）。准入仍走 `engine/squad/eligibility.ts` 单一真相源，配置按 id 正交。
  - **附带须修**：coverage 测试 `squadSkillKits.test.ts:26` 读的是 `data/character/all_cards.json`（3647 人，UR 42 / HR 55 / SSR 201），**与线上实际服务的 `data/selected_character/all_cards.json`（2021 人，UR 67 / HR 110 / SSR 141，`backend/server.py:53`）不是同一份**——测试的稀有度分档 ≠ 线上，等于没在守真实出战名单（例：线上 0 个 SSR 有个人技名，测试文件里却有 9 个）。拆分时顺带把测试指到服务同源文件。
  - **全文证据**：审计报告 [orch/squad-skill-design-audit-2026-07-03.md](orch/squad-skill-design-audit-2026-07-03.md)（含实测命令、file:line、三步方案与数据结构清单）。
  - **进展（2026-07-03 当日落地）**：① Step1 配置/逻辑拆分 ✅（`a3dce5d`，`data/squad/archetypeTemplates.ts`+`characterKits.ts`）；② Step2 三表并成一张 `CHARACTER_KITS` ✅（`bb1be57`，零行为变更，3647 角色 kit 输出逐一等价）；③ Step3 全 **141 SSR 逐角色设计 ✅**（`44fdeb5` 8 小样 + `b770793` 铺量 133，workflow 生成+人工 balance-lint）。**bespoke 占比 3.1%→47.5%**，SSR 通用克隆归零。**剩：HR 74 + UR 13 通用待补**（同法可续）；skill2/passive 目前只改名沿用模板（可选再深一层做四槽全专属）。

### 🔌 需后端配合（归 S12，未做）

- ☐ **品味契合度对照 / taste-social compatibility**（玩家间品味重合度 / 社交化发现，"你和 X 87% 契合"）：2026-06-24 产品循环浮现的 #1 剩余结构性机会——persona 当前被困为单人镜子。需后端 + 触存档 schema，故归 S12。SPRINT.md 明确「本轮不做」。**前置可做**：纯前端异步「品味码」能在投入后端前先验证形态。
- ☐ **声优收集维度 / voice-actor dimension**（按声优收集 / seiyuu 相关玩法）：跨栈，需后端吐 `角色id→声优` 映射。actor 数据在 S9 性能优化时被 `server.py` 在服务 `all_animes` 路径上剥离（占体积 94%），前端拿不到，任何声优功能都需后端先恢复该映射。归 S12。
  > 注：此项在历史上以两处不同措辞出现（Evolution 尾注的「按声优收集维度」与 2026-06-24 循环 round 1 的「声优维度」），是**同一个**跨栈/需后端项，此处已合并为一条，勿再拆。

---
*本文只列「还剩什么」。完成史在 [HISTORY.md](HISTORY.md)；日常产品迭代需求源在 [SPRINT.md](SPRINT.md)。每完成一项请同步勾选；每完成一个 Sprint 请更新「进度总览」状态。最后整理 2026-07-02（**S13/S14/S15 家园 hub 主线全部完成并归档 [HISTORY.md](HISTORY.md)**：S14 audit-driven A~F 33 项(v15→v19) + S15 收尾 T1..T4(注入时钟根除 flaky + 家具 v20 + 入住羁绊 + 掉落保底 pity，v19→v20)，917 测试全绿、连跑无 flaky、均 product-loop `--tier1 on --mode all` 落地；源自对抗性审计 [orch/homestead-hub-audit-report.md](orch/homestead-hub-audit-report.md)。**下一主线 = S11 React 迁移 / S12 权威后端+多人**。家园 hub 剩项：家具布局深化 / 更多羁绊 / 碎片兑换，见 backlog/HISTORY）。*
