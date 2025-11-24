'use client';

import { useClients } from '@/lib/api/queries/clients';
import { ClientCard } from '@/components/domain/ClientCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function ClientsPage() {
  const { data: clients, isLoading, error } = useClients();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
            <p className="text-slate-600 dark:text-white/50 text-base">Manage your client relationships</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Manage your client relationships</p>
        </div>
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8 shadow-lg">
          <p className="text-slate-600 dark:text-white/60">Error loading clients. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">Clients</h1>
          <p className="text-slate-600 dark:text-white/50 text-base">Manage your client relationships</p>
        </div>
        <Button className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>
      
      {clients && clients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-12 shadow-lg">
          <div className="text-center space-y-4">
            <p className="text-slate-600 dark:text-white/60 text-lg font-medium">No clients yet</p>
            <p className="text-slate-500 dark:text-white/40 text-sm">Get started by adding your first client</p>
            <Button className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Client
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


