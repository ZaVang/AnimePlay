# Generator Status — Iteration 5（债轮 · 打磨/还债轮 · 最后一轮）

> 第 5 轮 I5-T1~T5 全实装。零存档铁律恪守（SAVE_VERSION 仍 12；schema.ts/migrations.ts 零改动；
> persistence.ts 仅把 load 失败的原生 alert 换成 toast，存档协议结构/payload 装配逻辑零改动）。
> 五条验收命令亲跑全绿。先抽共享基建（共享色映射 + 统一弹窗 composable + 共享解锁门面）再让各处消费。

## 完成的任务

### I5-T1 — 养成+挑战塔硬色 138 处连根拔（抽共享色映射 + 整函数重写）✅
- **新建共享色映射**：`frontend-vue/src/config/nurtureColors.ts`（纯常量/纯函数，零 Vue/Pinia/DOM/IO，依赖只向下）
  - `bondTier(affection)`：羁绊 7 档 → 语义令牌色（≥1000 accent / ≥800 danger / ≥600 highlight / ≥400 info / ≥200 success / ≥100 warning / else ink-2）+ 软底 bgColor + icon。
  - `moodTier(mood)` / `moodColor(mood)`：心情 5 档 → 语义色（accent/success/warning/warning/danger）。
  - `ATTRIBUTE_TEXT_COLOR` / `ATTRIBUTE_BAR_COLOR`：charm→accent、intelligence→info、strength→success、mood→warning。
  - `SEMANTIC_CARD_CLASSES`（blue→info/pink→accent/green→success/purple→highlight/yellow→warning，整字面类名）+ `SEMANTIC_BTN_CLASSES`（实心按钮 text-on-accent，不裸 text-white）。
- **整函数重写消费端（消除两份重复定义）**：
  - `CharacterProfile.vue`：`bondLevel` computed 整函数重写调 `bondTier`（视图态 progress/maxReached 在外派生）；`moodStatus` 整函数重写调 `moodTier`；养成属性/战斗属性/战斗力卡/统计区散色全迁语义令牌。
  - `CharacterSelector.vue`：`getBondLevel` 整函数重写调 `bondTier`（消除与 CharacterProfile 逐字重复的第二份 bondLevel 硬色表）；选择按钮/svg/hover/Lv/选中指示器散色迁语义。
  - `InteractionPanel.vue`：`INTERACTION_COLOR_CLASSES` 改指 `SEMANTIC_CARD_CLASSES`；底部「目前心情」inline 五档（第二份 moodStatus 硬色）整函数重写调 `moodColor`；快速互动/礼物/活动/校园渐变散色全迁。
  - `NurtureActions.vue`：`ACTIVITY_CARD_CLASSES`/`ACTIVITY_BTN_CLASSES` 改指共享映射；属性进度条用 `ATTRIBUTE_BAR_COLOR`；心情值用 `moodColor`；训练/战斗训练/冷却散色全迁。
  - `DialogueSystem.vue`：用户气泡/发送按钮/输入框 focus 3 处迁语义。
  - `views/SquadBattleView.vue`：刷新按钮/层数状态/战力/难度徽章组（统一 success/warning/danger/highlight）/规则卡/玩家敌方小队头/高亮边框/位置徽章/血条/行动按钮/结果页 31 处全迁语义。
- **合法例外保留**（未动）：稀有度渐变/徽章（CharacterProfile L215-235）、CharacterSelector 稀有度 shadow（L173-177）、SquadBattle 图片压片 `bg-black/70 text-white` 位置徽章。
- **自检**：养成 5 文件 + SquadBattleView 残留硬编码 Tailwind 色 = 0（仅 rarity shadow/图片压片白字例外）；切 midnight/neon 全走 `--c-*` 令牌随皮肤协调。

### I5-T2 — 原生 confirm/alert 18 处统一主题化弹窗（含共享解锁门面，一笔还两债）✅
- **新建统一弹窗基建**（全仓首个通用弹窗）：
  - `composables/useDialog.ts`：模块级单例响应式队列，`confirm()/alert()` 返回 Promise；`useDialogHost()` 供组件读状态/结算。
  - `components/AppDialog.vue`：挂 App.vue 顶层（z-110 高于 onboarding/header），Teleport+backdrop，**全走语义令牌**（btn-primary/btn-danger/btn-ghost、text-ink/ink-2、bg-elevated），Esc 取消/回车确认/自动聚焦确认键。
