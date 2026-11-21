// Cozy Merge - soft sounds + lullaby music, all synthesized with Web Audio (no files, works offline).
(function (root) {
  'use strict';
  var ctx = null, master, sfxBus, musBus, delay, noiseBuf;
  var sfxOn = true, musicOn = true, vibOn = true;
  var timer = null, nextT = 0, step = 0;

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = musicOn ? 0.5 : 0; musBus.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.34;
    var fb = ctx.createGain(); fb.gain.value = 0.3;
    var wet = ctx.createGain(); wet.gain.value = 0.3;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(musBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate >> 1, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
    return true;
  }

  function tone(type, f0, f1, t, dur, gain, dest, att) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    var a = att || 0.008;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function puff(t, dur, gain, freq) {
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }

  var SCALE = [0, 2, 4, 7, 9];   // major pentatonic: everything sounds soft and happy
  function sfx(name, arg) {
    if (!sfxOn || !init()) return;
    var t = ctx.currentTime;
    switch (name) {
      case 'tap': tone('sine', 520, 460, t, 0.06, 0.12, sfxBus); break;
      case 'pop': tone('sine', 380, 760, t, 0.12, 0.28, sfxBus); puff(t, 0.06, 0.05, 1800); break;
      case 'merge': {
        var lv = Math.max(1, Math.min(6, arg | 0)), base = 62 + SCALE[(lv - 1) % 5] + ((lv / 5) | 0) * 12;
        tone('triangle', midi(base), 0, t, 0.28, 0.3, sfxBus);
        tone('sine', midi(base + 12), 0, t + 0.05, 0.34, 0.16, sfxBus);
        tone('sine', midi(base + 7), 0, t + 0.11, 0.3, 0.12, sfxBus);
        puff(t, 0.12, 0.08, 2600);
        break;
      }
      case 'deliver':
        [0, 4, 7, 12].forEach(function (n, i) { tone('triangle', midi(67 + n), 0, t + i * 0.07, 0.3, 0.26, sfxBus); });
        break;
      case 'coin': tone('square', 1318, 0, t, 0.05, 0.06, sfxBus); tone('square', 1760, 0, t + 0.05, 0.12, 0.06, sfxBus); break;
      case 'reward':
        [0, 2, 4, 7, 9, 12].forEach(function (n, i) { tone('sine', midi(72 + n), 0, t + i * 0.055, 0.34, 0.18, sfxBus); });
        break;
      case 'unlock':
        [0, 4, 7, 11, 14, 19].forEach(function (n, i) { tone('triangle', midi(64 + n), 0, t + i * 0.09, 0.5, 0.22, sfxBus); });
        break;
      case 'error': tone('sine', 220, 170, t, 0.18, 0.2, sfxBus); break;
      case 'toggle': tone('sine', arg ? 660 : 440, 0, t, 0.08, 0.14, sfxBus); break;
    }
  }

  // ---- music: slow arpeggios over Cmaj7 / Am7 / Fmaj7 / G6, soft bass, occasional bell
  var CHORDS = [[48, 55, 60, 64, 67, 71], [45, 52, 57, 60, 64, 67], [41, 48, 53, 57, 60, 64], [43, 50, 55, 59, 62, 64]];
  var EIGHTH = 0.36;
  function scheduleMusic() {
    if (!ctx || !musicOn) { nextT = ctx ? ctx.currentTime : 0; return; }
    while (nextT < ctx.currentTime + 0.5) {
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
      var bar = ((step / 8) | 0) % 4, i = step % 8, ch = CHORDS[bar];
      var pat = [1, 3, 4, 3, 2, 4, 5, 3];
      tone('triangle', midi(ch[pat[i]] + 12), 0, nextT, 0.9, 0.11, delay, 0.02);
      tone('sine', midi(ch[pat[i]] + 12), 0, nextT, 0.9, 0.05, musBus, 0.02);
      if (i === 0) tone('sine', midi(ch[0]), 0, nextT, 2.4, 0.22, musBus, 0.05);
      if (i === 4) tone('sine', midi(ch[2]), 0, nextT, 1.6, 0.1, musBus, 0.05);
      if (i === 6 && bar % 2 === 1) tone('sine', midi(ch[5] + 12), 0, nextT, 1.2, 0.07, delay, 0.01);
      nextT += EIGHTH; step++;
    }
  }
  function startMusic() {
    if (timer) return;
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(scheduleMusic, 150);
  }

  function setMusic(on) {
    musicOn = !!on;
    if (ctx) musBus.gain.setTargetAtTime(musicOn ? 0.5 : 0, ctx.currentTime, 0.05);
  }
  function setSfx(on) { sfxOn = !!on; if (ctx) sfxBus.gain.setTargetAtTime(sfxOn ? 1 : 0, ctx.currentTime, 0.02); }
  function setVib(on) { vibOn = !!on; }
  function vibrate(ms) { if (vibOn && root.navigator && navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) { /* ignore */ } } }

  // pause everything when the app goes to the background
  if (root.document) {
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend(); else ctx.resume();
    });
  }

  root.CozyAudio = { init: init, sfx: sfx, setMusic: setMusic, setSfx: setSfx, setVib: setVib, vibrate: vibrate };
})(typeof window !== 'undefined' ? window : globalThis);
