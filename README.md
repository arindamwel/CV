# Pattern Explorers: The Sound & Shape Jungle

An educational mobile game for children aged 5–8 that trains **pattern recognition**, **working memory** and **selective focus**. Players help friendly animal explorers activate ancient jungle portals by working out repeating patterns of shapes, colors and sounds.

It is a dependency-free HTML5 web app. It runs in any modern mobile browser, can be installed to the home screen (PWA), and works offline after the first visit.

## Run it

```bash
npm start          # serves the folder on http://localhost:8080
# or: python3 -m http.server 8080
```

Open the URL on a phone, or use your browser's device emulation. (The page also works opened straight from disk, but offline install needs it served over http(s).)

## Test

```bash
npm test           # pattern generation + adaptive difficulty unit tests (Node 18+)
```

## How to play

1. **Observe**: the explorer reveals a pattern one item at a time (from Level 2 on, each shape also plays its own note).
2. **Recall & input**: tap the piece that comes next, or, in memory rounds, tap the pads back in the same order. A sun drifts slowly across the bottom as a relaxed timer, and running out of time only brings a friendly replay.
3. **Feedback & reward**: a correct answer adds a glowing portal piece, plays a major-chord chime and awards a sticker.
4. **Progression**: three portal pieces restore an area of the jungle, unlock a new animal companion and a piece of avatar gear, and open the next area on the map.

There is no "game over". A wrong answer gets a gentle "Almost! Let's listen one more time" and a replay; after a second miss a bouncing finger points the way.

## Grown-ups

Triple-tap the small 🌿 leaf in the bottom-right corner, then answer the multiplication question to open the **parent dashboard**. From there you can:

- set a session time limit (a calm "time for a rest" screen appears when it's reached),
- turn sound, voice and vibration on or off,
- control background distractors,
- change the child's age band,
- see play time, puzzles solved, first-try accuracy, average answer time, hints used, distractor taps and the current difficulty for each level,
- reset progress.

All data stays on the device (`localStorage`); nothing is sent anywhere.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | Screens and overlays |
| `css/style.css` | Kid-friendly UI: large targets, warm high-contrast palette, soft animations |
| `js/patterns.js` | Pure logic: token set, level specs, puzzle generation, adaptive difficulty |
| `js/content.js` | Zones, companions, gear, stickers, praise lines |
| `js/audio.js` | Web Audio sound effects and speech-synthesis voiceover |
| `js/game.js` | Game loop, rewards, map, avatar, parent gate and dashboard |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |
| `tests/` | Node unit tests |
| `DESIGN.md` | Game design document and how each part of it is implemented |
