"""Evolve Village : add-on Anki bureau. Ouvre le jeu (fork d'Evolve) dans une fenêtre d'Anki et lui
fournit les révisions de la collection, en lecture seule (village_events.py).

- Le jeu est servi par le serveur local d'Anki (/_addons/<dossier>/index.html, setWebExports).
- Page -> Python : pycmd("av:" + JSON) ; Python répond par le rappel de pycmd (anki-host.js).
- La partie est enregistrée dans le dossier du profil Anki (anki-village/save.txt) : le profil web
  des add-ons est éphémère (QWebEngineProfile sans nom), son localStorage ne survit pas à Anki.
- Le capteur vit avec le profil, pas avec la fenêtre : une synchro ou une fin de séance est constatée
  (photo du jour, journée accomplie) même quand le village est fermé.
"""

import json
import os
import secrets
import time

from aqt import gui_hooks, mw
from aqt.main import MainWindowState
from aqt.qt import QAction, QDialog, QTimer, QUrl, QVBoxLayout
from aqt.utils import restoreGeom, saveGeom, tooltip
from aqt.webview import AnkiWebView

from .village_events import Sensor, strip_html

ADDON = mw.addonManager.addonFromModule(__name__)
ADDON_DIR = os.path.dirname(__file__)
# Fichiers du jeu servis à la page ; rien d'autre (ni .py, ni meta.json).
mw.addonManager.setWebExports(__name__, r"(index\.html|tools/map-bench/bench\.html|.*\.(js|css|png|svg|ico|woff2?|ttf|eot)|strings/.*\.json)")

_dialog = None
_profile = None   # (Store, Sensor) du profil ouvert


# --------------------------------------------------------------------------- stockage par profil
class Store:
    """Fichiers d'un profil Anki : <profil>/anki-village/. Le chemin est figé à l'ouverture, pour que
    la dernière sauvegarde aille au bon profil même si elle arrive pendant la fermeture du profil."""

    def __init__(self, folder):
        self.dir = os.path.join(folder, "anki-village")
        os.makedirs(self.dir, exist_ok=True)

    def read(self, name, default=None):
        try:
            with open(os.path.join(self.dir, name), encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return default

    def write(self, name, text):
        p = os.path.join(self.dir, name)
        with open(p + ".tmp", "w", encoding="utf-8") as f:
            f.write(text)
        os.replace(p + ".tmp", p)

    def device(self):
        dev = (self.read("device") or "").strip()
        if not dev:
            dev = "desktop-" + secrets.token_hex(3)
            self.write("device", dev)
        return dev

    def store_save(self, data):
        if not isinstance(data, str) or not data:
            return
        old = self.read("save.txt")
        if old == data:
            return
        if old:
            self.write("save.bak", old)
        self.write("save.txt", data)

    def clear_save(self):
        old = self.read("save.txt")
        if old:
            self.write("save.bak", old)
            os.remove(os.path.join(self.dir, "save.txt"))

    def snapshots(self):
        try:
            return json.loads(self.read("snapshots.json", "{}"))
        except ValueError:
            return {}

    def store_snapshots(self, snaps):
        keep = sorted(snaps, key=int)[-90:]
        self.write("snapshots.json", json.dumps({k: snaps[k] for k in keep}))

    def done(self):
        try:
            return json.loads(self.read("done.json", "{}"))
        except ValueError:
            return {}

    def store_done(self, done):
        self.write("done.json", json.dumps(done))


def _current():
    """Store et capteur du profil ouvert, créés à la première demande."""
    global _profile
    if _profile is None and mw.col:
        store = Store(mw.pm.profileFolder())
        sensor = Sensor(lambda sql, *a: mw.col.db.all(sql, *a), store.device(), store.snapshots(), store.done())
        _profile = (store, sensor)
    return _profile


def _refresh(force=False):
    """Relit le revlog (et la photo du jour si besoin) ; enregistre ce qui est nouveau."""
    cur = _current()
    if not cur:
        return None
    store, sensor = cur
    snaps, done = len(sensor.snapshots), len(sensor.done)
    sensor.refresh(force=force)
    if len(sensor.snapshots) != snaps:
        store.store_snapshots(sensor.snapshots)
    if len(sensor.done) != done:
        store.store_done(sensor.done)
    return sensor


def _write_seed(store):
    """Écrit user_files/save.js, chargé par anki-host.js avant le démarrage du jeu."""
    seed = "window.AnkiVillageHost && AnkiVillageHost.seed(%s, %s);\n" % (
        json.dumps(store.read("save.txt")), json.dumps(store.dir))
    d = os.path.join(ADDON_DIR, "user_files")
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "save.js"), "w", encoding="utf-8") as f:
        f.write(seed)


