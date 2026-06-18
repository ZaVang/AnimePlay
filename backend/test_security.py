"""
后端安全自检（S10）—— 自包含、不引 pytest。

用 Flask app.test_client() 跑断言；用 tempdir + 环境变量隔离 USER_DATA_DIR 与凭据路径，
绝不写真实 data/user_data。运行：

    python backend/test_security.py

全过打印 PASS 行并 sys.exit(0)；任一失败打印 FAIL 并 sys.exit(1)。

覆盖（对照 SPRINT 验收命令 4）：
- 未带 token GET /api/user/data → 401
- 错密码 login → 401
- 对密码 login → 拿到 token
- 带 token 读写自己存档 → 成功
- 用 A 的 token 写 B 的存档 → 被拒（401/403）
- app.debug is False
- 原子写：模拟写入中途失败后原存档仍完整可读（非截断）
- 旧 saveVersion POST → 409；新 saveVersion → 成功
"""
import json
import os
import sys
import tempfile

# 必须在 import server 之前把隔离路径写进环境变量（server/auth 在 import 时读取）。
_TMP = tempfile.mkdtemp(prefix="animeplay-sec-test-")
os.environ["USER_DATA_DIR"] = os.path.join(_TMP, "user_data")
os.environ["AUTH_CREDENTIALS_PATH"] = os.path.join(_TMP, "auth", "credentials.json")
os.environ["SECRET_KEY"] = "test-secret-key-deterministic"
# 确保 debug 默认关闭（不设 FLASK_DEBUG）
os.environ.pop("FLASK_DEBUG", None)

# 让 import 在「从仓库根 / 从 backend 目录」两种 cwd 下都成立。
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 兼容兜底：requirements 已把 Werkzeug 钉到 2.3.8，但既有 .venv 可能仍装着 3.x
# （移除了 __version__）。Flask 2.3.x 的 test_client 仅用它拼 User-Agent 字符串，
# 缺失时从包元数据补一个，避免安全自检被环境版本偏差挡住。
import werkzeug  # noqa: E402

if not hasattr(werkzeug, "__version__"):
    try:
        import importlib.metadata as _md

        werkzeug.__version__ = _md.version("werkzeug")  # type: ignore[attr-defined]
    except Exception:
        werkzeug.__version__ = "0"  # type: ignore[attr-defined]

import auth  # noqa: E402
import server  # noqa: E402

_failures = []


def check(cond, label):
    if cond:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label}")
        _failures.append(label)


def make_payload(save_version=0):
    """最小合法 payload（save_user_data 只要求 payload 是 dict）。"""
    return {"version": 5, "saveVersion": save_version, "state": {"level": 1}}


