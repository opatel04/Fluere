import axios, { AxiosError, AxiosResponse } from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout to fail fast
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (or wherever it's stored)
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          // Check if we have a token stored
          if (parsed.state?.token) {
            config.headers.Authorization = `Bearer ${parsed.state.token}`;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors consistently
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Backend returns { success: true, data: ... } format
    return response;
  },
  (error: AxiosError) => {
    // Handle error responses
    if (error.response) {
      // Backend error format: { success: false, error: { message: ... } }
      const errorData = error.response.data as any;
      if (errorData?.error?.message) {
        error.message = errorData.error.message;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

