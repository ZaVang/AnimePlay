# Code Scout — S16 第 5 轮（收官：打磨 + 晒图 + 收尾）接地报告

> Scout 只读（Read/Glob/Grep），唯一产出本文件（覆盖写，覆盖前四轮 scout.md）。为 Planner 拍板 / Generator 落点 / Evaluator 回归核对接地。
> 基线：亲读 `HomesteadView.vue`(1366 行) + `ShareCard.vue` + `shareImage.ts` + `buildWrappedStats.ts(.test)` + `nurture.ts`(BOND_MILESTONES) + `homesteadDialogues.ts` + `homestead.ts`(FURNITURE_CATALOG/IdleYield) + `stores/homestead.ts` + 三份审计报告 + `plan.md`/`negotiation.md`/`gen_status.md`/`eval.md`/`pitfalls.md`/`SPRINT.md`。日期 2026-07-07。
> **本轮天然零升档**（打磨 = 纯前端动效；晒图 = 只读快照聚合出图，无存档需求）。SAVE_VERSION 权威 `frontend-vue/src/infra/persistence/schema.ts:57 = 20`，本轮预期不动。

---

## A. 约束与可行性（给 Planner）

### A0. 收官轮定性：这是打磨轮，不是「再塞一个系统」轮
三份审计罕见一致（product 8.3/10、evolution 8.3/10、research 收官逻辑闭环）：**前 4 轮把「有什么」做全了，本轮只需两把刀**——① 把情感高点擦亮（里程碑分级庆祝），② 给家园一张对外的脸（Canvas 晒图）。外加顺手收尾（删 dead computed + Sprint 收官核对）。**克制比堆功能更对**（三审共同定调）。全轮 100% 纯前端 · 零数值 · 零升档 · 零素材（emoji/CSS/Canvas 自绘）。

### A1. 优先级仲裁点（留给 Planner 拍板）
两把刀都是 🔴 必做，但两份审计对「谁第一」排序相反，Planner 需拍板顺序（不影响都要做）：
- **product-audit**：R1 = 里程碑分级庆祝（情感最高 ROI），R2 = 晒图。
- **evolution-audit**：R1 = 晒图（长留存结构性命门），R2 = 高档里程碑 fanfare。
- **research-audit**：两者并列，理论框架给足（High-Five vs Crowning + ACNH 异步快照）。
- **negotiation.md:128-131**：Planner 早已把「可分享基地快照/晒图」拍进第 5 轮（方向性接受）。
- **Scout 建议**：晒图工程量更大（新纯函数 + 新组件 + 新测试）、庆祝分级更轻（改 1 函数 + 加 CSS）。若单轮吃不下，**先做庆祝分级（低风险高情感 ROI）再做晒图**；两者互相独立可分别合并。

### A2. 硬约束清单（务必守，违反 = Evaluator 拦死）
1. **晒图铁律（pitfalls:44 + `ShareCard.vue:5` 代码印证）**：纯前端 Canvas（`toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`）；**别引 html2canvas**；**首版绝不 `drawImage` 任何远程角色/封面图**——AnimePlay 角色图走 `/data/images/...`（可能 offload 到 GitHub Release/OSS `VITE_IMAGE_BASE_URL`），跨域 `drawImage` 会 taint canvas → `toBlob` 抛 `SecurityError`。角色「脸」用 emoji/纯 CSS-Canvas 绘制（首字/稀有度色块），别嵌真图。
2. **晒图晒身份不晒缺口（research 深挖② + 第 4 轮陈列纪律一脉相承）**：放「陈列 5/7」「拥有 UR 12/48」（正着念拥有数），**绝不放**「图鉴还差 260」「UR 0/67」缺口/低完成度指标（把骄傲的晒图做成焦虑仪表盘 = 踩反-completionist 红线）。
3. **晒图是安全异步、绝不联机（research 深挖② 破 B）**：出一张 PNG → 系统分享面板或下载，玩家自行发。**绝不为「晒图」开联机/上传/排行榜/headless 后端**（那是 S12，本 sprint 严禁触碰）。`utils/shareImage.ts` 已把这条路铺好。
4. **庆祝分级 = 分级音量不是统一动效（research 深挖① 唯一危险读法）**：Yu-kai Chou 决定性警告「用同一音量庆祝一切，会让大小成就都失去情感落点」。低档 bond_1-3 保持轻飘字（High-Five），高档 bond_4/5/6 升级隆重弹层（Crowning）。**别给所有档加同款彩带**（那只是把「都很轻」换成「都很响」，问题没解）。
5. **庆祝/晒图 100% 纯展示、零数值（可见性命门 + 名字≠行为红线）**：庆祝只是 `claimBondMilestone` 发放成功**之后**的视觉分支，发放逻辑一字不碰；晒图是只读快照，不写状态、不发奖、零升档。
6. **定时器登记清除（pitfalls:59 + 假设 F 真风险）**：Crowning 弹层若用 setTimeout 必须登记 `dialogueTimers` 数组 + `onUnmounted` 清除（复用现有范式）；任何动效走 CSS `@keyframes` 不进 rAF（`usePlazaWalk` 的 rAF 一字不动）。
7. **颜色语义令牌（pitfalls:48）**：界面 UI 走 `rgb(var(--c-*))` / 语义类；**唯独** Canvas 导出图本体可用固定品牌色（属图片压片类合理例外，`ShareCard.vue:73-87` 有先例）。庆祝弹层 UI 仍走令牌。

