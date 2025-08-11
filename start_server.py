#!/usr/bin/env python3
"""
启动服务器脚本 - 动漫卡牌游戏（含角色卡系统）

使用方法：
python start_server.py

或者直接运行：
./start_server.py
"""

import os
import sys
import subprocess
from pathlib import Path


def main():
    # 获取当前脚本所在目录
    current_dir = Path(__file__).parent
    backend_dir = current_dir / "backend"

    # 检查后端目录是否存在
    if not backend_dir.exists():
        print("❌ 错误：backend 目录不存在")
        sys.exit(1)

    # 检查server.py是否存在
    server_file = backend_dir / "server.py"
    if not server_file.exists():
        print("❌ 错误：backend/server.py 文件不存在")
        sys.exit(1)

    print("🎮 启动动漫卡牌游戏服务器...")
    print("📁 项目目录:", current_dir)
    print("🌐 服务器将在 http://localhost:5001 启动")
    print("✨ 新功能：角色卡抽卡和收集系统")
    print("=" * 50)

    # 切换到backend目录并启动服务器
    try:
        os.chdir(backend_dir)
        subprocess.run([sys.executable, "server.py"], check=True)
    except KeyboardInterrupt:
        print("\n⭐ 服务器已停止")
    except subprocess.CalledProcessError as e:
        print(f"❌ 启动失败：{e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 未知错误：{e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
