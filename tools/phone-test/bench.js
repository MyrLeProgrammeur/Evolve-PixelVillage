// J0 map bench launcher for Brave (root): keeps one DevTools session open for a whole run, sets the CPU throttling
// (Emulation.setCPUThrottlingRate), loads the bench page with auto=1 and waits until it has posted its results.
// Attaches ONLY to a tab on 127.0.0.1:8766 whose URL contains /tools/map-bench/.
// Usage: su -c "node tools/phone-test/bench.js '<query string>' [cpuRate] [timeoutSec]"
//   e.g. node tools/phone-test/bench.js 'dur=30&ocean=A&dpr=full' 4
const { connect } = require('./cdp.js');
(async () => {
  const qs = process.argv[2] || 'dur=30', rate = +(process.argv[3] || 1), limit = +(process.argv[4] || 900);
  const c = await connect('/tools/map-bench/');
  const ev = async (e) => (await c.send('Runtime.evaluate', { expression: e, returnByValue: true })).result.value;
  await c.send('Emulation.setCPUThrottlingRate', { rate });
  await ev(`location.href = '/tools/map-bench/bench.html?auto=1&cpu=${rate}&${qs}'; 1`);
  await new Promise((r) => setTimeout(r, 3000));
  const t0 = Date.now();
  let done = false;
  while (!done && Date.now() - t0 < limit * 1000) {
    await new Promise((r) => setTimeout(r, 5000));
    try { done = await ev('!!window.__benchDone'); } catch (e) { /* page reloading */ }
  }
  const out = await ev(`document.getElementById('out').textContent`).catch(() => '');
  await c.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(done ? 'done' : 'TIMEOUT'); console.log(out);
  c.close(); process.exit(done ? 0 : 1);
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
