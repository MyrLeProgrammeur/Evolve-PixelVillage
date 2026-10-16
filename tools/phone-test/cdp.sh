#!/system/bin/sh
# Drives the Evolve tab of Brave through its DevTools socket (root required).
# Usage: su -c "sh tools/phone-test/cdp.sh evalfile <file.js>"   |   eval "<js>"   |   shot <out.png>   |   reload
# It only attaches to a tab whose URL is 127.0.0.1:8765 or 8766; a loopback relay lives only for the duration of the command.
D="$(cd "$(dirname "$0")" && pwd)"
export PATH=/data/data/com.termux/files/usr/bin:$PATH
export LD_LIBRARY_PATH=/data/data/com.termux/files/usr/lib
exec node "$D/cdp.js" "$@"
