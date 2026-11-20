// Pure-TypeScript sound synthesis. Each sound is rendered once into a
// seamless mono loop; at play time the loop is filtered, panned and sent to
// reverb by the native audio graph. Rendering ahead (instead of scheduling
// thousands of tiny events from JS) keeps the soundscape steady even if JS
// is busy or the screen locks.

import type { SoundId } from '../types';

export const SAMPLE_RATE = 44100;
export const LOOP_SECONDS = 32;
const XFADE = 1.5;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <X>(arr: X[]): X => arr[Math.floor(Math.random() * arr.length)];

type FilterType = 'lowpass' | 'highpass' | 'bandpass';

class Biquad {
  private b0 = 0; private b1 = 0; private b2 = 0; private a1 = 0; private a2 = 0;
  private x1 = 0; private x2 = 0; private y1 = 0; private y2 = 0;
  constructor(private type: FilterType, freq: number, private q: number, private sr: number) {
    this.set(freq);
  }
  set(freq: number) {
    const w = (2 * Math.PI * Math.min(freq, this.sr * 0.45)) / this.sr;
    const cos = Math.cos(w), alpha = Math.sin(w) / (2 * this.q);
    let b0: number, b1: number, b2: number;
    if (this.type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    else if (this.type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  run(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

/** Envelope: linear attack, exponential decay reaching ~-60 dB at attack+decay. */
function envAt(t: number, attack: number, decay: number): number {
  if (t < 0) return 0;
  if (t < attack) return t / attack;
  return Math.exp((-(t - attack) * 6.9) / decay);
}

class Track {
  readonly data: Float32Array<ArrayBuffer>;
  readonly sr: number;
  constructor(seconds: number, sr: number) {
    this.sr = sr;
    this.data = new Float32Array(Math.floor(seconds * sr));
  }
  get seconds() { return this.data.length / this.sr; }

  tone(at: number, f0: number, f1: number | null, sweep: number, peak: number, attack: number, decay: number) {
    const sr = this.sr, start = Math.floor(at * sr), n = Math.floor((attack + decay) * sr);
    let phase = 0;
    const ratio = f1 ? f1 / f0 : 1;
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      if (idx >= this.data.length) break;
      const t = i / sr;
      const f = f1 && t < sweep ? f0 * Math.pow(ratio, t / sweep) : f1 ?? f0;
      phase += (2 * Math.PI * f) / sr;
      this.data[idx] += Math.sin(phase) * peak * envAt(t, attack, decay);
    }
  }

  burst(at: number, dur: number, freq: number, q: number, peak: number, decay: number) {
    const sr = this.sr, start = Math.floor(at * sr), n = Math.floor((dur + decay) * sr);
    const bp = new Biquad('bandpass', freq, q, sr);
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      if (idx >= this.data.length) break;
      const t = i / sr;
      this.data[idx] += bp.run(Math.random() * 2 - 1) * peak * envAt(t, 0.002, decay);
    }
  }

  /** Continuous noise bed. `shape` gives gain and filter cutoff over time. */
  bed(kind: 'white' | 'brown', filters: [FilterType, number, number][], gain: number, shape?: (t: number) => { g: number; f?: number }) {
    const sr = this.sr;
    const fs = filters.map(([ty, f, q]) => new Biquad(ty, f, q, sr));
    let last = 0;
    let g = gain;
    for (let i = 0; i < this.data.length; i++) {
      let x = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * x) / 1.02; x = last * 3.5; }
      if (shape && (i & 63) === 0) {
        const s = shape(i / sr);
        g = gain * s.g;
        if (s.f) fs[0].set(s.f);
      }
      for (const f of fs) x = f.run(x);
      this.data[i] += x * g;
    }
  }

  sine(freq: number, amp: number) {
    const w = (2 * Math.PI * freq) / this.sr;
    for (let i = 0; i < this.data.length; i++) this.data[i] += Math.sin(w * i) * amp;
  }

  /** Repeating events from `from` until the end. */
  every(gap: () => number, play: (t: number) => void, from = rand(0, 0.6)) {
    for (let t = from; t < this.seconds - 0.05; t += gap()) play(t);
  }
}

const RECIPES: Record<SoundId, (k: Track) => void> = {
  clock(k) {
    let tock = false;
    k.every(() => 1, t => {
      k.burst(t, 0.03, tock ? 2400 : 3200, 6, 2.6, 0.035);
      k.tone(t, tock ? 1500 : 1900, null, 0, 0.12, 0.001, 0.025);
      tock = !tock;
    }, 0.25);
  },
  drip(k) {
    k.every(() => rand(1.3, 3.2), t => {
      k.tone(t, 650, 1500, 0.06, 0.45, 0.002, 0.14);
      if (Math.random() < 0.4) k.tone(t + 0.18, 900, 1300, 0.04, 0.1, 0.002, 0.08);
    });
  },
  rain(k) {
    k.bed('white', [['highpass', 700, 0.7], ['lowpass', 6000, 0.7]], 0.18);
    k.every(() => rand(0.015, 0.07), t => k.burst(t, 0.01, rand(2000, 7000), 3, rand(0.05, 0.25), 0.012));
  },
  birds(k) {
    k.every(() => rand(2.2, 6), t => {
      const n = 2 + Math.floor(Math.random() * 5), base = rand(2600, 3800), up = Math.random() < 0.6;
      let tt = t;
      for (let i = 0; i < n; i++) {
        const f = base * rand(0.9, 1.1);
        k.tone(tt, f, up ? f * 1.4 : f * 0.7, 0.07, 0.22, 0.006, 0.09);
        tt += rand(0.1, 0.18);
      }
    });
  },
  chimes(k) {
    const notes = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    k.every(() => rand(1.2, 4.2), t => {
      const count = Math.random() < 0.35 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const f = pick(notes), tt = t + j * rand(0.15, 0.4);
        k.tone(tt, f, null, 0, 0.16, 0.003, 3.5);
        k.tone(tt, f * 2.76, null, 0, 0.05, 0.003, 1.4);
        k.tone(tt, f * 5.4, null, 0, 0.025, 0.003, 0.7);
      }
    });
  },
  traffic(k) {
    // a low rumble that swells slowly, with the odd car passing
    k.bed('brown', [['lowpass', 450, 0.7]], 0.55, t => ({ g: 1 + 0.45 * Math.sin((2 * Math.PI * t) / 16) }));
    const passes: number[] = [];
    for (let t = rand(1, 4); t < k.seconds - 5; t += rand(6, 11)) passes.push(t);
    k.bed('brown', [['lowpass', 250, 0.7]], 0.9, t => {
      for (const p of passes) {
        const u = (t - p) / 4.5;
        if (u >= 0 && u <= 1) { const s = Math.sin(Math.PI * u); return { g: s, f: 250 + 650 * s }; }
      }
      return { g: 0, f: 250 };
    });
  },
  fire(k) {
    k.bed('brown', [['lowpass', 300, 0.7]], 0.5);
    k.every(() => rand(0.05, 0.35), t => k.burst(t, 0.008, rand(1500, 5000), 2, rand(0.1, 0.5), 0.01));
    k.every(() => rand(1.5, 4), t => {
      for (let i = 0; i < 4; i++) k.burst(t + i * rand(0.02, 0.06), 0.01, rand(800, 2500), 1.5, rand(0.3, 0.8), 0.015);
    });
  },
  waves(k) {
    const waves: [number, number][] = [];
    for (let t = rand(0, 1); t < k.seconds; t += rand(7, 10)) waves.push([t, rand(6, 8.5)]);
    k.bed('white', [['lowpass', 400, 0.7]], 0.5, t => {
      for (const [s, d] of waves) {
        const u = (t - s) / d;
        if (u >= 0 && u <= 1) { const e = u < 0.45 ? u / 0.45 : (1 - u) / 0.55; return { g: 0.1 + 0.9 * e, f: 400 + 1800 * e }; }
      }
      return { g: 0.1, f: 400 };
    });
  },
  crickets(k) {
    k.every(() => rand(0.6, 1.4), t => {
      const f = rand(4300, 4700), n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) k.tone(t + i * 0.045, f, null, 0, 0.18, 0.004, 0.03);
    });
  },
  fridge(k) {
    k.sine(100, 0.15);
    k.sine(200, 0.055);
    k.sine(300.5, 0.02);
    k.bed('brown', [['lowpass', 900, 0.7]], 0.05);
  },
  keys(k) {
    let t = rand(0.2, 1);
    while (t < k.seconds - 0.2) {
      const n = 4 + Math.floor(Math.random() * 14);
      for (let i = 0; i < n && t < k.seconds - 0.2; i++) {
        k.burst(t, 0.015, rand(2500, 4200), 4, rand(0.8, 1.6), 0.02);
        k.tone(t, rand(180, 260), null, 0, 0.06, 0.001, 0.03);
        t += rand(0.08, 0.22);
      }
      t += rand(0.8, 3);
    }
  },
  bell(k) {
    k.every(() => rand(9, 15), t => {
      const f = 220;
      for (const [m, a, d] of [[1, 0.25, 6], [2, 0.12, 4], [2.4, 0.1, 3.5], [3, 0.07, 2.5], [4.2, 0.05, 1.6], [0.5, 0.12, 7]]) {
        k.tone(t, f * m, null, 0, a, 0.005, d);
      }
    }, rand(0.5, 3));
  },
};

