# Iteration 5 Plan（收官 · 打磨 + 晒图 + 收尾）

> S16 sprint 第 5 轮 = **5 轮弧线收官轮**（`product-loop --tier1 on --mode all --max_iter 5`）。北极星 = 家园 hub `/homestead` 玩法进一步深化。
> **本轮指派弧线切片 = 打磨（情感高点）+ 晒图（展示出口）+ 收尾**：前 4 轮把「关系/偶遇/家具/陈列/回访」做齐，本轮把情感巅峰打磨到位、给家园一个可展示的出口、并收口全 Sprint。
> 本轮 Planner 只规划 WHAT/WHY，HOW 由 Generator（资深工程师）自决。任何实现细节（文件/函数/坐标/字段名）以 `docs/orch/scout.md` B 段为准，本文件不复述。
> **本轮天然零升档**：打磨 = 纯前端动效；晒图 = 只读快照聚合出图，无存档需求。SAVE_VERSION 权威 `frontend-vue/src/infra/persistence/schema.ts:57 = 20`（已核实），本轮不动。

## ★ 本轮的定盘星（三审罕见全盘一致 + Scout 代码接地已核实 + 弧线收官站）

三份审计一致给 8.3/10（product 8.3、evolution 8.3、research 收官逻辑闭环无裂缝），罕见地全盘收敛到一句话：**前 4 轮把「有什么」做全了，本轮只需两把刀 + 一次收尾**——

- **刀一（情感高点打磨）**：家园里最重的情感时刻被做平了。领 bond_6「命运」（4000 好感 / 1500 KP，全游戏一个角色关系的绝对巅峰）和领 bond_1「初识」（100 好感）**反馈一模一样**（都走同一个 `.bond-float` 淡绿飘字，仅台词文本不同）。**巅峰时刻被做轻 = 教科书级反模式**（研究员援引 Yu-kai Chou win-state 框架的决定性警告："用同一音量庆祝一切，会让大小成就都失去情感落点"）。正解 = **分级音量**：低档保持 High-Five 轻飘字、高档升级 Crowning 隆重弹层。纯前端动效、零数值。
- **刀二（晒图/展示出口）**：家园攒了 5 轮的一切（基地/入住真实番剧角色/陈列/家具/羁绊/今日特殊）**只有自己看得见**——零对外出口。这是留存漏斗「进来 → 待着 → **出去传播**」的最后一段缺口，也是把 968 番护城河从「我看得见」推到「给人看」的第一块砖。正解 = **纯前端 Canvas 出一张「基地身份卡」**（安全异步晒图，仿 ACNH 梦境门牌的冻结快照精髓），系统分享 / 下载 PNG。
- **收尾**：清两个 pre-existing dead computed（`effectText`/`comfortBonusText`，已核实模板零引用）+ **一个显式的 Sprint 收官核对任务**。

**一句话定调**：第 1 轮「角色对你说话」、第 2 轮「角色对彼此说话」、第 3 轮「你的东西出现在你家里」、第 4 轮「你抽到的角色陈列在你家 + 明天回来不一样」，第 5 轮 = **「让最重的情感时刻配得上它的隆重（打磨）+ 给这份攒了 5 轮的家园一张能拿出门的脸（晒图）+ 干净收口」**。**克制比堆功能更对**（三审共同定调）——收官轮是打磨轮，不是「再塞一个系统」轮。全轮 100% 纯前端 · 零数值 · 零升档 · 零素材（emoji/CSS/Canvas 自绘）。

---

## ★★ 本轮拍板点一：优先级顺序（都要做，仅定顺序）

两把刀都是 🔴 必做，两份审计对「谁第一」排序相反（product：R1 庆祝 → R2 晒图；evolution：R1 晒图 → R2 庆祝；research：并列）。

### 拍板｜**先做庆祝分级（S16-T12），再做晒图（S16-T13）；两者互相独立、可分别合并**

- **理由**：Scout A1 明确——庆祝分级工程量更轻（改 1 个函数 + 加 CSS + 可选 1 纯函数）、风险更低、情感 ROI 最高（product 排序）；晒图工程量更大（新纯函数 + 新组件 + 新测试）。**先落低风险高 ROI 的庆祝，再落工程量大的晒图**，若单轮吃不下也已各自独立可合并。但**两者都是本轮命门、都必须做实**，顺序不影响验收——只是给 Generator 一个推荐落地次序。
- **两者独立**：庆祝分级只碰 `onClaimBondMilestone` 视觉分支；晒图是新增文件 + 新入口，互不依赖。可并行、可分别 PR。

---

## ★★★ 本轮拍板点二：晒图主标题走 `profile.currentUser`「XX 的家园」，绝不为「基地名」升档（已定）

**★ 关键代码现实校正（Scout A3/C-1，三审前提被证伪）**：三份审计都假设晒图卡放「基地名（baseName）」，但 **Scout 代码核实：`stores/homestead.ts` 只有 `placedCharacterIds` + `lastSettleAt` 两个字段，无任何基地名概念**（grep「基地名/baseName/homesteadName」在 store/schema 零命中）。

### 拍板｜**晒图卡主标题走 `profile.currentUser`「XX 的家园」（现成、零改、零升档），绝不新增可编辑基地名字段**

