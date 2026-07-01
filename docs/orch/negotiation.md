# S14-A 第 3 轮 · Reviewer 建议逐条回应（negotiation.md）· 验收再确认视角

> Sprint Planner 对三份审计报告（product / evolution / research）「Prioritized Recommendations」逐条回应。
> 判定：**接受（已落地维持）/ 部分接受 / 拒绝 / backlog**（含理由 + 本轮行动）。
> **本轮定位**：切片 = SA-T4 + SA-T5（**与第 2 轮同一切片**），第 2 轮已被 Evaluator 判 **COMPLETE**。tier1 on = 引擎跑满 3 轮，本轮是**验收再确认 + 抓回归**，**不开新范围**。
> 因此所有第 2 轮已「接受并落地」的建议，本轮判定统一转为 **「接受（已落地维持，本轮回归复跑守住）」**——不重新讨论、不再动实现；只对「本轮是否应新做/加做」给出裁决。Scout 第 3 轮逐文件核实全部拍板已落地、无未落地项、无新坑。

---

## A. Product Experience Reviewer（product-audit-report.md）

### 🔴 Critical

| # | 建议 | 本轮判定 | 理由 + 本轮行动 |
|---|---|---|---|
| C-1 | SA-T4 每条差异 effect 有「真跑通引擎」特征测试 | **接受（已落地维持）** | 第 2 轮已写端到端 `executeSkill`/`simulateTimedBattle` 断言（stun≥2/execute→defeated/revive），eval 抽查属实。→ 本轮回归锁：复跑 `squadSkillKits.test.ts` 全绿（plan T4-R2）。 |
| C-2 | SA-T4 description 走工厂派生禁手写 | **接受（已落地维持）** | 覆盖走 `skill()` → `description===describeSquadSkill`，结构性锁死红线、无手写入口。→ 本轮不破此结构（plan T4-R3）。 |
| C-3 | SA-T5 schema+migrations+装配器三处同改+往返测试 | **接受（已落地维持）** | v15 三处同改齐全、`migrations.test.ts` 往返保真已验；stub 未硬复用（新增扁平字段）。→ 本轮**不再动 schema**（plan T5-R1），只复跑 migrations 往返守回归。 |

### 🟡 Important

| # | 建议 | 本轮判定 | 理由 + 本轮行动 |
|---|---|---|---|
| I-1 | SA-T4 头部挑机制辨识度、差异肉眼可辨 | **接受（已落地维持）** | 10 签名 UR 差异皆机制层（御坂单体+silence/晓美焰群 stun+slow/鹿目圆 revive/忍野忍 execute/远坂凛独特 dot），非纯倍率。→ 本轮不退化（plan T4-R2）。 |
| I-2 | SA-T4 不得改 `isSquadSkillKitReady` 全角色集合 | **接受（已落地维持）** | 第 2 轮专测断言覆盖前后 filter 集合不变，护 SA-T2 同源。→ 本轮**最隐蔽回归面**，复跑「集合不变」用例（plan T4-R5）。 |
| I-3 | SA-T5 缩水+封顶让扫荡产出 << 推塔产出，测清满配量级 | **接受（已落地维持）** | 测试断言 单次<<首通、满配周产出600<<推20层总量。→ 本轮复跑守回归（plan T5-R4）。 |
| I-4 | SA-T5 复用 daily 范式 + 回拨视同日不重置 | **接受（已落地维持）** | `ensureThisSweepWeek` 读时归零 + 回拨钳位。→ 本轮不改（plan T5-R5）。 |
| I-5 | 价值显性化：T4 徽章 / T5「N/M」进度条 + 一键结算 | **部分接受（已落地维持核心，徽章仍 backlog）** | T5 一键结算 + 本周 N/M 进度条已落地（plan T5-R7）。**T4 UI 徽章仍 backlog**：`isSignatureKit` 查询接口已导出留口，UI 徽章是紧随的 UI 轮次子项，**本轮切片是数据/派生层，不做徽章**（不阻断验收）。 |

### 🟢 Nice-to-have

