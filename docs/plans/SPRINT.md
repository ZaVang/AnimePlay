# AnimePlay — SPRINT 合同（S14-A：家园 hub 深化 · P1 急救）

> product-loop 执行合同（本轮 `--tier1 on --mode all --max_iter 3`）。
> **本 Sprint 唯一目标 = 完成 `docs/FUTURE.md` 的 S14-A 全部任务**（下方任务清单即 S14-A 逐条落地）。
> Tier1 三审（experience/evolution/research）用于 **refine HOW + 抓回归 + 微调**，**不开新范围**；已完成任务保持 `[x]`。
> **实现前必读**：`frontend-vue/CLAUDE.md`、`docs/plans/pitfalls.md`、`docs/FUTURE.md` S14、`docs/orch/homestead-hub-audit-report.md`（P#-# 证据源）。

## 产品背景
- AnimePlay：Bangumi 数据的抽卡+收集+多玩法网页游戏。前端 Vue3+TS+Pinia+Tailwind(Vite)，后端 Flask。
- 启动：前端 `cd frontend-vue && npm run dev`（:5173）；后端 `python start_server.py`（:5001）。
- 家园 hub = 路由 `/homestead` → `HomesteadHubView.vue`，query `tab=home|characters|squad|explore|battle` 切 5 面板。
- 本 Sprint = **S14-A P1 急救**：把 S13 交付的「能跑但缺选择空间」的家园 hub，补上编队编辑、预览一致性、可预期成长、角色差异化、可重复循环，使其从「半成品」变「完整玩法」。

## 背景根因（S14-A 逐个拆解，勿偏离）
1. 角色战斗零差异化：`data/squadSkillKits.ts` 6 原型模板套所有角色，个人技只借 `.name`。
2. 养成/配装无决策：`engine/nurture/rules.ts` 升级随机加点、不可预期、无 role 定位。
3. 无可重复循环：`stores/pve.ts`+`engine/squad/rewards.ts` 通过层零收益，卡关即断更。

## 架构铁律（不可违反）
engine 纯净（零 Vue/Pinia/DOM/IO/`Math.random`；掉落/成长/差异化解析走纯函数 + 注入 RNG）/ 依赖只向下 / 货币只走 `profile.spend·earn` / 颜色走皮肤语义令牌（禁 text-white 压浅底、禁运行时拼接动态色类）/ 组件 setTimeout·rAF 登记并卸载清除 / **存档字段增改必须 schema + migrations + 装配器三处同改 + 往返测试**。**别破坏 C1/C2 已成的养成两轴、装备系统、家园挂机/塔加经验好感入口。**

## 任务清单（S14-A，按优先级/安全度排序；⭐=低成本高收益接线）

- [x] **SA-T1｜⭐ 接通编队编辑（P1-3 / P1-4）**
  - 目标：`HomesteadHubView.vue` 的 squad 面板从只读变可编辑——formation-slot 点击可换人（复用 `CharacterSelectModal` 或等价 picker + `pve.updateSquadMember`）、squad-select 可改名（`pve.updateSquadName`）、空位显示可点「+添加」。仅接线已有 store action，不新增存档字段。
  - 验收：hub 内可换人/改名，改动即时反映到战力/校验；type-check 0 / test 全绿 / build 通过；无动态色类。
- [x] **SA-T2｜⭐ 统一敌人预览种子（P2-17，真 bug）**
  - 目标：`HomesteadHubView` 探索面板 `enemyPreview` 与 `SquadBattleView` 实际敌人来源统一为同一确定性种子（按 floor 派生），或预览读实战将用的持久化 towerEnemyData；消除「预览≠实战」。同步决定「刷新敌人」按钮去留（保留则预览随之更新）。
  - 验收：同一层预览敌人 = 进战敌人（可加特征测试固定种子断言一致）；type-check/test/build 通过。
- [x] **SA-T3｜升级加点改确定成长 + role 定位（P1-5 / P2-9）**
  - 目标：`engine/nurture/rules.ts` 的升级加点从随机改为**确定分配**（按角色 base 五维比例分配 `POINTS_PER_LEVEL`，保持每级总量不变、去随机）；`role` 优先**从 archetype 纯函数派生**（复用 `inferArchetype`/未来显式字段，**不新增存档字段**），成长按定位倾斜（guardian 偏 hp/def、striker 偏 atk/spd…）。旧档已 roll 的 statPoints 不动（只影响未来升级）。
  - 验收：同角色升级结果可复现且符合定位；`engine/nurture/rules.test.ts` 更新为确定断言；不新增存档字段；type-check/test/build 通过。
