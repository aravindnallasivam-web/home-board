import { useEffect, useState } from 'react';
import { useStore } from './store';
import { hhmm } from './util';

/** Current time, refreshed every `ms` milliseconds (aligned to the minute for the default). */
export function useNow(ms = 1000 * 15): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** The theme actually showing right now, resolving "auto" by the day/night times. */
export function useResolvedTheme(): 'light' | 'dark' {
  const { theme, dayStart, nightStart } = useStore((s) => s.settings);
  const now = useNow(30000);
  if (theme !== 'auto') return theme;
  const t = hhmm(now);
  const isDay = dayStart <= nightStart ? t >= dayStart && t < nightStart : t >= dayStart || t < nightStart;
  return isDay ? 'light' : 'dark';
}

export function useApplyTheme() {
  const resolved = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'light' ? '#f4f2ed' : '#14181f');
  }, [resolved]);
}
