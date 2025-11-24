import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

export interface FollowUp {
  id: string;
  emailId: string;
  clientId: string;
  subject: string;
  from: string;
  lastContactDate: string;
  daysSinceContact: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'dismissed' | 'responded';
  createdAt: string;
}

interface FollowUpListResponse {
  success: true;
  data: FollowUp[];
  meta?: {
    count: number;
  };
}

interface FollowUpStatsResponse {
  success: true;
  data: {
    total: number;
    urgent: number;
    high: number;
    byStatus: Record<string, number>;
  };
}

export function useFollowUps(status?: string) {
  return useQuery({
    queryKey: ['follow-ups', status],
    queryFn: async () => {
      try {
        const params = status ? `?status=${status}` : '';
        const response = await apiClient.get<FollowUpListResponse>(`/follow-ups${params}`);
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return [];
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useUrgentFollowUps() {
  return useQuery({
    queryKey: ['follow-ups', 'urgent'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<FollowUpListResponse>('/follow-ups/urgent');
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return [];
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useFollowUpStats() {
  return useQuery({
    queryKey: ['follow-ups', 'stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<FollowUpStatsResponse>('/follow-ups/stats');
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return { total: 0, urgent: 0, high: 0, byStatus: {} };
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return { total: 0, urgent: 0, high: 0, byStatus: {} };
        }
        throw error;
      }
    },
  });
}

export function useFollowUp(id: string) {
  return useQuery({
    queryKey: ['follow-ups', id],
    queryFn: async () => {
      const response = await apiClient.get<{ success: true; data: FollowUp }>(`/follow-ups/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useDismissFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ success: true }>(`/follow-ups/${id}/dismiss`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });
}

export function useMarkFollowUpResponded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<{ success: true }>(`/follow-ups/${id}/respond`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });
}

export function useDetectFollowUps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<FollowUpListResponse>('/follow-ups/detect');
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    },
  });
}

