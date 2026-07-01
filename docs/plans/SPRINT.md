# AnimePlay — SPRINT 合同（S14-D：家园机制闭环 + 经济闭环）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-D 全部任务（SD-T1..SD-T5）**。
> Tier1 三审用于 **refine HOW + 抓回归 + 微调**；「不开新范围」= 不超出 S14-D，**绝不表示可以跳过本轮被指派的 SD-T 任务**（S14-A SA-T6、S14-B 暴击UI显形均曾因此被漏，严禁重演；见 pitfalls）。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14-D、`docs/orch/homestead-hub-audit-report.md`（P#-# 证据源，本 Sprint 对应根因 D/E）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法二次元网页游戏（单机向，对标 PCR 但不追付费竞技）。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 相关面：家园页 `frontend-vue/src/views/HomesteadView.vue`（设施 facilityRows / comfort / 离线收益）+ `stores/homestead.ts` + `config/homestead.ts`（`computeIdleYield`）+ 门面 `stores/userStore.ts`（`settleHomestead`）；装备 `config/equipment.ts`（含 `homeEffect`）+ `stores/equipment.ts` + `components/nurture/{EquipPickerModal,InventoryPanel}.vue` + `engine/squad/drops.ts`（塔掉落）；养成曲线 `engine/nurture/rules.ts`（`getRequiredExpForLevel`）+ `config/nurture.ts`（补习）；货币 `stores/profile.ts`（`spend/earn`）；存档 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts`（当前 SAVE_VERSION=16）。
- 本 Sprint = **S14-D 家园机制闭环 + 经济闭环**：把「设施纯展示不可升级、comfort 死数值、挂机产出恒定、装备两目标抢同槽、重复装备无出口、经验曲线与产出错配、KP 无底 sink 缺失」补成「家园是可投资的经营系统 + KP 有长期去处 + 重复装备有出口 + 经验不打进黑洞」。

## 现状根因（S14-D 逐个拆解，对应审计根因 D/E）
1. 设施纯装饰：`HomesteadView.vue facilityRows` 仅把 hourlyYield 套标签渲染，无升级入口，全仓无 facility store/config/schema 域。
2. comfort 死数值：`config/homestead.ts computeIdleYield` 原样透传 comfort、从不参与计算，却在最显眼位大字展示。
3. 挂机恒定：IDLE_*_PER_HOUR 固定、12h 封顶不随进度成长、homeEffect 硬封顶 0.6。
4. 装备两目标耦合：`config/equipment.ts` 每件同带 bonus(战斗) 与 homeEffect(挂机)，抢同三槽、选装口径打架。
5. 重复装备无出口：`equipment.ts addItem` 只 push 从不去重，无 dismantle/sell/merge，齐装后纯堆积。
6. 经验曲线错配：满级需 (100-1)²×1000≈980 万，挂机 2400/12h、塔百层每人才 1040，满级后经验全沉没。
7. KP 无底 sink 缺失：KP 唯一硬通货但 sink 全是买断目录（装备45件封顶/图鉴/补习），集齐即溢出贬值。

## 架构铁律（不可违反）
engine 纯净（`frontend-vue/src/engine/**` 零 Vue/Pinia/DOM/IO/`Math.random`；设施产出/曲线/分解结算走纯函数，随机走注入 RNG）/ 依赖只向下 / **货币只走 `profile.spend·earn`**（KP 升级设施、分解得 KP 都必须走它）/ 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类，稀有度色用完整字面映射）/ 组件 setTimeout·rAF 登记并卸载清除 / 改文件前先 Read / 改养成或挂机规则前先看对应 `*.test.ts`。**别破坏 S14-A/B/C 已成 17 项**（尤其：家园挂机 computeIdleYield 口径 / 装备系统 / 养成后战力单一 seam resolveNurturedBattleStats / 好感永久加成 / 突破 v16 / 塔软门槛）。
**存档变更协议（SD-T1 需要，SD-T3 可能）**：新增/改存档字段必须 **schema + migrations + 装配器（stores/persistence.ts）三处同改 + 往返测试**；SAVE_VERSION 现=16，本 Sprint 升 **17**（一次 sprint 只升一次，facility 域 + 任何其它新字段共用同一 bump；v16→v17 迁移把旧档补默认设施等级 0/1）。

