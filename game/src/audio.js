// All sound is synthesised with WebAudio — short tones, no audio files.
// The first user gesture creates the context; until then it stays silent.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, duration, type, volume, when) {
    if (muted) return;
    const audio = ensure();
    if (!audio) return;
    const start = audio.currentTime + (when ?? 0);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  return {
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    unlock() {
      ensure();
    },
    play() {
      tone(520, 0.12, 'triangle', 0.12);
      tone(780, 0.16, 'triangle', 0.1, 0.06);
    },
    attack() {
      tone(180, 0.14, 'sawtooth', 0.1);
      tone(90, 0.18, 'sawtooth', 0.12, 0.05);
    },
    death() {
      tone(320, 0.3, 'sine', 0.1);
      tone(160, 0.35, 'sine', 0.09, 0.1);
    },
    turn() {
      tone(660, 0.09, 'sine', 0.08);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, 0.22, 'triangle', 0.12, index * 0.11));
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => tone(frequency, 0.26, 'sine', 0.1, index * 0.13));
    },
  };
}
