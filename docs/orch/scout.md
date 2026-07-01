# Scout Report — Iteration 3（S14-A 第 3/3 轮 · product-loop --tier1 on --mode all）

> 本轮切片 = **SA-T4（个人技驱动差异化技能位）+ SA-T5（可重复日循环 / 扫荡 + 存档 v14→v15）**。
> **关键前情：本切片在第 2 轮已实现并被 Evaluator 判 COMPLETE**（见 `docs/orch/eval.md`：type-check 0 / test 653 全绿 / build 通过 / security PASS / grep 零命中，两 SA-T 真实性抽查属实）。
> tier1 on = 引擎跑满 3 轮，本轮为**验收再确认 + refine 抓回归**，**不开新范围**（合同 L5/L67）。Scout 已逐文件核实：三审提出的方案在代码里**全部成立且已落地**。
> 只读侦察（Read/Glob/Grep），未改源码。核证源：`data/squadSkillKits.ts`、`engine/squad/{types,rewards,effects,timedBattle}.ts`、`stores/{pve,userStore}.ts`、`views/HomesteadHubView.vue`、`types/player.ts`、`infra/persistence/{schema,migrations}.ts`、`engine/squad/rewards.test.ts`。

---

## A. 约束与可行性（给 Planner）

三审核心可行性质疑逐条核实结论（**均已在代码验证成立**）：

- **SA-T4「零引擎改 + description 工厂派生 + 借名不借 effectId」——真可行且已落地。**
  - `getSquadSkillKitForCharacter`（`squadSkillKits.ts:558-599`）结构清晰：`SIGNATURE_KIT_OVERRIDES[character.id]` 命中用覆盖、未命中回落 `archetypeEffects(archetype)` 原型（L571-597），单角色纯函数、零引擎改。
  - `SkillEffect` 类型（`engine/squad/types.ts:62-115`）9 种 union（damage/heal/shield/applyStatus/cleanse/energyGain/dispel/revive/execute），覆盖表**只用这 9 种**（`ALLOWED_SQUAD_EFFECT_TYPES` L15-25 白名单），无 /battle effectId 泄漏。
  - `describeSquadSkill`（L177-179）从 effects **自动派生**描述；覆盖 kit 强制走 `skill()` 工厂（L181-198）令 `description = describeSquadSkill(def)`（L197），**结构性锁死「描述≠行为」红线**——手写 description 无入口。拍板 ④ 成立。
  - **拍板 ⑥「stats/rarity 分档」= 可选增强，本轮未做**（`archetypeEffects` 仍是纯 switch(archetype) 无 base 锚点分档）。不是缺口——合同 L99 明确「分档降 backlog」。若 Planner 想在本轮补，须守「角色自身 base 绝对锚点、禁同原型均值」（否则破 engine 纯净/确定性）；**建议维持 backlog，本轮零改动最稳**。

- **SA-T5「SAVE_VERSION + completeFloor/rewards 结算链 + daily 跨天判定复用」——真可行且已落地。**
  - `SAVE_VERSION`（`schema.ts:37`）已升 **15**（v15 沿革 L22-23）；`createDefaultTowerProgress`（L292-303）加扁平定长两字段 `sweepWeekKey:''` / `sweepUsedThisWeek:0`（**非 Record<floor,count>**，拍板 ② 成立）。
  - `completeFloor`（`pve.ts:73-80`）与扫荡**完全解耦**：`sweepFloor`（L119-134）走独立 action，只读 `hasCompletedFloor`（`floor < currentFloor`）判资格 + 记周计数 + 返回 reward，**绝不调 completeFloor**（拍板 ① 成立），主线推进逻辑不变。
  - `rewards` 结算链：`calculateSweepReward`（`rewards.ts:53-63`）纯函数、无 RNG 需求（确定产出）、0.35× 首通 + sqrt 边际递减 + 绝对封顶（KP60/EXP55）、装备不掉（拍板 ④ 成立）。发奖走门面 `userStore.sweepFloor`（`userStore.ts:684-693`）：`profile.earn('knowledgePoints')` + 逐有效成员 `nurture.addCharacterExp` + `saveToServer`（货币走 spend/earn 铁律遵守）。
  - **daily 跨天/周判定「复用」的实际形态 = 复制 weekKey 算法而非 import**：`pve.ts:20-30 weekKey()` 是 `daily.ts` 同款 ISO 周键的**复制**（注释 L19 明说「复制而非横向 import，保持领域 store 自包含」）。`ensureThisSweepWeek`（L93-99）读时归零、幂等、加载即判定（`deserialize` L159 调用）、周键相等即不重置（回拨钳位，拍板 ⑥ 成立）。**注意：这与「直接复用 daily.ts」的设想不同——是同源算法的独立副本，属可接受取舍（领域 store 不横向依赖），Planner 无需要求改回 import。**

