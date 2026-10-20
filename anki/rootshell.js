/* anki/rootshell.js — une seule session `su` persistante, des commandes envoyées sur son entrée.
 * But : demander le root une fois par lancement (et non une fois par lecture, ce qui ferait
 * apparaître une notification Magisk toutes les quelques secondes). Zéro dépendance. */
'use strict';
const { spawn } = require('child_process');

class RootShell {
  constructor(opts) {
    this.cmd = (opts && opts.cmd) || 'su';
    this.p = null; this.buf = ''; this.queue = []; this.cur = null; this.n = 0; this.dead = null;
  }
  _start() {
    if (this.p) { return; }
    this.dead = null;
    const p = spawn(this.cmd, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    this.p = p;
    p.stdout.setEncoding('utf8');
    p.stdout.on('data', (d) => { this.buf += d; this._drain(); });
    p.stderr.on('data', () => {});
    const fail = (why) => {
      this.dead = why; this.p = null;
      const all = (this.cur ? [this.cur] : []).concat(this.queue);
      this.cur = null; this.queue = [];
      for (const j of all) { clearTimeout(j.timer); j.reject(new Error('session root terminée : ' + why)); }
    };
    p.on('error', (e) => fail(e.message));
    p.on('exit', (code) => fail('code ' + code));
    p.stdin.on('error', () => {});
  }
  _drain() {
    if (!this.cur) { return; }
    const m = this.buf.indexOf(this.cur.marker);
    if (m < 0) { return; }
    const out = this.buf.slice(0, m);
    const rest = this.buf.slice(m + this.cur.marker.length);
    const nl = rest.indexOf('\n');
    const code = parseInt(rest.slice(0, nl < 0 ? undefined : nl), 10);
    this.buf = nl < 0 ? '' : rest.slice(nl + 1);
    const j = this.cur; this.cur = null; clearTimeout(j.timer);
    j.resolve({ out: out, code: isNaN(code) ? -1 : code });
    this._next();
  }
  _next() {
    if (this.cur || !this.queue.length) { return; }
    this._start();
    if (!this.p) { return; }
    this.cur = this.queue.shift();
    this.cur.timer = setTimeout(() => {
      // Commande bloquée : on tue la session, la suivante en ouvrira une neuve.
      if (this.p) { try { this.p.kill('SIGKILL'); } catch (e) { /* rien */ } }
    }, this.cur.timeout);
    this.p.stdin.write(this.cur.cmd + '\necho "' + this.cur.marker + '$?"\n');
  }
  /** Exécute une commande sh en root ; renvoie { out, code }. */
  run(cmd, timeoutMs) {
    return new Promise((resolve, reject) => {
      const marker = '__AV_END_' + (++this.n) + '_' + process.pid + '__ ';
      this.queue.push({ cmd: cmd, marker: marker, timeout: timeoutMs || 30000, resolve: resolve, reject: reject });
      this._next();
    });
  }
  close() { if (this.p) { try { this.p.stdin.end('exit\n'); } catch (e) { /* rien */ } this.p = null; } }
}

/** Met une chaîne entre apostrophes pour sh. */
function shq(s) { return "'" + String(s).replace(/'/g, "'\\''") + "'"; }

module.exports = { RootShell, shq };