## 任务清单（S14-D = SD-T1..SD-T5）

- [x] **SD-T1｜三设施做成可升级产出乘区（P2-25 / P2-26 / P2-24，核心）**
  - 目标：新增 facility 存档域（训练区/休息区/资料室各一等级），用 **KP 升级**（`profile.spend`）每级 +X% 对应产出（经验/好感/知识点），**comfort 接一档真实软加成**（不再死数值），挂机产出封顶随设施等级抬升 → 形成「挂机产 KP → 升设施 → 挂机更快」自循环。存档三处同改 + 往返测试 + **SAVE_VERSION→17**。engine 纯函数算设施加成 + 并入 `computeIdleYield` 口径。UI 在 HomesteadView 给设施升级入口 + 等级/花费/下一级收益展示。
  - 验收：设施可 KP 升级、产出随等级真实提升、comfort 真进收益计算、封顶随等级抬升；engine 纯函数测试 + v17 迁移往返测试；不破坏现有挂机口径；type-check/test/build 通过。
- [x] **SD-T2｜装备的家园 homeEffect 逐步剥离到设施（P2-13，依赖 SD-T1）**
  - 目标：把家园挂机加成的主承载从「装备 homeEffect」迁到「设施升级」，装备回归纯战斗（或大幅弱化 homeEffect 权重）；至少先在 `EquipPickerModal` 补挂机 delta 预览让口径透明。迁移要平滑不砸档（不删存量装备、不破坏 computeIdleYield 往返）。
  - 验收：家园产出主要由设施驱动、装备选装不再两目标打架；EquipPicker 展示挂机 delta；不破坏挂机/装备测试；type-check/test/build 通过。
- [x] **SD-T3｜给重复装备加回收 / 分解出口（P2-21）**
  - 目标：`equipment.ts addItem` 齐装后重复实例纯堆积——加**分解**出口：重复/多余装备分解为 KP（走 `profile.earn`，复用 codex 分解范式的口径）或合成/升级材料（为 S14-E 装备强化留燃料）。engine 纯函数定分解产出（按稀有度），store 执行。UI 在背包给分解入口 + 防呆（已装备/最后一件保护）。
  - 验收：重复装备可分解为 KP/材料、已装备与保护件不被误分解；engine 分解产出测试 + store 测试；type-check/test/build 通过。
- [x] **SD-T4｜修经验曲线 / 产出错配（P2-19）**
  - 目标：把满级经验曲线压到与产出匹配量级（如 level^1.6 或降系数，`getRequiredExpForLevel`）或提产出；满级后经验给**溢出出口**（转道具 / 少量 KP，不再沉没）；补习产出可随等级递增。曲线改动是纯计算（exp 存档、level 派生），注意重标定后战力区间可接受（单机无 PvP）。
  - 验收：曲线与产出匹配（给出标定依据）、满级经验有溢出去向、补习不再定额沉没；rules 测试更新；不破坏等级/加点/突破链；type-check/test/build 通过。
- [x] **SD-T5｜加无底 KP sink（P2-20）**
  - 目标：确保存在至少一条**无底 / 长期 KP sink**——设施升级（SD-T1）是主体无底 sink；如仍不足，加每日刷新定向兑换 / 塔商店限量高价物之一。目标是「成型账号 KP 有持续去处、不溢出贬值」。走 `profile.spend`。
  - 验收：存在可持续消耗 KP 的长期出口（设施无上限或高上限 + 递增成本，或 KP 商店）、成型账号 KP 不再只增不减；相关测试；type-check/test/build 通过。