**结论：本切片两 SA-T 已完整达成合同全部拍板，无可行性障碍、无未落地拍板。本轮 Planner 应定位为「零改动确认 + 至多打磨 refine」，不引入 schema 变更（v15 是本 sprint 唯一升级）。**

---

## B. 代码地图与坑（给 Generator，附文件路径 + 角色说明 + 要避开的坑）

**SA-T4 相关（角色差异化技能位）**
- `frontend-vue/src/data/squadSkillKits.ts` — **核心**。
  - `SIGNATURE_KIT_OVERRIDES`（L411-551）：10 招牌 UR 覆盖表（id 3575/10440/304/706/10439/49/12393/10596/1211/303），落 8~12 区间。**改动这里必须**：① 只用 9 种 squad effect；② 走 `skill()` 工厂（禁手写 description）；③ 差异在机制层（execute/revive/群 stun/silence/独特 dot/独特 target），非纯倍率；④ 保证覆盖前后 `filter(isSquadSkillKitReady)` 全角色集合不变（守 SA-T2 同源，否则种子测试静默失效）。
  - `describeSquadSkill`（L177）/`skill()`（L181）/`archetypeEffects`（L200-382）/`validateSquadSkillKit`（L625）—— 勿动结构。
  - `isSignatureKit(characterId)`（L554-556）已导出留口给未来 UI 徽章（本轮不做徽章）。
- `frontend-vue/src/engine/squad/types.ts` — `SkillEffect`/`StatusKind`/`TargetSelector` 类型源。扩 type = 违拍板 ③，禁。
- `frontend-vue/src/engine/squad/effects.ts` — effect 执行器（`case 'revive'` L361 / `case 'execute'` L369 真实现）。
- `frontend-vue/src/engine/squad/timedBattle.ts` — `stun`/`silence` 在 L162/L180/L210-211 真正 gate「跳过行动」（`actionSkipped` 事件）——覆盖表的群控 effect 确实跑通引擎，非死机制。
- `frontend-vue/src/data/squadSkillKits.test.ts` — 覆盖用例（命中/回落/≠同原型/description===describeSquadSkill/无手写/无 handler/集合不变 + executeSkill·simulateTimedBattle 端到端断言）。改覆盖表须同步更断言。

