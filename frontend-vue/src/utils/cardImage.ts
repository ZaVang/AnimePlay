/**
 * 卡图地址工具。
 * 小网格（图鉴/品味/锐评）用 ~300px 缩略图，避免大图被极限缩小产生的混叠（发"锐"）；
 * 缺失时 onerror 回退原图。原图（详情/大卡/导出）仍用 fullImageSrc。
 * 缩略图由 `backend/generate_thumbnails.py` 预生成在 `data/images/<type>/thumb/`。
 */
import { assetUrl } from './assetUrl';

export type CardDomain = 'anime' | 'character';

export function fullImageSrc(type: CardDomain, id: number): string {
  return assetUrl(`/data/images/${type}/${id}.jpg`);
}

export function thumbImageSrc(type: CardDomain, id: number): string {
  return assetUrl(`/data/images/${type}/thumb/${id}.jpg`);
}

/**
 * 角色 Q版 chibi 头像（家园桌宠用）。约定路径 `data/images/character/chibi/<id>.png`
 * ——`thumb/` 的兄弟目录，Flask `/data/<path>` 路由直接服务、无需后端改动；增量填充
 * （codex 手工生成少量高稀有度先丢进去）。该目录 gitignore（同 data/images），随部署/OSS 走。
 * 缺图时调用方用原立绘 `fullImageSrc('character', id)` 作 @error 兜底（见 HomesteadView）。
 */
export function chibiImageSrc(id: number): string {
  return assetUrl(`/data/images/character/chibi/${id}.png`);
}

/**
 * 角色四向行走表（家园俯视广场用）。约定 `data/images/character/sprite/<id>.png`：
 * 3 列(行走帧) × 4 行(朝向：下/上/左/右)，单格 48×64、透明底（RPG-Maker 模板）。
 * 与 chibi 同为 `thumb/` 的兄弟目录，Flask `/data/<path>` 直接服务、随 data/images 一起 gitignore，
 * 随部署/OSS（assetUrl offload）走。增量填充——缺表的角色由调用方回退 chibi→原立绘静态图
 * （见 HomesteadView 的 sprite 探测 + 三级兜底）。
 */
export function spriteSheetSrc(id: number): string {
  return assetUrl(`/data/images/character/sprite/${id}.png`);
}

/** <img @error> 处理：缩略图缺失（如新加但未生成）时回退到原图，带 guard 防循环。 */
export function onThumbError(e: Event): void {
  const img = e.target as HTMLImageElement;
  if (img.dataset.fullFallback) return;
  img.dataset.fullFallback = '1';
  img.src = img.src.replace('/thumb/', '/');
}
