import requests, json

BASE = 'http://localhost:8000/api'

def login(u, p):
    r = requests.post(f'{BASE}/auth/login/', json={'username':u,'password':p})
    return r.json().get('access','')

admin = login('admin','admin123')
leader = login('leader01','leader123')
member = login('member01','member123')

print('=== Role Permission Matrix ===')
print()
print('1. admin -> users/list:   ', end='')
r = requests.get(f'{BASE}/users/', headers={'Authorization':f'Bearer {admin}'})
results = r.json().get('results', r.json()) if r.status_code == 200 else r.json()
count = len(results) if isinstance(results, list) else 'N/A'
print(f'{r.status_code} (count={count}) expected 200')

print('2. leader -> users/list:  ', end='')
r = requests.get(f'{BASE}/users/', headers={'Authorization':f'Bearer {leader}'})
print(f'{r.status_code} expected 403')

print('3. member -> users/list:  ', end='')
r = requests.get(f'{BASE}/users/', headers={'Authorization':f'Bearer {member}'})
print(f'{r.status_code} expected 403')

print('4. admin -> settings:     ', end='')
r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {admin}'})
print(f'{r.status_code} expected 200')

print('5. leader -> settings:    ', end='')
r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {leader}'})
print(f'{r.status_code} expected 403')

print('6. member -> settings:    ', end='')
r = requests.get(f'{BASE}/system/settings/', headers={'Authorization':f'Bearer {member}'})
print(f'{r.status_code} expected 403')

print()
print('7. auth/me (member):      ', end='')
r = requests.get(f'{BASE}/auth/me/', headers={'Authorization':f'Bearer {member}'})
d = r.json()
print(f'{r.status_code} (u={d.get("username")} role={d.get("role")}) expected 200')

print('8. auth/me (leader):      ', end='')
r = requests.get(f'{BASE}/auth/me/', headers={'Authorization':f'Bearer {leader}'})
d = r.json()
print(f'{r.status_code} (u={d.get("username")} role={d.get("role")}) expected 200')

print('9. auth/me (admin):       ', end='')
r = requests.get(f'{BASE}/auth/me/', headers={'Authorization':f'Bearer {admin}'})
d = r.json()
print(f'{r.status_code} (u={d.get("username")} role={d.get("role")}) expected 200')
