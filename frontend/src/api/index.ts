import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/utils/constants';
import {
  User,
  Project,
  Task,
  Result,
  Notification,
  ParameterSchema,
  LoginRequest,
  LoginResponse,
  ApiResponse,
  TaskStats,
  SystemSettings,
} from '@/types';

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Project',
    'Task',
    'Result',
    'Notification',
    'Schema',
    'Stats',
    'Settings',
  ],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login/',
        method: 'POST',
        body: credentials,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout/',
        method: 'POST',
      }),
    }),

    getCurrentUser: builder.query<User, void>({
      query: () => '/auth/me/',
      providesTags: ['User'],
    }),

    getUsers: builder.query<ApiResponse<User>, { page?: number; page_size?: number; search?: string }>({
      query: (params) => ({
        url: '/users/',
        params,
      }),
      providesTags: ['User'],
    }),

    getUser: builder.query<User, number>({
      query: (id) => `/users/${id}/`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),

    createUser: builder.mutation<User, Partial<User>>({
      query: (data) => ({
        url: '/users/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateUser: builder.mutation<User, { id: number; data: Partial<User> }>({
      query: ({ id, data }) => ({
        url: `/users/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),

    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/users/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    getProjects: builder.query<ApiResponse<Project>, { page?: number; page_size?: number; search?: string; status?: string }>({
      query: (params) => ({
        url: '/projects/',
        params,
      }),
      providesTags: ['Project'],
    }),

    getProject: builder.query<Project, number>({
      query: (id) => `/projects/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, Partial<Project>>({
      query: (data) => ({
        url: '/projects/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Project'],
    }),

    updateProject: builder.mutation<Project, { id: number; data: Partial<Project> }>({
      query: ({ id, data }) => ({
        url: `/projects/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),

    deleteProject: builder.mutation<void, number>({
      query: (id) => ({
        url: `/projects/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project'],
    }),

    getTasks: builder.query<ApiResponse<Task>, {
      page?: number;
      page_size?: number;
      search?: string;
      status?: string;
      priority?: string;
      project?: number;
    }>({
      query: (params) => ({
        url: '/tasks/',
        params,
      }),
      providesTags: ['Task'],
    }),

    getTask: builder.query<Task, number>({
      query: (id) => `/tasks/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Task', id }],
    }),

    createTask: builder.mutation<Task, Partial<Task>>({
      query: (data) => ({
        url: '/tasks/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Task'],
    }),

    updateTask: builder.mutation<Task, { id: number; data: Partial<Task> }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    deleteTask: builder.mutation<void, number>({
      query: (id) => ({
        url: `/tasks/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task'],
    }),

    runTask: builder.mutation<Task, number>({
      query: (id) => ({
        url: `/tasks/${id}/run/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Task', id }],
    }),

    approveTask: builder.mutation<Task, { id: number; comment?: string }>({
      query: ({ id, comment }) => ({
        url: `/tasks/${id}/approve/`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    rejectTask: builder.mutation<Task, { id: number; comment: string }>({
      query: ({ id, comment }) => ({
        url: `/tasks/${id}/reject/`,
        method: 'POST',
        body: { comment },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
    }),

    getTaskLogs: builder.query<ApiResponse<Task['logs'][0]>, { taskId: number; page?: number; page_size?: number }>({
      query: ({ taskId, ...params }) => ({
        url: `/tasks/${taskId}/logs/`,
        params,
      }),
    }),

    getResults: builder.query<ApiResponse<Result>, { page?: number; page_size?: number; search?: string; task?: number }>({
      query: (params) => ({
        url: '/results/',
        params,
      }),
      providesTags: ['Result'],
    }),

    getResult: builder.query<Result, number>({
      query: (id) => `/results/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Result', id }],
    }),

    downloadResult: builder.query<Blob, number>({
      query: (id) => ({
        url: `/results/${id}/download/`,
        responseHandler: (response) => response.blob(),
      }),
    }),

    getNotifications: builder.query<ApiResponse<Notification>, { page?: number; page_size?: number; read?: boolean; type?: string }>({
      query: (params) => ({
        url: '/notifications/',
        params,
      }),
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<Notification, number>({
      query: (id) => ({
        url: `/notifications/${id}/read/`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),

    markAllNotificationsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all/',
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),

    getSchemas: builder.query<ApiResponse<ParameterSchema>, { page?: number; page_size?: number; search?: string; is_public?: boolean }>({
      query: (params) => ({
        url: '/schemas/',
        params,
      }),
      providesTags: ['Schema'],
    }),

    getSchema: builder.query<ParameterSchema, number>({
      query: (id) => `/schemas/${id}/`,
      providesTags: (result, error, id) => [{ type: 'Schema', id }],
    }),

    createSchema: builder.mutation<ParameterSchema, Partial<ParameterSchema>>({
      query: (data) => ({
        url: '/schemas/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Schema'],
    }),

    updateSchema: builder.mutation<ParameterSchema, { id: number; data: Partial<ParameterSchema> }>({
      query: ({ id, data }) => ({
        url: `/schemas/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Schema', id }],
    }),

    deleteSchema: builder.mutation<void, number>({
      query: (id) => ({
        url: `/schemas/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Schema'],
    }),

    getTaskStats: builder.query<TaskStats, { project_id?: number }>({
      query: (params) => ({
        url: '/tasks/stats/',
        params,
      }),
      providesTags: ['Stats'],
    }),

    getTaskTrends: builder.query<{ date: string; count: number; status: string }[], { days?: number; project_id?: number }>({
      query: (params) => ({
        url: '/tasks/trends/',
        params,
      }),
      providesTags: ['Stats'],
    }),

    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => '/system/settings/',
      providesTags: ['Settings'],
    }),

    updateSystemSettings: builder.mutation<SystemSettings, Partial<SystemSettings>>({
      query: (data) => ({
        url: '/system/settings/',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useRunTaskMutation,
  useApproveTaskMutation,
  useRejectTaskMutation,
  useGetTaskLogsQuery,
  useGetResultsQuery,
  useGetResultQuery,
  useDownloadResultQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetSchemasQuery,
  useGetSchemaQuery,
  useCreateSchemaMutation,
  useUpdateSchemaMutation,
  useDeleteSchemaMutation,
  useGetTaskStatsQuery,
  useGetTaskTrendsQuery,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} = apiSlice;
