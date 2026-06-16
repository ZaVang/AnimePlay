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