- **为什么走 `currentUser`**：`profile.currentUser`（玩家名）现成、零改、零升档，「XX 的家园」是干净的归属核心。
- **为什么绝不新增基地名字段**：新增可编辑基地名 → 逼升 schema v21（消耗 sprint 唯一 bump 于一个纯装饰字段，三审都没主张）。**本 sprint 唯一 v21 bump 五轮全程未消耗，是刻意的健康纪律，绝不为一个装饰字段破功**（留给未来「自定义家具摆位 F1」这类坐标非持久化不可的功能）。
- **结论**：晒图主标题 = 「XX 的家园」（`currentUser`）。若 Generator 认为需要基地名字段，须回报 Planner 权衡，不得擅自升档。

---

## ★★★★ 本轮拍板点三：Crowning 分级判据锚定 bond_4/5/6 = 高档（给 Generator 可测判据）

审计间对 Crowning 档位边界有轻微分歧（evolution 说 bond_5/6「可含 bond_4」；research/Scout 说 bond_4/5/6）。Planner 拍板锚定一个**可测**边界，避免 Generator 摇摆。

### 拍板｜**bond_1/2/3 = 低档 High-Five（保持轻飘字）；bond_4/5/6 = 高档 Crowning（隆重弹层）；bond_6 可再加最隆重一档**

- **判据有代码支撑**：`config/nurture.ts:112-119` 的 `BOND_MILESTONES` 本身在 `statBonusPct` 上就是 0.02（bond_1/2/3）vs 0.03（bond_4/5/6）的两档分层，reward 也在 bond_3→bond_4 处从 200 跳到 400——**bond_4 是数值分层的天然分界，Crowning 从 bond_4 起是有数据支撑的**。
- **建议抽纯函数**：`milestoneCelebrationTier(id): 'highfive' | 'crowning'`（按 id 白名单 bond_4/5/6 = crowning，或按档位 index ≥3），放 config 层可测。**这不是硬性要求**（Generator 也可内联判断），但研究员/Scout 都主张抽出来便于「分级判据」特征测试锁死。
- **bond_6 最隆重**：bond_6「命运」是全游戏关系顶点，可在 Crowning 基础上再加一档（如全屏淡金闪 / 更大的角色感言卡），做成「值得截图发出去」的瞬间。非硬性，隆重度肉眼可辨即达标。

---

## 本轮任务（按推荐落地顺序）—— 每项：目标/依赖/验收/来源

> 编号接第 1-4 轮 T1..T11，本轮为 **S16-T12 / S16-T13 / S16-T14（收官核对）**，外加可选加分 **S16-T15**。

### S16-T12｜里程碑庆祝按档位分级：High-Five / Crowning（P0，本轮命门之一）

- **目标**：把里程碑领取的反馈从「所有档一个模板」升级成**分级音量**——低档（bond_1/2/3）保持现有轻飘字（High-Five，克制），高档（bond_4/5/6）升级为**居中/半屏的隆重庆祝弹层**（Crowning：大号称号加冕 +「XX 达成」+ 角色名 + 角色的脸 + 光效 + 略长停留 / 点击关闭），bond_6「命运」可再加最隆重一档。让「领命运」和「领初识」**肉眼可辨隆重度差异**，把玩家最大的关系投入隆重化。
- **为什么**：家园里最重的情感时刻被做平了——领 bond_6（4000 好感巅峰）和领 bond_1（100 好感）反馈完全一致（`onClaimBondMilestone` 无论哪档都弹同一个 `.bond-float` 淡绿飘字，仅台词文本不同）。三审一致点名这是本轮情感 ROI 最高的一刀。Yu-kai Chou win-state 框架的决定性警告命中此处：「用同一音量庆祝一切，会让大小成就都失去情感落点」。这不是「加动效」，是修一个被外部研究明确点名的反模式——正解是**分级**不是「都变响」。纯 CSS 零数值零存档，风险最低。
- **拍板（给方向不给实现）**：
  - **分级不是统一动效**（research 深挖① 唯一危险读法，本轮最易错点）：给所有 6 档加同款彩带只是把「都很轻」换成「都很响」，**仍然 desensitize、问题没解**。必须 bond_1/2/3 保持轻（High-Five）、bond_4/5/6 隆重（Crowning）。低档就该轻——**别过度打磨低档**。
  - **分级判据锚定 bond_4/5/6 = Crowning**（见上方拍板三，有 `statBonusPct` 0.02/0.03 分层 + reward 200→400 跳变的数据支撑）；建议抽纯函数 `milestoneCelebrationTier(id)` 便于特征测试锁「分级判据」（非硬性，Generator 自决落点）。
  - **纯展示零数值、零发奖**（可见性命门 + 名字≠行为红线）：庆祝只是 `claimBondMilestone` 发放**成功之后**的视觉分支——发放逻辑一字不碰、庆祝不携带任何数值 / 不发奖 / 不改奖励。Crowning 弹层可复用离线收益 `.settle-pop` 弹窗范式 + `CharacterAvatar`（本地 sprite 非远程图）。
  - **定时器登记清除 + 动效走 CSS**（pitfalls:59 + research 假设 F 真风险）：Crowning 弹层若用 setTimeout 自动关闭，**必须登记既有 `dialogueTimers` 数组 + `onUnmounted` 清除**（复用 `scheduleDialogueClear` 现成范式）；任何动效走 CSS `@keyframes`，**绝不进 `usePlazaWalk` 的 rAF**（rAF 一字不动）。
  - **连领多个高档一次只弹一个**（research 极端③）：`claimableBondCount` 可能 >1，多个高档同时可领时，Crowning 弹层一次只显一个（队列 / 后领覆盖前领 / 需点击关闭），别叠弹打断。首版「一次弹一个 + 需手动关」即可。
  - **颜色走语义令牌**：庆祝弹层 UI 走 `rgb(var(--c-*))` / `--c-highlight` / `--c-accent`，别压 `text-white`、别拼动态色类、别用未定义令牌（`--c-ink-soft`/`text-ink-soft` 不存在，透明度用 `/` 不用反斜杠）。
