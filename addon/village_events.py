"""Capteur de l'add-on : lit la collection Anki en lecture seule et produit les événements v1
(rapports/plan/B-interface.md §2), identiques à ceux de anki/sensor.js (voie revlog).

Aucune dépendance à Anki ici : toutes les lectures passent par `query(sql, *args) -> list[tuple]`,
fourni par `mw.col.db.all` dans Anki, ou par sqlite3 dans les tests. Rien n'est écrit dans la collection.
"""

import re
import time

DAY_MS = 86400000


def anki_day(ms, rollover=4, offset_minutes=0):
    """Même calcul que AnkiLedger.ankiDay (anki/ledger.js)."""
    return (ms + offset_minutes * 60000 - rollover * 3600000) // DAY_MS


def local_offset_minutes(ms):
    return time.localtime(ms / 1000).tm_gmtoff // 60


def local_anki_day(ms, rollover=4):
    """Même calcul que AnkiLedger.localAnkiDay : fuseau local de la machine à l'instant `ms`."""
    return anki_day(ms, rollover, local_offset_minutes(ms))


def day_start_ms(day, rollover=4):
    """Rollover heure locale du jour `day` (même approximation que dayStartMs de sensor.js)."""
    guess = day * DAY_MS + rollover * 3600000
    return guess - local_offset_minutes(guess) * 60000


