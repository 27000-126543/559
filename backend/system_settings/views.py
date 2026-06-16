from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import SystemSettings
from .serializers import SystemSettingsSerializer
from .permissions import IsAdminUser


class SystemSettingsViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        if not request.user.is_admin:
            return Response(
                {'detail': '只有管理员可以查看系统设置'},
                status=status.HTTP_403_FORBIDDEN
            )
        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        return self.list(request)

    def create(self, request):
        return self.update(request)

    def update(self, request, pk=None):
        if not request.user.is_admin:
            return Response(
                {'detail': '只有管理员可以修改系统设置'},
                status=status.HTTP_403_FORBIDDEN
            )

        settings = SystemSettings.get_settings()
        serializer = SystemSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    @action(detail=False, methods=['get'], url_path='public')
    def get_public_settings(self, request):
        settings = SystemSettings.get_settings()
        return Response({
            'max_file_size_mb': settings.max_file_size_mb,
            'max_concurrent_tasks': settings.max_concurrent_tasks,
        })
