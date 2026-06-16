from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', '管理员'),
        ('leader', '项目负责人'),
        ('member', '普通成员'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member', verbose_name='角色')
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='手机号')
    department = models.CharField(max_length=100, blank=True, null=True, verbose_name='部门')

    class Meta:
        verbose_name = '用户'
        verbose_name_plural = verbose_name
        ordering = ['-date_joined']

    def __str__(self):
        return f'{self.username} - {self.get_role_display()}'

    @property
    def is_admin(self):
        return self.role == 'admin'

    @property
    def is_leader(self):
        return self.role == 'leader'

    @property
    def is_member(self):
        return self.role == 'member'
