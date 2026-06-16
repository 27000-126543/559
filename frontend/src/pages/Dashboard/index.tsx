import { Card, Row, Col, Statistic, List, Button, Space, Typography, Empty } from 'antd';
import {
  PlayCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  FolderKanban,
  ListTodo,
  FileBarChart,
  ArrowRight,
  Bell,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetTaskStatsQuery,
  useGetTaskTrendsQuery,
  useGetTasksQuery,
  useGetNotificationsQuery,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { formatRelativeTime, truncateText } from '@/utils/formatters';
import { CHART_COLORS } from '@/utils/constants';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useGetTaskStatsQuery({});
  const { data: trends, isLoading: trendsLoading } = useGetTaskTrendsQuery({ days: 7 });
  const { data: recentTasks, isLoading: tasksLoading } = useGetTasksQuery({
    page_size: 5,
  });
  const { data: notifications, isLoading: notificationsLoading } = useGetNotificationsQuery({
    page_size: 5,
    read: false,
  });

  const pieChartOption = stats
    ? {
        tooltip: { trigger: 'item' },
        legend: { bottom: '5%', left: 'center', textStyle: { color: '#ccc' } },
        color: CHART_COLORS,
        series: [
          {
            name: '任务状态',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#1f1f1f', borderWidth: 2 },
            label: { show: false },
            emphasis: {
              label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#fff' },
            },
            data: [
              { value: stats.running, name: '运行中', itemStyle: { color: CHART_COLORS[0] } },
              { value: stats.completed, name: '已完成', itemStyle: { color: CHART_COLORS[1] } },
              { value: stats.pending, name: '待运行', itemStyle: { color: CHART_COLORS[2] } },
              { value: stats.failed, name: '失败', itemStyle: { color: CHART_COLORS[3] } },
            ],
          },
        ],
      }
    : {};

  const lineChartOption = trends
    ? {
        tooltip: { trigger: 'axis' },
        legend: { data: ['任务数量'], textStyle: { color: '#ccc' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: trends.map((t) => t.date),
          axisLine: { lineStyle: { color: '#444' } },
          axisLabel: { color: '#ccc' },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: '#444' } },
          axisLabel: { color: '#ccc' },
          splitLine: { lineStyle: { color: '#333' } },
        },
        series: [
          {
            name: '任务数量',
            type: 'line',
            smooth: true,
            data: trends.map((t) => t.count),
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.5)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
                ],
              },
            },
            lineStyle: { color: CHART_COLORS[0], width: 3 },
            itemStyle: { color: CHART_COLORS[0] },
          },
        ],
      }
    : {};

  if (statsLoading || trendsLoading || tasksLoading || notificationsLoading) {
    return <LoadingSpinner />;
  }

  const statCards = [
    {
      title: '总任务数',
      value: stats?.total || 0,
      icon: <ListTodo size={28} className="text-blue-400" />,
      color: 'from-blue-500/20 to-blue-500/5',
      borderColor: 'border-blue-500/30',
    },
    {
      title: '运行中',
      value: stats?.running || 0,
      icon: <PlayCircle size={28} className="text-green-400" />,
      color: 'from-green-500/20 to-green-500/5',
      borderColor: 'border-green-500/30',
    },
    {
      title: '已完成',
      value: stats?.completed || 0,
      icon: <CheckCircle size={28} className="text-emerald-400" />,
      color: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30',
    },
    {
      title: '待审核',
      value: stats?.pending || 0,
      icon: <Clock size={28} className="text-orange-400" />,
      color: 'from-orange-500/20 to-orange-500/5',
      borderColor: 'border-orange-500/30',
    },
  ];

  const quickActions = [
    { title: '创建项目', icon: <FolderKanban size={24} />, onClick: () => navigate('/projects') },
    { title: '提交任务', icon: <Plus size={24} />, onClick: () => navigate('/tasks/create') },
    { title: '查看结果', icon: <FileBarChart size={24} />, onClick: () => navigate('/results') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Title level={3} className="!text-white !mb-1">
            欢迎回来，{user?.full_name || user?.username}！
          </Title>
          <Text className="text-gray-400">这是您的工作台概览</Text>
        </div>
        <Button type="primary" icon={<Plus size={18} />} onClick={() => navigate('/tasks/create')}>
          提交新任务
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((card, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card
              className={`h-full border ${card.borderColor} bg-gradient-to-br ${card.color} backdrop-blur`}
              styles={{ body: { padding: '24px' } }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <Text className="text-gray-400 text-sm block mb-2">{card.title}</Text>
                  <Statistic
                    value={card.value}
                    className="!text-white"
                    valueStyle={{ color: '#fff', fontSize: '32px', fontWeight: 700 }}
                  />
                </div>
                <div className="p-3 rounded-xl bg-white/10">{card.icon}</div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="text-white">任务状态分布</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            <ReactECharts option={pieChartOption} style={{ height: '300px' }} theme="dark" />
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card
            title={<span className="text-white">近7天任务趋势</span>}
            className="bg-[#1f1f1f] border-gray-700"
          >
            <ReactECharts option={lineChartOption} style={{ height: '300px' }} theme="dark" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title={<span className="text-white">快速操作</span>}
            className="bg-[#1f1f1f] border-gray-700 h-full"
          >
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-all group"
                  onClick={action.onClick}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                      {action.icon}
                    </div>
                    <Text className="text-white font-medium">{action.title}</Text>
                  </div>
                  <ArrowRight size={18} className="text-gray-500 group-hover:text-blue-400 transition-colors" />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span className="text-white">最近任务</span>
                <Button type="link" size="small" onClick={() => navigate('/tasks')}>
                  查看全部
                </Button>
              </div>
            }
            className="bg-[#1f1f1f] border-gray-700 h-full"
          >
            {recentTasks?.results?.length ? (
              <List
                dataSource={recentTasks.results}
                renderItem={(task) => (
                  <List.Item
                    key={task.id}
                    className="!border-b !border-gray-700 !px-0 cursor-pointer hover:bg-gray-800/30 -mx-4 px-4 transition-colors"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <List.Item.Meta
                      title={
                        <div className="flex items-center justify-between w-full">
                          <Text className="text-white font-medium truncate max-w-[150px]">
                            {truncateText(task.name, 20)}
                          </Text>
                          <StatusTag type="task" status={task.status} />
                        </div>
                      }
                      description={
                        <div className="flex items-center justify-between">
                          <Text className="text-gray-400 text-xs">
                            {formatRelativeTime(task.created_at)}
                          </Text>
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={18} className="text-blue-400" />
                  <span className="text-white">未读消息</span>
                </div>
                <Button type="link" size="small" onClick={() => navigate('/messages')}>
                  查看全部
                </Button>
              </div>
            }
            className="bg-[#1f1f1f] border-gray-700 h-full"
          >
            {notifications?.results?.length ? (
              <List
                dataSource={notifications.results}
                renderItem={(notification) => (
                  <List.Item
                    key={notification.id}
                    className="!border-b !border-gray-700 !px-0 cursor-pointer hover:bg-gray-800/30 -mx-4 px-4 transition-colors"
                    onClick={() => navigate('/messages')}
                  >
                    <List.Item.Meta
                      title={
                        <Text className="text-white font-medium">
                          {truncateText(notification.title, 25)}
                        </Text>
                      }
                      description={
                        <div className="flex items-center gap-2">
                          <StatusTag type="notification" status={notification.type} />
                          <Text className="text-gray-400 text-xs">
                            {formatRelativeTime(notification.created_at)}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无未读消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
