#!/usr/bin/env python3
import subprocess
import os
import sys
import json
import time
from datetime import date, timedelta
from concurrent.futures import ProcessPoolExecutor

SOLVER_BIN = "/tmp/Klondike-Solver/KlondikeSolver"
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "data")
SUITS = ["spades", "hearts", "diamonds", "clubs"]
RANKS = list(range(1, 14))

def ensure_solver():
    if not os.path.exists(SOLVER_BIN):
        print(f"Building solver at /tmp/Klondike-Solver...")
        os.system("git clone --depth 1 https://github.com/ShootMe/Klondike-Solver.git /tmp/Klondike-Solver && cd /tmp/Klondike-Solver && make")
    if not os.path.exists(SOLVER_BIN):
        raise RuntimeError("Failed to build KlondikeSolver at /tmp/Klondike-Solver")

# FNV-1a hash matching src/engine/deck.ts
def hash_string_to_seed(s: str) -> int:
    h = 2166136261
    for ch in s:
        h = ((h ^ ord(ch)) * 16777619) & 0xFFFFFFFF
    h = ((h ^ (h >> 16)) * 0x85ebca6b) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 0xc2b2ae35) & 0xFFFFFFFF
    h = (h ^ (h >> 16)) & 0xFFFFFFFF
    return h or 1

# Mulberry32 PRNG matching src/engine/deck.ts
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

# Pre-computed mapping between our cleanDeck and ShootMe cards[0..51]
clean_deck_to_pos = {}
idx = 0
for col in range(7):
    for row in range(col + 1):
        clean_deck_to_pos[idx] = (col, row)
        idx += 1
for stock_idx in range(24):
    clean_deck_to_pos[28 + stock_idx] = ("stock", stock_idx)

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

pos_to_clean = {pos: c_idx for c_idx, pos in clean_deck_to_pos.items()}
SHOOTME_TO_CLEAN = [pos_to_clean[shootme_to_pos[i]] for i in range(52)]
SUIT_MAP = {"clubs": "1", "diamonds": "2", "hearts": "3", "spades": "4"}

def deck_to_shootme_string(deck):
    shootme_cards = [deck[SHOOTME_TO_CLEAN[i]] for i in range(52)]
    return "".join(f"{c['rank']:02d}{SUIT_MAP[c['suit']]}" for c in shootme_cards)

BASE_DECK = create_deck()

def check_seed_draw(seed_str: str, draw_count: int, max_states: int = 25000) -> bool:
    deck = shuffle_cards(BASE_DECK, seed_str)
    shootme_str = deck_to_shootme_string(deck)
    try:
        res = subprocess.run(
            [SOLVER_BIN, "/DC", str(draw_count), "/D", shootme_str, "/FAST", "/S", str(max_states), "/OUT", "2"],
            capture_output=True,
            text=True,
            timeout=1.5
        )
        return "Solved" in res.stdout
    except Exception:
        return False

def check_seed_worker(args):
    seed_val, draw_count = args
    return seed_val, check_seed_draw(str(seed_val), draw_count, max_states=25000)

def generate_winnable_pool(draw_count: int, target_count: int = 10000, batch_size: int = 400):
    os.makedirs(DATA_DIR, exist_ok=True)
    out_file = os.path.join(DATA_DIR, f"winnable_draw{draw_count}.json")
    
    winnable_seeds = []
    if os.path.exists(out_file):
        try:
            with open(out_file, "r") as f:
                winnable_seeds = json.load(f)
            print(f"Loaded existing {len(winnable_seeds)} seeds from {out_file}")
        except Exception:
            winnable_seeds = []
    
    current_seed = (max(winnable_seeds) + 1) if winnable_seeds else 1
    t0 = time.time()
    
    with ProcessPoolExecutor(max_workers=8) as executor:
        while len(winnable_seeds) < target_count:
            batch_items = [(current_seed + i, draw_count) for i in range(batch_size)]
            current_seed += batch_size
            
            results = list(executor.map(check_seed_worker, batch_items))
            for s, ok in results:
                if ok:
                    winnable_seeds.append(s)
                    if len(winnable_seeds) >= target_count:
                        break
            
            # Save progress
            with open(out_file, "w") as f:
                json.dump(winnable_seeds, f)
            
            elapsed = time.time() - t0
            rate = len(winnable_seeds) / max(elapsed, 0.001)
            print(f"Draw {draw_count}: {len(winnable_seeds)}/{target_count} winnable seeds collected ({rate:.1f} seeds/sec)")
    
    print(f"Completed Draw {draw_count} pool! Saved {len(winnable_seeds)} seeds to {out_file}")

def check_date_worker(date_str: str):
    # Try raw date first
    if check_seed_draw(date_str, 1) and check_seed_draw(date_str, 3):
        return date_str, None
    
    # Try salts until winnable in both Draw 1 and Draw 3
    salt_idx = 1
    while salt_idx <= 50:
        candidate = f"{date_str}_v{salt_idx}"
        if check_seed_draw(candidate, 1) and check_seed_draw(candidate, 3):
            return date_str, candidate
        salt_idx += 1
    
    # Fallback to high salt if needed
    return date_str, f"{date_str}_v99"

def generate_daily_challenges(start_year: int = 2026, num_years: int = 10, batch_size: int = 100):
    os.makedirs(DATA_DIR, exist_ok=True)
    out_file = os.path.join(DATA_DIR, "daily_challenges_10yr.json")
    
    overrides = {}
    if os.path.exists(out_file):
        try:
            with open(out_file, "r") as f:
                overrides = json.load(f)
            print(f"Loaded existing {len(overrides)} daily challenge overrides from {out_file}")
        except Exception:
            overrides = {}
    
    start_date = date(start_year, 1, 1)
    # 10 years ahead
    end_date = date(start_year + num_years - 1, 12, 31)
    total_days = (end_date - start_date).days + 1
    
    all_dates = []
    curr = start_date
    while curr <= end_date:
        d_str = curr.isoformat()
        all_dates.append(d_str)
        curr += timedelta(days=1)
    
    print(f"Validating {len(all_dates)} days from {start_date} to {end_date} for Draw 1 & Draw 3 winnability...")
    
    t0 = time.time()
    with ProcessPoolExecutor(max_workers=8) as executor:
        for i in range(0, len(all_dates), batch_size):
            chunk = all_dates[i:i + batch_size]
            results = list(executor.map(check_date_worker, chunk))
            for d_str, override in results:
                if override is not None:
                    overrides[d_str] = override
            
            with open(out_file, "w") as f:
                json.dump(overrides, f, indent=2)
            
            processed = min(i + batch_size, len(all_dates))
            elapsed = time.time() - t0
            print(f"Daily Challenges: {processed}/{len(all_dates)} days processed. {len(overrides)} overrides needed. ({elapsed:.1f}s)")
    
    print(f"Completed Daily Challenges! Saved {len(overrides)} overrides for {total_days} days to {out_file}")

if __name__ == "__main__":
    ensure_solver()
    mode = sys.argv[1] if len(sys.argv) > 1 else "all"
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 10000
    
    if mode == "draw1":
        generate_winnable_pool(1, target_count=count)
    elif mode == "draw3":
        generate_winnable_pool(3, target_count=count)
    elif mode == "daily":
        generate_daily_challenges(2026, 10)
    elif mode == "all":
        generate_daily_challenges(2026, 10)
        generate_winnable_pool(1, target_count=count)
        generate_winnable_pool(3, target_count=count)
    else:
        print("Usage: python3 scripts/generate_winnable_seeds.py [draw1|draw3|daily|all] [count]")
