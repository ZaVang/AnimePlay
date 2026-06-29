# AnimePlay — SPRINT 合同（S13-C1：养成精简 + 战力改加点制 + 存档 v14）

> 本文件是 multi-ralph 执行合同。**完整设计基线在 `docs/FUTURE.md` 的「## ☐ S13 → ### C · 养成重构」段（尤其 C1 部分），以那里为准**：statPoints 加点制 / 纯加法战力 / 软上限参考 / 变体 A 角色页 / v14 / 删除清单。本文件只列 C1 的可执行任务 + 验收命令。
>
> **实现前必读**：`frontend-vue/CLAUDE.md`（架构铁律、存档三处同改、颜色令牌、startup）、`docs/plans/pitfalls.md`、`docs/FUTURE.md` 的 S13-C 全段。

## 产品背景
- AnimePlay：基于 Bangumi 数据的抽卡 + 收集 + 多玩法网页游戏。前端 Vue 3 + TS + Pinia + Tailwind（Vite），后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`；后端 `python start_server.py`（端口 5001）。
- 本 sprint = **S13-C1**：把养成系统砍成「**等级**（固定初始五维 + 每级随机加点）+ **好感**（关系仪表 / 里程碑，不接战力）」；战力改**纯加法**（`base + 加点 + 装备`，本阶段装备恒 0）；存档升 **v14**；养成页重写为**变体 A 游戏化角色详情面板**。**装备系统是 C2，本阶段只留空槽占位 + 空 equipment 存档域。**

## 架构铁律（不可违反）
engine 纯净（零 Vue/Pinia/DOM/IO）/ 依赖只向下（views→components→stores→engine）/ engine 内 RNG 可注入 / 货币只走 `profile.spend·earn` / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁动态拼色；立绘/稀有度识别色是固定色例外）/ 新存档字段**三处同改**（schema + migrations + 装配器 stores/persistence.ts）+ 迁移/往返测试。
**⚠️ 别误伤**：家园挂机用的 `addCharacterExp`/`addIdleAffection` 与挑战塔结算用的 `addCharacterExp` 必须保留可用。

## 任务清单（S13-C1）

- [ ] **C1-T1｜养成数据 + 引擎瘦身（改加点制）**
  - `types/nurture.ts`：`CharacterNurtureData` 瘦身为 `{ affection, level, experience, totalExperience, lastInteraction, statPoints: {hp,atk,def,sp,spd} }`。删除 `intimacy / totalInteractions / dialogueHistory / gifts / specialEvents / attributes / levelBonusAttributes / battleEnhancements / preferences / trainingCooldowns`（含其中的 mood）。
  - `engine/nurture/rules.ts`：删训练相关（`generateTrainingOpponent / trainingOutcome / applyBattleEnhancements / enhanceAttribute / enhanceBattleStat / ATTRIBUTE_CAP / ENHANCEMENT_CAP / distributeRandomAttributes(旧的属性版)`）；新增「每升一级 roll `POINTS_PER_LEVEL`(起 10，放 config 或 rules 常量，可调) 点**随机分配到 5 战斗维**（hp/atk/def/sp/spd），累加进 `statPoints`」的纯函数（**注入 RNG**，可复现）；保留等级曲线 `getRequiredExpForLevel / getLevelFromExp / getLevelProgress / MAX_CHARACTER_LEVEL` 与瘦身版 `createDefaultNurtureData`。
  - `stores/nurture.ts`：删训练/强化/冷却 action；保留并适配 `addCharacterExp`（升级时 roll 加点写入 statPoints）/`addIdleAffection`；新增「带塔参战涨好感」与「补习(花知识点 → 加经验)」入口（补习经 `profile.spend('knowledgePoints', …)`）。
  - 验收：type-check 0；`engine/nurture/*.test.ts` 改为覆盖加点制（升级把固定点数随机分配到 5 维，注入 RNG 可复现）。

- [ ] **C1-T2｜战力公式改纯加法**
  - `engine/squad/combat.ts`：`generateBattleStats` 改签名为 `(baseStats, statPoints, equipBonus)`，公式 `最终某围 = base + statPoints[围] + equipBonus[围]`（删除 charm/int/str 的 attributeBonus 与 battleEnhancements% 乘算）。
  - `views/SquadBattleView.vue`：两处战力计算调用（约 131 / 183 行）改为传 `nurtureData.statPoints` + `equipBonus`（本阶段恒 `{hp:0,atk:0,def:0,sp:0,spd:0}`）；保留 ~414 行的 `addCharacterExp`；并在塔战斗结算后给参战角色涨好感。
  - 更新 `engine/squad/combat.test.ts` 覆盖新公式。
  - 验收：type-check 0；combat.test 绿。

- [ ] **C1-T3｜删旧养成 UI + 角色页重写（变体 A + 软上限条）**
  - 删除 `components/nurture/NurtureActions.vue`、`InteractionPanel.vue`、`DialogueSystem.vue` 及其测试与引用。
  - `views/NurtureView.vue` 重写为**变体 A 游戏化角色详情面板**：角色列表 + 选中角色（立绘 + 等级/经验进度条 + 好感进度条&里程碑称号 + **五维数值面板**[每围显示 base/加点两段、软上限参考条] + **3 个装备槽位**[空占位，C2 接配装] + **补习**按钮）。
  - 五维进度条用**软上限参考** `STAT_DISPLAY_REF`（生命 1500 / 攻击 800 / 防御 600 / 技力 700 / 速度 600，放 `config/`，可调；`条填充 = min(100%, 该围值 / 参考)`，超出满条 + MAX 标记）。
  - **好感里程碑** 6 档（阈值 100/250/500/1000/2000/4000 → 一次性 KP 50/100/200/400/800/1500 + 称号 初识/熟络/要好/挚友/羁绊/命运）配置 + 领取（KP 经 `profile.earn`，已领状态需持久化——若需存档字段则并入 nurtureData 或单独记，按你判断但要走三处同改）。
  - 颜色走皮肤语义令牌。
  - 验收：type-check 0；build 通过；养成页不再引用任何已删组件/字段。

- [ ] **C1-T4｜存档 v14 迁移 + 收口**
  - `infra/persistence/schema.ts`：`SAVE_VERSION` 13 → 14；`CharacterNurtureData` 瘦身入 schema；新增**空** equipment 域 `EquipmentSave = { inventory: {uid,defId}[], equipped: Record<number,{weapon,armor,supporter: string|null}> }` + `createDefaultEquipment()`（C2 用，本阶段占位）。
  - `migrations.ts` v13→v14：`migrateNurtureData` 丢弃删掉的字段、保留两轴、补 `statPoints` 缺省（旧档无 → `{hp:0,atk:0,def:0,sp:0,spd:0}`，与瘦身后字段一致）；`migrateEquipment` 旧档补空域。
  - 装配器 `stores/persistence.ts` + 新建 `stores/equipment.ts`（空域 serialize/deserialize/reset）接入 buildPayload/applyPayload/resetAllDomains。
  - 迁移/往返测试更新（`migrations.test.ts` + `persistence.test.ts` 覆盖 v14：旧字段被丢、两轴保留、statPoints/equipment 缺省补全）。
  - 文档版本号同步：`frontend-vue/CLAUDE.md` 版本沿革 v13 → 补 v14 一行。
  - 验收：type-check 0；test 全绿（含 v14 迁移/往返）；build 通过。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含新增 statPoints/combat/v14 迁移测试；不得低于既有数量减去删掉的训练测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（C1 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且 C1-T1..C1-T4 全部 `[x]`。
