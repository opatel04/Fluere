import { useQuery } from '@tanstack/react-query';
import apiClient from '../client';

export interface Client {
  id: string;
  userId: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  emailCount: number;
  firstContactDate: string;
  lastContactDate: string;
  status: 'active' | 'at_risk' | 'churned';
  healthScore: number;
  healthUpdatedAt?: string;
  notes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

interface BackendClientResponse {
  success: true;
  data: Client[];
  meta?: {
    count: number;
    timestamp: string;
  };
}

interface BackendClientDetailResponse {
  success: true;
  data: {
    client: Client;
    tasks?: any[];
    emails?: any[];
    activity?: any[];
    stats?: any;
  };
}

export function useClients(filters?: {
  status?: 'active' | 'at_risk' | 'churned';
  minHealthScore?: number;
  maxHealthScore?: number;
  search?: string;
  sortBy?: 'name' | 'last_contact' | 'health_score' | 'email_count';
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.minHealthScore !== undefined) params.append('minHealthScore', filters.minHealthScore.toString());
        if (filters?.maxHealthScore !== undefined) params.append('maxHealthScore', filters.maxHealthScore.toString());
        if (filters?.search) params.append('search', filters.search);
        if (filters?.sortBy) params.append('sortBy', filters.sortBy);
        if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

        const response = await apiClient.get<BackendClientResponse>(`/clients?${params.toString()}`);
        
        // Backend listClients returns raw database rows with snake_case
        // Transform to camelCase to match frontend expectations
        return response.data.data.map((client: any) => ({
          id: client.id,
          userId: client.user_id || client.userId,
          email: client.email,
          name: client.name,
          company: client.company,
          phone: client.phone,
          emailCount: client.email_count || client.emailCount,
          firstContactDate: client.first_contact_date || client.firstContactDate,
          lastContactDate: client.last_contact_date || client.lastContactDate,
          status: client.status,
          healthScore: client.health_score || client.healthScore,
          healthUpdatedAt: client.health_updated_at || client.healthUpdatedAt,
          notes: client.notes,
          metadata: client.metadata,
          createdAt: client.created_at || client.createdAt,
          updatedAt: client.updated_at || client.updatedAt,
          // Also include snake_case versions for backward compatibility
          health_score: client.health_score || client.healthScore,
          email_count: client.email_count || client.emailCount,
          first_contact_date: client.first_contact_date || client.firstContactDate,
          last_contact_date: client.last_contact_date || client.lastContactDate,
          created_at: client.created_at || client.createdAt,
          updated_at: client.updated_at || client.updatedAt,
        }));
      } catch (error: any) {
        // Return empty array on connection errors to show empty state immediately
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const response = await apiClient.get<BackendClientDetailResponse>(`/clients/${id}`);
      
      // Backend returns { success: true, data: { client: Client (camelCase), ... } }
      const client = response.data.data.client;
      
      // Transform to match frontend expectations (include both camelCase and snake_case)
      return {
        ...client,
        // Include snake_case versions for backward compatibility
        health_score: client.healthScore,
        email_count: client.emailCount,
        first_contact_date: client.firstContactDate,
        last_contact_date: client.lastContactDate,
        created_at: client.createdAt,
        updated_at: client.updatedAt,
      };
    },
    enabled: !!id,
  });
}

