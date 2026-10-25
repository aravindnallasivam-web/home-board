import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({
  title,
  sub,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={title} className={`dialog${wide ? ' wide' : ''}`}>
        <div className="dialog-head">
          <div>
            <h2>{title}</h2>
            {sub && <p className="sub" style={{ marginTop: '0.25rem' }}>{sub}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </section>
    </div>
  );
}

export interface FieldDef<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'time' | 'date' | 'select';
  options?: string[];
  flex?: number;
  placeholder?: string;
}

/** A dialog for editing a list of simple records (chores, events, reminders…). */
export function ListDialog<T extends { id: string }>({
  title,
  sub,
  items,
  fields,
  newItem,
  addLabel,
  onSave,
  onClose,
  sortBy,
}: {
  title: string;
  sub?: string;
  items: T[];
  fields: FieldDef<T>[];
  newItem: () => T;
  addLabel: string;
  onSave: (items: T[]) => void;
  onClose: () => void;
  sortBy?: (a: T, b: T) => number;
}) {
  const [draft, setDraft] = useState<T[]>(items);
  const change = (id: string, key: keyof T, value: string) =>
    setDraft((d) => d.map((x) => (x.id === id ? { ...x, [key]: value } : x)));

  const save = () => {
    const firstKey = fields[0].key;
    const kept = draft.filter((x) => String(x[firstKey] ?? '').trim() !== '');
    onSave(sortBy ? [...kept].sort(sortBy) : kept);
    onClose();
  };

  return (
    <Dialog
      title={title}
      sub={sub}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      {draft.length === 0 && <div className="empty">Nothing here yet.</div>}
      {draft.map((item) => (
        <div className="list-row" key={item.id}>
          {fields.map((f) => (
            <label className="field" key={f.key} style={{ flex: f.flex ?? 1 }}>
              <span>{f.label}</span>
              {f.type === 'select' ? (
                <select
                  className="input"
                  value={String(item[f.key] ?? '')}
                  onChange={(e) => change(item.id, f.key, e.target.value)}
                >
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  type={f.type ?? 'text'}
                  placeholder={f.placeholder}
                  value={String(item[f.key] ?? '')}
                  onChange={(e) => change(item.id, f.key, e.target.value)}
                />
              )}
            </label>
          ))}
          <button
            type="button"
            className="icon-btn"
            aria-label="Remove"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger-ink)', height: '3.25rem', width: '3.25rem' }}
            onClick={() => setDraft((d) => d.filter((x) => x.id !== item.id))}
          >
            <Icon name="trash" size="1.25rem" />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-dashed" onClick={() => setDraft((d) => [...d, newItem()])}>
        <Icon name="plus" size="1.25rem" />
        {addLabel}
      </button>
    </Dialog>
  );
}
