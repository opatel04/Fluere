import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../client';

export interface SortOption {
  value: string;
  label: string;
  description: string;
}

export interface FilterOption {
  value: string;
  label: string;
  description: string;
}

export interface Task {
  name: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate?: string;
  category?: string;
}

interface SortOptionsResponse {
  success: true;
  data: {
    sortOptions: SortOption[];
    filterOptions: FilterOption[];
  };
}

interface SortTasksResponse {
  success: true;
  data: {
    tasks: Task[];
    count: number;
    originalCount: number;
    sortBy: string;
    filters: string[];
  };
}

interface SortByChatResponse {
  success: true;
  data: {
    tasks: Task[];
    count: number;
    originalCount: number;
    explanation: string;
    sortCriteria: {
      sortBy: string;
      filters: string[];
      customLogic?: string;
    };
  };
}

export function useSortOptions() {
  return useQuery({
    queryKey: ['task-sort', 'options'],
    queryFn: async () => {
      const response = await apiClient.get<SortOptionsResponse>('/task-sort/options');
      return response.data.data;
    },
  });
}

export function useSortTasks() {
  return useMutation({
    mutationFn: async (params: {
      tasks: Task[];
      sortBy: string;
      filters: string[];
    }) => {
      const response = await apiClient.post<SortTasksResponse>('/task-sort/sort', params);
      return response.data.data;
    },
  });
}

export function useSortByChat() {
  return useMutation({
    mutationFn: async (params: {
      tasks: Task[];
      prompt: string;
    }) => {
      const response = await apiClient.post<SortByChatResponse>('/task-sort/sort/chat', params);
      return response.data.data;
    },
  });
}

