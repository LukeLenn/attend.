import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { engine } from '../audio/engine';
import { useApp } from '../context';
import { LIB, MAX_REAL, MAX_SOUNDS, PRESETS, SPOTS, cueItems, freeSpot, presetMatch, shuffled, soundCount } from '../sounds';
import { F, GUTTER, R, T } from '../tokens';
import { Settings, SoundId, SpotId } from '../types';
import { Body, Card, Chip, FadeIn, Heading, Label, Rule, Toggle, tap } from '../components/ui';
import { SoundField } from '../components/SoundField';
import { SpotPicker } from '../components/SpotPicker';

function applySet(st: Settings, set: Partial<Record<SoundId, SpotId>>): Settings {
  const sounds = { ...st.sounds };
  for (const d of LIB) sounds[d.id] = { on: !!set[d.id], spot: set[d.id] ?? st.sounds[d.id].spot };
  return { ...st, sounds };
}

export function SoundsScreen() {
  const { settings, updateSettings } = useApp();
  const [open, setOpen] = useState<SoundId | null>(null);
  const [playing, setPlaying] = useState<SoundId | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');
  const items = cueItems(settings);
  const active = presetMatch(settings);
  const count = soundCount(settings);

  // Stop any preview when leaving the screen.
  useEffect(() => () => engine.stopAll(0.4, 'p:'), []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const stopPreview = () => { engine.stopAll(0.4, 'p:'); setPlaying(null); };

  const listen = async (id: SoundId) => {
    if (playing === id) { stopPreview(); return; }
    engine.stopAll(0.4, 'p:');
    setPlaying(id);
    setPreparing(true);
    try {
      await engine.play('p:' + id, id, settings.sounds[id].spot, 0.5);
    } finally {
      setPreparing(false);
    }
  };

  const toggle = (id: SoundId, on: boolean) => {
    if (on && count >= MAX_SOUNDS) {
      setNotice(`Up to ${MAX_SOUNDS} sounds. Turn one off first.`);
      return;
    }
    updateSettings(x => ({ ...x, sounds: { ...x.sounds, [id]: { on, spot: on ? freeSpot(x, id) : x.sounds[id].spot } } }));
  };

  const addReal = () => {
    let v = draft.trim().replace(/[.!?]+$/, '');
    if (!v || settings.real.length >= MAX_REAL) return;
    if (!/^(the|a|an|my) /i.test(v)) v = 'the ' + v;
    v = v.charAt(0).toLowerCase() + v.slice(1);
    updateSettings(st => ({ ...st, real: [...st.real, v] }));
    setDraft('');
    Keyboard.dismiss();
  };

  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Heading>Your soundscape.</Heading>
        <Body style={{ marginTop: 6 }}>
          Start with three sounds in different places. As it gets easier, add a fourth or fifth. Change them whenever you like to keep it fresh.
        </Body>
      </FadeIn>

      <FadeIn delay={60}>
        <Card style={{ gap: 12 }}>
          <View style={s.rowBetween}>
            <Label>{count} of {MAX_SOUNDS} sounds</Label>
            <View style={s.pips}>
              {Array.from({ length: MAX_SOUNDS }, (_, i) => (
                <View key={i} style={[s.pip, { backgroundColor: i < count ? T.accent : 'transparent', borderColor: i < 3 ? T.accent : T.line }]} />
              ))}
            </View>
          </View>
          <SoundField items={items} focus={playing ? [playing] : null} />
          <View style={s.legend}>
            <View style={s.legItem}><View style={[s.legDot, { backgroundColor: T.accent }]} /><Text style={s.legText}>near</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { borderWidth: 1.5, borderColor: T.far }]} /><Text style={s.legText}>far</Text></View>
            <View style={s.legItem}><View style={[s.legDot, { borderWidth: 1, borderColor: T.textSoft, borderStyle: 'dashed' }]} /><Text style={s.legText}>in your room</Text></View>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={120} style={{ gap: 10 }}>
        <Label>sets of three</Label>
        <View style={s.chips}>
          {PRESETS.map(p => (
            <Chip key={p.id} label={p.label} on={active === p.id} onPress={() => { stopPreview(); updateSettings(st => applySet(st, p.on)); }} />
          ))}
          <Chip
            label="shuffle"
            on={false}
            onPress={() => { stopPreview(); updateSettings(st => applySet(st, shuffled(Math.max(3, soundCount(st))))); }}
          />
        </View>
      </FadeIn>

      <FadeIn delay={180}>
        <Card style={{ paddingVertical: 4 }}>
          {LIB.map((d, i) => {
            const st = settings.sounds[d.id];
            const isOpen = open === d.id;
            const isPlaying = playing === d.id;
            return (
              <View key={d.id}>
                {i > 0 && <Rule />}
                <View style={s.row}>
                  <Toggle label={`Use ${d.title}`} on={st.on} onChange={v => toggle(d.id, v)} />
                  <Pressable style={s.rowMain} onPress={() => { tap(); setOpen(isOpen ? null : d.id); }} accessibilityRole="button" accessibilityLabel={`${d.title}, ${SPOTS[st.spot].label}`}>
                    <Text style={[s.name, { opacity: st.on ? 1 : 0.55 }]}>{d.title}</Text>
                    <Text style={s.where}>{st.on ? SPOTS[st.spot].label : 'tap to place'}</Text>
                  </Pressable>
                  <Pressable onPress={() => { tap(); void listen(d.id); }} style={[s.listen, isPlaying && { borderColor: T.accent }]} hitSlop={6} accessibilityRole="button">
                    <Text style={[s.listenText, isPlaying && { color: T.accent }]}>{isPlaying ? (preparing ? '…' : 'stop') : 'listen'}</Text>
                  </Pressable>
                </View>
                {isOpen && (
                  <View style={s.drawer}>
                    <SpotPicker
                      value={st.spot}
                      onChange={spot => {
                        if (!st.on && count >= MAX_SOUNDS) {
                          setNotice(`Up to ${MAX_SOUNDS} sounds. Turn one off first.`);
                          return;
                        }
                        updateSettings(x => ({ ...x, sounds: { ...x.sounds, [d.id]: { on: true, spot } } }));
                        void engine.move('p:' + d.id, d.id, spot);
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </Card>
        {!!notice && <Text style={s.notice}>{notice}</Text>}
      </FadeIn>

      <FadeIn delay={240}>
        <Card style={{ gap: 12 }}>
          <Label>real sounds around you</Label>
          <Body>Name sounds where you practise, like a fridge or the road outside. The voice will send you to them too.</Body>
          <View style={s.addRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addReal}
              placeholder="the road outside"
              placeholderTextColor={T.textDim}
              style={s.input}
              maxLength={32}
              returnKeyType="done"
            />
            <Pressable onPress={addReal} style={[s.addBtn, { opacity: draft.trim() && settings.real.length < MAX_REAL ? 1 : 0.4 }]} accessibilityRole="button">
              <Text style={s.addText}>add</Text>
            </Pressable>
          </View>
          {settings.real.length > 0 && (
            <View style={s.chips}>
              {settings.real.map((r, i) => (
                <Chip key={r + i} label={`${r}  ×`} on={false} onPress={() => updateSettings(x => ({ ...x, real: x.real.filter((_, j) => j !== i) }))} />
              ))}
            </View>
          )}
          {settings.real.length >= MAX_REAL && <Text style={s.where}>Up to {MAX_REAL} real sounds.</Text>}
        </Card>
      </FadeIn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 40, gap: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pips: { flexDirection: 'row', gap: 5 },
  pip: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legDot: { width: 9, height: 9, borderRadius: 5 },
  legText: { fontFamily: F.sans, fontSize: 12, color: T.textDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowMain: { flex: 1, minWidth: 0 },
  name: { fontFamily: F.sansMedium, fontSize: 15, color: T.text },
  where: { fontFamily: F.mono, fontSize: 11, color: T.textDim, marginTop: 2 },
  listen: { borderWidth: 1, borderColor: T.line, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, minWidth: 64, alignItems: 'center' },
  listenText: { fontFamily: F.sans, fontSize: 13, color: T.textSoft },
  drawer: { paddingBottom: 14, paddingLeft: 56 },
  notice: { fontFamily: F.sans, fontSize: 13, color: T.danger, textAlign: 'center', marginTop: 10 },
  addRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: R.sm, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.sans, fontSize: 15, color: T.text, backgroundColor: T.bg },
  addBtn: { borderWidth: 1, borderColor: T.line, borderRadius: R.sm, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { fontFamily: F.sansMedium, fontSize: 14, color: T.text },
});