- [x] **SA-T4｜个人技能驱动差异化技能位（P1-1 / P1-2）**
  - 目标：给 `getSquadSkillKitForCharacter` 加一层**per-character 覆盖机制**——手写差异化 kit 映射（`characterId → 覆盖 skill1/ultimate 的 effects/数值`），命中则用覆盖、未命中回落原型模板。为**头部 8~12 个招牌 UR** 手写差异化技能位（至少覆盖 skill1 或 ultimate 各一条唯一 effect + 与个人技名一致的描述）。**严禁「描述≠行为」**（CLAUDE.md Known Debt 红线）：写了效果就必须真跑通引擎。
  - 验收：覆盖角色的 kit 与同原型他人**不再逐字节相同**；`data/squadSkillKits.test.ts` 增覆盖用例（命中覆盖 / 回落原型 / 描述与 effect 一致）；type-check/test/build 通过。
- [x] **SA-T5｜引入可重复日循环（P1-6）**
  - 目标：加「扫荡/重复挑战已通层」——对 `floor < currentFloor` 的已通层，每日可领缩水奖励（KP+角色经验，装备低概率或不掉），带**每日次数封顶**防通胀。存档记录每日已用次数 + 日期（schema+migrations+装配器三改 + 往返测试）。挑战塔主线推进逻辑不变。
  - 验收：已通层可重复领缩水奖励且受每日封顶；跨天重置；存档往返保真；`stores/pve` 或 engine 纯函数测试覆盖；type-check/test/build 通过。
- [x] **SA-T6｜消解三 tab 结构冗余（P1-3，依赖 SA-T1）**
  - 目标：编队/探索/战斗三 tab 与内嵌爬塔页信息重复。落地二选一（Planner 定）——(A) squad tab 成唯一编队入口、explore 保留预览+「开始挑战」直接触发、battle 只承载演出；(B) 删 squad+explore 只读 tab、towerMode 编成屏作 explore 内容。目标是「一处编辑、不重复」。
  - 验收：无三重只读重复；从 hub 能顺畅走「编队→探索→战斗」；旧路由/深链不破；type-check/test/build 通过。

> **排期建议**：SA-T1/T2/T3 为 ⭐ 低成本高收益接线，优先本轮落地；SA-T4/T5 涉及数据/存档，第 2 轮；SA-T6 依赖 SA-T1，第 2~3 轮。每轮务必保持验收命令全绿、每子项独立可合并。

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，含本轮新增/更新的 nurture/squadSkillKits/pve 测试）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S14-A 不碰后端，期望退出码 0、全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS），命令 5 零命中，且当轮承诺的 SA-T* 任务全部 `[x]` 并与实现一致。**S14-A 整体完成** = SA-T1..SA-T6 全 `[x]`。

---

## 第 1 轮追加任务（基于 Reviewer 三审审计）

> 本轮切片 = **SA-T1 + SA-T2 + SA-T3**（一个连贯、能独立合并、验收全绿的切片）。
> SA-T4/SA-T5 排第 2 轮，SA-T6（依赖 SA-T1）排第 2~3 轮——**本轮不做**。
> 主任务定义见上方 SA-T1..T6 清单，此处只补「本轮承诺 + 采纳的 refine 细化子项」。三审共识决策已拍板写入各子项验收。

- [x] **SA-T1（本轮）｜接通编队编辑 + 顺手补手感**
  - 采纳 refine（体验官 Critical）：换人/改名后**战力与校验即时刷新**；picker 内已占用角色置灰；空槽显示可点「+」；站位卡给「可点」的视觉暗示（cursor/hover 边框）。
  - 不做（三审共识「别过度」）：拖拽排序、一键最优编队、为 hub 单造第二套 picker——复用现成组件即可。
  - 验收：hub squad 面板可换人/改名/点空槽加人；改动即时反映到战力/校验；无动态色类；type-check 0 / test 全绿 / build 通过。

