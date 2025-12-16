'use client';

import { useClient, useClientTasks, useClientEmails, useClientHeatmap, useClientSummary } from '@/lib/api/queries/clients';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ActivityHeatmap } from '@/components/clients/activity-heatmap';
import { ClientSummary } from '@/components/clients/client-summary';
import { ClientTimeline } from '@/components/clients/client-timeline';
import { PreviewModal } from '@/components/clients/preview-modal';
import { useState } from 'react';
import { Email, Task } from '@/lib/api/types';

export default function ClientPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { data: client, isLoading: clientLoading, error } = useClient(clientId);
  const { data: tasks, isLoading: tasksLoading } = useClientTasks(clientId);
  const { data: emails, isLoading: emailsLoading } = useClientEmails(clientId);
  const { data: heatmapData, isLoading: heatmapLoading } = useClientHeatmap(clientId);
  const { data: summaryData, isLoading: summaryLoading } = useClientSummary(clientId);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleViewEmail = (emailId: string) => {
    const email = emails?.find((e) => e.id === emailId);
    if (email) {
      setSelectedEmail(email);
      setSelectedTask(null);
      setPreviewOpen(true);
    }
  };

  const handleViewTask = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setSelectedEmail(null);
      setPreviewOpen(true);
    }
  };

  const handleViewThread = (item: any) => {
    // For now, just show the first email in the thread
    if (item.email) {
      handleViewEmail(item.email.id);
    }
  };

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

        {/* Timeline Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Activity Timeline</h2>
          </div>

          {tasksLoading || emailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <ClientTimeline
              emails={emails || []}
              tasks={tasks || []}
              onViewEmail={handleViewEmail}
              onViewTask={handleViewTask}
              onViewThread={handleViewThread}
            />
          )}
        </section>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedEmail(null);
          setSelectedTask(null);
        }}
        email={selectedEmail}
        task={selectedTask}
      />
    </div>
  );
}
