import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Dialog } from '../components/Dialog';
import { ShoppingDialog } from '../components/editors';
import { Icon } from '../components/Icon';
import { useNow } from '../hooks';
import { addDish, copyWeek, findDishName, removeDish, renameDish, setPlan, useStore } from '../store';
import { MEAL_NAME, MEALS, type Meal } from '../types';
import { dateKey, daysBetween, fmt12 } from '../util';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function weekDates(weekOffset: number, now: Date): Date[] {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  return DOW.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** dish id -> the most recent date (up to today) it was planned */
function useLastCooked(): Record<string, string> {
  const plan = useStore((s) => s.plan);
  const today = dateKey(useNow(60000));
  return useMemo(() => {
    const last: Record<string, string> = {};
    for (const [day, entry] of Object.entries(plan)) {
      if (day > today) continue;
      for (const ids of Object.values(entry)) {
        for (const id of ids ?? []) if (!last[id] || last[id] < day) last[id] = day;
      }
    }
    return last;
  }, [plan, today]);
}

function lastLabel(last: string | undefined, today: string): string {
  if (!last) return 'Not cooked yet';
  const n = daysBetween(last, today);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return `${n} days ago`;
}

const segStyle = (on: boolean): CSSProperties => ({
  minHeight: '2.75rem',
  padding: '0 1rem',
  borderRadius: '0.75rem',
  border: 0,
  fontWeight: 700,
  background: on ? 'var(--amber)' : 'transparent',
  color: on ? 'var(--on-amber)' : 'var(--text2)',
});

export function Menu() {
  const [view, setView] = useState<'plan' | 'lists'>('plan');
  const [week, setWeek] = useState(0);
  const [picker, setPicker] = useState<{ dayKey: string; date: Date; meal: Meal } | null>(null);
  const [shopEdit, setShopEdit] = useState(false);
  const dishLists = useStore((s) => s.dishLists);
  const shopLeft = useStore((s) => s.shopping.filter((x) => !x.done).length);
  const now = useNow(60000);
  const dates = weekDates(week, now);
  const count = MEALS.reduce((a, m) => a + dishLists[m].length, 0);

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const caption =
    week === 0 ? 'This week' : week === 1 ? 'Next week' : week === -1 ? 'Last week' : week > 0 ? `In ${week} weeks` : `${-week} weeks ago`;

  return (
    <main className="main" style={{ gap: '1.1rem' }}>
      <div className="page-head">
        <div className="row" style={{ gap: '1.1rem' }}>
          <h1>Menu</h1>
          <div role="tablist" aria-label="Menu views" className="row" style={{ gap: '0.25rem', padding: '0.25rem', borderRadius: '1rem', background: 'var(--inner)' }}>
            <button type="button" role="tab" aria-selected={view === 'plan'} style={segStyle(view === 'plan')} onClick={() => setView('plan')}>
              Plan
            </button>
            <button type="button" role="tab" aria-selected={view === 'lists'} style={segStyle(view === 'lists')} onClick={() => setView('lists')}>
              Dish lists <span style={{ opacity: 0.75 }}>· {count}</span>
            </button>
          </div>
        </div>

        <div className="row">
          {view === 'plan' ? (
            <>
              <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => setWeek(week - 1)} style={{ width: '3.25rem', height: '3.25rem' }}>
                <Icon name="left" size="1.25rem" stroke={2.4} />
              </button>
              <div style={{ minWidth: '12rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {fmt(dates[0])} – {fmt(dates[6])}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{caption}</div>
              </div>
              <button type="button" className="icon-btn" aria-label="Next week" onClick={() => setWeek(week + 1)} style={{ width: '3.25rem', height: '3.25rem' }}>
                <Icon name="right" size="1.25rem" stroke={2.4} />
              </button>
              {week !== 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setWeek(0)}>
                  This week
                </button>
              )}
              <button
                type="button"
                className="btn btn-soft"
                onClick={() =>
                  copyWeek(
                    weekDates(week - 1, now).map((d) => dateKey(d)),
                    dates.map((d) => dateKey(d)),
                  )
                }
              >
                Copy last week
              </button>
            </>
          ) : (
            <span className="sub">Type a dish at the bottom of a list and tap + to add it.</span>
          )}
          <button type="button" className="btn btn-soft" onClick={() => setShopEdit(true)}>
            <Icon name="cart" size="1.2rem" />
            Shopping{shopLeft ? ` · ${shopLeft}` : ''}
          </button>
        </div>
      </div>

      {view === 'plan' ? (
        <PlanGrid dates={dates} onPick={(dayKey, date, meal) => setPicker({ dayKey, date, meal })} />
      ) : (
        <DishLists />
      )}

      {picker && <DishPicker {...picker} onClose={() => setPicker(null)} />}
      {shopEdit && <ShoppingDialog onClose={() => setShopEdit(false)} />}
    </main>
  );
}

