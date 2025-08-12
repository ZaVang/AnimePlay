#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建精选数据集脚本
该脚本用于从完整的番剧和角色数据中，筛选出一个规模更小、质量更高的子集，
以便于游戏早期开发和核心玩法的设计。

使用百分比排名来划分稀有度，并为角色引入“综合人气分”。
"""

import json
import os
import logging
import math
from collections import defaultdict, deque
from typing import Dict, List, Tuple

# --- 配置 ---
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

# 文件路径
ANIME_INPUT_PATH = "data/anime/all_cards.json"
CHARACTER_INPUT_PATH = "data/character/all_cards.json"
ANIME_OUTPUT_DIR = "data/selected_anime"
CHARACTER_OUTPUT_DIR = "data/selected_character"
ANIME_OUTPUT_PATH = os.path.join(ANIME_OUTPUT_DIR, "all_cards.json")
CHARACTER_OUTPUT_PATH = os.path.join(CHARACTER_OUTPUT_DIR, "all_cards.json")

# 筛选与配额配置
TOP_ANIME_COUNT = 250
RARITY_PERCENTILES = {
    "UR": 0.1,
    "HR": 0.25,
    "SSR": 0.45,
    "SR": 0.70,
    "R": 1.0,
}
ANIME_RARITY_SCORE_BONUS = {
    "UR": 500,
    "HR": 400,
    "SSR": 300,
    "SR": 200,
    "R": 100,
    "N": 0,
}

# 费用配额（总费用曲线，比例之和≈1）
COST_DISTRIBUTION = {
    1: 0.12,
    2: 0.16,
    3: 0.18,
    4: 0.18,
    5: 0.16,
    6: 0.12,
    7: 0.08,
}

# 同费段强度区间（整数护栏） points ∈ [2*cost + CLAMP_LOW, 2*cost + CLAMP_HIGH]
CLAMP_LOW = -1
CLAMP_HIGH = 2

# 稀有度与热门的整数偏移（身材微调）
RARITY_INT_BONUS = {
    "N": 0,
    "R": 0,
    "SR": 1,
    "SSR": 1,
    "HR": 2,
    "UR": 2,
}

# 每部番选取的角色上限（默认 Top N）
TOP_CHAR_PER_ANIME = 5

# --- 核心函数 ---


def assign_rarity_by_percentile(items):
    """根据排名百分比为项目列表分配稀有度"""
    total_items = len(items)
    if total_items == 0:
        return

    ur_cutoff = int(total_items * RARITY_PERCENTILES["UR"])
    hr_cutoff = int(total_items * RARITY_PERCENTILES["HR"])
    ssr_cutoff = int(total_items * RARITY_PERCENTILES["SSR"])
    sr_cutoff = int(total_items * RARITY_PERCENTILES["SR"])

    for i, item in enumerate(items):
        if i < ur_cutoff:
            item["rarity"] = "UR"
        elif i < hr_cutoff:
            item["rarity"] = "HR"
        elif i < ssr_cutoff:
            item["rarity"] = "SSR"
        elif i < sr_cutoff:
            item["rarity"] = "SR"
        else:
            item["rarity"] = "R"


def _rounded_quota(total: int, ratios: Dict[int, float]) -> Dict[int, int]:
    """将比例转为整数配额，处理四舍五入与余数分配。"""
    raw = {k: total * v for k, v in ratios.items()}
    rounded = {k: int(math.floor(x)) for k, x in raw.items()}
    remain = total - sum(rounded.values())
    # 将余数分配给小数部分最大的几项
    for k, _ in sorted(
        raw.items(), key=lambda kv: (kv[1] - math.floor(kv[1])), reverse=True
    )[:remain]:
        rounded[k] += 1
    return rounded


def assign_cost_with_distribution(items: List[dict]) -> None:
    """
    按 COST_DISTRIBUTION 将费用 1-7 分配给已选番剧集合。
    目标：全局费用曲线合理，且每个费用段的稀有度比例与整体稀有度分布近似。
    修改 items，就地增加字段 item['cost']
    """
    n = len(items)
    if n == 0:
        return

    # 1) 全局费用配额
    cost_quota = _rounded_quota(n, COST_DISTRIBUTION)

    # 2) 统计整体稀有度占比
    rarity_counts = defaultdict(int)
    for it in items:
        rarity_counts[it.get("rarity", "R")] += 1
    total_items = sum(rarity_counts.values())
    rarity_share = {
        r: (rarity_counts[r] / total_items if total_items else 0) for r in rarity_counts
    }

    # 3) 构建每个费用段的稀有度配额（近似按整体占比）
    # 费用段内按稀有度配额填充
    per_cost_rarity_quota: Dict[int, Dict[str, int]] = {}
    rarities = list(rarity_share.keys()) or ["UR", "HR", "SSR", "SR", "R"]
    for c, q in cost_quota.items():
        if q <= 0:
            per_cost_rarity_quota[c] = {r: 0 for r in rarities}
            continue
        # 将 q 份在稀有度之间按占比分配
        raw = {r: q * rarity_share.get(r, 0.0) for r in rarities}
        rounded = {r: int(math.floor(x)) for r, x in raw.items()}
        remain = q - sum(rounded.values())
        for r, _ in sorted(
            raw.items(), key=lambda kv: (kv[1] - math.floor(kv[1])), reverse=True
        )[:remain]:
            rounded[r] += 1
        per_cost_rarity_quota[c] = rounded

    # 4) 将条目按稀有度分桶，稳定排序（评分越高优先分配）
    bucket_by_rarity: Dict[str, deque] = {}
    for r in rarities:
        group = [it for it in items if it.get("rarity") == r]
        # 评分高的优先进入更高费段的名额中（可调整）
        group.sort(key=lambda x: x.get("rating_score", 0), reverse=True)
        bucket_by_rarity[r] = deque(group)

    # 5) 逐费用段、逐稀有度配额分配 cost
    assigned = set()
    for c in sorted(cost_quota.keys()):
        quota_r = per_cost_rarity_quota[c]
        for r in rarities:
            q = quota_r.get(r, 0)
            while q > 0 and bucket_by_rarity[r]:
                it = bucket_by_rarity[r].popleft()
                if id(it) in assigned:
                    continue
                it["cost"] = c
                assigned.add(id(it))
                q -= 1

    # 6) 若仍有未分配（极端舍入导致），填充到剩余费用段
    remaining = [it for it in items if id(it) not in assigned]
    if remaining:
        fill_costs = []
        for c, q in cost_quota.items():
            used = len([it for it in items if it.get("cost") == c])
            need = max(0, q - used)
            fill_costs += [c] * need
        for it, c in zip(remaining, fill_costs):
            it["cost"] = c


def compute_integer_points(items: List[dict]) -> None:
    """
    基于“费用模板 + 整数偏移 + 护栏”的规则，计算并写回整数 points。
    - S0 = 2*cost + 1
    - 稀有度整数偏移 + 热度（极小） + 评分分层（同费同稀有度内，top30%:+1 / mid:0 / bottom30%:-1）
    - clamp 到 [2*cost+CLAMP_LOW, 2*cost+CLAMP_HIGH]
    """
    # 分组：同费 + 同稀有度
    groups: Dict[Tuple[int, str], List[dict]] = defaultdict(list)
    for it in items:
        c = int(it.get("cost", 1) or 1)
        r = it.get("rarity", "R")
        groups[(c, r)].append(it)

    def tier_offset(score_list: List[float], s: float) -> int:
        if not score_list:
            return 0
        sorted_scores = sorted(score_list)
        n = len(sorted_scores)
        q30 = sorted_scores[int(max(0, math.floor(n * 0.3) - 1))] if n > 0 else s
        q70 = sorted_scores[int(max(0, math.floor(n * 0.7) - 1))] if n > 0 else s
        if s >= q70:
            return 1
        if s <= q30:
            return -1
        return 0

    for (cost, rarity), group in groups.items():
        scores = [g.get("rating_score", 0.0) for g in group]
        for it in group:
            S0 = 2 * cost + 1
            rarity_bonus = RARITY_INT_BONUS.get(rarity, 0)
            total = it.get("rating_total", 0) or 0
            hot_bonus = min(1, int(math.log10(total + 1) * 0.3)) if total > 0 else 0
            t_offset = tier_offset(scores, it.get("rating_score", 0.0))
            S = S0 + rarity_bonus + hot_bonus + t_offset
            low = 2 * cost + CLAMP_LOW
            high = 2 * cost + CLAMP_HIGH
            S = max(low, min(high, S))
            it["points"] = int(S)


def process_anime():
    """筛选和处理番剧数据"""
    logging.info(f"开始处理番剧数据，源文件: {ANIME_INPUT_PATH}")
    try:
        with open(ANIME_INPUT_PATH, "r", encoding="utf-8") as f:
            all_anime = json.load(f)
    except FileNotFoundError:
        logging.error(f"错误: 找不到番剧数据文件 {ANIME_INPUT_PATH}")
        return None

    rated_anime = [
        a for a in all_anime if a.get("rating_total") and a.get("rating_total") > 0
    ]
    logging.info(f"找到 {len(rated_anime)} 部有评分数据的番剧。")

    rated_anime.sort(key=lambda x: x["rating_total"], reverse=True)
    top_anime = rated_anime[:TOP_ANIME_COUNT]
    logging.info(f"已筛选出评分人数最多的前 {len(top_anime)} 部番剧。")

    # 按实际评分对这300部进行排序，以决定稀有度
    top_anime.sort(key=lambda x: x.get("rating_score", 0), reverse=True)
    assign_rarity_by_percentile(top_anime)

    # 费用分配与整数强度
    assign_cost_with_distribution(top_anime)
    compute_integer_points(top_anime)

    save_json(top_anime, ANIME_OUTPUT_PATH)
    log_rarity_distribution(top_anime, "番剧")

    return {anime["id"]: anime for anime in top_anime}


def process_characters(selected_anime_map):
    """根据精选的番剧筛选和处理角色数据"""
    if not selected_anime_map:
        logging.error("没有提供精选番剧数据，无法处理角色数据。")
        return

    logging.info(f"开始处理角色数据，源文件: {CHARACTER_INPUT_PATH}")
    try:
        with open(CHARACTER_INPUT_PATH, "r", encoding="utf-8") as f:
            all_characters = json.load(f)
    except FileNotFoundError:
        logging.error(f"错误: 找不到角色数据文件 {CHARACTER_INPUT_PATH}")
        return

    # 构建：anime_id -> 角色列表
    chars_by_anime: Dict[int, List[dict]] = defaultdict(list)
    for char in all_characters:
        for aid in char.get("anime_ids", []) or []:
            if aid in selected_anime_map:
                # 计算综合人气分（受番稀有度加成影响，取该角色关联番剧中的最大加成）
                collects = char.get("stats", {}).get("collects", 0) or 0
                max_bonus = 0
                for related in char.get("anime_ids", []) or []:
                    if related in selected_anime_map:
                        r = selected_anime_map[related]["rarity"]
                        max_bonus = max(max_bonus, ANIME_RARITY_SCORE_BONUS.get(r, 0))
                char_copy = dict(char)
                char_copy["comprehensive_popularity"] = collects + max_bonus
                chars_by_anime[aid].append(char_copy)

    # 按每部番剧 Top N 选取角色，去重（同一个角色可能隶属多部作品）
    selected_characters_map: Dict[int, dict] = {}
    for aid, lst in chars_by_anime.items():
        lst.sort(key=lambda x: x.get("comprehensive_popularity", 0), reverse=True)
        for c in lst[:TOP_CHAR_PER_ANIME]:
            cid = c.get("id")
            if cid is None:
                continue
            # 若同一角色重复出现，保留综合人气分更高的一项
            if (cid not in selected_characters_map) or (
                c.get("comprehensive_popularity", 0)
                > selected_characters_map[cid].get("comprehensive_popularity", 0)
            ):
                selected_characters_map[cid] = c

    selected_characters = list(selected_characters_map.values())

    logging.info(
        f"从 {len(all_characters)} 个总角色中，筛选出 {len(selected_characters)} 个属于精选番剧的角色。"
    )

    # 按新的综合人气分排序
    selected_characters.sort(
        key=lambda x: x.get("comprehensive_popularity", 0), reverse=True
    )

    # 按百分比分配稀有度
    assign_rarity_by_percentile(selected_characters)

    save_json(selected_characters, CHARACTER_OUTPUT_PATH)
    log_rarity_distribution(selected_characters, "角色")


# --- 辅助函数 ---


def save_json(data, path):
    """保存数据到JSON文件"""
    try:
        dir_name = os.path.dirname(path)
        os.makedirs(dir_name, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"数据成功保存到: {path} (共 {len(data)} 条记录)")
    except Exception as e:
        logging.error(f"保存文件到 {path} 时出错: {e}")


def log_rarity_distribution(data, data_type):
    """记录稀有度分布日志"""
    rarity_stats = defaultdict(int)
    for item in data:
        rarity_stats[item["rarity"]] += 1

    logging.info(f"精选{data_type}稀有度分布:")
    rarity_order = {"UR": 0, "HR": 1, "SSR": 2, "SR": 3, "R": 4, "N": 5}
    for rarity, count in sorted(
        rarity_stats.items(), key=lambda item: rarity_order.get(item[0], 6)
    ):
        logging.info(f"  {rarity}: {count} 个")


# --- 主函数 ---


def main():
    """脚本主入口"""
    logging.info(
        "--- 开始创建精选数据集 (v3: 百分比稀有度 + 费用曲线 + 整数强度 + 角色TopN) ---"
    )
    selected_anime_map = process_anime()
    if selected_anime_map:
        process_characters(selected_anime_map)
    logging.info("--- 精选数据集创建完成 ---")


if __name__ == "__main__":
    main()
