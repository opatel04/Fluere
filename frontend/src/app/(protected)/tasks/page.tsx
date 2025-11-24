'use client';

import { useState, useCallback } from 'react';
import {
  usePendingTasks,
  usePendingTaskStats,
  useApprovePendingTask,
  useRejectPendingTask,
  useApprovePendingTasksBulk,
  useRejectPendingTasksBulk,
  useUpdatePendingTask,
  PendingTask,
} from '@/lib/api/queries/tasks';
import { useTrelloBoards, useTrelloLists } from '@/lib/api/queries/trello';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  Mail,
  Loader2,
  Inbox,
  ArrowRight,
  Clock,
  AlertCircle,
  Edit2,
  Check,
  X,
  Calendar,
  Tag,
} from 'lucide-react';

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
};

const priorityIcons = {
  urgent: AlertCircle,
  high: AlertCircle,
  medium: Clock,
  low: Clock,
};

function TaskCard({
  task,
  boards,
  lists,
  selectedBoardId,
  onBoardChange,
  onApprove,
  onReject,
  onEdit,
  isProcessing,
}: {
  task: PendingTask;
  boards: any[] | undefined;
  lists: any[] | undefined;
  selectedBoardId: string;
  onBoardChange: (boardId: string) => void;
  onApprove: (task: PendingTask, listId: string) => void;
  onReject: (taskId: string) => void;
  onEdit: (taskId: string, updates: Partial<PendingTask>) => void;
  isProcessing: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDescription, setEditedDescription] = useState(task.description || '');
  const [editedPriority, setEditedPriority] = useState(task.priority);
  const [selectedListId, setSelectedListId] = useState(lists?.[0]?.id || '');

  const PriorityIcon = priorityIcons[task.priority] || Clock;

  const handleSaveEdit = () => {
    onEdit(task.id, {
      title: editedTitle,
      description: editedDescription,
      priority: editedPriority,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(task.title);
    setEditedDescription(task.description || '');
    setEditedPriority(task.priority);
    setIsEditing(false);
  };

  return (
    <Card className="border-2 border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="font-semibold"
              />
            ) : (
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white truncate">
                {task.title}
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Select value={editedPriority} onValueChange={(v: any) => setEditedPriority(v)}>
                <SelectTrigger className="w-[100px] h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn('capitalize', priorityColors[task.priority])}>
                <PriorityIcon className="w-3 h-3 mr-1" />
                {task.priority}
              </Badge>
            )}
          </div>
        </div>
        {task.email_subject && (
          <CardDescription className="flex items-center gap-1 text-xs mt-1">
            <Mail className="w-3 h-3" />
            {task.email_subject}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        {isEditing ? (
          <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Task description..."
            className="min-h-[80px]"
          />
        ) : (
          task.description && (
            <p className="text-sm text-slate-600 dark:text-white/60 line-clamp-3">
              {task.description}
            </p>
          )
        )}

        {/* Meta info */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-white/40">
          {task.due_date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
          {task.category && (
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {task.category}
            </span>
          )}
          {task.confidence && (
            <span className="flex items-center gap-1">
              {Math.round(task.confidence * 100)}% confident
            </span>
          )}
        </div>

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.labels.map((label, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        {/* List selector */}
        {!isEditing && (
          <div className="flex items-center gap-2">
            <Select value={selectedBoardId} onValueChange={onBoardChange}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boards?.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <Select
              value={selectedListId}
              onValueChange={setSelectedListId}
              disabled={!selectedBoardId || !lists?.length}
            >
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue placeholder="Select list" />
              </SelectTrigger>
              <SelectContent>
                {lists?.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between gap-2 pt-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="bg-blue-600 text-white">
                <Check className="w-4 h-4 mr-1" />
                Save
              </Button>
            </>
          ) : (
            <>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-slate-500"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReject(task.id)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => onApprove(task, selectedListId || lists?.[0]?.id)}
                disabled={isProcessing || !selectedBoardId || !lists?.length}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TasksPage() {
  const { toast } = useToast();

  // Fetch pending tasks from backend
  const { data: pendingTasks, isLoading: tasksLoading } = usePendingTasks('pending');
  const { data: stats } = usePendingTaskStats();

  // Mutations
  const approveTask = useApprovePendingTask();
  const rejectTask = useRejectPendingTask();
  const approveTasksBulk = useApprovePendingTasksBulk();
  const rejectTasksBulk = useRejectPendingTasksBulk();
  const updateTask = useUpdatePendingTask();

  // Trello data
  const { data: boards, isLoading: boardsLoading } = useTrelloBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const { data: lists } = useTrelloLists(selectedBoardId || null);

  const handleApprove = useCallback(
    async (task: PendingTask, listId: string) => {
      if (!listId) {
        toast({
          title: 'Error',
          description: 'Please select a Trello list',
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
      } catch (error) {
        toast({
          title: 'Approval failed',
          description: 'Could not create Trello card',
          variant: 'destructive',
        });
      }
    },
    [approveTask, selectedBoardId, toast]
  );

  const handleReject = useCallback(
    async (taskId: string) => {
      try {
        await rejectTask.mutateAsync(taskId);
        toast({
          title: 'Task rejected',
          description: 'The task has been dismissed',
        });
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

  const handleEdit = useCallback(
    async (taskId: string, updates: Partial<PendingTask>) => {
      try {
        await updateTask.mutateAsync({
          taskId,
          updates: {
            title: updates.title,
            description: updates.description,
            priority: updates.priority,
          },
        });
        toast({
          title: 'Task updated',
          description: 'Changes saved successfully',
        });
      } catch (error) {
        toast({
          title: 'Update failed',
          description: 'Could not save changes',
          variant: 'destructive',
        });
      }
    },
    [updateTask, toast]
  );

  const handleApproveAll = async () => {
    if (!selectedBoardId || !lists || lists.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select a Trello board first',
        variant: 'destructive',
      });
      return;
    }

    if (!pendingTasks || pendingTasks.length === 0) {
      return;
    }

    try {
      const result = await approveTasksBulk.mutateAsync({
        taskIds: pendingTasks.map((t) => t.id),
        listId: lists[0].id,
        boardId: selectedBoardId,
      });

      toast({
        title: 'Tasks approved',
        description: `${result.approved} tasks sent to Trello`,
      });
    } catch (error) {
      toast({
        title: 'Bulk approval failed',
        description: 'Could not approve all tasks',
        variant: 'destructive',
      });
    }
  };

  const handleRejectAll = async () => {
    if (!pendingTasks || pendingTasks.length === 0) {
      return;
    }

    try {
      const result = await rejectTasksBulk.mutateAsync(pendingTasks.map((t) => t.id));
      toast({
        title: 'Tasks rejected',
        description: `${result.rejected} tasks dismissed`,
      });
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
      <div className="space-y-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">
            Task Approval Queue
          </h1>
          <p className="text-slate-600 dark:text-white/50 text-base">
            Review AI-extracted tasks before sending to Trello
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const tasksCount = pendingTasks?.length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold text-blue-600 dark:text-white tracking-tight">
            Task Approval Queue
          </h1>
          <p className="text-slate-600 dark:text-white/50 text-base">
            Review AI-extracted tasks before sending to Trello
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400">
              <Clock className="w-3 h-3 mr-1" />
              {stats?.pending || 0} pending
            </Badge>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {stats?.approved || 0} approved
            </Badge>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
              <XCircle className="w-3 h-3 mr-1" />
              {stats?.rejected || 0} rejected
            </Badge>
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {tasksCount > 0 && (
        <Card className="border-2 border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700 dark:text-white/70">
                  Default Trello destination:
                </span>
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards?.map((board) => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBoardId && lists && lists.length > 0 && (
                  <>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-500 dark:text-white/50">
                      {lists[0].name}
                    </span>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRejectAll}
                  disabled={rejectTasksBulk.isPending}
                  className="text-red-600"
                >
                  {rejectTasksBulk.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  Reject All
                </Button>
                <Button
                  size="sm"
                  onClick={handleApproveAll}
                  disabled={approveTasksBulk.isPending || !selectedBoardId || !lists?.length}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {approveTasksBulk.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Approve All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks grid */}
      {tasksCount > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Pending Approval ({tasksCount})
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingTasks?.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                boards={boards}
                lists={lists}
                selectedBoardId={selectedBoardId}
                onBoardChange={setSelectedBoardId}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                isProcessing={approveTask.isPending}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-black/30">
          <CardContent className="py-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-slate-400 dark:text-white/30" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-white/70">
                  No tasks pending approval
                </h3>
                <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
                  Process emails from the Automation page to extract tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