> **排期建议（每轮必须完成被指派任务，不得空跑）**：
> - 第 1 轮 = **SD-T1 + SD-T5**（设施可升级 v17 = 家园经营核心 + 无底 KP sink 主体，共用 v17 bump、天然一体）。
> - 第 2 轮 = **SD-T2 + SD-T4**（homeEffect 剥离到设施[依赖 SD-T1] + 经验曲线/满级溢出）。
> - 第 3 轮 = **SD-T3**（装备分解出口，为 S14-E 强化留燃料）+ 收尾（确保 SD-T1..T5 全 `[x]`、无回归）。
> 每轮务必保持验收命令全绿、每子项独立可合并。v17 bump 仅第 1 轮做一次，后续轮复用不再升。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 homestead/equipment/nurture/migrations 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-D 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SD-T* 任务全部 `[x]` 并与实现一致。**S14-D 整体完成** = SD-T1..SD-T5 全 `[x]`。

---

## 第 1 轮追加任务（S14-D product-loop --tier1 on --mode all，切片 = SD-T1 + SD-T5）

> 本轮承诺 = 真落地 **SD-T1（三设施可升级产出乘区，facility 域 v17）+ SD-T5（无底 KP sink，由无上限/高上限递增成本设施承载）**。二者天然一体、共用**唯一一次 v17 bump**。SD-T2/T4 = 第 2 轮，SD-T3 = 第 3 轮，本轮不做。以下为在主清单 SD-T1/SD-T5 之上，本轮拍板的关键设计决策 + 采纳的 Scout/Reviewer refine 子项（不是重复主清单条目，是把 HOW 边界钉死进验收）。

### 本轮关键设计决策拍板（写进验收，Generator 必须照此实现）

