# Product Audit — S14-C 第 2/3 轮（体验官 · product-loop --tier1 on --mode all）

> 本轮指派切片 = **SC-T3｜养成长线：星级/突破（消化重复角色卡，P2-10，SAVE_VERSION→16）**。
> 本轮做两件事：① 复审第 1 轮已落地的 SC-T1/T2/T5 有无回归/新体验坑；② 聚焦 SC-T3 给 refine（做多深才够、怎样防退化/腐化、验收卡什么）。不开新范围（超范围创意标 💡 backlog）。
> 方式：源码审（`.claude/scripts/get_page_state.js` 不存在，以 Read/Grep 为主），证据落到 file:line。日期：2026-07-01。

## Executive Summary

**总评分：7.4 / 10**（第 1 轮三切片落地干净、无回归，+0.3；但养成长线仍缺，SC-T3 是本 Sprint 三大根因中「养成无决策/无目标感」的核心补丁，未落地则家园 hub 仍是「升到满级就没事干」）。

- **功能体验（7.5）**：第 1 轮 SC-T5 软门槛把养成钉回了探索循环（explore + SquadBattleView 两处共用 `assessSquadReadiness`），SC-T1/T2 让角色定位与 HR 技能名有了个人色彩，687 测全绿。但**满级即终态**——`MAX_CHARACTER_LEVEL=100` 后除领好感里程碑外零成长目标，重复抽到的角色卡只有 `dismantleCard` 一条「碎成 KP」的去处，收集的正反馈断在这里。SC-T3 正是补这条断裂。
- **审美品味（7.5）**：养成页双栏结构清爽，语义色令牌合规（SC-T5 的 `readiness-*` 三档静态类经 eval 核实非动态拼类）。风险在 SC-T3 的**新突破入口会把已偏长的右详情面板再堆一层**（等级/好感/补习/里程碑/五维/装备已挤满），需克制。
- **产品想象力（7.0）**：突破系统是「让抽卡的第 N 张有意义」的关键——收集向游戏的复抽必须有出口。真正的「啊哈时刻」不是数字变大，而是**「攒够碎片把本命角色突破，五维肉眼可见跃升，塔里那个红色劝退提示变绿了」**——SC-T3 必须和 SC-T5 软门槛联动，才能形成「打不过→看差距→突破→打过」的闭环。

---

## Phase 1：功能体验

### 1.1 第 1 轮回归复审（SC-T1 / SC-T2 / SC-T5）——无回归，确认健康

- **SC-T1（显式 archetype 单源）**：`squadSkillKits.ts` `resolveArchetype`（L152）= `EXPLICIT_ARCHETYPE`（L125）优先 → `inferArchetypeByText`（L159）回落，单一入口；对外 `getArchetypeForCharacter`（L697）。override.role 暗坑已修 + 断言守卫已补。**无回归。**
- **SC-T2（HR 补名）**：`HR_SKILL_NAME_OVERRIDES`（L622）只改名、description 走 `describeSquadSkill` 派生，红线守住。**无回归。**
- **SC-T5（塔软门槛）**：`engine/squad/thresholds.ts` 纯函数（`assessSquadReadiness` L51，三档 0.9/0.7，`floorPower≤0` 视 ready），两处 UI 共用。**无回归。**
- ⚠️ **一个待 SC-T3 主动接线的联动点**（非回归、是本轮机会）：SC-T5 的 `assessSquadReadiness` 只吃 `squadPower`（= `generateBattleStats(base+statPoints+equipBonus)`）。**SC-T3 的突破永久加成一旦不进 `generateBattleStats`，softgate 的「差距」就永远不反映突破收益**——玩家突破了、战力没动、红提示还在，突破的目标感当场归零。见 2.1 与 3.3。

### 1.2 SC-T3 现状：满级即断更，复抽零出口