# --------------------------------------------------------------------------- fenêtre et pont
class VillageDialog(QDialog):
    def __init__(self):
        super().__init__(mw)
        self.store, self.sensor = _current()
        self._finishing = False
        self.setWindowTitle("Evolve Village")
        self.web = AnkiWebView(parent=self, title="evolve_village")
        self.web.set_bridge_command(self.on_bridge, self)
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.web)
        self.setLayout(layout)
        self.resize(1100, 800)
        restoreGeom(self, "evolve_village")
        _write_seed(self.store)
        self.web.load_url(QUrl("%s_addons/%s/index.html" % (mw.serverURL(), ADDON)))

    def on_bridge(self, cmd):
        if not cmd.startswith("av:"):
            return None
        try:
            msg = json.loads(cmd[3:])
        except ValueError:
            return {"error": "bad message"}
        kind = msg.get("cmd")
        if kind == "events":
            s = self.sensor
            if msg.get("from") is None:          # partie pas encore chargée : statut seulement
                return {"enabled": True, "status": s.status(), "cursor": 0, "events": []}
            s.ensure_from(int(msg["from"]))
            _refresh()
            return dict(enabled=True, status=s.status(), **s.events_since(msg.get("since")))
        if kind == "cards":
            out = {}
            for cid in [int(c) for c in msg.get("cids", []) if str(c).isdigit()][:50]:
                try:
                    card = mw.col.get_card(cid)
                    html = card.question()
                    out[str(cid)] = {"cid": cid, "did": card.odid or card.did, "html": html, "text": strip_html(html)}
                except Exception:
                    pass
            return out
        if kind == "save":
            self.store.store_save(msg.get("data"))
            return {"ok": True}
        if kind == "clear":
            self.store.clear_save()
            return {"ok": True}
        if kind == "review":
            # bouton « Réviser » du panneau Anki : la fenêtre principale revient sur la liste des paquets
            mw.moveToState("deckBrowser")
            mw.activateWindow()
            mw.raise_()
            return {"ok": True}
        return {"error": "unknown"}

    def notify(self):
        self.web.eval("window.AnkiVillage && AnkiVillage.refresh();")

    # Fermeture : bouton de la fenêtre (closeEvent) comme touche Échap (reject) passent par finish(),
    # qui demande la partie à la page, l'enregistre, puis ferme pour de bon.
    def closeEvent(self, evt):
        evt.ignore()
        self.finish()

    def reject(self):
        self.finish()

    def finish(self):
        if self._finishing:
            return
        self._finishing = True
        state = {"done": False}

        def done(data=None):
            if state["done"]:
                return
            state["done"] = True
            self.store.store_save(data)
            saveGeom(self, "evolve_village")
            QDialog.reject(self)

        self.web.evalWithCallback("localStorage.getItem('evolved')", done)
        QTimer.singleShot(3000, done)   # page bloquée : on ferme quand même (la sauvegarde périodique reste)


def open_village():
    global _dialog
    if _dialog is not None:
        _dialog.show()
        _dialog.raise_()
        _dialog.activateWindow()
        return
    if not mw.col:
        return
    _dialog = VillageDialog()
    _dialog.finished.connect(_forget)
    _dialog.show()


def _forget(*_):
    global _dialog
    if _dialog is not None:
        _dialog.web.cleanup()
        _dialog.deleteLater()
    _dialog = None


def _notify(*_):
    if _dialog is not None:
        _dialog.notify()


def _after_sync(*_):
    _refresh(force=True)
    _notify()


def _state_changed(new_state: MainWindowState, old_state: MainWindowState):
    # Fin d'une séance de révision : photo immédiate, pour constater une journée accomplie.
    if old_state == "review" and new_state != "review":
        _refresh(force=True)
        _notify()


def _profile_closing():
    global _profile
    if _dialog is not None:
        _dialog.finish()
    _profile = None


# --------------------------------------------------------------------------- banc de mesure de la carte (J0, outil de dev)
# Présent seulement dans un paquet construit avec « build_addon.py --bench ». Les résultats arrivent par
# pycmd("pvbench:" + JSON) et sont écrits dans user_files/ du dossier de l'add-on (conservé par Anki).
BENCH_PAGE = os.path.join(ADDON_DIR, "tools", "map-bench", "bench.html")
_bench = None


class BenchDialog(QDialog):
    def __init__(self):
        super().__init__(mw)
        self.setWindowTitle("Evolve Village - map bench (dev)")
        self.web = AnkiWebView(parent=self, title="evolve_village_bench")
        self.web.set_bridge_command(self.on_bridge, self)
        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.web)
        self.setLayout(layout)
        self.resize(1100, 800)
        self.web.load_url(QUrl("%s_addons/%s/tools/map-bench/bench.html" % (mw.serverURL(), ADDON)))

    def on_bridge(self, cmd):
        if not cmd.startswith("pvbench:"):
            return None
        body = cmd[len("pvbench:"):]
        try:
            json.loads(body)
        except ValueError:
            return {"error": "bad json"}
        folder = os.path.join(ADDON_DIR, "user_files")
        os.makedirs(folder, exist_ok=True)
        path = os.path.join(folder, "bench-%s.json" % time.strftime("%Y%m%d-%H%M%S"))
        with open(path, "w", encoding="utf-8") as f:
            f.write(body)
        tooltip("Mesures enregistrées : " + path, period=8000)
        return {"ok": True, "path": path}


def open_bench():
    global _bench
    if _bench is not None:
        _bench.close()
    _bench = BenchDialog()
    _bench.show()


if os.path.isfile(BENCH_PAGE):
    bench_action = QAction("Evolve Village: map bench (dev)", mw)
    bench_action.triggered.connect(open_bench)
    mw.form.menuTools.addAction(bench_action)


action = QAction("Evolve Village", mw)
action.triggered.connect(open_village)
mw.form.menuTools.addAction(action)

gui_hooks.reviewer_did_answer_card.append(_notify)
gui_hooks.sync_did_finish.append(_after_sync)
gui_hooks.state_did_change.append(_state_changed)
gui_hooks.profile_will_close.append(_profile_closing)
