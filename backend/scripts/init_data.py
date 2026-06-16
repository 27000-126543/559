import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from projects.models import Project
from tasks.models import ParameterSchema

User = get_user_model()


def init_users():
    print('Creating default users...')

    admin, _ = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@example.com',
            'role': 'admin',
            'phone': '13800000000',
            'department': '系统管理部',
            'is_staff': True,
            'is_superuser': True,
        }
    )
    admin.set_password('admin123456')
    admin.save()

    leader1, _ = User.objects.get_or_create(
        username='leader1',
        defaults={
            'email': 'leader1@example.com',
            'role': 'leader',
            'phone': '13800000001',
            'department': '计算物理实验室',
        }
    )
    leader1.set_password('leader123456')
    leader1.save()

    leader2, _ = User.objects.get_or_create(
        username='leader2',
        defaults={
            'email': 'leader2@example.com',
            'role': 'leader',
            'phone': '13800000002',
            'department': '材料科学实验室',
        }
    )
    leader2.set_password('leader123456')
    leader2.save()

    for i in range(1, 6):
        member, _ = User.objects.get_or_create(
            username=f'member{i}',
            defaults={
                'email': f'member{i}@example.com',
                'role': 'member',
                'phone': f'138000000{i+10:02d}',
                'department': '计算物理实验室' if i <= 3 else '材料科学实验室',
            }
        )
        member.set_password('member123456')
        member.save()

    print('Users created successfully!')
    return admin, leader1, leader2


def init_projects(leader1, leader2):
    print('Creating default projects...')

    project1, _ = Project.objects.get_or_create(
        name='量子力学仿真项目',
        defaults={
            'description': '研究量子力学系统的数值模拟，包括薛定谔方程求解、量子隧穿效应等',
            'leader': leader1,
        }
    )
    project1.members.add(
        User.objects.get(username='member1'),
        User.objects.get(username='member2'),
        User.objects.get(username='member3'),
    )

    project2, _ = Project.objects.get_or_create(
        name='材料热力学计算',
        defaults={
            'description': '新材料的热力学性质计算，包括相变温度、热导率等参数预测',
            'leader': leader2,
        }
    )
    project2.members.add(
        User.objects.get(username='member4'),
        User.objects.get(username='member5'),
    )

    project3, _ = Project.objects.get_or_create(
        name='流体动力学仿真',
        defaults={
            'description': '复杂流体系统的动力学仿真，研究湍流特性和边界层效应',
            'leader': leader1,
        }
    )
    project3.members.add(
        User.objects.get(username='member1'),
        User.objects.get(username='member2'),
    )

    print('Projects created successfully!')
    return project1, project2, project3


