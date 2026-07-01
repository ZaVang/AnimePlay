# Plan — S14-A 第 3 轮（product-loop --tier1 on --mode all）· 验收再确认 / 回归锁

> 本轮切片 = **SA-T4（个人技驱动差异化技能位）+ SA-T5（可重复日循环 / 扫荡 + 存档 v15）**——与第 2 轮**同一切片**。
> **关键前情**：本切片第 2 轮已实现且被 Evaluator 判 **COMPLETE**（`docs/orch/eval.md`：type-check 0 / test 653 全绿 / build 通过 / security PASS / grep 零命中；两 SA-T 真实性抽查属实）。
> tier1 on = 引擎跑满 3 轮，本轮是**验收再确认 + 抓回归 + 至多打磨 refine**，**绝不开新范围**（合同 L5/L67）。Scout 第 3 轮逐文件核实：三审方案「全部成立且已落地、无未落地拍板、无新代码坑」。
> **本轮定位（写死给 Generator）**：若无三审新 refine 指令，**正确动作 = 零改动、复跑验收全绿**；切勿为「凑改动」去动已 COMPLETE 的稳定实现（**尤其别碰 v15 schema、别扩 SIGNATURE_KIT 到 20**）。
> 只规划 WHAT/WHY，不指定 HOW（文件路径/函数名仅作「来源锚点」引用）。

---

## 依赖顺序

1. **验收复跑（无依赖）**：5 条验收命令原样重跑，记录实际输出——本轮的主任务。
2. **SA-T4 回归锁**：确认覆盖表稳定实现无回归（尤其「候选池集合不变」隐形回归面）。
3. **SA-T5 回归锁**：确认 v15 存档 + 扫荡链稳定实现无回归（尤其「不再动 schema」红线）。
4. 三者无强耦合；SA-T4 触碰 `isSquadSkillKitReady` 上游 → 回归锁重点守「候选池集合不变」（护第 1 轮 SA-T2 同源）。

---

## SA-T4（第 3 轮）｜签名覆盖表回归锁 · 零扩表

**目标（WHAT/WHY）**：确认「让抽到的招牌 UR 打一场就记住她」这条第 2 轮兑现的收集动机（审计根因 A）在本轮无回归、无被凑改动破坏。本轮**不新增签名角色、不改差异化数值/机制**。

**依赖**：无前置；回归锁必须守「不改变敌人候选池集合」（护第 1 轮 SA-T2 同源）。

**本轮红线（拍板，写进验收）**：

- **T4-R1（零扩表）**：覆盖表维持头部 **8~12 招牌 UR**——**严禁扩到 FUTURE.md 的 20**（合同 L94 已明确拒绝；一次性膨胀是最脆弱假设）。Scout 判「本轮零改动最稳」。
- **T4-R2（机制层差异不退化）**：差异仍在**肉眼可辨的机制层**（execute 处决 / revive 复活 / 群体 stun/silence / 独特 DOT / 独特 target），**非纯倍率**。判据不变：「玩家一眼说得出不一样在哪」。
- **T4-R3（description 工厂派生红线不破）**：覆盖 kit 仍走 `skill()` 工厂使 `description === describeSquadSkill(def)`，**严禁手写 description 字符串**（「描述≠行为」红线在 squad 域被结构性锁死的机制，手写即重开红线）。
- **T4-R4（零引擎改 / 借名不借 effectId）**：仍只用现有 9 种 squad `SkillEffect`，**严禁把 /battle effectId 搬进小队战斗**（无 handler、不在白名单）。绝不扩 type、绝不写 handler。
- **T4-R5（候选池集合不变——最隐蔽回归面）**：覆盖 kit 必过 `validateSquadSkillKit`，且 `filter(isSquadSkillKitReady)` 对全角色返回集合**与上轮完全一致**。任何让某覆盖 kit 变 not-ready 的改动会**静默改敌人候选池 → 暗中破坏 SA-T2「预览===实战」，且种子测试仍绿、缺陷不可见**（Scout 坑 #3）。
- **T4-R6（分档层维持 backlog）**：长尾 base/rarity 分档是可选增强，**本轮零改动最稳**（Scout A.SA-T4）；若硬做须绝对锚点、禁同原型均值——但本轮**不建议动**，任何纯净/签名风险即停。

