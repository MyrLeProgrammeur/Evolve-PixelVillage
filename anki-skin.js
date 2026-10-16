/* [anki-fork] Pixel skin loader. Sets <html data-skin="pixel"> (an attribute: setTheme() clears classes, not attributes),
   then builds button and panel images from the sprite kit and exposes them as CSS variables (data URI, offline).
   Disable: add ?skin=off to the URL, or use the "Skin" button (choice kept in localStorage 'avSkin'). */
(function () {
  'use strict';
  var html = document.documentElement, on = true;
  try {
    var q = /[?&]skin=(on|off)/.exec(location.search);
    if (q) localStorage.setItem('avSkin', q[1]);
    on = localStorage.getItem('avSkin') !== 'off';
  } catch (e) {}
  window.avSkinEnabled = function () { return on; };
  window.avSkinToggle = function () {
    on = !on; try { localStorage.setItem('avSkin', on ? 'on' : 'off'); } catch (e) {}
    apply(); return on;
  };
  function apply() {
    if (on) html.setAttribute('data-skin', 'pixel'); else { html.removeAttribute('data-skin'); html.removeAttribute('data-px'); }
    if (on) build();
  }
  function img(name, map) {
    var X = window.SpriteKit._, cv = X.sprite(name, map).canvas();
    return 'url("' + cv.toDataURL('image/png') + '")';
  }
  function build() {
    if (!window.SpriteKit || !window.SpriteKit.isReady || !window.SpriteKit.isReady()) { setTimeout(build, 300); return; }
    try {
      var s = html.style;
      s.setProperty('--px-btn-main', img('ui_button', { MAIN: 'saffron', ACCENT: 'cream' }));
      s.setProperty('--px-btn-alt', img('ui_button', { MAIN: 'cream', ACCENT: 'sage' }));
      s.setProperty('--px-btn-danger', img('ui_button', { MAIN: 'madder', ACCENT: 'cream' }));
      s.setProperty('--px-btn-off', img('ui_button', { MAIN: 'ashen', ACCENT: 'ashen' }));
      s.setProperty('--px-panel', img('ui_panel', null));
      html.setAttribute('data-px', 'ready');
    } catch (e) { console.error('skin images:', e); }
  }
  apply();
})();
