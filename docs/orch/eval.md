# Evaluator Report — Iteration 1

> 独立验证 S10（后端加固 & 安全）。不信任 Generator 自报，所有验收命令亲自重跑（前端在
> `frontend-vue/`，后端用项目 venv `./.venv/Scripts/python.exe`）。验证时间 2026-06-16。

## Checkbox 状态

`docs/SPRINT.md` S10 六项任务全部已勾：

| 任务 | 状态 | 说明 |
|---|---|---|
| S10-T1 存档接口鉴权（密码账号 + 会话 token） | `[x]` | line 28 |
| S10-T2 关闭 debug 模式 | `[x]` | line 34 |
| S10-T3 存档原子写 + 版本号 + 并发保护 | `[x]` | line 38 |
| S10-T4 CORS 收敛 + vite host/allowedHosts 收敛 | `[x]` | line 43 |
| S10-T5 部署方案文档（不实施） | `[x]` | line 47 |
| S10-T6 回归与防漂移收口 | `[x]` | line 51 |

FUTURE.md 进度总览 S10 = ✅「已完成」（line 39），且有「S10 — 后端加固 & 安全（已完成 2026-06-16）」详情段（line 238）。

## 验收命令重跑结果

全部由 Evaluator 亲自运行，真实输出如下：

| # | 命令 | 期望 | 实际 | 结论 |
|---|---|---|---|---|
| 1 | `npm run type-check` | 0 错 | `TYPECHECK_EXIT=0`（vue-tsc 0 错误） | ✅ |
| 2 | `npm run test` | 全绿，≥305（应 310） | `Test Files 25 passed (25) / Tests 310 passed (310)`，`TEST_EXIT=0` | ✅ |
| 3 | `npm run build` | 成功 | `✓ built in 10.00s`，`BUILD_EXIT=0` | ✅ |
| 4 | `./.venv/Scripts/python.exe backend/test_security.py` | 退出码 0 + RESULT: PASS | 19 断言全 PASS，`RESULT: PASS — all security checks passed`，`SECTEST_EXIT=0` | ✅ |
| 5 | `grep -rn "debug=True" backend/server.py api/index.py` | 零命中 | 两文件均 `No matches found` | ✅ |

命令 4 完整逐项（亲自跑）：
```
PASS  server.app.debug is False
PASS  GET without token → 401 (got 401)
PASS  alice first login (register) → 200 (got 200)
PASS  alice got a token on register
PASS  wrong password → 401 (got 401)
PASS  correct password → token
PASS  POST own save with token → 200 (got 200)
PASS  POST returns saveVersion=1
PASS  GET own save with token → 200 (got 200)
PASS  GET reflects saveVersion=1
PASS  bob register → 200
PASS  A token writing B's save → rejected (got 401)
PASS  A token reading B's save → rejected (got 401)
PASS  stale saveVersion POST → 409 (got 409)
PASS  correct saveVersion POST → 200 saveVersion=2 (got 200)
PASS  alice save intact before failure sim
PASS  atomic_write_json raised on simulated failure
PASS  original save unchanged & fully readable after failed write
PASS  no temp file leftovers after failed write
RESULT: PASS — all security checks passed
```

## Generator 报告 vs 实际对比

| 项目 | Generator 自报（gen_status.md） | Evaluator 实测 | 一致？ |
|---|---|---|---|
| type-check | EXIT=0 | EXIT=0 | ✅ 一致 |
| test | 25 files / 310 tests passed | 25 files / 310 tests passed | ✅ 一致 |
| build | ✓ built in 10.12s | ✓ built in 10.00s（构建时长本就随机波动，无意义差异） | ✅ 一致 |
| security test | RESULT: PASS，19 断言 | RESULT: PASS，19 断言 | ✅ 一致 |
| debug grep | 零命中 | 零命中 | ✅ 一致 |

无夸大、无遗漏。自报与实测完全吻合。

## pitfalls 合规检查

逐条对照 `docs/plans/pitfalls.md`：

- **凭据不进存档文件**：✅ `backend/auth.py` 把哈希落在 `data/auth/credentials.json`（独立文件）；对 `data/user_data/*.json` 4 个存档全文 grep `password|credential|password_hash|pbkdf2|scrypt`（忽略大小写）= 零命中。存档不含任何凭据字段。
- **saveVersion ≠ 协议 version**：✅ schema 注释明确「saveVersion（保存计数）≠ version（协议版本=5）」；`SAVE_VERSION = 5`，saveVersion 是独立的单调计数字段，后端权威递增。
- **不跑 npm lint --fix**：✅ 全程未运行 `npm run lint`；只跑 type-check / test / build。
- **存档字段三处同改**：✅ `infra/persistence/schema.ts`（v5 + saveVersion 字段）+ `migrations.ts`（缺省补 0）+ `stores/persistence.ts`（装配器 `currentSaveVersion` 基线随 load/save 更新）三处齐改，并有 `migrations.test.ts` 新增用例锁定（缺失补 0 / 原样保留 / 非整数回落 0）。未破坏既有 v4→v5 往返测试（310 全绿）。
- **两后端变体一致**：✅ `backend/server.py` 与 `api/index.py` 的鉴权/debug/原子写/saveVersion 逻辑同源（共用 `backend/auth.py`），serverless 变体不留洞。
- **用户名白名单不破坏**：✅ `auth.is_valid_username` 仍是 `username.isalnum()`，与读写存档同一套防路径穿越白名单。
- **鉴权头只改 api.ts 一处**：✅ `infra/persistence/api.ts` 模块级 token holder + `authHeaders()`，未散到各 store。

