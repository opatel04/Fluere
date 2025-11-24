# TaskSnap Frontend - Development Guide

A simplified, step-by-step guide to build the TaskSnap frontend application.

---

## 🎯 Overview

This guide is split into **6 phases**. Complete each phase before moving to the next. Each phase builds on the previous one.

**Estimated Time:** 2-3 weeks (depending on your pace)

---

## 📋 Prerequisites

Before starting:
- ✅ Node.js 18+ installed
- ✅ Basic knowledge of React, TypeScript, and Next.js
- ✅ Project dependencies installed (`npm install`)

---

## Phase 1: Project Setup & Foundation

**Goal:** Set up the basic structure and core utilities

**Time:** 2-3 hours

### Step 1.1: Install shadcn/ui Components

Install the essential UI components you'll need:

```bash
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add tabs
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add toast
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet
npx shadcn@latest add select
npx shadcn@latest add table
npx shadcn@latest add skeleton
```

**What this does:** Installs pre-built, accessible components you'll use throughout the app.

### Step 1.2: Set Up State Management (Zustand)

Create the auth store:

**File:** `src/lib/store/authStore.ts`
```typescript
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
```

Create the UI store:

**File:** `src/lib/store/uiStore.ts`
```typescript
import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

**What this does:** Sets up simple state management for authentication and UI (like sidebar open/closed).

### Step 1.3: Set Up TanStack Query

**File:** `src/app/providers.tsx`
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Update your root layout to use the provider:

**File:** `src/app/layout.tsx` (add Providers wrapper)
```typescript
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

**What this does:** Sets up data fetching with caching and automatic refetching.

### Step 1.4: Set Up API Client

**File:** `src/lib/api/client.ts`
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

**What this does:** Creates a reusable HTTP client for API calls.

### ✅ Phase 1 Checklist

- [ ] shadcn/ui components installed
- [ ] Auth store created
- [ ] UI store created
- [ ] TanStack Query provider set up
- [ ] API client created
- [ ] Root layout updated with Providers

**Next:** Move to Phase 2 when all checkboxes are done.

---

## Phase 2: Authentication & Layout

**Goal:** Build login/signup pages and the main app layout

**Time:** 4-6 hours

### Step 2.1: Create Auth Layout

**File:** `src/app/(auth)/layout.tsx`
```typescript
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
```

**What this does:** Creates a centered layout for login/signup pages.

### Step 2.2: Create Login Page

**File:** `src/app/(auth)/login/page.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    // TODO: Replace with actual API call
    // For now, just mock login
    login({
      id: '1',
      name: 'John Doe',
      email: data.email,
    });
    router.push('/dashboard');
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      <Input
        {...form.register('email')}
        type="email"
        placeholder="Email"
      />
      {form.formState.errors.email && (
        <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
      )}
      <Input
        {...form.register('password')}
        type="password"
        placeholder="Password"
      />
      {form.formState.errors.password && (
        <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
      )}
      <Button type="submit" className="w-full">Login</Button>
    </form>
  );
}
```

**What this does:** Creates a login form with validation. For now, it just stores the user in state.

### Step 2.3: Create Protected Layout

**File:** `src/app/(protected)/layout.tsx`
```typescript
'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**What this does:** Protects routes - redirects to login if not authenticated.

### Step 2.4: Create Sidebar Component

**File:** `src/components/layout/Sidebar.tsx`
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/emails', label: 'Emails', icon: Mail },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white p-4">
      <h2 className="text-xl font-bold mb-6">TaskSnap</h2>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg',
                isActive ? 'bg-gray-800' : 'hover:bg-gray-800'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Step 2.5: Create Header Component

**File:** `src/components/layout/Header.tsx`
```typescript
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

export function Header() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b flex items-center justify-end px-6">
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar>
            <AvatarFallback>
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

### Step 2.6: Create Dashboard Placeholder

**File:** `src/app/(protected)/dashboard/page.tsx`
```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p>Welcome to TaskSnap! This is your dashboard.</p>
    </div>
  );
}
```

### ✅ Phase 2 Checklist

