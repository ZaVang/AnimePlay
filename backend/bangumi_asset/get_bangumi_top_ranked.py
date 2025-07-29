import requests
import json
import time
from models import SearchSubjectsRequest, SearchSubjectsFilter, SubjectType
from bangumi_api import search_subjects
import argparse

def get_top_popular_anime(
        total_limit=500,
        tag="日本",
        rank_start=1,
        rank_end=500
    ):
    """
    获取指定数量的、按人气排序的日本动画

    :param total_limit: 获取的作品数量 (e.g., 500)
    :param tag: 用于筛选的标签 (e.g., "TV", "OVA", "剧场版"). 传 None 则不按标签筛选.
    :return: 作品列表 (list)
    """
    all_results = []
    page_limit = 20  # API每页最大返回数量
    offset = 0

    # 如果 tag 为 None，则在打印信息中说明
    req = SearchSubjectsRequest(
        keyword="",
        sort="rank",
        filter=SearchSubjectsFilter(
            type=[2],
            meta_tags=tag.split(","),
            rank=[f">={rank_start}", f"<={rank_end}"]
        )
    )
    print(f"开始获取热度排名前 {total_limit}，{tag} 的动画...")

    while len(all_results) < total_limit:
        # 确定本次请求的数量
        remaining = total_limit - len(all_results)
        current_limit = min(page_limit, remaining)

        try:
            # 发起POST请求
            response = search_subjects(req, limit=current_limit, offset=offset)
            page_data = response.data
            if not page_data:
                print("没有更多数据了。")
                break

            all_results.extend(page_data)
            print(f"已获取 {len(all_results)} / {total_limit} 条数据...")

            # 如果API返回的数据少于请求的数量，说明已经到达最后一页
            if len(page_data) < current_limit:
                print("已获取所有符合条件的动画。")
                break
            
            # 更新 offset 以获取下一页
            offset += page_limit

            # Bangumi API 有速率限制，在循环之间稍作等待以避免请求过于频繁
            time.sleep(1)

        except requests.exceptions.RequestException as e:
            print(f"请求API时发生错误: {e}")
            break
        except KeyboardInterrupt:
            print("用户中断了请求。")
            break
            
    return all_results

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-t", "--tag", type=str, required=True, help="标签，多个标签用逗号分隔")
    parser.add_argument("-r", "--rank_start", type=int, required=True, help="排名开始")
    parser.add_argument("-e", "--rank_end", type=int, required=True, help="排名结束")
    parser.add_argument("-l", "--limit", type=int, required=True, help="获取数量")
    args = parser.parse_args()

    # 获取历史所有热度排名在500以内的TV动画
    top_anime = get_top_popular_anime(total_limit=args.limit, tag=args.tag, rank_start=args.rank_start, rank_end=args.rank_end)
    
    if top_anime:
        print(f"\n--- 共获取到 {len(top_anime)} 部热度最高的TV动画 ---")
        print("存储到json中...")
        with open("data/top_anime_japan.json", "w") as f:
            json.dump([x.model_dump(mode="json", by_alias=True, exclude_none=True) for x in top_anime], f, ensure_ascii=False, indent=4)
        print("存储完成")
