# 小队战斗重设计方案

日期：2026-06-30

## 目标

把现有挑战塔的小队数值战，从“前排轮流普攻”的简化模型，升级为类似《公主连结 Re:Dive》/《刀塔传奇》的横板半自动战斗。战斗只开放给 HR 与 UR 角色；每名可出战角色拥有独立的小队战技能组，技能名字与表现可以沿用角色个人特色，但不复用“宅理论战”的卡牌技能运行时。

这个方案同时把小队战斗并入家园/养成大类：玩家在同一基地入口下看家园角色走动、切到角色详情与养成、管理小队编成，并从探索页进入挑战塔。

## 非目标

- 不改“宅理论战”卡牌战斗的技能系统、费用系统或胜负逻辑。
- 不给 N/R/SR/SSR 角色设计小队战技能；这些角色不进入新小队战斗。
- 不新增第三方战斗引擎或后端权威战斗服务；第一版仍在前端纯规则引擎中模拟。
- 不在第一版做 PvP、扫荡、战斗回放分享、装备词条随机化。
- 不把技能 UI 做成只展示描述的假效果；所有展示的技能必须有真实引擎效果。

## 当前状态证据

现有小队战斗规则集中在 `frontend-vue/src/engine/squad/combat.ts` 和 `frontend-vue/src/views/SquadBattleView.vue`：

- 战斗属性为 `hp / atk / def / sp / spd`。
- 最终属性 = 基础 `battle_stats` + 养成加点 + 装备加成。
- 当前伤害 = `ATK * (1 + SP/(1000+SP)) * (1 - DEF/(1000+DEF))`，暴击/连击由 `SPD` 触发。
- 当前行动顺序是玩家前排与敌方前排交替出手，目标固定为最前方存活单位。
- 当前奖励混有玩家经验、知识点、角色经验、好感、装备掉落。
- `SquadBattleView.vue` 已超过 1000 行，是项目文档明确标注的重构对象，不应继续堆叠规则。

真实角色基础数值量级来自 `data/character/all_cards.json`：

| 范围 | HP | ATK / DEF / SP / SPD |
|---|---:|---:|
| UR | 1200-1315 | 120-131 |
| HR | 1002-1068 | 100-106 |
| UR+HR 中位数 | 1057 | 105 |
| UR+HR 90 分位 | 1285 | 128 |

装备量级来自 `frontend-vue/src/config/equipment.ts`：

- UR 武器最高约 `ATK +108`。
- UR 防具最高约 `HP +250 / DEF +56`。
- UR 支援最高约 `SPD +104 / SP +48`。
- 养成每升一级给 10 点，随机分配到五维；满级理论总加点 990，平均每维约 +198。

因此 `DEF / (1000 + DEF)` 在 1 级裸装 HR/UR 上约 9%-12% 减伤，装备与养成后通常进入 15%-30% 区间。保留 1000 作为防御分母是合理的。

## 方案概览

采用 5v5 横板半自动战斗：

- 玩家配置 5 人小队，旧 4 人小队迁移时追加第 5 个空位。
- 角色有 `front / middle / back` 三类站位，影响默认受击顺序和技能目标。
- 普攻与两个小技能自动释放。
- 每名角色有 2 个小技能、1 个被动、1 个大招。
- 能量满 1000 后可以释放大招；自动模式下自动释放，手动模式下由玩家点击释放。
- 敌方永远自动释放大招。
- 战斗限时 90 秒；挑战塔超时算失败。

## 战斗属性

保留五维主属性：

| 属性 | 新含义 |
|---|---|
| HP | 生命值 |
| ATK | 普攻与物理类技能的主属性 |
| DEF | 防御曲线，抵挡伤害 |
| SP | 技能强度，影响技能伤害、治疗、护盾与部分状态效果 |
| SPD | 行动速度，只影响行动频率 |

新增派生战斗修饰属性：

| 属性 | 默认值 | 来源 |
|---|---:|---|
| critRate | 0% | 装备、技能、被动、buff |
| critDamage | 150% | 第一版固定 |
| damageUp | 0% | 技能、buff |
| damageTakenUp | 0% | debuff |
| healUp | 0% | 技能、buff |
| shieldUp | 0% | 技能、buff |

`critRate` 不进入基础五维。多数角色默认暴击率为 0，只有装备、技能、被动或临时状态提供暴击。

## 伤害与防御公式

防御曲线保留现有基数：

```text
defenseMultiplier = 1000 / (1000 + defender.DEF)
damageReduction = defender.DEF / (1000 + defender.DEF)
```

普攻伤害：

