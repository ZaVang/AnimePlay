#!/usr/bin/env bash
# =============================================================================
# AnimePlay 一键部署脚本（Ubuntu 22.04/24.04 或 Debian 12）
# 适配：腾讯云 / 阿里云【香港】轻量应用服务器（免备案、国内直连不用 VPN）
#
# 用法（SSH 登录服务器后，以 root 运行）：
#   ① 先用 IP:端口 试玩（无 HTTPS，登录密码明文，仅自测）：
#        curl -fsSL https://raw.githubusercontent.com/ZaVang/AnimePlay/main/deploy/vps-setup.sh | bash
#      访问 http://<公网IP>:8080
#
#   ② 有域名 → 自动 HTTPS（推荐，正式分享用这个）：
#        先把域名 A 记录解析到服务器公网 IP，然后：
#        curl -fsSL https://raw.githubusercontent.com/ZaVang/AnimePlay/main/deploy/vps-setup.sh | DOMAIN=play.yourdomain.com bash
#      访问 https://play.yourdomain.com
#
#   ③ 大陆便宜机 + 图片走 OSS（带宽小也不卡，本机不下 583MB 图片）：
#        图片先传到阿里云 OSS 并绑 CDN 域名（见 docs/部署-阿里云全流程.md），然后：
#        DOMAIN=play.yourdomain.com IMAGE_BASE_URL=https://img.yourdomain.com bash <(curl -fsSL <本脚本>)
#      —— 跳过本地图片下载，前端构建把图片指向该图床；本机只跑逻辑。
#      （大陆机拉 GitHub 慢时，可加 REPO_URL=https://gitee.com/你/AnimePlay.git 走镜像。）
#
# 同机多站：Caddy 走 /etc/caddy/sites/*.caddy 汇入，本脚本只托管 animeplay.caddy，
#   再挂个人主页/别的游戏就往 sites/ 丢一个新 *.caddy，不会被覆盖（见脚本末尾提示）。
#
# ⚠️ 轻量应用服务器有「防火墙/安全组」：必须先在网页控制台放行端口！
#    无域名：放行 TCP 8080      有域名：放行 TCP 80 和 443
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ZaVang/AnimePlay.git}"   # 大陆机拉 GitHub 慢可换 Gitee 镜像
DATA_TAR_URL="https://github.com/ZaVang/AnimePlay/releases/download/assets/data.tar"
APP_DIR="/opt/animeplay"
PORT="${PORT:-8080}"
DOMAIN="${DOMAIN:-}"            # 设了 DOMAIN 就走 Caddy 自动 HTTPS（可多站）；否则 IP:PORT 直连
IMAGE_BASE_URL="${IMAGE_BASE_URL:-}"  # 设了就走「图片 offload」：跳过 583MB 本地图片下载 + 前端构建指向该图床(OSS/CDN)

if [ "$(id -u)" -ne 0 ]; then echo "请以 root 运行（sudo bash ...）"; exit 1; fi
log() { echo -e "\n\033[1;36m▶ $*\033[0m"; }

# --- 0. 低内存机器加 2G swap，避免前端构建 OOM（1核1G 也能跑）-----------------
if [ ! -f /swapfile ] && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 1800 ]; then
  log "内存偏小，创建 2G swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# --- 1. 系统依赖 + Node 20 --------------------------------------------------
log "安装系统依赖（python/git/curl/node）"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y python3 python3-venv python3-pip git curl ca-certificates tar
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# --- 2. 拉代码 --------------------------------------------------------------
log "获取代码 → $APP_DIR"
if [ -d "$APP_DIR/.git" ]; then git -C "$APP_DIR" pull --ff-only; else git clone --depth 1 "$REPO_URL" "$APP_DIR"; fi
cd "$APP_DIR"

# --- 3. 图片素材（583MB，不在 git）-----------------------------------------
# 图片 offload 模式（设了 IMAGE_BASE_URL）：图片由 OSS/CDN 托管，本机完全不需要这 583MB。
# 卡牌/番剧的 JSON 数据在 git 里（已随 clone 到位），不受影响——只有图片走外部源。
if [ -n "$IMAGE_BASE_URL" ]; then
  log "图片走 OSS/CDN（$IMAGE_BASE_URL）→ 跳过本地图片下载，本机只跑逻辑"
elif [ ! -e "$APP_DIR/data/images/.done" ]; then
  log "下载图片素材 data.tar（~583MB，从 Release 拉；大陆机拉 GitHub 可能很慢，建议改用 IMAGE_BASE_URL 走 OSS）"
  curl -L --retry 3 "$DATA_TAR_URL" -o /tmp/data.tar
  tar -xf /tmp/data.tar -C "$APP_DIR"          # 解出 data/images/...
  rm -f /tmp/data.tar && touch "$APP_DIR/data/images/.done"
else
  log "图片素材已存在，跳过下载"
fi

# --- 4. 后端依赖（含 gunicorn）---------------------------------------------
log "建立 Python 虚拟环境 + 安装后端依赖"
python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q -r backend/requirements.txt gunicorn

