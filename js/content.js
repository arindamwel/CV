/* Pattern Explorers — world content: zones, companions, gear, stickers, lines. */
(function (root) {
  'use strict';

  // Zones unlock in order. Each needs 3 portal pieces to restore and
  // rewards a new animal companion and a piece of avatar gear.
  const ZONES = [
    {
      id: 'forest', name: 'Whispering Forest', level: 1, emoji: '🌳',
      color: '#4CAF50', bg: ['#EAF7E4', '#A8DB98'],
      companion: { id: 'monkey', emoji: '🐒', name: 'Miko' },
      gear: { id: 'flower', emoji: '🌺' },
    },
    {
      id: 'meadow', name: 'Mushroom Meadow', level: 1, emoji: '🍄',
      color: '#FF8A65', bg: ['#FFF4E3', '#FFCD8A'],
      companion: { id: 'frog', emoji: '🐸', name: 'Pip' },
      gear: { id: 'mushroom', emoji: '🍄' },
    },
    {
      id: 'caves', name: 'Glowing Caves', level: 2, emoji: '💎',
      color: '#7E57C2', bg: ['#EEEAF8', '#B7A6E0'],
      companion: { id: 'bat', emoji: '🦇', name: 'Luna' },
      gear: { id: 'crown', emoji: '👑' },
    },
    {
      id: 'canyon', name: 'Echo Canyon', level: 2, emoji: '🏜️',
      color: '#E07A3F', bg: ['#FDEEE6', '#F7B48F'],
      companion: { id: 'parrot', emoji: '🦜', name: 'Rio' },
      gear: { id: 'cap', emoji: '🧢' },
    },
    {
      id: 'falls', name: 'Crystal Falls', level: 3, emoji: '💧',
      color: '#1E9BD7', bg: ['#E3F4FC', '#8DD0F2'],
      companion: { id: 'turtle', emoji: '🐢', name: 'Shelly' },
      gear: { id: 'bow', emoji: '🎀' },
    },
    {
      id: 'lagoon', name: 'Starlight Lagoon', level: 3, emoji: '🌙',
      color: '#5C6BC0', bg: ['#ECEEF9', '#B4BCE6'],
      companion: { id: 'owl', emoji: '🦉', name: 'Hoot' },
      gear: { id: 'tophat', emoji: '🎩' },
    },
  ];

  const STARTER = { id: 'lion', emoji: '🦁', name: 'Leo' };

  // How many zones are open from the start for each age (5–6 → Level 1,
  // 6–7 → Level 2, 7–8 → Level 3). Younger zones always stay playable.
  const AGE_UNLOCKS = { 5: 1, 6: 3, 7: 5, 8: 6 };

  const STICKERS = [
    '🦋', '🐞', '🌸', '🍌', '🐝', '🌈', '⭐', '🐚', '🍉', '🌻', '🦄', '🐠',
    '🌵', '🍓', '🐙', '🦊', '🐼', '🐨', '🎈', '🍩', '🚀', '🍀', '🐳', '🦒',
  ];

  const PRAISE = [
    'You did it!',
    'Wonderful!',
    'Super pattern power!',
    'Great job, explorer!',
    'Amazing!',
    'Yay! The portal is glowing!',
  ];

  root.Content = { ZONES, STARTER, AGE_UNLOCKS, STICKERS, PRAISE };
})(typeof self !== 'undefined' ? self : this);
