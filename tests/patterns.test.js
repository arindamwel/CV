const test = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS, TOKEN_IDS, makeRng, generatePuzzle, createDifficulty, maxStep } = require('../js/patterns.js');

const levels = Object.keys(LEVELS).map(Number);

test('complete puzzles continue their template and offer the answer', () => {
  const rng = makeRng(42);
  for (const level of levels) {
    for (let step = 0; step <= maxStep(level); step++) {
      for (let i = 0; i < 200; i++) {
        const p = generatePuzzle(level, step, rng);
        if (p.kind !== 'complete') continue;
        const spec = LEVELS[level].steps[step];
        assert.equal(p.sequence.length, spec.shown);
        assert.equal(p.choices.length, spec.choices);
        assert.equal(new Set(p.choices).size, p.choices.length, 'choices are distinct');
        assert.ok(p.choices.includes(p.answer));

        // Every visible item matches the template, and so does the answer.
        const letterOf = {};
        [...p.sequence, p.answer].forEach((tok, idx) => {
          const letter = p.template[idx % p.template.length];
          if (letterOf[letter] === undefined) letterOf[letter] = tok;
          assert.equal(letterOf[letter], tok);
        });
        // Different letters map to different tokens.
        assert.equal(new Set(Object.values(letterOf)).size, new Set(p.template).size);
        // A full unit of the pattern is always visible before the gap.
        assert.ok(p.sequence.length > p.template.length);
      }
    }
  }
});

test('level 1 never shows more than 3 choices', () => {
  const rng = makeRng(7);
  for (let step = 0; step <= maxStep(1); step++) {
    for (let i = 0; i < 100; i++) assert.ok(generatePuzzle(1, step, rng).choices.length <= 3);
  }
});

test('level 1 uses AB/ABC and level 2 adds AABB', () => {
  const t1 = new Set(LEVELS[1].steps.flatMap((s) => s.templates));
  const t2 = new Set(LEVELS[2].steps.flatMap((s) => s.templates));
  assert.deepEqual([...t1].sort(), ['AB', 'ABC']);
  assert.ok(t2.has('AABB') && t2.has('ABC'));
  assert.equal(LEVELS[1].multiSensory, false);
  assert.equal(LEVELS[2].multiSensory, true);
  assert.equal(LEVELS[3].distractors, true);
});

test('repeat puzzles use the pads and never repeat a pad three times running', () => {
  const rng = makeRng(99);
  let seen = 0;
  for (let i = 0; i < 500; i++) {
    const p = generatePuzzle(3, i % 3, rng);
    if (p.kind !== 'repeat') continue;
    seen++;
    const spec = LEVELS[3].steps[i % 3];
    assert.equal(p.sequence.length, spec.repeatLength);
    assert.ok(p.sequence.every((t) => p.pads.includes(t)));
    p.pads.forEach((t) => assert.ok(TOKEN_IDS.includes(t)));
    for (let k = 2; k < p.sequence.length; k++) {
      assert.ok(!(p.sequence[k] === p.sequence[k - 1] && p.sequence[k] === p.sequence[k - 2]));
    }
  }
  assert.ok(seen > 0);
});

test('level 3 memory sequences are 5–6 items long', () => {
  for (const s of LEVELS[3].steps) assert.ok(s.repeatLength >= 5 && s.repeatLength <= 6);
});

test('difficulty steps up after two smooth wins and down after two struggles', () => {
  const d = createDifficulty();
  assert.equal(d.step(1), 0);
  assert.equal(d.record(1, { attempts: 1, usedHint: false }), 'same');
  assert.equal(d.record(1, { attempts: 1, usedHint: false }), 'up');
  assert.equal(d.step(1), 1);

  assert.equal(d.record(1, { attempts: 3, usedHint: true }), 'same');
  assert.equal(d.record(1, { attempts: 3, usedHint: true }), 'down');
  assert.equal(d.step(1), 0);

  // Never drops below the first step.
  d.record(1, { attempts: 4, usedHint: true });
  d.record(1, { attempts: 4, usedHint: true });
  assert.equal(d.step(1), 0);
});

test('a second-try success resets the win streak without stepping down', () => {
  const d = createDifficulty();
  d.record(2, { attempts: 1, usedHint: false });
  d.record(2, { attempts: 2, usedHint: false });
  assert.equal(d.record(2, { attempts: 1, usedHint: false }), 'same');
  assert.equal(d.step(2), 0);
});

test('difficulty caps at the top step and survives a save round-trip', () => {
  const d = createDifficulty();
  for (let i = 0; i < 20; i++) d.record(3, { attempts: 1, usedHint: false });
  assert.equal(d.step(3), maxStep(3));
  const restored = createDifficulty(JSON.parse(JSON.stringify(d.toJSON())));
  assert.equal(restored.step(3), maxStep(3));
  assert.equal(restored.step(1), 0);
});

test('corrupt saved difficulty is clamped', () => {
  const d = createDifficulty({ 1: { step: 99 }, 2: { step: -5 } });
  assert.equal(d.step(1), maxStep(1));
  assert.equal(d.step(2), 0);
});
