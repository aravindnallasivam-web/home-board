import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { exactAlarmsAllowed, isNative, openExactAlarmSetting, requestAlarmPermission } from '../services/native';
import { testChime } from '../services/sound';
import { searchPlaces } from '../services/weather';
import { exportData, importData, resetAll, updateSettings, useStore } from '../store';
import { MEALS, type Location, type Meal, type ThemeMode } from '../types';

const MEAL_NAME: Record<Meal, string> = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };

function Section({ title, children, sub }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', breakInside: 'avoid', marginBottom: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</h2>
        {sub && <p className="sub" style={{ marginTop: '0.2rem' }}>{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.v)} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const s = useStore((st) => st.settings);
  const [membersText, setMembersText] = useState(s.members.join(', '));
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Location[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');
  const [exact, setExact] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void exactAlarmsAllowed().then(setExact);
  }, []);

  const search = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      setResults(await searchPlaces(q.trim()));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const saveMembers = () => {
    const list = membersText
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    if (list.length) updateSettings({ members: list });
  };

  const doExport = async () => {
    const json = exportData();
    const name = `wall-tablet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Wall Tablet backup' });
        return;
      }
    } catch {
      /* fall through to download */
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = name;
    a.click();
    setMsg('Backup saved. Photos are not included.');
  };

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      importData(await f.text());
      setMsg('Backup restored.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not read that file.');
    }
  };

  return (
    <main className="main" style={{ overflowY: 'auto' }}>
      <div className="page-head">
        <h1>Settings</h1>
      </div>
      <div style={{ columns: 2, columnGap: '1.25rem' }}>
        <Section title="Appearance" sub="Auto uses the light theme by day and the dark theme at night.">
          <Seg<ThemeMode>
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { v: 'auto', label: 'Auto' },
              { v: 'light', label: 'Light' },
              { v: 'dark', label: 'Dark' },
            ]}
          />
          {s.theme === 'auto' && (
            <div className="row">
              <label className="field">
                <span>Light from</span>
                <input className="input" type="time" value={s.dayStart} onChange={(e) => updateSettings({ dayStart: e.target.value })} />
              </label>
              <label className="field">
                <span>Dark from</span>
                <input className="input" type="time" value={s.nightStart} onChange={(e) => updateSettings({ nightStart: e.target.value })} />
              </label>
            </div>
          )}
        </Section>

        <Section title="Weather location" sub={s.location ? `Showing weather for ${s.location.name}` : 'Search for your town or city.'}>
          <div className="row">
            <input
              className="input"
              placeholder="Town or city"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void search()}
            />
            <button type="button" className="btn btn-soft" onClick={() => void search()} disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {results && results.length === 0 && <p className="sub">No places found. Check the spelling or your internet connection.</p>}
          {results?.map((r) => (
            <button
              key={`${r.lat},${r.lon}`}
              type="button"
              className="btn btn-soft"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                updateSettings({ location: r });
                setResults(null);
                setQ('');
              }}
            >
              <Icon name="pin" size="1.2rem" />
              {r.name}
            </button>
          ))}
        </Section>

        <Section title="Family">
          <label className="field">
            <span>Family members (comma separated)</span>
            <input className="input" value={membersText} onChange={(e) => setMembersText(e.target.value)} onBlur={saveMembers} />
          </label>
          <label className="field">
            <span>Kid's name</span>
            <input className="input" value={s.kidName} onChange={(e) => updateSettings({ kidName: e.target.value })} />
          </label>
          <div className="field">
            <span>Stars for a reward</span>
            <Seg<number>
              value={s.starGoal}
              onChange={(starGoal) => updateSettings({ starGoal })}
              options={[3, 4, 5, 6, 8].map((n) => ({ v: n, label: String(n) }))}
            />
          </div>
          <label className="field">
            <span>Reward</span>
            <input className="input" value={s.reward} onChange={(e) => updateSettings({ reward: e.target.value })} />
          </label>
        </Section>

        <Section title="Meal times">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
            {MEALS.map((m) => (
              <label className="field" key={m}>
                <span>{MEAL_NAME[m]}</span>
                <input
                  className="input"
                  type="time"
                  value={s.mealTimes[m]}
                  onChange={(e) => updateSettings({ mealTimes: { ...s.mealTimes, [m]: e.target.value } })}
                />
              </label>
            ))}
          </div>
        </Section>

        <Section title="Tablet">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Keep the screen on</span>
            <button
              type="button"
              role="switch"
              aria-checked={s.keepAwake}
              aria-label="Keep the screen on"
              className="switch"
              onClick={() => updateSettings({ keepAwake: !s.keepAwake })}
            />
          </div>
          <div className="field">
            <span>Go back to the home board after</span>
            <Seg<number>
              value={s.homeTimeoutMin}
              onChange={(homeTimeoutMin) => updateSettings({ homeTimeoutMin })}
              options={[
                { v: 0, label: 'Never' },
                { v: 1, label: '1 min' },
                { v: 2, label: '2 min' },
                { v: 5, label: '5 min' },
              ]}
            />
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-soft" onClick={testChime}>
              <Icon name="bell" size="1.2rem" />
              Test sound
            </button>
            {isNative && (
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => void requestAlarmPermission().then((ok) => setMsg(ok ? 'Alarm notifications allowed.' : 'Notifications are blocked in Android settings.'))}
              >
                Allow alarm notifications
              </button>
            )}
            {isNative && !exact && (
              <button type="button" className="btn btn-primary" onClick={() => void openExactAlarmSetting()}>
                Allow exact alarms
              </button>
            )}
          </div>
          <p className="sub" style={{ fontSize: '0.9rem' }}>
            For a true wall display, set this app as the tablet's Home app (Android Settings › Apps › Default apps › Home app) or use Android screen pinning.
          </p>
        </Section>

        <Section title="Backup" sub="Menus, chores, alarms and the widget layout. Photos stay on the tablet.">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-soft" onClick={() => void doExport()}>
              <Icon name="download" size="1.2rem" />
              Save backup
            </button>
            <button type="button" className="btn btn-soft" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size="1.2rem" />
              Restore backup
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (confirm('Reset everything to the starting example? This cannot be undone.')) resetAll();
              }}
            >
              Reset all
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void doImport(e.target.files?.[0])} />
          {msg && <p className="sub">{msg}</p>}
        </Section>
      </div>
    </main>
  );
}
