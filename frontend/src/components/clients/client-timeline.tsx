'use client';

import { useState, useMemo } from 'react';
import { Task, Email } from '@/lib/api/types';
import { createTimeline, filterTimeline, groupThreads, TimelineFilters } from '@/lib/timeline-utils';
import { TimelineItem as TimelineItemComponent } from './timeline-item';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Calendar, LayoutList } from 'lucide-react';

interface ClientTimelineProps {
  emails: Email[];
  tasks: Task[];
  onViewEmail?: (emailId: string) => void;
  onViewTask?: (taskId: string) => void;
  onViewThread?: (item: any) => void;
}

export function ClientTimeline({
  emails,
  tasks,
  onViewEmail,
  onViewTask,
  onViewThread,
}: ClientTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilters['type']>('all');

  // Create and filter timeline
  const timeline = useMemo(() => {
    const base = createTimeline(emails, tasks);
    const grouped = groupThreads(base);
    return filterTimeline(grouped, filter);
  }, [emails, tasks, filter]);

  // Count items for each filter
  const counts = useMemo(() => {
    const base = createTimeline(emails, tasks);
    return {
      all: base.length,
      tasks: base.filter((item) => item.type === 'task' || item.taskGenerated).length,
      emails: base.filter((item) => item.type === 'email').length,
    };
  }, [emails, tasks]);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as TimelineFilters['type'])}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <LayoutList className="h-4 w-4" />
            <span>All</span>
            <span className="text-xs text-muted-foreground">({counts.all})</span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Tasks</span>
            <span className="text-xs text-muted-foreground">({counts.tasks})</span>
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Emails</span>
            <span className="text-xs text-muted-foreground">({counts.emails})</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Timeline Items */}
      <div className="space-y-3">
        {timeline.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No {filter === 'all' ? 'activity' : filter} found</p>
          </div>
        ) : (
          timeline.map((item) => (
            <TimelineItemComponent
              key={item.id}
              item={item}
              onViewEmail={onViewEmail}
              onViewTask={onViewTask}
              onViewThread={onViewThread}
            />
          ))
        )}
      </div>
    </div>
  );
}
