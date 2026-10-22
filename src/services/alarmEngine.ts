import { useEffect, useRef } from 'react';
import { ring, useStore } from '../store';
import { dateKey, hhmm } from '../util';
import { onNotificationTap, syncNativeAlarms } from './native';
import { startRinging, stopRinging } from './sound';

const MAX_RING_MS = 10 * 60 * 1000;

/** Checks the alarms every few seconds and opens the ringing screen when one is due. */
export function useAlarmEngine() {
  const fired = useRef(new Set<string>());
  const alarms = useStore((s) => s.alarms);
  const ringing = useStore((s) => s.ringing);

  // keep Android's scheduled notifications in step with the alarm list
  useEffect(() => {
    void syncNativeAlarms(alarms);
  }, [alarms]);

  useEffect(() => onNotificationTap((id) => ring(id)), []);

  useEffect(() => {
    const check = () => {
      const s = useStore.getState();
      const now = new Date();
      const t = hhmm(now);
      const key = dateKey(now);

      // snoozed alarms
      const due = s.snoozes.find((z) => z.until <= now.getTime());
      if (due && !s.ringing) {
        useStore.setState({ snoozes: s.snoozes.filter((z) => z !== due) });
        ring(due.alarmId);
        return;
      }

      for (const a of s.alarms) {
        if (!a.on || a.time !== t) continue;
        if (a.days.length && !a.days.includes(now.getDay())) continue;
        const k = `${a.id}@${key}T${t}`;
        if (fired.current.has(k)) continue;
        fired.current.add(k);
        if (!a.days.length) {
          // one-off alarm: switch it off after it rings
          useStore.setState({ alarms: s.alarms.map((x) => (x.id === a.id ? { ...x, on: false } : x)) });
        }
        if (!s.ringing) ring(a.id);
        return;
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

  // sound while ringing, and stop by itself after 10 minutes
  useEffect(() => {
    if (!ringing) {
      stopRinging();
      return;
    }
    startRinging();
    const stop = setTimeout(() => useStore.setState({ ringing: null }), MAX_RING_MS);
    return () => {
      clearTimeout(stop);
      stopRinging();
    };
  }, [ringing]);
}
