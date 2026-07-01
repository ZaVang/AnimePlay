# Negotiation — S14-D 收尾轮（对审计 Prioritized Recommendations 逐条回应）

> 本 Sprint = S14-D 家园机制闭环 + 经济闭环，对应审计根因 **D（家园无机制闭环）/ E（经济终局塌陷）**。
> 本轮切片 = **SD-T2 + SD-T4 + SD-T3**（收尾轮，一次补齐 Round 1 之后的全部剩余任务；工作树实证 Round 2 未落地）。
> 「超范围标 backlog」= 超出 S14-D（SD-T1..T5）的建议记 backlog，不在本 Sprint 做。

## 一、本 Sprint 已完成映射（Round 1）

| 审计条 | 处置 | 落点 |
|---|---|---|
| P2-24 挂机封顶不成长 | 已接受·已做 | SD-T1（离线封顶 12h+总级数×0.5h） |
| P2-25 设施纯展示不可升级 | 已接受·已做 | SD-T1（facility 域 v17 + KP 升级 +8%/级乘区） |
| P2-26 comfort 死数值 | 已接受·已做 | SD-T1（comfort 每 10 点 +1% 真进产出，封顶 +20%） |
| P2-20 缺无底 KP sink | 已接受·已做 | SD-T5（设施无硬上限 + 指数递增成本 `120×1.4^(level-1)`） |

## 二、本轮逐条回应（S14-D 根因 D/E 相关，SD-T2/T4/T3）

### P2-13｜装备 homeEffect 应剥离到设施 —— 接受，本轮做（SD-T2 / 任务 A）
- **理由**：同件装备既定战斗五维又定家园挂机%，两目标抢同三槽、选装口径打架（根因 D）。Round 1 已把家园产出主体迁到设施乘区，装备 homeEffect 现在是冗余的第二主承载。
- **本轮行动**：`config/equipment.ts EQUIPMENT_CATALOG` 每件 homeEffect 产出%大幅弱化（约 ×0.33，决策-11）退成小额佐料，comfort 全保留；`EquipPickerModal` 补挂机 before→after delta 预览（决策-13，⭐审计明列低成本子项）。走「弱化」非「彻底归零」（scout A 路径 1，更平滑、不砸档、不动签名）。

### P2-19｜经验曲线与产出错配、满级经验沉没 —— 接受，本轮做（SD-T4 / 任务 B）
- **理由**：满级需 980 万经验、单次产出几百到几千 → 满级遥不可及，满级后 `addCharacterExp` 照收但净沉没（根因 E）。
- **本轮行动**：压曲线 `(level-1)^1.6×900`（决策-14，严格单调递增 + 守卫测试）；满级经验自动转少量 KP（决策-16，沉没点 `addCharacterExp` 满级分支走 `profile.earn`，仿好感溢出范式）；补习产出随等级递增 `tutoringExpGain(level)`（决策-17，顺带缓解 P3-2）。主走「压曲线」非「提产出」（scout C-1：改一处 engine 曲线更内聚，避开 `rewards.ts` 两处 exp 常量口径混淆）。

### P2-21｜重复装备无回收/分解出口 —— 接受，本轮做（SD-T3 / 任务 C）
- **理由**：塔每层 50% 掉一件、`addItem` 只 push 从不去重，齐装后纯堆积（根因 E）。
- **本轮行动**：`equipment.ts dismantleItem(uid)` 分解重复/游离装备为 KP（决策-18，`dismantleValueForRarity` 明显低于兑换价、走 `profile.earn`，对齐 codex `dismantleCard` 范式）；已装备件不可分解（决策-19，`findEquippedBy` 守卫 + UI 禁用双保险）；门面走 `userStore.dismantleEquipment`。**部分接受**：审计另提「N 件合成材料/碎片计数」——本轮**只做 KP 回收，不做材料/合成**（那属装备强化燃料 = S14-E，YAGNI，本 Sprint 唯一 bump 已用掉、不预留字段）。

## 三、根因 D/E 相关但超 S14-D 或已裁定的条目

### P2-22｜成长零策略（随机加点+装备无词条/套装/职业限制） —— 部分接受·大部分 backlog
- **理由/裁定**：加点已在 S14-A 改确定成长（SA-T3，非随机）；「装备套装/职业适配」= S14-E（P2-14/P2-16），非 S14-D。
- **本轮行动**：不做套装/职业限制（backlog → S14-E）。SD-T3 分解为 S14-E 装备强化留经济位（本轮只回收 KP）。

### P2-23｜好感一次性里程碑、无回归钩子 —— 已接受·已做（S14-C）
- **裁定**：好感溢出转 KP + 永久加成已在 S14-C（SC-T4）落地（`bondOverflowExchange`/`claimBondOverflow` 现存）。本 Sprint 不重复；SD-T4 满级经验溢出**复用**这套溢出范式。

### P2-27｜家园挂机与战斗/探索是平行线 —— 部分接受·合并处理
- **裁定（采信 1 票异议）**：挂机产出汇入同一批战斗单位，间接反馈已存在；项目刻意把家园定位「回归补充」。与 P2-25（Round 1 SD-T1）合并处理即可，不单独优先。**本轮不做**独立家园↔战斗反馈边（backlog，若做属 S14-E/F）。

### P2-28｜离线挂机信任客户端墙钟 —— 部分接受·backlog（P3 优先级）
- **裁定（采信 1 票异议）**：单机向、存档可直接改 JSON，时钟利用不增新攻击面，无多人/排行榜危害，P1 过重。回拨钳位（now<lastSettleAt 记 0）是廉价卫生改动但**非 S14-D 任务范围**（SD-T1..T5 未含），标 backlog。**本轮不做**（不开新范围）。

## 四、明确 backlog（超 S14-D，不在本 Sprint）

- **P2-14 / P2-16 确定性套装 / 原型条件加成** → S14-E（装备深度）。
- **P1-7 装备强化 / 等级**（EquipmentItemSave 加 level/enhance，需升档）→ S14-E；SD-T3 分解本轮只回收 KP，为其留燃料位但不实现材料。
- **P2-17 敌人预览≠实战** → 已在 S14-A 焊死同源种子（backlog 已闭）。
- **P2-18 NurtureView 内嵌双壳** → 已在 S14-A（P2-18/SA 相关）处理（backlog 已闭）。
- **P3-1..P3-12 打磨类**：P3-2 补习无决策定额被 SD-T4 决策-17 顺带部分缓解（补习改随等级递增）；其余（hero 胶囊、家具系统、入住羁绊、战力口径、60s 刷新定时器、archetype 兜底、结算复核拥有数、奖励预览概率化等）**全部 backlog**，非 S14-D 范围，本轮不做。
- **P2-28 回拨钳位** → backlog（P3 优先级，单机向危害有限）。

## 五、范围纪律声明

- 本轮**必须真落地 SD-T2 + SD-T4 + SD-T3 三个任务**（工作树实证 Round 2 未落地，收尾轮一次补齐让 S14-D 整体完成）。三审用于 refine HOW + 抓回归 + 微调，**不得把任一未完成 SD-T 任务降级为「回归确认」**（S14-A SA-T6 / S14-B 暴击 UI 教训：Sprint 合同内未完成任务永远 in-scope，跑满轮次 ≠ 目标达成）。
- 超出 SD-T1..T5 的创意/建议一律标 backlog（见第四节），本 Sprint 不开新范围。
- 本轮 SAVE_VERSION 保持 v17（无新存档字段），本 Sprint 唯一一次 bump 已在 Round 1 用掉。
