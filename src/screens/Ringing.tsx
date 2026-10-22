import { Icon } from '../components/Icon';
import { dismissRing, snoozeRing, useStore } from '../store';
import { daysLabel, split12 } from '../util';

export function Ringing() {
  const ringing = useStore((s) => s.ringing);
  const alarm = useStore((s) => s.alarms.find((a) => a.id === s.ringing?.alarmId));
  if (!ringing) return null;
  const t = split12(alarm?.time ?? '00:00');

  return (
    <div className="ringing" role="alertdialog" aria-label={`Alarm: ${alarm?.label ?? 'Alarm'}`}>
      <div className="ring-bell">
        <div>
          <div>
            <Icon name="bell" size="3.75rem" />
          </div>
        </div>
      </div>
      <div>
        <div style={{ fontSize: '7.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
          {t.time} <span style={{ fontSize: '2.5rem', letterSpacing: 0, color: 'var(--muted)' }}>{t.ampm}</span>
        </div>
        <div style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '1rem' }}>{alarm?.label ?? 'Alarm'}</div>
        {alarm && (
          <div style={{ fontSize: '1.25rem', color: 'var(--text2)', marginTop: '0.5rem' }}>
            {[alarm.who, daysLabel(alarm.days), alarm.note].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
      <div className="row" style={{ gap: '1.5rem' }}>
        <button type="button" className="ring-btn" style={{ background: 'var(--hi)', color: 'var(--text)' }} onClick={() => snoozeRing(10)}>
          Snooze 10 min
        </button>
        <button type="button" className="ring-btn" style={{ background: 'var(--amber)', color: 'var(--on-amber)' }} onClick={dismissRing}>
          I'm on it
        </button>
      </div>
    </div>
  );
}
