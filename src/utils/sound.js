// Tactical audio synthesizer for battlefield alerts
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

export const playAlertSound = (type = 'HIGH') => {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq1 = type === 'HIGH' ? 950 : 750;
      const freq2 = type === 'HIGH' ? 1250 : 900;
      const duration = type === 'HIGH' ? 0.35 : 0.25;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq1, now);
      osc.frequency.setValueAtTime(freq2, now + 0.12);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
      return;
    }
  } catch (e) {
    console.warn('Web Audio synthesis failed, trying file playback:', e);
  }

  // Graceful fallback
  try {
    const audio = new Audio('/alert.mp3');
    audio.play().catch(() => {});
  } catch (e) {
    // Silent fail if browser restricts autoplay
  }
};
