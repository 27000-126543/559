import { useState } from 'react';
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Modal,
  Form,
  Progress,
  Empty,
  Tooltip,
  message,
  Pagination,
} from 'antd';
import {
  ListTodo,
  Plus,
  Search,
  PlayCircle,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTasksQuery,
  useDeleteTaskMutation,
  useRunTaskMutation,
  useGetProjectsQuery,
  useApproveTaskMutation,
  useRejectTaskMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { PriorityTag } from '@/components/PriorityTag';
import { formatDate, formatRelativeTime, truncateText } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types';
import { useWebSocket } from '@/hooks/useWebSocket';

const { Title, Text } = Typography;
const { Option } = Select;

const TaskListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLeader, isAdmin } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>();
  const [priorityFilter, setPriorityFilter] = useState<string>();
  const [projectFilter, setProjectFilter] = useState<number>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingTask, setRejectingTask] = useState<number | null>(null);
  const [rejectForm] = Form.useForm();

  const { data: projects } = useGetProjectsQuery({ page_size: 100 });

  const { data: tasks, isLoading, refetch } = useGetTasksQuery({
    page,
    page_size: pageSize,
    search: searchText || undefined,
    status: statusFilter,
    priority: priorityFilter,
    project: projectFilter,
  });

  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [runTask, { isLoading: running }] = useRunTaskMutation();
  const [approveTask, { isLoading: approving }] = useApproveTaskMutation();
  const [rejectTask, { isLoading: rejecting }] = useRejectTaskMutation();

  useWebSocket('tasks', {
    onTaskUpdate: (updatedTask) => {
      refetch();
      message.info(`任务 ${updatedTask.name} 状态已更新`);
    },
  });

  const handleRun = async (id: number) => {
    try {
      await runTask(id).unwrap();
      message.success('任务已启动');
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '启动失败');
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '此操作将永久删除该任务及其所有结果，是否继续？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteTask(id).unwrap();
          message.success('任务已删除');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const handleApprove = async (id: number) => {
    Modal.confirm({
      title: '确认批准',
      content: '批准后任务将进入运行状态，是否继续？',
      okText: '确认批准',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          await approveTask({ id }).unwrap();
          message.success('任务已批准');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '批准失败');
        }
      },
    });
  };

  const handleReject = (id: number) => {
    setRejectingTask(id);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (values: { comment: string }) => {
    if (!rejectingTask) return;
    try {
      await rejectTask({ id: rejectingTask, comment: values.comment }).unwrap();
      message.success('任务已拒绝');
      setRejectModalOpen(false);
      setRejectingTask(null);
      rejectForm.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '拒绝失败');
    }
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Task) => (
        <div>
          <Text
            className="text-white font-medium cursor-pointer hover:text-blue-400 block"
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            {truncateText(text, 30)}
          </Text>
          <Text className="text-gray-500 text-xs">
            项目: {record.project?.name || '-'}
          </Text>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: Task['status']) => <StatusTag type="task" status={status} />,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority: Task['priority']) => <PriorityTag type="priority" value={priority} />,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 150,
      render: (progress: number, record: Task) => (
        <Progress
          percent={progress}
          size="small"
          status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
        />
      ),
    },
    {
      title: '创建者',
      dataIndex: ['created_by', 'full_name'],
      key: 'created_by',
      width: 120,
      render: (name: string, record: Task) => (
        <Text className="text-gray-300">
          {name || record.created_by?.username || '-'}
        </Text>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => (
        <Tooltip title={formatDate(date)}>
          <Text className="text-gray-400">{formatRelativeTime(date)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Task) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Eye size={16} />}
            onClick={() => navigate(`/tasks/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <Button
              type="text"
              size="small"
              icon={<PlayCircle size={16} className="text-green-400" />}
              onClick={() => handleRun(record.id)}
              loading={running}
              disabled={running}
            >
              运行
            </Button>
          )}
          {record.status === 'reviewing' && (isLeader() || isAdmin()) && (
            <>
              <Button
                type="text"
                size="small"
                icon={<CheckCircle size={16} className="text-green-400" />}
                onClick={() => handleApprove(record.id)}
                loading={approving}
                disabled={approving}
              >
                批准
              </Button>
              <Button
                type="text"
                size="small"
                icon={<XCircle size={16} className="text-red-400" />}
                onClick={() => handleReject(record.id)}
                loading={rejecting}
                disabled={rejecting}
              >
                拒绝
              </Button>
            </>
          )}
          {(isLeader() || isAdmin()) && (
            <Button
              type="text"
              size="small"
              danger
              icon={<Trash2 size={16} />}
              onClick={() => handleDelete(record.id)}
              loading={deleting}
              disabled={deleting}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setPriorityFilter(undefined);
    setProjectFilter(undefined);
    setPage(1);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={3} className="!text-white !mb-1">
            任务管理
          </Title>
          <Text className="text-gray-400">管理所有仿真任务</Text>
        </div>
        <Button type="primary" icon={<Plus size={18} />} onClick={() => navigate('/tasks/create')}>
          提交新任务
        </Button>
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Space wrap className="w-full" size={[16, 16]}>
          <Input
            prefix={<Search size={18} className="text-gray-400" />}
            placeholder="搜索任务名称..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 250 }}
            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
          />
          <Select
            placeholder="筛选状态"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="pending">待运行</Option>
            <Option value="running">运行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
            <Option value="reviewing">待审核</Option>
            <Option value="approved">已批准</Option>
            <Option value="rejected">已拒绝</Option>
          </Select>
          <Select
            placeholder="筛选优先级"
            value={priorityFilter}
            onChange={(v) => { setPriorityFilter(v); setPage(1); }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="low">低</Option>
            <Option value="medium">中</Option>
            <Option value="high">高</Option>
            <Option value="urgent">紧急</Option>
          </Select>
          <Select
            placeholder="筛选项目"
            value={projectFilter}
            onChange={(v) => { setProjectFilter(v); setPage(1); }}
            allowClear
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            {projects?.results?.map((project) => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
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
        {tasks?.results?.length ? (
          <>
            <Table
              dataSource={tasks.results}
              columns={columns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1200 }}
            />
            <div className="p-4 flex justify-end border-t border-gray-700">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={tasks.count}
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
            <Empty description="暂无任务" />
          </div>
        )}
      </Card>

      <Modal
        title={<Title level={4} className="!text-white !mb-0">拒绝任务</Title>}
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectingTask(null);
          rejectForm.resetFields();
        }}
        footer={null}
        centered
        styles={{ content: { background: '#1f1f1f', border: '1px solid #374151' } }}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={handleRejectSubmit}
          disabled={rejecting}
        >
          <Form.Item
            name="comment"
            label={<span className="text-gray-200">拒绝原因</span>}
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请输入拒绝原因..."
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </Form.Item>
          <Form.Item className="mb-0 mt-4">
            <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectingTask(null);
                  rejectForm.resetFields();
                }}
              >
                取消
              </Button>
              <Button type="primary" danger htmlType="submit" loading={rejecting}>
                确认拒绝
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskListPage;
