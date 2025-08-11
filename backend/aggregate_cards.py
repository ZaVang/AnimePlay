import json
import os


def aggregate_cards(cards_dir: str, output_file: str):
    """将零散的卡牌JSON文件聚合成一个单独的文件。"""
    all_cards = []
    if not os.path.isdir(cards_dir):
        print(f"错误: 目录 '{cards_dir}' 未找到。")
        return

    print(f"正在从 '{cards_dir}' 读取卡牌...")
    for filename in sorted(os.listdir(cards_dir)):
        if filename.endswith(".json"):
            filepath = os.path.join(cards_dir, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                try:
                    card_data = json.load(f)
                    all_cards.append(card_data)
                except json.JSONDecodeError:
                    print(f"警告: 无法解析 {filename} 中的JSON")

    # 确保 'data' 目录存在
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(all_cards, f, ensure_ascii=False, indent=2)

    print(f"成功将 {len(all_cards)} 张卡牌聚合到 '{output_file}'。")


if __name__ == "__main__":
    CARDS_DIR = "data/anime/cards"
    OUTPUT_FILE = "data/anime/all_cards.json"
    aggregate_cards(CARDS_DIR, OUTPUT_FILE)
