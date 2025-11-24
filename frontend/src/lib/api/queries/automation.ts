import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

interface AutomationStatus {
  enabled: boolean;
  lastProcessed?: string;
  totalProcessed?: number;
}

interface AutomationStatusResponse {
  success: true;
  data: AutomationStatus;
}

interface ProcessInboxResponse {
  success: true;
  data: {
    message: string;
    emailsEnqueued: number;
    estimatedTime?: string;
    jobs: string[];
    trackingUrl?: string;
  };
}

export function useAutomationStatus() {
  return useQuery({
    queryKey: ['automation', 'status'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AutomationStatusResponse>('/automation/status');
        return response.data.data;
      } catch (error: any) {
        // Return default status on connection errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return { enabled: false };
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return { enabled: false };
        }
        throw error;
      }
    },
  });
}

export function useProcessInbox() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<ProcessInboxResponse>('/automation/process-inbox');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

export function useEnableAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<AutomationStatusResponse>('/automation/enable');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

export function useDisableAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<AutomationStatusResponse>('/automation/disable');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}

