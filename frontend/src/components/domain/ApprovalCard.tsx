'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Edit2,
  Calendar,
  Mail,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SuggestedTask } from '@/lib/api/queries/ai';
import { TrelloBoard, TrelloList } from '@/lib/api/queries/trello';

interface ApprovalCardProps {
  suggestion: SuggestedTask;
  boards?: TrelloBoard[];
  lists?: TrelloList[];
  selectedBoardId?: string;
  onBoardChange?: (boardId: string) => void;
  onApprove: (task: SuggestedTask, listId: string) => void;
  onReject: (taskId: string) => void;
  onEdit: (taskId: string, updates: Partial<SuggestedTask>) => void;
  isProcessing?: boolean;
}

export function ApprovalCard({
  suggestion,
  boards = [],
  lists = [],
  selectedBoardId,
  onBoardChange,
  onApprove,
  onReject,
  onEdit,
  isProcessing = false,
}: ApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedTask, setEditedTask] = useState({
    title: suggestion.title,
    description: suggestion.description,
    priority: suggestion.priority,
    dueDate: suggestion.dueDate?.split('T')[0] || '',
  });
  const [selectedListId, setSelectedListId] = useState(suggestion.suggestedList?.id || '');

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
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
      label: 'High',
    },
    urgent: {
      className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
      label: 'Urgent',
    },
  };

  const priority = priorityConfig[editedTask.priority] || priorityConfig.medium;

  const handleSaveEdit = () => {
    onEdit(suggestion.id, {
      title: editedTask.title,
      description: editedTask.description,
      priority: editedTask.priority,
      dueDate: editedTask.dueDate ? new Date(editedTask.dueDate).toISOString() : undefined,
    });
    setIsEditing(false);
  };

  const handleApprove = () => {
    if (!selectedListId) {
      alert('Please select a Trello list first');
      return;
    }

    const taskToApprove = {
      ...suggestion,
      title: editedTask.title,
      description: editedTask.description,
      priority: editedTask.priority,
      dueDate: editedTask.dueDate ? new Date(editedTask.dueDate).toISOString() : undefined,
    };

    onApprove(taskToApprove, selectedListId);
  };

  return (
    <Card className={cn(
      'border-2 transition-all duration-200',
      isProcessing && 'opacity-50 pointer-events-none',
      'border-blue-500 dark:border-white/10 bg-white/90 backdrop-blur-sm dark:bg-black'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                className="font-semibold"
                placeholder="Task title"
              />
            ) : (
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-white line-clamp-2">
                {editedTask.title}
              </CardTitle>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn('font-semibold text-xs', priority.className)}>
              {priority.label}
            </Badge>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {isEditing ? (
          <Textarea
            value={editedTask.description}
            onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
            placeholder="Task description"
            className="min-h-[80px]"
          />
        ) : (
          <p className={cn(
            'text-sm text-slate-600 dark:text-white/60',
            !isExpanded && 'line-clamp-2'
          )}>
            {editedTask.description || 'No description'}
          </p>
        )}

        {/* Expand/Collapse for long descriptions */}
        {!isEditing && editedTask.description && editedTask.description.length > 100 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-600 dark:text-blue-400 p-0 h-auto"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3 mr-1" /> Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 mr-1" /> Show more
              </>
            )}
          </Button>
        )}

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-white/50">
          {editedTask.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{new Date(editedTask.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          {suggestion.emailSubject && (
            <div className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[200px]">{suggestion.emailSubject}</span>
            </div>
          )}
        </div>

        {/* Edit mode: Priority and Due Date */}
        {isEditing && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select
                value={editedTask.priority}
                onValueChange={(value: 'low' | 'medium' | 'high' | 'urgent') =>
                  setEditedTask({ ...editedTask, priority: value })
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Input
                type="date"
                value={editedTask.dueDate}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Trello destination selection */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
          <Label className="text-xs font-semibold text-slate-700 dark:text-white/70">
            Send to Trello
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Select value={selectedBoardId} onValueChange={onBoardChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedListId}
              onValueChange={setSelectedListId}
              disabled={!selectedBoardId || lists.length === 0}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!selectedListId && selectedBoardId && lists.length > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Select a list to approve
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditedTask({
                      title: suggestion.title,
                      description: suggestion.description,
                      priority: suggestion.priority,
                      dueDate: suggestion.dueDate?.split('T')[0] || '',
                    });
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  Save
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="text-slate-600 dark:text-white/60"
              >
                <Edit2 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject(suggestion.id)}
              disabled={isProcessing}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400"
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={isProcessing || !selectedListId}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
