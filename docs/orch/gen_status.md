# Gen Status — S14-C 第 3/3 轮（最终轮，product-loop --tier1 on --mode all）

> 指派切片 = **SC-T3 + SC-T4 + SC-T6**，三项全部真落地。S14-C 全部 SC-T1..T6 现全 `[x]`。

## 完成任务

### SC-T3｜养成第三轴：星级/突破（消化重复角色卡，存档 v16）— DONE
- **选项 A**：突破只给永久小加成，不动 `MAX_CHARACTER_LEVEL`/`addCharacterExp` 钳制。
- engine 纯函数（`engine/nurture/rules.ts`，确定成长无 RNG）：
  - `MAX_BREAKTHROUGH=5`、`BREAKTHROUGH_STAT_BONUS_PER_STAR=0.04`（5 星累计 +20% base ≤25% 硬上限）。
  - `breakthroughCost(star)`：阶梯 star+1，满星 Infinity，5 星累计 15 张。
  - `breakthroughStatBonus(star, base)`：base×star×4% 向下取整；`pctStatBonus`、`sumStatPoints`、`canBreakthrough` 纯判定。
- 扣卡收口 collection：`consumeCharacterCards(id, n)` 无 KP 副作用、保留本体 1 张（可消耗 = count-1），禁直改 Map/禁复用 dismantleCard。
- store action `nurture.breakthroughCharacter(id)`：读 collection 计数 → engine 判定 → 扣卡 → breakthrough++ → addLog；userStore 门面成功才 saveToServer。
- 存档 v16 三处同改：`types/nurture.ts` 加 `breakthrough`（+文件头三轴注释）/ `rules.ts createDefaultNurtureData` 补 0 / `migrations.ts migrateNurtureData` 白名单**显式加**（禁 spread，clamp [0,MAX]、类型守卫）+ `getNurtureData` 运行时兜底。nurture 域全量 Map 序列化天然覆盖，第三处义务 = persistence.test.ts 往返断言。`SAVE_VERSION 15→16`（本 sprint 唯一 bump）+ schema 文件头 v16 沿革。
- UI：NurtureView 详情内容区加「星级突破」内聚小块（星级进度 + 突破按钮 + cost/可用卡 + 下一星 delta 预览 + 满星置灰），语义令牌，无 text-white 压浅底/无动态色类。

### SC-T4｜好感等级化：永久意义 + 每日回归钩子（与 SC-T3 共用 v16）— DONE
- 里程碑永久加成：`BOND_MILESTONES` 每档加 `statBonusPct`（全 6 档累计 +15% ≤ 突破，守 C1）；`bondPermanentBonusPct(claimedIds)` 从**已领里程碑集纯派生**（不新增存档字段，engine 不 import config，pct 注入）。
- 每日互动：`nurture.dailyBondInteraction(id)`（+20 好感/+200 经验），跨天判定读 `lastBondInteractionDate`（v16 字段，复用 daily todayKey 范式，扁平字段、无定时器）；跨天正确重置（测试锁）。userStore 门面成功 markProgress('nurture') + saveToServer。
- 好感溢出转 KP：`bondOverflowExchange(aff)`（领完 bond_6/4000 后每 50 好感兑 1 KP，整份兑、余数保留）+ `nurture.claimBondOverflow(id)`。
- UI：详情区加「每日互动」按钮（今日已互动置灰）+「好感溢出兑换」按钮（有溢出才出）+ 里程碑列表显示每档永久加成 %。

### 战力 3+ 处同源（红线）— DONE via 单一 helper
- 新建 `utils/battleStats.ts`：engine `resolveNurturedStatPoints` 折 statPoints + 突破 + 好感永久成**一个** StatPoints → 走既有 `generateBattleStats(base, folded, equipBonus)`，**不新增 generateBattleStats 第 4 参**（消灭「第 N 条战力通路」，SC-T4 顺同一口径）。
- 收敛 helper `resolveMemberBattleStats` / `resolveNurturedStatPointsFor` 注入全部消费点：HomesteadHubView `selectedFinalStats`+`memberPower`+`selectedStatRows`、SquadBattleView `buildCharacterStats`（玩家侧，敌方仍 EMPTY）、NurtureView `finalStats`+`statRows`+ EquipPickerModal（传 nurturedStatPoints）。SC-T5 门槛口径自动含突破（经 squadPower）。

