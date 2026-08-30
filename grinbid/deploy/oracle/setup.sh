#!/usr/bin/env bash
#
# Grinbid — one-shot server setup for Oracle Cloud Always Free (ARM) VM.
# Run this over SSH from your phone (Termius) after creating the instance.
#
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/Kyabtao/grinbid/arena/01a049f5-grinbid/deploy/oracle/setup.sh)"
#
# Environment overrides:
#   BRANCH   git branch to clone   (default: arena/01a049f5-grinbid)
#   PORT     app port              (default: 3000)
#   ADMIN_PASSWORD  admin console password (default: grinbid-admin-dev — CHANGE IT)
#
set -euo pipefail

BRANCH="${BRANCH:-arena/01a049f5-grinbid}"
PORT="${PORT:-3000}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-grinbid-admin-dev}"
APP_DIR="${APP_DIR:-/opt/grinbid}"

log() { echo -e "\n\033[1;36m[grinbid]\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash setup.sh"; exit 1
fi

log "1/6 Installing Node.js 22 (ARM64 ok)…"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs >/dev/null
fi
node -v && npm -v

log "2/6 Cloning Grinbid ($BRANCH) into $APP_DIR …"
rm -rf "$APP_DIR"
git clone --depth 1 --branch "$BRANCH" https://github.com/Kyabtao/grinbid.git "$APP_DIR"
cd "$APP_DIR"

log "3/6 Writing systemd service (port $PORT, restart on crash/boot)…"
cat > /etc/systemd/system/grinbid.service <<EOF
[Unit]
Description=Grinbid — Bid. Back. Rank up. (100% free virtual coins)
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server.js
Restart=always
RestartSec=3
Environment=PORT=$PORT
Environment=ADMIN_PASSWORD=$ADMIN_PASSWORD
Environment=NODE_ENV=production
# Keep the JSON store + session secret on disk
ReadWritePaths=$APP_DIR/data
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now grinbid
sleep 2
systemctl --no-pager --lines=20 status grinbid || true

log "4/6 Keep-alive cron (Oracle can reclaim idle Always-Free instances)…"
( crontab -l 2>/dev/null | grep -v 'grinbid-keepalive' || true
  echo "* * * * * curl -fsS -m 10 -o /dev/null http://127.0.0.1:$PORT/api/health || systemctl restart grinbid # grinbid-keepalive"
) | crontab -

log "5/6 Log rotation (small)…"
cat > /etc/logrotate.d/grinbid <<EOF
$APP_DIR/logs/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
}
EOF
mkdir -p "$APP_DIR/logs"

log "6/6 Done. Next steps in the Oracle console (phone browser):"
echo
echo "  A) Allow public traffic to the app:"
echo "     Networking → Virtual Cloud Networks → your VCN → Security Lists"
echo "     → Default Security List → Add Ingress Rule:"
echo "         Source Type: CIDR  Source: 0.0.0.0/0"
echo "         IP Protocol: TCP    Destination Port: $PORT"
echo
echo "  B) Visit  http://<INSTANCE-PUBLIC-IP>:$PORT   (admin password: $ADMIN_PASSWORD)"
echo "     ⚠ Change ADMIN_PASSWORD before going public."
echo
echo "  C) Optional free HTTPS + no port exposure:"
echo "     install 'cloudflared' tunnel (see deploy/ORACLE-MOBILE.md)"
