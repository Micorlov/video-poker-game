"""A simplified Jacks or Better / Deuces Wild hold strategy, good enough to look sensible."""
from collections import Counter
from itertools import combinations


def _is_straight(vals):
    v = sorted(set(vals))
    if len(v) != 5:
        return False
    return v[4] - v[0] == 4 or v == [2, 3, 4, 5, 14]


def classify_jacks(hand):
    vals = [c[0] for c in hand]
    suits = [c[1] for c in hand]
    counts = sorted(Counter(vals).values(), reverse=True)
    flush = len(set(suits)) == 1
    straight = _is_straight(vals)
    if flush and straight:
        return "royal" if min(vals) == 10 else "straight_flush"
    if counts[0] == 4:
        return "quads"
    if counts == [3, 2]:
        return "full_house"
    if flush:
        return "flush"
    if straight:
        return "straight"
    if counts[0] == 3:
        return "trips"
    if counts[:2] == [2, 2]:
        return "two_pair"
    if counts[0] == 2:
        pair = [v for v, n in Counter(vals).items() if n == 2][0]
        return "jacks" if pair >= 11 else "nothing"
    return "nothing"


STRAIGHT_PLUS = {"royal", "straight_flush", "quads", "full_house", "flush", "straight"}
RANK = ["nothing", "jacks", "two_pair", "trips", "straight", "flush", "full_house", "quads", "straight_flush", "royal"]


def _mask(idx):
    return [i in idx for i in range(5)]


def _suited_groups(hand):
    by = {}
    for i, c in enumerate(hand):
        by.setdefault(c[1], []).append(i)
    return by


def jacks_holds(hand):
    vals = [c[0] for c in hand]
    kind = classify_jacks(hand)
    if kind in STRAIGHT_PLUS:
        return [True] * 5
    cnt = Counter(vals)
    paired = [i for i, v in enumerate(vals) if cnt[v] >= 2]
    if kind in ("trips", "two_pair"):
        return _mask(paired)
    by = _suited_groups(hand)
    for idx in by.values():  # 4 to a royal
        royal = [i for i in idx if vals[i] >= 10]
        if len(royal) == 4:
            return _mask(royal)
    if kind == "jacks":
        return _mask(paired)
    for idx in by.values():  # 4 to a straight flush / flush
        if len(idx) >= 4:
            return _mask(idx[:4])
    if paired:  # low pair
        return _mask(paired)
    for idx in by.values():  # 3 to a royal
        royal = [i for i in idx if vals[i] >= 10]
        if len(royal) == 3:
            return _mask(royal)
    for combo in combinations(range(5), 4):  # 4 to an outside straight
        v = sorted(vals[i] for i in combo)
        if len(set(v)) == 4 and v[3] - v[0] == 3 and v[3] < 14:
            return _mask(combo)
    high = [i for i in range(5) if vals[i] >= 11]
    for idx in by.values():  # two suited high cards
        hs = [i for i in idx if vals[i] >= 11]
        if len(hs) >= 2:
            return _mask(hs[:2])
    if len(high) >= 2:
        high.sort(key=lambda i: vals[i])
        return _mask(high[:2])
    if high:
        return _mask(high[:1])
    return [False] * 5


def deuces_holds(hand):
    vals = [c[0] for c in hand]
    deuces = [i for i, v in enumerate(vals) if v == 2]
    rest = [i for i in range(5) if vals[i] != 2]
    cnt = Counter(vals[i] for i in rest)
    if not deuces and classify_jacks(hand) in STRAIGHT_PLUS:
        return [True] * 5
    paired = [i for i in rest if cnt[vals[i]] >= 2]
    if len(deuces) == 4:
        return _mask(deuces)
    if deuces:  # a flush or straight already made with the wild cards
        rest_vals = [vals[i] for i in rest]
        if len({hand[i][1] for i in rest}) == 1:
            return [True] * 5
        if len(set(rest_vals)) == len(rest_vals) and (max(rest_vals) - min(rest_vals) <= 4
                                                     or all(v in (14, 3, 4, 5) for v in rest_vals)):
            return [True] * 5
    if paired:
        best = max(cnt.values())
        keep = [i for i in rest if cnt[vals[i]] == best]
        if best >= 2 and len(set(vals[i] for i in keep)) > 1:  # two pair: keep one pair
            top = max(vals[i] for i in keep)
            keep = [i for i in keep if vals[i] == top]
        return _mask(deuces + keep)
    by = {}
    for i in rest:
        by.setdefault(hand[i][1], []).append(i)
    for idx in by.values():
        if len(idx) + len(deuces) >= 4:
            return _mask(deuces + idx[: 4 - len(deuces)])
    return _mask(deuces)


def draws_hint_something(hand):
    return any(jacks_holds(hand))