# --- 5. 前端构建（图片 offload 模式把图床地址烘焙进产物）-------------------
log "构建前端（npm ci && build，几分钟）"
[ -n "$IMAGE_BASE_URL" ] && log "前端图片指向 $IMAGE_BASE_URL（VITE_IMAGE_BASE_URL）"
# 空值时 VITE_IMAGE_BASE_URL="" → 前端 assetUrl 视为未配置，图片走同源 /data/images（行为不变）。
( cd frontend-vue && { npm ci || npm install; } && VITE_IMAGE_BASE_URL="$IMAGE_BASE_URL" npm run build )

# --- 6. 环境变量（SECRET_KEY 一次生成并持久化）-----------------------------
mkdir -p "$APP_DIR/data/user_data" "$APP_DIR/data/auth"
if [ ! -f "$APP_DIR/.env" ]; then
  log "生成 SECRET_KEY / 邀请码 / 持久化路径 → $APP_DIR/.env"
  SECRET=$(python3 -c "import secrets;print(secrets.token_urlsafe(48))")
  # 邀请码：默认随机生成（注册新号要带它，挡无限建号）。想用好记的自定义码：
  #   INVITE_CODE=myfriends2026 bash <(curl ...)   ——会沿用你传的值。
  INVITE="${INVITE_CODE:-$(python3 -c 'import secrets;print(secrets.token_hex(4))')}"
  ORIGINS="http://localhost:5173"
  [ -n "$DOMAIN" ] && ORIGINS="https://$DOMAIN"
  cat > "$APP_DIR/.env" <<EOF
SECRET_KEY=$SECRET
USER_DATA_DIR=$APP_DIR/data/user_data
AUTH_CREDENTIALS_PATH=$APP_DIR/data/auth/credentials.json
ALLOWED_ORIGINS=$ORIGINS
INVITE_CODE=$INVITE
EOF
fi
INVITE_CODE_VAL=$(grep '^INVITE_CODE=' "$APP_DIR/.env" | cut -d= -f2-)

# --- 7. systemd 常驻服务（gunicorn 必须在 backend/ 目录跑，server.py 同目录 import auth）---
BIND_HOST="127.0.0.1"; [ -z "$DOMAIN" ] && BIND_HOST="0.0.0.0"   # 无域名时 gunicorn 直接对外
log "注册 systemd 服务 animeplay（gunicorn ${BIND_HOST}:${PORT}）"
cat > /etc/systemd/system/animeplay.service <<EOF
[Unit]
Description=AnimePlay
After=network.target
[Service]
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/.env
ExecStart=$APP_DIR/.venv/bin/gunicorn -w 2 -b ${BIND_HOST}:${PORT} --timeout 120 server:app
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now animeplay
systemctl restart animeplay

# --- 8. 对外暴露 ------------------------------------------------------------
if [ -n "$DOMAIN" ]; then
  log "安装 Caddy（自动 Let's Encrypt HTTPS）反代 → 127.0.0.1:${PORT}"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
  mkdir -p /etc/caddy/sites
  # 主配置只负责汇入各站点；本脚本只托管 sites/animeplay.caddy。
  # 想在同一台机器再挂站（个人主页 / 别的游戏），往 /etc/caddy/sites/ 丢一个新 *.caddy 再 `systemctl reload caddy`，
  # 本脚本重跑不会覆盖它们。例：
  #   home.你域名.com { root * /var/www/homepage; file_server }
  #   game2.你域名.com { encode gzip; reverse_proxy 127.0.0.1:5002 }
  cat > /etc/caddy/Caddyfile <<'EOF'
import /etc/caddy/sites/*.caddy
EOF
  cat > /etc/caddy/sites/animeplay.caddy <<EOF
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:${PORT}
}
EOF
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
  echo -e "\n\033[1;32m✅ 上线完成：https://$DOMAIN\033[0m"
  echo "   （记得控制台防火墙已放行 TCP 80 和 443）"
else
  IP=$(curl -s --max-time 5 https://api.ipify.org || echo "<公网IP>")
  echo -e "\n\033[1;32m✅ 上线完成（自测）：http://$IP:$PORT\033[0m"
  echo -e "   \033[1;33m注意：无 HTTPS，登录密码明文传输，仅供自己试玩；正式分享请加域名重跑：\033[0m"
  echo "        curl -fsSL $DATA_TAR_URL >/dev/null; DOMAIN=play.你的域名 bash <(curl -fsSL https://raw.githubusercontent.com/ZaVang/AnimePlay/main/deploy/vps-setup.sh)"
  echo "   （记得控制台防火墙已放行 TCP $PORT）"
fi

echo -e "\n\033[1;35m🎟  邀请码（发给朋友才能注册新号）：$INVITE_CODE_VAL\033[0m"
echo "    想改成好记的：编辑 $APP_DIR/.env 的 INVITE_CODE，再 systemctl restart animeplay"
echo -e "\n维护命令：  日志 journalctl -u animeplay -f   ｜  重启 systemctl restart animeplay   ｜  更新代码后重跑本脚本即可"
echo "存档/账号在 $APP_DIR/data/user_data 和 data/auth —— 记得定期备份这两处（无数据库，就是这些 JSON）。"
[ -n "$IMAGE_BASE_URL" ] && echo "图片走 OSS/CDN（$IMAGE_BASE_URL）：本机未下 583MB 图片；新增图片后在 OSS 侧补传即可。"
echo "同机加站：往 /etc/caddy/sites/ 丢 *.caddy 后 systemctl reload caddy；定时任务用 crontab -e 或 systemd timer（本机常驻，本地电脑不用开机）。"
