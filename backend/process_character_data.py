#!/usr/bin/env python3
"""
角色数据处理脚本
处理人物数据，生成all_cards.json文件，包含人物等级、作品数、中文名等数据
"""

import json
import os
import glob
from collections import defaultdict
import logging

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_anime_data():
    """加载动漫数据，创建ID到名称的映射"""
    anime_file = 'data/anime/all_cards.json'
    anime_mapping = {}
    
    try:
        with open(anime_file, 'r', encoding='utf-8') as f:
            anime_data = json.load(f)
            
        for anime in anime_data:
            anime_mapping[anime['id']] = anime['name']
            
        logging.info(f"加载了 {len(anime_mapping)} 部动漫作品数据")
        return anime_mapping
    except Exception as e:
        logging.error(f"加载动漫数据失败: {e}")
        return {}

def calculate_character_rarity(character):
    """基于角色人气数据计算稀有度等级"""
    if not character.get('stat'):
        return 'INTERESTING'
    
    collects = character['stat'].get('collects', 0)
    comments = character['stat'].get('comments', 0)
    
    # 综合收藏数和评论数来评定稀有度
    popularity_score = collects + (comments * 2)  # 评论权重更高
    
    if popularity_score >= 1500:
        return 'UR'
    elif popularity_score >= 1000:
        return 'HR'
    elif popularity_score >= 500:
        return 'SSR'
    elif popularity_score >= 250:
        return 'SR'
    elif popularity_score >= 50:
        return 'R'
    else:
        return 'N'

def extract_chinese_name(character):
    """从infobox中提取中文名"""
    if not character.get('infobox'):
        return character.get('name', '未知角色')
    
    for item in character['infobox']:
        if item.get('key') == '简体中文名':
            return item.get('value', character.get('name', '未知角色'))
    
    return character.get('name', '未知角色')

def extract_birthday(character):
    """提取并格式化生日信息"""
    birth_mon = character.get('birth_mon')
    birth_day = character.get('birth_day')
    
    if birth_mon and birth_day:
        return f"{birth_mon}月{birth_day}日"
    
    # 尝试从infobox获取生日信息
    if character.get('infobox'):
        for item in character['infobox']:
            if item.get('key') == '生日':
                birthday_value = item.get('value', '')
                if birthday_value:
                    return birthday_value
    
    return '未知'

def process_character_files():
    """处理所有角色文件"""
    characters_dir = 'data/characters/raw_cards'
    processed_characters = []
    
    # 加载动漫数据映射
    anime_mapping = load_anime_data()
    
    # 获取所有角色文件
    character_files = glob.glob(os.path.join(characters_dir, '*.json'))
    logging.info(f"找到 {len(character_files)} 个角色文件")
    
    for file_path in character_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                character = json.load(f)
            
            # 提取中文名
            chinese_name = extract_chinese_name(character)
            
            # 计算稀有度
            rarity = calculate_character_rarity(character)
            
            # 获取作品信息
            anime_ids = character.get('anime_ids', [])
            anime_names = []
            for anime_id in anime_ids:
                if anime_id in anime_mapping:
                    anime_names.append(anime_mapping[anime_id])
            
            # 提取生日
            birthday = extract_birthday(character)
            
            # 构建处理后的角色数据
            processed_character = {
                'id': character['id'],
                'name': chinese_name,  # 中文名作为主要显示名称
                'original_name': character.get('name', ''),  # 保留原始日文名
                'rarity': rarity,
                'image_path': character['images'].get('large', '') if character.get('images') else '',
                'anime_ids': anime_ids,
                'anime_names': anime_names,  # 添加作品名称列表
                'anime_count': len(anime_ids),  # 作品数
                'gender': character.get('gender', 'unknown'),
                'birthday': birthday,
                'description': character.get('summary', '神秘的角色')[:200] + ('...' if len(character.get('summary', '')) > 200 else ''),
                'stats': character.get('stat', {'comments': 0, 'collects': 0}),
                'type': 'character',
                # 添加额外信息
                'blood_type': None,  # 暂时不处理血型信息
                'height': None,      # 暂时不处理身高信息
                'popularity_score': (character.get('stat', {}).get('collects', 0) + 
                                   character.get('stat', {}).get('comments', 0) * 2)
            }
            
            processed_characters.append(processed_character)
            
        except Exception as e:
            logging.error(f"处理文件 {file_path} 时出错: {e}")
            continue
    
    # 按稀有度和人气排序
    rarity_order = {'LEGENDARY': 0, 'MASTERPIECE': 1, 'POPULAR': 2, 'QUALITY': 3, 'INTERESTING': 4}
    processed_characters.sort(key=lambda x: (rarity_order.get(x['rarity'], 5), -x['popularity_score']))
    
    logging.info(f"成功处理了 {len(processed_characters)} 个角色")
    
    # 统计稀有度分布
    rarity_stats = defaultdict(int)
    for char in processed_characters:
        rarity_stats[char['rarity']] += 1
    
    logging.info("稀有度分布:")
    for rarity, count in rarity_stats.items():
        logging.info(f"  {rarity}: {count} 个角色")
    
    return processed_characters

def save_processed_data(characters):
    """保存处理后的数据到characters文件夹下的all_cards.json"""
    output_file = 'data/characters/all_cards.json'
    
    try:
        # 确保目录存在
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # 保存数据
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(characters, f, ensure_ascii=False, indent=2)
        
        logging.info(f"数据已保存到 {output_file}")
        logging.info(f"总共保存了 {len(characters)} 个角色的数据")
        
    except Exception as e:
        logging.error(f"保存数据时出错: {e}")

def main():
    """主函数"""
    logging.info("开始处理角色数据...")
    
    # 检查必要的目录是否存在
    if not os.path.exists('data/characters/'):
        logging.error("角色数据目录不存在: data/characters/")
        return
    
    if not os.path.exists('data/anime/all_cards.json'):
        logging.error("动漫数据文件不存在: data/anime/all_cards.json")
        return
    
    # 处理角色数据
    processed_characters = process_character_files()
    
    if processed_characters:
        # 保存处理后的数据
        save_processed_data(processed_characters)
        logging.info("角色数据处理完成！")
    else:
        logging.error("没有处理任何角色数据")

if __name__ == '__main__':
    main()