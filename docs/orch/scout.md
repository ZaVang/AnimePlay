# Scout Report — Iteration 5 (debt round)

> Code Scout 第 5 轮（最后一轮 = 打磨/还债轮）。只读核实，落 file:line + 重构形状。
> 核实基线：`schema.ts:30 SAVE_VERSION = 12`（已亲验）。三报告（product 8.4 / evolution 9.2 / research）Prioritized Recommendations 已读。
> 全仓硬色按文件 ripgrep 硬计数复核（养成簇 **107** / SquadBattleView **31**，与 product 报告完全吻合）；confirm/alert 全仓 grep 落坐标（真实 18 + 误报 2，已剔）；6 条代码事实逐条 Read 核实。

---

## A. 约束与可行性（给 Planner）

总判：本轮 6 项**全部纯前端 + 零存档**（SAVE_VERSION 仍 12，不碰 schema/migrations/装配器/codex 四处）。无一项需升 v13。三报告高度收敛，无矛盾。建议按"先抽共享基建（共享色映射 + 共享解锁门面 + 共享弹窗 composable），再让各处消费"的顺序，避免逐处补导致漏/复发。

### D1 — 养成+挑战塔硬色 138 处（养成 107/5 文件 + SquadBattle 31）
- **可行性：高，但必须"连根拔"而非逐处 sed。** 现有语义令牌**完全够用**（`assets/skins.css` 5 套皮肤每套都定义 `--c-accent/accent-2/accent-soft/highlight/success/warning/danger/info/ink/ink-2/ink-3/surface/surface-2/elevated/line/line-2`，已亲验 L21-104）。`.btn-primary/.btn-secondary/.btn-danger/.btn-ghost` 已存在。
- **核心理由（写进验收）**：这 138 处硬色不随 `data-skin` 切换 → 切 `midnight`(琥珀暗底)/`neon`(青霓虹暗底) 时养成/挑战塔页炸饱和色斑，**5 套换肤卖点在这两簇失效**。
- **正确重构形状**：`bondLevel`(羁绊档色) 在 `CharacterProfile.vue:20-78` 与 `CharacterSelector.vue:57-65` **各写了一份**几乎逐字相同的硬色表（同 affection 阈值 1000/800/600/400/200/100、同 pink/red/purple/blue/accent/yellow 调色板）；`moodStatus`(心情色) 在 `CharacterProfile.vue:98-105` 一份、`InteractionPanel.vue:707-713` 一份。**规划建议：新建一份共享语义色映射**（落点见 B 段），两处 bondLevel + 两处 moodStatus 都改成消费它，否则逐处替换会漏、加一档心情又长出新硬色。SquadBattle 实心按钮迁 `.btn-*`、规则卡迁 `bg-surface-2/border-line/text-info`、难度徽章组统一 accent/warning/danger 语义档。
- **合法例外（不要动）**：稀有度渐变/徽章（CharacterProfile.vue:263-283、CharacterSelector 稀有度 shadow、CardDetailModal `bg-gray-500` 兜底）= 颜色铁律明文的固定识别色例外。
- **零存档**：是。纯模板/computed 改色，不碰持久化。

### D2 — 原生 confirm/alert 18 处 → 统一主题化弹窗
- **可行性：高。** 全仓**无任何通用 Modal/Dialog/Confirm/Toast 组件**（13 个 modal 全是 feature-specific），所以统一弹窗**需新建**（一个挂 App 顶层的 `<AppDialog>` + 一个 `useDialog()` composable，或复用 `addLog` 通知通道做 toast）。
- **重构形状（research R5.1 + product D2 收敛）**：4 处**解锁确认逐字重复**（GenreSets/RecommendationStrip/NicheGems/CodexPanel，已核实是同一套 `登录守卫 alert → 余额守卫 alert → confirm 花费 → unlockCodexCard → 失败 alert`）。**先抽一个共享"解锁门面"** `useUnlockConfirm(card, domain)`（封装 4 守卫 + 调 `userStore.unlockCodexCard` + 错误提示），4 处调用收敛到 1 处 → 这样换弹窗从"改 4 遍相同代码"变"改 1 处"。**一笔投入同时还散落原生弹窗债 + 重复解锁概念债。**
- **分层建议**：组件层 14 处走 composable 弹窗；store 层 4 处（userStore:102/107/158、collection:113、persistence:173、battleSetup:39）脱离组件上下文，降级为非阻塞 toast（复用 `profile.addLog`）。
- **零存档**：是。

