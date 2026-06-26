/**
 * 共享解锁门面（I5-T2 债轮：4 处逐字重复的「解锁四件套」收口）。
 *
 * 此前 GenreSets / RecommendationStrip / NicheGems / CodexPanel 各写一份逐字相同的
 * 「登录守卫 alert → 余额守卫 alert → confirm 花费 → unlockCodexCard → 失败 alert」——
 * 换弹窗要改 4 遍、加一档守卫会漂移。这里抽成**一处**，4 个组件的 handleUnlock 收敛到一行。
 *
 * 关键约束：
 *  - **收 domain 参数**：3 处是 anime-only、CodexPanel 是 anime|character 双域，门面不写死 anime。
 *  - **以 store 返回的 error 为准**：`userStore.unlockCodexCard`（userStore.ts:233）已自带
 *    登录守卫 + 卡片存在 + 余额/已拥有判断并返回 {ok,error}——门面只负责 confirm + 展示 error，
 *    不在 UI 层重复守卫（避免两层守卫漂移）。登录/余额的「确认前」提示也走主题化弹窗。
 *  - 弹窗全走 useDialog（主题化、随皮肤）；价格用 getCodexUnlockPrice。
 *
 * 属共享 composable 层（依赖只向下，可被组件 import）。
 */
import { useUserStore } from '@/stores/userStore';
import { useProfileStore } from '@/stores/profile';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { useDialog } from '@/composables/useDialog';
import type { CardDomain } from '@/stores/collection';
import type { Rarity } from '@/types/card';

/** 解锁所需的最小卡形状（id + 稀有度 + 名称，用于定价与文案）。 */
export interface UnlockableCard {
  id: number;
  rarity: Rarity;
  name: string;
}

export function useUnlockConfirm() {
  const userStore = useUserStore();
  const profile = useProfileStore();
  const { confirm, alert } = useDialog();

  /**
   * 解锁一张图鉴卡：登录/余额前置提示 → 主题化确认花费 → 调 store 编排（以其 error 为准）。
   * 返回是否成功入库（供调用方按需联动 UI）。
   */
  async function unlock(card: UnlockableCard, domain: CardDomain): Promise<boolean> {
    // 登录前置提示（store 也守，但确认前给清晰反馈避免空 confirm）。
    if (!userStore.isLoggedIn) {
      await alert('请先登录再解锁。');
      return false;
    }
    const price = getCodexUnlockPrice(card.rarity);
    const balance = profile.core.knowledgePoints;
    // 余额前置提示（store 仍是权威，这里只为确认前给清晰反馈不弹空 confirm）。
    if (balance < price) {
      await alert(
        `知识点不足，解锁 [${card.rarity}] ${card.name} 需 ${price} 知识点（你当前有 ${balance}）。`,
      );
      return false;
    }
    const ok = await confirm(
      `花费 ${price} 知识点定向解锁 [${card.rarity}] ${card.name}？\n你当前有 ${balance} 知识点。`,
      { confirmText: '解锁' },
    );
    if (!ok) return false;

    // store 自带全部守卫并返回 {ok,error}——以它为准，门面只展示 error。
    const res = userStore.unlockCodexCard(card.id, domain);
    if (!res.ok) {
      if (res.error) await alert(res.error);
      return false;
    }
    return true;
  }

  return { unlock };
}
