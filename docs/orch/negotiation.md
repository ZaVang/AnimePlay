# Negotiation — Iteration 5（债轮·收尾轮）

> Sprint Planner 对三审报告（product 体验 8.4 / evolution 进化 9.2 终评 / research R5.1-5.7）每条 🔴/🟡/💡 的逐条回应：**接受 / 拒绝 / 部分接受 + 理由 + 本轮行动**。
> 全程以 `docs/orch/scout.md` A 段（只读侦察，6 项全部纯前端零存档已亲验，file:line 接地）为接地依据。
> 本轮取向 = 最后一轮债轮：把地板抬平、清技术债、让 5 轮投资被新用户感知。铁律：本轮**全部零存档**（SAVE_VERSION 仍 12），不破架构/经济/颜色铁律。
> 三报告高度收敛、无矛盾（Scout 总判）。

---

## A. Product 报告（体验 8.4）

### 🔴 P-1：硬色 138 处连根拔 = 抽共享色映射
- **裁决：接受（核心项 → I5-T1）**。
- **理由**：Scout 亲验 138 处（养成 107/5 文件 + SquadBattle 31）与报告完全吻合；这些硬色不随 `data-skin` 切换，切 midnight/neon 暗皮时炸饱和色斑，**背刺 5 套换肤卖点**——债轮"让投资被感知"的头号目标。语义令牌已齐全（skins.css 5 皮肤），基建成本一次性。
- **本轮行动**：I5-T1 全量一轮清完（裁决②）。硬约束写进验收：**抽共享色映射（`config/nurtureColors.ts`）+ 整函数重写**，防 partial-migration（Scout C3：已有半迁移档，逐处 grep-replace 必留半语义半硬色）。羁绊 6 档塌成 4-5 语义色是必然取舍，验收看"切暗皮不炸色斑"。

### 🔴 P-2：confirm/alert 18 处统一弹窗
- **裁决：接受（核心项 → I5-T2）**。
- **理由**：Scout 核实 18 真实点（剔 2 误报）；原生灰框与皮肤割裂、移动端差。叠加 research R5.1，可一笔同时还"原生弹窗债 + 4 处解锁逐字重复概念债"。
- **本轮行动**：I5-T2。先抽共享解锁门面（收 domain）+ 新建统一弹窗组件 + composable，再各处接入；store 层 4 处降级 toast。守卫以 store error 为准（Scout C2）。

### 🟡 P-3：onboarding 点名品味
- **裁决：接受（最高 ROI → I5-T3）**。
- **理由**：5 轮把品味/人格做成主线，onboarding 4 步却对新用户隐形。Scout 核实加步零逻辑改、零存档。
- **本轮行动**：I5-T3。加第 5 步点名品味 + value-first 改写开场（裁决①，融合 research R5.2）。

### 🟡 P-快赢：文档同步 / homestead 冻结 / 死代码
- **裁决：接受（打包/拆分 → I5-T4 家园冻结 + I5-T5 收尾杂项三连）**。
- **理由**：债轮该把地板灰尘一次扫掉。家园冻结有"移出构建"的语义完整动作 → 独立 T4；文档 v12 + 死代码 + setTimeout 是互不相关碎债 → 打包 T5（裁决③）。
- **本轮行动**：I5-T4（router redirect + 删 import + 删导航注释）；I5-T5（CLAUDE.md v11→v12 / pitfalls v6→v12 / SquadBattle 删矛盾行 / CardDetailModal 用 MAX_PINS / NurtureActions setTimeout 登记）。

---

## B. Evolution 报告（进化 9.2 终评）

