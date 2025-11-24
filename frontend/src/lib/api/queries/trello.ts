import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { useAuthStore } from '../../store/authStore';

export interface TrelloBoard {
  id: string;
  name: string;
  desc: string;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
  idBoard: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  idList: string;
}

interface CreateCardParams {
  name: string;
  desc?: string;
  idList: string;
  due?: string;
}

// Fetch all Trello boards
export function useTrelloBoards() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['trello-boards', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: TrelloBoard[];
        count: number;
      }>(`/trello/boards?userId=${user?.id}`);
      return response.data.data;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });
}

// Fetch lists for a board
export function useTrelloLists(boardId: string | null) {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['trello-lists', boardId, user?.id],
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: TrelloList[];
        count: number;
      }>(`/trello/boards/${boardId}/lists?userId=${user?.id}`);
      return response.data.data;
    },
    enabled: !!boardId && !!user?.id,
    staleTime: 60000,
  });
}

// Create a Trello card
export function useCreateTrelloCard() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateCardParams) => {
      const response = await apiClient.post<{
        success: boolean;
        data: { card: TrelloCard };
      }>('/trello/cards', {
        ...params,
        userId: user?.id,
      });
      return response.data.data.card;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-cards'] });
    },
  });
}

// Process tasks to Trello - create multiple cards
export function useProcessToTrello() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tasks,
      listId,
      emailSubject,
    }: {
      tasks: Array<{
        title: string;
        description?: string;
        suggested_priority?: string;
        suggested_due_date?: string;
      }>;
      listId: string;
      emailSubject?: string;
    }) => {
      const createdCards: TrelloCard[] = [];

      for (const task of tasks) {
        const desc = [
          task.description || '',
          '',
          `---`,
          `From email: ${emailSubject || 'Unknown'}`,
          task.suggested_priority ? `Priority: ${task.suggested_priority}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const response = await apiClient.post<{
          success: boolean;
          data: { card: TrelloCard };
        }>('/trello/cards', {
          name: task.title,
          desc,
          idList: listId,
          due: task.suggested_due_date,
          userId: user?.id,
        });

        createdCards.push(response.data.data.card);
      }

      return createdCards;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trello-cards'] });
    },
  });
}
