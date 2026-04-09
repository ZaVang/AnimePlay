---
description:  执行本项目的标准 Sprint 流程 (基于 contract-loop-soft 调用)
---

请使用 `contract-loop-soft` 机制执行本项目的标准 Sprint 流程。
**操作步骤**：
使用以下参数和需求内容调用 `/contract-loop-soft` ：
```text
读取 docs/plans/SPRINT.md，逐项实现功能清单，运行验收阶段和测试命令直到全部通过，每次迭代结束前更新 SPRINT.md 任务状态表，全部完成后必须追加本轮迭代记录至 docs/chronicle.md ，并向 docs/plans/pitfalls.md 追加新踩坑条目。 
--max-iterations 2 --completion-promise "SPRINT_COMPLETE"
```
**上下文**（请在执行时确保自动注入阅读）：
- **Sprint 合同**：`docs/plans/SPRINT.md`（当前未完成的 `[ ]` 任务）
- **陷阱知识库**：`docs/plans/pitfalls.md`（实现前请首先阅读相关条目）
