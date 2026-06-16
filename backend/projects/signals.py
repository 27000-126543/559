from django.db.models.signals import m2m_changed
from django.dispatch import receiver
from .models import Project
from notifications.models import Notification


@receiver(m2m_changed, sender=Project.members.through)
def project_members_changed(sender, instance, action, pk_set, **kwargs):
    if action in ['post_add', 'post_remove']:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        users = User.objects.filter(pk__in=pk_set)

        for user in users:
            if action == 'post_add':
                message = f'您已被添加到项目【{instance.name}】。'
            else:
                message = f'您已从项目【{instance.name}】中移除。'

            Notification.objects.create(
                recipient=user,
                message=message,
                is_read=False
            )
