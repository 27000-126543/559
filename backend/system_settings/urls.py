from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SystemSettingsViewSet

router = DefaultRouter()
router.register(r'', SystemSettingsViewSet, basename='settings')

settings_view = SystemSettingsViewSet.as_view({
    'get': 'list',
    'post': 'create',
    'put': 'update',
    'patch': 'partial_update',
})

urlpatterns = [
    path('', settings_view, name='settings-root'),
    path('', include(router.urls)),
]
