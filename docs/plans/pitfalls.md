# Pitfalls 知识库

> product-loop / multi-ralph 全角色必读。踩过的坑追加在此，避免重复。

## 架构铁律（违反 = lint 闸拦死，见 FUTURE.md 顶部）
- **engine 纯净**：`frontend-vue/src/engine/` 零 Vue/Pinia/DOM/fetch/localStorage/`Math.random`。鉴权/网络/存档 IO 绝不能写进 engine——属于 `infra/persistence` 与 stores 编排层。
- **依赖只向下**：`views → components → stores → engine`。下层不 import 上层。
- **RNG 可注入**：engine 内随机源靠注入，别直接调 `Math.random()`。

## 存档 / 持久化
- 存档协议当前 **v12**（v4=皮肤装扮、v5=saveVersion 乐观并发、v6=每日任务/图鉴里程碑/成就、v7=周任务/连签、v8=高低牌、v9=Quiz、v10=每日挑战、v11=每日挑战 streak、v12=tasteProfile 持久化）。**权威值在 `infra/persistence/schema.ts:30 SAVE_VERSION`——文档只指向不复述**（此条曾从 v6 漂到 v12，引用集中到 schema.ts 避免再漂）。新增字段必须**三处同改**：`infra/persistence/schema.ts` + `migrations.ts` + `stores/persistence.ts` 装配器，并补迁移测试（旧档缺省值），**不破坏现有往返保真测试**（`migrations.test.ts`）。
- 前端已有 **S5 保存串行合并**（同一时刻至多一个写请求，连发坍缩为一次）——堵的是单客户端并发。后端写文件仍**非原子**，多客户端/异常截断要靠后端原子写（temp + `os.replace`）解决，这正是 S10-T3。
- 全仓唯一与 `/api/user/data` 对话的地方是 `infra/persistence/api.ts`——加鉴权头只改这一处传输层，别散到各 store。

## 后端
- 两个后端变体：`backend/server.py`（本地，端口 5001）与 `api/index.py`（Vercel serverless，`/tmp` 易失）。鉴权/debug/原子写**两处都要改**，保持一致，否则 serverless 部署仍有洞。
- 用户名校验现为 `username.isalnum()`（后端）/ 前端 `^[a-zA-Z0-9]+$`。加鉴权别破坏这个白名单（防路径穿越）。
- 现有 4 个 passwordless 存档（`data/user_data/*.json`）：鉴权方案需「首次登录认领」兼容，别让老存档登不进去。
- 后端目前**无测试基建**（只有 `test.ipynb`）。新增 `backend/test_security.py` 用 Flask `app.test_client()` 自包含跑（退出码 0/1 + 打印 PASS/FAIL），不引入 pytest 依赖，便于 Evaluator 一条命令复验。

## 前端工程
- 测试用 `npm run test`（vitest）。**不要跑 `npm run lint`**（带 `--fix` 会全仓重排）；单文件用 `npx eslint <path>`。
- 验证含 `npm run build`（type-check + 生产构建），S7 起纳入。改鉴权别让 build 挂。
- 颜色规则：界面色用语义类（`bg-surface/text-ink/accent`）或 `rgb(var(--c-*))`，登录框加密码字段时沿用，**禁止 `text-white` 压浅底、禁止拼接动态颜色类**。

## product-loop 通信
- 本 sprint 合同在 **`docs/SPRINT.md`**（非默认 `docs/plans/SPRINT.md`），启动带 `--sprint docs/SPRINT.md`。
- 本 sprint 用 `--tier1 off`（人写的 SPRINT 当需求源，目标驱动停），无 Reviewer 审计报告、无 negotiation.md。

## S10 沉淀（2026-06-16 完成后追加）
- [依赖] `requirements.txt` 只钉 Flask 不钉 Werkzeug → fresh install 拉 Werkzeug 3.x（移除 `__version__`）与 Flask 2.3.2 不兼容（test client 炸）。**Flask 与 Werkzeug 必须成对钉版本**（已钉 Werkzeug==2.3.8）。
- [鉴权] 凭据存 `data/auth/credentials.json`（werkzeug 盐哈希），**绝不进 user_data 存档**（客户端 payload 全量覆盖写=可篡改 auth）。token 用 itsdangerous 无状态签名（SECRET_KEY env），serverless 多实例也成立。
- [鉴权] 读写存档的 token 闸：从 `Authorization: Bearer` 解析 username，须 == 目标存档 username，否则 401。前端 token 只挂 `infra/persistence/api.ts` 一层；login 失败要清半登录态。
- [并发] saveVersion（保存计数，乐观并发）≠ schema `version`（协议版本，现 12，权威在 `infra/persistence/schema.ts:30`）。后端权威递增、客户端基线 ≠ 服务端当前 → 409；前端 `currentSaveVersion` 随 load/save 更新。
- [原子写] 存档/凭据落盘用 `mkstemp + fsync + os.replace`（同目录），别用 `open(w)` 直接覆盖（写中断留损坏 JSON）。
- [测试] 后端自检 `backend/test_security.py` 用 Flask test_client + tempdir + env（USER_DATA_DIR/AUTH_CREDENTIALS_PATH/SECRET_KEY）隔离，不引 pytest、不写真实 data/。跑它用 `./.venv/Scripts/python.exe`（系统 python 没装 Flask 依赖）。
- [orch] 长跑 subagent（Scout/Generator）在本机偶发 socket 掉线；掉线后 git diff 可见已改动，orchestrator 可接管续做，不必整轮重来。

