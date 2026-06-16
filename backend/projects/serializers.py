from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project
from users.serializers import UserSerializer

User = get_user_model()


class ProjectSerializer(serializers.ModelSerializer):
    leader = UserSerializer(read_only=True)
    leader_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role__in=['admin', 'leader']),
        source='leader',
        write_only=True
    )
    members = UserSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        many=True,
        source='members',
        write_only=True,
        required=False
    )
    task_count = serializers.IntegerField(source='get_task_count', read_only=True)
    completed_task_count = serializers.IntegerField(source='get_completed_task_count', read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'leader', 'leader_id', 'members', 'member_ids',
                  'task_count', 'completed_task_count', 'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_leader_id(self, value):
        if value and not (value.is_admin or value.is_leader):
            raise serializers.ValidationError('项目负责人必须是管理员或项目负责人角色')
        return value

    def create(self, validated_data):
        members = validated_data.pop('members', [])
        project = Project.objects.create(**validated_data)
        if members:
            project.members.set(members)
        return project

    def update(self, instance, validated_data):
        members = validated_data.pop('members', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members is not None:
            instance.members.set(members)
        return instance


class ProjectDetailSerializer(ProjectSerializer):
    tasks = serializers.SerializerMethodField()

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ['tasks']

    def get_tasks(self, obj):
        from tasks.serializers import TaskSerializer
        tasks = obj.tasks.all()[:10]
        return TaskSerializer(tasks, many=True, context=self.context).data


class ProjectMemberSerializer(serializers.Serializer):
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
