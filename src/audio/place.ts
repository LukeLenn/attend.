// Turns a mono loop into a stereo, placed sound (pan, distance, room reverb)
// and encodes it as a WAV file. All plain TypeScript, so it runs the same on
// device and in Node tests, and the result plays through a simple looping
// player with no live audio graph to manage.

import type { SpotId } from '../types';
import { SAMPLE_RATE } from './synth';

interface Placement {
  pan: number;   // -1 left … +1 right
  far: boolean;
}

/** One-pole lowpass: gentle darkening for distant sounds. */
function lowpass(x: Float32Array<ArrayBuffer>, cutoff: number, sr: number): Float32Array<ArrayBuffer> {
  const out = new Float32Array(x.length);
  const a = Math.exp((-2 * Math.PI * cutoff) / sr);
  let y = 0;
  // two passes over the loop so the filter state wraps seamlessly
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < x.length; i++) {
      y = (1 - a) * x[i] + a * y;
      if (pass === 1) out[i] = y;
    }
  }
  return out;
}

class Comb {
  private buf: Float32Array;
  private i = 0;
  private store = 0;
  constructor(size: number, private feedback: number, private damp: number) { this.buf = new Float32Array(size); }
  run(x: number): number {
    const y = this.buf[this.i];
    this.store = y * (1 - this.damp) + this.store * this.damp;
    this.buf[this.i] = x + this.store * this.feedback;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
}

class Allpass {
  private buf: Float32Array;
  private i = 0;
  constructor(size: number) { this.buf = new Float32Array(size); }
  run(x: number): number {
    const b = this.buf[this.i];
    const y = -x + b;
    this.buf[this.i] = x + b * 0.5;
    if (++this.i >= this.buf.length) this.i = 0;
    return y;
  }
}

/**
 * A small, soft room (Freeverb-style). Runs over the loop twice so the
 * reverb tail from the end of the loop is already present at its start.
 */
function reverb(x: Float32Array<ArrayBuffer>, sr: number): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
  const k = sr / 44100;
  const combs = [1116, 1188, 1277, 1356].map(n => new Comb(Math.floor(n * k), 0.84, 0.3));
  const apL = [556, 441].map(n => new Allpass(Math.floor(n * k)));
  const apR = [579, 464].map(n => new Allpass(Math.floor(n * k)));
  const L = new Float32Array(x.length), R = new Float32Array(x.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < x.length; i++) {
      const v = x[i] * 0.25;
      let c = 0;
      for (const cb of combs) c += cb.run(v);
      let l = c, r = c;
      for (const a of apL) l = a.run(l);
      for (const a of apR) r = a.run(r);
      if (pass === 1) { L[i] = l; R[i] = r; }
    }
  }
  return [L, R];
}

/** Interleaved 16-bit stereo WAV. */
function encodeWav(L: Float32Array, R: Float32Array, sr: number): Uint8Array<ArrayBuffer> {
  const n = L.length, dataBytes = n * 4;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataBytes, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
    o += 4;
  }
  return new Uint8Array(buf);
}

export function placeLoop(mono: Float32Array<ArrayBuffer>, p: Placement, sr = SAMPLE_RATE): Uint8Array<ArrayBuffer> {
  const src = p.far ? lowpass(mono, 1800, sr) : mono;
  const dry = p.far ? 0.5 : 1;
  const wet = p.far ? 0.55 : 0.12;
  const theta = ((p.pan + 1) * Math.PI) / 4; // constant-power pan
  const gl = Math.cos(theta) * Math.SQRT2 * dry;
  const gr = Math.sin(theta) * Math.SQRT2 * dry;
  const [rl, rr] = reverb(src, sr);
  const L = new Float32Array(src.length), R = new Float32Array(src.length);
  // reverb sits a little toward the sound's side, but always fills both ears
  const wl = wet * (1 - 0.3 * p.pan), wr = wet * (1 + 0.3 * p.pan);
  for (let i = 0; i < src.length; i++) {
    L[i] = src[i] * gl + rl[i] * wl;
    R[i] = src[i] * gr + rr[i] * wr;
  }
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  if (peak > 0.9) {
    const g = 0.9 / peak;
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
  }
  return encodeWav(L, R, sr);
}

export function fileName(id: string, spot: SpotId): string {
  return `v2-${id}-${spot}.wav`;
}
