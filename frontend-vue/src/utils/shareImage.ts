/**
 * shareImage（I2-T4）——系统级「一键分享」工具，带下载回落。
 *
 * 在支持的环境（HTTPS + 用户手势 + `navigator.canShare({ files })`）直接调起系统分享面板；
 * 不支持 / 用户取消 / 分享失败时回落到既有 `a.download` 下载。
 * 纯前端、无第三方库（不引 html2canvas）；图片来源是页面自绘的同源 Canvas（不 taint）。
 *
 * 注意：必须在用户手势的同步调用栈内尽早走到 `navigator.share`——故由调用方先生成 Blob 再传入。
 */

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/** 触发浏览器下载（统一回落）。用完即释放 objectURL。 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 取消分享时浏览器抛 AbortError——不视为错误，也不回落下载（用户主动取消）。 */
function isAbort(err: unknown): boolean {
  return err instanceof DOMException
    ? err.name === 'AbortError'
    : !!err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError';
}

/** 当前环境是否支持「分享文件」（特性检测，SSR/旧浏览器安全）。 */
export function canShareImage(): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof File === 'undefined') return false;
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    if (typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
    const probe = new File([new Blob([''], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    return nav.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * 分享一张图片 Blob：能调起系统面板就 share，否则 / 失败回落下载。
 * 返回最终行为，便于 UI 提示。`title`/`text` 仅在 share 路径使用。
 */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  meta: { title?: string; text?: string } = {},
): Promise<ShareResult> {
  if (canShareImage()) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      const nav = navigator as Navigator & {
        share: (data?: ShareData) => Promise<void>;
        canShare?: (data?: ShareData) => boolean;
      };
      const data: ShareData = { files: [file], title: meta.title, text: meta.text };
      // 再次确认这份具体数据可分享（部分环境对 title/text 组合更严格）。
      if (!nav.canShare || nav.canShare(data)) {
        await nav.share(data);
        return 'shared';
      }
    } catch (err) {
      if (isAbort(err)) return 'cancelled';
      // 其它分享错误：回落下载（下面）。
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

/** 把 Canvas 转成 PNG Blob（Promise 化 toBlob）。toBlob 失败（含跨域 taint）时 reject。 */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob 返回空（可能被跨域污染）'));
    }, 'image/png');
  });
}
