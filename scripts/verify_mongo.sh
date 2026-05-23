#!/usr/bin/env bash
set -euo pipefail

# Verifies the demo in MongoDB mode only.
# It starts a local server on an alternate port, runs API checks, then stops it.

PORT="${PORT:-3211}"
BASE="http://127.0.0.1:${PORT}"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is already in use. Set PORT to a free port and retry."
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export NODE_ENV=development
export PORT
export DB_TYPE=mongodb
export DB_DEFAULT=mongodb
export MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/myapp}"
export MONGODB_URI_READ_ONLY="${MONGODB_URI_READ_ONLY:-mongodb://127.0.0.1:27017/myapp}"
export JWT_SECRET="${JWT_SECRET:-dev-secret}"
export JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"

echo "==> starting server on $BASE"
node "$ROOT_DIR/src/app.js" >/dev/null 2>&1 &
SERVER_PID="$!"

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "==> waiting for /health"
for _ in {1..30}; do
  if curl -s "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

curl -s "$BASE/health" | python -c 'import sys,json; j=json.load(sys.stdin); assert j["status"]=="ok"; print("health_ok", j["database"])'

ui_code="$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE/ui/")"
docs_code="$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE/api-docs/")"
echo "ui_status=$ui_code"
echo "swagger_status=$docs_code"

curl -s "$BASE/openapi.json" | python -c 'import sys,json; j=json.load(sys.stdin); print("openapi_paths", len(j.get("paths",{})))'

echo "==> signup + token"
EMAIL="verify+$(date +%s)@example.com"
PASS="test123456"

TOKEN="$(
  curl -s -X POST "$BASE/api/auth/signup" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Verify User\"}" \
  | python -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])'
)"

USER_ID="$(
  curl -s -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  | python -c 'import sys,json; j=json.load(sys.stdin); print(j["data"]["user"].get("_id") or j["data"]["user"].get("id") or "")'
)"

test -n "$TOKEN"
test -n "$USER_ID"
echo "auth_ok userId=$USER_ID"

curl -s -D - -o /dev/null "$BASE/api/auth/me" -H "Authorization: Bearer $TOKEN" \
  | python -c 'import sys; h=sys.stdin.read().lower(); print("x_db_used_header_ok", "x-db-used:" in h)'

curl -s "$BASE/api/users/$USER_ID" -H "Authorization: Bearer $TOKEN" >/dev/null
curl -s -X PUT "$BASE/api/users/$USER_ID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"name":"Verify Updated"}' >/dev/null
echo "user_self_get_update_ok"

echo "==> envelopes"
EID="$(
  curl -s -X POST "$BASE/api/envelopes" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"ETId":"ET-1","SV":1,"ORGId":"ORG-1","Data":"hello"}' \
  | python -c 'import sys,json; print(json.load(sys.stdin)["data"]["EId"])'
)"
test -n "$EID"
curl -s "$BASE/api/envelopes/$EID" -H "Authorization: Bearer $TOKEN" >/dev/null
curl -s -X PUT "$BASE/api/envelopes/$EID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ES":20,"Data":"updated"}' >/dev/null
curl -s "$BASE/api/envelopes/_meta/count" -H "Authorization: Bearer $TOKEN" >/dev/null
curl -s "$BASE/api/envelopes/_meta/exists/$EID" -H "Authorization: Bearer $TOKEN" >/dev/null
echo "envelopes_ok EId=$EID"

echo "==> wrapper demo endpoints (/api/demo)"
curl -s -o /dev/null -w 'demo_bulk_status=%{http_code}\n' \
  -X POST "$BASE/api/demo/posts/bulk" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"count":2,"prefix":"verify"}'

curl -s -o /dev/null -w 'demo_publish_status=%{http_code}\n' \
  -X PATCH "$BASE/api/demo/posts/publish-many" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fromStatus":"draft","toStatus":"published"}'

curl -s -o /dev/null -w 'demo_count_status=%{http_code}\n' \
  "$BASE/api/demo/posts/count?status=published" \
  -H "Authorization: Bearer $TOKEN"

curl -s -o /dev/null -w 'demo_aggregate_status=%{http_code}\n' \
  -X POST "$BASE/api/demo/posts/aggregate" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"pipeline":[{"$sort":{"createdAt":-1}},{"$limit":2}]}'

curl -s -o /dev/null -w 'demo_deleteMany_status=%{http_code}\n' \
  -X DELETE "$BASE/api/demo/posts/delete-many" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"published"}'

echo "==> db selector invalid x-db-type"
curl -s -o /dev/null -w 'invalid_dbtype_mysql_status=%{http_code}\n' \
  -H 'x-db-type: mysql' \
  "$BASE/api/auth/me"

echo "==> verify complete"

