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
 * Scope Creep Detection Result
 */
export interface ScopeCreepResult {
  isScopeCreep: boolean;
  confidence: number; // 0-1
  severity: 'low' | 'medium' | 'high';
  category: string; // e.g., "new_deliverable", "exclusion_violation"
  reasoning: string;
  estimatedHours?: number;
  clientQuote?: string; // The specific part of the email that triggered it
  detectedDeviation?: any; // Structured data about the deviation
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
