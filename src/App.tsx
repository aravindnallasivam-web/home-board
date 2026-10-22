import { useEffect } from 'react';
import { Rail } from './components/Rail';
import { useApplyTheme } from './hooks';
import { useAlarmEngine } from './services/alarmEngine';
import { requestAlarmPermission, setupDisplay } from './services/native';
import { unlockAudioOnFirstTouch } from './services/sound';
import { Alarms } from './screens/Alarms';
import { Home } from './screens/Home';
import { Kids } from './screens/Kids';
import { Menu } from './screens/Menu';
import { Ringing } from './screens/Ringing';
import { Settings } from './screens/Settings';
import { go, useStore } from './store';
import { dateKey } from './util';

/** After a while without touches, go back to the home board. */
function useReturnHome() {
  const screen = useStore((s) => s.screen);
  const minutes = useStore((s) => s.settings.homeTimeoutMin);
  useEffect(() => {
    if (screen === 'home' || !minutes) return;
    let t = setTimeout(() => go('home'), minutes * 60000);
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => go('home'), minutes * 60000);
    };
    window.addEventListener('pointerdown', reset);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', reset);
    };
  }, [screen, minutes]);
}

export default function App() {
  const screen = useStore((s) => s.screen);
  const keepAwake = useStore((s) => s.settings.keepAwake);

  useApplyTheme();
  useAlarmEngine();
  useReturnHome();

  useEffect(() => {
    void setupDisplay(keepAwake);
  }, [keepAwake]);

  useEffect(() => {
    unlockAudioOnFirstTouch();
    void requestAlarmPermission();
    // tidy old calendar events once a day
    const tidy = () => {
      const today = dateKey();
      const s = useStore.getState();
      const events = s.events.filter((e) => e.date >= today);
      if (events.length !== s.events.length) useStore.setState({ events });
    };
    tidy();
    const id = setInterval(tidy, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app">
      <Rail />
      {screen === 'home' && <Home />}
      {screen === 'kids' && <Kids />}
      {screen === 'menu' && <Menu />}
      {screen === 'alarms' && <Alarms />}
      {screen === 'settings' && <Settings />}
      <Ringing />
    </div>
  );
}
