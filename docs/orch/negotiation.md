# Negotiation — S14-E 第 3/3 轮（收尾轮，product-loop --tier1 on --mode all）

> 对三份三审报告 Prioritized Recommendations 逐条回应：接受 / 拒绝 / 部分接受 + 理由 + 本轮行动。超范围标 backlog。本轮切片 = **SE-T2｜确定性套装（3 组取向套装，方案 A / research 替代 C）**。
> **总收敛**：四审（product / evolution / research / scout）一致落在「**只做 3 组取向套装、条件加成 backlog**」。product 与 research 深层分析都明确推荐套装；evolution/research 表层一句「优先条件加成」被其自身 tradeoff 矩阵与替代方案分析推翻（条件加成成本约套装 3~4 倍、build 深度不更高、引入跨 store 依赖）。**本轮以套装收尾。**

---

## 一、product-audit-report.md

### 🔴 Critical
- **🔴-1 SE-T2 必须真落地、不得降级为回归确认** → **接受**。本轮唯一指派切片，工作树确认尚未动工（无 setId/setBonusFor）。行动：SE-T2a..e 真实现，收尾核对 SE-T1..T3 全 `[x]`。
- **🔴-2 套装加成必须与强化正交（加法、非乘法）、绝不碰 modifier** → **接受（核心护栏）**。行动：套装奖基于固定值、加法追加到 `sumStatBonus` 之后（SE-T2c），绝不套 `enhancedBonus`、绝不塞 modifier；验收显式断言「不随强化放大」+「0 件时 `resolveEquipBonus` 逐字节一致」（SE-T2b/c 验收）。
- **🔴-3 套装进度与奖励必须显形** → **接受**。行动：候选/背包 setId chip + 配装弹窗右栏「齐几件/齐套奖 delta」（SE-T2d）。

### 🟡 Important
- **🟡-1 采用 3 组取向互斥套装（非每稀有度一套）** → **接受（形态拍板）**。攻击/坦度/节奏跨稀有度打 setId，凑套需混稀有度 → 与堆最高稀有真实互斥（对冲 P2-14）。行动：SE-T2a。
- **🟡-2 齐套奖 ≈ 半个稀有度档、config 集中可调 + 测试锁死** → **接受**。行动：3 套阶梯奖表集中 config 一处，测试锁量级（SE-T2a/b）。
- **🟡-3 信息密度分工：候选卡只加 chip、进度/奖励放右栏子区** → **接受**。行动：仿「装备强化」子区分隔线范式，复用 delta 语言不追加行、不另开弹窗（SE-T2d）。

### 🟢 Nice-to-have
- **🟢-1 齐套瞬间 chip 点亮 + 战力 delta 既有 transition** → **接受（不阻塞）**。行动：SE-T2g。
- **🟢-2 低稀有度（R/SR）也铺可凑套装、啊哈前移** → **接受**。行动：SE-T2a 打标签覆盖 R/SR。
- **🟢-3 InventoryPanel 背包卡也显示 setId chip** → **接受（不阻塞）**。行动：SE-T2f。

### 💡 Feature Idea（backlog）
- **💡-1 套装图鉴只读面板** / **💡-2 齐套风味台词/取向角标** / **💡-3 条件加成（archetype 亲和）** / **💡-4 modifier 绑 slot 取向** → **全 backlog**，超本轮最小实现范围。条件加成明确不开跨 store 耦合口（见下 research/evolution 回应）。

---

## 二、evolution-audit-report.md

- **🔴 SE-T2 本轮必做，加确定性套装或原型条件加成（表层写「优先后者」）** → **部分接受 / 表层建议拒绝**。接受「SE-T2 必做、折进 `resolveEquipBonus` 单一 seam、随机词条不做、不匹配/不齐套明示不静默」；**拒绝表层「优先条件加成」**——该报告自身正文（line 113）明说条件加成「build 深度不比套装高、成本高得多，本轮不建议，backlog」，表层一句与其分析自相矛盾，从其分析结论走套装。行动：SE-T2 走套装（SE-T2a..e），条件加成 backlog。
- **🔴 回归护栏：不破坏 SE-T1 五维 seam / SE-T3 modifier 独立 seam / SB-T3 暴击轴 / 战力单一 seam / S14-A..D；敌方不吃条件加成** → **接受**。行动：SE-T2e 回归；SE-T2c 断言敌方侧不吃套装加成、0 件逐字节一致。
- **🟡 SE-T2 UI 显示套装进度或命中态，复用 delta 语言、不另开弹窗、颜色走语义令牌** → **接受**。行动：SE-T2d。
- **🟢 条件加成若做，给适配度小标** → **拒绝（本轮不做条件加成）** → backlog。
- **🟢 范围纪律：若只够一条，只做条件加成、套装标 backlog** → **拒绝该取舍方向**。四审一致套装性价比更高（零跨 store 依赖、回归最低），若只够一条应做套装。行动：本轮做套装。
- **💡 叙事套装 / 适配★可视化 / 满强化+齐套毕业特效 / 定向掉落 / homeEffect 剥离** → **全 backlog**。

