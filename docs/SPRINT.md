# AnimePlay — SPRINT 合同

> 本文件是 **product-loop / multi-ralph 的执行合同**：迭代引擎读这里的 `[ ]` 任务当需求源，
> 完成一项就把 `[ ]` 改 `[x]`，全部勾完且「验收命令」全过 → `DECISION: COMPLETE`。
> 单一任务源仍是 [FUTURE.md](FUTURE.md)（S0–S9 已 ✅）；本文件是把 FUTURE.md **剩余任务**（S10/S11/S12）
> 拆成可执行合同。当前活动 sprint = **S10**；S11/S12 见文末 Backlog（决策门控，未激活）。

## 产品背景

- **产品名称**：动画宅的自我修养（AnimePlay）
- **简介**：基于 Bangumi 番剧/角色数据的抽卡 + 收集 + 多玩法（宅理论战/挑战塔/养成/猜角色）网页游戏。全部游戏逻辑在前端（已抽成纯净 `engine/`），后端是「带文件柜的数据服务器」。
- **技术栈**：前端 Vue 3 + TS + Pinia + Tailwind（Vite）；后端 Flask（`backend/server.py`，另有 `api/index.py` 为 Vercel serverless 变体）。
- **启动方式**：后端 `python start_server.py`（端口 **5001**）；前端 `cd frontend-vue && npm run dev`（端口 **5173**，vite 代理 `/api`、`/data` 到 5001）。
- **登录现状**：输入字母数字用户名即创建/加载存档（`data/user_data/<用户名>.json`），**无密码、无鉴权**——这正是 S10 要堵的红线。
- **已确认决策（本 sprint 立项时与用户敲定）**：
  - 鉴权方式 = **密码账号 + 会话 token**（首次登录即注册，后端存盐哈希，读写存档需登录后签发的 token）。
  - 部署 = **只加固不实施**——把后端加固到「可安全部署」状态，部署方案只写文档（自部署 + serverless 各列要点），不绑定具体平台、不真正上线。

---

## 🎯 当前活动 Sprint：S10 — 后端加固 & 安全（上线前置）

**目标**：堵死审计两条安全红线（无鉴权、debug=True）+ 存档原子写/并发保护 + CORS/host 收敛 +
部署方案文档，达到「可安全部署为单人在线版」。**铁律照旧**：engine 纯净、依赖只向下、不破坏既有 305 测试与生产构建。

### 任务清单

- [x] **S10-T1｜存档接口鉴权（密码账号 + 会话 token）**
  - 目标：消灭「任意用户名免密读写任何人存档」。引入密码账号：首次用某用户名登录即注册（后端用 `werkzeug.security` 存盐哈希），登录成功签发会话 token；`GET/POST /api/user/data` 必须携带有效 token，token 解析出的用户名必须与被读写的存档用户名一致。
  - 涉及面：`backend/server.py`（新增 `/api/auth/login` 注册/登录 + token 签发与校验；读写接口加 token 闸）、`api/index.py`（同源加固，serverless 变体保持一致）、前端 `userStore.login` 改签名带密码、登录 UI 加密码框、`infra/persistence/api.ts` 读写带 `Authorization` 头。
  - 既有 passwordless 存档（`data/user_data/*.json` 现有 4 个）：**首次登录认领**——该用户名首次带密码登录时把密码哈希落盘归属该账号（claim-on-first-login），文档说明。
  - 验收：见「验收命令」中 `backend/test_security.py` 的鉴权断言全 PASS（未带 token 读 → 401；错密码 → 401；对密码 → 拿到 token；token 读写自己存档成功；用 A 的 token 写 B 的存档被拒）。

- [x] **S10-T2｜关闭 debug 模式**
  - 目标：`backend/server.py` 与 `api/index.py` 的 `app.run(debug=True)` → `False`（或经环境变量门控，默认 False）。生产不暴露 Werkzeug 调试器/代码执行面。
  - 验收：`grep -n "debug=True" backend/server.py api/index.py` 零命中；`backend/test_security.py` 断言 `app.debug is False`。