| # | 建议 | 本轮判定 | 理由 |
|---|---|---|---|
| N-1 | SA-T4 HR 回落原型名效一致 | **接受（已落地维持）** | HR 只回落原型、不挂签名映射，天然一致。 |
| N-2 | 清 `SquadBattleView` `towerEnemyData = ref<any>` lint 债 | **部分接受（顺手项）** | 本轮定位零改动，倾向不动；触及才顺手类型化，否则留存不阻断。 |

### 💡 Feature Idea

| # | 建议 | 判定 |
|---|---|---|
| F-1 家园设施可升级→KP 无底 sink | **backlog**（根因 D，S14 后续批） |
| F-2 重复装备/角色回收出口 | **backlog**（P2-21/P2-10） |
| F-3 成长可视化兑现时刻 | **backlog**（养成 UI 轮次） |
| F-4 SA-T4 覆盖扩全 66 UR / HR 差异化被动 | **backlog + 本轮明确拒绝扩表**（合同 L94 拒绝 20，本轮零扩表 plan T4-R1） |

---

## B. Product Evolution Reviewer（evolution-audit-report.md）

### 🔴 Critical

| # | 建议 | 本轮判定 | 理由 + 本轮行动 |
|---|---|---|---|
| SA-T4 机制层差异红线（押 8~12 别冲 20，宁 6 真不同别 12 微调） | **接受（已落地维持）+ 本轮零扩表** | 落地 10 签名 UR、差异机制层。→ 本轮**严禁扩到 20**（plan T4-R1）。 |
| SA-T4 两纠偏：①纯数据不写 handler ②头部手写+长尾分档 | **部分接受（已落地维持）** | ① 纯数据零 handler、无 /battle effectId 泄漏，已落地维持（plan T4-R4）。② 长尾分档层**维持可选/backlog**——第 2 轮未做（`archetypeEffects` 无 base 锚点分档），Scout 判「本轮零改动最稳」，**本轮不动**（plan T4-R6）。 |
| SA-T5 数值调平：扫荡=首通 30~50%，封顶≈一趟主线量级 | **接受（已落地维持）** | `calculateSweepReward` 0.35× 首通 + sqrt 边际递减 + 绝对封顶。→ 本轮不改数值（plan T5-R4）。 |
| SA-T5 schema 三改+往返+复用 daily 日界 | **接受（已落地维持）** | 见 C-3 / I-4。本轮不再动 schema（plan T5-R1）。 |

### 🟡 Important

| # | 建议 | 本轮判定 | 理由 |
|---|---|---|---|
| E-13 名场面命名 | **接受（已落地维持）** | 签名技能名已借个人技 `.name` 名场面命名，护城河数据首次露头。 |
| SA-T5「一键领取」+「今日 N/M」进度条 | **接受（已落地维持）** | plan T5-R7。 |
| 候选池同源守卫 + `ref<any>` 类型化 | **部分接受** | 同源守卫已落地（集合不变专测，plan T4-R5）；「候选池抽共享纯函数」仍 backlog（超最小承诺，断言守卫已足够）；`ref<any>` 触及才做。 |

### 🟢 Nice-to-have

| # | 建议 | 本轮判定 | 理由 |
|---|---|---|---|
| SA-T3 旧档 statPoints 一次性重算（搭 SA-T5 schema 便车） | **拒绝（本轮）→ backlog** | 维持第 1 轮 SA-T3 拍板③「只影响未来升级」。v15 是最高风险动作、已稳定，本轮**明确不再动 schema**，重算迁移搭车即使 v15 已升也纯增往返风险、单机向存量极少不划算（plan T5-R6）。 |
| S14-C P2-12 推荐战力/胜率提示 | **backlog**（S14-C） |
| onboarding 首访引导 | **backlog**（先有循环再引导） |

### 💡 Feature Idea

| 同番羁绊 / 家园今日来访 / 品味契合社交 | 全 **backlog**（S14-C/D/F 护城河，范围外） |

---

## C. Product Research Reviewer（research-audit-report.md）

### 🔴 High-impact, Low-effort

