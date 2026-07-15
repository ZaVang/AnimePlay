# frontend-vue

AnimePlay 的前端主体：Vue 3 + TypeScript + Pinia + TailwindCSS，使用 Vite 构建。项目总览和后端启动方式见 [根 README](../README.md)，AI 编码约束见 [AGENTS.md](../AGENTS.md)。

## 前置条件

- Node `^20.19.0 || >=22.12.0`。
- 开发时先启动根目录 Flask 服务（默认 `:5001`），否则主数据请求会失败。

## 常用命令

在本目录运行：

```bash
npm install
npm run dev
npm run type-check
npm run test
npm run build
npm run preview
```

`npm run lint` 和 `npm run format` 会改写文件。日常检查优先对改动文件运行 `npx eslint <paths>`，不要无意中格式化全仓。

## 目录速览

| 目录 | 职责 |
|---|---|
| `src/engine/` | 纯游戏规则、可注入 RNG/时间，不依赖 Vue/Pinia/DOM/IO |
| `src/stores/` | Pinia 状态与跨域薄编排 |
| `src/views/` | 路由页面 |
| `src/components/` | 按玩法域组织的 UI 组件 |
| `src/skills/` | 宅理论战技能运行时与 effect handlers |
| `src/infra/persistence/` | 存档 schema、迁移、序列化与 API IO |
| `src/config/` | 游戏配置、任务、成就、皮肤与玩法常量 |
| `src/data/` | 技能和小队 kit 等声明式/生成数据 |
| `src/composables/` | 可复用的 Vue 交互与生命周期逻辑 |

## 文档与验证

机制文档集中在 [docs/](../docs/README.md)。改规则或数值前先读对应文档，完成后同步实现、测试和文档。

常规前端改动至少通过：

```bash
npm run type-check
npm run test
```

涉及 Vue 页面、构建配置或依赖时再运行 `npm run build`。修复回归时还要重跑能复现原问题的最小测试。
