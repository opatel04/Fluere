'use client';

import { useClient } from '@/lib/api/queries/clients';
import { useParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: client, isLoading, error } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="space-y-8">
        <Link href="/clients">
          <Button variant="ghost" className="text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </Link>
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <p className="text-slate-600 dark:text-white/60">Client not found or error loading client details.</p>
        </div>
      </div>
    );
  }

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

  const config = statusConfig[client.status];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/clients">
          <Button variant="ghost" className="text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">{client.name}</h1>
          <p className="text-slate-600 dark:text-white/50 text-base mt-1">{client.email}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Tasks
          </TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-white/10 data-[state=active]:text-blue-600 dark:data-[state=active]:text-white">
            Emails
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Client Information</h2>
              </div>
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
          </div>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
            <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
              <div className="text-center space-y-2">
                <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No tasks yet</p>
                <p className="text-slate-500 dark:text-white/30 text-xs">Tasks for this client will appear here</p>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="emails" className="space-y-6">
          <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
            <div className="flex items-center justify-center py-12 border-2 border-dashed border-blue-300 dark:border-white/10 rounded-lg bg-blue-50/30 dark:bg-transparent">
              <div className="text-center space-y-2">
                <p className="text-slate-600 dark:text-white/40 text-sm font-medium">No emails yet</p>
                <p className="text-slate-500 dark:text-white/30 text-xs">Emails for this client will appear here</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


