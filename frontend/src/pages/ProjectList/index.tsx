import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Modal,
  Form,
  Avatar,
  Typography,
  Tag,
  Space,
  Tooltip,
  Empty,
  message,
  Dropdown,
} from 'antd';
import {
  FolderKanban,
  Plus,
  Search,
  Users,
  ListTodo,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { formatDate, truncateText } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { Project } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

const ProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLeader, user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const { data: projects, isLoading, refetch } = useGetProjectsQuery({
    search: searchText || undefined,
    status: statusFilter,
  });

  const [createProject, { isLoading: creating }] = useCreateProjectMutation();
  const [updateProject, { isLoading: updating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: deleting }] = useDeleteProjectMutation();

  const handleSubmit = async (values: Partial<Project>) => {
    try {
      if (editingProject) {
        await updateProject({ id: editingProject.id, data: values }).unwrap();
        message.success('项目更新成功');
      } else {
        await createProject(values).unwrap();
        message.success('项目创建成功');
      }
      setIsModalOpen(false);
      setEditingProject(null);
      form.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除项目将同时删除相关的任务和结果，此操作不可恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteProject(id).unwrap();
          message.success('项目已删除');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const openCreateModal = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} className="!text-white !mb-1">
            项目管理
          </Title>
          <Text className="text-gray-400">管理所有仿真项目</Text>
        </div>
        {isLeader() && (
          <Button type="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
            新建项目
          </Button>
        )}
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              prefix={<Search size={18} className="text-gray-400" />}
              placeholder="搜索项目名称..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="筛选状态"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
              className="w-full"
              style={{ background: '#1f1f1f' }}
            >
              <Option value="active">进行中</Option>
              <Option value="completed">已完成</Option>
              <Option value="archived">已归档</Option>
            </Select>
          </Col>
          <Col xs={24} md={10}>
            <Space>
              <Button onClick={() => { setSearchText(''); setStatusFilter(undefined); }}>
                重置筛选
              </Button>
              <Button type="primary" onClick={() => refetch()}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {projects?.results?.length ? (
        <Row gutter={[16, 16]}>
          {projects.results.map((project) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={project.id}>
              <Card
                className="bg-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer group h-full"
                onClick={() => navigate(`/projects/${project.id}`)}
                styles={{ body: { padding: '24px' } }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-blue-500/20">
                    <FolderKanban size={28} className="text-blue-400" />
                  </div>
                  {isLeader() && (
                    <div
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'view',
                              icon: <Eye size={16} />,
                              label: '查看详情',
                              onClick: () => navigate(`/projects/${project.id}`),
                            },
                            {
                              key: 'edit',
                              icon: <Edit size={16} />,
                              label: '编辑',
                              onClick: () => handleEdit(project),
                            },
                            {
                              type: 'divider' as const,
                            },
                            {
                              key: 'delete',
                              icon: <Trash2 size={16} className="text-red-400" />,
                              label: <span className="text-red-400">删除</span>,
                              onClick: () => handleDelete(project.id),
                              danger: true,
                            },
                          ],
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                      >
                        <Button type="text" icon={<MoreHorizontal size={18} className="text-gray-400" />} />
                      </Dropdown>
                    </div>
                  )}
                </div>

                <Title level={5} className="!text-white !mb-2">
                  {project.name}
                </Title>
                <Text className="text-gray-400 text-sm block mb-4 line-clamp-2">
                  {truncateText(project.description, 60)}
                </Text>

                <div className="flex items-center justify-between mb-4">
                  <StatusTag type="project" status={project.status} />
                  <Text className="text-gray-500 text-xs">
                    {formatDate(project.created_at, 'YYYY-MM-DD')}
                  </Text>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <Text className="text-gray-400 text-sm">{project.members?.length || 0} 人</Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-gray-400" />
                    <Text className="text-gray-400 text-sm">{project.task_count} 任务</Text>
                  </div>
                </div>

                <div className="mt-4">
                  <Text className="text-gray-500 text-xs block mb-2">成员</Text>
                  <Avatar.Group maxCount={3}>
                    {project.members?.slice(0, 4).map((member) => (
                      <Tooltip key={member.id} title={member.full_name || member.username}>
                        <Avatar size={28} src={member.avatar} style={{ background: '#1890ff' }}>
                          {member.full_name?.charAt(0) || member.username?.charAt(0)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Avatar.Group>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="bg-[#1f1f1f] border-gray-700">
          <Empty description="暂无项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      )}

      <Modal
        title={
          <Title level={4} className="!text-white !mb-0">
            {editingProject ? '编辑项目' : '新建项目'}
          </Title>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingProject(null);
          form.resetFields();
        }}
        footer={null}
        centered
        styles={{ content: { background: '#1f1f1f', border: '1px solid #374151' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={creating || updating}>
          <Form.Item
            name="name"
            label={<span className="text-gray-200">项目名称</span>}
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input
              placeholder="请输入项目名称"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label={<span className="text-gray-200">项目描述</span>}
            rules={[{ required: true, message: '请输入项目描述' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入项目描述"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </Form.Item>

          {editingProject && (
            <Form.Item
              name="status"
              label={<span className="text-gray-200">项目状态</span>}
              rules={[{ required: true, message: '请选择项目状态' }]}
            >
              <Select className="w-full">
                <Option value="active">进行中</Option>
                <Option value="completed">已完成</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Form.Item>
          )}

          <Form.Item className="mb-0 mt-6">
            <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProject(null);
                  form.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={creating || updating}>
                {editingProject ? '保存修改' : '创建项目'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectListPage;
