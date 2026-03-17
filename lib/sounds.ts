// ═══════════════════════════════════════════════
// SISTEMA DE SONIDOS — Studio Iuris
// ═══════════════════════════════════════════════

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
  }
  return audioContext;
}

// ─── Toggle global ─────────────────────────────

export function setAudioEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem("studio-iuris-audio", enabled ? "on" : "off");
  }
}

export function getAudioEnabled(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("studio-iuris-audio");
    if (stored !== null) return stored === "on";
  }
  return true;
}

export function setAnimationsEnabled(enabled: boolean) {
  if (typeof window !== "undefined") {
    localStorage.setItem("studio-iuris-animations", enabled ? "on" : "off");
  }
}

export function getAnimationsEnabled(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("studio-iuris-animations");
    if (stored !== null) return stored === "on";
  }
  return true;
}

// ─── Sonidos con Web Audio API ─────────────────

/** Respuesta correcta — ding ascendente C5→E5→G5 */
export function playCorrect() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(523, ctx.currentTime); // C5
  osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); // E5
  osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); // G5

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

/** Respuesta incorrecta — golpe seco descendente */
export function playIncorrect() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "triangle";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

/** Flashcard flip — ruido blanco corto (simula página) */
export function playFlip() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;

  const gain = ctx.createGain();
  gain.gain.value = 0.15;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

/** XP ganado — tintineo de moneda */
export function playXpGained() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.setValueAtTime(1600, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

/** Racha activada — crescendo ascendente */
export function playStreakActivated() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = 600 + i * 200;

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + i * 0.12 + 0.15
    );

    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.15);
  }
}

/** Racha rota — descendente triste */
export function playStreakBroken() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

/** Streak bonus (5+ correctas) — fanfarria corta */
export function playStreakBonus() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.1 + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + i * 0.1 + 0.2
    );

    osc.start(ctx.currentTime + i * 0.1);
    osc.stop(ctx.currentTime + i * 0.1 + 0.2);
  });
}

/** Logro / confetti — acorde mayor triunfal */
export function playAchievement() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const freqs = [262, 330, 392, 524];
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  });

  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      const freqs2 = [294, 370, 440, 588];
      freqs2.forEach((freq) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.connect(gain);
        gain.connect(ctx2.destination);

        osc.type = "sine";
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.2, ctx2.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 1);

        osc.start(ctx2.currentTime);
        osc.stop(ctx2.currentTime + 1);
      });
    } catch {
      // ignore if context is closed
    }
  }, 400);
}

// ═══ NOTIFICACIONES ═══

/** Notificación nueva — hoja de papel deslizándose */
export function playNotification() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI) * 0.3;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3000;
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.value = 0.2;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();

  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      const osc = ctx2.createOscillator();
      const g = ctx2.createGain();
      osc.connect(g);
      g.connect(ctx2.destination);
      osc.type = "sine";
      osc.frequency.value = 800;
      g.gain.setValueAtTime(0.1, ctx2.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.05);
      osc.start(ctx2.currentTime);
      osc.stop(ctx2.currentTime + 0.05);
    } catch {
      // ignore
    }
  }, 150);
}

/** Sello de tinta — para citaciones */
export function playSeal() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

// ═══ GRADOS Y LIGA ═══

/** Subir de grado — fanfarria triunfal ascendente */
export function playLevelUp() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const notes = [262, 330, 392, 523, 659];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;

    const startTime = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.setValueAtTime(0.25, startTime + 0.01);
    gain.gain.setValueAtTime(0.25, startTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

    osc.start(startTime);
    osc.stop(startTime + 0.5);
  });

  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      const chord = [523, 659, 784];
      chord.forEach((freq) => {
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        osc.connect(gain);
        gain.connect(ctx2.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx2.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 1.2);
        osc.start(ctx2.currentTime);
        osc.stop(ctx2.currentTime + 1.2);
      });
    } catch {
      // ignore
    }
  }, 500);
}

/** Bajar de grado — descendente melancólico */
export function playLevelDown() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const notes = [392, 330, 262];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    osc.frequency.value = freq;

    const startTime = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);

    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/** Nueva insignia — sello metálico + shimmer */
export function playBadgeEarned() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = "square";
  osc1.frequency.value = 1000;
  gain1.gain.setValueAtTime(0.15, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.1);

  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      const osc2 = ctx2.createOscillator();
      const gain2 = ctx2.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx2.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2000, ctx2.currentTime);
      osc2.frequency.setValueAtTime(3000, ctx2.currentTime + 0.1);
      osc2.frequency.setValueAtTime(2500, ctx2.currentTime + 0.2);
      gain2.gain.setValueAtTime(0.1, ctx2.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.3);
      osc2.start(ctx2.currentTime);
      osc2.stop(ctx2.currentTime + 0.3);
    } catch {
      // ignore
    }
  }, 100);
}

// ═══ CAUSAS ═══

/** Victoria — fanfarria rápida + golpe de martillo */
export function playVictory() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.08;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  });

  setTimeout(() => {
    try {
      const ctx2 = getAudioContext();
      const osc = ctx2.createOscillator();
      const gain = ctx2.createGain();
      osc.connect(gain);
      gain.connect(ctx2.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(150, ctx2.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx2.currentTime + 0.2);
      gain.gain.setValueAtTime(0.4, ctx2.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + 0.3);
      osc.start(ctx2.currentTime);
      osc.stop(ctx2.currentTime + 0.3);
    } catch {
      // ignore
    }
  }, 400);
}

/** Derrota — golpe seco descendente */
export function playDefeat() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

/** Causa empieza — campana de tribunal */
export function playCausaStart() {
  if (!getAudioEnabled()) return;
  const ctx = getAudioContext();

  const freqs = [800, 1200, 1600];
  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2 / (i + 1), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.5);
  });
}
