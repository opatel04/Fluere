import logger from '../config/logger';
import { ExtractedTask } from '../types/ai.types';

/**
 * Task Intelligence Service
 * Provides intelligent categorization, sorting, and routing for tasks
 */

class TaskIntelligenceService {
  /**
   * Automatically sort tasks by multiple criteria
   */
  sortTasks(tasks: ExtractedTask[]): ExtractedTask[] {
    return tasks.sort((a, b) => {
      // 1. Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // 2. Then by due date (earlier dates first)
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;

      // 3. Finally by category importance
      const categoryOrder: Record<string, number> = {
        urgent: 0,
        deadline: 1,
        meeting: 2,
        documentation: 3,
        communication: 4,
        personal: 5,
        other: 6,
      };
      const catA = a.category?.toLowerCase() || 'other';
      const catB = b.category?.toLowerCase() || 'other';
      return (categoryOrder[catA] || 6) - (categoryOrder[catB] || 6);
    });
  }

  /**
   * Enhance task labels with intelligent categorization
   */
  enhanceLabels(task: ExtractedTask): string[] {
    const labels = new Set<string>(task.labels || []);

    // Add time-based labels
    if (task.dueDate) {
      const daysUntilDue = this.getDaysUntilDue(task.dueDate);
      if (daysUntilDue <= 1) {
        labels.add('Due Today');
      } else if (daysUntilDue <= 3) {
        labels.add('Due This Week');
      } else if (daysUntilDue <= 7) {
        labels.add('Due Next Week');
      }
    }

    // Add context-based labels
    const taskName = task.name || '';
    if (taskName.toLowerCase().includes('meeting')) {
      labels.add('Meeting');
    }
    if (taskName.toLowerCase().includes('review')) {
      labels.add('Review Required');
    }
    if (taskName.toLowerCase().includes('urgent') || task.priority === 'urgent') {
      labels.add('Urgent');
    }
    if (task.estimatedTime && this.parseTime(task.estimatedTime) >= 120) {
      labels.add('Large Task');
    }

    // Add category-based labels
    if (task.category) {
      labels.add(this.capitalizeFirst(task.category));
    }

    return Array.from(labels).slice(0, 5); // Limit to 5 labels
  }

  /**
   * Intelligently route task to the appropriate Trello board/list
   */
  async routeTask(task: ExtractedTask, userId: string): Promise<{
    boardId?: string;
    listId?: string;
    reasoning?: string;
  }> {
    // Check if user has routing rules configured
    // For now, use intelligent defaults based on task properties

    let listName = 'To Do';

    // Route based on priority and due date
    if (task.priority === 'urgent' || this.getDaysUntilDue(task.dueDate || '') <= 1) {
      listName = 'Urgent';
    } else if (task.priority === 'high') {
      listName = 'High Priority';
    } else if (task.category === 'meeting') {
      listName = 'Meetings';
    } else if (task.category === 'documentation') {
      listName = 'Documentation';
    }

    return {
      reasoning: `Routed to "${listName}" based on priority: ${task.priority}, category: ${task.category}`,
    };
  }

  /**
   * Group related tasks together
   */
  groupRelatedTasks(tasks: ExtractedTask[]): Map<string, ExtractedTask[]> {
    const groups = new Map<string, ExtractedTask[]>();

    for (const task of tasks) {
      // Group by category
      const groupKey = task.category || 'other';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(task);
    }

    return groups;
  }

  /**
   * Estimate task completion order (dependency-aware)
   */
  suggestCompletionOrder(tasks: ExtractedTask[]): ExtractedTask[] {
    // Clone and sort tasks
    const sorted = [...tasks];

    return sorted.sort((a, b) => {
      // 1. Urgent tasks first
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;

      // 2. Tasks with closer due dates
      if (a.dueDate && b.dueDate) {
        const daysA = this.getDaysUntilDue(a.dueDate);
        const daysB = this.getDaysUntilDue(b.dueDate);
        if (daysA !== daysB) return daysA - daysB;
      }

      // 3. Quick tasks before long tasks
      const timeA = this.parseTime(a.estimatedTime || '');
      const timeB = this.parseTime(b.estimatedTime || '');
      if (timeA && timeB && timeA !== timeB) return timeA - timeB;

      // 4. Review/approval tasks first (they often block others)
      const isBlockerA = this.isBlockingTask(a);
      const isBlockerB = this.isBlockingTask(b);
      if (isBlockerA && !isBlockerB) return -1;
      if (isBlockerB && !isBlockerA) return 1;

      return 0;
    });
  }

  /**
   * Add smart metadata to tasks
   */
  enrichTask(task: ExtractedTask): ExtractedTask {
    return {
      ...task,
      labels: this.enhanceLabels(task),
    };
  }

  // Helper methods

  private getDaysUntilDue(dueDate: string): number {
    if (!dueDate) return Infinity;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private parseTime(timeStr: string): number {
    if (!timeStr) return 0;

    const match = timeStr.match(/(\d+)\s*(hour|hr|minute|min)/i);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('hour') || unit === 'hr') {
      return value * 60; // Convert to minutes
    }
    return value; // Already in minutes
  }

  private isBlockingTask(task: ExtractedTask): boolean {
    const blockingKeywords = ['review', 'approve', 'approval', 'authorize', 'sign off'];
    const name = (task.name || '').toLowerCase();
    const desc = (task.description || '').toLowerCase();

    return blockingKeywords.some(keyword =>
      name.includes(keyword) || desc.includes(keyword)
    );
  }

  private assessComplexity(task: ExtractedTask): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Longer descriptions = more complex
    if (task.description && task.description.length > 200) complexityScore += 2;
    else if (task.description && task.description.length > 100) complexityScore += 1;

    // Longer estimated time = more complex
    const minutes = this.parseTime(task.estimatedTime || '');
    if (minutes > 120) complexityScore += 2;
    else if (minutes > 60) complexityScore += 1;

    // Multiple labels = more complex
    if (task.labels && task.labels.length > 3) complexityScore += 1;

    // High/urgent priority often = complex
    if (task.priority === 'high' || task.priority === 'urgent') complexityScore += 1;

    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate a summary report of all tasks
   */
  generateTaskSummary(tasks: ExtractedTask[]): {
    total: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    urgent: number;
    dueToday: number;
    overdue: number;
    estimatedTotalTime: number;
  } {
    const summary = {
      total: tasks.length,
      byPriority: { urgent: 0, high: 0, medium: 0, low: 0 } as Record<string, number>,
      byCategory: {} as Record<string, number>,
      urgent: 0,
      dueToday: 0,
      overdue: 0,
      estimatedTotalTime: 0,
    };

    for (const task of tasks) {
      // Count by priority
      summary.byPriority[task.priority] = (summary.byPriority[task.priority] || 0) + 1;

      // Count by category
      const category = task.category || 'other';
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

      // Count urgent
      if (task.priority === 'urgent') summary.urgent++;

      // Count due today/overdue
      if (task.dueDate) {
        const days = this.getDaysUntilDue(task.dueDate);
        if (days < 0) summary.overdue++;
        else if (days <= 1) summary.dueToday++;
      }

      // Sum estimated time
      summary.estimatedTotalTime += this.parseTime(task.estimatedTime || '');
    }

    return summary;
  }
}

export default new TaskIntelligenceService();
