// Beep auditivo generado con Web Audio API (sin archivos externos)
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
};

/**
 * Reproduce un beep de confirmacion (tono agudo corto).
 * Frecuencia ~880 Hz, duracion 150ms.
 */
export const playSuccessBeep = () => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  } catch {
    // Silenciar si el navegador bloquea audio
  }
};

/**
 * Reproduce un beep de error (tono grave doble).
 * Frecuencia ~300 Hz, dos pulsos cortos.
 */
export const playErrorBeep = () => {
  try {
    const ctx = getAudioContext();

    [0, 0.18].forEach((delay) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.12);

      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.12);
    });
  } catch {
    // Silenciar si el navegador bloquea audio
  }
};

/**
 * Aviso exclusivo para alertas operativas de portería.
 * La derivación usa tres pulsos firmes; el aviso administrativo, dos suaves.
 */
export const playOperationalAlert = (tipo = 'AVISAR_ADMINISTRACION') => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const esDerivacion = tipo === 'DERIVAR_OFICINA';
    const pulsos = esDerivacion
      ? [{ delay: 0, frecuencia: 660 }, { delay: 0.2, frecuencia: 660 }, { delay: 0.4, frecuencia: 880 }]
      : [{ delay: 0, frecuencia: 740 }, { delay: 0.22, frecuencia: 880 }];

    pulsos.forEach(({ delay, frecuencia }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = esDerivacion ? 'square' : 'sine';
      oscillator.frequency.setValueAtTime(frecuencia, ctx.currentTime + delay);
      gain.gain.setValueAtTime(esDerivacion ? 0.16 : 0.12, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.14);
      oscillator.start(ctx.currentTime + delay);
      oscillator.stop(ctx.currentTime + delay + 0.14);
    });
  } catch {
    // El navegador puede bloquear audio hasta la primera interacción del usuario.
  }
};
