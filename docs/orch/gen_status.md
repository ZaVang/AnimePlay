# Generator Status — Iteration 1 (S13-C1)

> S13-C1：养成精简（加点制两轴）+ 战力改纯加法 + 角色页重写（变体 A）+ 存档升 v14。
> 五条验收命令亲跑全绿。

## 完成的任务

- [x] **C1-T1：养成数据 + 引擎瘦身（改加点制）**
  - `types/nurture.ts`：`CharacterNurtureData` 瘦身为 `{affection, lastInteraction, level, experience, totalExperience, statPoints:{hp,atk,def,sp,spd}, claimedBondMilestones}`，删除 intimacy/totalInteractions/dialogueHistory/gifts/specialEvents/attributes/levelBonusAttributes/battleEnhancements/preferences/trainingCooldowns（含 mood）。新增 `StatPoints` 接口。
  - `engine/nurture/rules.ts`：删训练相关全部函数（generateTrainingOpponent/trainingOutcome/applyBattleEnhancements/ATTRIBUTE_CAP/ENHANCEMENT_CAP/EXP_PER_*/旧 distributeRandomAttributes/levelUpAttributePoints）；新增 `POINTS_PER_LEVEL=10`、`createEmptyStatPoints`、`distributeRandomStatPoints(totalPoints, rng)`（注入 RNG、逐点随机投到 5 战斗维、总和守恒、可复现）、`rollLevelUpStatPoints(oldLevel,newLevel,rng)`（多级跳跃一次结算）；保留等级曲线 + 瘦身版 `createDefaultNurtureData`。
  - `stores/nurture.ts`：删训练/强化/冷却/互动/送礼 action；保留并适配 `addCharacterExp`（升级 roll 加点写入 statPoints）/`addIdleAffection`；新增 `addBattleAffection`（带塔参战涨好感）、`tutorCharacter`（补习走 `profile.spend('knowledgePoints')` → 加经验）、`claimBondMilestone`（里程碑奖励走 `profile.earn`）。
  - 新增 `config/nurture.ts`：补习定价、带塔好感量、`STAT_DISPLAY_REF` 软上限参考、`STAT_META`、`BOND_MILESTONES` 6 档（阈值 100/250/500/1000/2000/4000 → KP 50/100/200/400/800/1500 + 称号 初识/熟络/要好/挚友/羁绊/命运）。

- [x] **C1-T2：战力公式改纯加法**
  - `engine/squad/combat.ts`：`generateBattleStats(baseStats, statPoints, equipBonus)` 改为纯加法 `最终某围 = base + statPoints + equipBonus`，删 charm/int/str 换算与 battleEnhancements% 乘算；旧 `NurtureAttributes`/`BattleEnhancements` 类型替换为单一 `StatBonus`。
  - `views/SquadBattleView.vue`：两处战力计算（getSquadPower / createSquadMember）改传 `nurtureData.statPoints` + 恒 0 `NO_EQUIP_BONUS`；保留 ~414 行 `addCharacterExp`；胜利结算后对参战角色调 `addBattleAffection`。

- [x] **C1-T3：删旧养成 UI + 角色页重写（变体 A + 软上限条）**
  - 删除 `components/nurture/` 全部 6 个组件（NurtureActions/InteractionPanel/DialogueSystem/CharacterProfile/CharacterSelector/CollapsiblePanel）。
  - `views/NurtureView.vue` 重写为变体 A 双栏游戏化角色面板：左角色列表（立绘缩图 + Lv + 好感 icon）+ 右详情（立绘、等级/经验进度条、好感进度条 + 称号、五维数值面板[base/加点两段 + 软上限参考条 + MAX 标记]、3 个装备空槽占位、补习按钮、好感里程碑领取列表）。
  - `config/nurtureColors.ts` 瘦身：删 mood/attribute/interaction 硬色簇，只保留 `bondTier`（语义令牌，档位对齐 BOND_MILESTONES）。颜色全走皮肤语义令牌，按钮用 `.btn-primary`，无 text-white 压浅底、无动态拼色、无未定义令牌。

