import { useState } from 'react';
import { RoutineDialog } from '../components/editors';
import { Icon } from '../components/Icon';
import { useRoutineState } from '../components/widgets';
import { toggleRoutine, useStore } from '../store';
import { dateKey, fmt12, MON_FIRST, toMinutes } from '../util';

export function Kids() {
  const { routine, done, currentIdx, stars, goal, nowMin } = useRoutineState();
  const { kidName, reward } = useStore((s) => s.settings);
  const history = useStore((s) => s.routineDone);
  const [editing, setEditing] = useState(false);

  const current = currentIdx >= 0 ? routine[currentIdx] : null;
  const next = routine[currentIdx + 1] ?? null;
  let progress = 0;
  let minsLeft = 0;
  if (current && next) {
    const a = toMinutes(current.time);
    const b = toMinutes(next.time);
    progress = Math.min(1, Math.max(0, (nowMin - a) / Math.max(1, b - a)));
    minsLeft = Math.max(0, b - nowMin);
  }

  // this week's stars, Monday first
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = MON_FIRST.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dateKey(d);
    const count = Math.min(goal, (history[k] ?? []).filter((id) => routine.some((r) => r.id === id)).length);
    return { label, count, isToday: k === dateKey() };
  });

  return (
    <main className="main">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem', height: '15.5rem', flex: 'none' }}>
        <section
          aria-label="Happening now"
          style={{
            gridColumn: 'span 2',
            background: 'var(--teal)',
            color: 'var(--on-teal)',
            borderRadius: 'var(--r-lg)',
            padding: '1.75rem 2.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="eyebrow" style={{ fontSize: '0.875rem' }}>
              {current ? 'Happening now' : 'Good morning'}
            </span>
            {current && next && (
              <span style={{ fontWeight: 700 }}>
                {fmt12(current.time)} – {fmt12(next.time)}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontSize: '3.25rem', fontWeight: 800, lineHeight: 1.05 }}>{current?.label ?? routine[0]?.label ?? 'No routine yet'}</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, marginTop: '0.4rem' }}>
              {next ? `Next: ${next.label} at ${fmt12(next.time)}` : current ? 'Last one for today' : routine[0] ? `Starts at ${fmt12(routine[0].time)}` : ''}
            </div>
          </div>
          {current && next ? (
            <div>
              <div style={{ height: '0.875rem', borderRadius: 999, background: 'rgba(16,40,42,0.18)', overflow: 'hidden' }}>
                <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 999, background: 'var(--on-teal)' }} />
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '0.5rem' }}>{minsLeft} minutes left</div>
            </div>
          ) : (
            <div />
          )}
        </section>

        <section aria-label="Stars" className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span className="eyebrow" style={{ color: 'var(--text2)', fontSize: '0.875rem' }}>
            Stars today
          </span>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1, color: 'var(--amber-ink)' }}>{stars}</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--muted)' }}>of {goal}</span>
          </div>
          <div className="row" style={{ gap: '0.25rem' }}>
            {week.map((d) => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                <span style={{ color: d.count >= goal ? 'var(--amber)' : 'var(--faint)' }}>
                  <Icon name="star" size="1.5rem" fill={d.count >= goal ? 'var(--amber)' : 'none'} stroke={1.8} />
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: d.isToday ? 800 : 600, color: d.isToday ? 'var(--text)' : 'var(--muted)' }}>{d.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text2)' }}>
            {goal} stars = {reward}
          </div>
        </section>
      </div>

      <section aria-label="Today's routine" className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <h2>{kidName}'s routine</h2>
          <div className="row">
            <span className="sub">Tap when it's done to earn a star</span>
            <button type="button" className="btn btn-soft" onClick={() => setEditing(true)}>
              <Icon name="edit" size="1.1rem" />
              Edit
            </button>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gridAutoRows: 'minmax(0, 1fr)',
            gap: '0.875rem',
            overflowY: 'auto',
          }}
        >
          {routine.map((r, i) => {
            const isDone = done.includes(r.id);
            const isNow = i === currentIdx && !isDone;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={isDone}
                onClick={() => toggleRoutine(r.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  minHeight: '7rem',
                  padding: '1.1rem 1.25rem',
                  borderRadius: '1.4rem',
                  textAlign: 'left',
                  background: isDone ? 'var(--teal-soft)' : isNow ? 'var(--hi)' : 'var(--inner)',
                  border: `2px solid ${isDone ? 'var(--teal-line)' : isNow ? 'var(--amber)' : 'transparent'}`,
                  color: isDone ? 'var(--text2)' : 'var(--text)',
                }}
              >
                <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{fmt12(r.time)}</span>
                  {isDone && (
                    <span className="check on" style={{ borderRadius: '50%', width: '2.1rem', height: '2.1rem' }}>
                      <Icon name="check" size="1.25rem" stroke={3} />
                    </span>
                  )}
                  {isNow && (
                    <span className="eyebrow" style={{ background: 'var(--amber)', color: 'var(--on-amber)', padding: '0.35rem 0.6rem', borderRadius: 999 }}>
                      Now
                    </span>
                  )}
                </span>
                <span style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.2 }}>{r.label}</span>
              </button>
            );
          })}
          {routine.length === 0 && (
            <button type="button" className="btn btn-dashed" style={{ gridColumn: 'span 2', height: '7rem' }} onClick={() => setEditing(true)}>
              Add the first activity
            </button>
          )}
        </div>
      </section>
      {editing && <RoutineDialog onClose={() => setEditing(false)} />}
    </main>
  );
}
