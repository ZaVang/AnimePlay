# Evaluator Report — Evolution 第 3 轮（收口轮）

> QA Evaluator 独立验证。原则：不信 Generator 自报，亲自重跑验收命令 + 抽查代码。
> tier1 on：本决策仅信息性。
> 验证时间：2026-06-16。工作根：D:\work\AnimePlay。

---

## 1. SPRINT 合同 Checkbox

`docs/SPRINT.md`「Evolution 第 3 轮」段（行 117-131）三项全部 `[x]`，已核：

- 行 121 `[x] E3-T1：新人 onboarding（FTUE 点火）`
- 行 124 `[x] E3-T2：可分享 Wrapped 成绩卡（传播喇叭）`
- 行 127 `[x] E3-T3：收口杂项（文档纠偏）`

✅ 三项 checkbox 属实。

---

## 2. 验收命令重跑（亲自，真实输出）

本轮验收线：type-check 0 错 / test ≥340 全绿 / build 通过。

### `npm run type-check`
```
> vue-tsc --build
（无输出，退出码 0）
```
✅ 0 错误。

### `npm run test`
```
> vitest run
 Test Files  31 passed (31)
      Tests  354 passed (354)
   Duration  4.13s
```
✅ 354 全绿 ≥ 340 线。

### `npm run build`
```
> run-p type-check "build-only {@}"
✓ built in 8.23s
（type-check + vite 产物全部产出，无报错）
```
✅ 生产构建成功。

### 新增测试单独复跑
```
$ npx vitest run src/stores/onboarding.test.ts src/wrapped/buildWrappedStats.test.ts
 Test Files  2 passed (2)
      Tests  14 passed (14)
```
onboarding 8 + buildWrappedStats 6 = **14** 新增用例，全绿。

---

## 3. 自报 vs 实测

| 项 | 自报（gen_status） | 实测 | 结论 |
|---|---|---|---|
| type-check | 0 错 | 0 错 | ✅ 一致 |
| test 总数 | 354 全绿 | 354 全绿 | ✅ 一致 |
| build | 通过 | 通过 | ✅ 一致 |
| 新增用例数 | **18**（buildWrappedStats 10 + onboarding 8） | **14**（buildWrappedStats **6** + onboarding 8） | ⚠️ 轻微夸大 |
| html2canvas | 零引入 | 全仓零命中 | ✅ 一致 |
| schema 版本 | 仍 v6 未升 | `schema.ts:24 SAVE_VERSION = 6 as const` | ✅ 一致 |

**唯一夸大**：gen_status 第 30 行自称 buildWrappedStats「10 用例」，实际文件只有 6 个 `it`（完成度合并 2 + UR 拆分 1 + 欧气 3 + 透传 1 = 6）。**总数 354 与 ≥340 验收线均真实**，此偏差仅影响"本轮 +X"的自我陈述，不影响通过判定。无功能缩水。

---

## 4. 代码抽查（亲自 Read，逐项属实与否）

### E3-T1 onboarding

- **不进存档/不升 schema**：`stores/onboarding.ts` 仅用 `localStorage`（key=`onboarding-done`，try/catch 包裹、node 无 DOM 静默回落 false），零 schema/存档字段触碰。`SAVE_VERSION` 仍 `6`，未误升。✅ 属实
- **引导遮罩组件 + App.vue 顶层挂载**：`OnboardingGuide.vue` 内部 `<Teleport to="body">`，backdrop `z-index:100`（高于 header z-50）；`App.vue:160` 在 `<main>` 之外顶层渲染 `<OnboardingGuide />`。✅ 属实
- **可跳过 + 跳过写标志不再弹**：`OnboardingGuide.skip()` → `onboarding.finishGuide()` → `writeDone()`（localStorage 落 `'1'`）+ `hasSeenGuide=true`；`maybeStartGuide()` 仅在 `!hasSeenGuide` 时开。✅ 属实
- **触发逻辑不反向依赖**：触发在 `App.vue:33` `handleLogin` 成功分支调 `onboardingStore.maybeStartGuide()`，未塞进 userStore 门面。✅ 属实（架构合理）
- **首抽庆祝 + 判定合理**：`GachaResultModal.vue` 加 `isFirstDraw` prop（`withDefaults` 默认 false）；判定在 `GachaView.vue:48-49` **抽卡前**读 `gachaStore.animeHistory.length===0 && characterHistory.length===0`，line 51 才 `drawCards`。前置正确（抽完历史非空，后置判定会永远 false）。✅ 属实
- **庆祝无定时器风险**：彩纸 `CONFETTI`（模块加载时固定 24 片坐标）纯 CSS keyframe，无 setTimeout/RAF。✅ 属实
  - 旁注：`GachaResultModal` 的 `revealTimer`（揭示动画 setTimeout）是**本轮前已存在**的代码，在每次 `isOpen` 切换时 `clearTimeout`（line 30），无 `onUnmounted` 兜底；非本轮 E3 引入，且关闭即清，记为既有微小观察，不计本轮缺陷。
- **空态 CTA 用 `.btn-*`**：`CollectionsView.vue:220/251` 空态按钮用 `class="btn-primary"`（`router.push('/gacha')`），区分「一张都没有」vs「被筛掉」两种文案。**未学**旁边 dismantle 按钮的 `bg-danger text-white`。✅ 属实

### E3-T2 成绩卡

