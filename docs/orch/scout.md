# Scout Report — S13-C2 装备系统全栈（Iteration 1）

> 侦察范围：SPRINT.md C2-T1..C2-T5。无 project_structure.md，直接探查。
> 关键结论：**存档地基已全部就绪**（schema/migrations/persistence 装配器三处已含空 equipment 域 + 往返保真），C1 已把 `generateBattleStats(base, statPoints, equipBonus)` 第三参留好。C2 是「填行为 + 接线 + 来源 + UI」四件事，**不升档、不动 engine 公式签名**。

---

## A. 约束与可行性（给 Planner —— 影响 WHAT/范围）

### C2-T1｜装备目录 config — 直接可做（零阻力）
- 理由：纯新建 `config/equipment.ts`，无任何依赖。`config/homestead.ts` 是同 Sprint 家族的完美模板（纯常量 + 纯计算函数 + `Record<Rarity,...>` + JSDoc 基线说明）。`Rarity` 类型走 `@/types/card`。
- 建议：把「掉落层段表」「兑换价表」「数值预算」「槽位元数据（名/icon 键）」全集中此文件，作为后续可调旋钮。**兑换价表（R400/SR1200/SSR4000/HR10000/UR24000）须与 `config/codexUnlock.ts` 价表（UR12000）拉开**——SPRINT 给的装备 UR=24000 > 图鉴 UR=12000，符合「装备是更深 sink」，照抄即可不必再平衡。

### C2-T2｜equipment store 行为 — 直接可做
- 理由：`stores/equipment.ts` 已有 `inventory: ref<EquipmentItemSave[]>`、`equipped: ref<Record<number, EquippedSlots>>`、serialize/deserialize/reset。只需在 return 前补 `addItem/equip/unequip/resolveEquipBonus/getEquipped/list`。`crypto.randomUUID()` 浏览器/vitest(jsdom) 均可用。
- 建议：**`resolveEquipBonus` 抽成 engine 纯函数**（见下文坑），store 只做「取 equipped + 查 inventory defId + 查 config bonus」的装配并委托纯函数求和——满足 SPRINT「纯函数便于测试」与「engine 纯净」双约束。store 测试覆盖 equip/unequip/换装/同槽校验/resolveEquipBonus 求和。

### C2-T3｜战力接 equipBonus — 直接可做，需改 3 处调用点（口径一致是关键）
- 理由：`generateBattleStats` 第三参已是 `StatBonus`，C1 已用恒 0 占位。改的是 3 个站点：
  - `SquadBattleView.vue:131` `getSquadPower()`（小队战力展示）
  - `SquadBattleView.vue:183` `createSquadMember()`（实际进战斗的属性）
  - `NurtureView.vue:66` `finalStats`（角色页五维/战力展示）+ `NurtureView.vue:78` `statRows` 的 `equip` 列
- 建议：三处都把 `NO_EQUIP_BONUS` 换成 `equipmentStore.resolveEquipBonus(charId)`。**这是「口径一致」的核心**——养成页五维 delta 预览、塔战力、小队战力必须用同一个 `resolveEquipBonus`，否则数字打架。建议在 store 暴露该方法即可，组件不各自实现。

### C2-T4｜来源：塔掉落 + KP 兑换 — 直接可做，掉落接线点已定位
- 理由：
  - **掉落纯函数 `rollTowerDrop(floor, rng)`** 放 `engine/squad/`（tower.ts 或新 `drops.ts`），RNG 注入现成（`engine/rng.ts` 的 `RNG.chance(0.5)` / `pick` 直接够用）。
  - **掉落接线点 = `SquadBattleView.vue:383` `userStore.completeFloor(currentTowerFloor.value)` 处**（`endBattle()` 胜利块内）。建议在 `completeFloor` 编排（`userStore.ts:588`）里调掉落纯函数 + 命中则 `equipment.addItem` + 通知，与现有 `completeFloor` 的 `saveToServer()` 同一事务——**不要在组件里直接 addItem**（跨域编排走门面是铁律）。
  - **KP 兑换**：照搬 `userStore.unlockCodexCard`（userStore.ts:240-269）范式——登录校验 → `profile.spend('knowledgePoints', price)` 失败不发货 → 成功 `equipment.addItem(defId)` + `addLog` + `saveToServer`，返回 `{ok, error?}`。
