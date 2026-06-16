export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'leader' | 'member';
  full_name: string;
  avatar?: string;
  date_joined: string;
  last_login?: string;
  is_active: boolean;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  created_by: User;
  members: User[];
  created_at: string;
  updated_at: string;
  status: 'active' | 'archived' | 'completed';
  task_count: number;
}

export interface Task {
  id: number;
  name: string;
  description: string;
  project: Project;
  created_by: User;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'reviewing' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  parameters: Record<string, any>;
  schema_id?: number;
  progress: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  logs: TaskLog[];
  result_count: number;
}

export interface TaskLog {
  id: number;
  task_id: number;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export interface Result {
  id: number;
  task: Task;
  name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  data: Record<string, any>;
  created_at: string;
  visualizations: VisualizationConfig[];
}

export interface VisualizationConfig {
  id: number;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  title: string;
  x_field?: string;
  y_field?: string;
  data: any[];
}

export interface Notification {
  id: number;
  user: User;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  related_task_id?: number;
  related_project_id?: number;
}

export interface ParameterSchema {
  id: number;
  name: string;
  description: string;
  schema: JSONSchema;
  created_by: User;
  created_at: string;
  updated_at: string;
  is_public: boolean;
}

export interface JSONSchema {
  type: 'object';
  title?: string;
  description?: string;
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface ApiResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface TaskStats {
  total: number;
  running: number;
  completed: number;
  pending: number;
  failed: number;
}

export interface SystemSettings {
  cleanup_period: number;
  storage_quota: number;
  max_concurrent_tasks: number;
}
