/**
 * useDialog 特征测试（I5-T2）：统一主题化弹窗 Promise 化行为。
 * 覆盖：confirm 确认=true/取消=false、alert resolve、单例队列（新弹窗结算旧的）、host 状态同步。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useDialog, useDialogHost } from './useDialog';

beforeEach(() => {
  // 每例开始把可能残留的活动弹窗结算清空（单例模块级状态）。
  const { active, settle } = useDialogHost();
  if (active.value) settle(false);
});

describe('confirm', () => {
  it('确认 → resolve(true)', async () => {
    const { confirm } = useDialog();
    const { active, settle } = useDialogHost();
    const p = confirm('删除吗？');
    expect(active.value).not.toBeNull();
    expect(active.value?.kind).toBe('confirm');
    expect(active.value?.message).toBe('删除吗？');
    settle(true);
    await expect(p).resolves.toBe(true);
    expect(active.value).toBeNull(); // 结算后关闭
  });

  it('取消 → resolve(false)', async () => {
    const { confirm } = useDialog();
    const { settle } = useDialogHost();
    const p = confirm('删除吗？');
    settle(false);
    await expect(p).resolves.toBe(false);
  });

  it('透传 confirmText / danger 选项给 host', () => {
    const { confirm } = useDialog();
    const { active, settle } = useDialogHost();
    void confirm('分解？', { confirmText: '分解', danger: true });
    expect(active.value?.confirmText).toBe('分解');
    expect(active.value?.danger).toBe(true);
    settle(false);
  });
});

describe('alert', () => {
  it('alert 是单键 kind，确认后 resolve（void）', async () => {
    const { alert } = useDialog();
    const { active, settle } = useDialogHost();
    const p = alert('已满');
    expect(active.value?.kind).toBe('alert');
    settle(true);
    await expect(p).resolves.toBeUndefined();
  });
});

describe('单例队列', () => {
  it('已有弹窗时再开新弹窗 → 旧的以 false 结算，展示新的', async () => {
    const { confirm } = useDialog();
    const { active, settle } = useDialogHost();
    const p1 = confirm('第一个');
    const p2 = confirm('第二个');
    // 旧的被自动取消
    await expect(p1).resolves.toBe(false);
    expect(active.value?.message).toBe('第二个');
    settle(true);
    await expect(p2).resolves.toBe(true);
  });
});
