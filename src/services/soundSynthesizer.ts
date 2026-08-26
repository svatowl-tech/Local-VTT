/**
 * High-performance Web Audio API Procedural Sound Synthesizer
 * Provides instant zero-latency SFX generation for TTRPG presets and emergency audio fallback.
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a procedural preset sound by key
   */
  public playPreset(preset: string, volume: number = 0.8): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(1, volume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    switch (preset.toLowerCase()) {
      case 'sword':
      case 'combat':
      case 'strike':
        this.synthSwordClash(ctx, masterGain);
        break;
      case 'dragon':
      case 'roar':
      case 'monster':
        this.synthDragonRoar(ctx, masterGain);
        break;
      case 'thunder':
      case 'lightning':
      case 'storm':
        this.synthThunder(ctx, masterGain);
        break;
      case 'spell':
      case 'fireball':
      case 'fire':
      case 'magic':
        this.synthSpellBlast(ctx, masterGain);
        break;
      case 'dice':
      case 'roll':
        this.synthDiceRoll(ctx, masterGain);
        break;
      case 'horn':
      case 'warhorn':
        this.synthWarHorn(ctx, masterGain);
        break;
      case 'door':
      case 'creak':
        this.synthDoorCreak(ctx, masterGain);
        break;
      case 'cheer':
      case 'tavern':
        this.synthCheer(ctx, masterGain);
        break;
      case 'chime':
      case 'bell':
      case 'ding':
        this.synthMagicChime(ctx, masterGain);
        break;
      default:
        this.synthGenericClick(ctx, masterGain);
        break;
    }
  }

  // 1. Sword clash / metal swish
  private synthSwordClash(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    
    // High metallic ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.4);

    // Noise burst for scrape
    this.createNoiseBurst(ctx, destination, now, 0.15, 2200, 0.6);
  }

  // 2. Dragon / monster deep roar
  private synthDragonRoar(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.8);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.9, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.95);
  }

  // 3. Thunder crack and rumble
  private synthThunder(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    // Initial crack
    this.createNoiseBurst(ctx, destination, now, 0.2, 1200, 0.9);

    // Low frequency rumble
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.8, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 1.35);
  }

  // 4. Magic spell fireball explosion
  private synthSpellBlast(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    // Rising sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.6);

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.7);

    // Fire whoosh
    this.createNoiseBurst(ctx, destination, now + 0.08, 0.5, 800, 0.5);
  }

  // 5. Dice roll clatter
  private synthDiceRoll(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const clicks = [0, 0.06, 0.13, 0.19, 0.26, 0.32];
    clicks.forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const clickTime = now + offset;
      const freq = 600 + Math.random() * 500;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, clickTime);
      osc.frequency.exponentialRampToValueAtTime(150, clickTime + 0.04);

      const amp = (0.7 - idx * 0.08) * (0.8 + Math.random() * 0.4);
      gain.gain.setValueAtTime(amp, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.04);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(clickTime);
      osc.stop(clickTime + 0.05);
    });
  }

  // 6. Brass war horn
  private synthWarHorn(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.linearRampToValueAtTime(245, now + 0.3);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(330, now);
    osc2.frequency.linearRampToValueAtTime(367, now + 0.3);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 1.15);
    osc2.stop(now + 1.15);
  }

  // 7. Door creak
  private synthDoorCreak(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(310, now + 0.25);
    osc.frequency.linearRampToValueAtTime(190, now + 0.55);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  // 8. Cheer / Crowd murmur
  private synthCheer(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    this.createNoiseBurst(ctx, destination, now, 0.8, 1600, 0.4);
  }

  // 9. Crystalline Magic Chime
  private synthMagicChime(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, startTime);

      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

      osc.connect(gain);
      gain.connect(destination);
      osc.start(startTime);
      osc.stop(startTime + 0.75);
    });
  }

  // Generic UI feedback click
  private synthGenericClick(ctx: AudioContext, destination: AudioNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.06);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  private createNoiseBurst(
    ctx: AudioContext,
    destination: AudioNode,
    startTime: number,
    duration: number,
    filterFreq: number,
    gainLevel: number
  ): void {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    whiteNoise.start(startTime);
    whiteNoise.stop(startTime + duration);
  }
}

export const soundSynthesizer = new SoundSynthesizer();
