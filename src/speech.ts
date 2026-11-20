import * as Speech from 'expo-speech';
import { engine } from './audio/engine';

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  enhanced: boolean;
}

let voiceId: string | null = null;
let rate = 1;

export function configureSpeech(opts: { voiceId: string | null; rate: number }) {
  voiceId = opts.voiceId;
  rate = opts.rate;
}

export async function listVoices(): Promise<VoiceOption[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    return all
      .filter(v => /^en/i.test(v.language))
      .map(v => ({ id: v.identifier, name: v.name, language: v.language, enhanced: v.quality === Speech.VoiceQuality.Enhanced }))
      .sort((a, b) => Number(b.enhanced) - Number(a.enhanced) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Speak and resolve when finished (or stopped). The soundscape ducks underneath. */
export function say(text: string): Promise<void> {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      engine.duck(false);
      resolve();
    };
    // Safety net in case a callback never arrives.
    const guard = setTimeout(finish, 2500 + (text.length * 95) / rate);
    engine.duck(true);
    Speech.speak(text, {
      language: 'en-GB',
      voice: voiceId ?? undefined,
      rate,
      pitch: 1,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  });
}

export function hush(): void {
  Speech.stop();
  engine.duck(false);
}
