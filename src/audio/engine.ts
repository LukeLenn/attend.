// Native audio graph. Each playing sound is:
//   loop buffer → lowpass (distance) → gain → stereo pan → master
//                                               └→ reverb send ─┘
import { AudioContext, AudioManager } from 'react-native-audio-api';
import type { AudioBuffer, AudioBufferSourceNode, BiquadFilterNode, ConvolverNode, GainNode, StereoPannerNode } from 'react-native-audio-api';
import { LIBMAP, SPOTS } from '../sounds';
import { SoundId, SpotId } from '../types';
import { renderImpulse, renderLoop, SAMPLE_RATE } from './synth';

interface Voice {
  src: AudioBufferSourceNode;
  lp: BiquadFilterNode;
  gain: GainNode;
  pan: StereoPannerNode;
  send: GainNode;
  level: number;
}

const NEAR_CUTOFF = 14000;
const FAR_CUTOFF = 2000;
const FAR_GAIN = 0.42;

const yieldFrame = () => new Promise<void>(r => setTimeout(r, 0));

class Engine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private buffers = new Map<SoundId, AudioBuffer>();
  private voices = new Map<string, Voice>();
  private volume = 0.8;
  private ducked = false;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    try {
      // Playback category: plays with the silent switch on and keeps going
      // when the screen locks (UIBackgroundModes audio is set by the plugin).
      AudioManager.setSystemOptions({ ios: { category: 'playback', mode: 'spokenAudio', options: [] } });
    } catch {
      // Not fatal: sound still plays with the default session.
    }
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    const [l, r] = renderImpulse();
    const ir = ctx.createBuffer(2, l.length, SAMPLE_RATE);
    ir.copyToChannel(l, 0);
    ir.copyToChannel(r, 1);
    const reverb = ctx.createConvolver();
    reverb.buffer = ir;
    reverb.connect(master);
    this.ctx = ctx;
    this.master = master;
    this.reverb = reverb;
    return ctx;
  }

  /** Render any sounds not yet in memory. Yields between sounds so the UI stays responsive. */
  async prepare(ids: SoundId[]): Promise<void> {
    const ctx = this.ensure();
    for (const id of ids) {
      if (this.buffers.has(id)) continue;
      await yieldFrame();
      const data = renderLoop(id);
      const buf = ctx.createBuffer(1, data.length, SAMPLE_RATE);
      buf.copyToChannel(data, 0);
      this.buffers.set(id, buf);
    }
  }

  async resume(): Promise<void> {
    const ctx = this.ensure();
    if (ctx.state !== 'running') await ctx.resume();
  }

  async suspend(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend();
  }

  async play(key: string, id: SoundId, spot: SpotId, fadeSec = 2): Promise<void> {
    await this.prepare([id]);
    await this.resume();
    const ctx = this.ensure();
    const buffer = this.buffers.get(id);
    if (!buffer || !this.master || !this.reverb) return;
    this.stop(key, 0.05);
    const sp = SPOTS[spot];
    const level = LIBMAP[id].level;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = sp.far ? FAR_CUTOFF : NEAR_CUTOFF;
    const gain = ctx.createGain();
    const pan = ctx.createStereoPanner();
    pan.pan.value = sp.pan;
    const send = ctx.createGain();
    send.gain.value = sp.far ? 0.7 : 0.12;
    src.connect(lp);
    lp.connect(gain);
    gain.connect(pan);
    pan.connect(this.master);
    pan.connect(send);
    send.connect(this.reverb);
    const now = ctx.currentTime;
    const target = level * (sp.far ? FAR_GAIN : 1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(target, now + fadeSec);
    // Start each loop at a random point so the soundscape never repeats in step.
    src.start(now, Math.random() * buffer.duration);
    this.voices.set(key, { src, lp, gain, pan, send, level });
  }

  /** Move a playing sound to a new spot, smoothly. */
  move(key: string, spot: SpotId): void {
    const v = this.voices.get(key);
    if (!v || !this.ctx) return;
    const sp = SPOTS[spot], now = this.ctx.currentTime;
    v.pan.pan.linearRampToValueAtTime(sp.pan, now + 0.4);
    v.lp.frequency.linearRampToValueAtTime(sp.far ? FAR_CUTOFF : NEAR_CUTOFF, now + 0.4);
    v.gain.gain.linearRampToValueAtTime(v.level * (sp.far ? FAR_GAIN : 1), now + 0.4);
    v.send.gain.linearRampToValueAtTime(sp.far ? 0.7 : 0.12, now + 0.4);
  }

  stop(key: string, fadeSec = 1.5): void {
    const v = this.voices.get(key);
    if (!v || !this.ctx) return;
    this.voices.delete(key);
    const now = this.ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSec);
    try { v.src.stop(now + fadeSec + 0.05); } catch { /* already stopped */ }
    setTimeout(() => { try { v.pan.disconnect(); v.send.disconnect(); } catch { /* gone */ } }, fadeSec * 1000 + 300);
  }

  stopAll(fadeSec = 1.5, prefix = ''): void {
    for (const k of [...this.voices.keys()]) if (k.startsWith(prefix)) this.stop(k, fadeSec);
  }

  isPlaying(key: string): boolean {
    return this.voices.has(key);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyMaster(0.2);
  }

  /** Lower the soundscape while the guide speaks. */
  duck(on: boolean): void {
    this.ducked = on;
    this.applyMaster(0.25);
  }

  private applyMaster(ramp: number) {
    if (!this.master || !this.ctx) return;
    const now = this.ctx.currentTime;
    const target = this.volume * (this.ducked ? 0.55 : 1);
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(target, now + ramp);
  }

  /** A soft two-note chime, used when no voice is available. */
  chime(): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.02;
    for (const [f, at, peak] of [[880, 0, 0.15], [1318.5, 0.12, 0.1]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(peak, t + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.8);
      o.connect(g);
      g.connect(this.master);
      o.start(t + at);
      o.stop(t + at + 0.85);
    }
  }
}

export const engine = new Engine();
