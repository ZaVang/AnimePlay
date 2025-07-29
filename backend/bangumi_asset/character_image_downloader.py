import json
import os
import requests
import time
from pathlib import Path
from argparse import ArgumentParser

def download_character_images(characters_dir: str, output_dir: str):
    """
    扫描角色JSON文件目录，并为每个角色下载大图。

    Args:
        characters_dir (str): 包含角色数据的JSON文件目录。
        output_dir (str): 用于保存下载图片的目录。
    """
    os.makedirs(output_dir, exist_ok=True)
    
    character_files = [p for p in Path(characters_dir).glob('*.json') if p.is_file()]
    # 获取已存在图片的文件名（不含扩展名），用于后续跳过
    existing_image_files = {p.stem for p in Path(output_dir).glob('*')}

    print(f"在 '{characters_dir}' 目录中找到 {len(character_files)} 个角色文件。")
    print(f"在 '{output_dir}' 目录中找到 {len(existing_image_files)} 张已下载的图片。")

    download_count = 0
    for i, char_file in enumerate(character_files):
        char_id = char_file.stem
        
        if char_id in existing_image_files:
            continue

        with open(char_file, 'r', encoding='utf-8') as f:
            try:
                char_data = json.load(f)
            except json.JSONDecodeError:
                print(f"警告：无法解析 {char_file} 的JSON。已跳过。")
                continue
        
        char_name = char_data.get('name', f"ID: {char_id}")
        images = char_data.get("images")
        if not images or not isinstance(images, dict):
            print(f"未找到角色 {char_name} 的 'images' 块。已跳过。")
            continue

        image_url = images.get("large")
        if not image_url or not isinstance(image_url, str):
            print(f"未找到角色 {char_name} 的 'large' 图片URL。已跳过。")
            continue

        try:
            print(f"[{i+1}/{len(character_files)}] 正在下载 {char_name} 的图片...")
            
            # 从URL获取文件扩展名，移除查询参数
            file_extension = os.path.splitext(image_url.split('?')[0])[1]
            if not file_extension:
                file_extension = ".jpg"  # 默认扩展名

            file_name = f"{char_id}{file_extension}"
            file_path = os.path.join(output_dir, file_name)

            response = requests.get(image_url, timeout=15)
            response.raise_for_status()

            with open(file_path, 'wb') as img_file:
                img_file.write(response.content)

            print(f"  -> 已保存至 {file_path}")
            download_count += 1
            
            time.sleep(0.5)

        except requests.RequestException as e:
            print(f"下载角色 {char_name} 图片时出错: {e}")
        except Exception as e:
            print(f"处理角色 {char_name} 时发生意外错误: {e}")
    
    print(f"\n--- 下载完成 ---")
    print(f"本次共下载了 {download_count} 张新图片。")


if __name__ == '__main__':
    project_root = Path(__file__).resolve().parent.parent.parent
    
    parser = ArgumentParser(description="下载在指定目录中找到的所有角色的图片。")
    parser.add_argument(
        "-i", "--input_dir", 
        type=str, 
        default=str(project_root / 'data' / 'anime' / 'characters'),
        help="包含角色JSON文件的目录。"
    )
    parser.add_argument(
        "-o", "--output_dir", 
        type=str, 
        default=str(project_root / 'data' / 'anime' / 'character_images'),
        help="用于保存下载图片的目录。"
    )
    args = parser.parse_args()

    if not os.path.isdir(args.input_dir):
        print(f"错误: 输入目录 '{args.input_dir}' 未找到。")
    else:
        download_character_images(args.input_dir, args.output_dir) 