- [x] **S10-T3｜存档原子写 + 版本号 + 并发保护**
  - 目标：防「写入截断损坏」与「后写覆盖」。写存档改为**写临时文件 + `os.replace` 原子替换**（同目录）；payload 带 `saveVersion`（单调递增）；保存时若客户端基线版本 < 服务端当前版本 → 拒绝（409）防丢更新（前端已有 S5 保存串行合并兜单客户端，本任务堵多客户端/异常截断）。
  - 涉及面：`backend/server.py`、`api/index.py` 的 `save_user_data`；前端存档协议（`infra/persistence/schema.ts` + `migrations.ts` + `stores/persistence.ts` 装配器三处同改，加 `saveVersion` 字段，旧档迁移缺省为 1，**不破坏现有 v4 往返保真测试**）。
  - 验收：`backend/test_security.py` 断言——模拟写入中途异常后原存档仍完整可读（非截断）；旧版本号 POST 返回 409；新版本号 POST 成功。前端 `npm run test` 含 saveVersion 往返/迁移测试全绿。

- [x] **S10-T4｜CORS 收敛 + vite host/allowedHosts 收敛**
  - 目标：`api/index.py` 的 `CORS(app)`（当前全开）收敛为环境变量配置的允许源（默认本地开发源）；`vite.config.ts` 的 `host: '0.0.0.0'` / `allowedHosts: true` 收敛为默认本地、经环境变量可放开（保留隧道场景注释，不写死全开）。
  - 验收：`api/index.py` 不再裸 `CORS(app)` 无参全开；`vite.config.ts` 默认不再 `allowedHosts: true` 硬编码（改为可配置，默认收敛）；`npm run build` 通过、`npm run dev` 本地仍可起（type-check/build 不报错即可）。

- [x] **S10-T5｜部署方案文档（不实施）**
  - 目标：新建 `docs/部署方案.md`，写两条路径的要点清单（**不真正部署**）：①自部署（gunicorn/waitress + 反向代理 + 环境变量管密钥/CORS + debug off + 存档目录权限）；②Vercel serverless（复用 `api/index.py`，点明 `/tmp` 易失需接外部存储如 KV/Postgres，存档持久化要改）。文末给「单人在线版上线清单」对照本 sprint 已加固项。
  - 验收：`docs/部署方案.md` 存在且含①②两节 + 上线清单；`docs/README.md` 文档索引加一行指向它。

- [x] **S10-T6｜回归与防漂移收口**
  - 目标：全部「验收命令」绿；`docs/项目审计报告` 安全章节对应项可勾（无鉴权 / debug 两条红线已解）；FUTURE.md 的 S10 五项勾掉、进度总览 S10 标 ✅。
  - 验收：`npm run type-check` 0 错、`npm run test` 全绿、`npm run build` 通过、`python backend/test_security.py` 全 PASS；FUTURE.md S10 状态已更新。

---

## ✅ 验收命令

> Evaluator 必须**亲自重跑**以下每一条，记录实际输出。前端命令在 `frontend-vue/` 下跑；后端命令在仓库根跑（Windows PowerShell 环境，路径用反斜杠或正斜杠均可）。

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check

# 2. 前端测试（期望全绿，含新增的 saveVersion/auth 相关测试；不得低于既有 305）
cd frontend-vue && npm run test

# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build

# 4. 后端安全自检（自带 Flask test_client 的独立脚本，期望进程退出码 0 且打印全部 PASS）
#    覆盖：未带 token 读存档→401；错密码→401；对密码→签发 token；token 读写自己存档成功；
#    用 A 的 token 写 B 存档被拒；app.debug is False；原子写（模拟中途失败后原档不损坏）；旧版本号 POST→409
python backend/test_security.py

# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```

**通过标准**：命令 1/2/3/4 成功（4 的脚本退出码 0、全 PASS），命令 5 零命中，且 S10 全部 `[ ]` 已勾 `[x]`。

---

## 🔁 Evolution 第 1 轮追加任务（基于 Evolution 审计，2026-06-16）

> 主题：给"玩法齐全但没动机"的产品装**留存引擎**。取 reviewer 最高 ROI 组合 🔴-1+🔴-2 + 共享埋点的 🟡-3。

- [x] **E1-T1：每日任务 + 每日登录奖励**
  - 目标：新建 `stores/daily.ts`（跨天归零，复用 shop todayKey 模式）+ 主页「今日任务」面板；3-4 任务命中现有成功点（抽卡/赢对战/收观看/养成互动）做满发奖；每日登录一次性发放。
  - 验收：面板显示进度、玩法触发自增、做满领奖、跨天重置、登录奖励跨天再发；store 三件套 + 测试；进存档 v6 跨重开保真。
