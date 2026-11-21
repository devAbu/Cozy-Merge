// Cozy Merge - static game data (numbers and tables, no player-facing text).
(function (root) {
  'use strict';
  var D = {
    COLS: 7, ROWS: 9, MAXLV: 6,
    ENERGY_MAX: 100,      // natural regen stops here
    ENERGY_CAP: 150,      // rewarded / bought energy may overfill up to this
    REGEN_MS: 60000,      // +1 energy per minute
    ENERGY_REWARD: 25,
    ENERGY_BUY: 20,
    ENERGY_BUY_COST: 80,
    SPAWN_COST: 1,
    PROC_FROM: 20,        // orders after the 20 handmade ones are generated

    // one chain per generator: color = particle/accent color, plate = soft tile color
    CHAINS: [
      { color: '#e8b36a', plate: '#fbead0' },   // bread
      { color: '#f5d36b', plate: '#fff3c9' },   // eggs / cakes
      { color: '#9cc7ee', plate: '#e3f0fb' },   // dairy
      { color: '#e56a7e', plate: '#fbdde2' },   // fruit
      { color: '#f2a6be', plate: '#fde3ec' }    // sweets
    ],

    // generators: chain id + stars needed
    GENS: [
      { chain: 0, stars: 0 },
      { chain: 1, stars: 0 },
      { chain: 2, stars: 6 },
      { chain: 3, stars: 12 },
      { chain: 4, stars: 24 }
    ],

    // areas: stars needed + palette
    AREAS: [
      { stars: 0,  bg0: '#fff6e8', bg1: '#fbd9bd', tileA: '#fff1dd', tileB: '#fbe6cb', panel: '#fffaf1', accent: '#e9a36b' },
      { stars: 12, bg0: '#f3fbea', bg1: '#c9e8d2', tileA: '#eef8e3', tileB: '#e0f1d6', panel: '#fbfff6', accent: '#7fbf8e' }
    ],

    // 20 handmade orders: [chain, level] pairs. (Procedural after that.)
    ORDERS: [
      [[0, 2]],
      [[0, 2], [1, 2]],
      [[1, 3]],
      [[0, 3], [1, 2]],
      [[2, 2], [0, 3]],
      [[1, 3], [2, 3]],
      [[0, 4]],
      [[2, 3], [1, 3], [0, 2]],
      [[1, 4]],
      [[2, 4], [0, 3]],
      [[3, 2], [2, 3]],
      [[3, 3], [1, 3]],
      [[0, 4], [3, 3]],
      [[2, 4], [3, 3]],
      [[1, 4], [3, 4]],
      [[0, 5]],
      [[4, 2], [3, 3]],
      [[4, 3], [2, 4], [1, 3]],
      [[3, 4], [4, 4]],
      [[0, 5], [1, 4], [2, 4]]
    ],

    // palette for UI
    UI: {
      ink: '#6b4f3f', inkSoft: '#9a8070', cream: '#fff8ec', white: '#ffffff',
      mint: '#bfe6cc', mintDark: '#79b88e', peach: '#f9cdb0', rose: '#f4b6c2',
      gold: '#f4c542', goldDark: '#d99f1f', blue: '#9cc7ee', shadow: 'rgba(107,79,63,0.18)'
    }
  };

  root.CozyData = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
