#!/usr/bin/env python3
"""
角色数据处理脚本
处理人物数据，生成all_cards.json文件，包含人物等级、作品数、中文名、战斗属性等数据
"""

import json
import os
import glob
from collections import defaultdict
import logging
import random

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
        return 'N'  # 默认最低稀有度
    
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
    
    if character.get('infobox'):
        for item in character['infobox']:
            if item.get('key') == '生日':
                birthday_value = item.get('value', '')
                if birthday_value:
                    return birthday_value
    
    return '未知'

def assign_battle_stats(rarity, popularity_score):
    """根据稀有度和人气，为角色生成战斗属性"""
    base_stats = {
        'UR':  {'hp': 1200, 'atk': 120, 'def': 120, 'sp': 120, 'spd': 120},
        'HR':  {'hp': 1000, 'atk': 100, 'def': 100, 'sp': 100, 'spd': 100},
        'SSR': {'hp': 850,  'atk': 90,  'def': 80,  'sp': 95,  'spd': 85},
        'SR':  {'hp': 600,  'atk': 70,  'def': 65,  'sp': 75,  'spd': 60},
        'R':   {'hp': 400,  'atk': 50,  'def': 45,  'sp': 55,  'spd': 50},
        'N':   {'hp': 250,  'atk': 30,  'def': 30,  'sp': 30,  'spd': 30}
    }
    
    stats = base_stats.get(rarity, base_stats['N'])
    
    # 根据人气分数增加随机浮动 (0% to 10%)
    normalized_popularity = min(popularity_score / 2000.0, 1.0)
    bonus_multiplier = 1 + (random.uniform(0, 0.1) * normalized_popularity)
    
    final_stats = {
        'hp':  int(stats['hp'] * bonus_multiplier),
        'atk': int(stats['atk'] * bonus_multiplier),
        'def': int(stats['def'] * bonus_multiplier),
        'sp':  int(stats['sp'] * bonus_multiplier),
        'spd': int(stats['spd'] * bonus_multiplier)
    }
    
    return final_stats

def process_character_files():
    """处理所有角色文件"""
    characters_dir = 'data/character/raw_cards'
    processed_characters = []
    
    anime_mapping = load_anime_data()
    
    character_files = glob.glob(os.path.join(characters_dir, '*.json'))
    logging.info(f"找到 {len(character_files)} 个角色文件")
    
    for file_path in character_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                character = json.load(f)
            
            chinese_name = extract_chinese_name(character)
            rarity = calculate_character_rarity(character)
            
            anime_ids = character.get('anime_ids', [])
            anime_names = [anime_mapping[anime_id] for anime_id in anime_ids if anime_id in anime_mapping]
            
            birthday = extract_birthday(character)
            
            popularity_score = (character.get('stat', {}).get('collects', 0) + 
                                character.get('stat', {}).get('comments', 0) * 2)

            battle_stats = assign_battle_stats(rarity, popularity_score)

            processed_character = {
                'id': character['id'],
                'name': chinese_name,
                'original_name': character.get('name', ''),
                'rarity': rarity,
                'image_path': character.get('images', {}).get('large', ''),
                'anime_ids': anime_ids,
                'anime_names': anime_names,
                'anime_count': len(anime_ids),
                'gender': character.get('gender', 'unknown'),
                'birthday': birthday,
                'description': character.get('summary', '神秘的角色')[:200] + ('...' if len(character.get('summary', '')) > 200 else ''),
                'stats': character.get('stat', {'comments': 0, 'collects': 0}),
                'type': 'character',
                'popularity_score': popularity_score,
                'battle_stats': battle_stats, # 新增战斗属性
                'blood_type': None,
                'height': None,
            }
            
            processed_characters.append(processed_character)
            
        except Exception as e:
            logging.error(f"处理文件 {file_path} 时出错: {e}")
            continue
    
    rarity_order = {'UR': 0, 'HR': 1, 'SSR': 2, 'SR': 3, 'R': 4, 'N': 5}
    processed_characters.sort(key=lambda x: (rarity_order.get(x['rarity'], 6), -x.get('popularity_score', 0)))
    
    logging.info(f"成功处理了 {len(processed_characters)} 个角色")
    
    rarity_stats = defaultdict(int)
    for char in processed_characters:
        rarity_stats[char['rarity']] += 1
    
    logging.info("稀有度分布:")
    for rarity, count in sorted(rarity_stats.items(), key=lambda item: rarity_order.get(item[0], 6)):
        logging.info(f"  {rarity}: {count} 个角色")
    
    return processed_characters

def save_processed_data(characters):
    """保存处理后的数据到characters文件夹下的all_cards.json"""
    output_file = 'data/character/all_cards.json'
    
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(characters, f, ensure_ascii=False, indent=2)
        
        logging.info(f"数据已保存到 {output_file}")
        logging.info(f"总共保存了 {len(characters)} 个角色的数据")
        
    except Exception as e:
        logging.error(f"保存数据时出错: {e}")

def main():
    """主函数"""
    logging.info("开始处理角色数据...")
    
    if not os.path.exists('data/character/raw_cards'):
        logging.error("原始角色数据目录不存在: data/character/raw_cards/")
        return
    
    if not os.path.exists('data/anime/all_cards.json'):
        logging.error("动漫数据文件不存在: data/anime/all_cards.json")
        return
    
    processed_characters = process_character_files()
    
    if processed_characters:
        save_processed_data(processed_characters)
        logging.info("角色数据处理完成！")
    else:
        logging.warning("没有处理任何角色数据，请检查原始数据目录。")

if __name__ == '__main__':
    main()
