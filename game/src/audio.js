// Small harbour sounds from one oscillator: a soft clink for loot, a low
// thunk for the key and door, a rising warning while the alarm climbs, and
// a flat buzz when the job is blown. Silent until the first key press, as
// browser autoplay rules require, and silent forever if audio is refused.

export function createAudio() {
  let ctx = null;
  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
    return ctx;
  }
  function tone(freq, dur, type = 'sine', gain = 0.05, slide = 0) {
    const ac = ensure();
    if (!ac) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slide) osc.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), ac.currentTime + dur);
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(g).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }
  return {
    unlock() { ensure(); },
    pickup() { tone(880, 0.12, 'triangle', 0.06, 320); },
    key() { tone(420, 0.16, 'square', 0.04, -120); },
    noise() { tone(1500, 0.07, 'sine', 0.05, -700); },
    caught() { tone(160, 0.5, 'sawtooth', 0.07, -90); },
    done() { tone(660, 0.14, 'triangle', 0.06, 220); setTimeout(() => tone(990, 0.2, 'triangle', 0.06), 110); },
  };
}
