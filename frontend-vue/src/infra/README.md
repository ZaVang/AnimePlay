# infra/ —— I/O 基础设施层

**只负责**：与外界打交道的一切 —— HTTP 请求封装（`api/`）、存档序列化/迁移（`persistence/`）、资源 URL 拼接（`assets`）。

**绝不允许**：写游戏规则（公式属于 `engine/`）、被 `engine/` 反向依赖。

调用方向：`stores → infra`（stores 编排时调 engine 算、调 infra 存取）。

迁入计划（见 docs/FUTURE.md S5）：`persistence/` 显式 schema 的 serialize/deserialize/migrate —— 将来从 JSON 文件存档换数据库时，只换这层实现，不动协议。
