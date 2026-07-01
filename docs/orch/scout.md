# Scout Report — Iteration 2 (S14-D, product-loop --tier1 on --mode all)

> ⚠️ orchestration 传入的「第 undefined 轮 / 切片 [native code]」是**未渲染的模板占位符**。以工作树实际状态推定：
> **Round 1（SD-T1 + SD-T5）已 COMPLETE 并落地工作树**（facility 域 v17 齐全：`stores/facility.ts` + schema/migrations/persistence 三处 + v17 往返测试；见上一轮 plan/gen_status/eval 三份均「第 1 轮 COMPLETE」）。
> 故 **本轮 = 第 2 轮**，指派切片 = **SD-T2（装备 homeEffect 剥离到设施）+ SD-T4（经验曲线—产出错配修正 + 满级溢出 + 补习递增）**（SPRINT.md L47 排期建议第 2 轮）。SD-T3 = 第 3 轮，本轮**不做**。
> **本轮不再 bump SAVE_VERSION**（仍 v17）——SD-T2 是配置权重迁移（纯数据）、SD-T4 是纯计算曲线（exp 存档、level 派生），二者**都不需要新存档字段**（决策见 A 段）。

---

## A. 约束与可行性（给 Planner）

### SD-T2｜装备的家园 homeEffect 逐步剥离到设施 — 可行，低—中工作量，无存档变更。

**三审方案在代码里成立且已被 Round 1 铺好路：**
- Round 1 已把家园产出主承载迁到**设施乘区**（`facilityBonusPct` 独立乘子，不受 0.6 cap 钳制，`config/homestead.ts:189-194`）。设施现在是「家园加成主体」——SD-T2 只需**弱化装备侧 homeEffect 的权重**，让「设施驱动为主、装备 homeEffect 为辅或归零」，二者不再抢同一杠杆。
- 装备 homeEffect 的**唯一消费口是 2 处，且已同源**（口径命脉已在 Round 1 焊死，SD-T2 不会引入预览≠实战）：
  1. `stores/equipment.ts:126 resolveHomeEffect(charId)` → 求和三槽 `def.homeEffect`（`sumHomeEffects`）。
  2. 两个调用点都喂同一 `sumHomeEffects(...placedIds.map(resolveHomeEffect))`：`views/HomesteadView.vue:180-183 homeEffect` computed（UI 预览）与 `stores/userStore.ts:439 settleHomestead`（实际结算）。
- **剥离的三条可选路径（Planner 拍板，按侵入度升序）：**
  1. **权重弱化（最平滑，推荐主体）**：在 `config/equipment.ts` 把 `EQUIPMENT_CATALOG` 每件 `homeEffect.expPct/affectionPct/knowledgePct` 乘一个 < 1 的权重（或直接下调数值），让装备挂机%从「主承载」退成「小额佐料」。**纯数据改**，不动任何签名、不动存档、`resolveHomeEffect`/`computeIdleYield` 口径不变。comfort 可保留（见下）。
  2. **彻底归零 pct、保留 comfort**：把每件 `homeEffect` 的三个 pct 删空、只留 `comfort`——装备回归「纯战斗 + 一点舒适度」，家园产出%完全由设施承载。comfort 现在（Round 1）已是真软加成（每 10 点 +1%，封顶 +20%，`computeIdleYield:187`），保留 comfort 让「戴好装备略微舒适」的语义仍在，但不再与设施乘区抢「产出%」这个目标轴。
  3. **加常量旋钮**：在 `config/homestead.ts` 或 `equipment.ts` 加 `EQUIPMENT_HOME_EFFECT_WEIGHT` 常量，`resolveHomeEffect` 或 `sumHomeEffects` 出口处乘它——集中一处调平、便于将来继续调低到 0。**但注意** `resolveHomeEffect` 在 store 层、`sumHomeEffects` 在 config 层，加权重放哪要想清楚（放 config 的 `sumHomeEffects` 会连带影响 `EquipPickerModal` 的展示口径，反而更一致）。