### D3 — onboarding 第 5 步点名品味身份
- **可行性：高，零存档**（onboarding 完成标志走设备级 localStorage，已验 `OnboardingGuide.vue:5` 注释 + `stores/onboarding.ts`，**不进存档**）。`steps` 是纯数组（`OnboardingGuide.vue:24-51`，4 步），加一步即可。
- **两条建议分歧（Planner 裁决）**：product D3 + evolution 🔴-1 建议**新增第 5 步**（route `/collections`，cta「去标记看过」）；research R5.2 建议**替换/重定位现有步骤的 value**（不新增步，"每多一步都是流失点"），把开场从"每天打卡"改成 value-first"这里会照出你的番剧人格"。两者目标一致（让新用户看见品味主线），分歧在加步 vs 改文案。**Scout 倾向：新增一步（route `/collections`）+ 把"开始游玩"按钮挪到第 5 步**——风险最低、改动最局部，且 `toggleTasteWatched` 门面可在引导跳转后由用户自行触达（不需在 onboarding 流程内调用）。
- **零存档**：是。

### D4 — 文档同步 v12
- **可行性：高，纯文档零代码。** 核实结果（与报告略有出入，已纠正）：
  - `frontend-vue/CLAUDE.md` 写 **v11**（实读 L47 版本沿革表止于 v11、L26 Architecture 段；report 说 v11 准确）。
  - `docs/plans/pitfalls.md` 写 **v6**（实读 L11「存档协议当前 v6」+ L10-12 整段沿革止于 v6 + L34 提 schema version「现 6」；漂了 6 个版本，最该修）。
  - 根目录**无** CLAUDE.md（只有 `frontend-vue/CLAUDE.md`）。
  - 权威值 `schema.ts:30 SAVE_VERSION = 12`（v12 = tasteProfile 持久化，schema.ts:17 注释）。
- **零存档**：是。

### D5 — /homestead 完整冻结
- **可行性：高，零存档。** 现状：导航**已注释隐藏**（`App.vue:195-197`），但路由**仍注册 + lazy-import**（`router/index.ts:42-46`），手敲 `/homestead` 仍渲染 `HomesteadView.vue` 半成品。
- **重构形状（research R5.3 = 完整冻结，非只藏导航）**：两选一——①路由层 `redirect: '/'`（删 component import，HomesteadView 不再进构建产物）；②保留 view 但改成"建设中"占位 + 加 `beforeEnter` 守卫 redirect。**Scout 倾向①（redirect + 删 import）**：最干净、连带把 HomesteadView 移出构建体积。`HomesteadView.vue` 仅被 router 引用（grep 确认无别处 import），删/redirect 无连带影响。导航注释（App.vue:195-197）可一并删除。
- **零存档**：是。

### D6 — 三处死代码/bug
- **可行性：高，均零存档、改动局部。**
  - **SquadBattleView 死文案**：L638「无次数限制」vs L761「每日最多挑战10次」直接矛盾，代码侧次数限制已删（L204/L221 注释）→ **删 L761 一行**。
  - **NurtureActions 未登记 setTimeout**：L270-272（最长 60min）+ L30-33（3s 动画）两处裸 `setTimeout`，违反 CLAUDE.md 计时器铁律。组件已有 `onUnmounted`（L425-428）但**只清 `cooldownUpdateInterval`(setInterval)，不清这两个 setTimeout**。→ 建模 SquadBattleView 的 `schedule()`(L570-571 登记 + L597 卸载清) 收口。
  - **CardDetailModal Pin 满文案**：L66 用 `watchingPins.pinnedIds.length`（当前已 pin 数）表上限，语义错位（凑巧 = 8）→ 改用导出常量 `MAX_PINS`（`watchingPins.ts:18`）。
- **零存档**：是。

---

## B. 代码地图与坑（给 Generator）

### B1 硬色全量坐标 + 共享色映射形状（D1）

**养成簇 107 处 / 5 文件（ripgrep 硬计数，与 product 报告吻合）：**

