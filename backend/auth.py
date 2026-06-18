"""
共享鉴权模块（S10-T1）—— server.py 与 api/index.py 两个入口共用，保持一致。

设计要点：
- 密码用 werkzeug.security 的盐哈希存储（generate_password_hash / check_password_hash）。
- 会话 token 用 itsdangerous 的 URLSafeTimedSerializer(SECRET_KEY) 签发/校验——
  无状态 HMAC 签名，serverless 多实例/重启也成立（不依赖服务端 session 存储）。
- 凭据独立存储在 data/auth/credentials.json（username -> password_hash），
  绝不能进 user_data 存档文件（存档由客户端 payload 全量覆盖写，塞进去等于把哈希交给客户端改）。
- 凭据落盘用原子写（临时文件 + os.replace 同目录）+ 目录自动创建。
- claim-on-first-login：credentials 里无此用户名时，本次登录带的密码即注册为其密码，
  兼容现有 4 个 passwordless 存档（Aririg / Aririgi / Ash / caocaoxu）。
"""
import json
import os
import tempfile

from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

# SECRET_KEY 用于签发/校验会话 token。
# 生产环境必须通过环境变量 SECRET_KEY 设置一个高熵随机值；
# 下面的默认值仅供本地开发，绝不可用于生产（泄漏即可伪造任意用户的 token）。
_DEV_SECRET_KEY = "animeplay-dev-secret-change-me-in-production"
SECRET_KEY = os.environ.get("SECRET_KEY", _DEV_SECRET_KEY)

# token 默认有效期（秒）；可经环境变量 AUTH_TOKEN_MAX_AGE 覆盖。默认 7 天。
TOKEN_MAX_AGE = int(os.environ.get("AUTH_TOKEN_MAX_AGE", str(7 * 24 * 3600)))

# token 签名命名空间（salt），与序列化器绑定，换 salt 即可整体失效旧 token。
_TOKEN_SALT = "animeplay-session-token"

_serializer = URLSafeTimedSerializer(SECRET_KEY, salt=_TOKEN_SALT)


def get_credentials_path():
    """凭据文件路径。优先读环境变量 AUTH_CREDENTIALS_PATH（测试用 tempdir 隔离），
    否则落在仓库根的 data/auth/credentials.json。"""
    override = os.environ.get("AUTH_CREDENTIALS_PATH")
    if override:
        return override
    base = os.path.join(os.path.dirname(__file__), "..", "data", "auth")
    return os.path.join(base, "credentials.json")


def is_valid_username(username):
    """与读写存档同一套白名单（防路径穿越）：非空、纯字母数字。"""
    return bool(username) and isinstance(username, str) and username.isalnum()


def atomic_write_json(filepath, data):
    """原子写 JSON：同目录写临时文件 + os.replace 原子替换，防写入中途截断损坏。

    目录自动创建。临时文件与目标同目录，保证 os.replace 是同卷原子操作。
    """
    directory = os.path.dirname(filepath) or "."
    os.makedirs(directory, exist_ok=True)
    # delete=False：我们自己负责 replace / 失败时清理。
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix=".tmp-", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, filepath)  # 原子替换（同目录/同卷）
    except Exception:
        # 失败时不留半截临时文件，原目标文件保持不变（未被触碰）。
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        raise


def _load_credentials():
    path = get_credentials_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        # 凭据文件损坏时返回空字典（不让单个坏文件挂掉整个登录），不覆盖原文件。
        return {}


def _save_credentials(credentials):
    atomic_write_json(get_credentials_path(), credentials)


def generate_token(username):
    """为已认证用户签发无状态会话 token。"""
    return _serializer.dumps(username)


def verify_token(token):
    """校验 token，返回其中的 username；无效/过期/缺失返回 None。"""
    if not token:
        return None
    try:
        username = _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not is_valid_username(username):
        return None
    return username


def username_from_auth_header(header_value):
    """从 `Authorization: Bearer <token>` 头解析出 username；失败返回 None。"""
    if not header_value or not isinstance(header_value, str):
        return None
    parts = header_value.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return verify_token(parts[1].strip())


def login_or_register(username, password, invite=None):
    """登录或首次注册（claim-on-first-login）。

    返回 (token, error)：成功时 (token_str, None)；失败时 (None, reason)。
    - 用户名非法 → ("invalid_username")
    - 密码为空 → ("invalid_password")
    - credentials 里无此用户 → 注册（落盘哈希），签发 token
      · 若设了环境变量 INVITE_CODE，则注册必须带对码，否则 ("bad_invite")
      · 邀请码只卡「注册新号」这一步——已有账号登录不受影响（防无限建号，
        而不是给每次登录加摩擦）。env 读在调用时，便于按需开关/测试隔离。
    - 有此用户 → 校验密码，对则签发 token，错则 ("bad_credentials")
    """
    if not is_valid_username(username):
        return None, "invalid_username"
    if not password or not isinstance(password, str):
        return None, "invalid_password"

    credentials = _load_credentials()
    stored = credentials.get(username)

    if stored is None:
        # claim-on-first-login：首次登录即注册
        required_invite = os.environ.get("INVITE_CODE")
        if required_invite and invite != required_invite:
            return None, "bad_invite"
        credentials[username] = generate_password_hash(password)
        _save_credentials(credentials)
        return generate_token(username), None

    if not check_password_hash(stored, password):
        return None, "bad_credentials"

    return generate_token(username), None
