#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:3000}"

echo "==> health"
curl -s "$BASE/health" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);console.log("health:",j.status,"db:",j.database);});'

EMAIL="manager+$(date +%s)@example.com"
PASS="test123456"

echo "==> signup"
SIGNUP=$(curl -s -X POST "$BASE/api/auth/signup" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"Manager Demo\"}")
TOKEN=$(printf "%s" "$SIGNUP" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(String(j?.data?.token||""));});')

if [ -z "$TOKEN" ]; then
  echo "Signup failed. Response:"
  echo "$SIGNUP"
  exit 1
fi

echo "==> me"
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/auth/me" >/dev/null
echo "me: ok"

echo "==> create envelope"
ENV_CREATE=$(curl -s -X POST "$BASE/api/envelopes" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ETId":"ET-1","SV":1,"ORGId":"ORG-1","Data":"hello"}')
EID=$(printf "%s" "$ENV_CREATE" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s);process.stdout.write(String(j?.data?.EId||""));});')
echo "EId=$EID"

echo "==> update envelope"
curl -s -X PUT "$BASE/api/envelopes/$EID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"ES":20,"Data":"updated"}' >/dev/null
echo "update: ok"

echo "==> done"

