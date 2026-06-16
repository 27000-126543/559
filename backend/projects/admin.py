from django.contrib import admin
from .models import Project


class ProjectMemberInline(admin.TabularInline):
    model = Project.members.through
    extra = 1
    verbose_name = '项目成员'
    verbose_name_plural = '项目成员'


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'leader', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at', 'leader']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ProjectMemberInline]
    filter_horizontal = ['members']

    fieldsets = (
        ('基本信息', {'fields': ('name', 'description', 'leader', 'is_active')}),
        ('时间信息', {'fields': ('created_at', 'updated_at')}),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_admin:
            return qs
        return qs.filter(leader=request.user) | qs.filter(members=request.user)
