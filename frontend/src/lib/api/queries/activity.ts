import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  createdAt: string;
}

interface ActivityListResponse {
  success: true;
  data: ActivityLog[];
  meta?: {
    count: number;
  };
}

interface ActivityStatsResponse {
  success: true;
  data: {
    total: number;
    byType: Record<string, number>;
    recentFailures: number;
  };
}

interface ActivityTimelineResponse {
  success: true;
  data: {
    date: string;
    activities: ActivityLog[];
  }[];
}

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ActivityListResponse>('/activity');
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

export function useActivityStats() {
  return useQuery({
    queryKey: ['activities', 'stats'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ActivityStatsResponse>('/activity/stats');
        return response.data.data;
      } catch (error: any) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return { total: 0, byType: {}, recentFailures: 0 };
        }
        if (error.response?.status === 404 || error.response?.status === 501) {
          return { total: 0, byType: {}, recentFailures: 0 };
        }
        throw error;
      }
    },
  });
}

export function useActivityTimeline() {
  return useQuery({
    queryKey: ['activities', 'timeline'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<ActivityTimelineResponse>('/activity/timeline');
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

export function useRecentFailures() {
  return useQuery({
    queryKey: ['activities', 'failures'],
    queryFn: async () => {
      const response = await apiClient.get<ActivityListResponse>('/activity/failures');
      return response.data.data;
    },
  });
}

