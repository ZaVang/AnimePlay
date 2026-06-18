/**
 * 卡图地址工具。
 * 小网格（图鉴/品味/锐评）用 ~300px 缩略图，避免大图被极限缩小产生的混叠（发"锐"）；
 * 缺失时 onerror 回退原图。原图（详情/大卡/导出）仍用 fullImageSrc。
 * 缩略图由 `backend/generate_thumbnails.py` 预生成在 `data/images/<type>/thumb/`。
 */
export type CardDomain = 'anime' | 'character';

export function fullImageSrc(type: CardDomain, id: number): string {
  return `/data/images/${type}/${id}.jpg`;
}

export function thumbImageSrc(type: CardDomain, id: number): string {
  return `/data/images/${type}/thumb/${id}.jpg`;
}

/** <img @error> 处理：缩略图缺失（如新加但未生成）时回退到原图，带 guard 防循环。 */
export function onThumbError(e: Event): void {
  const img = e.target as HTMLImageElement;
  if (img.dataset.fullFallback) return;
  img.dataset.fullFallback = '1';
  img.src = img.src.replace('/thumb/', '/');
}
