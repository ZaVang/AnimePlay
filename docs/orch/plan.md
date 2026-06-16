# Iteration 1 Plan

> 需求来源：docs/SPRINT.md「S10」六任务（Tier1 off，无审计报告）。已读 scout.md「A.约束与可行性」与 pitfalls.md。
> 本计划只说 WHAT/WHY；HOW（文件/函数）见 scout.md「B.代码地图与坑」，由 Generator 自主决定。

## 本轮任务（按依赖顺序）

1. **T2: 关闭 debug 模式**（先做，无依赖、最低风险）
   - 目标：两个后端入口都不再 `debug=True`（默认 False，可 env 开本地）。
   - 依赖：无
   - 验收：`grep -rn "debug=True" backend/server.py api/index.py` 零命中；test_security.py 断言 `app.debug is False`。
   - 来源：SPRINT S10-T2 / 审计安全红线

2. **T1: 存档接口鉴权（密码账号 + 会话 token）**
   - 目标：消灭「任意用户名免密读写任何人存档」。引入密码账号（首次登录即注册，盐哈希），登录签发会话 token；读写存档须带有效 token，token 解析出的 username 必须与被读写存档一致。现有 passwordless 存档走 claim-on-first-login。
   - 依赖：无（与 T2 同改后端入口）
   - 验收：test_security.py 全 PASS——未带 token 读→401；错密码→401；对密码→拿到 token；token 读写自己存档成功；用 A 的 token 写 B 存档被拒。前端 type-check/build 通过、登录 UI 有密码框且登录失败有反馈。
   - 来源：SPRINT S10-T1 / 审计安全红线（最重）

3. **T3: 存档原子写 + 版本号 + 并发保护**
   - 目标：防写入截断损坏（原子写）与后写覆盖（乐观并发）。
   - 依赖：T1（同在后端写存档路径上改，复用凭据/版本侧基础设施）
   - 验收：test_security.py 断言——模拟写入中途失败后原存档仍完整可读；旧版本号 POST→409、新版本号→成功。前端 `npm run test` 含 saveVersion 往返/迁移测试全绿（不低于既有 305）。
   - 来源：SPRINT S10-T3 / 审计「存档并发」

4. **T4: CORS 收敛 + vite host/allowedHosts 收敛**
   - 目标：`api/index.py` 不再裸 `CORS(app)` 全开（env 配置允许源）；`vite.config.ts` 默认不再硬编码 `allowedHosts:true`/`host:'0.0.0.0'`（env 可放开，保留 proxy 与隧道注释）。
   - 依赖：无
   - 验收：源码核验无裸全开；`npm run build` 通过、dev 仍可本地起（type-check/build 不报错）。
   - 来源：SPRINT S10-T4 / 审计 CORS

5. **T5: 部署方案文档（不实施）**
   - 目标：新建 `docs/部署方案.md`，写①自部署②serverless 两条路径要点 + 单人在线版上线清单；`docs/README.md` 加索引。
   - 依赖：无（但内容引用 T1-T4 的加固结果）
   - 验收：文档存在含①②两节 + 清单；README 索引行已加。
   - 来源：SPRINT S10-T5（用户决策：只加固不实施）

6. **T6: 回归与防漂移收口**
   - 目标：全部验收命令绿；FUTURE.md S10 五项勾掉、进度总览 S10→✅；审计报告安全章节对应项标记已解。
   - 依赖：T1-T5
   - 验收：type-check 0 错、test 全绿、build 通过、test_security.py 全 PASS、grep 零命中；FUTURE.md 已更新。
   - 来源：SPRINT S10-T6

## 相关陷阱（从 pitfalls.md / scout.md C 段筛选）
- [鉴权] 凭据绝不能进 user_data 存档文件（客户端全量覆盖写=可篡改）→ 独立凭据存储，后端权威。
- [并发] saveVersion（保存计数）≠ schema `version`（协议版本=4），勿混用同一字段。
- [协议] 新增持久化字段 schema.ts + migrations.ts + stores/persistence.ts 三处同改 + 旧档迁移默认值 + 更新往返/迁移测试，否则回归。
- [后端] 两个入口（server.py + api/index.py）鉴权/debug/原子写都要改且一致；保 isalnum 白名单防路径穿越。
- [前端] 全仓唯一 fetch 处是 api.ts，token 只挂这一层；login 失败别留半登录态。
- [测试] 后端 test_security.py 用 Flask test_client 自包含 + tempdir 隔离，别写真实 data/user_data。
- [工程] 不跑 `npm run lint`（--fix 全仓重排），单文件用 `npx eslint <path>`；颜色禁 text-white 压浅底/禁拼接动态色类。

## 验收命令（从 SPRINT.md 原样复制）

```bash
# 1. 前端类型检查（期望 0 错误）
cd frontend-vue && npm run type-check
# 2. 前端测试（期望全绿，不低于既有 305）
cd frontend-vue && npm run test
# 3. 前端生产构建（期望成功）
cd frontend-vue && npm run build
# 4. 后端安全自检（退出码 0 且全 PASS）
python backend/test_security.py
# 5. debug 关闭核验（期望零命中）
grep -rn "debug=True" backend/server.py api/index.py
```
