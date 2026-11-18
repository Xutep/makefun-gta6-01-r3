// Marisol City — audio: WebAudio synth only. A chiptune loop (bass + lead)
// and small SFX. Everything is guarded: no AudioContext exists until the
// player presses a key, and every call is safe when audio is off or muted.

export function createAudio() {
  return {
    ctx: null,
    muted: false,
    musicStep: 0,
    musicTimer: null,
    engineOsc: null,
    engineGain: null,
    sirenAt: 0,
  };
}

export function ensureAudio(G) {
  const a = G.audio;
  if (a.ctx) {
    if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
    return;
  }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    a.ctx = new AC();
    startMusic(G);
  } catch (e) {
    a.ctx = null;
  }
}

const BASS = [55, 0, 55, 0, 65.4, 0, 49, 0, 55, 0, 55, 0, 73.4, 0, 65.4, 0];
const LEAD = [220, 0, 261.6, 329.6, 0, 261.6, 220, 0, 196, 0, 220, 261.6, 293.7, 0, 329.6, 0];

function tone(ctx, freq, dur, type, vol, when) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function startMusic(G) {
  const a = G.audio;
  if (!a.ctx || a.musicTimer) return;
  a.musicTimer = setInterval(() => {
    if (a.muted || !a.ctx || a.ctx.state !== 'running') return;
    const now = a.ctx.currentTime;
    const step = a.musicStep % 16;
    const bass = BASS[step];
    const lead = LEAD[step];
    if (bass) tone(a.ctx, bass, 0.22, 'triangle', 0.10, now);
    if (lead) tone(a.ctx, lead, 0.16, 'square', 0.035, now);
    a.musicStep += 1;
  }, 240);
}

export function setMuted(G, muted) {
  G.audio.muted = muted;
  if (muted) stopEngine(G);
}

export function sfx(G, name) {
  const a = G.audio;
  if (!a.ctx || a.muted || a.ctx.state !== 'running') return;
  try {
    const now = a.ctx.currentTime;
    if (name === 'shoot') {
      tone(a.ctx, 180, 0.12, 'sawtooth', 0.16, now);
      tone(a.ctx, 90, 0.1, 'square', 0.12, now);
    } else if (name === 'punch') {
      tone(a.ctx, 120, 0.08, 'sine', 0.2, now);
    } else if (name === 'pickup') {
      tone(a.ctx, 660, 0.09, 'sine', 0.12, now);
      tone(a.ctx, 880, 0.12, 'sine', 0.12, now + 0.08);
    } else if (name === 'crash') {
      tone(a.ctx, 70, 0.18, 'sine', 0.22, now);
    } else if (name === 'mission') {
      [523, 659, 784].forEach((f, i) => tone(a.ctx, f, 0.16, 'triangle', 0.12, now + i * 0.1));
    } else if (name === 'siren') {
      tone(a.ctx, 720, 0.35, 'sine', 0.05, now);
      tone(a.ctx, 540, 0.35, 'sine', 0.05, now + 0.35);
    }
  } catch (e) {
    // Audio is decoration; never let it break the game.
  }
}

export function updateAudio(G) {
  const a = G.audio;
  if (!a.ctx || a.muted) return;
  // Siren wail while the heat is on and police are near.
  if (G.wanted.level >= 1 && G.policeCars.length > 0 && G.now - a.sirenAt > 1.6) {
    a.sirenAt = G.now;
    sfx(G, 'siren');
  }
  // Engine hum follows the player's car speed.
  const car = G.player.car;
  try {
    if (car && Math.abs(car.speed) > 20) {
      if (!a.engineOsc) {
        a.engineOsc = a.ctx.createOscillator();
        a.engineGain = a.ctx.createGain();
        a.engineOsc.type = 'sawtooth';
        a.engineGain.gain.value = 0.03;
        a.engineOsc.connect(a.engineGain);
        a.engineGain.connect(a.ctx.destination);
        a.engineOsc.start();
      }
      a.engineOsc.frequency.value = 50 + Math.abs(car.speed) * 0.22;
      a.engineGain.gain.value = 0.02 + Math.abs(car.speed) * 0.00004;
    } else {
      stopEngine(G);
    }
  } catch (e) {
    stopEngine(G);
  }
}

export function stopEngine(G) {
  const a = G.audio;
  try {
    if (a.engineOsc) a.engineOsc.stop();
  } catch (e) {}
  a.engineOsc = null;
  a.engineGain = null;
}
