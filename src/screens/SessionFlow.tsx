// The session itself, on the dusk palette: rate → listen → rate.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context';
import { engine } from '../audio/engine';
import { SessionRunner, planFrom } from '../session/runner';
import { cueItems } from '../sounds';
import { D, F, GUTTER, R } from '../tokens';
import { CueItem } from '../types';
import { clock, dateKey, newId } from '../utils';
import { Body, Button, Heading, Label } from '../components/ui';
import { RatingScale } from '../components/RatingScale';
import { SoundField } from '../components/SoundField';

type Step = 'before' | 'run' | 'after';
const KEEP_AWAKE_TAG = 'attend-session';
const DIM_AFTER_MS = 12000;

export function SessionFlow({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, addSession } = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('before');
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [cue, setCue] = useState('');
  const [focus, setFocus] = useState<string[] | null>(null);
  const [, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [result, setResult] = useState<{ completed: boolean; sec: number } | null>(null);
  const [ready, setReady] = useState(0); // 0..1 sounds prepared
  const [prepError, setPrepError] = useState(false);
  const runner = useRef<SessionRunner | null>(null);
  const items = useRef<CueItem[]>([]);
  const startedAt = useRef(new Date());
  const dim = useRef(new Animated.Value(1)).current;
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fresh state each time the flow opens.
  useEffect(() => {
    if (!visible) return;
    setStep('before'); setBefore(null); setAfter(null); setNote(''); setCue(''); setFocus(null);
    setPaused(false); setConfirmEnd(false); setResult(null);
    // Prepare the sounds while the person rates themselves.
    const list = cueItems(settings).filter(i => i.kind === 'synth').map(i => ({ id: i.soundId!, spot: i.spot! }));
    setReady(list.length === 0 ? 1 : 0);
    setPrepError(false);
    let live = true;
    engine.prepare(list, (done, total) => { if (live) setReady(done / total); })
      .catch(() => { if (live) setPrepError(true); });
    return () => { live = false; };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const wake = useCallback(() => {
    Animated.timing(dim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    if (dimTimer.current) clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => {
      Animated.timing(dim, { toValue: 0.12, duration: 1800, useNativeDriver: true }).start();
    }, DIM_AFTER_MS);
  }, [dim]);

  useEffect(() => {
    if (step !== 'run') return;
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => () => {
    runner.current?.end();
    if (dimTimer.current) clearTimeout(dimTimer.current);
    deactivateKeepAwake(KEEP_AWAKE_TAG);
  }, []);

  const begin = () => {
    items.current = cueItems(settings);
    startedAt.current = new Date();
    const r = new SessionRunner(items.current, planFrom(settings.phases), {
      onCue: setCue,
      onFocus: setFocus,
      onFinish: (completed, sec) => {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
        if (dimTimer.current) clearTimeout(dimTimer.current);
        dim.setValue(1);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResult({ completed, sec });
        setStep('after');
      },
    });
    runner.current = r;
    setStep('run');
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    wake();
    void r.start();
  };

  const togglePause = () => {
    const r = runner.current;
    if (!r) return;
    if (r.paused) { r.resume(); setPaused(false); setCue(''); }
    else { r.pause(); setPaused(true); setCue('Paused'); }
    wake();
  };

  const save = () => {
    const d = startedAt.current;
    const r = runner.current;
    addSession({
      id: newId(d),
      startedAt: d.toISOString(),
      date: dateKey(d),
      durationSec: result?.sec ?? 0,
      completed: result?.completed ?? false,
      phases: (r?.plan ?? []).map(p => ({ id: p.id, min: p.sec / 60 })),
      soundCount: items.current.length,
      before,
      after,
      note: note.trim().slice(0, 1000),
    });
    onClose();
  };

  const cancel = () => {
    runner.current?.end();
    runner.current = null;
    onClose();
  };

  const r = runner.current;
  const elapsed = r ? r.elapsed() : 0;
  const phaseIdx = r ? r.currentPhase() : 0;

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={step === 'run' ? () => setConfirmEnd(true) : cancel}>
      <StatusBar barStyle="light-content" />
      <View style={[s.root, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step === 'before' && (
          <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>
            <Label p={D}>before you start</Label>
            <Heading p={D} size={28} style={{ marginTop: 10 }}>Right now, is your attention more on yourself, or on the world around you?</Heading>
            <Body p={D} style={{ marginTop: 10 }}>“Yourself” means your thoughts, feelings and body. Go with your first answer.</Body>
            <View style={{ marginTop: 26 }}><RatingScale p={D} value={before} onChange={setBefore} /></View>
            {prepError && <Text style={[s.tip, { color: D.danger, marginTop: 16 }]}>Couldn’t prepare the sounds. You can still begin with the voice alone.</Text>}
            <View style={s.tipBox}>
              <Text style={s.tip}>Close your eyes once the voice begins. The screen dims by itself, and you can tap it anytime.</Text>
            </View>
            <View style={s.btnRow}>
              <Button p={D} kind="quiet" label="Back" onPress={cancel} style={{ flex: 1 }} />
              <Button
                p={D}
                label={ready < 1 && !prepError ? `Preparing sounds… ${Math.round(ready * 100)}%` : before == null ? 'Skip and begin' : 'Begin'}
                onPress={begin}
                disabled={ready < 1 && !prepError}
                style={{ flex: 2 }}
              />
            </View>
          </ScrollView>
        )}

        {step === 'run' && r && (
          <Pressable style={{ flex: 1 }} onPress={wake} accessible={false}>
            <Animated.View style={[s.run, { opacity: dim }]}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Label p={D}>{r.intro ? 'settling in' : r.plan[phaseIdx]?.title.toLowerCase()}</Label>
                <Text style={s.timer} accessibilityLabel={`${clock(r.total - elapsed)} remaining`}>{clock(r.total - elapsed)}</Text>
              </View>
              <Text style={s.cue} accessibilityLiveRegion="polite">{cue}</Text>
              <SoundField items={items.current} focus={focus} p={D} />
              <View style={{ gap: 8 }}>
                <View style={s.prog}>
                  {(() => {
                    let acc = 0;
                    return r.plan.map(p => {
                      const frac = Math.max(0, Math.min(1, (elapsed - acc) / p.sec));
                      acc += p.sec;
                      return (
                        <View key={p.id} style={[s.progTrack, { flex: p.sec }]}>
                          <View style={[s.progFill, { width: `${frac * 100}%` }]} />
                        </View>
                      );
                    });
                  })()}
                </View>
                <View style={s.prog}>
                  {r.plan.map(p => <Text key={p.id} numberOfLines={1} style={[s.progLabel, { flex: p.sec }]}>{p.short} {p.sec / 60}m</Text>)}
                </View>
              </View>
              {confirmEnd ? (
                <View style={{ gap: 10 }}>
                  <Text style={[s.tip, { textAlign: 'center' }]}>End this session now? What you’ve done so far is kept.</Text>
                  <View style={s.btnRow}>
                    <Button p={D} kind="quiet" label="Keep going" onPress={() => { setConfirmEnd(false); wake(); }} style={{ flex: 1 }} />
                    <Button p={D} kind="danger" label="End" onPress={() => { setConfirmEnd(false); r.end(); }} style={{ flex: 1 }} />
                  </View>
                </View>
              ) : (
                <View style={s.btnRow}>
                  <Button p={D} kind="quiet" label={paused ? 'Resume' : 'Pause'} onPress={togglePause} style={s.ctl} />
                  <Button
                    p={D}
                    kind="quiet"
                    label={r.intro ? 'Skip intro' : phaseIdx < r.plan.length - 1 ? 'Next part' : 'Finish'}
                    onPress={() => { r.skipPart(); setPaused(false); wake(); }}
                    style={s.ctl}
                  />
                  <Button p={D} kind="quiet" label="End" onPress={() => { setConfirmEnd(true); wake(); }} style={s.ctl} />
                </View>
              )}
            </Animated.View>
          </Pressable>
        )}

        {step === 'after' && (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Label p={D}>{result?.completed ? `session complete · ${clock(result.sec)}` : `ended early · ${clock(result?.sec ?? 0)} practised`}</Label>
              <Heading p={D} size={28} style={{ marginTop: 10 }}>And now? Where is your attention?</Heading>
              <View style={{ marginTop: 22 }}><RatingScale p={D} value={after} onChange={setAfter} /></View>
              <Text style={[s.noteLabel, { marginTop: 28 }]}>notes for your therapist, if any</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder="Which sounds were hard to stay with? Did your mind wander much?"
                placeholderTextColor={D.textDim}
                style={s.input}
                maxLength={1000}
              />
              <View style={[s.btnRow, { marginTop: 24 }]}>
                <Button p={D} kind="quiet" label="Don’t save" onPress={onClose} style={{ flex: 1 }} />
                <Button p={D} label="Save to log" onPress={save} style={{ flex: 2 }} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: D.bg },
  pad: { paddingHorizontal: GUTTER, paddingBottom: 24 },
  run: { flex: 1, paddingHorizontal: GUTTER, justifyContent: 'space-between', paddingTop: 12 },
  timer: { fontFamily: F.serifLight, fontSize: 72, color: D.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  cue: { fontFamily: F.serifItalic, fontSize: 24, lineHeight: 32, color: D.text, textAlign: 'center', minHeight: 96 },
  prog: { flexDirection: 'row', gap: 4 },
  progTrack: { height: 3, borderRadius: 2, backgroundColor: D.line, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: D.accent },
  progLabel: { fontFamily: F.mono, fontSize: 10.5, color: D.textDim },
  btnRow: { flexDirection: 'row', gap: 10 },
  ctl: { flex: 1, paddingHorizontal: 6 },
  tipBox: { marginTop: 28, marginBottom: 20, borderLeftWidth: 2, borderLeftColor: D.far, paddingLeft: 14 },
  tip: { fontFamily: F.sans, fontSize: 14, lineHeight: 20, color: D.textSoft },
  noteLabel: { fontFamily: F.mono, fontSize: 11, color: D.textDim, letterSpacing: 0.6, marginBottom: 8 },
  input: { minHeight: 110, borderWidth: 1, borderColor: D.line, borderRadius: R.md, padding: 14, fontFamily: F.sans, fontSize: 15, lineHeight: 21, color: D.text, backgroundColor: D.surface, textAlignVertical: 'top' },
});
