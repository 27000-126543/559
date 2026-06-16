from rest_framework import serializers
from .models import Notification
from tasks.serializers import TaskSerializer


class NotificationSerializer(serializers.ModelSerializer):
    task = TaskSerializer(read_only=True)
    task_id = serializers.IntegerField(source='task.id', read_only=True, allow_null=True)
    read = serializers.BooleanField(source='is_read', read_only=True)
    type = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    related_task_id = serializers.IntegerField(source='task.id', read_only=True, allow_null=True)
    related_project_id = serializers.SerializerMethodField()
    user = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'message', 'is_read', 'read', 'task',
            'task_id', 'related_task_id', 'related_project_id',
            'type', 'title', 'user', 'created_at'
        ]
        read_only_fields = fields

    def get_type(self, obj):
        if '失败' in obj.message or '错误' in obj.message:
            return 'error'
        if '完成' in obj.message or '成功' in obj.message or '通过' in obj.message:
            return 'success'
        if '审核' in obj.message or '等待' in obj.message:
            return 'warning'
        return 'info'

    def get_title(self, obj):
        if '审核' in obj.message:
            return '任务审核通知'
        if '完成' in obj.message:
            return '任务完成通知'
        if '失败' in obj.message:
            return '任务失败通知'
        if '开始' in obj.message or '执行' in obj.message:
            return '任务执行通知'
        if '共享' in obj.message:
            return '数据共享通知'
        return '系统通知'

    def get_related_project_id(self, obj):
        if obj.task and obj.task.project:
            return obj.task.project.id
        return None

    def get_user(self, obj):
        return {
            'id': obj.recipient.id,
            'username': obj.recipient.username,
        }


class NotificationMarkSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    all = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if not attrs.get('all') and not attrs.get('notification_ids'):
            raise serializers.ValidationError('必须指定notification_ids或设置all=True')
        return attrs