- **EquipPickerModal 挂机 delta 预览（SPRINT SD-T2 明列的低成本子项，⭐必做）**：现状 `EquipPickerModal.vue` 已展示装备的 `homeText`（`formatHomeEffect`，L83/94/110/260 静态文案），但**只显示「该件装备自身的 homeEffect 文案」，没有 before→after delta**（战斗五维/战力有 delta 预览 L143-151，挂机没有）。SD-T2 要补的是**挂机 before→after**：类似战斗 delta，展示「换这件装备后，家园经验/好感/知识 %（或该角色 homeEffect 贡献）的 current→next」。可复用现有 `previewEquipBonus` 的 pattern：算「替换当前槽后的三槽 homeEffect 求和」vs「当前三槽求和」。**注意**：这需要 EquipPickerModal 能拿到「当前角色三槽的 def.homeEffect」——`equipmentStore.getEquipped(charId)` + `getEquipmentDef(uid).homeEffect` 即可，无需新 seam。
- **跨轮一致性（Round 1 gen_status 已留提示，务必遵守）**：`computeIdleYield` 的 comfort 生效逻辑**已不写死绑装备来源**（只读 `effect.comfort` 求和值，`computeIdleYield:182`）。若 SD-T2 要把 comfort 来源也迁到设施（非必需），只需改**来源装配**（`userStore.settleHomestead`/`HomesteadView.homeEffect` 的 `sumHomeEffects` 那一步），`computeIdleYield` 口径无需再动。**但本轮建议 comfort 来源仍留装备**（剥离的是产出%不是 comfort），把 comfort 迁设施属额外范围、非 SD-T2 硬要求。
- **回归红线**：
  - 若走路径 2（pct 归零），现有 `config/homestead.test.ts` 里含 `effect.expPct` 等非零的 computeIdleYield 断言**不受影响**（那些是直接传 effect 参数的单元断言，不读 catalog）；但**任何读 `EQUIPMENT_CATALOG[].homeEffect` 求和的测试**会变——需 grep `homeEffect` in `*.test.ts` 确认（`equipment` store 测试若断言某件的 resolveHomeEffect 具体值，改数值会红，要同步更新）。
  - `formatHomeEffect` 对空 effect（无 pct 无 comfort）返回空串——若归零后某件 homeEffect 全空，EquipPickerModal 的 `homeText` 会变空（L260 `v-if="c.homeText"` 已守，安全）。
  - **别动** `HOMESTEAD_EFFECT_CAP`（0.6）——它是装备 pct 的钳制，弱化装备数值后自然更难触顶，但常量本身留着（SD-T2 不删机制、只调权重）。

### SD-T4｜经验曲线 / 产出错配修正 — 可行，中工作量，纯计算，无存档变更（exp 存档、level 派生）。

**错配现状核实（数据来自代码，SD-T4 标定依据）：**
- 曲线：`engine/nurture/rules.ts:35-38 getRequiredExpForLevel(level) = (level-1)²×1000`。满级 Lv.100 需 **(99)²×1000 = 9,801,000** exp。
- 产出（实测量级）：
  - 挂机 `IDLE_EXP_PER_HOUR=200`（`config/homestead.ts:106`），12h 封顶 = 2400/趟（Round 1 后设施+comfort 乘区最多约 ×(1+0.08×98)×1.2 ≈ 高级设施可放大，但 Lv.1 玩家仍 2400）。
  - 塔通层 `characterExpEach: 80 + floor×12`（`engine/squad/rewards.ts:71`；另有 `characterExp: 40 + floor×10` 在 L99，两处口径需 Generator 确认哪个是实际发放——**Scout 提示：rewards.ts 有两处 exp 常量，SD-T4 改产出侧前必须先厘清哪个真发放**）。第 100 层约 80+1200=1280/人（或 40+1000=1040/人）。
  - 补习：`config/nurture.ts:12-14 TUTORING_KP_COST=100 → TUTORING_EXP_GAIN=500`（定额，`stores/nurture.ts:172-177`）。
- 结论：满级需近千万经验、单次产出几百到几千 → 满级遥不可及；且 `addCharacterExp`（`stores/nurture.ts:117-157`）满级后**照收 totalExperience 但 level 封 100**（`Math.min(getLevelFromExp,MAX)`），超出经验**净沉没无出口**（`tutorCharacter:168` 满级直接拒绝，是唯一「拒收」但挂机/塔仍照灌）。正是审计 P2-19。

