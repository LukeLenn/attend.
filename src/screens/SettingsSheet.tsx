import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useApp } from '../context';
import { requestPermission } from '../notifications';
import { listVoices, say, VoiceOption, configureSpeech } from '../speech';
import { engine } from '../audio/engine';
import { F, GUTTER, T } from '../tokens';
import { Body, Button, Card, Heading, Label, Rule, Stepper, Toggle, tap } from '../components/ui';

const PRIVACY_URL = 'https://example.com/attend/privacy'; // TODO: replace before submitting

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, updateSettings, resetAll } = useApp();
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [showAllVoices, setShowAllVoices] = useState(false);

  useEffect(() => {
    if (visible) void listVoices().then(setVoices);
  }, [visible]);

  const testVoice = () => {
    configureSpeech({ voiceId: settings.voiceId, rate: settings.rate });
    void say('Focus on the ticking clock, near you on your left.');
  };

  const setReminder = async (on: boolean) => {
    if (on && !(await requestPermission())) {
      Alert.alert('Notifications are off', 'Turn on notifications for attend in Settings to get a daily reminder.');
      return;
    }
    updateSettings(s => ({ ...s, reminder: { ...s.reminder, on } }));
  };

  const onTime = (_: DateTimePickerEvent, d?: Date) => {
    if (!d) return;
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    updateSettings(s => ({ ...s, reminder: { ...s.reminder, time: t } }));
  };

  const reminderDate = (() => {
    const [h, m] = settings.reminder.time.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0); return d;
  })();

  const confirmReset = () => {
    Alert.alert('Delete all data?', 'This removes every session and resets your settings. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: () => { void resetAll(); onClose(); } },
    ]);
  };

  const shownVoices = showAllVoices ? voices : voices.slice(0, 6);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.top}>
          <Heading size={26}>Settings</Heading>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button"><Text style={s.done}>done</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Card style={{ gap: 14 }}>
            <Label>voice</Label>
            {voices.length === 0 ? (
              <Body dim>Using your phone’s default voice. You can download nicer voices in iOS Settings → Accessibility → Spoken Content → Voices.</Body>
            ) : (
              <View>
                <VoiceRow name="Default voice" detail="your phone’s choice" on={!settings.voiceId} onPress={() => updateSettings(s => ({ ...s, voiceId: null }))} />
                {shownVoices.map(v => (
                  <VoiceRow key={v.id} name={v.name} detail={`${v.language}${v.enhanced ? ' · enhanced' : ''}`} on={settings.voiceId === v.id} onPress={() => updateSettings(s => ({ ...s, voiceId: v.id }))} />
                ))}
                {voices.length > 6 && !showAllVoices && (
                  <Pressable onPress={() => setShowAllVoices(true)} style={{ paddingTop: 10 }}><Text style={s.link}>show all {voices.length} voices</Text></Pressable>
                )}
              </View>
            )}
            <Rule />
            <View style={s.row}>
              <Text style={s.rowText}>Speaking speed</Text>
              <Stepper value={settings.rate} min={0.7} max={1.3} step={0.05} format={v => `×${v.toFixed(2)}`} onChange={v => updateSettings(s => ({ ...s, rate: v }))} />
            </View>
            <View style={s.row}>
              <Text style={s.rowText}>Soundscape volume</Text>
              <Stepper value={Math.round(settings.volume * 100)} min={10} max={100} step={10} format={v => `${v}%`} onChange={v => { engine.setVolume(v / 100); updateSettings(s => ({ ...s, volume: v / 100 })); }} />
            </View>
            <Button kind="quiet" label="Test voice" onPress={testVoice} />
          </Card>

          <Card style={{ gap: 14 }}>
            <Label>daily reminder</Label>
            <View style={s.row}>
              <Text style={s.rowText}>Remind me to practise</Text>
              <Toggle label="Daily reminder" on={settings.reminder.on} onChange={v => { void setReminder(v); }} />
            </View>
            {settings.reminder.on && (
              <View style={s.row}>
                <Text style={s.rowText}>At</Text>
                <DateTimePicker value={reminderDate} mode="time" display={Platform.OS === 'ios' ? 'compact' : 'default'} onChange={onTime} />
              </View>
            )}
          </Card>

          <Card style={{ gap: 10 }}>
            <Label>about</Label>
            <Body>
              attend guides you through attention training: practising where your attention goes by listening to sounds one at a time, switching quickly between them, and taking them all in at once.
            </Body>
            <Body>
              It’s a practice aid for homework set with a therapist. It isn’t medical advice or a treatment, and it isn’t meant as a way to cope with worry in the moment. If you’re struggling, please contact your therapist, doctor or local emergency services.
            </Body>
            <Body dim>Everything you record stays on this phone. Nothing is sent anywhere.</Body>
            <Text style={s.small}>Privacy policy: {PRIVACY_URL}</Text>
          </Card>

          <Button kind="danger" label="Delete all data" onPress={confirmReset} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function VoiceRow({ name, detail, on, onPress }: { name: string; detail: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} style={s.voiceRow} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <View style={[s.radio, { borderColor: on ? T.accent : T.line }]}>{on && <View style={s.radioDot} />}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowText}>{name}</Text>
        <Text style={s.small}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: GUTTER, paddingTop: 24, paddingBottom: 12 },
  done: { fontFamily: F.sansMedium, fontSize: 16, color: T.accent },
  scroll: { paddingHorizontal: GUTTER, paddingBottom: 48, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { fontFamily: F.sans, fontSize: 15, color: T.text },
  link: { fontFamily: F.sansMedium, fontSize: 14, color: T.accent },
  small: { fontFamily: F.mono, fontSize: 11, color: T.textDim },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: T.accent },
});
