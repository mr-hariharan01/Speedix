let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isMuted = false;

/* =========================
   CONTEXT
========================= */
function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

/* =========================
   MASTER VOLUME
========================= */
function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.5; // global volume
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

/* =========================
   UNLOCK AUDIO (IMPORTANT)
========================= */
export function unlockAudio(): void {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch {}
}

/* =========================
   MUTE + VOLUME
========================= */
export function toggleMute(): void {
  isMuted = !isMuted;
}

export function setVolume(value: number): void {
  const ctx = getCtx();
  const gain = getMasterGain(ctx);
  gain.gain.value = value; // 0 to 1
}

/* =========================
   START SOUND
========================= */
export function playStartSound(): void {
  if (isMuted) return;

  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

/* =========================
   TICK SOUND (during test)
========================= */
export function playTickSound(): void {
  if (isMuted) return;

  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(getMasterGain(ctx));

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
}

/* =========================
   SUCCESS SOUND (C-E-G)
========================= */
export function playSuccessSound(): void {
  if (isMuted) return;

  try {
    const ctx = getCtx();

    const notes = [
      { freq: 523.25, time: 0 },     // C5
      { freq: 659.25, time: 0.15 },  // E5
      { freq: 783.99, time: 0.3 }    // G5
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = note.freq;

      gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + note.time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.time + 0.6);

      osc.connect(gain);
      gain.connect(getMasterGain(ctx));

      osc.start(ctx.currentTime + note.time);
      osc.stop(ctx.currentTime + note.time + 0.7);
    });

  } catch {}
}