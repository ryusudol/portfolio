"""Renders the site's backdrop, the Milky Way toward the galactic center, from
NASA's Deep Star Maps 2020 (https://svs.gsfc.nasa.gov/4851).

    pip install numpy opencv-python-headless OpenEXR pillow
    python scripts/sky/milkyway.py starmap_2020_64k_gal.exr public/sky

The source is an all-sky map in galactic coordinates (an equirectangular
image, linear light, half floats). This points a camera at the galactic
center, projects the sky it sees onto a flat frame, and grades the result for
a page background: the Milky Way's glow is held under a ceiling so text set
over it keeps its contrast, while the stars keep their full range.

It writes a wide frame and a tall one (for portrait screens), each at several
widths, as AVIF. Each width is graded on its own, so stars hold their
brightness whether a frame is 8K or phone-sized. `--preview out.png` renders
one small wide frame instead, for trying out a camera or a grade against one
of the smaller maps.
"""

import argparse
import math
from pathlib import Path

import cv2
import Imath
import numpy as np
import OpenEXR
from PIL import Image

# The page's night color (`--bg` on the ink theme); the sky is added to it.
GROUND = (5, 7, 13)

# Where each camera looks (galactic longitude and latitude, degrees), how much
# sky it takes in along its long side, and how far it is rolled, so the band
# crosses the frame on a diagonal instead of lying flat.
WIDE = dict(lon=-4.0, lat=1.0, fov=84.0, roll=27.0, shift=(-0.12, -0.07))
TALL = dict(lon=-4.0, lat=1.0, fov=96.0, roll=58.0, shift=(0.0, -0.08))

WIDE_SIZE = (7680, 4320)
TALL_SIZE = (2160, 3840)
WIDE_WIDTHS = (7680, 5120, 3840, 2880, 1920)
TALL_WIDTHS = (2160, 1620, 1080, 810)

# The grade, in linear light. The glow (the Milky Way itself, without its
# resolved stars) saturates toward GLOW_CEILING. The site's muted text needs
# the sky behind it under a luminance of 0.021 to clear 4.5:1; the ceiling
# sits below that to leave room for the stars and the ground color.
GLOW_GAIN = 2.2
GLOW_CEILING = 0.018
# A pixel more than this many times brighter than its surroundings is a star,
# not part of the glow.
GLOW_CLIP = 5.0
# The glow is the sky blurred by the frame's long side over this.
GLOW_FINENESS = 2000
# Above 1 this deepens the faint end, so the band falls off into a darker sky.
GLOW_CONTRAST = 1.5
GLOW_PIVOT = 0.012
# White balance for the glow. As mapped it is a dusty brown throughout; this
# cools the faint outskirts toward the page's blue-black and leaves the bright
# bulge warm, crossing over around GLOW_WARM_AT.
GLOW_COOL = (0.78, 1.0, 1.42)
GLOW_WARM = (1.08, 1.0, 0.86)
GLOW_WARM_AT = 0.016
GLOW_COLOR = 1.15
# Stars. A point of light spreads over fewer pixels in a smaller frame and
# averages away, so each size sets its own exposure: the star brighter than
# all but STAR_RANK of a 1920-pixel frame lands at STAR_LEVEL, and the share
# shrinks as the frame grows, so about the same stars reach that level at
# every size. STAR_CONTRAST sinks the crowd of faint ones, which would
# otherwise read as grain, and lets the bright ones stand clear.
STAR_RANK = 0.0006
STAR_LEVEL = 0.5
STAR_KNEE = 0.95
STAR_CONTRAST = 1.7
STAR_PIVOT = 0.15
STAR_COLOR = 0.85

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


def to_linear(c):
    c = np.asarray(c, np.float32) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(v):
    v = np.clip(v, 0, 1)
    return np.where(v <= 0.0031308, v * 12.92, 1.055 * v ** (1 / 2.4) - 0.055)


