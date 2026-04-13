/**
 * Phase 5 Tactical Synthesizer
 * Pure Web Audio API implementation for high-tech synthetic feedback.
 */
export class TacticalSynthesizer {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;

  private init() {
    if (this.audioCtx) return;
    try {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.connect(this.audioCtx.destination);
      this.masterGain.gain.value = this.volume;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
    }
  }

  private createOscillator(freq: number, type: OscillatorType = 'sine'): OscillatorNode | null {
    this.init();
    if (!this.audioCtx) return null;
    const osc = this.audioCtx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
    return osc;
  }

  public playTick() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    
    const osc = this.createOscillator(880, 'sine');
    if (!osc) return;
    
    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    const now = this.audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playBlip() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.createOscillator(1200, 'sine');
    if (!osc) return;

    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playSuccess() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    
    const now = this.audioCtx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    
    freqs.forEach((freq, i) => {
      const osc = this.createOscillator(freq, 'sine');
      if (!osc) return;

      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      gain.gain.setValueAtTime(0, now + (i * 0.02));
      gain.gain.linearRampToValueAtTime(0.15, now + (i * 0.02) + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.8);
      
      osc.start(now + (i * 0.02));
      osc.stop(now + 0.8);
    });
  }

  public playWarning() {
    this.init();
    if (!this.audioCtx || !this.masterGain) return;
    
    const now = this.audioCtx.currentTime;
    const osc = this.createOscillator(110, 'square');
    if (!osc) return;

    const gain = this.audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const synth = new TacticalSynthesizer();
