from django.db import models
from django.conf import settings


class ParameterSchema(models.Model):
    name = models.CharField(max_length=200, verbose_name='参数模板名称')
    description = models.TextField(blank=True, null=True, verbose_name='描述')
    schema = models.JSONField(verbose_name='参数校验规则JSON')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_schemas',
        verbose_name='创建者'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')

    class Meta:
        verbose_name = '参数模板'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Task(models.Model):
    STATUS_CHOICES = (
        ('pending', '待审核'),
        ('approved', '已批准'),
        ('rejected', '已拒绝'),
        ('running', '运行中'),
        ('completed', '已完成'),
        ('failed', '失败'),
        ('archived', '已归档'),
    )

    PRIORITY_CHOICES = [(i, f'优先级{i}') for i in range(1, 6)]

    title = models.CharField(max_length=200, verbose_name='任务标题')
    description = models.TextField(blank=True, null=True, verbose_name='任务描述')
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='所属项目'
    )
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='submitted_tasks',
        verbose_name='提交者'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name='状态'
    )
    priority = models.IntegerField(
        choices=PRIORITY_CHOICES,
        default=3,
        verbose_name='优先级'
    )
    parameters = models.JSONField(verbose_name='任务参数')
    parameter_schema = models.ForeignKey(
        ParameterSchema,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name='使用的参数模板'
    )
    model_file = models.FileField(
        upload_to='task_models/',
        null=True,
        blank=True,
        verbose_name='模型文件'
    )
    result_file = models.FileField(
        upload_to='task_results/',
        null=True,
        blank=True,
        verbose_name='结果文件'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_tasks',
        verbose_name='审核人'
    )
    approved_at = models.DateTimeField(null=True, blank=True, verbose_name='审核时间')
    rejection_reason = models.TextField(blank=True, null=True, verbose_name='拒绝原因')
    progress = models.IntegerField(default=0, verbose_name='进度百分比')
    celery_task_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Celery任务ID'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='开始时间')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    last_operation_at = models.DateTimeField(auto_now=True, verbose_name='最后操作时间')

    class Meta:
        verbose_name = '仿真任务'
        verbose_name_plural = verbose_name
        ordering = ['-priority', '-created_at']

    def __str__(self):
        return f'{self.title} - {self.get_status_display()}'

    @property
    def is_pending(self):
        return self.status == 'pending'

    @property
    def is_running(self):
        return self.status == 'running'

    @property
    def is_completed(self):
        return self.status == 'completed'

    @property
    def can_approve(self, user):
        if self.status != 'pending':
            return False
        return self.project.is_leader(user) or user.is_admin

    @property
    def can_edit(self, user):
        if self.status in ['running', 'completed', 'failed', 'archived']:
            return False
        return self.submitter == user or self.project.is_leader(user) or user.is_admin

    @property
    def can_delete(self, user):
        if self.status in ['running']:
            return False
        return self.submitter == user or self.project.is_leader(user) or user.is_admin

    def get_execution_time(self):
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
