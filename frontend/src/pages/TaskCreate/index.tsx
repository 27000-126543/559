import { useState, useEffect } from 'react';
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Empty,
  message,
} from 'antd';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Settings,
  CheckCircle2,
  PlayCircle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useGetProjectsQuery,
  useGetSchemasQuery,
  useCreateTaskMutation,
  useRunTaskMutation,
} from '@/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusTag } from '@/components/StatusTag';
import { PriorityTag } from '@/components/PriorityTag';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { Task, JSONSchemaProperty } from '@/types';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

interface TaskFormData {
  name: string;
  description: string;
  project: number;
  priority: Task['priority'];
  schema_id?: number;
  parameters: Record<string, any>;
}

const TaskCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm<TaskFormData>();
  const [selectedSchemaId, setSelectedSchemaId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TaskFormData | null>(null);

  const projectId = searchParams.get('project');

  const { data: projects, isLoading: projectsLoading } = useGetProjectsQuery({ page_size: 100 });
  const { data: schemas, isLoading: schemasLoading } = useGetSchemasQuery({ page_size: 100, is_public: true });
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [runTask, { isLoading: running }] = useRunTaskMutation();

  const selectedSchema = schemas?.results?.find(s => s.id === selectedSchemaId);

  useEffect(() => {
    if (projectId) {
      form.setFieldsValue({ project: Number(projectId) });
    }
  }, [projectId, form]);

  const steps = [
    {
      title: '基本信息',
      icon: <FileText size={20} />,
    },
    {
      title: '参数配置',
      icon: <Settings size={20} />,
    },
    {
      title: '确认提交',
      icon: <CheckCircle2 size={20} />,
    },
  ];

  const generateFormFields = (properties: Record<string, JSONSchemaProperty>) => {
    return Object.entries(properties).map(([key, prop]) => {
      const rules = [];
      if (prop.required) {
        rules.push({ required: true, message: `请输入${prop.title || key}` });
      }
      if (prop.minLength !== undefined) {
        rules.push({ min: prop.minLength, message: `最少${prop.minLength}个字符` });
      }
      if (prop.maxLength !== undefined) {
        rules.push({ max: prop.maxLength, message: `最多${prop.maxLength}个字符` });
      }
      if (prop.minimum !== undefined) {
        rules.push({ type: 'number', min: prop.minimum, message: `最小值为${prop.minimum}` });
      }
      if (prop.maximum !== undefined) {
        rules.push({ type: 'number', max: prop.maximum, message: `最大值为${prop.maximum}` });
      }
      if (prop.pattern) {
        rules.push({ pattern: new RegExp(prop.pattern), message: '格式不正确' });
      }

      let formItem;
      switch (prop.type) {
        case 'string':
          if (prop.enum) {
            formItem = (
              <Select placeholder={`请选择${prop.title || key}`} className="w-full">
                {prop.enum.map((val) => (
                  <Option key={val} value={val}>
                    {val}
                  </Option>
                ))}
              </Select>
            );
          } else {
            formItem = (
              <Input
                placeholder={`请输入${prop.title || key}`}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
              />
            );
          }
          break;
        case 'number':
        case 'integer':
          formItem = (
            <Input
              type="number"
              placeholder={`请输入${prop.title || key}`}
              className="w-full bg-gray-800 border-gray-600"
            />
          );
          break;
        case 'boolean':
          formItem = (
            <Select placeholder={`请选择${prop.title || key}`} className="w-full">
              <Option value={true}>是</Option>
              <Option value={false}>否</Option>
            </Select>
          );
          break;
        default:
          formItem = (
            <Input
              placeholder={`请输入${prop.title || key}`}
              className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
            />
          );
      }

      return (
        <Form.Item
          key={key}
          name={['parameters', key]}
          label={<span className="text-gray-200">{prop.title || key}</span>}
          rules={rules as any}
          initialValue={prop.default}
          tooltip={prop.description}
        >
          {formItem}
        </Form.Item>
      );
    });
  };

  const handleNext = async () => {
    try {
      const values = await form.validateFields();
      setFormData(values);
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (runNow: boolean = false) => {
    if (!formData) return;

    try {
      const taskData = {
        ...formData,
        project: formData.project as unknown as any,
      };
      const task = await createTask(taskData).unwrap();

      if (runNow) {
        await runTask(task.id).unwrap();
        message.success('任务创建成功并已开始运行');
      } else {
        message.success('任务创建成功');
      }

      navigate('/tasks');
    } catch (error: any) {
      message.error(error?.data?.detail || '创建失败');
    }
  };

  if (projectsLoading || schemasLoading) {
    return <LoadingSpinner />;
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="max-w-3xl mx-auto">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label={<span className="text-gray-200">任务名称</span>}
                  rules={[{ required: true, message: '请输入任务名称' }]}
                >
                  <Input
                    placeholder="请输入任务名称"
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="project"
                  label={<span className="text-gray-200">所属项目</span>}
                  rules={[{ required: true, message: '请选择项目' }]}
                >
                  <Select
                    placeholder="请选择项目"
                    className="w-full"
                    showSearch
                    optionFilterProp="children"
                  >
                    {projects?.results?.map((project) => (
                      <Option key={project.id} value={project.id}>
                        {project.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="priority"
                  label={<span className="text-gray-200">优先级</span>}
                  rules={[{ required: true, message: '请选择优先级' }]}
                  initialValue="medium"
                >
                  <Select placeholder="请选择优先级" className="w-full">
                    <Option value="low">低</Option>
                    <Option value="medium">中</Option>
                    <Option value="high">高</Option>
                    <Option value="urgent">紧急</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="schema_id"
                  label={<span className="text-gray-200">参数模板</span>}
                >
                  <Select
                    placeholder="选择参数模板（可选）"
                    className="w-full"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    onChange={(value) => setSelectedSchemaId(value)}
                  >
                    {schemas?.results?.map((schema) => (
                      <Option key={schema.id} value={schema.id}>
                        {schema.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item
                  name="description"
                  label={<span className="text-gray-200">任务描述</span>}
                  rules={[{ required: true, message: '请输入任务描述' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="请输入任务描述..."
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 1:
        return (
          <div className="max-w-3xl mx-auto">
            {selectedSchema ? (
              <div className="space-y-6">
                <Alert
                  message={`使用参数模板: ${selectedSchema.name}`}
                  description={selectedSchema.description}
                  type="info"
                  showIcon
                />
                <Row gutter={[16, 16]}>
                  {generateFormFields(selectedSchema.schema.properties)}
                </Row>
              </div>
            ) : (
              <div className="space-y-6">
                <Alert
                  message="未选择参数模板"
                  description="您可以在上一步选择参数模板，或手动配置参数。未选择模板时，参数将以JSON格式存储。"
                  type="warning"
                  showIcon
                />
                <Form.Item
                  name="parameters"
                  label={<span className="text-gray-200">自定义参数 (JSON)</span>}
                  initialValue={{}}
                >
                  <TextArea
                    rows={10}
                    placeholder='{"key": "value"}'
                    className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 font-mono"
                  />
                </Form.Item>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="max-w-3xl mx-auto">
            <Card className="bg-gray-800/50 border-gray-700">
              <Title level={5} className="!text-white !mb-4">
                请确认任务信息
              </Title>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-gray-700">
                  <Text className="text-gray-400">任务名称</Text>
                  <Text className="text-white font-medium">{formData?.name}</Text>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-700">
                  <Text className="text-gray-400">所属项目</Text>
                  <Text className="text-white font-medium">
                    {projects?.results?.find(p => p.id === formData?.project)?.name}
                  </Text>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-700">
                  <Text className="text-gray-400">优先级</Text>
                  {formData?.priority && <PriorityTag type="priority" value={formData.priority} />}
                </div>
                <div className="flex justify-between py-3 border-b border-gray-700">
                  <Text className="text-gray-400">参数模板</Text>
                  <Text className="text-white font-medium">
                    {selectedSchema?.name || '无'}
                  </Text>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-700">
                  <Text className="text-gray-400">创建者</Text>
                  <Text className="text-white font-medium">
                    {user?.full_name || user?.username}
                  </Text>
                </div>
                <div className="py-3">
                  <Text className="text-gray-400 block mb-2">任务描述</Text>
                  <Text className="text-white">{formData?.description}</Text>
                </div>
                {formData?.parameters && Object.keys(formData.parameters).length > 0 && (
                  <div className="py-3">
                    <Text className="text-gray-400 block mb-2">参数配置</Text>
                    <pre className="bg-gray-900 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
                      {JSON.stringify(formData.parameters, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </div>
        );

      default:
        return <Empty />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          type="text"
          icon={<ArrowLeft size={20} className="text-gray-400" />}
          onClick={() => navigate('/tasks')}
          className="hover:bg-gray-800"
        />
        <div>
          <Title level={3} className="!text-white !mb-1">
            提交新任务
          </Title>
          <Text className="text-gray-400">三步完成任务提交</Text>
        </div>
      </div>

      <Card className="bg-[#1f1f1f] border-gray-700">
        <Steps
          current={currentStep}
          items={steps}
          className="mb-8"
          labelPlacement="vertical"
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleNext}
          disabled={creating || running}
        >
          {renderStepContent()}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0 || creating || running}
              icon={<ArrowLeft size={16} />}
            >
              上一步
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="primary" htmlType="submit" icon={<ChevronRight size={16} />}>
                下一步
              </Button>
            ) : (
              <Space>
                <Button onClick={() => handleSubmit(false)} loading={creating}>
                  保存为草稿
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleSubmit(true)}
                  loading={creating || running}
                  icon={<PlayCircle size={16} />}
                >
                  立即运行
                </Button>
              </Space>
            )}
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default TaskCreatePage;
