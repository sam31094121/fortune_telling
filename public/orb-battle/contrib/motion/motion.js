/* contrib/motion/motion.js — 神獸戰隊 orb-battle 動效層（原創、獨立檔）。
 * 只「聽」game.html 既有的掛鉤：
 *   window 'beast:clear'  detail.type === 'dragClear' → detail.path（本步拖曳路徑）
 *   window 'beast:attack' detail = 引擎 attack 事件 { attacker, target, element, chain, damage, ... }
 *   window 'beast:skill5' / 'beast:magicOrb' / 'beast:refill'
 *   以及 #dragLine 的 points 屬性（game.html 畫路徑時更新）。
 * 不呼叫任何改變狀態的引擎函式、不改任何數值；只讀 window.BeastEngine.CONFIG 的門檻來標示分級。
 * 可調參數：在載入本檔前設定 window.BeastMotionConfig = { ... } 覆寫 DEFAULTS。 */
(function () {
  'use strict';
  var DEFAULTS = {
    shardsPerGem: 2, shardsMax: 18,      // 碎晶：少而小（同 bead-polish PARTICLES_*）
    flyMinMs: 220, flyPerChainMs: 140,   // 與 game.html 傷害數字出現時間（60 + chain×140ms）對齊
    badgeOffsetY: 54, badgeFlipTopPx: 64, badgeSideX: 52,
    sealMs: 900, sealGapMs: 160, muted: true          // 五珠技／魔法珠橫幅依序，不重疊
  };
  /* 五元素共用一份時長＋粒子上限規範（手機優先）。動效只吃引擎結果，不計算傷害。 */
  var FX = { burstMax: 18, liveMax: 40, layers: [{ cls: 'l0', s: .7, lag: 70, lift: 26 }, { cls: 'l1', s: 1, lag: 30, lift: 44 }, { cls: 'l2', s: 1.35, lag: 0, lift: 60 }],
    beamMs: 420, beamStepMs: 70, impactMs: 520, dissolveMs: 520, switchMs: 300, skill5CardMs: 1100, dieMs: 700, countUpMs: 700,
    ease: { out: 'cubic-bezier(.16,1,.3,1)', io: 'cubic-bezier(.65,0,.35,1)', in: 'cubic-bezier(.55,0,.75,.2)' } };
  window.BeastMotionFX = FX;
  var live = 0;
  var CFG = {}, k, user = window.BeastMotionConfig || {};
  for (k in DEFAULTS) CFG[k] = user[k] != null ? user[k] : DEFAULTS[k];
  window.BeastMotionConfig = CFG;
  var NS = 'http://www.w3.org/2000/svg';
  var ELS = ['wind', 'space', 'water', 'fire', 'earth'];
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function mk(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function elClass(node) {
    if (!node) return '';
    for (var i = 0; i < ELS.length; i++) if (node.classList.contains(ELS[i])) return ELS[i];
    return '';
  }
  function center(node) { var r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  /* 底部動作列 #actionBar：所有特效座標夾在其上緣之上，絕不壓到 */
  function barTop() { var b = document.getElementById('actionBar'); if (!b) return Infinity; var r = b.getBoundingClientRect(); return r.height ? r.top - 3 : Infinity; }
  function clipSeg(f, to) { var y = barTop(); if (f.y <= y) return f; if (to.y >= y) return null; var k = (f.y - y) / (f.y - to.y); return { x: f.x + (to.x - f.x) * k, y: y }; }
  function elOf(ev) { var E = window.BeastEngine; return (E && E.GEM_CLASS && ev && ev.element != null && E.GEM_CLASS[ev.element]) || ''; }
  function pulse(el, cls, ms, delay) { if (!el) return; if (delay) el.style.setProperty('--bm-delay', delay + 'ms'); el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, ms + (delay || 0)); }
  function engineCfg() { var E = window.BeastEngine; return (E && E.CONFIG) || {}; }
  function tierOf(n) {
    var c = engineCfg(), cap = c.NORMAL_POWER_CAP || 10, s5 = c.SKILL5_LENGTH || 5, mg = c.magicOrbMinLength || 4;
    if (n < 3) return 'short';
    if (n === s5) return 'skill5';
    if (n >= cap) return 'cap';
    if (n >= mg) return 'magic';
    return 'normal';
  }
  var TIER_LABEL = { short: '', normal: '', magic: '魔法珠', skill5: '五珠技', cap: '上限' };

  function init() {
    var wrap = document.querySelector('.boardWrap'), board = document.getElementById('board'), src = document.getElementById('dragLine');
    if (!wrap || !board || !src) { console.warn('[motion] game.html 掛載點不存在，動效層未啟用'); return; }
    document.documentElement.classList.add('bm-on');

    /* ── 連線：順序號節點＋跟手尾線＋避開手指的分級徽章 ── */
    var svg = mk('svg', { 'class': 'bmLink', 'aria-hidden': 'true', 'data-testid': 'bm-link' });
    var halo = mk('polyline', { 'class': 'halo', points: '' }, svg);
    var main = mk('polyline', { 'class': 'main', points: '' }, svg);
    var tail = mk('line', { 'class': 'tail', x1: 0, y1: 0, x2: 0, y2: 0 }, svg);
    var flow = mk('polyline', { 'class': 'flow', points: '' }, svg);
    var nodes = mk('g', { 'class': 'nodes' }, svg);
    var badgePos = mk('g', { 'class': 'badgePos' }, svg);
    var badge = mk('g', { 'class': 'badge', 'data-testid': 'bm-badge' }, badgePos);
    mk('rect', { x: -26, y: -10, width: 52, height: 20, rx: 10 }, badge);
    var badgeText = mk('text', { x: 0, y: 4 }, badge);
    wrap.appendChild(svg);
    var pts = [];

    /* ── 音效（bead-sound.js，WebAudio 即時合成）：靜音跟隨 game.html 的 window.BeastSound.muted / beast:sound，本檔不另做開關 ── */
    var S = null, lastN = 0;
    function hostMuted() { return window.BeastSound ? window.BeastSound.muted !== false : CFG.muted !== false; }
    function snd(name, arg) { if (S && !hostMuted()) S[name](arg); }
    (function loadSound() {
      if (window.BeadSound) { S = window.BeadSound; S.setMuted(hostMuted()); return; }
      var me = document.currentScript || document.querySelector('script[src*="contrib/motion/motion.js"]');
      window.BeadSoundConfig = Object.assign({ persist: false, muted: hostMuted() }, window.BeadSoundConfig || {});
      var sc = document.createElement('script'); sc.src = (me && me.src ? me.src.replace(/motion\.js(\?.*)?$/, '') : 'contrib/motion/') + 'bead-sound.js';
      sc.onload = function () { S = window.BeadSound || null; if (S) S.setMuted(hostMuted()); };
      sc.onerror = function () { sc.remove(); };
      document.head.appendChild(sc);
    })();
    window.addEventListener('beast:sound', function (e) { if (S) { S.setMuted(e.detail ? !!e.detail.muted : hostMuted()); if (!hostMuted()) S.unlock(); } });
    function paintLink() {
      var raw = (src.getAttribute('points') || '').trim();
      pts = raw ? raw.split(/\s+/).map(function (s) { var p = s.split(','); return { x: +p[0], y: +p[1] }; }).filter(function (p) { return isFinite(p.x) && isFinite(p.y); }) : [];
      var on = pts.length > 0;
      svg.classList.toggle('on', on);
      if (!on) { if (lastN > 0 && lastN < 3) snd('cancel'); lastN = 0; nodes.textContent = ''; return; }
      var first = board.querySelector('.gem.inPath'), ec = elClass(first);
      ELS.forEach(function (e) { svg.classList.toggle(e, e === ec); });
      var d = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
      halo.setAttribute('points', d); main.setAttribute('points', d); flow.setAttribute('points', d);
      while (nodes.childNodes.length > pts.length) nodes.lastChild.remove();
      pts.forEach(function (p, i) {
        var g = nodes.childNodes[i];
        if (!g) { g = mk('g', { 'class': 'node' }, nodes); mk('circle', { r: 8 }, g); mk('text', {}, g).textContent = String(i + 1); }
        g.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
      });
      var n = pts.length, tier = tierOf(n), head = pts[n - 1];
      if (n > lastN) snd('tick', n); lastN = n;
      svg.setAttribute('data-tier', tier);
      badgeText.textContent = n + (TIER_LABEL[tier] ? '・' + TIER_LABEL[tier] : '');
      var nearTop = head.y < CFG.badgeFlipTopPx;
      var bx = nearTop ? head.x + CFG.badgeSideX : head.x, by = nearTop ? head.y : head.y - CFG.badgeOffsetY;
      badgePos.style.transform = 'translate(' + bx + 'px,' + by + 'px)';
      badge.setAttribute('data-n', String(n));
      tail.setAttribute('x1', head.x); tail.setAttribute('y1', head.y);
    }
    new MutationObserver(paintLink).observe(src, { attributes: true, attributeFilter: ['points'] });

    var raf = 0, px = NaN, py = NaN;
    function paintTail() {
      raf = 0;
      if (!pts.length || isNaN(px)) { tail.setAttribute('x2', tail.getAttribute('x1')); tail.setAttribute('y2', tail.getAttribute('y1')); return; }
      var r = wrap.getBoundingClientRect();
      tail.setAttribute('x2', (px - r.left).toFixed(1)); tail.setAttribute('y2', (py - r.top).toFixed(1));
    }
    window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; if (!raf) raf = requestAnimationFrame(paintTail); }, { passive: true });

    /* ── 消除爆發：記下本步寶珠位置，攻擊事件時飛向目標敵人 ── */
    var origin = null;
    window.addEventListener('beast:clear', function (e) {
      var dt = e.detail;
      if (!dt || dt.type !== 'dragClear' || !dt.path) return;
      lastN = 0; snd('chime', dt.path.length);
      var gems = board.querySelectorAll('.gem'), cols = board.style.gridTemplateColumns ? 0 : 7;
      var E = window.BeastEngine; if (E && E.CONFIG && E.CONFIG.cols) cols = E.CONFIG.cols;
      origin = dt.path.map(function (p) {
        var g = board.querySelector('.gem[data-r="' + p[0] + '"][data-c="' + p[1] + '"]') || gems[p[0] * cols + p[1]];
        return g ? { c: center(g), el: elClass(g) } : null;
      }).filter(Boolean);
    });
    function fly(ev) {
      var tgt = document.querySelector('[data-enemy="' + ev.target + '"]');
      if (!tgt) return;
      var to = center(tgt.querySelector('.avatar') || tgt), from = origin && origin.length ? origin : [{ c: center(board), el: '' }];
      var ms = Math.max(CFG.flyMinMs, 60 + (ev.chain || 1) * CFG.flyPerChainMs);
      var ec = (window.BeastEngine && window.BeastEngine.GEM_CLASS && window.BeastEngine.GEM_CLASS[ev.element]) || (from[0] && from[0].el) || '';
      if (reduce.matches || !document.body.animate) { setTimeout(function () { impact(to, ec); }, ms); return; }
      var count = Math.min(CFG.shardsMax, FX.burstMax, FX.liveMax - live, from.length * CFG.shardsPerGem);
      for (var i = 0; i < count; i++) {
        var f = clipSeg(from[i % from.length].c, to); if (!f) continue;
        var L = FX.layers[i % 3], s = document.createElement('i');
        s.className = 'bmShard ' + L.cls + ' ' + ec; live++;
        document.body.appendChild(s);
        var jitter = ((i * 37) % 21) - 10, rot = (i * 53) % 90;
        var mx = (f.x + to.x) / 2 + jitter * 2.4, my = Math.min(f.y, to.y) - L.lift - (i % 2) * 8;
        var a = s.animate([
          { transform: 'translate(' + f.x + 'px,' + f.y + 'px) rotate(0deg) scale(' + (L.s * .6) + ')', opacity: 0 },
          { transform: 'translate(' + mx + 'px,' + my + 'px) rotate(' + rot + 'deg) scale(' + L.s + ')', opacity: 1, offset: 0.5 },
          { transform: 'translate(' + to.x + 'px,' + to.y + 'px) rotate(' + (rot * 2) + 'deg) scale(' + (L.s * .35) + ')', opacity: .85 }
        ], { duration: ms + L.lag, delay: L.lag + (i % 5) * 16, easing: FX.ease.io, fill: 'forwards' });
        a.onfinish = (function (n) { return function () { n.remove(); live--; }; })(s);
      }
      setTimeout(function () { impact(to, ec, (ev.advantage || 1) > 1 ? 'strong' : ''); }, ms);
    }
    function impact(p, ec, tier) {
      if (p.y > barTop()) return;
      var r = document.createElement('i');
      r.className = 'bmImpact ' + (ec || 'gold') + (tier ? ' ' + tier : ''); r.style.left = p.x + 'px'; r.style.top = p.y + 'px';
      document.body.appendChild(r); setTimeout(function () { r.remove(); }, FX.impactMs + 40);
    }
    window.addEventListener('beast:attack', function (e) { if (e.detail) fly(e.detail); });
    window.addEventListener('beast:refill', function () { origin = null; setTimeout(function () { snd('thud'); }, 360); });

    /* ── 連線攻擊：每張連到的我方卡射出一道金線到目標；技能：金色光暈＋衝擊；連鎖：音高隨段數上升 ── */
    function beam(fromEl, to, delay) {
      if (!fromEl || reduce.matches || !document.body.animate) return;
      var f = clipSeg(center(fromEl), to); if (!f) return;
      var dx = to.x - f.x, dy = to.y - f.y, len = Math.hypot(dx, dy), b = document.createElement('i');
      b.className = 'bmBeam'; b.style.width = len + 'px';
      b.style.transform = 'translate(' + f.x + 'px,' + f.y + 'px) rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(0)';
      document.body.appendChild(b);
      var base = 'translate(' + f.x + 'px,' + f.y + 'px) rotate(' + Math.atan2(dy, dx) + 'rad) ';
      var a = b.animate([{ transform: base + 'scaleX(0)', opacity: 1 }, { transform: base + 'scaleX(1)', opacity: 1, offset: .6 }, { transform: base + 'scaleX(1)', opacity: 0 }],
        { duration: FX.beamMs, delay: delay, easing: FX.ease.out, fill: 'forwards' });
      a.onfinish = function () { b.remove(); };
    }
    function enemyPoint(i) { var t = document.querySelector('[data-enemy="' + i + '"]'); return t ? center(t.querySelector('.avatar') || t) : null; }
    window.addEventListener('beast:linkAttack', function (e) {
      var ev = e.detail || {}, to = enemyPoint(ev.target); if (!to) return;
      var ids = ev.attackers || ev.cards || ev.indices || ev.link || ev.team || [];
      var cards = ids.length ? ids.map(function (i) { return document.querySelector('[data-team="' + i + '"]'); }) : [].slice.call(document.querySelectorAll('.teamCard.linked'));
      cards.forEach(function (c, i) { if (c && !reduce.matches) pulse(c, 'bmRush', 560, i * FX.beamStepMs); beam(c, to, 120 + i * FX.beamStepMs); });
      setTimeout(function () { impact(to, 'gold', 'strong'); }, 380 + cards.length * FX.beamStepMs);
      snd('chime', 3 + (ev.linkLength || cards.length));
      if ((ev.linkLength || cards.length) >= 3) seal('連線 ×' + (ev.multiplier || cards.length));
    });
    window.addEventListener('beast:skill', function (e) {
      var ev = e.detail || {}, to = enemyPoint(ev.target);
      var from = ev.attacker != null ? document.querySelector('[data-team="' + ev.attacker + '"]') : null;
      if (from && !reduce.matches) pulse(from, 'bmCharge', 460);
      if (from && to) beam(from, to, 140);
      if (to) setTimeout(function () { impact(to, elClass(from) || 'gold', 'strong'); }, 420);
      snd('skill5');
    });
    window.addEventListener('beast:chain', function (e) { var c = (e.detail && e.detail.chain) || 1; if (c > 1) snd('tick', Math.min(10, 4 + c)); var cc = document.getElementById('chainCounter'); if (cc && c > 1) { cc.classList.remove('show'); void cc.offsetWidth; cc.classList.add('show'); } });

    /* ── v5：無人可出手的元素 → 寶珠飛向棋盤邊緣化掉＋安靜提示（不可「消了沒反應」） ── */
    window.addEventListener('beast:clear', function (e) {
      var ev = e.detail; if (!ev || ev.type !== 'clearNoAttack') return;
      var ec = elOf(ev), E = window.BeastEngine, lab = (E && E.LABEL && E.LABEL[ev.element]) || '';
      seal({ text: (lab ? lab + '・' : '') + '無神獸可出手', cls: 'quiet ' + ec });
      if (reduce.matches || !document.body.animate) return;
      var wr = wrap.getBoundingClientRect(), cells = ev.cells || [];
      cells.slice(0, FX.burstMax).forEach(function (p, i) {
        if (live >= FX.liveMax) return;
        var r = p && (p.r != null ? p.r : p[0]), cc = p && (p.c != null ? p.c : p[1]);
        var g = board.querySelector('.gem[data-r="' + r + '"][data-c="' + cc + '"]'); if (!g) return;
        var f = center(g); if (f.y > barTop()) return;
        var toX = f.x < wr.left + wr.width / 2 ? wr.left + 6 : wr.right - 6, L = FX.layers[i % 3];
        var m = document.createElement('i'); m.className = 'bmMote ' + ec; live++; document.body.appendChild(m);
        var a = m.animate([{ transform: 'translate(' + f.x + 'px,' + f.y + 'px) scale(' + (L.s * 1.6) + ')', opacity: 0 },
          { transform: 'translate(' + (f.x + toX) / 2 + 'px,' + (f.y - 6 - L.lift / 6) + 'px) scale(' + L.s + ')', opacity: .9, offset: .35 },
          { transform: 'translate(' + toX + 'px,' + (f.y - 10) + 'px) scale(.2)', opacity: 0 }], { duration: FX.dissolveMs + L.lag, delay: L.lag + i * 18, easing: FX.ease.out, fill: 'forwards' });
        a.onfinish = function () { m.remove(); live--; };
      });
    });

    /* ── v5：選取切換＋倒下進場（render 以 innerHTML 重建，比對前後狀態） ── */
    var prevSel = -1, deadSeen = {};
    function watchRows() {
      var sel = document.querySelector('.teamCard.selected'), si = sel ? +sel.getAttribute('data-team') : -1;
      if (sel && prevSel !== -1 && si !== prevSel && !reduce.matches) pulse(sel, 'bmSwitchIn', FX.switchMs);
      prevSel = si;
      [].forEach.call(document.querySelectorAll('.teamCard.dead,.enemyCard.dead'), function (c) {
        var key = (c.hasAttribute('data-team') ? 't' + c.getAttribute('data-team') : 'e' + c.getAttribute('data-enemy'));
        if (!deadSeen[key]) { deadSeen[key] = 1; pulse(c, 'bmDying', FX.dieMs); }
      });
      [].forEach.call(document.querySelectorAll('.teamCard:not(.dead),.enemyCard:not(.dead)'), function (c) { delete deadSeen[c.hasAttribute('data-team') ? 't' + c.getAttribute('data-team') : 'e' + c.getAttribute('data-enemy')]; });
    }
    ['teamRow', 'enemyRow'].forEach(function (id) { var n = document.getElementById(id); if (n) new MutationObserver(watchRows).observe(n, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); });
    watchRows();

    /* ── v5：勝負畫面數字由 0 數到引擎給的值（只改顯示過程，最後一定是原字串） ── */
    window.addEventListener('beast:end', function () {
      var info = document.getElementById('resultInfo'); if (!info || reduce.matches) return;
      var fin = info.textContent, parts = fin.split(/(\d+)/), t0 = 0;
      if (parts.length < 2) return;
      function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / FX.countUpMs), e2 = 1 - Math.pow(1 - k, 3);
        if (info.textContent !== cur) return; cur = k >= 1 ? fin : parts.map(function (x, i) { return i % 2 ? String(Math.round(+x * e2)) : x; }).join(''); info.textContent = cur; if (k < 1) requestAnimationFrame(step); }
      var cur = parts.map(function (x, i) { return i % 2 ? '0' : x; }).join(''); info.textContent = cur;
      setTimeout(function () { requestAnimationFrame(step); }, 420);
      setTimeout(function () { if (info.textContent !== fin && /^[^]*$/.test(cur) && info.textContent === cur) info.textContent = fin; }, 420 + FX.countUpMs + 400);
    });

    /* ── v4：浮動傷害字（.floatNum，position:fixed）不得蓋住敵方卡：任何寬度／捲動下都移到敵方列下方的文字區 ── */
    function bmFloatSafe(d) {
      var row = document.getElementById('enemyRow'); if (!row || !d.isConnected) return;
      var r = row.getBoundingClientRect(), b = d.getBoundingClientRect();
      if (b.bottom <= r.top || b.top >= r.bottom || b.right <= r.left || b.left >= r.right) return;
      var below = true, y = Math.max(r.bottom + 4, 4); if (y + b.height + 28 > innerHeight - 4) { below = false; y = Math.max(4, r.top - b.height - 44); }
      if (y < r.bottom && y + b.height > r.top) { d.style.visibility = 'hidden'; return; }
      d.style.top = (y + (parseFloat(d.style.top) || 0) - b.top) + 'px'; d.style.visibility = ''; d.classList.toggle('bmBelow', below);
    }
    var bmFloats = [];
    function bmFloatScan() { bmFloats = bmFloats.filter(function (d) { return d.isConnected; }); bmFloats.forEach(bmFloatSafe); }
    if (window.MutationObserver) new MutationObserver(function (ms) {
      ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n.classList.contains('floatNum')) { bmFloats.push(n); bmFloatSafe(n); } }); });
    }).observe(document.body, { childList: true });
    window.addEventListener('scroll', bmFloatScan, { passive: true }); window.addEventListener('resize', bmFloatScan);

    /* ── 五珠技／魔法珠：同一步一起發生時依序出現 ── */
    var q = [], showing = false;
    function nextSeal() {
      var item = q.shift();
      if (!item) { showing = false; return; }
      showing = true;
      var s = document.createElement('div');
      s.className = 'bmSeal'; s.setAttribute('role', 'status'); s.setAttribute('data-testid', 'bm-seal');
      s.style.setProperty('--seal-ms', CFG.sealMs + 'ms');
      if (typeof item === 'string') item = { text: item };
      if (item.cls) s.className += ' ' + item.cls;
      s.textContent = item.text; if (item.n != null) { var bn = document.createElement('b'); bn.textContent = String(item.n); s.appendChild(bn); }
      wrap.appendChild(s);
      setTimeout(function () { s.remove(); setTimeout(nextSeal, q.length ? CFG.sealGapMs : 0); }, CFG.sealMs);
    }
    function seal(text) { q.push(text); if (!showing) nextSeal(); }
    window.addEventListener('beast:skill5', function (e) {
      var ec = elOf(e.detail); seal({ text: '五珠技', cls: 'el ' + ec }); snd('skill5');
      if (!reduce.matches || true) [].forEach.call(document.querySelectorAll('.teamCard.' + (ec || '_')), function (c) { if (!c.classList.contains('dead')) pulse(c, 'bmSkill5', FX.skill5CardMs); });
    });
    window.addEventListener('beast:magicOrb', function (e) { setTimeout(function () { snd('magic'); }, showing ? CFG.sealMs : 0); var d = e.detail || {}; seal({ text: '魔法珠・威力', n: d.power != null ? d.power : (d.length != null ? d.length : ''), cls: 'el ' + elOf(d) }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();