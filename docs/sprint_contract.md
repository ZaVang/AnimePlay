# Sprint Contract: 战术终端 2.0 - 极致清晰与全量同步

## 核心任务清单
- [ ] **[Generator] 视觉降噪与清晰度**: 修改 `main.css`，切换全局字体为清晰无衬线，移除扫描线干扰，并提升文字与背景的对比度。
- [ ] **[Generator] 纯净化本地化**: 遍历 `App.vue` 及所有 Dashboard 组件，移除 `//` 及后续英文内容，取消 `AnimePlay Sys` 等英文标识。
- [ ] **[Generator] 全量数据分发引擎**: 在 `authStore.ts` 中实现全量数据加载逻辑。
    - [ ] 映射 `Aririgi.json` 的 `state` 到 `auth`, `economy` Stores。
    - [ ] 分发 `animeCollection` 和 `characterCollection` 到 `collectionStore`。
    - [ ] 同步 `viewingStats` 和 `viewingQueue` 到 `viewingStore`。

## 成功标准 (Success Criteria)
1. **界面纯净化**: 全局不再出现任何 `中文 // 英文` 格式的文本，Logo 已改为中文。
2. **高清晰阅读**: 字体无模糊感，主要数值和文本的对比度显著提升，扫描线几乎不可见。
3. **数据百分百一致**: 登录 `Aririgi` 后，前端显示的收藏数量、金币、等级、日志应与 `data/user_data/Aririgi.json` 里的数据完全吻合。
4. **会话稳固**: 刷新页面后，全量数据能自动重新加载，无任何数据丢失。
