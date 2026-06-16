from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse, FileResponse
from django.db import transaction
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Result
from .serializers import ResultSerializer, ResultShareSerializer, ResultDownloadSerializer
from .permissions import CanViewResult, CanEditResult, CanShareResult, CanArchiveResult
from notifications.models import Notification
import json
import io
import pandas as pd

User = get_user_model()


class ResultViewSet(viewsets.ModelViewSet):
    queryset = Result.objects.all()
    serializer_class = ResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_archived', 'task__project', 'task__submitter']
    search_fields = ['task__title', 'metadata']
    ordering_fields = ['created_at', 'updated_at']

    def get_queryset(self):
        queryset = Result.objects.all()
        if not self.request.user.is_admin:
            queryset = queryset.filter(
                Q(task__submitter=self.request.user) |
                Q(task__project__leader=self.request.user) |
                Q(shared_with=self.request.user)
            ).distinct()
        return queryset

    def get_permissions(self):
        if self.action in ['retrieve', 'list', 'download']:
            permission_classes = [CanViewResult]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [CanEditResult]
        elif self.action in ['destroy']:
            permission_classes = [CanEditResult]
        elif self.action in ['share', 'unshare']:
            permission_classes = [CanShareResult]
        elif self.action in ['archive', 'unarchive']:
            permission_classes = [CanArchiveResult]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'share':
            return ResultShareSerializer
        elif self.action == 'download':
            return ResultDownloadSerializer
        return ResultSerializer

    @action(detail=True, methods=['post'], url_path='share')
    def share_result(self, request, pk=None):
        result = self.get_object()
        serializer = ResultShareSerializer(data=request.data)
        if serializer.is_valid():
            user_ids = serializer.validated_data['user_ids']
            action_type = serializer.validated_data['action']
            users = User.objects.filter(id__in=user_ids)

            with transaction.atomic():
                if action_type == 'add':
                    result.shared_with.add(*users)
                    for user in users:
                        Notification.objects.create(
                            recipient=user,
                            message=f'结果数据【{result.task.title}】已共享给您。',
                            is_read=False,
                            task=result.task
                        )
                    message = '共享成功'
                else:
                    result.shared_with.remove(*users)
                    for user in users:
                        Notification.objects.create(
                            recipient=user,
                            message=f'结果数据【{result.task.title}】已取消共享。',
                            is_read=False,
                            task=result.task
                        )
                    message = '取消共享成功'

            return Response({'detail': message}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='download')
    def download_result(self, request, pk=None):
        result = self.get_object()
        format_type = request.query_params.get('format', 'json')

        if not result.data_file:
            return Response({'detail': '数据文件不存在'}, status=status.HTTP_404_NOT_FOUND)

        try:
            file_content = result.data_file.read()
            data = json.loads(file_content)

            if format_type == 'json':
                response = HttpResponse(
                    json.dumps(data, indent=2, ensure_ascii=False),
                    content_type='application/json'
                )
                response['Content-Disposition'] = f'attachment; filename="result_{result.id}.json"'
                return response

            elif format_type == 'csv':
                if 'detailed_results' in data:
                    df = pd.DataFrame(data['detailed_results'])
                    csv_buffer = io.StringIO()
                    df.to_csv(csv_buffer, index=False, encoding='utf-8-sig')
                    response = HttpResponse(csv_buffer.getvalue(), content_type='text/csv')
                    response['Content-Disposition'] = f'attachment; filename="result_{result.id}.csv"'
                    return response
                else:
                    return Response(
                        {'detail': '该结果数据不支持CSV格式导出'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            elif format_type == 'txt':
                response = HttpResponse(
                    file_content,
                    content_type='text/plain'
                )
                response['Content-Disposition'] = f'attachment; filename="result_{result.id}.txt"'
                return response

        except Exception as e:
            return Response(
                {'detail': f'下载失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='archive')
    def archive_result(self, request, pk=None):
        result = self.get_object()
        if result.is_archived:
            return Response({'detail': '结果已归档'}, status=status.HTTP_400_BAD_REQUEST)

        result.is_archived = True
        result.save()

        return Response({'detail': '结果已归档'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='unarchive')
    def unarchive_result(self, request, pk=None):
        result = self.get_object()
        if not result.is_archived:
            return Response({'detail': '结果未归档'}, status=status.HTTP_400_BAD_REQUEST)

        result.is_archived = False
        result.save()

        return Response({'detail': '结果已取消归档'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='my-results')
    def get_my_results(self, request):
        results = self.get_queryset().filter(task__submitter=request.user)
        page = self.paginate_queryset(results)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='shared-with-me')
    def get_shared_with_me(self, request):
        results = self.get_queryset().filter(shared_with=request.user)
        page = self.paginate_queryset(results)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(results, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='preview')
    def preview_result(self, request, pk=None):
        result = self.get_object()

        if not result.data_file:
            return Response({'detail': '数据文件不存在'}, status=status.HTTP_404_NOT_FOUND)

        try:
            file_content = result.data_file.read()
            data = json.loads(file_content)

            preview_data = {
                'task_id': result.task_id,
                'task_title': result.task.title,
                'metadata': result.metadata,
                'summary': data.get('summary', {}),
                'sample_count': len(data.get('detailed_results', [])),
                'first_result': data.get('detailed_results', [])[0] if data.get('detailed_results') else None
            }

            return Response(preview_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {'detail': f'预览失败: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
