# attend.

Guided attention training (ATT) app. Expo + React Native + TypeScript. Sibling to recover. in tone: calm, lowercase labels, serif headings, outline cards.

## Stack

- **Framework**: Expo SDK 58 (managed workflow, Continuous Native Generation — never edit `ios/` or `android/`)
- **Audio**: `react-native-audio-api` (Web Audio API on device). Needs a development build; Expo Go won't work.
- **Speech**: `expo-speech` (on-device iOS voices)
- **Storage**: AsyncStorage, all data on-device, nothing leaves the phone
- **Fonts**: Newsreader (headings), DM Sans (body), IBM Plex Mono (labels, numbers)

## How the sound works

- `src/audio/synth.ts` renders each of the 12 sounds into a seamless 32 s mono loop in plain TypeScript (no native calls). It's deterministic enough to test in Node: `node --experimental-transform-types` on a script that imports it.
- `src/audio/engine.ts` plays loops through: buffer → lowpass (distance) → gain → stereo pan → master, plus a reverb send. Far = quieter, darker, more reverb.
- Rendering ahead (rather than scheduling events from JS) keeps the soundscape steady when JS is busy or the screen locks. iOS background audio is enabled via the audio-api config plugin.
- Preview voices use key prefix `p:`, session voices `s:`.

## How a session works

- `src/session/runner.ts`: pausable clock + spoken script. Intro doesn't count toward practice time.
- Parts: selective (one sound at a time, evenly split), switching (cues speed up from 6.5 s to 3 s apart, sometimes naming a direction), divided (all at once).
- Cue wording is original. Don't paste in a therapist's or book's script.
- `src/screens/SessionFlow.tsx`: before rating → run (dusk palette, dims after 12 s idle, keeps screen awake) → after rating + note.

## Commands

- `npm start` — dev server (use with a development build)
- `npx tsc --noEmit` — type-check
- `npx eas-cli@latest build --profile development --platform ios` — dev build for your phone
- `npx eas-cli@latest build --profile production --platform ios` then `npx eas-cli@latest submit --platform ios`

## Conventions

- Tokens in `src/tokens.ts` (`T` day palette, `D` session/dusk palette). Never hardcode colours.
- Day keys via `dateKey()` in `src/utils.ts` (local time). Never `toISOString()` for day keys.
- Functional components, strict TypeScript, no `any`.
- Copy is plain and gentle: no exclamation marks, no streak pressure, no clinical claims.
