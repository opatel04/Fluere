import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { aiApiClient } from '../client';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  client_id?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  // Optional: track where task came from
  source?: 'email' | 'manual';
  email_id?: string; // If created from email extraction
}

export interface CreateTaskInput {
  title: string;
  description: string;
  status?: 'open' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  client_id?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'open' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  client_id?: string;
  due_date?: string;
}

interface BackendTaskListResponse {
  success: true;
  data: {
    tasks?: Task[];
    message?: string;
  };
  meta?: {
    count: number;
  };
}

interface BackendTaskResponse {
  success: true;
  data: {
    task?: Task;
    message?: string;
  };
}

export function useTasks(clientId?: string) {
  return useQuery({
    queryKey: clientId ? ['tasks', clientId] : ['tasks'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (clientId) params.append('client_id', clientId);

      try {
        const response = await apiClient.get<BackendTaskListResponse>(`/tasks?${params.toString()}`);
        
        // Backend task routes are currently stubs
        // Handle both actual data and stub responses
        if (response.data.data.tasks) {
          return response.data.data.tasks.map((task: any) => ({
            ...task,
            // Ensure consistent field names
            client_id: task.client_id || task.clientId,
            due_date: task.due_date || task.dueDate,
            created_at: task.created_at || task.createdAt,
            updated_at: task.updated_at || task.updatedAt,
          }));
        }
        
        // If backend returns stub message, return empty array
        return [];
      } catch (error: any) {
        // If endpoint doesn't exist or returns error, return empty array
        if (error.response?.status === 404 || error.response?.status === 501) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      try {
        const response = await apiClient.get<BackendTaskResponse>(`/tasks/${id}`);
        
        // Backend task routes are currently stubs
        if (response.data.data.task) {
          const task = response.data.data.task as any;
          return {
            ...task,
            client_id: task.client_id || task.clientId,
            due_date: task.due_date || task.dueDate,
            created_at: task.created_at || task.createdAt,
            updated_at: task.updated_at || task.updatedAt,
          } as Task;
        }
        
        throw new Error('Task not found');
      } catch (error: any) {
        if (error.response?.status === 404 || error.response?.status === 501) {
          throw new Error('Task not found');
        }
        throw error;
      }
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      try {
        const response = await apiClient.post<BackendTaskResponse>('/tasks', data);
        
        if (response.data.data.task) {
          return response.data.data.task;
        }
        
        // If backend returns stub, create a mock task
        const newTask: Task = {
          id: `t_${Date.now()}`,
          title: data.title,
          description: data.description,
          status: data.status || 'open',
          priority: data.priority || 'medium',
          client_id: data.client_id || '',
          due_date: data.due_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return newTask;
      } catch (error: any) {
        // If endpoint doesn't exist, create a mock task
        if (error.response?.status === 404 || error.response?.status === 501) {
          const newTask: Task = {
            id: `t_${Date.now()}`,
            title: data.title,
            description: data.description,
            status: data.status || 'open',
            priority: data.priority || 'medium',
            client_id: data.client_id || '',
            due_date: data.due_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return newTask;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }) => {
      try {
        const response = await apiClient.put<BackendTaskResponse>(`/tasks/${id}`, data);
        
        if (response.data.data.task) {
          return response.data.data.task;
        }
        
        throw new Error('Task update failed');
      } catch (error: any) {
        // If endpoint doesn't exist, return the updated data
        if (error.response?.status === 404 || error.response?.status === 501) {
          // Return a mock updated task
          return {
            id,
            ...data,
            updated_at: new Date().toISOString(),
          } as Task;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(`/tasks/${id}`);
      } catch (error: any) {
        // If endpoint doesn't exist, just succeed silently
        if (error.response?.status === 404 || error.response?.status === 501) {
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// ============================================
// PENDING TASKS (Automation Queue)
// ============================================

export interface PendingTask {
  id: string;
  email_id?: string;
  email_subject?: string;
  email_from?: string;
  email_date?: string;
  gmail_link?: string; // Link to view email in Gmail
  client_id?: string; // Auto-detected client from email sender
  title: string;
  description?: string;
  snippet?: string; // Email snippet for preview (no AI needed)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  due_date?: string;
  estimated_time?: string;
  labels: string[];
  confidence?: number;
  extraction_source: 'automation' | 'manual';
  ai_processed?: boolean; // true after AI generates description
  status: 'pending' | 'approved' | 'rejected';
  approved_at?: string;
  rejected_at?: string;
  board_id?: string;
  list_id?: string;
  trello_card_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PendingTaskStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface PendingTaskListResponse {
  success: true;
  data: PendingTask[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface PendingTaskStatsResponse {
  success: true;
  data: PendingTaskStats;
}

interface PendingTaskResponse {
  success: true;
  data: PendingTask | { message: string; task: PendingTask; card?: any };
}

interface GenerateAndApproveResponse {
  success: true;
  data: {
    message: string;
    task: PendingTask;
    spec: {
      id: string;
      project_name: string;
      status: string;
      trello_card_id: string;
    };
    card: {
      id: string;
      name: string;
      url: string;
    };
  };
}

interface BulkApproveResponse {
  success: true;
  data: {
    approved: number;
    failed: number;
    cards: any[];
  };
}

interface BulkRejectResponse {
  success: true;
  data: {
    rejected: number;
    taskIds: string[];
  };
}

/**
 * Fetch pending tasks awaiting approval
 */
export function usePendingTasks(status: 'pending' | 'approved' | 'rejected' = 'pending') {
  return useQuery({
    queryKey: ['pending-tasks', status],
    queryFn: async () => {
      try {
        const response = await apiClient.get<PendingTaskListResponse>(
          `/tasks/pending?status=${status}&limit=100`
        );
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
          return [];
        }
        throw error;
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

/**
 * Fetch pending task statistics
 */
export function usePendingTaskStats() {
  return useQuery({
    queryKey: ['pending-tasks', 'stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<PendingTaskStatsResponse>('/tasks/pending/stats');
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
          return { pending: 0, approved: 0, rejected: 0, total: 0 };
        }
        throw error;
      }
    },
    refetchInterval: 10000,
  });
}

/**
 * Approve a single pending task (creates Trello card)
 */
export function useApprovePendingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, listId, boardId }: { taskId: string; listId: string; boardId?: string }) => {
      const response = await apiClient.post<PendingTaskResponse>(`/tasks/pending/${taskId}/approve`, {
        listId,
        boardId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['trello'] });
    },
  });
}

/**
 * Generate spec and approve task in one action (One-Click Workflow)
 */
export function useGenerateAndApprovePendingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, listId, boardId }: { taskId: string; listId: string; boardId?: string }) => {
      const response = await aiApiClient.post<GenerateAndApproveResponse>(`/tasks/pending/${taskId}/generate-and-approve`, {
        listId,
        boardId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['trello'] });
      queryClient.invalidateQueries({ queryKey: ['specs'] });
    },
  });
}

/**
 * Approve multiple pending tasks at once
 */
export function useApprovePendingTasksBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskIds, listId, boardId }: { taskIds: string[]; listId: string; boardId?: string }) => {
      const response = await apiClient.post<BulkApproveResponse>('/tasks/pending/approve-bulk', {
        taskIds,
        listId,
        boardId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['trello'] });
    },
  });
}

/**
 * Reject a single pending task
 */
export function useRejectPendingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiClient.post<PendingTaskResponse>(`/tasks/pending/${taskId}/reject`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    },
  });
}

/**
 * Reject multiple pending tasks at once
 */
export function useRejectPendingTasksBulk() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskIds: string[]) => {
      const response = await apiClient.post<BulkRejectResponse>('/tasks/pending/reject-bulk', {
        taskIds,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    },
  });
}

/**
 * Update a pending task before approval
 */
export function useUpdatePendingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: {
        title?: string;
        description?: string;
        priority?: string;
        category?: string;
        dueDate?: string;
        estimatedTime?: string;
        labels?: string[];
      };
    }) => {
      const response = await apiClient.put<PendingTaskResponse>(`/tasks/pending/${taskId}`, updates);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    },
  });
}

/**
 * Delete a pending task
 */
export function useDeletePendingTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      await apiClient.delete(`/tasks/pending/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    },
  });
}

/**
 * Generate AI description for a pending task (lazy loading)
 */
export function useGenerateTaskDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await aiApiClient.post<PendingTaskResponse>(`/tasks/pending/${taskId}/generate`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
    },
  });
}