def directions(camera, width, height):
    """Galactic longitude and latitude (radians) seen by every pixel.

    The projection is stereographic: unlike a flat perspective view it keeps
    stars round out to the corners of a wide frame.
    """
    long_side = max(width, height)
    # A stereographic plane spans 4·tan(fov/4) across the field of view.
    scale = 4 * math.tan(math.radians(camera["fov"]) / 4) / long_side
    xs = (np.arange(width, dtype=np.float32) + 0.5 - width / 2) * scale
    ys = (height / 2 - np.arange(height, dtype=np.float32) - 0.5) * scale
    xs = xs + camera["shift"][0] * width * scale
    ys = ys + camera["shift"][1] * height * scale
    x, y = np.meshgrid(xs, ys)
    # Undo the roll: the galactic plane is level in (px, py), tilted on screen.
    roll = math.radians(camera["roll"])
    px = x * math.cos(roll) + y * math.sin(roll)
    py = -x * math.sin(roll) + y * math.cos(roll)
    rho = np.sqrt(px * px + py * py)
    theta = 2 * np.arctan(rho / 2)
    sin_over_rho = np.where(rho > 1e-9, np.sin(theta) / np.maximum(rho, 1e-9), 1)

    lon0 = math.radians(camera["lon"])
    lat0 = math.radians(camera["lat"])
    forward = np.array(
        [
            math.cos(lat0) * math.cos(lon0),
            math.cos(lat0) * math.sin(lon0),
            math.sin(lat0),
        ]
    )
    east = np.array([-math.sin(lon0), math.cos(lon0), 0.0])
    north = np.cross(forward, east)
    # Seen from inside the sphere, longitude grows to the left.
    right = -east
    d = (
        np.cos(theta)[..., None] * forward
        + (sin_over_rho * px)[..., None] * right
        + (sin_over_rho * py)[..., None] * north
    )
    lon = np.arctan2(d[..., 1], d[..., 0])
    lat = np.arcsin(np.clip(d[..., 2], -1, 1))
    return lon.astype(np.float32), lat.astype(np.float32), scale


