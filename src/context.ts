import { createContext, useContext } from 'react';
import { SessionRecord, Settings } from './types';

export interface AppState {
  settings: Settings;
  sessions: SessionRecord[];
  updateSettings: (patch: (s: Settings) => Settings) => void;
  addSession: (rec: SessionRecord) => void;
  removeSession: (id: string) => void;
  resetAll: () => Promise<void>;
  openSettings: () => void;
  startSession: () => void;
  goTo: (tab: TabId) => void;
}

export type TabId = 'practice' | 'sounds' | 'log';

export const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
