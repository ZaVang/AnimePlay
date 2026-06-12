# frontend-vue —— 动画宅的自我修养（前端）

本项目的前端主体：Vue 3 + TypeScript + Pinia + TailwindCSS，Vite 构建。游戏的全部玩法逻辑（抽卡、战斗、养成）都在这里。

> 这是整个项目的前端包。项目总览、架构图与后端启动见[上层 README](../README.md)。给 AI 助手的开发指南见 [`CLAUDE.md`](CLAUDE.md)。

## 前置条件

- Node ≥ 20.19（见 `package.json` engines）
- **后端需先启动**（端口 5001），否则首屏拉不到卡牌主数据。见上层 README。

## 常用命令

```bash
npm install          # 安装依赖
npm run dev          # 开发服务器（:5173，已代理 /api /data 到 :5001）
npm run type-check   # vue-tsc 类型检查（当前 0 错误）
npm run lint         # ESLint 自动修复
npm run format       # Prettier 格式化
npm run build        # 类型检查 + 生产构建
npm run preview      # 预览生产构建
```

> 注意：当前**未配置测试运行器**（无 vitest），`src/**/*.test.ts` 不会运行。

## 目录速览（`src/`）

| 目录 | 内容 |
|---|---|
| `views/` | 8 个页面（Home/Gacha/Collections/Battle/SquadBattle/Nurture/Guess/Settings） |
| `components/` | UI 组件，按域分子目录（`battle/` `nurture/` `gacha/` `decks/` …） |
| `stores/` | Pinia 状态（`userStore` 为主，偏大；`gachaStore`/`battle`/`theme`/`guess`…） |
| `core/` | 战斗引擎（`battle/` `ai/` `calculation/` `systems/`） |
| `skills/` | 技能定义与效果注册表（`effects/index.ts`） |
| `config/` | `gameConfig.ts`——抽卡概率/保底/数值配置 |
| `data/` | 生成的 UR 技能数据等 |
| `types/` | TS 类型定义 |
| `themes/` | 议题偏向条主题组件 |

## 机制文档

游戏机制不在代码注释里堆砌，集中在仓库 [`docs/`](../docs/README.md)：抽卡、战斗、挑战塔、养成、猜角色、主题、UR 技能设计。改数值/机制前先读对应文档。

## 当前状态

`npm run type-check` 通过、运行时无 JS 异常，但存在若干结构性与体验问题（god store、循环依赖、假技能、浅色主题泛白等），详见 [`../docs/项目审计报告-2026-06-12.md`](../docs/项目审计报告-2026-06-12.md) 与 `CLAUDE.md` 的 Known Debt。
