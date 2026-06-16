import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingSpinner } from './LoadingSpinner';
import { User } from '@/types';
import { RootState } from '@/app/store';
import { selectAuthLoading, selectIsAuthenticated, selectUserRole } from '@/store/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: User['role'][];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userRole = useSelector(selectUserRole);
  const loading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner fullscreen tip="加载中..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && userRole && !roles.includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141414] p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">403</h1>
          <p className="text-gray-400 mb-6">您没有权限访问此页面</p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
