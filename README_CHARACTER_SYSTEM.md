# 角色卡系统实现说明

本文档说明了为动漫卡牌游戏新增的角色卡系统功能。

## 功能概述

### 1. 角色卡抽取界面
- **入口**：主导航 "角色邂逅"
- **功能**：
  - 单次邂逅：消耗1张角色券
  - 十次邂逅：消耗10张角色券，保底佳作级以上
  - 显示抽卡动画和稀有度特效
  - 保底机制：90抽必出传说级，30抽必出杰作级

### 2. 角色图鉴界面  
- **入口**：主导航 "角色图鉴"
- **功能**：
  - 展示已获得的所有角色
  - 支持按稀有度、性别筛选
  - 角色详情页面显示详细信息
  - 支持分解重复角色获得知识点

## 稀有度等级

| 稀有度 | 概率 | 边框颜色 | 特殊效果 | 分解价值 |
|--------|------|----------|----------|----------|
| LEGENDARY (传说级) | 0.3% | 金色渐变 | 金色光环动画 | 2000 知识点 |
| MASTERPIECE (杰作级) | 1.2% | 紫粉渐变 | 紫色脉冲动画 | 800 知识点 |
| POPULAR (热门级) | 4.5% | 蓝色渐变 | 闪耀特效 | 200 知识点 |
| QUALITY (佳作级) | 15% | 绿色 | 微光效果 | 50 知识点 |
| INTERESTING (趣味级) | 79% | 灰色 | 无特效 | 10 知识点 |

## 技术实现

### 前端架构
```
frontend/js/
├── character_gacha.js      # 角色抽卡逻辑
├── character_collection.js # 角色收藏管理
├── game_config.js         # 配置文件（已扩展）
├── player.js              # 玩家数据（已扩展）
├── ui.js                  # UI组件（已扩展）
└── app.js                 # 主应用（已扩展）
```

### 后端接口
- `GET /api/characters` - 获取角色ID列表
- `GET /api/characters/<id>` - 获取特定角色数据
- `POST /api/characters/batch` - 批量获取角色数据

### 数据流
1. 游戏启动时从 `/data/characters/` 加载角色数据
2. 根据收藏数自动分配稀有度等级
3. 玩家存档包含角色收藏和抽卡历史
4. 实时保存到后端用户数据

## 视觉设计

### CSS 特效类
- `.legendary-glow` - 传说级金色动画
- `.masterpiece-shine` - 杰作级紫色脉冲  
- `.popular-sparkle` - 热门级闪耀效果
- `.quality-glow` - 佳作级微光效果

### 响应式设计
- 支持桌面端和移动端
- 卡片网格自适应
- 触摸友好的交互设计

## 启动方式

1. 启动后端服务器：
```bash
cd backend
python server.py
```

2. 访问 http://localhost:5001

3. 创建用户并体验角色卡系统

## 扩展计划

- [ ] 更多角色数据源集成
- [ ] 角色语音和动画
- [ ] 角色卡片装饰系统
- [ ] 社交分享功能
- [ ] 更复杂的稀有度计算算法

## 注意事项

- 角色数据从 Bangumi 角色库加载，需要网络连接
- 首次加载可能较慢，建议预加载热门角色
- 大量角色数据可能影响性能，已做分页处理
- 保底机制确保用户体验，避免连续低稀有度

---

实现完成时间：2025-01-31
实现者：Claude Code Assistant