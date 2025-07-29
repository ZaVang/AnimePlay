import argparse
import json
import time
from pathlib import Path
import requests
from tqdm import tqdm
import sys

# Add project root to the Python path to allow absolute imports
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from backend.bangumi_asset import bangumi_api
from backend.bangumi_asset.models import (
    SubjectType, ImageType, SearchSubjectsRequest, SearchSubjectsFilter
)

# --- Constants ---
DATA_DIR = project_root / "data"
ANIME_DIR = DATA_DIR / "anime"
CHAR_DIR = DATA_DIR / "characters"
IMG_ANIME_DIR = DATA_DIR / "images" / "anime"
IMG_CHAR_DIR = DATA_DIR / "images" / "characters"

def download_image(url: str, path: Path):
    """Downloads an image from a URL, checking for existence first."""
    if not url or path.exists():
        return
    try:
        response = requests.get(url, stream=True, timeout=15)
        response.raise_for_status()
        with open(path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    except requests.exceptions.RequestException as e:
        print(f"Warning: Could not download image {url}. Error: {e}")

def main():
    """Main function to fetch and process data from the Bangumi API."""
    parser = argparse.ArgumentParser(
        description="Search and fetch anime/character data from Bangumi based on criteria.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument(
        "-t", "--tag", type=str,
        help="Comma-separated tags to filter by (e.g., 'TV,日本'). Can be left empty."
    )
    parser.add_argument(
        "-s", "--rank-start", type=int, default=1,
        help="The starting rank for the search filter. Defaults to 1."
    )
    parser.add_argument(
        "-e", "--rank-end", type=int, default=500,
        help="The ending rank for the search filter. Defaults to 500."
    )
    parser.add_argument(
        "-l", "--limit", type=int, default=100,
        help="Total number of anime to fetch. Defaults to 100."
    )
    parser.add_argument(
        "--download-images", action="store_true",
        help="Enable this flag to download anime and character images."
    )
    parser.add_argument(
        "--force-update", action="store_true",
        help="Enable this flag to re-fetch and overwrite existing data."
    )
    args = parser.parse_args()

    # --- Directory Setup ---
    ANIME_DIR.mkdir(parents=True, exist_ok=True)
    CHAR_DIR.mkdir(parents=True, exist_ok=True)
    if args.download_images:
        IMG_ANIME_DIR.mkdir(parents=True, exist_ok=True)
        IMG_CHAR_DIR.mkdir(parents=True, exist_ok=True)

    # --- Search for Anime ---
    print(f"Searching for up to {args.limit} anime...")
    
    # Build search request
    req_filter = SearchSubjectsFilter(
        type=[SubjectType.ANIME.value],
        rank=[f">={args.rank_start}", f"<={args.rank_end}"]
    )
    if args.tag:
        req_filter.meta_tags = args.tag.split(',')

    search_request = SearchSubjectsRequest(
        keyword="",
        sort="rank",
        filter=req_filter
    )

    # Paginated search to get the list of anime
    all_anime_summaries = []
    page_size = 20  # API can handle up to 50 per page for this endpoint
    offset = 0
    with tqdm(total=args.limit, desc="Searching Anime") as pbar:
        while len(all_anime_summaries) < args.limit:
            remaining = args.limit - len(all_anime_summaries)
            current_limit = min(page_size, remaining)

            try:
                paged_subjects = bangumi_api.search_subjects(
                    request_body=search_request,
                    limit=current_limit,
                    offset=offset
                )
                page_data = paged_subjects.data or []
                if not page_data:
                    print("\nNo more data found from API. Stopping search.")
                    break

                all_anime_summaries.extend(page_data)
                pbar.update(len(page_data))

                if len(page_data) < current_limit:
                    print("\nFetched all available data matching criteria.")
                    break
                
                offset += page_size
                time.sleep(1) # Rate limiting

            except Exception as e:
                print(f"\nAn error occurred during anime search: {e}")
                break

    # --- Main Processing Loop ---
    print(f"\nFound {len(all_anime_summaries)} anime. Starting data processing...")
    for anime_summary in tqdm(all_anime_summaries, desc="Processing Anime"):
        anime_id = anime_summary.id
        anime_file = ANIME_DIR / f"{anime_id}.json"

        try:
            # Fetch full anime data if it doesn't exist or if force-update is on
            if not anime_file.exists() or args.force_update:
                anime_data_model = bangumi_api.get_subject_by_id(anime_id)
                anime_data = anime_data_model.model_dump(mode='json')
            else:
                with open(anime_file, "r", encoding="utf-8") as f:
                    anime_data = json.load(f)

            # Download anime image
            if args.download_images:
                img_path = IMG_ANIME_DIR / f"{anime_id}.jpg"
                if not img_path.exists() or args.force_update:
                    image_url = bangumi_api.get_subject_image(anime_id, ImageType.LARGE)
                    download_image(image_url, img_path)

            # Fetch and process characters
            related_chars = bangumi_api.get_related_characters(anime_id)
            
            # Filter for main characters ("主角")
            main_characters = [char for char in related_chars if char.relation == '主角']
            main_character_ids = [char.id for char in main_characters]

            tqdm.write(f"  > Found {len(main_characters)} main character(s) for '{anime_summary.name_cn or anime_summary.name}'.")

            for char_summary in tqdm(main_characters, desc=f"  - Chars for {anime_summary.name_cn or anime_summary.name}", leave=False):
                char_id = char_summary.id
                char_file = CHAR_DIR / f"{char_id}.json"

                # Check and fetch character data
                if char_file.exists() and not args.force_update:
                    with open(char_file, "r+", encoding="utf-8") as f:
                        char_data = json.load(f)
                        if anime_id not in char_data.get("anime_ids", []):
                            char_data.setdefault("anime_ids", []).append(anime_id)
                            f.seek(0)
                            json.dump(char_data, f, ensure_ascii=False, indent=4)
                            f.truncate()
                else:
                    char_data_model = bangumi_api.get_character_by_id(char_id)
                    char_data = char_data_model.model_dump(mode='json')
                    char_data["anime_ids"] = [anime_id]
                    with open(char_file, "w", encoding="utf-8") as f:
                        json.dump(char_data, f, ensure_ascii=False, indent=4)

                # Download character image
                if args.download_images:
                    img_path = IMG_CHAR_DIR / f"{char_id}.jpg"
                    if not img_path.exists() or args.force_update:
                        image_url = bangumi_api.get_character_image(char_id, ImageType.LARGE)
                        download_image(image_url, img_path)
                
                time.sleep(0.5) # Rate limiting

            # Finalize anime data with main character IDs and details
            anime_data["main_character_ids"] = main_character_ids
            anime_data["main_characters"] = [
                char.model_dump(mode='json', by_alias=True) for char in main_characters
            ]
            with open(anime_file, "w", encoding="utf-8") as f:
                json.dump(anime_data, f, ensure_ascii=False, indent=4)

            time.sleep(1) # Rate limiting

        except Exception as e:
            print(f"Warning: Failed to process anime ID {anime_id}. Error: {e}")
            continue

    print("\nData fetching and processing complete!")

if __name__ == "__main__":
    main()
