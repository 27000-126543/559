import React from 'react';
import { ConfigProvider, App as AntdApp, theme } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

import { store } from '@/app/store';
import MainLayout from '@/components/Layout/MainLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProjectList from '@/pages/ProjectList';
import ProjectDetail from '@/pages/ProjectDetail';
import TaskList from '@/pages/TaskList';
import TaskCreate from '@/pages/TaskCreate';
import TaskDetail from '@/pages/TaskDetail';
import ResultList from '@/pages/ResultList';
import ResultDetail from '@/pages/ResultDetail';
import MessageCenter from '@/pages/MessageCenter';
import SchemaList from '@/pages/SchemaList';
import UserManagement from '@/pages/UserManagement';
import SystemSettings from '@/pages/SystemSettings';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1890ff',
            colorInfo: '#1890ff',
            colorSuccess: '#52c41a',
            colorWarning: '#faad14',
            colorError: '#ff4d4f',
            borderRadius: 8,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Layout: {
              headerBg: '#1f1f1f',
              siderBg: '#141414',
              bodyBg: '#141414',
            },
            Menu: {
              darkItemBg: '#141414',
              darkSubMenuItemBg: '#141414',
              darkItemSelectedBg: '#1890ff',
              darkItemSelectedColor: '#ffffff',
            },
            Card: {
              colorBgContainer: '#1f1f1f',
            },
            Table: {
              colorBgContainer: '#1f1f1f',
              headerBg: '#262626',
              rowHoverBg: '#262626',
            },
            Modal: {
              contentBg: '#1f1f1f',
              headerBg: '#1f1f1f',
            },
            Form: {
              labelColor: '#ffffffd9',
            },
            Input: {
              colorBgContainer: '#262626',
            },
            Select: {
              colorBgContainer: '#262626',
            },
            DatePicker: {
              colorBgContainer: '#262626',
            },
          },
        }}
      >
        <AntdApp>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="projects" element={<ProjectList />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="tasks" element={<TaskList />} />
                <Route path="tasks/create" element={<TaskCreate />} />
                <Route path="tasks/:id" element={<TaskDetail />} />
                <Route path="results" element={<ResultList />} />
                <Route path="results/:id" element={<ResultDetail />} />
                <Route path="messages" element={<MessageCenter />} />
                <Route path="schemas" element={<SchemaList />} />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute roles={['admin']}>
                      <SystemSettings />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
