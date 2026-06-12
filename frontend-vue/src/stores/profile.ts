/**
 * profile 领域 store（S5 自 userStore 拆出）：
 * 会话身份、玩家等级/经验、三种货币、系统日志。
 * 货币变更的唯一入口是 spend()/earn() —— 组件不得再直改数值。
 * 注意：领域 store 不触发存档；保存时机由门面 userStore / stores/persistence 统一控制。
 */
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { CurrencyKey, LogEntry } from '@/types/player';
import type { SerializedPlayerState } from '@/infra/persistence';

interface ProfileCore {
  level: number;
  exp: number;
  animeGachaTickets: number;
  characterGachaTickets: number;
  knowledgePoints: number;
}

function createInitialCore(): ProfileCore {
  return {
    level: GAME_CONFIG.playerInitialState.level,
    exp: 0,
    animeGachaTickets: GAME_CONFIG.playerInitialState.animeGachaTickets,
    characterGachaTickets: GAME_CONFIG.playerInitialState.characterGachaTickets,
    knowledgePoints: GAME_CONFIG.playerInitialState.knowledgePoints,
  };
}

const CURRENCY_NAMES: Record<CurrencyKey, string> = {
  knowledgePoints: '知识点',
  animeGachaTickets: '动画券',
  characterGachaTickets: '角色券',
};

export const useProfileStore = defineStore('profile', () => {
  const currentUser = ref<string>('');
  const core = reactive<ProfileCore>(createInitialCore());
  const logs = ref<LogEntry[]>([]);

  const isLoggedIn = computed(() => !!currentUser.value);

  const expToNextLevel = computed(() => {
    const levelXP = GAME_CONFIG.gameplay.levelXP;
    if (core.level >= levelXP.length) return Infinity;
    return levelXP[core.level];
  });

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.unshift({ message, type, timestamp: Date.now() });
    if (logs.value.length > 50) {
      logs.value.pop();
    }
  }

  /**
   * 花费货币。余额不足时不变更并返回 false —— 这是全仓唯一的货币扣减入口。
   * 不自带提示：调用方根据场景给出具体文案（用 currencyName() 取中文名）。
   */
  function spend(currency: CurrencyKey, amount: number): boolean {
    if (amount < 0) return false;
    if (core[currency] < amount) return false;
    core[currency] -= amount;
    return true;
  }

  function currencyName(currency: CurrencyKey): string {
    return CURRENCY_NAMES[currency];
  }

  /** 获得货币 —— 这是全仓唯一的货币增加入口。 */
  function earn(currency: CurrencyKey, amount: number) {
    if (amount <= 0) return;
    core[currency] += amount;
  }

  /** 玩家经验与升级（升级奖励经 earn 发放）。 */
  function addExp(amount: number) {
    if (!isLoggedIn.value || amount === 0) return;
    addLog(`获得 ${amount} 点经验。`, 'info');
    core.exp += amount;
    let requiredExp = expToNextLevel.value;
    while (core.exp >= requiredExp) {
      core.exp -= requiredExp;
      const rewards = GAME_CONFIG.gameplay.levelUpRewards[core.level + 1];
      core.level++;

      if (rewards) {
        earn('animeGachaTickets', rewards.animeTickets);
        earn('characterGachaTickets', rewards.characterTickets);
        earn('knowledgePoints', rewards.knowledge);
        addLog(
          `恭喜！你已达到 ${core.level} 级！获得动画券 ${rewards.animeTickets} 张，角色券 ${rewards.characterTickets} 张，知识点 ${rewards.knowledge} 点。`,
          'success',
        );
      } else {
        addLog(`恭喜！你已达到 ${core.level} 级！`, 'success');
      }

      requiredExp = expToNextLevel.value;
      if (requiredExp === Infinity) break;
    }
  }

  // --- 持久化装配（由 stores/persistence.ts 调用） ---

  function serializeCore(): Pick<SerializedPlayerState, 'level' | 'exp' | 'animeGachaTickets' | 'characterGachaTickets' | 'knowledgePoints'> {
    return {
      level: core.level,
      exp: core.exp,
      animeGachaTickets: core.animeGachaTickets,
      characterGachaTickets: core.characterGachaTickets,
      knowledgePoints: core.knowledgePoints,
    };
  }

  function deserializeCore(state: SerializedPlayerState) {
    core.level = state.level;
    core.exp = state.exp;
    core.animeGachaTickets = state.animeGachaTickets;
    core.characterGachaTickets = state.characterGachaTickets;
    core.knowledgePoints = state.knowledgePoints;
  }

  function reset() {
    Object.assign(core, createInitialCore());
    logs.value = [];
  }

  return {
    currentUser,
    core,
    logs,
    isLoggedIn,
    expToNextLevel,
    addLog,
    spend,
    earn,
    currencyName,
    addExp,
    serializeCore,
    deserializeCore,
    reset,
  };
});
