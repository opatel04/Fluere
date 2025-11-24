import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  date: string;
  client_id?: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  email_id: string;
  // AI-determined fields
  suggested_status?: 'open' | 'in_progress' | 'completed';
  suggested_priority?: 'low' | 'medium' | 'high';
  suggested_due_date?: string;
}

export interface ExtractTasksResponse {
  suggestions: AISuggestion[];
}

interface BackendEmailListResponse {
  success: true;
  data: {
    emails: any[];
    total: number;
    limit: number;
    offset: number;
  };
}

interface BackendEmailResponse {
  success: true;
  data: any;
}

export function useEmails(clientId?: string, status?: 'unread' | 'read' | 'archived') {
  return useQuery({
    queryKey: clientId ? ['emails', clientId, status] : ['emails', status],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (clientId) params.append('client_id', clientId);
        // Map frontend status to backend processing_status
        if (status) {
          const backendStatus = status === 'unread' ? 'pending' : 
                               status === 'read' ? 'processed' : 
                               status;
          params.append('status', backendStatus);
        }

        const response = await apiClient.get<BackendEmailListResponse>(`/emails/inbound?${params.toString()}`);
        
        // Backend returns { success: true, data: { emails: [...], total, limit, offset } }
        // Transform to match frontend expectations
        return response.data.data.emails.map((email: any) => ({
          id: email.id,
          subject: email.subject || email.subject_line || '',
          body: email.body || email.body_text || email.html_body || '',
          from: email.from_email || email.from || email.from_name || '',
          to: email.to_email || email.to || '',
          date: email.received_at || email.created_at || email.date,
          client_id: email.client_id,
          status: email.processing_status === 'pending' ? 'unread' : 
                  email.processing_status === 'processed' ? 'read' : 
                  email.status || 'unread',
          created_at: email.created_at || email.date,
          updated_at: email.updated_at || email.processed_at || email.created_at,
        }));
      } catch (error: any) {
        // Return empty array on connection/network errors to show empty state
        // This handles: backend not running, network issues, timeouts, server errors
        const isNetworkError = !error.response || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ERR_NETWORK';
        const isServerError = error.response?.status >= 500;
        const isNotFound = error.response?.status === 404 || error.response?.status === 501;

        if (isNetworkError || isServerError || isNotFound) {
          return [];
        }
        throw error;
      }
    },
  });
}

export function useEmail(id: string) {
  return useQuery({
    queryKey: ['emails', id],
    queryFn: async () => {
      const response = await apiClient.get<BackendEmailResponse>(`/emails/inbound/${id}`);
      
      // Backend returns { success: true, data: { ...email data } }
      const email = response.data.data;
      
      // Transform to match frontend expectations
      return {
        id: email.id,
        subject: email.subject || email.subject_line || '',
        body: email.body || email.body_text || email.html_body || '',
        from: email.from_email || email.from || email.from_name || '',
        to: email.to_email || email.to || '',
        date: email.received_at || email.created_at || email.date,
        client_id: email.client_id,
        status: email.processing_status === 'pending' ? 'unread' : 
                email.processing_status === 'processed' ? 'read' : 
                email.status || 'unread',
        created_at: email.created_at || email.date,
        updated_at: email.updated_at || email.processed_at || email.created_at,
      };
    },
    enabled: !!id,
  });
}

export function useExtractTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailBody, emailSubject }: { emailBody: string; emailSubject?: string }) => {
      // Call the AI extract-manual endpoint with email content
      try {
        const textContent = emailSubject
          ? `Subject: ${emailSubject}\n\n${emailBody}`
          : emailBody;

        const response = await apiClient.post<{
          success: true;
          data: {
            tasks: Array<{
              id: string;
              title: string;
              description?: string;
              dueDate?: string;
              priority?: string;
            }>;
            confidence: number;
          }
        }>('/ai/extract-manual', {
          text: textContent,
          context: 'email',
        });

        // Transform to match AISuggestion format
        const suggestions: AISuggestion[] = response.data.data.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          confidence: response.data.data.confidence,
          email_id: '',
          suggested_priority: task.priority as 'low' | 'medium' | 'high' | undefined,
          suggested_due_date: task.dueDate,
        }));

        return { suggestions };
      } catch (error: any) {
        // If endpoint fails, return empty suggestions
        console.error('Extract tasks error:', error);
        return { suggestions: [] };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}

export function useUpdateEmailStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Email['status'] }) => {
      // Backend endpoint: PATCH /api/v1/emails/inbound/:id
      // Map frontend status to backend processing_status
      const backendStatus = status === 'unread' ? 'pending' : 
                           status === 'read' ? 'processed' : 
                           status;
      
      const response = await apiClient.patch<BackendEmailResponse>(
        `/emails/inbound/${id}`,
        { status: backendStatus }
      );
      
      const email = response.data.data;
      
      // Transform back to frontend format
      return {
        id: email.id,
        subject: email.subject || email.subject_line || '',
        body: email.body || email.body_text || email.html_body || '',
        from: email.from_email || email.from || email.from_name || '',
        to: email.to_email || email.to || '',
        date: email.received_at || email.created_at || email.date,
        client_id: email.client_id,
        status: email.processing_status === 'pending' ? 'unread' : 
                email.processing_status === 'processed' ? 'read' : 
                email.status || 'unread',
        created_at: email.created_at || email.date,
        updated_at: email.updated_at || email.processed_at || email.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });
}
