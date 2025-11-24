'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Auto-login for development
async function devAutoLogin(login: (user: any, token: string) => void) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const res = await fetch(`${apiUrl}/auth/test-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '8946091a-009e-403f-b5da-b3b44303f41c' }),
    });
    const data = await res.json();
    if (data.success && data.data.token) {
      login(
        { id: data.data.userId, name: 'Test User', email: 'test@example.com' },
        data.data.token
      );
      return true;
    }
  } catch (e) {
    console.error('Auto-login failed:', e);
  }
  return false;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, login } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-login in development
  useEffect(() => {
    if (mounted && !isAuthenticated && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      devAutoLogin(login).then((success) => {
        if (!success) {
          router.push('/login');
        }
      });
    }
  }, [mounted, isAuthenticated, autoLoginAttempted, login, router]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-black text-slate-800 dark:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-black dark:grid-pattern-elegant">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