```text
raw = attacker.ATK
damage = floor(raw * defenseMultiplier * variance * critMultiplier * (1 + damageUp) * (1 + damageTakenUp))
```

- `variance` 为 0.95 到 1.05 的随机浮动，由注入式 RNG 生成。
- `critMultiplier` 未暴击为 1，暴击为 `critDamage`，第一版为 1.5。
- 最终伤害下限为 1。

技能伤害由效果定义提供系数：

```text
raw = attacker.ATK * atkRatio + attacker.SP * spRatio + flatPower
damage = floor(raw * defenseMultiplier * variance * critMultiplier * modifiers)
```

示例：

- 物理单体小技能：`atkRatio=1.4, spRatio=0.2`
- 特殊群体小技能：`atkRatio=0.4, spRatio=1.0`
- 大招单体爆发：`atkRatio=2.4, spRatio=0.8`
- 大招群体伤害：`atkRatio=1.2, spRatio=0.7`

治疗与护盾不吃敌方 DEF：

```text
heal = floor(caster.SP * spRatio + caster.ATK * atkRatio + flatPower) * (1 + healUp)
shield = floor(caster.SP * spRatio + caster.DEF * defRatio + flatPower) * (1 + shieldUp)
```

## 行动时间轴

SPD 只影响速度，不再影响暴击。

```text
actionIntervalMs = clamp(1200, 4500, 3000 / (1 + SPD / 500))
```

典型值：

| SPD | 行动间隔 |
|---:|---:|
| 100 | 2500ms |
| 150 | 2308ms |
| 200 | 2143ms |
| 300 | 1875ms |

引擎以事件时间轴模拟，不使用 Vue 定时器承载规则。每个单位记录 `nextActionAt`，到达行动时间后按优先级自动选择动作：

1. 若小技能 1 可用且优先级满足，释放小技能 1。
2. 否则若小技能 2 可用且优先级满足，释放小技能 2。
3. 否则普攻。

小技能默认冷却：

| 槽位 | 初始冷却 | 常规冷却 |
|---|---:|---:|
| skill1 | 2000ms | 8000ms |
| skill2 | 5000ms | 12000ms |

具体角色可覆盖冷却，但不得低于 5000ms，避免无限技能循环。

## 能量与大招

每个单位能量上限为 1000，大招消耗 1000。

能量获得：

| 事件 | 能量 |
|---|---:|
| 普攻命中 | +90 |
| 小技能释放成功 | +120 |
| 承受伤害 | `clamp(0, 100, floor(damage / maxHp * 300))` |
| 击败敌人 | +120 |

释放规则：

- 自动大招开启：我方单位能量满且未被控制时，下一次可释放窗口自动放大招。
- 自动大招关闭：我方单位能量满后等待玩家点击；等待期间仍会普攻和释放小技能。
- 敌方单位能量满后自动释放。
- 大招不能在眩晕、沉默大招、阵亡状态下释放。

## 站位与目标

5 人小队位置从左到右为我方后排到前排，敌方镜像显示。每个角色有战斗站位：

| 站位 | 默认职责 | 受击优先级 |
|---|---|---|
| front | 坦克、近战、战士 | 最高 |
| middle | 法师、辅助、控制、半肉 | 中 |
| back | 射手、后排法师、治疗 | 最低 |

目标选择器由技能定义指定：

- `frontEnemy`：敌方最前存活单位，普攻默认目标。
- `lowestHpEnemy`：敌方生命百分比最低单位。
- `highestAtkEnemy`：敌方 ATK 最高单位。
- `backEnemy`：敌方最后排存活单位。
- `allEnemies`：敌方全体。
- `self`：自身。
- `lowestHpAlly`：我方生命百分比最低单位。
- `allAllies`：我方全体。

若目标不存在，动作失败但不消耗冷却或能量。

## 状态效果

第一版支持以下状态：

| 状态 | 类型 | 行为 |
|---|---|---|
| shield | 增益 | 抵消伤害；多个护盾独立存在，按先入先出消耗 |
| atkUp / atkDown | 数值 | 修改 ATK 百分比 |
| defUp / defDown | 数值 | 修改 DEF 百分比 |
| spUp / spDown | 数值 | 修改 SP 百分比 |
| haste / slow | 数值 | 修改行动间隔百分比 |
| critRateUp | 数值 | 增加暴击率 |
| stun | 控制 | 无法普攻、放小技能、放大招 |
| silence | 控制 | 无法放小技能和大招，可以普攻 |
| taunt | 控制 | 敌方单体目标优先指向嘲讽者 |
| dot | 伤害 | 定时造成持续伤害 |
| hot | 治疗 | 定时恢复生命 |

