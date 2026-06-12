# composables/ —— 可复用 Vue 组合式函数

**只负责**：跨组件复用的 Vue 逻辑（如带自动清理的 `useInterval`、`useCountdown`），命名以 `use` 开头。

**绝不允许**：写业务规则（属于 `engine/`）或页面专属逻辑（留在对应组件）。

典型迁入候选（重构时顺手收编）：WatchQueue/UpBanner 的倒计时、各处需要 `onUnmounted` 清理的定时器与监听。