def strip_html(h):
    s = re.sub(r"<(script|style)[^>]*>[\s\S]*?</\1>", " ", str(h or ""), flags=re.I)
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    for a, b in (("&nbsp;", " "), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'"), ("&amp;", "&")):
        s = s.replace(a, b)
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\s*\n\s*", "\n", s).strip()


def read_rollover(query):
    rows = query("select val from config where key = 'rollover'")
    if rows:
        val = rows[0][0]
        try:
            v = int(bytes(val).decode() if isinstance(val, (bytes, bytearray, memoryview)) else val)
            return v
        except (TypeError, ValueError):
            pass
    return 4


def read_crt(query):
    return query("select crt from col")[0][0]


def read_decks(query):
    return {int(i): str(n).replace("\x1f", "::") for i, n in query("select id, name from decks")}


def review_events(query, after_id=0, rollover=4, crt=None):
    """Révisions d'id > after_id, dans l'ordre. Mêmes champs que sensor.js (readCopy)."""
    c_day = local_anki_day(crt * 1000, rollover) if crt else None
    rows = query(
        "select r.id, r.cid, r.ease, r.ivl, r.lastIvl, r.type, r.time, c.did, c.odid "
        "from revlog r left join cards c on c.id = r.cid where r.id > ? order by r.id",
        after_id,
    )
    out = []
    for rid, cid, ease, ivl, last_ivl, rtype, ms, did, odid in rows:
        t = int(rid)
        day = local_anki_day(t, rollover)
        out.append({
            "v": 1, "k": "review", "id": "rv:%d" % t, "src": "revlog", "t": t, "day": day,
            "aday": (day - c_day) if c_day is not None else None, "cid": int(cid),
            "did": int(odid) if odid else (None if did is None else int(did)),
            "b": ease, "p": last_ivl if last_ivl > 0 else 0, "ivl": ivl if ivl > 0 else 0,
            "rt": rtype, "ms": ms, "nw": 1 if (rtype == 0 and last_ivl == 0) else 0,
        })
    return out


def snapshot(query, now_ms, dev, rollover, crt, decks, reviews):
    """Photo du jour par paquet (même logique que snapshotFrom de sensor.js)."""
    today = local_anki_day(now_ms, rollover)
    a_today = today - (local_anki_day(crt * 1000, rollover) if crt else today)
    keys = ("new", "learn", "young", "mature", "suspended", "buried", "due", "total", "leech", "edited1", "edited7", "dueMorning")
    tot = dict.fromkeys(keys, 0)
    per = {}
    ed1 = day_start_ms(today, rollover) / 1000
    ed7 = day_start_ms(today - 6, rollover) / 1000
    deck_of = {}
    rows = query(
        "select c.id, c.did, c.odid, c.type, c.queue, c.ivl, c.due, n.tags, n.mod "
        "from cards c left join notes n on n.id = c.nid"
    )
    for cid, did, odid, ctype, queue, ivl, due, tags, nmod in rows:
        d = odid if odid else did
        deck_of[cid] = d
        k = per.get(d)
        if k is None:
            k = per[d] = dict(name=decks.get(d, str(d)), **dict.fromkeys(keys, 0))

        def add(f):
            k[f] += 1
            tot[f] += 1

        add("total")
        if isinstance(tags, str) and re.search(r" leech ", " " + tags + " ", re.I):
            add("leech")
        if nmod is not None and nmod >= ed1:
            add("edited1")
        if nmod is not None and nmod >= ed7:
            add("edited7")
        if queue == -1:
            add("suspended")
            continue
        if queue in (-2, -3):
            add("buried")
            continue
        if ctype == 0:
            add("new")
            continue
        if ctype in (1, 3):
            add("learn")
        elif ctype == 2:
            add("mature" if ivl >= 21 else "young")
        if queue == 1 or (queue in (2, 3) and due <= a_today):
            add("due")
    done_today = {e["cid"] for e in reviews if e["day"] == today and e["rt"] in (1, 2)}
    for k in per.values():
        k["dueMorning"] = k["due"]
    tot["dueMorning"] = tot["due"]
    for cid in done_today:
        d = deck_of.get(cid)
        if d is not None and d in per:
            per[d]["dueMorning"] += 1
        tot["dueMorning"] += 1
    return {
        "v": 1, "k": "state", "id": "st:%s:%d" % (dev, today), "t": now_ms, "day": today, "aday": a_today,
        "src": "revlog", "dueMorning": tot["due"] + len(done_today), "approx": len(done_today) > 0,
        "totals": tot, "decks": {str(d): v for d, v in per.items()},
    }


class Sensor:
    """État du capteur pour une collection ouverte. `query` lit la collection ; `store` garde les
    photos du jour (dict jour -> photo, persisté par l'appelant)."""

    SNAPSHOT_EVERY_MS = 60000

    def __init__(self, query, dev, snapshots=None):
        self.query = query
        self.dev = dev
        self.snapshots = snapshots if snapshots is not None else {}
        self.events = []          # révisions puis photos, dans l'ordre d'arrivée (le curseur est un index)
        self.last_rid = 0
        self.from_ms = None       # début de la partie (epoch du jeu) : l'historique antérieur n'est pas lu
        self.reset = False
        self.rollover = 4
        self.crt = None
        self.decks = {}
        self.current = None       # dernière photo, servie dans le statut
        self.last_snapshot_ms = 0
        self.last_refresh = 0
        self.error = None
        self.ms = 0
        for day in sorted(self.snapshots, key=int):
            self.events.append(self.snapshots[day])

    def ensure_from(self, from_ms):
        """Ne lit le revlog qu'à partir de `from_ms` (le jour où la partie a commencé) : une collection
        de plusieurs années ne remplit pas la page. Si la partie commence plus tôt que ce qui a été lu,
        on relit depuis ce point et la page reçoit tout à nouveau (elle déduplique par id)."""
        if self.from_ms is not None and from_ms >= self.from_ms:
            return
        self.from_ms = from_ms
        self.last_rid = from_ms - 1
        self.events = [e for e in self.events if e["k"] != "review"]
        self.reset = True

    def refresh(self, now_ms=None, force=False):
        now_ms = now_ms or int(time.time() * 1000)
        started = time.time()
        try:
            self.rollover = read_rollover(self.query)
            self.crt = read_crt(self.query)
            new = review_events(self.query, self.last_rid, self.rollover, self.crt)
            if new:
                self.last_rid = int(new[-1]["t"])
                self.events.extend(new)
            today = local_anki_day(now_ms, self.rollover)
            stale = self.current is None or self.current["day"] != today
            if force or new or stale or now_ms - self.last_snapshot_ms > self.SNAPSHOT_EVERY_MS:
                self.decks = read_decks(self.query)
                reviews = [e for e in self.events if e["k"] == "review" and e["day"] == today]
                self.current = snapshot(self.query, now_ms, self.dev, self.rollover, self.crt, self.decks, reviews)
                self.last_snapshot_ms = now_ms
                if str(today) not in self.snapshots:
                    # une seule photo journalisée par jour : la première (la plus proche du matin)
                    self.snapshots[str(today)] = self.current
                    self.events.append(self.current)
            self.error = None
            return new
        except Exception as e:  # le jeu doit continuer, l'erreur est montrée dans le badge
            self.error = str(e)
            return []
        finally:
            self.last_refresh = int(time.time() * 1000)
            self.ms = int((time.time() - started) * 1000)

    def events_since(self, since):
        since = 0 if self.reset else max(0, int(since or 0))
        self.reset = False
        return {"cursor": len(self.events), "events": self.events[since:]}

    def status(self):
        return {
            "device": self.dev, "source": "addon", "error": self.error, "lastRefresh": self.last_refresh,
            "refreshMs": self.ms, "events": len(self.events), "rollover": self.rollover, "crt": self.crt,
            "today": local_anki_day(int(time.time() * 1000), self.rollover), "snapshot": self.current,
        }
