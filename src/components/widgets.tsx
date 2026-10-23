import { useEffect, useState, type ReactElement } from 'react';
import { useNow } from '../hooks';
import { usePhotoUrl } from '../services/photos';
import { describe, useWeather } from '../services/weather';
import { findDishName, go, toggleChore, toggleRoutine, toggleShop, useStore } from '../store';
import { MEAL_NAME, MEALS, type Meal, type Widget, type WidgetType } from '../types';
import { daysBetween, dateKey, fmt12, humanMinutes, minutesUntil, split12, toMinutes } from '../util';
import { Icon } from './Icon';

export const WIDGET_TYPES: Record<WidgetType, { name: string; desc: string; icon: string; w: number; h: number }> = {
  clock: { name: 'Clock & date', desc: "Big time and today's date, readable across the room.", icon: 'clock', w: 3, h: 1 },
  weather: { name: 'Weather', desc: "Temperature and today's outlook.", icon: 'cloudSun', w: 1, h: 1 },
  alarm: { name: 'Next alarm', desc: 'The upcoming alarm with a countdown.', icon: 'bell', w: 2, h: 1 },
  menu: { name: "Today's menu", desc: "Today's meals from the menu plan.", icon: 'menu', w: 2, h: 2 },
  kids: { name: "Kid's day", desc: "Timeline, what's on now and stars earned.", icon: 'star', w: 2, h: 2 },
  photo: { name: 'Photo frame', desc: 'One photo, or a slideshow from an album.', icon: 'photo', w: 2, h: 2 },
  chores: { name: 'Chores', desc: "Tick-off list showing who's doing what.", icon: 'list', w: 4, h: 1 },
  note: { name: 'Family note', desc: 'A sticky note anyone can update.', icon: 'note', w: 2, h: 1 },
  calendar: { name: 'Calendar', desc: 'Upcoming family events.', icon: 'calendar', w: 2, h: 2 },
  countdown: { name: 'Countdown', desc: 'Days left until a family event.', icon: 'hourglass', w: 1, h: 1 },
  shopping: { name: 'Shopping list', desc: 'Items to pick up, shared by everyone.', icon: 'cart', w: 2, h: 1 },
};

export const widgetTone = (t: WidgetType) =>
  t === 'alarm' ? 'tone-amber' : t === 'note' ? 'tone-note' : t === 'photo' ? 'tone-photo' : '';

/** Widgets whose content is edited from a dialog opened by a pencil button */
export const EDITABLE: WidgetType[] = ['chores', 'shopping', 'calendar', 'note', 'countdown', 'photo'];

interface P {
  widget: Widget;
  onEdit: () => void;
}

function EditBtn({ onEdit, label, light }: { onEdit: () => void; label: string; light?: boolean }) {
  return (
    <button
      type="button"
      className="icon-btn small"
      aria-label={label}
      onClick={onEdit}
      style={light ? { color: 'inherit', opacity: 0.75 } : undefined}
    >
      <Icon name="edit" size="1.2rem" />
    </button>
  );
}