---

## 三、research-audit-report.md

- **🔴 High-impact-Low-effort 1｜走替代 C：套装=3 组取向标签，给现有目录打 setId、不新增装备** → **接受（形态拍板）**。行动：SE-T2a。
- **🔴 2｜`setBonusFor(equippedDefIds)` config 纯函数，store `resolveEquipBonus` 与 EquipPicker `previewEquipBonus` 两处同源** → **接受（头号护栏）**。行动：SE-T2b（纯函数）+ SE-T2c（store）+ SE-T2d（预览同源），杜绝预览≠实战（scout C-1）。
- **🔴 3｜单角色三槽内判定、齐 2/3 阶梯固定五维加法** → **接受**。行动：SE-T2b。
- **🔴 4｜基于 def 原值/固定值、与强化正交（加法合并、不随强化涨）** → **接受**。行动：SE-T2b/c 不套 `enhancedBonus`。
- **🔴 5｜只碰五维、绝不碰 modifier（守 SE-T3 clamp）** → **接受**。行动：SE-T2b。
- **🔴 6｜幅度「齐套 ≈ 半档稀有度」** → **接受**。行动：SE-T2a/b。
- **🔴 7｜EquipPicker/背包显示 setId 归属 + 齐几件 + 齐套奖（formatSetBonus helper、语义色）** → **接受**。行动：SE-T2d（复用 SE-T3 formatModifier 范式）。
- **🔴 8｜特征测试：齐套真进战力 + 不齐套逐字节一致 + 不随强化 + 不含 modifier + 纯函数计数/阈值/互斥独立测试** → **接受**。行动：SE-T2b/c 验收。
- **🟡 High-effort backlog｜原型条件加成（替代 B）** → **接受 backlog**。理由：需解析 `getArchetypeForCharacter`（跨 gameData/skill store 或改 `resolveEquipBonus` 签名波及 4 消费点），成本约套装 3~4 倍、build 深度不更高。
- **🟡 灵感炸弹 1「套装补短板」（弱维补强而非强维叠强）** → **部分接受**：数值取向可在 SE-T2a 填数时倾向「补短板」以缓解膨胀，但不作硬性验收项（需调优验证），backlog 精调。
- **🟢/💡 三选一张力 UI / 套装随强化成长 / 叙事套装** → **backlog**（长期，超本轮）。

**结论**：research 深层（Phase 4 tradeoff 矩阵 + Prioritized Directions + 收敛结论）与 product/scout 完全一致 → 本轮套装收尾。research 表层「优先后者(条件加成)」被其自身矩阵推翻，不采纳。

---

## 四、scout.md（A. 约束与可行性）
- **A0 拍板建议：首版只做方案 A（确定性套装）** → **接受**（即本轮定案）。
- **A1 无需升档、SAVE_VERSION 维持 18、不碰 schema/migrations/装配器、setId 不进 EquipmentItemSave** → **接受**。行动：SE-T2 无存档改动。
- **A2 套装加成经 `resolveEquipBonus` 汇入、不另拼口径、不套 enhancedBonus** → **接受**。行动：SE-T2c。
- **A3 4 个消费点：前 3 处改 store 自动生效、第 4 处 EquipPickerModal 需手动同源** → **接受（头号坑）**。行动：SE-T2d。
- **A4「resolveRole」实为 getArchetypeForCharacter** → **接受（规避）**：本轮不走条件加成、绕开此坑；SPRINT「复用 resolveRole」不采纳。
- **A5 engine 零改动 / 颜色语义令牌 / 组件清理** → **接受**。行动：解析全在 config+store，UI 走语义令牌。
- **C-1..C-5 新坑** → **全接受**（C-1 预览同源已列 SE-T2d 头号护栏；C-4 双乘/越界已列护栏；C-5 收尾核对已列 SE-T2e）。

---

## 超范围 / backlog 汇总
- 原型条件加成（archetype 亲和，替代 B / 💡-3）——跨 store 依赖成本高、build 深度不更高。
- 叙事套装（Bangumi 番剧维度绑套装）、套装图鉴面板、适配★可视化、满强化+齐套毕业特效、定向掉落/碎片保底、homeEffect 彻底剥离到设施、重复件「拆/燃料/凑套」三选一张力 UI、套装随强化成长。
- 灵感炸弹「套装补短板」数值取向的精调验证。
