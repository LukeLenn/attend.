import { SessionRecord } from './types';

/** Local-timezone day key. Never use toISOString() for day keys. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function signed(v: number | null): string {
  if (v == null) return '–';
  if (v > 0) return `+${v}`;
  if (v < 0) return `−${Math.abs(v)}`;
  return '0';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function shortDate(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDate(d: Date, now = new Date()): string {
  const y = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${y}`;
}

export function timeOfDay(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function newId(d: Date): string {
  return 's' + d.getTime().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function byDay(sessions: SessionRecord[]): Record<string, SessionRecord[]> {
  const out: Record<string, SessionRecord[]> = {};
  for (const s of sessions) (out[s.date] ??= []).push(s);
  return out;
}

export function streak(sessions: SessionRecord[], now = new Date()): number {
  const days = byDay(sessions);
  let d = new Date(now);
  if (!days[dateKey(d)]) d = addDays(d, -1);
  let n = 0;
  while (days[dateKey(d)]) { n++; d = addDays(d, -1); }
  return n;
}

export function summaryText(sessions: SessionRecord[]): string {
  const lines = ['Attention training practice log', ''];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    const note = s.note ? `  · ${s.note.replace(/\s+/g, ' ')}` : '';
    lines.push(`${longDate(d)} ${timeOfDay(d)}  ${clock(s.durationSec)}${s.completed ? '' : ' (ended early)'}  self-attention ${signed(s.before)} → ${signed(s.after)}${note}`);
  }
  return lines.join('\n');
}

export function csvText(sessions: SessionRecord[]): string {
  const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows: (string | number | null)[][] = [['date', 'time', 'duration_min', 'completed', 'parts', 'sounds', 'rating_before', 'rating_after', 'note']];
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    rows.push([s.date, timeOfDay(d), (s.durationSec / 60).toFixed(1), s.completed ? 'yes' : 'no', s.phases.map(p => `${p.id}:${p.min}`).join(' '), s.soundCount, s.before, s.after, s.note]);
  }
  return rows.map(r => r.map(q).join(',')).join('\n');
}
