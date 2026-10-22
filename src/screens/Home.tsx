import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { CountdownDialog, ChoresDialog, EventsDialog, NoteDialog, PhotoDialog, ShoppingDialog } from '../components/editors';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { EDITABLE, WIDGET_TYPES, WidgetBody, widgetTone } from '../components/widgets';
import { deletePhoto } from '../services/photos';
import { setEditing, setWidgets, updateWidget, useStore } from '../store';
import type { Widget, WidgetType } from '../types';
import { clamp, uid } from '../util';

const COLS = 6;
const ROWS = 4;

interface Drag {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  offX: number;
  offY: number;
  width: number;
  height: number;
  active: boolean;
}

interface Resize {
  id: string;
  startX: number;
  startY: number;
  w0: number;
  h0: number;
  colStep: number;
  rowStep: number;
}

function WidgetEditor({ widget, onClose }: { widget: Widget; onClose: () => void }) {
  switch (widget.type) {
    case 'chores':
      return <ChoresDialog onClose={onClose} />;
    case 'shopping':
      return <ShoppingDialog onClose={onClose} />;
    case 'calendar':
      return <EventsDialog onClose={onClose} />;
    case 'note':
      return <NoteDialog widget={widget} onClose={onClose} />;
    case 'countdown':
      return <CountdownDialog widget={widget} onClose={onClose} />;
    case 'photo':
      return <PhotoDialog widget={widget} onClose={onClose} />;
    default:
      return null;
  }
}

