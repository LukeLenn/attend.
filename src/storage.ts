import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  SETTINGS: 'attend:settings:v1',
  SESSIONS: 'attend:sessions:v1',
  ONBOARDED: 'attend:onboarded:v1',
};

export async function load<X>(key: string, fallback: X): Promise<X> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as X) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key: string, val: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Storage save error:', e);
  }
}

export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
