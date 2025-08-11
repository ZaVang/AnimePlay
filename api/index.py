from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json

app = Flask(__name__)
CORS(app)  # 允许跨域访问
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# Vercel serverless 环境下的用户数据目录
USER_DATA_DIR = "/tmp/user_data"


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


# 确保用户数据目录存在
if not os.path.exists(USER_DATA_DIR):
    os.makedirs(USER_DATA_DIR)

# Vercel 会自动处理这个 Flask 应用
if __name__ == "__main__":
    app.run(debug=True)
