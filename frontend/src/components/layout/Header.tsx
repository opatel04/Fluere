'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b-2 border-slate-300 dark:border-white/10 flex items-center justify-end gap-4 px-4 md:px-8 bg-white/80 backdrop-blur-md dark:bg-black shadow-sm dark:shadow-none md:ml-0 ml-16">
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="ring-2 ring-blue-500 dark:ring-white/10 hover:ring-blue-600 dark:hover:ring-white/20 transition-all shadow-md">
              <AvatarFallback className="bg-blue-100 dark:bg-white/10 text-blue-700 dark:text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-md dark:bg-black border-2 border-slate-300 dark:border-white/10 text-slate-800 dark:text-white shadow-xl rounded-lg">
          <div className="px-3 py-2.5 text-sm border-b-2 border-slate-300 dark:border-white/10">
            <p className="font-semibold text-slate-800 dark:text-white">{user?.name}</p>
            <p className="text-xs text-slate-600 dark:text-white/50 mt-0.5">{user?.email}</p>
          </div>
          <DropdownMenuItem onClick={handleLogout} className="text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10">
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