### A3. ★ 关键代码现实校正（审计报告的前提，Scout 核实）
**「基地名（baseName）」不存在！** 三份审计都假设晒图卡放「基地名」，但代码核实 `stores/homestead.ts` **只有 `placedCharacterIds` + `lastSettleAt` 两个字段，无任何基地名概念**（grep「基地名/baseName/homesteadName」在 store/schema 零命中；header 只显「基地舒适度」「可用知识点」，`HomesteadView.vue:531-532`）。
- **拍板需求（给 Planner）**：晒图卡的「归属核心」不能用不存在的基地名。**选项**：
  - **选项 A（Scout 推荐，零升档）**：用 `profile.currentUser`（玩家名，`stores/profile.ts:38`）作卡片主标题，如「XX 的家园」——现成、零改、零升档。
  - 选项 B（不推荐）：新增可编辑基地名字段 → 逼升 schema v21（消耗 sprint 唯一 bump 于一个纯装饰字段，三审都没主张，**别做**）。
- **结论**：晒图主标题走 `currentUser`「XX 的家园」，绝不为基地名升档。

### A4. 晒图卡本地可得数据清单（全部只读派生，零 taint，Scout 逐条核实落点）
| 卡面内容 | 数据源（现成 store/computed） | 落点 |
|---|---|---|
| 玩家名 / 等级 | `profile.currentUser` / `profile.core.level` | `stores/profile.ts:38` |
| 入住数 + 阵容名 | `homestead.placedCharacterIds` → `gameData.getCharacterCardById(id).name` | `HomesteadView.vue:100-104` placedCards 范式 |
| 陈列 X/7（家具数） | `furnitureStore` 已摆放数 / `FURNITURE_CATALOG.length` | `HomesteadView.vue:287-291` displayCount |
| 收藏完成度（UR owned/total + 图鉴%） | `codex.characterCompletion`（byRarity/owned/total） | `HomesteadView.vue:296-301` codexPercent |
| 羁绊命中（作品名×人数） | `hourlyYield.bondHits`（`BondHit{anime,members}`，`bonds.ts:23-27`） | `HomesteadView.vue:188` bondHits |
| 今日特殊角色名（传播钩子） | `todaySpecialCard.name`（date-seeded） | `HomesteadView.vue:118-120` |
| 舒适度 / KP | `homeEffect.comfort` / `knowledgePoints` | `HomesteadView.vue:142/240` |

**全部本地可得、纯文字/数字/emoji，零远程图。** 阵容「脸」若要视觉，用 emoji 头像位或名字首字 + 稀有度色块（Canvas fillText/roundRect 自绘，`ShareCard.vue:89-97` roundRect 现成可抄）。

### A5. 空态命门（research 收官债①）
首日/0 入住/0 收藏玩家的晒图必须优雅——**别晒出一张空基地羞辱新人**。0 入住 → 阵容区显引导文案（如「快去让角色入住吧」）不显空网格；0 UR → 收藏区正着念已拥有最高档（沿用第 4 轮 `pickShowcaseRarity` 降级逻辑）不显「UR 0/N」。`buildHomesteadSnapshot` 纯函数须对空输入返回可安全渲染的默认结构（有特征测试锁死）。

