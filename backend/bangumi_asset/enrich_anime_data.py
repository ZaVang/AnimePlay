import json
import os
import time
import requests
import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_root))

from backend.bangumi_asset.bangumi_api import (
    get_related_characters,
    get_character_by_id,
)

# --- 配置路径 ---
DATA_DIR = project_root / "data" / "anime"
INPUT_ANIME_FILE = DATA_DIR / "top_anime_japan.json"
OUTPUT_CARDS_DIR = DATA_DIR / "cards"
ALL_CARDS_FILE = DATA_DIR / "all_cards.json"
CHARACTERS_DIR = DATA_DIR / "character"


def setup_directories():
    """创建所有需要的输出目录"""
    os.makedirs(OUTPUT_CARDS_DIR, exist_ok=True)
    os.makedirs(CHARACTERS_DIR, exist_ok=True)
    print(
        f"输出目录已准备就绪:\n- Cards: {OUTPUT_CARDS_DIR}\n- Characters: {CHARACTERS_DIR}"
    )


def enrich_anime_data():
    """
    主处理函数：
    1. 读取原始动画数据
    2. 为每个动画获取、筛选并关联主要角色
    3. 获取并存储主要角色的详细信息
    4. 保存处理后的数据
    """
    setup_directories()

    if not INPUT_ANIME_FILE.exists():
        print(f"错误: 输入文件未找到 {INPUT_ANIME_FILE}")
        print("请先运行 get_bangumi_top_ranked.py 脚本生成该文件。")
        return

    with open(INPUT_ANIME_FILE, "r", encoding="utf-8") as f:
        anime_list = json.load(f)
    print(f"成功加载 {len(anime_list)} 条动画数据。")

    # 预先加载已有的角色ID，避免重复请求
    existing_character_ids = {
        int(p.stem) for p in CHARACTERS_DIR.glob("*.json") if p.stem.isdigit()
    }
    print(f"已发现 {len(existing_character_ids)} 个本地角色数据。")

    all_cards = []

    for i, anime_data in enumerate(anime_list):
        anime_id = anime_data["id"]
        anime_name = anime_data.get("name_cn") or anime_data.get("name", "未知名称")
        print(f"\n[{i+1}/{len(anime_list)}] 正在处理: {anime_name} (ID: {anime_id})")

        # 1. 获取关联角色
        try:
            related_characters = get_related_characters(anime_id)
            time.sleep(1)  # 遵守API速率限制
        except requests.exceptions.RequestException as e:
            print(f"  获取角色失败: {e}。跳过此动画。")
            continue

        # 2. 筛选主角
        main_characters = [
            char for char in related_characters if char.relation == "主角"
        ]
        print(f"  发现 {len(main_characters)} 位主角。")

        # 将主角信息存入动画数据
        anime_data["main_characters"] = [
            char.model_dump(mode="json", by_alias=True) for char in main_characters
        ]

        # 3. 获取并存储每个主角的详细信息
        for char_summary in main_characters:
            char_id = char_summary.id
            char_name = char_summary.name

            if char_id in existing_character_ids:
                print(
                    f"    - 主角 '{char_name}' (ID: {char_id}) 的数据已存在，跳过获取。"
                )
                continue

            print(f"    - 正在获取主角 '{char_name}' (ID: {char_id}) 的详细信息...")
            try:
                character_details = get_character_by_id(char_id)
                time.sleep(1)

                # 存储角色详情
                char_path = CHARACTERS_DIR / f"{char_id}.json"
                with open(char_path, "w", encoding="utf-8") as f:
                    json.dump(
                        character_details.model_dump(
                            mode="json", by_alias=True, exclude_none=True
                        ),
                        f,
                        ensure_ascii=False,
                        indent=4,
                    )

                existing_character_ids.add(char_id)
                print(f"      √ 已保存到 {char_path}")

            except requests.exceptions.RequestException as e:
                print(f"      × 获取角色 {char_id} 详情失败: {e}")

        # 4. 保存增强后的单个动画数据 (card)
        card_path = OUTPUT_CARDS_DIR / f"{anime_id}.json"
        with open(card_path, "w", encoding="utf-8") as f:
            json.dump(anime_data, f, ensure_ascii=False, indent=4)

        all_cards.append(anime_data)

    # 5. 保存所有处理过的动画数据
    with open(ALL_CARDS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=4)

    print(f"\n--- 处理完成 ---")
    print(f"所有动画卡片数据已汇总到: {ALL_CARDS_FILE}")
    print(f"独立的动画卡片位于: {OUTPUT_CARDS_DIR}")
    print(f"所有角色数据位于: {CHARACTERS_DIR}")


if __name__ == "__main__":
    enrich_anime_data()
