// The guided session: a pausable clock plus the spoken script for each part.
import { engine } from '../audio/engine';
import { PHASES, SPOTS } from '../sounds';
import { hush, say } from '../speech';
import { CueItem, PhaseId } from '../types';

export interface PlannedPhase {
  id: PhaseId;
  title: string;
  short: string;
  sec: number;
}

export interface RunnerEvents {
  onCue: (text: string) => void;
  onFocus: (keys: string[] | null) => void;
  onFinish: (completed: boolean, practisedSec: number) => void;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <X>(arr: X[]): X => arr[Math.floor(Math.random() * arr.length)];
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const INTRO =
  'Get comfortable, and close your eyes. Thoughts and feelings may come up while you do this. ' +
  'Let them be there, without fighting them. Your only job is to put your attention where I ask.';

const REMIND: ((s: string) => string)[] = [
  s => `Stay with ${s}. Nothing else needs your attention.`,
  s => `Keep your focus on ${s}. If another sound pulls you away, gently come back.`,
  s => `Just ${s}. Notice the detail in it.`,
  s => `Focus more and more on ${s}.`,
  s => `Other sounds can be there. Your attention stays on ${s}.`,
];

const DIVIDED_REMIND = [
  'Take in all the sounds together.',
  'Hold as many sounds as you can at the same time. Try counting them.',
  'Spread your attention across the whole space, near and far, left and right.',
  'Every sound at once. Let your attention be as wide as it can.',
];

export function planFrom(phases: Record<PhaseId, { on: boolean; min: number }>): PlannedPhase[] {
  return PHASES.filter(p => phases[p.id].on).map(p => ({ id: p.id, title: p.title, short: p.short, sec: phases[p.id].min * 60 }));
}

export class SessionRunner {
  readonly plan: PlannedPhase[];
  readonly total: number;
  intro = true;
  paused = false;
  private stopped = false;
  private t0 = 0;
  private pauseAt = 0;
  private pausedTotal = 0;
  private skipped = 0;

  constructor(private items: CueItem[], plan: PlannedPhase[], private ev: RunnerEvents) {
    this.plan = plan;
    this.total = plan.reduce((a, p) => a + p.sec, 0);
  }

  /** Seconds of practice so far (excludes the intro and pauses). */
  elapsed(): number {
    if (this.intro) return 0;
    const now = this.paused ? this.pauseAt : Date.now();
    return Math.max(0, (now - this.t0 - this.pausedTotal) / 1000);
  }

  currentPhase(): number {
    let acc = 0;
    const t = this.elapsed();
    for (let i = 0; i < this.plan.length; i++) {
      acc += this.plan[i].sec;
      if (t < acc) return i;
    }
    return this.plan.length - 1;
  }

  /** Jump to the start of the next part (or the closing words, from the last part). */
  skipPart(): void {
    if (this.stopped) return;
    if (this.paused) this.resume();
    if (this.intro) { hush(); return; }
    let end = 0;
    for (const p of this.plan) { end += p.sec; if (this.elapsed() < end) break; }
    const jump = Math.max(0, end - this.elapsed());
    this.t0 -= jump * 1000;
    this.skipped += jump;
    hush();
  }

  private async sleepUntil(t: number) {
    while (!this.stopped && (this.paused || this.elapsed() < t)) await delay(150);
  }

  private async gate() {
    while (this.paused && !this.stopped) await delay(150);
  }

  private async cue(text: string) {
    await this.gate();
    if (this.stopped) return;
    this.ev.onCue(text);
    await say(text);
  }

  async start(): Promise<void> {
    const synth = this.items.filter(i => i.kind === 'synth');
    await engine.prepare(synth.map(i => i.soundId!));
    for (const it of synth) {
      if (this.stopped) break;
      await engine.play('s:' + it.key, it.soundId!, it.spot!, 4);
    }
    if (this.stopped) { engine.stopAll(0.5, 's:'); return; }
    this.ev.onFocus(null);

    await this.cue(INTRO);
    await this.gate();
    if (this.stopped) return;
    this.t0 = Date.now();
    this.pausedTotal = 0;
    this.intro = false;

    let acc = 0;
    for (const p of this.plan) {
      if (this.stopped) return;
      if (p.id === 'selective') await this.selective(acc, p.sec);
      else if (p.id === 'switching') await this.switching(acc, p.sec);
      else await this.divided(acc, p.sec);
      acc += p.sec;
      await this.sleepUntil(acc);
    }
    if (this.stopped) return;
    this.ev.onFocus(null);
    engine.stopAll(5, 's:');
    await this.cue("That's the end of the session. Take a moment, then open your eyes when you're ready.");
    this.finish(this.skipped < 1); // a skipped part means it wasn't a full session
  }

