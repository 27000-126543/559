from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User
from notifications.models import Notification


@receiver(post_save, sender=User)
def send_welcome_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance,
            message=f'欢迎加入仿真平台！您的角色是{instance.get_role_display()}，请完善个人信息。',
            is_read=False
        )


@receiver(post_save, sender=User)
def notify_role_change(sender, instance, **kwargs):
    if not instance._state.adding:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            if old_instance.role != instance.role:
                Notification.objects.create(
                    recipient=instance,
                    message=f'您的角色已从{old_instance.get_role_display()}变更为{instance.get_role_display()}。',
                    is_read=False
                )
        except User.DoesNotExist:
            pass