同一来源的同类百分比状态刷新持续时间，不叠层；不同来源同类状态取最高幅度，避免数值堆叠失控。护盾、dot、hot 可以并存。

## 技能系统

新增小队战技能定义，不复用现有 `Skill` 运行时：

```text
SquadSkillKit
  characterId
  normalAttack
  skill1
  skill2
  passive
  ultimate
```

技能效果由有限效果目录组合：

- `damage`
- `heal`
- `shield`
- `applyStatus`
- `cleanse`
- `energyGain`
- `dispel`
- `revive`
- `execute`

技能数据政策：

- 只有 HR 与 UR 角色拥有 `SquadSkillKit`。
- 战斗选择器只展示已拥有且稀有度为 HR/UR 的角色。
- 如果 HR/UR 缺少 `SquadSkillKit`，该角色显示为“待设计”，不可加入战斗，避免假技能。
- UR 优先沿用已有个人技能名称与角色特色，但效果重新设计为小队战效果。
- HR 使用角色名、登场作品、标签与基础属性倾向设计个人技能，不使用低稀有度模板。
- N/R/SR/SSR 没有小队战模板，也不进入小队战。

角色战斗职业用于约束技能方向：

| 职业 | 常见站位 | 设计重点 |
|---|---|---|
| tank | front | 护盾、嘲讽、减伤、控制抗性 |
| bruiser | front / middle | 单体伤害、自回复、破防 |
| striker | middle / back | 普攻强化、暴击、收割 |
| caster | middle / back | SP 技能伤害、群攻、沉默 |
| support | middle / back | 治疗、护盾、能量、增益 |
| controller | middle | 眩晕、减速、打断、目标扰乱 |

## 战斗流程

```text
Base/Homestead Hub
  -> Exploration/Tower
  -> Squad Select
  -> Battle Setup
  -> Pure Squad Engine
  -> Battle Result
  -> Reward Settlement
```

战斗初始化：

1. 校验登录状态。
2. 校验选择的小队有 5 个 HR/UR 且均已拥有。
3. 校验每名角色存在 `SquadSkillKit`。
4. 读取角色基础属性、养成加点、装备加成，生成最终入场属性。
5. 按当前塔层生成敌方 5 人阵容和属性倍率。
6. 创建战斗快照，注入 RNG，交给纯引擎模拟。

胜负：

- 敌方全灭：胜利。
- 我方全灭：失败。
- 90 秒超时：挑战塔失败。
- 同一模拟帧双方同时全灭：挑战塔按胜利处理，保留爽感和通层连续性。

## 挑战塔奖励

挑战塔奖励只包含三类：

1. 角色经验。
2. 装备掉落。
3. 知识点。

移除挑战塔结算中的玩家经验与战斗好感。

胜利奖励：

```text
knowledge = 25 + floor * 5
characterExpEach = 80 + floor * 12
survivorBonus = 20
equipmentDrop = existing tower drop roll
```

- 所有参战角色获得 `characterExpEach`。
- 战斗结束仍存活角色额外获得 `survivorBonus`。
- 装备掉落沿用现有 `rollTowerDrop` 与楼层稀有度规则：只在通层推进成功时判定，重复挑战已通过楼层不掉落。

失败奖励：

```text
characterExpEach = 20 + floor * 3
knowledge = 0
equipmentDrop = none
```

失败不发知识点，不掉装备。

## UI 结构

把家园、角色养成、小队编成、挑战塔统一为基地模块：

| 面板 | 内容 |
|---|---|
| 家园 | 当前家园地图、角色走动、挂机收益 |
| 角色 | 全角色列表、详情、五维、装备、养成、技能 |
| 编队 | 5 人队伍、站位、战力、技能摘要 |
| 探索 | 挑战塔入口、楼层、敌人预览、奖励预览 |
| 战斗 | 横板战场、血条、能量条、大招按钮、自动开关、战斗日志 |

旧 `/squad-battle` 路由保留，最终重定向到基地模块的“探索/战斗”面板，避免断开既有入口。

战斗画面要求：

- 横板队列，玩家在左、敌人在右。
- 每个角色展示头像或立绘、HP 条、能量条、状态图标。
- 大招按钮固定在我方角色头像附近，能量满时高亮。
- 自动大招开关全局生效。
- 战斗日志只显示关键事件：大招、击败、控制、胜负、奖励。

## 架构

规则放入纯 `engine/squad`，视图和 store 只做编排：

```text
data/squadSkillKits
  -> engine/squad/skillDefinitions
  -> engine/squad/timedBattle
  -> stores/pve + stores/nurture + stores/equipment
  -> views/homestead-base + route adapter for /squad-battle
```

建议模块边界：

