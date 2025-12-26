'use client';

import { TimelineItem as TimelineItemType } from '@/lib/timeline-utils';
import { formatTimelineDate } from '@/lib/timeline-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle2, ExternalLink, MessageSquare, Calendar } from 'lucide-react';

interface TimelineItemProps {
  item: TimelineItemType;
  onViewEmail?: (emailId: string) => void;
  onViewTask?: (taskId: string) => void;
  onViewThread?: (item: TimelineItemType) => void;
}

export function TimelineItem({ item, onViewEmail, onViewTask, onViewThread }: TimelineItemProps) {
  const renderStatusIndicator = () => {
    const statuses = [];

    if (item.taskGenerated) {
      statuses.push(
        <div key="task-gen" className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Generated task</span>
        </div>
      );
    }

    if (item.sentToTrello) {
      statuses.push(
        <div key="trello" className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Sent to Trello</span>
        </div>
      );
    }

    if (statuses.length === 0 && item.type === 'email') {
      statuses.push(
        <div key="no-task" className="text-xs text-muted-foreground">
          No task generated
        </div>
      );
    }

    return statuses.length > 0 ? (
      <div className="flex items-center gap-2 flex-wrap">{statuses}</div>
    ) : null;
  };

  const renderActions = () => {
    const actions = [];

    if (item.type === 'email' && item.email) {
      actions.push(
        <Button
          key="view-email"
          variant="outline"
          size="sm"
          onClick={() => onViewEmail?.(item.email!.id)}
        >
          View Email
        </Button>
      );

      if (item.task) {
        actions.push(
          <Button
            key="view-task"
            variant="outline"
            size="sm"
            onClick={() => onViewTask?.(item.task!.id)}
          >
            View Task
          </Button>
        );
      }

      if (item.sentToTrello && item.task) {
        actions.push(
          <Button
            key="view-trello"
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://trello.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              View in Trello
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        );
      }
    }

    if (item.type === 'task' && item.task) {
      actions.push(
        <Button
          key="view-task"
          variant="outline"
          size="sm"
          onClick={() => onViewTask?.(item.task!.id)}
        >
          View Task
        </Button>
      );

      if (item.sentToTrello) {
        actions.push(
          <Button
            key="view-trello"
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={`https://trello.com`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              View in Trello
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        );
      }
    }

    if (item.isThread) {
      actions.push(
        <Button
          key="view-thread"
          variant="outline"
          size="sm"
          onClick={() => onViewThread?.(item)}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          View Thread
        </Button>
      );
    }

    return actions;
  };

  const getIcon = () => {
    if (item.isThread) {
      return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
    if (item.type === 'email') {
      return <Mail className="h-4 w-4 text-muted-foreground" />;
    }
    return <Calendar className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-1">{getIcon()}</div>

        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm">{item.subject}</h3>
                {item.isThread && (
                  <Badge variant="secondary" className="text-xs">
                    Thread: {item.threadCount} msgs
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimelineDate(item.timestamp)}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          {renderStatusIndicator()}

          {/* Preview Text */}
          {item.email?.body && !item.isThread && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {item.email.body.replace(/<[^>]*>/g, '').slice(0, 150)}
              {item.email.body.length > 150 ? '...' : ''}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {renderActions()}
          </div>
        </div>
      </div>
    </div>
  );
}
