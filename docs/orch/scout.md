# Scout Report — Iteration 2 (S14-B 第 2/3 轮，product-loop --tier1 on --mode all)

**本轮指派切片 = SB-T1（超时按 HP% 三态裁决 + 倒计时 UI，P2-4）+ SB-T4（前中后排单体减伤机制，P2-1）。**
> 排期依据：SPRINT.md 第 44 行「第 2 轮 = SB-T1 + SB-T4」。前情：第 1 轮已完成 SB-T3（base critRate 0.05 + critRateUp 加成轴）+ SB-T5（buff 按来源累加 shared helper `sumStackableStatusValues`）。

> 关键前置事实：核实工作树后，**SB-T1 与 SB-T4 已在本工作树中完整落地并测试通过**（`git log` 末次提交仍是 S14-A 的 c564c74，S14-B 全部改动为未提交工作树产物，属 product-loop 多轮累积正常状态，pitfalls L64「orch 提交边界」）。本轮 = targeted 核实指派切片真落地 + 三审方案代码成立 + 残留 gap。结论：两项均真实现、非空跑、验收断言齐备、squad 24 测试实测全绿。若无新缺口，重心 = 集成回归（本轮-6）+ 5 条验收命令实测。**严禁把「已落地」当理由跳过——须实测复验，任何缺口须补齐（S14-A SA-T6 教训）。**

---

## A. 约束与可行性（给 Planner）

### SB-T1（超时三态裁决 + 倒计时 UI）— 已成立
- **裁决**：`timedBattle.ts:117 resolveTimeout` 按拍板 1/2——先比存活数，相等再比 `sideHpRatio`(:101, Σ currentHp/Σ maxHp)，差 < `HP_RATIO_EPSILON`(1e-6) 判真平局。接入 `battleEnd:142-143`（事件上限 + 超时两分支）。KO 分支 :139-141 未动。✅
- **类型（拍板 2，避坑 C-1）**：`TimedBattleWinner` **未扩 'draw'**（types.ts:188）；占优→`winner='player'`、劣势→`'enemy'`、真平局→`'timeout'`；三态用 `BattleEndReason` 扩值 `timeoutWin/timeoutLoss/timeoutDraw`（types.ts:198-205）。✅
- **发奖（拍板 3）**：占优 `winner='player'` → View `finishTimedBattle:504` 二分映射 victory → `settleTowerBattle:509` → `completeFloor` + rewards。View :523 **硬编码 `reason:'victory'`**（不透传 engine 的 timeoutWin），故 timeout-win 正常发奖（磨血占优不再判输）。⚠ 脆弱耦合见 C-新1。
- **倒计时 UI（拍板 4）**：`SquadBattlefield.vue:13 maxTimeMs` prop + `:22-30` remainingSeconds/elapsedPercent computed + ≤10s 转 `text-danger/bg-danger`，进度条走语义令牌。View :839 传 `DEFAULT_MAX_TIME_MS`（engine 常量，`engine/index.ts:17` re-export，View :7 import），与 `regenerateBattleSimulation:300` maxTimeMs **同源**，禁硬编码 90000 已守。✅
- **测试**：`timedBattle.test.ts:401-462` 覆盖真平局/HP%判胜+发奖/HP%判负/存活数 outrank 四态；:535-542 旧 timeout 无奖断言仍守。✅

### SB-T4（前中后排单体减伤）— 已成立
- **机制（拍板 5/6/7）**：`effects.ts:68 POSITION_DAMAGE_TAKEN`={front:1,middle:0.95,back:0.85}，`applyPositionDamageTaken:85` 单体减伤+floor+保底≥1，AOE(`isAoeSelector:77`=allEnemies/allAllies)直返原伤。接入 `executeEffect:388`，用 `effect.target ?? skill.target` 同一已解析 selector 判单体/AOE（避坑 C-3）。✅
- **纯度**：engine 常量、不 import config、确定系数无 RNG；未碰 targeting.ts、未改 calculateTimedDamage 签名。✅
- **front=1 守恒（坑 C-6）**：`:88 if(factor===1) return amount`——测试单位默认 front → 既有伤害/能量/击败断言天然不变。✅
- **测试**：`timedBattle.test.ts:465-522` 覆盖 back<middle<front（精确 floor 值）+ AOE 不衰减。✅

