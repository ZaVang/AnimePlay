/**
 * 全站裂图兜底（S7）。
 * 资源加载错误不冒泡但会进入捕获相，在 document 上挂一个捕获监听即可覆盖
 * 全部现有与未来的 <img>，无需每个组件加指令。失败的图换成内联 SVG 占位
 * （中性配色，任何皮肤下都不刺眼），并打上 data 标记防止占位图自身失败造成死循环。
 */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
  <rect width="300" height="420" fill="#9aa0ab"/>
  <rect width="300" height="420" fill="url(#g)"/>
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#b6bcc7"/><stop offset="1" stop-color="#8b919d"/>
  </linearGradient></defs>
  <g fill="#f2f4f7" text-anchor="middle" font-family="sans-serif">
    <text x="150" y="195" font-size="64">🖼</text>
    <text x="150" y="248" font-size="22">图片走丢了</text>
  </g>
</svg>`;

export const IMG_FALLBACK_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(PLACEHOLDER_SVG)}`;

export function installImgFallback(doc: Document = document) {
  doc.addEventListener(
    'error',
    event => {
      const el = event.target;
      if (!(el instanceof HTMLImageElement)) return;
      if (el.dataset.fallbackApplied === '1') return; // 占位图自身失败时不再重试
      el.dataset.fallbackApplied = '1';
      el.src = IMG_FALLBACK_SRC;
    },
    true, // 资源错误只在捕获相可见
  );
}
