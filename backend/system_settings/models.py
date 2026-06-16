from django.db import models


class SystemSettings(models.Model):
    archive_days = models.IntegerField(
        default=180,
        verbose_name='自动归档天数',
        help_text='超过该天数的已完成/失败任务将自动归档'
    )
    cleanup_days = models.IntegerField(
        default=90,
        verbose_name='自动清理天数',
        help_text='超过该天数的归档任务将被永久删除'
    )
    max_file_size_mb = models.IntegerField(
        default=100,
        verbose_name='最大文件大小(MB)',
        help_text='上传模型文件的最大大小限制'
    )
    max_concurrent_tasks = models.IntegerField(
        default=4,
        verbose_name='最大并发任务数',
        help_text='同时运行的仿真任务数量上限'
    )
    storage_quota_gb = models.IntegerField(
        default=100,
        verbose_name='存储配额(GB)',
        help_text='系统总存储空间配额'
    )
    task_timeout_hours = models.IntegerField(
        default=4,
        verbose_name='任务超时时间(小时)',
        help_text='单个仿真任务的最大运行时间'
    )
    enable_email_notification = models.BooleanField(
        default=False,
        verbose_name='启用邮件通知'
    )
    enable_auto_cleanup = models.BooleanField(
        default=True,
        verbose_name='启用自动清理'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '系统设置'
        verbose_name_plural = verbose_name

    def __str__(self):
        return f'系统配置 (更新于 {self.updated_at.strftime("%Y-%m-%d %H:%M")})'

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def to_dict(self):
        return {
            'archive_days': self.archive_days,
            'cleanup_days': self.cleanup_days,
            'max_file_size_mb': self.max_file_size_mb,
            'max_concurrent_tasks': self.max_concurrent_tasks,
            'storage_quota_gb': self.storage_quota_gb,
            'task_timeout_hours': self.task_timeout_hours,
            'enable_email_notification': self.enable_email_notification,
            'enable_auto_cleanup': self.enable_auto_cleanup,
            'updated_at': self.updated_at.isoformat(),
        }
