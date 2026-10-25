import { useRef, useState } from 'react';
import { deletePhoto, savePhoto, usePhotoUrl } from '../services/photos';
import { deleteAlarm, saveAlarm, updateWidgetConfig, useStore } from '../store';
import type { Alarm, CalEvent, Chore, Reminder, ShopItem, Widget } from '../types';
import { DAY_SHORT, dateKey, uid } from '../util';
import { Dialog, ListDialog } from './Dialog';
import { Icon } from './Icon';

type Close = { onClose: () => void };

export function ChoresDialog({ onClose }: Close) {
  const chores = useStore((s) => s.chores);
  const members = useStore((s) => s.settings.members);
  return (
    <ListDialog<Chore>
      title="Chores"
      sub="Ticks reset every morning."
      items={chores}
      fields={[
        { key: 'label', label: 'Chore', flex: 3, placeholder: 'e.g. Water the plants' },
        { key: 'who', label: 'Who', type: 'select', options: members, flex: 1 },
      ]}
      newItem={() => ({ id: uid(), label: '', who: members[0] ?? '' })}
      addLabel="Add chore"
      onSave={(chores) => useStore.setState({ chores })}
      onClose={onClose}
    />
  );
}

export function ShoppingDialog({ onClose }: Close) {
  const items = useStore((s) => s.shopping);
  return (
    <ListDialog<ShopItem>
      title="Shopping list"
      items={items}
      fields={[{ key: 'label', label: 'Item', placeholder: 'e.g. Milk' }]}
      newItem={() => ({ id: uid(), label: '', done: false })}
      addLabel="Add item"
      onSave={(shopping) => useStore.setState({ shopping })}
      onClose={onClose}
    />
  );
}

export function EventsDialog({ onClose }: Close) {
  const events = useStore((s) => s.events);
  return (
    <ListDialog<CalEvent>
      title="Calendar"
      sub="Past events are cleared automatically."
      items={events}
      fields={[
        { key: 'title', label: 'Event', flex: 3, placeholder: 'e.g. Parent–teacher meeting' },
        { key: 'date', label: 'Date', type: 'date', flex: 2 },
        { key: 'time', label: 'Time', type: 'time', flex: 1.4 },
      ]}
      newItem={() => ({ id: uid(), title: '', date: dateKey(), time: '09:00' })}
      addLabel="Add event"
      sortBy={(a, b) => (a.date + a.time < b.date + b.time ? -1 : 1)}
      onSave={(events) => useStore.setState({ events })}
      onClose={onClose}
    />
  );
}

