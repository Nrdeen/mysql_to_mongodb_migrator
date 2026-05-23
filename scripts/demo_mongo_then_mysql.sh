#!/usr/bin/env bash
set -euo pipefail

# One-command demo for managers:
# 1) Start server in MongoDB mode, run a full API flow.
# 2) Stop server.
# 3) Validate MySQL credentials + schema.
# 4) Start server in MySQL mode, run the exact same API flow.
#
# Requirements:
# - MongoDB running on 127.0.0.1:27017 (or override via MONGODB_URI)
# - MySQL running and reachable
# - MySQL schema applied (users/posts/envelopes tables exist)
#
# Usage:
#   cd node-manager-demo
#   ./scripts/demo_mongo_then_mysql.sh
#
# Optional env overrides:
#   PORT_MONGO=3212 PORT_MYSQL=3213 MYSQL_HOST=127.0.0.1 MYSQL_USER=myapp_user MYSQL_PASSWORD=... MYSQL_DATABASE=myapp

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PORT_MONGO="${PORT_MONGO:-3212}"
PORT_MYSQL="${PORT_MYSQL:-3213}"

MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/myapp}"
MONGODB_URI_READ_ONLY="${MONGODB_URI_READ_ONLY:-mongodb://127.0.0.1:27017/myapp}"

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-myapp_user}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-CHANGE_ME}"
MYSQL_DATABASE="${MYSQL_DATABASE:-myapp}"

JWT_SECRET="${JWT_SECRET:-dev-secret}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"

need_port_free() {
  local port="$1"
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use. Set PORT_MONGO/PORT_MYSQL to free ports and retry."
    exit 1
  fi
}

wait_health() {
  local base="$1"
  for _ in {1..40}; do
    if curl -s "$base/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

start_server() {
  local db_type="$1"
  local port="$2"

  export NODE_ENV=development
  export PORT="$port"
  export DB_TYPE="$db_type"
  export DB_DEFAULT="$db_type"

  export MONGODB_URI
  export MONGODB_URI_READ_ONLY

  export MYSQL_HOST
  export MYSQL_PORT
  export MYSQL_USER
  export MYSQL_PASSWORD
  export MYSQL_DATABASE
  export MYSQL_READ_HOST="$MYSQL_HOST"
  export MYSQL_READ_PORT="$MYSQL_PORT"

  export JWT_SECRET
  export JWT_EXPIRES_IN

  node "$ROOT_DIR/src/app.js" >/dev/null 2>&1 &
  echo $!
}

stop_server() {
  local pid="$1"
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    # give it a moment to release the port
    sleep 0.5
  fi
}

api_flow() {
  local base="$1"
  local label="$2"

  echo ""
  echo "=============================="
  echo " Demo flow: $label"
  echo " Base: $base"
  echo "=============================="

  curl -s "$base/health" | python -c 'import sys,json; j=json.load(sys.stdin); print("health_ok", j.get("status"), "db", j.get("database"), "enabled", j.get("enabledDatabases"))'

  local email="manager+${label}+$(date +%s)@example.com"
  local pass="test123456"

  local token
  token="$(
    curl -s -X POST "$base/api/auth/signup" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"Manager Demo\",\"role\":\"user\"}" \
    | python -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])'
  )"

  local user_id
  user_id="$(
    curl -s -X POST "$base/api/auth/login" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$email\",\"password\":\"$pass\"}" \
    | python -c 'import sys,json; j=json.load(sys.stdin); u=j["data"]["user"]; print(u.get("_id") or u.get("id") or "")'
  )"

  echo "auth_ok userId=$user_id"

  curl -s -D - -o /dev/null "$base/api/auth/me" -H "Authorization: Bearer $token" \
    | python -c 'import sys; h=sys.stdin.read().lower(); print("x_db_used_header", [ln.strip() for ln in h.splitlines() if ln.startswith("x-db-used:")][0])'

  # Envelope create/update
  local eid
  eid="$(
    curl -s -X POST "$base/api/envelopes" \
      -H "Authorization: Bearer $token" \
      -H 'Content-Type: application/json' \
      -d "{\"ETId\":\"ET-1\",\"SV\":1,\"ORGId\":\"ORG-1\",\"Data\":\"hello ($label)\"}" \
    | python -c 'import sys,json; print(json.load(sys.stdin)["data"]["EId"])'
  )"
  echo "envelope_created EId=$eid"

  curl -s -X PUT "$base/api/envelopes/$eid" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d '{"ES":20,"Data":"updated"}' >/dev/null

  # Demo wrapper endpoints (posts)
  curl -s -o /dev/null -w "demo_bulk_status=%{http_code}\n" \
    -X POST "$base/api/demo/posts/bulk" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d '{"count":2,"prefix":"mgr-demo"}'

  curl -s -o /dev/null -w "demo_publish_status=%{http_code}\n" \
    -X PATCH "$base/api/demo/posts/publish-many" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d '{"fromStatus":"draft","toStatus":"published"}'

  curl -s -o /dev/null -w "demo_count_status=%{http_code}\n" \
    "$base/api/demo/posts/count?status=published" \
    -H "Authorization: Bearer $token"

  curl -s -o /dev/null -w "demo_aggregate_status=%{http_code}\n" \
    -X POST "$base/api/demo/posts/aggregate" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d '{"pipeline":[{"$sort":{"createdAt":-1}},{"$limit":2}]}'

  curl -s -o /dev/null -w "demo_deleteMany_status=%{http_code}\n" \
    -X DELETE "$base/api/demo/posts/delete-many" \
    -H "Authorization: Bearer $token" \
    -H 'Content-Type: application/json' \
    -d '{"status":"published"}'
}

