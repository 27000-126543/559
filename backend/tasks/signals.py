from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from .models import Task
from notifications.models import Notification


@receiver(pre_save, sender=Task)
def update_last_operation_at(sender, instance, **kwargs):
    instance.last_operation_at = timezone.now()


@receiver(post_save, sender=Task)
def notify_status_change(sender, instance, created, **kwargs):
    if created:
        return

    if not instance._state.adding:
        try:
            old_instance = Task.objects.get(pk=instance.pk)
            if old_instance.status != instance.status:
                if instance.status == 'running':
                    message = f'任务【{instance.title}】已开始执行。'
                elif instance.status == 'completed':
                    message = f'任务【{instance.title}】已完成。'
                elif instance.status == 'failed':
                    message = f'任务【{instance.title}】执行失败。'
                elif instance.status == 'archived':
                    message = f'任务【{instance.title}】已归档。'
                else:
                    message = f'任务【{instance.title}】状态已变更为{instance.get_status_display()}。'

                Notification.objects.create(
                    recipient=instance.submitter,
                    message=message,
                    is_read=False,
                    task=instance
                )

                if instance.project.leader != instance.submitter:
                    Notification.objects.create(
                        recipient=instance.project.leader,
                        message=message,
                        is_read=False,
                        task=instance
                    )
        except Task.DoesNotExist:
            pass


@receiver(post_save, sender=Task)
def create_result_on_completion(sender, instance, created, **kwargs):
    if not created and instance.status == 'completed':
        try:
            from results.models import Result
            Result.objects.get_or_create(
                task=instance,
                defaults={
                    'data_file': instance.result_file,
                    'metadata': {
                        'execution_time': instance.get_execution_time(),
                        'parameters': instance.parameters,
                    },
                    'is_archived': False
                }
            )
        except ImportError:
            pass