export function RemindersDialog({ onClose }: Close) {
  const reminders = useStore((s) => s.reminders);
  return (
    <ListDialog<Reminder>
      title="Household reminders"
      items={reminders}
      fields={[
        { key: 'label', label: 'Reminder', flex: 2, placeholder: 'e.g. Pay electricity bill' },
        { key: 'detail', label: 'When', flex: 2, placeholder: 'e.g. Due on the 5th' },
      ]}
      newItem={() => ({ id: uid(), label: '', detail: '' })}
      addLabel="Add reminder"
      onSave={(reminders) => useStore.setState({ reminders })}
      onClose={onClose}
    />
  );
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function AlarmDialog({ alarm, onClose }: Close & { alarm: Alarm | null }) {
  const members = useStore((s) => s.settings.members);
  const [a, setA] = useState<Alarm>(
    alarm ?? { id: uid(), time: '07:00', label: '', days: [1, 2, 3, 4, 5], who: members[0] ?? 'All', on: true, note: '' },
  );
  const toggleDay = (d: number) =>
    setA((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d] }));
  const save = () => {
    saveAlarm({ ...a, label: a.label.trim() || 'Alarm' });
    onClose();
  };
  return (
    <Dialog
      title={alarm ? 'Edit alarm' : 'New alarm'}
      onClose={onClose}
      footer={
        <>
          {alarm && (
            <button
              type="button"
              className="btn btn-danger"
              style={{ marginRight: 'auto' }}
              onClick={() => {
                deleteAlarm(alarm.id);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: 1 }}>
          <span>Time</span>
          <input className="input" type="time" value={a.time} onChange={(e) => setA({ ...a, time: e.target.value })} style={{ fontSize: '1.6rem', fontWeight: 800 }} />
        </label>
        <label className="field" style={{ flex: 2 }}>
          <span>Label</span>
          <input className="input" placeholder="e.g. Homework time" value={a.label} onChange={(e) => setA({ ...a, label: e.target.value })} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>For</span>
          <select className="input" value={a.who} onChange={(e) => setA({ ...a, who: e.target.value })}>
            {members.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="field">
        <span>Repeat on (none = ring once)</span>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {DAY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={a.days.includes(d)}
              className={`btn ${a.days.includes(d) ? 'btn-primary' : 'btn-soft'}`}
              style={{ minWidth: '4.5rem' }}
              onClick={() => toggleDay(d)}
            >
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Note shown when it rings</span>
        <input className="input" placeholder="e.g. Pencil box is on the study table" value={a.note} onChange={(e) => setA({ ...a, note: e.target.value })} />
      </label>
    </Dialog>
  );
}

export function NoteDialog({ widget, onClose }: Close & { widget: Widget }) {
  const members = useStore((s) => s.settings.members);
  const [text, setText] = useState(widget.config?.text ?? '');
  const [author, setAuthor] = useState(widget.config?.author ?? members[0] ?? '');
  return (
    <Dialog
      title="Family note"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              updateWidgetConfig(widget.id, { text: text.trim(), author });
              onClose();
            }}
          >
            Save
          </button>
        </>
      }
    >
      <label className="field">
        <span>Note</span>
        <textarea autoFocus className="input" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
      </label>
      <label className="field">
        <span>From</span>
        <select className="input" value={author} onChange={(e) => setAuthor(e.target.value)}>
          {members.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
    </Dialog>
  );
}

export function CountdownDialog({ widget, onClose }: Close & { widget: Widget }) {
  const [label, setLabel] = useState(widget.config?.label ?? '');
  const [date, setDate] = useState(widget.config?.date ?? dateKey());
  return (
    <Dialog
      title="Countdown"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              updateWidgetConfig(widget.id, { label: label.trim(), date });
              onClose();
            }}
          >
            Save
          </button>
        </>
      }
    >
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: 2 }}>
          <span>Counting down to</span>
          <input autoFocus className="input" value={label} placeholder="e.g. Grandparents visit" onChange={(e) => setLabel(e.target.value)} />
        </label>
        <label className="field">
          <span>Date</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
    </Dialog>
  );
}

function Thumb({ id, onRemove }: { id: string; onRemove: () => void }) {
  const url = usePhotoUrl(id);
  return (
    <div style={{ position: 'relative', aspectRatio: '4 / 3', borderRadius: '1rem', overflow: 'hidden', background: 'var(--inner)' }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      <button
        type="button"
        className="icon-btn"
        aria-label="Remove photo"
        onClick={onRemove}
        style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'rgba(14,17,22,0.7)', color: '#fff' }}
      >
        <Icon name="trash" size="1.2rem" />
      </button>
    </div>
  );
}

export function PhotoDialog({ widget, onClose }: Close & { widget: Widget }) {
  const ids = widget.config?.photoIds ?? [];
  const interval = widget.config?.interval ?? 30;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError('');
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) added.push(await savePhoto(f));
      updateWidgetConfig(widget.id, { photoIds: [...ids, ...added] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that photo.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    void deletePhoto(id);
    updateWidgetConfig(widget.id, { photoIds: ids.filter((x) => x !== id) });
  };

  return (
    <Dialog
      title="Photo frame"
      sub="Pick one photo, or several for a slideshow. Photos stay on this tablet."
      onClose={onClose}
      wide
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
        {ids.map((id) => (
          <Thumb key={id} id={id} onRemove={() => remove(id)} />
        ))}
        <button
          type="button"
          className="btn btn-dashed"
          style={{ aspectRatio: '4 / 3', height: 'auto', flexDirection: 'column' }}
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Icon name="plus" />
          {busy ? 'Adding…' : 'Add photos'}
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void add(e.target.files)} />
      {error && <p style={{ color: 'var(--danger-ink)' }}>{error}</p>}
      {ids.length > 1 && (
        <div className="row">
          <span className="sub" style={{ marginRight: '0.5rem' }}>
            Change photo every
          </span>
          <div className="seg">
            {[10, 30, 60, 300].map((s) => (
              <button key={s} type="button" aria-pressed={interval === s} onClick={() => updateWidgetConfig(widget.id, { interval: s })}>
                {s < 60 ? `${s} s` : `${s / 60} min`}
              </button>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}