### A6. 升档核对（本轮天然零升档）
- SAVE_VERSION `schema.ts:57 = 20`，本轮**不动**（打磨/晒图无存档需求）。
- sprint 唯一 v21 bump 前 4 轮全未消耗（gen_status/eval 证实），本轮也不消耗，留 backlog。
- **收官核对项（给 Evaluator）**：确认 `infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts` 三处本轮 diff 全空。

---

## B. 代码地图与坑（给 Generator，含精确行号）

### B1. 🔴 里程碑分级庆祝（改 `HomesteadView.vue` 1 处 + 加 CSS + 可选加 1 纯函数）
**现状（Scout 核实，`HomesteadView.vue:482-489`）**：
```ts
function onClaimBondMilestone(charId, milestoneId) {
  if (!userStore.claimBondMilestone(charId, milestoneId)) return;  // 发放（不碰）
  const card = gameData.getCharacterCardById(charId);
  const line = pickMilestoneDialogue(milestoneId, dialogueTick++);   // 台词已分级（好）
  bondFloat.value = { name: card?.name ?? '', text: line };         // ← 视觉：任何档同一飘字
  scheduleDialogueClear(() => { bondFloat.value = null; }, 3200);    // ← 同一 3.2s 过渡
}
```
渲染在 `HomesteadView.vue:886-888`（入住名单 details 内 `<span class="bond-float">`），CSS `.bond-float` 在 `1132-1137`（复用 `commission-float` transition）。

**分级判据现成（`config/nurture.ts:112-119` BOND_MILESTONES）**：
- bond_1/2/3（初识/熟络/要好）：`statBonusPct 0.02`，`reward` 50/100/200 → **低档 = High-Five**。
- bond_4/5/6（挚友/羁绊/命运）：`statBonusPct 0.03`，`reward` 400/800/1500 → **高档 = Crowning**。
- 建议加纯函数 `milestoneCelebrationTier(id): 'highfive' | 'crowning'`（放 `config/nurture.ts` 或 `homesteadDialogues.ts`，按 id 白名单 bond_4/5/6 = crowning，可测）——research 深挖① 主张，便于特征测试锁「分级判据」。

**落地范式（Generator）**：
- 低档（High-Five）：保持现有 `bondFloat` 轻飘字，至多加极轻 ✨ 微光。**别过度打磨低档**（低档就该轻，research 明令）。
- 高档（Crowning）：升级为**卡片级/半屏庆祝弹层**——**直接复用 `.settle-pop`/`.settle-card` 范式**（`HomesteadView.vue:895-906` 模板 + `1347-1351` CSS，已有 fixed inset 遮罩 + 居中卡 + 点击关闭）。弹层带：① 大号称号加冕（「「命运」达成」）+ 角色名 + 角色的脸（用现成 `CharacterAvatar` 组件，传 `characterId`，本地 sprite 非远程 drawImage，安全）；② 纯 CSS `@keyframes` 光晕/星屑上浮（**别进 rAF**）；③ 停留更久（4-6s 或点击关闭）；bond_6 可再加最隆重一档（全屏淡金闪）。
- **新 ref 建议**：加 `crownCelebration = ref<{name,title,charId,line} | null>(null)`，Crowning 走它、High-Five 仍走 `bondFloat`。弹层若自动关闭的 setTimeout **必须登记 `dialogueTimers`**（`scheduleDialogueClear` 现成，`HomesteadView.vue:474-480`）。
- **红线**：`claimBondMilestone` 发放逻辑一字不碰；庆祝纯视觉分支。

