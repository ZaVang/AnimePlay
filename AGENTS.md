# AnimePlay agent guide

本文件是仓库内 AI 编码助手的项目事实源。先读根目录 `README.md`；涉及玩法或路线时，再读 `docs/README.md` 与对应机制文档。不要把一次性审计、会话记录或生成器运行报告提交进 `docs/`。

## Project map

- `frontend-vue/`：Vue 3 + TypeScript + Pinia + TailwindCSS 前端，Vite 构建。
- `frontend-vue/src/engine/`：纯游戏规则。禁止依赖 Vue、Pinia、DOM、网络、存储或上层模块。
- `frontend-vue/src/stores/`：状态与薄编排；跨域流程在这里组合，不把规则重新塞回组件。
- `frontend-vue/src/skills/`：宅理论战技能运行时；小队战技能是另一套运行时，不复用 effect id。
- `frontend-vue/src/infra/persistence/`：存档 schema、迁移与 IO 边界。
- `backend/`：Flask 数据服务与数据处理脚本；玩法判定目前仍以前端 engine 为准。
- `data/`：主数据、图片和本地用户数据。不要批量格式化或改写；不要提交 `data/auth/`、`data/user_data/` 或本地凭据。
- `docs/FUTURE.md`：唯一前进路线；`docs/HISTORY.md`：已完成工作摘要；机制细节见 `docs/README.md`。

## Stable invariants

- 依赖只向下：`views -> components -> stores -> engine`；下层不得 import 上层。
- engine 中的随机与时间必须可注入；不要直接依赖 `Math.random()` 或墙钟来决定可测试的规则结果。
- 货币变更只走 profile store 的 `spend()` / `earn()`。
- 新增或修改持久化字段时，同步检查 schema、migration、序列化/装配以及往返测试；版本号只以 `infra/persistence/schema.ts` 的 `SAVE_VERSION` 为准。
- 技能描述必须与真实行为一致；新增效果要有消费端、事件守卫和行为测试，不能用日志或文案假装实现。
- `/squad-battle`、`/nurture`、`/guess` 是兼容重定向；除非明确做破坏性路由迁移，不要让它们变成 404。
- 界面颜色优先使用 `assets/skins.css` 的语义 token/classes；避免在浅色主题上写死 `text-white`，也不要拼接动态 Tailwind 类名。
- 组件中的 timer、interval、animation frame 和 observer 必须在卸载时清理。
- 结算幂等要覆盖完整副作用链：调用 domain store 前先记录本局是否仍为 active，只允许第一次结束推进任务、发奖或保存；不要用奖励金额推断是否首次结算。
- 把“是否结束”和“为何结束”分开建模；手动退出、答错等会话原因保持为瞬态状态，不写进存档。
- 重玩已结算内容时，当前局分数与首通/官方分数必须分开，回看不能覆盖或伪装成首通结果。
- 可拖拽容器保持非交互语义；选择、详情、移除使用并列的原生按钮，避免按钮嵌套和仅拖拽可达的操作。

## Generated and large artifacts

- `frontend-vue/src/data/urCharacterSkillsGenerated.ts` 由 `frontend-vue/scripts/generateUrSkills.js` 生成。修改源设计 `docs/UR角色技能设计.md` 后再生成，不要只手改产物。
- 小队角色 kit 的声明式数据在 `frontend-vue/src/data/squad/characterKits.ts`，装配/校验在 `frontend-vue/src/data/squadSkillKits.ts`，回落模板在 `frontend-vue/src/data/squad/archetypeTemplates.ts`；保持数据、装配、模板三层分离。
- 搜索时排除 `node_modules/`、`dist/`、`.venv/`、大图和用户数据；优先 `git grep` 或限定 glob 的 `rg`。

## Commands

从仓库根目录启动后端：

```powershell
.\.venv\Scripts\python.exe start_server.py
```

前端常用命令：

```powershell
npm --prefix frontend-vue run dev
npm --prefix frontend-vue run type-check
npm --prefix frontend-vue run test
npm --prefix frontend-vue run build
```

后端安全测试：

```powershell
.\.venv\Scripts\python.exe backend\test_security.py
```

`npm run lint` 会自动修复全仓文件，默认不要运行。只检查改动文件时，在 `frontend-vue/` 下执行 `npx eslint <paths>`；需要自动修复必须明确限定文件。

## Verification

- 仅文档/代理配置：检查 Markdown 本地链接、被删路径引用和 `git diff --check`。
- 前端规则、store、composable：至少跑 `type-check` + `test`。
- Vue/UI、构建或依赖配置：跑 `type-check` + `test` + `build`。
- 后端、鉴权、存档接口：跑 `backend/test_security.py`；跨栈改动再补前端验证。
- 修复回归时，除全量命令外，必须重跑能复现原失败模式的最小测试。

## Working discipline

- 保留用户已有的无关改动；不要用清理任务顺手重写业务代码。
- 机制变化同步更新对应现行文档；已完成事项移入 `HISTORY.md`，未完成事项只放 `FUTURE.md`。
- 不新增 dated audit、scorecard、`docs/orch` 运行快照或完成后的 Sprint 合同；稳定结论写进本文件、机制文档或测试。
- 自主循环必须在开始前声明最大迭代/时间；连续两个检查点无进展、同一失败重复三次、发生合并冲突、缺凭据或网络不可用时停止并报告，不无限重试。