def init_parameter_schemas(admin):
    print('Creating default parameter schemas...')

    schema1, _ = ParameterSchema.objects.get_or_create(
        name='量子力学通用参数模板',
        defaults={
            'description': '适用于大多数量子力学仿真任务的参数模板',
            'schema': {
                'fields': [
                    {
                        'name': 'particle_mass',
                        'type': 'float',
                        'required': True,
                        'title': '粒子质量 (kg)',
                        'default': 9.109e-31,
                        'range': {'min': 1e-35, 'max': 1e-20}
                    },
                    {
                        'name': 'potential_well_depth',
                        'type': 'float',
                        'required': True,
                        'title': '势阱深度 (eV)',
                        'default': 10.0,
                        'range': {'min': 0.1, 'max': 1000.0}
                    },
                    {
                        'name': 'well_width',
                        'type': 'float',
                        'required': True,
                        'title': '势阱宽度 (nm)',
                        'default': 1.0,
                        'range': {'min': 0.01, 'max': 100.0}
                    },
                    {
                        'name': 'temperature',
                        'type': 'float',
                        'required': False,
                        'title': '温度 (K)',
                        'default': 300.0,
                        'range': {'min': 0.0, 'max': 10000.0}
                    },
                    {
                        'name': 'simulation_time',
                        'type': 'float',
                        'required': True,
                        'title': '仿真时间 (ps)',
                        'default': 10.0,
                        'range': {'min': 0.1, 'max': 1000.0}
                    },
                    {
                        'name': 'time_step',
                        'type': 'float',
                        'required': True,
                        'title': '时间步长 (fs)',
                        'default': 1.0,
                        'range': {'min': 0.001, 'max': 100.0}
                    },
                    {
                        'name': 'boundary_condition',
                        'type': 'string',
                        'required': True,
                        'title': '边界条件',
                        'default': 'periodic',
                        'options': ['periodic', 'dirichlet', 'neumann', 'absorbing']
                    },
                    {
                        'name': 'use_parallel',
                        'type': 'bool',
                        'required': False,
                        'title': '启用并行计算',
                        'default': True
                    },
                    {
                        'name': 'grid_size',
                        'type': 'int',
                        'required': True,
                        'title': '网格大小',
                        'default': 1024,
                        'range': {'min': 64, 'max': 8192}
                    },
                    {
                        'name': 'solver_method',
                        'type': 'string',
                        'required': True,
                        'title': '求解方法',
                        'default': 'split_operator',
                        'options': ['split_operator', 'crank_nicolson', 'finite_difference', 'spectral']
                    }
                ]
            },
            'created_by': admin,
        }
    )

    schema2, _ = ParameterSchema.objects.get_or_create(
        name='材料热力学参数模板',
        defaults={
            'description': '适用于材料热力学性质计算的参数模板',
            'schema': {
                'fields': [
                    {
                        'name': 'material_composition',
                        'type': 'string',
                        'required': True,
                        'title': '材料成分',
                        'pattern': '^[A-Z][a-z]?(\d+\.?\d*)?([A-Z][a-z]?(\d+\.?\d*)?)*$'
                    },
                    {
                        'name': 'crystal_structure',
                        'type': 'string',
                        'required': True,
                        'title': '晶体结构',
                        'default': 'fcc',
                        'options': ['fcc', 'bcc', 'hcp', 'sc', 'diamond', 'zincblende', 'rocksalt']
                    },
                    {
                        'name': 'lattice_constant',
                        'type': 'float',
                        'required': True,
                        'title': '晶格常数 (Å)',
                        'default': 3.52,
                        'range': {'min': 1.0, 'max': 20.0}
                    },
                    {
                        'name': 'temperature_range',
                        'type': 'array',
                        'required': True,
                        'title': '温度范围 (K)',
                        'default': [300, 1000],
                        'item_type': 'float',
                        'min_length': 2,
                        'max_length': 2
                    },
                    {
                        'name': 'pressure',
                        'type': 'float',
                        'required': False,
                        'title': '压力 (GPa)',
                        'default': 0.0,
                        'range': {'min': 0.0, 'max': 1000.0}
                    },
                    {
                        'name': 'exchange_correlation',
                        'type': 'string',
                        'required': True,
                        'title': '交换关联泛函',
                        'default': 'PBE',
                        'options': ['LDA', 'PBE', 'PBEsol', 'RPBE', 'revPBE', 'meta-GGA']
                    },
                    {
                        'name': 'k_point_mesh',
                        'type': 'array',
                        'required': True,
                        'title': 'K点网格',
                        'default': [8, 8, 8],
                        'item_type': 'int',
                        'min_length': 3,
                        'max_length': 3
                    },
                    {
                        'name': 'energy_cutoff',
                        'type': 'float',
                        'required': True,
                        'title': '能量截断 (eV)',
                        'default': 400.0,
                        'range': {'min': 100.0, 'max': 2000.0}
                    },
                    {
                        'name': 'calculation_type',
                        'type': 'string',
                        'required': True,
                        'title': '计算类型',
                        'default': 'static',
                        'options': ['static', 'relax', 'scf', 'nscf', 'dos', 'band']
                    },
                    {
                        'name': 'spin_polarized',
                        'type': 'bool',
                        'required': False,
                        'title': '自旋极化计算',
                        'default': False
                    }
                ]
            },
            'created_by': admin,
        }
    )

    schema3, _ = ParameterSchema.objects.get_or_create(
        name='流体动力学参数模板',
        defaults={
            'description': '适用于流体动力学仿真的参数模板',
            'schema': {
                'fields': [
                    {
                        'name': 'fluid_type',
                        'type': 'string',
                        'required': True,
                        'title': '流体类型',
                        'default': 'water',
                        'options': ['water', 'air', 'oil', 'custom']
                    },
                    {
                        'name': 'density',
                        'type': 'float',
                        'required': True,
                        'title': '密度 (kg/m³)',
                        'default': 1000.0,
                        'range': {'min': 0.1, 'max': 10000.0}
                    },
                    {
                        'name': 'viscosity',
                        'type': 'float',
                        'required': True,
                        'title': '动力粘度 (Pa·s)',
                        'default': 0.001,
                        'range': {'min': 1e-7, 'max': 1.0}
                    },
                    {
                        'name': 'velocity',
                        'type': 'float',
                        'required': True,
                        'title': '流速 (m/s)',
                        'default': 1.0,
                        'range': {'min': 0.0, 'max': 1000.0}
                    },
                    {
                        'name': 'reynolds_number',
                        'type': 'float',
                        'required': False,
                        'title': '雷诺数',
                        'default': 1000.0,
                        'range': {'min': 0.1, 'max': 1e8}
                    },
                    {
                        'name': 'domain_size',
                        'type': 'array',
                        'required': True,
                        'title': '计算域大小 (m)',
                        'default': [1.0, 0.5, 0.5],
                        'item_type': 'float',
                        'min_length': 3,
                        'max_length': 3
                    },
                    {
                        'name': 'mesh_resolution',
                        'type': 'int',
                        'required': True,
                        'title': '网格分辨率',
                        'default': 64,
                        'range': {'min': 8, 'max': 512}
                    },
                    {
                        'name': 'simulation_duration',
                        'type': 'float',
                        'required': True,
                        'title': '仿真时长 (s)',
                        'default': 1.0,
                        'range': {'min': 0.001, 'max': 1000.0}
                    },
                    {
                        'name': 'turbulence_model',
                        'type': 'string',
                        'required': True,
                        'title': '湍流模型',
                        'default': 'k-epsilon',
                        'options': ['laminar', 'k-epsilon', 'k-omega', 'SST', 'LES', 'DES']
                    },
                    {
                        'name': 'solver_scheme',
                        'type': 'string',
                        'required': True,
                        'title': '求解方案',
                        'default': 'SIMPLE',
                        'options': ['SIMPLE', 'SIMPLEC', 'PISO', 'PIMPLE', 'COUPLED']
                    }
                ]
            },
            'created_by': admin,
        }
    )

    print('Parameter schemas created successfully!')
    return schema1, schema2, schema3


def main():
    print('=' * 50)
    print('Initializing Simulation Platform Data...')
    print('=' * 50)
    print()

    admin, leader1, leader2 = init_users()
    print()

    projects = init_projects(leader1, leader2)
    print()

    schemas = init_parameter_schemas(admin)
    print()

    print('=' * 50)
    print('Initialization completed successfully!')
    print()
    print('Default Accounts:')
    print('  Admin:    admin / admin123456')
    print('  Leader:   leader1 / leader123456')
    print('  Leader:   leader2 / leader123456')
    print('  Member:   member1 ~ member5 / member123456')
    print()
    print(f'Projects created: {len(projects)}')
    print(f'Parameter schemas created: {len(schemas)}')
    print('=' * 50)


if __name__ == '__main__':
    main()
