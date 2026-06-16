import { useState } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Select,
  Tag,
  Empty,
  Checkbox,
  message,
  Modal,
} from 'antd';
import {
  MessageSquare,
  CheckCheck,
  Trash2,
  Bell,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Filter,
} from 'lucide-react';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { formatDate, formatRelativeTime, truncateText } from '@/utils/formatters';
import { Notification } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

const MessageCenterPage: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState<string>();
  const [readFilter, setReadFilter] = useState<boolean | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: notifications, isLoading, refetch } = useGetNotificationsQuery({
    page,
    page_size: pageSize,
    type: typeFilter,
    read: readFilter,
  });

  const [markAsRead, { isLoading: marking }] = useMarkNotificationReadMutation();
  const [markAllAsRead, { isLoading: markingAll }] = useMarkAllNotificationsReadMutation();

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id).unwrap();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const handleMarkAllAsRead = async () => {
    Modal.confirm({
      title: '确认操作',
      content: '确定要将所有消息标记为已读吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await markAllAsRead().unwrap();
          message.success('已标记所有消息为已读');
          refetch();
          setSelectedIds([]);
        } catch (error: any) {
          message.error(error?.data?.detail || '操作失败');
        }
      },
    });
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedIds.length === 0) {
      message.warning('请先选择要标记的消息');
      return;
    }
    try {
      await Promise.all(selectedIds.map((id) => markAsRead(id).unwrap()));
      message.success(`已标记 ${selectedIds.length} 条消息为已读`);
      refetch();
      setSelectedIds([]);
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications?.results?.map((n) => n.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-yellow-400" />;
      case 'error':
        return <XCircle size={20} className="text-red-400" />;
      default:
        return <Info size={20} className="text-blue-400" />;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.related_task_id) {
      window.location.href = `/tasks/${notification.related_task_id}`;
    } else if (notification.related_project_id) {
      window.location.href = `/projects/${notification.related_project_id}`;
    }
  };

  const resetFilters = () => {
    setTypeFilter(undefined);
    setReadFilter(undefined);
    setPage(1);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} className="!text-white !mb-1">
            消息中心
          </Title>
          <Text className="text-gray-400">查看和管理系统通知</Text>
        </div>
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Space wrap className="w-full" size={[16, 16]}>
          <Select
            placeholder="筛选类型"
            value={typeFilter}
            onChange={(v) => { setTypeFilter(v); setPage(1); }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="info">通知</Option>
            <Option value="success">成功</Option>
            <Option value="warning">警告</Option>
            <Option value="error">错误</Option>
          </Select>
          <Select
            placeholder="筛选状态"
            value={readFilter !== undefined ? String(readFilter) : undefined}
            onChange={(v) => {
              setReadFilter(v === undefined ? undefined : v === 'true');
              setPage(1);
            }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="true">已读</Option>
            <Option value="false">未读</Option>
          </Select>
          <Space>
            <Button onClick={resetFilters} icon={<Filter size={16} />}>
              重置
            </Button>
            <Button type="primary" onClick={() => refetch()}>
              刷新
            </Button>
          </Space>
        </Space>
      </Card>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <Checkbox
              indeterminate={selectedIds.length > 0 && selectedIds.length < (notifications?.results?.length || 0)}
              checked={selectedIds.length === notifications?.results?.length && notifications?.results?.length! > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              <Text className="text-gray-300">全选</Text>
            </Checkbox>
            <Text className="text-gray-400">
              已选择 {selectedIds.length} 条
            </Text>
          </div>
          <Space>
            <Button
              icon={<CheckCheck size={16} />}
              onClick={handleBatchMarkAsRead}
              disabled={selectedIds.length === 0}
              loading={marking}
            >
              标记已读
            </Button>
            <Button
              icon={<Bell size={16} />}
              onClick={handleMarkAllAsRead}
              loading={markingAll}
            >
              全部已读
            </Button>
          </Space>
        </div>

        {notifications?.results?.length ? (
          <List
            dataSource={notifications.results}
            renderItem={(notification) => (
              <List.Item
                key={notification.id}
                className={`!border-b !border-gray-700 !px-0 cursor-pointer transition-colors ${
                  !notification.read ? 'bg-blue-500/5 -mx-4 px-4 rounded-lg' : ''
                } hover:bg-gray-800/30 -mx-4 px-4`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-4 w-full py-2">
                  <Checkbox
                    checked={selectedIds.includes(notification.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelect(notification.id, e.target.checked);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                      <Text className={`font-medium ${!notification.read ? 'text-white' : 'text-gray-300'}`}>
                        {notification.title}
                      </Text>
                      <StatusTag type="notification" status={notification.type} />
                    </div>
                    <Text className="text-gray-400 text-sm block mb-1 line-clamp-2">
                      {truncateText(notification.message, 150)}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                      {formatDate(notification.created_at)} · {formatRelativeTime(notification.created_at)}
                    </Text>
                  </div>
                  {!notification.read && (
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckCheck size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      loading={marking}
                    >
                      标记已读
                    </Button>
                  )}
                </div>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无消息" />
        )}

        {notifications && notifications.count > pageSize && (
          <div className="flex justify-end mt-4 pt-4 border-t border-gray-700">
            {/* Pagination would go here */}
          </div>
        )}
      </Card>
    </div>
  );
};

export default MessageCenterPage;
