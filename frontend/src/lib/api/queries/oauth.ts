import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../client';
import { useAuthStore } from '../../store/authStore';

// Types
interface OAuthStatusResponse {
  success: boolean;
  data: {
    connected: boolean;
    email?: string;
    username?: string;
    fullName?: string;
  };
}

interface OAuthConnectResponse {
  success: boolean;
  data: {
    authUrl: string;
  };
  message: string;
}

interface OAuthDisconnectResponse {
  success: boolean;
  message: string;
}

// Gmail OAuth Hooks
export function useGmailStatus() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['gmail-status', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<OAuthStatusResponse>(
        `/auth/gmail/status?userId=${user?.id}`
      );
      return response.data.data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useConnectGmail() {
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async () => {
      // userId is optional - backend will create user from Gmail if not provided
      const userId = user?.id || undefined;
      const url = userId ? `/auth/gmail/connect?userId=${userId}` : '/auth/gmail/connect';
      console.log('[Gmail OAuth] Making request to:', url);
      const response = await apiClient.get<OAuthConnectResponse>(url);
      console.log('[Gmail OAuth] Response:', response.data);
      return response.data.data;
    },
    onSuccess: (data) => {
      console.log('[Gmail OAuth] onSuccess called with:', data);
      // Redirect to Gmail OAuth URL
      if (data.authUrl) {
        console.log('[Gmail OAuth] Redirecting to:', data.authUrl);
        window.location.href = data.authUrl;
      } else {
        console.error('[Gmail OAuth] No authUrl in response!');
      }
    },
    onError: (error: any) => {
      console.error('[Gmail OAuth] Error:', error);
    },
  });
}

export function useDisconnectGmail() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<OAuthDisconnectResponse>(
        `/auth/gmail/disconnect`,
        { userId: user?.id }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate gmail status query
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
    },
  });
}

// Trello OAuth Hooks
export function useTrelloStatus() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['trello-status', user?.id],
    queryFn: async () => {
      const response = await apiClient.get<OAuthStatusResponse>(
        `/auth/trello/status?userId=${user?.id}`
      );
      return response.data.data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
  });
}

export function useConnectTrello() {
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('You must be logged in to connect Trello');
      }
      const returnUrl = `${window.location.origin}/settings?trello=callback`;
      const response = await apiClient.get<OAuthConnectResponse>(
        `/auth/trello/connect?userId=${user.id}&returnUrl=${encodeURIComponent(returnUrl)}`
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Redirect to Trello OAuth URL
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    },
    onError: (error: any) => {
      console.error('Trello connect error:', error);
    },
  });
}

export function useDisconnectTrello() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<OAuthDisconnectResponse>(
        `/auth/trello/disconnect`,
        { userId: user?.id }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate trello status query
      queryClient.invalidateQueries({ queryKey: ['trello-status'] });
    },
  });
}

// Handle Trello OAuth callback (token in URL fragment)
export function useTrelloCallback() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await apiClient.get<{ success: boolean; message: string }>(
        `/auth/trello/callback?token=${token}&state=${user?.id}`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate trello status query
      queryClient.invalidateQueries({ queryKey: ['trello-status'] });
    },
  });
}