### SC-T6｜NurtureView 拆无壳可内嵌组件（纯 UI）— DONE
- 去 NurtureView 页级壳：删 `min-h-screen`、页级 `<h1>角色养成`、独立未登录空态、独立无角色空态（改紧凑兜底）；组件自持角色列表 + 自动选中首角色。
- hub characters 面板删除重复的 summary 镜像（角色 chips + stat-mini + equip-mini + skill-list）与相关死 computed（selectedStatRows/EquipRows/SkillRows/FinalStats/Nurture/slotTone/emptyStats）+ 清死 import；只保留**一套**标题 + 一套空态（hub 壳统一 gate 未登录/无角色）+ 内嵌无壳 NurtureView。SC-T3 突破 UI 随壳平移进无壳组件（内聚）。
- `/nurture`、`/squad-battle` 重定向未动（router/index.ts 原样，仍工作）。养成逻辑/store/engine/存档零改（纯 UI）。

## 每条验收命令实际输出

1. `npm run type-check` → **PASS**（`vue-tsc --build`，0 错误，无输出）。
2. `npm run test` → **PASS**：`Test Files 60 passed (60) / Tests 714 passed (714)`（基线 687，+27 新增：engine breakthrough/bonus/resolve/canBreakthrough、migrations v16 缺省/往返/脏档 clamp/not.toHaveProperty、persistence v16 往返、nurture store 突破/每日互动/溢出、collection consumeCharacterCards）。
3. `npm run build` → **PASS**：`✓ built in 9.80s`（type-check + vite 生产构建成功）。
4. `.venv/Scripts/python.exe backend/test_security.py` → **PASS**：`RESULT: PASS — all security checks passed`，`EXIT=0`。
5. `grep -rn "debug=True" backend/server.py api/index.py` → **零命中**（EXIT=1 = no match，符合预期）。
- 附：`npx eslint`（9 个改动文件单文件）→ EXIT=0 无告警。

## 未完成 / 卡点
无。三项指派切片全部真落地全链（字段 + 迁移 + engine + store action + collection 扣卡 + 3+ 处战力注入 + UI + 全套测试）。

## 文件结构变更自报
- 新增：`frontend-vue/src/utils/battleStats.ts`（战力单一收口 helper）、`frontend-vue/src/stores/nurture.test.ts`（突破/每日互动/溢出/扣卡行为测试）。
- 改：`types/nurture.ts`、`config/nurture.ts`、`engine/nurture/rules.ts`、`engine/nurture/rules.test.ts`、`stores/collection.ts`、`stores/nurture.ts`、`stores/userStore.ts`、`infra/persistence/schema.ts`、`infra/persistence/migrations.ts`、`infra/persistence/migrations.test.ts`、`stores/persistence.test.ts`、`views/NurtureView.vue`（重写：无壳 + 突破/互动 UI）、`views/HomesteadHubView.vue`（删重复 summary + 战力注入收口）、`views/SquadBattleView.vue`（玩家侧战力注入收口）、`docs/plans/SPRINT.md`（SC-T3/T4/T6 勾 `[x]`，主清单 + 第 3 轮追加子项）。

## 新坑（沉淀）
- [战力单一口径优于第 4 参] 把突破/好感永久加成折成 statPoints 增量（`resolveNurturedStatPoints`）传进既有 `generateBattleStats`，**不加第 4 参**——SC-T5 门槛口径零改动自动含突破收益，SC-T4 顺同一函数接入，未来专武/羁绊也走这里。避免了 research-audit 警告的「口径碎裂」。
- [SC-T6 拆壳连带死代码] hub characters 面板原有一套 summary 镜像（与 NurtureView 重复），拆壳时必须连带删镜像 computed + 清死 import（tsconfig 无 noUnusedLocals，type-check 不报，但留死代码/eslint 风险）。已连根删除并单文件 lint 验证。
- [nurture 装配器天然覆盖] 再次确认 nurture 域 serialize/deserialize 是全量 Map entries，v16 新字段自动随行，装配器代码零改，第三处义务落在 persistence.test.ts 往返断言（勿硬改装配器凑数）。

## 状态：PASSED
本轮实现了 SC-T3（星级突破 v16）+ SC-T4（好感等级化，共用 v16）+ SC-T6（NurtureView 拆无壳组件），5 条验收命令全绿，S14-C 全部 SC-T1..T6 已 `[x]`。
