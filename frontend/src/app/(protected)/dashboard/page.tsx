'use client';

import { useClients } from '@/lib/api/queries/clients';
import { usePendingTaskStats } from '@/lib/api/queries/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckSquare, Inbox, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data: clients, isLoading: clientsLoading } = useClients({ status: 'active' });
  const { data: allClients } = useClients();
  const { data: taskStats, isLoading: tasksLoading } = usePendingTaskStats();

  const isLoading = clientsLoading || tasksLoading;

  const activeClients = clients?.filter((c: any) => c.status === 'active') || [];
  const atRiskClients = allClients?.filter((c: any) => c.status === 'at_risk') || [];
  const totalPendingTasks = taskStats?.pending || 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Welcome back! Here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-white/50 text-base">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Clients */}
        <Link href="/clients">
          <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Active Clients</h2>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-slate-800 dark:text-white">{activeClients.length}</p>
                {atRiskClients.length > 0 && (
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">{atRiskClients.length} at risk</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Pending Tasks */}
        <Link href="/tasks">
          <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                  <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Pending Tasks</h2>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-bold text-slate-800 dark:text-white">{totalPendingTasks}</p>
                {totalPendingTasks > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                    <span className="text-sm font-medium">Review needed</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Approved Tasks */}
        <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Approved Tasks</h2>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold text-slate-800 dark:text-white">{taskStats?.approved || 0}</p>
              {taskStats?.approved ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Sent to Trello</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions / Recent Clients */}
      {activeClients.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Recent Clients</h2>
              <Link href="/clients" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeClients.slice(0, 6).map((client: any) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <div className="p-4 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-white/10 rounded-lg transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800 dark:text-white truncate">
                          {client.name || client.email.split('@')[0]}
                        </p>
                        <span className={cn(
                          'text-xs font-bold',
                          client.healthScore >= 80 ? 'text-green-600 dark:text-green-400' :
                            client.healthScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                        )}>
                          {client.healthScore}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-white/50 truncate">{client.email}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60">
                        <span>{client.emailCount || 0} emails</span>
                        <span>•</span>
                        <span>{client.task_count || 0} tasks</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white/70">
                No clients detected yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                Process your emails to automatically detect and track clients
              </p>
            </div>
            <Link href="/automation">
              <button className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                Process Emails
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

