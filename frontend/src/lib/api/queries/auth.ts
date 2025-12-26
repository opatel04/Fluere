import { useMutation } from '@tanstack/react-query';
import apiClient from '../client';
import { useAuthStore } from '../../store/authStore';

interface LoginRequest {
  email: string;
  password: string;
}

interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

interface AuthResponse {
  success: true;
  data: {
    user: {
      id: string;
      name: string;
      email: string;
    };
    token: string;
  };
}

export function useLogin() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (data: LoginRequest) => {
      try {
        // Try real login endpoint first
        const response = await apiClient.post<AuthResponse>('/auth/login', data);
        
        if (response.data.success && response.data.data.token) {
          login(response.data.data.user, response.data.data.token);
          return response.data.data;
        }
        
        throw new Error('Login failed');
      } catch (error: any) {
        // If login endpoint doesn't exist, use test token endpoint for development
        if (error.response?.status === 404 || error.response?.status === 501) {
          // For development: use test token endpoint
          const testResponse = await apiClient.post<{
            success: true;
            data: {
              userId: string;
              token: string;
            };
          }>('/auth/test-token', {
            userId: undefined, // Let backend generate
          });
          
          if (testResponse.data.success && testResponse.data.data.token) {
            // Create a mock user object
            const mockUser = {
              id: testResponse.data.data.userId,
              name: data.email.split('@')[0],
              email: data.email,
            };
            login(mockUser, testResponse.data.data.token);
            return {
              user: mockUser,
              token: testResponse.data.data.token,
            };
          }
        }
        throw error;
      }
    },
  });
}

export function useSignup() {
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (data: SignupRequest) => {
      try {
        // Try real signup endpoint first
        const response = await apiClient.post<AuthResponse>('/auth/signup', data);
        
        if (response.data.success && response.data.data.token) {
          login(response.data.data.user, response.data.data.token);
          return response.data.data;
        }
        
        throw new Error('Signup failed');
      } catch (error: any) {
        // If signup endpoint doesn't exist, use test token endpoint for development
        if (error.response?.status === 404 || error.response?.status === 501) {
          // For development: use test token endpoint
          const testResponse = await apiClient.post<{
            success: true;
            data: {
              userId: string;
              token: string;
            };
          }>('/auth/test-token', {
            userId: undefined, // Let backend generate
          });
          
          if (testResponse.data.success && testResponse.data.data.token) {
            const mockUser = {
              id: testResponse.data.data.userId,
              name: data.name,
              email: data.email,
            };
            login(mockUser, testResponse.data.data.token);
            return {
              user: mockUser,
              token: testResponse.data.data.token,
            };
          }
        }
        throw error;
      }
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      logout();
    },
  });
}

