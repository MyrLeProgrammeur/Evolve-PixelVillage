/* [anki-fork] Village view host: loads the sprite kit and docks a canvas under the game UI.
   Reads window.evolve.global (settings.expose is forced on in this fork). Offline, no dependency. */
(function () {
  'use strict';
  var KIT = ['palette', 'pieces_b1', 'pieces_b2', 'pieces_b3', 'pieces_b4', 'pieces_b5', 'pieces_b6', 'pieces_b7', 'pieces_b8', 'pieces_b9',
    'spritekit', 'village', 'village_b3', 'village_b4', 'citizens', 'world', 'ui', 'era1', 'evolution'];
  var MODES = ['off', 'peek', 'full'], mode = 1, runner = null, canvas = null, panel, holder, note, btn;
  try { var m = parseInt(localStorage.getItem('avMode'), 10); if (m >= 0 && m <= 2) mode = m; } catch (e) {}

  function css() {
    var s = document.createElement('style');
    s.textContent =
      '@media (max-width:768px){html body #av-btn,html body #av-skin{top:6px;bottom:auto;height:auto;font-size:11px;padding:5px 8px}html body #av-btn{right:6px}html body #av-skin{left:auto;right:150px}html[data-skin=\"pixel\"] #av-panel{bottom:56px}}' +
      '#av-skin{position:fixed;left:10px;bottom:10px;z-index:100001;font:600 12px system-ui,sans-serif;padding:8px 10px;border-radius:8px;border:1px solid #6e4329;background:#fffaeb;color:#2a1f2b;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.4)}' +
      '#av-btn{position:fixed;right:10px;bottom:10px;z-index:100001;font:600 13px system-ui,sans-serif;padding:9px 14px;border-radius:8px;border:1px solid #6e4329;background:#f4bd45;color:#1c191b;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.4)}' +
      '#av-panel{position:fixed;left:0;right:0;bottom:0;z-index:100000;background:#d3e7e3;border-top:2px solid #6e4329;display:none}' +
      '#av-hold{position:absolute;inset:0;overflow:hidden}' +
      '#av-hold canvas{display:block;width:100%;height:100%;image-rendering:pixelated;touch-action:none}' +
      '#av-note{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:16px;font:15px/1.5 system-ui,sans-serif;color:#2a1f2b;background:#d3e7e3}';
    document.head.appendChild(s);
  }
  var lastErr = '', lastScale = 0;
  window.addEventListener('error', function (e) {
    var f = String(e.filename || '');
    if (f.indexOf('kit/') < 0 && f.indexOf('anki-village') < 0) return;
    lastErr = (e.message || 'erreur') + ' (' + f.split('/').pop() + ':' + e.lineno + ')';
    if (note) { note.style.display = 'flex'; note.style.fontSize = '12px'; note.style.alignItems = 'flex-start'; note.textContent = 'Village view error: ' + lastErr; }
  });
  function build() {
    css();
    panel = document.createElement('div'); panel.id = 'av-panel';
    holder = document.createElement('div'); holder.id = 'av-hold';
    note = document.createElement('div'); note.id = 'av-note';
    panel.appendChild(holder); panel.appendChild(note);
    btn = document.createElement('button'); btn.id = 'av-btn';
    btn.onclick = function () { mode = (mode + 1) % 3; try { localStorage.setItem('avMode', mode); } catch (e) {} apply(); };
    var sk = document.createElement('button'); sk.id = 'av-skin';
    function skinLabel() { sk.textContent = 'Skin: ' + (window.avSkinEnabled && window.avSkinEnabled() ? 'pixel' : 'original'); }
    sk.onclick = function () { if (window.avSkinToggle) { window.avSkinToggle(); skinLabel(); } };
    skinLabel();
    document.body.appendChild(panel); document.body.appendChild(btn); document.body.appendChild(sk);
    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (runner && pickScale() !== lastScale) restart(); }, 250);
    });
    apply();
    setInterval(tick, 1000);
  }
  function mobile() { return window.matchMedia && window.matchMedia('(max-width:768px)').matches; }
  function apply() {
    var on = mode > 0, mob = mobile();
    panel.style.display = on ? 'block' : 'none';
    if (mob && mode === 1) {
      /* phone: the village is a sticky strip at the top of the page; the game scrolls underneath */
      if (panel.parentNode !== document.body || document.body.firstChild !== panel) document.body.insertBefore(panel, document.body.firstChild);
      panel.style.position = 'sticky'; panel.style.top = '0'; panel.style.bottom = 'auto';
      panel.style.height = '34vh'; document.body.style.paddingBottom = '';
    } else {
      panel.style.position = ''; panel.style.top = ''; panel.style.bottom = '';
      panel.style.height = mode === 2 ? (mob ? 'calc(100vh - 56px)' : '100vh') : '42vh';
      document.body.style.paddingBottom = (!mob && mode === 1) ? '42vh' : '';
    }
    btn.textContent = 'Village: ' + ['hidden', mob ? 'top' : 'bottom', 'fullscreen'][mode];
    if (!on) stop(); else { if (runner) restart(); else tick(); }
  }
  /* Responsive: integer scale from the real width in device pixels (phone ~930 px -> 1, laptop 1920 -> 2, 2560 -> 3, 4K -> 4). */
  function pickScale() {
    var d = panel.clientWidth * (window.devicePixelRatio || 1);
    return Math.max(1, Math.min(4, Math.round(d / 900)));
  }
  function stop() { if (runner) { runner.stop(); runner = null; } if (canvas) { canvas.remove(); canvas = null; } }
  function say(t) { note.style.display = t ? 'flex' : 'none'; note.textContent = t || ''; }
  function restart() { stop(); tick(); }
  function ready() { return window.SpriteKit && window.SpriteKit.isReady && window.SpriteKit.isReady(); }
  function tick() {
    if (mode === 0) return;
    var g = window.evolve && window.evolve.global;
    if (!ready()) { say('Loading the village…'); return; }
    if (!g || !g.race) { say('Game starting…'); stop(); return; }
    if (!lastErr) say('');
    if (!runner) {
      canvas = document.createElement('canvas'); holder.appendChild(canvas); lastScale = pickScale();
      try {
        runner = window.SpriteKit.run(canvas, { scale: pickScale(), pixelTrue: true });
      } catch (e) {
        stop(); lastErr = String(e && e.message || e); say('Village view error: ' + lastErr); return;
      }
    }
  }
  function load(i) {
    if (i >= KIT.length) { build(); return; }
    var s = document.createElement('script'); s.src = 'kit/' + KIT[i] + '.js'; s.onload = function () { load(i + 1); };
    s.onerror = function () { console.error('village kit: missing kit/' + KIT[i] + '.js'); };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { load(0); }); else load(0);
})();
