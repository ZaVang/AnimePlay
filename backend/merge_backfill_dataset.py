#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把「补番清单」（data/backfill_anime_ids.json，近 10 年每年人气 top50 ≥1000 人评）
**增量**并入精选卡池。

与 expand_niche_dataset 的区别：选番不按 rating_total 区间，而是**按清单 id**——
因为补番清单里有不少 >5000 人评的热门近番（区间法会漏掉）。其余逻辑一致：
  - 增量：现有番/角色原样保留在数组前部（字节级不变），新卡仅 append；
  - 新卡稀有度先封顶 SR（只产 SR/R/N），**不直接动 UR/HR/SSR 的「数量」**；
    随后 regrade_rarity 再做全局重排（保持各档数量不变）——届时口碑高的近番可凭
    composite 顶进 UR/HR/SSR，挤掉较弱的老卡，但各档总数不变 → 抽卡盘面稳定；
  - 每部番最多取 MAX_CHAR_PER_ANIME 个主角（补番时只抓了主角，raw 里本就≤3）；
  - cost/points 复用 create_curated_dataset 曲线（对新批次自包含）。

幂等：已在精选集中的 id 跳过，只补尚未加入的。

从仓库根运行：python backend/merge_backfill_dataset.py
"""

import json
import logging
import os
from collections import defaultdict
from typing import Dict, List

from create_curated_dataset import (
    assign_cost_with_distribution,
    compute_integer_points,
    ANIME_RARITY_SCORE_BONUS,
    save_json,
    log_rarity_distribution,
)
from expand_niche_dataset import assign_capped_rarity, MAX_CHAR_PER_ANIME

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

RAW_ANIME_PATH = "data/anime/all_cards.json"
RAW_CHAR_PATH = "data/character/all_cards.json"
SEL_ANIME_PATH = "data/selected_anime/all_cards.json"
SEL_CHAR_PATH = "data/selected_character/all_cards.json"
LIST_PATH = "data/backfill_anime_ids.json"


def main():
    for p in (RAW_ANIME_PATH, RAW_CHAR_PATH, SEL_ANIME_PATH, SEL_CHAR_PATH, LIST_PATH):
        if not os.path.exists(p):
            logging.error("缺少文件：%s", p)
            return

    raw_anime = json.load(open(RAW_ANIME_PATH, encoding="utf-8"))
    raw_chars = json.load(open(RAW_CHAR_PATH, encoding="utf-8"))
    sel_anime = json.load(open(SEL_ANIME_PATH, encoding="utf-8"))
    sel_chars = json.load(open(SEL_CHAR_PATH, encoding="utf-8"))
    wanted_ids = {t["id"] for t in json.load(open(LIST_PATH, encoding="utf-8"))}

    sel_anime_ids = {a["id"] for a in sel_anime}
    sel_char_ids = {c["id"] for c in sel_chars}
    existing_anime_rarity = {a["id"]: a.get("rarity", "R") for a in sel_anime}

    # 1) 待并入番剧：在补番清单内、raw 池里有、且尚未入选
    add = [
        a for a in raw_anime
        if a["id"] in wanted_ids and a["id"] not in sel_anime_ids
    ]
    logging.info("补番清单 %d 个；其中可新增 %d 部（raw 有且未入选）", len(wanted_ids), len(add))
    if not add:
        logging.info("无新增，结束。")
        return

    # 2) 番剧：封顶稀有度（按 rating_score）+ 费用曲线 + 整数强度（对批次自包含）
    new_anime = [dict(a) for a in add]
    assign_capped_rarity(new_anime, "rating_score")
    assign_cost_with_distribution(new_anime)
    compute_integer_points(new_anime)
    for a in new_anime:
        a["image_path"] = f"data/images/anime/{a['id']}.jpg"
    new_anime_rarity = {a["id"]: a["rarity"] for a in new_anime}
    new_ids = set(new_anime_rarity.keys())

    # 3) 角色：每部新番 top-N 主角（按综合人气），跨批次 + 对现有集去重
    chars_by_anime: Dict[int, List[dict]] = defaultdict(list)
    for c in raw_chars:
        if c["id"] in sel_char_ids:
            continue
        for aid in c.get("anime_ids", []) or []:
            if aid in new_ids:
                collects = (c.get("stats", {}) or {}).get("collects", 0) or 0
                max_bonus = 0
                for rel in c.get("anime_ids", []) or []:
                    r = existing_anime_rarity.get(rel) or new_anime_rarity.get(rel)
                    if r:
                        max_bonus = max(max_bonus, ANIME_RARITY_SCORE_BONUS.get(r, 0))
                cc = dict(c)
                cc["comprehensive_popularity"] = collects + max_bonus
                chars_by_anime[aid].append(cc)

    picked: Dict[int, dict] = {}
    for aid, lst in chars_by_anime.items():
        lst.sort(key=lambda x: x.get("comprehensive_popularity", 0), reverse=True)
        for c in lst[:MAX_CHAR_PER_ANIME]:
            cid = c["id"]
            if cid not in picked or c["comprehensive_popularity"] > picked[cid]["comprehensive_popularity"]:
                picked[cid] = c
    new_chars = list(picked.values())
    assign_capped_rarity(new_chars, "comprehensive_popularity")
    logging.info("新增角色：%d 个（每部番≤%d，已去重）", len(new_chars), MAX_CHAR_PER_ANIME)

    # 4) 增量追加（现有在前、原样保留；新卡 append）
    merged_anime = sel_anime + new_anime
    merged_chars = sel_chars + new_chars

    assert merged_anime[: len(sel_anime)] == sel_anime, "现有番数据被改动！"
    assert merged_chars[: len(sel_chars)] == sel_chars, "现有角色数据被改动！"
    assert len({a["id"] for a in merged_anime}) == len(merged_anime), "番 id 重复！"
    assert len({c["id"] for c in merged_chars}) == len(merged_chars), "角色 id 重复！"

    save_json(merged_anime, SEL_ANIME_PATH)
    save_json(merged_chars, SEL_CHAR_PATH)
    logging.info("番剧：%d → %d；角色：%d → %d", len(sel_anime), len(merged_anime), len(sel_chars), len(merged_chars))
    log_rarity_distribution(new_anime, "新增补番")
    log_rarity_distribution(new_chars, "新增补番角色")
    logging.info("下一步：python backend/regrade_rarity.py（全局重排档位）")


if __name__ == "__main__":
    main()
