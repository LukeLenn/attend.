import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { F, Palette, R, T } from '../tokens';
import { signed } from '../utils';
import { tap } from './ui';

const VALUES = [-3, -2, -1, 0, 1, 2, 3];

/** The self-attention scale: −3 entirely on the world around you, +3 entirely on yourself. */
export function RatingScale({ value, onChange, p = T }: { value: number | null; onChange: (v: number) => void; p?: Palette }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={s.row}>
        {VALUES.map(v => {
          const on = v === value;
          return (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Rating ${v}`}
              onPress={() => { tap(); onChange(v); }}
              style={[s.cell, { borderColor: on ? p.accent : p.line, backgroundColor: on ? p.accent : 'transparent' }]}
            >
              <Text style={[s.num, { color: on ? p.accentText : p.text }]}>{signed(v)}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.ends}>
        <Text style={[s.end, { color: p.textDim }]}>on the world{'\n'}around me</Text>
        <Text style={[s.end, { color: p.textDim, textAlign: 'center' }]}>equal</Text>
        <Text style={[s.end, { color: p.textDim, textAlign: 'right' }]}>on{'\n'}myself</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  cell: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 14, alignItems: 'center' },
  num: { fontFamily: F.mono, fontSize: 15 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { fontFamily: F.sans, fontSize: 12, lineHeight: 16, flex: 1 },
});
