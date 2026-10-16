#!/bin/sh
# Re-run after every import of the sprite kit from Claude Design (the import overwrites kit/*.js and atelier.html).
#  terrain-fill   : continuous ground around the map, far forest, no cliff / floating island
#  english-labels : English UI labels in the kit and the atelier
cd "$(dirname "$0")/.." || exit 1
patch -N -p1 < kit-patches/terrain-fill.patch && patch -N -p1 < kit-patches/english-labels.patch && echo "kit patches applied"
