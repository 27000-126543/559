import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { User, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginRequest } from '@/types';
import { useState } from 'react';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const { login, loading } = useAuth();
  const [form] = Form.useForm<LoginRequest>();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginRequest) => {
    try {
      setError(null);
      await login(values);
    } catch (err: any) {
      setError(err?.data?.detail || '登录失败，请重试');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card
        className="w-full max-w-md mx-4 relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl"
        styles={{ body: { padding: '48px 40px' } }}
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <Title level={2} className="!text-white !mb-2 !text-center">
            数值仿真平台
          </Title>
          <Text className="text-gray-300 block text-center">
            高性能数值仿真任务管理系统
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-6"
            onClose={() => setError(null)}
            closable
          />
        )}

        <Form<LoginRequest>
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading}
        >
          <Form.Item
            name="username"
            label={<span className="text-gray-200">用户名</span>}
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<User size={18} className="text-gray-400" />}
              placeholder="请输入用户名"
              size="large"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-gray-200">密码</span>}
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<Lock size={18} className="text-gray-400" />}
              placeholder="请输入密码"
              size="large"
              className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
            />
          </Form.Item>

          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              icon={<LogIn size={18} />}
              className="h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 border-none shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-8 text-center">
          <Text className="text-gray-400 text-sm">
            忘记密码？请联系系统管理员
          </Text>
        </div>
      </Card>

      <div className="absolute bottom-4 text-center w-full">
        <Text className="text-gray-400 text-sm">
          © 2024 数值仿真任务管理平台 · 版本 v1.0.0
        </Text>
      </div>
    </div>
  );
};

export default LoginPage;
