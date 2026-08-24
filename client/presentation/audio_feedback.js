let context = null;

export function soundRecipe(effect) {
  if (effect === 'lightning') {
    return [
      { type: 'sawtooth', startHz: 150, endHz: 48, duration: 0.16, gain: 0.035 },
      { type: 'square', startHz: 920, endHz: 180, duration: 0.075, gain: 0.012 }
    ];
  }
  if (effect === 'erase') {
    return [{ type: 'triangle', startHz: 180, endHz: 72, duration: 0.13, gain: 0.026 }];
  }
  if (effect === 'spawn_grazer') {
    return [{ type: 'triangle', startHz: 330, endHz: 470, duration: 0.1, gain: 0.018 }];
  }
  return [{ type: 'sine', startHz: 520, endHz: 780, duration: 0.11, gain: 0.018 }];
}

export function playToolSound(effect) {
  const AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AudioContextCtor) return false;

  try {
    context ??= new AudioContextCtor();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    for (const tone of soundRecipe(effect)) scheduleTone(context, tone, now);
    return true;
  } catch {
    return false;
  }
}

function scheduleTone(audioContext, tone, startAt) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const endAt = startAt + tone.duration;
  oscillator.type = tone.type;
  oscillator.frequency.setValueAtTime(Math.max(1, tone.startHz), startAt);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endHz), endAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain), startAt + Math.min(0.012, tone.duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.01);
}
