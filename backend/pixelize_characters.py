#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量像素化角色立绘（UR+HR）→ data/images/character/pixel/{id}.png（透明、描边、复古调色板）。
复用 pixel_sprite_prototype 的抠图+像素化逻辑。幂等可续跑（已生成的跳过）。

从仓库根运行：python backend/pixelize_characters.py [rarity1 rarity2 ...]
默认处理 UR HR。
"""
import json
import sys
from pixel_sprite_prototype import make_sprite, IMG_CHAR, OUT_DIR, ROOT

rarities = set(sys.argv[1:]) or {"UR", "HR"}
chars = json.load(open(ROOT / "data/selected_character/all_cards.json", encoding="utf-8"))
targets = [c for c in chars if c["rarity"] in rarities and (IMG_CHAR / f"{c['id']}.jpg").exists()]
print(f"目标 {len(targets)} 个角色（{sorted(rarities)}），开始像素化（已存在跳过）…", flush=True)

done = skip = fail = 0
for i, c in enumerate(targets):
    dst = OUT_DIR / f"{c['id']}.png"
    if dst.exists():
        skip += 1
        continue
    try:
        make_sprite(IMG_CHAR / f"{c['id']}.jpg", dst)
        done += 1
        if done % 25 == 0:
            print(f"  进度 {i + 1}/{len(targets)}  新做 {done}  跳过 {skip}  失败 {fail}", flush=True)
    except Exception as e:
        fail += 1
        print(f"  ! 失败 {c['id']} {c.get('name', '')}: {e}", flush=True)

print(f"完成：新做 {done}，跳过 {skip}，失败 {fail}。输出 {OUT_DIR}", flush=True)