- **共享解锁门面**：`composables/useUnlockConfirm.ts` — `unlock(card, domain)`（**收 domain 参数，不写死 anime**）；登录/余额前置提示走主题化 alert，confirm 花费后调 `userStore.unlockCodexCard`，**以 store 返回 {ok,error} 为准**（不在 UI 重复守卫）。4 处 `handleUnlock`（GenreSets/RecommendationStrip/NicheGems anime-only、CodexPanel `codexDomain.value` 双域）收敛到一行 `unlock(card, domain)`。
- **组件层 14 处走主题化弹窗**：CardDetailModal（pin 满 alert + 分解 confirm）、DeckEditor（5）、DeckList、GachaShop、TasteProfileGame、TierListGame、BattleView、CollectionsView — 全改 `await confirm`/`void alert`，危险操作带 `danger: true`。
- **store 层 4 处降级 toast**（脱离组件上下文，非阻塞）：`userStore.ts:102/107/158`、`collection.ts:113`、`persistence.ts:173`、`battleSetup.ts:39` → `profile.addLog(..., 'warning')`。
- **未动 2 个误报**：`battle/CardSelectionModal.vue:142`、`battle/TypeSelectionModal.vue:116` 的同名局部 `function confirm()`（zero diff）。
- **自检**：全仓除 composable 定义/调用 + 2 误报局部函数外，**零原生 confirm/alert 调用**。

### I5-T3 — onboarding 点名品味身份（新增第 5 步 + value-first 改写开场）✅
- 步数据抽到 `config/onboardingSteps.ts`（纯数据，便于单测）；`OnboardingGuide.vue` 改 import `ONBOARDING_STEPS`。
- **第 1 步 value-first**：从「每天来打个卡」功能罗列 → 「这里会照出你的番剧人格」（点名差异化主线，每日任务/登录奖励并入正文，不另起步、无 route）。
- **末尾新增第 5 步**：「标记『看过』，点亮你的画像」，route `/collections`、cta「去标记看过」——避免新号落雷达/集册全 0 灰墙。
- **引导内只导航不写状态**：第 5 步靠跳转 `/collections` 让用户自行触达，**不调 `toggleTasteWatched`**。
- `isLast`/进度点/「开始游玩」按钮全是 `steps.length` 派生 → 4→5 步零逻辑改；完成标志仍设备级 localStorage（不进存档）。

### I5-T4 — /homestead 完整冻结（路由守卫 redirect + 移出构建）✅
- `router/index.ts`：`/homestead` 改 `redirect: '/'` + **删 component lazy-import**（HomesteadView 移出构建产物，dist 已无 HomesteadView chunk）。
- `App.vue`：删除残留的家园导航注释块。
- `HomesteadView.vue` 文件保留（冻结不删除，延续 0007e8b 口径）；grep 确认无别处 import，无连带影响。

### I5-T5 — 收尾杂项三连（文档同步 v12 + 死代码修 + setTimeout 登记）✅
- **文档 v12**：`frontend-vue/CLAUDE.md` 持久化段 v11→v12（补 tasteProfile 沿革行 + 「权威值在 schema.ts:30，文档只指向不复述」）；`docs/plans/pitfalls.md` L11（v6→v12 全沿革 + 集中引用注记）+ L34（现 6→现 12）。权威值 `schema.ts:30 SAVE_VERSION=12` 亲验未动。
- **SquadBattle 矛盾文案**：删 SquadBattleView「每日最多挑战10次」整行（与「无次数限制」矛盾、代码侧限制已删）。
- **CardDetailModal Pin 满文案**：`watchingPins.pinnedIds.length`（当前已 pin 数）→ 导出常量 `MAX_PINS`（语义错位修正）。
- **NurtureActions setTimeout 登记**：新增 `schedule()` + `pendingTimers` 集合（仿 SquadBattleView），3s 动画 + 最长 60min 训练播报两处裸 setTimeout 全过 `schedule()`，`onUnmounted` 补 `pendingTimers.forEach(clearTimeout)`（原只清 setInterval）。坑接受：60min 播报卸载后不再 fire（体验性日志非状态变更，可接受）。

## 未完成的任务
- 无。I5-T1~T5 全部实装并自检通过。

## 新增/补的特征测试（23 个，全绿）
- `config/nurtureColors.test.ts`（11）：bondTier/moodTier 阈值 + 全语义类（无硬编码硬色）+ moodColor 与 moodTier 一致（共用同一映射）+ named 映射无 text-white 压浅底。
- `config/onboardingSteps.test.ts`（5）：4→5 步、第 1 步 value-first 不含「打卡」、第 5 步跳 /collections、结构合法、只导航不写状态。
- `composables/useDialog.test.ts`（5）：confirm 确认/取消、alert resolve、单例队列结算旧弹窗、选项透传。
- `composables/useUnlockConfirm.test.ts`（实际归入上面 4 文件 23 总数）：双域（anime/character 不误入）、未登录/余额/取消守卫、以 store 为准。

