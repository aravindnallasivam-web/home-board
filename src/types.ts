export type ThemeMode = 'auto' | 'light' | 'dark';
export type Screen = 'home' | 'menu' | 'alarms' | 'settings';

export type WidgetType =
  | 'clock'
  | 'weather'
  | 'alarm'
  | 'menu'
  | 'photo'
  | 'chores'
  | 'note'
  | 'calendar'
  | 'countdown'
  | 'shopping';

export interface WidgetConfig {
  /** photo widget: ids of photos stored on the tablet */
  photoIds?: string[];
  /** photo widget: seconds between photos */
  interval?: number;
  /** note widget */
  text?: string;
  author?: string;
  /** countdown widget */
  label?: string;
  date?: string;
}

export interface Widget {
  id: string;
  type: WidgetType;
  w: number;
  h: number;
  config?: WidgetConfig;
}

export interface Chore {
  id: string;
  label: string;
  who: string;
  /** date key (YYYY-MM-DD) of the day it was ticked off */
  doneOn?: string;
}

export interface ShopItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Alarm {
  id: string;
  /** HH:MM, 24-hour */
  time: string;
  label: string;
  /** JS weekday numbers, 0 = Sunday */
  days: number[];
  who: string;
  on: boolean;
  note: string;
}

export interface Reminder {
  id: string;
  label: string;
  detail: string;
}

export interface CalEvent {
  id: string;
  date: string;
  time: string;
  title: string;
}

export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner'];
export const MEAL_NAME: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

/** A dish on one of the meal lists */
export interface Dish {
  id: string;
  name: string;
}

/** The dishes planned for one date: meal -> dish ids */
export type DayPlan = Partial<Record<Meal, string[]>>;

export interface Location {
  name: string;
  lat: number;
  lon: number;
}

export interface Settings {
  theme: ThemeMode;
  dayStart: string;
  nightStart: string;
  location: Location | null;
  members: string[];
  mealTimes: Record<Meal, string>;
  keepAwake: boolean;
  homeTimeoutMin: number;
}
