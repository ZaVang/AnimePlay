from flask import Flask, request, jsonify, send_from_directory
import os
import json

try:
    from flask_compress import Compress
except ImportError:  # 未安装时可降级运行（S9：正式环境必须安装，见 requirements.txt）
    Compress = None

app = Flask(__name__, static_folder="../frontend-vue/dist")
# S9：gzip 压缩（JSON/文本自动压缩，all_animes 之类的大响应收益最大）
if Compress is not None:
    app.config["COMPRESS_MIMETYPES"] = [
        "application/json", "text/html", "text/css",
        "application/javascript", "text/javascript", "image/svg+xml",
    ]
    Compress(app)

app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0  # 动态/HTML 默认不缓存；图片与带哈希指纹的资源单独放行（见下）
USER_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "user_data")
DATA_ROOT = os.path.join(os.path.dirname(__file__), "..", "data")

# S9：主数据进程内缓存——此前每个请求都重读重解析 3.7MB JSON。
# 服务时剥离 main_characters（占 all_animes 94% 体积，前端零引用）。
_ANIME_CACHE = None
_CHARACTER_CACHE = None


def load_anime_cards():
    global _ANIME_CACHE
    if _ANIME_CACHE is None:
        with open(
            os.path.join(DATA_ROOT, "selected_anime", "all_cards.json"),
            "r", encoding="utf-8",
        ) as f:
            data = json.load(f)
        for item in data:
            item.pop("main_characters", None)
        _ANIME_CACHE = data
    return _ANIME_CACHE


def load_character_cards():
    global _CHARACTER_CACHE
    if _CHARACTER_CACHE is None:
        with open(
            os.path.join(DATA_ROOT, "selected_character", "all_cards.json"),
            "r", encoding="utf-8",
        ) as f:
            _CHARACTER_CACHE = json.load(f)
    return _CHARACTER_CACHE


# --- Helper Functions ---
def get_user_filepath(username):
    if not username or not username.isalnum():
        return None
    return os.path.join(USER_DATA_DIR, f"{username}.json")


# --- API Routes ---
@app.route("/api/user/data", methods=["GET"])
def get_user_data():
    username = request.args.get("username")
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({"error": "Invalid username"}), 400

    if not os.path.exists(filepath):
        # If user file doesn't exist, return default initial state
        return jsonify({"isNewUser": True})

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/user/data", methods=["POST"])
def save_user_data():
    data = request.get_json()
    username = data.get("username")
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({"error": "Invalid username"}), 400

    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)

    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data.get("payload"), f, ensure_ascii=False, indent=4)
        return jsonify({"message": "Data saved successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/data/<path:path>")
def serve_data_files(path):
    """Serves files from the root /data directory."""
    # S9：图片内容不变（按 id 存档），恢复长缓存——此前全局禁缓存导致每次进列表全量重拉图
    if path.startswith("images/"):
        response = send_from_directory(DATA_ROOT, path, max_age=2592000)  # 30 天
        response.headers["Cache-Control"] = "public, max-age=2592000, immutable"
        return response
    return send_from_directory(DATA_ROOT, path)


# --- Anime API Routes ---
@app.route("/api/all_animes", methods=["GET"])
def get_animes():
    """Get a list of anime cards (S9: 内存缓存 + 剥离 main_characters)."""
    try:
        limit = request.args.get("limit", type=int, default=50)
        offset = request.args.get("offset", type=int, default=0)
        anime_data = load_anime_cards()
        return jsonify(anime_data[offset : offset + limit])
    except FileNotFoundError:
        return jsonify({"error": "Anime data not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/anime/<int:anime_id>", methods=["GET"])
def get_anime(anime_id):
    """Get specific character data by ID."""
    try:
        anime_file = os.path.join(
            DATA_ROOT, "anime", "processed_cards", f"{anime_id}.json"
        )
        if not os.path.exists(anime_file):
            return jsonify({"error": "Anime not found"}), 404

        with open(anime_file, "r", encoding="utf-8") as f:
            anime_data = json.load(f)

        return jsonify(anime_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/anime/batch", methods=["POST"])
def get_anime_batch():
    """Get multiple anime by IDs."""
    try:
        data = request.get_json()
        character_ids = data.get("ids", [])

        if not character_ids:
            return jsonify({"error": "No anime IDs provided"}), 400

        anime = []
        for char_id in character_ids:
            anime_file = os.path.join(
                DATA_ROOT, "anime", "processed_cards", f"{char_id}.json"
            )
            if os.path.exists(anime_file):
                with open(anime_file, "r", encoding="utf-8") as f:
                    anime_data = json.load(f)
                    anime.append(anime_data)

        return jsonify({"anime": anime})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Character API Routes ---
@app.route("/api/all_characters", methods=["GET"])
def get_characters():
    """Get a list of character cards (S9: 内存缓存)."""
    try:
        limit = request.args.get("limit", type=int, default=50)
        offset = request.args.get("offset", type=int, default=0)
        character_data = load_character_cards()
        return jsonify({"characters": character_data[offset : offset + limit]})
    except FileNotFoundError:
        return jsonify({"error": "Character data not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/characters/<int:character_id>", methods=["GET"])
def get_character(character_id):
    """Get specific character data by ID."""
    try:
        character_file = os.path.join(
            DATA_ROOT, "character", "raw_cards", f"{character_id}.json"
        )
        if not os.path.exists(character_file):
            return jsonify({"error": "Character not found"}), 404

        with open(character_file, "r", encoding="utf-8") as f:
            character_data = json.load(f)

        return jsonify(character_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/characters/batch", methods=["POST"])
def get_characters_batch():
    """Get multiple characters by IDs."""
    try:
        data = request.get_json()
        character_ids = data.get("ids", [])

        if not character_ids:
            return jsonify({"error": "No character IDs provided"}), 400

        characters = []
        for char_id in character_ids:
            character_file = os.path.join(
                DATA_ROOT, "character", "raw_cards", f"{char_id}.json"
            )
            if os.path.exists(character_file):
                with open(character_file, "r", encoding="utf-8") as f:
                    character_data = json.load(f)
                    characters.append(character_data)

        return jsonify({"characters": characters})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Serve Frontend ---
@app.route("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    # This is a bit of a catch-all. Be careful in production.
    # It tries to serve files from frontend/, then frontend/js/, etc.
    # A more robust solution would be to have nginx handle static files.
    try:
        # S9：vite 产物文件名带内容哈希，可永久缓存；其余（index.html 等）维持不缓存
        if path.startswith("assets/"):
            response = send_from_directory(app.static_folder, path, max_age=31536000)
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return response
        return send_from_directory(app.static_folder, path)
    except:
        return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    if not os.path.exists(USER_DATA_DIR):
        os.makedirs(USER_DATA_DIR)
    app.run(debug=True, port=5001)  # Using a different port to avoid conflicts
