import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async


class TaskProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.task_id = self.scope['url_route']['kwargs']['task_id']
        self.task_group_name = f'task_{self.task_id}_progress'

        await self.channel_layer.group_add(
            self.task_group_name,
            self.channel_name
        )

        await self.accept()

        task = await self.get_task()
        if task:
            await self.send(text_data=json.dumps({
                'task_id': self.task_id,
                'progress': task.progress,
                'status': task.status,
                'message': f'已连接，当前进度: {task.progress}%'
            }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.task_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message')

        await self.send(text_data=json.dumps({
            'message': f'Echo: {message}'
        }))

    async def task_progress(self, event):
        progress = event['progress']
        status = event['status']
        message = event['message']

        await self.send(text_data=json.dumps({
            'task_id': self.task_id,
            'progress': progress,
            'status': status,
            'message': message
        }))

    @database_sync_to_async
    def get_task(self):
        from .models import Task
        try:
            return Task.objects.get(id=self.task_id)
        except Task.DoesNotExist:
            return None


def send_task_progress(task_id, progress, status, message):
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync

    channel_layer = get_channel_layer()
    group_name = f'task_{task_id}_progress'

    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            'type': 'task_progress',
            'progress': progress,
            'status': status,
            'message': message
        }
    )
