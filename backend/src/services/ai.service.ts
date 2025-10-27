import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/env';
import logger from '../config/logger';
import {
  AIModel,
  ExtractedTask,
  TaskExtractionResult,
  ValidationResult,
  ProcessingOptions,
} from '../types/ai.types';

/**
 * AI Service - Layered approach for email task extraction
 *
 * Layer 1: Extract tasks (GPT-4o or Gemini Flash)
 * Layer 2: Validate extraction (GPT-4o-mini)
 * Layer 3: Re-extract if needed
 */
class AIService {
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.gemini = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  /**
   * Main method: Process email with layered AI approach
   */
  async processEmailWithValidation(
    emailContent: string,
    options: ProcessingOptions = {}
  ): Promise<TaskExtractionResult> {
    const startTime = Date.now();

    const {
      primaryModel = 'gpt-4o',
      validationModel = 'gpt-4o-mini',
      enableValidation = true,
      confidenceThreshold = 0.85,
      maxRetries = 1,
    } = options;

    try {
      // Determine which model to use based on email length
      const tokenCount = this.estimateTokens(emailContent);
      const selectedModel = this.selectModelByLength(tokenCount, primaryModel);

      logger.info(`Processing email with ${selectedModel} (${tokenCount} tokens)`);

      // LAYER 1: Extract tasks
      let extraction = await this.extractTasks(emailContent, selectedModel);

      // LAYER 2: Validate extraction (if enabled)
      if (enableValidation) {
        const validation = await this.validateExtraction(extraction, emailContent, validationModel);

        // LAYER 3: Re-extract if validation failed
        if (!validation.isComplete && maxRetries > 0) {
          logger.info('Validation failed, re-extracting with improvements...');
          extraction = await this.extractTasksWithHints(
            emailContent,
            selectedModel,
            validation.missingFields
          );

          // Update confidence based on second attempt
          extraction.confidence = Math.min(
            extraction.confidence,
            validation.confidence + 0.1
          );
        } else {
          extraction.confidence = validation.confidence;
        }

        // Log validation results
        if (validation.issues.length > 0) {
          logger.warn('Validation issues found:', validation.issues);
        }
      }

      // Add processing time
      extraction.metadata.processingTime = Date.now() - startTime;

      logger.info(
        `Email processed successfully: ${extraction.tasks.length} tasks, confidence: ${extraction.confidence.toFixed(2)}`
      );

      return extraction;
    } catch (error) {
      logger.error('Error processing email with AI:', error);
      throw new Error('Failed to process email with AI');
    }
  }

