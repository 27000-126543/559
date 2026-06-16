from django.db import models
from django.conf import settings


class Result(models.Model):
    task = models.OneToOneField(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='result',
        verbose_name='关联任务'
    )
    data_file = models.FileField(
        upload_to='result_data/',
        null=True,
        blank=True,
        verbose_name='数据文件'
    )
    metadata = models.JSONField(default=dict, verbose_name='元数据')
    shared_with = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='shared_results',
        blank=True,
        verbose_name='共享给'
    )
    is_archived = models.BooleanField(default=False, verbose_name='是否归档')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '结果数据'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'结果 - {self.task.title}'

    def can_view(self, user):
        if user.is_admin:
            return True
        if self.task.submitter == user:
            return True
        if self.task.project.is_leader(user):
            return True
        if self.shared_with.filter(pk=user.pk).exists():
            return True
        return False

    def can_edit(self, user):
        if user.is_admin:
            return True
        if self.task.submitter == user:
            return True
        if self.task.project.is_leader(user):
            return True
        return False

    def can_share(self, user):
        return self.can_edit(user)

    def can_archive(self, user):
        return self.can_edit(user)

    def get_data_file_url(self):
        if self.data_file:
            return self.data_file.url
        return None

    def get_file_size(self):
        if self.data_file:
            try:
                return self.data_file.size
            except Exception:
                return None
        return None
