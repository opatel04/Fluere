'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes (show cached data instantly)
            gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes (formerly cacheTime)
            retry: 1, // Only retry once (default is 3)
            retryDelay: 1000, // 1 second between retries (default is exponential backoff)
            refetchOnWindowFocus: false, // Don't refetch on window focus for faster UX
            refetchOnMount: false, // Don't refetch on mount if data exists (use cache)
            refetchOnReconnect: true, // Only refetch when reconnecting after being offline
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

