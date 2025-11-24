'use client';

import { useEmail, useExtractTasks } from '@/lib/api/queries/emails';
import { useTrelloBoards, useTrelloLists, useProcessToTrello } from '@/lib/api/queries/trello';
import { useTrelloStatus } from '@/lib/api/queries/oauth';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles, Loader2, CheckCircle, FileText, Send, KanbanSquare } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useGmailStore } from '@/lib/store/gmailStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Get brief summary of email
function getBriefSummary(content: string, maxLength: number = 300): string {
  if (!content) return '';
  let text = content.replace(/<[^>]+>/g, ' ');
  text = text.replace(/https?:\/\/[^\s]+/gi, '');
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > maxLength) {
    text = text.slice(0, maxLength).trim() + '...';
  }
  return text;
}

export default function EmailDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const gmailEmail = useGmailStore((state) => state.getEmail(id));
  const { data: apiEmail, isLoading } = useEmail(id);
  const email = gmailEmail || apiEmail;

  const extractTasks = useExtractTasks();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isExtracted, setIsExtracted] = useState(false);

  // Trello integration
  const { data: trelloStatus } = useTrelloStatus();
  const { data: boards, isLoading: boardsLoading } = useTrelloBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const { data: lists, isLoading: listsLoading } = useTrelloLists(selectedBoardId);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showTrelloDialog, setShowTrelloDialog] = useState(false);
  const processToTrello = useProcessToTrello();

  // Auto-extract when email loads
  useEffect(() => {
    if (email && !isExtracted && !extractTasks.isPending) {
      extractTasks.mutateAsync({
        emailBody: email.body,
        emailSubject: email.subject,
      })
        .then((response) => {
          setSuggestions(response.suggestions || []);
          setIsExtracted(true);
        })
        .catch(() => {
          setIsExtracted(true); // Mark as done even on error
        });
    }
  }, [email?.id]);

  // Reset list selection when board changes
  useEffect(() => {
    setSelectedListId(null);
  }, [selectedBoardId]);

  const handleExtractAndProcess = () => {
    if (!trelloStatus?.connected) {
      toast.error('Please connect your Trello account in Settings first');
      return;
    }
    setShowTrelloDialog(true);
  };

  // Get tasks to process - use extracted suggestions or create one from email summary
  const getTasksToProcess = () => {
    if (suggestions.length > 0) {
      return suggestions;
    }
    // Create a task from the email summary when no tasks were extracted
    return [{
      title: email?.subject || 'Email Task',
      description: getBriefSummary(email?.body || '', 500),
      suggested_priority: 'medium',
    }];
  };

  const handleProcessToTrello = async () => {
    if (!selectedListId) {
      toast.error('Please select a list');
      return;
    }

    try {
      const tasksToProcess = getTasksToProcess();
      const cards = await processToTrello.mutateAsync({
        tasks: tasksToProcess,
        listId: selectedListId,
        emailSubject: email?.subject,
      });

      toast.success(`Created ${cards.length} card(s) in Trello!`);
      setShowTrelloDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create Trello cards');
    }
  };

  const priorityColors: Record<string, string> = {
    high: 'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400',
    medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-500/10 dark:text-yellow-400',
    low: 'text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400',
  };

  if (isLoading && !gmailEmail) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Link href="/emails">
          <Button variant="ghost" className="text-blue-600 dark:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="bg-white/90 dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-8">
          <p className="text-slate-600 dark:text-white/60">Email not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/emails">
          <Button variant="ghost" className="text-blue-600 dark:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>

        {/* Extract & Process Button */}
        <Button
          onClick={handleExtractAndProcess}
          disabled={extractTasks.isPending}
          className="bg-blue-600 dark:bg-white text-white dark:text-black hover:bg-blue-700 dark:hover:bg-white/90 font-semibold"
        >
          {extractTasks.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send to Trello {suggestions.length > 0 ? `(${suggestions.length})` : ''}
            </>
          )}
        </Button>
      </div>

      {/* Email Card */}
      <div className="bg-white/90 dark:bg-black border-2 border-blue-500 dark:border-white/10 rounded-xl p-6 shadow-lg">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          {email.subject}
        </h1>

        <p className="text-sm text-slate-500 dark:text-white/50 mb-6">
          From: {email.from}
        </p>

        {/* Key Points / Important Parts */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Key Points
            </h2>
          </div>

          {extractTasks.isPending ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 p-4 bg-slate-50 dark:bg-white/5 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing email...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((task, idx) => (
                <div
                  key={task.id || idx.toString()}
                  className="p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-800 dark:text-white">
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-slate-600 dark:text-white/60 mt-1">
                          {task.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {task.suggested_priority && (
                          <Badge className={cn('text-xs', priorityColors[task.suggested_priority] || '')}>
                            {task.suggested_priority}
                          </Badge>
                        )}
                        {task.suggested_due_date && (
                          <span className="text-xs text-slate-500">
                            Due: {new Date(task.suggested_due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-white/70">Email Summary</span>
              </div>
              <p className="text-slate-700 dark:text-white/80 leading-relaxed">
                {getBriefSummary(email.body) || 'No content available'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Trello Board/List Selection Dialog */}
      <Dialog open={showTrelloDialog} onOpenChange={setShowTrelloDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KanbanSquare className="w-5 h-5" />
              Send to Trello
            </DialogTitle>
            <DialogDescription>
              Select a board and list to create {suggestions.length > 0 ? suggestions.length : 1} card(s)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Board Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Board</label>
              <Select
                value={selectedBoardId || ''}
                onValueChange={setSelectedBoardId}
                disabled={boardsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={boardsLoading ? 'Loading boards...' : 'Select a board'} />
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

            {/* List Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">List</label>
              <Select
                value={selectedListId || ''}
                onValueChange={setSelectedListId}
                disabled={!selectedBoardId || listsLoading}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedBoardId
                        ? 'Select a board first'
                        : listsLoading
                        ? 'Loading lists...'
                        : 'Select a list'
                    }
                  />
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

            {/* Preview of tasks */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Card to create:</label>
              <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-slate-600 dark:text-white/60">
                {suggestions.length > 0 ? (
                  suggestions.map((task, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="truncate">{email?.subject || 'Email Task'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrelloDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessToTrello}
              disabled={!selectedListId || processToTrello.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {processToTrello.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Create Cards
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
