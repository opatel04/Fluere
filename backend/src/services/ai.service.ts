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

Extract all actionable items, to-dos, requests, deadlines, and tasks from the email.

IMPORTANT - These are ALL considered actionable items that should become tasks:
- Payment due dates (bills, credit cards, loans, subscriptions)
- Deadlines and due dates of any kind
- Appointments, meetings, events to attend
- Requests or asks from the sender
- Follow-ups needed
- Documents to review or sign
- Renewals (subscriptions, licenses, memberships)
- Reminders about upcoming obligations
- Any time-sensitive notifications

For each task, determine:
- title: Clear, actionable task title (e.g., "Pay Chase credit card - $1,896.75")
- description: Detailed description with context including amounts, account info, etc.
- priority: low, medium, high, or urgent
  * urgent: Due within 3 days or overdue
  * high: Due within 7 days
  * medium: Due within 30 days
  * low: No specific deadline or far future
- dueDate: ISO 8601 date if mentioned (e.g., "2025-01-15")
- category: Type of task (e.g., "payment", "meeting", "review", "renewal", "deadline")
- labels: Relevant tags (e.g., ["financial", "urgent"], ["work", "meeting"])
- assignee: Person responsible (if mentioned)
- estimatedTime: Time estimate if mentioned

Respond with JSON:
{
  "tasks": [
    {
      "title": string,
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
- Extract ALL actionable items including financial obligations, deadlines, and reminders
- Payment due = always create a task with the amount and due date
- Infer priority from due date proximity and urgency language
- Parse dates in any format to ISO 8601
- Include specific amounts, account numbers (last 4 digits), and key details in task name/description
- If the email contains ANY deadline or due date, create a task for it
- Be thorough - it's better to extract too many tasks than miss important ones${focusNote}`;
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

  /**
   * Quick email categorization using only subject + snippet
   * ULTRA CHEAP: ~100 tokens = $0.0001 per email (99.5% cost reduction)
   *
   * Categories:
   * - finance: Invoices, payments, billing, financial reports
   * - coding: Code reviews, PRs, technical discussions, bug reports
   * - accounting: Taxes, expenses, receipts, bookkeeping
   * - legal: Contracts, agreements, compliance, terms
   * - design: UI/UX feedback, mockups, creative assets
   * - support: Customer questions, bug reports, help requests
   * - partnerships: Business development, collaborations
   * - content: Blog posts, marketing copy, social media
   * - infrastructure: DevOps, deployments, monitoring
   * - personal: Non-work related emails
   */
  async quickCategorize(subject: string, snippet: string): Promise<string> {
    try {
      const prompt = `Categorize this email based on ONLY the subject and snippet.

Subject: ${subject}
Snippet: ${snippet}

Categories (choose ONE):
- finance: Invoices, payments, billing, financial reports, credit cards
- coding: Code reviews, PRs, technical discussions, bug reports, repositories
- accounting: Taxes, expenses, receipts, bookkeeping, financial records
- legal: Contracts, agreements, compliance, terms, policies
- design: UI/UX feedback, mockups, creative assets, branding
- support: Customer questions, bug reports, help requests, issues
- partnerships: Business development, collaborations, networking
- content: Blog posts, marketing copy, social media, newsletters
- infrastructure: DevOps, deployments, servers, monitoring, hosting
- personal: Non-work related emails, casual conversations

Respond with ONLY the category name (single word, lowercase). No explanation.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cheapest model
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 10, // We only need one word
      });

      const category = response.choices[0].message.content?.trim().toLowerCase() || 'personal';

      logger.info(`Quick categorized email: "${subject}" → ${category}`);

      return category;
    } catch (error) {
      logger.error('Error in quick categorization:', error);
      return 'personal'; // Default fallback
    }
  }

  /**
   * Extract smart, technology-specific labels from email
   * Uses GPT-4o-mini for fast, cheap label extraction (~$0.0001/email)
   */
  async extractSmartLabels(subject: string, snippet: string, category: string): Promise<string[]> {
    try {
      const prompt = `Extract specific labels from this email and organize them into a structured format.

Email Subject: ${subject}
Email Content: ${snippet}
Category: ${category}

IMPORTANT: Analyze the email and extract:
1. Top 3 most relevant SKILLS or TECHNOLOGIES (e.g., "React", "Baking", "Algebra").
2. A DEADLINE label if explicitly mentioned (e.g., "Deadline").
3. A general CATEGORY label (e.g., "Coding", "Cooking", "Education").

Return as a JSON object:
{
  "skills": string[], // Max 3 skills
  "deadline": string | null, // "Deadline" or null
  "category": string // General category
}

Example:
{
  "skills": ["React", "TypeScript", "Node.js"],
  "deadline": "Deadline",
  "category": "Coding"
}

JSON Response:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a label extraction assistant. Extract structured labels from emails.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      const content = response.choices[0]?.message?.content?.trim() || '{}';

      // Parse JSON object from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const skills = Array.isArray(data.skills) ? data.skills.slice(0, 3) : [];
        const deadline = data.deadline ? [data.deadline] : [];
        const categoryLabel = data.category ? [data.category] : [category];

        // Combine into prioritized list: Skills (max 3) -> Deadline -> Category
        // Then slice to ensure max 4 total
        const labels = [...skills, ...deadline, ...categoryLabel].slice(0, 4);

        logger.info(`Extracted structured labels: ${labels.join(', ')}`);
        return labels;
      }

      // Fallback to category-based label
      return [category];
    } catch (error) {
      logger.error('Error in extractSmartLabels:', error);
      // Return basic category if AI fails
      return ['General'];
    }
  }

  /**
   * Generate a concise summary of client interactions
   */
  async generateClientSummary(interactions: any[]): Promise<string> {
    try {
      if (!interactions || interactions.length === 0) {
        return "No recent interactions to summarize.";
      }

      const context = interactions.map(i => {
        const date = new Date(i.created_at || i.received_at).toLocaleDateString();
        const type = i.title ? 'Task' : 'Email';
        const content = i.title || i.subject;
        return `[${date}] ${type}: ${content}`;
      }).join('\n');

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a freelancer. Summarize the client\'s current status and key concerns in 1 concise sentence based on the recent interactions provided. Focus on the most recent context.'
          },
          {
            role: 'user',
            content: `Recent Interactions:\n${context}`
          }
        ],
        max_tokens: 100,
        temperature: 0.5,
      });

      return response.choices[0].message.content || "Unable to generate summary.";
    } catch (error) {
      logger.error('Error in generateClientSummary:', error);
      return `Unable to generate summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

export default new AIService();