## Evolution 三轮沉淀（2026-06-16，经 /product-loop --mode evolution）
- [留存埋点] 「基于玩法事件」的新功能（任务/成就/统计）统一挂在 6 个玩法成功点：5 个在 `userStore` 编排函数（drawCards/collectFromViewingQueue/养成 withSave/submitGuess/completeFloor）的现有 saveToServer() 前，**对战胜利唯独在 `battleFlow.endGame` 的 isLoggedIn 块内、winner==='playerA' 时**（不在 userStore，易漏）。新功能复用这套埋点，别再改编排函数。
- [图鉴派生] 完成度是从 `collection`（已拥有 Map）⊆ `gameDataStore.allXxxCards`（全量）纯派生的 computed，**总数一律 `.length`/filter 不硬编码 665**（数据会增减）。"拥有"用 collection 计数不用 favorite。
- [经济出口] 图鉴定向解锁定价（`config/codexUnlock.ts`）须守"UR 远贵、阶梯递增、明显高于分解回收"——别便宜到架空抽卡。解锁流：`spend('knowledgePoints')` 成功才 `addCard`，余额不足/已拥有拒绝（经济安全）。
- [设备级状态] onboarding 首登标志用 **localStorage**（设备级，仿 theme.ts try/catch），不进存档、不升 schema——不是所有"记住一次"都要进存档协议。
- [纯前端出图] 成绩卡/分享图用标准 Canvas（`toBlob`+`createObjectURL`+`a.download`+`revokeObjectURL`），**别引 html2canvas**；首版别嵌远程封面图（cross-origin canvas taint 会让 toBlob 抛错）。聚合逻辑抽成纯函数（`wrapped/buildWrappedStats.ts`，零 Vue/Pinia/DOM）便于单测。
- [真实数据] 卡数据有 Bangumi 真实 `rating_score/rating_rank/date`（anime）、`anime_count/popularity_score`（character），`BaseCard` 有 `[key]:any` 索引签名故裸读不报错，但补显式可选字段（types/card.ts）更安全。**声优数据 `main_characters[].actors` 被 `server.py` 服务时剥离，前端拿不到**——声优维度需后端配合。

