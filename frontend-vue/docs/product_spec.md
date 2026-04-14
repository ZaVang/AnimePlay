# AnimePlay Product Spec (Performance & Integrity Fixes)

## 1. 致命崩溃修复：角色养成模块 (Nurture System Integrity)
- **问题**: 在重构过程中，`NurtureView` 中的响应式引用发生断裂（调用了不存在的 `characterMetas` 和 `getCharacterMeta`），从而导致 Vue 生命周期抛出异常。这种未捕获的错误会阻塞整个 Vue Router，导致后续所有的页面跳转和渲染失效（即点击死锁现象）。
- **解决方案**: 修正对 Pinia Store 中对应数据字段的选择器，正确调用 `characterNurtureData` 及 `getNurtureData`。

## 2. 视觉延迟与卡顿优化 (Performance & Transition)
- **问题**: 当前使用 `out-in` 模式的切换动画加上高分辨率背景滤镜，在复杂组件加载时造成严重的性能损耗与感知滞后。
- **解决方案**: 缩短或移除全局过度动画的阻塞模式。优化 DOM 更新。

## 3. 被遗失的核心模块：卡牌战斗配置 (Missing Battle Node)
- **问题**: 在之前对应用框架的收缩调整中，侧边栏或主界面遗漏了原有的独立【卡牌战斗】入口 (`/battle`)，只留下了【小队格斗】（`/squad-battle`），从而导致功能不完整。
- **解决方案**: 在全局侧边垂直导航栏 (Tactical Sidebar) 恢复独立的卡牌战斗快捷链路。
