import { defineStore } from 'pinia';
import { ref } from 'vue';
import { synth } from '@/core/audio/Synthesizer';

export const useFXStore = defineStore('fx', () => {
  // --- STATE ---
  const isAudioEnabled = ref(true);
  const isVisualFXEnabled = ref(true);
  const masterVolume = ref(0.5);

  // --- ACTIONS ---
  function setVolume(val: number) {
    masterVolume.value = val;
    synth.setVolume(val);
  }

  function toggleAudio() {
    isAudioEnabled.value = !isAudioEnabled.value;
  }

  function toggleVisualFX() {
    isVisualFXEnabled.value = !isVisualFXEnabled.value;
  }

  // Tactical Audio Triggers
  function playTick() {
    if (isAudioEnabled.value) synth.playTick();
  }

  function playBlip() {
    if (isAudioEnabled.value) synth.playBlip();
  }

  function playSuccess() {
    if (isAudioEnabled.value) synth.playSuccess();
  }

  function playWarning() {
    if (isAudioEnabled.value) synth.playWarning();
  }

  // Surge Trigger (Coordinating Visuals and Audio)
  function triggerSurge() {
    if (isAudioEnabled.value) synth.playSuccess();
    
    // We emit an event that components can listen to, 
    // or components can just check isVisualFXEnabled.
    if (isVisualFXEnabled.value) {
      document.dispatchEvent(new CustomEvent('fx-surge', { detail: { timestamp: Date.now() } }));
    }
  }

  return {
    isAudioEnabled,
    isVisualFXEnabled,
    masterVolume,
    setVolume,
    toggleAudio,
    toggleVisualFX,
    playTick,
    playBlip,
    playSuccess,
    playWarning,
    triggerSurge
  };
});
