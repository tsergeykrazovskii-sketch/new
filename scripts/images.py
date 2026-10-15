#!/usr/bin/env python3
"""
Готовит фото для сайта: поворачивает по EXIF, уменьшает и сохраняет в WebP без метаданных.
Размер по началу имени файла: hero* — 2000 px по длинной стороне, staff* — 900, остальное — 1400.

  python3 scripts/images.py <папка с исходниками> <папка назначения>
  например: python3 scripts/images.py ~/raw/tor clients/tor/img
"""
import sys
from pathlib import Path
from PIL import Image, ImageOps

SIZES = {'hero': 2000, 'staff': 900}
DEFAULT = 1400


def main(src: Path, dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic'})
    if not files:
        sys.exit(f'В {src} нет фото')
    for p in files:
        im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
        limit = next((v for k, v in SIZES.items() if p.stem.startswith(k)), DEFAULT)
        im.thumbnail((limit, limit), Image.LANCZOS)
        out = dst / (p.stem + '.webp')
        im.save(out, 'WEBP', quality=78, method=6)
        print(f'{out}  {im.width}×{im.height}  {out.stat().st_size // 1024} КБ')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).expanduser(), Path(sys.argv[2]))
