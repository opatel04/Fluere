'use client';

import { useState, useCallback } from 'react';
import {
  usePendingTasks,
  usePendingTaskStats,
  useApprovePendingTask,
  useRejectPendingTask,
  useApprovePendingTasksBulk,
  useRejectPendingTasksBulk,
  useGenerateTaskDescription,
  useGenerateAndApprovePendingTask,
  PendingTask,
} from '@/lib/api/queries/tasks';
import { useTrelloBoards, useTrelloLists } from '@/lib/api/queries/trello';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Star,
  Archive,
  Sparkles,
  Mail,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { specApi } from '@/lib/api/spec';

// Priority badge styles
const priorityStyles = {
  urgent: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
};

// Gmail-style row component
function TaskRow({
  task,
  isSelected,
  isExpanded,
  onSelect,
  onExpand,
  onApprove,
  onReject,
  onGenerateDescription,
  onGenerateSpec,
  onGenerateAndApprove,
  isGenerating,
  selectedListId,
}: {
  task: PendingTask;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  onApprove: (task: PendingTask) => void;
  onReject: (taskId: string) => void;
  onGenerateDescription: (taskId: string) => void;
  onGenerateSpec: (emailId: string) => void;
  onGenerateAndApprove: (task: PendingTask) => void;
  isGenerating: boolean;
  selectedListId: string;
}) {
  // Format sender name (extract name from "Name <email>" format)
  const senderName = task.email_from?.split('<')[0]?.trim() || task.email_from || 'Unknown';

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="border-b border-slate-200 dark:border-white/10">
      {/* Main row - Gmail style */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors',
          isSelected && 'bg-blue-50 dark:bg-blue-500/10',
          isExpanded && 'bg-slate-50 dark:bg-white/5'
        )}
        onClick={() => onExpand(task.id)}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(task.id);
          }}
          className="w-4 h-4 rounded border-slate-300 dark:border-white/20"
        />

        {/* Star (placeholder) */}
        <Star className="w-4 h-4 text-slate-300 dark:text-white/20 hover:text-yellow-400 cursor-pointer" />

        {/* Priority indicator */}
        <div className={cn('w-2 h-2 rounded-full', priorityStyles[task.priority])} />

        {/* Expand chevron */}
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}

        {/* Sender */}
        <div className="w-48 flex-shrink-0 truncate font-medium text-slate-800 dark:text-white">
          {senderName}
        </div>

        {/* Subject */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-medium text-slate-800 dark:text-white truncate">
            {task.email_subject || task.title}
          </span>
          {task.email_subject && task.title !== task.email_subject && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {task.title}
            </Badge>
          )}
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {task.labels.slice(0, 4).map((label, i) => (
              <Badge key={i} variant="outline" className="text-xs px-1.5 py-0">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* Date */}
        <div className="w-20 text-right text-sm text-slate-500 dark:text-white/50 flex-shrink-0">
          {formatDate(task.email_date || task.created_at)}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-slate-50 dark:bg-white/5 border-t border-slate-200 dark:border-white/10">
          <div className="ml-[72px] space-y-4">
            {/* Task details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={cn('text-xs', priorityStyles[task.priority])}>
                  {task.priority}
                </Badge>
                {task.category && (
                  <Badge variant="outline" className="text-xs">
                    {task.category}
                  </Badge>
                )}
                {task.due_date && (
                  <span className="text-xs text-slate-500 dark:text-white/50 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due: {new Date(task.due_date).toLocaleDateString()}
                  </span>
                )}
                {task.ai_processed && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Processed
                  </Badge>
                )}
              </div>

              {/* Description - show if available or generate button */}
              {task.description ? (
                <div className="text-sm text-slate-600 dark:text-white/70 whitespace-pre-wrap bg-white dark:bg-black/30 p-3 rounded-lg border border-slate-200 dark:border-white/10">
                  {task.description}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-white/50">
                  {isGenerating ? (
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-black/30 rounded-lg border border-slate-200 dark:border-white/10">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating AI description...
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateDescription(task.id);
                      }}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate AI Description
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
              {/* One-Click Workflow: Generate Spec & Approve */}
              {task.email_id && (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateAndApprove(task);
                  }}
                  disabled={!selectedListId}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Spec & Approve
                </Button>
              )}

              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(task);
                }}
                disabled={!selectedListId}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve Only
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(task.id);
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 gap-1"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              {task.gmail_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(task.gmail_link, '_blank');
                  }}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 gap-1"
                >
                  <Mail className="w-4 h-4" />
                  View in Gmail
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}

              {/* Separate Generate Spec Button (for flexibility) */}
              {task.email_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGenerateSpec(task.email_id!);
                  }}
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-500/10 gap-1 ml-auto"
                >
                  <FileText className="w-4 h-4" />
                  Spec Only
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const router = useRouter();

  // State
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState<Set<string>>(new Set());

  // Fetch pending tasks from backend
  const { data: pendingTasks, isLoading: tasksLoading } = usePendingTasks('pending');
  const { data: stats } = usePendingTaskStats();

  // Mutations
  const approveTask = useApprovePendingTask();
  const rejectTask = useRejectPendingTask();
  const approveTasksBulk = useApprovePendingTasksBulk();
  const rejectTasksBulk = useRejectPendingTasksBulk();
  const generateDescription = useGenerateTaskDescription();
  const generateAndApprove = useGenerateAndApprovePendingTask();

  // Trello data
  const { data: boards, isLoading: boardsLoading } = useTrelloBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const { data: lists } = useTrelloLists(selectedBoardId || null);

  const handleSelect = useCallback((taskId: string) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!pendingTasks) return;
    if (selectedTasks.size === pendingTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(pendingTasks.map((t) => t.id)));
    }
  }, [pendingTasks, selectedTasks.size]);

  const handleExpand = useCallback((taskId: string) => {
    setExpandedTask((prev) => (prev === taskId ? null : taskId));
  }, []);

  const handleGenerateDescription = useCallback(
    async (taskId: string) => {
      setGeneratingTasks((prev) => new Set(prev).add(taskId));
      try {
        await generateDescription.mutateAsync(taskId);
        toast({
          title: 'Description generated',
          description: 'AI has analyzed the email and generated a task description',
        });
      } catch (error) {
        toast({
          title: 'Generation failed',
          description: 'Could not generate AI description',
          variant: 'destructive',
        });
      } finally {
        setGeneratingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [generateDescription, toast]
  );

  const handleApprove = useCallback(
    async (task: PendingTask) => {
      const listId = lists?.[0]?.id;
      if (!listId) {
        toast({
          title: 'Error',
          description: 'Please select a Trello board first',
          variant: 'destructive',
        });
        return;
      }

      try {
        await approveTask.mutateAsync({
          taskId: task.id,
          listId,
          boardId: selectedBoardId,
        });

        toast({
          title: 'Task approved',
          description: `"${task.title}" has been sent to Trello`,
        });
        setExpandedTask(null);
      } catch (error) {
        toast({
          title: 'Approval failed',
          description: 'Could not create Trello card',
          variant: 'destructive',
        });
      }
    },
    [approveTask, lists, selectedBoardId, toast]
  );

  const handleReject = useCallback(
    async (taskId: string) => {
      try {
        await rejectTask.mutateAsync(taskId);
        toast({
          title: 'Task rejected',
          description: 'The task has been dismissed',
        });
        setExpandedTask(null);
      } catch (error) {
        toast({
          title: 'Rejection failed',
          description: 'Could not reject task',
          variant: 'destructive',
        });
      }
    },
    [rejectTask, toast]
  );

  const handleGenerateSpec = useCallback(
    async (emailId: string) => {
      try {
        toast({
          title: 'Generating Spec',
          description: 'AI is analyzing the email to create a project spec...',
        });

        const result = await specApi.generateSpec(emailId);

        toast({
          title: 'Spec Generated',
          description: 'Redirecting to spec viewer...',
        });

        router.push(`/specs/${result.spec.id}`);
      } catch (error: any) {
        console.error('Failed to generate spec:', error);
        toast({
          title: 'Generation failed',
          description: error.response?.data?.error?.message || 'Could not generate spec',
          variant: 'destructive',
        });
      }
    },
    [router, toast]
  );

  const handleGenerateAndApprove = useCallback(
    async (task: PendingTask) => {
      const listId = lists?.[0]?.id;
      if (!listId) {
        toast({
          title: 'Error',
          description: 'Please select a Trello board first',
          variant: 'destructive',
        });
        return;
      }

      if (!task.email_id) {
        toast({
          title: 'Error',
          description: 'Task must have an associated email to generate spec',
          variant: 'destructive',
        });
        return;
      }

      try {
        toast({
          title: 'Processing...',
          description: 'Generating spec and creating Trello card...',
        });

        const result = await generateAndApprove.mutateAsync({
          taskId: task.id,
          listId,
          boardId: selectedBoardId,
        });

        toast({
          title: 'Success!',
          description: `Spec created and task approved. Redirecting to spec...`,
        });

        // Redirect to the spec page
        if (result.spec?.id) {
          router.push(`/specs/${result.spec.id}`);
        }

        setExpandedTask(null);
      } catch (error: any) {
        console.error('Generate and approve failed:', error);
        toast({
          title: 'Operation failed',
          description: error.response?.data?.error?.message || 'Could not complete operation',
          variant: 'destructive',
        });
      }
    },
    [generateAndApprove, lists, selectedBoardId, toast, router]
  );

  const handleApproveSelected = async () => {
    if (!selectedBoardId || !lists || lists.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a Trello board first',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTasks.size === 0) return;

    try {
      const result = await approveTasksBulk.mutateAsync({
        taskIds: Array.from(selectedTasks),
        listId: lists[0].id,
        boardId: selectedBoardId,
      });

      toast({
        title: 'Tasks approved',
        description: `${result.approved} tasks sent to Trello`,
      });
      setSelectedTasks(new Set());
    } catch (error) {
      toast({
        title: 'Bulk approval failed',
        description: 'Could not approve all tasks',
        variant: 'destructive',
      });
    }
  };

  const handleRejectSelected = async () => {
    if (selectedTasks.size === 0) return;

    try {
      const result = await rejectTasksBulk.mutateAsync(Array.from(selectedTasks));
      toast({
        title: 'Tasks rejected',
        description: `${result.rejected} tasks dismissed`,
      });
      setSelectedTasks(new Set());
    } catch (error) {
      toast({
        title: 'Bulk rejection failed',
        description: 'Could not reject all tasks',
        variant: 'destructive',
      });
    }
  };

  if (tasksLoading || boardsLoading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inbox</h1>
          <p className="text-slate-500 dark:text-white/50 text-sm">
            Review emails and approve tasks
          </p>
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const tasksCount = pendingTasks?.length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Inbox</h1>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-white/50">
            <span>{stats?.pending || 0} pending</span>
            <span>•</span>
            <span>{stats?.approved || 0} approved</span>
            <span>•</span>
            <span>{stats?.rejected || 0} rejected</span>
          </div>
        </div>

        {/* Board selector */}
        <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select Trello board" />
          </SelectTrigger>
          <SelectContent>
            {boards?.map((board) => (
              <SelectItem key={board.id} value={board.id}>
                {board.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toolbar */}
      {tasksCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-lg">
          <input
            type="checkbox"
            checked={selectedTasks.size === tasksCount && tasksCount > 0}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-slate-300 dark:border-white/20"
          />
          <span className="text-sm text-slate-600 dark:text-white/60 ml-2">
            {selectedTasks.size > 0 ? `${selectedTasks.size} selected` : 'Select all'}
          </span>

          {selectedTasks.size > 0 && (
            <>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/20 mx-2" />
              <Button
                size="sm"
                onClick={handleApproveSelected}
                disabled={approveTasksBulk.isPending || !selectedBoardId}
                className="bg-green-600 hover:bg-green-700 text-white gap-1"
              >
                {approveTasksBulk.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectSelected}
                disabled={rejectTasksBulk.isPending}
                className="text-red-600 gap-1"
              >
                {rejectTasksBulk.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </Button>
            </>
          )}
        </div>
      )}

      {/* Task list - Gmail style */}
      {tasksCount > 0 ? (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
          {pendingTasks?.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isSelected={selectedTasks.has(task.id)}
              isExpanded={expandedTask === task.id}
              onSelect={handleSelect}
              onExpand={handleExpand}
              onApprove={handleApprove}
              onReject={handleReject}
              onGenerateDescription={handleGenerateDescription}
              onGenerateSpec={handleGenerateSpec}
              onGenerateAndApprove={handleGenerateAndApprove}
              isGenerating={generatingTasks.has(task.id)}
              selectedListId={lists?.[0]?.id || ''}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-white/10 rounded-lg p-16">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <Inbox className="w-8 h-8 text-slate-400 dark:text-white/30" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-700 dark:text-white/70">
                Your inbox is empty
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                Process emails from the Automation page to extract tasks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