  private async selective(start: number, dur: number) {
    await this.cue('First, focus on one sound at a time.');
    const per = dur / this.items.length;
    for (let i = 0; i < this.items.length && !this.stopped; i++) {
      if (this.elapsed() >= start + dur - 1) break; // part was skipped
      const it = this.items[i];
      const segEnd = start + per * (i + 1);
      this.ev.onFocus([it.key]);
      await this.cue(`Focus on ${it.name}, ${it.where}.`);
      let last = -1;
      while (!this.stopped) {
        const next = this.elapsed() + rand(12, 18);
        if (next > segEnd - 5) break;
        await this.sleepUntil(next);
        let k: number;
        do { k = Math.floor(Math.random() * REMIND.length); } while (k === last);
        last = k;
        await this.cue(REMIND[k](it.name));
      }
      await this.sleepUntil(segEnd);
    }
  }

  private async switching(start: number, dur: number) {
    await this.cue('Now switch quickly. Move your attention as soon as you hear a new sound or place.');
    const synth = this.items.filter(i => i.kind === 'synth');
    const groups = [
      { text: 'Everything on your left.', keys: synth.filter(i => SPOTS[i.spot!].side === 'left').map(i => i.key) },
      { text: 'Everything on your right.', keys: synth.filter(i => SPOTS[i.spot!].side === 'right').map(i => i.key) },
      { text: 'Sounds close to you.', keys: synth.filter(i => !SPOTS[i.spot!].far).map(i => i.key) },
      { text: 'Sounds far away.', keys: synth.filter(i => SPOTS[i.spot!].far).map(i => i.key) },
      { text: 'The real sounds in your room.', keys: this.items.filter(i => i.kind === 'real').map(i => i.key) },
    ].filter(g => g.keys.length > 0 && g.keys.length < this.items.length);
    const end = start + dur;
    let lastKey = '';
    while (!this.stopped && this.elapsed() < end - 2) {
      const frac = Math.min(1, (this.elapsed() - start) / dur);
      const gap = 6.5 - 3.5 * frac; // cues get quicker as the part goes on
      const t = this.elapsed();
      let text = '', keys: string[] = [], key = '';
      for (let tries = 0; tries < 6; tries++) {
        if (groups.length && Math.random() < 0.28) {
          const g = pick(groups);
          text = g.text; keys = g.keys; key = g.text;
        } else {
          const it = pick(this.items);
          text = Math.random() < 0.25 && it.kind === 'synth' ? `${it.short}, ${it.where}.` : `${it.short}.`;
          keys = [it.key]; key = it.key;
        }
        if (key !== lastKey) break;
      }
      lastKey = key;
      this.ev.onFocus(keys);
      await this.cue(text);
      await this.sleepUntil(Math.min(t + gap, end));
    }
  }

  private async divided(start: number, dur: number) {
    this.ev.onFocus(this.items.map(i => i.key));
    await this.cue('Now widen your attention as far as it will go. Try to hear all the sounds at the same time.');
    const end = start + dur;
    let k = 0;
    while (!this.stopped) {
      const next = this.elapsed() + rand(20, 28);
      if (next > end - 4) break;
      await this.sleepUntil(next);
      await this.cue(DIVIDED_REMIND[k++ % DIVIDED_REMIND.length]);
    }
  }

  pause(): void {
    if (this.paused || this.stopped) return;
    this.paused = true;
    this.pauseAt = Date.now();
    hush();
    void engine.suspend();
  }

  resume(): void {
    if (!this.paused || this.stopped) return;
    if (!this.intro) this.pausedTotal += Date.now() - this.pauseAt;
    this.paused = false;
    void engine.resume();
  }

  /** End early (or after the closing words). */
  end(): void {
    if (this.stopped) return;
    if (this.paused) this.resume();
    this.finish(false);
  }

  private finish(completed: boolean) {
    if (this.stopped) return;
    const practised = Math.max(0, Math.min(this.total, this.elapsed()) - this.skipped);
    this.stopped = true;
    hush();
    engine.stopAll(completed ? 5 : 1.5, 's:');
    this.ev.onFinish(completed, Math.round(practised));
  }
}
