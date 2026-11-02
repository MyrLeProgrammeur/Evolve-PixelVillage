#!/bin/sh
# Re-run after every import of the sprite kit from Claude Design (the import overwrites kit/*.js and atelier.html).
#  english-labels : English UI labels in the kit and the atelier
# Dropped patches (now part of the Claude Design project itself):
#  terrain-fill : open ground around the map (SpriteKit option `surround`, default 'open')
#  bessemer     : larger Bessemer converter on the Era 2 smelter (applied in Claude Design on 2026-11-02)
cd "$(dirname "$0")/.." || exit 1
patch -N -p1 < kit-patches/english-labels.patch && echo "kit patches applied"
