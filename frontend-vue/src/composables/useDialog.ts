/**
 * 统一主题化弹窗 composable（I5-T2 债轮：原生 confirm/alert 收口）。
 *
 * 此前全仓 18 处原生 `confirm()/alert()` 是浏览器灰框——与 5 套皮肤完全割裂、移动端体验差。
 * 这里提供 Promise 化的 `confirm()/alert()`，由挂在 App 顶层的 `<AppDialog>` 渲染主题化弹窗
 * （走皮肤语义令牌、Teleport+backdrop、Esc/回车可达）。
 *
 * 架构：单例模块级响应式状态（一个全局弹窗队列至多展示一个），组件层任意处 import 调用。
 * 纯 Vue 响应式 + Promise，零 IO / 后端 / 存档——属共享 composable 层（依赖只向下，可被组件 import）。
 */
import { ref, readonly } from 'vue';

export interface DialogOptions {
  /** 弹窗类型：confirm 有取消/确认两键，alert 只有确认键。 */
  kind: 'confirm' | 'alert';
  /** 正文（必填）。支持 \n 换行（模板用 white-space: pre-line 渲染）。 */
  message: string;
  /** 标题（可选）。 */
  title?: string;
  /** 确认键文案（默认 confirm='确认' / alert='知道了'）。 */
  confirmText?: string;
  /** 取消键文案（默认「取消」，仅 confirm 用）。 */
  cancelText?: string;
  /** 确认键是否危险样式（红，用于分解/删除等不可逆操作）。 */
  danger?: boolean;
}

interface ActiveDialog extends DialogOptions {
  resolve: (ok: boolean) => void;
}

/** 当前活动弹窗（null = 无）。AppDialog 读它渲染。 */
const active = ref<ActiveDialog | null>(null);

/** 打开一个弹窗，返回 Promise<boolean>（确认=true，取消/关闭=false）。 */
function open(options: DialogOptions): Promise<boolean> {
  // 若已有弹窗在展示，先以「取消」结算它（避免回调悬挂），再开新的。
  if (active.value) {
    active.value.resolve(false);
    active.value = null;
  }
  return new Promise<boolean>(resolve => {
    active.value = { ...options, resolve };
  });
}

/** 内部：AppDialog 按钮回调用——结算当前弹窗。 */
function settle(ok: boolean) {
  if (!active.value) return;
  const r = active.value.resolve;
  active.value = null;
  r(ok);
}

/**
 * 统一弹窗门面：返回主题化的 `confirm()/alert()`（Promise）。
 * 用法：`const { confirm, alert } = useDialog(); if (await confirm('...')) {...}`。
 */
export function useDialog() {
  /** 主题化确认框：返回 Promise<boolean>。 */
  function confirm(message: string, opts: Omit<DialogOptions, 'kind' | 'message'> = {}): Promise<boolean> {
    return open({ kind: 'confirm', message, ...opts });
  }
  /** 主题化提示框：返回 Promise<void>（点确认 resolve）。 */
  function alert(message: string, opts: Omit<DialogOptions, 'kind' | 'message'> = {}): Promise<void> {
    return open({ kind: 'alert', message, ...opts }).then(() => undefined);
  }
  return { confirm, alert };
}

/** AppDialog 组件专用：只读活动弹窗 + 结算回调（不导出给业务层）。 */
export function useDialogHost() {
  return { active: readonly(active), settle };
}