- [x] **C1-T4：存档 v14 迁移 + 收口**
  - `infra/persistence/schema.ts`：`SAVE_VERSION` 13→14；CharacterNurtureData 瘦身入 schema（经 types）；新增空 `EquipmentSave = {inventory:{uid,defId}[], equipped:Record<charId,{weapon,armor,supporter:string|null}>}` + `createDefaultEquipment()`。
  - `migrations.ts`：新增 `migrateNurtureData`（丢旧训练字段、保留两轴、补 statPoints/claimedBondMilestones 缺省）+ `migrateEquipment`（旧档补空域、局部损坏按字段补默认）。
  - 装配器 `stores/persistence.ts` 接入新建 `stores/equipment.ts`（serialize/deserialize/reset）于 buildPayload/applyPayload/resetAllDomains，三处同改。
  - 迁移/往返测试更新（migrations.test.ts 覆盖 v14 瘦身 + equipment；persistence.test.ts 往返加 statPoints/里程碑/equipment）。
  - `frontend-vue/CLAUDE.md` 版本沿革补 v14 一行。

## 未完成的任务

无。C1-T1..C1-T4 全部完成、SPRINT.md 四项全 [x]。

## 验收命令输出

### 1. `cd frontend-vue && npm run type-check`
```
> vue-tsc --build
（0 错误）
```

### 2. `cd frontend-vue && npm run test`
```
 Test Files  47 passed (47)
      Tests  533 passed (533)
```
注：基线（改动前 HEAD）为 530 tests；删掉训练测试后仍净增 3（新增 statPoints 加点制 / 纯加法 combat / v14 nurture 瘦身迁移 + equipment 迁移 + 往返测试覆盖充分），不低于「既有数量减去删掉的训练测试」。

### 3. `cd frontend-vue && npm run build`
```
✓ built in 10.30s
（type-check + 生产构建均成功；NurtureView chunk 正常产出）
```

### 4. `python backend/test_security.py`（用 ./.venv/Scripts/python.exe）
```
RESULT: PASS — all security checks passed
EXIT=0
```
（全部断言 PASS：login/token/越权/saveVersion 并发/原子写/邀请码门控）

### 5. `grep -rn "debug=True" backend/server.py api/index.py`
```
No matches found
（零命中）
```

## 新发现的陷阱

- [测试纪律/orch] 切勿用 `git stash` 来测「改动前基线」——它会把整轮未提交产物（含组件删除）一并收走，subagent socket 掉线时若遗忘 pop 会显得「工作全没了」。本轮已安全 `git stash pop` 还原并复跑全绿。要对比基线，更稳的是临时 worktree 或 `git show`，别在主工作树 stash。
- [迁移] v14 `migrateNurtureData` 必须**白名单重建对象**而非 spread 浅拷贝，否则删掉的旧字段（attributes/battleEnhancements/trainingCooldowns…）会随 spread 漏进新档。测试用 `not.toHaveProperty` 守这条。

## 状态
PASSED

## 注意事项
- 已知入口保护核实：家园挂机 `settleHomestead` 用的 `addCharacterExp`/`addIdleAffection` 与挑战塔结算用的 `addCharacterExp` 均保留可用、签名未变；新增 `addBattleAffection` 不影响既有入口。
- 货币只走出口：补习走 `profile.spend('knowledgePoints')`，里程碑奖励走 `profile.earn('knowledgePoints')`，未绕过货币门面。
- 存档三处同改 + 不破往返：v14 的 nurture 瘦身 + equipment 空域均 schema/migrations/装配器三处同改，并补迁移与往返测试，既有往返保真测试未破。
- 装备域为 C2 占位：C1 不产出/不消费装备，equipment store 仅空背包/空配装 + 序列化往返；角色页 3 槽为静态空占位。
