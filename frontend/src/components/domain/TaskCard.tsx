'use client';

import { Task } from '@/lib/api/queries/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Calendar, User, MoreVertical, ArrowRight, CheckCircle, Circle, Clock, Edit } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: 'open' | 'in_progress' | 'completed') => void;
  clientName?: string;
}

export function TaskCard({ task, onEdit, onStatusChange, clientName }: TaskCardProps) {
  const priorityConfig = {
    low: {
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      label: 'Low',
    },
    medium: {
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
      label: 'Medium',
    },
    high: {
      className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      label: 'High',
    },
  };

  const statusConfig = {
    open: {
      className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400',
      label: 'Open',
      icon: Circle,
    },
    in_progress: {
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      label: 'In Progress',
      icon: Clock,
    },
    completed: {
      className: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
      label: 'Completed',
      icon: CheckCircle,
    },
  };

  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  const getNextStatuses = () => {
    const statuses: { status: 'open' | 'in_progress' | 'completed'; label: string }[] = [];
    if (task.status !== 'open') {
      statuses.push({ status: 'open', label: 'Move to Open' });
    }
    if (task.status !== 'in_progress') {
      statuses.push({ status: 'in_progress', label: 'Move to In Progress' });
    }
    if (task.status !== 'completed') {
      statuses.push({ status: 'completed', label: 'Move to Completed' });
    }
    return statuses;
  };

  const handleCardClick = () => {
    if (onEdit) {
      onEdit(task);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <Card
      className={cn(
        'group relative hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-2 border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black',
        onEdit && 'cursor-pointer hover:border-blue-600 dark:hover:border-white/20'
      )}
    >
      <div onClick={handleCardClick}>
        <CardHeader className="pb-3 pr-10">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-slate-800 dark:text-white line-clamp-2">
              {task.title}
            </CardTitle>
            <Badge className={cn('font-semibold text-xs shrink-0', priority.className)}>
              {priority.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {task.description && (
            <p className="text-sm text-slate-600 dark:text-white/60 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <Badge className={cn('font-semibold text-xs', status.className)}>
              {status.label}
            </Badge>
            {task.due_date && (
              <div className={cn(
                'flex items-center gap-1 text-xs',
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-semibold'
                  : 'text-slate-500 dark:text-white/50'
              )}>
                <Calendar className="w-3 h-3" />
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
                {isOverdue && <span className="text-red-600 dark:text-red-400">(Overdue)</span>}
              </div>
            )}
          </div>
          {(task.client_id || clientName) && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-white/50">
              <User className="w-3 h-3" />
              <span>{clientName || `Client: ${task.client_id}`}</span>
            </div>
          )}
        </CardContent>
      </div>

      {/* Action menu */}
      {(onEdit || onStatusChange) && (
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onStatusChange && (
                <>
                  <DropdownMenuLabel>Move to</DropdownMenuLabel>
                  {getNextStatuses().map(({ status, label }) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(task.id, status);
                      }}
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  );
}
