/**
 * AI Service Types
 * Defines types for AI-powered task extraction from emails
 */

export type AIProvider = 'openai' | 'gemini';
export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gemini-2.0-flash';

/**
 * Extracted task from email
 */
export interface ExtractedTask {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string; // ISO 8601 format
  category?: string;
  labels?: string[];
  assignee?: string;
  estimatedTime?: string; // e.g., "2 hours", "1 day"
}

/**
 * Task extraction result from AI
 */
export interface TaskExtractionResult {
  tasks: ExtractedTask[];
  summary: string;
  confidence: number; // 0-1
  emailContext: {
    subject: string;
    sender: string;
    date: string;
    hasAttachments: boolean;
  };
  metadata: {
    model: AIModel;
    processingTime: number;
    tokenCount?: number;
  };
}

/**
 * Validation result from validation layer
 */
export interface ValidationResult {
  isComplete: boolean;
  confidence: number; // 0-1
  missingFields: string[];
  suggestions: string[];
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'warning' | 'error';
  suggestion?: string;
}

/**
 * Individual scope creep detection item
 */
export interface ScopeCreepDetection {
  severity: 'low' | 'medium' | 'high';
  category: 'new_deliverable' | 'exclusion_violation' | 'timeline_change' | 'spec_expansion' | 'assumed_inclusion' | 'revision_abuse' | 'other';
  reasoning: string; // Why this is out of scope
  clientQuote: string; // Exact quote from email (required)
  estimatedHours: number;
  detectedDeviation: {
    type: string;
    description: string;
    relatedSpecItem?: string; // What in the spec this relates to
  };
}

/**
 * Scope Creep Detection Result
 * Now supports multiple detections per email
 */
export interface ScopeCreepResult {
  hasScopeCreep: boolean; // True if any detections found
  overallConfidence: number; // 0-1, confidence in detection accuracy
  detections: ScopeCreepDetection[]; // Array of individual scope creep items
  summary?: string; // Overall summary if multiple items found

  // Deprecated: Kept for backwards compatibility
  /** @deprecated Use hasScopeCreep instead */
  isScopeCreep?: boolean;
  /** @deprecated Use detections array instead */
  confidence?: number;
  /** @deprecated Use first detection severity instead */
  severity?: 'low' | 'medium' | 'high';
  /** @deprecated Use first detection category instead */
  category?: string;
  /** @deprecated Use first detection reasoning instead */
  reasoning?: string;
  /** @deprecated Use first detection estimatedHours instead */
  estimatedHours?: number;
  /** @deprecated Use first detection clientQuote instead */
  clientQuote?: string;
  /** @deprecated Use first detection detectedDeviation instead */
  detectedDeviation?: any;
}

/**
 * Email processing options
 */
export interface ProcessingOptions {
  primaryModel?: AIModel;
  fallbackModel?: AIModel;
  validationModel?: AIModel;
  enableValidation?: boolean;
  confidenceThreshold?: number;
  maxRetries?: number;
  extractAttachments?: boolean;
}

/**
 * AI Service Configuration
 */
export interface AIServiceConfig {
  openai: {
    apiKey: string;
    defaultModel: string;
    maxTokens: number;
  };
  gemini: {
    apiKey: string;
    defaultModel: string;
  };
}