- [x] **决策-1｜facility 独立域**：facility 走**独立 store（`stores/facility.ts`）+ 独立 schema 域 key = `facility`**，不并入 `homestead`（HomesteadSave 单一职责只管入住，混入会污染）。域 key `facility` 在 schema/migrations/persistence 装配器/store/测试五处命名一次定死、全程一致。
- [x] **决策-2｜三设施 key 沿用现有 facilityRows**：`exp`（训练区，↑经验）/ `bond`（休息区，↑好感）/ `knowledge`（资料室，↑知识点）。**不新造 key**，否则 HomesteadView facilityRows 要重接。
- [x] **决策-3｜初始等级 Lv.1（+0% 乘区）**：`createDefaultFacility()` 与 v16→v17 迁移旧档补默认**都必须是 Lv.1、加成 +0%**。**禁止 Lv.0=关闭产出**（旧档补 Lv.0 会让现有玩家挂机产出突然归零 = 严重回归）。升级从 Lv.1→Lv.2 起才有正加成。
- [x] **决策-4｜每级加成幅度**：每设施每级对**对应单一产出**（exp→expEach / bond→affectionEach / knowledge→knowledge）**+8% 线性乘区**（Lv.1=+0%，Lv.N=(N-1)×8%）。守 `config/homestead.ts` 顶部「挂机是回归补充、不盖过主动收入」基线——加成温和、别给太猛。（幅度 8% 为拍板值，Generator 若有充分理由微调须在 config 注释说明并保持温和。）
- [x] **决策-5｜设施乘区独立于装备 0.6 cap**：设施乘区**不走 `effect.expPct/affectionPct/knowledgePct`、不受 `HOMESTEAD_EFFECT_CAP`(0.6) 钳制**（否则升满设施也只到 +60%，无底 sink 失去意义）。设施乘区作为**独立参数/独立乘子**并入 `computeIdleYield` 口径（推荐新增设施乘区入参，不折进装备 effect）。装备 homeEffect 与 0.6 cap 本轮**不动**（那是 SD-T2 范畴）。
- [x] **决策-6｜comfort 接一档真实软加成**：comfort 由「只展示的死数值」改为**真进产出计算**——每 10 点 comfort → 全产出（exp/affection/knowledge 三者）+1%，**软加成封顶 +20%**（防装备叠满爆表）。comfort 来源本轮仍为装备 `homeEffect.comfort` 求和（不改来源），但生效逻辑**别写死绑「装备 comfort」**，为 SD-T2 把 comfort 来源迁到设施留出空间（跨轮一致性）。
- [x] **决策-7｜离线封顶随设施等级抬升**：`OFFLINE_CAP_HOURS`(12h) 的**离线时长封顶**随三设施等级之和（或最高级）抬升，如 `12 + 设施总级数×0.5h`（拍板：每升一级总封顶 +0.5h，Lv.1×3=基线 12h）。这是 SD-T1「封顶随设施等级抬升」的落点，**与装备 pct 上限 `HOMESTEAD_EFFECT_CAP`(0.6) 严格区分、别混淆**。改 `cappedIdleHours`/`computeIdleYield` 签名时须过一遍 `HomesteadView.hourlyYield`（传 1h，永不触顶，安全）与 `userStore.settleHomestead`（传真实 elapsed，会触顶）两个调用点，保证**口径同源**（UI 显示 +X% 必须 == 实际结算，否则又一个「预览≠实战」欺骗）。
- [x] **决策-8｜无底 sink = 无硬上限 + 指数递增成本（SD-T5 主体）**：设施**无硬上限**（或极高上限如 Lv.99），升级成本走**指数/多项式递增纯函数**（如 `base × growth^(level-1)`，base 与 growth 为 config 常量、拍板 growth≈1.35~1.5），保证「第 N 级成本 > 第 N-1 级」。**禁止定额成本**（定额=买断，架空 SD-T5）。走 `profile.spend('knowledgePoints', cost)` 唯一入口，余额不足返回 false 不 levelUp。**本轮不另造 KP 商店/每日兑换**（Scout 确认无底设施足矣，别开新范围）。
- [x] **决策-9｜升级门面走 userStore**：新增 `userStore.upgradeFacility(key)` 门面动作——登录校验 → `profile.spend` 成功才 `facility.levelUp` → `saveToServer()`（仿 `placeInHomestead`）。组件禁直改 `core.knowledgePoints`。
- [x] **决策-10｜存档三处同改 + v17（唯一一次 bump）**：新增 facility 域必须 **schema（`FacilitySave` + `createDefaultFacility()` + 挂 `SavePayload` + `SAVE_VERSION 16→17` + 顶部沿革注释加 v17）+ migrations（`migrateFacility` 白名单重建、禁 spread 浅拷贝、每字段类型守卫 + 等级 clamp 到 [1, MAX]、`migrate()` return 加一行）+ 装配器 persistence.ts（buildPayload/applyPayload/resetAllDomains 三行）** 同改。migrations.test.ts 加 `describe('v17 facility 迁移')`（旧档补 Lv.1 缺省 + 已存往返保真 + 脏档 clamp 三件套）。**本轮不为后续轮（SD-T3 材料字段）预留任何字段**（YAGNI）。

### 本轮验收（在主清单 SD-T1/SD-T5 验收之上补充）

- [x] SD-T1：三设施可 KP 升级；对应产出随等级真实提升（决策-4 幅度）；comfort 真进收益计算（决策-6）；离线封顶随设施等级抬升（决策-7）；`config/homestead.ts` 设施乘区/成本/comfort 软加成纯函数测试；`migrations.test.ts` v17 迁移往返 + 脏档 clamp 测试；**UI 显示的 +X%/下一级收益与实际结算同源一致**；不破坏现有挂机口径（现有 computeIdleYield 断言全绿）。
- [x] SD-T5：设施无硬上限（或高上限）+ 成本随等级递增（测试锁「第 N 级成本 > 第 N-1 级」）；成型账号 KP 有持续去处、不再只增不减；全走 `profile.spend`。
- [x] 验收命令 1/2/3/4 全绿、命令 5 零命中（原样见本文件「验收命令」段）；SD-T1、SD-T5 在主清单勾 `[x]`；`docs/FUTURE.md` S14-D 对应两条同步勾 `[x]`。

---

## 收尾轮追加任务（S14-D product-loop --tier1 on --mode all，切片 = SD-T2 + SD-T4 + SD-T3）

