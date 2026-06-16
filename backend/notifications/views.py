from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from .models import Notification
from .serializers import NotificationSerializer, NotificationMarkSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['is_read', 'task']
    search_fields = ['message']
    ordering_fields = ['created_at', 'is_read']

    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        read_param = self.request.query_params.get('read')
        if read_param is not None:
            is_read_value = read_param.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_read=is_read_value)
        return queryset

    @action(detail=False, methods=['get'], url_path='unread')
    def get_unread(self, request):
        notifications = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='count')
    def get_count(self, request):
        total = self.get_queryset().count()
        unread = self.get_queryset().filter(is_read=False).count()
        return Response({
            'total': total,
            'unread': unread
        })

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(
                {'detail': '您没有权限修改此消息'},
                status=status.HTTP_403_FORBIDDEN
            )
        notification.mark_as_read()
        return Response({'detail': '已标记为已读', 'id': notification.id, 'is_read': True}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='read')
    def mark_read_compat(self, request, pk=None):
        return self.mark_read(request, pk)

    @action(detail=True, methods=['post'], url_path='mark-unread')
    def mark_unread(self, request, pk=None):
        notification = self.get_object()
        if notification.recipient != request.user:
            return Response(
                {'detail': '您没有权限修改此消息'},
                status=status.HTTP_403_FORBIDDEN
            )
        notification.mark_as_unread()
        return Response({'detail': '已标记为未读'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        with transaction.atomic():
            updated = self.get_queryset().filter(is_read=False).update(is_read=True)
            message = f'已将{updated}条消息标记为已读'
        return Response({'detail': message, 'updated_count': updated}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='read-all')
    def mark_all_read_compat(self, request):
        return self.mark_all_read(request)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear_notifications(self, request):
        delete_all = request.data.get('all', False)
        delete_read = request.data.get('read_only', False)

        queryset = self.get_queryset()

        if delete_read:
            queryset = queryset.filter(is_read=True)
        elif not delete_all:
            return Response(
                {'detail': '必须指定all=True或read_only=True'},
                status=status.HTTP_400_BAD_REQUEST
            )

        count = queryset.count()
        queryset.delete()

        return Response(
            {'detail': f'已删除{count}条消息', 'deleted_count': count},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['post'], url_path='mark-all-unread')
    def mark_all_unread(self, request):
        serializer = NotificationMarkSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                if serializer.validated_data.get('all'):
                    updated = self.get_queryset().filter(is_read=True).update(is_read=False)
                    message = f'已将{updated}条消息标记为未读'
                else:
                    ids = serializer.validated_data.get('notification_ids', [])
                    updated = self.get_queryset().filter(
                        id__in=ids,
                        is_read=True
                    ).update(is_read=False)
                    message = f'已将{updated}条消息标记为未读'

            return Response({'detail': message, 'updated_count': updated}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
