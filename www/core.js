// Cozy Merge - pure game logic (no DOM). Runs in the browser and in node (tools/sim.js).
(function (root) {
  'use strict';
  var D = root.CozyData || require('./data.js');
  var COLS = D.COLS, ROWS = D.ROWS, N = COLS * ROWS, MAXLV = D.MAXLV;

  var rng = Math.random;
  function setRng(f) { rng = f; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // item code = chain*10 + level (level 1..6), 0 = empty
  function enc(ch, lv) { return ch * 10 + lv; }
  function chainOf(v) { return (v / 10) | 0; }
  function lvOf(v) { return v % 10; }

  // ---------------------------------------------------------------- state
  function newState(now) {
    var board = [];
    for (var i = 0; i < N; i++) board.push(0);
    // two matching flour items next to each other: the first thing to do is obvious
    board[4 * COLS + 2] = enc(0, 1);
    board[4 * COLS + 3] = enc(0, 1);
    var s = {
      v: 1, coins: 0, stars: 0, energy: D.ENERGY_MAX, energyTs: now,
      board: board, orders: [], orderIdx: 0, delivered: 0, area: 0,
      bestLevel: 1, score: 0, tut: 0,
      settings: { music: true, sfx: true, vib: true }
    };
    fillOrders(s);
    return s;
  }

  function sanitize(o, now) {
    var s = newState(now);
    if (!o || typeof o !== 'object' || o.v !== 1 || !Array.isArray(o.board) || o.board.length !== N) return s;
    var num = function (x, d) { return (typeof x === 'number' && isFinite(x)) ? x : d; };
    s.coins = Math.max(0, num(o.coins, 0) | 0);
    s.stars = Math.max(0, num(o.stars, 0) | 0);
    s.energy = Math.min(D.ENERGY_CAP, Math.max(0, num(o.energy, D.ENERGY_MAX) | 0));
    s.energyTs = num(o.energyTs, now);
    s.board = o.board.map(function (v) {
      v = v | 0;
      var ch = chainOf(v), lv = lvOf(v);
      return (v > 0 && ch >= 0 && ch < D.CHAINS.length && lv >= 1 && lv <= MAXLV) ? v : 0;
    });
    s.orderIdx = Math.max(0, num(o.orderIdx, 0) | 0);
    s.delivered = Math.max(0, num(o.delivered, 0) | 0);
    s.area = Math.min(D.AREAS.length - 1, Math.max(0, num(o.area, 0) | 0));
    s.bestLevel = Math.min(MAXLV, Math.max(1, num(o.bestLevel, 1) | 0));
    s.score = Math.max(0, num(o.score, 0));
    s.tut = o.tut ? 1 : 0;
    if (o.settings) {
      s.settings.music = o.settings.music !== false;
      s.settings.sfx = o.settings.sfx !== false;
      s.settings.vib = o.settings.vib !== false;
    }
    s.orders = [];
    if (Array.isArray(o.orders)) {
      for (var i = 0; i < o.orders.length && i < 3; i++) {
        var q = o.orders[i];
        if (q && Array.isArray(q.c) && q.c.length >= 1 && q.c.length <= 3) s.orders.push(q);
      }
    }
    if (s.area > 0 && s.stars < D.AREAS[s.area].stars) s.area = 0;
    fillOrders(s);
    return s;
  }

  // ---------------------------------------------------------------- unlocks
  function genOpen(s, g) { return s.stars >= D.GENS[g].stars; }
  function areaOpen(s, a) { return s.stars >= D.AREAS[a].stars; }
  function openChains(s) {
    var out = [];
    for (var g = 0; g < D.GENS.length; g++) if (genOpen(s, g)) out.push(D.GENS[g].chain);
    return out;
  }
  function unlocksBetween(prevStars, stars) {
    var out = [], i;
    for (i = 0; i < D.GENS.length; i++) if (D.GENS[i].stars > prevStars && D.GENS[i].stars <= stars) out.push({ type: 'gen', id: i });
    for (i = 0; i < D.AREAS.length; i++) if (D.AREAS[i].stars > prevStars && D.AREAS[i].stars <= stars) out.push({ type: 'area', id: i });
    return out;
  }

  // ---------------------------------------------------------------- energy
  function regen(s, now) {
    if (s.energy >= D.ENERGY_MAX) { s.energyTs = now; return 0; }
    if (now < s.energyTs) { s.energyTs = now; return 0; }
    var n = Math.floor((now - s.energyTs) / D.REGEN_MS);
    if (n <= 0) return 0;
    var add = Math.min(n, D.ENERGY_MAX - s.energy);
    s.energy += add;
    s.energyTs += n * D.REGEN_MS;
    if (s.energy >= D.ENERGY_MAX) s.energyTs = now;
    return add;
  }
  function spendEnergy(s, n, now) {
    regen(s, now);
    if (s.energy < n) return false;
    if (s.energy >= D.ENERGY_MAX) s.energyTs = now;   // regen clock starts when we drop below max
    s.energy -= n;
    return true;
  }
  function addEnergy(s, n) { s.energy = Math.min(D.ENERGY_CAP, s.energy + n); }
  // seconds until the next +1 (null if full)
  function secToNext(s, now) {
    if (s.energy >= D.ENERGY_MAX) return null;
    var left = D.REGEN_MS - ((now - s.energyTs) % D.REGEN_MS);
    return Math.max(1, Math.min(60, Math.ceil(left / 1000)));
  }
  function secToFull(s, now) {
    if (s.energy >= D.ENERGY_MAX) return 0;
    var next = secToNext(s, now);
    return next + (D.ENERGY_MAX - s.energy - 1) * 60;
  }

  // ---------------------------------------------------------------- board
  function emptyCount(s) { var c = 0; for (var i = 0; i < N; i++) if (!s.board[i]) c++; return c; }
  function spawn(s, g, now) {
    if (!genOpen(s, g)) return { ok: false, why: 'locked' };
    var e = emptyCount(s);
    if (e === 0) return { ok: false, why: 'full' };
    if (!spendEnergy(s, D.SPAWN_COST, now)) return { ok: false, why: 'energy' };
    var k = Math.floor(rng() * e), cell = -1;
    for (var i = 0; i < N; i++) if (!s.board[i]) { if (k === 0) { cell = i; break; } k--; }
    s.board[cell] = enc(D.GENS[g].chain, 1);
    return { ok: true, cell: cell };
  }
  function canMerge(s, a, b) {
    if (a === b) return false;
    var x = s.board[a], y = s.board[b];
    return x > 0 && x === y && lvOf(x) < MAXLV;
  }
  function bump(s, lv) {
    s.score += 1 << (lv - 1);
    if (lv > s.bestLevel) s.bestLevel = lv;
  }
  // drag/tap a onto b. returns 'merge' | 'move' | 'swap' | 'none'
  function drop(s, a, b) {
    if (a === b || !s.board[a]) return 'none';
    if (canMerge(s, a, b)) {
      s.board[b] += 1; s.board[a] = 0; bump(s, lvOf(s.board[b]));
      return 'merge';
    }
    if (!s.board[b]) { s.board[b] = s.board[a]; s.board[a] = 0; return 'move'; }
    var t = s.board[a]; s.board[a] = s.board[b]; s.board[b] = t;
    return 'swap';
  }
  // merge every possible pair, lowest levels first so results can cascade. returns cells that got a new item
  function mergeAll(s) {
    var cells = [], idx = [];
    for (var lv = 1; lv < MAXLV; lv++) {
      for (var ch = 0; ch < D.CHAINS.length; ch++) {
        var v = enc(ch, lv); idx.length = 0;
        for (var i = 0; i < N; i++) if (s.board[i] === v) idx.push(i);
        for (var j = 0; j + 1 < idx.length; j += 2) {
          s.board[idx[j + 1]] = v + 1; s.board[idx[j]] = 0; bump(s, lv + 1);
          cells.push(idx[j + 1]);
        }
      }
    }
    return cells;
  }
  function sellValue(v) { return 1 << (lvOf(v) - 1); }
  function sell(s, i) {
    var v = s.board[i]; if (!v) return 0;
    var c = sellValue(v); s.board[i] = 0; s.coins += c; return c;
  }
  function pairCount(s) {
    var cnt = {}, p = 0;
    for (var i = 0; i < N; i++) { var v = s.board[i]; if (v && lvOf(v) < MAXLV) { cnt[v] = (cnt[v] || 0) + 1; if (cnt[v] % 2 === 0) p++; } }
    return p;
  }
  // best pair to hint: prefer items wanted by an open order. out = [a, b] or returns false
  function findPair(s, out) {
    var first = {}, bestScore = -1, found = false;
    for (var i = 0; i < N; i++) {
      var v = s.board[i];
      if (!v || lvOf(v) >= MAXLV) continue;
      if (first[v] === undefined) { first[v] = i; continue; }
      var sc = 100 - lvOf(v);
      for (var o = 0; o < s.orders.length; o++) {
        var c = s.orders[o].c;
        for (var k = 0; k < c.length; k++) if (c[k][0] === chainOf(v) && c[k][1] > lvOf(v)) sc += 50;
      }
      if (sc > bestScore) { bestScore = sc; out[0] = first[v]; out[1] = i; found = true; }
    }
    return found;
  }

  // ---------------------------------------------------------------- orders
  function rewardFor(items) {
    var v = 0, mx = 0;
    for (var i = 0; i < items.length; i++) { v += 1 << (items[i][1] - 1); if (items[i][1] > mx) mx = items[i][1]; }
    return {
      coins: Math.round(v * 6 + items.length * 10),
      stars: items.length + (mx >= 4 ? 1 : 0) + (mx >= 6 ? 1 : 0)
    };
  }
  function makeOrder(s, idx) {
    var unl = openChains(s), items = [], i;
    if (idx < D.PROC_FROM) {
      var src = D.ORDERS[idx];
      for (i = 0; i < src.length; i++) {
        var ch = src[i][0];
        if (unl.indexOf(ch) < 0) ch = unl[(ch + idx) % unl.length];   // safety net: never ask for a locked chain
        items.push([ch, src[i][1]]);
      }
    } else {
      var r = mulberry32(idx * 7919 + 13);
      var n = 1 + Math.floor(r() * 3);
      var maxLv = Math.min(6, 3 + Math.floor((idx - D.PROC_FROM) / 6));
      for (i = 0; i < n; i++) {
        var lv = 2 + Math.floor(r() * (maxLv - 1));
        if (lv === 6 && r() < 0.6) lv = 5;
        items.push([unl[Math.floor(r() * unl.length)], Math.min(6, lv)]);
      }
    }
    var rw = rewardFor(items);
    return { c: items, who: idx % 12, coins: rw.coins, stars: rw.stars };
  }
  function orderTarget(s) { return s.tut === 0 ? 1 : 3; }
  function fillOrders(s) {
    while (s.orders.length < orderTarget(s)) s.orders.push(makeOrder(s, s.orderIdx++));
  }
  var used = new Uint8Array(N);
  // res: {ok, have: Uint8Array(3), cells: Int16Array(3)} (caller-owned, reused every frame)
  function orderCheck(s, o, res) {
    used.fill(0);
    var all = true;
    for (var k = 0; k < 3; k++) { res.have[k] = 0; res.cells[k] = -1; }
    for (var k2 = 0; k2 < o.c.length; k2++) {
      var code = enc(o.c[k2][0], o.c[k2][1]);
      for (var i = 0; i < N; i++) {
        if (!used[i] && s.board[i] === code) { used[i] = 1; res.have[k2] = 1; res.cells[k2] = i; break; }
      }
      if (!res.have[k2]) all = false;
    }
    res.ok = all;
    return all;
  }
  var tmp = { ok: false, have: new Uint8Array(3), cells: new Int16Array(3) };
  function firstDeliverable(s) {
    for (var i = 0; i < s.orders.length; i++) if (orderCheck(s, s.orders[i], tmp)) return i;
    return -1;
  }
  function deliver(s, slot) {
    var o = s.orders[slot];
    if (!o || !orderCheck(s, o, tmp)) return null;
    for (var k = 0; k < o.c.length; k++) s.board[tmp.cells[k]] = 0;
    var prev = s.stars;
    s.coins += o.coins; s.stars += o.stars; s.delivered++;
    s.orders.splice(slot, 1);
    s.tut = 1;
    fillOrders(s);
    return { coins: o.coins, stars: o.stars, unlocks: unlocksBetween(prev, s.stars) };
  }
  function applyDouble(s, r) {
    var prev = s.stars;
    s.coins += r.coins; s.stars += r.stars;
    return unlocksBetween(prev, s.stars);
  }
  function buyEnergy(s) {
    if (s.coins < D.ENERGY_BUY_COST) return false;
    s.coins -= D.ENERGY_BUY_COST; addEnergy(s, D.ENERGY_BUY);
    return true;
  }

  var api = {
    COLS: COLS, ROWS: ROWS, N: N, MAXLV: MAXLV,
    setRng: setRng, mulberry32: mulberry32,
    enc: enc, chainOf: chainOf, lvOf: lvOf,
    newState: newState, sanitize: sanitize,
    genOpen: genOpen, areaOpen: areaOpen, openChains: openChains, unlocksBetween: unlocksBetween,
    regen: regen, spendEnergy: spendEnergy, addEnergy: addEnergy, secToNext: secToNext, secToFull: secToFull,
    emptyCount: emptyCount, spawn: spawn, canMerge: canMerge, drop: drop, mergeAll: mergeAll,
    sell: sell, sellValue: sellValue, pairCount: pairCount, findPair: findPair,
    rewardFor: rewardFor, makeOrder: makeOrder, fillOrders: fillOrders, orderCheck: orderCheck,
    firstDeliverable: firstDeliverable, deliver: deliver, applyDouble: applyDouble, buyEnergy: buyEnergy
  };
  root.CozyCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