### 🔴 E-1：onboarding 点名品味 + 集册 + Pin = 最高 ROI
- **裁决：部分接受 → I5-T3（onboarding 点名）；集册/Pin 已在第 4 轮交付**。
- **理由**：evolution 把"onboarding 点名 + 集册 + Pin"打成一组最高 ROI——但集册（I4-T1）+ Pin（I4-T3）已在上轮 COMPLETE 交付（eval.md 坐实）。本轮**只剩 onboarding 点名这一未交付增量**，正是把已建的集册/Pin/品味主线"在 FTUE 显形"，让前 4 轮投资被新用户感知。
- **本轮行动**：I5-T3 第 5 步 cta 跳 `/collections` 引导标记看过 → 直接点亮已建的雷达/集册，避免全 0 灰墙。闭环 evolution 这条 ROI 链。

### 🟡 E-2：家园删 / 冻结
- **裁决：接受冻结、拒绝删除 → I5-T4**。
- **理由**：删 view 文件会丢已写的半成品代码（未来或复用）；冻结（redirect + 删 import + 移出构建）已达成"用户不可触达"的全部收益，且延续既往口径（commit 0007e8b 导航暂藏、代码/路由保留）。research R5.3 也是"完整冻结"非删除。
- **本轮行动**：I5-T4 路由 redirect + 删 component import（移出构建产物）+ 删 App.vue 导航注释；HomesteadView 文件保留。

### 💡 E-3：品味亲和度对照 = S12 backlog 路标
- **裁决：接受为路标、本轮不做（记入 plan「不做」区）**。
- **理由**：玩家间品味重合度/社交化发现需后端（数据交换/匹配/存储）+ 跨栈、触 schema，与本轮"零存档纯前端债轮"取向根本冲突。这是 **5 轮纯前端打磨天花板之上、唯一需架构升级才能解锁的最大增量**。
- **本轮行动**：写入 plan.md「本轮明确不做」，标为"5 轮后最大剩余机会"，归 S12（PvP/排行榜/后端权威）同一波后端化浪潮，建议届时 `/think` 先定数据模型与隐私边界。

---

## C. Research 报告（R5.1-5.7）

### 🔴 R5.1：confirm/alert 抽共享解锁门面 + CardDetailModal 用 MAX_PINS
- **裁决：接受（拆入 I5-T2 + I5-T5）**。
- **理由**：research 精准指出 4 处解锁是逐字重复（Scout 核实 GenreSets 是范本、其余同构）→ 先抽门面再换弹窗，把"改 4 遍"变"改 1 处"。CardDetailModal:66 用 `pinnedIds.length` 表上限是语义错位（凑巧=8）。
- **本轮行动**：解锁门面 + 统一弹窗 → I5-T2（门面收 domain，别写死 anime；以 store error 为准）；MAX_PINS 文案 → I5-T5 死代码三连。

### 🔴 R5.2：onboarding value-first 替换不新增步
- **裁决：部分接受（融合裁决①）→ I5-T3**。
- **理由**：research"每多一步都是流失点"成立，但 product/evolution 要加步点名品味，二者目标一致。裁决：**末尾只加 1 步**（不堆步数，吸收 research 的克制原则）+ **改第 1 步开场为 value-first**（吸收 research 的 value-first 主张）。两建议取并集是最小代价最大收益、非互斥。
- **本轮行动**：I5-T3。加 1 步点名品味 + value-first 改写开场文案。**纳入 research"引导里标 2-3 部看过点亮雷达/集册"**（第 5 步 cta 跳 `/collections`，避免全 0 灰墙）；但引导内不调用 `toggleTasteWatched`（保持引导只导航不写状态）。

### 🟡 R5.3：家园完整冻结路由守卫
- **裁决：接受 → I5-T4**（同 E-2，冻结非删除）。
- **理由**：研究侧明确"只藏导航不够，手敲 URL 仍渲染半成品"——Scout 核实路由仍 active + lazy-import。
- **本轮行动**：I5-T4 redirect:'/' + 删 import（移出构建）。Scout 倾向方案①（redirect + 删 import）优于"占位 + beforeEnter 守卫"，更干净且省体积，采纳①。

