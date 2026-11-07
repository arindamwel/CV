/*
 * Pattern Explorers — synthesized sound effects (Web Audio) and voiceover
 * (Speech Synthesis). No audio files needed. Every effect is soft and built
 * on major-key intervals; there is deliberately no "wrong answer" buzzer.
 */
(function (root) {
  'use strict';

  let ctx = null;
  let master = null;

  function ensure() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, opts) {
    if (!Sfx.enabled) return;
    const c = ensure();
    if (!c) return;
    const { start = 0, dur = 0.4, type = 'sine', vol = 0.3, glide = 0 } = opts || {};
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(freq * glide, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Bell-ish note: triangle fundamental plus a quiet octave shimmer.
  function bell(freq, start, vol) {
    tone(freq, { start, dur: 0.6, type: 'triangle', vol: vol || 0.28 });
    tone(freq * 2, { start, dur: 0.35, type: 'sine', vol: (vol || 0.28) * 0.25 });
  }

  const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5;

  const Sfx = {
    enabled: true,
    unlock: ensure,
    note(freq) {
      bell(freq, 0);
    },
    pop() {
      tone(520, { dur: 0.18, vol: 0.22, glide: 1.4 });
    },
    tap() {
      tone(880, { dur: 0.08, vol: 0.12 });
    },
    chime() {
      [C5, E5, G5, C6].forEach((f, i) => bell(f, i * 0.09, 0.22));
    },
    // A soft, curious "hmm?" — rising, never a buzzer.
    gentle() {
      tone(330, { dur: 0.25, vol: 0.14, glide: 1.25 });
      tone(392, { start: 0.18, dur: 0.3, vol: 0.12, glide: 1.12 });
    },
    piece() {
      [G5, C6].forEach((f, i) => bell(f, i * 0.12, 0.2));
    },
    fanfare() {
      const seq = [C5, E5, G5, C6, G5, C6];
      seq.forEach((f, i) => bell(f, i * 0.14, 0.24));
      [C5, E5, G5].forEach((f) => tone(f / 2, { start: 0.84, dur: 1.4, type: 'sine', vol: 0.12 }));
    },
    lullaby() {
      [G5, E5, C5].forEach((f, i) => bell(f / 2, i * 0.5, 0.16));
    },
  };

  const Voice = {
    enabled: true,
    say(text) {
      if (!this.enabled || !text || !('speechSynthesis' in root)) return;
      try {
        root.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.92;
        u.pitch = 1.2;
        root.speechSynthesis.speak(u);
      } catch (e) {
        /* voice is a nice-to-have */
      }
    },
    stop() {
      if ('speechSynthesis' in root) root.speechSynthesis.cancel();
    },
  };

  root.Sfx = Sfx;
  root.Voice = Voice;
})(typeof self !== 'undefined' ? self : this);
