"""Evolve Village : add-on Anki bureau. Ouvre le jeu (fork d'Evolve) dans une fenêtre d'Anki et lui
fournit les révisions de la collection, en lecture seule (village_events.py).

- Le jeu est servi par le serveur local d'Anki (/_addons/<dossier>/index.html, setWebExports).
- Page -> Python : pycmd("av:" + JSON) ; Python répond par le rappel de pycmd (anki-host.js).
- La partie est enregistrée dans le dossier du profil Anki (anki-village/save.txt) : le profil web
  des add-ons est éphémère (QWebEngineProfile sans nom), son localStorage ne survit pas à Anki.
"""

import json
import os
import secrets

from aqt import gui_hooks, mw
from aqt.qt import QAction, QDialog, QTimer, QUrl, QVBoxLayout
from aqt.utils import restoreGeom, saveGeom
from aqt.webview import AnkiWebView

from .village_events import Sensor, strip_html

ADDON = mw.addonManager.addonFromModule(__name__)
ADDON_DIR = os.path.dirname(__file__)
# Fichiers du jeu servis à la page ; rien d'autre (ni .py, ni meta.json).
mw.addonManager.setWebExports(__name__, r"(index\.html|.*\.(js|css|png|svg|ico|woff2?|ttf|eot)|strings/.*\.json)")

_dialog = None


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
        self.store = Store(mw.pm.profileFolder())
        self.sensor = Sensor(lambda sql, *a: mw.col.db.all(sql, *a), self.store.device(), self.store.snapshots())
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
            before = len(s.snapshots)
            s.ensure_from(int(msg["from"]))
            s.refresh()
            if len(s.snapshots) != before:
                self.store.store_snapshots(s.snapshots)
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
            self.store.store_snapshots(self.sensor.snapshots)
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


def _profile_closing():
    if _dialog is not None:
        _dialog.finish()


action = QAction("Evolve Village", mw)
action.triggered.connect(open_village)
mw.form.menuTools.addAction(action)

gui_hooks.reviewer_did_answer_card.append(_notify)
gui_hooks.sync_did_finish.append(_notify)
gui_hooks.profile_will_close.append(_profile_closing)
