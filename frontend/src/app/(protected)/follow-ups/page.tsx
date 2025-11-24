'use client';

import { useFollowUps, useFollowUpStats, useUrgentFollowUps, useDismissFollowUp, useMarkFollowUpResponded, useDetectFollowUps } from '@/lib/api/queries/follow-ups';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Mail, AlertTriangle, CheckCircle, X, RefreshCw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function FollowUpsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data: followUps, isLoading } = useFollowUps(statusFilter);
  const { data: stats, isLoading: statsLoading } = useFollowUpStats();
  const { data: urgentFollowUps } = useUrgentFollowUps();
  const dismissFollowUp = useDismissFollowUp();
  const markResponded = useMarkFollowUpResponded();
  const detectFollowUps = useDetectFollowUps();
  const { toast } = useToast();

  const filteredFollowUps = statusFilter && followUps
    ? followUps.filter(f => f.status === statusFilter)
    : followUps;

  const handleDismiss = async (id: string) => {
    try {
      await dismissFollowUp.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Follow-up dismissed',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to dismiss follow-up',
        variant: 'destructive',
      });
    }
  };

  const handleMarkResponded = async (id: string) => {
    try {
      await markResponded.mutateAsync(id);
      toast({
        title: 'Success',
        description: 'Follow-up marked as responded',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to mark as responded',
        variant: 'destructive',
      });
    }
  };

  const handleDetect = async () => {
    try {
      await detectFollowUps.mutateAsync();
      toast({
        title: 'Success',
        description: 'Follow-ups detected',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error?.message || 'Failed to detect follow-ups',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
    }
  };

  if (isLoading || statsLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Follow-ups</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Track emails that need responses</p>
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Follow-ups</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Track emails that need responses</p>
        </div>
        <Button
          onClick={handleDetect}
          disabled={detectFollowUps.isPending}
          className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
        >
          {detectFollowUps.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Detect Follow-ups
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Total</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.total || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-red-500 dark:border-red-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 dark:bg-red-500/10 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Urgent</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.urgent || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-orange-500 dark:border-orange-500/20 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg shadow-sm">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">High</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.high || 0}</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg shadow-sm">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white/60 uppercase tracking-wide">Responded</h3>
            </div>
            <p className="text-4xl font-bold text-slate-800 dark:text-white">{stats.byStatus?.responded || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Button
          variant={statusFilter === undefined ? 'default' : 'outline'}
          onClick={() => setStatusFilter(undefined)}
          className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('pending')}
          className="font-semibold"
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === 'dismissed' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('dismissed')}
          className="font-semibold"
        >
          Dismissed
        </Button>
        <Button
          variant={statusFilter === 'responded' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('responded')}
          className="font-semibold"
        >
          Responded
        </Button>
      </div>

      {/* Follow-ups List */}
      {filteredFollowUps && filteredFollowUps.length > 0 ? (
        <div className="space-y-4">
          {filteredFollowUps.map((followUp) => (
            <div
              key={followUp.id}
              className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge className={getPriorityColor(followUp.priority)}>
                      {followUp.priority}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold">
                      {followUp.status}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{followUp.subject}</h3>
                    <p className="text-sm text-slate-600 dark:text-white/60 mt-1">From: {followUp.from}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-white/40">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {followUp.daysSinceContact} days since last contact
                    </div>
                    <div>
                      Last contact: {new Date(followUp.lastContactDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {followUp.status === 'pending' && (
                    <>
                      <Button
                        onClick={() => handleMarkResponded(followUp.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Responded
                      </Button>
                      <Button
                        onClick={() => handleDismiss(followUp.id)}
                        size="sm"
                        variant="outline"
                        className="font-semibold"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
            <div className="text-center space-y-2">
              <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No follow-ups found</p>
              <p className="text-slate-500 dark:text-white/30 text-xs">Click "Detect Follow-ups" to find emails that need responses</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