> **工作树核实结论（重要，纠正 orchestration 的模板占位符 `第 undefined 轮 / slice=[native code]`）**：截至本轮开始，工作树里 **只有 Round 1（SD-T1 + SD-T5）真实落地**（facility 域 v17 + `stores/facility.ts` 齐全）。**排期建议里的「第 2 轮 SD-T2+SD-T4」从未落地**——实证：`engine/nurture/rules.ts:35 getRequiredExpForLevel` 仍是 `(level-1)²×1000`（曲线未压）；`EquipPickerModal.vue` 只有静态 `homeText`、无挂机 before→after delta；`config/nurture.ts`/`stores/nurture.ts` 只有好感溢出（SC-T4，S14-C 遗产）、**无经验溢出出口**；`TUTORING_EXP_GAIN=500` 仍定额。故本轮 = **S14-D 收尾轮，必须真落地全部剩余任务：SD-T2 + SD-T4 + SD-T3**，一次补齐让 S14-D 整体完成（SD-T1..T5 全 `[x]`）。**严禁只做回归确认而跳过任一未完成任务**（S14-A SA-T6 / S14-B 暴击 UI 教训：Sprint 合同内未完成任务永远 in-scope，跑满轮次 ≠ 目标达成）。
>
> **本轮 SAVE_VERSION 不动（仍 v17）**：SD-T2 = 装备配置权重迁移（纯数据）；SD-T4 = 纯计算曲线重标定 + 满级溢出走 `profile.earn`（不新增字段）；SD-T3 = 分解走「移除背包实例 + `profile.earn` 得 KP」（equipment 域 v14 已存，inventory 是既有数组，删元素 + 得 KP 无需新字段）。**三者均无新存档字段，本 Sprint 唯一一次 bump 已在 Round 1 用掉（v17），本轮不得再 bump**。

### 本轮关键设计决策拍板（写进验收，Generator 必须照此实现）

