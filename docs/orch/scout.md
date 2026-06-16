# Scout Report — Iteration 2 (evolution)

> 接地 Round 2 方向：🔴-1 图鉴定向解锁（经济出口）、🟡-3 真实评分/放送年可视化（差异化护城河）、🟡-2 周任务/连续登录（可选）。
> orchestrator 直接接地（Scout subagent socket 掉线，用已读源码补全，路径行号亲自核对）。

## A. 约束与可行性（给 Planner —— 影响 WHAT/范围）

### 🔴-1 图鉴定向解锁 —— 可行性：高，一轮可做完
- **理由**：核心就是「`profile.spend('knowledgePoints', n)` 成功 → `collection.addCard(id, domain)`」两步，二者都是现成唯一入口（collection.ts:32 / profile.spend）。`userStore.purchaseShopItem`(161-227) 是现成「校验登录→spend→发货→saveToServer」编排样板，平行复制一个 `unlockCodexCard(id, domain)` 即可。**完成度是纯派生**（codex.ts），解锁后 addCard 改了 collection（已进存档），**无需任何新存档字段**。CodexPanel 的灰位网格已渲染 owned 标记，挂点击即可。
- **对规划的建议**：
  - 定价按稀有度静态表放 config（如 `config/codexUnlock.ts`）。**关键平衡约束**：定向解锁是「想要哪张点哪张」，若便宜会架空抽卡——对标 Marvel Snap Token Shop，定价应**显著高于分解回收**、UR 尤其贵（让它是"心仪卡的保底出口"而非"抽卡替代品"）。把定价决策写进计划，Generator 别拍脑袋定低。
  - 范围：CodexPanel 灰位卡点击 → 确认弹窗（花 N KP 解锁）→ spend 成功则 addCard + 日志 + saveToServer。不需要新视图、不需要新 store、不升 schema。**一轮稳做完，且是本轮经济闭环的主菜**。
  - 余额不足 / 已拥有 的边界要给提示（spend 返回 false 时不 addCard）。

### 🟡-3 真实评分/放送年可视化 —— 可行性：高，纯前端，一轮可做完
- **理由**：数据**已 100% 送达前端**。实测顶层字段：anime 卡有 `date / rating_rank / rating_score / rating_total`；character 卡有 `anime_names / anime_count / popularity_score / comprehensive_popularity / gender / birthday / blood_type / height`。`BaseCard` 有 `[key:string]:any` 索引签名（types/card.ts:13），故 `card.rating_score` 等**运行时直接可读、无类型报错**。展示点 `CardDetailModal.vue` 右栏「简介→战斗信息」之间留白可插。
- **对规划的建议**：
  - 最小形态＝CardDetailModal 加一个「番剧资料」区块：anime 显示真实评分（rating_score）/排名（rating_rank）/放送年（date 取年份）；character 显示登场作品数（anime_count）/人气（popularity_score）等。**这是竞品物理上做不到的差异化**，工作量小（一个区块 + 取字段）。
  - 建议**给 AnimeCard/CharacterCard 补显式可选字段**（types/card.ts），别只靠 index 签名裸读 any，类型干净（半个文件的事）。
  - 「我的番剧年表」时间轴是更大件——本轮**先做 CardDetailModal 展示**，年表留作余量/下轮。
  - **声优维度明确不在本轮**：`backend/server.py:44` 服务 all_animes 时 `item.pop("main_characters")`，character 卡顶层也无 actors 字段——前端拿不到声优数据，做声优收集需后端配合，超出本轮纯前端范围。

### 🟡-2 周任务 + 连续登录递增 —— 可行性：中，需升 schema v6→v7
- **理由**：扩 `stores/daily.ts`：周任务要 weekKey（仿 todayKey）；连续登录要记 streak + 比对昨日（viewing.ts:77-94 有「连续天数」昨日判定样板）。这些是**新持久化状态**，要升 schema v6→v7（DailySave 加 weekly/loginStreak 字段，三处同改 + 迁移 + 测试）。
- **对规划的建议**：与 2 红耦合低、且要动 schema，**建议作为余量项**：2 红做完有富余再叠。若纳入，最小形态＝DailySave 加 `loginStreak: number` + `lastLoginDate` 已有，连续登录递增奖励（第 N 天给更多），周任务可下轮。

### 一句话给 Planner
**🔴-1 图鉴定向解锁 + 🟡-3 真实数据可视化 一轮稳做完，二者都以「图鉴/卡详情」为枢纽、复用 spend/addCard/index 数据、几乎不进新存档**；🟡-2 要动 schema 作余量。本轮让"图鉴"从只读面板变成"知识点消费目的地 + 真实数据展示舞台"。

