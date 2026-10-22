import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Alarm,
  CalEvent,
  Chore,
  Meal,
  Reminder,
  RoutineItem,
  Screen,
  Settings,
  ShopItem,
  Widget,
  WidgetConfig,
} from './types';
import { dateKey, uid } from './util';

export interface Ringing {
  alarmId: string;
  /** epoch ms when it started ringing */
  since: number;
}

export interface AppState {
  settings: Settings;
  widgets: Widget[];
  chores: Chore[];
  shopping: ShopItem[];
  alarms: Alarm[];
  routine: RoutineItem[];
  /** date key -> routine item ids done that day */
  routineDone: Record<string, string[]>;
  reminders: Reminder[];
  events: CalEvent[];
  /** 7 days (Mon..Sun) × 4 meals */
  menu: Record<Meal, string>[];

  // ---- not persisted ----
  screen: Screen;
  ringing: Ringing | null;
  snoozes: { alarmId: string; until: number }[];
  editing: boolean;
}

const today = dateKey();
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

export const defaultState = (): Omit<AppState, 'screen' | 'ringing' | 'snoozes' | 'editing'> => ({
  settings: {
    theme: 'auto',
    dayStart: '06:30',
    nightStart: '19:00',
    location: null,
    members: ['Mom', 'Dad', 'Kid', 'All'],
    kidName: 'Kid',
    starGoal: 5,
    reward: 'Park on Sunday',
    mealTimes: { breakfast: '07:30', lunch: '13:00', snack: '16:30', dinner: '20:00' },
    keepAwake: true,
    homeTimeoutMin: 2,
  },
  widgets: [
    { id: uid(), type: 'clock', w: 3, h: 1 },
    { id: uid(), type: 'weather', w: 1, h: 1 },
    { id: uid(), type: 'alarm', w: 2, h: 1 },
    { id: uid(), type: 'menu', w: 2, h: 2 },
    { id: uid(), type: 'kids', w: 2, h: 2 },
    { id: uid(), type: 'photo', w: 2, h: 2, config: { photoIds: [], interval: 30 } },
    { id: uid(), type: 'chores', w: 4, h: 1 },
    {
      id: uid(),
      type: 'note',
      w: 2,
      h: 1,
      config: { text: 'Welcome! Tap the pencil on any widget to change what it shows.', author: 'Mom' },
    },
  ],
  chores: [
    { id: uid(), label: 'Water plants', who: 'Mom' },
    { id: uid(), label: 'Trash out', who: 'Dad' },
    { id: uid(), label: 'Fold laundry', who: 'Dad' },
    { id: uid(), label: 'Pack school bag', who: 'Kid' },
    { id: uid(), label: 'Dishwasher', who: 'Mom' },
  ],
  shopping: ['Milk', 'Curd', 'Potatoes', 'Onions', 'Coriander'].map((label) => ({ id: uid(), label, done: false })),
  alarms: [
    { id: uid(), time: '06:00', label: 'Wake up', days: [1, 2, 3, 4, 5, 6], who: 'All', on: true, note: '' },
    { id: uid(), time: '07:30', label: 'School bus in 10 min', days: [1, 2, 3, 4, 5], who: 'Kid', on: true, note: 'Water bottle and ID card' },
    { id: uid(), time: '18:30', label: 'Homework time', days: [1, 2, 3, 4, 5], who: 'Kid', on: true, note: 'Pencil box is on the study table' },
    { id: uid(), time: '19:30', label: 'Story time', days: [0, 1, 2, 3, 4, 5, 6], who: 'Kid', on: true, note: '' },
    { id: uid(), time: '21:30', label: 'Lights out', days: [0, 1, 2, 3, 4, 5, 6], who: 'All', on: true, note: '' },
  ],
  routine: [
    { id: uid(), time: '06:45', label: 'Wake up and make bed' },
    { id: uid(), time: '07:00', label: 'Brush and bath' },
    { id: uid(), time: '07:20', label: 'Finish breakfast' },
    { id: uid(), time: '07:40', label: 'Catch the school bus' },
    { id: uid(), time: '16:30', label: 'Snack and play outside' },
    { id: uid(), time: '17:30', label: 'Drawing class' },
    { id: uid(), time: '18:30', label: 'Homework' },
    { id: uid(), time: '20:30', label: 'Story and bedtime' },
  ],
  routineDone: {},
  reminders: [
    { id: uid(), label: 'Water the plants', detail: 'Every day · 7:00 AM' },
    { id: uid(), label: 'Pay electricity bill', detail: 'Due on the 5th' },
    { id: uid(), label: 'Book gas cylinder', detail: '1st of every month' },
  ],
  events: [
    { id: uid(), date: today, time: '17:00', title: 'Grocery delivery' },
    { id: uid(), date: inDays(2), time: '10:00', title: 'Return library books' },
  ],
  menu: [
    { breakfast: 'Ven pongal', lunch: 'Sambar rice', snack: 'Murukku', dinner: 'Chapati, dal' },
    { breakfast: 'Masala dosa', lunch: 'Curd rice', snack: 'Banana', dinner: 'Veg pulao' },
    { breakfast: 'Rava upma', lunch: 'Lemon rice', snack: 'Sundal', dinner: 'Idiyappam, kurma' },
    { breakfast: 'Idli, sambar', lunch: 'Rice, rasam', snack: 'Sundal, tea', dinner: 'Chapati, paneer' },
    { breakfast: 'Poori, masala', lunch: 'Veg biryani', snack: 'Onion bajji', dinner: 'Dosa, chutney' },
    { breakfast: 'Pesarattu', lunch: 'Rice, kootu', snack: 'Fruit bowl', dinner: 'Parotta, kurma' },
    { breakfast: 'Appam, stew', lunch: 'Bisi bele bath', snack: 'Popcorn', dinner: 'Uthappam' },
  ],
});

