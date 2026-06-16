from django.db import models
from django.conf import settings


class Project(models.Model):
    name = models.CharField(max_length=200, verbose_name='项目名称')
    description = models.TextField(blank=True, null=True, verbose_name='项目描述')
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='led_projects',
        verbose_name='项目负责人'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='joined_projects',
        blank=True,
        verbose_name='项目成员'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    is_active = models.BooleanField(default=True, verbose_name='是否活跃')

    class Meta:
        verbose_name = '项目'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def is_leader(self, user):
        return self.leader == user

    def is_member(self, user):
        return self.members.filter(pk=user.pk).exists()

    def has_access(self, user):
        return self.is_leader(user) or self.is_member(user) or user.is_admin

    def get_task_count(self):
        return self.tasks.count()

    def get_completed_task_count(self):
        return self.tasks.filter(status='completed').count()