| 文件 | 数 | 反模式形态 + 精确坐标 |
|---|---|---|
| `nurture/CharacterProfile.vue` | 46 | **inline computed 调色板**：`bondLevel`(L20-78) 返回 `text-pink-400`/`bg-pink-500/20`(L25-26)、`text-red-400`/`bg-red-500/20`(L32-33)、`text-purple-400`(L40)、`text-blue-400`(L48)、`text-yellow-400`(L64) — 注意 L56 已是 `text-accent`、L72 已是 `text-ink-2`（部分迁移过）；`moodStatus`(L98-105) 返回 `text-pink-400`(L100)/`text-yellow-400`(L102)/`text-orange-400`(L103)/`text-red-400`(L104) — L101 已是 `text-accent`。模板消费 `:class="bondLevel.color"`(L309)/`moodStatus.color`(L394,481)。另战力卡/经验条/属性值散色见 product 报告 L429/345/364-460。 |
| `nurture/NurtureActions.vue` | 23 | **named 映射**：`ACTIVITY_CARD_CLASSES`(L191-195, green/purple/yellow×`bg-*-600/10 hover border`)、`ACTIVITY_BTN_CLASSES`(L196-200, `bg-*-600 hover:bg-*-700 text-white`)，模板消费 L642/L668。+ inline 散色（心情/知识点/进度条/属性条，见 product 报告 L440-615）。 |
| `nurture/InteractionPanel.vue` | 20 | **named 映射**：`INTERACTION_COLOR_CLASSES`(L18-23, blue/pink/green/purple×`bg-*-600/10 hover border`)，模板消费 L501。+ `moodStatus` inline 五档(L707-713，**第二份心情色**) + 快速聊天/送礼/礼物边框散色(L453-565)。 |
| `nurture/CharacterSelector.vue` | 15 | **inline 函数调色板**：`getBondLevel`(L57-65) 返回 `text-pink-400`(L58)/`text-red-400`(L59)/`text-purple-400`(L60)/`text-blue-400`(L61)/`text-yellow-400`(L63) — **与 CharacterProfile.bondLevel 几乎逐字重复的第二份硬色**（L62 已 `text-accent`、L64 已 `text-ink-2`）。模板消费 L163/L166。+ 选择按钮 `bg-pink-600`(L77)、稀有度 shadow(L177-181，例外)、hover border(L142)。 |
| `nurture/DialogueSystem.vue` | 3 | 用户气泡 `bg-blue-600 text-white`(L401)、发送按钮 `bg-blue-600`(L473)、输入框 focus `border-blue-500`(L468)。 |

**SquadBattleView 31 处（`views/SquadBattleView.vue`）**：刷新敌人 `bg-orange-600`(L647 等)、执行回合/一键结算/restart 实心按钮(`bg-orange-600`/`bg-purple-600`/`bg-blue-600`)、层数状态 `text-blue-400`(L635)、爬塔规则卡 `bg-blue-900/20 border-blue-500 text-blue-400`(**L753-757**)、难度徽章组 `bg-yellow-500/bg-red-500/bg-purple-500`（与 `bg-accent` 混用，组内不一致）、血条 `bg-red-600`、敌人名/战力散色。精确行号见 product 报告 Phase 2.1 表。

**`*_COLOR_CLASSES` / 调色板重复点（核心坑）：**
- `bondLevel` 硬色表 **2 份**：`CharacterProfile.vue:20-78`（computed，带 bgColor/progress/maxReached）+ `CharacterSelector.vue:57-65`（function，只 color/icon）。
- `moodStatus` 硬色 **2 份**：`CharacterProfile.vue:98-105` + `InteractionPanel.vue:707-713`。
- named 映射 3 份：`INTERACTION_COLOR_CLASSES`(InteractionPanel:18) + `ACTIVITY_CARD_CLASSES`/`ACTIVITY_BTN_CLASSES`(NurtureActions:191/196)。

