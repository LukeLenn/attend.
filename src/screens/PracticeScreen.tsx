import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context';
import { PHASES, PLAN_PRESETS, cueItems, planMinutes, presetMatch, PRESETS } from '../sounds';
import { F, GUTTER, T } from '../tokens';
import { dateKey, greeting, streak } from '../utils';
import { Body, Button, Card, Chip, FadeIn, Heading, Label, Rule, Stepper, Toggle, tap } from '../components/ui';
import { SoundField } from '../components/SoundField';
import { WeekStrip } from '../components/LogCharts';
import { WHY_LINES, WhySheet } from './WhySheet';

export function PracticeScreen() {
  const { settings, sessions, updateSettings, startSession, goTo } = useApp();
  const items = cueItems(settings);
  const total = planMinutes(settings);
  const doneToday = sessions.some(s => s.date === dateKey(new Date()));
  const run = streak(sessions);
  const preset = presetMatch(settings);
  const presetLabel = preset ? PRESETS.find(p => p.id === preset)!.label : 'your own mix';

  const planActive = (i: number) => {
    const pp = PLAN_PRESETS[i].p;
    return PHASES.every(p => pp[p.id][0] === settings.phases[p.id].on && (!pp[p.id][0] || pp[p.id][1] === settings.phases[p.id].min));
  };

  const canStart = items.length > 0 && total > 0;
  const [whyOpen, setWhyOpen] = useState(false);
  const whyLine = WHY_LINES[new Date().getDate() % WHY_LINES.length];

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Heading>{greeting()}.</Heading>
        <Body style={{ marginTop: 6 }}>
          {doneToday
            ? 'You’ve practised today. Another round is fine if you’d like one.'
            : 'A few minutes with your eyes closed, moving your attention where the voice asks.'}
        </Body>
      </FadeIn>

      <FadeIn delay={30}>
        <Pressable onPress={() => { tap(); setWhyOpen(true); }} accessibilityRole="button" accessibilityLabel="Why this helps" style={s.why}>
          <Text style={s.whyLine}>{whyLine}</Text>
          <Text style={s.link}>why this helps</Text>
        </Pressable>
      </FadeIn>

      <FadeIn delay={60}>
        <Card>
          <View style={s.rowBetween}>
            <Label>this week</Label>
            <Text style={s.meta}>{run > 0 ? `${run} day${run > 1 ? 's' : ''} in a row` : 'no streak yet'}</Text>
          </View>
          <View style={{ height: 14 }} />
          <WeekStrip sessions={sessions} />
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <Card style={{ gap: 14 }}>
          <View style={s.rowBetween}>
            <Label>session</Label>
            <Text style={s.total}>{total} min</Text>
          </View>
          <View style={s.chips}>
            {PLAN_PRESETS.map((pp, i) => (
              <Chip
                key={pp.label}
                label={pp.label}
                on={planActive(i)}
                onPress={() => updateSettings(st => {
                  const phases = { ...st.phases };
                  for (const p of PHASES) phases[p.id] = { on: pp.p[p.id][0], min: pp.p[p.id][0] ? pp.p[p.id][1] : st.phases[p.id].min };
                  return { ...st, phases };
                })}
              />
            ))}
          </View>
          {PHASES.map((p, i) => {
            const ph = settings.phases[p.id];
            return (
              <View key={p.id}>
                {i > 0 && <Rule style={{ marginBottom: 14 }} />}
                <View style={s.phaseRow}>
                  <Toggle label={`Include ${p.title}`} on={ph.on} onChange={v => updateSettings(st => ({ ...st, phases: { ...st.phases, [p.id]: { ...st.phases[p.id], on: v } } }))} />
                  <View style={[s.phaseText, { opacity: ph.on ? 1 : 0.5 }]}>
                    <Text style={s.phaseTitle}>{p.title}</Text>
                    <Text style={s.phaseDesc}>{p.desc}</Text>
                  </View>
                  <Stepper
                    value={ph.min}
                    compact
                    format={v => `${v}m`}
                    min={1}
                    max={15}
                    onChange={v => updateSettings(st => ({ ...st, phases: { ...st.phases, [p.id]: { on: true, min: v } } }))}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <Pressable onPress={() => { tap(); goTo('sounds'); }} accessibilityRole="button" accessibilityLabel="Edit soundscape">
          <Card style={{ gap: 6 }}>
            <View style={s.rowBetween}>
              <Label>soundscape</Label>
              <Text style={s.link}>edit</Text>
            </View>
            <SoundField items={items} focus={null} />
            <Text style={s.meta}>{items.length} sounds · {presetLabel}{items.length < 3 ? ' · three or more works best' : ''}</Text>
          </Card>
        </Pressable>
      </FadeIn>

      <FadeIn delay={240} style={{ gap: 12 }}>
        <Button label={canStart ? `Begin · ${total} min` : items.length ? 'Turn on at least one part' : 'Choose at least one sound'} onPress={startSession} disabled={!canStart} />
        <Body dim style={s.note}>Best with headphones, once a day, at a time you feel fairly settled.</Body>
      </FadeIn>
      <WhySheet visible={whyOpen} onClose={() => setWhyOpen(false)} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 40, gap: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontFamily: F.sans, fontSize: 13, color: T.textDim },
  total: { fontFamily: F.mono, fontSize: 13, color: T.text },
  link: { fontFamily: F.sansMedium, fontSize: 13, color: T.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phaseText: { flex: 1, minWidth: 0 },
  phaseTitle: { fontFamily: F.sansMedium, fontSize: 15, color: T.text },
  phaseDesc: { fontFamily: F.sans, fontSize: 12.5, lineHeight: 17, color: T.textDim, marginTop: 2 },
  note: { textAlign: 'center', fontSize: 13 },
  why: { borderLeftWidth: 2, borderLeftColor: T.accent, paddingLeft: 14, paddingVertical: 2, gap: 4 },
  whyLine: { fontFamily: F.serifItalic, fontSize: 17, lineHeight: 23, color: T.textSoft },
});
