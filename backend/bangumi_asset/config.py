from typing import Dict

BASE_URL = "https://api.bgm.tv"
# 请记得替换为您的项目地址
DEFAULT_USER_AGENT = "Aririgi/private-0.1.0"
ACCESS_TOKEN = "kNbNoYz0cMEjQSLd6qzCeq2PdrrV96WLVDE2VGXA"

def get_default_headers() -> Dict[str, str]:
    """获取默认的请求头。"""
    return {
        "Accept": "application/json",
        "User-Agent": DEFAULT_USER_AGENT,
        "Authorization": f"Bearer {ACCESS_TOKEN}",
    }