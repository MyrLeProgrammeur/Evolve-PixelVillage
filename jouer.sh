#!/data/data/com.termux/files/usr/bin/bash
# Termux helper: starts the local offline server and opens the game in the default browser.
# Stop it with:  pkill -f "^node serve.js"
# Elsewhere (Linux/macOS/Windows): run `node serve.js` and open http://127.0.0.1:8765/
cd "$(dirname "$0")"
pgrep -f "^node serve.js" >/dev/null || (setsid nohup node serve.js 8765 >/dev/null 2>&1 < /dev/null &)
sleep 1
termux-open http://127.0.0.1:8765/
