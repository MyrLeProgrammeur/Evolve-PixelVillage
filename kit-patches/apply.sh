#!/bin/sh
# Re-run after every import of the sprite kit from Claude Design (the import overwrites kit/*.js and atelier.html).
#  english-labels : English UI labels in the kit and the atelier
# terrain-fill was dropped with the Era 2 import: the kit now draws open ground around the map itself
# (SpriteKit option `surround`, default 'open').
cd "$(dirname "$0")/.." || exit 1
patch -N -p1 < kit-patches/english-labels.patch && echo "kit patches applied"