- [ ] Auth layout created
- [ ] Login page created with form validation
- [ ] Protected layout created with auth check
- [ ] Sidebar component created
- [ ] Header component created
- [ ] Dashboard placeholder created
- [ ] Can login and see protected pages

**Next:** Move to Phase 3 when you can successfully log in and see the dashboard.

---

## Phase 3: Clients Module

**Goal:** Build the clients list and detail pages

**Time:** 6-8 hours

### Step 3.1: Create API Query Hooks

**File:** `src/lib/api/queries/clients.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface Client {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'at_risk' | 'churned';
  health_score: number;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const response = await apiClient.get<Client[]>('/clients');
      return response.data;
    },
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const response = await apiClient.get<Client>(`/clients/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}
```

**What this does:** Creates reusable hooks for fetching client data.

### Step 3.2: Create Client Components

**File:** `src/components/domain/ClientCard.tsx`
```typescript
import { Client } from '@/lib/api/queries/clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const statusColors = {
    active: 'bg-green-500',
    at_risk: 'bg-yellow-500',
    churned: 'bg-red-500',
  };

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>{client.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-2">{client.email}</p>
          <div className="flex items-center justify-between">
            <Badge className={statusColors[client.status]}>
              {client.status}
            </Badge>
            <span className="text-sm">Health: {client.health_score}%</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Step 3.3: Create Clients List Page

**File:** `src/app/(protected)/clients/page.tsx`
```typescript
'use client';

import { useClients } from '@/lib/api/queries/clients';
import { ClientCard } from '@/components/domain/ClientCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Clients</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading clients</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Clients</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients?.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}
```

### Step 3.4: Create Client Detail Page

**File:** `src/app/(protected)/clients/[id]/page.tsx`
```typescript
'use client';

import { useClient } from '@/lib/api/queries/clients';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: client, isLoading } = useClient(id);

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{client.name}</h1>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <div className="space-y-4">
            <p><strong>Email:</strong> {client.email}</p>
            <p><strong>Status:</strong> {client.status}</p>
            <p><strong>Health Score:</strong> {client.health_score}%</p>
          </div>
        </TabsContent>
        <TabsContent value="tasks">
          <p>Tasks will go here</p>
        </TabsContent>
        <TabsContent value="emails">
          <p>Emails will go here</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### ✅ Phase 3 Checklist

- [ ] Client query hooks created
- [ ] ClientCard component created
- [ ] Clients list page created
- [ ] Client detail page created with tabs
- [ ] Can view clients list
- [ ] Can click on client to see details

**Next:** Move to Phase 4 when clients module is working.

---

## Phase 4: Tasks Module

**Goal:** Build the tasks page with Kanban board

**Time:** 8-10 hours

### Step 4.1: Create Task Query Hooks

**File:** `src/lib/api/queries/tasks.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  client_id: string;
  due_date?: string;
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await apiClient.get<Task[]>('/tasks');
      return response.data;
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (task: Omit<Task, 'id'>) => {
      const response = await apiClient.post<Task>('/tasks', task);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...task }: Partial<Task> & { id: string }) => {
      const response = await apiClient.patch<Task>(`/tasks/${id}`, task);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Step 4.2: Create Task Components

**File:** `src/components/domain/TaskCard.tsx`
```typescript
import { Task } from '@/lib/api/queries/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-red-500',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{task.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        <Badge className={priorityColors[task.priority]}>
          {task.priority}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

### Step 4.3: Create Kanban Board

**File:** `src/components/domain/KanbanBoard.tsx`
```typescript
'use client';

import { Task } from '@/lib/api/queries/tasks';
import { TaskCard } from './TaskCard';
import { useUpdateTask } from '@/lib/api/queries/tasks';

interface KanbanBoardProps {
  tasks: Task[];
}

const columns = [
  { id: 'open', title: 'Open' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'completed', title: 'Completed' },
] as const;

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  const updateTask = useUpdateTask();

  const handleStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="flex gap-4 overflow-x-auto">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        return (
          <div key={column.id} className="flex-shrink-0 w-80">
            <h2 className="font-bold mb-4">
              {column.title} ({columnTasks.length})
            </h2>
            <div className="space-y-2">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### Step 4.4: Create Tasks Page

**File:** `src/app/(protected)/tasks/page.tsx`
```typescript
'use client';

import { useTasks } from '@/lib/api/queries/tasks';
import { KanbanBoard } from '@/components/domain/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TaskForm } from '@/components/domain/TaskForm';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksPage() {
  const { data: tasks, isLoading } = useTasks();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Tasks</h1>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Create Task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm />
          </DialogContent>
        </Dialog>
      </div>
      {tasks && <KanbanBoard tasks={tasks} />}
    </div>
  );
}
```

### Step 4.5: Create Task Form

**File:** `src/components/domain/TaskForm.tsx`
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/lib/api/queries/tasks';
import { useToast } from '@/hooks/use-toast';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  client_id: z.string().optional(),
});

