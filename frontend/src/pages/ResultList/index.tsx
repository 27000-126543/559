import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Tag,
  Empty,
  Tooltip,
  message,
  Pagination,
  Modal,
} from 'antd';
import {
  FileBarChart,
  Search,
  Download,
  Share2,
  Eye,
  Trash2,
  Filter,
  FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useGetResultsQuery,
  useDeleteTaskMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate, formatFileSize, formatRelativeTime, truncateText } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { Result } from '@/types';
import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '@/utils/constants';

const { Title, Text } = Typography;
const { Option } = Select;

const ResultListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLeader, isAdmin } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [taskFilter, setTaskFilter] = useState<number>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const { data: results, isLoading, refetch } = useGetResultsQuery({
    page,
    page_size: pageSize,
    search: searchText || undefined,
    task: taskFilter,
  });

  const [deleteResult, { isLoading: deleting }] = useDeleteTaskMutation();

  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除结果文件 "${name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteResult(id).unwrap();
          message.success('结果已删除');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const handleDownload = (result: Result) => {
    message.info(`开始下载: ${result.name}`);
  };

  const handleShare = (result: Result) => {
    Modal.info({
      title: '共享链接',
      content: (
        <div>
          <p>以下是结果文件的共享链接：</p>
          <Input
            value={`${window.location.origin}/results/${result.id}`}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      ),
      okText: '复制链接',
      onOk: () => {
        navigator.clipboard.writeText(`${window.location.origin}/results/${result.id}`);
        message.success('链接已复制到剪贴板');
      },
    });
  };

  const getChartPreview = (result: Result) => {
    if (!result.visualizations?.length) return null;

    const viz = result.visualizations[0];
    let option: any = {};

    switch (viz.type) {
      case 'line':
        option = {
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any) => d[viz.x_field || 'x']),
            axisLabel: { show: false },
          },
          yAxis: {
            type: 'value',
            axisLabel: { show: false },
            splitLine: { show: false },
          },
          series: [
            {
              type: 'line',
              data: viz.data.map((d: any) => d[viz.y_field || 'y']),
              smooth: true,
              lineStyle: { color: CHART_COLORS[0], width: 2 },
              itemStyle: { color: CHART_COLORS[0] },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                    { offset: 1, color: 'rgba(24, 144, 255, 0.05)' },
                  ],
                },
              },
            },
          ],
        };
        break;
      case 'bar':
        option = {
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any) => d[viz.x_field || 'x']),
            axisLabel: { show: false },
          },
          yAxis: {
            type: 'value',
            axisLabel: { show: false },
            splitLine: { show: false },
          },
          series: [
            {
              type: 'bar',
              data: viz.data.map((d: any) => d[viz.y_field || 'y']),
              itemStyle: {
                color: CHART_COLORS[0],
                borderRadius: [4, 4, 0, 0],
              },
            },
          ],
        };
        break;
      default:
        option = {
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any, i: number) => i),
            axisLabel: { show: false },
          },
          yAxis: {
            type: 'value',
            axisLabel: { show: false },
            splitLine: { show: false },
          },
          series: [
            {
              type: 'line',
              data: viz.data,
              smooth: true,
              lineStyle: { color: CHART_COLORS[0], width: 2 },
            },
          ],
        };
    }

    return option;
  };

  const resetFilters = () => {
    setSearchText('');
    setTaskFilter(undefined);
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
            结果管理
          </Title>
          <Text className="text-gray-400">管理所有仿真结果文件</Text>
        </div>
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Space wrap className="w-full" size={[16, 16]}>
          <Input
            prefix={<Search size={18} className="text-gray-400" />}
            placeholder="搜索结果名称..."
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 250 }}
            className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
          />
          <Select
            placeholder="筛选任务"
            value={taskFilter}
            onChange={(v) => { setTaskFilter(v); setPage(1); }}
            allowClear
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            {/* Task options would be populated from API */}
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

      {results?.results?.length ? (
        <>
          <Row gutter={[16, 16]}>
            {results.results.map((result) => (
              <Col xs={24} sm={12} lg={8} xl={6} key={result.id}>
                <Card
                  className="bg-[#1f1f1f] border-gray-700 hover:border-blue-500/50 transition-all cursor-pointer group h-full"
                  onClick={() => navigate(`/results/${result.id}`)}
                  styles={{ body: { padding: 0 } }}
                >
                  <div className="h-40 bg-gray-800/50 relative overflow-hidden">
                    {result.visualizations?.length ? (
                      <ReactECharts
                        option={getChartPreview(result)}
                        style={{ height: '100%', width: '100%' }}
                        theme="dark"
                        opts={{ renderer: 'canvas' }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <FileText size={48} className="text-gray-600" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Space size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<Eye size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/results/${result.id}`);
                          }}
                        >
                          查看
                        </Button>
                        <Button
                          size="small"
                          icon={<Download size={14} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(result);
                          }}
                        >
                          下载
                        </Button>
                      </Space>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <Title level={5} className="!text-white !mb-0 !text-base line-clamp-1">
                        {result.name}
                      </Title>
                      <Tag color="blue" style={{ fontSize: '12px' }}>
                        {result.file_type}
                      </Tag>
                    </div>

                    <Text className="text-gray-400 text-sm block mb-3 line-clamp-2">
                      {truncateText(result.task?.description || result.task?.name || '', 60)}
                    </Text>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <Tooltip title={formatDate(result.created_at)}>
                        <span>{formatRelativeTime(result.created_at)}</span>
                      </Tooltip>
                      <span>{formatFileSize(result.file_size)}</span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-700">
                      <div className="flex items-center gap-2">
                        <FileBarChart size={14} className="text-gray-400" />
                        <Text className="text-gray-400 text-xs">
                          {result.visualizations?.length || 0} 个图表
                        </Text>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Space size="small">
                          <Button
                            type="text"
                            size="small"
                            icon={<Share2 size={14} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShare(result);
                            }}
                          >
                            分享
                          </Button>
                          {(isLeader() || isAdmin()) && (
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<Trash2 size={14} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(result.id, result.name);
                              }}
                              loading={deleting}
                            >
                              删除
                            </Button>
                          )}
                        </Space>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="bg-[#1f1f1f] border-gray-700">
            <div className="flex justify-end">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={results.count}
                onChange={(p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                }}
                showSizeChanger
                showQuickJumper
                showTotal={(total) => `共 ${total} 条记录`}
              />
            </div>
          </Card>
        </>
      ) : (
        <Card className="bg-[#1f1f1f] border-gray-700">
          <Empty description="暂无结果文件" />
        </Card>
      )}
    </div>
  );
};

export default ResultListPage;