- **依赖**：无硬前置（复用 `onClaimBondMilestone` + `.settle-pop` 弹窗范式 + `CharacterAvatar` + `dialogueTimers` + `BOND_MILESTONES`）。
- **验收**（可测）：
  1. **可见性命门（本轮验收第一条）**：领 bond_6「命运」（或任一 bond_4/5/6 高档）与领 bond_1「初识」（或任一 bond_1/2/3 低档）**反馈肉眼可分辨**——高档隆重（居中 / 半屏庆祝弹层 + 称号加冕 + 角色脸 + 光效 + 更长停留）、低档克制（轻飘字）。**领命运和领初识反馈一样 = 本项白做。**
  2. **分级判据正确 + 可测**：低档 bond_1/2/3 → High-Five、高档 bond_4/5/6 → Crowning；建议补特征测试锁分级判据（低档→highfive / 高档→crowning）。
  3. **纯展示零数值零发奖**：`claimBondMilestone` 发放逻辑一字未碰，庆祝仅是发放成功后的视觉分支，**不携带数值 / 不发奖 / 不改任何奖励**（审 diff 确认庆祝分支无 `spend/earn/claim` 新调用）；守「名字≠行为」红线。
  4. **定时器登记清除 + 不进 rAF**：Crowning 弹层若用 setTimeout 自动关闭，登记 `dialogueTimers` + `onUnmounted` 清除、无泄漏；动效走 CSS `@keyframes`，`usePlazaWalk` 的 rAF 未因庆祝改动。
  5. **连领不叠弹**：多个高档同时可领时 Crowning 一次只弹一个（不叠层打断）。
  6. **颜色令牌零违规**：庆祝弹层走语义令牌，无 `text-white` 压浅底 / 动态拼色类 / 未定义令牌 / 反斜杠透明度。
  7. `type-check`/`test`/`build` 全绿；`test` 连跑 3 次稳定。
- **来源**：合同（A 情感高点打磨，第 2 轮 negotiation N-1 / evolution E6 已排到本轮）、Scout A1/A2.4/B1 + C-4/C-5、research 深挖① + 提案 A（High-Five/Crowning）、evolution R2 + Phase 1.3、product R1。

### S16-T13｜家园快照晒图：一键出「基地身份卡」（P0，本轮命门之一）

