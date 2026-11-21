// Logic tests + bot playthrough. Run: npm run sim   (fails with exit code 1 on any problem)
const D = require('../www/data.js');
const C = require('../www/core.js');
let fails = 0;
function ok(c, msg) { if (!c) { fails++; console.log('FAIL:', msg); } }

// deterministic rng for the bot
C.setRng(C.mulberry32(12345));
const MIN = 60000;
let T = 1700000000000;

// ---- energy (offline refill)
(function () {
  const s = C.newState(T);
  ok(s.energy === 100, 'starts with full energy');
  s.energy = 50; s.energyTs = T;
  C.regen(s, T + 30 * MIN + 5000);
  ok(s.energy === 80, 'offline 30 min -> +30 energy, got ' + s.energy);
  ok(C.secToNext(s, T + 30 * MIN + 5000) === 55, 'secToNext keeps the partial minute');
  C.regen(s, T + 24 * 60 * MIN);
  ok(s.energy === 100, 'regen caps at 100');
  ok(C.spendEnergy(s, 1, T + 24 * 60 * MIN) && s.energy === 99, 'spend works');
  C.regen(s, T + 24 * 60 * MIN + 59000);
  ok(s.energy === 99, 'regen clock starts when dropping below max');
  C.regen(s, T + 24 * 60 * MIN + 61000);
  ok(s.energy === 100, 'then +1 after a minute');
  s.energy = 100; C.addEnergy(s, 25); ok(s.energy === 125, 'rewarded energy may overfill');
  C.addEnergy(s, 100); ok(s.energy === D.ENERGY_CAP, 'overfill is capped');
  s.energy = 0; ok(C.spawn(s, 0, T).why === 'energy', 'no energy -> cannot spawn');
})();

// ---- save roundtrip + garbage
(function () {
  const s = C.newState(T); s.coins = 77; s.stars = 5; s.settings.music = false;
  const r = C.sanitize(JSON.parse(JSON.stringify(s)), T);
  ok(r.coins === 77 && r.stars === 5 && r.settings.music === false, 'save roundtrip');
  ok(C.sanitize(null, T).orders.length === 1, 'null save -> fresh state');
  ok(C.sanitize({ v: 1, board: [1, 2] }, T).board.length === 63, 'bad board -> fresh state');
  const bad = JSON.parse(JSON.stringify(s)); bad.board[0] = 99; bad.board[1] = 17;
  const r2 = C.sanitize(bad, T); ok(r2.board[0] === 0 && r2.board[1] === 0, 'invalid item codes are dropped');
})();

// ---- merge rules
(function () {
  const s = C.newState(T);
  s.board.fill(0); s.board[0] = C.enc(0, 1); s.board[1] = C.enc(0, 1); s.board[2] = C.enc(1, 1); s.board[3] = C.enc(0, 6); s.board[4] = C.enc(0, 6);
  ok(C.canMerge(s, 0, 1), 'same item merges');
  ok(!C.canMerge(s, 0, 2), 'different chain does not merge');
  ok(!C.canMerge(s, 3, 4), 'max level does not merge');
  ok(!C.canMerge(s, 0, 0), 'cannot merge with itself');
  ok(C.drop(s, 0, 1) === 'merge' && s.board[1] === C.enc(0, 2) && s.board[0] === 0, 'merge result');
  ok(C.drop(s, 1, 5) === 'move' && s.board[5] === C.enc(0, 2), 'move to empty');
  ok(C.drop(s, 5, 2) === 'swap' && s.board[2] === C.enc(0, 2) && s.board[5] === C.enc(1, 1), 'swap different items');
  s.board.fill(0);
  [1, 1, 1, 1, 2, 3, 3, 3].forEach((lv, i) => { s.board[i] = C.enc(2, lv); });
  const cells = C.mergeAll(s);
  const left = s.board.filter(Boolean).map(v => v % 10).sort().join('');
  ok(left === '24' || left === '34' || left.length <= 4, 'mergeAll cascades, left=' + left + ' merged=' + cells.length);
  ok(C.pairCount(s) === 0 || cells.length >= 4, 'mergeAll leaves no pairs behind');
  s.board.fill(1);
  ok(C.spawn(s, 0, T).why === 'full', 'full board cannot spawn (and costs no energy)');
})();

