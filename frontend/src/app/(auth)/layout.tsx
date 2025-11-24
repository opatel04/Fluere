'use client';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:bg-black dark:grid-pattern-elegant relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}