- [x] **E1-T2：图鉴/收集完成度 + 里程碑**
  - 目标：`CollectionsView` 加「图鉴」tab，各维度完成度（X/总数，`.length` 派生）+ 未拥有灰位（复用 VirtualGrid）+ 静态里程碑发奖（已领 id 进存档）。
  - 验收：完成度与灰位正确、里程碑可领且持久化、完成度纯派生、进存档 v6、特征测试。
- [x] **E1-T3：成就系统**
  - 目标：`stores/achievements.ts` + 成就墙；~15-20 条静态成就在同批成功点检测解锁，发徽章+奖励，存已解锁 id。
  - 验收：解锁+发奖+持久化、成就墙可见、特征测试。

**第 1 轮验收命令**：`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（≥310 全绿 + 新增）/ `npm run build`（通过）。

---

## 🔁 Evolution 第 2 轮追加任务（基于 Evolution 审计 Round 2，2026-06-16）

> 主题：让"图鉴"从只读面板进化成**全产品价值枢纽**。取 reviewer 最高 ROI 组合 🔴-1 经济出口 + 🟡-3 差异化数据。

- [x] **E2-T1：图鉴定向解锁（经济闭环）**
  - 目标：CodexPanel 灰位未拥有卡可花知识点直接解锁（addCard 入库）。userStore 加 `unlockCodexCard` 编排；定价静态表（config/codexUnlock.ts），**UR 远贵、阶梯递增、明显高于回收**，不架空抽卡。
  - 验收：解锁扣费+入库+完成度联动、余额不足/已拥有给提示不扣、走门面存档、无新 schema、三分支特征测试。
- [x] **E2-T2：真实评分/放送年可视化（差异化）**
  - 目标：CardDetailModal 加「番剧资料」区块——anime 显示真实评分/排名/放送年，character 显示作品数/人气；types/card.ts 补显式可选字段；字段缺失 v-if 守卫。
  - 验收：真实数据正确展示、缺失不显示、类型干净、颜色语义类、type-check/build 通过。

**第 2 轮验收命令**：`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（≥336 全绿 + 新增）/ `npm run build`（通过）。

---

## 🔁 Evolution 第 3 轮追加任务（收口轮，基于 Evolution 审计 Round 3，2026-06-16）

> 主题：把前两轮造的系统**让新人感知到、让老玩家带出去**。取 reviewer 最高 ROI 组合 🔴-1 onboarding + 🟡-2 成绩卡（都零后端）。

- [x] **E3-T1：新人 onboarding（FTUE 点火）**
  - 目标：首登引导遮罩（localStorage 触发，指向每日任务/抽卡/收藏/对战，可跳过）+ 首抽庆祝（GachaResultModal 叠特殊态）+ 空态 CTA（7 处死文字加引导按钮）。不进存档。
  - 验收：首登弹引导可跳过且不再弹、首抽有庆祝非首抽无、主要空态有 CTA、type-check/build 通过。
- [x] **E3-T2：可分享 Wrapped 成绩卡（传播喇叭）**
  - 目标：CollectionsView 标题栏一键生成可下载炫耀图（Canvas 聚合图鉴完成度/等级/成就数/塔进度/真实数据），纯前端零后端零存档。
  - 验收：入口可见、生成含真实成绩的 PNG 可下载（toBlob+a.download）、不引 html2canvas、颜色品牌一致、type-check/build 通过。
- [x] **E3-T3：收口杂项（文档纠偏）**
  - 目标：CLAUDE.md / pitfalls.md 的存档协议版本号 v4 → v6（实际值），免后续误判。
  - 验收：文档版本号与实际一致。

