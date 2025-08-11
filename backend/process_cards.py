import json
import os
import sys
from pathlib import Path


def get_rarity(rank: int) -> str:
    """根据排名确定稀有度"""
    if not isinstance(rank, int):
        return "N"
    if 1 <= rank <= 20:
        return "UR"
    elif 21 <= rank <= 50:
        return "HR"
    elif 51 <= rank <= 100:
        return "SSR"
    elif 101 <= rank <= 250:
        return "SR"
    elif 251 <= rank <= 500:
        return "R"
    else:  # 包括大于500的排名
        return "N"


# def calculate_cost(rating: dict) -> int:
#     """根据评分和评分人数计算Cost值"""
#     if not rating or not isinstance(rating, dict) or 'score' not in rating or 'total' not in rating:
#         return 1

#     score = rating.get('score', 0)
#     total_raters = rating.get('total', 0)

#     # 1. 基础分 (来自评分)
#     base_cost = score * 0.7

#     # 2. 人气加成 (来自评分人数)
#     popularity_bonus = 0
#     if total_raters > 100000:
#         popularity_bonus = 3.0
#     elif total_raters > 50000:
#         popularity_bonus = 2.5
#     elif total_raters > 20000:
#         popularity_bonus = 2.0
#     elif total_raters > 5000:
#         popularity_bonus = 1.5
#     elif total_raters > 1000:
#         popularity_bonus = 1.0
#     else:
#         popularity_bonus = 0.5

#     raw_cost = base_cost + popularity_bonus

#     final_cost = max(1, min(10, round(raw_cost)))

#     return final_cost


def calculate_cost(rank: int) -> int:
    """根据排名确定cost"""
    if not isinstance(rank, int):
        return 1
    if 1 <= rank <= 20:
        return 6
    elif 21 <= rank <= 50:
        return 5
    elif 51 <= rank <= 100:
        return 4
    elif 101 <= rank <= 250:
        return 3
    elif 251 <= rank <= 500:
        return 2
    else:  # 包括大于500的排名
        return 1


def process_anime_data(source_dir: str, output_dir: str, image_dir: str):
    """处理动画数据并生成卡牌JSON文件"""
    os.makedirs(output_dir, exist_ok=True)

    source_path = Path(source_dir)
    if not source_path.is_dir():
        print(f"错误: 源目录未找到 {source_dir}")
        return

    all_anime_files = list(source_path.glob("*.json"))
    if not all_anime_files:
        print(f"警告: 在目录 {source_dir} 中没有找到任何JSON文件。")
        return

    print(f"找到 {len(all_anime_files)} 个动画文件，开始处理...")

    all_cards_data = []
    processed_count = 0
    for subject_file in all_anime_files:
        try:
            with open(subject_file, "r", encoding="utf-8") as f:
                subject = json.load(f)

            # 基本的数据校验
            if (
                not isinstance(subject, dict)
                or "id" not in subject
                or "rating" not in subject
            ):
                continue

            card_id = subject["id"]

            # 动态寻找图片路径，并生成相对路径
            image_path_found = None
            base_path = Path(image_dir)
            for ext in [".jpg", ".png", ".webp", ".jpeg"]:
                potential_path = base_path / f"{card_id}{ext}"
                if potential_path.exists():
                    # 生成一个从项目根目录开始的相对路径
                    image_path_found = str(potential_path)
                    break

            card_data = {
                "id": card_id,
                "name": subject.get("name_cn") or subject.get("name", "未知"),
                "image_path": image_path_found,
                "points": subject["rating"].get("score", 0),
                "cost": calculate_cost(subject["rating"].get("rank", 9999)),
                "rarity": get_rarity(subject["rating"].get("rank", 9999)),
                "description": subject.get("summary", ""),
                "type": subject.get("type"),
                "platform": subject.get("platform"),
                "episodes_for_hangup": subject.get("eps", 0),
                "synergy_tags": subject.get("meta_tags", []),
                "date": subject.get("date", ""),
                "rating_rank": subject.get("rating", {}).get("rank", 0),
                "rating_score": subject.get("rating", {}).get("score", 0),
                "rating_total": subject.get("rating", {}).get("total", 0),
                "main_character_ids": subject.get("main_character_ids", []),
                "main_characters": subject.get("main_characters", []),
            }

            output_path = os.path.join(output_dir, f"{card_id}.json")

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(card_data, f, ensure_ascii=False, indent=4)

            all_cards_data.append(card_data)
            processed_count += 1
        except Exception as e:
            # 捕获处理单个条目时的任何意外错误
            print(f"跳过文件 {subject_file.name}，因为出现意外错误: {e}")
            continue

    # 将所有卡牌数据汇总到一个文件中, 并放在source_json_dir文件夹同级目录下
    if all_cards_data:
        # 获取source_json_dir的父目录
        parent_dir = source_path.parent
        all_cards_path = os.path.join(parent_dir, "all_cards.json")
        with open(all_cards_path, "w", encoding="utf-8") as f:
            json.dump(all_cards_data, f, ensure_ascii=False, indent=4)
        print(f"已将所有卡牌数据汇总到: {all_cards_path}")

    print(
        f"处理完成。在 '{output_dir}' 中成功生成了 {len(all_anime_files)} 个卡牌文件中的 {processed_count} 个。"
    )


if __name__ == "__main__":
    SOURCE_JSON_DIR = "data/anime/raw_cards"
    CARDS_OUTPUT_DIR = "data/anime/processed_cards"
    IMAGES_DIR = "data/images/anime"  # 修正路径以匹配 data_fetcher.py

    process_anime_data(SOURCE_JSON_DIR, CARDS_OUTPUT_DIR, IMAGES_DIR)
