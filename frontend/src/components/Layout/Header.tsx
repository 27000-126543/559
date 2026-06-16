import { Layout, Badge, Dropdown, Avatar, Space } from 'antd';
import { Bell, LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSelector } from 'react-redux';
import { selectUnreadCount } from '@/store/notificationSlice';
import { formatDate } from '@/utils/formatters';

const { Header: AntHeader } = Layout;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const unreadCount = useSelector(selectUnreadCount);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <Settings size={16} />,
      label: '账户设置',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: logout,
    },
  ];

  return (
    <AntHeader
      className="flex items-center justify-between px-6 border-b border-gray-700"
      style={{
        background: '#1f1f1f',
        height: 64,
        padding: '0 24px',
      }}
    >
      <div className="flex items-center">
        <h1 className="text-white text-lg font-semibold m-0">数值仿真任务管理平台</h1>
      </div>

      <div className="flex items-center gap-4">
        <Badge count={unreadCount} size="small">
          <div
            className="cursor-pointer p-2 rounded-lg hover:bg-gray-700 transition-colors"
            onClick={() => navigate('/messages')}
          >
            <Bell className="text-gray-300" size={20} />
          </div>
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
          <div className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Avatar
              size={36}
              src={user?.avatar}
              style={{ background: '#1890ff' }}
            >
              {user?.full_name?.charAt(0) || user?.username?.charAt(0)}
            </Avatar>
            <Space direction="vertical" size={0} className="hidden md:block">
              <span className="text-white text-sm font-medium">
                {user?.full_name || user?.username}
              </span>
              <span className="text-gray-400 text-xs">
                最后登录: {formatDate(user?.last_login || '', 'MM-DD HH:mm')}
              </span>
            </Space>
          </div>
        </Dropdown>
      </div>
    </AntHeader>
  );
};
