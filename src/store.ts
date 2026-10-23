import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Alarm,
  CalEvent,
  Chore,
  DayPlan,
  Dish,
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
  /** the dishes the family cooks, one list per meal */
  dishLists: Record<Meal, Dish[]>;
  /** date key (YYYY-MM-DD) -> what's planned that day */
  plan: Record<string, DayPlan>;
  /** names of dishes taken off a list, so past plans still read correctly */
  removedDishes: Record<string, string>;

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


const SEED_LISTS: Record<Meal, string[]> = {
  breakfast: ['Idli, sambar', 'Masala dosa', 'Ven pongal', 'Rava upma', 'Poori, masala', 'Pesarattu', 'Appam, stew', 'Coconut chutney'],
  lunch: ['Sambar rice', 'Rice, rasam', 'Curd rice', 'Lemon rice', 'Veg biryani', 'Kootu', 'Beans poriyal', 'Bisi bele bath', 'Dal tadka'],
  snack: ['Sundal', 'Onion bajji', 'Murukku', 'Fruit bowl', 'Masala tea'],
  dinner: ['Chapati', 'Paneer butter masala', 'Dal tadka', 'Veg pulao', 'Idiyappam, kurma', 'Parotta, kurma', 'Dosa, chutney', 'Idli, sambar'],
};

/** Starting dish lists, plus this week planned up to today so the board isn't empty. */
function seedMenu(): { dishLists: Record<Meal, Dish[]>; plan: Record<string, DayPlan> } {
  const dishLists = Object.fromEntries(
    (Object.keys(SEED_LISTS) as Meal[]).map((m) => [m, SEED_LISTS[m].map((name) => ({ id: uid(), name }))]),
  ) as Record<Meal, Dish[]>;
  const plan: Record<string, DayPlan> = {};
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const pick = (m: Meal, i: number) => dishLists[m][i % dishLists[m].length].id;
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    plan[dateKey(d)] = {
      breakfast: [pick('breakfast', i)],
      lunch: [pick('lunch', i)],
      snack: [pick('snack', i)],
      dinner: [pick('dinner', i)],
    };
  }
  return { dishLists, plan };
}

/** Old versions kept one repeating week of free text; turn it into dish lists + this week's plan. */
function migrateOldMenu(old: Record<Meal, string>[]): { dishLists: Record<Meal, Dish[]>; plan: Record<string, DayPlan> } {
  const dishLists = { breakfast: [], lunch: [], snack: [], dinner: [] } as Record<Meal, Dish[]>;
  const idFor = (m: Meal, name: string) => {
    const n = name.trim();
    if (!n) return null;
    let d = dishLists[m].find((x) => x.name.toLowerCase() === n.toLowerCase());
    if (!d) {
      d = { id: uid(), name: n };
      dishLists[m].push(d);
    }
    return d.id;
  };
  const plan: Record<string, DayPlan> = {};
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  old.forEach((day, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const entry: DayPlan = {};
    (['breakfast', 'lunch', 'snack', 'dinner'] as Meal[]).forEach((m) => {
      const id = idFor(m, day?.[m] ?? '');
      if (id) entry[m] = [id];
    });
    plan[dateKey(d)] = entry;
  });
  return { dishLists, plan };
}

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
  ...seedMenu(),
  removedDishes: {},
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
      version: 2,
      migrate: (persisted, version) => {
        const st = persisted as Record<string, unknown>;
        if (version < 2) {
          const old = st.menu as Record<Meal, string>[] | undefined;
          delete st.menu;
          Object.assign(st, old ? migrateOldMenu(old) : seedMenu(), { removedDishes: {} });
        }
        return st as unknown as AppState;
      },
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

// ---------- menu ----------
export const addDish = (meal: Meal, rawName: string): string | null => {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) return null;
  const lists = get().dishLists;
  const found = lists[meal].find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (found) return found.id;
  const dish = { id: uid(), name };
  set({ dishLists: { ...lists, [meal]: [...lists[meal], dish] } });
  return dish.id;
};

export const renameDish = (meal: Meal, id: string, rawName: string) => {
  const name = rawName.trim().replace(/\s+/g, ' ');
  if (!name) return;
  const lists = get().dishLists;
  set({ dishLists: { ...lists, [meal]: lists[meal].map((d) => (d.id === id ? { ...d, name } : d)) } });
};

/** Remove from the list; days it was already planned on keep showing it. */
export const removeDish = (meal: Meal, id: string) => {
  const lists = get().dishLists;
  const name = findDishName(id) ?? '';
  set({ dishLists: { ...lists, [meal]: lists[meal].filter((d) => d.id !== id) }, removedDishes: { ...get().removedDishes, [id]: name } });
};

export const findDishName = (id: string): string | undefined => {
  const s = get();
  for (const m of Object.keys(s.dishLists) as Meal[]) {
    const d = s.dishLists[m].find((x) => x.id === id);
    if (d) return d.name;
  }
  return s.removedDishes[id];
};

export const setPlan = (key: string, meal: Meal, ids: string[]) => {
  const plan = get().plan;
  set({ plan: { ...plan, [key]: { ...plan[key], [meal]: ids } } });
};

/** Fill the empty meals of a week from the week before. */
export const copyWeek = (fromKeys: string[], toKeys: string[]) => {
  const plan = { ...get().plan };
  toKeys.forEach((k, i) => {
    const src = plan[fromKeys[i]];
    if (!src) return;
    const cur: DayPlan = { ...plan[k] };
    (Object.keys(src) as Meal[]).forEach((m) => {
      if (!cur[m]?.length && src[m]?.length) cur[m] = [...src[m]!];
    });
    plan[k] = cur;
  });
  set({ plan });
};

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