export function TaskForm() {
  const createTask = useCreateTask();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'open' as const,
      priority: 'medium' as const,
      client_id: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof taskSchema>) => {
    try {
      await createTask.mutateAsync(data);
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input {...form.register('title')} placeholder="Task title" />
      <Input {...form.register('description')} placeholder="Description" />
      <Button type="submit" className="w-full">Create Task</Button>
    </form>
  );
}
```

### ✅ Phase 4 Checklist

- [ ] Task query hooks created
- [ ] TaskCard component created
- [ ] KanbanBoard component created
- [ ] Tasks page created
- [ ] TaskForm component created
- [ ] Can view tasks in Kanban board
- [ ] Can create new tasks

**Next:** Move to Phase 5 when tasks module is working.

---

## Phase 5: Email Module

**Goal:** Build email list and AI extraction flow

**Time:** 6-8 hours

### Step 5.1: Create Email Query Hooks

**File:** `src/lib/api/queries/emails.ts`
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

export interface Email {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  client_id: string;
  processed: boolean;
  created_at: string;
}

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
}

export function useEmails() {
  return useQuery({
    queryKey: ['emails'],
    queryFn: async () => {
      const response = await apiClient.get<Email[]>('/emails');
      return response.data;
    },
  });
}

export function useEmail(id: string) {
  return useQuery({
    queryKey: ['emails', id],
    queryFn: async () => {
      const response = await apiClient.get<Email>(`/emails/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useExtractTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (emailId: string) => {
      const response = await apiClient.post<AISuggestion[]>(
        `/ai/extract-manual`,
        { email_id: emailId }
      );
      return response.data;
    },
  });
}
```

### Step 5.2: Create Email Components

**File:** `src/components/domain/EmailCard.tsx`
```typescript
import { Email } from '@/lib/api/queries/emails';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface EmailCardProps {
  email: Email;
}

