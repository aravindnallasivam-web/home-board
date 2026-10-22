import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar } from '@capacitor/status-bar';
import type { Alarm } from '../types';

export const isNative = Capacitor.isNativePlatform();

/** Full screen, screen always on. Called once at start and when the setting changes. */
export async function setupDisplay(keepAwake: boolean) {
  if (!isNative) return;
  try {
    await StatusBar.hide();
  } catch {
    /* not available */
  }
  try {
    if (keepAwake) await KeepAwake.keepAwake();
    else await KeepAwake.allowSleep();
  } catch {
    /* not available */
  }
}

let channelReady = false;
async function ensureChannel() {
  if (channelReady) return;
  await LocalNotifications.createChannel({
    id: 'alarms',
    name: 'Alarms',
    description: 'Household alarms',
    importance: 5,
    visibility: 1,
    vibration: true,
  });
  channelReady = true;
}

export async function requestAlarmPermission(): Promise<boolean> {
  if (!isNative) return false;
  const p = await LocalNotifications.requestPermissions();
  return p.display === 'granted';
}

export async function exactAlarmsAllowed(): Promise<boolean> {
  if (!isNative) return true;
  try {
    const s = await LocalNotifications.checkExactNotificationSetting();
    return s.exact_alarm === 'granted';
  } catch {
    return true;
  }
}

export async function openExactAlarmSetting() {
  if (!isNative) return;
  try {
    await LocalNotifications.changeExactNotificationSetting();
  } catch {
    /* older Android: nothing to change */
  }
}

/**
 * Mirror the enabled alarms as Android notifications, so they still go off
 * if the app is closed or in the background. While the app is open on the
 * wall, the in-app ringing screen handles them.
 */
export async function syncNativeAlarms(alarms: Alarm[]) {
  if (!isNative) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await ensureChannel();
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    let nid = 1000;
    const notifications = alarms
      .filter((a) => a.on)
      .flatMap((a) => {
        const [hour, minute] = a.time.split(':').map(Number);
        const days = a.days.length ? a.days : [0, 1, 2, 3, 4, 5, 6];
        return days.map((d) => ({
          id: nid++,
          title: a.label,
          body: a.note || `${a.who} · alarm`,
          channelId: 'alarms',
          extra: { alarmId: a.id },
          // Capacitor weekdays: 1 = Sunday … 7 = Saturday
          schedule: { on: { weekday: d + 1, hour, minute }, allowWhileIdle: true },
        }));
      });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn('Could not schedule alarms', e);
  }
}

/** When someone taps an alarm notification, open the ringing screen for it. */
export function onNotificationTap(cb: (alarmId: string) => void) {
  if (!isNative) return () => {};
  const h = LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const id = e.notification.extra?.alarmId;
    if (id) cb(id);
  });
  return () => {
    void h.then((x) => x.remove());
  };
}
