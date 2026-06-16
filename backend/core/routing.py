from django.urls import re_path
from tasks.consumers import TaskProgressConsumer

websocket_urlpatterns = [
    re_path(r'ws/tasks/(?P<task_id>\d+)/progress/$', TaskProgressConsumer.as_asgi()),
]