- 养成两轴止于 `MAX_CHARACTER_LEVEL=100`（`rules.ts:10`）：`addCharacterExp`（`nurture.ts:112`）clamp 到上限后 `tutorCharacter`（L153）直接「已满级，无需补习」。满级角色除领好感里程碑外**无任何成长动作**。
- 重复角色卡的**唯一出口**是 `collection.dismantleCard`（`collection.ts:43`）/ `dismantleAllDuplicates`（L67）→ 碎成 KP，保留 1 张。SC-T3 要把「重复卡」变成突破碎片——**与 dismantle 抢同一份 `count-1` 库存**，这是本轮最大功能设计冲突（见 🔴-2）。
- `getCharacterCardCount`（`collection.ts:21`）= 拥有张数，是突破消费口径来源，与 SPRINT「保留至少 1 张不被消耗」一致。

### 1.3 边界与错误处理（SC-T3 需覆盖）

- 突破消费必须走**唯一库存出口**：不能新写一套减 count 逻辑绕过 collection（会与 dismantle 双花）。建议 collection 加 `consumeDuplicatesForBreakthrough(id, n)` 单一入口，dismantle 与突破都经它，「至少留 1」不变式收口一处。
- 碎片不足、已满突破上限、未登录 → 明确文案 + 按钮 `:disabled`，勿静默失败（对齐 `tutorCharacter` 返回 false + addLog 范式）。

---

## Phase 2：审美品味

### 2.1 战力口径与视觉一致性（SC-T3 的隐形审美债）

`generateBattleStats(base, statPoints, equipBonus)`（`combat.ts:144`）现有 **多个消费点**：`SquadBattleView.vue:268-269`、`HomesteadHubView.vue:114,183`、`NurtureView.vue:87`。突破永久加成必须**在这一个 engine 函数里统一注入**（加第 4 参 `breakthroughBonus: StatBonus`，或前置 `sumStatBonus([equipBonus, breakthroughBonus])`），否则各处各自加会漏一处 → 复现 S14-A P2-17「预览≠实战」那一类 desync。**审美层面这是「数字要处处一致」的信任问题**：玩家看到的每个战力数字必须同源。

### 2.2 突破入口不能再堆右详情面板

NurtureView 右详情（`NurtureView.vue:286` 起）已含：头像/稀有度 → 等级+好感条 → 补习 → 五维(base/point/equip/total) → 好感里程碑 → 装备槽，**信息密度已到临界**（这正是 SC-T6 要拆的病灶）。建议：突破做成**等级条旁的紧凑「★N/N」进度 + 单按钮**，点开走弹窗（复用 `EquipPickerModal` 模态范式），而非在主面板铺开碎片清单。星级用**星形图标行（★★★☆☆）** 比纯数字更有收集仪式感。

### 2.3 反馈：突破成功要有「跃升感」

审计根因是「养成无目标感/无反馈」。突破一次若只静默改存档 + 一条 log，浪费了这个高光时刻。建议成功时给：五维 before→after delta 飘字 + 星级点亮动效。**克制但不能没有。**

---

## Phase 3：产品想象力

### 3.1 「如果能 XXX 就太好了」

1. 💡 **突破与好感互锁（→ SC-T4 backlog）**：突破解锁更高好感上限，或高好感解锁突破折扣。**本轮不做**（SC-T4 第 3 轮），但 SC-T3 存档字段设计应给 SC-T4 留读口。
2. 💡 **突破解锁 HR 差异化被动（→ backlog）**：negotiation 已记「SC-T2 后续：突破满级解锁 HR 个人被动」。SC-T3 是前置，本轮只做数值突破。
3. 💡 **同稀有度通用碎片兜底池（→ backlog）**：长尾角色永远抽不到重复卡→永远无法突破。**本轮先做「本角色重复卡」最简闭环**，通用池标 backlog（防范围蔓延）。

### 3.2 可以删掉的东西

- 🟢 `distributeRandomStatPoints`（`rules.ts:73`）自 SA-T3 改确定成长后已不用于任何升级路径（注释自证「不再用于升级」）。SC-T3 若不需随机分配，可顺手标 dead / 删（**仅在触及该文件时净减法，别扩范围**）。

### 3.3 「啊哈时刻」分析——SC-T3 与 SC-T5 必须联动