// ------------------------------------------------------------------ plan grid
function PlanGrid({ dates, onPick }: { dates: Date[]; onPick: (key: string, date: Date, meal: Meal) => void }) {
  const plan = useStore((s) => s.plan);
  useStore((s) => s.dishLists); // re-render after renames
  const times = useStore((s) => s.settings.mealTimes);
  const today = dateKey(useNow(60000));
  let planned = 0;

  return (
    <>
      <section
        aria-label="Meal plan by date"
        className="card"
        style={{
          flex: 1,
          minHeight: 0,
          padding: '1rem',
          display: 'grid',
          gridTemplateColumns: '6.5rem repeat(7, minmax(0, 1fr))',
          gridTemplateRows: '3.75rem repeat(4, minmax(0, 1fr))',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 0.5rem 0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>
          Tap a meal to pick dishes
        </div>
        {dates.map((d, i) => {
          const k = dateKey(d);
          const isToday = k === today;
          return (
            <div
              key={k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.875rem',
                background: isToday ? 'var(--teal)' : 'transparent',
                color: isToday ? 'var(--on-teal)' : k < today ? 'var(--muted)' : 'var(--text)',
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{isToday ? 'Today' : DOW[i]}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1 }}>{d.getDate()}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{d.toLocaleDateString(undefined, { month: 'short' })}</span>
            </div>
          );
        })}
        {MEALS.map((m) => (
          <MealRow key={m}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '0.4rem' }}>
              <span style={{ fontWeight: 800 }}>{MEAL_NAME[m]}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{fmt12(times[m])}</span>
            </div>
            {dates.map((d, i) => {
              const k = dateKey(d);
              const names = (plan[k]?.[m] ?? []).map((id) => findDishName(id)).filter((n): n is string => !!n);
              if (names.length) planned++;
              const isToday = k === today;
              const isPast = k < today;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onPick(k, d, m)}
                  aria-label={`${DOW[i]} ${d.getDate()}, ${MEAL_NAME[m]}: ${names.length ? names.join(', ') : 'not planned'}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: names.length ? 'flex-start' : 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    padding: '0.5rem 0.6rem',
                    borderRadius: '0.875rem',
                    textAlign: 'left',
                    overflow: 'hidden',
                    minWidth: 0,
                    color: isPast ? 'var(--muted)' : 'var(--text)',
                    background: !names.length ? 'transparent' : isToday ? 'var(--teal-soft)' : isPast ? 'var(--past)' : 'var(--inner)',
                    border: !names.length ? '2px dashed var(--line)' : isToday ? '2px solid var(--teal)' : '2px solid transparent',
                  }}
                >
                  {names.slice(0, 2).map((n, j) => (
                    <span key={j} style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.25 }}>
                      {n}
                    </span>
                  ))}
                  {names.length > 2 && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)' }}>+{names.length - 2} more</span>}
                  {!names.length && (
                    <span className="row" style={{ gap: '0.35rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--muted)' }}>
                      <Icon name="plus" size="1rem" stroke={2.4} />
                      Add
                    </span>
                  )}
                </button>
              );
            })}
          </MealRow>
        ))}
      </section>
      <div className="row" style={{ flex: 'none', fontSize: '0.875rem', color: 'var(--text2)', gap: '0.5rem' }}>
        <span style={{ width: '0.875rem', height: '0.875rem', borderRadius: 4, background: 'var(--teal-soft)', border: '2px solid var(--teal)' }} />
        Today
        <span style={{ width: '0.875rem', height: '0.875rem', borderRadius: 4, border: '2px dashed var(--line)', marginLeft: '0.75rem' }} />
        Not planned yet
        <span style={{ marginLeft: 'auto' }}>{planned} of 28 meals planned this week</span>
      </div>
    </>
  );
}

/** Fragment wrapper so each meal row's cells flow into the grid */
function MealRow({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// ------------------------------------------------------------------ dish picker
function DishPicker({ dayKey, date, meal, onClose }: { dayKey: string; date: Date; meal: Meal; onClose: () => void }) {
  const list = useStore((s) => s.dishLists[meal]);
  const current = useStore((s) => s.plan[dayKey]?.[meal]);
  const [sel, setSel] = useState<string[]>(current ?? []);
  const [q, setQ] = useState('');
  const last = useLastCooked();
  const today = dateKey(useNow(60000));

  const typed = q.trim();
  const shown = list
    .filter((d) => !typed || d.name.toLowerCase().includes(typed.toLowerCase()))
    .sort((a, b) => (last[a.id] ?? '').localeCompare(last[b.id] ?? '') || a.name.localeCompare(b.name));
  const canAdd = !!typed && !list.some((d) => d.name.toLowerCase() === typed.toLowerCase());
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addNew = () => {
    const id = addDish(meal, typed);
    if (id) setSel((s) => (s.includes(id) ? s : [...s, id]));
    setQ('');
  };
  const save = (ids: string[]) => {
    setPlan(dayKey, meal, ids);
    onClose();
  };

  return (
    <Dialog
      wide
      title={`${date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · ${MEAL_NAME[meal]}`}
      sub={`From your ${MEAL_NAME[meal].toLowerCase()} list · ${list.length} dishes`}
      onClose={onClose}
      footer={
        <div className="row" style={{ width: '100%', gap: '0.75rem', paddingTop: '0.875rem', borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text2)', flex: 'none' }}>Selected</span>
          <div className="row" style={{ flex: 1, minWidth: 0, flexWrap: 'wrap', gap: '0.5rem' }}>
            {sel.length === 0 && <span style={{ color: 'var(--muted)' }}>Nothing yet. Tap dishes above.</span>}
            {sel.map((id) => (
              <button
                key={id}
                type="button"
                aria-label={`Remove ${findDishName(id)}`}
                onClick={() => toggle(id)}
                className="row"
                style={{ gap: '0.35rem', minHeight: '2.5rem', padding: '0 0.5rem 0 0.875rem', borderRadius: 999, border: 0, background: 'var(--teal-soft)', color: 'var(--text)', fontWeight: 700 }}
              >
                {findDishName(id)}
                <Icon name="close" size="1rem" stroke={2.4} />
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => save([])}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={() => save(sel)}>
            Save
          </button>
        </div>
      }
    >
      <label className="row" style={{ height: '3.5rem', padding: '0 1rem', borderRadius: '1rem', background: 'var(--inner)', border: '2px solid var(--line)', flex: 'none' }}>
        <span style={{ color: 'var(--muted)' }}>
          <Icon name="search" size="1.25rem" />
        </span>
        <input
          autoFocus
          aria-label="Search or add a dish"
          placeholder={`Search or type a new ${MEAL_NAME[meal].toLowerCase()} dish`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            // Enter picks the best match; it only creates a dish when nothing matches
            if (shown.length) {
              if (!sel.includes(shown[0].id)) toggle(shown[0].id);
              setQ('');
            } else if (canAdd) addNew();
          }}
          style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', fontSize: '1.05rem', outline: 'none' }}
        />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridAutoRows: '5.25rem', gap: '0.625rem', minHeight: '22rem', alignContent: 'start' }}>
        {canAdd && (
          <button
            type="button"
            onClick={addNew}
            className="row"
            style={{ gridColumn: 'span 2', gap: '0.875rem', padding: '0 1.1rem', borderRadius: '1.1rem', border: '2px dashed var(--amber)', background: 'var(--amber-soft)', color: 'var(--text)', textAlign: 'left' }}
          >
            <span style={{ width: '2.5rem', height: '2.5rem', flex: 'none', borderRadius: '0.75rem', background: 'var(--amber)', color: 'var(--on-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size="1.25rem" stroke={2.6} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Add “{typed}”</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>New dish in your {MEAL_NAME[meal].toLowerCase()} list</span>
            </span>
          </button>
        )}
        {shown.map((d) => {
          const on = sel.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(d.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '0.75rem 0.875rem',
                borderRadius: '1.1rem',
                textAlign: 'left',
                color: 'var(--text)',
                background: on ? 'var(--teal-soft)' : 'var(--inner)',
                border: on ? '2px solid var(--teal)' : '2px solid transparent',
              }}
            >
              <span className="row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, lineHeight: 1.2 }}>{d.name}</span>
                <span className={`check${on ? ' on' : ''}`} style={{ borderRadius: '50%', width: '1.6rem', height: '1.6rem' }}>
                  {on && <Icon name="check" size="1rem" stroke={3} />}
                </span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{lastLabel(last[d.id], today)}</span>
            </button>
          );
        })}
        {!shown.length && !canAdd && (
          <div className="empty" style={{ gridColumn: '1 / -1' }}>
            Your {MEAL_NAME[meal].toLowerCase()} list is empty. Type a dish above to add it.
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ------------------------------------------------------------------ dish lists
function DishLists() {
  return (
    <section aria-label="Dish lists" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.875rem' }}>
      {MEALS.map((m) => (
        <MealList key={m} meal={m} />
      ))}
    </section>
  );
}

function MealList({ meal }: { meal: Meal }) {
  const list = useStore((s) => s.dishLists[meal]);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const last = useLastCooked();
  const today = dateKey(useNow(60000));
  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const add = () => {
    if (addDish(meal, draft)) setDraft('');
  };
  const finishEdit = () => {
    if (editing) renameDish(meal, editing.id, editing.name);
    setEditing(null);
  };

  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', minHeight: 0, borderRadius: '1.5rem' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', padding: '0.1rem 0.25rem 0.25rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{MEAL_NAME[meal]}</h2>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--muted)' }}>{list.length} dishes</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {sorted.length === 0 && <div className="empty" style={{ padding: '1rem', fontSize: '0.9rem' }}>No dishes yet</div>}
        {sorted.map((d) =>
          editing?.id === d.id ? (
            <input
              key={d.id}
              autoFocus
              className="input"
              aria-label={`Rename ${d.name}`}
              value={editing.name}
              onChange={(e) => setEditing({ id: d.id, name: e.target.value })}
              onBlur={finishEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishEdit();
                if (e.key === 'Escape') setEditing(null);
              }}
              style={{ flex: 'none', minHeight: '3.25rem' }}
            />
          ) : (
            <div key={d.id} className="row" style={{ gap: '0.25rem', minHeight: '3.25rem', padding: '0.25rem 0.25rem 0.25rem 0.875rem', borderRadius: '0.875rem', background: 'var(--inner)', flex: 'none' }}>
              <button
                type="button"
                onClick={() => setEditing({ id: d.id, name: d.name })}
                aria-label={`Rename ${d.name}`}
                style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: 0, background: 'transparent', textAlign: 'left', padding: 0 }}
              >
                <span style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.25 }}>{d.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{lastLabel(last[d.id], today)}</span>
              </button>
              <button type="button" className="icon-btn small" aria-label={`Remove ${d.name} from ${MEAL_NAME[meal]}`} onClick={() => removeDish(meal, d.id)}>
                <Icon name="close" size="1rem" stroke={2.4} />
              </button>
            </div>
          ),
        )}
      </div>
      <div className="row" style={{ gap: '0.4rem', flex: 'none' }}>
        <input
          className="input"
          aria-label={`Add to ${MEAL_NAME[meal]} list`}
          placeholder={`Add a ${MEAL_NAME[meal].toLowerCase()} dish`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ minHeight: '3rem', fontSize: '0.95rem', padding: '0.5rem 0.75rem' }}
        />
        <button type="button" className="icon-btn" aria-label={`Add to ${MEAL_NAME[meal]} list`} onClick={add} style={{ width: '3rem', height: '3rem', background: 'var(--amber)', color: 'var(--on-amber)' }}>
          <Icon name="plus" size="1.25rem" stroke={2.6} />
        </button>
      </div>
    </div>
  );
}
