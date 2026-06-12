/**
 * 皮肤状态（S7 重写）。
 * 颜色真值在 assets/skins.css，切换 = 改 <html data-skin>；本 store 只管：
 *  - 当前皮肤 id + localStorage 设备级缓存（登录前/index.html 首屏防闪也读它）；
 *  - 账号同步：皮肤随存档走（appearance.skinId，协议 v4）。保存时机由门面
 *    userStore.setSkin 统一触发，这里不直接调 saveToServer（避免与装配器互相依赖）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { DEFAULT_SKIN_ID, LEGACY_THEME_MAP, isKnownSkin } from '@/config/skins';

const STORAGE_KEY = 'app-skin';
/** S7 之前旧主题系统的 localStorage 键，读到后就近迁移并清理。 */
const LEGACY_STORAGE_KEY = 'app-theme';

function applySkinToDom(id: string) {
  if (typeof document === 'undefined') return; // node 测试环境无 DOM
  document.documentElement.setAttribute('data-skin', id);
}

function readLocalSkin(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isKnownSkin(saved)) return saved;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && LEGACY_THEME_MAP[legacy]) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return LEGACY_THEME_MAP[legacy];
    }
  } catch {
    /* localStorage 不可用时静默回落默认皮肤 */
  }
  return DEFAULT_SKIN_ID;
}

export const useThemeStore = defineStore('theme', () => {
  const currentSkinId = ref<string>(readLocalSkin());

  function setSkin(id: string) {
    const resolved = isKnownSkin(id) ? id : DEFAULT_SKIN_ID;
    currentSkinId.value = resolved;
    applySkinToDom(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch {
      /* 设备缓存写不进就算了，账号侧仍会随存档恢复 */
    }
  }

  /** 登录加载存档时由装配器调用：账号皮肤覆盖设备缓存。 */
  function applyFromSave(skinId: string) {
    setSkin(skinId);
  }

  // 实例化即生效（App.vue 启动时调用一次）
  applySkinToDom(currentSkinId.value);

  return { currentSkinId, setSkin, applyFromSave };
});
