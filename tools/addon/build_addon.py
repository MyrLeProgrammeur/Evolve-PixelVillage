"""Construit dist/evolve_village.ankiaddon (zip, fichiers à la racine) : le code Python de addon/ et les
fichiers du jeu dont la page a besoin. Bibliothèque standard seulement.

Usage : python3 tools/addon/build_addon.py [--dir]   (--dir : produit aussi le dossier dist/evolve_village/,
        à copier tel quel dans le dossier addons21 d'Anki pour un essai sans installation)
"""

import json
import os
import shutil
import sys
import time
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DIST = os.path.join(ROOT, "dist")

GAME_FILES = [
    "index.html", "evolved.ico", "evolved-light.ico",
    "anki-host.js", "anki-village.js", "anki-skin.js", "anki-bridge.js", "anki/ledger.js",
    "LICENSE", "NOTICE",
]
GAME_DIRS = ["evolve", "lib", "font", "kit", "strings"]
SKIP_EXT = {".py", ".md", ".map"}


def files():
    out = [("addon/__init__.py", "__init__.py"), ("addon/village_events.py", "village_events.py")]
    out += [(f, f) for f in GAME_FILES]
    for d in GAME_DIRS:
        for base, _dirs, names in os.walk(os.path.join(ROOT, d)):
            for n in sorted(names):
                if os.path.splitext(n)[1] in SKIP_EXT:
                    continue
                rel = os.path.relpath(os.path.join(base, n), ROOT)
                out.append((rel, rel))
    return out


def main():
    os.makedirs(DIST, exist_ok=True)
    manifest = json.load(open(os.path.join(ROOT, "addon", "manifest.json"), encoding="utf-8"))
    manifest["mod"] = int(time.time())
    target = os.path.join(DIST, manifest["package"] + ".ankiaddon")
    listing = files()
    missing = [s for s, _ in listing if not os.path.isfile(os.path.join(ROOT, s))]
    if missing:
        sys.exit("fichiers manquants : " + ", ".join(missing))
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as z:
        for src, dst in listing:
            z.write(os.path.join(ROOT, src), dst)
        z.writestr("manifest.json", json.dumps(manifest, indent=2))
    print("%s : %d fichiers, %.1f Mo" % (target, len(listing) + 1, os.path.getsize(target) / 1e6))
    if "--dir" in sys.argv:
        folder = os.path.join(DIST, manifest["package"])
        shutil.rmtree(folder, ignore_errors=True)
        for src, dst in listing:
            os.makedirs(os.path.dirname(os.path.join(folder, dst)) or folder, exist_ok=True)
            shutil.copy2(os.path.join(ROOT, src), os.path.join(folder, dst))
        with open(os.path.join(folder, "manifest.json"), "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        print("dossier : " + folder)


if __name__ == "__main__":
    main()