### B2. 🔴 家园快照晒图（新 2 文件 + 改 `HomesteadView.vue` 加入口，全仿现成三件套）
**现成三件套（逐条对上合同硬约束，直接克隆）**：
- `frontend-vue/src/wrapped/buildWrappedStats.ts`（143 行）= **纯函数聚合范式**：零 Vue/Pinia/DOM，输入 store 快照 plain object → 输出视图模型，`safePercent` 除零兜底。仿它写 `wrapped/buildHomesteadSnapshot.ts`（或 `homestead/` 下）。
- `frontend-vue/src/wrapped/buildWrappedStats.test.ts`（`baseInput()` 工厂 + 分组 describe）= **特征测试范式**。仿它写 `buildHomesteadSnapshot.test.ts`（覆盖满态 / 0 入住 / 0 收藏三态）。
- `frontend-vue/src/components/ShareCard.vue`（322 行）= **Canvas 手绘 + toBlob + 分享/下载范式**：`drawCard(canvas)` 用 `createLinearGradient`/`roundRect`(89-97)/`fillText` 全套；`onMounted`→`nextTick(renderPreview)` 画预览；`shareOrDownload()` 用户手势内同步 `drawCard`→`canvasToPngBlob`→`shareOrDownloadImage`。**CARD_W/H=600/800、COL 品牌色对象、2×3 指标网格全可抄**。仿它写 `components/homestead/HomesteadShareCard.vue`。
- `frontend-vue/src/utils/shareImage.ts`（83 行）= **零改直接 import 复用**：`canShareImage()` 特性检测、`shareOrDownloadImage(blob,filename,meta)`（系统分享 → 下载回落 → AbortError 不报错）、`canvasToPngBlob(canvas)`（toBlob Promise 化、taint 时 reject）。**本轮零新基建。**

**调用/挂载范式（`CollectionsView.vue` 现成样板）**：
- `CollectionsView.vue:17` import、`:44-45` `const showShareCard = ref(false)`、`:173-175` 触发按钮、`:320-321` `<ShareCard v-if="showShareCard" @close="showShareCard = false" />` 挂在 view 根。
- **HomesteadShareCard 同款**：`HomesteadView.vue` 加 `showShareCard` ref + 晒图入口按钮 + view 根挂 `<HomesteadShareCard v-if=... @close=... />`。

**晒图入口按钮落点建议**：
- product-audit R2 主张放**橱窗卡头** `.g-showcase-head`（`HomesteadView.vue:680-690`，顺带抬升橱窗存在感）——那里已有 `g-eyebrow「收藏橱窗」`+ 完成度 chip，右侧加一个「📤 晒基地」小按钮自然。
- 或放 header `.hs-header`（`:529-535`，管理入住按钮旁）。**建议橱窗卡头**（更贴「战果外化」语义）。

**调性方向（research 深挖② + product 2.3）**：家园卡是**「基地身份卡」非「图鉴成绩单」**——暖色渐变（呼应 PCR 暖色城镇 + 夏日主题，别照抄 ShareCard 的深紫冷调）、主体是基地/角色/家具/羁绊的身份表达。可加一句 date-seeded「今日特殊角色寄语」（`todaySpecialCard.name`，每天生成的图不同 → 鼓励重复晒）。

**buildHomesteadSnapshot 纯函数输入契约（Scout 拟）**：接收 plain object 快照（username/level/placedCharacterNames[]/furniturePlacedCount/furnitureTotal/urOwned/urTotal/codexPercent/bondHits[]/todaySpecialName/comfort），输出可直接喂 Canvas 的视图模型；空输入（0 入住/0 收藏）返回安全默认（见 A5）。**零 Vue/Pinia/DOM**，view 层把 live store 喂进来（仿 `ShareCard.vue:52-69` stats computed）。

### B3. 🟢 删 dead computed（收尾，零风险，Scout 已核实安全）
- `HomesteadView.vue:377` `const effectText = computed(...)`（top-level）— **模板零引用**。
- `HomesteadView.vue:379` `const comfortBonusText = computed(...)`（top-level）— **模板零引用**。
- **核实证据**：`grep effectText|comfortBonusText` 全命中 = {377/379 定义、404 `residentRows` 内部字段 `effectText:` 是**另一个**局部字段、873 模板用 `row.effectText`（residentRows 的字段，非 top-level computed）}。comfort 显示走 `comfortPctText(homeEffect.comfort)`(`338-341`)。**两个 top-level computed 删掉零风险**（第 2-3 轮重构残留）。
- ⚠️ **别误删 `residentRows` 里的 `effectText: formatHomeEffect(effect)`（404）**——那是模板 `row.effectText`(873) 的真实数据源，删了会炸入住名单。只删 377/379 两行 top-level。

