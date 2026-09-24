"""Turn a portrait photo into stippled dot coordinates for the hero.

Only the dots are published; keep the source photo out of the repo.

    python -m venv .venv && .venv/bin/pip install "rembg[cpu]" opencv-python-headless scipy
    .venv/bin/python scripts/portrait.py photo.jpg \
        --cut "0,870 300,852 400,845 520,785 620,705 690,648 740,680 765,780 1008,790"

`--cut` is a polyline in source-image pixels; everything below it (neck,
shoulders) is removed so only the head remains.

Output: public/portrait/dots.bin — little-endian uint16:
    [version, aspect * 10000, n, (x, y) * n]
Coordinates are normalised to the head's bounding box (0..65535). Dots follow
the *dark* parts of the photo (hair, brows, shadows) — like ink — which reads
as a face in both the dark and light themes, and matches the dotted name.
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from scipy.spatial import cKDTree

WORK_WIDTH = 520
POINTS = 7200
ITERATIONS = 20


def head_mask(image: np.ndarray, cut: list[tuple[int, int]]) -> np.ndarray:
    from rembg import new_session, remove

    session = new_session("birefnet-portrait")
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mask = np.array(remove(rgb, session=session, only_mask=True)).astype(np.float32) / 255
    h, w = mask.shape
    below = np.array(cut + [(w, h), (0, h)], dtype=np.int32)
    trim = np.ones_like(mask)
    cv2.fillPoly(trim, [below], 0)
    trim = cv2.GaussianBlur(trim, (0, 0), 6)
    return mask * trim


def tone_map(image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Global contrast (keeps hair darker than skin) plus a little local detail."""
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    lum = lab[:, :, 0].astype(np.float32)
    inside = lum[mask > 0.5]
    lo, hi = np.percentile(inside, 2), np.percentile(inside, 98)
    global_tone = np.clip((lum - lo) / (hi - lo), 0, 1)
    clahe = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(3, 3))
    local_tone = clahe.apply(lab[:, :, 0]).astype(np.float32) / 255
    return 0.75 * global_tone + 0.25 * local_tone


def density(image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    tone = tone_map(image, mask)
    lum = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255
    edges = np.abs(cv2.Laplacian(cv2.GaussianBlur(lum, (0, 0), 1.3), cv2.CV_32F, ksize=3))
    edges = np.clip(edges / (np.percentile(edges[mask > 0.5], 98) + 1e-6), 0, 1)
    # Silhouette: traces the hairline, ear, and the jaw (where the neck is cut).
    gy, gx = np.gradient(cv2.GaussianBlur(mask, (0, 0), 1.5))
    contour = np.hypot(gx, gy)
    contour = np.clip(contour / (contour.max() + 1e-6) * 2.5, 0, 1)
    # Lloyd relaxation flattens density (points follow roughly its square
    # root), so the map is raised to a power to keep the tonal range.
    d = (0.06 + (1 - tone) ** 2.6 + 0.9 * edges + 0.8 * contour) ** 3
    return d * np.clip(mask * 1.2, 0, 1)


def stipple(d: np.ndarray, n: int, seed: int) -> np.ndarray:
    """Weighted Voronoi stippling (Secord 2002) over pixels, via Lloyd steps."""
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(d > 1e-3)
    w = d[ys, xs].astype(np.float64)
    pixels = np.stack([xs, ys], axis=1).astype(np.float64) + 0.5
    pick = rng.choice(len(w), size=n, replace=False, p=w / w.sum())
    points = pixels[pick] + rng.uniform(-0.5, 0.5, size=(n, 2))
    for _ in range(ITERATIONS):
        _, owner = cKDTree(points).query(pixels, workers=-1)
        mass = np.bincount(owner, weights=w, minlength=n)
        cx = np.bincount(owner, weights=w * pixels[:, 0], minlength=n)
        cy = np.bincount(owner, weights=w * pixels[:, 1], minlength=n)
        live = mass > 0
        points[live, 0] = cx[live] / mass[live]
        points[live, 1] = cy[live] / mass[live]
    return points


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("photo", type=Path)
    parser.add_argument("--cut", required=True)
    parser.add_argument("--out", type=Path, default=Path("public/portrait/dots.bin"))
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()

    image = cv2.imread(str(args.photo))
    cut = [tuple(int(v) for v in p.split(",")) for p in args.cut.split()]
    mask = head_mask(image, cut)

    ys, xs = np.nonzero(mask > 0.5)
    pad = 8
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, mask.shape[1])
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, mask.shape[0])
    image, mask = image[y0:y1, x0:x1], mask[y0:y1, x0:x1]

    scale = WORK_WIDTH / image.shape[1]
    size = (WORK_WIDTH, round(image.shape[0] * scale))
    image = cv2.resize(image, size, interpolation=cv2.INTER_AREA)
    mask = cv2.resize(mask, size, interpolation=cv2.INTER_AREA)

    h, w = mask.shape
    points = stipple(density(image, mask), POINTS, seed=1)

    header = [1, round(w / h * 10000), len(points)]
    body = np.clip(np.round(points / [w, h] * 65535), 0, 65535)
    data = np.concatenate([np.array(header, dtype=np.float64), body.ravel()])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    data.astype("<u2").tofile(args.out)
    print(f"wrote {args.out} ({args.out.stat().st_size / 1024:.0f} KB, {w}x{h})")

    if args.preview:
        tiles = []
        for bg, fg in (((19, 19, 18), (225, 232, 236)), ((223, 232, 237), (26, 29, 31))):
            tile = np.full((h * 2, w * 2, 3), bg, np.uint8)
            for x, y in points * 2:
                cv2.circle(tile, (int(x), int(y)), 1, fg, -1, cv2.LINE_AA)
            tiles.append(tile)
        cv2.imwrite(str(args.preview), np.hstack(tiles))


if __name__ == "__main__":
    main()