- [x] **决策-11｜SD-T2 剥离力度 = 装备 homeEffect 产出%大幅弱化（非彻底归零），comfort 全保留**：把 `config/equipment.ts EQUIPMENT_CATALOG` 每件 `homeEffect.expPct/affectionPct/knowledgePct` **下调到「小额佐料」量级（拍板：统一按约 1/3 缩放，即当前值 ×0.33 后就近取整到 0.01 步进）**——装备挂机%从「主承载」退成「点缀」，家园产出主体由设施乘区（Round 1）承载，二者不再抢同一杠杆。**comfort 数值全部保留不动**（comfort 是独立软加成轴，Round 1 已接成真加成，「戴好装备略舒适」语义留住）。**理由**：走「弱化」而非「归零」比彻底删 pct 更平滑、观感更自然（毕业角色仍有微弱家园收益），且不砸档、不动 `computeIdleYield`/`resolveHomeEffect` 签名。
- [x] **决策-12｜SD-T2 弱化只改 catalog 数据，禁引入第二口径**：弱化**只改 `EQUIPMENT_CATALOG` 的数值**（纯数据），不在某个消费点单独打折、不加运行期权重旋钮绕过。`resolveHomeEffect`（唯一求和口）+ 两调用点（`HomesteadView.homeEffect` 预览 / `userStore.settleHomestead` 结算）口径保持同源（Round 1 焊死的命脉不许破）。**别动 `HOMESTEAD_EFFECT_CAP`(0.6)**（机制留着，弱化后自然更难触顶）。改数值后须同步更新任何断言 catalog homeEffect 具体值的测试（先 grep `homeEffect`/`resolveHomeEffect`/`expPct` in `src/**/*.test.ts` 全量核对）。
- [x] **决策-13｜SD-T2 EquipPickerModal 补挂机 before→after delta（⭐必做，SPRINT 明列低成本子项）**：在配装弹窗为每个候选装备补「换上后该角色**三槽合计** homeEffect 的 current→next delta」预览（经验%/好感%/知识%/舒适，非单件静态文案）。**必须仿现有战斗五维 delta 范式**（`previewEquipBonus` 替换当前槽后三槽求和 → 逐维 next−cur），数据源 `getEquipped(charId)` + `getEquipmentDef(uid).homeEffect` 求和，**无需新 seam**。用语义色令牌（`text-success`/`text-danger`/`text-ink-3`，复用 `deltaClass`）；禁 text-white 压浅底、禁拼接动态色类、禁反斜杠透明度。
- [x] **决策-14｜SD-T4 主走「压曲线」，公式 = `round((level-1)^1.6 × 900)`（严格单调递增）**：把 `getRequiredExpForLevel` 从 `(level-1)²×1000` 改到与产出匹配量级。**拍板 `(level-1)^1.6 × 900`**（系数 900 为拍板值，Generator 若微调须在注释给标定依据）。**硬约束**：曲线必须**严格单调递增**（`getLevelFromExp` 靠 `while` 反推，同值台阶会死循环/错级；`Math.pow(n,1.6)` 满足），加一条测试锁「相邻级严格递增」。标定依据写进注释：给出「新曲线下满级 Lv.100 所需总经验 ≈ N 趟满设施挂机 / M 层塔」的量级说明，守 config「养成不做火箭、但满级可达」。**只动等级经验轴，别碰突破（重复卡，S14-C）/好感（里程碑）轴。**
- [x] **决策-15｜SD-T4 rules.test.ts 按新曲线重算全部硬编码断言（不是删测试）**：`rules.test.ts` 的关键节点值（`getRequiredExpForLevel(2)/(3)/(10)/(100)` + `getLevelFromExp` 边界 + `getLevelProgress` 绝对值）**全部按 `(level-1)^1.6×900` 重算填新值**，另加「曲线严格单调递增」守卫测试。这是 SD-T4 最大测试面，**重标定不是降覆盖**。
- [x] **决策-16｜SD-T4 满级经验溢出 = 自动转少量 KP（沉没点在 `addCharacterExp`，非 tutorCharacter）**：`addCharacterExp` 满级后（`newLevel >= MAX_CHARACTER_LEVEL` 且 totalExperience 超满级阈值的净额）把**超出经验自动兑少量 KP**（走 `profile.earn('knowledgePoints')`，别沉没）。**范式抄好感溢出**（`config/nurture.ts bondOverflowExchange` 纯函数「每 N 点兑 1 KP」+ store 执行 earn）：新增 `EXP_OVERFLOW_PER_KP` 常量 + `expOverflowExchange` 纯函数（config）+ `addCharacterExp` 满级分支调用（store 执行 earn + 日志）。**拍板自动转**（挂机/塔满级角色经验实时转 KP、无感），避免又一个「攒了不领」死数值。**注意**：沉没点是 `addCharacterExp`（挂机 / 塔仍照灌），不是已拒收的 `tutorCharacter`——溢出出口必须加在 `addCharacterExp` 满级分支，否则塔/挂机满级经验继续沉没、验收不成立。溢出汇率守「溢出是补偿不是新赚钱路，明显低于分解/主动收入」。
- [x] **决策-17｜SD-T4 补习产出随等级递增（纯函数，传 level）**：`TUTORING_EXP_GAIN` 从定额常量改「随等级递增纯函数」`tutoringExpGain(level)`（拍板：线性缓增，如 `base + level × k`，base/k config 常量，量级与新曲线匹配，别让补习变刷级捷径）。`tutorCharacter` 先取 `nurtureData.level` 再调函数。**顺带查 UI**：`NurtureView` 补习按钮若显示「+500 经验」静态文案须改动态。补习成本可保持定额或同步微增（Generator 拍板，守「补习是 KP sink 不是提款机」）。
- [x] **决策-18｜SD-T3 分解出口 = 重复/多余装备分解为 KP（走 `profile.earn`），本轮不做材料/合成、不升档**：`equipment.ts` 加 `dismantleItem(uid)` —— 移除背包该实例 + 按稀有度得 KP（走 `profile.earn('knowledgePoints')`）。**分解产出纯函数放 config/equipment.ts**（`dismantleValueForRarity(rarity)`，按稀有度阶梯，**明显低于兑换价 `EQUIPMENT_PRICES`**——分解是回收不是套利，别让「买 R 拆 R」有利可图）。**范式对齐 codex `collection.dismantleCard`**（earn KP + 日志 + count>1 保护）。**本轮不做 N 件合成材料 / 碎片计数 / 装备强化燃料**（那是 S14-E，YAGNI，不升档、不预留字段）。
- [x] **决策-19｜SD-T3 防呆保护 = 已装备件不可分解 + 至少保留概念下的安全删除**：`dismantleItem` 必须拒绝分解「当前被任意角色任意槽装备中的实例」（用 `findEquippedBy(uid)` 校验，命中则拒绝返回 false + 提示）。分解入口在背包 UI，UI 侧对已装备件禁用/隐藏分解按钮 + store 侧二次守卫（双保险，别只靠 UI）。**门面走 userStore**（`userStore.dismantleEquipment(uid)`：登录校验 → `equipment.dismantleItem` 成功 → saveToServer，仿既有装备门面），组件禁直改 inventory/货币。删除实例后须保证配装引用一致（已装备件已被拒，删的必是游离件，不会产生孤儿引用）。
- [x] **决策-20｜SD-T3 engine/store/config 分层**：分解**产出纯计算**（按稀有度→KP）放 `config/equipment.ts`（config 允许纯函数，或若走 engine 则收已解析 rarity、engine 不 import config）；**副作用（移除实例 + earn KP）在 store/门面**；UI 只调门面。engine 纯净铁律不破。

