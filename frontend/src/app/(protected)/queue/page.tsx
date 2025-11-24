'use client';

import { useQueueStatus, useUserJobs } from '@/lib/api/queries/queue';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, XCircle, Clock, Play } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

export default function QueuePage() {
  const user = useAuthStore((state) => state.user);
  const { data: queueStatus, isLoading: statusLoading } = useQueueStatus();
  const { data: userJobs, isLoading: jobsLoading } = useUserJobs(user?.id || '');

  if (statusLoading || jobsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Queue Status</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Monitor background job processing</p>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Queue Status</h1>
        <p className="text-slate-600 dark:text-white/50 text-base">Monitor background job processing</p>
      </div>

      {/* Queue Status Cards */}
      {queueStatus && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Waiting</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{queueStatus.waiting || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Active</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{queueStatus.active || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-green-500 dark:border-green-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-50 dark:bg-green-500/10 rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Completed</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{queueStatus.completed || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-red-500 dark:border-red-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-lg shadow-sm">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Failed</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{queueStatus.failed || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-yellow-500 dark:border-yellow-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg shadow-sm">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Delayed</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{queueStatus.delayed || 0}</p>
          </div>
        </div>
      )}

      {/* User Jobs */}
      {userJobs && userJobs.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">Your Jobs</h2>
          <div className="space-y-4">
            {userJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-lg bg-blue-50/50 dark:bg-white/5 border border-blue-200 dark:border-white/10"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{job.name}</h3>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold text-xs">
                      {job.progress}%
                    </Badge>
                  </div>
                  {job.failedReason && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{job.failedReason}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                    Attempts: {job.attemptsMade} | Created: {new Date(job.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.finishedOn ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 font-semibold">
                      Completed
                    </Badge>
                  ) : job.failedReason ? (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 font-semibold">
                      Failed
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold">
                      Processing
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
            <div className="text-center space-y-2">
              <Activity className="w-8 h-8 text-slate-400 dark:text-white/40 mx-auto" />
              <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No jobs found</p>
              <p className="text-slate-500 dark:text-white/30 text-xs">Background jobs will appear here when processing emails</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