## Product-Loop 5 轮沉淀（2026-06-24，`--mode all --max-iter 5`，"收集→策展番剧人格"主线，全程零存档）
- [未定义令牌双形态] 「不报错但默默坏色/丢圆角」的静默缺陷有两种形态都要查：scoped CSS 里 `var(--c-ink-soft)`（未定义变量）**和** 模板工具类 `text-ink-soft`（未定义 Tailwind 工具类，config 只映射 `ink/ink-2/ink-3`）。审色时**两种 grep 都跑**。真令牌：`--c-line`（非 --c-border-line）、`--c-ink-2/-3`（非 --c-ink-soft）、`--sk-radius-panel/-control`（裸 `--sk-radius` 未定义、但有 fallback 只丢圆角不坏色）。
- [硬色连根拔] 养成/挑战塔簇硬编码色债的根因是 `bondLevel`/`moodStatus` 调色板在多文件重复定义（CharacterProfile + CharacterSelector + InteractionPanel）。正确姿势=抽**共享语义令牌色映射**（`config/nurtureColors.ts` 纯函数）统一消费，**整函数重写**，别逐处 grep-replace（partial-migration 陷阱：部分档已半语义化，逐处替换会留半语义半硬色、复发）。5 套皮肤都定义 accent/warning/success/danger/info/highlight，足够映射这些语义。rarity 渐变/danger 实底白字属固定例外。
- [统一弹窗] 项目原**无通用 Modal/Dialog 组件**，原生 `confirm()/alert()` 18 处散落。统一弹窗（`composables/useDialog.ts` Promise 形态 + `components/AppDialog.vue` App 顶层，语义令牌 + Esc/Enter）须**新建**。替换时注意 2 个同名局部函数（CardSelectionModal/TypeSelectionModal 的 `confirm()`）不是原生调用别动。
- [共享门面收重复] 4 处「定向解锁确认」逐字重复——抽 `composables/useUnlockConfirm.ts`（**须带 `domain` 参数**，CodexPanel 是双域）让替换从改 4 处变改 1 处。门面以 store `unlockCodexCard(id,domain)` 的 `{ok,error}` 返回为准，**别双重守卫**（store 已内建余额/已拥有校验）。
- [看过双源统一] 曾有两套互不相通的「看过」：`viewing.watchedAnime`（观看队列写→首页读）与 `minigames.tasteWatchedIds`（品味画像写→人格/推荐读）。统一**靠消费端纯派生 union computed**（`composables/useWatchedAnime.ts`，两 store 不互 import），写侧不动、**零升档**——不是所有"统一真相源"都要升 schema。详情看过开关的**显示态读 union、写仍走 `toggleTasteWatched`（写手动集）**，否则图鉴印章/详情口径打架。
- [推荐排除契约] `recommendFromSeeds` 默认只排种子本身——做"为你推荐"必须传 `excludeIds = 已拥有∪已看`，否则把已有的番推回去破坏契约。
- [图表不进 Canvas] vue-chartjs（雷达/柱图）是 **DOM 组件，绝不能塞进 ShareCard 的手绘 Canvas 出图**（`toBlob` 会坏）。雷达只注入屏幕渲染区（报告页/主页 chip）。chartjs **datalabels 全局已注册，雷达数据集需 `datalabels:{display:false}`** 否则顶点糊数字；注册/用法仿 `GachaHistory.vue` 样板（chart.js@4.5 + vue-chartjs@5.3 已是直接依赖）。
- [展示墙非待办地狱] 完成度类长线系统（题材集册）做**纯派生展示墙**：完成度+段位纯派生、**不发奖/不记已领/不持久化、绝不复用图鉴里程碑领取制 `claimedMilestones`**（复用=升 schema）。按 persona 专精轴（`buildTasteReport().topTags`）排序、不强制集满、无 FOMO 倒计时——否则触发 completionist burnout。集册蓝图=复用 `codex.completionFor().byRarity` 切桶纯派生换 `byGenre`。
- [题材桶剔噪] 题材集册/标签聚合的桶 keys 用**剔噪版** `contentIndex.tagToAnime.keys()`（已记忆化，过滤 日本/TV/OVA/漫画改 噪声），**别用** `CodexPanel` 的裸 `allAnimeTags`（会冒「TV 集册」废桶）。968 可玩池剔噪后只 ~35 个真题材标签（非几百），按桶规模取前 15-22 即可，无需复杂稀疏过滤。
- [保底现状] 抽卡**只有 70 硬保底**（`gameConfig.ts`，`gachaStore.animePity/.characterPity.pullsSinceLastHR`），**没有软保底**——保底进度做单条进度条即可，别造不存在的软保底 UI。软保底/carry-over/心愿单要升 schema，属独立轮次。
- [嵌套 modal 陷阱] `RecommendationStrip` 自带 `CardDetailModal`，"相似作品"**不可**在详情里直接嵌它（会叠三层 modal）——走**详情页内导航/替换内容**（CardDetailModal 用 `viewCard` ref 替换 `props.card` 驱动派生）。
- [setTimeout 假安全] `onUnmounted` 只清 `setInterval` 不清 `setTimeout` = false safety。所有 setTimeout/setInterval 必须登记数组 + onUnmounted 清除（仿 SquadBattleView `schedule()`）。NurtureActions 曾漏一个 60min setTimeout。
- [存档进存档字段勿删] `genreProgress` 是进存档字段（player.ts/viewing.ts/migrations.ts 四处），"显示源收口"只能改消费端读源（改读 `buildTasteReport().topTags`），**删字段=升档**。
- [文档版本漂移] 存档版本号以 `schema.ts` 顶部 `SAVE_VERSION` 为唯一权威（现 **v12**）。曾经 CLAUDE.md 漂到 v11、pitfalls.md 漂到 v6。文档**引用 schema.ts:30 别复述版本号**，免再漂。
- [设备级轻意图层] 「正在追」Pin 用设备级 localStorage（`stores/watchingPins.ts`，仿 onboarding try/catch，MAX_PINS 上限），不进存档——规避重 wishlist 升 v13 的成本，拿 80% 留存价值。
- [JSDoc 别写 Tailwind opacity] `bg-*/20` 这类含 `*/` 的字面量写进 `/** */` 块注释会提前闭合注释。
- [orch 提交边界] product-loop 多轮在分支上层层叠加未提交改动（orchestrator 不每轮 commit）——后一轮 Generator 会看到前轮未提交产物，属正常累积非脏树。提交/合并由 orchestrator 收尾或用户决定。
