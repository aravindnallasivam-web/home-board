import { go, setEditing, updateSettings, useStore } from '../store';
import type { Screen, ThemeMode } from '../types';
import { Icon } from './Icon';

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'menu', label: 'Menu', icon: 'menu' },
  { id: 'alarms', label: 'Alarms', icon: 'alarm' },
];

const THEME_NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' };
const THEME_ICON: Record<ThemeMode, string> = { auto: 'auto', light: 'sun', dark: 'moon' };
const THEME_LABEL: Record<ThemeMode, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

export function Rail() {
  const screen = useStore((s) => s.screen);
  const editing = useStore((s) => s.editing);
  const theme = useStore((s) => s.settings.theme);

  return (
    <nav className="rail" aria-label="Sections">
      <div className="rail-logo">
        <Icon name="home" size="1.6rem" stroke={2.2} />
      </div>
      {NAV.map((n) => (
        <button
          key={n.id}
          type="button"
          className="rail-btn"
          aria-current={screen === n.id ? 'page' : undefined}
          onClick={() => go(n.id)}
        >
          <Icon name={n.icon} />
          {n.label}
        </button>
      ))}

      <div className="rail-spacer" />
      {screen === 'home' && (
        <button
          type="button"
          className={`rail-btn${editing ? ' is-on' : ''}`}
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          <Icon name="grid" />
          {editing ? 'Done' : 'Edit'}
        </button>
      )}
      <button
        type="button"
        className="rail-btn"
        aria-label={`Theme: ${THEME_LABEL[theme]}. Tap to change.`}
        onClick={() => updateSettings({ theme: THEME_NEXT[theme] })}
      >
        <Icon name={THEME_ICON[theme]} />
        {THEME_LABEL[theme]}
      </button>
      <button
        type="button"
        className="rail-btn"
        aria-current={screen === 'settings' ? 'page' : undefined}
        onClick={() => go('settings')}
      >
        <Icon name="settings" />
        Settings
      </button>
    </nav>
  );
}
