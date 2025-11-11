/**
 * API Types and Interfaces
 * Proper TypeScript types to eliminate 'any' usage
 */

import { Request } from 'express';
import {
  TaskContextType,
  TaskPriorityType,
  FollowUpStatusType,
  TaskStatusType,
} from '../config/constants';

// ============================================================================
// Request Types
// ============================================================================

/**
 * Authenticated Request - includes userId from auth middleware
 */
export interface AuthenticatedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  userId: string;
}

/**
 * Request body for manual task extraction
 */
export interface ExtractManualTasksBody {
  text: string;
  context: TaskContextType;
}

/**
 * Request body for accepting tasks
 */
export interface AcceptTasksBody {
  tasks: TaskToAccept[];
}

/**
 * Request body for rejecting tasks
 */
export interface RejectTasksBody {
  taskIds: string[];
  reason?: string;
}

/**
 * Request body for editing task suggestion
 */
export interface EditSuggestionBody {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriorityType;
  boardId?: string;
  listId?: string;
  clientId?: string;
}

/**
 * Request body for follow-up detection
 */
export interface DetectFollowUpsBody {
  thresholdDays?: number;
}

/**
 * Request body for dismissing follow-up
 */
export interface DismissFollowUpBody {
  reason?: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
  error?: string;
}

/**
 * Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  details?: any;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================================================
// Task Types
// ============================================================================

/**
 * Task suggestion from AI extraction
 */
export interface TaskSuggestion {
  id: string;  // Temporary ID for frontend tracking
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriorityType;
  labels?: string[];
  suggestedBoard: BoardSuggestion | null;
  suggestedList: ListSuggestion | null;
  status: 'suggested';
}

/**
 * Task to be accepted/created
 */
export interface TaskToAccept {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriorityType;
  boardId?: string;
  listId?: string;
  clientId?: string;
}

/**
 * Board suggestion
 */
export interface BoardSuggestion {
  id: string;
  name: string;
}

/**
 * List suggestion
 */
export interface ListSuggestion {
  id: string;
  name: string;
  boardId: string;
  boardName: string;
}

/**
 * Task extraction result from AI
 */
export interface TaskExtractionResult {
  tasks: TaskSuggestion[];
  confidence: number;
  availableBoards: BoardWithLists[];
  availableClients: ClientInfo[];
  context: TaskContextType;
}

/**
 * Board with its lists
 */
export interface BoardWithLists {
  id: string;
  name: string;
  lists: ListInfo[];
}

/**
 * List information
 */
export interface ListInfo {
  id: string;
  name: string;
}

/**
 * Client information
 */
export interface ClientInfo {
  id: string;
  name: string;
  email: string;
}

// ============================================================================
// Follow-up Types
// ============================================================================

/**
 * Follow-up entity
 */
export interface FollowUp {
  id: string;
  userId: string;
  clientId?: string;
  emailId?: string;
  threadId: string;
  daysSinceClientMessage: number;
  urgencyScore: number;
  clientMessageSnippet?: string;
  suggestedResponse?: string;
  status: FollowUpStatusType;
  dismissedReason?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Follow-up with additional details (joined data)
 */
export interface FollowUpWithDetails extends FollowUp {
  clientName?: string;
  clientEmail?: string;
  subject?: string;
}

/**
 * Follow-up statistics
 */
export interface FollowUpStats {
  total: number;
  pending: number;
  urgent: number;
  responded: number;
  dismissed: number;
  avgUrgencyScore: number;
}

/**
 * Follow-up detection result
 */
export interface FollowUpDetectionResult {
  createdCount: number;
  thresholdDays: number;
}

/**
 * Urgency score calculation parameters
 */
export interface UrgencyScoreParams {
  daysSinceMessage: number;
  clientSentiment: 'positive' | 'neutral' | 'negative' | null;
  hasDeadline: boolean;
  clientValue: 'vip' | 'high' | 'normal' | 'low';
}

// ============================================================================
// Daily Summary Types
// ============================================================================

/**
 * Daily summary data aggregation
 */
export interface DailySummaryData {
  tasksDueToday: number;
  tasksDueTomorrow: number;
  tasksDueThisWeek: number;
  overdueTasks: number;
  pendingFollowUps: number;
  urgentFollowUps: number;
  activeClients: number;
  atRiskClients: number;
  recentTasks: RecentTask[];
  urgentFollowUpsList: UrgentFollowUpItem[];
  atRiskClientsList: AtRiskClient[];
}

/**
 * Recent task item
 */
export interface RecentTask {
  title: string;
  client: string;
  dueDate?: string;
  priority?: TaskPriorityType;
}

/**
 * Urgent follow-up item
 */
export interface UrgentFollowUpItem {
  clientName: string;
  clientEmail: string;
  daysSinceMessage: number;
  urgencyScore: number;
  subject?: string;
}

/**
 * At-risk client item
 */
export interface AtRiskClient {
  name: string;
  email: string;
  healthScore: number;
  reason: string;
}

/**
 * Daily summary entity
 */
export interface DailySummary {
  id: string;
  userId: string;
  summaryDate: Date;
  summaryText: string;
  summaryData: DailySummaryData;
  tasksDueToday: number;
  tasksDueTomorrow: number;
  pendingFollowUps: number;
  activeClients: number;
  emailSent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Service Method Return Types
// ============================================================================

/**
 * Database query result row (generic)
 */
export interface DbRow {
  [key: string]: any;
}

/**
 * Created task result
 */
export interface CreatedTask {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriorityType;
  status: TaskStatusType;
  createdAt: Date;
}

/**
 * Task acceptance result
 */
export interface TaskAcceptanceResult {
  created: number;
  requested: number;
  tasks: CreatedTask[];
}

// ============================================================================
// Queue Job Types
// ============================================================================

/**
 * Follow-up scan job data
 */
export interface FollowUpScanJob {
  userId?: string;  // If undefined, scan all users
  thresholdDays?: number;
}

/**
 * Daily summary job data
 */
export interface DailySummaryJob {
  userId?: string;  // If undefined, generate for all users
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
