#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增量扩充「小众番」到精选卡池（番剧推荐发现性用）。

背景：raw 池里有 677 部未入选的番（含角色 + 本地图片均已下载），本脚本从中取
rating_total ∈ [NICHE_MIN, NICHE_MAX) 的一段，**增量**追加到 data/selected_*/all_cards.json，
每部最多取 MAX_CHAR_PER_ANIME 个角色。

关键约束（与 create_curated_dataset 的全量重算不同）：
  - **增量**：现有 289 番 / 766 角色原样保留在数组前部（字节级不变），新卡仅 append；
  - **不污染高稀有度**：小众卡稀有度封顶 SR（只产 SR/R/N），不动 UR/HR/SSR 的
    抽卡 UP 轮换、图鉴 UR 完成度与收藏威望；
  - cost/points 复用 create_curated_dataset 的曲线函数（对新批次自包含计算）。

幂等：再次运行会跳过已在精选集中的 id，只补尚未加入的。
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

RAW_ANIME_PATH = "data/anime/all_cards.json"
RAW_CHAR_PATH = "data/character/all_cards.json"
SEL_ANIME_PATH = "data/selected_anime/all_cards.json"
SEL_CHAR_PATH = "data/selected_character/all_cards.json"

NICHE_MIN = 1000
NICHE_MAX = 5000
MAX_CHAR_PER_ANIME = 3

# 小众卡稀有度封顶：按批次内百分位切 SR/R/N（多为 N/R，少量 SR）。
CAP_SR_TOP = 0.12   # 前 12% → SR
CAP_N_BOTTOM = 0.40  # 后 40% → N，中间 → R


def assign_capped_rarity(items: List[dict], score_key: str) -> None:
    """按 score_key 降序，给批次封顶分配 SR/R/N（就地写 rarity）。"""
    n = len(items)
    if n == 0:
        return
    ranked = sorted(items, key=lambda x: (x.get(score_key, 0) or 0, x.get("id", 0)), reverse=True)
    sr_cut = int(n * CAP_SR_TOP)
    n_cut = int(n * (1 - CAP_N_BOTTOM))
    for i, it in enumerate(ranked):
        if i < sr_cut:
            it["rarity"] = "SR"
        elif i < n_cut:
            it["rarity"] = "R"
        else:
            it["rarity"] = "N"


def main():
    for p in (RAW_ANIME_PATH, RAW_CHAR_PATH, SEL_ANIME_PATH, SEL_CHAR_PATH):
        if not os.path.exists(p):
            logging.error("缺少文件：%s", p)
            return

    raw_anime = json.load(open(RAW_ANIME_PATH, encoding="utf-8"))
    raw_chars = json.load(open(RAW_CHAR_PATH, encoding="utf-8"))
    sel_anime = json.load(open(SEL_ANIME_PATH, encoding="utf-8"))
    sel_chars = json.load(open(SEL_CHAR_PATH, encoding="utf-8"))

    sel_anime_ids = {a["id"] for a in sel_anime}
    sel_char_ids = {c["id"] for c in sel_chars}
    # 现有番 id→rarity（算角色综合人气加成用）
    existing_anime_rarity = {a["id"]: a.get("rarity", "R") for a in sel_anime}

    # 1) 小众番批次（不含已入选）
    niche = [
        a for a in raw_anime
        if a["id"] not in sel_anime_ids
        and isinstance(a.get("rating_total"), (int, float))
        and NICHE_MIN <= a["rating_total"] < NICHE_MAX
    ]
    logging.info("小众番候选：%d 部（rating_total ∈ [%d, %d)）", len(niche), NICHE_MIN, NICHE_MAX)
    if not niche:
        logging.info("无新增，结束。")
        return

    # 2) 番剧：封顶稀有度 + 费用曲线 + 整数强度（对批次自包含）
    new_anime = [dict(a) for a in niche]
    assign_capped_rarity(new_anime, "rating_score")
    assign_cost_with_distribution(new_anime)
    compute_integer_points(new_anime)
    for a in new_anime:
        a["image_path"] = f"data/images/anime/{a['id']}.jpg"
    niche_anime_rarity = {a["id"]: a["rarity"] for a in new_anime}
    niche_ids = set(niche_anime_rarity.keys())

    # 3) 角色：每部小众番 top-N（按综合人气），跨批次 + 对现有集去重
    chars_by_anime: Dict[int, List[dict]] = defaultdict(list)
    for c in raw_chars:
        if c["id"] in sel_char_ids:
            continue  # 已在精选集
        for aid in c.get("anime_ids", []) or []:
            if aid in niche_ids:
                collects = (c.get("stats", {}) or {}).get("collects", 0) or 0
                # 综合人气加成：取该角色所属番（现有∪小众）中的最大稀有度加成
                max_bonus = 0
                for rel in c.get("anime_ids", []) or []:
                    r = existing_anime_rarity.get(rel) or niche_anime_rarity.get(rel)
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

    # 安全校验：现有前缀必须原样
    assert merged_anime[: len(sel_anime)] == sel_anime, "现有番数据被改动！"
    assert merged_chars[: len(sel_chars)] == sel_chars, "现有角色数据被改动！"
    # id 唯一
    assert len({a["id"] for a in merged_anime}) == len(merged_anime), "番 id 重复！"
    assert len({c["id"] for c in merged_chars}) == len(merged_chars), "角色 id 重复！"

    save_json(merged_anime, SEL_ANIME_PATH)
    save_json(merged_chars, SEL_CHAR_PATH)
    logging.info("番剧：%d → %d；角色：%d → %d", len(sel_anime), len(merged_anime), len(sel_chars), len(merged_chars))
    log_rarity_distribution(new_anime, "新增小众番")
    log_rarity_distribution(new_chars, "新增小众角色")


if __name__ == "__main__":
    main()
