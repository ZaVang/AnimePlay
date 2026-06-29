/**
 * 静态图片资源前缀（图片 offload 开关）。
 *
 * 默认空 → 图片走同源 `/data/images/...`，由 VPS/Flask 本地托管。
 *   （香港单机 / `npm run dev` + 后端 :5001 走的就是这条，行为与历史完全一致。）
 * 设 `VITE_IMAGE_BASE_URL`（如 `https://img.example.com`）→ 图片改从该源（OSS/CDN）直取，
 *   浏览器绕过 VPS 直连图床，VPS 带宽不再被图片占用（大陆便宜机 + 对象存储的部署形态）。
 *
 * 约定：调用方传入根相对路径（以 `/data/` 开头）；base 末尾斜杠会被规范化。
 * 注意：base 在【构建时】注入并烘焙进产物——换图片域名需重新 `npm run build`。
 *   按 id 实时拼接的卡图/缩略图每次渲染重算、不受影响；仅极少数持久化了绝对路径的字段
 *   （如 AI 生成角色头像 `CHARACTER_IMAGE_POOL`）在“换域名”后需重生成，首次部署无此问题。
 */
const IMAGE_BASE = String(import.meta.env.VITE_IMAGE_BASE_URL ?? '')
  .trim()
  .replace(/\/+$/, '');

/** 给根相对的 `/data/...` 资源路径加上图片源前缀（未配置时原样返回，零行为变化）。 */
export function assetUrl(path: string): string {
  if (!IMAGE_BASE) return path;
  return IMAGE_BASE + (path.startsWith('/') ? path : '/' + path);
}