- [x] **SA-T2（本轮）｜统一敌人预览种子 + 移除刷新按钮**
  - 拍板决策（四源共识）：预览与实战统一为**同一确定性来源**（按 floor 派生的确定性种子，或预览读实战将用的同一份敌人数据——「single source of truth」，Generator 择优）；**同步移除「刷新敌人 / 重新刷新」按钮**（统一确定性后刷新出来仍是同一批=新困惑，移除是本任务闭合的一部分，非可选）。
  - 验收：同一层「预览敌人 === 进战敌人」，加特征测试固定种子/同源断言一致；刷新按钮已移除且无残留引用；type-check/test/build 通过。

- [x] **SA-T3（本轮）｜升级加点改确定成长（走 base 五维比例，绕开不可靠 role）**
  - 拍板决策 ①（role 来源）：升级加点主路径**按角色自身 base 五维比例确定分配**——base 高 def 的角色比例分配本就偏 def，**天然实现「按定位倾斜」，无需依赖 `inferArchetype` 正则**（P2-7 已证正则频繁误判，绑上去会把「战斗模板误判」扩散成「成长倾斜误判」）。可采「混合分配」（多数按 base 比例 + 少数保底均分）防极端偏科被无限放大，Generator 定比例。**本轮不新增 role 存档字段**。
  - 拍板决策 ②（头部显式定位映射，SA-T3/SA-T4 共同前置）：「头部 8~12 招牌 UR 的显式 archetype/role 映射」这件事**归 SA-T4（第 2 轮）承载并首次落地**（SA-T4 手写签名 kit 时顺带定死这些角色定位）；SA-T3 本轮不接入该映射，主路径靠 base 比例已自洽。此项写明是为避免 SA-T3/SA-T4 重复造映射。
  - 拍板决策 ③（旧档）：**接受「只影响未来升级」为已知取舍**——旧档已 roll 的 statPoints 不动、不做一次性重算迁移（本轮**不升 schema**；单机向存量玩家极少，重算迁移引入 schema-adjacent 风险不划算）。此取舍须在实现说明/文档明确记录。
  - 不做（三审共识「别过度」）：手动加点池 + 洗点系统（新 UI + 新存档，超「确定成长」最小承诺，单机向必抄最优 build=负担）。
  - 验收：同角色升级结果**可复现且符合定位**；`engine/nurture/rules.test.ts` 更新为确定断言；**不新增存档字段**；type-check/test/build 通过。

---

## 第 2 轮追加任务（基于 Reviewer 三审 + Scout 侦察）

> 本轮切片 = **SA-T4（个人技驱动差异化技能位）+ SA-T5（可重复日循环 / 扫荡）**。
> SA-T6（依赖 SA-T1）排第 3 轮——**本轮不做**。主任务定义见上方 SA-T4/SA-T5 清单，此处只补「本轮承诺 + 采纳的 refine 细化子项 + 关键设计决策拍板」。三审 + Scout 共识决策已拍板写入各子项验收。

