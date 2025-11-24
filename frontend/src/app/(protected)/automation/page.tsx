'use client';

import { useAutomationStatus, useProcessInbox, useEnableAutomation, useDisableAutomation } from '@/lib/api/queries/automation';
import { usePendingTaskStats } from '@/lib/api/queries/tasks';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RefreshCw, Zap, CheckCircle, XCircle, ListTodo, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AutomationPage() {
  const { data: status, isLoading } = useAutomationStatus();
  const { data: stats } = usePendingTaskStats();
  const processInbox = useProcessInbox();
  const enableAutomation = useEnableAutomation();
  const disableAutomation = useDisableAutomation();
  const { toast } = useToast();


  const handleProcessInbox = async () => {
    try {
      const result = await processInbox.mutateAsync();
      toast({
        title: 'Emails processed',
        description: `${result.emailsEnqueued} emails queued for processing. Tasks will appear in the approval queue.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to process inbox',
        variant: 'destructive',
      });
    }
  };

  const handleToggleAutomation = async () => {
    try {
      if (status?.enabled) {
        await disableAutomation.mutateAsync();
        toast({
          title: 'Success',
          description: 'Automation disabled',
        });
      } else {
        await enableAutomation.mutateAsync();
        toast({
          title: 'Success',
          description: 'Automation enabled',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to toggle automation',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Automation</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Automate email processing and task creation</p>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Automation</h1>
        <p className="text-slate-600 dark:text-white/50 text-base">Automate email processing and task creation</p>
      </div>

      {/* Status Card */}
      <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Automation Status</h2>
            <div className="flex items-center gap-2">
              {status?.enabled ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-semibold">
                    Active
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-slate-400 dark:text-white/40" />
                  <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 font-semibold">
                    Inactive
                  </Badge>
                </>
              )}
            </div>
          </div>
          <Button
            onClick={handleToggleAutomation}
            disabled={enableAutomation.isPending || disableAutomation.isPending}
            className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
          >
            {status?.enabled ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Disable
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Enable
              </>
            )}
          </Button>
        </div>

        {status?.lastProcessed && (
          <div className="space-y-2 text-sm text-slate-600 dark:text-white/60">
            <p>Last processed: {new Date(status.lastProcessed).toLocaleString()}</p>
            {status.totalProcessed !== undefined && (
              <p>Total processed: {status.totalProcessed} emails</p>
            )}
          </div>
        )}
      </div>

      {/* Pending Tasks Card */}
      {stats && stats.pending > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-500/5 dark:to-orange-500/5 border-2 border-yellow-400 dark:border-yellow-500/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-500/10 rounded-lg">
                <ListTodo className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                  {stats.pending} Tasks Pending Approval
                </h3>
                <p className="text-sm text-slate-600 dark:text-white/60">
                  Review and approve tasks before they are sent to Trello
                </p>
              </div>
            </div>
            <Link href="/tasks">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold">
                Review Tasks
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Process Inbox</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-white/60">
              Scan unread emails and extract tasks for approval
            </p>
            <Button
              onClick={handleProcessInbox}
              disabled={processInbox.isPending}
              className="w-full bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
            >
              {processInbox.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Process Now
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Auto-Processing</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-white/60">
              Automatically extract tasks from emails as they arrive
            </p>
            <div className="text-xs text-slate-500 dark:text-white/40">
              {status?.enabled
                ? 'New emails will be processed automatically and tasks added to approval queue'
                : 'Enable automation to start auto-processing emails'}
            </div>
          </div>
        </div>
      </div>

      {/* Link to Tasks */}
      <div className="text-center">
        <Link href="/tasks" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View all pending tasks for approval →
        </Link>
      </div>
    </div>
  );
}

