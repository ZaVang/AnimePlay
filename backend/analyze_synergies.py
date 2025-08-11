import json
from collections import Counter
import os


def analyze_synergy_tags():
    """
    Reads the all_cards.json file, counts the occurrences of each synergy tag,
    and prints a sorted list of the counts.
    """
    # Correctly locate the JSON file from the backend directory
    json_path = os.path.join(
        os.path.dirname(__file__), "..", "data", "anime", "all_cards.json"
    )

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            all_cards = json.load(f)
    except FileNotFoundError:
        print(f"Error: Could not find all_cards.json at path: {json_path}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from file: {json_path}")
        return

    # Use a Counter to efficiently count all tags
    tag_counts = Counter()
    for card in all_cards:
        # Safely get synergy_tags, defaulting to an empty list if it doesn't exist
        tags = card.get("synergy_tags", [])
        if tags:
            tag_counts.update(tags)

    if not tag_counts:
        print("No synergy tags found in the data.")
        return

    print("--- 羁绊标签出现次数分析 ---")
    # most_common() returns a list of (tag, count) tuples, sorted by count
    for tag, count in tag_counts.most_common():
        print(f"{tag}: {count}")
    print("--- 分析完毕 ---")


if __name__ == "__main__":
    analyze_synergy_tags()
