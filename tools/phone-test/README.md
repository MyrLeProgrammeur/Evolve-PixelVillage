# Phone test tools (root + Brave, Android)

Developer tools used to test the game on a real phone from a Termux session. They need **root** (`su`) and the **Brave**
browser; they only talk to a tab whose URL is `127.0.0.1:8765` or `127.0.0.1:8766`.

- `cdp.sh` / `cdp.js`: read and drive the game tab through the browser's remote-debugging socket
  (`eval`, `evalfile`, `shot`, `reload`). A loopback relay lives only for the duration of one command.
  Example: `su -c "sh tools/phone-test/cdp.sh evalfile tools/phone-test/q1.js"`.
- `auto.js`: automatic evolution (credits RNA/DNA through `window.ankiCredit`, clicks the evolution actions).
  `auto2.js` / `auto3.js`: early Era 1 (credit resources, alternate tabs, build).
- `q1.js`, `q3.js`, `q5.js`: state queries (layout metrics, evolution state, village state).

Use another port than the one you play on (for example `node serve.js 8766`): `localStorage`, hence the save game,
is bound to the origin, so a test run never touches your own save.
