# S15 第 3 轮 Plan（product-loop --tier1 on --mode all，Sprint 收官轮）

> 指派切片 = **S15-T4（装备定向掉落保底 / 碎片，P3-3）+ 收尾（S15-T1..T4 全 `[x]`、S14 无回归）**（SPRINT 排期建议第 3 轮）。
> **本任务必须真落地**（历史教训 SA-T6/暴击UI/SE-T1/SF-T8 曾被误判「新范围」漏做 → Evaluator 对空跑判 CONTINUE；指派任务永远 in-scope；tier1-on 跑满轮次 ≠ 目标达成）。
> **本 Sprint 唯一 bump 已用于 furniture（v20）**：pity 若持久化**复用 v20**——挂进既有 `TowerProgress` 扁平字段、migration 对旧档补 0，SAVE_VERSION 保持 **20（权威 `infra/persistence/schema.ts`）绝不升 v21**（Scout C-1 防版本漂移）。
> 前情：第 1 轮 S15-T1+T3、第 2 轮 S15-T2+T2-E 均已 COMPLETE（test×3 全绿、SAVE_VERSION=20、羁绊/家具 UI 显形已落地）。
> 收益/掉落加成一律经既有口径汇入，严禁另拼。

---

## 关键设计决策拍板（三报告分歧，Planner 定，先定后做）

- **拍板-A｜S15-T4 = 选项 (a) 槽位保底 pity，拒绝选项 (b) 碎片兑换**。三报告分歧：体验官/研究员倾向碎片（能到 defId 粒度 + 分解重复件闭环 + 图鉴集邮），进化策略师强推 pity（最省、最贴单机向、复用自家 gachaStore 保底范式）。**Planner 定 pity**，理由：① 本 Sprint **收官轮**，pity 改动面 + 退化风险最小（进化审计：碎片是「小 sink 重体验」，需新货币口径 + 新兑换 UI + 新发放埋点，改动面 2~3 倍，收官轮不宜引重体验）；② pity 复用项目自家 `gachaStore` 已验证的保底语义（连续未命中→计数→阈值强制给），零外部依赖、范式成熟；③ pity 持久化落点已被 Scout/研究员钉死（`TowerProgress` 扁平字段复用 v20），存档协议干净；④ 直接对应 SPRINT 主清单 S15-T4 选项 (a)。碎片方案价值确实更高但属独立轮次工程量 → **全标 backlog**（见 negotiation.md）。
- **拍板-B｜pity 维度 = 槽位（slot），拒绝稀有度 pity，拒绝二维矩阵**。三报告一致：塔掉落稀有度**已由层段单向决定**（`dropRarityForFloor`），玩家不缺稀有度数量，缺的是「命中了却总不是想要的槽（三武器零支援）」——稀有度 pity 与层段稀有度**双重保证冗余**。故做**槽位 pity**：连续 N 次「掉落判定发生」未出某槽 → 下次强制命中该槽（稀有度仍走层段）。**单维度计数，拒绝「稀有度×槽」二维矩阵**（字段爆炸 + 心智负担 + 测试组合爆炸）。
- **拍板-C｜engine 纯净不破，counter 在 store**。判定走 engine 纯函数 + 注入 RNG + 注入计数（仿 gacha「传入当前 pity → 返回新值 → 调用方持久化」，对齐 `rollTowerDrop` 已有注入 RNG 风格）。**pity 计数状态留 store 层，`engine/squad/drops.ts` 保持纯**（若需感知 pity 只加纯入参 / 返回新计数，绝不在 engine 内维护计数或碰持久化——pitfalls「engine 不 import config / 不维护状态」）。config 顶部集中**一个 pity 阈值常量**（改这里即调平），阈值取「体感能感知但不破坏惊喜」的中低值（远小于 gacha 70，因掉落频率本就低：50% × 每层一次）。
- **拍板-D｜存档 = 复用 v20，扁平塞 `TowerProgress`，三处同改 + 往返测试 + 旧档补 0 + clamp**。pity 是「连续未命中累积历史」**无法派生、必须持久化**（不同于 T3 羁绊派生免存档；研究员 Phase1 已确认派生免存档不可行）。落点 = `TowerProgress`（`types/player.ts:50`）扁平字段（语义同域「塔状态」，仿 `sweepUsedThisWeek` 定长扁平、**不用 Record**）。三处同改：schema type + 默认工厂（`createDefaultTowerProgress` 补默认）/ migrations（补默认 + clamp）/ persistence 装配器往返 + 往返保真 + **v19→v20 旧档补 0** 迁移测试。**SAVE_VERSION 保持 20 绝不升 21**。脏档 pity 巨值 **clamp 到 [0, 阈值]**（migration + action 共用，仿 `clampEnhance`），防篡改放大获取。
- **拍板-E｜防墙钟/刷取退化 3 条（回归守卫，本轮命脉）**：① pity 计数**只在 `completeFloor` 推进新层的真掉落判定分支累加**——顶层（floor≥999，`completeFloor` 返 false）/ 重复挑战低层（不推进）/ 扫荡（`sweepFloor` 独立路径，SA-T5 明确不掉装备）**绝不推进 pity**（否则毕业玩家扫荡刷保底 = 墙钟/刷取漏洞）；② 保底强制命中的槽仍走目录候选池 `rng.pick` 兜底、空池不抛错（`getEquipmentDefsBySlotRarity` 目录全覆盖，防御）；③ pity 触发命中后立即重置计数。
- **拍板-F｜显形（本轮成败命门，与 T3/T2-E 显形债同型教训）**：pity 若只后台记数不显形 = 又一个 comfort 死数值 = 挫败没缓解 = 白做。**必须在爬塔/探索/结算处显形「距下次槽位保底还差 N 层」进度**（accent 语义令牌、就近取整、满即高亮）；命中瞬间「保底触发！」文案高亮顺手则加、否则 backlog（**但进度显形非选做，是验收项**）。
- **拍板-G（nice-to-have，非验收必需）｜去重池叠加**：研究员 A3——`rollFloorDrop` 候选池优先未拥有件（`candidates` 过滤已拥有满强化 defId，全拥有再回退全池，零存档 <10 行）。若成本极低顺手叠加提升「集齐进度感」；**与 pity 主线冲突则降 backlog，不阻塞 T4 验收**。

