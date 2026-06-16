import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Progress,
  Descriptions,
  Button,
  Space,
  Typography,
  Breadcrumb,
  Tabs,
  List,
  Tag,
  Avatar,
  Empty,
  Timeline,
  Modal,
  Form,
  Input,
  message,
  Divider,
} from 'antd';
import {
  ArrowLeft,
  PlayCircle,
  Download,
  Share2,
  RotateCcw,
  Edit,
  Trash2,
  FileText,
  Terminal,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import {
  useGetTaskQuery,
  useGetTaskLogsQuery,
  useGetResultsQuery,
  useRunTaskMutation,
  useDeleteTaskMutation,
  useApproveTaskMutation,
  useRejectTaskMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { PriorityTag } from '@/components/PriorityTag';
import { formatDate, formatFileSize, formatDuration } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Task, TaskLog } from '@/types';
import { CHART_COLORS } from '@/utils/constants';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLeader, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectForm] = Form.useForm();
  const [logsPage, setLogsPage] = useState(1);

  const taskId = Number(id);

  const { data: task, isLoading: taskLoading, refetch } = useGetTaskQuery(taskId);
  const { data: logs, isLoading: logsLoading } = useGetTaskLogsQuery({
    taskId,
    page: logsPage,
    page_size: 50,
  });
  const { data: results, isLoading: resultsLoading } = useGetResultsQuery({
    task: taskId,
    page_size: 10,
  });

  const [runTask, { isLoading: running }] = useRunTaskMutation();
  const [deleteTask, { isLoading: deleting }] = useDeleteTaskMutation();
  const [approveTask, { isLoading: approving }] = useApproveTaskMutation();
  const [rejectTask, { isLoading: rejecting }] = useRejectTaskMutation();

  useWebSocket(`tasks/${taskId}`, {
    onTaskUpdate: (updatedTask) => {
      refetch();
      if (updatedTask.status !== task?.status) {
        message.info(`任务状态已更新为: ${updatedTask.status}`);
      }
    },
  });

  const handleRun = async () => {
    try {
      await runTask(taskId).unwrap();
      message.success('任务已启动');
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '启动失败');
    }
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: '确认删除',
      content: '此操作将永久删除该任务及其所有结果，是否继续？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteTask(taskId).unwrap();
          message.success('任务已删除');
          navigate('/tasks');
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const handleApprove = async () => {
    Modal.confirm({
      title: '确认批准',
      content: '批准后任务将进入运行状态，是否继续？',
      okText: '确认批准',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          await approveTask({ id: taskId }).unwrap();
          message.success('任务已批准');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '批准失败');
        }
      },
    });
  };

  const handleReject = () => {
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (values: { comment: string }) => {
    try {
      await rejectTask({ id: taskId, comment: values.comment }).unwrap();
      message.success('任务已拒绝');
      setRejectModalOpen(false);
      rejectForm.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '拒绝失败');
    }
  };

  const getProgressColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return '#52c41a';
      case 'failed':
      case 'rejected':
        return '#f5222d';
      case 'running':
        return '#1890ff';
      default:
        return '#faad14';
    }
  };

  const getLogIcon = (level: TaskLog['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'error':
        return <XCircle size={16} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={16} className="text-yellow-400" />;
      default:
        return <Info size={16} className="text-blue-400" />;
    }
  };

  const getTimelineEvents = (task: Task) => {
    const events = [
      {
        color: 'blue',
        children: (
          <div>
            <Text className="text-white">任务创建</Text>
            <Text className="text-gray-400 text-xs block">
              {formatDate(task.created_at)}
            </Text>
          </div>
        ),
      },
    ];

    if (task.started_at) {
      events.push({
        color: 'green',
        children: (
          <div>
            <Text className="text-white">任务开始运行</Text>
            <Text className="text-gray-400 text-xs block">
              {formatDate(task.started_at)}
            </Text>
          </div>
        ),
      });
    }

    if (task.completed_at) {
      events.push({
        color: task.status === 'failed' ? 'red' : 'green',
        children: (
          <div>
            <Text className="text-white">
              {task.status === 'failed' ? '任务失败' : '任务完成'}
            </Text>
            <Text className="text-gray-400 text-xs block">
              {formatDate(task.completed_at)}
            </Text>
          </div>
        ),
      });
    }

    return events;
  };

  if (taskLoading) {
    return <LoadingSpinner />;
  }

  if (!task) {
    return (
      <Card className="bg-[#1f1f1f] border-gray-700">
        <Empty description="任务不存在" />
      </Card>
    );
  }

  const progressChartOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: getProgressColor(task.status),
          },
        },
        axisLine: {
          lineStyle: {
            width: 18,
            color: [[1, '#374151']],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: task.progress }],
        title: { show: false },
        detail: {
          fontSize: 36,
          fontWeight: 'bold',
          color: '#fff',
          offsetCenter: [0, '0%'],
          formatter: '{value}%',
        },
      },
    ],
  };

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      icon: <FileText size={16} />,
      children: (
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="bg-[#1f1f1f] border-gray-700 text-center">
                <ReactECharts
                  option={progressChartOption}
                  style={{ height: '200px' }}
                  theme="dark"
                />
                <StatusTag type="task" status={task.status} />
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card
                title={<span className="text-white">基本信息</span>}
                className="bg-[#1f1f1f] border-gray-700 h-full"
              >
                <Descriptions
                  column={2}
                  labelStyle={{ color: '#9ca3af' }}
                  contentStyle={{ color: '#fff' }}
                >
                  <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
                  <Descriptions.Item label="所属项目">
                    <span
                      className="text-blue-400 cursor-pointer hover:underline"
                      onClick={() => navigate(`/projects/${task.project?.id}`)}
                    >
                      {task.project?.name}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="优先级">
                    <PriorityTag type="priority" value={task.priority} />
                  </Descriptions.Item>
                  <Descriptions.Item label="创建者">
                    <Space>
                      <Avatar size={24} src={task.created_by?.avatar} style={{ background: '#1890ff' }}>
                        {task.created_by?.full_name?.charAt(0) || task.created_by?.username?.charAt(0)}
                      </Avatar>
                      <Text className="text-white">
                        {task.created_by?.full_name || task.created_by?.username}
                      </Text>
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">
                    {formatDate(task.created_at)}
                  </Descriptions.Item>
                  <Descriptions.Item label="开始时间">
                    {task.started_at ? formatDate(task.started_at) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="完成时间">
                    {task.completed_at ? formatDate(task.completed_at) : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="运行时长">
                    {task.started_at && task.completed_at
                      ? formatDuration(
                          (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000
                        )
                      : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="结果数">{task.result_count} 个</Descriptions.Item>
                  <Descriptions.Item label="参数模板">
                    {task.schema_id ? `#${task.schema_id}` : '无'}
                  </Descriptions.Item>
                  <Descriptions.Item label="描述" span={2}>
                    {task.description}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
          </Row>

          <Card
            title={<span className="text-white">参数配置</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            <pre className="bg-gray-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
              {JSON.stringify(task.parameters, null, 2)}
            </pre>
          </Card>

          <Card
            title={<span className="text-white">任务时间线</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            <Timeline
              mode="left"
              items={getTimelineEvents(task)}
            />
          </Card>
        </div>
      ),
    },
    {
      key: 'logs',
      label: '运行日志',
      icon: <Terminal size={16} />,
      children: (
        <Card
          className="bg-[#1f1f1f] border-gray-700"
          extra={
            <Button onClick={() => refetch()} icon={<RotateCcw size={16} />}>
              刷新
            </Button>
          }
        >
          <div className="bg-gray-900 rounded-lg p-4 max-h-[600px] overflow-y-auto font-mono">
            {logs?.results?.length ? (
              logs.results.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-800">
                  <div className="mt-0.5">{getLogIcon(log.level)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Text className="text-gray-500 text-xs">
                        {formatDate(log.timestamp, 'HH:mm:ss')}
                      </Text>
                      <Tag
                        color={
                          log.level === 'error'
                            ? 'red'
                            : log.level === 'warning'
                            ? 'orange'
                            : log.level === 'success'
                            ? 'green'
                            : 'blue'
                        }
                        style={{ fontSize: '12px' }}
                      >
                        {log.level.toUpperCase()}
                      </Tag>
                    </div>
                    <Text className="text-gray-300 text-sm block mt-1">{log.message}</Text>
                  </div>
                </div>
              ))
            ) : (
              <Empty description="暂无日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Card>
      ),
    },
    {
      key: 'results',
      label: '结果文件',
      icon: <FileText size={16} />,
      children: (
        <Card className="bg-[#1f1f1f] border-gray-700">
          {results?.results?.length ? (
            <List
              dataSource={results.results}
              renderItem={(result) => (
                <List.Item
                  key={result.id}
                  className="!border-b !border-gray-700 !px-0 cursor-pointer hover:bg-gray-800/30 -mx-4 px-4 transition-colors"
                  onClick={() => navigate(`/results/${result.id}`)}
                >
                  <List.Item.Meta
                    avatar={
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <FileText size={24} className="text-blue-400" />
                      </div>
                    }
                    title={
                      <div className="flex items-center justify-between">
                        <Text className="text-white font-medium">{result.name}</Text>
                        <Space>
                          <Text className="text-gray-400 text-sm">
                            {formatFileSize(result.file_size)}
                          </Text>
                          <Button
                            type="text"
                            size="small"
                            icon={<Download size={16} />}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            下载
                          </Button>
                        </Space>
                      </div>
                    }
                    description={
                      <div className="flex items-center gap-4">
                        <Text className="text-gray-500 text-xs">
                          {formatDate(result.created_at)}
                        </Text>
                        <Text className="text-gray-500 text-xs">{result.file_type}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="暂无结果文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          type="text"
          icon={<ArrowLeft size={20} className="text-gray-400" />}
          onClick={() => navigate('/tasks')}
          className="hover:bg-gray-800"
        />
        <Breadcrumb
          items={[
            { title: <span onClick={() => navigate('/tasks')} className="cursor-pointer text-gray-400 hover:text-blue-400">任务管理</span> },
            { title: <span className="text-white">{task.name}</span> },
          ]}
        />
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Title level={3} className="!text-white !mb-0">
                  {task.name}
                </Title>
                <StatusTag type="task" status={task.status} />
                <PriorityTag type="priority" value={task.priority} />
              </div>
              <Text className="text-gray-400">
                项目: {task.project?.name} · 创建者: {task.created_by?.full_name || task.created_by?.username}
              </Text>
            </div>
          </div>

          <Space wrap>
            {task.status === 'pending' && (
              <Button
                type="primary"
                icon={<PlayCircle size={18} />}
                onClick={handleRun}
                loading={running}
              >
                运行任务
              </Button>
            )}
            {task.status === 'reviewing' && (isLeader() || isAdmin()) && (
              <>
                <Button
                  type="primary"
                  icon={<CheckCircle2 size={18} />}
                  onClick={handleApprove}
                  loading={approving}
                >
                  批准
                </Button>
                <Button
                  danger
                  icon={<XCircle size={18} />}
                  onClick={handleReject}
                  loading={rejecting}
                >
                  拒绝
                </Button>
              </>
            )}
            <Button icon={<Edit size={18} />}>编辑</Button>
            <Button icon={<Share2 size={18} />}>分享</Button>
            <Button icon={<RotateCcw size={18} />}>重新运行</Button>
            {(isLeader() || isAdmin()) && (
              <Button
                danger
                icon={<Trash2 size={18} />}
                onClick={handleDelete}
                loading={deleting}
              >
                删除
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <Card
        className="bg-[#1f1f1f] border-gray-700"
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="px-6"
        />
      </Card>

      <Modal
        title={<Title level={4} className="!text-white !mb-0">拒绝任务</Title>}
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
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
            <TextArea
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

export default TaskDetailPage;
