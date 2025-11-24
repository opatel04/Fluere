'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, Mail, Settings, Zap, Activity, Bell, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/follow-ups', label: 'Follow-ups', icon: Bell },
  { href: '/automation', label: 'Automation', icon: Zap },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/queue', label: 'Queue', icon: Server },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isMobile?: boolean;
}

function SidebarContent({ isMobile = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-10 text-blue-600 dark:text-white tracking-tight">Fluere</h2>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200',
                isActive 
                  ? 'bg-blue-50 dark:bg-white/10 text-blue-700 dark:text-white shadow-md border-2 border-blue-500 dark:border-white/20' 
                  : 'text-slate-700 dark:text-white/60 hover:text-blue-700 dark:hover:text-white hover:bg-blue-50/60 dark:hover:bg-white/5'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-md dark:bg-black border-r-2 border-slate-300 dark:border-white/10 p-6 hidden md:block shadow-lg dark:shadow-none">
        <SidebarContent />
      </aside>

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 text-blue-600 dark:text-white hover:bg-blue-50 dark:hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 p-6">
          <SheetHeader>
            <SheetTitle className="text-left">
              <h2 className="text-2xl font-bold text-blue-600 dark:text-white tracking-tight">Fluere</h2>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-8">
            <SidebarContent isMobile={true} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