export function Home() {
  const widgets = useStore((s) => s.widgets);
  const editing = useStore((s) => s.editing);
  const [selected, setSelected] = useState<string | null>(null);
  const [gallery, setGallery] = useState(false);
  const [editorFor, setEditorFor] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const resize = useRef<Resize | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [rowH, setRowH] = useState(176);
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  // Rows always fill the screen height in view mode, whatever the tablet size.
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const inner = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      setRowH(Math.max(80, (inner - (ROWS - 1) * rem) / ROWS));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!editing) {
      setSelected(null);
      setGallery(false);
    }
  }, [editing]);

  const sel = widgets.find((w) => w.id === selected) ?? null;
  const editorWidget = widgets.find((w) => w.id === editorFor) ?? null;

  // ---------- layout operations ----------
  const move = (id: string, delta: number) => {
    const ws = [...widgets];
    const i = ws.findIndex((w) => w.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ws.length) return;
    [ws[i], ws[j]] = [ws[j], ws[i]];
    setWidgets(ws);
  };
  const moveTo = (id: string, targetId: string) => {
    if (id === targetId) return;
    const ws = [...widgets];
    const from = ws.findIndex((w) => w.id === id);
    const to = ws.findIndex((w) => w.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = ws.splice(from, 1);
    ws.splice(to, 0, item);
    setWidgets(ws);
  };
  const resizeBy = (id: string, dw: number, dh: number) => {
    const w = widgets.find((x) => x.id === id);
    if (w) updateWidget(id, { w: clamp(w.w + dw, 1, COLS), h: clamp(w.h + dh, 1, ROWS) });
  };
  const remove = (id: string) => {
    const w = widgets.find((x) => x.id === id);
    w?.config?.photoIds?.forEach((p) => void deletePhoto(p));
    setWidgets(widgets.filter((x) => x.id !== id));
    setSelected(null);
  };
  const add = (type: WidgetType) => {
    const meta = WIDGET_TYPES[type];
    const w: Widget = { id: uid(), type, w: meta.w, h: meta.h, config: type === 'photo' ? { photoIds: [], interval: 30 } : undefined };
    setWidgets([...widgets, w]);
    setGallery(false);
    setSelected(w.id);
    if (type === 'photo' || type === 'note' || type === 'countdown') setEditorFor(w.id);
    requestAnimationFrame(() => boardRef.current?.scrollTo({ top: boardRef.current.scrollHeight, behavior: 'smooth' }));
  };

  // ---------- long press anywhere on the board to start editing ----------
  const onBoardDown = (e: RPointerEvent) => {
    if (editing) return;
    const x = e.clientX;
    const y = e.clientY;
    press.current = {
      x,
      y,
      timer: setTimeout(() => {
        press.current = null;
        navigator.vibrate?.(30);
        setEditing(true);
      }, 800),
    };
  };
  const cancelPress = (e?: RPointerEvent) => {
    if (!press.current) return;
    if (e && e.type === 'pointermove' && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) < 12) return;
    clearTimeout(press.current.timer);
    press.current = null;
  };

  // ---------- drag to move ----------
  const onShieldDown = (e: RPointerEvent<HTMLButtonElement>, w: Widget) => {
    const card = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(w.id);
    setDrag({
      id: w.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      offX: e.clientX - card.left,
      offY: e.clientY - card.top,
      width: card.width,
      height: card.height,
      active: false,
    });
  };
  const onShieldMove = (e: RPointerEvent) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const active = drag.active || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 12;
    setDrag({ ...drag, x: e.clientX, y: e.clientY, active });
    if (active) {
      const hit = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => (el as HTMLElement).closest<HTMLElement>('[data-wid]'))
        .find((el) => el && el.dataset.wid !== drag.id);
      setOverId(hit?.dataset.wid ?? null);
    }
  };
  const onShieldUp = () => {
    if (drag?.active && overId) moveTo(drag.id, overId);
    setDrag(null);
    setOverId(null);
  };

  // ---------- drag the corner to resize ----------
  const onResizeDown = (e: RPointerEvent<HTMLButtonElement>, w: Widget) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const board = boardRef.current!.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const colStep = (board.width - (COLS - 1) * rem) / COLS + rem;
    resize.current = { id: w.id, startX: e.clientX, startY: e.clientY, w0: w.w, h0: w.h, colStep, rowStep: rowH + rem };
    setSelected(w.id);
  };
  const onResizeMove = (e: RPointerEvent) => {
    const r = resize.current;
    if (!r) return;
    const w = clamp(r.w0 + Math.round((e.clientX - r.startX) / r.colStep), 1, COLS);
    const h = clamp(r.h0 + Math.round((e.clientY - r.startY) / r.rowStep), 1, ROWS);
    const cur = widgets.find((x) => x.id === r.id);
    if (cur && (cur.w !== w || cur.h !== h)) updateWidget(r.id, { w, h });
  };
  const onResizeUp = () => {
    resize.current = null;
  };

  return (
    <main className="main" ref={mainRef}>
      {editing && (
        <div className="page-head">
          <div>
            <h1 style={{ fontSize: '1.5rem' }}>Edit layout</h1>
            <p className="sub">Drag a widget to move it, drag its corner to resize, or tap it for more options.</p>
          </div>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => setGallery(true)}>
              <Icon name="plus" size="1.25rem" />
              Add widget
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(false)}>
              Done
            </button>
          </div>
        </div>
      )}

      <div
        ref={boardRef}
        className={`board${editing ? ' editing' : ''}`}
        style={{ gridAutoRows: `${rowH}px` }}
        onPointerDown={onBoardDown}
        onPointerUp={() => cancelPress()}
        onPointerCancel={() => cancelPress()}
        onPointerMove={cancelPress}
      >
        {widgets.length === 0 && (
          <div className="empty" style={{ gridColumn: '1 / -1', gridRow: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>The board is empty</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(true);
                setGallery(true);
              }}
            >
              Add a widget
            </button>
          </div>
        )}
        {widgets.map((w) => {
          const meta = WIDGET_TYPES[w.type];
          const isSel = editing && selected === w.id;
          return (
            <div
              key={w.id}
              data-wid={w.id}
              className={`widget ${widgetTone(w.type)}${isSel ? ' selected' : ''}${drag?.active && drag.id === w.id ? ' dragging' : ''}${overId === w.id ? ' drop-target' : ''}`}
              style={{ gridColumn: `span ${w.w}`, gridRow: `span ${w.h}` }}
            >
              <WidgetBody widget={w} onEdit={() => setEditorFor(w.id)} />
              {editing && (
                <>
                  <button
                    type="button"
                    className="widget-shield"
                    aria-label={`${meta.name} widget, ${w.w} by ${w.h}. Drag to move.`}
                    onPointerDown={(e) => onShieldDown(e, w)}
                    onPointerMove={onShieldMove}
                    onPointerUp={onShieldUp}
                    onPointerCancel={onShieldUp}
                  />
                  <span className="widget-tag">
                    <Icon name="grip" size="0.9rem" />
                    {meta.name} · {w.w}×{w.h}
                  </span>
                  {isSel && (
                    <button
                      type="button"
                      className="resize-handle"
                      aria-label="Drag to resize"
                      onPointerDown={(e) => onResizeDown(e, w)}
                      onPointerMove={onResizeMove}
                      onPointerUp={onResizeUp}
                      onPointerCancel={onResizeUp}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {drag?.active && (
        <div
          className="drag-ghost"
          style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.width, height: drag.height }}
          aria-hidden="true"
        >
          {WIDGET_TYPES[widgets.find((w) => w.id === drag.id)?.type ?? 'clock'].name}
        </div>
      )}

      {editing && sel && !gallery && !drag?.active && (
        <div role="toolbar" aria-label="Selected widget" className="toolbar">
          <span style={{ padding: '0 0.6rem', fontWeight: 800 }}>
            {WIDGET_TYPES[sel.type].name} <span style={{ color: 'var(--amber-ink)' }}>{sel.w}×{sel.h}</span>
          </span>
          <span className="sep" />
          <button type="button" className="icon-btn" aria-label="Move earlier" onClick={() => move(sel.id, -1)}>
            <Icon name="left" size="1.25rem" stroke={2.4} />
          </button>
          <button type="button" className="icon-btn" aria-label="Move later" onClick={() => move(sel.id, 1)}>
            <Icon name="right" size="1.25rem" stroke={2.4} />
          </button>
          <span className="sep" />
          <span className="lbl">Width</span>
          <button type="button" className="icon-btn" aria-label="Narrower" onClick={() => resizeBy(sel.id, -1, 0)}>
            −
          </button>
          <button type="button" className="icon-btn" aria-label="Wider" onClick={() => resizeBy(sel.id, 1, 0)}>
            +
          </button>
          <span className="lbl">Height</span>
          <button type="button" className="icon-btn" aria-label="Shorter" onClick={() => resizeBy(sel.id, 0, -1)}>
            −
          </button>
          <button type="button" className="icon-btn" aria-label="Taller" onClick={() => resizeBy(sel.id, 0, 1)}>
            +
          </button>
          {EDITABLE.includes(sel.type) && (
            <>
              <span className="sep" />
              <button type="button" className="btn btn-soft" onClick={() => setEditorFor(sel.id)}>
                <Icon name="edit" size="1.1rem" />
                Content
              </button>
            </>
          )}
          <span className="sep" />
          <button type="button" className="btn btn-danger" onClick={() => remove(sel.id)}>
            Remove
          </button>
        </div>
      )}

      {gallery && (
        <Dialog
          title="Add a widget"
          sub="Widgets snap to the grid. Resize or move them after adding. Add as many photo frames as you like."
          onClose={() => setGallery(false)}
          wide
        >
          <div className="gallery">
            {(Object.keys(WIDGET_TYPES) as WidgetType[]).map((t) => {
              const m = WIDGET_TYPES[t];
              return (
                <button key={t} type="button" className="gallery-card" onClick={() => add(t)} aria-label={`Add ${m.name} widget`}>
                  <span className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                    <span className="gallery-icon">
                      <Icon name={m.icon} size="1.35rem" />
                    </span>
                    <span className="pill">
                      {m.w}×{m.h}
                    </span>
                  </span>
                  <span style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '0.25rem' }}>{m.name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.35 }}>{m.desc}</span>
                </button>
              );
            })}
          </div>
        </Dialog>
      )}

      {editorWidget && <WidgetEditor widget={editorWidget} onClose={() => setEditorFor(null)} />}
    </main>
  );
}