- **目标**：给家园一个**对外的脸**——加一个「晒图 / 分享基地」入口，点击把家园状态聚合成一张**纯前端 Canvas 绘制的暖色「基地身份卡」**（主标题「XX 的家园」+ 入住真实番剧角色名 + 陈列完成度正着念 + 家具数 + 命中羁绊作品名 + 今日特殊角色 + 舒适度等本地可得数据），通过系统分享面板 / 下载 PNG 出图。把 5 轮攒下的一切从「我看得见」推到「给人看」，成为长留存的外化出口 + 968 番护城河的社交传播首块砖。
- **为什么**：家园是玩家停留最久、攒了最多真实追番战果的 hub，却零展示出口——这是留存漏斗「出去传播」段的结构性缺口（ACNH 梦境门牌是同品类留存神器的证明）。它站在项目已有的一套成熟 Canvas 晒图三件套上（`ShareCard.vue` 手绘范式 + `shareImage.ts` IO 层 + `buildWrappedStats.ts` 纯聚合范式），唯一实质增量 = 一个新纯函数 + 一个新组件 + 一个入口，**零新基建、零升档、零 cross-origin 风险**。
- **拍板（给方向不给实现）**：
  - **主标题走 `profile.currentUser`「XX 的家园」不引基地名字段**（见上方拍板二，零升档）。
  - **纯前端 Canvas、别引 html2canvas**（晒图铁律 + pitfalls:44 + `ShareCard.vue:5` 代码印证）：走 `toBlob` + `createObjectURL` + `a.download` + `revokeObjectURL`（`shareImage.ts` 已封装 `canvasToPngBlob` + `shareOrDownloadImage`，含系统分享 + 下载回落 + AbortError 处理，**零新 IO 代码，import 现成即可**）。
  - **首版绝不 `drawImage` 任何远程角色 / 封面图**（本轮最易翻车地雷）：AnimePlay 角色图走 `/data/images/...`（可能 offload 到 GitHub Release/OSS `VITE_IMAGE_BASE_URL`）——跨域 `drawImage` 会 taint canvas → `toBlob` 抛 `SecurityError`（`shareImage.ts:79` 注释 + `ShareCard.vue:5` 注释双印证）。角色「脸」用 **emoji / 名字首字 / 稀有度色块**（Canvas `fillText`/`roundRect` 自绘，`ShareCard.vue` 现成可抄）。**若要角色真图，只能在屏幕预览区（DOM，用 `CharacterAvatar`）显，Canvas 导出一律用文字 / emoji 自绘**——别把 DOM 头像塞进 Canvas。
  - **晒身份不晒缺口**（research 深挖② + Phase 2.3 flex 研究 + 第 4 轮陈列纪律一脉相承，反 completionist 红线）：正着念「陈列 5/7」「入住 6」「拥有 UR 12/48」「《XX》羁绊命中」（骄傲 / 身份 / endowment 正向）；**绝不放**「图鉴还差 260」「UR 0/67」「完成度 13%」这类缺口 / 低完成度指标（把骄傲的晒图做成焦虑仪表盘 = 踩红线）。家园卡是**「基地身份卡」非「图鉴成绩单」**——即使放完成度也是「陈列 X/7」这种局部正向计数，别做成第二张 codexPercent 成绩单。
  - **安全异步、绝不联机**（research 深挖② 破 B）：出一张 PNG → 系统分享 / 下载，玩家自行发。**绝不为「晒图」开联机 / 上传 / 排行榜 / headless 后端**（那是 S12，本 sprint 严禁触碰）。**绝不做「分享得奖励」任务**（诱导分享 dark pattern + 踩货币口径 + 名字≠行为，research Phase 2.4）。
  - **只读快照零副作用、零升档**：晒图是纯派生只读聚合（读 `profile` / `homestead.placedCharacterIds` / `codex.characterCompletion` / `collection` / `furnitureStore.placedIds` / `hourlyYield.bondHits` / `todaySpecialId` 全现成派生源），**不写状态、不发奖、零 claim/earn/spend、零升档**（`SAVE_VERSION`=20 不变、三处存档装配器不碰）。
  - **聚合抽纯函数**（晒图铁律 + pitfalls:44）：仿 `wrapped/buildWrappedStats.ts` 写 `buildHomesteadSnapshot.ts`（**零 Vue/Pinia/DOM**，输入是从 store 读出的 plain object 快照 → 输出可直接喂 Canvas 的视图模型），view 层把 live store 喂进去。便于单测。
  - **空态优雅、别羞辱新人**（research 极端① 收官债）：0 入住 / 0 收藏 / 空基地玩家的晒图必须优雅——`buildHomesteadSnapshot` 对空输入**不崩、不出 NaN / undefined**（仿 `buildWrappedStats` 对 0 历史的 `safePercent` 容错），空基地用**愿景化文案软化**（「我的家园刚起步 · 快来一起玩」）不显缺口条 / 不晒羞辱空卡。有特征测试锁死空态。
  - **满配优雅承载**（research 极端②）：6 入住 + 7 家具 + 多羁绊 + 陈列满时，Canvas 卡尺寸固定（仿 ShareCard 600×800 竖版适配手机分享），信息取舍要设计（阵容脸最多 6 位、家具 / 陈列 / 羁绊用聚合数字而非逐条铺开），满配是骄傲、要能优雅承载。
  - **调性 = 暖色基地身份卡**（product 2.3 + research 提案 B）：暖色渐变（呼应 PCR 暖色城镇 + 夏日主题，别照抄 ShareCard 的深紫冷调），主体是基地 / 角色 / 家具 / 羁绊的身份表达；可加一句 date-seeded「今日特殊角色寄语」（每天生成的图不同 → 鼓励重复晒，传播钩子）。
  - **薄接入、别堆进 HomesteadView**（evolution 收官软约束）：`HomesteadView.vue` 已 1366 行（全仓最大单文件之一）。晒图逻辑走独立纯函数 `buildHomesteadSnapshot.ts` + 独立组件 `HomesteadShareCard.vue`（Canvas 绘制在组件里），view 只加一个入口按钮 + 弹窗开关，**别把 Canvas 绘制代码堆进 HomesteadView**。入口按钮建议放橱窗卡头（顺带抬升橱窗存在感）或 header，Generator 自决。
  - **颜色令牌纪律**：界面 UI（分享按钮、弹窗）走语义令牌；**唯独** Canvas 导出图本体可用固定品牌色（属图片压片类合理例外，`ShareCard.vue:73-87` 有先例）。
- **依赖**：无硬前置（复用现成三件套 `ShareCard.vue`/`shareImage.ts`/`buildWrappedStats.ts` + `CharacterAvatar` + `CollectionsView.vue` 的晒图弹窗挂载范式）。
- **验收**（可测）：
  1. **可见性命门（本轮验收第一条）**：家园有「晒图 / 分享基地」入口，点击**生成一张纯本地数据的暖色基地身份卡**（主标题「XX 的家园」+ 入住真实番剧角色名 + 陈列 / 家具 / 羁绊命中 / 今日特殊等），可**系统分享或下载 PNG 成功**。**968 番差异化务必显形**（入住角色名 + 羁绊作品名带出真实追番信息 = 社交货币）。**点了没图 / 图里看不到家园身份 = 本项白做。**
  2. **零 cross-origin taint**：Canvas **零 `drawImage` 远程图**（角色用 emoji / 首字 / 色块自绘），`toBlob` 不抛 `SecurityError`；未引入 html2canvas。
  3. **晒身份不晒缺口**：卡面正着念「陈列 X/7」「入住 N」「拥有 UR X/N」「《XX》羁绊命中」，**绝无**「还差 Y」「UR 0/N」「完成度 13%」缺口 / 焦虑指标（守反 completionist）。
  4. **空态优雅（命门级）**：0 入住 / 0 收藏 / 空基地 → `buildHomesteadSnapshot` 不崩、不出 NaN / undefined，空基地用愿景文案软化不显缺口条 / 不晒羞辱空卡；有特征测试锁死空态。
  5. **纯派生只读零升档零奖励**：只读现成派生源，**零新增存档字段、`SAVE_VERSION`=20 不变、`schema.ts`/`migrations.ts`/`stores/persistence.ts` 未触碰、零 claim/earn/spend、绝不「分享得奖励」、绝不联机 / 上传 / 排行榜后端**（审 diff 确认）。
  6. **聚合抽纯函数 + 薄接入**：`buildHomesteadSnapshot.ts` 零 Vue/Pinia/DOM（仿 `buildWrappedStats.ts`）、有 `.test.ts` 特征测试（满配 / 0 入住 / 0 收藏三态 + 正着念计数）；Canvas 绘制在独立 `HomesteadShareCard.vue`、**未把绘制代码堆进 HomesteadView**。
  7. **复用不重造**：IO 复用现成 `shareImage.ts`（`canvasToPngBlob`/`shareOrDownloadImage`）、聚合仿 `buildWrappedStats.ts`、Canvas 手绘仿 `ShareCard.vue`、弹窗挂载仿 `CollectionsView.vue`——未造第二套晒图基建。
  8. `type-check`/`test`/`build` 全绿；`test` 连跑 3 次稳定。
