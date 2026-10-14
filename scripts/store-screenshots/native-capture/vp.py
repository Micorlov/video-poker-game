"""Emulator driver helpers for the native Video Poker store screenshots."""
import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET

ADB = os.path.expanduser("~/Library/Android/sdk/platform-tools/adb")
SERIAL = "emulator-5554"
PKG = "com.micorlov.videopoker"
ACTIVITY = PKG + "/.nativeapp.MainActivity"
PREFS = "shared_prefs/video_poker_native.xml"
RES = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..",
                                   "android-native", "app", "src", "main", "res"))


def sh(args, inp=None, check=True):
    r = subprocess.run([ADB, "-s", SERIAL] + args, input=inp, capture_output=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"adb {args} failed: {r.stderr.decode(errors='replace')}")
    return r.stdout


def start_server():
    subprocess.run([ADB, "start-server"], capture_output=True)


def prefs_xml(lang, variant="jacks", hands=1, hints=False, balance=5000):
    longs = {"game.balance": balance, "game.bestBalance": 6200, "review.shownAt": 0, "review.lastCardAt": 0,
             "game.allTime.won": 0, "game.allTime.lost": 0, "game.today.won": 0, "game.today.lost": 0,
             "game.allTime.mistakeMilli": 0, "game.today.mistakeMilli": 0}
    ints = {"game.lifetimeHands": 150, "game.handCount": hands, "settings.defaultBet": 10,
            "review.cardCount": 3, "review.wins": 0, "game.winStreak": 0, "game.lossStreak": 0,
            "flags.allInDailyLimit": 1}
    bools = {"onboarding.seen": True, "review.rated": True, "review.shown": True,
             "link.referrerRead": True, "settings.hints": hints, "settings.voice": False,
             "settings.sound": True, "settings.haptics": False, "settings.feedback": True,
             "settings.doubleUp": True}
    strings = {"game.variant": variant, "settings.language": lang, "daily.bonusDay": "2026-10-14",
               "review.firstDay": "2026-01-01", "settings.theme": "green", "settings.speed": "fast"}
    out = ["<?xml version='1.0' encoding='utf-8' standalone='yes' ?>", "<map>"]
    out += [f'    <long name="{k}" value="{v}" />' for k, v in longs.items()]
    out += [f'    <int name="{k}" value="{v}" />' for k, v in ints.items()]
    out += [f'    <boolean name="{k}" value="{str(v).lower()}" />' for k, v in bools.items()]
    out += [f'    <string name="{k}">{v}</string>' for k, v in strings.items()]
    out.append("</map>")
    return "\n".join(out) + "\n"


def launch(lang, **kw):
    sh(["shell", "am", "force-stop", PKG])
    sh(["shell", f"run-as {PKG} sh -c 'cat > {PREFS}'"], inp=prefs_xml(lang, **kw).encode())
    sh(["shell", "am", "start", "-W", "-n", ACTIVITY])
    time.sleep(3.0)


BOUNDS = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


def dump():
    for attempt in range(5):
        try:
            out = sh(["shell", "uiautomator", "dump", "/sdcard/ui.xml"])
            if b"ERROR" in out:
                raise RuntimeError(out.decode(errors="replace"))
            root = ET.fromstring(sh(["exec-out", "cat", "/sdcard/ui.xml"]))
            break
        except Exception:
            if attempt == 4:
                raise
            start_server()
            time.sleep(1.0)
    nodes = []
    for n in root.iter("node"):
        b = BOUNDS.match(n.get("bounds", ""))
        if not b:
            continue
        x1, y1, x2, y2 = map(int, b.groups())
        nodes.append({"id": n.get("resource-id", ""), "text": n.get("text", ""), "desc": n.get("content-desc", ""),
                      "bounds": (x1, y1, x2, y2), "cls": n.get("class", "")})
    return nodes


def find(nodes, rid):
    return [n for n in nodes if n["id"] == rid]


def tap_xy(x, y):
    sh(["shell", "input", "tap", str(x), str(y)])


def tap_node(n):
    x1, y1, x2, y2 = n["bounds"]
    tap_xy((x1 + x2) // 2, (y1 + y2) // 2)


def tap_id(rid, nodes=None):
    nodes = nodes or dump()
    m = find(nodes, rid)
    if not m:
        raise RuntimeError(f"no node {rid}")
    tap_node(m[0])
    return m[0]


def swipe(x1, y1, x2, y2, ms=400):
    sh(["shell", "input", "swipe", str(x1), str(y1), str(x2), str(y2), str(ms)])


def screencap(path):
    data = sh(["exec-out", "screencap", "-p"])
    with open(path, "wb") as f:
        f.write(data)


def demo_mode(on=True):
    b = lambda *a: sh(["shell", "am", "broadcast", "-a", "com.android.systemui.demo", *a])
    if not on:
        b("-e", "command", "exit")
        return
    b("-e", "command", "enter")
    b("-e", "command", "clock", "-e", "hhmm", "0941")
    b("-e", "command", "battery", "-e", "level", "100", "-e", "plugged", "false")
    b("-e", "command", "network", "-e", "wifi", "show", "-e", "level", "4")
    b("-e", "command", "network", "-e", "mobile", "show", "-e", "datatype", "none", "-e", "level", "4")
    b("-e", "command", "notifications", "-e", "visible", "false")


# ---- card parsing from localized content descriptions ----
RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
RANK_VALUES = [14, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
SUITS = ["s", "h", "d", "c"]

RES_DIR = {"en": "values", "pt-BR": "values-pt-rBR", "zh-CN": "values-zh-rCN", "id": "values-in", "he": "values-iw"}


def _array(lang, name):
    d = RES_DIR.get(lang, "values-" + lang)
    root = ET.parse(os.path.join(RES, d, "strings.xml")).getroot()
    for a in root.iter("string-array"):
        if a.get("name") == name:
            return [(i.text or "").strip().strip('"') for i in a.iter("item")]
    if lang != "en":
        return _array("en", name)
    raise KeyError(name)


def card_parser(lang):
    ranks = _array(lang, "rank_names")
    suits = _array(lang, "suit_names")

    def parse(desc):
        # pick the longest rank name and suit name present (ranks like "10" vs "1")
        s = next((i for i, n in sorted(enumerate(suits), key=lambda t: -len(t[1])) if n and n in desc), None)
        rest = desc.replace(suits[s], " ") if s is not None else desc
        r = next((i for i, n in sorted(enumerate(ranks), key=lambda t: -len(t[1])) if n and n in rest), None)
        if r is None or s is None:
            return None
        return (RANK_VALUES[r], SUITS[s])
    return parse


def read_hand(lang, nodes=None):
    nodes = nodes or dump()
    parse = card_parser(lang)
    hand = []
    for i in range(5):
        m = find(nodes, f"card-{i}")
        if not m:
            return None, nodes
        desc = m[0]["desc"] or " ".join(n["desc"] for n in nodes if n["desc"] and _inside(n, m[0]))
        hand.append(parse(desc))
    return hand, nodes


def _inside(n, box):
    a, b = n["bounds"], box["bounds"]
    return a[0] >= b[0] and a[1] >= b[1] and a[2] <= b[2] and a[3] <= b[3]
