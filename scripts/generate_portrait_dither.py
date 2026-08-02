from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public/images/portrait/sean-mountain-original.jpg"
OUTPUT = ROOT / "public/images/portrait/suhyeon-mountain-dithered.jpg"


with Image.open(SOURCE) as source:
    portrait = ImageOps.exif_transpose(source).convert("RGB")

sample = portrait.resize((504, 672), Image.Resampling.LANCZOS)
sample = ImageEnhance.Contrast(sample).enhance(1.08)
sample = ImageEnhance.Color(sample).enhance(1.03)
dithered = sample.quantize(
    colors=48,
    method=Image.Quantize.MEDIANCUT,
    dither=Image.Dither.FLOYDSTEINBERG,
).convert("RGB")
dithered = dithered.resize((2016, 2688), Image.Resampling.NEAREST)
dithered.save(OUTPUT, quality=94, subsampling=0, optimize=True)
