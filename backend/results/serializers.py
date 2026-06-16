from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Result
from users.serializers import UserSerializer
from tasks.serializers import TaskSerializer

User = get_user_model()


class ResultSerializer(serializers.ModelSerializer):
    task = TaskSerializer(read_only=True)
    shared_with = UserSerializer(many=True, read_only=True)
    shared_with_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        source='shared_with',
        write_only=True,
        required=False
    )
    data_file_url = serializers.SerializerMethodField()
    file_size = serializers.IntegerField(source='get_file_size', read_only=True)

    class Meta:
        model = Result
        fields = [
            'id', 'task', 'data_file', 'data_file_url', 'metadata',
            'shared_with', 'shared_with_ids', 'is_archived',
            'created_at', 'updated_at', 'file_size'
        ]
        read_only_fields = ['id', 'task', 'data_file', 'created_at', 'updated_at', 'file_size']

    def get_data_file_url(self, obj):
        if obj.data_file:
            return self.context['request'].build_absolute_uri(obj.data_file.url)
        return None


class ResultShareSerializer(serializers.Serializer):
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True
    )
    action = serializers.ChoiceField(choices=['add', 'remove'], required=True)

    def validate_user_ids(self, value):
        if not value:
            raise serializers.ValidationError('用户ID列表不能为空')
        existing_users = User.objects.filter(id__in=value, is_active=True).values_list('id', flat=True)
        missing = set(value) - set(existing_users)
        if missing:
            raise serializers.ValidationError(f'以下用户不存在或已禁用: {missing}')
        return value


class ResultDownloadSerializer(serializers.Serializer):
    format = serializers.ChoiceField(
        choices=['json', 'csv', 'txt'],
        default='json',
        required=False
    )
