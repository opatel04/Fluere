'use client';

import { Client } from '@/lib/api/queries/clients';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Mail, CheckSquare, Clock, TrendingDown, Activity } from 'lucide-react';

interface ClientCardProps {
  client: Client & {
    task_count?: number;
    completed_task_count?: number;
    overdue_task_count?: number;
  };
}

export function ClientCard({ client }: ClientCardProps) {
  const statusConfig = {
    active: {
      className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
      label: 'Active',
    },
    at_risk: {
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
      label: 'At Risk',
    },
    churned: {
      className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      label: 'Churned',
    },
  };

  const healthScoreColor = (score: number) => {
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

  const config = statusConfig[client.status];
  const healthScore = client.healthScore || 100;
  const emailCount = client.emailCount || 0;
  const taskCount = client.task_count || 0;
  const overdueCount = client.overdue_task_count || 0;

  return (
    <Link href={`/clients/${client.id}`}>
      <div className="group relative bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg hover:shadow-xl hover:border-blue-600 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-1">
        {/* Header */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                {client.name || client.email.split('@')[0]}
              </h3>
              {client.company && (
                <p className="text-sm text-slate-600 dark:text-white/60 truncate">{client.company}</p>
              )}
            </div>
            <Badge className={cn('font-semibold shrink-0 ml-2', config.className)}>
              {config.label}
            </Badge>
          </div>

          <p className="text-sm text-slate-500 dark:text-white/50 truncate">{client.email}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-600 dark:text-white/60">
              {emailCount} {emailCount === 1 ? 'email' : 'emails'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-600 dark:text-white/60">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-600 dark:text-white/60 truncate">
              {formatDate(client.lastContactDate)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Activity className={cn('w-4 h-4 shrink-0', healthScoreColor(healthScore))} />
            <span className={cn('font-semibold', healthScoreColor(healthScore))}>
              {healthScore}% health
            </span>
          </div>
        </div>

        {/* Alerts */}
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {overdueCount} overdue {overdueCount === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        )}

        {/* Health indicator for at-risk clients */}
        {healthScore < 60 && overdueCount === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg">
            <TrendingDown className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Needs attention
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}


