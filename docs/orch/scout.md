# Scout Report — Iteration 1

> 方向来源：docs/SPRINT.md「当前活动 Sprint：S10」六个 `[ ]` 任务（T1 鉴权 / T2 debug / T3 原子写+版本 / T4 CORS+vite / T5 部署文档 / T6 收口）。Backlog S11/S12 不接地。
> 接地由 orchestrator 直接完成（首个 Scout subagent 因 socket 掉线，已用已读到的源码补全；以下路径与行号均亲自核对）。

## A. 约束与可行性（给 Planner —— 影响 WHAT/范围）

- **T1 鉴权（密码账号 + 会话 token）**：可行性 = **直接可做，零新依赖**。
  - 理由：`backend/requirements.txt` 已含 `Flask==2.3.2`（自带 `werkzeug.security.generate_password_hash/check_password_hash`）与 `flask-cors==4.0.0`；Flask 还自带 `itsdangerous`（可签发无状态 HMAC token，serverless 多实例也成立，无需服务端 session 存储）。前端登录面**极小**：全仓只有 **App.vue 一个 `userStore.login()` 调用点**，传输层只有 `infra/persistence/api.ts` 两个函数。
  - 对规划的建议：拆成「后端账号/登录/token 闸」+「前端登录 UI 加密码框 + 传输层带 token」两半，但同属一个验收（test_security.py）。**凭据必须独立存储**（如 `data/auth/credentials.json`，username→hash），**不能塞进 user_data 存档文件**——存档由客户端 payload 全量覆盖写，塞进去客户端就能篡改 auth。token 用 `SECRET_KEY` 环境变量签名，默认值仅供本地开发。
  - 兼容：现有 4 个 passwordless 存档（Aririg/Aririgi/Ash/caocaoxu）走 **claim-on-first-login**——该用户名在 credentials 里不存在时，本次登录带的密码即注册为其密码。

- **T2 debug 关闭**：可行性 = **直接可做（一行 ×2）**。`backend/server.py:252` 与 `api/index.py:65` 的 `debug=True`。建议改为 `debug=os.environ.get("FLASK_DEBUG")=="1"`（默认 False），保留本地按需开。

- **T3 原子写 + 版本号 + 并发**：可行性 = **两半，难度不同**。
  - 原子写（temp + `os.replace` 同目录）：**后端独立、低风险、先做**——这是「写入截断损坏」的真正修复。
  - saveVersion 乐观并发：**涉及前端存档协议三处同改 + 迁移/往返测试**，风险点见 B 段。建议范围：后端在凭据/存档侧维护一个**服务端权威版本计数**，存档落盘时连同保存；POST 带客户端基线版本，`基线 < 服务端当前` → 409。前端 `buildPayload` 带上从 load 时记下的版本、保存成功后递增。**注意别和 schema 里已有的 `version`（=SAVE_VERSION=4，协议版本）混淆**——saveVersion 是「第几次保存」的单调计数，是不同的东西。
  - 对规划的建议：T3 先交付原子写（必过验收），saveVersion 并发作为同任务第二步；若 saveVersion 触发往返测试回归且短期难平，可把「乐观并发 409」降级为后端版本计数 + 原子写已足够防损坏，409 留作增强（但 SPRINT 验收里写了 409，尽量做出来）。

- **T4 CORS + vite 收敛**：可行性 = **直接可做**。`api/index.py:7` 的 `CORS(app)` 全开 → 收敛为环境变量 `ALLOWED_ORIGINS`（默认本地源）。`vite.config.ts` 的 `host:'0.0.0.0'` / `allowedHosts:true` → 默认收敛、env 可放开。**坑**：vite 改动只影响开发服务器，别误伤 proxy（/api、/data → 5001 必须保留）；host 收紧会断 LAN/隧道访问，故必须 env 可放开 + 保留注释。

- **T5 部署文档**：可行性 = **直接可做（纯文档）**。新建 `docs/部署方案.md`，`docs/README.md` 加索引行。用户决策＝「只加固不实施」，两条路径都只列要点，不真部署。

- **T6 收口**：可行性 = **直接可做**。跑全部验收命令、勾 SPRINT、更新 FUTURE.md S10 → ✅、审计报告安全章节对应项标记已解。

## B. 代码地图与坑（给 Generator —— HOW 接地）