**共享色映射落点建议**：新建 `frontend-vue/src/config/nurtureColors.ts`（与 `config/codexUnlock.ts` 同层，纯常量/纯函数，零 Vue/IO，符合依赖只向下）。导出 ①`bondLevelColor(affection)`→ 返回语义类（建议映射：≥1000 `text-accent`、≥800 `text-danger`、≥600 `text-highlight`、≥400 `text-info`、≥200 `text-accent`、≥100 `text-warning`、else `text-ink-2`；含 bgColor 用 `bg-accent/20` 等语义软底）②`moodColor(mood)`→（≥90 `text-accent`、≥70 `text-accent`、≥50 `text-warning`、≥30 `text-warning`、else `text-danger`）。CharacterProfile 的 `bondLevel`/`moodStatus` computed 改成调它、CharacterSelector 的 `getBondLevel` 改成调它、InteractionPanel 的 inline 心情改成调它。named 映射（INTERACTION/ACTIVITY）按 color key→语义类（blue→info、pink→accent、green→success、purple→highlight、yellow→warning）。
- **坑**：语义档去重后**羁绊 6 档会塌成 4-5 个语义色**（accent/danger/highlight/info/warning/ink），档与档颜色会重复——这是从"6 个饱和硬色"到"5 套皮肤协调色"的必然取舍，验收看的是"切暗皮不炸色斑"，不是"6 档全异色"。icon(emoji) 不变保留区分度。
- **合法例外清单（保留硬色）**：稀有度渐变/徽章 `CharacterProfile.vue:263-283`、CharacterSelector 稀有度 shadow `L177-181`、CardDetailModal `bg-gray-500`(L268)、图片压片白字。

### B2 confirm/alert 调用点清单 + 共享解锁门面落点（D2）

**真实原生调用 18 处（已剔 2 误报：`battle/CardSelectionModal.vue:142`、`battle/TypeSelectionModal.vue:116` 是组件内名为 `confirm()` 的局部函数）：**

| 文件:行 | 类型 | 场景 | 归类 |
|---|---|---|---|
| `CardDetailModal.vue:66` | alert | Pin 满 | 顺手修文案(D6) |
| `CardDetailModal.vue:210` | confirm | 分解卡 | 组件 |
| `GenreSets.vue:87/92/95/99` | alert×3+confirm | **解锁四件套** | **解锁门面** |
| `RecommendationStrip.vue:91/97/100/104` | alert×3+confirm | **解锁四件套** | **解锁门面** |
| `NicheGems.vue:60/65/68/72` | alert×3+confirm | **解锁四件套** | **解锁门面** |
| `CodexPanel.vue:224/227` | alert+confirm | **解锁（余额/确认）** | **解锁门面** |
| `TierListGame.vue:157` | confirm | 清空锐评棋盘 | 组件 |
| `TasteProfileGame.vue:126` | confirm | 清空观看记录 | 组件 |
| `CollectionsView.vue:72` | confirm | 分解重复卡 | 组件 |
| `BattleView.vue:114` | confirm | 退出战斗 | 组件 |
| `gacha/GachaShop.vue:27` | confirm | 商店购买 | 组件 |
| `decks/DeckList.vue:21` | confirm | 删卡组 | 组件 |
| `decks/DeckEditor.vue:167/216/235/241/248` | alert×4+confirm | 卡组上限/命名/覆盖/保存 | 组件 |
| `stores/userStore.ts:102/107/158` | alert×3 | 未登录/券不足 | **store→toast** |
| `stores/collection.ts:113` | alert | 喜爱列表满 | **store→toast** |
| `stores/persistence.ts:173` | alert | 加载存档失败 | **store→toast** |
| `stores/battleSetup.ts:39` | alert | 数据未加载 | **store→toast** |

**4 处解锁确认逐字重复（已核实，给 `handleUnlock` 同构证据）**：GenreSets.vue:84-100 是范本（`if(!isLoggedIn) alert登录 → unlockPrice → if(!canAfford) alert余额 → if(!confirm花费) return → unlockCodexCard → if(!ok) alert错误`）；RecommendationStrip/NicheGems 逐字相同；CodexPanel.vue:210-230 是同构（含 domain，处理 anime+character 双域）。
- **共享解锁门面落点**：新建 composable `frontend-vue/src/composables/useUnlockConfirm.ts`。签名建议 `useUnlockConfirm()` → 返回 `async unlock(card, domain)`。内部：① `userStore.unlockCodexCard(cardId, domain)` 已存在（`userStore.ts:233`，签名 `(cardId:number, domain:CardDomain)→{ok, error?}`，**自带登录守卫 + 卡片存在 + 余额/已拥有判断 + addLog**——但当前返回 error 字符串，UI 才弹）；②价格用 `getCodexUnlockPrice`（`config/codexUnlock.ts`，CodexPanel.vue:9 已 import）。门面把"登录守卫 + 余额守卫 + confirm + 调用 + 错误"五步收进去，4 处 `handleUnlock` 收敛到 `unlock(card, domain)` 一行。
  - **坑**：3 处（GenreSets/RecommendationStrip/NicheGems）是 anime-only（写死 `'anime'`），CodexPanel 用 `codexDomain.value`（anime|character 双域）→ 门面必须收 domain 参数，别写死 anime。
