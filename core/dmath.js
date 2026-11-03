/* PV deterministic maths (DRAFT, J0-10). Integer-only so that Node, Brave, Fennec and Qt WebEngine give bit-identical worlds:
   no Math.sin/cos/exp/pow/hypot in world generation. Every value is an integer held in a double (|v| < 2^53, exact),
   divisions go through Math.floor or `| 0`. Fixed point: ONE = 65536. */
(function (root) {
  'use strict';
  var ONE = 65536, TAU_STEPS = 4096; // angle unit: 1/4096 turn

  // sin over a quarter turn in fixed point, Taylor to x^9 with integer rescaling after each product
  function sinQ(a) { // a in [0, 1024] (quarter turn)
    var x = Math.floor(a * 102944 / 1024); // pi/2 * ONE = 102943.7
    var x2 = Math.floor(x * x / ONE), t = x, s = x;
    t = Math.floor(t * x2 / ONE / 6); s -= t;
    t = Math.floor(t * x2 / ONE / 20); s += t;
    t = Math.floor(t * x2 / ONE / 42); s -= t;
    t = Math.floor(t * x2 / ONE / 72); s += t;
    return s > ONE ? ONE : s;
  }
  var SIN = new Int32Array(TAU_STEPS);
  for (var a = 0; a < TAU_STEPS; a++) {
    var k = a & 1023, q = a >> 10;
    SIN[a] = q === 0 ? sinQ(k) : q === 1 ? sinQ(1024 - k) : q === 2 ? -sinQ(k) : -sinQ(1024 - k);
  }
  function isin(a) { return SIN[((a % TAU_STEPS) + TAU_STEPS) % TAU_STEPS]; }
  function icos(a) { return isin(a + 1024); }

  // 32-bit integer hash of up to 4 integers
  function ihash(x, y, z, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2147483647) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return h >>> 0;
  }
  // smoothstep in fixed point
  function fade(f) { return Math.floor(Math.floor(f * f / ONE) * (3 * ONE - 2 * f) / ONE); }
  function lerp(a, b, t) { return a + Math.floor((b - a) * t / ONE); }
  // 3D value noise, coordinates in fixed point; result in [0, ONE)
  function vnoise3(x, y, z, s) {
    var xi = Math.floor(x / ONE), yi = Math.floor(y / ONE), zi = Math.floor(z / ONE);
    var fx = fade(x - xi * ONE), fy = fade(y - yi * ONE), fz = fade(z - zi * ONE);
    var v = function (i, j, k) { return ihash(xi + i, yi + j, zi + k, s) >>> 16; };
    var x00 = lerp(v(0, 0, 0), v(1, 0, 0), fx), x10 = lerp(v(0, 1, 0), v(1, 1, 0), fx);
    var x01 = lerp(v(0, 0, 1), v(1, 0, 1), fx), x11 = lerp(v(0, 1, 1), v(1, 1, 1), fx);
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
  }
  // integer square root (floor)
  function isqrt(n) { if (n < 2) return n; var x = Math.floor(Math.sqrt(n)); while (x * x > n) x--; while ((x + 1) * (x + 1) <= n) x++; return x; }

  // binary min-heap on (key, value) Int32 pairs, ties broken by value (tile index) for a total order
  function Heap(cap) { this.k = new Int32Array(cap); this.v = new Int32Array(cap); this.n = 0; }
  Heap.prototype.less = function (i, j) { return this.k[i] < this.k[j] || (this.k[i] === this.k[j] && this.v[i] < this.v[j]); };
  Heap.prototype.swap = function (i, j) { var t = this.k[i]; this.k[i] = this.k[j]; this.k[j] = t; t = this.v[i]; this.v[i] = this.v[j]; this.v[j] = t; };
  Heap.prototype.push = function (key, val) {
    if (this.n === this.k.length) { var k2 = new Int32Array(this.n * 2), v2 = new Int32Array(this.n * 2); k2.set(this.k); v2.set(this.v); this.k = k2; this.v = v2; }
    var i = this.n++; this.k[i] = key; this.v[i] = val;
    while (i > 0) { var p = (i - 1) >> 1; if (!this.less(i, p)) break; this.swap(i, p); i = p; }
  };
  Heap.prototype.pop = function () { // returns the value; key in this.lastKey
    var top = this.v[0]; this.lastKey = this.k[0]; this.n--;
    if (this.n > 0) {
      this.k[0] = this.k[this.n]; this.v[0] = this.v[this.n]; var i = 0;
      for (;;) { var l = 2 * i + 1, r = l + 1, m = i; if (l < this.n && this.less(l, m)) m = l; if (r < this.n && this.less(r, m)) m = r; if (m === i) break; this.swap(i, m); i = m; }
    }
    return top;
  };

  var api = { ONE: ONE, TAU_STEPS: TAU_STEPS, isin: isin, icos: icos, ihash: ihash, vnoise3: vnoise3, isqrt: isqrt, Heap: Heap, SIN: SIN };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.PV = root.PV || {}; root.PV.dmath = api; }
})(typeof window !== 'undefined' ? window : null);
