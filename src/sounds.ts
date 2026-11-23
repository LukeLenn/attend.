import { CueItem, PhaseId, Settings, SoundId, SpotId } from './types';

export interface Spot {
  label: string;
  where: string;
  far: boolean;
  pan: number;
  side: 'left' | 'center' | 'right';
}

export const SPOTS: Record<SpotId, Spot> = {
  'near-left':   { label: 'near · left',  where: 'near you, on your left',   far: false, pan: -0.8,  side: 'left' },
  'near-center': { label: 'near · ahead', where: 'close, in front of you',   far: false, pan: 0,     side: 'center' },
  'near-right':  { label: 'near · right', where: 'near you, on your right',  far: false, pan: 0.8,   side: 'right' },
  'far-left':    { label: 'far · left',   where: 'far away, on your left',   far: true,  pan: -0.65, side: 'left' },
  'far-center':  { label: 'far · ahead',  where: 'far off, in the distance', far: true,  pan: 0,     side: 'center' },
  'far-right':   { label: 'far · right',  where: 'far away, on your right',  far: true,  pan: 0.65,  side: 'right' },
};

export const SPOT_ORDER: SpotId[] = ['far-left', 'far-center', 'far-right', 'near-left', 'near-center', 'near-right'];

export interface SoundDef {
  id: SoundId;
  title: string;  // list label
  name: string;   // spoken, mid-sentence
  short: string;  // spoken, quick cue
  spot: SpotId;   // default position
  level: number;  // mix level
}

export const LIB: SoundDef[] = [
  { id: 'clock',    title: 'Ticking clock',   name: 'the ticking clock',       short: 'The clock',    spot: 'near-left',   level: 0.75 },
  { id: 'drip',     title: 'Dripping tap',    name: 'the dripping tap',        short: 'The drip',     spot: 'near-right',  level: 0.8 },
  { id: 'rain',     title: 'Rain on glass',   name: 'the rain on the window',  short: 'The rain',     spot: 'near-center', level: 0.7 },
  { id: 'birds',    title: 'Birdsong',        name: 'the birdsong',            short: 'The birds',    spot: 'far-left',    level: 0.85 },
  { id: 'chimes',   title: 'Wind chimes',     name: 'the wind chimes',         short: 'The chimes',   spot: 'far-right',   level: 0.85 },
  { id: 'traffic',  title: 'Distant traffic', name: 'the distant traffic',     short: 'The traffic',  spot: 'far-center',  level: 0.9 },
  { id: 'fire',     title: 'Crackling fire',  name: 'the crackling fire',      short: 'The fire',     spot: 'near-right',  level: 0.75 },
  { id: 'waves',    title: 'Waves',           name: 'the waves',               short: 'The waves',    spot: 'far-center',  level: 0.85 },
  { id: 'crickets', title: 'Crickets',        name: 'the crickets',            short: 'The crickets', spot: 'far-right',   level: 0.6 },
  { id: 'fridge',   title: 'Fridge hum',      name: 'the humming fridge',      short: 'The hum',      spot: 'near-left',   level: 0.7 },
  { id: 'keys',     title: 'Typing',          name: 'the typing',              short: 'The typing',   spot: 'near-center', level: 0.7 },
  { id: 'bell',     title: 'Far-off bell',    name: 'the far-off bell',        short: 'The bell',     spot: 'far-left',    level: 0.75 },
];

export const LIBMAP: Record<SoundId, SoundDef> = Object.fromEntries(LIB.map(s => [s.id, s])) as Record<SoundId, SoundDef>;

export interface Preset {
  id: string;
  label: string;
  on: Partial<Record<SoundId, SpotId>>;
}

export const MAX_SOUNDS = 5;
export const MAX_REAL = 3;

export const PRESETS: Preset[] = [
  { id: 'starter', label: 'starter', on: { clock: 'near-left', drip: 'near-right', birds: 'far-center' } },
  { id: 'indoors', label: 'indoors', on: { fridge: 'near-left', keys: 'near-right', rain: 'far-center' } },
  { id: 'garden', label: 'garden', on: { chimes: 'near-right', birds: 'far-left', bell: 'far-right' } },
  { id: 'evening', label: 'evening', on: { fire: 'near-left', crickets: 'far-right', waves: 'far-center' } },
  { id: 'town', label: 'town', on: { clock: 'near-center', traffic: 'far-left', bell: 'far-right' } },
];

