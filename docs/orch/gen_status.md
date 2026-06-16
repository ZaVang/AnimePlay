# Generator Status — Iteration 3（收口轮）

> 本轮 3 任务全部实现并自验。状态：**PASSED**。验收输出真实（亲自跑）。

## 完成的任务

### E3-T1 新人 onboarding（FTUE）✅
- **首登引导遮罩**：新建 `stores/onboarding.ts`（仿 `theme.ts` 的 localStorage 设备标志 pattern，key=`onboarding-done`，try/catch 包裹 + node 无 DOM 静默回落，**不进存档、不升 schema**）。新建 `components/OnboardingGuide.vue`：4 步引导（每日任务 → 抽卡 → 收藏/图鉴 → 第一场对战），可跳过、可「带我去」跳系统页、有上一步/下一步/进度点。挂 `App.vue` 顶层（内部 `<Teleport to="body">`，`z-index:100 > header z-50`）。触发点：`App.vue` `handleLogin` 成功后调 `onboardingStore.maybeStartGuide()`（设备未看过才弹）；跳过/完成写 localStorage 标志不再弹。
  - 决策：触发逻辑放 `App.vue`（已有 login result）而非塞进 `userStore` 门面，保持 store 层不反向依赖 onboarding。
- **首抽庆祝**：`GachaResultModal.vue` 加 `isFirstDraw` prop（`withDefaults` 默认 false）。首抽时叠加金色边框 + 庆祝横幅 + 24 片纯 CSS 彩纸（**无定时器/RAF → 无需登记清除**，规避 startup 段铁律风险）。首抽判定在 `GachaView.vue` `handleDraw` 内、**抽卡前**读 `gachaStore.animeHistory.length===0 && characterHistory.length===0`（抽完历史即非空，必须前置判定），传入 modal。
- **空态 CTA**：`CollectionsView.vue` 动画/角色两处空态（原死文字 :195/:220）改为区分「一张都没有」vs「被筛选掉了」两种文案 + 「🎴 去抽卡」`.btn-primary` 按钮（`router.push('/gacha')`）。用语义类，**未学旁边的 `bg-danger text-white`**。
  - 说明：`CollectionPreview.vue`（:54/:64）已有「去收藏点星星」CTA、`GachaHistory.vue`（:148）在抽卡页内卡池 tab 一键可达，未重复加 CTA。主要空态（收藏/图鉴语境）已覆盖。

### E3-T2 可分享 Wrapped 成绩卡 ✅
- **纯派生聚合**：新建 `src/wrapped/buildWrappedStats.ts`——**纯函数**（零 Vue/Pinia/DOM import），输入各 store 快照、输出成绩卡视图模型（图鉴合并完成度%、动画/角色 UR owned/total、成就 N/总、里程碑数、塔最高层、拥有卡种、累计抽卡、UR 总数、近月 UR、高稀有率）。抽成纯函数为可单测。除零全部兜底。
  - 放 `src/wrapped/` 而非 `lib/`（lib 禁游戏概念）或 `composables/`（README 限定 Vue 复用逻辑非业务规则）。
- **出图下载**：新建 `components/ShareCard.vue`——live store → `buildWrappedStats` → 手绘 600×800 Canvas（品牌固定色自绘，**首版不嵌远程封面图**规避 taint）→ `canvas.toBlob` → `URL.createObjectURL` → `a.download='animeplay-wrapped-<user>.png'` → `a.click()` → `URL.revokeObjectURL`（用完即释放，不回退 S9 泄漏修复）。**未引 html2canvas 等重依赖**。含屏内缩放预览 + 刷新预览 + 下载按钮。
- **入口**：`CollectionsView.vue` 标题栏（:144 区）加「🎴 生成成绩卡」`.btn-primary` 按钮（仅登录显示），开 `ShareCard` modal。

