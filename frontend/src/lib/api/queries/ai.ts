import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';

export interface SuggestedTask {
  id: string;
  title: string;
  description: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels?: string[];
  suggestedBoard?: { id: string; name: string };
  suggestedList?: { id: string; name: string; boardId: string; boardName: string };
  status: 'suggested' | 'accepted' | 'rejected';
  // Source tracking
  emailId?: string;
  emailSubject?: string;
}

export interface ExtractTasksResponse {
  tasks: SuggestedTask[];
  availableBoards?: Array<{
    id: string;
    name: string;
    lists: Array<{ id: string; name: string }>;
  }>;
  availableClients?: Array<{ id: string; name: string; email: string }>;
  context: string;
  confidence: number;
}

export interface AcceptTaskInput {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  boardId?: string;
  listId?: string;
  clientId?: string;
  labels?: string[];
}

// Extract tasks from text/email content
export function useExtractTasksFromText() {
  return useMutation({
    mutationFn: async ({
      text,
      context = 'email',
    }: {
      text: string;
      context?: 'email' | 'meeting_notes' | 'general_notes' | 'chat';
    }) => {
      try {
        const response = await apiClient.post<{
          success: true;
          data: ExtractTasksResponse;
        }>('/ai/extract-manual', { text, context });

        return response.data.data;
      } catch (error: any) {
        // Return empty on error
        console.error('Extract tasks error:', error);
        return {
          tasks: [],
          context,
          confidence: 0,
        } as ExtractTasksResponse;
      }
    },
  });
}

// Accept selected tasks - creates them in DB and optionally sends to Trello
export function useAcceptTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tasks: AcceptTaskInput[]) => {
      const response = await apiClient.post<{
        success: true;
        data: {
          created: number;
          tasks: Array<{ id: string; title: string }>;
        };
      }>('/ai/accept-tasks', { tasks });

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

// Reject tasks - logs rejection for analytics
export function useRejectTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskIds,
      reason,
    }: {
      taskIds: string[];
      reason?: string;
    }) => {
      const response = await apiClient.post<{
        success: true;
        data: { rejected: number };
      }>('/ai/reject-tasks', { taskIds, reason });

      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
  });
}

// Edit a suggestion before accepting
export function useEditSuggestion() {
  return useMutation({
    mutationFn: async ({
      tempId,
      updates,
    }: {
      tempId: string;
      updates: Partial<AcceptTaskInput>;
    }) => {
      const response = await apiClient.put<{
        success: true;
        data: { task: SuggestedTask };
      }>(`/ai/edit-suggestion/${tempId}`, updates);

      return response.data.data.task;
    },
  });
}

// Get pending approvals (tasks extracted but not yet accepted/rejected)
export function usePendingApprovals() {
  return useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      try {
        // This would fetch from a pending_suggestions table or queue
        // For now, return empty array - suggestions are stored in frontend state
        const response = await apiClient.get<{
          success: true;
          data: { suggestions: SuggestedTask[] };
        }>('/ai/pending-suggestions');

        return response.data.data.suggestions;
      } catch (error: any) {
        // If endpoint doesn't exist, return empty
        if (error.response?.status === 404 || error.response?.status === 501) {
          return [];
        }
        return [];
      }
    },
    staleTime: 30000, // 30 seconds
  });
}