**第 3 轮验收命令**：`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（≥340 全绿）/ `npm run build`（通过）。

---

## 🔁 Evolution 第 4 轮（backlog 推进，tier1 off，2026-06-16）

> 推进 reviewer 前三轮提出但未做的 3 个 backlog 项（用户选定，声优收集跨栈项暂缓）。tier1 off：本节 `[ ]` 即需求源，目标驱动停。

- [x] **B1：周任务 + 连续登录递增**
  - 目标：扩 `stores/daily.ts`——加每周任务（weekKey 跨周重置，2-3 条如本周赢 5 场/抽 20 张/通塔 1 层）+ 连续登录天数 `loginStreak`（按 lastLoginDate 昨日判定递增、断签归 1）+ 递增登录奖励（第 N 天给更多）。静态定义放 config。升存档 **v6→v7**（DailySave 扩字段，schema/migrations/装配器三处同改 + 迁移 + 测试，只追加不破坏 v1~v6 断言）。
  - 验收：周任务跨周重置/做满领奖、连签递增与断签归 1、登录奖励随连签变化、进存档 v7 跨重开保真、特征测试。
- [x] **B2：番剧年表时间轴**
  - 目标：CollectionsView 加「年表」tab——把已拥有动画卡按放送年（`date` 字段，复用 evo-2 已展示的真实数据）分组成可视化时间轴（X 轴年份 1993→2025，每年拥有数/完成度）。纯派生、零后端、零存档。
  - 验收：年表按年正确分组展示拥有番剧、空态友好、纯派生（不新存字段）、颜色语义类、type-check/build 通过。
- [x] **B3：跨系统红点提示**
  - 目标：`App.vue` 侧边导航对「有奖可领/有新内容」的模块加红点角标——主页（每日任务可领/登录奖励可领）、卡牌收藏（图鉴里程碑达成未领 / 成就有新解锁未读）。daily/codex 可领态纯派生；成就「已读」态用 localStorage（设备级，仿 onboarding，不进存档），访问成就 tab 即标已读。
  - 验收：对应模块有奖可领/新解锁时亮红点、领取/查看后红点消失、成就已读用 localStorage 不升 schema、颜色语义类、type-check/build 通过。

**第 4 轮验收命令**：`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（≥354 全绿 + 新增）/ `npm run build`（通过）。

---

## 🎮 Evolution 第 5–9 轮（小游戏扩展 + 持续进化，`--mode evolution --max-iter 5 --tier1 on`，2026-06-17）

> 用户指令：用 `/product-loop` 跑 **5 轮 evolution**，探索新功能。**硬性交付（贯穿全程，前 2 轮务必完成）**：
> 把小游戏做成一个**统一的「🎮 小游戏」Tab/中心**，**把现有「🎭 猜角色」迁进去**，并**至少再扩展 2 个类似猜角色的小游戏**。
> tier1 on：Evolution Reviewer 每轮探索新功能（含竞品研究），Planner 选定，Generator 实装，Evaluator 独立验收，**跑满 5 轮**。

### 🔒 硬性交付（standing constraint，Planner 每轮检查直到满足）
- [x] **统一小游戏中心**：新建小游戏 Hub（建议路由 `/minigames`，导航项「🎮 小游戏」**取代**现有「🎭 猜角色」；`/guess` 保留为重定向兼容）。Hub 是游戏选择器 + 渲染选中的小游戏；现有 `GuessCharacter.vue`（501 行）原样迁入不重写。 ← **第 5 轮完成**（MiniGamesView + /minigames + /guess redirect + 导航换「🎮 小游戏」+ 猜角色原样迁入）
- [x] **新小游戏 #1**（前 2 轮内）：从下方菜单选一个真实现，进 Hub，接经济（猜对/达标走 `profile.earn` 给知识点，仿 `submitGuess`）+ 最高分持久化（存档协议同改三处或并入 guess 域）。 ← **第 5 轮完成 = 高低牌 Higher/Lower**（角色人气/番剧口碑/番剧年代三维度，连胜里程碑发奖+每日封顶，存档 v8 minigames 域）
- [x] **新小游戏 #2**（前 2 轮内）：再选一个，进 Hub，同样接经济 + 持久化。**至此 Hub 内 ≥3 个游戏（猜角色 + 2 新）= 硬性交付达成。** ← **第 6 轮完成 = 番剧问答 Quiz**（4 类真实数据派生题，连答里程碑发奖，与高低牌共享每日封顶，存档 v9 minigames.quiz）。**硬性交付达成：Hub 内 3 游戏（猜角色 + 高低牌 + 问答）。**

