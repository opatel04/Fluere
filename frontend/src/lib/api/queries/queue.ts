import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueJob {
  id: string;
  name: string;
  data: any;
  opts: any;
  progress: number;
  delay: number;
  timestamp: number;
  attemptsMade: number;
  failedReason?: string;
  finishedOn?: number;
  processedOn?: number;
}

interface QueueStatusResponse {
  success: true;
  data: QueueStatus;
}

interface QueueJobsResponse {
  success: true;
  data: QueueJob[];
}

interface QueueJobDetailsResponse {
  success: true;
  data: QueueJob;
}

interface QueueStatsResponse {
  success: true;
  data: {
    total: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
  };
}

export function useQueueStatus() {
  return useQuery({
    queryKey: ['queue', 'status'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<QueueStatusResponse>('/queue/status');
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
        }
        throw error;
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useUserJobs(userId: string) {
  return useQuery({
    queryKey: ['queue', 'jobs', userId],
    queryFn: async () => {
      try {
        const response = await apiClient.get<QueueJobsResponse>(`/queue/jobs/user/${userId}`);
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
    enabled: !!userId,
    refetchInterval: 5000,
  });
}

export function useJobDetails(jobId: string) {
  return useQuery({
    queryKey: ['queue', 'jobs', jobId],
    queryFn: async () => {
      const response = await apiClient.get<QueueJobDetailsResponse>(`/queue/jobs/${jobId}/details`);
      return response.data.data;
    },
    enabled: !!jobId,
    refetchInterval: 5000,
  });
}

export function useUserQueueStats(userId: string) {
  return useQuery({
    queryKey: ['queue', 'stats', userId],
    queryFn: async () => {
      const response = await apiClient.get<QueueStatsResponse>(`/queue/stats/${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });
}

