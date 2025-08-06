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
from collections import defaultdict

# --- 配置 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# 文件路径
ANIME_INPUT_PATH = 'data/anime/all_cards.json'
CHARACTER_INPUT_PATH = 'data/character/all_cards.json'
ANIME_OUTPUT_DIR = 'data/selected_anime'
CHARACTER_OUTPUT_DIR = 'data/selected_character'
ANIME_OUTPUT_PATH = os.path.join(ANIME_OUTPUT_DIR, 'all_cards.json')
CHARACTER_OUTPUT_PATH = os.path.join(CHARACTER_OUTPUT_DIR, 'all_cards.json')

# 筛选和稀有度配置
TOP_ANIME_COUNT = 300
RARITY_PERCENTILES = {
    'UR': 0.05,  # 前 5%
    'HR': 0.15,  # 5% - 15%
    'SSR': 0.30, # 15% - 30%
    'SR': 0.60,  # 30% - 60%
    'R': 1.0    # 60% - 100%
}
ANIME_RARITY_SCORE_BONUS = {
    'UR': 500,
    'HR': 400,
    'SSR': 300,
    'SR': 200,
    'R': 100,
    'N': 0
}

# --- 核心函数 ---

def assign_rarity_by_percentile(items):
    """根据排名百分比为项目列表分配稀有度"""
    total_items = len(items)
    if total_items == 0:
        return

    ur_cutoff = int(total_items * RARITY_PERCENTILES['UR'])
    hr_cutoff = int(total_items * RARITY_PERCENTILES['HR'])
    ssr_cutoff = int(total_items * RARITY_PERCENTILES['SSR'])
    sr_cutoff = int(total_items * RARITY_PERCENTILES['SR'])

    for i, item in enumerate(items):
        if i < ur_cutoff:
            item['rarity'] = 'UR'
        elif i < hr_cutoff:
            item['rarity'] = 'HR'
        elif i < ssr_cutoff:
            item['rarity'] = 'SSR'
        elif i < sr_cutoff:
            item['rarity'] = 'SR'
        else:
            item['rarity'] = 'R'

def process_anime():
    """筛选和处理番剧数据"""
    logging.info(f"开始处理番剧数据，源文件: {ANIME_INPUT_PATH}")
    try:
        with open(ANIME_INPUT_PATH, 'r', encoding='utf-8') as f:
            all_anime = json.load(f)
    except FileNotFoundError:
        logging.error(f"错误: 找不到番剧数据文件 {ANIME_INPUT_PATH}")
        return None

    rated_anime = [a for a in all_anime if a.get('rating_total') and a.get('rating_total') > 0]
    logging.info(f"找到 {len(rated_anime)} 部有评分数据的番剧。")

    rated_anime.sort(key=lambda x: x['rating_total'], reverse=True)
    top_anime = rated_anime[:TOP_ANIME_COUNT]
    logging.info(f"已筛选出评分人数最多的前 {len(top_anime)} 部番剧。")

    # 按实际评分对这300部进行排序，以决定稀有度
    top_anime.sort(key=lambda x: x.get('rating_score', 0), reverse=True)
    assign_rarity_by_percentile(top_anime)
    
    save_json(top_anime, ANIME_OUTPUT_PATH)
    log_rarity_distribution(top_anime, "番剧")

    return {anime['id']: anime for anime in top_anime}

def process_characters(selected_anime_map):
    """根据精选的番剧筛选和处理角色数据"""
    if not selected_anime_map:
        logging.error("没有提供精选番剧数据，无法处理角色数据。")
        return

    logging.info(f"开始处理角色数据，源文件: {CHARACTER_INPUT_PATH}")
    try:
        with open(CHARACTER_INPUT_PATH, 'r', encoding='utf-8') as f:
            all_characters = json.load(f)
    except FileNotFoundError:
        logging.error(f"错误: 找不到角色数据文件 {CHARACTER_INPUT_PATH}")
        return

    selected_characters = []
    for char in all_characters:
        anime_ids = set(char.get('anime_ids', []))
        intersecting_ids = anime_ids.intersection(selected_anime_map.keys())

        if intersecting_ids:
            # 计算作品加权分
            max_bonus = 0
            for anime_id in intersecting_ids:
                anime_rarity = selected_anime_map[anime_id]['rarity']
                bonus = ANIME_RARITY_SCORE_BONUS.get(anime_rarity, 0)
                if bonus > max_bonus:
                    max_bonus = bonus
            
            # 计算综合人气分
            collects = char.get('stats', {}).get('collects', 0)
            char['comprehensive_popularity'] = collects + max_bonus
            selected_characters.append(char)

    logging.info(f"从 {len(all_characters)} 个总角色中，筛选出 {len(selected_characters)} 个属于精选番剧的角色。")

    # 按新的综合人气分排序
    selected_characters.sort(key=lambda x: x['comprehensive_popularity'], reverse=True)

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
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logging.info(f"数据成功保存到: {path} (共 {len(data)} 条记录)")
    except Exception as e:
        logging.error(f"保存文件到 {path} 时出错: {e}")

def log_rarity_distribution(data, data_type):
    """记录稀有度分布日志"""
    rarity_stats = defaultdict(int)
    for item in data:
        rarity_stats[item['rarity']] += 1
    
    logging.info(f"精选{data_type}稀有度分布:")
    rarity_order = {'UR': 0, 'HR': 1, 'SSR': 2, 'SR': 3, 'R': 4, 'N': 5}
    for rarity, count in sorted(rarity_stats.items(), key=lambda item: rarity_order.get(item[0], 6)):
        logging.info(f"  {rarity}: {count} 个")

# --- 主函数 ---

def main():
    """脚本主入口"""
    logging.info("--- 开始创建精选数据集 (v2: 百分比稀有度) ---")
    selected_anime_map = process_anime()
    if selected_anime_map:
        process_characters(selected_anime_map)
    logging.info("--- 精选数据集创建完成 ---")

if __name__ == '__main__':
    main()
