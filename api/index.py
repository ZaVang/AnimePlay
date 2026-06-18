from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sys
import json

# S10-T1：复用 backend/auth.py（凭据/token/原子写），与 server.py 保持一致。
# api/ 与 backend/ 平级，需把 backend 加入 sys.path 才能 import。
_BACKEND_DIR = os.path.join(os.path.dirname(__file__), "..", "backend")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
import auth  # noqa: E402

app = Flask(__name__)

# S10-T4：CORS 收敛——不再裸 CORS(app) 全开。
# 用环境变量 ALLOWED_ORIGINS（逗号分隔）配置允许源；缺省给本地开发源。
_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
_allowed_origins = [
    o.strip()
    for o in os.environ.get("ALLOWED_ORIGINS", _DEFAULT_ORIGINS).split(",")
    if o.strip()
]
CORS(app, resources={r"/api/*": {"origins": _allowed_origins}})

app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0

# Vercel serverless 环境下的用户数据目录（/tmp 易失，见 docs/部署方案.md）。
# 可经环境变量 USER_DATA_DIR 覆盖（test_security.py 用 tempdir 隔离）。
USER_DATA_DIR = os.environ.get("USER_DATA_DIR", "/tmp/user_data")


# --- Helper Functions ---
def get_user_filepath(username):
    if not username or not username.isalnum():
        return None
    return os.path.join(USER_DATA_DIR, f"{username}.json")


def _authed_username():
    """从 Authorization: Bearer <token> 解析出已认证用户名（无效/缺失返回 None）。"""
    return auth.username_from_auth_header(request.headers.get("Authorization"))


def _read_save_version(filepath):
    """读现存存档文件的 saveVersion（权威当前值）；无文件/损坏/缺字段一律视为 0。"""
    if not os.path.exists(filepath):
        return 0
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            existing = json.load(f)
        if isinstance(existing, dict):
            v = existing.get("saveVersion", 0)
            return v if isinstance(v, int) else 0
    except (json.JSONDecodeError, OSError):
        return 0
    return 0


# --- Auth Route (S10-T1) ---
@app.route("/api/auth/login", methods=["POST"])
def login():
    """密码账号登录/首次注册（claim-on-first-login），成功签发会话 token。"""
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    password = data.get("password")
    invite = data.get("invite")
    token, error = auth.login_or_register(username, password, invite)
    if error == "invalid_username":
        return jsonify({"error": "用户名只能包含字母和数字"}), 400
    if error == "invalid_password":
        return jsonify({"error": "密码不能为空"}), 400
    if error == "bad_invite":
        return jsonify({"error": "注册需要有效邀请码"}), 403
    if error == "bad_credentials":
        return jsonify({"error": "用户名或密码错误"}), 401
    return jsonify({"token": token, "username": username}), 200


# --- API Routes ---
@app.route("/api/user/data", methods=["GET"])
def get_user_data():
    username = request.args.get("username")
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({"error": "Invalid username"}), 400

    # token 闸：解析出的用户名必须与被读取的存档一致
    authed = _authed_username()
    if authed is None or authed != username:
        return jsonify({"error": "未授权"}), 401

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
    data = request.get_json(silent=True) or {}
    username = data.get("username")
    filepath = get_user_filepath(username)
    if not filepath:
        return jsonify({"error": "Invalid username"}), 400

    # token 闸：解析出的用户名必须与被写入的存档一致
    authed = _authed_username()
    if authed is None or authed != username:
        return jsonify({"error": "未授权"}), 401

    payload = data.get("payload")
    if not isinstance(payload, dict):
        return jsonify({"error": "Invalid payload"}), 400

    # 乐观并发（S10-T3）：以现存文件的 saveVersion 为权威当前值。
    current_version = _read_save_version(filepath)
    client_version = payload.get("saveVersion", 0)
    if not isinstance(client_version, int):
        client_version = 0
    if client_version != current_version:
        return (
            jsonify({"error": "存档版本冲突，请刷新后重试", "saveVersion": current_version}),
            409,
        )

    new_version = current_version + 1
    payload["saveVersion"] = new_version

    try:
        auth.atomic_write_json(filepath, payload)  # 原子写：temp + os.replace
        return jsonify({"message": "Data saved successfully", "saveVersion": new_version}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# 确保用户数据目录存在
if not os.path.exists(USER_DATA_DIR):
    os.makedirs(USER_DATA_DIR)

# Vercel 会自动处理这个 Flask 应用
if __name__ == "__main__":
    # S10-T2：默认关闭 debug。本地调试设 FLASK_DEBUG=1。
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1")
