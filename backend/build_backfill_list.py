#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
构建补番目标清单：逐年取「≥1000 人评的日本动画」里人气(评分人数) top 50，
去掉已在卡池的，写出待抓取 id 清单 data/backfill_anime_ids.json。只读 API，不改卡数据。

从仓库根运行：python backend/build_backfill_list.py
"""
import json
import subprocess
import time
from bangumi_asset.config import ACCESS_TOKEN, DEFAULT_USER_AGENT

MIN_RATERS = 1000
TOP_PER_YEAR = 50
YEAR_FROM, YEAR_TO = 1980, 2026
API = "https://api.bgm.tv/v0/search/subjects"
OUT = "data/backfill_anime_ids.json"


def search_page(af, at, offset):
    body = json.dumps({
        "keyword": "", "sort": "rank",
        "filter": {"type": [2], "meta_tags": ["日本"], "rank": [">=1"], "air_date": [f">={af}", f"<{at}"]},
    })
    for attempt in range(3):
        time.sleep(0.35)
        r = subprocess.run(
            ["curl", "-s", "-X", "POST", f"{API}?limit=50&offset={offset}",
             "-H", f"User-Agent: {DEFAULT_USER_AGENT}", "-H", f"Authorization: Bearer {ACCESS_TOKEN}",
             "-H", "Content-Type: application/json", "-d", body],
            capture_output=True, text=True, encoding="utf-8",
        )
        try:
            d = json.loads(r.stdout)
            if "data" in d:
                return d
        except Exception:
            pass
        time.sleep(1.0 + attempt)
    return {"data": [], "total": 0}


def collect_year(af, at):
    out = []
    off = 0
    total = None
    dry = 0
    for _ in range(20):
        d = search_page(af, at, off)
        data = d.get("data") or []
        total = d.get("total", total)
        if not data:
            break
        hits = 0
        for it in data:
            raters = (it.get("rating") or {}).get("total", 0) or 0
            if raters >= MIN_RATERS:
                out.append({"id": it.get("id"), "name": it.get("name_cn") or it.get("name"),
                            "raters": raters, "date": it.get("date")})
                hits += 1
        off += len(data)
        if total is not None and off >= total:
            break
        dry = dry + 1 if hits == 0 else 0
        if dry >= 2:
            break
    return out


def main():
    have = {a["id"] for a in json.load(open("data/selected_anime/all_cards.json", encoding="utf-8"))}
    raw_have = {a["id"] for a in json.load(open("data/anime/all_cards.json", encoding="utf-8"))}

    ranges = [("1900-01-01", "1980-01-01")] + [(f"{y}-01-01", f"{y + 1}-01-01") for y in range(YEAR_FROM, YEAR_TO + 1)]
    targets = {}
    for af, at in ranges:
        hits = collect_year(af, at)
        hits.sort(key=lambda h: h["raters"], reverse=True)
        for h in hits[:TOP_PER_YEAR]:
            if h["id"] not in have:
                targets[h["id"]] = h

    tlist = sorted(targets.values(), key=lambda h: h["raters"], reverse=True)
    in_raw = [t for t in tlist if t["id"] in raw_have]
    json.dump(tlist, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"待补：{len(tlist)} 部（其中 {len(in_raw)} 已在 raw 池、{len(tlist) - len(in_raw)} 需联网抓取）")
    print(f"已写出 {OUT}")
    print("人气最高的几部：")
    for t in tlist[:8]:
        print(f"  {t['raters']:>6}  {t.get('date','')}  {t['name']}")


if __name__ == "__main__":
    main()
