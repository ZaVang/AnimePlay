/**
 * 一次性状态标记追踪器（原 core/systems/StatusEffectSystem）。
 * S4 改为可实例化的纯类：engine 不持全局单例，实例由调用方（skills/systems.ts）持有，
 * 将来服务端可按对局各建一份。
 */
import type { PlayerId } from '@/types/battle';

interface PlayerStatus {
  nextCardAnyType: boolean;
}

export class StatusEffectTracker {
  private state: Record<PlayerId, PlayerStatus> = {
    playerA: { nextCardAnyType: false },
    playerB: { nextCardAnyType: false },
  };

  grantNextCardAnyType(playerId: PlayerId) {
    this.state[playerId].nextCardAnyType = true;
  }

  hasNextCardAnyType(playerId: PlayerId): boolean {
    return this.state[playerId].nextCardAnyType;
  }

  consumeNextCardAnyType(playerId: PlayerId): boolean {
    if (this.state[playerId].nextCardAnyType) {
      this.state[playerId].nextCardAnyType = false;
      return true;
    }
    return false;
  }

  clearAll() {
    this.state = {
      playerA: { nextCardAnyType: false },
      playerB: { nextCardAnyType: false },
    };
  }
}
