# Negotiation — Iteration 5 (evolution R1)

## 对本轮 Evolution Reviewer 报告的逐条回应

### 建议 🔴-1: 小游戏 Hub + 猜角色迁入（/minigames，导航取代猜角色，/guess redirect）
- **决策**：接受
- **理由**：正是用户硬性交付。Scout 确认用 CollectionsView 的 activeTab 样板做 Hub 内切换最省力一致。
- **本轮行动**：MG-T1 实现。

### 建议 🔴-2: 新游戏 #1 = 高低牌 Higher/Lower
- **决策**：接受（**维度选型按 Scout 实测纠偏**）
- **理由**：ROI 最高、复用真实数据、零图片依赖。但 Scout 实测推翻了报告的维度建议——番剧无 popularity_score、角色无 rating_rank/date、裸 rating_score 仅 20 distinct。
- **本轮行动**：MG-T2 实现；角色模式用 `popularity_score`、番剧模式用 `rating_rank`/`date`，按卡类型分桶不混用。

### 建议 🔴-3: 新游戏 #2 = Quiz 或 猜番剧（剪影）
- **决策**：部分接受（**推迟到第 6 轮**）
- **理由**：SPRINT「第 5 轮」只硬性要求 Hub + 猜角色迁入 + 游戏 #1；游戏 #2 是「前 2 轮内」。本轮先把 Hub 地基 + 高低牌做扎实，#2 下轮做更稳。选型（Quiz vs 猜番剧）留第 6 轮定。
- **本轮行动**：N/A（第 6 轮做）。

### 建议 🔴-4: 存档升 v8 新增 minigames 域
- **决策**：接受
- **理由**：新游戏分数要持久化；Scout 确认现版本是 v7（不是 v6），不动 guess 域避免破既有断言。
- **本轮行动**：MG-T3 实现，v7→v8，新开 minigames 域。

### 建议（Technical Health）: 每日封顶防刷 / 纯逻辑放 stores/minigames 注入 RNG
- **决策**：接受
- **理由**：streak 可无限长，不封顶会刷爆经济；纯逻辑进 stores/minigames（非 engine）符合架构定位。
- **本轮行动**：MG-T2/T3 里实现里程碑发奖 + 每日封顶 + 注入 RNG 纯函数 + 特征测试。

### 建议 🟡/🟢（每日挑战 / 小游戏红点 / 砍 gameRecords UI / 清死代码 getOriginalImageUrl）
- **决策**：部分接受（推迟）
- **理由**：每日挑战、积分榜、红点是第 7–9 轮的开放探索好素材；砍 gameRecords/清死代码是 Nice-to-have，不在本轮硬交付，避免范围膨胀。
- **本轮行动**：N/A（记入后续轮 backlog）。

## 本轮 Planner 自主发现的改进方向
- Scout 的「维度按卡类型分桶 + 实测 distinct」是本轮最关键纠偏，已写进 plan 硬约束——避免 Generator 拿 rating_score 做出抛硬币体验。