  /**
   * LAYER 1: Extract tasks from email using AI
   */
  private async extractTasks(
    emailContent: string,
    model: AIModel
  ): Promise<TaskExtractionResult> {
    const startTime = Date.now();

    const prompt = this.buildExtractionPrompt(emailContent);

    let result: TaskExtractionResult;

    if (model.startsWith('gpt')) {
      result = await this.extractWithOpenAI(emailContent, prompt, model);
    } else {
      result = await this.extractWithGemini(emailContent, prompt);
    }

    result.metadata.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Extract with OpenAI (GPT-4o or GPT-4o-mini)
   */
  private async extractWithOpenAI(
    emailContent: string,
    prompt: string,
    model: AIModel
  ): Promise<TaskExtractionResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: emailContent,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Low temperature for consistent extraction
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(response);

      return {
        tasks: parsed.tasks || [],
        summary: parsed.summary || '',
        confidence: parsed.confidence || 0.8,
        emailContext: parsed.emailContext || {},
        metadata: {
          model,
          processingTime: 0,
          tokenCount: completion.usage?.total_tokens,
        },
      };
    } catch (error) {
      logger.error('Error extracting with OpenAI:', error);
      throw new Error('Failed to extract tasks with OpenAI');
    }
  }

  /**
   * Extract with Gemini Flash (for very long emails)
   */
  private async extractWithGemini(
    emailContent: string,
    prompt: string
  ): Promise<TaskExtractionResult> {
    try {
      const model = this.gemini.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const result = await model.generateContent([prompt, emailContent]);
      const response = result.response.text();

      // Parse JSON from response (Gemini sometimes wraps in markdown)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        tasks: parsed.tasks || [],
        summary: parsed.summary || '',
        confidence: parsed.confidence || 0.75,
        emailContext: parsed.emailContext || {},
        metadata: {
          model: 'gemini-2.0-flash',
          processingTime: 0,
        },
      };
    } catch (error) {
      logger.error('Error extracting with Gemini:', error);
      throw new Error('Failed to extract tasks with Gemini');
    }
  }

  /**
   * LAYER 2: Validate extraction quality
   */
  private async validateExtraction(
    extraction: TaskExtractionResult,
    originalEmail: string,
    model: AIModel = 'gpt-4o-mini'
  ): Promise<ValidationResult> {
    try {
      const validationPrompt = `You are a quality assurance system validating task extraction from emails.

Review the extracted tasks and determine if the extraction is complete and accurate.

Original email:
${originalEmail}

Extracted tasks:
${JSON.stringify(extraction.tasks, null, 2)}

Respond with JSON:
{
  "isComplete": boolean,
  "confidence": number (0-1),
  "missingFields": string[],
  "suggestions": string[],
  "issues": [
    {
      "field": string,
      "issue": string,
      "severity": "warning" | "error",
      "suggestion": string
    }
  ]
}`;

      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content:
              'You are a task extraction validator. Analyze if all actionable items were extracted correctly.',
          },
          {
            role: 'user',
            content: validationPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No validation response');
      }

      const validation: ValidationResult = JSON.parse(response);

      logger.info(`Validation result: ${validation.isComplete ? 'Complete' : 'Incomplete'}, confidence: ${validation.confidence}`);

      return validation;
    } catch (error) {
      logger.error('Error validating extraction:', error);

      // Return default validation on error
      return {
        isComplete: true,
        confidence: extraction.confidence,
        missingFields: [],
        suggestions: [],
        issues: [],
      };
    }
  }

  /**
   * LAYER 3: Re-extract with hints from validation
   */
  private async extractTasksWithHints(
    emailContent: string,
    model: AIModel,
    missingFields: string[]
  ): Promise<TaskExtractionResult> {
    logger.info(`Re-extracting with focus on: ${missingFields.join(', ')}`);

    const enhancedPrompt = this.buildExtractionPrompt(emailContent, missingFields);

    return this.extractWithOpenAI(emailContent, enhancedPrompt, model);
  }

  /**
   * Build extraction prompt
   */
  private buildExtractionPrompt(emailContent: string, focusFields?: string[]): string {
    const focusNote = focusFields
      ? `\n\nPay special attention to: ${focusFields.join(', ')}`
      : '';

    return `You are an expert at extracting actionable tasks from emails.

Extract all actionable items, to-dos, requests, and tasks from the email.

For each task, determine:
- name: Clear, concise task name
- description: Detailed description with context
- priority: low, medium, high, or urgent
- dueDate: ISO 8601 date if mentioned (e.g., "2025-01-15")
- category: Type of task (e.g., "meeting", "code review", "documentation")
- labels: Relevant tags
- assignee: Person responsible (if mentioned)
- estimatedTime: Time estimate if mentioned

Respond with JSON:
{
  "tasks": [
    {
      "name": string,
      "description": string,
      "priority": "low" | "medium" | "high" | "urgent",
      "dueDate": string (optional),
      "category": string (optional),
      "labels": string[] (optional),
      "assignee": string (optional),
      "estimatedTime": string (optional)
    }
  ],
  "summary": string (brief summary of the email),
  "confidence": number (0-1, your confidence in the extraction),
  "emailContext": {
    "subject": string,
    "sender": string,
    "date": string,
    "hasAttachments": boolean
  }
}

Rules:
- Extract ALL actionable items, even small ones
- Infer priority from urgency language
- Parse dates in any format to ISO 8601
- If no tasks found, return empty array
- Be thorough but precise${focusNote}`;
  }

  /**
   * Select model based on email length
   */
  private selectModelByLength(tokenCount: number, preferredModel: AIModel): AIModel {
    // For very long emails (>100k tokens), use Gemini Flash
    if (tokenCount > 100000) {
      logger.info('Email exceeds 100k tokens, using Gemini Flash for large context');
      return 'gemini-2.0-flash';
    }

    // Otherwise use preferred model
    return preferredModel;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Quick extraction without validation (for testing)
   */
  async extractTasksQuick(emailContent: string): Promise<ExtractedTask[]> {
    const result = await this.extractTasks(emailContent, 'gpt-4o');
    return result.tasks;
  }
}

export default new AIService();