- **统一弹窗（新建，全仓无现成）**：建议 `components/AppDialog.vue`（挂 App.vue 顶层，仿 OnboardingGuide 的 Teleport+backdrop+语义令牌样式）+ `composables/useDialog.ts`（`confirm()/alert()` 返回 Promise）。解锁门面内部调它。store 层 4 处不走 Promise 弹窗（脱离组件），直接 `profile.addLog(msg, 'warning')` toast。

### B3 onboarding 步骤结构 + 点名落点（D3）

- `OnboardingGuide.vue:24-51`：`steps: Step[]` 纯数组，4 步（打卡/抽卡/收藏图鉴/对战）。`Step` 结构 = `{ icon, title, body, route?, cta? }`（L15-22）。最后一步按钮文案由 `isLast` 三元控制（L136 `isLast ? '开始游玩' : '下一步'`）。`goTo()`(L78-82) = finishGuide + router.push(route)。
- **点名落点**：在 `steps` 数组末尾（L50 后）push 第 5 步对象。product/evolution 建议文案见 product 报告 Phase 3.3（icon `🎭`、title「解锁你的番剧人格」、route `/collections`、cta「去标记看过」）。`isLast`/进度点/「开始游玩」按钮全是 `steps.length` 派生，**加一步自动适配，无需改逻辑**。
- **完成标志存储**：`stores/onboarding.ts` 走设备级 localStorage（`OnboardingGuide.vue:5` 注释明确"不进存档、不升 schema"）→ **零存档**。`maybeStartGuide` 在 App.vue 登录触发（report 提 App.vue:72，本轮未亲验但不影响加步）。
- `toggleTasteWatched` 门面存在（`userStore.ts:341`）可在 `/collections` 页由用户触达，**无需在 onboarding 流程内调用**。

### B4 /homestead 冻结落点（D5）

- `router/index.ts:42-46`：`{ path:'/homestead', name:'homestead', component: ()=>import('../views/HomesteadView.vue') }`。
- `App.vue:195-197`：导航 `<RouterLink to="/homestead">` 已被 `<!-- -->` 包裹注释。
- `views/HomesteadView.vue`：仅被 router 引用（grep 全仓无别处 import）。
- **改法（Scout 倾向）**：router L42-46 改为 `{ path:'/homestead', redirect:'/' }`（删 component import → HomesteadView 移出构建产物）；App.vue:195-197 注释块一并删。无连带影响。

### B5 文档版本号坐标（D4）

- `frontend-vue/CLAUDE.md`：**v11** 在 L47（持久化段「schema **v11**」+ 版本沿革表止于 v11）+ Architecture 段。改：补 v12 一行（tasteProfile 持久化）、持久化标注改 v12。
- `docs/plans/pitfalls.md`：**v6** 在 **L11**（「存档协议当前 **v6**」+ 沿革止于 v6）+ **L34** 提「schema `version`（协议版本，现 6）」。改：L11 + L34 → v12。
- 根目录无 CLAUDE.md。权威 `frontend-vue/src/infra/persistence/schema.ts:30 SAVE_VERSION = 12`。

### B6 三处死代码/bug 安全改法（D6）

