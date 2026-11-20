export type SpotId = 'near-left' | 'near-center' | 'near-right' | 'far-left' | 'far-center' | 'far-right';

export type SoundId =
  | 'clock' | 'drip' | 'rain' | 'birds' | 'chimes' | 'traffic'
  | 'fire' | 'waves' | 'crickets' | 'fridge' | 'keys' | 'bell';

export type PhaseId = 'selective' | 'switching' | 'divided';

export interface SoundSetting {
  on: boolean;
  spot: SpotId;
}

export interface PhaseSetting {
  on: boolean;
  min: number;
}

export interface Settings {
  sounds: Record<SoundId, SoundSetting>;
  real: string[];
  phases: Record<PhaseId, PhaseSetting>;
  voiceId: string | null;
  rate: number;   // speech rate, 1 = normal
  volume: number; // soundscape volume 0..1
  reminder: { on: boolean; time: string }; // "HH:MM"
}

export interface SessionRecord {
  id: string;
  startedAt: string; // ISO timestamp
  date: string;      // local day key YYYY-MM-DD
  durationSec: number;
  completed: boolean;
  phases: { id: PhaseId; min: number }[];
  soundCount: number;
  before: number | null; // -3..+3
  after: number | null;
  note: string;
}

/** A sound the guide can send attention to: a generated sound or a real one in the room. */
export interface CueItem {
  key: string;
  kind: 'synth' | 'real';
  name: string;   // "the ticking clock"
  short: string;  // "The clock"
  where: string;  // "near you, on your left"
  soundId?: SoundId;
  spot?: SpotId;
}
