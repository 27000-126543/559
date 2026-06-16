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
  Switch,
  Empty,
  message,
  Tag,
  Tooltip,
  Pagination,
  Row,
  Col,
} from 'antd';
import {
  Database,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Filter,
  Copy,
  FileJson,
  Globe,
  Lock,
} from 'lucide-react';
import {
  useGetSchemasQuery,
  useCreateSchemaMutation,
  useUpdateSchemaMutation,
  useDeleteSchemaMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { formatDate, formatRelativeTime, truncateText } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { ParameterSchema, JSONSchema } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SchemaListPage: React.FC = () => {
  const { isLeader, isAdmin, user } = useAuth();
  const [searchText, setSearchText] = useState('');
  const [publicFilter, setPublicFilter] = useState<boolean | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchema, setEditingSchema] = useState<ParameterSchema | null>(null);
  const [form] = Form.useForm();
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { data: schemas, isLoading, refetch } = useGetSchemasQuery({
    page,
    page_size: pageSize,
    search: searchText || undefined,
    is_public: publicFilter,
  });

  const [createSchema, { isLoading: creating }] = useCreateSchemaMutation();
  const [updateSchema, { isLoading: updating }] = useUpdateSchemaMutation();
  const [deleteSchema, { isLoading: deleting }] = useDeleteSchemaMutation();

  const validateJson = (value: string) => {
    try {
      JSON.parse(value);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError('JSON 格式错误');
      return false;
    }
  };

  const handleSubmit = async (values: {
    name: string;
    description: string;
    schema: string;
    is_public: boolean;
  }) => {
    if (!validateJson(values.schema)) {
      return;
    }

    try {
      const schemaData: JSONSchema = JSON.parse(values.schema);
      const data = {
        name: values.name,
        description: values.description,
        schema: schemaData,
        is_public: values.is_public,
      };

      if (editingSchema) {
        await updateSchema({ id: editingSchema.id, data }).unwrap();
        message.success('模板更新成功');
      } else {
        await createSchema(data).unwrap();
        message.success('模板创建成功');
      }
      setIsModalOpen(false);
      setEditingSchema(null);
      form.resetFields();
      refetch();
    } catch (error: any) {
      message.error(error?.data?.detail || '操作失败');
    }
  };

  const handleEdit = (schema: ParameterSchema) => {
    setEditingSchema(schema);
    form.setFieldsValue({
      name: schema.name,
      description: schema.description,
      schema: JSON.stringify(schema.schema, null, 2),
      is_public: schema.is_public,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number, name: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除参数模板 "${name}" 吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSchema(id).unwrap();
          message.success('模板已删除');
          refetch();
        } catch (error: any) {
          message.error(error?.data?.detail || '删除失败');
        }
      },
    });
  };

  const handleCopy = (schema: ParameterSchema) => {
    navigator.clipboard.writeText(JSON.stringify(schema.schema, null, 2));
    message.success('Schema 已复制到剪贴板');
  };

  const openCreateModal = () => {
    setEditingSchema(null);
    form.resetFields();
    form.setFieldsValue({
      is_public: false,
      schema: JSON.stringify(
        {
          type: 'object',
          title: '参数模板',
          description: '请输入参数模板描述',
          properties: {
            example_param: {
              type: 'string',
              title: '示例参数',
              description: '这是一个示例参数',
              default: 'default_value',
            },
          },
          required: ['example_param'],
        },
        null,
        2
      ),
    });
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setSearchText('');
    setPublicFilter(undefined);
    setPage(1);
  };

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ParameterSchema) => (
        <div>
          <div className="flex items-center gap-2">
            <FileJson size={16} className="text-blue-400" />
            <Text className="text-white font-medium">{text}</Text>
            {record.is_public ? (
              <Tooltip title="公开">
                <Globe size={14} className="text-green-400" />
              </Tooltip>
            ) : (
              <Tooltip title="私有">
                <Lock size={14} className="text-gray-400" />
              </Tooltip>
            )}
          </div>
          <Text className="text-gray-500 text-xs block mt-1">
            {truncateText(record.description, 50)}
          </Text>
        </div>
      ),
    },
    {
      title: '属性数量',
      key: 'properties',
      render: (_: any, record: ParameterSchema) => (
        <Tag color="blue">{Object.keys(record.schema.properties).length} 个</Tag>
      ),
    },
    {
      title: '是否公开',
      dataIndex: 'is_public',
      key: 'is_public',
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? 'green' : 'default'}>
          {isPublic ? '公开' : '私有'}
        </Tag>
      ),
    },
    {
      title: '创建者',
      dataIndex: ['created_by', 'full_name'],
      key: 'created_by',
      render: (name: string, record: ParameterSchema) => (
        <Text className="text-gray-300">
          {name || record.created_by?.username || '-'}
        </Text>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => (
        <Tooltip title={formatDate(date)}>
          <Text className="text-gray-400">{formatRelativeTime(date)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: ParameterSchema) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<Copy size={14} />}
            onClick={() => handleCopy(record)}
          >
            复制
          </Button>
          {(isLeader() || isAdmin() || record.created_by?.id === user?.id) && (
            <>
              <Button
                type="text"
                size="small"
                icon={<Edit size={14} />}
                onClick={() => handleEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="text"
                size="small"
                danger
                icon={<Trash2 size={14} />}
                onClick={() => handleDelete(record.id, record.name)}
                loading={deleting}
              >
                删除
              </Button>
            </>
          )}
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
            参数模板
          </Title>
          <Text className="text-gray-400">管理任务参数模板</Text>
        </div>
        {(isLeader() || isAdmin()) && (
          <Button type="primary" icon={<Plus size={18} />} onClick={openCreateModal}>
            新建模板
          </Button>
        )}
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Space wrap className="w-full" size={[16, 16]}>
          <Input
            prefix={<Search size={18} className="text-gray-400" />}
            placeholder="搜索模板名称..."
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
            placeholder="筛选可见性"
            value={publicFilter !== undefined ? String(publicFilter) : undefined}
            onChange={(v) => {
              setPublicFilter(v === undefined ? undefined : v === 'true');
              setPage(1);
            }}
            allowClear
            style={{ width: 150 }}
          >
            <Option value="true">公开</Option>
            <Option value="false">私有</Option>
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
        {schemas?.results?.length ? (
          <>
            <Table
              dataSource={schemas.results}
              columns={columns}
              rowKey="id"
              pagination={false}
              scroll={{ x: 1000 }}
            />
            <div className="p-4 flex justify-end border-t border-gray-700">
              <Pagination
                current={page}
                pageSize={pageSize}
                total={schemas.count}
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
            <Empty description="暂无参数模板" />
          </div>
        )}
      </Card>

      <Modal
        title={
          <Title level={4} className="!text-white !mb-0">
            {editingSchema ? '编辑参数模板' : '新建参数模板'}
          </Title>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingSchema(null);
          form.resetFields();
          setJsonError(null);
        }}
        footer={null}
        centered
        width={800}
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
                name="name"
                label={<span className="text-gray-200">模板名称</span>}
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input
                  placeholder="请输入模板名称"
                  className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="is_public"
                label={<span className="text-gray-200">是否公开</span>}
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label={<span className="text-gray-200">模板描述</span>}
            rules={[{ required: true, message: '请输入模板描述' }]}
          >
            <Input
              placeholder="请输入模板描述"
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          </Form.Item>

          <Form.Item
            name="schema"
            label={
              <div className="flex items-center justify-between">
                <span className="text-gray-200">JSON Schema</span>
                <Tag color={jsonError ? 'red' : 'green'}>
                  {jsonError || 'JSON Schema 格式'}
                </Tag>
              </div>
            }
            rules={[{ required: true, message: '请输入 JSON Schema' }]}
          >
            <TextArea
              rows={15}
              placeholder='{"type": "object", "properties": {...}}'
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 font-mono"
              onChange={(e) => validateJson(e.target.value)}
            />
          </Form.Item>

          <Form.Item className="mb-0 mt-4">
            <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingSchema(null);
                  form.resetFields();
                  setJsonError(null);
                }}
              >
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={creating || updating}
                disabled={!!jsonError}
              >
                {editingSchema ? '保存修改' : '创建模板'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchemaListPage;
