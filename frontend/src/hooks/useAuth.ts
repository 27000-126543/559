import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  loginSuccess,
  logout as logoutAction,
  selectUser,
  selectIsAuthenticated,
  selectUserRole,
  selectAuthLoading,
} from '@/store/authSlice';
import { useLoginMutation, useLogoutMutation } from '@/api';
import { LoginRequest, User } from '@/types';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading: loginLoading }] = useLoginMutation();
  const [logoutApi, { isLoading: logoutLoading }] = useLogoutMutation();

  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = useSelector(selectUserRole);
  const loading = useSelector(selectAuthLoading);

  const handleLogin = useCallback(
    async (credentials: LoginRequest) => {
      try {
        const response = await login(credentials).unwrap();
        dispatch(loginSuccess(response));
        message.success('登录成功！');
        navigate('/dashboard');
        return response;
      } catch (error: any) {
        const errorMessage = error?.data?.detail || '登录失败，请检查用户名和密码';
        message.error(errorMessage);
        throw error;
      }
    },
    [login, dispatch, navigate]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutApi().unwrap();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      dispatch(logoutAction());
      message.success('已退出登录');
      navigate('/login');
    }
  }, [logoutApi, dispatch, navigate]);

  const hasRole = useCallback(
    (roles: User['role'] | User['role'][]) => {
      if (!userRole) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(userRole);
    },
    [userRole]
  );

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isLeader = useCallback(() => hasRole(['admin', 'leader']), [hasRole]);
  const isMember = useCallback(() => hasRole(['admin', 'leader', 'member']), [hasRole]);

  return {
    user,
    isAuthenticated,
    userRole,
    loading: loading || loginLoading || logoutLoading,
    login: handleLogin,
    logout: handleLogout,
    hasRole,
    isAdmin,
    isLeader,
    isMember,
  };
};