- 建议：掉落特征测试（层段→稀有度边界 1/5/6/15/16/30/31/50/51；`chance` 用 `createSequenceRng` 注入可复现 50% 边界）。兑换测试照 `stores/unlockCodex.test.ts` 套路（mock 传输层、断言 spend/余额不足不发货）。

### C2-T5｜UI：背包 + 配装 — 直接可做，但工作量最大
- 理由：背包视图需新建（无现成入口——见下文坑，需挂路由或塞进 Nurture/Homestead）；配装弹窗替换 `NurtureView.vue:315-330` 的 3 个 `未解锁` 占位 div。delta 预览复用 `resolveEquipBonus`（装上候选后的假设 bonus）+ `calculateBattlePower`。
- 建议范围：mock 已定稿（背包=变体1网格、配装=变体A弹窗），**照做不要再发明**。稀有度色**用 `gameConfig.rarityConfig[r].color`（text-*）/`.c`（渐变）现成字面映射**，不要运行时拼 `bg-${rarity}`（C1 barColor 教训）。背包是否独立路由 vs 内嵌由 Planner 定（见坑）——建议内嵌 NurtureView 作为 tab 或独立 section，避免新增路由/router 改动扩大范围；若要独立页则需改 `router/index.ts` + 导航入口。

---

## B. 代码地图与坑（给 Generator —— HOW 接地）

### 全局存档地基（已就绪，勿重复造）
- `infra/persistence/schema.ts:34` `SAVE_VERSION = 14`（**已是 14，C2 不升档**）。`EquipmentItemSave{uid,defId}` / `EquippedSlots{weapon,armor,supporter: string|null}` / `EquipmentSave{inventory,equipped:Record<number,EquippedSlots>}` / `createDefaultEquipment()` 全在 schema.ts:140-163。
- `infra/persistence/migrations.ts:190 migrateEquipment` 已做防御性归一（inventory 过滤 `{uid,defId}` 形态、equipped 逐槽补 null）。
- `stores/persistence.ts:70 / :108` buildPayload/applyPayload 已接 `useEquipmentStore().serialize()/deserialize()`，:129 reset 已接。**这三处都不用动**。
- `stores/equipment.ts`：C1 空域，只缺行为。

### C2-T1 相关文件
- 新建 `frontend-vue/src/config/equipment.ts`。模板：`config/homestead.ts`（纯常量 + `Record<Rarity,number>` + 纯函数 + 设计基线 JSDoc）。
- 类型源：`@/types/card` 的 `Rarity`（'N'|'R'|'SR'|'SSR'|'HR'|'UR'）。`StatBonus`/`BattleStats` 形状（hp/atk/def/sp/spd）在 `engine/squad/combat.ts:8,115`。
- 物品定义建议形状：`{ id, name, slot:'weapon'|'armor'|'supporter', rarity:Rarity, bonus: Partial<BattleStats> }`。SPRINT 给了起始目录名梗 + 数值预算（R~18/SR~35/SSR~60/HR~95/UR~140，hp 按 ~2.5× 折算）。

