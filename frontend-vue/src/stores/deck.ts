/**
 * deck 领域 store（S5 自 userStore 拆出）：已保存卡组的 CRUD。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Deck } from '@/types/player';
import { useProfileStore } from './profile';

export const useDeckStore = defineStore('deck', () => {
  const savedDecks = ref<Record<string, Deck>>({});

  function saveDeck(deck: Deck) {
    useProfileStore().addLog(`卡组 [${deck.name}] 已保存。`, 'info');
    savedDecks.value = { ...savedDecks.value, [deck.name]: deck };
  }

  /** 返回是否真的删除了（不存在则 false）。 */
  function deleteDeck(deckName: string): boolean {
    if (!savedDecks.value[deckName]) return false;
    useProfileStore().addLog(`卡组 [${deckName}] 已删除。`, 'warning');
    const next = { ...savedDecks.value };
    delete next[deckName];
    savedDecks.value = next;
    return true;
  }

  // --- 持久化装配 ---

  function serialize(): Record<string, Deck> {
    return savedDecks.value;
  }

  function deserialize(decks: Record<string, Deck>) {
    savedDecks.value = decks || {};
  }

  function reset() {
    savedDecks.value = {};
  }

  return { savedDecks, saveDeck, deleteDeck, serialize, deserialize, reset };
});
