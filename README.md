# 动画宅的自我修养（AnimePlay）

一个基于 [Bangumi](https://bangumi.tv) 番剧 / 角色数据的动画题材**抽卡 + 收集 + 多玩法**网页游戏。收集了大量动画与角色数据，做成抽卡，并围绕收集设计了多套玩法。

> 这是个长期个人项目，当前处于「功能广度足够、待重构」阶段。完整的代码审计、已知问题与重构路线图见 [`docs/项目审计报告-2026-06-12.md`](docs/项目审计报告-2026-06-12.md)。

## 玩法一览

| 模块 | 说明 | 文档 |
|---|---|---|
| 抽卡 | 动画/角色双卡池，UP 轮换、保底、商店 | [抽卡系统](docs/抽卡系统.md) |
| 收藏 / 卡组 | 收集、筛选、分解、组卡 | — |
| 宅理论战 | 卡牌辩论对战（声望/议题/技能） | [战斗系统](docs/战斗系统.md) |
| 挑战塔 | 角色小队逐层数值战 | [挑战塔系统](docs/挑战塔系统.md) |
| 角色养成 | 好感/属性/对话，反哺小队战 | [角色养成系统](docs/角色养成系统.md) |
| 猜角色 | 像素化猜角色小游戏 | [猜角色游戏](docs/猜角色游戏.md) |
| 主题 | 6 套全局配色换肤 | [主题系统](docs/主题系统.md) |

## 技术架构

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  前端 frontend-vue (Vite)    │  /api  │  后端 backend/server.py       │
│  Vue 3 + TS + Pinia + TW     │ ─────► │  Flask (:5001)               │
│  ·全部游戏逻辑（战斗/抽卡/    │  /data │  ·提供卡牌主数据 JSON         │
│    养成）都在前端             │ ◄───── │  ·提供角色/动画图片            │
│  ·开发端口 :5173             │        │  ·读写用户存档 JSON           │
└─────────────────────────────┘        └──────────────────────────────┘
                                          data/  (卡牌数据 + 图片 + 用户存档)
```

**后端只是"带文件柜的静态/数据服务器"**：战斗判定、抽卡 RNG、数值结算全部在前端。这对单机自娱是合理的；若将来要做排行榜/联机，权威逻辑需迁移到后端（分析见审计报告第六节）。

## 本地启动

需要 **Python 3**（Flask）与 **Node ≥ 20.19**。

### 1. 后端（数据服务，端口 5001）

```bash
# 在项目根目录
pip install -r requirements.txt
python start_server.py
```

后端会从 `backend/` 启动 `server.py`，在 http://localhost:5001 提供 `/api/*` 与 `/data/*`。

### 2. 前端（开发服务器，端口 5173）

```bash
cd frontend-vue
npm install
npm run dev
```

Vite 已配置把 `/api` 和 `/data` 代理到 `:5001`，所以直接访问 http://localhost:5173 即可。

> 登录无需密码：输入字母数字用户名即创建/加载存档（存为 `data/user_data/<用户名>.json`）。

## 目录结构

```
AnimePlay/
├── frontend-vue/        # 前端主体（Vue 3），见其 CLAUDE.md
│   ├── src/
│   │   ├── views/       # 8 个页面
│   │   ├── components/  # UI 组件（battle/ nurture/ gacha/ ...）
│   │   ├── stores/      # Pinia 状态
│   │   ├── core/        # 战斗引擎（TurnManager/BattleController/...）
│   │   ├── skills/      # 技能效果注册表
│   │   ├── config/      # gameConfig.ts（数值配置）
│   │   └── data/        # 生成的技能数据
├── backend/             # Flask 数据服务 + 数据处理脚本
│   └── bangumi_asset/   # Bangumi 数据抓取（见其 README）
├── data/                # 卡牌数据、图片、用户存档（~419MB，未入库大文件见 .gitignore）
├── api/index.py         # Vercel serverless 版用户接口（部署预备）
├── docs/                # 文档（见 docs/README.md）
└── start_server.py      # 后端启动脚本
```

## 文档

所有文档的导航见 [`docs/README.md`](docs/README.md)。