/** Pick `count` different sounds and spread them across different spots. */
export function shuffled(count: number): Partial<Record<SoundId, SpotId>> {
  const ids = [...LIB.map(s => s.id)].sort(() => Math.random() - 0.5).slice(0, count);
  // always mix near and far, left and right where possible
  const spots: SpotId[] = (['near-left', 'far-right', 'near-right', 'far-left', 'far-center', 'near-center'] as SpotId[]);
  const out: Partial<Record<SoundId, SpotId>> = {};
  ids.forEach((id, i) => { out[id] = spots[i % spots.length]; });
  return out;
}

/** A free spot for a sound being switched on, preferring its usual one. */
export function freeSpot(settings: Settings, id: SoundId): SpotId {
  const taken = new Set(LIB.filter(s => s.id !== id && settings.sounds[s.id].on).map(s => settings.sounds[s.id].spot));
  const mine = settings.sounds[id].spot;
  if (!taken.has(mine)) return mine;
  return SPOT_ORDER.find(sp => !taken.has(sp)) ?? mine;
}

export function soundCount(settings: Settings): number {
  return LIB.filter(s => settings.sounds[s.id].on).length;
}

export interface PhaseDef {
  id: PhaseId;
  title: string;
  short: string;
  desc: string;
}

export const PHASES: PhaseDef[] = [
  { id: 'selective', title: 'One sound at a time', short: 'focus', desc: 'Stay with a single sound while the others carry on.' },
  { id: 'switching', title: 'Rapid switching', short: 'switch', desc: 'Move your attention quickly between sounds and places.' },
  { id: 'divided', title: 'Every sound at once', short: 'widen', desc: 'Take in the whole soundscape together.' },
];

export const PLAN_PRESETS: { label: string; p: Record<PhaseId, [boolean, number]> }[] = [
  { label: 'full · 12 min', p: { selective: [true, 5], switching: [true, 5], divided: [true, 2] } },
  { label: 'switching', p: { selective: [false, 5], switching: [true, 5], divided: [false, 2] } },
  { label: 'one at a time', p: { selective: [true, 5], switching: [false, 5], divided: [false, 2] } },
  { label: 'all at once', p: { selective: [false, 5], switching: [false, 5], divided: [true, 3] } },
];

export function defaultSettings(): Settings {
  const start = PRESETS[0].on;
  const sounds = {} as Settings['sounds'];
  for (const s of LIB) sounds[s.id] = { on: !!start[s.id], spot: start[s.id] ?? s.spot };
  return {
    sounds,
    real: [],
    phases: { selective: { on: true, min: 5 }, switching: { on: true, min: 5 }, divided: { on: true, min: 2 } },
    voiceId: null,
    rate: 1,
    volume: 0.8,
    reminder: { on: false, time: '19:30' },
  };
}

/** Fill in anything missing from older saved settings. */
export function mergeSettings(saved: Partial<Settings> | null): Settings {
  const d = defaultSettings();
  if (!saved) return d;
  const sounds = { ...d.sounds };
  for (const s of LIB) if (saved.sounds?.[s.id]) sounds[s.id] = saved.sounds[s.id];
  // Older versions allowed many sounds at once; the exercise works with 3–5.
  if (LIB.filter(s => sounds[s.id].on).length > MAX_SOUNDS) Object.assign(sounds, d.sounds);
  return {
    ...d,
    ...saved,
    sounds,
    phases: { ...d.phases, ...(saved.phases ?? {}) },
    reminder: { ...d.reminder, ...(saved.reminder ?? {}) },
    real: (saved.real ?? []).slice(0, MAX_REAL),
  };
}

export function cueItems(settings: Settings): CueItem[] {
  const synth: CueItem[] = LIB.filter(s => settings.sounds[s.id].on).map(s => {
    const spot = settings.sounds[s.id].spot;
    return { key: s.id, kind: 'synth', name: s.name, short: s.short, where: SPOTS[spot].where, soundId: s.id, spot };
  });
  const real: CueItem[] = settings.real.map((r, i) => ({
    key: 'real' + i,
    kind: 'real',
    name: r,
    short: r.charAt(0).toUpperCase() + r.slice(1),
    where: 'there in the room with you',
  }));
  return [...synth, ...real];
}

export function presetMatch(settings: Settings): string | null {
  for (const p of PRESETS) {
    const ids = Object.keys(p.on) as SoundId[];
    const enabled = LIB.filter(s => settings.sounds[s.id].on);
    if (ids.length === enabled.length && ids.every(id => settings.sounds[id].on && settings.sounds[id].spot === p.on[id])) return p.id;
  }
  return null;
}

export function planMinutes(settings: Settings): number {
  return PHASES.reduce((a, p) => a + (settings.phases[p.id].on ? settings.phases[p.id].min : 0), 0);
}
