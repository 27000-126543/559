from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'message_preview', 'is_read', 'task', 'created_at']
    list_filter = ['is_read', 'created_at', 'recipient']
    search_fields = ['message', 'recipient__username', 'task__title']
    readonly_fields = ['created_at']
    list_editable = ['is_read']

    fieldsets = (
        ('基本信息', {'fields': ('recipient', 'message', 'is_read', 'task')}),
        ('时间信息', {'fields': ('created_at',)}),
    )

    def message_preview(self, obj):
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    message_preview.short_description = '消息内容'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_admin:
            return qs
        return qs.filter(recipient=request.user)
