from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from users.views import CustomTokenObtainPairView
from users.serializers import UserSerializer
from tasks.views import ParameterSchemaViewSet


class AuthMeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class AuthLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return Response({'detail': '已退出登录'})


schema_router = DefaultRouter()
schema_router.register(r'', ParameterSchemaViewSet, basename='schema')

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    path('api/auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='auth_verify'),
    path('api/auth/me/', AuthMeView.as_view(), name='auth_me'),
    path('api/auth/logout/', AuthLogoutView.as_view(), name='auth_logout'),

    path('api/users/', include('users.urls')),
    path('api/projects/', include('projects.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/schemas/', include(schema_router.urls)),
    path('api/results/', include('results.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/system/settings/', include('system_settings.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