**三条修法（SPRINT SD-T4 列全，Planner 定组合）：**
1. **压曲线（推荐主体）**：把 `getRequiredExpForLevel` 从 `(level-1)²×1000` 改到与产出匹配量级（SPRINT/审计建议 `level^1.6` 或降系数）。
   - ⚠️ **`getRequiredExpForLevel` 与 `getLevelFromExp`（rules.ts:41-47）是一对**：`getLevelFromExp` 靠 `while(getRequiredExpForLevel(level+1) <= totalExp)` 反推，只要曲线**单调递增**，反推自动成立，无需同步改。但曲线必须**严格单调递增**（`level^1.6` 满足），否则 `getLevelFromExp` 死循环/错级。
   - ⚠️ **必须过 `rules.test.ts:30-58` 的关键节点断言**（`getRequiredExpForLevel(2)=1000 / (3)=4000 / (10)=81000 / (100)=9801000` + `getLevelFromExp` 边界 + `getLevelProgress`）——改曲线**这些断言必须同步重算**（不是删，是按新公式重标），否则测试红。这是 SD-T4 最大的测试改动面。
   - 标定依据（写进注释）：给出「新曲线下满级所需总经验 ≈ N 趟塔 / M 天挂机」的量级说明，守「养成不做火箭、但满级可达」。
2. **满级经验溢出出口**：`addCharacterExp` 满级后（`newLevel >= MAX_CHARACTER_LEVEL`）把超出的经验转道具/少量 KP（走 `profile.earn`）而非沉没。**范式可抄好感溢出**（`config/nurture.ts:116 bondOverflowExchange` + `stores/nurture.ts:288 claimBondOverflow`：纯函数算「每 N 点溢出兑 1 KP」+ store 执行 earn）——做一个 `EXP_OVERFLOW_PER_KP` 常量 + 满级时自动/手动兑换。**决策点**：溢出是**自动转**（满级挂机/塔经验实时转 KP，无感）还是**手动领**（攒着按钮兑，仿好感）？自动更省心、手动更可控。建议自动（挂机/塔满级角色的 exp 净额直接 earn 少量 KP），避免又一个「攒了不领」死数值。
3. **补习产出随等级递增**：`config/nurture.ts` 把 `TUTORING_EXP_GAIN` 从定额改「随等级递增」纯函数（如 `base + level×k`），或成本随等级递增。**注意**：`tutorCharacter`（`stores/nurture.ts:163`）现在只调常量 `TUTORING_EXP_GAIN`——改成函数要传 level 进去。这也顺带缓解审计 P3-2（补习无决策定额）。

**SD-T4 存档结论：无需升档**。曲线是纯派生（level = f(totalExperience)），改公式**立即对所有存量档生效**（旧档 totalExperience 不变，按新曲线重新派生 level → 可能瞬间跳级，见坑 C-2）。溢出转 KP 用 profile.earn（不新增字段）。补习递增是 config 纯函数。**全程 v17 不动**。

**回归红线（SD-T4）**：
- `SquadBattleView.vue buildCharacterStats` / `resolveNurturedStatPoints`（rules.ts:249）用 statPoints（等级加点）喂战力——压曲线会让角色更快升级 → 更多加点 → 战力上升。**单机无 PvP，塔敌是固定 floorPower**，重标定后战力区间可接受（SPRINT L39 明说），但 Generator 要意识到「压曲线 = 变相加速战力成长」，别压到离谱（守 C1「养成不做火箭」）。
- **别碰 breakthrough/bond 轴**（S14-C 已成）：SD-T4 只动等级经验轴，突破（重复卡）/好感（里程碑）不在范围。

### 一次 bump 纪律 & 范围

- **本轮 SAVE_VERSION 不变（v17）**：SD-T2 = 配置权重（纯数据）、SD-T4 = 纯计算曲线 + profile.earn 溢出，二者**都不需要新字段**。Round 1 已用掉本 Sprint 唯一一次 bump（v17）。SD-T3（第 3 轮，装备分解）**可能**需材料字段——留到第 3 轮，本轮**别预留**（YAGNI）。
- **别开新范围但别跳任务**：本轮**必须真落地 SD-T2 + SD-T4 两个任务**（S14-A SA-T6 教训：Sprint 合同内任务永远 in-scope，不得只做回归确认）。二者验收都要可勾：
  - SD-T2：家园产出主要由设施驱动（装备 homeEffect 权重弱化/归零）、装备选装不再两目标打架、EquipPickerModal 展示挂机 delta、不破坏挂机/装备测试。
  - SD-T4：曲线与产出匹配（给标定依据）、满级经验有溢出去向、补习不再定额沉没、rules 测试按新曲线更新全绿、不破坏等级/加点/突破链。