### B4. 🟡/💡 可选打磨（有余量才做，非命门）
- **R3 收取瞬间到手反馈**（product 🟡）：`runSettle`(`HomesteadView.vue:495-505`)——不够弹窗阈值时只加一行日志，缺即时反馈。给 `g-cta-gold` 按钮（`:673` + CSS `974-984`，已有 `:active`）扩一个成功态脉冲 + 「+X KP」小飘字（纯 CSS，零数值改，只可视化已发生的入账）。
- **R4 新 UR 入橱窗高光**（product 🟡）：`showcaseCards`(`:317-329`) 最新那张给入场描边脉冲（纯 CSS）。R1/R2 吃满预算可降 💡。
- **R7 偶遇符号/气泡微打磨 + 今日寄语上分享图**（合同 A 点名）：偶遇符号 `.encounter-spark`(`:621-623` + CSS `1329`)、气泡 `.pet-bubble.is-encounter`(`:596` + CSS `1321-1326`) 可微调；今日寄语画进晒图卡（见 B2 调性）。纯 config/派生/CSS，非命门。

### B5. 现成可复用件速查（别重造）
| 要用的能力 | 现成件 | 位置 |
|---|---|---|
| Canvas toBlob + 系统分享/下载回落 | `shareImage.ts` 全套 | `utils/shareImage.ts`（零改 import） |
| 纯函数聚合 + 特征测试范式 | `buildWrappedStats.ts(.test)` | `wrapped/`（仿写） |
| Canvas 手绘卡（渐变/圆角/网格/预览/分享） | `ShareCard.vue` | `components/ShareCard.vue`（仿写） |
| 晒图弹窗挂载/toggle | `CollectionsView.vue` | `:44/173/320` 范式 |
| Crowning 弹层遮罩 + 居中卡 | `.settle-pop`/`.settle-card` | `HomesteadView.vue:895-906 + 1347-1351` |
| 角色脸（本地 sprite 非远程，安全） | `CharacterAvatar` 组件 | `components/CharacterAvatar.vue`（传 characterId） |
| 台词纯函数（缺回落不报错） | `pickMilestoneDialogue`/`pickFrom` | `config/homesteadDialogues.ts:90-114` |
| 定时器登记清除 | `dialogueTimers`+`scheduleDialogueClear` | `HomesteadView.vue:472-480 + 517-524` |
| 收藏降级/空态纯函数 | `pickShowcaseRarity` | `config/homesteadDaily.ts` |

---

## C. 新发现的坑（给全角色）

- **[C-1 基地名不存在，别照抄审计的「基地名」]**：三份审计都写晒图卡放「基地名」，但 `stores/homestead.ts` 无此字段（只有 placedCharacterIds/lastSettleAt）。晒图主标题走 `profile.currentUser`「XX 的家园」，**绝不为一个装饰字段升 schema v21**（见 A3）。

- **[C-2 晒图卡「脸」= emoji/首字/色块，绝不 drawImage 远程图]**：角色图 `/data/images/...` 可能跨域（offload 到 GitHub Release/OSS）→ `drawImage` taint canvas → `toBlob` 抛 `SecurityError`（`shareImage.ts:79` 注释 + `ShareCard.vue:5` 注释双印证）。若要角色视觉，用 `CharacterAvatar` 只在**屏幕预览区**（DOM，非 Canvas）显真图、**Canvas 导出**用 emoji/名字首字。别把 DOM 头像塞进 Canvas（同「图表不进 Canvas」家族，pitfalls:54）。

- **[C-3 dead computed 删 377/379 两行，别误删 residentRows.effectText]**：`effectText` 名字撞了——top-level 377（死）vs residentRows 内部字段 404（活，喂模板 873）。只删 377/379，误删 404 会炸入住名单效果显示（见 B3）。

- **[C-4 庆祝分级 = 分级音量，不是给所有档加同款动效]**：research 深挖① 点名的唯一危险读法。给 6 档全加彩带只是「都很轻→都很响」，仍 desensitize。必须 bond_1-3 轻 / bond_4-6 隆重（见 A2.4 / B1）。

- **[C-5 Crowning 弹层 setTimeout 必登记清除]**：若加自动关闭定时器，走现成 `scheduleDialogueClear`→`dialogueTimers`→`onUnmounted` 清（`HomesteadView.vue:474-524`）。pitfalls:59「setTimeout 假安全」明令。动效走 CSS `@keyframes` 不进 rAF。

