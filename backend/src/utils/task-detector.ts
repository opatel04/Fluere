/**
 * Rule-Based Task Detection Utility
 *
 * Detects likely tasks from email subject + snippet using keyword patterns
 * NO AI REQUIRED - Fast, free, and surprisingly accurate
 *
 * Strategy: Look for action words, time indicators, and request patterns
 */

interface TaskIndicators {
  actionWords: string[];
  requestWords: string[];
  timeIndicators: string[];
  urgencyWords: string[];
  questionPatterns: RegExp[];
}

const TASK_INDICATORS: TaskIndicators = {
  // Action verbs that suggest a task
  actionWords: [
    'please',
    'can you',
    'could you',
    'would you',
    'need',
    'required',
    'must',
    'should',
    'complete',
    'finish',
    'submit',
    'send',
    'provide',
    'review',
    'approve',
    'update',
    'fix',
    'resolve',
    'implement',
    'create',
    'prepare',
    'schedule',
    'confirm',
    'check',
    'verify',
    'respond',
    'reply',
    'follow up',
    'action needed',
    'action required',
  ],

  // Words that indicate a request
  requestWords: [
    'request',
    'asking',
    'wondering if',
    'hoping you',
    'need you to',
    'require you to',
    'would appreciate',
    'could use your help',
    'looking to have',
    "i'm looking to",
    "i'm reaching out",
    "reaching out to",
    'let me know',
    'please let me know',
    'looking forward to hearing',
    'any questions',
    'if possible',
    'would love to',
    "i'd like to",
    "i'd love to",
  ],

  // Time indicators that suggest deadlines
  timeIndicators: [
    'by',
    'before',
    'due',
    'deadline',
    'asap',
    'urgent',
    'today',
    'tomorrow',
    'this week',
    'next week',
    'end of day',
    'eod',
    'eow',
    'eom',
    'expires',
    'expiring',
    'target deadline',
    'completion',
    'timeline',
    'estimated timeline',
    // Date patterns
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ],

  // Urgency markers
  urgencyWords: [
    'urgent',
    'asap',
    'immediately',
    'important',
    'critical',
    'priority',
    'time-sensitive',
    'overdue',
  ],

  // Question patterns that often indicate tasks
  questionPatterns: [
    /can you\s+/i,
    /could you\s+/i,
    /would you\s+/i,
    /will you\s+/i,
    /are you able to\s+/i,
    /would it be possible to\s+/i,
  ],
};

/**
 * Detect if an email likely contains tasks based on subject and snippet
 * @param subject Email subject line
 * @param snippet Email preview/snippet
 * @returns Boolean indicating if email likely has tasks, plus confidence score
 */
export function detectLikelyTask(
  subject: string,
  snippet: string
): { hasTask: boolean; confidence: number; indicators: string[] } {
  const text = `${subject} ${snippet}`.toLowerCase();
  const foundIndicators: string[] = [];
  let score = 0;

  // Check action words (1 point each, max 3)
  const actionMatches = TASK_INDICATORS.actionWords.filter((word) => text.includes(word));
  if (actionMatches.length > 0) {
    score += Math.min(actionMatches.length, 3);
    foundIndicators.push(...actionMatches.slice(0, 3));
  }

  // Check request words (2 points each, max 4)
  const requestMatches = TASK_INDICATORS.requestWords.filter((word) => text.includes(word));
  if (requestMatches.length > 0) {
    score += Math.min(requestMatches.length * 2, 4);
    foundIndicators.push(...requestMatches);
  }

  // Check time indicators (2 points each, max 4)
  const timeMatches = TASK_INDICATORS.timeIndicators.filter((word) => text.includes(word));
  if (timeMatches.length > 0) {
    score += Math.min(timeMatches.length * 2, 4);
    foundIndicators.push(...timeMatches);
  }

  // Check urgency words (3 points each, max 6)
  const urgencyMatches = TASK_INDICATORS.urgencyWords.filter((word) => text.includes(word));
  if (urgencyMatches.length > 0) {
    score += Math.min(urgencyMatches.length * 3, 6);
    foundIndicators.push(...urgencyMatches);
  }

  // Check question patterns (3 points each)
  const questionMatches = TASK_INDICATORS.questionPatterns.filter((pattern) => pattern.test(text));
  if (questionMatches.length > 0) {
    score += questionMatches.length * 3;
    foundIndicators.push('question_pattern');
  }

  // Calculate confidence (0-100)
  // No threshold - let user decide! Even low-confidence emails create tasks
  const confidence = Math.min((score / 10) * 100, 100);
  const hasTask = score > 0; // Changed from >= 3 to > 0 - any indicator creates a task!

  return {
    hasTask,
    confidence: Math.round(confidence),
    indicators: [...new Set(foundIndicators)], // Remove duplicates
  };
}

/**
 * Get category-specific task indicators
 * Some categories are more likely to have tasks than others
 */
export function getCategoryTaskLikelihood(category: string): number {
  const likelihood: Record<string, number> = {
    support: 0.9, // Support emails almost always have tasks
    coding: 0.7, // Code reviews, bug reports often need action
    finance: 0.6, // Invoices, payments often need action
    accounting: 0.6, // Expenses, receipts need processing
    legal: 0.5, // Contracts may need review/signing
    partnerships: 0.4, // BD emails may have follow-ups
    design: 0.5, // Design feedback may need action
    content: 0.4, // Content review may be needed
    infrastructure: 0.6, // DevOps issues often need action
    personal: 0.2, // Personal emails less likely to be tasks
  };

  return likelihood[category] || 0.5;
}

/**
 * Enhanced task detection that combines keyword analysis with category context
 */
export function detectTaskWithContext(
  subject: string,
  snippet: string,
  category?: string
): { hasTask: boolean; confidence: number; indicators: string[] } {
  const baseDetection = detectLikelyTask(subject, snippet);

  if (category) {
    const categoryLikelihood = getCategoryTaskLikelihood(category);

    // Adjust confidence based on category
    const adjustedConfidence = Math.round(
      baseDetection.confidence * 0.7 + categoryLikelihood * 100 * 0.3
    );

    return {
      ...baseDetection,
      confidence: Math.min(adjustedConfidence, 100),
    };
  }

  return baseDetection;
}

/**
 * Extract potential due date from text
 * Simple patterns like "by Friday", "due tomorrow", etc.
 */
export function extractDueDateHint(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Common patterns
  const patterns = [
    { regex: /due\s+(\w+\s+\d+)/i, group: 1 },
    { regex: /by\s+(\w+\s+\d+)/i, group: 1 },
    { regex: /before\s+(\w+\s+\d+)/i, group: 1 },
    { regex: /deadline[:\s]+(\w+\s+\d+)/i, group: 1 },
  ];

  for (const pattern of patterns) {
    const match = lowerText.match(pattern.regex);
    if (match) {
      return match[pattern.group];
    }
  }

  // Simple day references
  if (lowerText.includes('today')) return 'today';
  if (lowerText.includes('tomorrow')) return 'tomorrow';
  if (lowerText.includes('this week')) return 'this week';
  if (lowerText.includes('next week')) return 'next week';
  if (lowerText.includes('asap') || lowerText.includes('urgent')) return 'asap';

  return null;
}
