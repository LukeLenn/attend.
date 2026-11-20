// Design tokens. Never hardcode colours or font names in components.
// Day screens use the linen palette (T). The session itself runs on the
// dusk palette (D), so it's soft on the eyes in a dim room.

export const F = {
  serif: 'Newsreader_400Regular',
  serifLight: 'Newsreader_300Light',
  serifItalic: 'Newsreader_300Light_Italic',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
};

export interface Palette {
  bg: string;
  surface: string;
  text: string;
  textSoft: string;
  textDim: string;
  line: string;
  lineSoft: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  far: string;
  danger: string;
}

export const T: Palette = {
  bg: '#F4F2ED',
  surface: '#FBFAF7',
  text: '#25292D',
  textSoft: '#545A61',
  textDim: '#737980', // 4.6:1 on bg
  line: '#DDD9D0',
  lineSoft: '#E8E5DE',
  accent: '#3F6A62',
  accentText: '#FBFAF7',
  accentSoft: '#E1EAE6',
  far: '#6E6690',
  danger: '#9C4434',
};

export const D: Palette = {
  bg: '#15191C',
  surface: '#1C2226',
  text: '#E7E5E0',
  textSoft: '#A9AFB2',
  textDim: '#828A8E',
  line: '#2C3438',
  lineSoft: '#232A2E',
  accent: '#9CC1B6',
  accentText: '#15191C',
  accentSoft: '#22312F',
  far: '#B3A9D6',
  danger: '#E09585',
};

export const R = {
  sm: 10,
  md: 14,
  lg: 20,
};

export const GUTTER = 24;