1. **`views/SquadBattleView.vue:761`** — 删整行 `<li>• 每日最多挑战10次</li>`（L761）。L638「每层只能挑战一次，无次数限制」是正确文案保留。代码侧次数限制已删（L204「移除每日挑战次数限制」、L221「移除挑战次数记录」注释为证）。**安全**：纯模板文案删除。
2. **`components/nurture/NurtureActions.vue:270-272`（+ L30-33）** — 两处裸 `setTimeout` 未登记。范本：同文件已有 `onUnmounted`(L425-428) 但只清 `cooldownUpdateInterval`。**改法**：仿 `SquadBattleView.vue:570-571`(`schedule(fn,delay)` 登记进 `pendingTimers`) + `:597`(`pendingTimers.forEach(clearTimeout)`)。在 NurtureActions 加 `pendingTimers` 集合 + `schedule()` 包装，L30-33 与 L270-272 的 setTimeout 都过 `schedule()`，`onUnmounted`(L425-428) 内补 `pendingTimers.forEach(clearTimeout)`。**坑**：L270-272 最长 `program.duration*60*1000`=60min，是"训练完成播报"——卸载清除后离开养成页不再 fire（可接受，本就是体验性日志，非状态变更）。
3. **`components/CardDetailModal.vue:66`** — `${watchingPins.pinnedIds.length}` → 改用 `MAX_PINS`（从 `@/stores/watchingPins` 导入，`watchingPins.ts:18 export const MAX_PINS = 8`）。**安全**：当前凑巧相等，改后语义正确。

---

## C. 新发现的坑（待追加 pitfalls）

1. **pitfalls.md 自身严重过期（漂 6 版）**：`docs/plans/pitfalls.md` L11/L34 仍写「存档协议 v6」，实际 v12——**pitfalls 是全角色必读文档，自身过期会误导后续轮按 v6 判断存档结构**。本轮 D4 修复后，建议在 pitfalls 加一条"版本号引用集中到 schema.ts:30，文档只指向不复述"避免再漂。

2. **`unlockCodexCard` 已自带守卫，UI 层守卫是重复**：`userStore.ts:233` 的 `unlockCodexCard` 内部已做登录守卫(L234)/卡片存在/余额判断并返回 `{ok,error}`，但 4 个组件的 `handleUnlock` 在 UI 层**又各写了一遍登录/余额守卫 + confirm**。共享解锁门面应以 store 返回的 error 为准、UI 只负责 confirm + 展示 error，避免守卫逻辑两层重复漂移。

3. **养成簇硬色"部分迁移"陷阱**：`bondLevel`/`moodStatus`/`getBondLevel` 已有**零星几档迁了语义类**（如 CharacterProfile L56 `text-accent`、L72 `text-ink-2`、L101 `text-accent`；CharacterSelector L62/L64 同），其余档仍硬色——这种"半迁移"最危险，Generator 若只 grep 硬色逐处替换会留下"同一函数里半语义半硬色"。**必须整函数重写成调共享映射**，不是挑硬色行替换。

4. **NurtureActions 的 setInterval 已正确清、setTimeout 没清的"假安全"**：组件有 `onUnmounted`+`clearInterval` 看似计时器卫生达标，实则两个 setTimeout 漏网——**"有 onUnmounted"不等于"所有计时器都登记了"**，这是计时器铁律的隐蔽违反形态，值得入 pitfalls。

5. **统一弹窗是本轮唯一"新建组件"**：全仓 13 个 modal 全 feature-specific，无通用 confirm/alert/toast 基建。D2 必须新建 `AppDialog` + composable——这是债轮里唯一不是"改已有"而是"建新基建"的项，Planner 排期需留出新建+全仓接入的工作量（虽零存档零风险，但触达面 14 组件 + 4 store）。

---

*核实完毕。6 条代码事实全部落 file:line：① 硬色 107+31 ripgrep 硬计数吻合 + bondLevel/moodStatus 各两份重复点已定位 + 共享映射落点 `config/nurtureColors.ts` + 例外清单；② confirm/alert 18 真实调用点 + 4 处解锁逐字重复 + 门面落点 `composables/useUnlockConfirm.ts` + 统一弹窗需新建；③ onboarding 4 步纯数组 + 加步零逻辑改动 + 设备级零存档；④ CLAUDE.md v11(L47)/pitfalls v6(L11/L34) vs schema.ts:30 v12；⑤ /homestead router:42-46 仍 active + redirect 改法；⑥ SquadBattle L761 删行 / NurtureActions L270-272+L30-33 schedule() 收口 / CardDetailModal:66 用 MAX_PINS。全 6 项零存档纯前端。*