### 本轮验收（在主清单 SD-T2/SD-T3/SD-T4 验收之上补充）

- [x] SD-T2：家园挂机产出主体由设施乘区驱动、装备 homeEffect 产出%退成小额佐料（catalog 数值弱化，决策-11/12）；装备选装不再「战斗 vs 家园」两目标抢同槽打架；**EquipPickerModal 展示挂机 before→after delta**（决策-13，仿战斗 delta 范式、语义色）；`resolveHomeEffect` 唯一口径同源不破（预览==结算）；相关 catalog homeEffect 断言测试同步更新全绿；不破坏挂机/装备现有测试。
- [x] SD-T4：经验曲线压到与产出匹配（`(level-1)^1.6×900`，注释给标定依据，决策-14）、严格单调递增（守卫测试）；`rules.test.ts` 全部硬编码断言按新曲线重算 + 递增守卫（决策-15）；满级经验有溢出去向（`addCharacterExp` 满级自动转少量 KP，走 `profile.earn`，决策-16，用「已满级角色继续吃经验」用例测溢出）；补习产出随等级递增（`tutoringExpGain(level)`，决策-17，UI 文案动态）；不破坏等级/加点/突破/好感链；`profile.earn/spend` 唯一货币口。
- [x] SD-T3：重复/多余装备可分解为 KP（`dismantleItem` + `dismantleValueForRarity`，走 `profile.earn`，产出明显低于兑换价，决策-18）；**已装备件与游离件区分、已装备件不被误分解**（`findEquippedBy` 守卫 + UI 禁用，决策-19）；门面走 `userStore.dismantleEquipment` + saveToServer（决策-19）；engine/store/config 分层不破（决策-20）；engine 纯函数/store 分解测试（含已装备拒绝、稀有度产出、count 保护）；type-check/test/build 通过。
- [x] 验收命令 1/2/3/4 全绿、命令 5 零命中（原样见本文件「验收命令」段）；**主清单 SD-T2/SD-T3/SD-T4 全勾 `[x]`**（至此 SD-T1..T5 全 `[x]` = S14-D 整体完成）；`docs/FUTURE.md` S14-D 对应三条同步勾 `[x]`（附落地实况）。
- [x] **本轮 SAVE_VERSION 保持 v17 不变**（无新存档字段）；不破坏 Round 1 facility 域 v17 往返测试与既有 S14-A/B/C 17 项。
