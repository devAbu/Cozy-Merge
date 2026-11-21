// Cozy Merge - every item is drawn in code on a 100x100 canvas (original art, no assets).
// Sprites are rendered once into offscreen canvases and then blitted with drawImage.
(function (root) {
  'use strict';
  var TAU = Math.PI * 2;

  function E(g, x, y, rx, ry, f, s) {
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = f; g.fill();
    if (s) { g.strokeStyle = s; g.lineWidth = 2; g.stroke(); }
  }
  function C(g, x, y, r, f, s) { E(g, x, y, r, r, f, s); }
  function rrPath(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function R(g, x, y, w, h, r, f, s) {
    rrPath(g, x, y, w, h, r); g.fillStyle = f; g.fill();
    if (s) { g.strokeStyle = s; g.lineWidth = 2; g.stroke(); }
  }
  function P(g, pts, f, s) {
    g.beginPath(); g.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath(); g.fillStyle = f; g.fill();
    if (s) { g.strokeStyle = s; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke(); }
  }
  function L(g, x0, y0, x1, y1, col, w) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
    g.strokeStyle = col; g.lineWidth = w || 3; g.lineCap = 'round'; g.stroke();
  }
  function star(g, cx, cy, r, f) {
    var p = [];
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    P(g, p, f);
  }

  // item drawers [chain][level-1]; 100x100 box
  var ITEMS = [
    [ // ---- bread: flour -> dough -> roll -> loaf -> braid -> grand loaf
      function (g) { E(g, 50, 74, 32, 13, '#e6d8bf'); E(g, 50, 64, 25, 16, '#fbf2e0'); E(g, 50, 54, 15, 10, '#fffaf0'); C(g, 62, 66, 2.5, '#e6d8bf'); C(g, 38, 62, 2, '#e6d8bf'); },
      function (g) { E(g, 50, 64, 35, 24, '#efd29b'); E(g, 50, 60, 31, 19, '#f6e0b4'); E(g, 38, 52, 11, 6, 'rgba(255,255,255,.6)'); },
      function (g) { E(g, 50, 64, 37, 25, '#cf8a42'); E(g, 50, 58, 31, 19, '#e8ae68'); L(g, 38, 50, 44, 64, '#c0742f', 3); L(g, 50, 48, 54, 64, '#c0742f', 3); L(g, 62, 50, 64, 64, '#c0742f', 3); },
      function (g) { R(g, 10, 40, 80, 42, 20, '#c9803a'); R(g, 14, 42, 72, 24, 14, '#e6aa62'); L(g, 30, 46, 38, 62, '#bf7430', 4); L(g, 48, 45, 56, 62, '#bf7430', 4); L(g, 66, 46, 74, 62, '#bf7430', 4); },
      function (g) { R(g, 10, 44, 80, 38, 18, '#c9803a'); for (var i = 0; i < 5; i++) { C(g, 22 + i * 14, 56 + (i % 2 ? 7 : -3), 11, i % 2 ? '#e0a057' : '#eeb872'); } E(g, 42, 42, 14, 4, 'rgba(255,255,255,.4)'); },
      function (g) { E(g, 50, 84, 44, 9, '#fffdf8', '#eadfce'); R(g, 12, 40, 76, 42, 20, '#c9803a'); R(g, 16, 43, 68, 24, 14, '#e8ae68'); L(g, 32, 47, 38, 62, '#bf7430', 4); L(g, 50, 46, 56, 62, '#bf7430', 4); L(g, 68, 47, 74, 62, '#bf7430', 4); star(g, 50, 26, 15, '#f4c542'); }
    ],
    [ // ---- eggs: egg -> custard -> cream puff -> eclair -> cake slice -> layer cake
      function (g) { E(g, 50, 82, 20, 5, 'rgba(107,79,63,.12)'); E(g, 50, 56, 22, 28, '#fff6e8', '#e8d2b0'); E(g, 42, 46, 6, 10, 'rgba(255,255,255,.85)'); },
      function (g) { R(g, 26, 44, 48, 38, 12, '#fffdf8', '#e2d3c0'); E(g, 50, 46, 24, 8, '#f9d26b'); E(g, 42, 44, 8, 3, '#fde9a6'); },
      function (g) { E(g, 50, 64, 36, 22, '#e6b06a'); E(g, 50, 52, 28, 12, '#fffaf0'); C(g, 50, 41, 10, '#fffaf0'); C(g, 50, 36, 5, '#fffaf0'); },
      function (g) { R(g, 8, 44, 84, 34, 17, '#e0ad66'); R(g, 10, 42, 80, 18, 9, '#7b4b38'); L(g, 24, 49, 40, 49, '#fff3e0', 3); L(g, 48, 49, 64, 49, '#fff3e0', 3); E(g, 30, 46, 10, 3, 'rgba(255,255,255,.3)'); },
      function (g) { P(g, [10, 76, 90, 76, 90, 46, 10, 36], '#fbe3b6', '#e0c590'); P(g, [10, 60, 90, 62, 90, 70, 10, 70], '#f4b6c2'); P(g, [10, 36, 90, 46, 90, 54, 10, 46], '#fffaf0'); C(g, 72, 38, 8, '#d94a5a'); L(g, 72, 31, 76, 22, '#6b8a4a', 3); },
      function (g) { R(g, 14, 64, 72, 20, 7, '#f6c2cd'); R(g, 20, 46, 60, 20, 7, '#fff3e0'); R(g, 26, 30, 48, 18, 7, '#f6c2cd'); C(g, 50, 24, 7, '#d94a5a'); R(g, 34, 18, 3, 12, 1, '#a8d8f0'); R(g, 63, 18, 3, 12, 1, '#f9e08a'); E(g, 50, 66, 30, 3, 'rgba(255,255,255,.5)'); }
    ],
    [ // ---- dairy: milk -> cream -> butter -> cheese -> cheese wheel -> cheese board
      function (g) { R(g, 36, 36, 28, 46, 9, '#ffffff', '#cfd9e6'); R(g, 42, 24, 16, 16, 5, '#ffffff', '#cfd9e6'); R(g, 41, 18, 18, 8, 3, '#7fb2e5'); R(g, 36, 56, 28, 14, 0, '#a9cdf2'); },
      function (g) { E(g, 50, 66, 36, 18, '#cfe3f5'); E(g, 50, 60, 31, 12, '#ffffff'); E(g, 50, 50, 20, 10, '#fffdf8'); C(g, 50, 42, 8, '#fffdf8'); },
      function (g) { R(g, 14, 46, 72, 36, 8, '#fbe38a', '#e6c85c'); R(g, 14, 46, 72, 13, 8, '#fff1b0'); R(g, 14, 64, 72, 8, 0, '#f2c94c'); L(g, 22, 52, 40, 52, '#fffbe0', 3); },
      function (g) { P(g, [10, 78, 90, 78, 90, 42], '#f6cf55', '#e0b030'); P(g, [10, 78, 90, 42, 10, 56], '#fbe08a', '#e0b030'); C(g, 62, 66, 5, '#e0b030'); C(g, 44, 69, 4, '#e0b030'); C(g, 76, 56, 3, '#e0b030'); },
      function (g) { E(g, 50, 70, 38, 14, '#e2b43a'); R(g, 12, 44, 76, 26, 0, '#f6cf55'); E(g, 50, 44, 38, 14, '#fbe08a'); C(g, 36, 62, 5, '#e2b43a'); C(g, 62, 56, 6, '#e2b43a'); C(g, 72, 66, 3.5, '#e2b43a'); P(g, [50, 44, 88, 44, 88, 70, 50, 56], '#d8a62c'); },
      function (g) { R(g, 6, 66, 88, 20, 8, '#c99a62'); E(g, 34, 56, 24, 12, '#e2b43a'); R(g, 10, 40, 48, 18, 0, '#f6cf55'); E(g, 34, 40, 24, 10, '#fbe08a'); C(g, 28, 52, 4, '#e2b43a'); C(g, 72, 58, 7, '#8a4bb0'); C(g, 82, 62, 7, '#8a4bb0'); C(g, 76, 50, 7, '#a65fc9'); C(g, 66, 66, 6, '#a65fc9'); L(g, 76, 44, 78, 38, '#6b8a4a', 3); }
    ],
    [ // ---- fruit: berry -> jam jar -> compote -> tart -> pie -> basket
      function (g) { E(g, 50, 82, 20, 5, 'rgba(107,79,63,.12)'); C(g, 50, 58, 25, '#e0455b'); P(g, [50, 34, 40, 28, 46, 38], '#6faf5e'); P(g, [50, 34, 60, 27, 54, 38], '#86c673'); C(g, 42, 52, 4, 'rgba(255,255,255,.7)'); C(g, 58, 62, 2, '#f7a1ad'); C(g, 46, 68, 2, '#f7a1ad'); C(g, 62, 52, 2, '#f7a1ad'); },
      function (g) { R(g, 28, 40, 44, 44, 10, '#c53b55', '#a52c44'); R(g, 25, 30, 50, 13, 4, '#f4d7a5', '#d9b878'); R(g, 36, 56, 28, 15, 3, '#fff3e4'); C(g, 50, 63, 4, '#e0455b'); },
      function (g) { E(g, 50, 70, 36, 14, '#e8e0f5', '#cbbfe0'); C(g, 36, 56, 11, '#d9455b'); C(g, 56, 52, 12, '#8a4bb0'); C(g, 68, 62, 10, '#e0455b'); C(g, 48, 64, 9, '#a65fc9'); C(g, 32, 53, 3, 'rgba(255,255,255,.6)'); },
      function (g) { E(g, 50, 68, 40, 16, '#dca25c'); E(g, 50, 62, 34, 12, '#f7e3b8'); for (var i = 0; i < 6; i++) C(g, 50 + Math.cos(i) * 18, 62 + Math.sin(i) * 6, 6, i % 2 ? '#d9455b' : '#8a4bb0'); C(g, 50, 62, 6, '#e0455b'); },
      function (g) { C(g, 50, 56, 38, '#c98a45'); C(g, 50, 56, 32, '#e8b26c'); for (var i = -2; i <= 2; i++) { L(g, 50 + i * 12 - 18, 30, 50 + i * 12 + 18, 82, '#c98a45', 4); L(g, 50 + i * 12 + 18, 30, 50 + i * 12 - 18, 82, '#c98a45', 4); } C(g, 50, 56, 32, 'rgba(0,0,0,0)', '#c98a45'); C(g, 50, 56, 7, '#d9455b'); },
      function (g) { R(g, 14, 54, 72, 32, 10, '#b98250', '#9a6a3c'); for (var i = 0; i < 5; i++) L(g, 22 + i * 14, 58, 22 + i * 14, 82, '#9a6a3c', 2); C(g, 34, 46, 13, '#e0455b'); C(g, 56, 40, 13, '#f0a93a'); C(g, 72, 50, 11, '#8a4bb0'); C(g, 46, 32, 10, '#7cc36b'); L(g, 20, 54, 80, 54, '#9a6a3c', 3); }
    ],
    [ // ---- sweets: honey -> sugar -> cookie -> cupcake -> donut -> sweet tower
      function (g) { E(g, 50, 84, 18, 4, 'rgba(107,79,63,.12)'); P(g, [50, 18, 30, 56, 70, 56], '#f2a93b'); C(g, 50, 62, 22, '#f2a93b'); E(g, 42, 58, 5, 9, 'rgba(255,255,255,.55)'); },
      function (g) { R(g, 18, 50, 38, 34, 6, '#ffffff', '#e8dcd0'); R(g, 46, 38, 36, 36, 6, '#fff7f7', '#e8dcd0'); L(g, 24, 56, 36, 56, '#efe4d8', 2); L(g, 54, 44, 66, 44, '#efe4d8', 2); },
      function (g) { C(g, 50, 56, 34, '#d29a5e'); C(g, 50, 54, 31, '#e3b078'); C(g, 38, 46, 5, '#6b4430'); C(g, 58, 42, 5, '#6b4430'); C(g, 62, 62, 5, '#6b4430'); C(g, 42, 66, 4, '#6b4430'); C(g, 52, 54, 3, '#6b4430'); },
      function (g) { P(g, [24, 56, 76, 56, 68, 88, 32, 88], '#f2b0c4', '#d98aa4'); L(g, 38, 58, 40, 86, '#d98aa4', 2); L(g, 50, 58, 50, 86, '#d98aa4', 2); L(g, 62, 58, 60, 86, '#d98aa4', 2); E(g, 50, 52, 29, 11, '#fffaf0'); E(g, 50, 40, 21, 10, '#fff3f6'); C(g, 50, 28, 11, '#fffaf0'); C(g, 50, 20, 5, '#d94a5a'); },
      function (g) { C(g, 50, 56, 36, '#dca25c'); C(g, 50, 56, 32, '#f4a2b8'); C(g, 50, 56, 11, '#fbe6cd'); C(g, 50, 56, 11, 'rgba(0,0,0,0)', '#dca25c'); L(g, 30, 40, 36, 44, '#ffffff', 3); L(g, 66, 40, 60, 46, '#a8d8f0', 3); L(g, 72, 62, 66, 66, '#f9e08a', 3); L(g, 30, 68, 36, 64, '#ffffff', 3); L(g, 54, 76, 56, 70, '#b9e3c2', 3); },
      function (g) { E(g, 50, 82, 38, 9, '#f4a2b8'); E(g, 50, 82, 38, 9, 'rgba(0,0,0,0)', '#dca25c'); P(g, [30, 50, 70, 50, 64, 76, 36, 76], '#f2b0c4'); E(g, 50, 48, 24, 9, '#fffaf0'); C(g, 50, 36, 12, '#fff3f6'); star(g, 50, 17, 13, '#f4c542'); C(g, 50, 36, 3, '#d94a5a'); }
    ]
  ];

  // draws one item (plus level badge) scaled into a size x size canvas context
  function drawItem(g, chain, lv, size) {
    g.save();
    g.scale(size / 100, size / 100);
    if (lv === 6) { var gr = g.createRadialGradient(50, 52, 10, 50, 52, 52); gr.addColorStop(0, 'rgba(255,236,150,.8)'); gr.addColorStop(1, 'rgba(255,236,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 100, 100); }
    g.lineJoin = 'round';
    var pc = root.CozyData ? root.CozyData.CHAINS[chain] : null;
    if (pc) { g.globalAlpha = 0.42; C(g, 50, 54, 47, pc.color); g.globalAlpha = 0.5; C(g, 50, 54, 47, pc.plate); g.globalAlpha = 1; }
    ITEMS[chain][lv - 1](g);
    // level badge
    C(g, 84, 84, 12, lv === 6 ? '#d99f1f' : 'rgba(107,79,63,.82)');
    g.fillStyle = '#fff'; g.font = 'bold 15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(lv), 84, 85);
    g.restore();
  }

  root.CozySprites = { drawItem: drawItem, E: E, C: C, R: R, P: P, L: L, star: star, rrPath: rrPath };
})(typeof window !== 'undefined' ? window : globalThis);
