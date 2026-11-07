# Game Design: Pattern Explorers, The Sound & Shape Jungle

Target audience: children aged 5–8. Goals: pattern recognition, sequence memory, sustained and selective attention.

This document records the design and points to where each part is implemented.

## 1. Core mechanics and gameplay loop

**Theme.** Players help friendly animal explorers activate ancient jungle portals by uncovering repeating patterns in light, sound and shapes.

| Phase | Design | Implementation |
| --- | --- | --- |
| Observe | The game reveals a pattern sequence (e.g. red circle → blue square → red circle → ?) | `observe()` in `js/game.js` reveals each token in turn, with a hop animation and a sound |
| Recall & input | The child completes or recreates the sequence under a relaxed, non-punitive timer | **Complete** rounds: choose the missing piece. **Repeat** rounds: tap the lit pads back in order. The sun timer (`tick()`) only triggers a helpful replay |
| Feedback & reward | A correct answer activates a portal piece with immediate praise | `success()`: chime, sparkles, vibration, a portal piece pops into the top bar, a sticker, voiced praise |
| Progression | 3 portal pieces restore an area and unlock a companion | `showZoneRestored()`: fanfare, companion and gear unlock, next area opens on the map |

Every token pairs a **unique shape with a unique color and a unique note** (C-major pentatonic), so patterns never rely on color alone and any sequence sounds pleasant.

## 2. Reward and feedback system

**Positive reinforcement**
- No game-over screen and no failure state anywhere.
- First mistake: the guide says *"Almost! Let's look/listen one more time"* and replays the pattern.
- Second mistake, or the sun timer running out: replay plus a bouncing 👆 finger on the right answer (on the next pad in memory rounds).
- The "mistake" sound is a soft rising "hmm?" (`Sfx.gentle`), never a buzzer.

**Micro-rewards**
- Haptic tick on every tap, and a celebratory pattern on success (`navigator.vibrate`, can be turned off).
- Sparkle bursts and glowing slots.
- Chimes built on major chords (`Sfx.chime`, `Sfx.piece`, `Sfx.fanfare`).
- A collectible sticker for each solved puzzle (24 to find, kept in the 📒 sticker book).
- Avatar gear (🌺 🍄 👑 🧢 🎀 🎩) and a playable animal companion for each restored area.
- Restored areas show their companion roaming on the map.

**Macro-rewards**
- A progress map of six areas, each with a three-piece portal meter: Whispering Forest → Mushroom Meadow → Glowing Caves → Echo Canyon → Crystal Falls → Starlight Lagoon.

## 3. Dynamic difficulty scaling

Each area belongs to a level. Inside each level, an adaptive engine (`createDifficulty()` in `js/patterns.js`) moves between three steps to keep the child in the flow zone:

- **Two smooth wins** (first try, no hint) → step up.
- **Two struggles** (3+ attempts, or a hint after a miss) → step down.
- A second-try success → stay on the same step.
- The current step for each level is saved between sessions.

| Level (age) | Step 1 | Step 2 | Step 3 | Extras |
| --- | --- | --- | --- | --- |
| **1** (5–6): simple AB / ABC visuals | AB, 3 shown, 2 choices | AB, 5 shown, 3 choices | ABC, 5 shown, 3 choices | Max 3 choices; visual only (uniform pop sound) |
| **2** (6–7): multi-sensory, AABB | AABB, 5 shown | AABB / ABC, 7 shown | AAB / ABB / ABC, plus 4-item memory rounds | Each shape plays its own note |
| **3** (7–8): distractors and memory | 5-item memory (3 pads), ABC / AABB | 5-item memory (4 pads), ABCD / AABC | 6-item memory (4 pads) | Falling leaves and drifting clouds behind the puzzle |

The age chosen at first launch (or in the dashboard) decides which areas start open: age 5 → area 1, 6 → areas 1–3, 7 → areas 1–5, 8 → all. Younger areas always stay playable.

**Distractors and impulse control.** In Level 3 (or always/never, set by a parent), leaves and clouds move behind the puzzle. They do nothing when tapped, but the taps are counted. A falling count over time is a simple signal of improving selective focus, and it is shown on the parent dashboard.

## 4. UI guidelines for kids

- **Touch targets**: 72 px+ for every child-facing button, and 80–170 px for answer choices and pads, with chunky drop shadows that press down. Answers respond on pointer-down, so there is no tap delay.
- **Minimal text**: icons (▶ 🗺️ 👂 📒), voiceover through speech synthesis for every prompt, and animated hints (bouncing finger, glowing gap). Speech-bubble text is a backup for parents and early readers.
- **Color palette**: warm, high-contrast creams, greens and oranges. Shapes have dark outlines and faces. Glows are slow, soft pulses with no rapid flashing, and `prefers-reduced-motion` is respected.
- **Layout**: works on phones in portrait and landscape and on tablets. Long sequences wrap onto two rows.
- **Child safety**: the parent area sits behind a small corner leaf that needs a **triple-tap**, followed by a **multiplication math-lock**. There are no links out, no ads, no purchases, and no data leaves the device.

## 5. Parent dashboard

- Session time limit (off / 10 / 15 / 20 / 30 min) with a calm bedtime-style rest screen that only a grown-up can dismiss.
- Sound, voice, vibration and distractor settings, plus the child's age band.
- Analytics: session and daily play time, puzzles solved, first-try accuracy, average answer time, hints used, areas restored, distractor taps, and per-level accuracy with the current difficulty step.
- Reset progress (with confirmation).

## 6. Possible next steps

- Pure audio rounds (high/low pitch patterns with no visuals) for Level 2+.
- Recorded voice lines and localization in place of system speech synthesis.
- Native wrappers (Capacitor) for app-store distribution.
- Longer-term analytics charts for parents.
