#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成缩略图：把 data/images/{anime,character}/*.jpg 压成 ~THUMB_W 宽存到 同目录 thumb/ 子目录。

动机：源图 500–1536px 宽，但小网格（图鉴/品味/锐评）显示在 ~72–150px，缩放 8–21 倍
→ 混叠发「锐/脆」。预生成接近显示尺寸的小图，缩放比降到 ~2 倍，清晰且加载更快。

服务：后端 `/data/<path>` 路由直接服务任意子目录，故 thumb/ 无需改后端；前端小网格
改用 `/data/images/<type>/thumb/<id>.jpg`，缺失时 onerror 回退原图。

幂等：thumb 比源新则跳过。需要 PIL（conda 环境有）。从仓库根运行：
    python backend/generate_thumbnails.py
"""

import os
import sys
from PIL import Image

THUMB_W = 300
JPEG_QUALITY = 82
TYPES = ["anime", "character"]
IMAGES_ROOT = os.path.join(os.path.dirname(__file__), "..", "data", "images")


def make_thumb(src: str, dst: str) -> str:
    # 幂等：thumb 已存在且不旧于源 → 跳过
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return "skip"
    try:
        with Image.open(src) as im:
            if im.mode not in ("RGB",):
                im = im.convert("RGB")
            w, h = im.size
            if w > THUMB_W:
                im = im.resize((THUMB_W, round(h * THUMB_W / w)), Image.LANCZOS)
            im.save(dst, "JPEG", quality=JPEG_QUALITY, optimize=True)
        return "ok"
    except Exception as e:
        print(f"  ! 跳过 {os.path.basename(src)}: {e}")
        return "err"


def main():
    total = {"ok": 0, "skip": 0, "err": 0}
    for t in TYPES:
        d = os.path.join(IMAGES_ROOT, t)
        if not os.path.isdir(d):
            print(f"目录不存在，跳过：{d}")
            continue
        thumb_dir = os.path.join(d, "thumb")
        os.makedirs(thumb_dir, exist_ok=True)
        files = [f for f in os.listdir(d) if f.lower().endswith(".jpg")]
        print(f"[{t}] {len(files)} 张 → {thumb_dir}")
        for i, f in enumerate(files):
            r = make_thumb(os.path.join(d, f), os.path.join(thumb_dir, f))
            total[r] = total.get(r, 0) + 1
            if (i + 1) % 500 == 0:
                print(f"  …{i + 1}/{len(files)}")
    print(f"完成：生成 {total['ok']}，跳过 {total['skip']}，失败 {total['err']}")


if __name__ == "__main__":
    sys.exit(main())
