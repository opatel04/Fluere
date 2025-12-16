import { Task, Email } from './api/types';

export type TimelineItemType = 'email' | 'task';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  timestamp: Date;
  subject: string;
  // Email specific
  email?: Email;
  // Task specific
  task?: Task;
  taskGenerated?: boolean;
  sentToTrello?: boolean;
  // Thread info
  isThread?: boolean;
  threadCount?: number;
}

export interface TimelineFilters {
  type: 'all' | 'tasks' | 'emails';
}

/**
 * Merges emails and tasks into a unified timeline
 */
export function createTimeline(
  emails: Email[] = [],
  tasks: Task[] = []
): TimelineItem[] {
  const timeline: TimelineItem[] = [];

  // Add emails to timeline
  emails.forEach((email) => {
    // Check if this email generated a task
    const relatedTask = tasks.find((task) => task.email_id === email.id);

    timeline.push({
      id: `email-${email.id}`,
      type: 'email',
      timestamp: new Date(email.date || email.created_at),
      subject: email.subject,
      email,
      taskGenerated: !!relatedTask,
      sentToTrello: relatedTask?.status === 'completed' || false,
    });
  });

  // Add standalone tasks (not from emails) to timeline
  tasks
    .filter((task) => !task.email_id)
    .forEach((task) => {
      timeline.push({
        id: `task-${task.id}`,
        type: 'task',
        timestamp: new Date(task.created_at),
        subject: task.title,
        task,
        taskGenerated: true,
        sentToTrello: task.status === 'completed',
      });
    });

  // Sort by timestamp (newest first)
  return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Filters timeline items based on selected filter
 */
export function filterTimeline(
  timeline: TimelineItem[],
  filter: TimelineFilters['type']
): TimelineItem[] {
  if (filter === 'all') return timeline;
  if (filter === 'tasks') return timeline.filter((item) => item.type === 'task' || item.taskGenerated);
  if (filter === 'emails') return timeline.filter((item) => item.type === 'email');
  return timeline;
}

/**
 * Groups email threads together
 * This is a simple implementation - can be enhanced with proper thread detection
 */
export function groupThreads(timeline: TimelineItem[]): TimelineItem[] {
  const grouped: TimelineItem[] = [];
  const processed = new Set<string>();

  timeline.forEach((item) => {
    if (processed.has(item.id)) return;

    if (item.type === 'email' && item.email) {
      // Find related emails with same subject (simple thread detection)
      const threadItems = timeline.filter(
        (t) =>
          t.type === 'email' &&
          t.email &&
          t.id !== item.id &&
          normalizeSubject(t.email.subject) === normalizeSubject(item.email!.subject)
      );

      if (threadItems.length > 0) {
        // Create a thread item
        grouped.push({
          ...item,
          isThread: true,
          threadCount: threadItems.length + 1,
        });

        // Mark all thread items as processed
        threadItems.forEach((t) => processed.add(t.id));
        processed.add(item.id);
      } else {
        grouped.push(item);
        processed.add(item.id);
      }
    } else {
      grouped.push(item);
      processed.add(item.id);
    }
  });

  return grouped;
}

/**
 * Normalizes email subject for thread detection
 * Removes Re:, Fwd:, etc.
 */
function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re|Fwd|Fw):\s*/gi, '')
    .trim()
    .toLowerCase();
}

/**
 * Formats timestamp for display
 */
export function formatTimelineDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Yesterday
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }

  // Within last week
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Older
  return date.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
