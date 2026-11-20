import React, { Component, ErrorInfo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Newsreader_300Light, Newsreader_300Light_Italic, Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import { DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { AppContext, AppState, TabId } from './src/context';
import { engine } from './src/audio/engine';
import { configureSpeech } from './src/speech';
import { scheduleReminder } from './src/notifications';
import { clearAll, KEYS, load, save } from './src/storage';
import { defaultSettings, mergeSettings } from './src/sounds';
import { SessionRecord, Settings } from './src/types';
import { F, GUTTER, T } from './src/tokens';
import { tap } from './src/components/ui';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { SoundsScreen } from './src/screens/SoundsScreen';
import { LogScreen } from './src/screens/LogScreen';
import { SessionFlow } from './src/screens/SessionFlow';
import { SettingsSheet } from './src/screens/SettingsSheet';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('App crash:', error, info.componentStack); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.center}>
        <Text style={styles.fallback}>Something went wrong.</Text>
        <Pressable onPress={() => this.setState({ hasError: false })} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'practice', label: 'practice' },
  { id: 'sounds', label: 'sounds' },
  { id: 'log', label: 'log' },
];

function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      <View style={styles.tabRule} />
      {TABS.map(t => {
        const on = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => { tap(); onChange(t.id); }} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
            {on && <View style={styles.tabMark} />}
            <Text style={on ? styles.tabOn : styles.tabOff}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [tab, setTab] = useState<TabId>('practice');
  const [sessionOpen, setSessionOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    void Promise.all([
      load<Partial<Settings> | null>(KEYS.SETTINGS, null),
      load<SessionRecord[]>(KEYS.SESSIONS, []),
      load<boolean>(KEYS.ONBOARDED, false),
    ]).then(([s, list, o]) => {
      setSettings(mergeSettings(s));
      setSessions(list.sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1)));
      setOnboarded(o);
      loaded.current = true;
      setReady(true);
    });
  }, []);

  // Keep voice, volume and reminder in step with settings, and persist them.
  useEffect(() => {
    configureSpeech({ voiceId: settings.voiceId, rate: settings.rate });
    engine.setVolume(settings.volume);
    if (!loaded.current) return;
    void save(KEYS.SETTINGS, settings);
  }, [settings]);

  const reminderKey = `${settings.reminder.on}|${settings.reminder.time}`;
  useEffect(() => {
    if (!loaded.current) return;
    void scheduleReminder(settings.reminder.on, settings.reminder.time).catch(() => {});
  }, [reminderKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback((fn: (s: Settings) => Settings) => setSettings(prev => fn(prev)), []);

  const addSession = useCallback((rec: SessionRecord) => {
    setSessions(prev => {
      const next = [...prev, rec].sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1));
      void save(KEYS.SESSIONS, next);
      return next;
    });
    setTab('log');
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      void save(KEYS.SESSIONS, next);
      return next;
    });
  }, []);

  const resetAll = useCallback(async () => {
    await clearAll();
    await scheduleReminder(false, '00:00').catch(() => {});
    setSessions([]);
    setSettings(defaultSettings());
    setOnboarded(false);
    setTab('practice');
  }, []);

  const value: AppState = useMemo(() => ({
    settings,
    sessions,
    updateSettings,
    addSession,
    removeSession,
    resetAll,
    openSettings: () => setSettingsOpen(true),
    startSession: () => { engine.stopAll(0.3, 'p:'); setSessionOpen(true); },
    goTo: setTab,
  }), [settings, sessions, updateSettings, addSession, removeSession, resetAll]);

  if (!ready) {
    return <View style={styles.center}><Text style={styles.loading}>attend<Text style={{ color: T.accent }}>.</Text></Text></View>;
  }

  if (!onboarded) {
    return (
      <AppContext.Provider value={value}>
        <OnboardingScreen onDone={() => { setOnboarded(true); void save(KEYS.ONBOARDED, true); }} />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={value}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.wordmark}>attend<Text style={{ color: T.accent }}>.</Text></Text>
            <Pressable onPress={() => { tap(); setSettingsOpen(true); }} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
              <Text style={styles.settings}>settings</Text>
            </Pressable>
          </View>
          <View style={styles.headerRule} />
        </View>
        <View style={{ flex: 1 }}>
          {tab === 'practice' && <PracticeScreen />}
          {tab === 'sounds' && <SoundsScreen />}
          {tab === 'log' && <LogScreen />}
        </View>
        <TabBar active={tab} onChange={setTab} />
      </View>
      <SessionFlow visible={sessionOpen} onClose={() => setSessionOpen(false)} />
      <SettingsSheet visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </AppContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_300Light,
    Newsreader_300Light_Italic,
    Newsreader_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });
  if (!fontsLoaded) return <View style={styles.center}><StatusBar barStyle="dark-content" /></View>;
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <AppContent />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  loading: { fontFamily: F.serifLight, fontSize: 24, color: T.textDim },
  fallback: { fontFamily: F.serifLight, fontSize: 22, color: T.text },
  retry: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 22, backgroundColor: T.accent, borderRadius: 12 },
  retryText: { fontFamily: F.sansMedium, fontSize: 15, color: T.accentText },
  header: { paddingHorizontal: GUTTER, paddingTop: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wordmark: { fontFamily: F.serifLight, fontSize: 22, color: T.text, letterSpacing: -0.3 },
  settings: { fontFamily: F.mono, fontSize: 11, color: T.textDim, letterSpacing: 0.5 },
  headerRule: { height: StyleSheet.hairlineWidth, backgroundColor: T.line, marginTop: 12 },
  tabBar: { flexDirection: 'row', backgroundColor: T.bg },
  tabRule: { position: 'absolute', top: 0, left: GUTTER, right: GUTTER, height: StyleSheet.hairlineWidth, backgroundColor: T.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabMark: { position: 'absolute', top: 0, width: 20, height: 2, borderRadius: 1, backgroundColor: T.accent },
  tabOn: { fontFamily: F.sansMedium, fontSize: 13.5, color: T.accent, letterSpacing: 0.2 },
  tabOff: { fontFamily: F.sans, fontSize: 13.5, color: T.textDim },
});
