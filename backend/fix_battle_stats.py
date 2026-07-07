"""一次性修正：battle_stats 按「最终 rarity」重算。

根因：`process_character_data.py` 的 assign_battle_stats 按稀有度给基础属性，但
`regrade_rarity.py` 事后只重排了 `rarity` 字段、没同步重算 battle_stats → 升档角色
的属性冻结在升档前的档位（近半 roster 属性低一档，如 SSR 承太郎冻在 SR 的 hp600）。

本脚本按每张卡当前的 `rarity` + `popularity_score` 重算 battle_stats，令属性与稀有度一致。
- 确定性：intra-tier 的 0–10% 人气 bonus 按 **id 播种**（可复现、幂等，替代原 random.uniform）。
- 幂等：重复运行结果一致。
- 就地改写，保留 JSON 原格式（indent=2, ensure_ascii=False），只动 battle_stats 值。

用法：python backend/fix_battle_stats.py data/selected_character/all_cards.json [更多文件...]

档位基线与 process_character_data.assign_battle_stats 同源（改基线时两处同改）。
"""
import json
import random
import sys

# 与 process_character_data.py:assign_battle_stats 的 base 表同源。
BASE_STATS = {
    "UR": {"hp": 1200, "atk": 120, "def": 120, "sp": 120, "spd": 120},
    "HR": {"hp": 1000, "atk": 100, "def": 100, "sp": 100, "spd": 100},
    "SSR": {"hp": 850, "atk": 90, "def": 80, "sp": 95, "spd": 85},
    "SR": {"hp": 600, "atk": 70, "def": 65, "sp": 75, "spd": 60},
    "R": {"hp": 400, "atk": 50, "def": 45, "sp": 55, "spd": 50},
    "N": {"hp": 250, "atk": 30, "def": 30, "sp": 30, "spd": 30},
}


def compute_battle_stats(rarity, popularity_score, card_id):
    """按最终稀有度重算属性。intra-tier bonus 按 id 播种确定化（0–10%，随人气缩放）。"""
    base = BASE_STATS.get(rarity, BASE_STATS["N"])
    normalized_popularity = min((popularity_score or 0) / 2000.0, 1.0)
    bonus_multiplier = 1 + random.Random(card_id).uniform(0, 0.1) * normalized_popularity
    return {stat: int(value * bonus_multiplier) for stat, value in base.items()}


def fix_file(path):
    with open(path, encoding="utf-8") as f:
        cards = json.load(f)
    changed = 0
    for card in cards:
        new_stats = compute_battle_stats(
            card.get("rarity"), card.get("popularity_score"), card.get("id")
        )
        if card.get("battle_stats") != new_stats:
            changed += 1
        card["battle_stats"] = new_stats
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"{path}: {changed}/{len(cards)} 张卡 battle_stats 已按最终稀有度重算")


if __name__ == "__main__":
    targets = sys.argv[1:]
    if not targets:
        print("用法: python backend/fix_battle_stats.py <cards.json> [更多...]")
        sys.exit(1)
    for p in targets:
        fix_file(p)
