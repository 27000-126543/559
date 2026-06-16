from django.contrib import admin
from .models import SystemSettings


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'archive_days',
        'cleanup_days',
        'max_file_size_mb',
        'max_concurrent_tasks',
        'storage_quota_gb',
        'enable_auto_cleanup',
        'updated_at',
    ]

    def has_add_permission(self, request):
        if SystemSettings.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False
