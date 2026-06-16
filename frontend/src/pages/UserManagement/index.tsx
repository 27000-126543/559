import { useState } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Avatar,
  Switch,
  Empty,
  message,
  Pagination,
  Tooltip,
  Tag,
  Row,
  Col,
} from 'antd';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  Mail,
  User,
  Shield,
  Clock,
} from 'lucide-react';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PriorityTag } from '@/components/PriorityTag';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { User as UserType } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;

const UserManagementPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [form] = Form.useForm();

  const { data: users, isLoading, refetch } = useGetUsersQuery({
    page,
    page_size: pageSize,
    search: searchText || undefined,
  });

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const handleSubmit = async (values: Partial<UserType> & { password?: string }) => {
    try {
      if (editingUser) {
        const { password, ...updateData } = values;
        await updateUser({ id: editingUser.id, data: updateData }).unwrap();
        message.success('用户更新成功');
      } else {
        await createUser(values).unwrap();
        message.success('用户创建成功');
      }
      setIsModalOpen(false);
      setEditingUser(null);
      form.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, username: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除用户 "${username}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteUser(id).unwrap();
          message.success('用户已删除');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const handleToggleActive = async (user: UserType, checked: boolean) => {
    try {
      await updateUser({ id: user.id, data: { is_active: checked } }).unwrap();
      message.success(`用户已${checked ? '启用' : '禁用'}`);
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'member',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchText('');
    setRoleFilter(undefined);
    setPage(1);
  };

  const columns = [
    {
      title: '用户信息',
      key: 'user',
      render: (_: any, record: UserType) => (
        <div className="flex items-center gap-3">
          <Avatar size={40} src={record.avatar} style={{ background: '#1890ff' }}>
            {record.full_name?.charAt(0) || record.username?.charAt(0)}
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <Text className="text-white font-medium">
                {record.full_name || record.username}
              </Text>
              <PriorityTag type="role" value={record.role} />
              {!record.is_active && <Tag color="default">已禁用</Tag>}
            </div>
            <Text className="text-gray-500 text-xs block">@{record.username}</Text>
          </div>
        </div>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <div className="flex items-center gap-2">
          <Mail size={14} className="text-gray-400" />
          <Text className="text-gray-300">{email || '-'}</Text>
        </div>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserType['role']) => <PriorityTag type="role" value={role} />,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean, record: UserType) => (
        <Switch
          checked={active}
          onChange={(checked) => handleToggleActive(record, checked)}
          disabled={!isAdmin() || record.id === 1}
        />
      ),
    },
    {
      title: '加入时间',
      dataIndex: 'date_joined',
      key: 'date_joined',
      render: (date: string) => (
        <Tooltip title={formatDate(date)}>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-gray-400" />
            <Text className="text-gray-400">{formatRelativeTime(date)}</Text>
          </div>
        </Tooltip>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date: string) => (
        <Tooltip title={date ? formatDate(date) : '从未登录'}>
          <Text className="text-gray-400">
            {date ? formatRelativeTime(date) : '从未登录'}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: UserType) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Edit size={14} />}
            onClick={() => handleEdit(record)}
            disabled={!isAdmin() || record.id === 1}
          >
            编辑
          </Button>
          <Button
            type="text"
            size="small"
            danger
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(record.id, record.username)}
            loading={deleting}
            disabled={!isAdmin() || record.id === 1}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} className="!text-white !mb-1">
            用户管理
          </Title>
          <Text className="text-gray-400">管理系统用户</Text>
        </div>
        {isAdmin() && (
          <Button type="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
            新建用户
          </Button>
        )}
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Space wrap className="w-full" size={[16, 16]}>
          <Input
            prefix={<Search size={18} className="text-gray-400" />}
            placeholder="搜索用户名/姓名..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            allowClear
            style={{ width: 250 }}
            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
          />
          <Select
            placeholder="筛选角色"
            value={roleFilter}
            onChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="admin">管理员</Option>
            <Option value="leader">项目负责人</Option>
            <Option value="member">普通成员</Option>
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

      <Card className="bg-[#1f1f1f] border-gray-700" styles={{ body: { padding: 0 } }}>
        {users?.results?.length ? (
          <>
            <Table
              dataSource={users.results}
              columns={columns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
            />
            <div className="p-4 flex justify-end border-t border-gray-700">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={users.count}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条记录`}
              />
            </div>
          </>
        ) : (
          <div className="p-12">
            <Empty description="暂无用户" />
          </div>
        )}
      </Card>

      <Modal
        title={
          <Title level={4} className="!text-white !mb-0">
            {editingUser ? '编辑用户' : '新建用户'}
          </Title>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingUser(null);
          form.resetFields();
        }}
        footer={null}
        centered
        styles={{ content: { background: '#1f1f1f', border: '1px solid #374151' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={creating || updating}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="username"
                label={<span className="text-gray-200">用户名</span>}
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input
                  placeholder="请输入用户名"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  disabled={!!editingUser}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label={<span className="text-gray-200">邮箱</span>}
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
              >
                <Input
                  placeholder="请输入邮箱"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="full_name"
                label={<span className="text-gray-200">姓名</span>}
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input
                  placeholder="请输入姓名"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="role"
                label={<span className="text-gray-200">角色</span>}
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色" className="w-full">
                  <Option value="admin">管理员</Option>
                  <Option value="leader">项目负责人</Option>
                  <Option value="member">普通成员</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="password"
                  label={<span className="text-gray-200">密码</span>}
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 8, message: '密码至少8个字符' },
                  ]}
                >
                  <Password
                    placeholder="请输入密码"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="confirm_password"
                  label={<span className="text-gray-200">确认密码</span>}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Password
                    placeholder="请再次输入密码"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {editingUser && (
            <Form.Item
              name="is_active"
              label={<span className="text-gray-200">是否启用</span>}
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          )}

          <Form.Item className="mb-0 mt-4">
            <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={creating || updating}>
                {editingUser ? '保存修改' : '创建用户'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