- [x] **SA-T4（本轮）｜个人技驱动差异化技能位（头部 8~12 UR 手写覆盖）**
  - 拍板 ①（覆盖形态）：`characterId → 覆盖 skill1/ultimate effects` 结构化数据覆盖表 + 未命中回落原型。头部 **8~12 招牌 UR**（采信合同数字，**拒绝 FUTURE.md 的 20**）。
  - 拍板 ②（机制层差异，非数值微调）：唯一 effect 必须是**肉眼可辨的机制**（execute 处决 / revive 复活 / 群体 stun/silence / 独特 DOT / 独特 target），**严禁只调倍率**。判据 = 「玩家一眼说得出不一样在哪」。**宁可 6 个真不同，别 12 个微调。**头部按机制辨识度挑，非人气。
  - 拍板 ③（零引擎改 / 借名不借 effectId）：只用现有 9 种 squad `SkillEffect`，**严禁把 /battle effectId 搬进小队战斗**（无对应 handler、不在白名单）。借个人技 `.name`（语义呼应）+ 自造 squad effect（引擎自洽）。绝不扩 type / 写 handler。
  - 拍板 ④（description 走工厂派生，禁手写）：覆盖 kit 必走 `skill()` 工厂让 `description = describeSquadSkill` 自动派生，**严禁手写 description 字符串**（结构性锁死「描述≠行为」红线）。
  - 拍板 ⑤（不改敌人候选池集合）：覆盖 kit 必过 `validateSquadSkillKit`，落地前后 `filter(isSquadSkillKitReady)` 全角色返回集合**完全不变**（否则静默破坏上一轮 SA-T2 同源，种子测试仍绿缺陷不可见）。
  - 拍板 ⑥（分档层可选，非硬承诺）：长尾 base/rarity 分档为**可选增强**；若做**必须用角色自身 base 的绝对锚点、严禁同原型均值**（否则污染 `getSquadSkillKitForCharacter` 单角色纯函数 + 破 engine 纯净/确定性）；有任何纯净/签名风险则本轮只交头部手写、分档降 backlog。
  - 采纳 refine：名场面命名（E-13，技能名用番剧名台词/名场面，零成本口碑）；导出 `isSignatureKit(characterId)` 查询留口给第 2 轮 UI 徽章（**本轮不做 UI 徽章**）；签名角色定位与 base 倾向对齐（防「堆奶量却在输出」四不像）。
  - 不做（三审共识「别过度」）：扩全 66 UR / HR 差异化被动；需读说明书的复杂机制联动；复用 /battle 134 handler。
  - 验收：覆盖角色 kit 与同原型他人**不再逐字节相同且差异在机制层**；每条差异 effect 有「真跑通引擎」特征测试（`executeSkill`/`simulateTimedBattle` 断言对应 event）；`data/squadSkillKits.test.ts` 增用例（命中覆盖 / 回落原型 / ≠同原型他人 / `description===describeSquadSkill` / 无手写 description / 无 handler 映射 / 覆盖前后 `filter(isSquadSkillKitReady)` 集合不变）；不新增存档字段；HR 回落名效一致；type-check 0 / test 全绿 / build 通过。

- [x] **SA-T5（本轮）｜可重复日循环（扫荡已通层 + 存档 v14→v15）**
  - 拍板 ①（资格复用 + 独立路径）：扫荡资格 = `pve.hasCompletedFloor(floor)`（`floor < currentFloor`），走**全新独立 action**，**绝不调 `completeFloor`**（否则污染主线推进 / 重复成就 / 绕过缩水）。主线推进逻辑不变。
  - 拍板 ②（存档扁平定长，**采信 research/evolution 而非 Scout 选项 A**）：扫荡计数字段**扁平定长 3~4 字段**（仿 `DailyChallengeSave`：resetKey/weekKey + 已用额度），**绝不 `Record<floor,count>`**（随层数无限膨胀）。装 TowerProgress 域内新增字段，**不硬复用 stub `todayAttempts/lastAttemptDate`**（语义错配）。产出字段中性/道具化命名（留演化口）。
  - 拍板 ③（封顶：周上限优先）：**优先周上限**（明日方舟剿灭范式，防通胀 + 免点击疲劳 + 只记 weekKey）；若落地成本过高可回退每日 N 次，但**字段必须为周上限/区间化留口**。
  - 拍板 ④（缩水 + 边际递减）：奖励 = 缩水 KP + 角色经验（装备低概率或不掉，二选一）；扫荡产出 = 首通 **30~50%**、封顶总量 ≈ 一趟主线量级（扫荡=止损补给非主 farm）；产出对 floor **边际递减/绝对封顶**（防「只扫最高层」Dead Zone）。奖励纯函数化 + 注入 RNG。
  - 拍板 ⑤（schema 三处同改 + 往返测试）：SAVE_VERSION 14→15；`schema.ts`（字段+default+v15 沿革）+ `migrations.ts`（旧档兜底）+ `stores/pve.ts` 装配器三处同改；`migrations.test.ts` 往返保真（旧档补默认 / 计数存回一致）。本 Sprint 唯一 schema 升级、最高风险动作。
  - 拍板 ⑥（跨天/周复用 daily 范式 + 墙钟钳位）：日/周界复用 `daily.ts` `todayKey`/`weekKey` 读时归零（不存定时器、幂等、加载即判定），**别造第三套**；回拨视同日/周不重置（廉价钳位，P2-28 建议①）。
  - 拍板 ⑦（UI 一键结算，不复用完整演出）：扫荡入口 + 「今日/本周 N/M」进度条 + 「已达上限」态，落 explore 面板已通层区；**跳过 180ms 回放**、轻量一键结算飘字（不复用 `SquadBattleResult` 完整演出面）；语义令牌（禁 text-white/动态色类）；飘字动画 setTimeout/rAF 登记 + onUnmounted 清除。
  - 不做（本轮）：SA-T3 旧档 statPoints 重算搭便车（**拒绝**，维持「只影响未来」取舍，backlog）；批量扫荡 UI 动效；推荐战力提示（S14-C）；道具化背包实做（仅留命名口）；PCR 多循环网络。
  - 验收：已通层可重复领缩水奖励且受封顶；跨天/周干净重置；存档往返保真；扫荡走独立路径不推进 currentFloor；一条测试断言扫荡总产出 << 推塔总产出 + 产出对 floor 边际递减（覆盖 floor=1 与 floor=high）；字段扁平定长（非 Record<floor,count>）；SAVE_VERSION=15；`migrations.test.ts` 覆盖；type-check 0 / test 全绿 / build 通过。