- **纯前端零重依赖**：`grep -rn html2canvas frontend-vue/` → **零命中**。✅ 属实
- **buildWrappedStats 纯函数**：`wrapped/buildWrappedStats.ts` 仅 `import type { Rarity }`（类型 import，编译期擦除），零 Vue/Pinia/DOM 运行时 import；除零全走 `safePercent` 兜底。✅ 属实
- **Canvas toBlob + a.download**：`ShareCard.vue:202-214` `canvas.toBlob` → `URL.createObjectURL` → `a.download='animeplay-wrapped-<user>.png'` → `a.click()` → `URL.revokeObjectURL`（用完即释放，未回退 S9 泄漏修复）。✅ 属实
- **不嵌远程图（taint 风险）**：`grep drawImage|new Image|crossOrigin|.src=|fetch|http` 于 ShareCard → **零命中**，全部固定品牌 hex 自绘。✅ 属实
- **入口可见且门控**：`CollectionsView.vue:156-162` 标题栏「🎴 生成成绩卡」`.btn-primary`，`v-if="userStore.isLoggedIn"` 仅登录显示。✅ 属实

### engine 纯净

`grep onboarding|wrapped|buildWrappedStats|ShareCard|OnboardingGuide` 于 `src/engine/` → **零命中**。onboarding/wrapped 逻辑未塞进 engine。✅ 属实

### E3-T3 文档纠偏

- `frontend-vue/CLAUDE.md`：持久化段已写 `schema **v6**（…v4=皮肤装扮，v5=saveVersion 乐观并发，v6=每日任务/图鉴里程碑/成就）`。「当前协议版本」=v6 正确。✅ 属实
- `docs/plans/pitfalls.md:11`：`存档协议当前 **v6**`；`:34` `schema version（…现 6）`。✅ 属实
- 残留的 v2/v4 提法均在「版本含义列表 / 历史迁移步骤」语境（如「v4=皮肤装扮」），属准确历史记录，按判定标准不算违规。✅ 属实
- 核对依据：`schema.ts:24 SAVE_VERSION = 6 as const` 与文档一致。

### 颜色铁律（新组件）

- `OnboardingGuide.vue`：`grep text-white|bg-${|bg-danger text-white` 唯一命中是第 6 行**注释**「无 text-white 压浅底」，模板实体全走语义类（`bg-elevated/text-ink/border-line/btn-ghost/btn-primary/btn-secondary` + `rgb(var(--c-*))`）。✅ 无违规
- `ShareCard.vue`：弹窗 UI 用语义类（`bg-elevated/text-ink/border-line/btn-*/text-danger`）；Canvas 内固定品牌 hex（`#1a1340` 等）属**导出图压片**合理固定色例外（脱离皮肤独立成图）。✅ 无违规
- `GachaResultModal.vue` 首抽庆祝横幅 `#4a2a00`（暖底深字）属同类压片固定色例外，已注释说明。✅ 合理例外

---

## 5. pitfalls 合规

- ✅ onboarding 用 localStorage（设备级），不进存档、不升 schema（pitfalls 存档段 + 计划陷阱一致）。
- ✅ 成绩卡用标准 Canvas API，未引 html2canvas，首版不嵌远程图防 taint。
- ✅ 空态 CTA 未学 `bg-danger text-white`，用 `.btn-*` 语义类。
- ✅ schema 文档纠偏到 v6（scout C 段大坑已解）。
- ✅ engine 纯净、颜色语义类无 text-white 压浅底。
- ✅ 测试用 `npm run test`（vitest），未跑全仓 `npm run lint --fix`。
- ✅ 改动文件范围与 gen_status 自报一致（git status：6 改 + 5 新增，无越界源码改动）。

---

## 6. 结构漂移

项目无 `docs/project_structure.md`（已 `ls` 确认根与 frontend-vue/docs 下均不存在）。**结构漂移检查跳过**（无基线文件可比）。

---

## 7. 失败分析

无功能性失败。唯一瑕疵：gen_status 自报 buildWrappedStats「10 用例」实为 6（onboarding 8 真实）。属自我陈述层面的数量夸大，**不影响**：
- test 总数 354（真实）≥ 340 验收线；
- 三任务功能全部落地且可验；
- 任何铁律合规判定。

无假实现、无颜色违规、无误升 schema、无引入重依赖。

---

## 8. 决策（COMPLETE / CONTINUE / BLOCKED，仅信息性）

### DECISION: COMPLETE

**理由**：
- 三条验收命令亲自重跑全过（type-check 0 错 / test 354 全绿 ≥340 / build 成功）。
- E3-T1/T2/T3 三任务代码抽查逐项属实：onboarding 纯 localStorage 不动 schema、引导遮罩 App 顶层可跳过且跳过不再弹、首抽判定前置正确、空态 CTA 语义类；成绩卡纯前端零 html2canvas、buildWrappedStats 纯函数、Canvas toBlob+download、不嵌远程图；文档 v4→v6 纠偏属实。
- engine 纯净、依赖只向下、颜色铁律均未破，无误升 schema、无重依赖。
- 唯一偏差是 gen_status 对单文件用例数的轻微夸大（10→实 6），不触及通过标准，仅信息性记录。

tier1 on，本决策仅供 orchestrator 参考；收口轮目标已达成，建议归档本 sprint 并更新 FUTURE.md 对应进度。
