import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Avatar,
  Typography,
  Space,
  Button,
  Tag,
  Breadcrumb,
  Tabs,
  Empty,
  Descriptions,
  List,
  Progress,
} from 'antd';
import {
  ArrowLeft,
  FolderKanban,
  Users,
  ListTodo,
  CheckCircle,
  PlayCircle,
  Clock,
  UserPlus,
} from 'lucide-react';
import {
  useGetProjectQuery,
  useGetTasksQuery,
  useGetTaskStatsQuery,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { PriorityTag } from '@/components/PriorityTag';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const { Title, Text } = Typography;

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLeader } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: project, isLoading: projectLoading } = useGetProjectQuery(Number(id));
  const { data: stats, isLoading: statsLoading } = useGetTaskStatsQuery({ project_id: Number(id) });
  const { data: tasks, isLoading: tasksLoading } = useGetTasksQuery({
    project: Number(id),
    page_size: 10,
  });

  if (projectLoading || statsLoading) {
    return <LoadingSpinner />;
  }

  if (!project) {
    return (
      <Card className="bg-[#1f1f1f] border-gray-700">
        <Empty description="项目不存在" />
      </Card>
    );
  }

  const statCards = [
    {
      title: '总任务数',
      value: stats?.total || 0,
      icon: <ListTodo size={24} className="text-blue-400" />,
      color: 'from-blue-500/20 to-blue-500/5',
    },
    {
      title: '运行中',
      value: stats?.running || 0,
      icon: <PlayCircle size={24} className="text-green-400" />,
      color: 'from-green-500/20 to-green-500/5',
    },
    {
      title: '已完成',
      value: stats?.completed || 0,
      icon: <CheckCircle size={24} className="text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      title: '待审核',
      value: stats?.pending || 0,
      icon: <Clock size={24} className="text-orange-400" />,
      color: 'from-orange-500/20 to-orange-500/5',
    },
  ];

  const taskColumns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Text className="text-white cursor-pointer hover:text-blue-400" onClick={() => navigate(`/tasks/${record.id}`)}>
          {text}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: any) => <StatusTag type="task" status={status} />,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority: any) => <PriorityTag type="priority" value={priority} />,
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => <Text className="text-gray-400">{formatRelativeTime(date)}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/tasks/${record.id}`)}>
          查看详情
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: '概览',
      children: (
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            {statCards.map((card, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card
                  className={`h-full border border-gray-700 bg-gradient-to-br ${card.color} backdrop-blur`}
                  styles={{ body: { padding: '20px' } }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <Text className="text-gray-400 text-sm block mb-1">{card.title}</Text>
                      <Statistic
                        value={card.value}
                        valueStyle={{ color: '#fff', fontSize: '28px', fontWeight: 700 }}
                      />
                    </div>
                    <div className="p-2 rounded-lg bg-white/10">{card.icon}</div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card
            title={<span className="text-white">基本信息</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            <Descriptions column={2} labelStyle={{ color: '#9ca3af' }} contentStyle={{ color: '#fff' }}>
              <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <StatusTag type="project" status={project.status} />
              </Descriptions.Item>
              <Descriptions.Item label="创建者">
                <Space>
                  <Avatar size={24} src={project.created_by?.avatar} style={{ background: '#1890ff' }}>
                    {project.created_by?.full_name?.charAt(0) || project.created_by?.username?.charAt(0)}
                  </Avatar>
                  <Text className="text-white">{project.created_by?.full_name || project.created_by?.username}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatDate(project.created_at)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatDate(project.updated_at)}</Descriptions.Item>
              <Descriptions.Item label="任务数">{project.task_count} 个</Descriptions.Item>
              <Descriptions.Item label="描述" span={2}>
                {project.description}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card
            title={<span className="text-white">最近任务</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            {tasks?.results?.length ? (
              <Table
                dataSource={tasks.results}
                columns={taskColumns}
                rowKey="id"
                pagination={false}
                loading={tasksLoading}
              />
            ) : (
              <Empty description="暂无任务" />
            )}
          </Card>
        </div>
      ),
    },
    {
      key: 'members',
      label: '成员管理',
      children: (
        <Card
          className="bg-[#1f1f1f] border-gray-700"
          extra={
            isLeader() ? (
              <Button type="primary" icon={<UserPlus size={16} />} size="small">
                添加成员
              </Button>
            ) : null
          }
        >
          <List
            dataSource={project.members}
            renderItem={(member) => (
              <List.Item key={member.id} className="!border-b !border-gray-700 !px-0">
                <List.Item.Meta
                  avatar={
                    <Avatar size={48} src={member.avatar} style={{ background: '#1890ff' }}>
                      {member.full_name?.charAt(0) || member.username?.charAt(0)}
                    </Avatar>
                  }
                  title={
                    <div className="flex items-center gap-2">
                      <Text className="text-white font-medium">{member.full_name || member.username}</Text>
                      <PriorityTag type="role" value={member.role} />
                    </div>
                  }
                  description={
                    <div className="text-gray-400">
                      <Text className="text-gray-400">{member.email}</Text>
                      <br />
                      <Text className="text-gray-500 text-xs">
                        加入时间: {formatDate(member.date_joined, 'YYYY-MM-DD')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
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
          onClick={() => navigate('/projects')}
          className="hover:bg-gray-800"
        />
        <Breadcrumb
          items={[
            { title: <span onClick={() => navigate('/projects')} className="cursor-pointer text-gray-400 hover:text-blue-400">项目管理</span> },
            { title: <span className="text-white">{project.name}</span> },
          ]}
        />
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-blue-500/20">
            <FolderKanban size={48} className="text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Title level={3} className="!text-white !mb-0">
                {project.name}
              </Title>
              <StatusTag type="project" status={project.status} />
            </div>
            <Text className="text-gray-400 block">{project.description}</Text>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <Text className="text-gray-400">{project.members?.length || 0} 位成员</Text>
              </div>
              <div className="flex items-center gap-2">
                <ListTodo size={16} className="text-gray-400" />
                <Text className="text-gray-400">{project.task_count} 个任务</Text>
              </div>
              <div className="flex items-center gap-2">
                <Text className="text-gray-500 text-sm">创建于 {formatDate(project.created_at, 'YYYY-MM-DD')}</Text>
              </div>
            </div>
          </div>
          <Space>
            {isLeader() && (
              <>
                <Button type="primary" onClick={() => navigate(`/tasks/create?project=${project.id}`)}>
                  新建任务
                </Button>
                <Button>编辑项目</Button>
              </>
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
    </div>
  );
};

export default ProjectDetailPage;
