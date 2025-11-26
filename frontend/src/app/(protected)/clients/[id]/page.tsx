'use client';

import { useClient, useClientTasks, useClientEmails, useClientHeatmap, useClientSummary } from '@/lib/api/queries/clients';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, ExternalLink } from 'lucide-react';
import { TaskCard } from '@/app/(protected)/tasks/page';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ActivityHeatmap } from '@/components/clients/activity-heatmap';
import { ClientSummary } from '@/components/clients/client-summary';

export default function ClientPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { data: client, isLoading: clientLoading, error } = useClient(clientId);
  const { data: tasks, isLoading: tasksLoading } = useClientTasks(clientId);
  const { data: emails, isLoading: emailsLoading } = useClientEmails(clientId);
  const { data: heatmapData, isLoading: heatmapLoading } = useClientHeatmap(clientId);
  const { data: summaryData, isLoading: summaryLoading } = useClientSummary(clientId);

  if (clientLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Client not found</h2>
          <Link href="/clients" className="text-blue-600 hover:underline mt-2 inline-block">
            Return to Clients
          </Link>
        </div>
      </div>
    );
  }

  const config = {
    label: client.status === 'active' ? 'Active' : client.status === 'at_risk' ? 'At Risk' : 'Churned',
    className: client.status === 'active'
      ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
      : client.status === 'at_risk'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/clients"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{client.name || client.email}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{client.email}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Client Information Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Overview</h2>
          </div>

          <ClientSummary
            summary={summaryData?.summary}
            isLoading={summaryLoading}
            className="mb-6"
          />

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-6">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Status</p>
                    <Badge className={cn('font-semibold', config.className)}>
                      {config.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Health Score</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-white">{client.health_score}%</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Email</p>
                    <p className="text-slate-800 dark:text-white">{client.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-white/60 mb-1">Client ID</p>
                    <p className="text-slate-800 dark:text-white font-mono text-sm">{client.id}</p>
                  </div>
                </div>
              </div>

              {/* Activity Heatmap */}
              <div>
                <h3 className="text-sm font-medium text-slate-600 dark:text-white/60 mb-4">Activity (Last 365 Days)</h3>
                {heatmapLoading ? (
                  <Skeleton className="h-[140px] w-full" />
                ) : (
                  <ActivityHeatmap data={heatmapData || []} />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tasks Section */}
        {(tasksLoading || (tasks && tasks.length > 0)) && (
          <section className="space-y-4">
            {tasksLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} clientName={client.name} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Emails Section */}
        <section className="space-y-4">
          {emailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="space-y-4">
              {emails.map((email) => {
                const date = new Date(email.date);
                const isValidDate = !isNaN(date.getTime());
                const dateStr = isValidDate ? date.toLocaleDateString() : 'Unknown date';
                const timeStr = isValidDate ? date.toLocaleTimeString() : '';

                return (
                  <div key={email.id} className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-slate-800 dark:text-white">{email.subject}</h3>
                        <p className="text-sm text-slate-500 dark:text-white/50">
                          {dateStr} {timeStr && `• ${timeStr}`}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-white/70 line-clamp-2 mt-2">
                          {(email.body || '').replace(/<[^>]+>/g, '').substring(0, 200)}...
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-2"
                        onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${email.id}`, '_blank')}
                      >
                        <Mail className="w-4 h-4" />
                        View in Gmail
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
              <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
                <div className="text-center space-y-2">
                  <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No emails yet</p>
                  <p className="text-slate-500 dark:text-white/30 text-xs">Emails for this client will appear here</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
