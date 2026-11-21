// Cozy Merge - rendering, input and UI (canvas only). Game rules live in core.js.
(function () {
  'use strict';
  var D = CozyData, C = CozyCore, S = CozyStrings, A = CozyAudio, Ad = AdService, Sp = CozySprites, Sv = CozySave, UI = D.UI;
  var N = C.N, COLS = C.COLS;

  var cv = document.getElementById('c'), g = cv.getContext('2d');
  var W = 360, H = 640, sc = 1, dpr = 1, safeTop = 0;
  var cell = 44, bx = 0, by = 0, boardW = 0, ordY = 0, trayY = 0, actY = 0;
  var ORD_H = 96, TRAY_H = 64, ACT_H = 44;

  var st, dirty = false, lastSave = 0;
  var sprites = [], bgCanvas = null, boardCanvas = null;
  var modal = null, rw = null, sel = -1, drag = null, resetArmed = false;
  var tNow = 0, lastInput = 0, hintAt = -1e9, hintHas = false, hintPair = [0, 0];
  var popT = new Float64Array(N), genT = [0, 0, 0, 0, 0];
  var toast = { text: '', until: 0 };
  var chk = { ok: false, have: new Uint8Array(3), cells: new Int16Array(3) };
  var mx = 0, my = 0, pressedId = null, pressedArg = 0, pressedCell = -1;
  var PX = 0, PY = 0;

  // ------------------------------------------------------------ buttons (rebuilt every frame, hit-tested by input)
  var BT = [], nb = 0, i0;
  for (i0 = 0; i0 < 64; i0++) BT.push({ id: '', x: 0, y: 0, w: 0, h: 0, a: 0 });
  function addBtn(id, x, y, w, h, a) { if (nb >= 64) return; var b = BT[nb++]; b.id = id; b.x = x; b.y = y; b.w = w; b.h = h; b.a = a || 0; }
  function hitBtn(x, y) {
    for (var i = nb - 1; i >= 0; i--) { var b = BT[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; }
    return null;
  }
  function findBtn(id, a) { for (var i = 0; i < nb; i++) if (BT[i].id === id && BT[i].a === a) return BT[i]; return null; }

  // ------------------------------------------------------------ small draw helpers
  var fontCache = {};
  function fnt(size, bold) { var k = size * 2 + (bold ? 1 : 0); return fontCache[k] || (fontCache[k] = (bold ? 'bold ' : '') + size + 'px "Trebuchet MS", "Segoe UI", sans-serif'); }
  function txt(s, x, y, size, color, align, bold) {
    g.font = fnt(size, bold !== false); g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'middle';
    g.fillText(s, x, y);
  }
  function fillRR(x, y, w, h, r, col) { Sp.rrPath(g, x, y, w, h, r); g.fillStyle = col; g.fill(); }
  function strokeRR(x, y, w, h, r, col, lw) { Sp.rrPath(g, x, y, w, h, r); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); }
  function card(x, y, w, h, r, col) { fillRR(x, y + 2, w, h, r, UI.shadow); fillRR(x, y, w, h, r, col); }
  function fmtN(n) { return n >= 10000 ? (((n / 100) | 0) / 10) + 'k' : String(n); }
  function fmtT(sec) { var m = (sec / 60) | 0, s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function eob(k) { k = k - 1; return 1 + 2.7 * k * k * k + 1.7 * k * k; }
  function cxOf(i) { return bx + (i % COLS) * cell + cell / 2; }
  function cyOf(i) { return by + ((i / COLS) | 0) * cell + cell / 2; }
  function cellAt(x, y) {
    if (x < bx || y < by || x >= bx + boardW || y >= by + cell * C.ROWS) return -1;
    return (((y - by) / cell) | 0) * COLS + (((x - bx) / cell) | 0);
  }

  // icons
  function iCoin(x, y, r) { Sp.C(g, x, y, r, UI.gold, UI.goldDark); Sp.C(g, x, y, r * 0.55, '#f9dc78'); }
  function iStar(x, y, r) { Sp.star(g, x, y, r, UI.gold); }
  function iBolt(x, y, s, col) { Sp.P(g, [x + 0.15 * s, y - s, x - 0.65 * s, y + 0.15 * s, x - 0.05 * s, y + 0.15 * s, x - 0.2 * s, y + s, x + 0.65 * s, y - 0.2 * s, x + 0.05 * s, y - 0.2 * s], col); }
  function iPlay(x, y, s, col) { Sp.P(g, [x - s * 0.5, y - s * 0.65, x + s * 0.7, y, x - s * 0.5, y + s * 0.65], col); }
  function iGear(x, y, r, col) {
    for (var i = 0; i < 4; i++) { var a = i * Math.PI / 4; Sp.L(g, x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, col, r * 0.5); }
    Sp.C(g, x, y, r * 0.75, col); Sp.C(g, x, y, r * 0.3, UI.cream);
  }
  function iBin(x, y, s, col) { Sp.R(g, x - s * 0.6, y - s * 0.4, s * 1.2, s * 1.2, 3, col); Sp.L(g, x - s * 0.8, y - s * 0.55, x + s * 0.8, y - s * 0.55, col, 3); Sp.R(g, x - s * 0.25, y - s * 0.9, s * 0.5, s * 0.3, 2, col); }
  function iHouse(x, y, s, col) { Sp.P(g, [x - s, y - s * 0.1, x, y - s * 0.95, x + s, y - s * 0.1], col); Sp.R(g, x - s * 0.7, y - s * 0.1, s * 1.4, s * 0.95, 2, col); Sp.R(g, x - s * 0.2, y + s * 0.3, s * 0.4, s * 0.55, 1, UI.cream); }
  function iLock(x, y, s, col) { g.beginPath(); g.arc(x, y - s * 0.2, s * 0.5, Math.PI, 0); g.strokeStyle = col; g.lineWidth = 3; g.stroke(); Sp.R(g, x - s * 0.7, y - s * 0.1, s * 1.4, s * 1.0, 3, col); }
  function iCheck(x, y, r) { Sp.C(g, x, y, r, UI.mintDark); Sp.L(g, x - r * 0.45, y, x - r * 0.1, y + r * 0.4, '#fff', 2); Sp.L(g, x - r * 0.1, y + r * 0.4, x + r * 0.5, y - r * 0.4, '#fff', 2); }
  function iCross(x, y, s, col) { Sp.L(g, x - s, y - s, x + s, y + s, col, 3); Sp.L(g, x + s, y - s, x - s, y + s, col, 3); }

  var SKIN = ['#f6d3b5', '#e8b88f', '#c98f65', '#8d5a3b'], HAIR = ['#6b4430', '#d9a04a', '#3b2a22', '#c9553b', '#9a8aa6', '#2f2f3b'];
  function drawAvatar(cx, cy, r, who) {
    var hr = HAIR[(who * 5 + 1) % 6];
    Sp.C(g, cx, cy, r + 1.5, hr);
    Sp.C(g, cx, cy + 1, r, SKIN[who % 4]);
    g.beginPath(); g.ellipse(cx, cy - r * 0.35, r * 0.95, r * 0.55, 0, Math.PI, 0); g.fillStyle = hr; g.fill();
    Sp.C(g, cx - r * 0.35, cy + r * 0.1, r * 0.1, '#4a3428'); Sp.C(g, cx + r * 0.35, cy + r * 0.1, r * 0.1, '#4a3428');
    g.beginPath(); g.arc(cx, cy + r * 0.3, r * 0.3, 0.2, Math.PI - 0.2); g.strokeStyle = '#4a3428'; g.lineWidth = 1.3; g.stroke();
    Sp.C(g, cx - r * 0.62, cy + r * 0.38, r * 0.14, 'rgba(240,120,130,.45)'); Sp.C(g, cx + r * 0.62, cy + r * 0.38, r * 0.14, 'rgba(240,120,130,.45)');
    if (who % 3 === 0) { Sp.R(g, cx - r * 0.7, cy - r * 1.15, r * 1.4, r * 0.6, 3, '#fff'); Sp.R(g, cx - r * 0.5, cy - r * 1.6, r * 1.0, r * 0.7, r * 0.3, '#fff'); }
  }

  // ------------------------------------------------------------ particles + floating texts (fixed pools, no allocation)
  var PN = 180, px = new Float32Array(PN), py = new Float32Array(PN), pvx = new Float32Array(PN), pvy = new Float32Array(PN);
  var plife = new Float32Array(PN), pmax = new Float32Array(PN), psz = new Float32Array(PN), pk = new Uint8Array(PN), pcol = [], pHead = 0;
  for (i0 = 0; i0 < PN; i0++) pcol.push('#fff');
  function emit(x, y, n, col, speed, size, kind) {
    for (var i = 0; i < n; i++) {
      var k = pHead; pHead = (pHead + 1) % PN;
      var a = Math.random() * 6.2832, v = speed * (0.4 + Math.random() * 0.8);
      px[k] = x; py[k] = y; pvx[k] = Math.cos(a) * v; pvy[k] = Math.sin(a) * v - (kind === 0 ? speed * 0.3 : 0);
      plife[k] = pmax[k] = 0.35 + Math.random() * 0.35; psz[k] = size * (0.7 + Math.random() * 0.6); pk[k] = kind; pcol[k] = col;
    }
  }
  function drawParticles(dt) {
    for (var i = 0; i < PN; i++) {
      if (plife[i] <= 0) continue;
      plife[i] -= dt; if (plife[i] <= 0) continue;
      px[i] += pvx[i] * dt; py[i] += pvy[i] * dt;
      if (pk[i] === 0) pvy[i] += 220 * dt; else { pvx[i] *= 0.92; pvy[i] *= 0.92; }
      var k = plife[i] / pmax[i];
      g.globalAlpha = pk[i] === 1 ? k * 0.8 : k;
      g.fillStyle = pcol[i];
      g.beginPath(); g.arc(px[i], py[i], pk[i] === 1 ? psz[i] * (1.6 - k * 0.8) : psz[i] * (0.4 + k * 0.6), 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
  }
  var FN = 10, ftT = [], ftX = new Float32Array(FN), ftY = new Float32Array(FN), ftS = [], ftHead = 0, ftC = [];
  for (i0 = 0; i0 < FN; i0++) { ftT.push(-1e9); ftS.push(''); ftC.push(UI.ink); }
  function floatText(s, x, y, col) { var k = ftHead; ftHead = (ftHead + 1) % FN; ftT[k] = tNow; ftS[k] = s; ftX[k] = x; ftY[k] = y; ftC[k] = col || UI.ink; }
  function drawFloats() {
    for (var i = 0; i < FN; i++) {
      var a = (tNow - ftT[i]) / 900; if (a < 0 || a > 1) continue;
      g.globalAlpha = 1 - a * a;
      g.font = fnt(14, true); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(ftS[i], ftX[i], ftY[i] - a * 26);
      g.fillStyle = ftC[i]; g.fillText(ftS[i], ftX[i], ftY[i] - a * 26);
    }
    g.globalAlpha = 1;
  }
  function toastMsg(s) { toast.text = s; toast.until = tNow + 2200; }

  // ------------------------------------------------------------ layout + caches
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = window.innerWidth, ch = window.innerHeight;
    sc = cw / W; H = ch / sc;
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    var sf = document.getElementById('safe'); safeTop = (sf ? sf.offsetHeight : 0) / sc;
    ordY = safeTop + 4 + 34 + 6;
    var boardTop = ordY + ORD_H + 10;
    var below = TRAY_H + 6 + ACT_H + 16 + 8;
    cell = Math.floor(Math.max(28, Math.min(48, (W - 16) / COLS, (H - boardTop - below) / C.ROWS)));
    boardW = cell * COLS; bx = Math.round((W - boardW) / 2);
    actY = Math.max(boardTop + cell * C.ROWS + 8 + TRAY_H + 6, H - 16 - ACT_H);
    trayY = actY - 6 - TRAY_H;
    by = boardTop + Math.min(40, Math.max(0, Math.floor((trayY - 8 - (boardTop + cell * C.ROWS)) / 2)));
    buildSprites(); buildBg();
  }
  function buildSprites() {
    var size = Math.max(24, Math.ceil(cell * sc * dpr));
    sprites = [];
    for (var ch = 0; ch < D.CHAINS.length; ch++) {
      sprites[ch] = [null];
      for (var lv = 1; lv <= C.MAXLV; lv++) {
        var c = document.createElement('canvas'); c.width = c.height = size;
        Sp.drawItem(c.getContext('2d'), ch, lv, size);
        sprites[ch][lv] = c;
      }
    }
  }
  function buildBg() {
    var a = D.AREAS[st ? st.area : 0], k = dpr * sc, b;
    bgCanvas = document.createElement('canvas'); bgCanvas.width = cv.width; bgCanvas.height = cv.height;
    b = bgCanvas.getContext('2d'); b.scale(k, k);
    var gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a.bg0); gr.addColorStop(1, a.bg1);
    b.fillStyle = gr; b.fillRect(0, 0, W, H);
    var r = C.mulberry32(7 + (st ? st.area : 0));
    for (var i = 0; i < 16; i++) { b.fillStyle = 'rgba(255,255,255,' + (0.12 + r() * 0.15).toFixed(2) + ')'; b.beginPath(); b.arc(r() * W, r() * H, 14 + r() * 40, 0, 6.2832); b.fill(); }
    // board panel + tiles
    var pad = 5, bw = boardW + pad * 2, bh = cell * C.ROWS + pad * 2;
    boardCanvas = document.createElement('canvas'); boardCanvas.width = Math.ceil(bw * k); boardCanvas.height = Math.ceil(bh * k);
    var q = boardCanvas.getContext('2d'); q.scale(k, k);
    Sp.rrPath(q, 0, 0, bw, bh, 14); q.fillStyle = a.panel; q.fill(); q.lineWidth = 2; q.strokeStyle = a.accent; q.globalAlpha = 0.5; q.stroke(); q.globalAlpha = 1;
    for (var j = 0; j < N; j++) {
      var x = pad + (j % COLS) * cell, y = pad + ((j / COLS) | 0) * cell;
      Sp.rrPath(q, x + 1.5, y + 1.5, cell - 3, cell - 3, 8); q.fillStyle = ((j % COLS) + ((j / COLS) | 0)) % 2 ? a.tileA : a.tileB; q.fill();
    }
  }

  // ------------------------------------------------------------ gameplay actions
  function chainColor(v) { return D.CHAINS[C.chainOf(v)].color; }
  function mergeFx(i, quiet) {
    var v = st.board[i], lv = C.lvOf(v), x = cxOf(i), y = cyOf(i);
    popT[i] = tNow;
    emit(x, y, 6, '#fffdf6', 60, cell * 0.28, 1);
    emit(x, y, 10, chainColor(v), 120, 3, 0);
    floatText('+' + (1 << (lv - 1)), x, y - cell * 0.35, UI.ink);
    if (!quiet) { A.sfx('merge', lv); A.vibrate(lv >= 5 ? 30 : 12); }
    dirty = true;
  }
  function doDrop(a, b) {
    var r = C.drop(st, a, b);
    if (r === 'merge') mergeFx(b, false);
    else if (r === 'move' || r === 'swap') { popT[b] = tNow; if (r === 'swap') popT[a] = tNow; A.sfx('tap'); dirty = true; }
  }
  function tapCell(i) {
    var v = st.board[i];
    if (sel < 0) { if (v) { sel = i; A.sfx('tap'); } return; }
    if (sel === i) { sel = -1; return; }
    if (!v) { doDrop(sel, i); sel = -1; return; }
    if (C.canMerge(st, sel, i)) { doDrop(sel, i); sel = -1; return; }
    sel = i; A.sfx('tap');
  }
  function tapGen(gi) {
    if (!C.genOpen(st, gi)) { toastMsg(S.fmt(S.needStars, { n: D.GENS[gi].stars })); A.sfx('error'); return; }
    var r = C.spawn(st, gi, Date.now());
    if (r.ok) {
      popT[r.cell] = tNow; genT[gi] = tNow;
      emit(cxOf(r.cell), cyOf(r.cell), 5, '#fffdf6', 50, cell * 0.22, 1);
      A.sfx('pop'); A.vibrate(8); dirty = true;
    } else if (r.why === 'energy') { A.sfx('error'); modal = 'energy'; }
    else if (r.why === 'full') { toastMsg(S.boardFull); A.sfx('error'); A.vibrate(40); }
  }
  function applyUnlocks(u) {
    for (var i = 0; i < u.length; i++) if (u[i].type === 'area') { st.area = u[i].id; buildBg(); }
    if (u.length) A.sfx('unlock');
  }
  function tapDeliver(slot) {
    var res = C.deliver(st, slot);
    if (!res) { A.sfx('error'); return; }
    rw = { coins: res.coins, stars: res.stars, unlocks: res.unlocks, doubled: false };
    applyUnlocks(res.unlocks);
    modal = 'reward'; sel = -1; dirty = true;
    A.sfx('deliver'); A.vibrate(30);
    var cw = (W - 28) / 3; emit(8 + slot * (cw + 6) + cw / 2, ordY + 40, 18, UI.gold, 140, 3.5, 0);
  }
  function adEnergy() {
    if (st.energy >= D.ENERGY_CAP) { toastMsg(S.fullEnergy); return; }
    Ad.show('energy', function () {
      C.addEnergy(st, D.ENERGY_REWARD); dirty = true; A.sfx('reward'); toastMsg('+' + D.ENERGY_REWARD + ' ' + S.energy);
      emit(W - 80, safeTop + 21, 14, UI.gold, 100, 3, 0);
    });
  }
  function adMerge() {
    if (C.pairCount(st) === 0) { toastMsg(S.nothingToMerge); A.sfx('error'); return; }
    Ad.show('mergeAll', function () {
      var cells = C.mergeAll(st);
      for (var i = 0; i < cells.length; i++) mergeFx(cells[i], i > 3);
      toastMsg(S.fmt(S.mergedFmt, { n: cells.length })); A.sfx('reward');
    });
  }
  function adDouble() {
    if (!rw || rw.doubled) return;
    Ad.show('double', function () {
      if (modal !== 'reward' || !rw || rw.doubled) return;
      var u = C.applyDouble(st, rw);
      rw.coins *= 2; rw.stars *= 2; rw.doubled = true; rw.unlocks = rw.unlocks.concat(u);
      applyUnlocks(u); A.sfx('reward'); dirty = true;
    });
  }

  function onButton(id, a) {
    switch (id) {
      case 'noop': return;
      case 'gen': tapGen(a); break;
      case 'deliver': tapDeliver(a); break;
      case 'sell':
        if (sel >= 0 && st.board[sel]) {
          var x = cxOf(sel), y = cyOf(sel), c = C.sell(st, sel);
          emit(x, y, 8, UI.gold, 90, 3, 0); floatText('+' + c, x, y, UI.goldDark); A.sfx('coin'); sel = -1; dirty = true;
        }
        break;
      case 'bakery': modal = 'bakery'; A.sfx('tap'); break;
      case 'settings': modal = 'settings'; resetArmed = false; A.sfx('tap'); break;
      case 'energy': modal = 'energy'; A.sfx('tap'); break;
      case 'adEnergy': adEnergy(); break;
      case 'adMerge': adMerge(); break;
      case 'adDouble': adDouble(); break;
      case 'buyEnergy':
        if (C.buyEnergy(st)) { A.sfx('coin'); toastMsg(S.bought); dirty = true; } else { A.sfx('error'); toastMsg(S.notEnoughCoins); }
        break;
      case 'collect': modal = null; rw = null; A.sfx('tap'); break;
      case 'close': modal = null; resetArmed = false; A.sfx('tap'); break;
      case 'tg':
        var s = st.settings;
        if (a === 0) { s.music = !s.music; A.setMusic(s.music); A.sfx('toggle', s.music); }
        else if (a === 1) { s.sfx = !s.sfx; A.setSfx(s.sfx); A.sfx('toggle', s.sfx); }
        else { s.vib = !s.vib; A.setVib(s.vib); A.sfx('toggle', s.vib); A.vibrate(20); }
        dirty = true; break;
      case 'area':
        if (C.areaOpen(st, a) && st.area !== a) { st.area = a; buildBg(); A.sfx('unlock'); dirty = true; }
        break;
      case 'reset':
        if (!resetArmed) { resetArmed = true; A.sfx('tap'); }
        else { Sv.wipe(); st = C.newState(Date.now()); applySettings(); sel = -1; modal = null; resetArmed = false; buildBg(); dirty = true; }
        break;
    }
  }

  // ------------------------------------------------------------ drawing: main screen
  function pill(x, y, w, h) { fillRR(x, y + 2, w, h, h / 2, UI.shadow); fillRR(x, y, w, h, h / 2, UI.cream); }
  function drawTop() {
    var y = safeTop + 4, h = 34, now = Date.now();
    pill(8, y, 84, h); iCoin(24, y + h / 2, 9); txt(fmtN(st.coins), 38, y + h / 2 + 1, 14, UI.ink);
    pill(98, y, 62, h); iStar(113, y + h / 2, 10); txt(String(st.stars), 127, y + h / 2 + 1, 14, UI.ink);
    var low = st.energy <= 5, pulse = low ? 0.5 + 0.5 * Math.sin(tNow / 180) : 0;
    pill(166, y, 148, h);
    if (low) fillRR(166, y, 148, h, h / 2, 'rgba(244,150,150,' + (0.25 * pulse).toFixed(2) + ')');
    iBolt(183, y + h / 2, 9, UI.gold); txt(st.energy + '/' + D.ENERGY_MAX, 196, y + h / 2 + 1, 13, UI.ink);
    var nx = C.secToNext(st, now);
    txt(nx === null ? S.max : fmtT(nx), 281, y + h / 2 + 1, 11, UI.inkSoft, 'right');
    Sp.C(g, 299, y + h / 2, 9, UI.mint); Sp.L(g, 294.5, y + h / 2, 303.5, y + h / 2, UI.ink, 2); Sp.L(g, 299, y + h / 2 - 4.5, 299, y + h / 2 + 4.5, UI.ink, 2);
    addBtn('energy', 166, y, 148, h);
    Sp.C(g, W - 23, y + h / 2, 15, UI.cream); iGear(W - 23, y + h / 2, 8, UI.ink);
    addBtn('settings', W - 40, y, 34, h);
  }
  function drawOrders() {
    var cw = (W - 28) / 3, h = ORD_H;
    for (var i = 0; i < 3; i++) {
      var x = 8 + i * (cw + 6), y = ordY, o = st.orders[i];
      if (!o) { fillRR(x, y, cw, h, 12, 'rgba(255,255,255,.35)'); continue; }
      C.orderCheck(st, o, chk);
      card(x, y, cw, h, 12, UI.cream);
      if (chk.ok) { strokeRR(x, y, cw, h, 12, UI.mintDark, 2.5); }
      drawAvatar(x + 17, y + 18, 11, o.who);
      iCoin(x + 41, y + 16, 5.5); txt(fmtN(o.coins), x + 49, y + 17, 11, UI.ink);
      iStar(x + 41, y + 31, 6); txt(String(o.stars), x + 49, y + 32, 11, UI.ink);
      var n = o.c.length, startX = x + (cw - (n * 30 + (n - 1) * 4)) / 2;
      for (var k = 0; k < n; k++) {
        var ix = startX + k * 34, iy = y + 42, have = chk.have[k];
        fillRR(ix - 1, iy - 1, 32, 32, 8, have ? 'rgba(191,230,204,.55)' : 'rgba(107,79,63,.07)');
        g.globalAlpha = have ? 1 : 0.5;
        g.drawImage(sprites[o.c[k][0]][o.c[k][1]], ix, iy, 30, 30);
        g.globalAlpha = 1;
        if (have) iCheck(ix + 27, iy + 3, 6);
      }
      var by2 = y + h - 24, bw = cw - 12;
      if (chk.ok) {
        var gl = 0.5 + 0.5 * Math.sin(tNow / 220);
        fillRR(x + 6 - gl * 2, by2 - gl * 2, bw + gl * 4, 20 + gl * 4, 11, 'rgba(121,184,142,.3)');
        fillRR(x + 6, by2, bw, 20, 10, UI.mintDark);
        txt(S.deliver, x + cw / 2, by2 + 11, 12, '#fff', 'center');
        addBtn('deliver', x + 2, by2 - 4, cw - 4, 28, i);
      } else {
        fillRR(x + 6, by2, bw, 20, 10, 'rgba(107,79,63,.08)');
        txt(S.deliver, x + cw / 2, by2 + 11, 12, 'rgba(107,79,63,.35)', 'center');
      }
    }
  }
  function drawBoard() {
    var pad = 5, k = 1;
    g.drawImage(boardCanvas, bx - pad, by - pad, boardW + pad * 2, cell * C.ROWS + pad * 2);
    // merge targets for the selected / dragged item
    var from = drag && drag.active ? drag.from : sel, i, pul = 0.5 + 0.5 * Math.sin(tNow / 200);
    if (from >= 0 && st.board[from]) {
      for (i = 0; i < N; i++) if (C.canMerge(st, from, i)) fillRR(bx + (i % COLS) * cell + 2, by + ((i / COLS) | 0) * cell + 2, cell - 4, cell - 4, 9, 'rgba(121,184,142,' + (0.25 + 0.2 * pul).toFixed(2) + ')');
    }
    // idle / tutorial hint
    var showHint = hintHas && !modal && !drag && (st.tut === 0 || tNow - lastInput > 6000);
    if (showHint) {
      for (var h = 0; h < 2; h++) {
        var hi = hintPair[h];
        strokeRR(bx + (hi % COLS) * cell + 2, by + ((hi / COLS) | 0) * cell + 2, cell - 4, cell - 4, 9, 'rgba(233,163,107,' + (0.45 + 0.5 * pul).toFixed(2) + ')', 3);
      }
    }
    for (i = 0; i < N; i++) {
      var v = st.board[i]; if (!v) continue;
      if (drag && drag.active && drag.from === i) continue;
      var age = tNow - popT[i], s = 1;
      if (age < 280) s = 0.35 + 0.65 * eob(age / 280);
      var size = cell * 0.94 * s, x = bx + (i % COLS) * cell + (cell - size) / 2, y = by + ((i / COLS) | 0) * cell + (cell - size) / 2;
      if (i === sel) { y -= 3; strokeRR(bx + (i % COLS) * cell + 1.5, by + ((i / COLS) | 0) * cell + 1.5, cell - 3, cell - 3, 9, UI.mintDark, 3); }
      g.drawImage(sprites[C.chainOf(v)][C.lvOf(v)], x, y, size, size);
    }
    if (drag && drag.active) {
      var dv = st.board[drag.from], ds = cell * 1.12;
      Sp.E(g, drag.x, drag.y + ds * 0.35, ds * 0.32, ds * 0.1, 'rgba(107,79,63,.2)');
      g.drawImage(sprites[C.chainOf(dv)][C.lvOf(dv)], drag.x - ds / 2, drag.y - ds / 2 - 12, ds, ds);
    }
  }
  function drawTray() {
    var bw = (W - 16 - 24) / 5, now = Date.now();
    for (var i = 0; i < 5; i++) {
      var x = 8 + i * (bw + 6), y = trayY, open = C.genOpen(st, i), ch = D.GENS[i].chain, c = D.CHAINS[ch];
      var pr = pressedId === 'gen' && pressedArg === i ? 2 : 0, bounce = tNow - genT[i] < 200 ? 3 * Math.sin((tNow - genT[i]) / 200 * Math.PI) : 0;
      y += pr - bounce * 0.5;
      card(x, y, bw, TRAY_H, 14, open ? c.plate : 'rgba(255,255,255,.55)');
      if (open) {
        strokeRR(x, y, bw, TRAY_H, 14, c.color, 2);
        g.drawImage(sprites[ch][1], x + (bw - 38) / 2, y + 4 - bounce, 38, 38);
        txt(S.genNames[i], x + bw / 2, y + 50, 9.5, UI.ink, 'center');
        fillRR(x + bw - 27, y + 3, 24, 14, 7, st.energy > 0 ? UI.cream : 'rgba(244,150,150,.9)');
        iBolt(x + bw - 20, y + 10, 4.5, UI.goldDark); txt('1', x + bw - 12, y + 11, 9.5, UI.ink, 'left');
      } else {
        iLock(x + bw / 2, y + 20, 10, UI.inkSoft);
        iStar(x + bw / 2 - 9, y + 46, 6); txt(String(D.GENS[i].stars), x + bw / 2 - 2, y + 47, 11, UI.inkSoft, 'left');
      }
      addBtn('gen', x, y, bw, TRAY_H, i);
    }
  }
  function adLabel(p, label, now) {
    var s = Ad.status(p, now);
    if (s.state === 'watching') return { a: label, b: S.watching + ' ' + s.sec, off: true };
    if (s.state === 'cooldown') return { a: label, b: S.fmt(S.waitFmt, { s: s.sec }), off: true };
    return { a: label, b: S.freeBadge, off: false };
  }
  function actBtn(i, id, icon, top, sub, enabled, play) {
    var bw = (W - 16 - 18) / 4, x = 8 + i * (bw + 6), y = actY, pr = pressedId === id ? 1.5 : 0;
    card(x, y + pr, bw, ACT_H, 13, enabled ? UI.cream : 'rgba(255,248,236,.6)');
    var col = enabled ? UI.ink : 'rgba(107,79,63,.4)';
    icon(x + 13, y + ACT_H / 2 + pr, col);
    txt(top, x + 27, y + 16 + pr, 9.5, col, 'left');
    txt(sub, x + 27, y + 31 + pr, 9.5, enabled ? (play ? UI.mintDark : UI.inkSoft) : 'rgba(107,79,63,.4)', 'left');
    if (play && enabled) { Sp.C(g, x + bw - 11, y + ACT_H - 13, 6, UI.mintDark); iPlay(x + bw - 10.5, y + ACT_H - 13, 4.5, '#fff'); }
    addBtn(id, x, y, bw, ACT_H);
  }
  function drawActions() {
    var now = Date.now(), i;
    var hasSel = sel >= 0 && st.board[sel];
    actBtn(0, 'sell', function (x, y, c) { iBin(x, y, 8, c); }, S.sell, hasSel ? '+' + C.sellValue(st.board[sel]) : '-', !!hasSel, false);
    var nextStars = -1;
    for (i = 0; i < D.GENS.length; i++) if (D.GENS[i].stars > st.stars && (nextStars < 0 || D.GENS[i].stars < nextStars)) nextStars = D.GENS[i].stars;
    for (i = 0; i < D.AREAS.length; i++) if (D.AREAS[i].stars > st.stars && (nextStars < 0 || D.AREAS[i].stars < nextStars)) nextStars = D.AREAS[i].stars;
    actBtn(1, 'bakery', function (x, y, c) { iHouse(x, y, 8, c); }, S.bakery, nextStars < 0 ? '' : st.stars + '/' + nextStars, true, false);
    var e = adLabel('energy', S.energyPlus, now);
    actBtn(2, 'adEnergy', function (x, y, c) { iBolt(x, y, 9, e.off ? c : UI.gold); }, S.energyPlus, e.b, !e.off, true);
    var m = adLabel('mergeAll', S.mergeAll, now);
    actBtn(3, 'adMerge', function (x, y, c) { Sp.C(g, x - 3, y, 5, c); Sp.C(g, x + 4, y, 5, c); Sp.L(g, x - 6, y - 8, x + 7, y - 8, c, 2); }, S.mergeAll, m.b, !m.off, true);
  }

  // ------------------------------------------------------------ tutorial hand (no text)
  function drawHand(x, y, press, alpha) {
    g.save(); g.globalAlpha = alpha; g.translate(x, y);
    Sp.E(g, 4, 34, 14, 4, 'rgba(107,79,63,.18)');
    Sp.R(g, -6, 0, 12, 28, 6, '#ffffff', '#c9a98f');
    Sp.R(g, -12, 18, 24, 20, 9, '#ffffff', '#c9a98f');
    if (press) { g.beginPath(); g.arc(0, 0, 14, 0, 6.2832); g.strokeStyle = 'rgba(233,163,107,.8)'; g.lineWidth = 3; g.stroke(); }
    g.restore();
  }
  function drawTutorial() {
    if (st.tut !== 0 || modal) return;
    var d = findBtn('deliver', 0) || findBtn('deliver', 1) || findBtn('deliver', 2);
    var t = tNow % 1800 / 1800, bob;
    if (d) { bob = Math.sin(tNow / 140) * 4; drawHand(d.x + d.w / 2, d.y + d.h / 2 + 4 + bob, bob > 1, 1); return; }
    if (hintHas && !drag) {
      var a = hintPair[0], b = hintPair[1], k = t < 0.2 ? 0 : t < 0.7 ? (t - 0.2) / 0.5 : 1;
      k = k * k * (3 - 2 * k);
      var al = t > 0.88 ? (1 - t) / 0.12 : 1;
      drawHand(cxOf(a) + (cxOf(b) - cxOf(a)) * k, cyOf(a) + 6 + (cyOf(b) - cyOf(a)) * k, k > 0 && k < 1, al);
      return;
    }
    var gb = findBtn('gen', 0);
    if (gb) { bob = Math.sin(tNow / 140) * 4; drawHand(gb.x + gb.w / 2, gb.y + 16 + bob, bob > 1, 1); }
  }

  // ------------------------------------------------------------ modals
  function panel(w, h, closeable) {
    g.fillStyle = 'rgba(70,45,30,.5)'; g.fillRect(0, 0, W, H);
    PX = (W - w) / 2; PY = Math.max(safeTop + 8, (H - h) / 2);
    nb = 0;
    if (closeable) addBtn('close', 0, 0, W, H);
    addBtn('noop', PX, PY, w, h);
    card(PX, PY, w, h, 20, UI.cream);
    if (closeable) { Sp.C(g, PX + w - 22, PY + 22, 13, 'rgba(107,79,63,.1)'); iCross(PX + w - 22, PY + 22, 5, UI.ink); addBtn('close', PX + w - 40, PY + 4, 36, 36); }
  }
  function bigBtn(id, a, x, y, w, h, label, col, tcol, sub) {
    var pr = pressedId === id && pressedArg === a ? 1.5 : 0;
    fillRR(x, y + 2 + pr, w, h, h / 2, UI.shadow); fillRR(x, y + pr, w, h, h / 2, col);
    if (sub) { txt(label, x + w / 2, y + h * 0.38 + pr, 13, tcol, 'center'); txt(sub, x + w / 2, y + h * 0.74 + pr, 10, tcol, 'center'); }
    else txt(label, x + w / 2, y + h / 2 + 1 + pr, 13, tcol, 'center');
    addBtn(id, x, y, w, h, a);
  }
  function drawSettings() {
    var w = 300, h = 352; panel(w, h, true);
    txt(S.settings, PX + w / 2, PY + 28, 18, UI.ink, 'center');
    var rows = [[S.music, st.settings.music], [S.sfx, st.settings.sfx], [S.vibration, st.settings.vib]];
    for (var i = 0; i < 3; i++) {
      var y = PY + 54 + i * 44, on = rows[i][1];
      fillRR(PX + 14, y, w - 28, 38, 12, 'rgba(107,79,63,.06)');
      txt(rows[i][0], PX + 28, y + 20, 14, UI.ink, 'left');
      fillRR(PX + w - 78, y + 7, 48, 24, 12, on ? UI.mintDark : 'rgba(107,79,63,.25)');
      Sp.C(g, PX + w - 78 + (on ? 36 : 12), y + 19, 9, '#fff');
      addBtn('tg', PX + 14, y, w - 28, 38, i);
    }
    var sy = PY + 54 + 3 * 44 + 8;
    txt(S.statBest, PX + 28, sy + 8, 12, UI.inkSoft, 'left'); txt('Lv ' + st.bestLevel, PX + w - 28, sy + 8, 12, UI.ink, 'right');
    txt(S.statOrders, PX + 28, sy + 30, 12, UI.inkSoft, 'left'); txt(String(st.delivered), PX + w - 28, sy + 30, 12, UI.ink, 'right');
    txt(S.statScore, PX + 28, sy + 52, 12, UI.inkSoft, 'left'); txt(fmtN(st.score), PX + w - 28, sy + 52, 12, UI.ink, 'right');
    bigBtn('reset', 0, PX + 30, PY + h - 92, w - 60, 34, resetArmed ? S.resetConfirm : S.reset, resetArmed ? '#f2a0a0' : 'rgba(107,79,63,.12)', resetArmed ? '#fff' : UI.ink);
    bigBtn('close', 0, PX + 30, PY + h - 50, w - 60, 36, S.close, UI.mintDark, '#fff');
  }
  function drawScene(a, x, y, w, h, locked) {
    var th = D.AREAS[a];
    fillRR(x, y, w, h, 10, th.bg1);
    g.save(); Sp.rrPath(g, x, y, w, h, 10); g.clip();
    fillRR(x, y, w, h * 0.62, 0, th.bg0);
    if (a === 0) {
      fillRR(x + w * 0.1, y + 8, w * 0.28, h * 0.32, 4, '#cfe8f7'); Sp.L(g, x + w * 0.24, y + 8, x + w * 0.24, y + 8 + h * 0.32, '#fff', 2);
      fillRR(x, y + h * 0.62, w, h * 0.38, 0, '#c99a62'); fillRR(x + w * 0.5, y + h * 0.28, w * 0.4, h * 0.36, 6, '#8a8a99'); fillRR(x + w * 0.56, y + h * 0.38, w * 0.28, h * 0.2, 4, '#f2b05c');
      Sp.E(g, x + w * 0.22, y + h * 0.58, 12, 6, '#e8ae68');
    } else {
      Sp.C(g, x + w * 0.82, y + 14, 8, '#fde58a');
      Sp.P(g, [x + w * 0.2, y + h * 0.38, x + w * 0.46, y + h * 0.38, x + w * 0.33, y + h * 0.16], '#f4a2b8'); Sp.L(g, x + w * 0.33, y + h * 0.38, x + w * 0.33, y + h * 0.7, '#9a6a3c', 3);
      fillRR(x, y + h * 0.7, w, h * 0.3, 0, '#9ad0a6'); Sp.E(g, x + w * 0.33, y + h * 0.72, 16, 4, '#fffdf8');
      Sp.C(g, x + w * 0.7, y + h * 0.78, 4, '#f4a2b8'); Sp.C(g, x + w * 0.8, y + h * 0.84, 4, '#fde58a'); Sp.C(g, x + w * 0.6, y + h * 0.86, 4, '#fff');
    }
    if (locked) { g.fillStyle = 'rgba(255,248,236,.7)'; g.fillRect(x, y, w, h); iLock(x + w / 2, y + h / 2 - 2, 12, UI.inkSoft); }
    g.restore();
  }
  function drawBakery() {
    var w = 336, h = Math.min(424, H - 20); panel(w, h, true);
    txt(S.bakeryTitle, PX + w / 2, PY + 28, 18, UI.ink, 'center');
    var i, y = PY + 48;
    for (i = 0; i < D.AREAS.length; i++) {
      var open = C.areaOpen(st, i), act = st.area === i;
      fillRR(PX + 12, y, w - 24, 92, 14, act ? 'rgba(191,230,204,.5)' : 'rgba(107,79,63,.05)');
      drawScene(i, PX + 20, y + 8, 120, 76, !open);
      txt(S.areas[i].name, PX + 150, y + 22, 14, UI.ink, 'left');
      txt(S.areas[i].desc, PX + 150, y + 40, 10, UI.inkSoft, 'left', false);
      if (open) {
        if (act) txt(S.areaActive, PX + 150, y + 70, 12, UI.mintDark, 'left');
        else bigBtn('area', i, PX + 150, y + 56, 90, 26, S.areaSelect, UI.mintDark, '#fff');
      } else {
        iStar(PX + 158, y + 66, 7); txt(st.stars + '/' + D.AREAS[i].stars, PX + 168, y + 67, 12, UI.ink, 'left');
        fillRR(PX + 150, y + 76, 150, 6, 3, 'rgba(107,79,63,.12)'); fillRR(PX + 150, y + 76, 150 * Math.min(1, st.stars / D.AREAS[i].stars), 6, 3, UI.gold);
      }
      y += 98;
    }
    txt(S.generators, PX + 18, y + 8, 13, UI.ink, 'left');
    y += 22;
    for (i = 0; i < 5; i++) {
      var ok = C.genOpen(st, i), ch = D.GENS[i].chain;
      g.globalAlpha = ok ? 1 : 0.5; g.drawImage(sprites[ch][1], PX + 18, y - 2, 24, 24); g.globalAlpha = 1;
      txt(S.genNames[i], PX + 50, y + 11, 12, UI.ink, 'left');
      if (ok) txt(S.unlocked, PX + w - 18, y + 11, 11, UI.mintDark, 'right');
      else { txt(String(D.GENS[i].stars), PX + w - 18, y + 11, 12, UI.inkSoft, 'right'); iStar(PX + w - 18 - (String(D.GENS[i].stars).length * 7 + 10), y + 11, 6); }
      y += 26;
    }
  }
  function drawEnergy() {
    var w = 300, h = 290, now = Date.now(); panel(w, h, true);
    txt(S.energyTitle, PX + w / 2, PY + 28, 18, UI.ink, 'center');
    iBolt(PX + w / 2 - 44, PY + 70, 18, UI.gold); txt(st.energy + ' / ' + D.ENERGY_MAX, PX + w / 2 - 20, PY + 71, 26, UI.ink, 'left');
    var nx = C.secToNext(st, now);
    txt(nx === null ? S.fullEnergy : S.fmt(S.nextEnergyFmt, { t: fmtT(nx) }), PX + w / 2, PY + 104, 12, UI.inkSoft, 'center');
    if (nx !== null) txt(S.fmt(S.fullInFmt, { t: fmtT(C.secToFull(st, now)) }), PX + w / 2, PY + 122, 11, UI.inkSoft, 'center', false);
    var e = adLabel('energy', S.watchEnergy, now);
    bigBtn('adEnergy', 0, PX + 24, PY + 140, w - 48, 44, e.off ? e.b : S.watchEnergy, e.off ? 'rgba(107,79,63,.15)' : UI.mintDark, e.off ? UI.inkSoft : '#fff');
    bigBtn('buyEnergy', 0, PX + 24, PY + 194, w - 48, 38, S.fmt(S.buyEnergyFmt, { n: D.ENERGY_BUY_COST }), st.coins >= D.ENERGY_BUY_COST ? UI.gold : 'rgba(107,79,63,.15)', st.coins >= D.ENERGY_BUY_COST ? UI.ink : UI.inkSoft);
    bigBtn('close', 0, PX + 24, PY + h - 46, w - 48, 32, S.close, 'rgba(107,79,63,.12)', UI.ink);
  }
  function drawReward() {
    var lines = rw.unlocks.length, w = 290, h = 282 + lines * 24; panel(w, h, false);
    txt(S.orderDone, PX + w / 2, PY + 30, 19, UI.ink, 'center');
    var y = PY + 78;
    iCoin(PX + w / 2 - 66, y, 15); txt('+' + rw.coins, PX + w / 2 - 44, y + 1, 26, UI.ink, 'left');
    iStar(PX + w / 2 - 66, y + 42, 16); txt('+' + rw.stars, PX + w / 2 - 44, y + 43, 26, UI.ink, 'left');
    var uy = y + 86;
    for (var i = 0; i < lines; i++) {
      var u = rw.unlocks[i], nm = u.type === 'gen' ? S.fmt(S.newGen, { name: S.genNames[u.id] }) : S.fmt(S.newArea, { name: S.areas[u.id].name });
      txt(nm, PX + w / 2, uy + i * 24, 13, UI.mintDark, 'center');
    }
    var by0 = PY + h - 106, watching = Ad.status('double', Date.now()).state === 'watching';
    if (!rw.doubled) {
      var d = Ad.status('double', Date.now());
      bigBtn('adDouble', 0, PX + 22, by0, w - 44, 44, d.state === 'watching' ? S.watching + ' ' + d.sec : S.doubleReward + ' x2', d.state === 'watching' ? 'rgba(107,79,63,.15)' : UI.gold, d.state === 'watching' ? UI.inkSoft : UI.ink, d.state === 'watching' ? null : S.freeBadge);
    }
    if (!watching) bigBtn('collect', 0, PX + 22, PY + h - 52, w - 44, 38, S.collect, UI.mintDark, '#fff');
  }
  function drawModal() {
    if (modal === 'settings') drawSettings();
    else if (modal === 'bakery') drawBakery();
    else if (modal === 'energy') drawEnergy();
    else if (modal === 'reward' && rw) drawReward();
  }

  // ------------------------------------------------------------ frame
  var lastT = 0;
  function frame(ts) {
    var dt = Math.min(0.05, (ts - lastT) / 1000); lastT = ts; tNow = ts;
    var now = Date.now();
    Ad.update(now);
    if (C.regen(st, now)) dirty = true;
    if (ts - hintAt > 300) { hintAt = ts; hintHas = C.findPair(st, hintPair); }
    if (sel >= 0 && !st.board[sel]) sel = -1;

    g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    g.drawImage(bgCanvas, 0, 0, W, H);
    nb = 0;
    drawTop(); drawOrders(); drawBoard(); drawTray(); drawActions();
    drawParticles(dt); drawFloats();
    drawTutorial();
    if (tNow < toast.until) {
      var a = Math.min(1, (toast.until - tNow) / 300);
      g.globalAlpha = a; g.font = fnt(12, true);
      var tw = g.measureText(toast.text).width + 28;
      fillRR((W - tw) / 2, trayY - 38, tw, 28, 14, 'rgba(107,79,63,.9)');
      txt(toast.text, W / 2, trayY - 23, 12, '#fff', 'center'); g.globalAlpha = 1;
    }
    if (modal) drawModal();

    if (dirty && now - lastSave > 1500) { Sv.write(st); dirty = false; lastSave = now; }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ input
  function setP(e) { mx = e.clientX / sc; my = e.clientY / sc; }
  function onDown(e) {
    e.preventDefault(); A.init(); lastInput = tNow; setP(e);
    var b = hitBtn(mx, my);
    if (b) { pressedId = b.id; pressedArg = b.a; return; }
    if (modal) return;
    var i = cellAt(mx, my); pressedCell = i;
    if (i >= 0 && st.board[i]) drag = { from: i, x: mx, y: my, sx: mx, sy: my, active: false };
  }
  function onMove(e) {
    setP(e);
    if (!drag) return;
    drag.x = mx; drag.y = my;
    if (!drag.active && (Math.abs(mx - drag.sx) > 7 || Math.abs(my - drag.sy) > 7)) { drag.active = true; sel = -1; }
  }
  function onUp(e) {
    e.preventDefault(); setP(e); lastInput = tNow;
    if (pressedId) {
      var b = hitBtn(mx, my);
      if (b && b.id === pressedId && b.a === pressedArg) onButton(b.id, b.a);
      pressedId = null; return;
    }
    if (modal) { drag = null; return; }
    if (drag) {
      if (drag.active) { var t = cellAt(mx, my); if (t >= 0 && t !== drag.from) doDrop(drag.from, t); }
      else tapCell(drag.from);
      drag = null; pressedCell = -1; return;
    }
    if (pressedCell >= 0 && pressedCell === cellAt(mx, my)) tapCell(pressedCell);
    pressedCell = -1;
  }
  function onCancel() { drag = null; pressedId = null; pressedCell = -1; }

  function applySettings() { A.setMusic(st.settings.music); A.setSfx(st.settings.sfx); A.setVib(st.settings.vib); }
  function save() { Sv.write(st); dirty = false; lastSave = Date.now(); }

  // ------------------------------------------------------------ boot
  st = C.sanitize(Sv.load(), Date.now());
  C.regen(st, Date.now());
  applySettings();
  layout();
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onCancel);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', function () { setTimeout(layout, 200); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) save(); else { C.regen(st, Date.now()); lastInput = tNow; }
  });
  window.addEventListener('pagehide', save);
  requestAnimationFrame(frame);

  // test hook (used by tools/smoke.js headless test; harmless in production)
  window.__cozy = {
    get state() { return st; }, core: C, get modal() { return modal; },
    xy: function (i) { return [cxOf(i) * sc, cyOf(i) * sc]; },
    btn: function (id, a) { var b = findBtn(id, a || 0); return b ? [(b.x + b.w / 2) * sc, (b.y + b.h / 2) * sc] : null; }
  };
})();
