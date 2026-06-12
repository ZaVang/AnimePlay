/**
 * 存档装配器（S5 建立）：把各领域 store 的 serialize/deserialize 绑到
 * infra/persistence 的显式 schema 上。
 * - 领域 store 自己不触发保存；保存时机由门面 userStore 的动作统一调用 saveToServer()。
 * - 新增持久化字段：schema.ts + migrations.ts + 这里，三处同改。
 */
import { migrate, fetchUserSave, pushUserSave, SAVE_VERSION, type SavePayloadV2 } from '@/infra/persistence';
import { useProfileStore } from './profile';
import { useCollectionStore } from './collection';
import { useDeckStore } from './deck';
import { useViewingStore } from './viewing';
import { useNurtureStore } from './nurture';
import { usePveStore } from './pve';
import { useGachaStore } from './gachaStore';

/** 从各领域 store 收集状态，装配为当前版本 payload。 */
export function buildPayload(): SavePayloadV2 {
  const profile = useProfileStore();
  const deck = useDeckStore();
  const viewing = useViewingStore();
  const collection = useCollectionStore();
  const nurture = useNurtureStore();
  const pve = usePveStore();
  const gacha = useGachaStore();

  const viewingData = viewing.serialize();
  const collectionData = collection.serialize();
  const gachaData = gacha.serialize();
  const pveData = pve.serialize();

  return {
    version: SAVE_VERSION,
    state: {
      ...profile.serializeCore(),
      savedDecks: deck.serialize(),
      ...viewingData,
    },
    ...collectionData,
    ...gachaData,
    characterNurtureData: nurture.serialize(),
    ...pveData,
  };
}

/** 把（已迁移到当前版本的）payload 分发给各领域 store。 */
export function applyPayload(payload: SavePayloadV2) {
  const profile = useProfileStore();
  profile.deserializeCore(payload.state);
  useDeckStore().deserialize(payload.state.savedDecks);
  useViewingStore().deserialize({
    viewingQueue: payload.state.viewingQueue,
    watchedAnime: payload.state.watchedAnime,
    viewingStats: payload.state.viewingStats,
  });
  useCollectionStore().deserialize({
    animeCollection: payload.animeCollection,
    characterCollection: payload.characterCollection,
    favoriteAnime: payload.favoriteAnime,
    favoriteCharacters: payload.favoriteCharacters,
  });
  useGachaStore().deserialize({
    animePity: payload.animePity,
    characterPity: payload.characterPity,
    animeHistory: payload.animeHistory,
    characterHistory: payload.characterHistory,
  });
  useNurtureStore().deserialize(payload.characterNurtureData);
  usePveStore().deserialize({
    presetSquads: payload.presetSquads,
    towerProgress: payload.towerProgress,
  });
}

/** 全部领域回到初始态（新玩家 / 登出）。 */
export function resetAllDomains() {
  useProfileStore().reset();
  useDeckStore().reset();
  useViewingStore().reset();
  useCollectionStore().reset();
  useGachaStore().reset();
  useNurtureStore().reset();
  usePveStore().reset();
}

// 保存串行化 + 合并：同一时刻最多一个写请求在路上，连发的保存坍缩为一次
// （payload 在真正发送时才装配，天然带上最新状态）。
// 背景：后端用非原子写（S10 再加固），单客户端并发 POST 会互相截断损坏存档文件。
let saveChain: Promise<void> = Promise.resolve();
let saveQueued = false;

/** 保存到服务器。未登录时静默跳过；await 返回时本次调用时点的状态已落盘。 */
export function saveToServer(showAlert = false): Promise<void> {
  if (!useProfileStore().currentUser) return Promise.resolve();
  if (saveQueued) return saveChain; // 已有排队中的保存，会带上最新状态

  saveQueued = true;
  saveChain = saveChain.then(async () => {
    saveQueued = false; // 从这里开始的新变更需要重新排队
    const profile = useProfileStore();
    if (!profile.currentUser) return;
    try {
      await pushUserSave(profile.currentUser, buildPayload());
      if (showAlert) profile.addLog('存档已手动保存到服务器！', 'success');
    } catch (error) {
      console.error('Failed to save user data:', error);
      if (showAlert) profile.addLog('存档失败，请检查浏览器控制台日志。', 'warning');
    }
  });
  return saveChain;
}

/** 从服务器加载当前用户的存档（任意历史版本经 migrate 归一）。 */
export async function loadFromServer(): Promise<void> {
  const profile = useProfileStore();
  if (!profile.currentUser) return;

  try {
    const result = await fetchUserSave(profile.currentUser);
    if (result.isNewUser) {
      resetAllDomains();
      profile.addLog('欢迎新玩家！已为您初始化默认存档。', 'success');
    } else {
      applyPayload(migrate(result.raw));
      profile.addLog('成功从服务器加载存档。', 'info');
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    alert('加载存档失败，将使用初始设置。');
    resetAllDomains();
  }
}