**验收（写进 checklist）**：
- `data/squadSkillKits.test.ts` 全绿：命中覆盖 / 回落原型 / 覆盖角色 kit ≠ 同原型他人 / `description === describeSquadSkill` / **无手写 description、无 handler 映射** / **覆盖前后 `filter(isSquadSkillKitReady)` 集合不变** + 端到端 `executeSkill`/`simulateTimedBattle` 断言对应 event（stun≥2、execute→defeated、revive）。
- 不新增存档字段（零 schema 改动）；HR 回落原型后名效一致。
- type-check 0 / test 全绿 / build 通过。

**来源**：审计 P1-1/P1-2（根因 A）；product C-1/C-2/I-1/I-2/N-1；evolution 机制层红线/E-13；research R2-1/R2-2/R2-6；Scout 第 3 轮 A.SA-T4 + B 区 + C 区（无新坑）+ eval.md 第 2 轮 SA-T4 属实。

---

## SA-T5（第 3 轮）｜扫荡日循环 + v15 存档回归锁 · 零 schema 再动

**目标（WHAT/WHY）**：确认「卡关也有今天能做、能变强一点的事」这条第 2 轮兑现的短目标循环（审计根因 C）在本轮无回归。本轮**不再动 schema、不改扫荡存档字段、不改缩水/封顶数值**。

**依赖**：无前置；主线推进逻辑（`completeFloor`/`currentFloor`）保持不变——扫荡走独立路径。

**本轮红线（拍板，写进验收）**：

- **T5-R1（v15 不再动——最高风险动作已稳定）**：`SAVE_VERSION=15` 是本 sprint 唯一 schema 升级、最高风险动作，第 2 轮已稳定、往返保真已验。**本轮绝不再升 schema、不改扫荡存档字段**（再动纯增风险、无收益）。
- **T5-R2（字段扁平定长不退化）**：扫荡计数维持扁平定长（`sweepWeekKey` / `sweepUsedThisWeek`），**非 `Record<floor,count>`**（随层数膨胀）、**不硬复用 stub `todayAttempts/lastAttemptDate`**（语义错配，Scout 坑 #1——sweep 只认 sweep 字段，别把两套混起来）。
- **T5-R3（独立路径不污染主线）**：`sweepFloor` 仍走独立 action、只读 `hasCompletedFloor`（`floor < currentFloor`）判资格、**绝不调 `completeFloor`**、不推进 `currentFloor`、不重复触发成就（Scout 坑 #4）。
- **T5-R4（缩水+封顶+边际递减不退化）**：奖励维持缩水 KP + 角色经验（装备不掉）；封顶（周上限=10）+ 对 floor 边际递减 + 绝对封顶（KP/EXP CAP）真生效；奖励纯函数、engine 纯净。
- **T5-R5（跨周重置 + 回拨钳位不破）**：日/周界仍复用 daily 范式（`weekKey` 读时归零、幂等、加载即判定、周键相等不重置）。**维护性提醒（非本轮动手）**：`pve.ts` 的 `weekKey` 与 `daily.ts` 是同源双副本——若未来改周键算法两处都要改（Scout 坑 #2，pitfalls 已备）。
- **T5-R6（旧档重算搭便车：拒绝）**：维持第 1 轮 SA-T3 拍板③「只影响未来升级」——**拒绝**捎带 statPoints 一次性重算（叠加 v15 往返面纯增风险，单机向存量极少不划算）。**归 backlog**。
- **T5-R7（UI 手感不退化）**：扫荡入口 + 「本周 N/M」进度条 + 「已达上限」态维持在 explore 面板已通层区；跳过 180ms 回放、轻量一键结算飘字（不复用 `SquadBattleResult` 完整演出）；语义令牌（禁 text-white/动态色类）；飘字 setTimeout/rAF 登记 + onUnmounted 清除。

