import React, { useEffect } from 'react';
import { ConfigProvider, App as AntdApp, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';

import { store, RootState } from '@/app/store';
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
import { useGetCurrentUserQuery } from '@/api';
import { updateUser, logout, setLoading, selectAuthLoading, selectIsAuthenticated } from '@/store/authSlice';

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = !!localStorage.getItem('access_token');
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  const { isFetching, isError, data, refetch } = useGetCurrentUserQuery(undefined, {
    skip: !hasToken,
    refetchOnMountOrArgChange: false,
  });

  useEffect(() => {
    if (hasToken) {
      dispatch(setLoading(true));
    }
  }, [hasToken, dispatch]);

  useEffect(() => {
    if (data && !isFetching) {
      dispatch(updateUser(data));
      dispatch(setLoading(false));
    }
  }, [data, isFetching, dispatch]);

  useEffect(() => {
    if (isError && hasToken) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      dispatch(logout());
      dispatch(setLoading(false));
      if (!location.pathname.includes('/login')) {
        navigate('/login', { replace: true, state: { from: location } });
      }
    }
  }, [isError, hasToken, dispatch, navigate, location]);

  const isInitializing = hasToken && authLoading && !isAuthenticated;
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414]">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <AuthInitializer>
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
    </AuthInitializer>
  );
};

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
            <AppContent />
          </Router>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
};

export default App;