## 代码安全属性抽查

亲自 Read 源码核实四项关键属性真实存在（非仅测试绿）：

1. **token 闸（两入口）**：✅ 真实存在。
   - `backend/server.py` GET `/api/user/data`（line 98-100）与 POST（line 138-140）：`authed = _authed_username(); if authed is None or authed != username: return 401`。
   - `api/index.py` GET（line 86-88）与 POST（line 110-112）：同样的 `authed != username → 401` 闸。
   - `_authed_username` → `auth.username_from_auth_header` → 解析 `Bearer <token>` → itsdangerous 验签得 username。A 的 token 写/读 B 的存档被拒（测试实测 401）。

2. **凭据独立存储**：✅ 真实。`auth.py` 注释明确「绝不能进 user_data 存档」；哈希存 `data/auth/credentials.json`（`get_credentials_path`），用 `werkzeug.security.generate_password_hash`（盐哈希）。存档文件 grep 零凭据命中。`data/auth/` 目录尚未生成属正常（首次真实登录时 `atomic_write_json` 自建），现有 4 个 passwordless 存档完好待 claim-on-first-login 认领。

3. **原子写（temp + os.replace）**：✅ 真实。`auth.atomic_write_json`（line 51-73）：同目录 `tempfile.mkstemp` 写临时文件 → `flush` + `os.fsync` → `os.replace(tmp, filepath)` 原子替换；异常时清理临时文件、原目标不动。存档写（server.py line 161 / index.py line 133）与凭据写（`_save_credentials`）都走它。**非**直接 `open(w)` 覆盖。测试模拟 `os.replace` 抛错后原档完整可读、无临时文件残留——实测 PASS。

4. **两入口 debug 默认 False**：✅ 真实。`server.py` line 321-322 `debug_mode = os.environ.get("FLASK_DEBUG") == "1"`（默认 False）；`api/index.py` line 146 同。grep `debug=True` 两文件零命中；test_security 断言 `server.app.debug is False` PASS。

附加抽查：
- **CORS 收敛**：`api/index.py` 不再裸 `CORS(app)`，改 `CORS(app, resources={r"/api/*": {"origins": _allowed_origins}})`，源经 `ALLOWED_ORIGINS` 环境变量（缺省本地源）。
- **vite 收敛**：`vite.config.ts` 默认 `host='localhost'`、`allowedHosts=undefined`（不再硬编码 `0.0.0.0` / `true`），经 `VITE_HOST` / `VITE_ALLOWED_HOSTS` 按需放开，保留 proxy 与隧道注释。
- **saveVersion 乐观并发**：`save_user_data` 以现存文件 saveVersion 为权威，`client_version != current_version → 409`，否则递增写入——旧版本 409 / 新版本 200 实测 PASS。
- **部署文档**：`docs/部署方案.md` 含路径①自部署、路径② Vercel serverless、通用环境变量节、单人在线版上线清单；`docs/README.md` 已加索引行（line 32）。

## 结构漂移检查

项目无 `docs/project_structure.md` 文件（已确认不存在），按指令跳过结构漂移比对。Generator 自报同样指出此文件不存在，无需同步。

## 失败原因分析

无失败项。5 条验收命令全过，6 个 checkbox 全勾，四项关键安全属性源码核实属实。

## 新陷阱待追加

Generator 自报的新陷阱（凭据独立存储 / saveVersion≠schema version / Werkzeug 需与 Flask 同钉版本 / 后端自检须 tempdir+env 隔离）均经验证属实，建议追加进 `docs/plans/pitfalls.md`。其中 **Werkzeug 钉版本** 一条尤其值得固化：requirements 仅钉 Flask 时 fresh install 会拉 Werkzeug 3.x 与 Flask 2.3.x 不兼容；test_security.py 已加 `__version__` 兼容兜底，让既有 venv（仍是 3.x）也能跑过。Evaluator 实测当前 venv 下该脚本 PASS，兜底有效。

## 决策

所有 S10 checkbox 已 `[x]`，5 条验收命令全部亲自重跑通过（type-check 0 错 / 310 测试全绿 / build 成功 / 安全自检 19 断言 PASS 退出 0 / debug grep 零命中），四项关键安全属性源码核实真实存在，pitfalls 全合规，自报与实测一致无夸大。

COMPLETE
