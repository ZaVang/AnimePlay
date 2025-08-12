// Minimal status effect system to support one-shot, per-player flags

type PlayerId = 'playerA' | 'playerB';

interface PlayerStatus {
  nextCardAnyType: boolean;
}

const state: Record<PlayerId, PlayerStatus> = {
  playerA: { nextCardAnyType: false },
  playerB: { nextCardAnyType: false },
};

export const StatusEffectSystem = {
  grantNextCardAnyType(playerId: PlayerId) {
    state[playerId].nextCardAnyType = true;
  },
  hasNextCardAnyType(playerId: PlayerId): boolean {
    return state[playerId].nextCardAnyType;
  },
  consumeNextCardAnyType(playerId: PlayerId): boolean {
    if (state[playerId].nextCardAnyType) {
      state[playerId].nextCardAnyType = false;
      return true;
    }
    return false;
  },
};


