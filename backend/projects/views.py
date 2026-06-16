from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models, transaction
from django.contrib.auth import get_user_model
from .models import Project
from .serializers import ProjectSerializer, ProjectDetailSerializer, ProjectMemberSerializer
from .permissions import IsProjectLeaderOrAdmin, HasProjectAccess
from users.permissions import IsAdminOrLeader
from notifications.models import Notification

User = get_user_model()


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active', 'leader']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']

    def get_queryset(self):
        queryset = Project.objects.all()
        if not self.request.user.is_admin:
            queryset = queryset.filter(
                models.Q(leader=self.request.user) |
                models.Q(members=self.request.user)
            ).distinct()
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [IsAdminOrLeader]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsProjectLeaderOrAdmin]
        elif self.action in ['retrieve', 'list']:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        project = serializer.save()
        Notification.objects.create(
            recipient=project.leader,
            message=f'您已被指定为项目【{project.name}】的负责人。',
            is_read=False
        )
        for member in project.members.all():
            Notification.objects.create(
                recipient=member,
                message=f'您已加入项目【{project.name}】。',
                is_read=False
            )

    @action(detail=True, methods=['post'], url_path='members')
    def manage_members(self, request, pk=None):
        project = self.get_object()
        if not (project.is_leader(request.user) or request.user.is_admin):
            return Response({'detail': '只有项目负责人或管理员可以管理成员'},
                          status=status.HTTP_403_FORBIDDEN)

        serializer = ProjectMemberSerializer(data=request.data)
        if serializer.is_valid():
            user_ids = serializer.validated_data['user_ids']
            action_type = serializer.validated_data['action']
            users = User.objects.filter(id__in=user_ids)

            with transaction.atomic():
                if action_type == 'add':
                    project.members.add(*users)
                    for user in users:
                        Notification.objects.create(
                            recipient=user,
                            message=f'您已被添加到项目【{project.name}】。',
                            is_read=False
                        )
                    message = '成员添加成功'
                else:
                    project.members.remove(*users)
                    for user in users:
                        Notification.objects.create(
                            recipient=user,
                            message=f'您已从项目【{project.name}】中移除。',
                            is_read=False
                        )
                    message = '成员移除成功'

            return Response({'detail': message}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-projects')
    def get_my_projects(self, request):
        projects = self.get_queryset().filter(
            models.Q(leader=request.user) | models.Q(members=request.user)
        ).distinct()
        page = self.paginate_queryset(projects)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(projects, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='stats')
    def get_project_stats(self, request, pk=None):
        project = self.get_object()
        if not project.has_access(request.user):
            return Response({'detail': '无权限访问该项目'}, status=status.HTTP_403_FORBIDDEN)

        stats = {
            'total_tasks': project.get_task_count(),
            'completed_tasks': project.get_completed_task_count(),
            'pending_tasks': project.tasks.filter(status='pending').count(),
            'running_tasks': project.tasks.filter(status='running').count(),
            'failed_tasks': project.tasks.filter(status='failed').count(),
            'member_count': project.members.count(),
        }
        return Response(stats)