def main():
    server.app.config["TESTING"] = True
    client = server.app.test_client()

    print("== app.debug 关闭 ==")
    check(server.app.debug is False, "server.app.debug is False")

    print("== 未带 token 读存档 → 401 ==")
    r = client.get("/api/user/data?username=alice")
    check(r.status_code == 401, f"GET without token → 401 (got {r.status_code})")

    print("== 错密码 login → 401 ==")
    # 先注册 alice（首次登录即注册）
    r = client.post("/api/auth/login", json={"username": "alice", "password": "correct-horse"})
    check(r.status_code == 200, f"alice first login (register) → 200 (got {r.status_code})")
    alice_token = r.get_json().get("token") if r.status_code == 200 else None
    check(bool(alice_token), "alice got a token on register")

    r = client.post("/api/auth/login", json={"username": "alice", "password": "wrong-pass"})
    check(r.status_code == 401, f"wrong password → 401 (got {r.status_code})")

    print("== 对密码 login → 拿到 token ==")
    r = client.post("/api/auth/login", json={"username": "alice", "password": "correct-horse"})
    check(r.status_code == 200 and bool(r.get_json().get("token")), "correct password → token")
    alice_token = r.get_json().get("token")

    print("== 带 token 读写自己存档 → 成功 ==")
    headers = {"Authorization": f"Bearer {alice_token}"}
    # 写（首次：服务端当前版本 0，payload.saveVersion 0 → 一致 → 写入，返回 1）
    r = client.post(
        "/api/user/data",
        json={"username": "alice", "payload": make_payload(0)},
        headers=headers,
    )
    check(r.status_code == 200, f"POST own save with token → 200 (got {r.status_code})")
    check(r.get_json().get("saveVersion") == 1, "POST returns saveVersion=1")
    # 读
    r = client.get("/api/user/data?username=alice", headers=headers)
    check(r.status_code == 200, f"GET own save with token → 200 (got {r.status_code})")
    check(r.get_json().get("saveVersion") == 1, "GET reflects saveVersion=1")

    print("== 用 A 的 token 写 B 的存档 → 被拒 ==")
    # 注册 bob
    r = client.post("/api/auth/login", json={"username": "bob", "password": "bob-pass"})
    check(r.status_code == 200, "bob register → 200")
    # alice 的 token 写 bob 的存档
    r = client.post(
        "/api/user/data",
        json={"username": "bob", "payload": make_payload(0)},
        headers=headers,  # alice 的 token
    )
    check(r.status_code in (401, 403), f"A token writing B's save → rejected (got {r.status_code})")
    # 也验证读 B 被拒
    r = client.get("/api/user/data?username=bob", headers=headers)
    check(r.status_code in (401, 403), f"A token reading B's save → rejected (got {r.status_code})")

    print("== saveVersion 乐观并发：旧版本 → 409，新版本 → 成功 ==")
    # alice 当前服务端版本=1。用旧基线 0 提交 → 冲突 409
    r = client.post(
        "/api/user/data",
        json={"username": "alice", "payload": make_payload(0)},
        headers=headers,
    )
    check(r.status_code == 409, f"stale saveVersion POST → 409 (got {r.status_code})")
    # 用正确基线 1 提交 → 成功，返回 2
    r = client.post(
        "/api/user/data",
        json={"username": "alice", "payload": make_payload(1)},
        headers=headers,
    )
    check(r.status_code == 200 and r.get_json().get("saveVersion") == 2,
          f"correct saveVersion POST → 200 saveVersion=2 (got {r.status_code})")

    print("== 原子写：模拟写入中途失败后原存档完整可读（非截断）==")
    # 先确认 alice 存档当前完整可读（基线为权威值）
    alice_path = server.get_user_filepath("alice")
    with open(alice_path, "r", encoding="utf-8") as f:
        before = json.load(f)
    check(isinstance(before, dict) and before.get("saveVersion") == 2, "alice save intact before failure sim")

    # 模拟原子写中途失败：让 json.dump 抛错（写到临时文件时），原文件不应被触碰。
    import auth as auth_mod
    real_replace = os.replace

    def boom_replace(src, dst):
        # 临时文件已写好，但在 os.replace 这一步失败 → 原文件保持不变
        raise OSError("simulated replace failure")

    try:
        auth_mod.os.replace = boom_replace  # type: ignore[attr-defined]
        threw = False
        try:
            auth_mod.atomic_write_json(alice_path, {"saveVersion": 999, "corrupt": "X" * 10})
        except OSError:
            threw = True
        check(threw, "atomic_write_json raised on simulated failure")
    finally:
        auth_mod.os.replace = real_replace  # type: ignore[attr-defined]

    # 原存档应当仍是失败前的完整内容（未被截断/覆盖）
    with open(alice_path, "r", encoding="utf-8") as f:
        after = json.load(f)
    check(after == before, "original save unchanged & fully readable after failed write")
    # 临时文件不应残留
    tmp_leftovers = [n for n in os.listdir(os.path.dirname(alice_path)) if n.startswith(".tmp-")]
    check(len(tmp_leftovers) == 0, "no temp file leftovers after failed write")

    print("== 邀请码门控：设了 INVITE_CODE 后，注册必须带对码，老账号登录不受影响 ==")
    os.environ["INVITE_CODE"] = "secret-invite-2026"
    try:
        # 注册新号不带码 → 403
        r = client.post("/api/auth/login", json={"username": "carol", "password": "carol-pass"})
        check(r.status_code == 403, f"register without invite when gated → 403 (got {r.status_code})")
        # 注册新号带错码 → 403
        r = client.post("/api/auth/login", json={"username": "carol", "password": "carol-pass", "invite": "nope"})
        check(r.status_code == 403, f"register with wrong invite → 403 (got {r.status_code})")
        # 注册新号带对码 → 200
        r = client.post("/api/auth/login", json={"username": "carol", "password": "carol-pass", "invite": "secret-invite-2026"})
        check(r.status_code == 200 and bool(r.get_json().get("token")), f"register with correct invite → 200 (got {r.status_code})")
        # 已有用户 alice 登录无需邀请码（门控只卡注册）
        r = client.post("/api/auth/login", json={"username": "alice", "password": "correct-horse"})
        check(r.status_code == 200, f"existing user login ignores invite gate → 200 (got {r.status_code})")
    finally:
        os.environ.pop("INVITE_CODE", None)

    # --- 收尾 ---
    print()
    if _failures:
        print(f"RESULT: FAIL — {len(_failures)} check(s) failed: {_failures}")
        return 1
    print("RESULT: PASS — all security checks passed")
    return 0


if __name__ == "__main__":
    code = main()
    sys.exit(code)
