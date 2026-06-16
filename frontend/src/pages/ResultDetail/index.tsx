import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Button,
  Space,
  Typography,
  Breadcrumb,
  Empty,
  Tabs,
  Table,
  message,
} from 'antd';
import {
  ArrowLeft,
  Download,
  Share2,
  FileText,
  BarChart3,
  LineChart,
  PieChart,
  Database,
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useGetResultQuery, useDownloadResultQuery } from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate, formatFileSize } from '@/utils/formatters';
import { Result, VisualizationConfig } from '@/types';
import { CHART_COLORS } from '@/utils/constants';

const { Title, Text } = Typography;

const ResultDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('visualization');

  const resultId = Number(id);
  const { data: result, isLoading } = useGetResultQuery(resultId);

  const handleDownload = () => {
    if (result) {
      message.info(`开始下载: ${result.name}`);
    }
  };

  const handleShare = () => {
    if (!result) return;
    const url = `${window.location.origin}/results/${result.id}`;
    navigator.clipboard.writeText(url);
    message.success('链接已复制到剪贴板');
  };

  const getChartOption = (viz: VisualizationConfig) => {
    let option: any = {
      title: {
        text: viz.title,
        textStyle: { color: '#fff', fontSize: 16 },
        left: 'center',
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      legend: {
        data: [viz.title],
        textStyle: { color: '#ccc' },
        top: 30,
      },
    };

    switch (viz.type) {
      case 'line':
        option = {
          ...option,
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any) => d[viz.x_field || 'x']),
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
              name: viz.title,
              type: 'line',
              smooth: true,
              data: viz.data.map((d: any) => d[viz.y_field || 'y']),
              lineStyle: { color: CHART_COLORS[0], width: 3 },
              itemStyle: { color: CHART_COLORS[0] },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(24, 144, 255, 0.4)' },
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
          ...option,
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any) => d[viz.x_field || 'x']),
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
              name: viz.title,
              type: 'bar',
              data: viz.data.map((d: any) => d[viz.y_field || 'y']),
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: '#1890ff' },
                    { offset: 1, color: '#096dd9' },
                  ],
                },
                borderRadius: [8, 8, 0, 0],
              },
              barWidth: '50%',
            },
          ],
        };
        break;
      case 'pie':
        option = {
          ...option,
          tooltip: { trigger: 'item' },
          legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: { color: '#ccc' },
          },
          series: [
            {
              name: viz.title,
              type: 'pie',
              radius: ['40%', '70%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 10,
                borderColor: '#1f1f1f',
                borderWidth: 2,
              },
              label: { show: false },
              emphasis: {
                label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#fff' },
              },
              data: viz.data.map((d: any, i: number) => ({
                value: d.value,
                name: d.name,
                itemStyle: { color: CHART_COLORS[i % CHART_COLORS.length] },
              })),
            },
          ],
        };
        break;
      default:
        option = {
          ...option,
          xAxis: {
            type: 'category',
            data: viz.data.map((d: any, i: number) => i),
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
              name: viz.title,
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

  const dataColumns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 80,
    },
    ...(result?.data && Object.keys(result.data).length > 0
      ? Object.keys(result.data[0] || {}).map((key) => ({
          title: key,
          dataIndex: key,
          key,
        }))
      : []),
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!result) {
    return (
      <Card className="bg-[#1f1f1f] border-gray-700">
        <Empty description="结果不存在" />
      </Card>
    );
  }

  const tabItems = [
    {
      key: 'visualization',
      label: (
        <span className="flex items-center gap-2">
          <BarChart3 size={16} />
          数据可视化
        </span>
      ),
      children: (
        <div className="space-y-6">
          {result.visualizations?.length ? (
            <Row gutter={[16, 16]}>
              {result.visualizations.map((viz, index) => (
                <Col xs={24} lg={index === 0 ? 24 : 12} key={viz.id}>
                  <Card className="bg-[#1f1f1f] border-gray-700">
                    <ReactECharts
                      option={getChartOption(viz)}
                      style={{ height: '400px' }}
                      theme="dark"
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <Card className="bg-[#1f1f1f] border-gray-700">
              <Empty description="暂无可视化图表" />
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'data',
      label: (
        <span className="flex items-center gap-2">
          <Database size={16} />
          原始数据
        </span>
      ),
      children: (
        <Card className="bg-[#1f1f1f] border-gray-700">
          {result.data && Object.keys(result.data).length > 0 ? (
            <Table
              dataSource={Array.isArray(result.data) ? result.data : []}
              columns={dataColumns}
              rowKey={(record, index) => index?.toString() || ''}
              scroll={{ x: 1200 }}
            />
          ) : (
            <Empty description="暂无原始数据" />
          )}
        </Card>
      ),
    },
    {
      key: 'raw',
      label: (
        <span className="flex items-center gap-2">
          <FileText size={16} />
          JSON 数据
        </span>
      ),
      children: (
        <Card className="bg-[#1f1f1f] border-gray-700">
          <pre className="bg-gray-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto max-h-[600px]">
            {JSON.stringify(result, null, 2)}
          </pre>
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
          onClick={() => navigate('/results')}
          className="hover:bg-gray-800"
        />
        <Breadcrumb
          items={[
            {
              title: (
                <span
                  onClick={() => navigate('/results')}
                  className="cursor-pointer text-gray-400 hover:text-blue-400"
                >
                  结果管理
                </span>
              ),
            },
            { title: <span className="text-white">{result.name}</span> },
          ]}
        />
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-blue-500/20">
              <FileText size={40} className="text-blue-400" />
            </div>
            <div>
              <Title level={3} className="!text-white !mb-1">
                {result.name}
              </Title>
              <div className="flex items-center gap-4">
                <Text className="text-gray-400">
                  任务: {result.task?.name || '-'}
                </Text>
                <Text className="text-gray-500">|</Text>
                <Text className="text-gray-400">
                  {result.file_type} · {formatFileSize(result.file_size)}
                </Text>
              </div>
            </div>
          </div>

          <Space>
            <Button icon={<Download size={18} />} onClick={handleDownload}>
              下载
            </Button>
            <Button icon={<Share2 size={18} />} onClick={handleShare}>
              分享
            </Button>
          </Space>
        </div>
      </Card>

      <Card
        title={<span className="text-white">文件信息</span>}
        className="bg-[#1f1f1f] border-gray-700"
      >
        <Descriptions
          column={2}
          labelStyle={{ color: '#9ca3af' }}
          contentStyle={{ color: '#fff' }}
        >
          <Descriptions.Item label="文件名">{result.name}</Descriptions.Item>
          <Descriptions.Item label="文件类型">{result.file_type}</Descriptions.Item>
          <Descriptions.Item label="文件大小">{formatFileSize(result.file_size)}</Descriptions.Item>
          <Descriptions.Item label="文件路径">{result.file_path}</Descriptions.Item>
          <Descriptions.Item label="所属任务">
            <span
              className="text-blue-400 cursor-pointer hover:underline"
              onClick={() => navigate(`/tasks/${result.task?.id}`)}
            >
              {result.task?.name}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(result.created_at)}</Descriptions.Item>
          <Descriptions.Item label="图表数量">
            {result.visualizations?.length || 0} 个
          </Descriptions.Item>
          <Descriptions.Item label="数据条数">
            {result.data && Object.keys(result.data).length > 0
              ? `${result.data.length} 条`
              : '-'}
          </Descriptions.Item>
        </Descriptions>
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

export default ResultDetailPage;
