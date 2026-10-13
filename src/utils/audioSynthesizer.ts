// Ambient Savanna Soundscape Generator using Web Audio API
class SavannaAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private activeOscillators: Set<OscillatorNode> = new Set();

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return this.isPlaying;
    }
  }

  public getStatus(): boolean {
    return this.isPlaying;
  }

  public start(): boolean {
    if (typeof window === 'undefined') return false;

    // Early return guard: prevent duplicate initialization when engine is already running
    if (this.isPlaying) return true;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // 1. Gentle Savanna Breeze (Brown Noise filtered)
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }

      this.windSource = this.ctx.createBufferSource();
      this.windSource.buffer = noiseBuffer;
      this.windSource.loop = true;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(320, this.ctx.currentTime);

      this.windGain = this.ctx.createGain();
      this.windGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

      this.windSource.connect(this.filterNode);
      this.filterNode.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      this.windSource.start(0);

      // 2. High savanna crickets / cicadas pulse
      this.startCicadaLayer();

      this.isPlaying = true;
      return true;
    } catch {
      this.isPlaying = false;
      return false;
    }
  }

  private startCicadaLayer() {
    if (!this.ctx || !this.masterGain) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (!this.ctx || !this.masterGain || !this.isPlaying || this.ctx.state !== 'running') return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4500 + Math.random() * 500, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        this.activeOscillators.add(osc);
        osc.onended = () => {
          this.activeOscillators.delete(osc);
        };

        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
      } catch {}
    }, 1800);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Stop and disconnect active oscillators
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators.clear();

    // Stop wind source
    if (this.windSource) {
      try {
        this.windSource.stop();
        this.windSource.disconnect();
      } catch {}
      this.windSource = null;
    }

    if (this.filterNode) {
      try {
        this.filterNode.disconnect();
      } catch {}
      this.filterNode = null;
    }

    if (this.windGain) {
      try {
        this.windGain.disconnect();
      } catch {}
      this.windGain = null;
    }

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.suspend().catch(() => {});
      } catch {}
    }

    this.isPlaying = false;
  }
}

export const savannaAudio = new SavannaAudioEngine();