- **来源**：合同（B 晒图/展示出口 + ★ 晒图硬约束 pitfalls 明令）、Scout A2/A3/A4/A5/B2 + C-1/C-2/C-6/C-7、research 深挖②③ + 提案 B + Phase 2.2/2.3（ACNH 梦境门牌 + flex 文化）、evolution R1 + Phase 4.1（护城河推向社交传播）、product R2 + 3.2、negotiation.md:128-131（Planner 早已把晒图排进第 5 轮）。

### S16-T14｜Sprint 收官核对（P0 收官任务，本轮必做）

- **目标**：本轮是 S16 收官轮。落完打磨 / 晒图后，做一次显式的全 Sprint 收官核对——确认全部任务勾选与实现一致、S14/S15 既有机制无回归、验收命令全绿、零升档。这是收官轮独有的、把 5 轮成果封存的核对任务。
- **为什么**：pitfalls S14-A 教训明确——「tier1-on 跑满轮次 ≠ 目标达成」；product-loop 曾把 Sprint 内未完成任务误判为「不开新范围」跳过，导致跑满轮次但目标未达、Evaluator 却报 COMPLETE。收官轮必须以「合同全部 `[x]` 且与实现一致 + 命令全绿 + 零升档 + 无回归」为硬判据，而非只看末轮 Evaluator 决策。
- **拍板（给方向不给实现，这是核对任务不是编码任务）**：
  - **checkbox 核对**：`docs/plans/SPRINT.md` 的 **S16-T1..T11 当前全部 `[x]`**（Scout D + Planner 已核实，`grep "\[ \].*S16-T"` 零命中）；本轮新增 **S16-T12 / S16-T13（+ 若做 T15）也须 `[x]` 且与实现一致**（打磨分级肉眼可辨 / 晒图肉眼可出图，非仅内存态）。**注意**：`docs/SPRINT.md`（非 `docs/plans/SPRINT.md`）里的 `[ ]` 是 S11/S12 未来路线图残留，**非 S16 项，勿误判**（research Phase 3.3 + Scout 已提示）。
  - **S14/S15 + 1-4 轮机制无回归**（亲验 diff + 读码）：computeIdleYield 单 seam（预览=结算，`hourlyYield`/`projectedYield`/`nextHourlyYield` 同喂 `facilityLevels`+`placedAnimeNames`）/ facility v17 乘区 / 装备强化+套装+modifier / 暴击轴 / 扫荡+委托日循环 v19 / comfort 软加成汇入 / softCap / 家具 v20 y-sort / 羁绊 bondHits 同源 / pity v20 / 墙钟回拨钳位 / setTimeout·rAF 全登记清除 / 收藏橱窗+今日特殊+季节 均在，无回归。
  - **零升档核对**：`schema.ts:57 SAVE_VERSION=20` 不变；`infra/persistence/{schema,migrations}.ts` + `stores/persistence.ts` 本轮 diff **全空**（打磨 / 晒图天然零存档需求）。**sprint 唯一 v21 bump 五轮全程未消耗，留 backlog**（给未来「自定义家具摆位 F1」）。
  - **验收命令全绿**（Evaluator 亲自重跑，见文末；`npm run test` 连跑 3 次稳定，基线 991、本轮加晒图纯函数测试后应升）。
- **依赖**：S16-T12 + S16-T13 落地后执行（核对以它们与实现一致为前提）。
- **验收**（可测）：
  1. **勾选一致**：S16-T1..T11 全 `[x]`（已核实）+ 本轮 S16-T12/T13（+ T15 若做）全 `[x]` 且与实现一致；`grep` 主线未勾选项零命中（勿误读 `docs/SPRINT.md` 的 S11/S12 残留）。
  2. **无回归**：S14/S15 + 1-4 轮机制经 diff / 读码核实无回归（清单见上）。
  3. **零升档**：`SAVE_VERSION`=20；三处存档装配器本轮 diff 全空；唯一 v21 bump 未消耗。
  4. **5 命令全绿**：type-check 0 错 / test 连跑 3 次稳定全绿 / build 成功 / 后端安全 exit 0 全 PASS / `debug=True` 零命中。
