// Cozy Merge - ALL player-facing text lives here (translate this file only).
(function (root) {
  'use strict';
  var S = {
    appName: 'Cozy Merge',

    // top bar / generic
    coins: 'Coins',
    stars: 'Stars',
    energy: 'Energy',
    close: 'Close',
    collect: 'Collect',
    on: 'ON',
    off: 'OFF',
    max: 'MAX',

    // order cards
    deliver: 'Deliver',
    reward: 'Reward',
    orderDone: 'Order complete!',
    doubleReward: 'Double reward',

    // tray / actions
    sell: 'Sell',
    bakery: 'Bakery',
    energyPlus: '+25 Energy',
    mergeAll: 'Merge all',
    freeBadge: 'FREE',
    watching: 'Watching',
    waitFmt: 'Wait {s}s',
    lockedFmt: '{n} stars',

    // toasts
    boardFull: 'Board is full - merge or sell!',
    needStars: 'Unlocks at {n} stars',
    noEnergy: 'Out of energy',
    nothingToMerge: 'Nothing to merge yet',
    mergedFmt: 'Merged {n}!',
    soldFmt: 'Sold for {n}',
    bought: 'Energy added',
    notEnoughCoins: 'Not enough coins',
    newGen: 'New: {name}!',
    newArea: 'New area: {name}!',

    // energy popup
    energyTitle: 'Energy',
    nextEnergyFmt: 'Next +1 in {t}',
    fullEnergy: 'Energy is full',
    fullInFmt: 'Full in {t}',
    watchEnergy: 'Watch video: +25',
    buyEnergyFmt: 'Buy +20 energy ({n} coins)',

    // settings
    settings: 'Settings',
    music: 'Music',
    sfx: 'Sound effects',
    vibration: 'Vibration',
    statBest: 'Best item level',
    statOrders: 'Orders delivered',
    statScore: 'Total score',
    reset: 'Reset progress',
    resetConfirm: 'Tap again to confirm',

    // bakery
    bakeryTitle: 'Your Bakery',
    areaActive: 'Active',
    areaSelect: 'Select',
    areaLocked: 'Locked',
    generators: 'Generators',
    unlocked: 'Unlocked',

    // generators (index = generator id, same order as chains)
    genNames: ['Flour Sack', 'Egg Basket', 'Milk Crate', 'Berry Bush', 'Honey Hive'],

    // areas
    areas: [
      { name: 'Little Kitchen', desc: 'Where every bakery begins.' },
      { name: 'Garden Terrace', desc: 'Sunny tables under the parasols.' }
    ],

    // item chains: 6 names each, level 1..6
    chains: [
      ['Flour', 'Dough', 'Roll', 'Loaf', 'Braid', 'Grand Loaf'],
      ['Egg', 'Custard', 'Cream Puff', 'Eclair', 'Cake Slice', 'Layer Cake'],
      ['Milk', 'Cream', 'Butter', 'Cheese', 'Cheese Wheel', 'Cheese Board'],
      ['Berry', 'Jam Jar', 'Compote', 'Berry Tart', 'Pie', 'Fruit Basket'],
      ['Honey', 'Sugar Cubes', 'Cookie', 'Cupcake', 'Donut', 'Sweet Tower']
    ],

    // customers (picked by order)
    customers: ['Mabel', 'Otis', 'Pearl', 'Hugo', 'Clara', 'Fig', 'Nora', 'Basil', 'Ivy', 'Jasper', 'Wren', 'Milo']
  };

  S.fmt = function (str, o) {
    return str.replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; });
  };

  root.CozyStrings = S;
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