const TARGET_RMS = 0.11;

/** Render one sound as a seamless loop (mono, peak-safe, loudness-matched). */
export function renderLoop(id: SoundId, seconds = LOOP_SECONDS, sr = SAMPLE_RATE): Float32Array<ArrayBuffer> {
  const k = new Track(seconds + XFADE, sr);
  RECIPES[id](k);
  const n = Math.floor(seconds * sr), x = Math.floor(XFADE * sr);
  const out = new Float32Array(n);
  out.set(k.data.subarray(0, n));
  // Crossfade the overhang into the start so the loop point is inaudible.
  for (let i = 0; i < x; i++) {
    const a = i / x;
    out[i] = out[i] * Math.sqrt(a) + k.data[n + i] * Math.sqrt(1 - a);
  }
  let sum = 0, peak = 0;
  for (let i = 0; i < n; i++) { sum += out[i] * out[i]; peak = Math.max(peak, Math.abs(out[i])); }
  const rms = Math.sqrt(sum / n) || 1;
  let gain = TARGET_RMS / rms;
  if (peak * gain > 0.95) gain = 0.95 / peak;
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}

/** A soft room reverb impulse, stereo. */
export function renderImpulse(seconds = 2.8, sr = SAMPLE_RATE): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const n = Math.floor(seconds * sr);
  const make = () => {
    const d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
    return d;
  };
  return [make(), make()];
}
