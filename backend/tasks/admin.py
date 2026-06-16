from django.contrib import admin
from django.db import models
from .models import Task, ParameterSchema


@admin.register(ParameterSchema)
class ParameterSchemaAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_by', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'created_by']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('基本信息', {'fields': ('name', 'description', 'created_by', 'is_active')}),
        ('参数规则', {'fields': ('schema',)}),
        ('时间信息', {'fields': ('created_at', 'updated_at')}),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ['created_at', 'updated_at'] + list(super().get_readonly_fields(request, obj))
        return ['created_at', 'updated_at']


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'submitter', 'status', 'priority', 'progress', 'created_at']
    list_filter = ['status', 'priority', 'created_at', 'started_at', 'completed_at']
    search_fields = ['title', 'description', 'submitter__username', 'project__name']
    readonly_fields = ['created_at', 'started_at', 'completed_at', 'last_operation_at', 'progress']

    fieldsets = (
        ('基本信息', {'fields': ('title', 'description', 'project', 'submitter')}),
        ('状态信息', {'fields': ('status', 'priority', 'progress', 'celery_task_id')}),
        ('参数信息', {'fields': ('parameters', 'parameter_schema')}),
        ('文件信息', {'fields': ('model_file', 'result_file')}),
        ('审核信息', {'fields': ('approved_by', 'approved_at', 'rejection_reason')}),
        ('时间信息', {'fields': ('created_at', 'started_at', 'completed_at', 'last_operation_at')}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_admin:
            return qs
        return qs.filter(
            models.Q(project__leader=request.user) |
            models.Q(project__members=request.user) |
            models.Q(submitter=request.user)
        ).distinct()
