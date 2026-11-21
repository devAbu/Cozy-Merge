// Cozy Merge - platform services: local save + AdService (rewarded video).
(function (root) {
  'use strict';

  // ------------------------------------------------------------ Save (localStorage, JSON)
  var KEY = 'cozymerge_save_v1';
  var Save = {
    load: function () {
      try { var t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { return null; }
    },
    write: function (state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
    },
    wipe: function () { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }
  };

  // ------------------------------------------------------------ AdService
  // The ONLY place that knows about ads. Game code calls:
  //   AdService.show(placement, onReward)   -> true if started
  //   AdService.status(placement, nowMs)    -> {state:'idle'|'watching'|'cooldown', sec}
  //   AdService.cancel(placement)
  //   AdService.update(nowMs)               -> call every frame
  // This build SIMULATES a rewarded video: countdown on the button, reward, then cooldown.
  // To go live with AdMob, keep these four functions and replace the body of show()/status()
  // with the SDK calls (load ad -> show -> on reward callback run onReward()). Nothing else changes.
  var CFG = {
    energy:   { watch: 4, cooldown: 30 },
    mergeAll: { watch: 4, cooldown: 45 },
    double:   { watch: 3, cooldown: 0 }
  };
  var slots = {};
  function slot(p) { return slots[p] || (slots[p] = { state: 'idle', until: 0, cb: null }); }

  var AdService = {
    status: function (p, now) {
      var s = slot(p);
      if (s.state === 'idle') return { state: 'idle', sec: 0 };
      return { state: s.state, sec: Math.max(1, Math.ceil((s.until - now) / 1000)) };
    },
    show: function (p, onReward) {
      var s = slot(p), c = CFG[p];
      if (!c || s.state !== 'idle') return false;
      s.state = 'watching'; s.until = Date.now() + c.watch * 1000; s.cb = onReward;
      return true;
    },
    cancel: function (p) {
      var s = slot(p);
      if (s.state === 'watching') { s.state = 'idle'; s.cb = null; }
    },
    update: function (now) {
      for (var p in slots) {
        var s = slots[p];
        if (s.state === 'watching' && now >= s.until) {
          var cb = s.cb; s.cb = null;
          var cd = CFG[p].cooldown;
          if (cd > 0) { s.state = 'cooldown'; s.until = now + cd * 1000; } else s.state = 'idle';
          if (cb) cb(true);
        } else if (s.state === 'cooldown' && now >= s.until) {
          s.state = 'idle';
        }
      }
    }
  };

  root.CozySave = Save;
  root.AdService = AdService;
  if (typeof module !== 'undefined' && module.exports) module.exports = { Save: Save, AdService: AdService };
})(typeof window !== 'undefined' ? window : globalThis);
