import os
import time
import random
from datetime import timedelta
from celery import shared_task
from celery.utils.log import get_task_logger
from django.db import transaction
from django.utils import timezone
from django.core.files.base import ContentFile

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, soft_time_limit=3600, time_limit=3660)
def process_simulation_task(self, task_id):
    from .models import Task
    from .consumers import send_task_progress
    from results.models import Result
    from notifications.models import Notification

    try:
        task = Task.objects.get(id=task_id)
    except Task.DoesNotExist:
        logger.error(f'Task {task_id} not found')
        return

    if task.status != 'approved':
        logger.warning(f'Task {task_id} is not in approved state, current state: {task.status}')
        return

    try:
        task.status = 'running'
        task.started_at = timezone.now()
        task.progress = 0
        task.save()

        send_task_progress(task.id, 0, 'started', '任务开始执行')
        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】已开始执行。',
            is_read=False,
            task=task
        )

        total_steps = 10
        for step in range(1, total_steps + 1):
            if self.request.called_directly:
                pass
            elif self.is_aborted():
                task.status = 'failed'
                task.save()
                send_task_progress(task.id, task.progress, 'failed', '任务被中止')
                return

            progress = int((step / total_steps) * 100)
            task.progress = progress
            task.save()

            send_task_progress(
                task.id,
                progress,
                'running',
                f'正在执行步骤 {step}/{total_steps}'
            )

            sleep_time = random.uniform(0.5, 2.0)
            time.sleep(sleep_time)

        result_content = generate_simulation_result(task)
        result_filename = f'task_{task.id}_result_{int(time.time())}.txt'

        with transaction.atomic():
            task.status = 'completed'
            task.completed_at = timezone.now()
            task.progress = 100
            task.result_file.save(result_filename, ContentFile(result_content))
            task.save()

            Result.objects.create(
                task=task,
                data_file=task.result_file,
                metadata={
                    'execution_time': (task.completed_at - task.started_at).total_seconds(),
                    'parameters': task.parameters,
                    'generated_at': task.completed_at.isoformat(),
                    'result_type': 'simulation_output'
                },
                is_archived=False
            )

        send_task_progress(task.id, 100, 'completed', '任务执行完成')
        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】执行完成，结果已生成。',
            is_read=False,
            task=task
        )

        logger.info(f'Task {task_id} completed successfully')

    except Exception as e:
        logger.exception(f'Task {task_id} failed with error: {str(e)}')
        task.status = 'failed'
        task.save()
        send_task_progress(task.id, task.progress, 'failed', f'任务执行失败: {str(e)}')
        Notification.objects.create(
            recipient=task.submitter,
            message=f'您的任务【{task.title}】执行失败，请检查参数后重试。',
            is_read=False,
            task=task
        )
        self.retry(exc=e, countdown=60, max_retries=2)


def generate_simulation_result(task):
    import json
    import numpy as np
    import pandas as pd

    params = task.parameters
    np.random.seed(hash(str(task.id)) % 2**32)

    data_size = params.get('data_size', 1000)
    iterations = params.get('iterations', 10)
    noise_level = params.get('noise_level', 0.1)

    x = np.linspace(0, 10, data_size)
    results = []

    for i in range(iterations):
        y_true = np.sin(x) + np.cos(2 * x)
        noise = np.random.normal(0, noise_level, size=data_size)
        y_observed = y_true + noise

        result = {
            'iteration': i + 1,
            'mean': float(np.mean(y_observed)),
            'std': float(np.std(y_observed)),
            'min': float(np.min(y_observed)),
            'max': float(np.max(y_observed)),
            'median': float(np.median(y_observed))
        }
        results.append(result)

    output = {
        'task_id': task.id,
        'task_title': task.title,
        'parameters': params,
        'summary': {
            'total_iterations': iterations,
            'data_points': data_size,
            'overall_mean': float(np.mean([r['mean'] for r in results])),
            'overall_std': float(np.mean([r['std'] for r in results]))
        },
        'detailed_results': results,
        'generated_at': timezone.now().isoformat()
    }

    return json.dumps(output, indent=2, ensure_ascii=False).encode('utf-8')


@shared_task
def cleanup_archived_tasks(days=90):
    from .models import Task

    cutoff_date = timezone.now() - timedelta(days=days)
    tasks_to_cleanup = Task.objects.filter(
        status='archived',
        last_operation_at__lte=cutoff_date
    )

    count = tasks_to_cleanup.count()
    logger.info(f'Found {count} archived tasks to cleanup (older than {days} days)')

    for task in tasks_to_cleanup:
        if task.model_file:
            if os.path.exists(task.model_file.path):
                os.remove(task.model_file.path)
        if task.result_file:
            if os.path.exists(task.result_file.path):
                os.remove(task.result_file.path)

    tasks_to_cleanup.delete()
    logger.info(f'Cleaned up {count} archived tasks')

    return count


@shared_task
def archive_old_tasks(days=180):
    from .models import Task

    cutoff_date = timezone.now() - timedelta(days=days)
    tasks_to_archive = Task.objects.filter(
        status__in=['completed', 'failed'],
        last_operation_at__lte=cutoff_date
    ).exclude(status='archived')

    count = tasks_to_archive.count()
    logger.info(f'Found {count} tasks to archive (older than {days} days)')

    tasks_to_archive.update(status='archived')
    logger.info(f'Archived {count} tasks')

    return count