export function EmailCard({ email }: EmailCardProps) {
  return (
    <Link href={`/emails/${email.id}`}>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{email.subject}</CardTitle>
            {email.processed && <Badge>Processed</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">From: {email.from}</p>
          <p className="text-sm text-gray-500 mt-2 line-clamp-2">
            {email.body}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

### Step 5.3: Create Emails List Page

**File:** `src/app/(protected)/emails/page.tsx`
```typescript
'use client';

import { useEmails } from '@/lib/api/queries/emails';
import { EmailCard } from '@/components/domain/EmailCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmailsPage() {
  const { data: emails, isLoading } = useEmails();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Emails</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Emails</h1>
      <div className="space-y-4">
        {emails?.map((email) => (
          <EmailCard key={email.id} email={email} />
        ))}
      </div>
    </div>
  );
}
```

### Step 5.4: Create Email Detail Page with AI Extraction

**File:** `src/app/(protected)/emails/[id]/page.tsx`
```typescript
'use client';

import { useEmail, useExtractTasks } from '@/lib/api/queries/emails';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { AITaskSuggestion } from '@/components/domain/AITaskSuggestion';

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: email, isLoading } = useEmail(id);
  const extractTasks = useExtractTasks();
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleExtract = async () => {
    const result = await extractTasks.mutateAsync(id);
    setSuggestions(result);
  };

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!email) {
    return <div>Email not found</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{email.subject}</h1>
      <div className="mb-4">
        <p><strong>From:</strong> {email.from}</p>
        <p><strong>To:</strong> {email.to}</p>
      </div>
      <div className="mb-6">
        <Button onClick={handleExtract} disabled={extractTasks.isPending}>
          {extractTasks.isPending ? 'Extracting...' : 'Extract Tasks'}
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Suggested Tasks</h2>
          {suggestions.map((suggestion) => (
            <AITaskSuggestion key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Email Body</h2>
        <div dangerouslySetInnerHTML={{ __html: email.body }} />
      </div>
    </div>
  );
}
```

### Step 5.5: Create AI Task Suggestion Component

**File:** `src/components/domain/AITaskSuggestion.tsx`
```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AISuggestion } from '@/lib/api/queries/emails';
import { useCreateTask } from '@/lib/api/queries/tasks';
import { useToast } from '@/hooks/use-toast';

interface AITaskSuggestionProps {
  suggestion: AISuggestion;
}

export function AITaskSuggestion({ suggestion }: AITaskSuggestionProps) {
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleAccept = async () => {
    try {
      await createTask.mutateAsync({
        title: suggestion.title,
        description: suggestion.description,
        status: 'open',
        priority: 'medium',
      });
      toast({
        title: 'Success',
        description: 'Task created from suggestion',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{suggestion.title}</CardTitle>
          <span className="text-sm text-gray-500">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4">{suggestion.description}</p>
        <Button onClick={handleAccept}>Accept</Button>
      </CardContent>
    </Card>
  );
}
```

### ✅ Phase 5 Checklist

- [ ] Email query hooks created
- [ ] EmailCard component created
- [ ] Emails list page created
- [ ] Email detail page created
- [ ] AI extraction flow implemented
- [ ] AITaskSuggestion component created
- [ ] Can view emails and extract tasks

**Next:** Move to Phase 6 for final polish.

---

## Phase 6: Polish & Final Touches

**Goal:** Add loading states, error handling, and responsive design

**Time:** 4-6 hours

### Step 6.1: Add Loading States

Add loading skeletons to all pages that fetch data. Use the `Skeleton` component from shadcn/ui.

### Step 6.2: Add Error Handling

Add error boundaries and error messages:

**File:** `src/components/ErrorBoundary.tsx`
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p>Please refresh the page or contact support.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Step 6.3: Make Sidebar Responsive

Update the Sidebar to hide on mobile and show a hamburger menu:

**File:** `src/components/layout/Sidebar.tsx` (update)
- Add mobile menu toggle
- Hide sidebar on mobile (< 768px)
- Show Sheet component for mobile navigation

### Step 6.4: Add Toast Notifications

Make sure all actions show toast notifications:
- Task created
- Task updated
- Email processed
- Error messages

### Step 6.5: Test Responsive Design

Test all pages on:
- Mobile (< 768px)
- Tablet (768px - 1024px)
- Desktop (> 1024px)

### ✅ Phase 6 Checklist

- [ ] Loading states added everywhere
- [ ] Error handling implemented
- [ ] Responsive sidebar working
- [ ] Toast notifications working
- [ ] All pages tested on mobile/tablet/desktop
- [ ] App is fully functional

**Next:** You're done! 🎉

---

## 🎉 You're Done!

Your TaskSnap frontend should now be fully functional with:
- ✅ Authentication
- ✅ Protected routes
- ✅ Clients module
- ✅ Tasks module (Kanban)
- ✅ Email module with AI extraction
- ✅ Responsive design
- ✅ Error handling

---

## 📝 Next Steps (Optional)

If you want to go further:
1. Add more filtering/search functionality
2. Add drag & drop to Kanban board (using @dnd-kit)
3. Add pagination to lists
4. Add more detailed error messages
5. Add unit tests for critical components

---

## 🆘 Need Help?

If you get stuck:
1. Check the Next.js documentation
2. Check shadcn/ui component documentation
3. Check TanStack Query documentation
4. Review the code examples in this guide

Good luck! 🚀