// ---------------------------------------------------------------- clock
function Clock({ widget }: P) {
  const now = useNow(1000);
  const { w, h } = widget;
  const t = split12(`${now.getHours()}:${now.getMinutes()}`);
  const size = h === 1 ? Math.min(5.25, 1.25 + w * 1.35) : Math.min(9.5, w * 2.9);
  return (
    <div className="w-fill" style={{ justifyContent: 'center' }}>
      <div className="row" style={{ alignItems: 'baseline', gap: '0.6rem' }}>
        <span style={{ fontSize: `${size}rem`, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>{t.time}</span>
        <span style={{ fontSize: `${Math.max(1, size * 0.26)}rem`, fontWeight: 700, color: 'var(--muted)' }}>{t.ampm}</span>
      </div>
      <div style={{ fontSize: w > 1 ? '1.125rem' : '0.85rem', fontWeight: 500, color: 'var(--text2)', marginTop: '0.6rem' }}>
        {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- weather
function WeatherW({ widget }: P) {
  const loc = useStore((s) => s.settings.location);
  const { data, error } = useWeather(loc);
  if (!loc)
    return (
      <div className="w-fill" style={{ justifyContent: 'center', gap: '0.5rem' }}>
        <span className="eyebrow" style={{ color: 'var(--text2)' }}>Weather</span>
        <button type="button" className="btn btn-soft" onClick={() => go('settings')}>
          <Icon name="pin" size="1.2rem" />
          Set location
        </button>
      </div>
    );
  const d = data ? describe(data.code) : null;
  return (
    <div className="w-fill" style={{ justifyContent: 'space-between' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ color: 'var(--text2)' }}>{widget.w > 1 ? loc.name.split(',')[0] : 'Weather'}</span>
        <span style={{ color: 'var(--amber-ink)' }}>
          <Icon name={d?.icon ?? 'cloud'} size="2rem" stroke={1.8} />
        </span>
      </div>
      {data ? (
        <div>
          <div style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>{data.temp}°</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text2)', marginTop: '0.25rem' }}>{d?.label}</div>
        </div>
      ) : (
        <div className="sub">{error ? 'Offline' : 'Loading…'}</div>
      )}
      {data && widget.w > 1 && (
        <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          H {data.max}° · L {data.min}° · Rain {data.rainChance}%
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- next alarm
function NextAlarm({ widget }: P) {
  const alarms = useStore((s) => s.alarms);
  const now = useNow();
  let best: { a: (typeof alarms)[number]; m: number } | null = null;
  for (const a of alarms) {
    if (!a.on) continue;
    const m = minutesUntil(a.time, a.days, now);
    if (m !== null && (!best || m < best.m)) best = { a, m };
  }
  return (
    <button
      type="button"
      onClick={() => go('alarms')}
      className="w-fill"
      style={{ justifyContent: 'space-between', border: 0, background: 'transparent', color: 'inherit', padding: 0, textAlign: 'left' }}
    >
      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <span className="eyebrow">Next alarm</span>
        {best && widget.w > 1 && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, background: 'rgba(20,24,31,0.12)', padding: '0.3rem 0.6rem', borderRadius: 999 }}>
            {humanMinutes(best.m)}
          </span>
        )}
      </div>
      {best ? (
        <div>
          <div style={{ fontSize: widget.w > 1 ? '2.5rem' : '1.75rem', fontWeight: 800, lineHeight: 1 }}>{fmt12(best.a.time)}</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.3rem' }}>{best.a.label}</div>
        </div>
      ) : (
        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>No alarms on</div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------- today's menu

export function mealStates(times: Record<Meal, string>, now: Date) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const past = (m: Meal) => toMinutes(times[m]) + 45 < nowMin;
  const next = MEALS.find((m) => !past(m)) ?? null;
  return { past, next };
}

function TodayMenu({ widget }: P) {
  const plan = useStore((s) => s.plan);
  useStore((s) => s.dishLists); // re-render when a dish is renamed
  const times = useStore((s) => s.settings.mealTimes);
  const now = useNow();
  const todayPlan = plan[dateKey(now)] ?? {};
  const dishText = (m: Meal) => (todayPlan[m] ?? []).map((id) => findDishName(id)).filter(Boolean).join(', ');
  const { past, next } = mealStates(times, now);
  const shown = widget.h >= 2 ? MEALS : [next ?? 'breakfast'];
  return (
    <>
      <div className="w-head">
        <span className="w-title">Today's menu</span>
        <button type="button" className="link-btn" onClick={() => go('menu')}>
          Week
        </button>
      </div>
      <div className="w-fill" style={{ gap: '0.5rem' }}>
        {shown.map((m) => (
          <div key={m} className={`meal${m === next ? ' next' : past(m) ? ' past' : ''}`}>
            <span className="eyebrow">
              {MEAL_NAME[m]} · {fmt12(times[m])}
              {m === next && widget.h >= 2 ? ' · up next' : ''}
            </span>
            <span className="dish">{dishText(m) || 'Not planned'}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- kid's day
export function useRoutineState() {
  const routine = useStore((s) => s.routine);
  const doneMap = useStore((s) => s.routineDone);
  const goal = useStore((s) => s.settings.starGoal);
  const now = useNow();
  const done = doneMap[dateKey(now)] ?? [];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let currentIdx = -1;
  routine.forEach((r, i) => {
    if (toMinutes(r.time) <= nowMin) currentIdx = i;
  });
  const stars = Math.min(goal, done.filter((id) => routine.some((r) => r.id === id)).length);
  return { routine, done, currentIdx, stars, goal, nowMin };
}

function KidsDay({ widget }: P) {
  const { routine, done, currentIdx, stars, goal } = useRoutineState();
  const kidName = useStore((s) => s.settings.kidName);
  const rows = Math.max(1, widget.h * 3 - 1);
  const start = Math.max(0, Math.min(currentIdx - 1, routine.length - rows));
  const shown = widget.h >= 2 ? routine.slice(start, start + rows) : routine.slice(Math.max(0, currentIdx), Math.max(0, currentIdx) + 1);
  return (
    <>
      <div className="w-head">
        <span className="w-title">{kidName}'s day</span>
        <button type="button" className="link-btn row" style={{ gap: '0.3rem' }} onClick={() => go('kids')}>
          <Icon name="star" size="1rem" fill="var(--amber)" />
          {stars} of {goal}
        </button>
      </div>
      <div className="w-fill">
        {shown.length === 0 && <span className="sub">No routine yet</span>}
        {shown.map((r) => {
          const i = routine.indexOf(r);
          const isDone = done.includes(r.id);
          const isNow = i === currentIdx && !isDone;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={isDone}
              onClick={() => toggleRoutine(r.id)}
              className={`tl-row${isDone ? ' done' : ''}${isNow ? ' now' : ''}`}
              style={{ border: 0, background: isNow ? undefined : 'transparent', color: 'inherit', textAlign: 'left', width: isNow ? 'calc(100% + 1.5rem)' : '100%' }}
            >
              <span className="tl-time">{split12(r.time).time}</span>
              <span className="tl-dot" />
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="tl-label">{r.label}</span>
                {isNow && <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Now · tap when done</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- photo frame
function Photo({ widget, onEdit }: P) {
  const ids = widget.config?.photoIds ?? [];
  const interval = widget.config?.interval ?? 30;
  const [i, setI] = useState(0);
  useEffect(() => {
    if (ids.length < 2) return;
    const id = setInterval(() => setI((x) => x + 1), interval * 1000);
    return () => clearInterval(id);
  }, [ids.length, interval]);
  const current = ids.length ? ids[i % ids.length] : undefined;
  const url = usePhotoUrl(current);
  if (!ids.length)
    return (
      <button type="button" className="photo-empty" onClick={onEdit}>
        <Icon name="photo" size="3rem" stroke={1.6} />
        <span style={{ fontWeight: 700, fontSize: '1rem' }}>Add a photo</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Tap to choose from this tablet</span>
      </button>
    );
  return (
    <>
      {url && <img key={url} src={url} alt="" className="photo-img" style={{ animation: 'fadein 1.2s ease' }} />}
      <div className="edit-gear">
        <button type="button" className="icon-btn small" aria-label="Change photos" onClick={onEdit} style={{ background: 'rgba(14,17,22,0.45)', color: '#fff' }}>
          <Icon name="edit" size="1.2rem" />
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- chores
function Chores({ onEdit }: P) {
  const chores = useStore((s) => s.chores);
  const today = dateKey(useNow());
  const doneCount = chores.filter((c) => c.doneOn === today).length;
  return (
    <>
      <div className="w-head">
        <span className="w-title">Chores</span>
        <span className="row" style={{ gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--teal-ink)' }}>
            {doneCount} of {chores.length} done
          </span>
          <EditBtn onEdit={onEdit} label="Edit chores" />
        </span>
      </div>
      <div className="w-fill" style={{ flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start', gap: '0.6rem', overflow: 'hidden' }}>
        {chores.map((c) => {
          const d = c.doneOn === today;
          return (
            <button key={c.id} type="button" aria-pressed={d} className={`chore-btn${d ? ' done' : ''}`} onClick={() => toggleChore(c.id)}>
              <span className={`check${d ? ' on' : ''}`}>{d && <Icon name="check" size="1rem" stroke={3} />}</span>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="lbl">{c.label}</span>
                <span className="who">{c.who}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- note
function Note({ widget, onEdit }: P) {
  const text = widget.config?.text || 'Tap the pencil to write a note.';
  const author = widget.config?.author;
  return (
    <>
      <div className="w-head" style={{ marginBottom: '0.25rem' }}>
        <span className="eyebrow">{author ? `Note from ${author}` : 'Note'}</span>
        <EditBtn onEdit={onEdit} label="Edit note" light />
      </div>
      <p style={{ fontSize: widget.w * widget.h > 2 ? '1.5rem' : '1.2rem', fontWeight: 700, lineHeight: 1.35, overflow: 'hidden' }}>{text}</p>
    </>
  );
}

// ---------------------------------------------------------------- calendar
function Calendar({ widget, onEdit }: P) {
  const events = useStore((s) => s.events);
  const now = useNow(60000);
  const today = dateKey(now);
  const upcoming = events.filter((e) => e.date >= today).sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1));
  const shown = upcoming.slice(0, widget.h >= 2 ? widget.h * 2 - 1 : 1);
  const dayLabel = (d: string) => {
    const diff = daysBetween(today, d);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  return (
    <>
      <div className="w-head">
        <span className="w-title">Calendar</span>
        <EditBtn onEdit={onEdit} label="Edit events" />
      </div>
      <div className="w-fill" style={{ gap: '0.5rem' }}>
        {shown.length === 0 && <span className="sub">Nothing coming up</span>}
        {shown.map((e) => (
          <div key={e.id} className="row" style={{ padding: '0.6rem 0.75rem', borderRadius: '0.875rem', background: 'var(--inner)', alignItems: 'stretch' }}>
            <span style={{ width: 4, borderRadius: 4, background: e.date === today ? 'var(--teal)' : 'var(--amber)', flex: 'none' }} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{e.title}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>
                {dayLabel(e.date)} · {fmt12(e.time)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- countdown
function Countdown({ widget, onEdit }: P) {
  const today = dateKey(useNow(60000));
  const { label, date } = widget.config ?? {};
  const days = date ? daysBetween(today, date) : null;
  return (
    <div className="w-fill" style={{ justifyContent: 'space-between' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="eyebrow" style={{ color: 'var(--text2)' }}>Countdown</span>
        <EditBtn onEdit={onEdit} label="Edit countdown" />
      </div>
      {days === null || !label ? (
        <button type="button" className="btn btn-soft" onClick={onEdit}>
          Set a date
        </button>
      ) : (
        <div>
          <div className="row" style={{ alignItems: 'baseline', gap: '0.35rem' }}>
            <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: 'var(--teal-ink)' }}>{Math.max(0, days)}</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text2)' }}>{days === 1 ? 'day' : 'days'}</span>
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.25rem' }}>{days < 0 ? `${label} (done)` : days === 0 ? `${label} is today!` : label}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- shopping
function Shopping({ onEdit }: P) {
  const items = useStore((s) => s.shopping);
  const left = items.filter((i) => !i.done).length;
  return (
    <>
      <div className="w-head">
        <span className="w-title">Shopping list</span>
        <span className="row" style={{ gap: '0.25rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text2)' }}>{left} to buy</span>
          <EditBtn onEdit={onEdit} label="Edit shopping list" />
        </span>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem', overflow: 'hidden' }}>
        {items.map((i) => (
          <button key={i.id} type="button" aria-pressed={i.done} className={`chip${i.done ? ' done' : ''}`} onClick={() => toggleShop(i.id)}>
            {i.label}
          </button>
        ))}
      </div>
    </>
  );
}

const BODY: Record<WidgetType, (p: P) => ReactElement> = {
  clock: Clock,
  weather: WeatherW,
  alarm: NextAlarm,
  menu: TodayMenu,
  kids: KidsDay,
  photo: Photo,
  chores: Chores,
  note: Note,
  calendar: Calendar,
  countdown: Countdown,
  shopping: Shopping,
};

export function WidgetBody(p: P) {
  const C = BODY[p.widget.type];
  return <C {...p} />;
}