| 模块 | 职责 |
|---|---|
| `engine/squad/types.ts` | 战斗快照、单位、状态、技能、事件类型 |
| `engine/squad/formulas.ts` | 防御、伤害、治疗、护盾、行动间隔 |
| `engine/squad/targeting.ts` | 目标选择器 |
| `engine/squad/effects.ts` | 有限技能效果执行 |
| `engine/squad/timedBattle.ts` | 时间轴模拟、能量、小技能、大招、胜负 |
| `engine/squad/rewards.ts` | 挑战塔奖励计算 |
| `data/squadSkillKits.ts` | HR/UR 小队战技能数据 |
| `stores/pve` | 小队、塔进度、通层、掉落事务 |
| `views` / `components` | 基地 UI、编队 UI、战斗播放 UI |

`engine/` 不 import Vue、Pinia、DOM、localStorage、后端 API 或图片工具。

## 存档与迁移

需要新增或调整存档字段：

- 小队从 4 人扩展为 5 人。
- 旧小队迁移：保留前 4 位，第 5 位填 `null`。
- 自动大招开关可以存在客户端 UI 状态，不必进账号存档。
- 战斗中临时状态不进持久化存档；刷新页面回到塔/编队入口。

最终路由策略：

- `/homestead` 作为基地模块主入口。
- `/squad-battle` 重定向到基地模块的探索/挑战塔入口。
- `/nurture` 可保留旧入口或跳转到基地角色面板。

## 错误处理

- 角色不是 HR/UR：不可加入小队。
- 角色没有 `SquadSkillKit`：不可加入小队，并显示“待设计”状态。
- 小队未满 5 人：不可开始挑战。
- 装备或养成数据缺失：按零加成处理。
- 敌方生成失败：停留在探索页，提示刷新敌人。
- 战斗模拟超过 90 秒或事件数超过安全上限：按超时失败结算。
- 奖励结算必须以 `completeFloor` 推进成功为前提，避免重复通层刷装备与知识点。

## 测试要求

引擎测试：

- `DEF/(1000+DEF)` 曲线与典型减伤值。
- 普攻伤害、技能伤害、治疗、护盾、暴击。
- `SPD` 只影响行动间隔，不影响暴击。
- 能量获得、自动大招、手动大招等待。
- 小技能冷却与目标不存在时不消耗冷却。
- 控制状态：眩晕、沉默、嘲讽。
- 胜利、失败、超时、同帧双方全灭。
- 奖励只包含角色经验、知识点、装备掉落。

Store/集成测试：

- 旧 4 人小队迁移为 5 人。
- 非 HR/UR 不可加入新战斗小队。
- HR/UR 缺少技能时不可出战。
- 通层推进成功才发奖励和掉落。
- 失败不发知识点、不掉装备。

UI 手动验收：

- 基地模块可以在家园、角色、编队、探索、战斗之间切换。
- 横板战斗中 HP、能量、大招按钮、自动开关状态正确。
- 关闭自动大招后，能量满的角色不会自动放大招。
- 开启自动大招后，能量满的角色会在合法窗口释放。
- 战斗结束页只展示角色经验、知识点、装备掉落。

## 回滚策略

第一版应以可回滚方式落地：

- 保留旧 `/squad-battle` 入口。
- 旧战斗公式文件可先保留，新的时间轴引擎独立增加。
- 新 UI 可通过路由或组件切换接入；若新战斗不可用，可以临时回到旧挑战塔页面。
- 存档迁移只做向后兼容的新增空位，不删除旧字段。

## 已确认决策

- 战斗模式采用横板半自动，而不是全手动回合制。
- 小队战斗只对 HR/UR 开放。
- HR/UR 设计专属小队技能；其他稀有度不做战斗模板。
- SPD 只影响行动速度。
- 暴击率作为派生属性，默认 0，只由装备、技能、被动、buff 提供。
- 防御公式保留 `DEF / (1000 + DEF)`。
- 挑战塔奖励只包含角色经验、装备掉落和知识点。
- 挑战塔结算移除玩家经验和战斗好感。

## 可独立交付阶段

1. 先抽出新时间轴引擎与公式测试，不接 UI，不改变现有页面。
2. 增加 HR/UR 准入、5 人小队迁移、奖励计算规则，仍可通过测试验证。
3. 增加 `SquadSkillKit` 数据结构与全部可出战 HR/UR 技能数据，缺技能角色不可出战。
4. 接入横板战斗 UI 与手动/自动大招。
5. 把家园、角色、编队、探索、战斗统一到基地模块。

每个阶段都应保持主分支可运行，且不要求后续阶段完成后前一阶段才有意义。
