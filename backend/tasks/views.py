from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models, transaction
from django.utils import timezone
from django.db.models import Count, Q
from .models import Task, ParameterSchema
from .serializers import (
    TaskSerializer, TaskDetailSerializer, TaskReviewSerializer,
    TaskParameterValidateSerializer, ParameterSchemaSerializer
)
from .permissions import CanApproveTask, CanEditTask, CanDeleteTask, HasTaskAccess
from users.permissions import IsAdminOrLeader, IsAdminUser
from notifications.models import Notification
from .tasks import process_simulation_task, cleanup_archived_tasks


class ParameterSchemaViewSet(viewsets.ModelViewSet):
    queryset = ParameterSchema.objects.all()
    serializer_class = ParameterSchemaSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_active', 'created_by']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdminOrLeader]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        return ParameterSchema.objects.filter(is_active=True)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status', 'priority', 'project', 'submitter']
    search_fields = ['title', 'description']
    ordering_fields = ['priority', 'created_at', 'started_at', 'completed_at']

    def get_queryset(self):
        queryset = Task.objects.all()
        if not self.request.user.is_admin:
            queryset = queryset.filter(
                models.Q(project__leader=self.request.user) |
                models.Q(project__members=self.request.user) |
                models.Q(submitter=self.request.user)
            ).distinct()
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TaskDetailSerializer
        return TaskSerializer

    def get_permissions(self):
        if self.action == 'create':
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [CanEditTask]
        elif self.action == 'destroy':
            permission_classes = [CanDeleteTask]
        elif self.action in ['retrieve', 'list']:
            permission_classes = [HasTaskAccess]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        task = serializer.save()
        Notification.objects.create(
            recipient=task.project.leader,
            message=f'项目【{task.project.name}】有新的任务【{task.title}】等待审核。',
            is_read=False,
            task=task
        )

    def _perform_approve(self, task, request, comment=None):
        priority_order = {1: 0, 2: 1, 3: 2, 4: 3, 5: 4}
        celery_priority = priority_order.get(task.priority, 2)

        celery_task = process_simulation_task.apply_async(
            args=[task.id],
            priority=celery_priority,
            queue='simulation'
        )
        task.celery_task_id = celery_task.id
        task.save()

        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】已通过审核，即将开始执行。',
            is_read=False,
            task=task
        )

    def _perform_reject(self, task, request, comment=None):
        task.rejection_reason = comment or '任务未通过审核'
        task.save()

        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】被拒绝，原因：{task.rejection_reason}',
            is_read=False,
            task=task
        )

    @action(detail=True, methods=['post'], url_path='review')
    def review_task(self, request, pk=None):
        task = self.get_object()
        if not task.can_approve(request.user):
            return Response({'detail': '您没有权限审核此任务'}, status=status.HTTP_403_FORBIDDEN)

        serializer = TaskReviewSerializer(data=request.data)
        if serializer.is_valid():
            action_type = serializer.validated_data['action']
            comment = serializer.validated_data.get('rejection_reason') or serializer.validated_data.get('comment')

            with transaction.atomic():
                if action_type == 'approve':
                    task.status = 'approved'
                    task.approved_by = request.user
                    task.approved_at = timezone.now()
                    task.save()
                    self._perform_approve(task, request, comment)
                    return Response({'detail': '任务已批准，即将开始执行'}, status=status.HTTP_200_OK)
                else:
                    task.status = 'rejected'
                    task.approved_by = request.user
                    task.approved_at = timezone.now()
                    self._perform_reject(task, request, comment)
                    return Response({'detail': '任务已拒绝'}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_task(self, request, pk=None):
        task = self.get_object()
        if not task.can_approve(request.user):
            return Response({'detail': '您没有权限审核此任务'}, status=status.HTTP_403_FORBIDDEN)

        comment = request.data.get('comment') or request.data.get('rejection_reason')

        with transaction.atomic():
            task.status = 'approved'
            task.approved_by = request.user
            task.approved_at = timezone.now()
            task.save()
            self._perform_approve(task, request, comment)

        from .serializers import TaskDetailSerializer
        return Response({
            'detail': '任务已批准，即将开始执行',
            'task': TaskDetailSerializer(task).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_task(self, request, pk=None):
        task = self.get_object()
        if not task.can_approve(request.user):
            return Response({'detail': '您没有权限审核此任务'}, status=status.HTTP_403_FORBIDDEN)

        comment = request.data.get('comment') or request.data.get('rejection_reason') or '任务未通过审核'

        with transaction.atomic():
            task.status = 'rejected'
            task.approved_by = request.user
            task.approved_at = timezone.now()
            self._perform_reject(task, request, comment)

        from .serializers import TaskDetailSerializer
        return Response({
            'detail': '任务已拒绝',
            'task': TaskDetailSerializer(task).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='validate-parameters')
    def validate_parameters(self, request):
        serializer = TaskParameterValidateSerializer(data=request.data)
        if serializer.is_valid():
            return Response({'valid': True, 'message': '参数验证通过'}, status=status.HTTP_200_OK)
        return Response({'valid': False, 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-tasks')
    def get_my_tasks(self, request):
        tasks = self.get_queryset().filter(submitter=request.user)
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pending-review')
    def get_pending_review(self, request):
        if not (request.user.is_leader or request.user.is_admin):
            return Response({'detail': '您没有权限查看待审核任务'}, status=status.HTTP_403_FORBIDDEN)

        tasks = self.get_queryset().filter(
            status='pending',
            project__leader=request.user
        )
        page = self.paginate_queryset(tasks)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='stats')
    def get_task_stats(self, request):
        qs = self.get_queryset()
        stats = qs.aggregate(
            total=Count('id'),
            pending=Count('id', filter=Q(status='pending')),
            approved=Count('id', filter=Q(status='approved')),
            running=Count('id', filter=Q(status='running')),
            completed=Count('id', filter=Q(status='completed')),
            failed=Count('id', filter=Q(status='failed')),
            archived=Count('id', filter=Q(status='archived')),
        )
        return Response(stats)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_task(self, request, pk=None):
        task = self.get_object()
        if task.status not in ['pending', 'approved']:
            return Response({'detail': '只能取消待审核或已批准的任务'}, status=status.HTTP_400_BAD_REQUEST)

        if not (task.submitter == request.user or task.project.is_leader(request.user) or request.user.is_admin):
            return Response({'detail': '您没有权限取消此任务'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'rejected'
        task.rejection_reason = '任务已取消'
        task.save()

        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】已被取消。',
            is_read=False,
            task=task
        )
        return Response({'detail': '任务已取消'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='restart')
    def restart_task(self, request, pk=None):
        task = self.get_object()
        if task.status not in ['failed', 'completed']:
            return Response({'detail': '只能重新执行失败或已完成的任务'}, status=status.HTTP_400_BAD_REQUEST)

        if not (task.submitter == request.user or task.project.is_leader(request.user) or request.user.is_admin):
            return Response({'detail': '您没有权限重新执行此任务'}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            task.status = 'pending'
            task.progress = 0
            task.started_at = None
            task.completed_at = None
            task.celery_task_id = None
            task.result_file = None
            task.save()

            if hasattr(task, 'result'):
                task.result.delete()

            Notification.objects.create(
                recipient=task.project.leader,
                message=f'任务【{task.title}】已重新提交，等待审核。',
                is_read=False,
                task=task
            )

        return Response({'detail': '任务已重新提交'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='run')
    def run_task(self, request, pk=None):
        return self.restart_task(request, pk)

    @action(detail=False, methods=['post'], url_path='cleanup-archived')
    def trigger_cleanup(self, request):
        if not request.user.is_admin:
            return Response({'detail': '只有管理员可以触发清理任务'}, status=status.HTTP_403_FORBIDDEN)

        days = request.data.get('days', 90)
        cleanup_archived_tasks.delay(days=days)
        return Response({'detail': f'清理任务已启动，将清理{days}天前的归档任务'}, status=status.HTTP_202_ACCEPTED)