**验收（写进 checklist）**：
- `migrations.test.ts` 全绿：v15 旧档补缺省（`''`/`0`）/ 脏档类型回落 / 计数往返一致（白名单重建、`not.toHaveProperty` 守漏字段）。
- `stores/pve` / `engine/squad/rewards` 测试全绿：单次 << 首通、≤ CAP、边际递减（floor=1 与 floor=high 两端，high-low<60）、满配周产出 << 推塔总量、确定性。
- 扫荡走独立路径：不调 `completeFloor`、不推进 `currentFloor`。
- 字段扁平定长（非 `Record<floor,count>`）；`SAVE_VERSION=15`（本轮未再升）。
- type-check 0 / test 全绿 / build 通过。

**来源**：审计 P1-6（根因 C）；product C-3/I-3/I-4/I-5；evolution 数值调平/schema 三改/E-6；research R2-3/R2-4/R2-5/R2-8；Scout 第 3 轮 A.SA-T5 + B 区 + C 区（无新坑，一条 weekKey 双副本维护性提醒）+ eval.md 第 2 轮 SA-T5 属实。

---

## 相关陷阱（pitfalls.md + Scout 新坑，本轮回归锁必守）

- **engine 纯净**：`src/engine/` 零 Vue/Pinia/DOM/fetch/localStorage/`Math.random`；奖励/差异化解析走纯函数 + 注入 RNG。第 2 轮已验合规，本轮零改动即保持。
- **依赖只向下**：views → components → stores → engine；engine 不 import config/store。
- **存档三处同改 + 往返测试（SA-T5，本轮不再动但须复跑守回归）**：schema + migrations + 装配器；迁移白名单重建对象、别 spread（`not.toHaveProperty` 守）。SAVE_VERSION 权威在 `schema.ts`，文档只指向不复述。
- **颜色语义令牌**：真令牌 `--c-line`（非 --c-border-line）、`--c-ink-2/-3`（非 --c-ink-soft）；工具类只有 `ink/ink-2/ink-3`（无 `text-ink-soft`）；Tailwind 透明度用 `bg-accent/15`（斜杠非反斜杠）；禁 `text-white` 压浅底 / 禁运行时拼接动态色类。审色两种 grep 都跑。
- **setTimeout/setInterval 登记 + onUnmounted 清除**（含 setTimeout，false safety 家族）。
- **Scout 坑 #1（SA-T4 最隐蔽回归面）**：覆盖 kit 校验不过 → ready→not-ready → 敌人候选池静默变化 → SA-T2 同源被暗中破坏而种子测试仍绿。守法见 T4-R5——**改覆盖表后必跑「集合不变」用例**。
- **Scout 坑 #2**：`TowerProgress.todayAttempts/lastAttemptDate` 是语义错配 stub，别塞扫荡计数（见 T5-R2）。
- **Scout 坑 #3**：/battle effectId 是 SA-T4 假朋友，别接（见 T4-R4）。
- **Scout 坑 #4**：扫荡复用 completeFloor 会污染主线推进（见 T5-R3）。
- **维护性提醒（非本轮动手）**：`weekKey` 在 `pve.ts` 与 `daily.ts` 双份存在（领域 store 自包含刻意取舍）——若报「扫荡周界与每日任务周界不一致」，第一嫌疑是两份算法漂移。本轮不改（改成共享 util 反引入 store→util 依赖决策，收益不抵成本）。
- **JSDoc 别写 Tailwind opacity**：`bg-*/20` 含 `*/` 写进 `/** */` 会提前闭合。
- **vue 模板 prop 禁裸名 `slot`**。

## 顺手项（超范围可选，触及才做）

- **N-2 / 存量 lint 债**：`SquadBattleView.vue` `towerEnemyData = ref<any>` 触发 `no-explicit-any`。若本轮触及则顺手类型化；否则留存不动、不阻断（本轮定位零改动，倾向不动）。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含 squadSkillKits/pve/migrations/rewards 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-A 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且本轮 SA-T4 + SA-T5 回归锁条目全部 `[x]` 并与实现一致（**含 SAVE_VERSION 仍=15 未再升、SIGNATURE_KIT 仍在 8~12 未扩、覆盖前后候选池集合不变**）。
> 注：`test_security.py` 若系统 python 缺 Flask 依赖，用 `./.venv/Scripts/python.exe backend/test_security.py`（pitfalls 记）。
> **S14-A 整体完成** = SA-T1..SA-T6 全 `[x]`；SA-T6 排本轮之外（第 3 轮切片不含 SA-T6，仍 `[ ]`）。
