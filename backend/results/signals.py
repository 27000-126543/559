from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from .models import Result
from notifications.models import Notification


@receiver(post_save, sender=Result)
def notify_result_created(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance.task.submitter,
            message=f'任务【{instance.task.title}】的结果数据已生成。',
            is_read=False,
            task=instance.task
        )


@receiver(m2m_changed, sender=Result.shared_with.through)
def result_shared_changed(sender, instance, action, pk_set, **kwargs):
    if action in ['post_add', 'post_remove']:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(pk__in=pk_set)

        for user in users:
            if action == 'post_add':
                message = f'结果数据【{instance.task.title}】已共享给您。'
            else:
                message = f'结果数据【{instance.task.title}】已取消共享。'

            Notification.objects.create(
                recipient=user,
                message=message,
                is_read=False,
                task=instance.task
            )
