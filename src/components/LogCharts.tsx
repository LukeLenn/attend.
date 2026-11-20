import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { F, R, T } from '../tokens';
import { SessionRecord } from '../types';
import { addDays, byDay, dateKey, mondayOf, shortDate, signed } from '../utils';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week as seven quiet marks. */
export function WeekStrip({ sessions }: { sessions: SessionRecord[] }) {
  const days = byDay(sessions);
  const today = new Date();
  const mon = mondayOf(today);
  return (
    <View style={ws.row}>
      {DAY_LETTERS.map((l, i) => {
        const d = addDays(mon, i);
        const k = dateKey(d);
        const done = !!days[k];
        const isToday = k === dateKey(today);
        return (
          <View key={i} style={ws.col}>
            <View style={[ws.dot, { borderColor: done ? T.accent : isToday ? T.textSoft : T.line, backgroundColor: done ? T.accent : 'transparent' }]} />
            <Text style={[ws.letter, { color: isToday ? T.text : T.textDim, fontFamily: isToday ? F.sansMedium : F.sans }]}>{l}</Text>
          </View>
        );
      })}
    </View>
  );
}

const ws = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 6, width: 32 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.2 },
  letter: { fontSize: 12 },
});

/** The worksheet's practice grid, extended for as long as you keep going. */
export function WeekGrid({ sessions }: { sessions: SessionRecord[] }) {
  const days = byDay(sessions);
  const today = new Date();
  const todayKey = dateKey(today);
  const first = mondayOf(new Date(sessions[0].startedAt));
  const cur = mondayOf(today);
  const weeks: Date[] = [];
  for (let m = new Date(first); m <= cur; m = addDays(m, 7)) weeks.push(new Date(m));
  weeks.reverse();
  return (
    <View style={{ gap: 6 }}>
      <View style={wg.row}>
        <View style={wg.wk} />
        {DAY_LETTERS.map((l, i) => <Text key={i} style={wg.head}>{l}</Text>)}
      </View>
      {weeks.map((m, wi) => (
        <View key={dateKey(m)} style={wg.row}>
          <View style={wg.wk}>
            <Text style={wg.wkNum}>week {weeks.length - wi}</Text>
            <Text style={wg.wkDate}>{shortDate(m)}</Text>
          </View>
          {DAY_LETTERS.map((_, i) => {
            const d = addDays(m, i);
            const k = dateKey(d);
            const n = days[k]?.length ?? 0;
            const future = d > today && k !== todayKey;
            return (
              <View key={i} style={[wg.cell, { borderColor: k === todayKey ? T.accent : T.lineSoft, backgroundColor: future ? 'transparent' : T.surface }]}>
                {n > 0 && (
                  <Svg width={14} height={14} viewBox="0 0 14 14">
                    <Path d="M3 3 L11 11 M11 3 L3 11" stroke={T.accent} strokeWidth={1.8} strokeLinecap="round" />
                  </Svg>
                )}
                {n > 1 && <Text style={wg.count}>{n}</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const wg = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  wk: { width: 58 },
  wkNum: { fontFamily: F.sansMedium, fontSize: 12, color: T.text },
  wkDate: { fontFamily: F.mono, fontSize: 10, color: T.textDim },
  head: { flex: 1, textAlign: 'center', fontFamily: F.mono, fontSize: 10, color: T.textDim },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: 3, bottom: 1, fontFamily: F.mono, fontSize: 8, color: T.textDim },
});

/** Before → after self-attention for each rated session. */
export function RatingChart({ sessions }: { sessions: SessionRecord[] }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const data = sessions.filter(s => s.before != null && s.after != null).slice(-30);
  const H = 190, L = 26, Rt = 6, Tp = 10, B = 22;
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  if (!data.length) {
    return <Text style={chs.empty}>Rate yourself before and after a session to see how practice shifts your attention.</Text>;
  }
  const n = data.length;
  const step = w > 0 ? (w - L - Rt) / Math.max(n, 7) : 0;
  const x = (i: number) => L + step * (i + 0.5);
  const y = (v: number) => Tp + ((3 - v) / 6) * (H - Tp - B);
  const every = Math.ceil(n / 5);
  const s = sel != null ? data[sel] : null;
  return (
    <View onLayout={onLayout}>
      <View style={chs.readout}>
        <Text style={chs.readoutText}>
          {s ? `${shortDate(new Date(s.startedAt))} · before ${signed(s.before)} · after ${signed(s.after)}` : 'tap a session for detail'}
        </Text>
      </View>
      {w > 0 && (
        <View>
          <Svg width={w} height={H}>
            {[-3, -2, -1, 0, 1, 2, 3].map(v => (
              <React.Fragment key={v}>
                <Line x1={L} x2={w - Rt} y1={y(v)} y2={y(v)} stroke={v === 0 ? T.textDim : T.lineSoft} strokeWidth={1} strokeDasharray={v === 0 ? '2 3' : undefined} />
                <SvgText x={L - 6} y={y(v) + 3.5} fontSize={10} fontFamily={F.mono} fill={T.textDim} textAnchor="end">{signed(v)}</SvgText>
              </React.Fragment>
            ))}
            {data.map((d, i) => (
              <React.Fragment key={d.id}>
                {(i % every === 0 || i === n - 1) && (
                  <SvgText x={x(i)} y={H - 6} fontSize={9.5} fontFamily={F.mono} fill={T.textDim} textAnchor="middle">
                    {`${new Date(d.startedAt).getDate()}/${new Date(d.startedAt).getMonth() + 1}`}
                  </SvgText>
                )}
                <Line x1={x(i)} x2={x(i)} y1={y(d.before!)} y2={y(d.after!)} stroke={sel === i ? T.text : T.textDim} strokeOpacity={sel === i ? 1 : 0.5} strokeWidth={2} />
                <Circle cx={x(i)} cy={y(d.before!)} r={4.5} fill={T.surface} stroke={T.textSoft} strokeWidth={1.6} />
                <Circle cx={x(i)} cy={y(d.after!)} r={5.5} fill={T.accent} stroke={T.surface} strokeWidth={1.5} />
              </React.Fragment>
            ))}
          </Svg>
          <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', paddingLeft: L }]}>
            {data.map((d, i) => (
              <Pressable key={d.id} style={{ width: step, height: H - B }} onPress={() => setSel(sel === i ? null : i)} accessibilityLabel={`Session ${shortDate(new Date(d.startedAt))}`} />
            ))}
          </View>
        </View>
      )}
      <View style={chs.legend}>
        <View style={chs.legItem}><View style={[chs.legDot, { borderWidth: 1.6, borderColor: T.textSoft }]} /><Text style={chs.legText}>before</Text></View>
        <View style={chs.legItem}><View style={[chs.legDot, { backgroundColor: T.accent }]} /><Text style={chs.legText}>after</Text></View>
      </View>
    </View>
  );
}

const chs = StyleSheet.create({
  empty: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: T.textDim, paddingVertical: 12 },
  readout: { minHeight: 22, marginBottom: 4 },
  readoutText: { fontFamily: F.mono, fontSize: 11, color: T.textSoft },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legDot: { width: 10, height: 10, borderRadius: 5 },
  legText: { fontFamily: F.sans, fontSize: 12, color: T.textDim },
});

export const chartRadius = R.md;