## 验收命令输出（真实）
```
1) cd frontend-vue && npm run type-check
   > vue-tsc --build  → 0 错（无输出即通过）

2) cd frontend-vue && npm run test
   > vitest run → Test Files 45 passed (45) / Tests 512 passed (512)
   （基线 ≥489；本轮 +23 新测，无既有弱化）

3) cd frontend-vue && npm run build
   > built in 11.92s（成功）；dist/assets 中无 HomesteadView chunk（冻结确认）

4) ./.venv/Scripts/python.exe backend/test_security.py
   > RESULT: PASS — all security checks passed（退出码 0；鉴权/原子写/并发/邀请码全 PASS）

5) grep -rn "debug=True" backend/server.py api/index.py
   > 零命中（退出码 1 = no match = 通过）
```

## 新发现的陷阱
1. **JSDoc 注释里的 `bg-*/20` 会提前闭合块注释**：`config/nurtureColors.ts` 初版在 `/** ... bg-*/20 ... */` 里的 `*/` 把注释截断，触发一串 TS1131/TS1127 解析错误。**注释里写 Tailwind 透明修饰类要避开 `*/` 字面**（改写成「如 bg-accent/20」）。
2. **零存档铁律的精确边界**：T2 要求 store 层 4 处降级 toast，其中 `persistence.ts:173` 是「装配器」文件——但只改了 load 失败路径的 alert→toast，**未碰 buildPayload/applyPayload/saveVersion/SAVE_VERSION**。结论：装配器文件的「非存档协议」UI 行可改，零存档铁律守的是协议结构（schema.ts/migrations.ts 仍 zero diff、SAVE_VERSION 仍 12）。
3. **本环境无组件测试基建**（vitest node 环境，无 jsdom/@vue/test-utils）：onboarding「步数据」无法靠 mount 测——抽出 `config/onboardingSteps.ts` 纯数据模块即可单测（同时让组件更瘦），是符合「测试只覆盖纯逻辑」约定的最小非侵入解。

## 文件结构变更（防漂移自报；项目无 docs/project_structure.md，无需同步）
- 新增：`frontend-vue/src/config/nurtureColors.ts`（+test）、`frontend-vue/src/config/onboardingSteps.ts`（+test）、`frontend-vue/src/composables/useDialog.ts`（+test）、`frontend-vue/src/composables/useUnlockConfirm.ts`（+test）、`frontend-vue/src/components/AppDialog.vue`。
- 修改（I5 范围）：养成 5 文件 + SquadBattleView（硬色）、4 unlock 组件 + 14 confirm/alert 组件 + 4 store（弹窗）、OnboardingGuide、router/index.ts、App.vue、CardDetailModal、frontend-vue/CLAUDE.md、docs/plans/pitfalls.md、docs/SPRINT.md。
- 删除：无（HomesteadView 冻结保留文件、仅移出构建）。

## 状态
PASSED — I5-T1~T5 全实装；五条验收命令亲跑全绿（type-check 0 错 / test 512 全绿 45 文件 / build 成功且 HomesteadView 移出构建 / 后端 test_security PASS 退出码 0 / debug 零命中）；零存档铁律恪守（SAVE_VERSION 仍 12、schema.ts/migrations.ts zero diff、persistence.ts 仅 UI 行改）；硬色整函数重写防复发、自检零残留；统一弹窗/共享解锁门面/共享色映射/onboarding 步数据均补特征测试。

## 注意事项
- 共享色映射做了「取舍声明」落地：羁绊 6 档去重后塌成 accent/danger/highlight/info/success/warning/ink-2（档间色可能重复），区分度靠 icon(emoji) 保留——验收看「切暗皮不炸色斑」，不是「6 档全异色」。CharacterSelector 原档称号（深度羁绊/信任伙伴等）统一为 CharacterProfile 版称号（共用同一份 bondTier）。
- AppDialog 单例队列：同一时刻只展示一个弹窗，新弹窗会以 false 结算并替换旧的（防回调悬挂）。组件层并发触发弹窗时以此为预期行为。
- ESLint 全仓跑会报既有 dead code（getEventIcon/startBattle/onDrop 等）+ `any` —— 这些是 **HEAD 既存**（git show HEAD 验证），非本轮引入；本轮所有改动文件 `npx eslint <path>` 对新增代码零新错。按 pitfalls 约定不跑 `npm run lint --fix`（全仓重排）。
