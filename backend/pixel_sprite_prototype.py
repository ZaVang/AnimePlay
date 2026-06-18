#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
像素小人原型：对若干角色立绘做 去背景(rembg isnet-anime) → 裁剪 → 像素化 + 调色板 + 描边，
输出透明 PNG 到 data/images/character/pixel/{id}.png 供预览。

从仓库根运行：python backend/pixel_sprite_prototype.py [id1 id2 ...]
不传 id 则自动取人气最高的 5 个 UR 角色（须有本地立绘）。
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
IMG_CHAR = ROOT / "data" / "images" / "character"
OUT_DIR = IMG_CHAR / "pixel"
TARGET_H = 72       # 像素精灵高度
COLORS = 28         # 调色板颜色数（复古感）
OUTLINE = (24, 22, 30, 255)

_session = new_session("isnet-anime")  # 动漫专用抠图模型


def add_outline(img):
    a = img.split()[3]
    w, h = img.size
    base = Image.new("L", (w + 2, h + 2), 0)
    base.paste(a, (1, 1))
    ring = Image.new("L", (w + 2, h + 2), 0)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)]:
        sh = Image.new("L", (w + 2, h + 2), 0)
        sh.paste(a, (1 + dx, 1 + dy))
        ring = ImageChops.lighter(ring, sh)
    ring = ImageChops.subtract(ring, base)
    out = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    out.paste(OUTLINE, (0, 0), ring)
    inner = Image.new("RGBA", (w + 2, h + 2), (0, 0, 0, 0))
    inner.paste(img, (1, 1), img)
    return Image.alpha_composite(out, inner)


def make_sprite(src: Path, dst: Path):
    img = Image.open(src).convert("RGBA")
    cut = remove(img, session=_session)          # 透明背景
    bbox = cut.split()[3].getbbox()              # 按 alpha 裁掉空白
    if bbox:
        cut = cut.crop(bbox)
    w, h = cut.size
    tw = max(1, round(w * TARGET_H / h))
    small = cut.resize((tw, TARGET_H), Image.NEAREST)
    rgb = small.convert("RGB").quantize(colors=COLORS, method=Image.FASTOCTREE).convert("RGB")
    a = small.split()[3].point(lambda v: 255 if v >= 128 else 0)  # 硬边 alpha（像素风无半透明）
    sprite = add_outline(Image.merge("RGBA", (*rgb.split(), a)))
    dst.parent.mkdir(parents=True, exist_ok=True)
    sprite.save(dst)
    return sprite.size


def main():
    ids = [int(x) for x in sys.argv[1:]] if len(sys.argv) > 1 else []
    chars = json.load(open(ROOT / "data/selected_character/all_cards.json", encoding="utf-8"))
    by_id = {c["id"]: c for c in chars}
    if not ids:
        urs = [c for c in chars if c["rarity"] == "UR" and (IMG_CHAR / f"{c['id']}.jpg").exists()]
        urs.sort(key=lambda c: c.get("popularity_score", 0), reverse=True)
        ids = [c["id"] for c in urs[:5]]
    print("处理：", ids)
    for cid in ids:
        src = IMG_CHAR / f"{cid}.jpg"
        if not src.exists():
            print(f"  跳过 {cid}（无立绘）")
            continue
        size = make_sprite(src, OUT_DIR / f"{cid}.png")
        print(f"  ✓ {cid} {by_id.get(cid, {}).get('name', '')} → {size}")
    print("输出目录：", OUT_DIR)


if __name__ == "__main__":
    main()
