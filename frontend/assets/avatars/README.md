# 角色头像素材说明

## 📁 文件夹结构
```
public/assets/avatars/
├── playerA.jpg         # 玩家A的头像
├── playerB.jpg         # 玩家B（AI）的头像  
├── characters/         # 角色专用头像
│   ├── 12393.jpg      # UR角色头像 (以角色ID命名)
│   ├── 12394.jpg      
│   └── ...
└── expressions/        # 表情头像（可选）
    ├── playerA_angry.jpg    # 愤怒表情
    ├── playerA_happy.jpg    # 开心表情
    ├── playerB_smug.jpg     # 得意表情
    └── ...
```

## 🎨 素材规格要求

**基础头像**：
- 尺寸：64x64px 或 128x128px
- 格式：JPG/PNG/WebP
- 风格：圆形头像效果更佳
- 建议使用动漫风格头像

**表情头像**（可选扩展）：
- 同基础头像规格
- 命名格式：`角色名_表情.jpg`
- 支持的表情：`angry`, `happy`, `sad`, `smug`, `surprised`, `thinking`

## 🔧 使用方法

1. **放置文件**：将头像文件放到对应文件夹
2. **命名规则**：
   - 玩家头像：`playerA.jpg`, `playerB.jpg`  
   - 角色头像：`{角色ID}.jpg`（如 `12393.jpg`）
3. **自动加载**：系统会自动检测并加载头像

## 🎭 占位素材

如果暂时没有素材，系统会显示：
- 默认彩色圆形占位符
- 角色名字首字母
- 渐变背景色

## 🚀 高级功能

### 动态表情系统
未来可以根据对话内容自动切换表情：
```javascript
// 示例：根据对话类型切换表情
switch (dialogueType) {
  case 'objection': return 'angry';
  case 'agreement': return 'happy'; 
  case 'counterattack': return 'smug';
  default: return 'normal';
}
```

### 角色动画
可以添加简单的CSS动画：
- 说话时的轻微晃动
- 生气时的红色闪光
- 开心时的弹跳效果

## 💡 推荐素材网站

- **免费动漫头像**：
  - Pixiv (需要授权)
  - Unsplash anime collections
  - 自制像素风头像

- **AI生成头像**：
  - Waifu Labs
  - This Person Does Not Exist (动漫版)
  - Midjourney/Stable Diffusion

## ⚠️ 注意事项

1. **版权问题**：请确保使用的头像有合法授权
2. **文件大小**：建议每个头像文件小于100KB
3. **加载性能**：过多的高分辨率头像会影响游戏性能
4. **命名规范**：严格按照命名规则，避免加载失败

---
*这个文件夹是辩论式对话系统的一部分，用于提升战斗的视觉效果和沉浸感。*