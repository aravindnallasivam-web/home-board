import { useState } from 'react';
import { AlarmDialog, RemindersDialog } from '../components/editors';
import { Icon } from '../components/Icon';
import { useNow } from '../hooks';
import { ring, toggleAlarm, useStore } from '../store';
import type { Alarm } from '../types';
import { daysLabel, fmt12, humanMinutes, minutesUntil, split12 } from '../util';

export function Alarms() {
  const alarms = useStore((s) => s.alarms);
  const reminders = useStore((s) => s.reminders);
  const now = useNow();
  const [edit, setEdit] = useState<Alarm | 'new' | null>(null);
  const [remEdit, setRemEdit] = useState(false);

  let next: { a: Alarm; m: number } | null = null;
  for (const a of alarms) {
    if (!a.on) continue;
    const m = minutesUntil(a.time, a.days, now);
    if (m !== null && (!next || m < next.m)) next = { a, m };
  }
  const onCount = alarms.filter((a) => a.on).length;

  return (
    <main className="main">
      <div className="page-head">
        <div>
          <h1>Alarms and reminders</h1>
          <p className="sub">
            {onCount} of {alarms.length} alarms on
            {next ? ` · next: ${next.a.label} at ${fmt12(next.a.time)}, ${humanMinutes(next.m)}` : ''}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEdit('new')}>
          <Icon name="plus" size="1.25rem" stroke={2.4} />
          New alarm
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '1.25rem' }}>
        <section aria-label="Alarms" className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', overflowY: 'auto' }}>
          {alarms.length === 0 && <div className="empty">No alarms yet. Add one for wake-up, the school bus or bedtime.</div>}
          {alarms.map((a) => {
            const t = split12(a.time);
            return (
              <div key={a.id} className="row" style={{ gap: '1rem', minHeight: '5.5rem', padding: '0 0.75rem 0 1.25rem', borderRadius: '1.25rem', background: 'var(--inner)', flex: 'none' }}>
                <button
                  type="button"
                  onClick={() => setEdit(a)}
                  aria-label={`Edit ${a.label} alarm`}
                  style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', textAlign: 'left', padding: '0.75rem 0', color: 'inherit' }}
                >
                  <span className="row" style={{ alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1, color: a.on ? 'var(--text)' : 'var(--muted)' }}>{t.time}</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--muted)' }}>{t.ampm}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: '1rem', color: 'var(--text2)', marginTop: '0.2rem' }}>
                    {a.label} · {daysLabel(a.days)}
                  </span>
                </button>
                <span className="pill">{a.who}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={a.on}
                  aria-label={`${a.label} alarm`}
                  className="switch"
                  onClick={() => toggleAlarm(a.id)}
                />
              </div>
            );
          })}
          {alarms.length > 0 && (
            <button type="button" className="btn btn-dashed" style={{ flex: 'none' }} onClick={() => ring(alarms[0].id)}>
              <Icon name="bell" size="1.2rem" />
              Test the alarm sound
            </button>
          )}
        </section>

        <section aria-label="Household reminders" className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
          <div className="card-head" style={{ marginBottom: 0 }}>
            <h2>Household reminders</h2>
            <button type="button" className="icon-btn" aria-label="Edit reminders" onClick={() => setRemEdit(true)}>
              <Icon name="edit" size="1.2rem" />
            </button>
          </div>
          {reminders.length === 0 && <div className="empty">Bills, gas booking, library books…</div>}
          {reminders.map((r, i) => (
            <div
              key={r.id}
              className="row"
              style={{
                gap: '0.875rem',
                padding: '0.875rem 1rem',
                borderRadius: '1.1rem',
                background: i === 0 ? 'var(--amber-soft)' : 'var(--inner)',
                border: i === 0 ? '2px solid var(--amber)' : '2px solid transparent',
              }}
            >
              <span style={{ color: i === 0 ? 'var(--amber-ink)' : 'var(--teal-ink)' }}>
                <Icon name="bell" size="1.5rem" />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{r.label}</span>
                {r.detail && <span style={{ fontSize: '0.875rem', color: i === 0 ? 'var(--amber-soft-ink)' : 'var(--text2)' }}>{r.detail}</span>}
              </span>
            </div>
          ))}
        </section>
      </div>

      {edit && <AlarmDialog alarm={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {remEdit && <RemindersDialog onClose={() => setRemEdit(false)} />}
    </main>
  );
}
