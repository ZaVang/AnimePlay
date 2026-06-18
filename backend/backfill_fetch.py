#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
补番抓取（curl 版）：读 data/backfill_anime_ids.json，逐部抓取条目 + 主角(≤3) + 图片，
写入 data/anime/raw_cards/{id}.json 与 data/character/raw_cards/{cid}.json。

为什么用 curl：Python requests 连发几次后会被 Bangumi/Cloudflare 按 TLS 指纹 reset(10054)；
curl 的指纹不被拦。所有 API/图片都走 curl 子进程。幂等可续跑（已存在 anime raw 跳过）。

从仓库根运行：python backend/backfill_fetch.py
"""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ANIME_RAW = ROOT / "data" / "anime" / "raw_cards"
CHAR_RAW = ROOT / "data" / "character" / "raw_cards"
IMG_ANIME = ROOT / "data" / "images" / "anime"
IMG_CHAR = ROOT / "data" / "images" / "character"
LIST_FILE = ROOT / "data" / "backfill_anime_ids.json"

TOKEN = "kNbNoYz0cMEjQSLd6qzCeq2PdrrV96WLVDE2VGXA"
UA = "Aririgi/private-0.1.0"
API = "https://api.bgm.tv/v0"
MAIN_CHARS_PER_ANIME = 3
SLEEP = 0.18  # API 限速；图片下载不睡


def curl_json(path):
    """GET api.bgm.tv/v0/{path} → dict（curl，3 次重试）。"""
    url = f"{API}/{path}"
    for attempt in range(3):
        time.sleep(SLEEP)
        r = subprocess.run(
            ["curl", "-s", "--max-time", "25", "-H", f"User-Agent: {UA}", "-H", f"Authorization: Bearer {TOKEN}", url],
            capture_output=True, text=True, encoding="utf-8",
        )
        try:
            d = json.loads(r.stdout)
            if isinstance(d, (dict, list)):
                return d
        except Exception:
            pass
        time.sleep(0.8 + attempt)
    return None


def best_image(images):
    """优先 400px common（够 300 缩略图 + 详情用，比 1.5MB 的 large 快 ~20 倍）。"""
    if not isinstance(images, dict):
        return None
    return images.get("common") or images.get("medium") or images.get("large")


def curl_download(url, dest):
    if not url or dest.exists():
        return
    subprocess.run(["curl", "-s", "--max-time", "25", "-o", str(dest), "-H", f"User-Agent: {UA}", url],
                   capture_output=True, text=True)


def main():
    for d in (ANIME_RAW, CHAR_RAW, IMG_ANIME, IMG_CHAR):
        d.mkdir(parents=True, exist_ok=True)
    targets = json.load(open(LIST_FILE, encoding="utf-8"))
    print(f"目标 {len(targets)} 部。curl 抓取（已存在跳过）…", flush=True)

    done = skip = fail = 0
    for i, t in enumerate(targets):
        aid = t["id"]
        anime_file = ANIME_RAW / f"{aid}.json"
        if anime_file.exists():
            skip += 1
            continue
        subj = curl_json(f"subjects/{aid}")
        if not subj or "id" not in subj:
            fail += 1
            print(f"  ! 失败 {aid} ({t.get('name')})", flush=True)
            continue
        curl_download(best_image(subj.get("images")), IMG_ANIME / f"{aid}.jpg")

        chars = curl_json(f"subjects/{aid}/characters") or []
        mains = [c for c in chars if c.get("relation") == "主角"][:MAIN_CHARS_PER_ANIME]
        main_ids = []
        for c in mains:
            cid = c.get("id")
            if cid is None:
                continue
            main_ids.append(cid)
            cf = CHAR_RAW / f"{cid}.json"
            if cf.exists():
                cd = json.load(open(cf, encoding="utf-8"))
                if aid not in cd.get("anime_ids", []):
                    cd.setdefault("anime_ids", []).append(aid)
                    json.dump(cd, open(cf, "w", encoding="utf-8"), ensure_ascii=False, indent=4)
            else:
                cd = curl_json(f"characters/{cid}")
                if not cd or "id" not in cd:
                    continue
                cd["anime_ids"] = [aid]
                json.dump(cd, open(cf, "w", encoding="utf-8"), ensure_ascii=False, indent=4)
                curl_download(best_image(cd.get("images")), IMG_CHAR / f"{cid}.jpg")

        subj["main_character_ids"] = main_ids
        subj["main_characters"] = mains
        json.dump(subj, open(anime_file, "w", encoding="utf-8"), ensure_ascii=False, indent=4)
        done += 1
        if done % 25 == 0:
            print(f"  进度 {i + 1}/{len(targets)}  新抓 {done}  跳过 {skip}  失败 {fail}", flush=True)

    print(f"完成：新抓 {done}，跳过 {skip}，失败 {fail}", flush=True)


if __name__ == "__main__":
    main()
