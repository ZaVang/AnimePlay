/**
 * 图片相关工具函数
 */

// 可用的角色图片ID列表（从实际文件系统获取）
const AVAILABLE_CHARACTER_IMAGES = [
  '34297', '5109', '20584', '10447', '49526', '10453', 
  '36494', '6414', '77', '44764', '48895', '32508', 
  '21773', '45627', '71', '76', '81', '20582'
];

/**
 * 获取随机的角色图片路径
 * @returns 随机角色图片路径
 */
export function getRandomCharacterImage(): string {
  const randomId = AVAILABLE_CHARACTER_IMAGES[Math.floor(Math.random() * AVAILABLE_CHARACTER_IMAGES.length)];
  return `/data/images/character/${randomId}.jpg`;
}

/**
 * 获取默认角色图片（随机选择一个存在的图片）
 * @returns 默认角色图片路径  
 */
export function getDefaultCharacterImage(): string {
  return getRandomCharacterImage();
}

/**
 * 处理图片加载错误，提供备用图片
 * @param event 图片加载错误事件
 */
export function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  if (target && target.src.includes('/data/images/character/')) {
    // 如果已经在尝试加载character图片但失败了，使用另一个随机图片
    target.src = getRandomCharacterImage();
  }
}