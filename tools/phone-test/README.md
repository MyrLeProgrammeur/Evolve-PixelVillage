# Phone test tools (root + Brave, Android)

Developer tools used to test the game on a real phone from a Termux session. They need **root** (`su`) and the **Brave**
browser; they only talk to a tab whose URL is `127.0.0.1:8766` (the test port).

- `cdp.sh` / `cdp.js`: read and drive the game tab through the browser's remote-debugging socket
  (`eval`, `evalfile`, `shot`, `reload`). A loopback relay lives only for the duration of one command.
  Example: `su -c "sh tools/phone-test/cdp.sh evalfile tools/phone-test/q1.js"`.
- `auto.js`: automatic evolution (credits RNA/DNA through `window.ankiCredit`, clicks the evolution actions).
  `auto2.js` / `auto3.js`: early Era 1 (credit resources, alternate tabs, build).
- `q1.js`, `q3.js`, `q5.js`: state queries (layout metrics, evolution state, village state).

Use another port than the one you play on (for example `node serve.js 8766`): `localStorage`, hence the save game,
is bound to the origin, so a test run never touches your own save.

## Notes (2026-11-02)
- The default browser is now Fennec, which has no DevTools socket: open the test page in Brave explicitly,
  `su -c "am start -a android.intent.action.VIEW -d http://127.0.0.1:8766/ -p com.brave.browser"`.
- Brave freezes a hidden tab: while Termux is in front, the game and any autoplay stop. Bring Brave back with
  `su -c "monkey -p com.brave.browser -c android.intent.category.LAUNCHER 1"`.
- `cdp.js` now attaches **only** to port 8766 (it used to accept 8765 too, which could reach your own save).
- Reaching an era by autoplay is slow (the first Steel is a 1-in-1250 random draw per tick). Faster: `era3save.js`
  (refuses any port but 8766) lifts the test save to the Era 3 tech levels through `importGame`, then `auto4.js` builds at real prices.
- `auto4.js` skips the completed-research headers (`tech-dist-*`, class `vb`) and alternates the Research / Civilization tabs.
