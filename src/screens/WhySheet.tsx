import React from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { F, GUTTER, T } from '../tokens';
import { Body, Heading, Label, Rule } from '../components/ui';

export const WHY = [
  {
    title: 'Worry feeds on attention',
    body: 'Worry and rumination only keep going while attention stays on them. When we’re anxious or low, attention tends to lock onto our own thoughts, feelings and body, and onto what might go wrong, and it can start to feel as if it’s stuck there.',
  },
  {
    title: 'Your attention is under your control',
    body: 'This practice shows you that it isn’t stuck. You don’t try to stop or change any thought. You just choose where attention goes: holding it on one sound, moving it quickly, then widening it. Each time you do, you see that you can steer it, which makes it easier to stop feeding a worry when you notice one starting.',
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
  'Worry feeds on attention. This practice shows you it’s yours to steer.',
  'You’re not trying to stop thoughts. Just practising where attention goes.',
  'Attention can feel stuck on worry. It isn’t. You can move it.',
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
          <Heading size={30}>Worry feeds on attention. You can steer it.</Heading>
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
