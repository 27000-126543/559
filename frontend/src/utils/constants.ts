export const API_BASE_URL = '/api';
export const WS_BASE_URL = '/ws';

export const TASK_STATUS = {
  pending: { label: '待运行', color: 'default' },
  running: { label: '运行中', color: 'processing' },
  completed: { label: '已完成', color: 'success' },
  failed: { label: '失败', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
  reviewing: { label: '待审核', color: 'warning' },
  approved: { label: '已批准', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
} as const;

export const TASK_PRIORITY = {
  low: { label: '低', color: 'default' },
  medium: { label: '中', color: 'blue' },
  high: { label: '高', color: 'orange' },
  urgent: { label: '紧急', color: 'red' },
} as const;

export const USER_ROLES = {
  admin: { label: '管理员', color: 'red' },
  leader: { label: '项目负责人', color: 'orange' },
  member: { label: '普通成员', color: 'blue' },
} as const;

export const PROJECT_STATUS = {
  active: { label: '进行中', color: 'processing' },
  archived: { label: '已归档', color: 'default' },
  completed: { label: '已完成', color: 'success' },
} as const;

export const NOTIFICATION_TYPES = {
  info: { label: '通知', color: 'blue' },
  success: { label: '成功', color: 'green' },
  warning: { label: '警告', color: 'orange' },
  error: { label: '错误', color: 'red' },
} as const;

export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
];