### 本轮工作量判断
两项 engine+UI 均已落地、断言齐备、squad 24 测试实测绿。Planner 定位为「核实 + 集成回归（本轮-6）」，但**必须实测 5 条验收命令、不得仅凭本报告断言绿**。发现任何缺口须补齐（仍属实现指派任务，非新范围）。

---

## B. 代码地图与坑（给 Generator）

- `engine/squad/timedBattle.ts`：`:27 DEFAULT_MAX_TIME_MS`、`:101 sideHpRatio`、`:117 resolveTimeout`、`:136 battleEnd`（:142-143 接 resolveTimeout；**:139-141 KO 三分支勿动**）。`simulateTimedBattle:365` 把 winner/reason 写进 battleEnd 事件，View 依赖。
- `engine/squad/effects.ts`：`:68 POSITION_DAMAGE_TAKEN`、`:77 isAoeSelector`、`:85 applyPositionDamageTaken`、接入 `:388`。**坑**：AOE 判据必须用 `resolvedSelector`(:367)，勿重复解析(C-3)；保底≥1 勿去（否则低伤/AOE 归零）；front 系数必须保 1（去短路破坏全体伤害断言）。
- `engine/squad/types.ts`：`:188 TimedBattleWinner`（勿加 'draw'，C-1）；`:198 BattleEndReason`（timeout* 三值）。
- `engine/squad/formulas.ts`：`:5 critRate=0` 勿改（SB-T3 拍板 1）；SB-T1/T4 不碰本文件。
- `engine/squad/rewards.ts`：`:65/:85` victory 判据只认 `reason==='victory'`(/'elimination')，**不认 timeoutWin**——见 C-新1，别把 engine reason 直接透传给 rewards。
- `components/battle/squad/SquadBattlefield.vue`：`:13 maxTimeMs` prop、`:22-30` computed、`:42-58` 倒计时 UI（语义令牌，禁 text-white/硬色）。
- `views/SquadBattleView.vue`：`:7 import`、`:300` 传 maxTimeMs 同源、`:504` winner 二分映射、`:509/:523` settle 硬编码 reason='victory'、`:839` 传 prop。**坑**：计时器复用 `clearBattleTimers()/schedule()`（pitfalls L59）；timeout-draw(`winner='timeout'`) 走 defeat 分支不发奖（符合拍板 2）。

---

## C. 新发现的坑

- **C-新1（rewards 不认 timeoutWin — 脆弱耦合，当前非 bug）**：`rewards.ts` 两函数 victory 判据都不认 `timeoutWin`，SB-T1 靠 View :523 自造 `reason:'victory'` + 只按 `winner==='player'` 门控绕过。风险：未来任何把 engine `reason` 直接透传给 `calculateTowerBattleRewards` 的重构会让「超时占优胜」发 0 奖（P2-4 病复发）。建议（backlog）：rewards victory 判据补 `reason==='timeoutWin'`，减少对 View 手改 reason 的依赖。
- **C-新2（真平局体验 = 失败态，产品可接受）**：真平局 `winner='timeout'` 在 View 走 `battleResult='defeat'`(:504)+早退不发奖。合同拍板 2 明确「平局不发奖、语义等同未推进」，**符合合同、非缺陷**。极满血高防僵持(def 9999)会 90s 真平判 defeat；若日后反馈刺耳，可 UI 文案区分「平局/失败」（本轮不做，记此）。
- **C-新3（AOE 判据靠 selector 白名单）**：`AOE_SELECTORS`(effects.ts:75) 硬列 `['allEnemies','allAllies']`。当前群体 selector 固定仅这 2 个（types.ts:9-18），无即时风险；未来扩群体 selector 须同步维护此白名单否则新 AOE 被误判单体、后排错吃减伤（加类型守卫更稳，backlog）。

---

（本报告仅核实指派切片 SB-T1/SB-T4；SB-T2/T3/T5 非本轮范围，未展开。）
