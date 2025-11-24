'use client';

import { useEffect, useState } from 'react';
import { useUIStore } from '@/lib/store/uiStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((state) => state.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