def read_window(path, lon, lat, out_scale):
    """Reads the part of the map a view needs, shrunk to about its resolution.

    Returns the pixels (float32 RGB) and a function from longitude and latitude
    to coordinates in them.
    """
    exr = OpenEXR.InputFile(str(path))
    box = exr.header()["dataWindow"]
    src_w = box.max.x - box.min.x + 1
    src_h = box.max.y - box.min.y + 1
    per_radian = src_w / (2 * math.pi)

    # Shrink by whole steps while the map is still finer than the frame.
    shrink = max(1, int(per_radian * out_scale))
    pad = 8 * shrink
    x_of = lambda lo: (0.5 - lo / (2 * math.pi)) * src_w
    y_of = lambda la: (0.5 - la / math.pi) * src_h
    x0 = max(0, int(x_of(lon.max())) - pad) // shrink * shrink
    x1 = min(src_w, int(x_of(lon.min())) + pad) // shrink * shrink
    y0 = max(0, int(y_of(lat.max())) - pad) // shrink * shrink
    y1 = min(src_h, int(y_of(lat.min())) + pad) // shrink * shrink

    half = Imath.PixelType(Imath.PixelType.HALF)
    rows = []
    step = shrink * 128
    for top in range(y0, y1, step):
        bottom = min(y1, top + step)
        chunk = np.stack(
            [
                np.frombuffer(
                    exr.channel(c, half, top, bottom - 1), np.float16
                ).reshape(bottom - top, src_w)[:, x0:x1]
                for c in "RGB"
            ],
            -1,
        ).astype(np.float32)
        if shrink > 1:
            h, w = chunk.shape[:2]
            chunk = chunk.reshape(h // shrink, shrink, w // shrink, shrink, 3)
            chunk = chunk.mean((1, 3))
        rows.append(chunk)
    pixels = np.concatenate(rows)

    def locate(lo, la):
        return (
            ((x_of(lo) - x0) / shrink - 0.5).astype(np.float32),
            ((y_of(la) - y0) / shrink - 0.5).astype(np.float32),
        )

    return pixels, locate


def project(path, camera, size):
    width, height = size
    lon, lat, scale = directions(camera, width, height)
    pixels, locate = read_window(path, lon, lat, scale)
    map_x, map_y = locate(lon, lat)
    return cv2.remap(pixels, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def grade(sky):
    """Linear sky in, 8-bit sRGB backdrop out."""
    sky = np.maximum(sky, 0)
    span = max(sky.shape[:2])
    # Split the glow from the stars. At this resolution the Milky Way is not a
    # haze but millions of faint stars, so the glow is their local average: a
    # blur a few hundredths of a degree wide, taken after clipping whatever
    # stands far above its surroundings so a bright star doesn't smear into a
    # halo. The stars are what is left over.
    sigma = max(1.0, span / GLOW_FINENESS)
    around = cv2.GaussianBlur(sky, (0, 0), sigma * 3)
    glow = cv2.GaussianBlur(np.minimum(sky, around * GLOW_CLIP), (0, 0), sigma)
    stars = np.maximum(sky - glow, 0)

    def contrast(v, power, pivot):
        return pivot * (v / pivot) ** power

    def saturate(layer, luma, keep):
        return luma[..., None] + (layer - luma[..., None]) * keep

    warm = np.clip((glow @ LUMA) / GLOW_WARM_AT, 0, 1)[..., None]
    cool, hot = np.array(GLOW_COOL, np.float32), np.array(GLOW_WARM, np.float32)
    glow = glow * (cool + (hot - cool) * warm * warm * (3 - 2 * warm))
    glow_luma = glow @ LUMA
    glow = saturate(glow, glow_luma, GLOW_COLOR)
    lit = contrast(glow_luma * GLOW_GAIN, GLOW_CONTRAST, GLOW_PIVOT)
    lit = GLOW_CEILING * (1 - np.exp(-lit / GLOW_CEILING))
    glow = glow * (lit / np.maximum(glow_luma, 1e-9))[..., None]

    star_luma = stars @ LUMA
    stars = saturate(stars, star_luma, STAR_COLOR)
    rank = np.quantile(star_luma[::3, ::3], 1 - STAR_RANK * 1920 / span)
    lit = contrast(star_luma * (STAR_LEVEL / rank), STAR_CONTRAST, STAR_PIVOT)
    lit = lit / (1 + lit / STAR_KNEE)
    stars = stars * (lit / np.maximum(star_luma, 1e-9))[..., None]

    out = to_linear(GROUND) + glow + stars
    # A little noise before rounding, so the faint gradients don't band.
    noise = np.random.default_rng(4851).random(out.shape[:2], np.float32) - 0.5
    return np.clip(to_srgb(out) * 255 + noise[..., None], 0, 255).round().astype(np.uint8)


def frames(sky, widths):
    """The sky at each width: shrunk in linear light, then graded at that size."""
    height, width = sky.shape[:2]
    for w in widths:
        h = round(height * w / width)
        small = sky if w == width else cv2.resize(sky, (w, h), interpolation=cv2.INTER_AREA)
        yield w, h, grade(small)


def save(sky, folder, name, widths, quality):
    for w, h, frame in frames(sky, widths):
        target = folder / f"{name}-{w}.avif"
        Image.fromarray(frame).save(target, quality=quality, speed=3, subsampling="4:4:4")
        print(f"{target}  {w}x{h}  {target.stat().st_size / 1e6:.2f} MB")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("starmap", type=Path, help="starmap_2020_*_gal.exr")
    parser.add_argument("out", type=Path, nargs="?", default=Path("public/sky"))
    parser.add_argument("--preview", type=Path, help="write one small PNG and stop")
    parser.add_argument("--tall", action="store_true", help="preview the tall frame")
    parser.add_argument(
        "--detail",
        action="store_true",
        help="preview a 1920x1080 window of the full-size frame, pixel for pixel",
    )
    parser.add_argument("--quality", type=int, default=62)
    args = parser.parse_args()

    if args.preview:
        camera, full = (TALL, TALL_SIZE) if args.tall else (WIDE, WIDE_SIZE)
        if args.detail:
            frame = grade(project(args.starmap, camera, full))
            top, left = (full[1] - 1080) // 2, (full[0] - 1920) // 2
            frame = frame[top : top + 1080, left : left + 1920]
        else:
            size = (1080, 1920) if args.tall else (1920, 1080)
            frame = grade(project(args.starmap, camera, size))
        Image.fromarray(frame).save(args.preview)
        return

    args.out.mkdir(parents=True, exist_ok=True)
    save(project(args.starmap, WIDE, WIDE_SIZE), args.out, "milkyway", WIDE_WIDTHS, args.quality)
    save(project(args.starmap, TALL, TALL_SIZE), args.out, "milkyway-tall", TALL_WIDTHS, args.quality)


if __name__ == "__main__":
    main()
