import { useFXStore } from '@/stores/modules/fxStore';

/**
 * useTacticalAudio - Phase 5 Tactical Feedback Sound System
 */
export function useTacticalAudio() {
  const fxStore = useFXStore();

  const playSound = (type: 'click' | 'hover' | 'success' | 'warning' | 'scan') => {
    switch (type) {
      case 'click': fxStore.playTick(); break;
      case 'hover': fxStore.playTick(); break;
      case 'success': fxStore.playSuccess(); break;
      case 'warning': fxStore.playWarning(); break;
      case 'scan': fxStore.triggerSurge(); break;
    }
  };

  return {
    playSound,
    playClick: () => fxStore.playTick(),
    playHover: () => fxStore.playTick(),
    playSuccess: () => fxStore.playSuccess(),
    playWarning: () => fxStore.playWarning(),
    playSurge: () => fxStore.triggerSurge()
  };
}
