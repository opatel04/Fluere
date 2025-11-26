'use client';

import { useState, useEffect, useMemo } from 'react';
import { useClients } from '@/lib/api/queries/clients';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, AlertTriangle, Archive, Mail, Activity, Clock, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ClientsPage() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'at_risk' | 'churned' | undefined>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'last_contact' | 'health_score' | 'email_count'>('last_contact');

  // Fetch all clients (no server-side filtering)
  const { data: allClients, isLoading, error } = useClients({
    status: statusFilter,
    sortBy,
    sortOrder: 'desc',
  });

  // Instant client-side filtering (Google-level search)
  const clients = useMemo(() => {
    if (!allClients || !searchQuery.trim()) return allClients;

    const query = searchQuery.toLowerCase();
    return allClients.filter((client: any) => {
      const name = (client.name || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const company = (client.company || '').toLowerCase();

      return name.includes(query) || email.includes(query) || company.includes(query);
    });
  }, [allClients, searchQuery]);

  // Only show loading skeleton on initial load, not when switching tabs
  const isInitialLoading = isLoading && !allClients;

  if (isInitialLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
            <p className="text-slate-600 dark:text-white/50 text-base">Loading clients...</p>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>

        {/* Search & Sort Skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-11 flex-1 rounded-lg" />
          <Skeleton className="h-11 w-[200px] rounded-lg" />
        </div>

        {/* List Skeleton - Detailed shape matching */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  {/* Client name and email skeleton */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  {/* Stats skeleton */}
                  <div className="hidden md:flex items-center gap-6">
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Auto-detected from your emails</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-red-500 dark:border-red-500/20 rounded-xl p-8 shadow-lg">
          <p className="text-red-600 dark:text-red-400 font-medium">Error loading clients. Please try again later.</p>
        </div>
      </div>
    );
  }

  const activeClients = allClients?.filter((c: any) => c.status === 'active') || [];
  const atRiskClients = allClients?.filter((c: any) => c.status === 'at_risk') || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">
            {clients?.length || 0} {clients?.length === 1 ? 'client' : 'clients'} auto-detected from emails
          </p>
        </div>
      </div>

      {/* At-risk alert */}
      {atRiskClients.length > 0 && statusFilter === 'active' && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-500/5 dark:to-orange-500/5 border-2 border-yellow-400 dark:border-yellow-500/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                {atRiskClients.length} {atRiskClients.length === 1 ? 'Client' : 'Clients'} Need Attention
              </h3>
              <p className="text-sm text-slate-600 dark:text-white/60">
                These clients have low health scores. Consider following up soon.
              </p>
            </div>
            <Button
              onClick={() => setStatusFilter('at_risk')}
              variant="outline"
              className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600 font-semibold"
            >
              View At-Risk
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Search - Always visible */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <Tabs value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as any)}>
          <TabsList className="bg-white/90 dark:bg-black border-2 border-blue-500 dark:border-white/10">
            <TabsTrigger value="active" className="gap-2">
              <Users className="w-4 h-4" />
              Active ({activeClients.length})
            </TabsTrigger>
            <TabsTrigger value="at_risk" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              At Risk ({atRiskClients.length})
            </TabsTrigger>
            <TabsTrigger value="churned" className="gap-2">
              <Archive className="w-4 h-4" />
              Churned
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Sort */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search clients by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white dark:bg-black border-2 border-blue-500 dark:border-white/10"
              autoComplete="off"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[200px] bg-white dark:bg-black border-2 border-blue-500 dark:border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_contact">Recent Contact</SelectItem>
              <SelectItem value="health_score">Health Score</SelectItem>
              <SelectItem value="email_count">Email Volume</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Table */}
      {clients && clients.length > 0 ? (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-200 dark:divide-white/10">
            {clients.map((client: any) => {
              const healthScore = client.healthScore || 100;
              const emailCount = client.emailCount || 0;
              const taskCount = client.task_count || 0;

              const healthColor = (score: number) => {
                if (score >= 80) return 'text-green-600 dark:text-green-400';
                if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
                return 'text-red-600 dark:text-red-400';
              };

              const formatDate = (dateStr: string) => {
                const date = new Date(dateStr);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 0) return 'Today';
                if (diffDays === 1) return 'Yesterday';
                if (diffDays < 7) return `${diffDays}d ago`;
                if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              };

              return (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    {/* Client Name & Email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                          {client.name || client.email.split('@')[0]}
                        </h3>
                        {client.company && (
                          <span className="text-sm text-slate-500 dark:text-white/50">· {client.company}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-white/50 truncate">{client.email}</p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60">
                        <Mail className="w-4 h-4" />
                        <span>{emailCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60">
                        <CheckSquare className="w-4 h-4" />
                        <span>{taskCount}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-white/60">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(client.lastContactDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className={cn('w-4 h-4', healthColor(healthScore))} />
                        <span className={cn('font-semibold', healthColor(healthScore))}>
                          {healthScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-slate-200 dark:border-white/10 rounded-xl p-12 shadow-lg">
          <div className="text-center space-y-3">
            {/* Show different icons/messages based on the context */}
            {searchQuery ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                  <Search className="w-6 h-6 text-slate-400 dark:text-white/40" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-white/70">
                    No results for "{searchQuery}"
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                    Try a different search term
                  </p>
                </div>
              </>
            ) : statusFilter === 'at_risk' ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-white/70">
                    No at-risk clients
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                    All your clients are healthy!
                  </p>
                </div>
              </>
            ) : statusFilter === 'churned' ? (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                  <Archive className="w-6 h-6 text-slate-400 dark:text-white/40" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-white/70">
                    No churned clients
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                    You haven't lost any clients
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-700 dark:text-white/70">
                    No clients yet
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                    Process emails to auto-detect clients
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