---

## 第 3 轮追加任务（tier1-on 验收再确认 / 回归锁 · 不开新范围）

> 本轮切片 = **SA-T4 + SA-T5（与第 2 轮同一切片）**。
> 关键前情：本切片第 2 轮已实现且被 Evaluator 判 **COMPLETE**（type-check 0 / test 653 全绿 / build 通过 / security PASS / grep 零命中，两 SA-T 真实性抽查属实，见 `docs/orch/eval.md`）。
> tier1 on = 引擎跑满 3 轮，本轮为**验收再确认 + 抓回归 + 至多打磨**，**绝不开新范围**（合同 L5/L67）。Scout 第 3 轮逐文件核实三审方案「全部成立且已落地、无未落地拍板、无新代码坑」。
> **本轮唯一目标 = 零改动复跑验收全绿 + 守住已 COMPLETE 实现不被「凑改动」破坏**；若三审无新 refine 指令，正确动作是不动源码。以下为回归守护条目（非新功能承诺）。

- [x] **SA-T4（第 3 轮）｜签名覆盖表回归锁 · 零扩表**
  - 目标：确认 SA-T4 稳定实现无回归——覆盖表维持头部 8~12 招牌 UR（**严禁扩到 FUTURE.md 的 20**，合同 L94 已拒绝）；差异仍在机制层（execute/revive/群 stun/silence/独特 dot/独特 target），非纯倍率；覆盖仍走 `skill()` 工厂使 `description===describeSquadSkill`（禁手写 description）；仍只用 9 种 squad effect、无 /battle effectId 泄漏；覆盖前后 `filter(isSquadSkillKitReady)` 全角色集合**完全不变**（守 SA-T2 同源，最隐蔽回归面）。
  - 拍板（本轮红线）：**若无三审新 refine 指令则零改动**；切勿为凑改动动稳定覆盖表；分档层维持 backlog（Scout 判本轮零改动最稳）。
  - 验收：`data/squadSkillKits.test.ts` 全绿（含命中覆盖 / 回落原型 / ≠同原型他人 / description 派生 / 无手写 / 无 handler / 集合不变 + 端到端 executeSkill·simulateTimedBattle）；type-check 0 / test 全绿 / build 通过。

- [x] **SA-T5（第 3 轮）｜扫荡日循环 + v15 存档回归锁 · 零 schema 再动**
  - 目标：确认 SA-T5 稳定实现无回归——`SAVE_VERSION=15`（本 sprint 唯一升级，**本轮绝不再动 schema**）；扫荡字段维持扁平定长（`sweepWeekKey`/`sweepUsedThisWeek`，**非 `Record<floor,count>`**、**不硬复用 stub `todayAttempts/lastAttemptDate`**）；`sweepFloor` 独立 action、只读 `hasCompletedFloor`、**绝不调 `completeFloor`**、不推进 currentFloor；缩水+封顶+边际递减真生效；跨周读时归零 + 回拨钳位；存档三处同改 + 往返保真。
  - 拍板（本轮红线）：**拒绝 SA-T3 旧档 statPoints 重算搭便车**（维持「只影响未来」取舍，backlog）；**拒绝任何本轮再升 schema 或改扫荡存档字段**（v15 是最高风险动作、已稳定，再动纯增风险）。
  - 验收：`migrations.test.ts`（v15 旧档补缺省 / 脏档回落 / 计数往返一致）+ `stores/pve` / `engine/squad/rewards` 测试全绿；扫荡总产出 << 推塔总产出、对 floor 边际递减（floor=1 与 floor=high 两端）；type-check 0 / test 全绿 / build 通过。

