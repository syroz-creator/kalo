let context: AudioContext | undefined;
let enabled = true;

export function setSoundEnabled(value: boolean) { enabled = value; }

export function unlockSound() {
  if (!enabled) return;
  try {
    const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    if (context.state === 'suspended') void context.resume().catch(() => {});
  } catch { /* Audio is optional; logging must work when it is blocked. */ }
}

export function playSound(sound: 'delete' | 'repeat' | 'goal') {
  if (!enabled) return;
  unlockSound();
  const audio = context;
  if (!audio || audio.state !== 'running') return;
  try {
    const start = audio.currentTime;
    const notes = sound === 'goal' ? [[1046.5, 0, 0.8], [1568, 0.12, 0.65], [2093, 0.02, 0.4]] : sound === 'repeat' ? [[620, 0, 0.12], [830, 0.08, 0.15]] : [[480, 0, 0.15]];
    for (const [frequency, delay, duration] of notes) {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, start + delay);
      if (sound === 'delete') oscillator.frequency.exponentialRampToValueAtTime(160, start + duration);
      gain.gain.setValueAtTime(0.0001, start + delay); gain.gain.exponentialRampToValueAtTime(sound === 'goal' ? 0.055 : 0.045, start + delay + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(start + delay); oscillator.stop(start + delay + duration + 0.02);
    }
  } catch { /* Missing sound must not interrupt an action. */ }
}