---

## 本轮任务（按依赖顺序）

### T4-0｜config 阈值常量 + engine 纯函数注入 pity（拍板-B/C，先做，零存档）
- **目标**：给「无记忆掉落」注入「连续未出某槽计数」，达阈值强制命中该槽。config 顶部集中一个槽位 pity 阈值常量。判定纯函数注入 RNG + 注入当前计数，返回 `{ drop, 新计数 }`（或等价形态），engine 不维护状态、不碰持久化。
- **依赖**：无（先于存档落地，确定纯函数签名后再接 store/存档）。
- **验收**：engine 纯函数特征测试断言 pity 边界（连 N 次未出某槽 → 第 N+1 次必出该槽，序列 RNG 可精确复现）；稀有度仍走层段映射（不叠稀有度 pity）；空候选池 `rng.pick` 兜底不抛错。
- **来源**：Scout B 节 S15-T4 快照 + 进化审计 Critical + 研究审计 A1 + product-audit Critical。
- **相关陷阱**：engine 不 import config（S13-C2：稀有度↔层段映射作参数注入，pity 计数亦作参数注入）；engine 零 `Math.random`（RNG 注入）。

### T4-1｜pity 计数持久化（复用 v20，`TowerProgress` 扁平字段，三处同改）（拍板-D）
- **目标**：pity 计数落存档、跨重开保真、旧档补 0、脏档 clamp。
- **依赖**：T4-0（先定纯函数签名与计数语义）。
- **验收**：`TowerProgress` 新增扁平 pity 字段（仿 `sweepUsedThisWeek`）；`createDefaultTowerProgress` 补默认；migration 对 v19/无字段旧档补 0 + clamp 到 [0,阈值]；persistence 装配器往返；`SAVE_VERSION===20`（未误升 21）；迁移测试覆盖「旧档补 0 / 往返保真 / 脏档巨值被 clamp」。
- **来源**：研究审计 Phase1 假设 5 + Phase3 极端场景 3（脏档 clamp）+ Scout C-1 + 进化审计存档协议风险。
- **相关陷阱**：**禁 spread 浅拷贝旧档**（pitfalls S13-C1 白名单重建）；**三处同改 + 往返测试**（存档协议）；**SAVE_VERSION 权威在 schema.ts、复用 v20 绝不升 v21**（文档版本漂移坑家族）；脏档 clamp 仿 `clampEnhance`。

