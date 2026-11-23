// Plays the soundscape. Each sound + spot is rendered once (in TypeScript)
// into a stereo WAV in the cache folder, then played by a plain looping
// expo-audio player. No live native audio graph is touched during a
// session; the only things that change are each player's volume.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { LIBMAP } from '../sounds';
import { SoundId, SpotId } from '../types';
import { SPOTS } from '../sounds';
import { fileName, placeLoop } from './place';
import { renderLoop } from './synth';

interface Voice {
  player: AudioPlayer;
  level: number;
  fade: ReturnType<typeof setInterval> | null;
  gain: number; // 0..1 fade position
}

const yieldFrame = () => new Promise<void>(r => setTimeout(r, 0));

class Engine {
  private voices = new Map<string, Voice>();
  private volume = 0.8;
  private ducked = false;
  private modeSet = false;
  private dir: Directory | null = null;
  private rendering = new Map<string, Promise<string>>();

  private async ensureMode() {
    if (this.modeSet) return;
    this.modeSet = true;
    try {
      // Plays with the silent switch on and keeps going with the screen locked.
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'mixWithOthers' });
    } catch {
      this.modeSet = false;
    }
  }

  private folder(): Directory {
    if (!this.dir) {
      this.dir = new Directory(Paths.cache, 'attend-sounds');
      if (!this.dir.exists) this.dir.create({ intermediates: true, idempotent: true });
    }
    return this.dir;
  }

  /** Path to the rendered WAV for this sound in this spot, rendering it if needed. */
  private file(id: SoundId, spot: SpotId): Promise<string> {
    const name = fileName(id, spot);
    const pending = this.rendering.get(name);
    if (pending) return pending;
    const job = (async () => {
      const f = new File(this.folder(), name);
      if (f.exists && f.size > 1000) return f.uri;
      await yieldFrame();
      const mono = renderLoop(id);
      await yieldFrame();
      const wav = placeLoop(mono, { pan: SPOTS[spot].pan, far: SPOTS[spot].far });
      if (f.exists) f.delete();
      f.create();
      await f.write(wav);
      return f.uri;
    })();
    this.rendering.set(name, job);
    job.catch(() => {}).finally(() => this.rendering.delete(name));
    return job;
  }

  /** Render ahead of time. Reports progress as sounds finish. */
  async prepare(list: { id: SoundId; spot: SpotId }[], onProgress?: (done: number, total: number) => void): Promise<void> {
    let done = 0;
    for (const s of list) {
      await this.file(s.id, s.spot);
      onProgress?.(++done, list.length);
    }
  }

  private target(v: Voice): number {
    return v.level * this.volume * (this.ducked ? 0.5 : 1) * v.gain;
  }

  private rampTo(v: Voice, to: number, sec: number, done?: () => void) {
    if (v.fade) clearInterval(v.fade);
    const steps = Math.max(1, Math.round(sec * 20));
    const from = v.gain;
    let i = 0;
    v.fade = setInterval(() => {
      i++;
      v.gain = from + ((to - from) * i) / steps;
      try { v.player.volume = this.target(v); } catch { /* released */ }
      if (i >= steps) {
        if (v.fade) clearInterval(v.fade);
        v.fade = null;
        done?.();
      }
    }, 50);
  }

  async play(key: string, id: SoundId, spot: SpotId, fadeSec = 2): Promise<void> {
    await this.ensureMode();
    const uri = await this.file(id, spot);
    this.stop(key, 0.1);
    const player = createAudioPlayer({ uri });
    player.loop = true;
    player.volume = 0;
    const v: Voice = { player, level: LIBMAP[id].level, fade: null, gain: 0 };
    this.voices.set(key, v);
    // Start somewhere random in the loop so sounds never line up the same way.
    try { await player.seekTo(Math.random() * 28); } catch { /* not loaded yet: start at 0 */ }
    if (this.voices.get(key) !== v) { player.remove(); return; }
    player.play();
    this.rampTo(v, 1, fadeSec);
  }

  /** Move a playing sound: swap in the file for the new spot. */
  async move(key: string, id: SoundId, spot: SpotId): Promise<void> {
    if (!this.voices.has(key)) return;
    await this.play(key, id, spot, 0.4);
  }

  stop(key: string, fadeSec = 1.5): void {
    const v = this.voices.get(key);
    if (!v) return;
    this.voices.delete(key);
    this.rampTo(v, 0, fadeSec, () => {
      try { v.player.pause(); v.player.remove(); } catch { /* gone */ }
    });
  }

  stopAll(fadeSec = 1.5, prefix = ''): void {
    for (const k of [...this.voices.keys()]) if (k.startsWith(prefix)) this.stop(k, fadeSec);
  }

  isPlaying(key: string): boolean {
    return this.voices.has(key);
  }

  pauseAll(): void {
    for (const v of this.voices.values()) { try { v.player.pause(); } catch { /* gone */ } }
  }

  resumeAll(): void {
    for (const v of this.voices.values()) { try { v.player.play(); } catch { /* gone */ } }
  }

  setVolume(vol: number): void {
    this.volume = vol;
    this.refresh();
  }

  /** Soften the soundscape while the guide speaks. */
  duck(on: boolean): void {
    if (this.ducked === on) return;
    this.ducked = on;
    this.refresh();
  }

  private refresh() {
    for (const v of this.voices.values()) {
      if (v.fade) continue; // the running fade picks up the new level
      try { v.player.volume = this.target(v); } catch { /* gone */ }
    }
  }
}

export const engine = new Engine();
