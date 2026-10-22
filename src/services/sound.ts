// A soft two-tone chime made with Web Audio, so the app ships without sound files.
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Browsers only allow sound after a tap, so unlock audio on the first touch. */
export function unlockAudioOnFirstTouch() {
  const unlock = () => {
    audio();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gain: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function chime(volume: number) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.05;
  tone(c, 880, t, 0.6, volume);
  tone(c, 1318.5, t + 0.25, 0.9, volume * 0.8);
}

/** Start ringing; the chime gets a little louder over the first half minute. */
export function startRinging() {
  stopRinging();
  let v = 0.15;
  chime(v);
  timer = setInterval(() => {
    v = Math.min(0.5, v + 0.03);
    chime(v);
  }, 1800);
}

export function stopRinging() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function testChime() {
  chime(0.35);
}
