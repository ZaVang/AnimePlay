/**
 * 存档装配器（S5 建立）：把各领域 store 的 serialize/deserialize 绑到
 * infra/persistence 的显式 schema 上。
 * - 领域 store 自己不触发保存；保存时机由门面 userStore 的动作统一调用 saveToServer()。
 * - 新增持久化字段：schema.ts + migrations.ts + 这里，三处同改。
 */
import { migrate, fetchUserSave, pushUserSave, SAVE_VERSION, type SavePayload } from '@/infra/persistence';
import { useProfileStore } from './profile';
import { useCollectionStore } from './collection';
import { useDeckStore } from './deck';
import { useViewingStore } from './viewing';
import { useNurtureStore } from './nurture';
import { usePveStore } from './pve';
import { useGachaStore } from './gachaStore';
import { useShopStore } from './shop';
import { useGuessStore } from './guess';
import { useThemeStore } from './theme';
import { useDailyStore } from './daily';
import { useCodexStore } from './codex';
import { useAchievementsStore } from './achievements';
import { useMiniGamesStore } from './minigames/higherLower';
import { useHomesteadStore } from './homestead';
import { useEquipmentStore } from './equipment';

// 乐观并发基线（S10-T3）：loadFromServer 后设为服务端的 saveVersion（新用户 0），
// buildPayload 带上它，pushUserSave 成功后更新为后端返回的权威新值。
// 这是「第几次保存」的计数，与 schema 的 version（协议版本）无关。
let currentSaveVersion = 0;

/** 测试辅助：读取当前并发基线。 */
export function getCurrentSaveVersion(): number {
  return currentSaveVersion;
}

/** 从各领域 store 收集状态，装配为当前版本 payload。 */
export function buildPayload(): SavePayload {
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
    saveVersion: currentSaveVersion,
    state: {
      ...profile.serializeCore(),
      savedDecks: deck.serialize(),
      ...viewingData,
    },
    ...collectionData,
    ...gachaData,
    characterNurtureData: nurture.serialize(),
    ...pveData,
    shopPurchases: useShopStore().serialize(),
    guess: useGuessStore().serialize(),
    appearance: { skinId: useThemeStore().currentSkinId },
    daily: useDailyStore().serialize(),
    codexMilestones: useCodexStore().serialize(),
    achievements: useAchievementsStore().serialize(),
    minigames: useMiniGamesStore().serialize(),
    homestead: useHomesteadStore().serialize(),
    equipment: useEquipmentStore().serialize(),
  };
}

/** 把（已迁移到当前版本的）payload 分发给各领域 store。 */
export function applyPayload(payload: SavePayload) {
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
  useShopStore().deserialize(payload.shopPurchases);
  useGuessStore().deserialize(payload.guess);
  useDailyStore().deserialize(payload.daily);
  useCodexStore().deserialize(payload.codexMilestones);
  useAchievementsStore().deserialize(payload.achievements);
  useMiniGamesStore().deserialize(payload.minigames);
  useHomesteadStore().deserialize(payload.homestead);
  useEquipmentStore().deserialize(payload.equipment);
  // 皮肤随账号走：账号存档覆盖设备缓存（登出/重置不回滚皮肤，见 resetAllDomains）
  useThemeStore().applyFromSave(payload.appearance.skinId);
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
  useShopStore().reset();
  useGuessStore().reset();
  useDailyStore().reset();
  useCodexStore().reset();
  useAchievementsStore().reset();
  useMiniGamesStore().reset();
  useHomesteadStore().reset();
  useEquipmentStore().reset();
  // 注意：皮肤是设备/账号双层偏好，登出或新建账号不强制回滚到默认皮肤。
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
      const result = await pushUserSave(profile.currentUser, buildPayload());
      // 后端权威递增：更新基线，下一次保存才不会撞 409。
      currentSaveVersion = result.saveVersion;
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
      currentSaveVersion = 0; // 新用户从 0 起算
      profile.addLog('欢迎新玩家！已为您初始化默认存档。', 'success');
    } else {
      const payload = migrate(result.raw);
      applyPayload(payload);
      currentSaveVersion = payload.saveVersion; // 记下服务端基线
      profile.addLog('成功从服务器加载存档。', 'info');
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
    // 脱离组件上下文：降级为非阻塞 toast（复用 addLog 通知通道），不弹原生 alert。
    profile.addLog('加载存档失败，将使用初始设置。', 'warning');
    resetAllDomains();
    currentSaveVersion = 0;
  }
}
