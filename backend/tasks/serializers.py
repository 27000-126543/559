from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models, transaction
from .models import Task, ParameterSchema
from .validators import validate_task_parameters
from users.serializers import UserSerializer
from projects.serializers import ProjectSerializer

User = get_user_model()


class ParameterSchemaSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    created_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='created_by',
        write_only=True,
        required=False
    )

    class Meta:
        model = ParameterSchema
        fields = ['id', 'name', 'description', 'schema', 'created_by', 'created_by_id',
                  'created_at', 'updated_at', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_schema(self, value):
        if not isinstance(value, dict) or 'parameters' not in value:
            raise serializers.ValidationError('参数模板必须包含parameters字段')
        try:
            from .validators import ParameterSchemaValidator
            ParameterSchemaValidator(**value)
        except ValueError as e:
            raise serializers.ValidationError(str(e))
        return value

    def create(self, validated_data):
        if 'created_by' not in validated_data:
            validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class TaskSerializer(serializers.ModelSerializer):
    project = ProjectSerializer(read_only=True)
    project_id = serializers.PrimaryKeyRelatedField(
        queryset=None,
        source='project',
        write_only=True
    )
    submitter = UserSerializer(read_only=True)
    submitter_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='submitter',
        write_only=True,
        required=False
    )
    approved_by = UserSerializer(read_only=True)
    parameter_schema = ParameterSchemaSerializer(read_only=True)
    parameter_schema_id = serializers.PrimaryKeyRelatedField(
        queryset=ParameterSchema.objects.filter(is_active=True),
        source='parameter_schema',
        write_only=True,
        required=False,
        allow_null=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    execution_time = serializers.IntegerField(source='get_execution_time', read_only=True)
    model_file_url = serializers.SerializerMethodField()
    result_file_url = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'project', 'project_id',
            'submitter', 'submitter_id', 'status', 'status_display',
            'priority', 'priority_display', 'parameters', 'parameter_schema',
            'parameter_schema_id', 'model_file', 'model_file_url',
            'result_file', 'result_file_url', 'approved_by', 'approved_at',
            'rejection_reason', 'progress', 'created_at', 'started_at',
            'completed_at', 'last_operation_at', 'execution_time'
        ]
        read_only_fields = [
            'id', 'status', 'approved_by', 'approved_at', 'progress',
            'created_at', 'started_at', 'completed_at', 'last_operation_at',
            'celery_task_id', 'result_file'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from projects.models import Project
            qs = Project.objects.all()
            if not request.user.is_admin:
                qs = qs.filter(
                    models.Q(leader=request.user) | models.Q(members=request.user)
                ).distinct()
            self.fields['project_id'].queryset = qs

    def get_model_file_url(self, obj):
        if obj.model_file:
            return self.context['request'].build_absolute_uri(obj.model_file.url)
        return None

    def get_result_file_url(self, obj):
        if obj.result_file:
            return self.context['request'].build_absolute_uri(obj.result_file.url)
        return None

    def validate_project(self, value):
        request = self.context.get('request')
        if request and not request.user.is_admin:
            if not value.has_access(request.user):
                raise serializers.ValidationError('您没有权限在该项目下创建任务')
        return value

    def validate(self, attrs):
        parameters = attrs.get('parameters', {})
        parameter_schema = attrs.get('parameter_schema')

        if parameter_schema and parameters:
            try:
                validated_params = validate_task_parameters(
                    parameter_schema.schema, parameters
                )
                attrs['parameters'] = validated_params
            except ValueError as e:
                raise serializers.ValidationError({'parameters': str(e)})

        if not parameter_schema and not parameters:
            raise serializers.ValidationError('必须提供参数模板或任务参数')

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        if 'submitter' not in validated_data:
            validated_data['submitter'] = self.context['request'].user
        task = Task.objects.create(**validated_data)
        return task


class TaskDetailSerializer(TaskSerializer):
    result = serializers.SerializerMethodField()

    class Meta(TaskSerializer.Meta):
        fields = TaskSerializer.Meta.fields + ['result']

    def get_result(self, obj):
        try:
            from results.serializers import ResultSerializer
            return ResultSerializer(obj.result, context=self.context).data
        except Task.result.RelatedObjectDoesNotExist:
            return None


class TaskReviewSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs.get('action') == 'reject' and not attrs.get('rejection_reason'):
            raise serializers.ValidationError({'rejection_reason': '拒绝时必须填写拒绝原因'})
        return attrs


class TaskParameterValidateSerializer(serializers.Serializer):
    parameter_schema_id = serializers.IntegerField(required=True)
    parameters = serializers.JSONField(required=True)

    def validate(self, attrs):
        try:
            schema = ParameterSchema.objects.get(id=attrs['parameter_schema_id'], is_active=True)
            validate_task_parameters(schema.schema, attrs['parameters'])
        except ParameterSchema.DoesNotExist:
            raise serializers.ValidationError({'parameter_schema_id': '参数模板不存在或未启用'})
        except ValueError as e:
            raise serializers.ValidationError({'parameters': str(e)})
        return attrs
