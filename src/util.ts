export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date key, YYYY-MM-DD */
export const dateKey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** HH:MM in 24-hour time */
export const hhmm = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** "18:30" -> { time: "6:30", ampm: "PM" } */
export const split12 = (t: string): { time: string; ampm: string } => {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return { time: `${h % 12 || 12}:${pad(m || 0)}`, ampm };
};

export const fmt12 = (t: string): string => {
  const s = split12(t);
  return `${s.time} ${s.ampm}`;
};

/** Monday-first index, 0 = Monday … 6 = Sunday */
export const mondayIndex = (d: Date = new Date()): number => (d.getDay() + 6) % 7;

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const daysLabel = (days: number[]): string => {
  const s = [...days].sort((a, b) => a - b).join(',');
  if (days.length === 7) return 'Every day';
  if (s === '1,2,3,4,5') return 'Mon – Fri';
  if (s === '1,2,3,4,5,6') return 'Mon – Sat';
  if (s === '0,6') return 'Weekends';
  if (days.length === 0) return 'Once';
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join(', ');
};

/** Minutes from now until the next occurrence of an alarm, or null if it never rings */
export const minutesUntil = (time: string, days: number[], now: Date): number | null => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const t = toMinutes(time);
  for (let offset = 0; offset < 8; offset++) {
    const day = (now.getDay() + offset) % 7;
    if (days.length && !days.includes(day)) continue;
    const diff = offset * 1440 + t - nowMin;
    if (diff > 0) return diff;
  }
  return null;
};

export const humanMinutes = (m: number): string => {
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h < 24) return r ? `in ${h} h ${r} min` : `in ${h} h`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? '' : 's'}`;
};

export const daysBetween = (fromKey: string, toKey: string): number => {
  const a = new Date(fromKey + 'T00:00:00');
  const b = new Date(toKey + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
