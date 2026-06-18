#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描：逐年统计 Bangumi 上「评分人数 ≥ MIN_RATERS 的日本动画」有多少，
以及其中有多少尚未在我们的卡池里（=补番会新增多少）。只读，不写数据。

用 curl 子进程（Python requests 被 Cloudflare TLS 拦），从仓库根运行：
    python backend/scout_year_counts.py
"""
import json
import subprocess
import collections
import time
from bangumi_asset.config import ACCESS_TOKEN, DEFAULT_USER_AGENT

MIN_RATERS = 1000
YEAR_FROM, YEAR_TO = 1980, 2026  # 逐年；外加 <1980 一桶
PAGES_PER_YEAR = 6  # 每年最多翻几页（50/页）；rank 排序下高评分番在前，足够覆盖 ≥1000 的

API = "https://api.bgm.tv/v0/search/subjects"


def search_page(air_from, air_to, offset):
    body = json.dumps({
        "keyword": "", "sort": "rank",  # 仅取已排名(rank>=1)番，rank 升序=高分热门在前；排除未放送 0 评分
        "filter": {"type": [2], "meta_tags": ["日本"], "rank": [">=1"], "air_date": [f">={air_from}", f"<{air_to}"]},
    })
    for attempt in range(3):
        time.sleep(0.35)  # 限速，避免被 Bangumi 节流
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
        time.sleep(1.0 + attempt)  # 退避重试
    print(f"    ! 取页失败 {air_from} off={offset}: {r.stdout[:120]!r}")
    return {"data": [], "total": 0}


def collect(air_from, air_to):
    """翻页拉该区间已排名条目（API 实际每页 ~20），返回 [(id, name, raters)]（评分人数 ≥ MIN_RATERS）。
    rank 升序，热门在前；连续两页无 ≥MIN_RATERS 命中则早停（已过热门区）。"""
    out = []
    off = 0
    total = None
    dry = 0
    for _ in range(20):  # 硬上限 20 页
        d = search_page(air_from, air_to, off)
        data = d.get("data") or []
        total = d.get("total", total)
        if not data:
            break
        hits = 0
        for it in data:
            raters = (it.get("rating") or {}).get("total", 0) or 0
            if raters >= MIN_RATERS:
                out.append((it.get("id"), it.get("name_cn") or it.get("name"), raters))
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

    ranges = [("pre-1980", "1900-01-01", "1980-01-01")]
    ranges += [(str(y), f"{y}-01-01", f"{y + 1}-01-01") for y in range(YEAR_FROM, YEAR_TO + 1)]

    all_hits = {}  # id -> (name, raters, label)
    per_year = collections.OrderedDict()
    for label, af, at in ranges:
        hits = collect(af, at)
        new = [h for h in hits if h[0] not in have]
        per_year[label] = (len(hits), len(new))
        for hid, name, raters in hits:
            all_hits[hid] = (name, raters, label)

    total = len(all_hits)
    new_ids = [i for i in all_hits if i not in have]
    new_but_in_raw = [i for i in new_ids if i in raw_have]
    new_need_fetch = [i for i in new_ids if i not in raw_have]

    print(f"=== ≥{MIN_RATERS} 人评的日本动画（{ranges[0][0]}..{YEAR_TO}）===")
    print(f"总计去重: {total} 部")
    print(f"  已在卡池(selected): {total - len(new_ids)}")
    print(f"  会新增: {len(new_ids)}  （其中 {len(new_but_in_raw)} 已在 raw 池可直接 curate，{len(new_need_fetch)} 需联网抓取）")
    print("--- 逐年（命中 / 其中新增）---")
    for label, (h, n) in per_year.items():
        if h:
            print(f"  {label}: {h} / +{n}")


if __name__ == "__main__":
    main()
