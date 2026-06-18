#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
统一重排稀有度（品质×人气 综合）。

动机：原评级是「人气分桶(rating_total 前250) + 桶内评分排名 + 小众一刀切 SR」的混合，
导致高分小众被压低、高人气平庸被抬高、两拨人群跨桶倒挂。本脚本用**单一全局标准**
重排全部精选卡：

  番剧 composite = W_QUALITY · pct(rating_score) + (1-W_QUALITY) · pct(rating_total)
    —— pct 为全库中位百分位（对并列稳健、对长尾不敏感），两轴各 0..1。
  角色 没有 bangumi 评分，只能按人气：comprehensive_popularity = collects + 所属番(新稀有度)最大加成。

分档**保持各稀有度当前数量不变**（即同样多的 UR/HR/…，只是换更合理的卡填进去），
故抽卡概率盘面/图鉴规模不变，纯粹是「谁该是什么档」的重排。

只改写 rarity（角色另改 comprehensive_popularity），其余字段与数组顺序原样保留 → diff 最小。
稀有度不进存档、不影响对战强度，故安全可回滚（git checkout 即还原）。
"""

import bisect
import json
import logging
from collections import Counter
from typing import Dict, List

from create_curated_dataset import ANIME_RARITY_SCORE_BONUS

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

SEL_ANIME_PATH = "data/selected_anime/all_cards.json"
SEL_CHAR_PATH = "data/selected_character/all_cards.json"

# 综合权重：品质(评分) 占比。0.65 = 品质略重、人气次之。调高→更偏口碑，调低→更偏名气。
W_QUALITY = 0.65

RARITY_ORDER = ["UR", "HR", "SSR", "SR", "R", "N"]


def midrank_pct(values: List[float]):
    """返回 value→中位百分位(0..1) 的函数（并列取平均秩，长尾稳健）。"""
    sv = sorted(values)
    n = len(sv)

    def pct(v: float) -> float:
        lo = bisect.bisect_left(sv, v)
        hi = bisect.bisect_right(sv, v)
        return ((lo + hi) / 2) / n if n else 0.0

    return pct


def assign_by_current_counts(cards: List[dict], score_key: str) -> Dict[str, int]:
    """按 score_key 降序，保持各稀有度**当前数量**重新填充。返回变更计数。"""
    counts = Counter(c["rarity"] for c in cards)
    ranked = sorted(cards, key=lambda c: (c[score_key], c.get("id", 0)), reverse=True)
    changed = 0
    i = 0
    for r in RARITY_ORDER:
        for _ in range(counts.get(r, 0)):
            if cards is not None and i < len(ranked):
                if ranked[i]["rarity"] != r:
                    changed += 1
                ranked[i]["rarity"] = r
                i += 1
    return {"changed": changed, "counts": dict(counts)}


def regrade_anime(anime: List[dict]) -> None:
    pq = midrank_pct([a.get("rating_score", 0) or 0 for a in anime])
    pp = midrank_pct([a.get("rating_total", 0) or 0 for a in anime])
    for a in anime:
        a["_composite"] = W_QUALITY * pq(a.get("rating_score", 0) or 0) + (1 - W_QUALITY) * pp(a.get("rating_total", 0) or 0)
    info = assign_by_current_counts(anime, "_composite")
    for a in anime:
        del a["_composite"]
    logging.info("番剧重排：%d/%d 变更档位；保持分布 %s", info["changed"], len(anime), info["counts"])


def regrade_characters(chars: List[dict], anime_rarity: Dict[int, str]) -> None:
    # 角色综合人气随新番稀有度重算
    for c in chars:
        collects = (c.get("stats", {}) or {}).get("collects", 0) or 0
        max_bonus = 0
        for aid in c.get("anime_ids", []) or []:
            r = anime_rarity.get(aid)
            if r:
                max_bonus = max(max_bonus, ANIME_RARITY_SCORE_BONUS.get(r, 0))
        c["comprehensive_popularity"] = collects + max_bonus
    info = assign_by_current_counts(chars, "comprehensive_popularity")
    logging.info("角色重排：%d/%d 变更档位；保持分布 %s", info["changed"], len(chars), info["counts"])


def report(anime: List[dict]) -> None:
    examples = ["哆啦A梦 大山版", "机动战士Z高达", "虫师 续章", "Fate/strange Fake",
                "葬送的芙莉莲 第二季", "刀剑神域", "Re：从零开始的异世界生活"]
    by_name = {a["name"]: a for a in anime}
    logging.info("—— 代表卡新档位 ——")
    for nm in examples:
        a = by_name.get(nm)
        if a:
            logging.info("  %-3s  %s分 %s人评  %s", a["rarity"], a.get("rating_score"), a.get("rating_total"), nm)
    # 各档评分区间（验证倒挂消除）
    from statistics import mean
    logging.info("—— 各档 rating_score [min, 均, max] ——")
    for r in RARITY_ORDER:
        s = [a.get("rating_score", 0) for a in anime if a["rarity"] == r]
        if s:
            logging.info("  %-3s n=%-4d  %.1f–%.1f (均 %.2f)", r, len(s), min(s), max(s), mean(s))


def main():
    anime = json.load(open(SEL_ANIME_PATH, encoding="utf-8"))
    chars = json.load(open(SEL_CHAR_PATH, encoding="utf-8"))
    regrade_anime(anime)
    anime_rarity = {a["id"]: a["rarity"] for a in anime}
    regrade_characters(chars, anime_rarity)
    report(anime)

    json.dump(anime, open(SEL_ANIME_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    json.dump(chars, open(SEL_CHAR_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    logging.info("已写回 %s / %s", SEL_ANIME_PATH, SEL_CHAR_PATH)


if __name__ == "__main__":
    main()