- **来源**：合同（★ Sprint 收官核对硬约束 + C 收尾）、Scout D、三审收官核对项（product R6 / evolution R3 / research P1-3）、pitfalls S14-A（跑满轮次≠达成）。

### S16-T15｜收尾清债 + 可选微打磨（收尾必做「清 dead computed」+ 可选加分）

- **目标**：清两个 pre-existing dead computed（收尾必做，合同 C 明列）+ 若有工程余量做几处纯 CSS 微打磨（可选加分，非硬验收）。
- **拍板（给方向不给实现）**：
  - **【必做】清两个 dead computed**（Scout B3/C-3，已核实零风险）：删 `HomesteadView.vue:377` `const effectText = computed(...)` + `:379` `const comfortBonusText = computed(...)`（两个 top-level computed，模板零引用——已核实模板只用 `row.effectText`（`residentRows` 内部字段）和 `comfortPctText(homeEffect.comfort)`）。⚠️ **别误删 `residentRows` 里的 `effectText: formatHomeEffect(...)`**（那是模板 `row.effectText` 的真实数据源，删了会炸入住名单效果显示）——只删 377/379 两行 top-level。
  - **【可选加分，有余量才做，非硬验收】**：① 收取瞬间到手反馈（`g-cta-gold` 按钮扩一个成功态脉冲 +「+X KP」小飘字，纯 CSS，零数值改，只可视化已发生的入账，product R3）；② 新 UR 入橱窗高光（`showcaseCards` 最新那张给入场描边脉冲，纯 CSS，product R4）；③ 偶遇符号 / 气泡缓动微抛光（纯 CSS，别破 `usePlazaWalk` rAF / 偶遇符号 z 分层，合同 A 点名）；④ 禁用态正向提示（设施 / 家具购买 `:disabled` 时「再攒 X KP 可购」，正向文案非焦虑条，research 提案 C）。
  - **可选项一律纯 CSS / 派生、零数值、零存档**；有余量做 1-2 个即可，**别为凑加分破坏节奏**（收官轮克制优先）。
- **依赖**：无（清 dead computed 独立；微打磨可选）。
- **验收**（可测）：
  1. **必做项**：`HomesteadView.vue` 的 top-level `effectText`/`comfortBonusText` 两个 dead computed 已删；`residentRows` 内部 `effectText` 字段**未误删**（入住名单效果显示无回归）；`type-check`/`test`/`build` 全绿。
  2. **可选项（仅当实现时适用）**：做的微打磨纯 CSS / 派生、零数值、零存档、颜色走语义令牌；若不做不算缺陷。
- **来源**：合同（C 收尾 + A 微打磨点名）、Scout B3/B4 + C-3、三审收尾项（product R3/R4/R5 / evolution R3/R4/R6 / research 提案 C/D）。

> **本轮明确不做、留 backlog**：① 晒图联动 Crowning（bond_6 达成即生成「命运纪念卡」，research 提案 E，A/B 都做完有大余量才考虑，非本轮承诺）；② 自定义家具摆位 F1（唯一值得动 v21 的候选，坐标非持久化不可，留后续 sprint 被验证后做）；③ 家园「来逛」异步访客（ACNH 梦境门牌完整形态，需后端，S12 范畴）；④ 快照卡嵌角色真图（需解 CORS，后续美术管线债）；⑤ 逐作品专属偶遇 / 逐角色专属 tap 台词（长线内容债，骨架已留）；⑥ 主题房 / 成套完成度评分（家具扩容后）；⑦ 任何联机 / 上传 / 排行榜后端（伪需求）；⑧ 任何升档（收官零升档）。

---

## 5 轮演进总结（弧线闭环）

整体节奏 = **先接通「情感回路」（关系/台词）→ 再让「投入可见」（空间/陈列）→ 给「回访理由」（新鲜/展示）→ 最后「放大高点 + 外化出口 + 收口」**。每轮都守「不叠新乘子、在 `computeIdleYield` 数值口径旁开非数值回报轴」，五轮零污染、零升档（`SAVE_VERSION` 稳在 20）、零素材。

- **第 1 轮 — 关系回路接通**（COMPLETE）：好感里程碑搬进家园显形+领取（T1）+ tap 互动（T2）+ 情境台词层（T3）。角色↔玩家最短情感回路闭合。
- **第 2 轮 — 关系深化**（COMPLETE）：广场同作品偶遇对话（T4）+ 气泡多角色并发模型（T5）+ 入住决策关系预告（T6）。角色↔角色学会对彼此说话；顺带把 `HomesteadView` 拆出 `usePlazaWalk.ts`。
- **第 3 轮 — 投入可见（家具空间化）**（COMPLETE）：家具从「右栏一行字」落地进场景固定槽位可见（零升档 + 零素材 emoji + y-sort，T7）+ 陈列 X/7（T8）。回报轴 = 视觉所有权本身，零数值。
- **第 4 轮 — 收藏陈列 + 回访新鲜**（COMPLETE）：家园作抽卡战果橱窗（UR 橱窗 + 完成度 chip 纯派生，T9）+ date-seeded 今日特殊角色（T10）+ 季节浮层（T11）。收窄「双倍好感」为纯情感（选 B，零碰养成）。
- **第 5 轮（本轮）— 打磨 + 晒图 + 收尾（收官）**：里程碑庆祝分级 High-Five/Crowning（**T12**）+ 家园快照晒图基地身份卡（**T13**）+ Sprint 收官核对（**T14**）+ 收尾清 dead computed + 可选微打磨（**T15**）。**本轮拍板：先庆祝后晒图（都做实）；晒图主标题走 `currentUser`「XX 的家园」不引基地名（零升档）；Crowning 锚定 bond_4/5/6；维持零升档、唯一 v21 bump 五轮全程未消耗留 backlog。**

