'use client';

import { useActivities, useActivityStats, useActivityTimeline } from '@/lib/api/queries/activity';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Activity, TrendingUp, AlertCircle, Clock } from 'lucide-react';
// Using native Date methods instead of date-fns

export default function ActivityPage() {
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: stats, isLoading: statsLoading } = useActivityStats();
  const { data: timeline, isLoading: timelineLoading } = useActivityTimeline();

  if (activitiesLoading || statsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Activity Logs</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">View your account activity and audit trail</p>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Activity Logs</h1>
        <p className="text-slate-600 dark:text-white/50 text-base">View your account activity and audit trail</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Total Activities</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.total || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">By Type</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(stats.byType || {}).slice(0, 3).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-white/60 capitalize">{type}</span>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold">
                    {count as number}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Recent Failures</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.recentFailures || 0}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {timelineLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : timeline && timeline.length > 0 ? (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6">Activity Timeline</h2>
          <div className="space-y-6">
            {timeline.map((day) => (
              <div key={day.date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 dark:text-white/40" />
                  <h3 className="text-sm font-semibold text-slate-600 dark:text-white/60">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                </div>
                <div className="ml-6 space-y-2">
                  {day.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50 dark:bg-white/5 border border-blue-200 dark:border-white/10"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{activity.action}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
                          {new Date(activity.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold text-xs">
                        {activity.resourceType}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
            <div className="text-center space-y-2">
              <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No activity yet</p>
              <p className="text-slate-500 dark:text-white/30 text-xs">Activity will appear here as it happens</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

