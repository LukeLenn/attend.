# attend.

Guided attention training (ATT) app. Expo + React Native + TypeScript. Sibling to recover. in tone: calm, lowercase labels, serif headings, outline cards.

## Stack

- **Framework**: Expo SDK 58 (managed workflow, Continuous Native Generation — never edit `ios/` or `android/`)
- **Audio**: `expo-audio` looping players over WAV files the app renders itself (see below)
- **Speech**: `expo-speech` (on-device iOS voices)
- **Storage**: AsyncStorage, all data on-device, nothing leaves the phone
- **Fonts**: Newsreader (headings), DM Sans (body), IBM Plex Mono (labels, numbers)

## How the sound works

- `src/audio/synth.ts` renders each of the 12 sounds into a seamless 32 s mono loop in plain TypeScript.
- `src/audio/place.ts` places it: constant-power pan, darker and quieter for far, a small Freeverb-style room, then encodes a stereo 16-bit WAV. Reverb and filters run over the loop twice so the loop point stays seamless.
- `src/audio/engine.ts` caches each sound+spot WAV in `Paths.cache/attend-sounds/` (name includes a version, bump it in `fileName()` when the synthesis changes) and plays it with a looping expo-audio player. During a session the only thing that changes is player volume (fades, ducking under the voice).
- v1 used `react-native-audio-api` with a live native graph and froze about a minute into a session on device. Don't go back to driving a live graph from JS.
- Both synth and place run in Node: bundle a test script with esbuild and run it.
- Preview players use key prefix `p:`, session players `s:`.
- The exercise uses 3 sounds by default and at most 5 (`MAX_SOUNDS`), plus up to 3 named real sounds.

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
