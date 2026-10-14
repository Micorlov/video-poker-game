"""Captures the six Play store scenes of the native app on emulator-5554, per app language.

Each scene seeds the app's SharedPreferences through run-as (level-31 save, onboarding and
rating ask done, chosen language/variant/hand count/hints), relaunches, and plays real
hands dealt by the game. Frame the results with ../native-frame.js.

Usage: python3 scripts/store-screenshots/native-capture/capture.py <rawDir> lang [lang ...]
       ONLY=3,4 python3 ... re-shoots just those scenes.
Writes <rawDir>/<lang>/s1..s6.png and appends one line per scene to <rawDir>/log.txt.
Needs the debug APK installed on emulator-5554 (adb at ~/Library/Android/sdk/platform-tools).
"""
import json
import os
import sys
import time

import strategy as st
import vp

MAX_STRAIGHT_HANDS = 150
LOG = None


def log(msg):
    print(msg, flush=True)
    with open(LOG, "a") as f:
        f.write(msg + "\n")


def hold(mask, nodes):
    for i, x in enumerate(mask):
        if x:
            vp.tap_id(f"card-{i}", nodes)
            time.sleep(0.25)


def fresh_deal(lang, accept, tries, **kw):
    """Relaunches (each launch deals) until accept(hand) or tries run out; returns (hand, nodes, n)."""
    hand = nodes = None
    for n in range(1, tries + 1):
        vp.launch(lang, **kw)
        hand, nodes = vp.read_hand(lang)
        if hand and None not in hand and accept(hand):
            return hand, nodes, n
    return hand, nodes, tries


def scene1(lang, out):
    hand, nodes, n = fresh_deal(lang, lambda h: sum(st.jacks_holds(h)) >= 2, 8)
    mask = st.jacks_holds(hand)
    hold(mask, nodes)
    time.sleep(0.8)
    vp.screencap(out)
    return f"hand={hand} holds={mask} launches={n}"


def scene2(lang, out):
    hand, nodes, n = fresh_deal(lang, lambda h: any(c[0] == 2 for c in h), 14, variant="deuces")
    mask = st.deuces_holds(hand)
    hold(mask, nodes)
    time.sleep(0.8)
    vp.screencap(out)
    deuce = any(c[0] == 2 for c in hand)
    return f"hand={hand} holds={mask} launches={n} deuce={deuce}"


def scroll_card_top_to(target_y):
    for _ in range(5):
        card = vp.find(vp.dump(), "card-0")[0]
        delta = card["bounds"][1] - target_y
        if abs(delta) < 12:
            return
        vp.swipe(540, 1500, 540, 1500 - delta, 1500)
        time.sleep(1.0)


BEST_PLAY_MARK = "\u2713"  # the result panel's "✓ Best play" line, in every language
MAX_FIVE_PLAY_DEALS = 5


def judged_best_play(nodes):
    """True when the result panel's review line is the localized '✓ Best play'."""
    return any(n["text"].startswith(BEST_PLAY_MARK) for n in nodes)


def scene3(lang, out):
    good = lambda h: st.classify_jacks(h) != "nothing"
    for deal in range(1, MAX_FIVE_PLAY_DEALS + 1):
        hand, nodes, n = fresh_deal(lang, good, 10, hands=5)
        mask = st.jacks_holds(hand)
        hold(mask, nodes)
        vp.tap_id("main-button", nodes)
        time.sleep(4.5)
        if judged_best_play(vp.dump()):
            break
    # Open the pay table so the page is tall enough to scroll the main hand to the top.
    vp.swipe(540, 1900, 540, 500, 600)
    time.sleep(1.2)
    vp.tap_id("paytable")
    time.sleep(1.0)
    scroll_card_top_to(175)
    time.sleep(0.8)
    vp.screencap(out)
    return f"hand={hand} holds={mask} launches={n} deals={deal}"


def scene4(lang, out):
    vp.launch(lang)
    best = None
    for played in range(1, MAX_STRAIGHT_HANDS + 1):
        hand, nodes = vp.read_hand(lang)
        mask = st.jacks_holds(hand)
        hold(mask, nodes)
        vp.tap_id("main-button", nodes)
        time.sleep(2.2)
        final, nodes = vp.read_hand(lang)
        kind = st.classify_jacks(final) if final and None not in final else "nothing"
        enough = kind in st.STRAIGHT_PLUS or (played >= MAX_STRAIGHT_HANDS - 20 and kind in ("trips", "two_pair"))
        if enough:
            time.sleep(3.5)
            vp.screencap(out)
            return f"win={kind} final={final} hands={played}"
        vp.tap_id("main-button", nodes)  # deal the next hand
        time.sleep(2.0)
    return "NO WIN CAPTURED"


def scene5(lang, out):
    hand, nodes, n = fresh_deal(lang, lambda h: sum(st.jacks_holds(h)) >= 2, 8, hints=True)
    time.sleep(1.5)
    vp.screencap(out)
    return f"hand={hand} launches={n}"


def scene6(lang, out):
    vp.launch(lang)
    vp.tap_id("tab-settings")
    time.sleep(1.5)
    vp.tap_id("language-row")
    time.sleep(1.5)
    if lang in ("ar", "he"):
        vp.swipe(540, 1700, 540, 700, 800)
        time.sleep(1.2)
    vp.screencap(out)
    return "language dialog"


SCENES = [scene1, scene2, scene3, scene4, scene5, scene6]


def main():
    global LOG
    raw = sys.argv[1]
    langs = sys.argv[2:]
    only = os.environ.get("ONLY")
    LOG = os.path.join(raw, "log.txt")
    vp.start_server()
    vp.demo_mode(True)
    vp.sh(["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "network", "-e", "mobile", "hide"])
    vp.sh(["shell", "am", "broadcast", "-a", "com.android.systemui.demo", "-e", "command", "network",
           "-e", "wifi", "show", "-e", "level", "4", "-e", "fully", "true"])
    for lang in langs:
        os.makedirs(os.path.join(raw, lang), exist_ok=True)
        for i, scene in enumerate(SCENES, 1):
            if only and str(i) not in only.split(","):
                continue
            for attempt in range(3):
                try:
                    info = scene(lang, os.path.join(raw, lang, f"s{i}.png"))
                    log(f"{lang} s{i}: {info}")
                    break
                except Exception as e:  # retry flaky adb/ui steps
                    log(f"{lang} s{i}: attempt {attempt + 1} failed: {e!r}")
                    vp.start_server()
    vp.sh(["shell", "am", "force-stop", vp.PKG])


if __name__ == "__main__":
    main()
