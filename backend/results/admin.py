from django.contrib import admin
from django.db import models
from .models import Result


class ResultSharedWithInline(admin.TabularInline):
    model = Result.shared_with.through
    extra = 1
    verbose_name = '共享用户'
    verbose_name_plural = '共享用户'


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ['task', 'is_archived', 'created_at', 'updated_at']
    list_filter = ['is_archived', 'created_at', 'updated_at']
    search_fields = ['task__title', 'metadata']
    readonly_fields = ['created_at', 'updated_at', 'task']
    inlines = [ResultSharedWithInline]
    filter_horizontal = ['shared_with']

    fieldsets = (
        ('基本信息', {'fields': ('task', 'data_file', 'metadata')}),
        ('共享设置', {'fields': ('shared_with',)}),
        ('归档状态', {'fields': ('is_archived',)}),
        ('时间信息', {'fields': ('created_at', 'updated_at')}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_admin:
            return qs
        return qs.filter(
            models.Q(task__submitter=request.user) |
            models.Q(task__project__leader=request.user) |
            models.Q(shared_with=request.user)
        ).distinct()
