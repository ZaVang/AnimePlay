# Pitfalls 知识库

> product-loop / multi-ralph 全角色必读。踩过的坑追加在此，避免重复。

## 架构铁律（违反 = lint 闸拦死，见 FUTURE.md 顶部）
- **engine 纯净**：`frontend-vue/src/engine/` 零 Vue/Pinia/DOM/fetch/localStorage/`Math.random`。鉴权/网络/存档 IO 绝不能写进 engine——属于 `infra/persistence` 与 stores 编排层。
- **依赖只向下**：`views → components → stores → engine`。下层不 import 上层。
- **RNG 可注入**：engine 内随机源靠注入，别直接调 `Math.random()`。

## 存档 / 持久化
- 存档协议当前 **v6**（v4=皮肤装扮、v5=saveVersion 乐观并发、v6=每日任务/图鉴里程碑/成就）。新增字段必须**三处同改**：`infra/persistence/schema.ts` + `migrations.ts` + `stores/persistence.ts` 装配器，并补迁移测试（旧档缺省值），**不破坏现有往返保真测试**（`migrations.test.ts`）。
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
- [并发] saveVersion（保存计数，乐观并发）≠ schema `version`（协议版本，现 6）。后端权威递增、客户端基线 ≠ 服务端当前 → 409；前端 `currentSaveVersion` 随 load/save 更新。
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