### E3-T3 文档纠偏 ✅
- `frontend-vue/CLAUDE.md:45` schema **v4 → v6**（补全 v3/v4/v5/v6 版本含义）；:46 「存档 v4 随账号漫游」→ v6。
- `docs/plans/pitfalls.md:11` 「存档协议当前 v4」→ **v6**（补 v4/v5/v6 含义）；:34 「schema version 现 5」→ **现 6**。
- 保留的历史性 v2/v4 提法（CLAUDE :65「S5 解决：协议 v2」、版本含义列表里的「v4=皮肤装扮」）均为准确历史/迁移步骤记录，不改。
- 核对依据：`schema.ts:24 SAVE_VERSION = 6 as const`。

## 未完成的任务
无。三任务全部落地。

## 测试
- 新增 `src/wrapped/buildWrappedStats.test.ts`（10 用例：完成度合并百分比/UR 拆分/欧气 UR 总数·近月·高稀有率/空历史兜底/透传）。
- 新增 `src/stores/onboarding.test.ts`（8 用例：设备标志读写/maybeStartGuide 触发/finishGuide 落标志不再弹/replayGuide 不动标志/无 localStorage 不抛——注入内存 localStorage stub 适配 node 环境）。

## 验收命令真实输出

```
$ npm run type-check
> vue-tsc --build
（0 错误，无输出）

$ npm run test
> vitest run
 Test Files  31 passed (31)
      Tests  354 passed (354)
   Duration  3.54s

$ npm run build
> run-p type-check "build-only {@}"
✓ 299 modules transformed.
✓ built in 9.70s
（type-check 与 vite build 均通过）

$ npx eslint <10 个改动/新增文件>
（无输出 = 0 warning / 0 error）
```

- 测试数 354 ≥ 验收线 340（本轮 +18：新增 buildWrappedStats 10 + onboarding 8）。

## 新发现的坑
- **vitest 环境是 node（`vitest.config.ts:8 environment:'node'`）**：onboarding store 的 localStorage 测试需注入内存 stub（`globalThis.localStorage`），并用动态 import + `vi.resetModules()` 在每个 case 重新读初始标志（store 的 `hasSeenGuide` 在实例化时读一次）。已在 `onboarding.test.ts` 处理。
- **首抽判定必须前置**：`drawCards` 内部已 `pushHistory`，若在抽卡后判定首抽永远 false。已在 `GachaView.handleDraw` 抽卡前快照历史长度。
- 文档版本号坑已按 scout §C1 纠正（schema 实为 v6，CLAUDE/pitfalls 旧写 v4/现5）。

## 文件结构变更自报
新增：
- `frontend-vue/src/stores/onboarding.ts`（onboarding 设备标志 store）
- `frontend-vue/src/stores/onboarding.test.ts`
- `frontend-vue/src/components/OnboardingGuide.vue`（首登引导遮罩）
- `frontend-vue/src/components/ShareCard.vue`（成绩卡弹窗 + Canvas 出图）
- `frontend-vue/src/wrapped/buildWrappedStats.ts`（纯派生聚合函数）
- `frontend-vue/src/wrapped/buildWrappedStats.test.ts`

修改：
- `frontend-vue/src/App.vue`（引入 OnboardingGuide + 登录后触发引导）
- `frontend-vue/src/views/GachaView.vue`（首抽判定 + isFirstDraw 传参）
- `frontend-vue/src/components/GachaResultModal.vue`（首抽庆祝态：横幅/边框/彩纸）
- `frontend-vue/src/views/CollectionsView.vue`（空态 CTA + 成绩卡入口按钮 + ShareCard modal）
- `frontend-vue/CLAUDE.md`（schema v4→v6）
- `docs/plans/pitfalls.md`（schema v4→v6、version 现5→现6）
- `docs/SPRINT.md`（E3-T1/T2/T3 勾 [x]）

## 状态
**PASSED** —— 三任务全部实现；type-check 0 错 / test 354 全绿（≥340）/ build 通过 / 单文件 eslint 全清；架构铁律（engine 纯净、依赖只向下、localStorage 仅 stores 层）与颜色铁律（语义类 + 导出图固定色合理例外，无 text-white 压浅底）均未破。