**收官定性**（三审 + research Phase 3.1 正式表态）：「在 `computeIdleYield` 单口径旁开非数值情感/收集轴」这条总设计哲学，收官时**成立、自洽、闭环、无致命裂缝**。七个概念（关系/偶遇/家具/陈列/回访/打磨/晒图）全部非数值、全部零升档、全部落「展示墙非待办地狱」正确一侧、彼此不打架、`computeIdleYield` 五轮零污染。家园从「会挂机的壁纸」长成了「有情感、有所有权、有回访理由、能拿出门给人看」的完整活基地。**守住『巅峰要隆重、晒图晒身份不晒缺口、社交是异步不是联机、收官零升档』，5 轮弧线就完美闭环。**

---

## 来自 Reviewer / Scout 的改进项（采纳的）

> 逐条决策见 `docs/orch/negotiation.md`。本轮实际纳入的：

- **里程碑庆祝按档位分级 High-Five/Crowning（三审一致 + Yu-kai Chou 框架）** → 本轮 **S16-T12**（命门之一），收窄「分级音量不是统一动效」（research 深挖① 唯一危险读法）。
- **家园快照晒图基地身份卡（三审一致 + ACNH 梦境门牌 + flex 文化）** → 本轮 **S16-T13**（命门之一），克隆现成三件套、晒身份不晒缺口、安全异步不联机、首版不嵌远程图。
- **「基地名不存在」代码现实校正（Scout A3/C-1，三审前提被证伪）** → 内化为**拍板二**：晒图主标题走 `profile.currentUser`「XX 的家园」，绝不为装饰字段升 v21。
- **Crowning 档位边界审计间分歧** → 内化为**拍板三**：锚定 bond_4/5/6 = Crowning（有 statBonusPct 0.02/0.03 分层 + reward 200→400 跳变数据支撑）。
- **晒图硬约束（别引 html2canvas / 首版不嵌远程图 taint / 聚合抽纯函数 / 只读快照）** → 内化为 T13 拍板红线（pitfalls:44 + `ShareCard.vue:5`/`shareImage.ts:79` 代码印证）。
- **0 入住 / 空基地晒图空态优雅（research 极端① / Scout A5/C-6）** → 内化为 T13 命门级验收（愿景文案软化 + 聚合容错 + 特征测试）。
- **Crowning 定时器登记清除 + 连领不叠弹（Scout C-5 + research 极端③）** → 内化为 T12 拍板红线。
- **薄接入别堆进 1366 行 HomesteadView（evolution Technical Health）** → 内化为 T13 收官软约束（晒图走独立纯函数 + 组件）。
- **清两个 dead computed（三审一致 + Scout B3/C-3 已核实）** → 本轮 **S16-T15** 收尾必做（只删 377/379 top-level，别误删 residentRows.effectText）。
- **Sprint 收官核对（合同硬约束 + pitfalls S14-A 教训）** → 本轮 **S16-T14** 显式收官任务。
- **收取/偶遇微打磨 + 禁用态正向提示（product R3/R4 / research 提案 D/C）** → 本轮 **S16-T15** 可选加分（非硬验收）。
- **晒图联动 Crowning F1 / 自定义家具摆位 / 异步访客** → 留 backlog（非收官轮范围）。

---

## 相关陷阱（从 pitfalls.md + Scout C 段筛选）

