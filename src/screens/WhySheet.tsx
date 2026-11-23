import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { F, GUTTER, T } from '../tokens';
import { Body, Heading, Label, Rule } from '../components/ui';

export const WHY = [
  {
    title: 'Worry pulls attention inward',
    body: 'When we’re anxious or low, attention tends to lock onto our own thoughts, feelings and body, and onto what might go wrong. The longer it stays there, the more worry and rumination keep themselves going.',
  },
  {
    title: 'This trains the steering, not the thoughts',
    body: 'You don’t try to stop or change any thought. You practise choosing where your attention goes: holding it on one thing, moving it quickly, then widening it. As that control gets more flexible, it becomes easier to step out of a worry loop when you notice you’re in one.',
  },
  {
    title: 'Why sounds',
    body: 'Sounds are neutral, outside you, and spread through space. Near and far, left and right give your attention somewhere to travel, which makes them a simple place to practise.',
  },
  {
    title: 'Not relaxation, not distraction',
    body: 'It’s fine if thoughts and feelings stay with you. The aim isn’t to feel calm or to push anything away. It’s to keep following the voice anyway.',
  },
  {
    title: 'What the research says',
    body: 'The Attention Training Technique was developed by psychologist Adrian Wells in 1990, and is part of metacognitive therapy. A 2016 review of ten studies found it helped with anxiety and low mood, and later trials point the same way. The research base is still fairly small, and it works best practised regularly, alongside therapy.',
  },
  {
    title: 'Your ratings',
    body: 'The before and after rating is a quick check of how self-focused you are. Over the weeks, your log shows how readily your attention moves outward.',
  },
];

/** One line for the practice screen; rotates by day. */
export const WHY_LINES = [
  'Worry pulls attention inward. This practice trains you to steer it.',
  'You’re not trying to stop thoughts. Just practising where attention goes.',
  'Flexible attention makes it easier to step out of a worry loop.',
  'Thoughts can come along. The skill is following the voice anyway.',
];

const SOURCES = [
  {
    label: 'Knowles, Foden, El-Deredy & Wells (2016). A systematic review of efficacy of the attention training technique in clinical and nonclinical samples. Journal of Clinical Psychology.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27129094/',
  },
  {
    label: 'Wells (1990). Panic disorder in association with relaxation induced anxiety: an attentional training approach to treatment. Behavior Therapy.',
    url: null,
  },
];

export function WhySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.top}>
          <Label>why this helps</Label>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button"><Text style={s.done}>done</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Heading size={30}>A few minutes of steering your attention.</Heading>
          {WHY.map((w, i) => (
            <View key={w.title} style={{ gap: 6 }}>
              {i > 0 && <Rule style={{ marginBottom: 14 }} />}
              <Text style={s.title}>{w.title}</Text>
              <Body>{w.body}</Body>
            </View>
          ))}
          <View style={s.sources}>
            <Label>sources</Label>
            {SOURCES.map(src => (
              <Pressable key={src.label} disabled={!src.url} onPress={() => src.url && void Linking.openURL(src.url)}>
                <Text style={[s.source, src.url ? { color: T.accent } : null]}>{src.label}</Text>
              </Pressable>
            ))}
          </View>
          <Body dim style={{ fontSize: 13 }}>attend supports work you’re doing with a therapist. It isn’t medical advice or a treatment on its own.</Body>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 22, paddingBottom: 8 },
  done: { fontFamily: F.sansMedium, fontSize: 16, color: T.accent },
  scroll: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 48, gap: 18 },
  title: { fontFamily: F.serif, fontSize: 19, color: T.text },
  sources: { gap: 8, marginTop: 8 },
  source: { fontFamily: F.sans, fontSize: 12.5, lineHeight: 18, color: T.textSoft },
});
