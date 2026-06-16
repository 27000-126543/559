from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, ParameterSchemaViewSet

router = DefaultRouter()
router.register(r'', TaskViewSet, basename='task')
router.register(r'schemas', ParameterSchemaViewSet, basename='parameterschema')

urlpatterns = [
    path('', include(router.urls)),
]