- **[C-6 晒图空态优雅，别羞辱新人]**：0 入住/0 收藏玩家晒图必须有引导文案不显空网格；`buildHomesteadSnapshot` 对空输入返回安全默认结构 + 特征测试锁死（research 收官债①，见 A5）。

- **[C-7 晒图晒身份不晒缺口]**：卡面正着念「陈列 5/7」「拥有 UR 12/48」，绝不放「还差 260」「UR 0/67」（反 completionist 红线，第 4 轮陈列纪律延续，见 A2.2）。

- **[C-8 orch 未提交产物是正常累积非脏树]**：`git status` 里 HomesteadView.vue/homestead.ts/HomesteadManageModal/bonds/usePlazaWalk/homesteadDialogues/homesteadDaily 等改动/未跟踪文件 = S16 第 1-4 轮累积的未提交产物（orchestrator 不每轮 commit，pitfalls:64）。本轮 Generator 会看到前轮产物，属正常；Evaluator 核回归时以「合同 T1-T11 全 [x] 且与实现一致」为准，别把累积当脏树。

---

## D. Sprint 收官核对落点（给 Evaluator，本轮必做的收官任务）

- **checkbox 核对**：`docs/plans/SPRINT.md` 的 S16-T1..T11 当前**全部 `[x]`**（Scout 已核）；本轮若加新 T（庆祝/晒图）也须 `[x]` 且与实现一致（`grep "\[ \]"` 主线任务应零命中）。
- **验收命令**（`SPRINT.md:96-109`，Evaluator 亲自重跑，cwd = 仓库根 `D:\work\AnimePlay`）：
  1. `cd frontend-vue && npm run type-check`（期望 0 错误）
  2. `cd frontend-vue && npm run test`（当前基线 **991 passed / 72 files**；涉时序改动**连跑 3 次**稳定；本轮加晒图纯函数测试后应升）
  3. `cd frontend-vue && npm run build`（期望成功）
  4. `.venv/Scripts/python.exe backend/test_security.py`（期望 exit 0 全 PASS；S16 不碰后端）
  5. `grep -rn "debug=True" backend/server.py api/index.py`（期望零命中）
- **零升档核对**：`schema.ts:57 SAVE_VERSION=20` 不变；`infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts` 本轮 diff 全空。
- **S14/S15 + 1-4 轮机制无回归**（product-audit §1.5 抽查主干无回归，Evaluator 亲验 diff）：computeIdleYield 单 seam（预览=结算，`hourlyYield`/`projectedYield`/`nextHourlyYield` 同喂 facilityLevels+placedAnimeNames）/ comfort 软加成汇入(`:149`)/ 羁绊 bondHits 同源(`:188`)/ 墙钟回拨钳位(`capProgress`/`capReached`)/ setTimeout 全登记清除(`517-524`)/ 家具进场景 y-sort(`:282-284`)/ 收藏橱窗+今日特殊+季节(`:296-336`/`:114-140`) 均在。
- **关键**：tier1-on 跑满轮次 ≠ 目标达成；收官核对以「合同全部 `[x]` 且与实现一致 + 5 命令全绿 + 零升档 + 无回归」为准（pitfalls:84 教训）。

---

## 附：一句话给 Planner
本轮 = 两把刀 + 一次收尾。**刀一（庆祝分级）**改 `onClaimBondMilestone` 1 处 + 加 Crowning 弹层（抄 `.settle-pop` 范式）+ 可选 `milestoneCelebrationTier` 纯函数，低风险高情感 ROI。**刀二（晒图）**新增 `buildHomesteadSnapshot.ts(.test)` + `HomesteadShareCard.vue`（三件套逐条克隆 `ShareCard`/`buildWrappedStats`/`shareImage`）+ `HomesteadView` 加入口，零新基建、零升档。**收尾**删 377/379 两行 dead computed + Sprint 收官核对。**唯一需 Planner 拍板**：① 晒图 vs 庆祝谁先（都要做，Scout 倾向先庆祝）；② 晒图主标题用 `profile.currentUser`「XX 的家园」不引基地名字段（零升档）。守住「巅峰分级隆重、晒图晒身份不晒缺口、安全异步不联机、绝不 drawImage 远程图」，收官轮就赢了。
