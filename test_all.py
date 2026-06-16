import requests
import json

BASE = 'http://localhost:8000/api'

def run():
    print('\n=== Test 1: admin login ===')
    r = requests.post(f'{BASE}/auth/login/', json={'username':'admin','password':'admin123'})
    print(f'  status={r.status_code}')
    data = r.json()
    access = data.get('access','')
    refresh = data.get('refresh','')
    user = data.get('user',{})
    print(f'  access_len={len(access)}')
    print(f'  refresh_len={len(refresh)}')
    print(f'  user: id={user.get("id")} username={user.get("username")} role={user.get("role")} full_name={user.get("full_name")}')

    print('\n=== Test 2: wrong password ===')
    r = requests.post(f'{BASE}/auth/login/', json={'username':'admin','password':'wrong'})
    print(f'  status={r.status_code}')
    print(f'  response={json.dumps(r.json(), ensure_ascii=False)}')

    print('\n=== Test 3: GET /auth/me/ ===')
    r = requests.get(f'{BASE}/auth/me/', headers={'Authorization':f'Bearer {access}'})
    print(f'  status={r.status_code}')
    d = r.json()
    print(f'  user: id={d.get("id")} username={d.get("username")} role={d.get("role")}')

    print('\n=== Test 4: refresh token ===')
    r = requests.post(f'{BASE}/auth/refresh/', json={'refresh':refresh})
    print(f'  status={r.status_code}')
    d = r.json()
    print(f'  got new access? len={len(d.get("access",""))}')

    print('\n=== Test 5: member login + system settings ===')
    r = requests.post(f'{BASE}/auth/login/', json={'username':'member01','password':'member123'})
    member_access = r.json().get('access','')
    member_user = r.json().get('user',{})
    print(f'  member login: role={member_user.get("role")}, status={r.status_code}')
    r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {member_access}'})
    print(f'  member -> settings: status={r.status_code}, response={json.dumps(r.json(), ensure_ascii=False)[:80]}')

    print('\n=== Test 6: admin -> settings ===')
    r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {access}'})
    print(f'  status={r.status_code}')
    d = r.json()
    print(f'  cleanup_days={d.get("cleanup_days")}, max_concurrent_tasks={d.get("max_concurrent_tasks")}, storage_quota_gb={d.get("storage_quota_gb")}')
    print(f'  compat: cleanup_period={d.get("cleanup_period")}, storage_quota={d.get("storage_quota")}')

    print('\n=== Test 7: PUT system settings ===')
    r = requests.put(f'{BASE}/system/settings/', json={'cleanup_days': 30, 'storage_quota_gb': 200, 'max_concurrent_tasks': 8}, headers={'Authorization':f'Bearer {access}'})
    print(f'  save status={r.status_code}, body={json.dumps(r.json(), ensure_ascii=False)[:80]}')
    r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {access}'})
    d = r.json()
    print(f'  after save: cleanup_days={d.get("cleanup_days")}, max_concurrent_tasks={d.get("max_concurrent_tasks")}, storage_quota_gb={d.get("storage_quota_gb")}')

    print('\n=== Test 8: admin -> users ===')
    r = requests.get(f'{BASE}/users/', headers={'Authorization':f'Bearer {access}'})
    print(f'  status={r.status_code}')
    d = r.json()
    results = d.get('results', d) if isinstance(d, dict) else d
    print(f'  count={len(results)}')
    for u in results[:3]:
        print(f'    username={u.get("username")}, role={u.get("role")}')

    print('\n=== Test 9: logout ===')
    r = requests.post(f'{BASE}/auth/logout/', headers={'Authorization':f'Bearer {access}'})
    print(f'  status={r.status_code}, body={json.dumps(r.json(), ensure_ascii=False)}')

    print('\n=== Test 10: leader login & permissions ===')
    r = requests.post(f'{BASE}/auth/login/', json={'username':'leader01','password':'leader123'})
    leader_access = r.json().get('access','')
    leader_user = r.json().get('user',{})
    print(f'  leader login: role={leader_user.get("role")}, status={r.status_code}')
    r = requests.get(f'{BASE}/users/', headers={'Authorization':f'Bearer {leader_access}'})
    print(f'  leader -> users: status={r.status_code}')
    r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {leader_access}'})
    print(f'  leader -> settings: status={r.status_code}')

    print('\n=== DONE ===\n')

run()
