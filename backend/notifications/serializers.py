from rest_framework import serializers
from .models import Notification
from tasks.serializers import TaskSerializer


class NotificationSerializer(serializers.ModelSerializer):
    task = TaskSerializer(read_only=True)
    task_id = serializers.IntegerField(source='task.id', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'message', 'is_read', 'task',
            'task_id', 'created_at'
        ]
        read_only_fields = [
            'id', 'recipient', 'message', 'task', 'task_id', 'created_at'
        ]


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
