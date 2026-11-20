import React, { ReactNode, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { F, Palette, R, T } from '../tokens';

export const tap = () => { void Haptics.selectionAsync(); };

export function Label({ children, p = T, style }: { children: ReactNode; p?: Palette; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.label, { color: p.textDim }, style]}>{children}</Text>;
}

export function Heading({ children, p = T, style, size = 30 }: { children: ReactNode; p?: Palette; style?: StyleProp<TextStyle>; size?: number }) {
  return <Text style={[s.heading, { color: p.text, fontSize: size, lineHeight: size * 1.18 }, style]}>{children}</Text>;
}

export function Body({ children, p = T, style, dim }: { children: ReactNode; p?: Palette; style?: StyleProp<TextStyle>; dim?: boolean }) {
  return <Text style={[s.body, { color: dim ? p.textDim : p.textSoft }, style]}>{children}</Text>;
}

export function Card({ children, p = T, style }: { children: ReactNode; p?: Palette; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, { borderColor: p.line, backgroundColor: p.surface }, style]}>{children}</View>;
}

export function Rule({ p = T, style }: { p?: Palette; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: p.line }, style]} />;
}

export function Button({ label, onPress, p = T, kind = 'primary', disabled, style }: {
  label: string; onPress: () => void; p?: Palette; kind?: 'primary' | 'quiet' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => { tap(); onPress(); }}
      style={({ pressed }) => [
        s.button,
        primary ? { backgroundColor: p.accent } : { borderWidth: 1, borderColor: kind === 'danger' ? p.danger : p.line },
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[s.buttonText, { color: primary ? p.accentText : kind === 'danger' ? p.danger : p.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, p = T }: { label: string; on: boolean; onPress: () => void; p?: Palette }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => { tap(); onPress(); }}
      style={[s.chip, { borderColor: on ? p.accent : p.line, backgroundColor: on ? p.accentSoft : 'transparent' }]}
    >
      <Text style={[s.chipText, { color: on ? p.text : p.textSoft, fontFamily: on ? F.sansMedium : F.sans }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ on, onChange, p = T, label }: { on: boolean; onChange: (v: boolean) => void; p?: Palette; label: string }) {
  const x = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: on ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [on, x]);
  const left = x.interpolate({ inputRange: [0, 1], outputRange: [3, 21] });
  const bg = x.interpolate({ inputRange: [0, 1], outputRange: [p.lineSoft, p.accent] });
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={8} onPress={() => { tap(); onChange(!on); }}>
      <Animated.View style={[s.toggle, { backgroundColor: bg, borderColor: on ? p.accent : p.line }]}>
        <Animated.View style={[s.knob, { left, backgroundColor: on ? p.accentText : p.surface }]} />
      </Animated.View>
    </Pressable>
  );
}

export function Stepper({ value, unit, onChange, min, max, step = 1, p = T, format, compact }: {
  value: number; unit?: string; onChange: (v: number) => void; min: number; max: number; step?: number; p?: Palette; format?: (v: number) => string; compact?: boolean;
}) {
  const set = (v: number) => { const c = Math.round(Math.min(max, Math.max(min, v)) * 100) / 100; if (c !== value) { tap(); onChange(c); } };
  return (
    <View style={[s.stepper, { borderColor: p.line }]}>
      <Pressable accessibilityLabel="Less" onPress={() => set(value - step)} style={[s.stepBtn, compact && s.stepBtnSm]} hitSlop={4}>
        <Text style={[s.stepSign, { color: value <= min ? p.line : p.textSoft }]}>−</Text>
      </Pressable>
      <Text style={[s.stepValue, compact && s.stepValueSm, { color: p.text }]}>{format ? format(value) : `${value}${unit ? ' ' + unit : ''}`}</Text>
      <Pressable accessibilityLabel="More" onPress={() => set(value + step)} style={[s.stepBtn, compact && s.stepBtnSm]} hitSlop={4}>
        <Text style={[s.stepSign, { color: value >= max ? p.line : p.textSoft }]}>+</Text>
      </Pressable>
    </View>
  );
}

export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(o, { toValue: 1, duration: 420, delay, useNativeDriver: true }).start();
  }, [o, delay]);
  const y = o.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  return <Animated.View style={[style, { opacity: o, transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

const s = StyleSheet.create({
  label: { fontFamily: F.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'lowercase' },
  heading: { fontFamily: F.serifLight, letterSpacing: -0.3 },
  body: { fontFamily: F.sans, fontSize: 15, lineHeight: 22 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: R.md, padding: 18 },
  button: { borderRadius: R.md, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: F.sansMedium, fontSize: 16, letterSpacing: 0.1 },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  chipText: { fontSize: 14 },
  toggle: { width: 44, height: 26, borderRadius: 13, borderWidth: 1 },
  knob: { position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 9 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: R.sm },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  stepBtnSm: { width: 28 },
  stepValueSm: { minWidth: 36, fontSize: 12 },
  stepSign: { fontFamily: F.sans, fontSize: 18 },
  stepValue: { fontFamily: F.mono, fontSize: 13, minWidth: 54, textAlign: 'center' },
});