## B. 代码地图与坑（给 Generator —— HOW 接地）

### 🔴-1 图鉴定向解锁
- **相关文件**：
  - `stores/collection.ts:32` `addCard(cardId, type: CardDomain): {isNew}` —— 加卡入收藏（count++ 或新建）。解锁发货走它。
  - `stores/profile.ts` `spend('knowledgePoints', n): boolean`（余额不足返 false 不扣）/ `currencyName(...)` / `addLog`。
  - `stores/userStore.ts:161-227` `purchaseShopItem` —— 编排样板（校验登录→spend→发货→saveToServer）。**新增 `unlockCodexCard(cardId, domain)` 门面函数照它写**：登录校验 → 已拥有则拒 → `spend('knowledgePoints', price)` 失败给提示 → `collection.addCard` → 日志 → `saveToServer()`。
  - `components/CodexPanel.vue` —— 灰位网格在 template 164-200（`v-if="!item.owned"` 分支）。给未拥有卡加点击 → 确认 → 调 `userStore.unlockCodexCard(item.id, codexDomain)`。价格用 `codexDomain` + `item.rarity` 从 config 取。
  - 新建 `config/codexUnlock.ts` —— 按稀有度定价表（仿 config/codexMilestones.ts 结构）。
- **现有架构/数据流**：收藏是 `Map<id,{count}>`（collection.ts:15-16），进存档。解锁 = 花钱调 addCard，完成度 computed 自动 +1，里程碑/成就的 codex check 可联动。
- **坑**：① 定价别低到架空抽卡（A 段已述，UR 尤贵）；② addCard 对已拥有会 count++（解锁前必须判 `getXxxCardCount(id)>0` 拒绝重复购买）；③ 解锁后要 saveToServer（门面负责，领域 store 不调）；④ 可考虑解锁联动 `achievements.check`/codex 里程碑（非必须）。

### 🟡-3 真实数据可视化
- **相关文件**：
  - `types/card.ts` —— `BaseCard`(6-14) 有 `[key:string]:any`；`AnimeCard`(17-25)/`CharacterCard`(28-33)。**建议补显式可选字段**：AnimeCard 加 `date?: string; rating_score?: number; rating_rank?: number; rating_total?: number;`；CharacterCard 加 `anime_count?: number; popularity_score?: number; comprehensive_popularity?: number; gender?: string; birthday?: string;`（按需）。
  - `components/CardDetailModal.vue`（241 行）—— 右栏「Details」：简介区块在 template 125-128，战斗信息在 130+。**「番剧资料」区块插在简介与战斗信息之间**（约 129 行后）。`props.card`/`props.cardType` 已有；按 cardType 分支取字段。
  - 真实数据：anime `date`(如 "2025-...")/`rating_score`(浮点)/`rating_rank`(整数)/`rating_total`；character `anime_count`/`popularity_score`/`anime_names`。
- **现有架构/数据流**：卡详情数据来自 `gameDataStore.getXxxCardById`，已含全部真实字段（后端只剥 anime 的 main_characters，评分/日期都在）。CardDetailModal 拿到的 `card` 就是完整卡对象。
- **坑**：① date 是字符串，取年份用 `.slice(0,4)` 或正则，注意可能为空/格式不一，做兜底（无则不显示该行）；② 颜色用语义类——CardDetailModal:135 有历史 `text-blue-600` 别学，新区块用 `text-ink/text-accent/text-ink-2`；③ 评分可能缺失（部分卡），每个字段 `v-if` 守卫存在才显示。

### 🟡-2 周任务/连续登录（若纳入）
- **相关文件**：`stores/daily.ts`（DailySave 现 date/progress/claimed/lastLoginDate）；`infra/persistence/schema.ts`（现 SAVE_VERSION=6）；viewing.ts:77-94（连续天数昨日判定样板）。
- **坑**：要升 v6→v7（三处同改 + 迁移 + 测试），DailySave 扩字段；与 2 红独立，余量再做。

## C. 新发现的坑
1. **定向解锁的经济平衡是设计要点不是实现细节**：定价直接决定它是"健康的保底出口"还是"抽卡杀手"。Planner 须在计划里定价格档（UR 远高于回收价），Generator 别自行定低价。
2. **BaseCard 索引签名 `[key]:any` 双刃**：让真实字段裸读不报错，但也意味着拼错字段名不会被类型系统抓——补显式可选字段后用显式字段访问更安全。
3. **CardDetailModal 已有历史硬编码色**（text-blue-600 等，135 行）：新区块坚持语义类，别复制旧风格。
4. **schema 现 v6**（Round 1 刚升）：🟡-2 若做要 v6→v7；2 红不动 schema（解锁靠 collection 已有持久化、可视化是纯展示）。