---

## B. 代码地图与坑（给 Generator）

### 要改/新增的文件

| 文件 | 角色 | 本轮动作（SD-T2/T4） |
|---|---|---|
| `frontend-vue/src/config/equipment.ts` | 装备目录 + homeEffect 定义（`EQUIPMENT_CATALOG` L73、`EquipmentHomeEffect` L21、`sumHomeEffects` L197、`formatHomeEffect` L214） | **SD-T2 改**：弱化/归零 catalog 每件 `homeEffect.*Pct`（保留或弱化 comfort，见 A 路径 1/2/3）。若加集中权重常量放此或 homestead.ts。 |
| `frontend-vue/src/components/nurture/EquipPickerModal.vue` | 配装弹窗（战斗 delta 已有 L143-151，挂机只有静态 homeText） | **SD-T2 改**：补挂机 before→after delta 预览（仿 `previewEquipBonus`/`previewStats` pattern，用 `getEquipped(charId)` + `def.homeEffect` 求和当前 vs 替换当前槽后）。用语义色令牌（`text-success`/`text-danger`/`text-ink-3`，deltaClass L200 已有）。 |
| `frontend-vue/src/engine/nurture/rules.ts` | 经验曲线纯函数（`getRequiredExpForLevel` L35、`getLevelFromExp` L41、`getLevelProgress` L56） | **SD-T4 改**：压曲线（`level^1.6` 或降系数），保持严格单调递增。曲线是 engine 纯函数，改这里即调平。 |
| `frontend-vue/src/engine/nurture/rules.test.ts` | 曲线特征测试（`describe('等级曲线')` L30-58 关键节点 + getLevelFromExp 边界 + getLevelProgress） | **SD-T4 改**：按新曲线**重算**所有硬编码断言值（(2)/(3)/(10)/(100)/边界）。这是 SD-T4 最大测试面。 |
| `frontend-vue/src/config/nurture.ts` | 补习常量（`TUTORING_KP_COST` L12、`TUTORING_EXP_GAIN` L14）+ 溢出范式（`bondOverflowExchange` L116 可抄） | **SD-T4 改**：补习产出改随等级递增纯函数；加满级经验溢出常量/纯函数（仿 bondOverflow）。 |
| `frontend-vue/src/stores/nurture.ts` | 养成 store（`addCharacterExp` L117 满级沉没点、`tutorCharacter` L163 定额、`claimBondOverflow` L288 溢出范式） | **SD-T4 改**：`addCharacterExp` 满级后经验溢出转 KP（走 `profile.earn`，别沉没）；`tutorCharacter` 调补习递增函数（传 level）。 |
| `frontend-vue/src/config/homestead.ts`（可选） | 若 SD-T2 走集中权重常量 | **SD-T2 可选**：加 `EQUIPMENT_HOME_EFFECT_WEIGHT` 常量（若选路径 3）。 |
| 相关 `*.test.ts`（nurture store / equipment store / config nurture） | 覆盖溢出/补习递增/装备权重 | **SD-T2/T4 加/改**：补习递增测试、满级溢出测试、装备 homeEffect 弱化后的 resolveHomeEffect 断言更新。 |

### 关键坑（避免重蹈）

1. **曲线改动是「牵一发」——两处硬编码断言 + 一处单调性守卫（SD-T4 头号坑）**：
   - `rules.test.ts:30-58` 有 5+ 个写死的曲线值（1000/4000/81000/9801000 + getLevelFromExp 边界 999/1000/4000/80999/81000 + getLevelProgress 的 1500/3000/50%）——改曲线**这些全要按新公式重算**，不是删测试。
   - `getLevelFromExp`（rules.ts:41）靠 `while` 递增反推，**新曲线必须严格单调递增**（`level^1.6` 满足，`Math.pow` 别产生同值台阶），否则死循环或错级。加一条测试锁「曲线严格递增」。
   - `getLevelProgress`（rules.ts:56）的百分比派生依赖 `getRequiredExpForLevel(level+1) - getRequiredExpForLevel(level)`——曲线改了它自动对，但测试里的绝对值要重算。