- **T1/T2/T3/T4 后端**
  - 相关文件：
    - `backend/server.py` —— 本地服务（端口 5001）。`get_user_filepath`(55, `username.isalnum()` 白名单)、`get_user_data` GET(62-78)、`save_user_data` POST(81-97, **当前非原子** `open(w)+json.dump`)、`app.run(debug=True, port=5001)`(252)。同时服务前端静态资源与 `/data/*` 图片。
    - `api/index.py` —— Vercel serverless 变体。`CORS(app)`(7 全开)、`USER_DATA_DIR="/tmp/user_data"`(11, **易失**)、同名 GET(22)/POST(40)、`debug=True`(65)。**鉴权/debug/原子写三件事两个文件都要改，保持一致**。
    - `backend/requirements.txt` —— Flask 2.3.2 / flask-cors 4.0.0 / flask-compress 1.24。**无需加依赖**（werkzeug、itsdangerous 随 Flask）。
    - `backend/` 无测试基建（仅 `test.ipynb`）。**新建 `backend/test_security.py`**：用 `app.test_client()` 自包含跑，`if __name__=="__main__"` 里跑断言、全过 `print("PASS")`+`sys.exit(0)`、任一失败 `sys.exit(1)`。覆盖 SPRINT 验收命令 4 列的 8 项。脚本须用临时 USER_DATA_DIR/credentials（别污染 `data/user_data` 真实存档）——可通过 monkeypatch 模块级路径常量或环境变量指向 tempdir。
  - 现有架构/数据流：登录态全在前端 `profile.currentUser`（内存，刷新即清，用户每次重登）。后端无会话概念，纯按 username 读写文件。token 方案要让后端从 `Authorization: Bearer` 解析出 username，与请求里的 username 比对。
  - 注意的坑：① 别破坏 `isalnum` 用户名白名单（防路径穿越）；② 新增 `/api/auth/login` 路由要同时支持「注册（首次）」与「登录（校验 hash）」；③ 凭据文件读写也要原子 + 目录自动创建；④ serverless 的 `/tmp` 重启即丢凭据——文档里点明（T5）。

- **T1/T3 前端鉴权 + 协议**
  - 相关文件：
    - `frontend-vue/src/App.vue` —— 登录 UI。`usernameInput` ref(11)、`handleLogin()`(13-18)→`userStore.login(usernameInput.value)`、模板 `<input v-model="usernameInput" @keyup.enter="handleLogin">`(72-74)+登录按钮(81)。**加一个密码 `<input type="password">` + 改 handleLogin 传两个参**。用语义类/`.input-control`/`.btn-primary`，禁 text-white 压浅底。
    - `frontend-vue/src/stores/userStore.ts` —— `login(username)`(53-60, 校验 `^[a-zA-Z0-9]+$`→设 currentUser→`loadFromServer()`)、`logout()`(62-67)。**login 改签名带 password**，登录失败（401）要给用户反馈且不进入登录态。
    - `frontend-vue/src/infra/persistence/api.ts` —— **全仓唯一** `fetch /api/user/data` 处。`fetchUserSave`(13)、`pushUserSave`(21)。**token 只在这一层挂**（加 `Authorization` 头）；需要一个模块级 token holder（login 成功时 set，logout 清）。再加一个 `loginRequest(username,password)` 调 `/api/auth/login` 拿 token，或把它放 userStore 编排。
    - `frontend-vue/src/stores/persistence.ts` —— `saveToServer`(105)/`loadFromServer`(126) 经 `pushUserSave/fetchUserSave`。`buildPayload`(20) 装配 payload、`applyPayload`(52) 分发。saveVersion 若进 payload 在此装配/读取。**保存串行合并已存在**(101-123)，别破坏。
    - `frontend-vue/src/infra/persistence/schema.ts` —— `SAVE_VERSION=4`(20)、`SavePayload`(50, 已有 `version` 字段=协议版本)。
    - `frontend-vue/src/infra/persistence/migrations.ts` + `migrations.test.ts` —— 迁移链 + **往返保真测试**。`frontend-vue/src/stores/persistence.test.ts` —— buildPayload⇄applyPayload 往返测试。
  - 现有架构/数据流：login→设 currentUser→loadFromServer→fetchUserSave(GET)→migrate→applyPayload。保存：动作→saveToServer→（串行合并）→buildPayload→pushUserSave(POST)。
  - 注意的坑：① **saveVersion ≠ schema `version`**，新增字段要 schema+migrations+persistence.ts 三处同改 + 给旧档迁移默认值(如 1) + 更新 persistence.test/migrations.test 的往返期望，否则 305 测试回归；② token holder 别用 localStorage 也行（刷新重登是现有行为），但若要「刷新保持登录」需 localStorage + 启动自动校验，**本轮不强求**，保持最小；③ login 失败路径：401 时 currentUser 不能被设上、要清理，避免半登录态；④ 颜色规则：密码框沿用 `.input-control`，禁 `text-white`、禁拼接动态色类。

- **T5 文档**
  - 相关文件：`docs/部署方案.md`（新建）、`docs/README.md`（加索引行）、`docs/项目审计报告-2026-06-12.md`（T6 时安全章节标记已解）、`docs/FUTURE.md`（T6 勾选 + 进度总览 S10→✅）。

## C. 新发现的坑（待 Sprint 结束追加到 pitfalls.md）
- [鉴权] 凭据**绝不能**存进 user_data 存档文件——该文件由客户端 payload 全量覆盖写，存进去等于把密码哈希交给客户端改。必须独立凭据存储（`data/auth/credentials.json` 之类），后端权威，客户端永不可见。
- [并发] schema 已有 `version`（协议版本=4）字段，新加的 saveVersion（保存计数）是另一回事，命名/语义务必区分，别复用同一个字段做两件事。
- [serverless] `api/index.py` 的 `/tmp` 易失：凭据与存档在 Vercel 重启即丢，无状态 token（itsdangerous 签名）能跨实例但凭据落 `/tmp` 仍不持久——T5 文档必须点明 serverless 需接外部存储（KV/Postgres）才能真上线。
- [测试基建] 后端首次引入测试脚本，约定用 Flask test_client 自包含（退出码 + PASS/FAIL 打印），不引 pytest，便于 Evaluator 一条 `python backend/test_security.py` 复验；脚本须用 tempdir 隔离，别写真实存档目录。
