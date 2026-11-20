import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SPOT_ORDER, SPOTS } from '../sounds';
import { F, R, T } from '../tokens';
import { SpotId } from '../types';
import { tap } from './ui';

/** Two rows (far, near) of three (left, ahead, right). */
export function SpotPicker({ value, onChange }: { value: SpotId; onChange: (s: SpotId) => void }) {
  const rows = [SPOT_ORDER.slice(0, 3), SPOT_ORDER.slice(3)];
  return (
    <View style={{ gap: 6 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={s.row}>
          <Text style={s.rowLabel}>{ri === 0 ? 'far' : 'near'}</Text>
          {row.map(id => {
            const on = id === value;
            const far = SPOTS[id].far;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={SPOTS[id].label}
                onPress={() => { tap(); onChange(id); }}
                style={[s.cell, { borderColor: on ? (far ? T.far : T.accent) : T.line, backgroundColor: on ? T.surface : 'transparent' }]}
              >
                <Text style={[s.cellText, { color: on ? T.text : T.textSoft, fontFamily: on ? F.sansMedium : F.sans }]}>{SPOTS[id].side === 'center' ? 'ahead' : SPOTS[id].side}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  rowLabel: { fontFamily: F.mono, fontSize: 11, color: T.textDim, width: 34 },
  cell: { flex: 1, borderWidth: 1, borderRadius: R.sm, paddingVertical: 9, alignItems: 'center' },
  cellText: { fontSize: 13 },
});