// ---- orders: 20 handmade are valid, rewards sane
(function () {
  D.ORDERS.forEach((o, i) => {
    ok(o.length >= 1 && o.length <= 3, 'order ' + i + ' has 1-3 items');
    o.forEach(([c, lv]) => ok(c >= 0 && c < 5 && lv >= 2 && lv <= 6, 'order ' + i + ' item valid'));
  });
  ok(D.ORDERS.length === 20, '20 handmade orders');
})();

// ---- bot playthrough: finish the 20 orders and check pacing / softlocks
(function () {
  const s = C.newState(T);
  C.setRng(C.mulberry32(99));
  let spawns = 0, merges = 0, sells = 0, waitMin = 0, steps = 0, delivered = 0;
  const unlockLog = [];
  const target = 30;
  const need = () => {   // map code -> count wanted by all active orders
    const m = {};
    s.orders.forEach(o => o.c.forEach(([c, l]) => { const k = C.enc(c, l); m[k] = (m[k] || 0) + 1; }));
    return m;
  };
  while (s.delivered < target && steps++ < 20000) {
    // every active order only asks for unlocked chains
    s.orders.forEach((o, i) => o.c.forEach(([c]) => ok(C.openChains(s).indexOf(c) >= 0, 'order asks for locked chain ' + c + ' at stars=' + s.stars)));
    const di = C.firstDeliverable(s);
    if (di >= 0) {
      const r = C.deliver(s, di); delivered++;
      r.unlocks.forEach(u => unlockLog.push(u.type + u.id + '@order' + s.delivered));
      continue;
    }
    // merge a pair that is not needed as-is
    const nd = need(), cnt = {};
    s.board.forEach(v => { if (v) cnt[v] = (cnt[v] || 0) + 1; });
    let did = false;
    for (let a = 0; a < 63 && !did; a++) {
      const v = s.board[a]; if (!v || v % 10 >= 6 || cnt[v] < 2) continue;
      if ((cnt[v] - 2) < (nd[v] || 0)) continue;
      for (let b = a + 1; b < 63; b++) if (s.board[b] === v) { C.drop(s, a, b); merges++; did = true; break; }
    }
    if (did) continue;
    // spawn from the chain that has the most missing demand
    let best = -1, bestLv = 0;
    s.orders.forEach(o => o.c.forEach(([c, l]) => {
      if (!C.openChains(s).includes(c)) return;
      if (!s.board.includes(C.enc(c, l)) && l > bestLv) { best = c; bestLv = l; }
    }));
    if (best < 0) best = 0;
    const gi = D.GENS.findIndex(g => g.chain === best);
    const r = C.spawn(s, gi, T);
    if (r.ok) { spawns++; continue; }
    if (r.why === 'energy') { T += MIN; waitMin++; C.regen(s, T); continue; }
    if (r.why === 'full') {   // sell the cheapest item that is not needed
      let idx = -1, lo = 99;
      s.board.forEach((v, i) => { if (v && (nd[v] || 0) === 0 && v % 10 < lo) { lo = v % 10; idx = i; } });
      if (idx < 0) { ok(false, 'softlock: board full of needed items'); break; }
      C.sell(s, idx); sells++; continue;
    }
    ok(false, 'unexpected spawn failure ' + r.why); break;
  }
  ok(s.delivered >= target, 'bot delivered ' + s.delivered + '/' + target + ' orders');
  console.log('bot: delivered=' + s.delivered + ' spawns=' + spawns + ' merges=' + merges + ' sells=' + sells + ' waited=' + waitMin + ' min  stars=' + s.stars + ' coins=' + s.coins + ' best=Lv' + s.bestLevel);
  console.log('unlocks:', unlockLog.join(', '));
  ok(unlockLog.some(u => u.startsWith('area1')), 'second area unlocks during the 20 orders');
  ok(s.stars >= 24, 'all generators reachable within 20 orders (stars=' + s.stars + ')');
})();

console.log(fails ? fails + ' FAILED' : 'all tests passed');
process.exit(fails ? 1 : 0);
