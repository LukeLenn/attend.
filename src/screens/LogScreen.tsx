import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useApp } from '../context';
import { F, GUTTER, T } from '../tokens';
import { addDays, byDay, clock, csvText, dateKey, longDate, signed, summaryText, timeOfDay } from '../utils';
import { Body, Card, FadeIn, Heading, Label, Rule } from '../components/ui';
import { RatingChart, WeekGrid } from '../components/LogCharts';

export function LogScreen() {
  const { sessions, removeSession } = useApp();
  const [showAll, setShowAll] = useState(false);
  const today = new Date();
  const days = byDay(sessions);
  let last7 = 0;
  for (let i = 0; i < 7; i++) if (days[dateKey(addDays(today, -i))]) last7++;
  const minutes = Math.round(sessions.reduce((a, s) => a + s.durationSec, 0) / 60);
  const rated = sessions.filter(s => s.before != null && s.after != null);
  const shift = rated.length ? rated.reduce((a, s) => a + (s.after! - s.before!), 0) / rated.length : null;
  const list = [...sessions].reverse();
  const shown = showAll ? list : list.slice(0, 12);

  const shareSummary = async () => {
    await Share.share({ message: summaryText(sessions) });
  };

  const exportCsv = async () => {
    try {
      const f = new File(Paths.cache, 'attend-practice-log.csv');
      if (f.exists) f.delete();
      f.create();
      f.write(csvText(sessions));
      await Sharing.shareAsync(f.uri, { mimeType: 'text/csv', dialogTitle: 'Practice log' });
    } catch {
      Alert.alert('Couldn’t export', 'Try sharing the summary instead.');
    }
  };

  const confirmDelete = (id: string, when: string) => {
    Alert.alert('Delete this session?', when, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeSession(id) },
    ]);
  };

  if (!sessions.length) {
    return (
      <View style={[s.scroll, { flex: 1 }]}>
        <Heading>Your practice.</Heading>
        <Body style={{ marginTop: 8 }}>
          Each session you finish is kept here: the days you practised, how long, and how your attention shifted. It builds week by week, for as long as you keep going.
        </Body>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Heading>Your practice.</Heading>
      </FadeIn>

      <FadeIn delay={60}>
        <View style={s.stats}>
          <Stat value={String(sessions.length)} label="sessions" />
          <Stat value={`${last7}/7`} label="days this week" />
          <Stat value={String(minutes)} label="minutes" />
          <Stat value={shift == null ? '–' : `${shift > 0 ? '+' : shift < 0 ? '−' : ''}${Math.abs(shift).toFixed(1)}`} label="avg rating shift" />
        </View>
        {shift != null && (
          <Text style={s.caption}>
            {shift < 0
              ? 'On average, your attention moves outward during a session.'
              : shift > 0
                ? 'On average, your attention moves inward during a session.'
                : 'On average, your rating holds steady across a session.'}
          </Text>
        )}
      </FadeIn>

      <FadeIn delay={120}>
        <Card style={{ gap: 14 }}>
          <View style={s.rowBetween}><Label>practice record</Label><Text style={s.meta}>× = practised</Text></View>
          <WeekGrid sessions={sessions} />
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
        <Card style={{ gap: 8 }}>
          <Label>self-attention</Label>
          <Text style={s.meta}>−3 all on the world around you · +3 all on yourself</Text>
          <RatingChart sessions={sessions} />
        </Card>
      </FadeIn>

      <FadeIn delay={240}>
        <Card style={{ paddingVertical: 6 }}>
          {shown.map((x, i) => {
            const d = new Date(x.startedAt);
            const when = `${longDate(d)}, ${timeOfDay(d)}`;
            return (
              <View key={x.id}>
                {i > 0 && <Rule />}
                <Pressable onLongPress={() => confirmDelete(x.id, when)} delayLongPress={450} style={s.item} accessibilityHint="Long press to delete">
                  <View style={s.rowBetween}>
                    <Text style={s.when}>{when}</Text>
                    <Text style={s.ratings}>{signed(x.before)} → {signed(x.after)}</Text>
                  </View>
                  <Text style={s.meta}>
                    {clock(x.durationSec)}{x.completed ? '' : ' · ended early'} · {x.phases.map(p => p.id === 'selective' ? 'focus' : p.id === 'switching' ? 'switch' : 'widen').join(', ')} · {x.soundCount} sounds
                  </Text>
                  {!!x.note && <Text style={s.note}>{x.note}</Text>}
                </Pressable>
              </View>
            );
          })}
        </Card>
        {list.length > 12 && !showAll && (
          <Pressable onPress={() => setShowAll(true)} style={{ paddingVertical: 12 }}><Text style={[s.link, { textAlign: 'center' }]}>show all {list.length} sessions</Text></Pressable>
        )}
        <Text style={[s.meta, { textAlign: 'center', marginTop: 8 }]}>Long-press a session to delete it.</Text>
      </FadeIn>

      <FadeIn delay={300} style={s.actions}>
        <Pressable onPress={shareSummary} style={s.action} accessibilityRole="button"><Text style={s.actionText}>share summary</Text></Pressable>
        <Pressable onPress={exportCsv} style={s.action} accessibilityRole="button"><Text style={s.actionText}>export csv</Text></Pressable>
      </FadeIn>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: GUTTER, paddingTop: 20, paddingBottom: 40, gap: 18 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  stat: { width: '50%' },
  statValue: { fontFamily: F.serifLight, fontSize: 34, color: T.text, letterSpacing: -0.5 },
  statLabel: { fontFamily: F.mono, fontSize: 11, color: T.textDim, letterSpacing: 0.4 },
  caption: { fontFamily: F.serifItalic, fontSize: 16, lineHeight: 22, color: T.textSoft, marginTop: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  meta: { fontFamily: F.sans, fontSize: 12.5, lineHeight: 18, color: T.textDim },
  item: { paddingVertical: 12, gap: 3 },
  when: { fontFamily: F.sansMedium, fontSize: 14.5, color: T.text },
  ratings: { fontFamily: F.mono, fontSize: 13, color: T.text },
  note: { fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: T.textSoft, marginTop: 6 },
  link: { fontFamily: F.sansMedium, fontSize: 14, color: T.accent },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  actionText: { fontFamily: F.sansMedium, fontSize: 14, color: T.text },
});