- **[晒图铁律]** 纯前端 Canvas（`toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`）、**别引 html2canvas**、**首版绝不 `drawImage` 远程角色/封面图**（跨域 taint → `toBlob` 抛 `SecurityError`）——角色脸用 emoji/首字/色块自绘；聚合抽纯函数仿 `buildWrappedStats.ts`（零 Vue/Pinia/DOM 便于单测）。现成 `shareImage.ts`/`ShareCard.vue`/`buildWrappedStats.ts` 逐条已满足，零新基建。
- **[图表/DOM 头像不进 Canvas]**（pitfalls:54）：`CharacterAvatar` 是 DOM 组件，只在屏幕预览区（DOM）用；Canvas 导出一律文字/emoji 自绘，别把 DOM 头像塞进手绘 Canvas。
- **[C-1 基地名不存在]**：`stores/homestead.ts` 无 baseName 字段，晒图主标题走 `profile.currentUser`「XX 的家园」，绝不为装饰字段升 v21。
- **[C-4 庆祝分级 = 分级音量不是统一动效]**（research 深挖①）：给 6 档全加同款彩带只是「都很轻→都很响」，仍 desensitize。必须 bond_1-3 轻 / bond_4-6 隆重。
- **[C-5 Crowning 弹层 setTimeout 必登记清除]**（pitfalls:59）：走现成 `scheduleDialogueClear`→`dialogueTimers`→`onUnmounted` 清；动效走 CSS `@keyframes` 不进 `usePlazaWalk` 的 rAF（rAF 一字不动）。
- **[C-3 dead computed 删 377/379 两行，别误删 residentRows.effectText]**：`effectText` 名字撞了——top-level 377/379（死）vs residentRows 内部字段 404（活，喂模板 873）。只删 377/379。
- **[空态别羞辱新人]**（research 极端①）：0 入住/0 收藏晒图必须有愿景文案不显空网格 / 缺口条；`buildHomesteadSnapshot` 对空输入返回安全默认（不 NaN/undefined）+ 特征测试锁死。
- **[晒身份不晒缺口]**（反 completionist）：卡面正着念「陈列 5/7」「拥有 UR 12/48」，绝不放「还差 260」「UR 0/67」「完成度 13%」。
- **[展示墙非待办地狱 / 惊喜非债务]**：庆祝零发奖、晒图只读零副作用、绝不「分享得奖励」任务（dark pattern）、绝不「再刷解锁隆重版」、无 FOMO 倒计时。
- **[名字≠行为换皮红线]**（S14-A / S16-T3 教训）：庆祝 / 晒图都是纯展示，绝不携带数值效果、绝不驱动奖励。
- **[收益加成经既有 computeIdleYield 口径，严禁另拼]**：打磨/晒图纯展示零数值零乘子，`computeIdleYield` 本轮零改。
- **[颜色走皮肤语义令牌]**：庆祝弹层 / 晒图入口 UI 走 `rgb(var(--c-*))` / `--c-highlight` / `--c-accent`（非白字压浅底 / 非动态拼色类）；未定义令牌双形态（`var(--c-ink-soft)` + `text-ink-soft` 都不存在，真令牌 `--c-ink-2/-3`；透明度 `/` 不用反斜杠 `\`）。**唯独 Canvas 导出图本体可用固定品牌色**（图片压片类合理例外，`ShareCard.vue:73-87` 先例）。
- **[别破坏 1-4 轮 + S14/S15 已成机制]**：本轮加打磨 / 晒图层，别破坏第 4 轮橱窗 / 今日特殊 / 季节、第 3 轮家具静态层、第 2 轮偶遇·tap·多气泡（`usePlazaWalk` rAF / 邻近检测 / 气泡 Map 一律不动）、第 1 轮里程碑显形·tap。
- **[SAVE_VERSION 权威读 schema.ts:57=20，别复述]**（pitfalls:61）：文档引用 schema.ts 别复述版本号，免漂移。本轮零升档。
- **[orch 提交边界]**（pitfalls:64 + Scout C-8）：`git status` 里 HomesteadView/homestead.ts/usePlazaWalk 等 = S16 前 4 轮累积未提交产物，属正常累积非脏树；Evaluator 核回归以「合同全部 `[x]` 且与实现一致」为准。
- **[跑满轮次≠达成]**（pitfalls S14-A）：收官核对以「合同全部 `[x]` 且与实现一致 + 5 命令全绿 + 零升档 + 无回归」为硬判据，非只看末轮 Evaluator 决策。

---

## 验收命令（Generator 跑、Evaluator 亲自重跑，cwd = 仓库根 `D:\work\AnimePlay`）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿；收官轮 + 涉时序，连跑 3 次稳定；基线 991，加晒图纯函数测试后应升）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全基线（S16 不碰后端，期望退出码 0、全 PASS）—— 用仓库 .venv：.venv/Scripts/python.exe backend/test_security.py
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 退出码 0、全 PASS，涉时序 test 连跑 3 次稳定全绿），命令 5 零命中，且本轮承诺的 **S16-T12 `[x]` + S16-T13 `[x]` + S16-T14 `[x]`** 并与实现一致：

- **S16-T12（庆祝分级）**：领 bond_6「命运」与领 bond_1「初识」反馈**肉眼可分辨**（高档 Crowning 隆重弹层、低档 High-Five 轻飘字）、分级判据正确（bond_4/5/6=Crowning）、纯展示零数值零发奖（`claimBondMilestone` 未碰）、Crowning setTimeout 登记 `dialogueTimers` 清除 + 动效 CSS `@keyframes` 不进 rAF、连领不叠弹、颜色令牌零违规、零升档。
- **S16-T13（晒图）**：家园有晒图入口、点击生成一张纯本地数据的暖色基地身份卡（「XX 的家园」+ 入住真实番剧角色名 + 陈列/家具/羁绊命中/今日特殊）、可系统分享/下载 PNG、零 `drawImage` 远程图（`toBlob` 不抛错）、晒身份不晒缺口、空态优雅（愿景文案 + 聚合容错 + 特征测试）、纯派生只读零升档零奖励零联机、聚合抽纯函数 `buildHomesteadSnapshot.ts`(+`.test.ts`) 薄接入独立组件、复用现成三件套。
- **S16-T14（收官核对）**：S16-T1..T11 全 `[x]`（已核实）+ 本轮 T12/T13(+T15) 全 `[x]` 且与实现一致（勿误读 `docs/SPRINT.md` 的 S11/S12 残留）、S14/S15 + 1-4 轮机制无回归、`SAVE_VERSION`=20 三处装配器 diff 全空 + 唯一 v21 未消耗、5 命令全绿 test 连跑 3 次稳定。

**S16-T15 的「清 dead computed」为收尾必做（删 377/379 两行、别误删 residentRows.effectText）；其余微打磨为可选加分，不做不算缺陷；做了须纯 CSS/派生、零数值、零存档、颜色令牌合规。**