mysql_cli() {
  if command -v mysql >/dev/null 2>&1; then
    echo "mysql"
    return 0
  fi
  if [ -x "/opt/homebrew/bin/mysql" ]; then
    echo "/opt/homebrew/bin/mysql"
    return 0
  fi
  if [ -x "/usr/local/bin/mysql" ]; then
    echo "/usr/local/bin/mysql"
    return 0
  fi
  return 1
}

check_mysql_ready() {
  if [ -z "$MYSQL_PASSWORD" ]; then
    echo ""
    echo "MySQL not configured: set MYSQL_PASSWORD to your real password."
    echo "Example:"
    echo "  export MYSQL_PASSWORD='your_password'"
    echo "  export MYSQL_USER='myapp_user'"
    echo "  export MYSQL_DATABASE='myapp'"
    echo ""
    exit 1
  fi

  if [ "$MYSQL_PASSWORD" = "CHANGE_ME" ] && [ "${ALLOW_CHANGE_ME_PASSWORD:-0}" != "1" ]; then
    echo ""
    echo "MySQL password is set to 'CHANGE_ME'."
    echo "If this is really your MySQL password, re-run with:"
    echo "  export ALLOW_CHANGE_ME_PASSWORD=1"
    echo ""
    exit 1
  fi

  local mysqlbin
  if ! mysqlbin="$(mysql_cli)"; then
    echo ""
    echo "MySQL CLI not found. Install MySQL client or ensure 'mysql' is on PATH."
    echo "Then re-run this demo script."
    echo ""
    exit 1
  fi

  echo ""
  echo "==> checking MySQL connectivity + schema"

  # We avoid prompting: use MYSQL_PWD for the duration of this check.
  if ! MYSQL_PWD="$MYSQL_PASSWORD" "$mysqlbin" -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT 1" >/dev/null; then
    echo ""
    echo "❌ MySQL connection failed for:"
    echo "  host=$MYSQL_HOST port=$MYSQL_PORT user=$MYSQL_USER db=$MYSQL_DATABASE"
    echo ""
    echo "Common fixes:"
    echo "- Use a dedicated app user (recommended): myapp_user"
    echo "- Ensure the password is correct"
    echo "- Ensure MySQL is running and listening on 127.0.0.1:3306"
    echo ""
    exit 1
  fi

  # Minimal schema presence checks (tables must exist)
  local missing=0
  for t in users posts envelopes; do
    if ! MYSQL_PWD="$MYSQL_PASSWORD" "$mysqlbin" -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SHOW TABLES LIKE '$t';" | grep -q "$t"; then
      echo "Missing table: $t"
      missing=1
    fi
  done

  if [ "$missing" -ne 0 ]; then
    echo ""
    echo "MySQL schema is missing. Run (with a privileged MySQL user):"
    echo "  mysql -h 127.0.0.1 -P 3306 -u root -p < schema.sql"
    echo ""
    exit 1
  fi

  echo "MySQL ready: ok"
}

main() {
  need_port_free "$PORT_MONGO"
  need_port_free "$PORT_MYSQL"

  echo "==> MongoDB phase"
  mongo_pid="$(start_server mongodb "$PORT_MONGO")"
  trap "stop_server \"$mongo_pid\" >/dev/null 2>&1 || true" EXIT
  if ! wait_health "http://127.0.0.1:$PORT_MONGO"; then
    echo "Mongo server failed to become ready."
    exit 1
  fi
  api_flow "http://127.0.0.1:$PORT_MONGO" "mongo"
  stop_server "$mongo_pid"
  trap - EXIT

  echo ""
  echo "==> MySQL phase"
  check_mysql_ready

  mysql_pid="$(start_server mysql "$PORT_MYSQL")"
  trap "stop_server \"$mysql_pid\" >/dev/null 2>&1 || true" EXIT
  if ! wait_health "http://127.0.0.1:$PORT_MYSQL"; then
    echo "MySQL server failed to become ready."
    exit 1
  fi
  api_flow "http://127.0.0.1:$PORT_MYSQL" "mysql"
  stop_server "$mysql_pid"
  trap - EXIT

  echo ""
  echo "✅ Demo complete: MongoDB and MySQL runs succeeded."
}

main "$@"

