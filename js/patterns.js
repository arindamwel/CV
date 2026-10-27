/*
 * Pattern Explorers — pure game logic (no DOM).
 * Pattern generation and dynamic difficulty scaling. Loaded in the browser
 * as `window.Patterns` and in Node (tests) via require().
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Patterns = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Every token pairs a distinct shape with a distinct color, so no item
  // relies on color alone. Notes are a C-major pentatonic scale, so any
  // sequence of tokens sounds pleasant.
  const TOKENS = [
    { id: 'red-circle', label: 'red circle', shape: 'circle', color: '#E5484D', note: 261.63 },
    { id: 'blue-square', label: 'blue square', shape: 'square', color: '#3B7DD8', note: 329.63 },
    { id: 'yellow-star', label: 'yellow star', shape: 'star', color: '#F5B700', note: 392.0 },
    { id: 'green-triangle', label: 'green triangle', shape: 'triangle', color: '#30A46C', note: 440.0 },
    { id: 'purple-heart', label: 'purple heart', shape: 'heart', color: '#8E4EC6', note: 523.25 },
    { id: 'orange-diamond', label: 'orange diamond', shape: 'diamond', color: '#F76B15', note: 587.33 },
  ];
  const TOKEN_IDS = TOKENS.map((t) => t.id);

  // Level 1 (ages 5–6): AB / ABC visual patterns, 3 answer choices max.
  // Level 2 (ages 6–7): multi-sensory (tokens play notes), AABB / ABC.
  // Level 3 (ages 7–8): background distractors, 5–6 item sequence memory.
  // Each level has three difficulty steps the adaptive engine moves between.
  const LEVELS = {
    1: {
      multiSensory: false,
      distractors: false,
      inputSeconds: 30,
      tempo: 900,
      steps: [
        { kinds: ['complete'], templates: ['AB'], shown: 3, choices: 2 },
        { kinds: ['complete'], templates: ['AB'], shown: 5, choices: 3 },
        { kinds: ['complete'], templates: ['ABC'], shown: 5, choices: 3 },
      ],
    },
    2: {
      multiSensory: true,
      distractors: false,
      inputSeconds: 25,
      tempo: 750,
      steps: [
        { kinds: ['complete'], templates: ['AABB'], shown: 5, choices: 3 },
        { kinds: ['complete'], templates: ['AABB', 'ABC'], shown: 7, choices: 3 },
        { kinds: ['complete', 'repeat'], templates: ['AAB', 'ABB', 'ABC'], shown: 7, choices: 3, repeatLength: 4, pads: 3 },
      ],
    },
    3: {
      multiSensory: true,
      distractors: true,
      inputSeconds: 25,
      tempo: 650,
      steps: [
        { kinds: ['repeat', 'complete'], templates: ['ABC', 'AABB'], shown: 6, choices: 3, repeatLength: 5, pads: 3 },
        { kinds: ['repeat', 'complete'], templates: ['ABCD', 'AABC'], shown: 7, choices: 4, repeatLength: 5, pads: 4 },
        { kinds: ['repeat', 'complete'], templates: ['ABCD', 'AABC'], shown: 7, choices: 4, repeatLength: 6, pads: 4 },
      ],
    },
  };

  const WINS_TO_STEP_UP = 2;
  const STRUGGLES_TO_STEP_DOWN = 2;

  // Small seedable PRNG (mulberry32) so tests are deterministic.
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffle(rng, arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function maxStep(level) {
    return LEVELS[level].steps.length - 1;
  }

  // "Fill the gap": show `shown` items of a repeating template, ask for the next.
  function generateComplete(spec, rng) {
    const template = pick(rng, spec.templates);
    const letters = Array.from(new Set(template));
    const unit = shuffle(rng, TOKEN_IDS).slice(0, letters.length);
    const map = Object.fromEntries(letters.map((l, i) => [l, unit[i]]));
    const full = [];
    for (let i = 0; i <= spec.shown; i++) full.push(map[template[i % template.length]]);
    const answer = full[spec.shown];

    // Distractor choices come from the pattern itself first (the tempting
    // wrong answers), then from unused tokens.
    const others = shuffle(rng, unit.filter((t) => t !== answer))
      .concat(shuffle(rng, TOKEN_IDS.filter((t) => !unit.includes(t))));
    const choices = shuffle(rng, [answer].concat(others.slice(0, spec.choices - 1)));

    return { kind: 'complete', template, sequence: full.slice(0, spec.shown), answer, choices };
  }

  // "Watch and repeat": pads light up in order, the child taps them back.
  function generateRepeat(spec, rng) {
    const pads = shuffle(rng, TOKEN_IDS).slice(0, spec.pads);
    const sequence = [];
    while (sequence.length < spec.repeatLength) {
      const t = pick(rng, pads);
      const n = sequence.length;
      if (n >= 2 && sequence[n - 1] === t && sequence[n - 2] === t) continue;
      sequence.push(t);
    }
    return { kind: 'repeat', pads, sequence };
  }

  function generatePuzzle(level, step, rng) {
    rng = rng || Math.random;
    const cfg = LEVELS[level];
    if (!cfg) throw new Error('Unknown level ' + level);
    const spec = cfg.steps[Math.max(0, Math.min(step, maxStep(level)))];
    const kind = pick(rng, spec.kinds);
    const puzzle = kind === 'repeat' ? generateRepeat(spec, rng) : generateComplete(spec, rng);
    puzzle.level = level;
    puzzle.step = step;
    return puzzle;
  }

  // Keeps each level in the flow zone: two smooth wins step up, two
  // struggles step down. Everything else leaves the step alone.
  function createDifficulty(saved) {
    const state = {};
    for (const level of Object.keys(LEVELS)) {
      const s = (saved && saved[level]) || {};
      state[level] = {
        step: Math.max(0, Math.min(s.step | 0, maxStep(level))),
        wins: s.wins | 0,
        struggles: s.struggles | 0,
      };
    }

    return {
      step(level) {
        return state[level].step;
      },
      record(level, result) {
        const s = state[level];
        const smooth = result.attempts === 1 && !result.usedHint;
        const struggled = result.attempts >= 3 || (result.usedHint && result.attempts >= 2);
        if (smooth) {
          s.wins++;
          s.struggles = 0;
          if (s.wins >= WINS_TO_STEP_UP && s.step < maxStep(level)) {
            s.step++;
            s.wins = 0;
            return 'up';
          }
        } else if (struggled) {
          s.struggles++;
          s.wins = 0;
          if (s.struggles >= STRUGGLES_TO_STEP_DOWN && s.step > 0) {
            s.step--;
            s.struggles = 0;
            return 'down';
          }
        } else {
          s.wins = 0;
        }
        return 'same';
      },
      toJSON() {
        return JSON.parse(JSON.stringify(state));
      },
    };
  }

  return { TOKENS, TOKEN_IDS, LEVELS, makeRng, shuffle, generatePuzzle, createDifficulty, maxStep };
});