### T4-2｜store 编排接线 + 防退化守卫（拍板-C/E）
- **目标**：`completeFloor` 推进新层的真掉落分支消费/更新 pity 计数；顶层/重复层/扫荡绝不推进 pity。
- **依赖**：T4-0、T4-1。
- **验收**：pity 只在 `completeFloor` 的 `completed===true` 真掉落判定分支累加/重置；顶层（≥999 返 false）/ 重复低层 / 扫荡（`sweepFloor.ok`）不推进 pity（**新增确定性回归测试断言之**）；掉落序列 RNG 可复现（仿 `equipmentSource.test.ts` 序列 RNG）。
- **来源**：进化审计 Critical 第 3 条 + product-audit Phase1 边界 + Important「发放挂 completed===true 分支」。
- **相关陷阱**：pity 计数在 store，drops.ts 保持纯（engine 纯净）；发放挂现有防刷低层守卫，别新开绕过路径；fake timers 坑——若测试涉 settle 用注入 now（第 1 轮已加接缝），pity 本身无墙钟依赖（纯事件计数，无回拨风险）。

### T4-3｜UI 显形「距保底 N 层」（拍板-F，本轮成败命门）
- **目标**：爬塔/探索/结算处显形「距下次槽位保底还差 N 层」进度，命中高亮。
- **依赖**：T4-1（读计数）。
- **验收**：探索/爬塔面板可见「距保底 N 层」（accent 语义令牌、就近取整、满即高亮）；命中瞬间「保底触发！」文案高亮（顺手，否则 backlog）；**颜色走语义令牌**（禁 text-white 压浅底 / 禁动态拼色类 `bg-${}` / 禁反斜杠透明度）；新 setTimeout/setInterval 若有须登记 + onUnmounted 清除。
- **来源**：三报告显形共识（product-audit Important / 进化审计 Nice-to-have#1 / 研究审计操作缺口）+ pitfalls「setTimeout 假安全」「未定义令牌双形态」。
- **相关陷阱**：显形是验收项非选做（重蹈 comfort/S15-T3 死数值反模式 = 白做）；语义令牌真令牌名（`--c-line` / `--c-ink-2/-3` / `--sk-radius-panel`，别用未定义 `--c-ink-soft` / `text-ink-soft`）。

### T4-收尾｜Sprint 收官核对（S15-T1..T4 全 `[x]` + S14 无回归）
- **目标**：落 T4 后复跑全套验收命令，确认全清单 checkbox 与实现一致、S14 33 项无回归。
- **依赖**：T4-0..T4-3。
- **验收**：主清单 S15-T1..T4 全 `[x]`；下方 5 条验收命令全绿（test 连跑 3 次）；`SAVE_VERSION===20` 断言未被误改成 21。
- **来源**：三报告收尾复审提示 + pitfalls SA-F 编排坑（合同全部 `[x]` 才算达成）。

---

## 相关陷阱汇总（本轮高发）

- **版本漂移**：pity 复用 v20，**绝不升 v21**；SAVE_VERSION 权威在 `schema.ts`，文档只指向不复述（本 Sprint 唯一 bump 已用于 furniture）。
- **禁 spread 迁移**（S13-C1）：`TowerProgress` pity 字段迁移白名单重建，别 spread 漏旧字段。
- **engine 纯净**（S13-C2）：drops.ts 零 `@/config` import、零 `Math.random`、不维护状态；pity 计数/映射作注入参数，counter 留 store。
- **防墙钟刷保底**：pity 只在真掉落分支累加，顶层/重复层/扫荡不推进（延续 SA-T5 扫荡独立于通层、SF-T6 钳位家族）。
- **显形非选做**：不显形 = 死数值反模式（S15-T3/T2-E 显形债教训）。
- **别把 Sprint 内任务误判「新范围」**（SA-T6 教训）：S15-T4 是 in-scope 必须真实现，严禁只做回归确认空跑。
- **别用 git stash 跑基线**（S13-C1）：临时 worktree 或 `git archive HEAD`。
- **别改玩法数值破 S14**：facility 乘区 / softCap / comfort +20% 硬顶 / 羁绊 cap / 层段稀有度映射全不动；pity 是叠加一层保底下界，不改既有掉落率/稀有度。

---

## 验收命令（Evaluator 必须亲自重跑，记录实际输出）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，S15-T1 起要求连跑 3 次无偶发失败）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S15 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS，test 连跑 3 次稳定全绿），命令 5 零命中，且 `SAVE_VERSION===20`（未误升 21），当轮承诺的 S15-T4 + 收尾全部 `[x]` 并与实现一致。**S15 整体完成** = S15-T1..S15-T4 全 `[x]`。
