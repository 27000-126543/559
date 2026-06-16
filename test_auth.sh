#!/bin/bash
set -e

BASE="http://localhost:8000/api"

echo "=================================================="
echo "= 测试 1: 登录 admin 正确密码"
echo "=================================================="
RESP=$(curl -s -X POST "$BASE/auth/login/" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}')
ACCESS=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access',''))" 2>/dev/null)
REFRESH=$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('refresh','')" 2>/dev/null)
HAS_USER=$(echo "$RESP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('user' in d and 'role' in d.get('user',{}))" 2>/dev/null)
echo "  access_token: ${ACCESS:0:30}... (len=${#ACCESS})"
echo "  refresh_token: ${REFRESH:0:30}... (len=${#REFRESH})"
echo "  has user info: $HAS_USER"
echo ""

echo "=================================================="
echo "= 测试 2: 错误密码"
echo "=================================================="
curl -s -X POST "$BASE/auth/login/" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"wrongpass"}'
echo ""
echo ""

echo "=================================================="
echo "= 测试 3: 获取当前用户 auth/me/"
echo "=================================================="
curl -s -H "Authorization: Bearer $ACCESS" "$BASE/auth/me/" | python3 -c "import sys,json;d=json.load(sys.stdin);print(f'  id={d.get(\"id\")}, username={d.get(\"username\")}, role={d.get(\"role\")}, full_name={d.get(\"full_name\")}')" 2>/dev/null
echo ""

echo "=================================================="
echo "= 测试 4: 刷新 token"
echo "=================================================="
REFRESH_RESP=$(curl -s -X POST "$BASE/auth/refresh/" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh\":\"$REFRESH\"}")
NEW_ACCESS=$(echo "$REFRESH_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access',''))" 2>/dev/null)
echo "  新 access_token: ${NEW_ACCESS:0:30}... (len=${#NEW_ACCESS})"
echo ""

echo "=================================================="
echo "= 测试 5: 普通成员登录并访问系统设置(期望 403)"
echo "=================================================="
MEMBER_LOGIN=$(curl -s -X POST "$BASE/auth/login/" \
  -H 'Content-Type: application/json' \
  -d '{"username":"member01","password":"member123"}')
MEMBER_ACCESS=$(echo "$MEMBER_LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('access',''))" 2>/dev/null)
echo "  member access: ${MEMBER_ACCESS:0:30}..."
SETTINGS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $MEMBER_ACCESS" \
  "$BASE/system/settings/")
echo "  访问系统设置状态码: $SETTINGS_STATUS"
echo ""

echo "=================================================="
echo "= 测试 6: 管理员访问系统设置(期望 200)"
echo "=================================================="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $ACCESS" \
  "$BASE/system/settings/")
BODY=$(curl -s -H "Authorization: Bearer $ACCESS" "$BASE/system/settings/")
echo "  状态码: $STATUS"
echo "  配置: cleanup_days=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('cleanup_days'))" max_concurrent=$(echo "$BODY" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('max_concurrent_tasks'))")
echo ""

echo "=================================================="
echo "= 测试 7: 管理员访问用户管理(期望有数据)"
echo "=================================================="
USERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ACCESS" "$BASE/users/")
echo "  状态码: $USERS_STATUS"
echo ""

echo "=================================================="
echo "= 测试 8: 退出登录"
echo "=================================================="
curl -s -X POST -H "Authorization: Bearer $ACCESS" "$BASE/auth/logout/"
echo ""
echo "  完成"
echo ""

echo "=================================================="
echo "全部测试完成！"
echo "=================================================="
