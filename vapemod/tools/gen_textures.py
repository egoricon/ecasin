"""Generates the mod's original pixel-art textures (no real brands).

Run from the vapemod/ folder:  python3 tools/gen_textures.py
Requires Pillow.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "src/main/resources/assets/vapemod/textures"

T = (0, 0, 0, 0)


def hexc(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def save(img, rel):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path)
    print("wrote", path.relative_to(ROOT.parent.parent.parent.parent.parent))


def from_rows(rows, palette):
    h = len(rows)
    w = len(rows[0])
    img = Image.new("RGBA", (w, h), T)
    for y, row in enumerate(rows):
        assert len(row) == w, (y, row)
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), palette[ch])
    return img


# ---------------------------------------------------------------- vape (16x16)
# Pod device: dark mouthpiece, clear tank with liquid, black body, coloured screen.
VAPE_ROWS = [
    "................",
    "......mmmm......",
    "......mMMm......",
    ".....oggggo.....",
    ".....ogGggo.....",
    ".....oglllo.....",
    ".....olLllo.....",
    ".....sSSSSs.....",
    ".....bhbbbb.....",
    ".....bhcccb.....",
    ".....bhcCcb.....",
    ".....bhcccb.....",
    ".....bhbbbb.....",
    ".....bhbkkb.....",
    ".....bhbbbb.....",
    "......dddd......",
]


def vape_palette(screen, screen_hi, liquid, liquid_hi):
    return {
        "m": hexc("#2a2a2e"), "M": hexc("#4a4a52"),
        "o": hexc("#1b1b1f"),
        "g": hexc("#d8eef5", 150), "G": hexc("#ffffff", 200),
        "l": hexc(liquid, 210), "L": hexc(liquid_hi, 230),
        "s": hexc("#6d6d75"), "S": hexc("#a7a7b0"),
        "b": hexc("#141417"), "h": hexc("#34343a"),
        "c": hexc(screen), "C": hexc(screen_hi),
        "k": hexc("#55555e"),
        "d": hexc("#0c0c0e"),
    }


save(from_rows(VAPE_ROWS, vape_palette("#1f8f86", "#45d6c8", "#c06adf", "#e4a6f5")), "item/vape.png")
# brighter screen while inhaling (used by the "using_item" model condition)
save(from_rows(VAPE_ROWS, vape_palette("#3fe8d8", "#c8fff8", "#c06adf", "#e4a6f5")), "item/vape_active.png")

# ------------------------------------------------------- liquids (16x16 each)
# Dropper bottle with a coloured liquid and a small label.
LIQUID_ROWS = [
    "................",
    ".......cc.......",
    "......cCcc......",
    "......cccc......",
    "......nnnn......",
    ".....oNnnno.....",
    "....oggggggo....",
    "....oGgggggo....",
    "....olllllLo....",
    "....owwwwwwo....",
    "....owfFfwwo....",
    "....owwwwwwo....",
    "....olllllLo....",
    "....olllllLo....",
    ".....oooooo.....",
    "................",
]

FLAVOURS = {
    "apple": ("#d8352a", "#ff7a6b", "#5ab034"),
    "mint": ("#2fc79a", "#8ff5d2", "#e6fff6"),
    "berry": ("#8e2a8c", "#d066c9", "#3a1f6b"),
}

for name, (liq, liq_hi, accent) in FLAVOURS.items():
    pal = {
        "c": hexc("#26262b"), "C": hexc("#55555e"),
        "n": hexc("#e8e8ec"), "N": hexc("#ffffff"),
        "o": hexc("#2b2f33"),
        "g": hexc("#cfe7ee", 140), "G": hexc("#ffffff", 200),
        "l": hexc(liq, 230), "L": hexc(liq_hi, 240),
        "w": hexc("#f2efe6"),
        "f": hexc(liq), "F": hexc(accent),
    }
    save(from_rows(LIQUID_ROWS, pal), f"item/liquid_{name}.png")

# ------------------------------------------------------ HUD icons (9x9 each)
# Little vapour clouds, drawn like the vanilla hunger icons: an "empty" background
# with the full / half icon drawn on top of it.
CLOUD_BG = [
    "...ooo...",
    "..oeeeo..",
    ".ooeeeoo.",
    "oeeeeeeeo",
    "oeeeeeeeo",
    "oeeeeeeeo",
    ".oeeeeeo.",
    "..ooooo..",
    ".........",
]
CLOUD_FULL = [
    ".........",
    "...www...",
    "..wWWww..",
    ".wWWwwww.",
    ".wWwwwwg.",
    ".wwwwwgg.",
    "..wwggg..",
    ".........",
    ".........",
]
# left half of the full icon
CLOUD_HALF = [row[:5] + "." * 4 for row in CLOUD_FULL]
hud_pal = {
    "o": hexc("#1a1a1f"), "e": hexc("#3b3b44"),
    "w": hexc("#d7ecf3"), "W": hexc("#ffffff"), "g": hexc("#9fb9c4"),
}
save(from_rows(CLOUD_BG, hud_pal), "gui/sprites/hud/vape_empty.png")
save(from_rows(CLOUD_FULL, hud_pal), "gui/sprites/hud/vape_full.png")
save(from_rows(CLOUD_HALF, hud_pal), "gui/sprites/hud/vape_half.png")
# over-the-limit (cough) variant of the full icon, drawn when the bar is maxed out
hud_pal_hot = dict(hud_pal, w=hexc("#f3c9c9"), W=hexc("#ffecec"), g=hexc("#c98b8b"))
save(from_rows(CLOUD_FULL, hud_pal_hot), "gui/sprites/hud/vape_full_hot.png")

# --------------------------------------------------- effect icons (18x18)
COUGH = [
    "..................",
    "..................",
    "......rr..rr......",
    ".....rRrr.rrr.....",
    "....rRrrr.rrrr....",
    "....rRrrr.rrrr....",
    "...rRrrrr.rrrrr...",
    "...rrrrr...rrrr...",
    "...rrrr.....rrr...",
    "...rrr..ggg..rr...",
    "...rr..gGggg.rr...",
    "......gGgggggg....",
    ".....ggggggggg....",
    ".....gggggggg.....",
    "......ggggg.......",
    "..................",
    "..................",
    "..................",
]
CRAVING = [
    "..................",
    "..................",
    "........mm........",
    "........mm........",
    ".......oooo.......",
    ".......oggo.......",
    ".......oggo.......",
    ".......bbbb.......",
    ".......bccb.......",
    ".......bccb.......",
    ".......bbbb.......",
    ".......bbbb.......",
    ".......bbbb.......",
    "........dd........",
    "....x........x....",
    ".....x......x.....",
    "..................",
    "..................",
]
eff_pal = {
    "r": hexc("#c4525a"), "R": hexc("#f08a90"),
    "g": hexc("#b9c3c7"), "G": hexc("#eef3f5"),
    "m": hexc("#4a4a52"), "o": hexc("#1b1b1f"),
    "b": hexc("#2a2a30"), "c": hexc("#5a2a2a"), "d": hexc("#0c0c0e"),
    "x": hexc("#8a8a95"),
}
save(from_rows(COUGH, eff_pal), "mob_effect/cough.png")
save(from_rows(CRAVING, eff_pal), "mob_effect/craving.png")

# ------------------------------------------------ vapour particle (16x16 x4)
# Soft white puffs; alpha fades out towards the edge. Tinted in code with the liquid colour.
import math
import random

rnd = random.Random(262)
for frame in range(4):
    img = Image.new("RGBA", (16, 16), T)
    blobs = [(7.5 + rnd.uniform(-1.5, 1.5), 7.5 + rnd.uniform(-1.5, 1.5), rnd.uniform(3.5, 5.0)) for _ in range(3)]
    for y in range(16):
        for x in range(16):
            a = 0.0
            for bx, by, br in blobs:
                d = math.hypot(x - bx, y - by) / br
                a = max(a, 1.0 - d)
            a = max(0.0, min(1.0, a * 1.6)) ** 1.3
            if a > 0.02:
                shade = 235 + int(20 * a)
                img.putpixel((x, y), (shade, shade, shade, int(255 * a)))
    save(img, f"particle/vapor_{frame}.png")
