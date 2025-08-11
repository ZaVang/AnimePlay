import json
import os
import requests
from typing import List, Dict, Any
from argparse import ArgumentParser


def download_anime_images(json_file_path: str, output_dir: str):
    """
    读取包含番剧信息的JSON文件，遍历每个番剧，并下载其封面大图。

    Args:
        json_file_path (str): 存储番剧数据的JSON文件路径。
        output_dir (str): 下载的图片将要存储的目标文件夹。
    """
    # 确保输出目录存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 读取JSON文件
    with open(json_file_path, "r", encoding="utf-8") as f:
        try:
            animes: List[Dict[str, Any]] = json.load(f)
        except json.JSONDecodeError:
            print(f"错误: '{json_file_path}' 不是一个有效的JSON文件。")
            return

    # 遍历每个番剧并下载图片
    for anime in animes:
        if not isinstance(anime, dict):
            continue

        images = anime.get("images")
        if not images or not isinstance(images, dict):
            continue

        image_url = images.get("large")
        if not image_url or not isinstance(image_url, str):
            continue

        anime_id = anime.get("id")
        anime_name = anime.get("name_cn") or anime.get("name", "")
        # 清理文件名中的非法字符
        safe_anime_name = "".join(
            c for c in anime_name if c.isalnum() or c in (" ", "-", "_")
        ).rstrip()

        if not image_url:
            print(
                f"番剧 '{safe_anime_name}' (ID: {anime_id}) 没有找到 'large' 类型的图片链接。"
            )
            continue

        try:
            # 获取图片后缀
            file_extension = os.path.splitext(image_url)[1]
            if not file_extension:
                file_extension = ".jpg"  # 默认后缀

            # 构建文件名
            file_name = f"{anime_id}{file_extension}"
            file_path = os.path.join(output_dir, file_name)

            # 下载图片
            print(f"正在下载 {safe_anime_name} 的封面...")
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()  # 如果请求失败则引发HTTPError

            # 保存图片
            with open(file_path, "wb") as img_file:
                img_file.write(response.content)

            print(f"图片已保存至: {file_path}")

        except requests.RequestException as e:
            print(
                f"下载番剧 '{safe_anime_name}' (ID: {anime_id}) 的图片时发生网络错误: {e}"
            )
        except Exception as e:
            print(f"处理番剧 '{safe_anime_name}' (ID: {anime_id}) 时发生未知错误: {e}")


if __name__ == "__main__":
    parser = ArgumentParser()
    parser.add_argument(
        "-j", "--json_path", type=str, required=True, help="JSON文件路径"
    )
    parser.add_argument(
        "-o", "--output_folder", type=str, required=True, help="输出文件夹路径"
    )
    args = parser.parse_args()

    json_path = args.json_path
    output_folder = args.output_folder

    if os.path.exists(json_path):
        download_anime_images(json_path, output_folder)
    else:
        print(f"错误: JSON文件 '{json_path}' 未找到。")