export const useStore = create<AppState>()(
  persist(
    (): AppState => ({
      ...defaultState(),
      screen: 'home' as Screen,
      ringing: null,
      snoozes: [],
      editing: false,
    }),
    {
      name: 'wall-tablet-v1',
      version: 1,
      partialize: (s) => {
        const { screen, ringing, snoozes, editing, ...rest } = s;
        void screen; void ringing; void snoozes; void editing;
        return rest;
      },
    },
  ),
);

const set = useStore.setState;
const get = useStore.getState;

// ---------- actions ----------
export const go = (screen: Screen) => set({ screen, editing: false });
export const setEditing = (editing: boolean) => set({ editing });

export const updateSettings = (patch: Partial<Settings>) => set({ settings: { ...get().settings, ...patch } });

export const setWidgets = (widgets: Widget[]) => set({ widgets });
export const updateWidget = (id: string, patch: Partial<Widget>) =>
  set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) });
export const updateWidgetConfig = (id: string, patch: Partial<WidgetConfig>) =>
  set({ widgets: get().widgets.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w)) });

export const toggleChore = (id: string) => {
  const k = dateKey();
  set({ chores: get().chores.map((c) => (c.id === id ? { ...c, doneOn: c.doneOn === k ? undefined : k } : c)) });
};

export const toggleRoutine = (id: string) => {
  const k = dateKey();
  const done = get().routineDone[k] ?? [];
  const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
  // keep two weeks of history
  const keep = Object.fromEntries(
    Object.entries({ ...get().routineDone, [k]: next })
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 14),
  );
  set({ routineDone: keep });
};

export const toggleShop = (id: string) =>
  set({ shopping: get().shopping.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) });

export const setMenuCell = (day: number, meal: Meal, dish: string) =>
  set({ menu: get().menu.map((d, i) => (i === day ? { ...d, [meal]: dish } : d)) });

export const saveAlarm = (a: Alarm) => {
  const exists = get().alarms.some((x) => x.id === a.id);
  const alarms = exists ? get().alarms.map((x) => (x.id === a.id ? a : x)) : [...get().alarms, a];
  alarms.sort((x, y) => (x.time < y.time ? -1 : 1));
  set({ alarms });
};
export const deleteAlarm = (id: string) => set({ alarms: get().alarms.filter((a) => a.id !== id) });
export const toggleAlarm = (id: string) =>
  set({ alarms: get().alarms.map((a) => (a.id === id ? { ...a, on: !a.on } : a)) });

export const ring = (alarmId: string) => set({ ringing: { alarmId, since: Date.now() } });
export const dismissRing = () => set({ ringing: null });
export const snoozeRing = (minutes = 10) => {
  const r = get().ringing;
  if (!r) return;
  set({
    ringing: null,
    snoozes: [...get().snoozes.filter((s) => s.alarmId !== r.alarmId), { alarmId: r.alarmId, until: Date.now() + minutes * 60000 }],
  });
};

export const exportData = (): string => {
  const { screen, ringing, snoozes, editing, ...rest } = get();
  void screen; void ringing; void snoozes; void editing;
  return JSON.stringify({ app: 'wall-tablet', version: 1, data: rest }, null, 2);
};

export const importData = (json: string) => {
  const parsed = JSON.parse(json);
  if (parsed?.app !== 'wall-tablet' || !parsed.data) throw new Error('This is not a Wall Tablet backup file.');
  set({ ...defaultState(), ...parsed.data });
};

export const resetAll = () => set({ ...defaultState(), screen: 'home', ringing: null, snoozes: [], editing: false });
