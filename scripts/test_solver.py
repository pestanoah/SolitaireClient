import subprocess
import os

SUITS = ["spades", "hearts", "diamonds", "clubs"]
RANKS = list(range(1, 14))

# FNV-1a hash to 32-bit uint (as in src/engine/deck.ts)
def hash_string_to_seed(s):
    # JavaScript Math.imul imitation
    def imul(a, b):
        return ((a * b) & 0xFFFFFFFF)
    
    h = 2166136261
    for ch in s:
        h = imul(h ^ ord(ch), 16777619)
    h = ((h ^ (h >> 16)) * 0x85ebca6b) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 0xc2b2ae35) & 0xFFFFFFFF
    h = (h ^ (h >> 16)) & 0xFFFFFFFF
    return h or 1

# Mulberry32 PRNG
def create_prng(seed):
    if isinstance(seed, int):
        s = seed & 0xFFFFFFFF or 1
    else:
        s = hash_string_to_seed(str(seed))
    
    def next_rand():
        nonlocal s
        s = (s + 0x6d2b79f5) & 0xFFFFFFFF
        t = ((s ^ (s >> 15)) * (1 | s)) & 0xFFFFFFFF
        t = ((t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF)) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return next_rand

def create_deck():
    cards = []
    for s in SUITS:
        for r in RANKS:
            cards.append({"suit": s, "rank": r})
    return cards

def shuffle_cards(cards, seed):
    deck = list(cards)
    rnd = create_prng(seed)
    for i in range(len(deck) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        deck[i], deck[j] = deck[j], deck[i]
    return deck

# Tableau mapping
shootme_to_pos = {}
i = 0
for j in range(7):
    shootme_to_pos[i] = (j, j)
    i += 1
    for k in range(j + 1, 7):
        shootme_to_pos[i] = (k, j)
        i += 1
for k in range(24):
    shootme_to_pos[28 + k] = ("stock", 23 - k)

clean_deck_to_pos = {}
idx = 0
for col in range(7):
    for row in range(col + 1):
        clean_deck_to_pos[idx] = (col, row)
        idx += 1
for stock_idx in range(24):
    clean_deck_to_pos[28 + stock_idx] = ("stock", stock_idx)

pos_to_clean = {pos: c_idx for c_idx, pos in clean_deck_to_pos.items()}
shootme_to_clean = [pos_to_clean[shootme_to_pos[i]] for i in range(52)]

suit_map = {"clubs": "1", "diamonds": "2", "hearts": "3", "spades": "4"}

def deck_to_shootme_string(deck):
    shootme_cards = [deck[shootme_to_clean[i]] for i in range(52)]
    parts = []
    for c in shootme_cards:
        parts.append(f"{c['rank']:02d}{suit_map[c['suit']]}")
    return "".join(parts)

if __name__ == "__main__":
    deck1 = shuffle_cards(create_deck(), "1")
    str1 = deck_to_shootme_string(deck1)
    res = subprocess.run(["/tmp/Klondike-Solver/KlondikeSolver", "/DC", "1", "/D", str1, "/FAST"], capture_output=True, text=True)
    out_lines = [line for line in res.stdout.splitlines() if "Solved" in line or "Impossible" in line or "Unknown" in line]
    print("Seed '1' Draw 1 result:", out_lines)
