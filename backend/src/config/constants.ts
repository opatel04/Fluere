/**
 * Application Constants
 * Centralized constants to avoid magic numbers and strings throughout codebase
 */

// Follow-up Status
export const FollowUpStatus = {
  PENDING: 'pending',
  DISMISSED: 'dismissed',
  RESPONDED: 'responded',
} as const;

export type FollowUpStatusType = typeof FollowUpStatus[keyof typeof FollowUpStatus];

// Urgency Score Thresholds
export const UrgencyThresholds = {
  URGENT: 7,          // Score >= 7 is considered urgent
  HIGH: 5,            // Score >= 5 is high priority
  MEDIUM: 3,          // Score >= 3 is medium priority
  BASE_SCORE: 5,      // Default starting score
} as const;

// Urgency Score Adjustments
export const UrgencyAdjustments = {
  DAYS_VERY_OVERDUE: 7,      // Days threshold for +3 score
  DAYS_QUITE_OVERDUE: 5,     // Days threshold for +2 score
  DAYS_GETTING_OVERDUE: 3,   // Days threshold for +1 score
  SCORE_VERY_OVERDUE: 3,     // Score increase for very overdue
  SCORE_QUITE_OVERDUE: 2,    // Score increase for quite overdue
  SCORE_GETTING_OVERDUE: 1,  // Score increase for getting overdue
  SCORE_NEGATIVE_SENTIMENT: 2,  // Score increase for unhappy client
  SCORE_POSITIVE_SENTIMENT: -1, // Score decrease for happy client
  SCORE_HAS_DEADLINE: 1,     // Score increase if deadline detected
  SCORE_VIP_CLIENT: 2,       // Score increase for VIP
  SCORE_HIGH_VALUE: 1,       // Score increase for high value
  SCORE_LOW_VALUE: -1,       // Score decrease for low value
} as const;

// Task Context Types
export const TaskContext = {
  EMAIL: 'email',
  MEETING_NOTES: 'meeting_notes',
  GENERAL_NOTES: 'general_notes',
  CHAT: 'chat',
} as const;

export type TaskContextType = typeof TaskContext[keyof typeof TaskContext];

// Task Priority Levels
export const TaskPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type TaskPriorityType = typeof TaskPriority[keyof typeof TaskPriority];

// Priority to Trello List Keyword Mapping
export const PriorityListKeywords = {
  [TaskPriority.HIGH]: ['urgent', 'high priority', 'asap'],
  [TaskPriority.MEDIUM]: ['medium priority', 'normal', 'to do'],
  [TaskPriority.LOW]: ['low priority', 'later', 'someday'],
} as const;

// AI Model Configuration
export const AIModels = {
  FAST: 'gpt-4o-mini',        // Fast model for quick tasks
  PRIMARY: 'gpt-4o',          // Primary model for complex tasks
  VALIDATION: 'gpt-4o-mini',  // Validation model
} as const;

export type AIModelType = typeof AIModels[keyof typeof AIModels];

// Schedule Configuration (can be overridden by env vars)
export const ScheduleConfig = {
  FOLLOWUP_SCAN_CRON: process.env.FOLLOWUP_SCAN_CRON || '0 */4 * * *',  // Every 4 hours
  DAILY_SUMMARY_CRON: process.env.DAILY_SUMMARY_CRON || '0 8 * * *',    // 8 AM daily
  DEFAULT_THRESHOLD_DAYS: 2,  // Default days before follow-up needed
} as const;

// Client Value Tiers
export const ClientValue = {
  VIP: 'vip',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

export type ClientValueType = typeof ClientValue[keyof typeof ClientValue];

// Client Sentiment Types
export const ClientSentiment = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
} as const;

export type ClientSentimentType = typeof ClientSentiment[keyof typeof ClientSentiment];

// Task Status
export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

// Email Processing Status
export const EmailProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type EmailProcessingStatusType = typeof EmailProcessingStatus[keyof typeof EmailProcessingStatus];

// Text Snippet Length
export const TextLimits = {
  SNIPPET_LENGTH: 200,      // Email snippet character limit
  MAX_SUMMARY_TOKENS: 500,  // Max tokens for AI summary
  MAX_INPUT_LENGTH: 10000,  // Max input text length for task extraction
} as const;

// Urgency Score Bounds
export const ScoreBounds = {
  MIN: 1,   // Minimum urgency score
  MAX: 10,  // Maximum urgency score
} as const;

// User Account Constants
export const UserAccount = {
  DELETE_CONFIRMATION: 'DELETE MY ACCOUNT',
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Validation Messages
export const ValidationMessages = {
  TEXT_REQUIRED: 'Text field is required and must not be empty',
  INVALID_CONTEXT: 'Context must be one of: email, meeting_notes, general_notes, chat',
  INVALID_THRESHOLD: 'thresholdDays must be a number >= 1',
  INVALID_STATUS: 'Status must be one of: pending, dismissed, responded, all',
  TASKS_REQUIRED: 'tasks array is required and must not be empty',
  INVALID_EMAIL: 'Invalid email format',
  PROFILE_UPDATE_REQUIRED: 'At least one field (email or name) must be provided',
  DELETE_CONFIRMATION_REQUIRED: 'Account deletion requires confirmation. Please provide {"confirmation": "DELETE MY ACCOUNT"} in the request body',
} as const;

// API Response Messages
export const ApiMessages = {
  UNAUTHORIZED: 'Unauthorized',
  FOLLOWUP_NOT_FOUND: 'Follow-up not found',
  FOLLOWUP_ALREADY_PROCESSED: 'Follow-up not found or already processed',
  FOLLOWUP_DISMISSED: 'Follow-up dismissed successfully',
  FOLLOWUP_RESPONDED: 'Follow-up marked as responded',
  EXTRACTION_SUCCESS: 'Task extraction completed successfully',
  TASKS_ACCEPTED: 'Tasks accepted and created successfully',
  TASKS_REJECTED: 'Tasks rejected successfully',
  SUGGESTION_UPDATED: 'Task suggestion updated',
  USER_NOT_FOUND: 'User not found',
  PROFILE_UPDATED: 'Profile updated successfully',
  ACCOUNT_DELETED: 'Account deleted successfully. All your data has been permanently deleted and cannot be recovered.',
  DATA_EXPORT_NOTICE: 'This file contains all your personal data stored in TaskSnap. Keep it secure.',
} as const;
