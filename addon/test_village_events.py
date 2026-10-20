"""Tests du capteur de l'add-on sur une petite collection construite à la main (sqlite3, sans Anki).
Lancement : python3 -I -m unittest discover -s addon -p 'test_*.py'"""

import os
import sqlite3
import sys
import time
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import village_events as V  # noqa: E402

DAY = 86400000


def make_db():
    db = sqlite3.connect(":memory:")
    db.executescript("""
        create table col (crt integer);
        create table config (key text, val blob);
        create table decks (id integer, name text);
        create table notes (id integer, tags text, mod integer);
        create table cards (id integer, nid integer, did integer, odid integer, type integer, queue integer,
                            ivl integer, due integer, data text);
        create table revlog (id integer, cid integer, ease integer, ivl integer, lastIvl integer,
                             type integer, time integer);
    """)
    return db


class SensorTest(unittest.TestCase):
    def setUp(self):
        self.now = int(time.time() * 1000)
        self.today = V.local_anki_day(self.now, 4)
        start = V.day_start_ms(self.today, 4)
        db = self.db = make_db()
        crt = (start - 30 * DAY) // 1000
        db.execute("insert into col values (?)", (crt,))
        db.execute("insert into config values ('rollover', ?)", (b"4",))
        db.execute("insert into decks values (1, 'Langues\x1fLSF')")
        db.execute("insert into notes values (10, ' leech ', 0)")
        db.execute("insert into notes values (11, '', ?)", (self.now // 1000,))
        a_today = self.today - V.local_anki_day(crt * 1000, 4)
        db.executemany("insert into cards values (?,?,?,?,?,?,?,?,?)", [
            (100, 10, 1, 0, 2, 2, 30, a_today, ""),      # mûre, due aujourd'hui, sangsue
            (101, 11, 1, 0, 2, 2, 5, a_today + 3, ""),   # jeune, pas due, note modifiée aujourd'hui
            (102, 11, 1, 0, 0, 0, 0, 0, ""),             # nouvelle
            (103, 11, 1, 0, 2, -1, 40, 0, ""),           # suspendue
        ])
        self.r1 = start + 3600000
        db.executemany("insert into revlog values (?,?,?,?,?,?,?)", [
            (start - DAY + 1000, 101, 3, 5, 2, 1, 4000),   # hier
            (self.r1, 101, 1, 1, 5, 1, 9000),              # aujourd'hui, À revoir sur une jeune
            (self.r1 + 1000, 100, 4, 60, 30, 1, 3000),     # aujourd'hui, mûre avant (p = 30)
            (self.r1 + 2000, 102, 3, 0, 0, 0, 2000),       # toute première réponse
        ])
        self.q = lambda sql, *a: db.execute(sql, a).fetchall()

    def test_events_match_sensor_js_fields(self):
        evs = V.review_events(self.q, 0, 4, None)
        self.assertEqual([e["id"] for e in evs][1:], ["rv:%d" % self.r1, "rv:%d" % (self.r1 + 1000), "rv:%d" % (self.r1 + 2000)])
        e = evs[2]
        self.assertEqual((e["cid"], e["did"], e["b"], e["p"], e["ivl"], e["rt"], e["ms"], e["nw"]), (100, 1, 4, 30, 60, 1, 3000, 0))
        self.assertEqual(evs[3]["nw"], 1)
        self.assertEqual(evs[1]["day"], self.today)
        self.assertEqual(evs[0]["day"], self.today - 1)

    def test_snapshot(self):
        s = V.Sensor(self.q, "desktop-test")
        s.refresh(self.now)
        st = s.current
        t = st["totals"]
        self.assertEqual((t["total"], t["new"], t["young"], t["mature"], t["suspended"], t["leech"], t["edited1"]), (4, 1, 1, 1, 1, 1, 3))  # edited1 compte les cartes (3 sur la note 11)
        self.assertEqual(t["due"], 1)
        # dues du matin : dues restantes + cartes en révision répondues aujourd'hui (100 et 101)
        self.assertEqual(st["dueMorning"], 3)
        self.assertTrue(st["approx"])
        self.assertEqual(st["decks"]["1"]["name"], "Langues::LSF")

    def test_incremental_and_cursor(self):
        s = V.Sensor(self.q, "d")
        s.refresh(self.now)
        first = s.events_since(0)
        n = first["cursor"]
        self.assertEqual(n, 4)                       # 3 révisions du jour + 1 photo (sans début de partie : aujourd'hui seulement)
        self.db.execute("insert into revlog values (?,?,?,?,?,?,?)", (self.r1 + 5000, 101, 3, 2, 1, 1, 1000))
        new = s.refresh(self.now)
        self.assertEqual(len(new), 1)
        self.assertEqual(s.events_since(n)["events"][0]["id"], "rv:%d" % (self.r1 + 5000))
        self.assertEqual(len(s.snapshots), 1)        # une seule photo journalisée par jour

    def test_from_skips_history_and_resends_on_earlier_start(self):
        s = V.Sensor(self.q, "d")
        s.ensure_from(V.day_start_ms(self.today, 4))
        s.refresh(self.now)
        ids = [e["id"] for e in s.events_since(0)["events"] if e["k"] == "review"]
        self.assertEqual(len(ids), 3)                # l'historique d'hier n'est pas lu
        cur = s.events_since(0)["cursor"]
        s.ensure_from(V.day_start_ms(self.today - 1, 4))
        s.refresh(self.now)
        again = s.events_since(cur)                  # partie plus ancienne : tout est renvoyé
        self.assertEqual(len([e for e in again["events"] if e["k"] == "review"]), 4)

    def test_day_done(self):
        s = V.Sensor(self.q, "d")
        s.refresh(self.now)
        self.assertEqual(s.done, {})                 # carte 100 encore due
        self.db.execute("update cards set due = due + 5 where id = 100")
        s.refresh(self.now + 61000)                  # nouvelle photo après une minute
        self.assertEqual(list(s.done), [str(self.today)])
        ev = s.events_since(0)["events"][-1]
        self.assertEqual((ev["k"], ev["day"]), ("done", self.today))
        s.refresh(self.now + 200000, force=True)
        self.assertEqual(len([e for e in s.events if e["k"] == "done"]), 1)   # une seule fois par jour

    def test_day_done_refused_when_cards_suspended_today(self):
        s = V.Sensor(self.q, "d")
        s.refresh(self.now)
        self.db.execute("update cards set queue = -1 where id = 100")   # vider sa file en suspendant
        s.refresh(self.now + 61000)
        self.assertEqual(s.done, {})

    def test_strip_html(self):
        self.assertEqual(V.strip_html("<style>x{}</style><b>Bon</b>jour<br>&amp; toi"), "Bon jour\n& toi")


if __name__ == "__main__":
    unittest.main()
