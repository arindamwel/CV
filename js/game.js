/* Pattern Explorers — screens, game loop, rewards and the parent area. */
(() => {
  'use strict';

  const { TOKENS, LEVELS, generatePuzzle, createDifficulty } = window.Patterns;
  const { ZONES, STARTER, AGE_UNLOCKS, STICKERS, PRAISE } = window.Content;
  const { Sfx, Voice } = window;

  const TOKEN = Object.fromEntries(TOKENS.map((t) => [t.id, t]));
  const ANIMALS = [STARTER].concat(ZONES.map((z) => z.companion));
  const GEAR = ZONES.map((z) => z.gear);

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pointer-down feels instant for small fingers; click keeps keyboards working.
  function onTap(el, fn) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.preventDefault();
      fn(e);
    });
    el.addEventListener('click', (e) => {
      if (e.detail === 0) fn(e);
    });
  }

  // ---------- Persistence ----------

  const SAVE_KEY = 'pattern-explorers/v1';

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function freshSave() {
    return {
      age: null,
      pieces: {},
      stickers: [],
      avatar: { animal: STARTER.id, gear: null },
      difficulty: null,
      settings: { sound: true, voice: true, haptics: true, distractors: 'auto', limitMin: 0 },
      stats: {
        puzzles: 0,
        firstTry: 0,
        hints: 0,
        responseMs: 0,
        distractorTaps: 0,
        byLevel: { 1: { puzzles: 0, firstTry: 0 }, 2: { puzzles: 0, firstTry: 0 }, 3: { puzzles: 0, firstTry: 0 } },
        daily: {},
      },
    };
  }

  function loadSave() {
    const base = freshSave();
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!data) return base;
      return {
        ...base,
        ...data,
        avatar: { ...base.avatar, ...data.avatar },
        settings: { ...base.settings, ...data.settings },
        stats: { ...base.stats, ...data.stats, byLevel: { ...base.stats.byLevel, ...(data.stats && data.stats.byLevel) } },
      };
    } catch (e) {
      return base;
    }
  }

  let save = loadSave();
  let difficulty = createDifficulty(save.difficulty);

  function persist() {
    save.difficulty = difficulty.toJSON();
    const days = Object.keys(save.stats.daily).sort();
    days.slice(0, Math.max(0, days.length - 14)).forEach((d) => delete save.stats.daily[d]);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    } catch (e) {
      /* private mode: progress lasts for this visit only */
    }
  }

  function applySettings() {
    Sfx.enabled = save.settings.sound;
    Voice.enabled = save.settings.voice;
  }

  function buzz(pattern) {
    if (save.settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
  }

  // ---------- Progress helpers ----------

  const zonePieces = (i) => save.pieces[ZONES[i].id] || 0;
  const zoneDone = (i) => zonePieces(i) >= 3;
  const zoneUnlocked = (i) => i < (AGE_UNLOCKS[save.age] || 1) || (i > 0 && zoneDone(i - 1));
  const animalUnlocked = (a) => a.id === STARTER.id || ZONES.some((z, i) => z.companion.id === a.id && zoneDone(i));
  const gearUnlocked = (g) => ZONES.some((z, i) => z.gear.id === g.id && zoneDone(i));

  // ---------- Rendering helpers ----------

  const SHAPES = {
    circle: { d: '<circle cx="50" cy="50" r="40"/>', face: 50 },
    square: { d: '<rect x="12" y="12" width="76" height="76" rx="14"/>', face: 50 },
    triangle: { d: '<path d="M50 10 L92 86 L8 86 Z"/>', face: 64 },
    star: { d: '<path d="M50 6 L62 36 L94 37 L68 57 L78 90 L50 71 L22 90 L32 57 L6 37 L38 36 Z"/>', face: 52 },
    heart: { d: '<path d="M50 88 C18 66 6 46 12 29 C18 12 42 10 50 28 C58 10 82 12 88 29 C94 46 82 66 50 88 Z"/>', face: 46 },
    diamond: { d: '<path d="M50 6 L92 50 L50 94 L8 50 Z"/>', face: 50 },
  };

  function tokenSVG(id) {
    const t = TOKEN[id];
    const s = SHAPES[t.shape];
    const y = s.face;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <g fill="${t.color}" stroke="rgba(0,0,0,.2)" stroke-width="4" stroke-linejoin="round">${s.d}</g>
      <circle cx="41" cy="${y - 4}" r="4.5" fill="#2B2D42"/><circle cx="59" cy="${y - 4}" r="4.5" fill="#2B2D42"/>
      <path d="M42 ${y + 6} Q50 ${y + 13} 58 ${y + 6}" fill="none" stroke="#2B2D42" stroke-width="3.5" stroke-linecap="round"/>
    </svg>`;
  }

  function avatarHTML() {
    const a = ANIMALS.find((x) => x.id === save.avatar.animal) || STARTER;
    const g = GEAR.find((x) => x.id === save.avatar.gear);
    return `<span class="a-gear">${g ? g.emoji : ''}</span><span class="a-animal">${a.emoji}</span>`;
  }

  function renderAvatars() {
    $$('[data-avatar]').forEach((el) => (el.innerHTML = avatarHTML()));
  }

  function say(text) {
    const bubble = $('#bubble');
    if (bubble) {
      bubble.textContent = text;
      bubble.classList.remove('pop');
      void bubble.offsetWidth;
      bubble.classList.add('pop');
    }
    Voice.say(text);
  }

  function wiggle(el) {
    el.classList.remove('wiggle');
    void el.offsetWidth;
    el.classList.add('wiggle');
  }

  function sparkle(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const fx = $('#fx');
    const n = reducedMotion ? 6 : 14;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.textContent = pick(['✦', '✧', '⭐', '✨']);
      const angle = (Math.PI * 2 * i) / n;
      const dist = 50 + Math.random() * 50;
      s.style.left = r.left + r.width / 2 + 'px';
      s.style.top = r.top + r.height / 2 + 'px';
      s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      fx.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  // ---------- Screens & overlays ----------

  let screen = 'title';

  function show(name) {
    screen = name;
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    if (name !== 'play') {
      stopDistractors();
      hideFinger();
    }
  }

  function openOverlay(id) {
    $('#' + id).classList.add('open');
  }

  function closeOverlay(id) {
    $('#' + id).classList.remove('open');
  }

  const overlayOpen = () => !!$('.overlay.open');

  $$('[data-close]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const ov = btn.closest('.overlay');
      ov.classList.remove('open');
      if (ov.id === 'ov-dash') onDashboardClosed();
    })
  );

  // ---------- Title & age ----------

  $('#btn-start').addEventListener('click', () => {
    Sfx.unlock();
    Sfx.chime();
    buzz(15);
    if (save.age == null) {
      show('age');
      Voice.say('Hi explorer! How old are you?');
    } else {
      goMap();
    }
  });

  $$('.age-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      save.age = Number(btn.dataset.age);
      persist();
      Sfx.tap();
      buzz(12);
      goMap();
    })
  );

  // ---------- Map ----------

  function goMap() {
    cancelRun();
    renderMap();
    show('map');
    Voice.say('Pick a jungle portal!');
  }

  function renderMap() {
    const map = $('#map');
    map.innerHTML = '';
    ZONES.forEach((z, i) => {
      const unlocked = zoneUnlocked(i);
      const pieces = zonePieces(i);
      const node = document.createElement('div');
      node.className = 'zone-node ' + (i % 2 ? 'right' : 'left');
      node.innerHTML = `
        <button class="zone-btn${unlocked ? '' : ' locked'}${pieces >= 3 ? ' done' : ''}" style="--zc:${z.color}"
          aria-label="${z.name}${unlocked ? '' : ' (locked)'}">
          <span class="zone-emoji">${unlocked ? z.emoji : '🔒'}</span>
        </button>
        <div class="zone-name">${z.name}</div>
        <div class="pieces">${[0, 1, 2].map((k) => `<span class="piece${k < pieces ? ' on' : ''}"></span>`).join('')}</div>
        ${pieces >= 3 ? `<span class="roamer" aria-hidden="true">${z.companion.emoji}</span>` : ''}`;
      const btn = node.querySelector('.zone-btn');
      btn.addEventListener('click', () => {
        if (!unlocked) {
          Sfx.gentle();
          buzz(10);
          wiggle(btn);
          Voice.say('Finish the portal before this one to open it!');
          return;
        }
        Sfx.tap();
        buzz(12);
        startZone(i);
      });
      map.appendChild(node);
    });
    $('#sticker-count').textContent = `⭐ ${save.stickers.length}`;
    renderAvatars();

    const next = ZONES.findIndex((z, i) => zoneUnlocked(i) && !zoneDone(i));
    if (next > 0) requestAnimationFrame(() => map.children[next].scrollIntoView({ block: 'center' }));
  }

  $('#btn-stickers').addEventListener('click', () => {
    Sfx.tap();
    $('#sticker-grid').innerHTML = STICKERS.map((s) =>
      save.stickers.includes(s) ? `<span class="sticker">${s}</span>` : '<span class="sticker empty">?</span>'
    ).join('');
    openOverlay('ov-stickers');
  });

  $('#btn-avatar').addEventListener('click', () => {
    Sfx.tap();
    renderAvatarPicker();
    openOverlay('ov-avatar');
  });

  function renderAvatarPicker() {
    renderAvatars();
    const animals = $('#pick-animals');
    animals.innerHTML = '';
    ANIMALS.forEach((a) => {
      const open = animalUnlocked(a);
      const b = document.createElement('button');
      b.className = 'pick' + (save.avatar.animal === a.id ? ' on' : '') + (open ? '' : ' locked');
      b.textContent = open ? a.emoji : '🔒';
      b.setAttribute('aria-label', open ? a.name : 'locked');
      b.addEventListener('click', () => {
        if (!open) return Sfx.gentle();
        save.avatar.animal = a.id;
        persist();
        Sfx.note(TOKENS[ANIMALS.indexOf(a) % TOKENS.length].note);
        buzz(12);
        renderAvatarPicker();
        Voice.say(`Hi, I'm ${a.name}!`);
      });
      animals.appendChild(b);
    });

    const gear = $('#pick-gear');
    gear.innerHTML = '';
    [{ id: null, emoji: '🚫' }].concat(GEAR).forEach((g) => {
      const open = g.id === null || gearUnlocked(g);
      const b = document.createElement('button');
      b.className = 'pick' + (save.avatar.gear === g.id ? ' on' : '') + (open ? '' : ' locked');
      b.textContent = open ? g.emoji : '🔒';
      b.setAttribute('aria-label', g.id === null ? 'no hat' : open ? g.id : 'locked');
      b.addEventListener('click', () => {
        if (!open) return Sfx.gentle();
        save.avatar.gear = g.id;
        persist();
        Sfx.pop();
        buzz(12);
        renderAvatarPicker();
      });
      gear.appendChild(b);
    });
  }

  // ---------- Puzzle loop ----------

  const game = {
    zoneIdx: 0,
    level: 1,
    puzzle: null,
    phase: 'idle', // observe → input ⇄ hint → reward
    run: 0, // bumped to cancel any in-flight animation sequence
    attempts: 0,
    mistakes: 0,
    usedHint: false,
    inputIdx: 0,
    inputStart: 0,
    timerElapsed: 0,
  };

  function cancelRun() {
    game.run++;
    game.phase = 'idle';
    hideFinger();
  }

  function startZone(i) {
    const z = ZONES[i];
    game.zoneIdx = i;
    game.level = z.level;
    const playScreen = $('#screen-play');
    playScreen.style.setProperty('--bg1', z.bg[0]);
    playScreen.style.setProperty('--bg2', z.bg[1]);
    show('play');
    renderAvatars();
    renderPortalProgress(false);
    startDistractors();
    nextPuzzle();
  }

  function playToken(id) {
    if (LEVELS[game.level].multiSensory) Sfx.note(TOKEN[id].note);
    else Sfx.pop();
  }

  async function nextPuzzle() {
    cancelRun();
    const run = game.run;
    game.puzzle = generatePuzzle(game.level, difficulty.step(game.level));
    game.attempts = 0;
    game.mistakes = 0;
    game.usedHint = false;
    game.inputIdx = 0;
    game.timerElapsed = 0;
    setSun(0);
    if (game.puzzle.kind === 'complete') renderComplete();
    else renderRepeat();
    await observe(run);
    if (run !== game.run) return;
    game.phase = 'input';
    game.inputStart = performance.now();
    say(game.puzzle.kind === 'complete' ? 'What comes next?' : 'Your turn!');
  }

  // Observe phase: reveal the pattern one item at a time.
  async function observe(run) {
    game.phase = 'observe';
    const cfg = LEVELS[game.level];
    const p = game.puzzle;
    if (p.kind === 'complete') {
      say(cfg.multiSensory ? 'Look and listen!' : 'Look at the pattern!');
      await wait(1200);
      const items = $$('#stage .tok:not(.blank)');
      for (let i = 0; i < items.length; i++) {
        if (run !== game.run) return;
        items[i].classList.add('show', 'pulse');
        playToken(p.sequence[i]);
        await wait(cfg.tempo);
        items[i].classList.remove('pulse');
      }
      if (run !== game.run) return;
      $('#stage .blank').classList.add('glow');
      $('#answers').classList.add('show');
    } else {
      say('Watch and listen!');
      await wait(1400);
      await playPads(run);
    }
  }

  async function playPads(run) {
    const tempo = LEVELS[game.level].tempo;
    for (const id of game.puzzle.sequence) {
      if (run !== game.run) return;
      const pad = $(`#stage .pad[data-id="${id}"]`);
      pad.classList.add('lit');
      playToken(id);
      await wait(tempo * 0.65);
      pad.classList.remove('lit');
      await wait(tempo * 0.35);
    }
  }

  // Replays the pattern without changing it: used for hints and the ear button.
  async function replay(run) {
    const p = game.puzzle;
    if (p.kind === 'complete') {
      const items = $$('#stage .tok:not(.blank)');
      for (let i = 0; i < items.length; i++) {
        if (run !== game.run) return;
        items[i].classList.add('pulse');
        playToken(p.sequence[i]);
        await wait(LEVELS[game.level].tempo);
        items[i].classList.remove('pulse');
      }
    } else {
      game.inputIdx = 0;
      renderRepeatProgress();
      await playPads(run);
    }
  }

  async function helpReplay(message, withFinger) {
    const run = game.run;
    game.phase = 'hint';
    hideFinger();
    if (message) say(message);
    await wait(message ? 1700 : 300);
    if (run !== game.run) return;
    await replay(run);
    if (run !== game.run) return;
    game.phase = 'input';
    game.timerElapsed = 0;
    if (withFinger) {
      game.usedHint = true;
      pointAtAnswer();
    }
  }

  function renderComplete() {
    const p = game.puzzle;
    const stage = $('#stage');
    stage.className = 'stage seq';
    stage.innerHTML =
      p.sequence.map((id) => `<div class="tok" role="img" aria-label="${TOKEN[id].label}">${tokenSVG(id)}</div>`).join('') +
      '<div class="tok blank show" aria-label="missing piece"><span>?</span></div>';
    sizeSequence();

    const answers = $('#answers');
    answers.className = 'answers choices';
    answers.innerHTML = '';
    p.choices.forEach((id) => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.dataset.id = id;
      b.setAttribute('aria-label', TOKEN[id].label);
      b.innerHTML = tokenSVG(id);
      onTap(b, () => onChoice(id, b));
      answers.appendChild(b);
    });
  }

  // Fit the sequence on one row, or two rows on narrow screens.
  function sizeSequence() {
    const stage = $('#stage');
    if (!stage.classList.contains('seq')) return;
    const n = stage.children.length;
    const gap = 8;
    const avail = Math.min(stage.clientWidth, 760) - 8;
    const maxH = stage.clientHeight;
    let per = Math.floor((avail - (n - 1) * gap) / n);
    if (per < 56) {
      const perRow = Math.ceil(n / 2);
      per = Math.floor((avail - (perRow - 1) * gap) / perRow);
      per = Math.min(per, Math.floor((maxH - gap) / 2));
    } else {
      per = Math.min(per, maxH);
    }
    stage.style.setProperty('--tok', Math.max(40, Math.min(per, 104)) + 'px');
  }

  function renderRepeat() {
    const p = game.puzzle;
    const stage = $('#stage');
    stage.className = 'stage pads pads-' + p.pads.length;
    stage.innerHTML = '';
    p.pads.forEach((id) => {
      const b = document.createElement('button');
      b.className = 'pad';
      b.dataset.id = id;
      b.setAttribute('aria-label', TOKEN[id].label);
      b.innerHTML = tokenSVG(id);
      onTap(b, () => onPad(id, b));
      stage.appendChild(b);
    });
    stage.style.removeProperty('--tok');
    $('#answers').className = 'answers progress show';
    renderRepeatProgress();
  }

  function renderRepeatProgress() {
    const p = game.puzzle;
    $('#answers').innerHTML = p.sequence
      .map((_, i) => `<span class="dot${i < game.inputIdx ? ' on' : ''}"></span>`)
      .join('');
  }

  function onChoice(id, el) {
    if (game.phase !== 'input') return;
    const p = game.puzzle;
    buzz(12);
    playToken(id);
    game.attempts++;
    if (id === p.answer) {
      const blank = $('#stage .blank');
      blank.classList.remove('glow');
      blank.classList.add('filled');
      blank.innerHTML = tokenSVG(id);
      blank.setAttribute('aria-label', TOKEN[id].label);
      el.classList.add('used');
      success(blank);
    } else {
      game.mistakes++;
      wiggle(el);
      Sfx.gentle();
      const sense = LEVELS[game.level].multiSensory ? 'listen' : 'look';
      helpReplay(`Almost! Let's ${sense} one more time.`, game.mistakes >= 2);
    }
  }

  function onPad(id, el) {
    if (game.phase !== 'input') return;
    const p = game.puzzle;
    buzz(12);
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 220);
    playToken(id);
    if (id === p.sequence[game.inputIdx]) {
      game.inputIdx++;
      game.timerElapsed = 0;
      renderRepeatProgress();
      hideFinger();
      if (game.inputIdx === p.sequence.length) {
        game.attempts++;
        success($('#stage'));
      } else if (game.usedHint) {
        pointAtAnswer();
      }
    } else {
      game.attempts++;
      game.mistakes++;
      wiggle(el);
      Sfx.gentle();
      helpReplay("Almost! Let's watch one more time.", game.mistakes >= 2);
    }
  }

  // ---------- Relaxed timer ----------
  // A sun drifts across the bottom while the child thinks. Reaching the end
  // is never a failure: the guide just offers to show the pattern again.

  function setSun(p) {
    $('#sun').style.left = p * 100 + '%';
  }

  let lastFrame = 0;
  function tick(now) {
    const dt = lastFrame ? Math.min(now - lastFrame, 100) : 0;
    lastFrame = now;
    if (screen === 'play' && game.phase === 'input' && !overlayOpen()) {
      const total = LEVELS[game.level].inputSeconds * 1000;
      game.timerElapsed += dt;
      setSun(Math.min(1, game.timerElapsed / total));
      if (game.timerElapsed >= total) {
        helpReplay("Need a little help? Let's look again!", true);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- Hints ----------

  let fingerTarget = null;

  function pointAtAnswer() {
    const p = game.puzzle;
    const target =
      p.kind === 'complete'
        ? $(`#answers .choice[data-id="${p.answer}"]`)
        : $(`#stage .pad[data-id="${p.sequence[game.inputIdx]}"]`);
    if (!target) return;
    fingerTarget = target;
    placeFinger();
    $('#finger').classList.add('on');
  }

  function placeFinger() {
    if (!fingerTarget) return;
    const r = fingerTarget.getBoundingClientRect();
    const f = $('#finger');
    f.style.left = r.left + r.width / 2 + 'px';
    f.style.top = r.top + r.height * 0.6 + 'px';
  }

  function hideFinger() {
    fingerTarget = null;
    $('#finger').classList.remove('on');
  }

  // ---------- Rewards ----------

  function renderPortalProgress(animateNew) {
    const pieces = zonePieces(game.zoneIdx);
    $('#portal-progress').innerHTML = [0, 1, 2]
      .map((k) => `<span class="slot${k < pieces ? ' on' : ''}${animateNew && k === pieces - 1 ? ' new' : ''}">✦</span>`)
      .join('');
  }

  function awardSticker() {
    const remaining = STICKERS.filter((s) => !save.stickers.includes(s));
    if (!remaining.length) return null;
    const s = pick(remaining);
    save.stickers.push(s);
    return s;
  }

  async function success(target) {
    const run = game.run;
    game.phase = 'reward';
    hideFinger();

    const ms = performance.now() - game.inputStart;
    const firstTry = game.attempts === 1 && !game.usedHint;
    const st = save.stats;
    st.puzzles++;
    st.responseMs += ms;
    if (game.usedHint) st.hints++;
    if (firstTry) st.firstTry++;
    st.byLevel[game.level].puzzles++;
    if (firstTry) st.byLevel[game.level].firstTry++;
    difficulty.record(game.level, { attempts: game.attempts, usedHint: game.usedHint });

    Sfx.chime();
    buzz([20, 60, 30]);
    sparkle(target);

    const zone = ZONES[game.zoneIdx];
    const before = zonePieces(game.zoneIdx);
    if (before < 3) save.pieces[zone.id] = before + 1;
    const restoredNow = before === 2;
    const sticker = awardSticker();
    persist();

    await wait(700);
    if (run !== game.run) return;
    if (before < 3) {
      renderPortalProgress(true);
      Sfx.piece();
      sparkle($('#portal-progress .slot.new'));
    }
    await wait(800);
    if (run !== game.run) return;
    if (restoredNow) showZoneRestored(zone);
    else showReward(sticker);
  }

  function showReward(sticker) {
    const praise = pick(PRAISE);
    $('#praise').textContent = praise;
    $('#sticker-win').innerHTML = sticker ? `<span class="sticker pop-in">${sticker}</span>` : '';
    openOverlay('ov-reward');
    Voice.say(sticker ? `${praise} You got a sticker!` : praise);
  }

  function showZoneRestored(zone) {
    Sfx.fanfare();
    buzz([30, 80, 30, 80, 60]);
    $('#zone-emoji').textContent = zone.emoji;
    $('#zone-title').textContent = `${zone.name}!`;
    $('#zone-unlocks').innerHTML =
      `<span class="unlock pop-in">${zone.companion.emoji}</span><span class="unlock pop-in delay">${zone.gear.emoji}</span>`;
    openOverlay('ov-zone');
    Voice.say(`Hooray! You restored the ${zone.name}! ${zone.companion.name} wants to explore with you!`);
  }

  $('#btn-next').addEventListener('click', () => {
    closeOverlay('ov-reward');
    Sfx.tap();
    nextPuzzle();
  });

  $('#btn-zone-map').addEventListener('click', () => {
    closeOverlay('ov-zone');
    goMap();
  });

  $('#btn-zone-more').addEventListener('click', () => {
    closeOverlay('ov-zone');
    Sfx.tap();
    nextPuzzle();
  });

  $('#btn-home').addEventListener('click', () => {
    Sfx.tap();
    Voice.stop();
    goMap();
  });

  $('#btn-replay').addEventListener('click', () => {
    if (game.phase !== 'input') return;
    Sfx.tap();
    buzz(10);
    helpReplay(null, false);
  });

  // ---------- Focus distractors (Level 3) ----------
  // Leaves and clouds drift behind the puzzle. They do nothing when tapped;
  // the parent dashboard counts those taps as an impulse-control signal.

  const layer = $('#distractors');
  let leafTimer = null;

  function distractorsWanted() {
    const mode = save.settings.distractors;
    return mode === 'on' || (mode === 'auto' && LEVELS[game.level].distractors);
  }

  function startDistractors() {
    stopDistractors();
    if (!distractorsWanted()) return;
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('span');
      c.className = 'cloud';
      c.textContent = '☁️';
      c.style.top = 8 + i * 22 + '%';
      c.style.setProperty('--dur', 38 + i * 9 + 's');
      c.style.animationDelay = -i * 13 + 's';
      layer.appendChild(c);
    }
    leafTimer = setInterval(spawnLeaf, reducedMotion ? 3200 : 1400);
  }

  function spawnLeaf() {
    if (document.hidden || layer.childElementCount > 16) return;
    const el = document.createElement('span');
    el.className = 'leaf';
    el.textContent = pick(['🍃', '🍂', '🍁', '🌸']);
    el.style.left = Math.random() * 95 + '%';
    el.style.setProperty('--dur', 7 + Math.random() * 4 + 's');
    el.style.setProperty('--sway', Math.random() * 120 - 60 + 'px');
    el.addEventListener('animationend', () => el.remove());
    layer.appendChild(el);
  }

  function stopDistractors() {
    clearInterval(leafTimer);
    leafTimer = null;
    layer.innerHTML = '';
  }

  layer.addEventListener('pointerdown', (e) => {
    if (e.target.classList.contains('leaf') || e.target.classList.contains('cloud')) save.stats.distractorTaps++;
  });

  // ---------- Session time & rest screen ----------

  let sessionMs = 0;
  let parentOpen = false;

  setInterval(() => {
    if (document.hidden || screen === 'rest' || screen === 'title' || parentOpen) return;
    sessionMs += 1000;
    const d = todayKey();
    save.stats.daily[d] = (save.stats.daily[d] || 0) + 1000;
    if (sessionMs % 15000 === 0) persist();
    const limit = save.settings.limitMin;
    if (limit && sessionMs >= limit * 60000 && game.phase !== 'reward' && !overlayOpen()) showRest();
  }, 1000);

  function showRest() {
    cancelRun();
    persist();
    show('rest');
    renderAvatars();
    Sfx.lullaby();
    Voice.say('What a great explorer! Time for a rest.');
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      persist();
      Voice.stop();
    }
  });

  // ---------- Parent gate (triple-tap + math lock) ----------

  let leafTaps = [];
  $('#parent-leaf').addEventListener('click', () => {
    const now = Date.now();
    leafTaps = leafTaps.filter((t) => now - t < 900).concat(now);
    if (leafTaps.length >= 3) {
      leafTaps = [];
      openGate();
    }
  });

  let gateAnswer = 0;
  let gateInput = '';

  function openGate() {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    gateAnswer = a * b;
    gateInput = '';
    $('#gate-q').textContent = `What is ${a} × ${b}?`;
    $('#gate-display').textContent = '';
    parentOpen = true;
    if (game.phase === 'input') game.phase = 'paused';
    openOverlay('ov-gate');
  }

  $('#keypad').innerHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']
    .map((k) => `<button class="key" data-key="${k}">${k}</button>`)
    .join('');

  $('#keypad').addEventListener('click', (e) => {
    const key = e.target.dataset && e.target.dataset.key;
    if (!key) return;
    if (key === '⌫') gateInput = gateInput.slice(0, -1);
    else if (key === 'OK') {
      if (Number(gateInput) === gateAnswer) {
        closeOverlay('ov-gate');
        openDashboard();
        return;
      }
      wiggle($('#gate-display'));
      openGate();
      return;
    } else if (gateInput.length < 3) gateInput += key;
    $('#gate-display').textContent = gateInput;
  });

  // The gate's ✖ resumes the game too.
  $('#ov-gate [data-close]').addEventListener('click', resumeFromParent);

  function resumeFromParent() {
    parentOpen = false;
    if (game.phase === 'paused') game.phase = 'input';
  }

  function onDashboardClosed() {
    applySettings();
    persist();
    resumeFromParent();
    if (screen === 'rest') {
      sessionMs = 0;
      goMap();
    } else if (screen === 'map') {
      renderMap();
    } else if (screen === 'play') {
      startDistractors();
    }
  }

  function fmtMin(ms) {
    const m = Math.round(ms / 60000);
    return m < 1 ? '< 1 min' : `${m} min`;
  }

  function seg(name, value, options) {
    return `<div class="seg" data-setting="${name}">${options
      .map(([v, label]) => `<button data-value="${v}" class="${String(value) === String(v) ? 'on' : ''}">${label}</button>`)
      .join('')}</div>`;
  }

  function openDashboard() {
    const s = save.settings;
    const st = save.stats;
    const pct = (a, b) => (b ? Math.round((a / b) * 100) + '%' : '—');
    const avg = st.puzzles ? (st.responseMs / st.puzzles / 1000).toFixed(1) + ' s' : '—';
    const restored = ZONES.filter((_, i) => zoneDone(i)).length;
    const steps = difficulty.toJSON();

    $('#dash-body').innerHTML = `
      <h3>Session</h3>
      <div class="row"><span>Time limit</span>${seg('limitMin', s.limitMin, [[0, 'Off'], [10, '10m'], [15, '15m'], [20, '20m'], [30, '30m']])}</div>
      <div class="row"><span>This session</span><b>${fmtMin(sessionMs)}</b></div>
      <div class="row"><span>Today</span><b>${fmtMin(st.daily[todayKey()] || 0)}</b></div>

      <h3>Settings</h3>
      <div class="row"><span>Sound</span>${seg('sound', s.sound, [[true, 'On'], [false, 'Off']])}</div>
      <div class="row"><span>Voice</span>${seg('voice', s.voice, [[true, 'On'], [false, 'Off']])}</div>
      <div class="row"><span>Vibration</span>${seg('haptics', s.haptics, [[true, 'On'], [false, 'Off']])}</div>
      <div class="row"><span>Distractors</span>${seg('distractors', s.distractors, [['auto', 'Level 3'], ['on', 'Always'], ['off', 'Never']])}</div>
      <div class="row"><span>Child's age</span>${seg('age', save.age, [[5, '5'], [6, '6'], [7, '7'], [8, '8']])}</div>

      <h3>Progress</h3>
      <div class="stats">
        <div><b>${st.puzzles}</b><span>puzzles solved</span></div>
        <div><b>${pct(st.firstTry, st.puzzles)}</b><span>first-try</span></div>
        <div><b>${avg}</b><span>avg. answer time</span></div>
        <div><b>${st.hints}</b><span>hints used</span></div>
        <div><b>${restored}/${ZONES.length}</b><span>areas restored</span></div>
        <div><b>${st.distractorTaps}</b><span>distractor taps</span></div>
      </div>
      <table class="levels">
        <tr><th>Level</th><th>Solved</th><th>First-try</th><th>Difficulty</th></tr>
        ${[1, 2, 3].map((l) => `<tr><td>${l}</td><td>${st.byLevel[l].puzzles}</td><td>${pct(st.byLevel[l].firstTry, st.byLevel[l].puzzles)}</td><td>${steps[l].step + 1} / ${LEVELS[l].steps.length}</td></tr>`).join('')}
      </table>
      <p class="note">Fewer distractor taps over time in Level 3 suggests growing selective focus. Difficulty adjusts automatically: two smooth wins step up, two struggles step down.</p>
      <button class="danger" id="btn-reset">Reset all progress</button>`;

    $$('#dash-body .seg').forEach((el) =>
      el.addEventListener('click', (e) => {
        const raw = e.target.dataset.value;
        if (raw === undefined) return;
        const name = el.dataset.setting;
        const value = raw === 'true' ? true : raw === 'false' ? false : isNaN(raw) ? raw : Number(raw);
        if (name === 'age') save.age = value;
        else save.settings[name] = value;
        applySettings();
        persist();
        openDashboard();
      })
    );

    $('#btn-reset').addEventListener('click', () => {
      if (!window.confirm('Erase all stickers, portals and statistics?')) return;
      const settings = save.settings;
      save = freshSave();
      save.settings = settings;
      difficulty = createDifficulty(null);
      persist();
      closeOverlay('ov-dash');
      parentOpen = false;
      cancelRun();
      show('title');
    });

    openOverlay('ov-dash');
  }

  // ---------- Boot ----------

  window.addEventListener('resize', () => {
    sizeSequence();
    placeFinger();
  });

  applySettings();
  renderAvatars();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
