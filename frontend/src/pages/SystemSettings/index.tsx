import { useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Divider,
  Descriptions,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  Settings,
  Database,
  HardDrive,
  Clock,
  Save,
  RotateCcw,
  Info,
} from 'lucide-react';
import {
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatFileSize } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { SystemSettings as SystemSettingsType } from '@/types';

const { Title, Text } = Typography;

const SystemSettingsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [form] = Form.useForm<SystemSettingsType>();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading, refetch } = useGetSystemSettingsQuery();
  const [updateSettings, { isLoading: updating }] = useUpdateSystemSettingsMutation();

  const handleSubmit = async (values: SystemSettingsType) => {
    try {
      await updateSettings(values).unwrap();
      message.success('设置保存成功');
      setHasChanges(false);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '保存失败');
    }
  };

  const handleReset = () => {
    if (settings) {
      form.setFieldsValue(settings);
      setHasChanges(false);
    }
  };

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin()) {
    return (
      <Card className="bg-[#1f1f1f] border-gray-700">
        <Alert
          type="warning"
          showIcon
          message="权限不足"
          description="您没有权限访问系统设置页面，请联系管理员。"
        />
      </Card>
    );
  }

  const statCards = [
    {
      title: '清理周期',
      value: `${settings?.cleanup_period || 0} 天`,
      icon: <Clock size={24} className="text-blue-400" />,
      description: '自动清理历史数据的周期',
    },
    {
      title: '存储配额',
      value: formatFileSize((settings?.storage_quota || 0) * 1024 * 1024 * 1024),
      icon: <HardDrive size={24} className="text-green-400" />,
      description: '每个用户的最大存储空间',
    },
    {
      title: '最大并发任务',
      value: `${settings?.max_concurrent_tasks || 0} 个`,
      icon: <Database size={24} className="text-orange-400" />,
      description: '系统同时运行的最大任务数',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} className="!text-white !mb-1">
            系统设置
          </Title>
          <Text className="text-gray-400">配置系统运行参数</Text>
        </div>
      </div>

      {hasChanges && (
        <Alert
          type="info"
          showIcon
          message="您有未保存的更改"
          description="请记得保存您的设置更改。"
          action={
            <Button size="small" type="primary" onClick={() => form.submit()}>
              保存
            </Button>
          }
        />
      )}

      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={8} key={index}>
            <Card className="bg-[#1f1f1f] border-gray-700 h-full">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-white/10">{card.icon}</div>
                <div>
                  <Text className="text-gray-400 text-sm block">{card.title}</Text>
                  <Statistic
                    value={card.value}
                    valueStyle={{ color: '#fff', fontSize: '24px', fontWeight: 700 }}
                  />
                  <Text className="text-gray-500 text-xs block mt-1">
                    {card.description}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-400" />
            <span className="text-white">系统配置</span>
          </div>
        }
        className="bg-[#1f1f1f] border-gray-700"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onFinish={handleSubmit}
          onValuesChange={handleValuesChange}
          disabled={updating}
        >
          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="cleanup_period"
                label={
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">数据清理周期 (天)</span>
                    <Info size={14} className="text-gray-500" />
                  </div>
                }
                rules={[
                  { required: true, message: '请输入清理周期' },
                  { type: 'number', min: 1, max: 365, message: '清理周期应在1-365天之间' },
                ]}
                tooltip="系统将自动清理超过此天数的历史数据和日志"
              >
                <InputNumber
                  min={1}
                  max={365}
                  className="w-full bg-gray-800 border-gray-600"
                  style={{ background: '#1f2937' }}
                  addonAfter="天"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="storage_quota"
                label={
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">存储配额 (GB)</span>
                    <Info size={14} className="text-gray-500" />
                  </div>
                }
                rules={[
                  { required: true, message: '请输入存储配额' },
                  { type: 'number', min: 1, max: 1000, message: '存储配额应在1-1000GB之间' },
                ]}
                tooltip="每个用户可以使用的最大存储空间"
              >
                <InputNumber
                  min={1}
                  max={1000}
                  className="w-full bg-gray-800 border-gray-600"
                  style={{ background: '#1f2937' }}
                  addonAfter="GB"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[24, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="max_concurrent_tasks"
                label={
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">最大并发任务数</span>
                    <Info size={14} className="text-gray-500" />
                  </div>
                }
                rules={[
                  { required: true, message: '请输入最大并发任务数' },
                  { type: 'number', min: 1, max: 100, message: '并发任务数应在1-100之间' },
                ]}
                tooltip="系统同时运行的最大任务数量"
              >
                <InputNumber
                  min={1}
                  max={100}
                  className="w-full bg-gray-800 border-gray-600"
                  style={{ background: '#1f2937' }}
                  addonAfter="个"
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider className="border-gray-700" />

          <Form.Item className="mb-0">
            <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
              <Button
                icon={<RotateCcw size={16} />}
                onClick={handleReset}
                disabled={!hasChanges}
              >
                重置
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<Save size={16} />}
                loading={updating}
                disabled={!hasChanges}
              >
                保存设置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <div className="flex items-center gap-2">
            <Info size={20} className="text-blue-400" />
            <span className="text-white">系统信息</span>
          </div>
        }
        className="bg-[#1f1f1f] border-gray-700"
      >
        <Descriptions
          column={2}
          labelStyle={{ color: '#9ca3af' }}
          contentStyle={{ color: '#fff' }}
        >
          <Descriptions.Item label="系统版本">v1.0.0</Descriptions.Item>
          <Descriptions.Item label="环境">{process.env.NODE_ENV !== 'production' ? '开发环境' : '生产环境'}</Descriptions.Item>
          <Descriptions.Item label="前端框架">React 18 + TypeScript</Descriptions.Item>
          <Descriptions.Item label="UI 框架">Ant Design 5.x</Descriptions.Item>
          <Descriptions.Item label="状态管理">Redux Toolkit + RTK Query</Descriptions.Item>
          <Descriptions.Item label="图表库">ECharts 5.x</Descriptions.Item>
          <Descriptions.Item label="通信协议">HTTP/1.1 + WebSocket</Descriptions.Item>
          <Descriptions.Item label="部署方式">Docker + Nginx</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default SystemSettingsPage;
