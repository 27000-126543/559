import { Tag } from 'antd';
import { TASK_STATUS, PROJECT_STATUS, NOTIFICATION_TYPES } from '@/utils/constants';
import { Task, Project, Notification } from '@/types';

interface StatusTagProps {
  type: 'task' | 'project' | 'notification';
  status: Task['status'] | Project['status'] | Notification['type'];
}

export const StatusTag: React.FC<StatusTagProps> = ({ type, status }) => {
  const statusMap = {
    task: TASK_STATUS,
    project: PROJECT_STATUS,
    notification: NOTIFICATION_TYPES,
  };

  const config = statusMap[type][status as keyof typeof statusMap[typeof type]] as { color: string; label: string } | undefined;

  if (!config) {
    return <Tag>{status}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
};