---

## 第 4 轮（纠偏）：SA-T6 落地

> **纠偏缘由**：第 3 轮 Planner 把 SA-T6 误判为「新范围」跳过，导致 S14-A 只完成 5/6。SA-T6 是 S14-A 第 6 个任务、**本 Sprint 范围内、必须实现**。本轮唯一目标 = **实现 SA-T6 并让 S14-A 全部 6 项 `[x]`**。SA-T1..T5 已落地功能保持不动。
> 采用方案 = **Plan A（三审 + scout 拍板）**：squad tab 唯一编队入口 / explore 预览 + 「开始挑战」直达进战 / battle tab 仅承载战斗演出。

- [x] **SA-T6（第 4 轮）｜消解三 tab 结构冗余（Plan A）**
  - **落地内容**：
    1. **squad tab = 唯一编队入口**：保持 SA-T1 的可换人/改名/加人，本轮零改动。
    2. **explore tab = 预览 + 「开始挑战」直达进战**：`HomesteadHubView.vue` 探索面板新增「出战小队」开战卡（`.start-card`）——展示 `selectedSquad` 名称/战力/满编数 + 校验状态。开战按钮 `startBattleFromExplore()` 用 `canStartBattle`（同口径 `validateTowerSquadMembers` + 已登录 + 当前层未通过）拦截：合法则设 `battleEntrySquadId = selectedSquad.id` 并 `switchTab('battle')`；不合法留在 explore 显示 `startBattleIssue`，不进战。原「进入战斗」空切按钮改为「去编队」跳转 squad tab（不再让用户空切 battle tab 重编队）。
    3. **battle tab = 仅承载战斗演出**：`SquadBattleView` 加 props `entrySquadId: number|null` + `embedded: boolean`；battle tab 以 `:entry-squad-id="battleEntrySquadId" :embedded="true"` 驱动。
  - **直达进战红线满足方式**：`SquadBattleView` 挂载（`onMounted`）时 `tryEnterFromEntry()`——带合法 `entrySquadId` 即调用已有 `startTowerBattle(squadId)` 把 `currentPhase` 推到 `'battle'`，**不渲染 towerMode 编成器**（冗余不复活）。若敌人/登录挂载时未就绪，`watch([isLoggedIn, allCharacterCards.length])` 就绪后自动补一次直达。
  - **优雅降级**：`embedded && currentPhase==='towerMode'`（无合法 entrySquadId，如深链/刷新 `?tab=battle`）不再渲染整套 towerMode 编成器，改为最小占位「从『探索』选择小队开始挑战」+ 「去探索选队」按钮（`emit('exit-to-explore')` → hub `handleBattleExit` 切 explore）。战斗结束 result 演出正常显示；embedded 下「继续」经 `restart()` 触发 `emit('exit-to-explore')` 切回 explore，不落 towerMode。
  - **stale id 防护**：`watch(activeTab)` 离开 battle tab 即清空 `battleEntrySquadId`，避免残留 id 误触进战。
  - **顺带清理**：修 `SquadBattleView.vue:82` 预存 lint 债 `ref<any>` → `ref<TowerFloorSquad | null>`（`generateTowerFloorEnemies` 的准确返回类型）。
  - **未改存档**：纯视图层，未碰 engine、未升 schema。**兼容性**：`/squad-battle`、`/nurture` 重定向不动；`?tab=xxx` 深链不破；`SquadBattleView` 仅被 hub 内嵌引用，加 props 有默认值（`entrySquadId=null, embedded=false`），独立进 battle tab 优雅降级。
  - 验收：无三重只读重复；hub 走「编队→探索→开始挑战→战斗演出」顺畅；旧路由/深链不破；type-check 0 / test 653 全绿 / build 通过 / security PASS / grep 零命中。
