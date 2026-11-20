import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, GUTTER, T } from '../tokens';
import { Body, Button, FadeIn, Heading, Label, Rule } from '../components/ui';
import { SoundField } from '../components/SoundField';
import { cueItems, defaultSettings } from '../sounds';

const PARTS = [
  ['One sound at a time', 'Stay with a single sound while the others carry on around you.'],
  ['Rapid switching', 'Move your attention quickly as the voice names a new sound or place.'],
  ['Every sound at once', 'Widen your attention to take in the whole soundscape together.'],
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const sample = cueItems(defaultSettings());

  return (
    <View style={[s.root, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {page === 0 && (
          <FadeIn key="p0" style={{ gap: 18 }}>
            <Text style={s.mark}>attend<Text style={{ color: T.accent }}>.</Text></Text>
            <Heading size={34}>Practise where your attention goes.</Heading>
            <Body>
              A calm voice guides you around a soundscape, near and far, left and right. Ten minutes or so, once a day, eyes closed.
            </Body>
            <View style={{ marginTop: 8 }}><SoundField items={sample} focus={['clock']} /></View>
          </FadeIn>
        )}
        {page === 1 && (
          <FadeIn key="p1" style={{ gap: 18 }}>
            <Label>how a session works</Label>
            <Heading size={30}>Three parts, all guided by voice.</Heading>
            <View style={{ gap: 14, marginTop: 4 }}>
              {PARTS.map(([t, d], i) => (
                <View key={t}>
                  {i > 0 && <Rule style={{ marginBottom: 14 }} />}
                  <Text style={s.partTitle}>{t}</Text>
                  <Text style={s.partDesc}>{d}</Text>
                </View>
              ))}
            </View>
            <Body dim>You rate your attention before and after, and each session is kept in your log to share with your therapist.</Body>
          </FadeIn>
        )}
        {page === 2 && (
          <FadeIn key="p2" style={{ gap: 18 }}>
            <Label>before you begin</Label>
            <Heading size={30}>A few gentle notes.</Heading>
            <Note text="Headphones give the clearest sense of left and right." />
            <Note text="Practise at a time you feel fairly settled. This is training for your attention, not a way to push worry away in the moment." />
            <Note text="Thoughts and feelings will come up. That’s expected. Let them be there and keep following the voice." />
            <Note text="attend supports work you’re doing with a therapist. It isn’t medical advice or a treatment." />
          </FadeIn>
        )}
      </ScrollView>
      <View style={s.footer}>
        <View style={s.dots}>
          {[0, 1, 2].map(i => <View key={i} style={[s.dot, { backgroundColor: i === page ? T.accent : T.line }]} />)}
        </View>
        <Button label={page < 2 ? 'Continue' : 'Get started'} onPress={() => (page < 2 ? setPage(page + 1) : onDone())} />
      </View>
    </View>
  );
}

function Note({ text }: { text: string }) {
  return (
    <View style={s.note}>
      <View style={s.noteBar} />
      <Text style={s.noteText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: 24 },
  mark: { fontFamily: F.serifLight, fontSize: 22, color: T.text, letterSpacing: -0.3 },
  partTitle: { fontFamily: F.sansMedium, fontSize: 16, color: T.text },
  partDesc: { fontFamily: F.sans, fontSize: 14.5, lineHeight: 21, color: T.textSoft, marginTop: 3 },
  footer: { paddingHorizontal: GUTTER, gap: 18 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  note: { flexDirection: 'row', gap: 14 },
  noteBar: { width: 2, borderRadius: 1, backgroundColor: T.accent, opacity: 0.6 },
  noteText: { flex: 1, fontFamily: F.sans, fontSize: 15, lineHeight: 22, color: T.textSoft },
});