### C2-T2 相关文件
- `stores/equipment.ts`：填行为。`crypto.randomUUID()` 生成 uid。
- 同槽校验：`equip(charId,slot,uid)` 前要确认 `inventory` 里该 uid 的 `defId` 对应 config 的 slot == 目标 slot；换下旧件不删、留背包（equipped 里旧 uid 置换即可，uid 仍在 inventory）。
- `resolveEquipBonus(charId)`：取 `equipped[charId]` 三槽 uid → 查 inventory 得 defId → 查 config 得 bonus → 逐围求和（缺省 0）。**抽 engine 纯函数**：建议让 engine 暴露 `sumStatBonus(bonuses: Partial<StatBonus>[]): StatBonus`，store 负责「uid→defId→def→bonus」查表后把 bonus 数组喂给 engine（IO/查表留 store/config，engine 只收纯数据，见坑）。
- 测试参考：`stores/homestead.test.ts`（domain store 行为测试样板）。

### C2-T3 相关文件
- `views/SquadBattleView.vue`：`NO_EQUIP_BONUS`（:24）、`getSquadPower`（:127-138）、`createSquadMember`（:181-197）。两处 `generateBattleStats(... , nurtureData.statPoints, NO_EQUIP_BONUS)` → 换 `equipmentStore.resolveEquipBonus(character.id)`。
- `views/NurtureView.vue`：`finalStats`（:64-67）、`statRows`（:72-84，其中 `equip` 列现读 `NO_EQUIP_BONUS[meta.key]`）。需引入 equipment store，把 `equip` 列变真值。
- engine 纯净不破：`generateBattleStats` 签名不动（C1 已定型，`combat.test.ts` 锁定）。
- 测试参考：`engine/squad/combat.test.ts`（公式特征测试）。

### C2-T4 相关文件
- 掉落纯函数：`engine/squad/`（新 `drops.ts` 或并入 tower.ts）；从 `engine/squad/index.ts:5-6` 导出（如 `export * from './drops'`）。`engine/index.ts:17` 已 `export * from './squad'`。
- 掉落接线：`SquadBattleView.vue:362 endBattle()` 胜利块 → `:383 userStore.completeFloor()`。建议把掉落 roll + addItem + 通知放进 `userStore.ts:588 completeFloor` 编排（与 `useAchievementsStore().check('tower')` + `saveToServer()` 同处）。注意：`completeFloor` 现仅在 `pve.completeFloor(floor)` 返回 true 时执行后续——掉落也应只在真通层时给（见 C 段去重坑）。
- 层段→稀有度映射：1-5→R / 6-15→SR / 16-30→SSR / 31-50→HR / 51+→UR（放 config/equipment.ts，纯函数 `dropRarityForFloor(floor)`）。槽随机：`rng.pick(['weapon','armor','supporter'])`。50%：`rng.chance(0.5)`。
- KP 兑换：照搬 `userStore.unlockCodexCard`（userStore.ts:231-269）——`profile.spend('knowledgePoints', price)` 是唯一货币出口，失败不发货、成功 addItem + addLog + saveToServer，返回 `{ok,error?}`。价表用 config/equipment.ts。
- 通知通道：`profile.addLog(msg, 'success'|'warning'|'info')`（全站统一 toast/日志通道，homestead/codex 都用它）。
- 测试参考：`stores/unlockCodex.test.ts`（spend/不发货）、`engine/squad/tower.test.ts`（注入 RNG 特征测试）、`config/homestead.test.ts`（纯函数边界）。