| # | 建议 | 本轮判定 | 理由 |
|---|---|---|---|
| R2-1 SA-T4 分档层用绝对锚点不用同原型均值 | **接受（作为分档前置约束）+ 本轮分档不做** | 洞察成立（同原型均值需全体列表→污染单角色纯函数）。第 2 轮未做分档，**本轮维持不做**（plan T4-R6）；若未来做须绝对锚点。 |
| R2-2 SA-T4 覆盖只提供 effects + 守卫无手写 description/无 handler | **接受（已落地维持）** | plan T4-R3/T4-R4，专测守卫在。 |
| R2-3 SA-T5 紧凑定长存档 + 复用 daily 日界 + 资格复用 hasCompletedFloor | **接受（已落地维持）** | 扁平定长 `sweepWeekKey`/`sweepUsedThisWeek`、复用 weekKey 范式、资格走 `hasCompletedFloor`（plan T5-R2/R3/R5）。 |
| R2-4 SA-T5 扫荡产出对 floor 边际递减/封顶 | **接受（已落地维持）** | sqrt 边际递减 + 绝对封顶，测试覆盖 floor=1 与 high。→ 本轮复跑守回归（plan T5-R4）。 |

### 🟡 High-impact, High-effort

| # | 建议 | 本轮判定 | 理由 |
|---|---|---|---|
| R2-5 SA-T5 周上限区间扫荡（优于每日 N 次） | **接受（已落地维持）** | 落地周上限=10（明日方舟剿灭范式），存档只记 weekKey。→ 本轮不改（plan T5-R1/R4）。 |
| R2-6 SA-T4 签名定位与 base 对齐 + 导出 isSignatureKit | **接受（已落地维持）** | `isSignatureKit(characterId)` 已导出留口；签名定位与 base 倾向对齐。→ 本轮不改。 |

### 🟢 Thought-provoking

| # | 建议 | 本轮判定 |
|---|---|---|
| R2-7 archetype 从双职瘦身为单职 | **部分接受（已隐含维持）**——SA-T3 成长走 base 不走 archetype 已隐含，不作独立重构。本轮不动。 |
| R2-8 SA-T5 扫荡产出道具化 | **部分接受（已落地维持命名口）**——中性/道具化命名留演化口已落地；背包实做仍 backlog。 |

### 💡 Wild idea

| R2-9 描述即行为 DSL / R2-10 同番羁绊编队 buff | 全 **backlog**（远期范式 / S14-D/F 护城河） |

---

## 关键裁决（本轮供 Generator 定心）

1. **本轮 = 零改动确认**：切片两 SA-T 第 2 轮已 COMPLETE、Scout 第 3 轮核实全部拍板落地、无未落地项、无新坑。**若无三审新 refine 指令，Generator 正确动作 = 不动源码、复跑 5 条验收全绿**。切勿为「凑改动」去动稳定实现。
2. **两条硬拒绝（防越界）**：① **SIGNATURE_KIT 不扩到 20**（合同 L94 已拒绝 FUTURE.md 数字，本轮零扩表）；② **v15 schema 不再动、扫荡存档字段不改**（v15 是本 sprint 唯一升级、最高风险动作、已稳定，再动纯增风险）。
3. **旧档重算搭便车：继续拒绝**——维持「只影响未来升级」取舍，backlog（plan T5-R6）。
4. **UI 徽章 / 分档层 / 候选池抽共享纯函数 / ref<any> 类型化**：均非本轮硬承诺；徽章与分档 backlog，后二者「触及才顺手」，本轮零改动定位下倾向不动。
5. **SA-T6 不在本轮切片**：第 3 轮切片仍 = SA-T4 + SA-T5；SA-T6（依赖 SA-T1，三 tab 去重）本 product-loop 3 轮范围之外，维持 `[ ]`，S14-A 整体完成待后续轮次收口 SA-T6。

---

**一句话收尾**：第 3 轮是 tier1-on 引擎跑满的**验收再确认轮**——三审所有落地建议本轮转为「已落地维持、复跑守回归」，两条硬拒绝（不扩签名表到 20、不再动 v15 schema）钉死越界口，超范围创意全归 backlog；Generator 若无新 refine 指令应零改动复跑验收全绿，守住已 COMPLETE 的稳定切片。