### 🍱 接地可行的小游戏菜单（Reviewer 可提新创意，但这些已验证数据/技术可行，纯前端零后端）
- **高低牌 Higher/Lower**：给两张卡，猜谁评分/人气/放送更高/更早（用真实 `rating_score`/`popularity_score`/`date`）。连对计 streak，错即结算。极易上瘾、复用真实数据、零图片依赖。
- **番剧问答 Quiz**：4 选 1 选择题（「X 角色出自哪部番剧」「这部番剧哪年放送」「下列谁评分最高」），题库从真实数据派生。
- **猜番剧（剪影/像素）**：复刻猜角色的像素化机制，但猜动画封面（`/data/images/anime/{id}.jpg`）。与猜角色对称，组件可大量复用。
- **记忆翻牌 Memory Match**：番剧封面配对翻牌，计时/步数计分。视觉型，复用卡图。
- **年代排序**：拖 4 张番剧按放送年排序（用 `date`）。复用 evo-4 年表的数据思路。

### 🧭 轮次意图（Planner 可据 Reviewer 报告调整，但硬性交付优先）
- **第 5 轮**：小游戏 Hub 地基 + 猜角色迁入 + 新游戏 #1（建议高低牌）。
- **第 6 轮**：新游戏 #2（Reviewer 选定）。**硬性交付达成。**
- **第 7–9 轮**：Evolution Reviewer 自由探索更广的新功能并实装——可以是更多小游戏、小游戏与每日任务/成就的联动（如「每日小游戏挑战」）、小游戏积分榜/统计、或别的产品进化方向。每轮取最高 ROI。

### 通用约束（全 5 轮）
- 架构铁律不破：engine 纯净、依赖只向下、颜色语义类（禁 text-white 压浅底/禁动态色类）。游戏逻辑放 store/纯函数，可注入 RNG 更佳（便于测试）；现有 guess 在 store 内 `Math.random` 是既有先例，新游戏纯逻辑尽量抽纯函数 + 注入 RNG 并配特征测试。
- 经济安全：奖励只走 `profile.earn`；别造可刷分无上限的经济漏洞（设每日上限或递减，仿猜角色 score÷2）。
- 存档：新游戏最高分/统计若要持久化，按既有「三处同改 + 迁移 + 测试」升 schema（现 v7）。设备级 UI 偏好用 localStorage。
- 验收命令（每轮）：`cd frontend-vue && npm run type-check`（0 错）/ `npm run test`（全绿 + 新增）/ `npm run build`（通过）。截图工具在本环境失效，UI 验证靠 type-check/build + 运行期 DOM eval（live 起服务后 `preview_eval` 读 innerText）。

---

## 📦 Backlog（决策门控，**本轮未激活**，勿当作 `[ ]` 执行任务）

> 以下是 FUTURE.md S11/S12 的拆分，**仅作路线参考**。它们是「演进/终点」方向，FUTURE.md 明确标注
> 「到达时再 `/think` 细化，依赖届时的决策」。**未列为 `[ ]` 是有意为之**——一个 product-loop 周期
> 无法完成整库 React 迁移或多人后端；激活前需单独 `/think` 立项并把当时确定的子任务搬到上面的活动区。

### S11 — React 视图迁移（演进，前置依赖：S2–S5 的 engine 已干净 ✅）

子任务草拆（待 `/think` 细化）：
1. React 应用骨架，直接复用 `engine / types / config / data / infra`（零改动复用率是验收点）。
2. 状态层重写：Pinia → Zustand / Jotai（仍是「薄编排」，不把规则写回视图层）。
3. `views` / `components` 按 8 个模块逐页用 React 重写。
4. 对照功能逐页验收（与 Vue 版行为对齐）。
- **决策门**：状态库选型（Zustand vs Jotai）、路由方案、构建工具、是否双栈并存过渡。

### S12 — 权威后端 & 多人/PvP/排行榜（终点）

子任务草拆（待 `/think` 细化）：
1. `engine` 提升为前后端共享包（monorepo）。
2. Node 权威服务端（战斗/抽卡服务端计算，客户端预测）。
3. 排行榜（战绩/收集进度）。
4. PvP 匹配 + 对战。
- **决策门**：数据库选型、匹配机制、客户端预测/回滚策略、反作弊（RNG 服务端权威——S1 起 engine 已做 RNG 可注入正是为此铺路）。

---
*创建于 2026-06-16，由 `/goal` 把 FUTURE.md 剩余任务拆分而来。活动 sprint 完成后更新 FUTURE.md 对应勾选与进度总览。*