### 🟡 R5.4：文档同步 v12
- **裁决：接受 → I5-T5**。
- **理由**：Scout 纠正了报告与实际的出入并亲验——`CLAUDE.md` 实为 v11（非报告所述）、`pitfalls.md` 漂 v6（最该修）；根目录无 CLAUDE.md。pitfalls 是全角色必读、自身漂 6 版会误导后续轮按 v6 判断存档结构。
- **本轮行动**：I5-T5。CLAUDE.md v11→补 v12 一行；pitfalls L11 + L34 v6→v12。权威值集中到 schema.ts:30。建议 T5 后在 pitfalls 沉淀"版本号只指向不复述"避免再漂（Scout C1）。

### 💡 R5.5-5.7：品味社交对照（长期）
- **裁决：接受为 S12 路标、本轮不做**（同 E-3）。
- **理由**：长期社交化方向需后端 + 跨栈，与零存档债轮冲突。
- **本轮行动**：写入 plan「本轮明确不做」= 5 轮后最大剩余机会，归 S12。

---

## D. 跨报告综合裁决与 Scout 接地确认

| 裁决点 | 决定 | 理由摘要 |
|---|---|---|
| **裁决① onboarding** | 加第 5 步 **且** value-first 改写开场 | 两建议目标一致非互斥；末尾只加 1 步（不堆步数）+ 改开场文案，取并集最小代价最大收益。纳入"标 2-3 部看过"但引导内不写状态。 |
| **裁决② 硬色范围** | 全量 138 **一轮清完** | 核心成本在一次性"抽共享色映射"基建，养成 + 挑战塔共用同套令牌；分步徒增协调 + 留半换肤中间态难验收。硬约束：抽共享映射 + 整函数重写防 partial-migration。 |
| **裁决③ 杂项打包** | 家园冻结独立 T4 + 文档/死代码/setTimeout 打包 T5 | 家园冻结是语义完整的"冻结"动作（含移出构建）独立验收清晰；其余四子项互不相关碎债，打包一组验收最省协调。 |

**Scout 关键接地全部纳入验收硬约束**：
- C2（unlockCodexCard 已自带守卫，UI 守卫重复）→ I5-T2 门面以 store error 为准、不写两层守卫。
- C3（养成硬色 partial-migration 陷阱）→ I5-T1 整函数重写、抽共享映射，禁逐处 grep-replace。
- C4（NurtureActions setInterval 已清、setTimeout 漏网的"假安全"）→ I5-T5 仿 schedule() 登记 + 卸载清。
- C5（统一弹窗全仓无现成、须新建，触达 14 组件 + 4 store）→ I5-T2 排期留出新建 + 接入工作量、列为债轮唯一"建新基建"项。
- B2 坑（门面收 domain，3 处 anime-only / CodexPanel 双域）→ I5-T2 门面收 domain 参数、别写死 anime。

---

## E. 铁律守护声明

- **零存档**：本轮 5 项全部纯前端零存档（Scout 总判 6 工作项无一升 v13）——共享色映射/统一弹窗组件/共享解锁门面/onboarding 步/家园冻结/死代码修全不碰 schema/migrations/装配器/codex。SAVE_VERSION 仍 12，四处 diff 须全空。
- **颜色铁律**：I5-T1/T2 新代码语义类 / `rgb(var(--c-*))`，禁 text-white 压浅底、禁动态拼色、禁未定义令牌；稀有度/资源识别色 + 图片压片白字固定例外保留。
- **计时器铁律**：I5-T5 NurtureActions setTimeout 登记并卸载清除（CLAUDE.md Startup 段明文要求）。
- **依赖只向下 / engine 纯净**：共享色映射落 config 层（纯常量/函数零 Vue/IO）、解锁门面落 composables 层、统一弹窗落 components 层——不漏进 engine。
- **测试纪律**：`npm run test`（vitest），不跑 `lint --fix`；共享色映射/解锁门面含纯函数配特征测试；基线 ≥489 不弱化既有。
