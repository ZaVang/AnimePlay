
# Bangumi Data Fetcher

This script fetches anime and character data from the Bangumi API, establishes relationships between them, and optionally downloads associated images.

## Setup

1.  **Install Dependencies:**

    Make sure you have Python 3 installed. Then, install the required libraries:

    ```bash
    pip install requests tqdm
    ```

## Usage

The script is executed from the command line and accepts several arguments to customize its behavior.

### Command

```bash
python data_fetcher.py [--start START_RANK] [--end END_RANK] [--download-images]
```

### Arguments

*   `--start` (optional): The starting rank of the anime to fetch. Defaults to `1`.
*   `--end` (optional): The ending rank of the anime to fetch. Defaults to `100`.
*   `--download-images` (optional): A flag that, when present, will download anime cover art and character images. If omitted, no images will be downloaded.

### Examples

*   **Fetch data for the top 100 anime without images:**

    ```bash
    python data_fetcher.py
    ```

*   **Fetch data for anime ranked 101 to 200 and download all images:**

    ```bash
    python data_fetcher.py --start 101 --end 200 --download-images
    ```

## Data Structure

The script organizes the fetched data into the following directory structure:

```
.data/
├── anime/
│   └── {anime_id}.json
├── characters/
│   └── {character_id}.json
└── images/
    ├── anime/
    │   └── {anime_id}.jpg
    └── characters/
        └── {character_id}.jpg
```

### Anime JSON (`anime/{anime_id}.json`)

*   Contains the standard anime data returned by the Bangumi API.
*   Includes an additional field `character_ids`: a list of character IDs associated with the anime.

### Character JSON (`characters/{character_id}.json`)

*   Contains the standard character data returned by the Bangumi API.
*   Includes an additional field `anime_ids`: a list of anime IDs this character appears in.

This structure ensures that the relationship between anime and characters is explicitly stored and easily accessible.
