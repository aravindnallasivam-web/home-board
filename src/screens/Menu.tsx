import { useState } from 'react';
import { MenuCellDialog, ShoppingDialog } from '../components/editors';
import { Icon } from '../components/Icon';
import { useNow } from '../hooks';
import { toggleShop, useStore } from '../store';
import { MEALS, type Meal } from '../types';
import { fmt12, MON_FIRST, mondayIndex } from '../util';

const MEAL_NAME: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

export function Menu() {
  const menu = useStore((s) => s.menu);
  const times = useStore((s) => s.settings.mealTimes);
  const shopping = useStore((s) => s.shopping);
  const now = useNow(60000);
  const today = mondayIndex(now);
  const [cell, setCell] = useState<{ day: number; meal: Meal } | null>(null);
  const [shopEdit, setShopEdit] = useState(false);

  const monday = new Date(now);
  monday.setDate(now.getDate() - today);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const range = `${monday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;

  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1>This week's menu</h1>
          <p className="sub">{range} · tap any meal to change it</p>
        </div>
      </div>

      <section
        aria-label="Weekly meal plan"
        className="card"
        style={{
          flex: 1,
          minHeight: 0,
          padding: '1.1rem',
          display: 'grid',
          gridTemplateColumns: '7rem repeat(7, minmax(0, 1fr))',
          gridTemplateRows: '3.25rem repeat(4, minmax(0, 1fr))',
          gap: '0.5rem',
        }}
      >
        <div />
        {MON_FIRST.map((d, i) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + i);
          const isToday = i === today;
          return (
            <div
              key={d}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.875rem',
                background: isToday ? 'var(--teal)' : 'transparent',
                color: isToday ? 'var(--on-teal)' : 'var(--text2)',
              }}
            >
              <span style={{ fontWeight: 800 }}>{d}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{isToday ? 'Today' : date.getDate()}</span>
            </div>
          );
        })}
        {MEALS.map((meal) => (
          <MealRow key={meal} meal={meal} time={times[meal]} menu={menu} today={today} onPick={(day) => setCell({ day, meal })} />
        ))}
      </section>

      <section aria-label="Shopping list" className="card" style={{ flex: 'none', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ flex: 'none' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 800 }}>Shopping list</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>Tap an item once it's bought</div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', flex: 1, gap: '0.5rem', maxHeight: '6rem', overflow: 'hidden' }}>
          {shopping.length === 0 && <span className="sub">Nothing to buy</span>}
          {shopping.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.done} className={`chip${s.done ? ' done' : ''}`} onClick={() => toggleShop(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        {shopping.some((s) => s.done) && (
          <button type="button" className="btn btn-ghost" onClick={() => useStore.setState({ shopping: shopping.filter((s) => !s.done) })}>
            Clear bought
          </button>
        )}
        <button type="button" className="btn btn-dashed" onClick={() => setShopEdit(true)}>
          <Icon name="edit" size="1.1rem" />
          Edit list
        </button>
      </section>

      {cell && <MenuCellDialog day={cell.day} meal={cell.meal} onClose={() => setCell(null)} />}
      {shopEdit && <ShoppingDialog onClose={() => setShopEdit(false)} />}
    </main>
  );
}

function MealRow({
  meal,
  time,
  menu,
  today,
  onPick,
}: {
  meal: Meal;
  time: string;
  menu: Record<Meal, string>[];
  today: number;
  onPick: (day: number) => void;
}) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: '0.4rem' }}>
        <span style={{ fontWeight: 800 }}>{MEAL_NAME[meal]}</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{fmt12(time)}</span>
      </div>
      {menu.map((day, i) => {
        const isToday = i === today;
        const isPast = i < today;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onPick(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.875rem',
              fontSize: '1rem',
              fontWeight: 600,
              lineHeight: 1.3,
              textAlign: 'left',
              border: isToday ? '2px solid var(--teal)' : '2px solid transparent',
              background: isToday ? 'var(--teal-soft)' : isPast ? 'var(--past)' : 'var(--inner)',
              color: isPast ? 'var(--muted)' : 'var(--text)',
              overflow: 'hidden',
            }}
          >
            {day[meal] || <span style={{ color: 'var(--muted)' }}>+ Add</span>}
          </button>
        );
      })}
    </>
  );
}