单独看，突破就是「数字变大」，很平。**真正的啊哈 = 突破让 SC-T5 软门槛从红变绿**：塔前看到「战力 480 / 建议 ~1200 · 差距较大」→ 突破本命角色 → 战力过线 → 提示变绿 → 打过。这要求突破进 `generateBattleStats` → 进 `squadPower` → 进 `assessSquadReadiness` 真正打通。**这是本轮最该守住的产品价值，比突破的数值大小重要。**

---

## Phase 4：一致性与对比

- **跨页一致性**：突破加成必须在 NurtureView（详情五维）、HomesteadHubView（memberPower + selectedFinalStats）、SquadBattleView（memberStats + 战斗）四处显示一致 → 全部经 `generateBattleStats` 单一 seam。
- **与同类对比**：PCR/FGO 突破都强调「进度可见 + 材料预告 + 成功仪式感」。本项目单机收集向不追刷取深度，但**「差多少张碎片能突破下一级」的预告**必须有（对齐 SC-T5「显示差多少而非布尔」精神）。
- **存档协议**：SC-T3 是本 Sprint 唯一 SAVE_VERSION→16 的重任务。`schema.ts:37`（现 15）+ `migrations.ts`（补 v16 缺省）+ `stores/persistence.ts` 装配器**三处同改 + 往返测试**，铁律非建议。

---

## Prioritized Recommendations

### 🔴 Critical（本轮必须落地，否则等于 SA-T6/暴击显形漏做重演）

1. **[SC-T3] 突破加成必须进 `generateBattleStats` 单一 seam，真进战力**：加第 4 参或前置 `sumStatBonus`，覆盖全部 `generateBattleStats` 消费点（`combat.ts:144` / `SquadBattleView:268-269` / `HomesteadHubView:114,183` / `NurtureView:87`）。engine 纯函数测试断言「突破加成逐围相加」。**否则突破不进战力 = 假养成。**
2. **[SC-T3] 突破消费收口到单一库存出口，杜绝与 dismantle 双花**：collection 加 `consumeDuplicatesForBreakthrough`（复用「保留至少 1 张」不变式），突破与 `dismantleCard`（`collection.ts:43`）读同一 `count`。测试断言「消费后 count 正确、不低于 1、突破进度 +1」。
3. **[SC-T3] 存档 v16 三处同改 + 往返测试**：schema（突破字段 per-character，建议扁平 `{ tier }` 挂进 `CharacterNurtureData` 或独立 `breakthrough` 域）+ migrations（旧档补 tier=0）+ 装配器；`migrations.test.ts` 断言 v15→v16 往返保真 + 跨重开保真。SAVE_VERSION 本轮**只升这一次**（与 SC-T4 共用 v16，本轮别再升）。

### 🟡 Important（体验，强烈建议本轮做）

4. **[SC-T3] 突破进度显形 + 下一级碎片预告**：「★N/上限」+「再攒 X 张可突破」，对齐 SC-T5「显示差多少」精神。避免只给一个「突破」按钮却不告诉玩家离下一级多远（audit 根因就是「无目标感」）。
5. **[SC-T3↔SC-T5 联动验收] 突破后软门槛差距真实缩小**：手验/断言——同一角色突破前后，`memberPower`/`squadPower` 上升、`assessSquadReadiness` 的 delta 相应改善。本轮产品价值锚点（Phase 3.3）。

### 🟢 Nice-to-have（锦上添花）

6. **[SC-T3] 突破成功的跃升反馈**：五维 before→after delta 飘字 + 星级点亮（timer 须 `schedule()` 登记 + `onUnmounted` 清除，见 pitfalls）。
7. **[超范围/净减法] 标记 `distributeRandomStatPoints` 为 dead**（`rules.ts:73`，SA-T3 后已弃用）——仅触及该文件时顺手，别扩范围。

### 💡 Feature Idea（backlog，不进本轮）

8. **突破↔好感互锁**（SC-T4 第 3 轮）：SC-T3 存档字段给 SC-T4 留读口。
9. **突破满级解锁 HR 差异化被动**（SC-T2 后续）。
10. **同稀有度通用碎片兜底池**（解长尾角色无法突破；本轮先做本角色重复卡最简闭环）。
11. **突破材料/进度做进探索循环的养成导航**（SC-T5 诊断化延伸，已在 negotiation backlog）。
