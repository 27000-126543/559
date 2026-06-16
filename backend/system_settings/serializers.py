from rest_framework import serializers
from .models import SystemSettings


class SystemSettingsSerializer(serializers.ModelSerializer):
    cleanup_period = serializers.IntegerField(source='cleanup_days', required=False)
    storage_quota = serializers.IntegerField(source='storage_quota_gb', required=False)

    class Meta:
        model = SystemSettings
        fields = [
            'archive_days',
            'cleanup_days',
            'cleanup_period',
            'max_file_size_mb',
            'max_concurrent_tasks',
            'storage_quota_gb',
            'storage_quota',
            'task_timeout_hours',
            'enable_email_notification',
            'enable_auto_cleanup',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        return data

    def validate_archive_days(self, value):
        if value < 1:
            raise serializers.ValidationError('自动归档天数不能小于1')
        return value

    def validate_cleanup_days(self, value):
        if value < 1:
            raise serializers.ValidationError('自动清理天数不能小于1')
        return value

    def validate_cleanup_period(self, value):
        return self.validate_cleanup_days(value)

    def validate_max_concurrent_tasks(self, value):
        if value < 1 or value > 64:
            raise serializers.ValidationError('最大并发任务数应在1-64之间')
        return value

    def validate_max_file_size_mb(self, value):
        if value < 1 or value > 10240:
            raise serializers.ValidationError('最大文件大小应在1-10240MB之间')
        return value

    def validate_storage_quota(self, value):
        if value < 1 or value > 10000:
            raise serializers.ValidationError('存储配额应在1-10000GB之间')
        return value

    def validate_storage_quota_gb(self, value):
        return self.validate_storage_quota(value)
