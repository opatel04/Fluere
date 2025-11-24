'use client';

import { Client } from '@/lib/api/queries/clients';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface ClientCardProps {
  client: Client;
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

  const config = statusConfig[client.status];

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black">
        <CardHeader>
          <CardTitle className="text-blue-600 dark:text-white">{client.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 dark:text-white/60 mb-4">{client.email}</p>
          <div className="flex items-center justify-between">
            <Badge className={cn('font-semibold', config.className)}>
              {config.label}
            </Badge>
            <span className="text-sm font-medium text-slate-700 dark:text-white/70">
              Health: {client.health_score}%
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}


