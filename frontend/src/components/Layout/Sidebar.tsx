import { Layout, Menu } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  ListTodo,
  FileBarChart,
  MessageSquare,
  Settings,
  Users,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const { Sider } = Layout;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isLeader } = useAuth();

  const [selectedKey, setSelectedKey] = useState(location.pathname);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <LayoutDashboard size={20} />,
      label: '仪表板',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/projects',
      icon: <FolderKanban size={20} />,
      label: '项目管理',
      onClick: () => navigate('/projects'),
    },
    {
      key: '/tasks',
      icon: <ListTodo size={20} />,
      label: '任务管理',
      onClick: () => navigate('/tasks'),
    },
    {
      key: '/results',
      icon: <FileBarChart size={20} />,
      label: '结果管理',
      onClick: () => navigate('/results'),
    },
    {
      key: '/messages',
      icon: <MessageSquare size={20} />,
      label: '消息中心',
      onClick: () => navigate('/messages'),
    },
    {
      key: '/schemas',
      icon: <Database size={20} />,
      label: '参数模板',
      onClick: () => navigate('/schemas'),
    },
    ...(isLeader()
      ? [
          {
            key: '/users',
            icon: <Users size={20} />,
            label: '用户管理',
            onClick: () => navigate('/users'),
          },
        ]
      : []),
    ...(isAdmin()
      ? [
          {
            key: '/settings',
            icon: <Settings size={20} />,
            label: '系统设置',
            onClick: () => navigate('/settings'),
          },
        ]
      : []),
  ];

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={collapsed}
      width={240}
      className="border-r border-gray-700"
      style={{
        background: '#141414',
      }}
    >
      <div className="flex flex-col h-full">
        <div className="h-16 flex items-center justify-center border-b border-gray-700">
          {collapsed ? (
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="text-white font-semibold text-lg">仿真平台</span>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          className="flex-1 border-none mt-4"
          style={{
            background: 'transparent',
          }}
          onClick={({ key }) => setSelectedKey(key)}
        />

        <div
          className="h-12 flex items-center justify-center cursor-pointer border-t border-gray-700 hover:bg-gray-800 transition-colors"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="text-gray-400" size={20} />
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <ChevronLeft size={20} />
              <span className="text-sm">收起菜单</span>
            </div>
          )}
        </div>
      </div>
    </Sider>
  );
};
