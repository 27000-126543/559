import { Tag } from 'antd';
import { TASK_PRIORITY, USER_ROLES } from '@/utils/constants';
import { Task, User } from '@/types';

interface PriorityTagProps {
  type: 'priority' | 'role';
  value: Task['priority'] | User['role'];
}

export const PriorityTag: React.FC<PriorityTagProps> = ({ type, value }) => {
  const configMap = {
    priority: TASK_PRIORITY,
    role: USER_ROLES,
  };

  const config = configMap[type][value as keyof typeof configMap[typeof type]] as { color: string; label: string } | undefined;

  if (!config) {
    return <Tag>{value}</Tag>;
  }

  return <Tag color={config.color}>{config.label}</Tag>;
};
