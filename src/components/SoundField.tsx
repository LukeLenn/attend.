// A top-down map of the soundscape: you at the bottom centre, near and far
// arcs ahead of you, each sound placed where it sits. Focused sounds pulse.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';
import { SPOTS } from '../sounds';
import { F, Palette, T } from '../tokens';
import { CueItem, SpotId } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const W = 320, H = 200, CX = 160, CY = 182;
const POS: Record<SpotId, [number, number]> = {
  'near-left': [96, 142], 'near-center': [160, 104], 'near-right': [224, 142],
  'far-left': [40, 98], 'far-center': [160, 32], 'far-right': [280, 98],
};

function Pulse({ x, y, color }: { x: number; y: number; color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  const r = v.interpolate({ inputRange: [0, 1], outputRange: [6, 22] });
  const o = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
  return <AnimatedCircle cx={x} cy={y} r={r} stroke={color} strokeWidth={1.5} fill="none" opacity={o} />;
}

export function SoundField({ items, focus, p = T, showLabels = true }: { items: CueItem[]; focus: string[] | null; p?: Palette; showLabels?: boolean }) {
  const bySpot: Partial<Record<SpotId, CueItem[]>> = {};
  for (const it of items) if (it.kind === 'synth' && it.spot) (bySpot[it.spot] ??= []).push(it);
  const real = items.filter(i => i.kind === 'real');
  const dim = (k: string) => (focus && !focus.includes(k) ? 0.3 : 1);

  const marks: React.ReactNode[] = [];
  (Object.keys(bySpot) as SpotId[]).forEach(spot => {
    const list = bySpot[spot]!;
    const [bx, by] = POS[spot];
    const far = SPOTS[spot].far;
    const center = SPOTS[spot].side === 'center';
    list.forEach((it, k) => {
      const off = (k - (list.length - 1) / 2) * (center ? 34 : 16);
      const x = center ? bx + off : bx, y = center ? by : by + off;
      const on = !!focus && focus.includes(it.key);
      const color = far ? p.far : p.accent;
      const anchor = SPOTS[spot].side === 'left' ? 'start' : SPOTS[spot].side === 'right' ? 'end' : 'middle';
      const lx = anchor === 'start' ? x + 10 : anchor === 'end' ? x - 10 : x;
      const ly = center ? y - 11 : y + 3.5;
      marks.push(
        <G key={it.key} opacity={dim(it.key)}>
          {on && <Pulse x={x} y={y} color={color} />}
          {far
            ? <Circle cx={x} cy={y} r={on ? 6 : 4.5} stroke={color} strokeWidth={1.6} fill={p.bg} />
            : <Circle cx={x} cy={y} r={on ? 6 : 4.5} fill={color} />}
          {showLabels && (
            <SvgText x={lx} y={ly} fontSize={10} fontFamily={F.sans} fill={p.textSoft} textAnchor={anchor}>
              {it.short.replace(/^The /, '').toLowerCase()}
            </SvgText>
          )}
        </G>,
      );
    });
  });

  const realX = [12, 72, 214, 266];
  real.slice(0, 4).forEach((it, k) => {
    const x = realX[k], y = 192;
    const on = !!focus && focus.includes(it.key);
    const name = it.short.replace(/^The /, '').toLowerCase();
    marks.push(
      <G key={it.key} opacity={dim(it.key)}>
        {on && <Pulse x={x} y={y - 4} color={p.textSoft} />}
        <Circle cx={x} cy={y - 4} r={on ? 4 : 3} stroke={p.textSoft} strokeWidth={1.2} strokeDasharray="2 2" fill="none" />
        {showLabels && <SvgText x={x + 8} y={y} fontSize={9.5} fontFamily={F.sans} fill={p.textDim}>{name.length > 9 ? name.slice(0, 8) + '…' : name}</SvgText>}
      </G>,
    );
  });

  return (
    <View style={{ width: '100%', aspectRatio: W / H }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        <Path d={`M ${CX - 82} ${CY} A 82 82 0 0 1 ${CX + 82} ${CY}`} stroke={p.line} strokeWidth={1} strokeDasharray="2 5" fill="none" />
        <Path d={`M ${CX - 152} ${CY} A 152 152 0 0 1 ${CX + 152} ${CY}`} stroke={p.line} strokeWidth={1} strokeDasharray="2 5" fill="none" />
        {showLabels && <SvgText x={CX + 86} y={CY - 2} fontSize={8} fontFamily={F.mono} fill={p.textDim} letterSpacing={0.8}>near</SvgText>}
        {showLabels && <SvgText x={CX + 156} y={CY - 2} fontSize={8} fontFamily={F.mono} fill={p.textDim} letterSpacing={0.8} textAnchor="end">far</SvgText>}
        <Ellipse cx={CX - 13} cy={CY} rx={3} ry={6} fill={p.textDim} />
        <Ellipse cx={CX + 13} cy={CY} rx={3} ry={6} fill={p.textDim} />
        <Circle cx={CX} cy={CY} r={11} fill={p.text} />
        {marks}
      </Svg>
    </View>
  );
}
