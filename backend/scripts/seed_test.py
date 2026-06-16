import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from users.models import User
from projects.models import Project
from tasks.models import ParameterSchema

admin_user = User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
admin_user.role = 'admin'
admin_user.first_name = '系统管理员'
admin_user.save()
print(f'Created admin: admin/admin123, id={admin_user.id}, role={admin_user.role}')

leader = User.objects.create_user('leader01', 'leader@example.com', 'leader123', role='leader', first_name='项目负责人A')
print(f'Created leader: leader01/leader123, id={leader.id}, role={leader.role}')

member = User.objects.create_user('member01', 'member@example.com', 'member123', role='member', first_name='普通成员A')
print(f'Created member: member01/member123, id={member.id}, role={member.role}')

proj = Project.objects.create(name='测试项目A', description='项目用于测试', leader=leader)
proj.members.add(member)
print(f'Created project: {proj.name}, leader={leader.username}')

schema = ParameterSchema.objects.create(
    name='默认流体模板',
    description='基础计算模板',
    schema={'type': 'object', 'properties': {'temperature': {'type': 'number', 'minimum': 0}}, 'required': ['temperature']},
    created_by=admin_user,
    is_active=True
)
print(f'Created schema: {schema.name}')

print('\n=== 用户列表 ===')
for u in User.objects.all():
    print(f'  {u.username:12s} / role={u.role:7s} / is_admin={u.is_admin} / is_active={u.is_active}')