2. **满级经验沉没点是 `addCharacterExp`（nurture.ts:124-127），不是 tutorCharacter**：`tutorCharacter` 满级已拒（L168），但挂机（`settleHomestead` → `addIdleAffection`/`addCharacterExp`）与塔结算**仍照灌** `addCharacterExp`。溢出出口必须加在 `addCharacterExp` 满级分支（`newLevel >= MAX_CHARACTER_LEVEL` 且 totalExperience 超过满级阈值的净额），否则塔/挂机的满级经验继续沉没、SD-T4 溢出验收不成立。

3. **压曲线 = 存量档瞬间跳级（SD-T4 坑 C-2，务必自检）**：曲线是 `level = f(totalExperience)` 纯派生。压曲线后，**现有玩家下次 `addCharacterExp` 触发时 level 会按新曲线重算**（`getLevelFromExp(totalExperience)` 变大）→ 一次补上多级加点（`rollLevelUpStatPoints(oldLevel, newLevel)` 已支持多级跳，nurture.ts:135）。这是**预期行为**（存量经验兑现成应得等级），但要意识到「上线即批量跳级+加点」的观感，注释说明。**不需要迁移**（totalExperience 不变，level 是派生），但 Generator 别误以为要写 migration。

4. **SD-T2 装备 homeEffect 消费已同源，别引入第二口径**：`resolveHomeEffect`（equipment.ts:126）是唯一求和口，`HomesteadView.homeEffect`（L180）与 `userStore.settleHomestead`（L439）都走它。弱化装备数值时**只改 catalog 数据 或 单一权重出口**，别在某一个消费点单独打折（否则预览≠实战，Round 1 焊死的口径命脉被破）。

5. **EquipPickerModal 挂机 delta 别用 catalog 静态值冒充「该角色 delta」**：现有 `homeText`（L260）是「这件装备自身的 homeEffect 文案」（静态）。SD-T2 要的是「换装后**这个角色三槽合计** homeEffect 的 current→next」——必须算三槽求和差值（仿战斗 `previewEquipBonus` L124-135 替换当前槽后求和），不是单件文案。

6. **补习改函数要传 level（SD-T4）**：`TUTORING_EXP_GAIN` 现为常量，`tutorCharacter`（nurture.ts:177）直接 `addCharacterExp(id, TUTORING_EXP_GAIN)`。改随等级递增后签名变函数 `tutoringExpGain(level)`——`tutorCharacter` 先取 `nurtureData.level` 再调。别忘 UI（NurtureView 补习按钮文案若显示「+500 经验」要改成动态）。

7. **货币只走 profile.spend/earn**（架构铁律）：SD-T4 满级溢出转 KP = `profile.earn('knowledgePoints', kp)`；补习扣费仍 `profile.spend('knowledgePoints', cost)`。别直改 core.knowledgePoints。

8. **engine 纯净**（铁律）：`rules.ts` 曲线改动是纯计算，OK 留 engine。补习递增/溢出汇率若含「查表/常量」放 `config/nurture.ts`（config 允许纯函数），engine 只收 number（现 `bondPermanentBonusPct` 已是此范式：config 派生 pct、engine 收 number）。溢出转 KP 的**副作用（earn）在 store**、纯计算（每 N 点兑 1 KP）可放 config（仿 `bondOverflowExchange`）。

9. **颜色令牌**（EquipPickerModal 新增 delta 行）：用 `text-success`/`text-danger`/`text-ink-3`（`deltaClass` L200 已有范式）、`text-accent` 等语义类；禁 text-white 压浅底、禁拼接动态色类、禁反斜杠透明度（`bg-accent\15` 静默失效）。

10. **别开新范围但别跳任务**（S14-A SA-T6 教训 / pitfalls L84）：本轮**必须真落地 SD-T2 + SD-T4**。SD-T3（装备分解）是第 3 轮，本轮不做；但 SD-T2、SD-T4 两个都要在验收里可勾，不得只做回归确认。

### 现有可复用范式（照抄）