### C2-T5 相关文件
- 配装弹窗替换：`NurtureView.vue:315-330`（3 个 `未解锁` 占位 div，`equipSlots`(:131) 已有 key/label/icon）。变体 A picker：左列同槽候选（含「卸下」）+ 右侧五维 `当前→新值(+Δ)` + 战力 `当前→新值`。delta 预览：对候选 uid 构造假设 equipBonus → `generateBattleStats` → `calculateBattlePower` 对比当前。
- 背包视图：新建组件（变体 1 网格）。稀有度徽章/筛选。
- 稀有度色：用 `GAME_CONFIG.characterSystem.rarityConfig[r]`（gameConfig.ts:261+，含 `color:'text-red-600'…` + `c:'from-amber-400 to-red-500'` 渐变 + `effect` 边框）——**完整字面映射现成**，直接索引读，禁运行时拼类。颜色规则：界面色走语义类（bg-surface/text-ink/text-ink-2/border-line/accent），禁 text-white 压浅底（稀有度识别色是固定例外）。
- 卡图：装备无图，用 emoji/slot icon 即可；若复用角色头像 `thumbImageSrc('character', id)`（utils/cardImage.ts:15，缺图 `onThumbError` 回退）。
- 弹窗基建：项目有 `composables/useDialog.ts` + `components/AppDialog.vue`（语义令牌 + Esc/Enter），简单确认走它；但变体 A 是富交互 picker，建议独立组件（参照 `components/battle/CharacterSelectModal.vue` 弹窗模式，SquadBattleView 在用）。
- setTimeout/rAF：组件内任何延时必须登记数组 + onUnmounted 清除（SquadBattleView `schedule()` 样板；NurtureActions 曾漏一个）。

### 已知坑（来自 pitfalls.md，与本轮强相关）
- **barColor 拼类教训（config/nurtureColors.ts 注释）**：进度条/徽章实底类必须是完整字面（`bg-accent`），**勿运行时拼 `bg-${x}`**——拼出的类无静态字面、JIT 不生成、渲染缺色。稀有度色照样适用。
- **engine 纯净**：`engine/` 零 Vue/Pinia/DOM/`Math.random`。掉落/equipBonus 求和走纯函数 + 注入 RNG。
- **货币只走 spend/earn**：兑换扣 KP 必须 `profile.spend('knowledgePoints')`，禁直改 `playerState.knowledgePoints`。
- **不动 C1 成果**：养成两轴（等级加点 statPoints + 好感 affection/里程碑）、家园挂机/塔的加经验·好感入口（`addCharacterExp`/`addBattleAffection`/`addIdleAffection`）勿动。
- **不碰存档协议**：本轮不升档。完全不动 schema/migrations/装配器三处（已就位）。若误改 schema 触发升档，删字段必须白名单重建（不 spread）——但本轮不应触发。
- **setTimeout 假安全**：onUnmounted 要清 setTimeout（不止 setInterval）。

---

## C. 新发现的坑（待 Sprint 结束追加到 pitfalls.md）

- **[掉落去重语义 — 必查]** 塔掉落挂在 `userStore.completeFloor`（userStore.ts:588），它仅在 `pve.completeFloor(floor)` 返回 true 时执行后续逻辑。**Generator 必须先读 `stores/pve.ts` 的 completeFloor，确认「重复通过同一层」是否返回 false**——若返回 true，玩家可反复刷已过低层刷装备（经济漏洞）。若只在「该层首次通过/推进进度」返回 true，则掉落天然防刷直接挂在其后；否则掉落需自带「仅新进度层」守卫。
- **[背包入口缺失]** 全库无装备/背包视图，`router/index.ts` 9 个路由无 inventory 入口。背包 UI 放哪是范围决策：内嵌 NurtureView/HomesteadView（不改路由，范围小）vs 独立 `/inventory` 路由（改 router + 导航 + lazy import，范围大）。Planner 应明确，避免 Generator 擅自加路由扩大 diff。
- **[engine 不 import config 的边界]** equipBonus 求和若放 engine 纯函数，engine 不应 import `@/config/equipment`（engine 章程禁 import @/stores 等；config 未明列但保守）。最干净：store 把「已解析的 bonus 数组」喂给 engine `sumStatBonus(bonuses)`，查表（uid→defId→def→bonus）留 store。别让 engine 反向依赖 config 目录数据。
- **[NurtureView equip 列双源风险]** `NurtureView.vue:78 statRows` 的 `equip` 列与 `:66 finalStats` 都要改读同一 `resolveEquipBonus(charId)`，否则五维分行加和（base+point+equip）与 finalStats 合计对不上、delta 预览自相矛盾。两处必须同源同改。