**SA-T5 相关（扫荡日循环 + 存档 v15）**
- `frontend-vue/src/engine/squad/rewards.ts` — `calculateSweepReward`（L53）+ `SWEEP_KNOWLEDGE_CAP=60`/`SWEEP_CHARACTER_EXP_CAP=55`（L50-51）。纯函数，改产出公式须同步 `rewards.test.ts`。
- `frontend-vue/src/stores/pve.ts` — `SWEEP_WEEKLY_CAP=10`（L17）、`weekKey`（L20）、`ensureThisSweepWeek`（L93）、`canSweep`/`sweepFloor`（L111-134）、`serialize`/`deserialize`（L147-160，deserialize 后调 ensureThisSweepWeek）。
- `frontend-vue/src/stores/userStore.ts` — 门面 `sweepFloor(floor, squadId)`（L684-693）：earn + 逐成员 addCharacterExp + saveToServer。UI 只经门面，勿在组件直改货币。
- **存档三处同改（改任何 sweep 存档字段必须三处齐动 + 往返测试）**：
  - `frontend-vue/src/infra/persistence/schema.ts`（SAVE_VERSION L37、createDefaultTowerProgress L292、v15 沿革 L22）
  - `frontend-vue/src/infra/persistence/migrations.ts`（migrateTowerProgress L79-80 类型守卫，final version L242）
  - `frontend-vue/src/stores/pve.ts`（装配器 serialize/deserialize）+ `frontend-vue/src/types/player.ts`（TowerProgress 类型 L54-55）
  - `frontend-vue/src/infra/persistence/migrations.test.ts` — 往返保真（旧档补 ''/0、脏档类型回落、计数存回一致）。
- `frontend-vue/src/views/HomesteadHubView.vue` — UI 落 explore 面板已通层区（`.sweep-card` L561-593）：`sweepFloor`=currentFloor-1（L281）、进度条 `sweepUsed/sweepWeeklyCap`（L572）、一键飘字 `handleSweep`（L308-315）走 `timers[]`+`scheduleClear`+onUnmounted 清除（L294-306，setTimeout 登记纪律遵守）；全语义令牌样式（L720-736，无 text-white/无动态色类）。

**要避开的坑（本切片专属）**
1. **stub 字段陷阱**：`TowerProgress.todayAttempts/lastAttemptDate`（`player.ts:54-55`）是**历史遗留死字段**，扫荡**未复用**（拍板 ② 正确，语义错配）。别误以为它们参与计数——sweep 只认 `sweepWeekKey/sweepUsedThisWeek`。改动勿把两套混起来。
2. **weekKey 是副本非 import**：`pve.ts:20` 的 weekKey 与 `daily.ts` 是**两份同源代码**。若未来改周键算法（如换周起始日），**两处都要改**否则跨模块周界不一致（当前无 bug，属维护性提醒）。
3. **覆盖表「集合不变」是隐形回归面**：任何让某覆盖 kit 变得 `!isSquadSkillKitReady` 的改动，会静默改变敌人候选池 → 破坏 SA-T2 同源种子（预览≠实战复发），且种子测试仍绿（缺陷不可见）。改覆盖表后**必跑 squadSkillKits.test.ts 的「集合不变」用例**。
4. **迁移删/加字段用白名单重建**（pitfalls S13-C1）：TowerProgress migrate 已是显式字段列举（`migrations.ts:72-81`），非 spread——保持这个姿势，勿改成 `{...raw, sweep...}`（会漏脏字段）。

---

## C. 新发现的坑

- **无新代码坑**。逐文件核实：engine 纯净（squad/rewards/timedBattle 零 Math.random 实调用、零 store import）、存档三处同改齐全、颜色语义令牌、setTimeout 登记清除、货币走 earn——全部合规，与 eval.md「新坑待追加：无」一致。
- **一条维护性提醒（非坑，供记录）**：`weekKey` 在 `pve.ts` 与 `daily.ts` 双份存在（领域 store 自包含的刻意取舍）。当前无问题，但属「同源双副本」——若哪天出现「扫荡周界与每日任务周界不一致」的报障，第一嫌疑是这两份算法漂移。可在 pitfalls 备一句，无需本轮动手（改成共享 util 反而引入 store→util 依赖决策，收益不抵成本）。
- **product-loop tier1-on 语义确认**：本切片 checkbox 已 `[x]`、eval 已 COMPLETE。第 3 轮跑满是引擎行为，**Generator 若无三审新 refine 指令，正确动作是「零改动、复跑验收全绿」**；切勿为「凑改动」去动已 COMPLETE 的稳定实现（尤其别碰 v15 schema、别扩 SIGNATURE_KIT 到 20——合同 L94 明确拒绝 FUTURE.md 的 20）。