- **溢出转 KP 全套**（SD-T4 满级溢出直接抄）：`config/nurture.ts:116 bondOverflowExchange`（纯函数算「每 N 点溢出兑 K，扣对应量，余数保留」）+ `stores/nurture.ts:288 claimBondOverflow`（store 执行 `profile.earn` + 日志）+ `nurture.test.ts:93 describe('SC-T4 好感溢出转 KP')`（测试范式）。
- **随等级/状态递增的纯函数**（SD-T4 补习递增）：`config/homestead.ts:86 facilityUpgradeCost`（`base × growth^(level-1)` 指数递增，Round 1 刚做，测试锁「N 级 > N-1 级」）——补习递增可仿线性或缓增。
- **delta before→after 预览**（SD-T2 挂机 delta）：`EquipPickerModal.vue:124-151` 战斗五维/战力 delta（`previewEquipBonus` 替换当前槽求和 → `previewStats` → 逐维 next-cur）。
- **config 纯函数弱化装备数据**（SD-T2）：直接改 `config/equipment.ts:73 EQUIPMENT_CATALOG` 的 homeEffect 数值（纯数据，无签名变更）。

---

## C. 新发现的坑

1. **`rewards.ts` 有两处 characterExp 常量（SD-T4 产出侧口径混淆）**：`engine/squad/rewards.ts:71 characterExpEach: 80 + floor×12` **和** `:99 characterExp: 40 + floor×10`——两个不同公式。SD-T4 若走「提产出」路线（非「压曲线」）必须先厘清**哪个是塔通层实际发放给角色的经验**（另一个可能是扫荡/其它口径）。**Scout 建议 SD-T4 主走「压曲线」而非「提产出」**（改一处 engine 曲线 vs 改多处产出常量，前者更内聚、副作用可控），提产出留作辅助。Generator 若要动产出，先 grep `characterExpEach`/`characterExp` 的消费端确认。

2. **压曲线的隐性联动：`STAT_DISPLAY_REF` 进度条不受影响，但满级达成率会飙升**：`config/nurture.ts:25 STAT_DISPLAY_REF` 是「仅显示、不进战斗」的五维进度条软上限——曲线改动不碰它。但压曲线后大量角色会快速满级 → 更多满级角色 → 满级溢出出口（SD-T4 第 2 条）的使用频率上升，验证溢出出口时要用「已满级角色继续吃经验」的用例（别只测未满级路径）。

3. **SD-T2 若走「pct 归零」，要 grep 所有断言 catalog homeEffect 具体值的测试**：`config/homestead.test.ts` 的 computeIdleYield 断言多是**直接传 effect 参数**（不读 catalog，安全），但 `equipment` store 若有测试断言「某件的 resolveHomeEffect = {expPct:0.16,...}」则会红。归零/弱化前先 `grep -rn "expPct\|homeEffect\|resolveHomeEffect" src/**/*.test.ts` 全量核对，同步更新。

4. **comfort 来源本轮建议留装备（跨轮一致性）**：Round 1 gen_status 明说 `computeIdleYield` 的 comfort 生效已不写死绑装备来源（只读 `effect.comfort`）。SD-T2 剥离的是**产出 pct**，comfort 是独立轴（Round 1 刚接成真软加成）。**本轮不必把 comfort 迁设施**（那是额外范围），保留装备 comfort 让「戴装备略舒适」语义在。若 Planner 坚持迁 comfort 到设施，只改**来源装配**（sumHomeEffects 那步）不动 computeIdleYield——但属可选、非 SD-T2 硬要求。

5. **git 工作树含 Round 1 未提交产物 + 大量 S14-C 残留**（`facility.ts`/`facility.test.ts`/`userStore.facility.test.ts` 未跟踪 + homestead/schema/migrations/persistence/userStore/HomesteadView 已改）——属 product-loop 正常层层累积（pitfalls L64），**别误动别回滚**。本轮 SD-T2/T4 不碰 facility 域文件（除非 SD-T2 走 homestead.ts 加权重常量）。

6. **文档待勾**：`docs/FUTURE.md:91（SD-T2）/:93（SD-T4）` 仍 `[ ]`；SPRINT.md 主清单 SD-T2/SD-T4 仍 `[ ]`。本轮完成后收尾把两条勾 `[x]`（附落地实况）。Evaluator 须核「合同任务 `[x]` 与实现一致」（pitfalls S14-A：跑满轮次≠目标达成）。
