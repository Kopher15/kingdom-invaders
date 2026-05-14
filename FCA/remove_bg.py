"""
FCA Logo — White Background Remover
Usage: python remove_bg.py
Reads:  assets/fca-logo-original.png
Writes: assets/fca-logo.png  (transparent PNG)
"""

from PIL import Image
from collections import deque
import numpy as np
import sys

INPUT  = "assets/fca-logo-original.png"
OUTPUT = "assets/fca-logo.png"
TOLERANCE = 28   # 0–255: how far from pure white still counts as background


def remove_white_bg(input_path, output_path, tolerance=TOLERANCE):
    img  = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.uint8)
    h, w = data.shape[:2]

    def is_bg(y, x):
        r, g, b = int(data[y, x, 0]), int(data[y, x, 1]), int(data[y, x, 2])
        return r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance

    # --- Flood-fill background from all four edges ---
    visited   = np.zeros((h, w), dtype=bool)
    is_bg_map = np.zeros((h, w), dtype=bool)
    queue     = deque()

    def seed(y, x):
        if not visited[y, x] and is_bg(y, x):
            visited[y, x] = True
            is_bg_map[y, x] = True
            queue.append((y, x))

    for x in range(w):
        seed(0, x); seed(h - 1, x)
    for y in range(h):
        seed(y, 0); seed(y, w - 1)

    while queue:
        y, x = queue.popleft()
        for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                if is_bg(ny, nx):
                    is_bg_map[ny, nx] = True
                    queue.append((ny, nx))

    # --- Apply full transparency to background pixels ---
    result = data.copy()
    result[is_bg_map, 3] = 0

    # --- Soft anti-alias edge: partial alpha on near-white border pixels ---
    edge_pixels = np.zeros((h, w), dtype=bool)
    for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)):
        shifted = np.roll(np.roll(is_bg_map, dy, axis=0), dx, axis=1)
        edge_pixels |= shifted
    edge_pixels &= ~is_bg_map

    ey, ex = np.where(edge_pixels)
    for y, x in zip(ey.tolist(), ex.tolist()):
        r, g, b = int(data[y, x, 0]), int(data[y, x, 1]), int(data[y, x, 2])
        whiteness = (r + g + b) / 765.0          # 0=black, 1=white
        if whiteness > 0.75:
            result[y, x, 3] = int((1.0 - whiteness) * 255 * 3)

    Image.fromarray(result).save(output_path, "PNG")
    print(f"✅  Saved → {output_path}")


if __name__ == "__main__":
    try:
        remove_white_bg(INPUT, OUTPUT)
    except FileNotFoundError:
        print(f"❌  File not found: {INPUT}")
        print("    Save the original logo as assets/fca-logo-original.png first.")
        sys.exit(1)
    except ImportError:
        print("❌  Missing dependency. Run:  pip install pillow numpy")
        sys.exit(1)
