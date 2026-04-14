# Contract & Executable Scope (ATR-F)

## 1. Vue Reactivity Patch (Nurture System)
- **文件**: `src/views/NurtureView.vue`
- **代码重构**: 
  - 修复 `ownedCharacters` computed 的异常，将其修改为正确访问 `nurtureStore.characterNurtureData.keys()`。
  - 修复 `selectedCharacterMeta`，将其计算属性指向 `nurtureStore.getNurtureData(selectedCharacterId.value)`。
  - 替换缺失的数据结构读取（如 `selectedCharacterMeta.level` 等），因为最新的 Store 返回格式已有变动。

## 2. Navigation Module Restore
- **文件**: `src/App.vue`
- **代码重构**: 
  - 在 左侧 Sidebar 中，新增一项 `<RouterLink to="/battle" class="nav-link-tactical-v">` 并赋予相应的图标（如 ♠️）和名称“卡牌对战”。
  - 确保导航菜单的排序具备逻辑性，将实战类排在一起。

## 3. Performance & Perceived Latency Reduction
- **文件**: `src/App.vue` 等
- **代码重构**:
  - 在 `App.vue` 中对 `<transition>` 执行降级处理：降低过渡时长到 `0.1s` 或移除 `mode="out-in"` 同步延迟。
  - （可选验证）审查并确保全量同步的保存函数是异步非阻塞执行的，避免冻结主线程渲染。

## 验收准则
- [ ] 侧边栏可以成功导航到 `/battle` 面板。
- [ ] 切换到 `/nurture` 时不再出现 Vue Unhandled Promise / Rendering 死锁导致全站失控瘫痪现象。
- [ ] 快速切换页面不会因为出入场动画强制锁屏一长段时间。
