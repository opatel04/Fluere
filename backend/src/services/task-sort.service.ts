import OpenAI from 'openai';
import config from '../config/env';
import logger from '../config/logger';
import { ExtractedTask } from '../types/ai.types';

export type SortOption = 'priority' | 'name' | 'date' | 'month' | 'year';
export type FilterOption = 'urgent' | 'high' | 'medium' | 'low' | 'overdue' | 'today' | 'this-week' | 'this-month';

export interface SortAndFilterOptions {
  sortBy?: SortOption;
  filters?: FilterOption[];
  userTimezone?: string; // IANA timezone (e.g., 'America/Denver', 'America/New_York')
  userCurrentDate?: string; // ISO date string from client's timezone
}

export interface ChatSortRequest {
  prompt: string;
  tasks: ExtractedTask[];
  userTimezone?: string;
  userCurrentDate?: string;
}

export interface ChatSortResponse {
  sortedTasks: ExtractedTask[];
  explanation: string;
  sortCriteria: {
    sortBy?: SortOption;
    filters?: FilterOption[];
    customLogic?: string;
  };
}

/**
 * Task Sorting and Filtering Service
 * Handles both dropdown-based and AI chat-based task sorting
 */
class TaskSortService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Sort and filter tasks based on dropdown options
   */
  sortAndFilter(tasks: ExtractedTask[], options: SortAndFilterOptions): ExtractedTask[] {
    let filteredTasks = [...tasks];

    // Apply filters first
    if (options.filters && options.filters.length > 0) {
      filteredTasks = this.applyFilters(filteredTasks, options.filters, options);
    }

    // Apply sorting
    if (options.sortBy) {
      filteredTasks = this.applySorting(filteredTasks, options.sortBy);
    }

    logger.info(`Sorted and filtered ${filteredTasks.length} tasks (from ${tasks.length})`);
    return filteredTasks;
  }

  /**
   * Apply filter options to tasks
   */
  private applyFilters(tasks: ExtractedTask[], filters: FilterOption[], options?: SortAndFilterOptions): ExtractedTask[] {
    let filtered = [...tasks];

    // Use user's current date if provided, otherwise fall back to server time
    const userDate = options?.userCurrentDate ? new Date(options.userCurrentDate) : new Date();

    for (const filter of filters) {
      switch (filter) {
        case 'urgent':
          filtered = filtered.filter(t => t.priority === 'urgent');
          break;
        case 'high':
          filtered = filtered.filter(t => t.priority === 'high');
          break;
        case 'medium':
          filtered = filtered.filter(t => t.priority === 'medium');
          break;
        case 'low':
          filtered = filtered.filter(t => t.priority === 'low');
          break;
        case 'overdue':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            // Reset time to start of day for comparison
            const today = new Date(userDate);
            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today;
          });
          break;
        case 'today':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            return (
              dueDate.getDate() === userDate.getDate() &&
              dueDate.getMonth() === userDate.getMonth() &&
              dueDate.getFullYear() === userDate.getFullYear()
            );
          });
          break;
        case 'this-week':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            const today = new Date(userDate);
            today.setHours(0, 0, 0, 0);
            const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            return dueDate >= today && dueDate <= weekFromNow;
          });
          break;
        case 'this-month':
          filtered = filtered.filter(t => {
            if (!t.dueDate) return false;
            const dueDate = new Date(t.dueDate);
            return (
              dueDate.getMonth() === userDate.getMonth() &&
              dueDate.getFullYear() === userDate.getFullYear()
            );
          });
          break;
      }
    }

    return filtered;
  }

  /**
   * Apply sorting to tasks
   */
  private applySorting(tasks: ExtractedTask[], sortBy: SortOption): ExtractedTask[] {
    const sorted = [...tasks];

    switch (sortBy) {
      case 'priority':
        // Sort by priority: urgent > high > medium > low
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        sorted.sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
          return aPriority - bPriority;
        });
        break;

      case 'name':
        // Sort alphabetically by name
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'date':
        // Sort by due date (earliest first)
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        break;

      case 'month':
        // Group by month, then sort by date within each month
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;

          const aDate = new Date(a.dueDate);
          const bDate = new Date(b.dueDate);

          // Compare year first
          if (aDate.getFullYear() !== bDate.getFullYear()) {
            return aDate.getFullYear() - bDate.getFullYear();
          }

          // Then compare month
          if (aDate.getMonth() !== bDate.getMonth()) {
            return aDate.getMonth() - bDate.getMonth();
          }

          // Finally compare day
          return aDate.getDate() - bDate.getDate();
        });
        break;

      case 'year':
        // Group by year, then sort by month and date within each year
        sorted.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;

          const aDate = new Date(a.dueDate);
          const bDate = new Date(b.dueDate);

          // Compare year first
          if (aDate.getFullYear() !== bDate.getFullYear()) {
            return aDate.getFullYear() - bDate.getFullYear();
          }

          // Then compare month
          if (aDate.getMonth() !== bDate.getMonth()) {
            return aDate.getMonth() - bDate.getMonth();
          }

          // Finally compare day
          return aDate.getDate() - bDate.getDate();
        });
        break;
    }

    return sorted;
  }

  /**
   * Sort tasks based on natural language chat prompt using AI
   */
  async sortByChat(request: ChatSortRequest): Promise<ChatSortResponse> {
    try {
      logger.info(`Processing chat sort request: "${request.prompt}"`);

      const prompt = `You are an EXPERT task sorting and filtering assistant with deep understanding of date/time logic, priority systems, and natural language interpretation.

═══════════════════════════════════════════════════════════
CONTEXT
═══════════════════════════════════════════════════════════

User Request: "${request.prompt}"
Current Date/Time: ${request.userCurrentDate || new Date().toISOString()}
User Timezone: ${request.userTimezone || 'UTC'}

Available Tasks (name, dueDate, priority, labels):
${JSON.stringify(request.tasks.map(t => ({
  name: t.name,
  dueDate: t.dueDate,
  priority: t.priority,
  labels: t.labels || [],
  category: t.category
})), null, 2)}

═══════════════════════════════════════════════════════════
AVAILABLE OPERATIONS
═══════════════════════════════════════════════════════════

SORT OPTIONS (choose ONE):
┌─────────┬──────────────────────────────────────────────┐
│ Value   │ Description                                  │
├─────────┼──────────────────────────────────────────────┤
│priority │ urgent > high > medium > low                 │
│name     │ Alphabetical A-Z                             │
│date     │ Earliest due date first                      │
│month    │ Group by month, then by date within month    │
│year     │ Group by year, then by month and date        │
└─────────┴──────────────────────────────────────────────┘

PREDEFINED FILTERS (can combine multiple):
┌─────────┬──────────────────────────────────────────────┐
│ Value   │ Matches                                      │
├─────────┼──────────────────────────────────────────────┤
│urgent   │ priority === "urgent"                        │
│high     │ priority === "high"                          │
│medium   │ priority === "medium"                        │
│low      │ priority === "low"                           │
│overdue  │ dueDate < current date (ignoring time)       │
│today    │ dueDate is today (same day/month/year)       │
│this-week│ dueDate is within next 7 days from today     │
│this-month│dueDate is in current month/year             │
└─────────┴──────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════
DECISION LOGIC (FOLLOW THIS EXACTLY)
═══════════════════════════════════════════════════════════

STEP 1: CLASSIFY THE REQUEST TYPE

A) SIMPLE PREDEFINED FILTER REQUESTS (customFilter: false)
   Use when request EXACTLY matches predefined filters:

   Patterns to recognize:
   • "show/give me [priority] tasks" → filters: [priority]
   • "tasks due today/this week/this month" → filters: [timeframe]
   • "overdue tasks" → filters: ["overdue"]
   • "sort by priority/name/date" → sortBy only, no filters
   • Combinations: "urgent tasks due today" → filters: ["urgent", "today"]

   ✓ ALWAYS use predefined filters when request matches
   ✓ Set customFilter: false
   ✓ Combine multiple filters when appropriate

B) CUSTOM FILTERING REQUIRED (customFilter: true)
   Use when request needs logic beyond predefined filters:

   Patterns requiring custom filtering:
   • Specific months: "November", "December", "next month"
   • Specific dates: "before Friday", "after the 15th", "between X and Y"
   • Date math: "next 3 days", "in 2 weeks", "within 5 days"
   • Label/keyword search: "security tasks", "bug fixes", "deployment"
   • Content matching: "tasks about authentication", "API work"
   • Complex combinations: "urgent security bugs in next 3 days"
   • Recommendations: "what should I do first?", "most important"
   • Negative filters: "not overdue", "excluding low priority"

   ✓ Set customFilter: true
   ✓ Provide DETAILED customCriteria explaining exact logic
   ✓ Include date calculations if needed

STEP 2: DETERMINE SORT ORDER

Default sort logic:
• Date-focused requests → sortBy: "date"
• Priority-focused requests → sortBy: "priority"
• "alphabetical", "by name" → sortBy: "name"
• Ambiguous → sortBy: "date" (most common need)

STEP 3: VALIDATE LOGIC

Before returning, verify:
✓ Is customFilter correctly set?
✓ Are filters valid predefined values?
✓ Does sortBy make sense for the request?
✓ Is explanation clear and accurate?
✓ Will this produce expected results?

═══════════════════════════════════════════════════════════
COMPREHENSIVE EXAMPLES
═══════════════════════════════════════════════════════════

REQUEST: "show me urgent tasks"
ANALYSIS: Direct match to predefined "urgent" filter
RESPONSE:
{
  "explanation": "Showing only urgent priority tasks, sorted by due date (earliest first)",
  "sortCriteria": {
    "sortBy": "date",
    "filters": ["urgent"],
    "customFilter": false
  }
}

REQUEST: "tasks due today"
ANALYSIS: Direct match to predefined "today" filter
RESPONSE:
{
  "explanation": "Showing tasks due today, sorted by priority (urgent first)",
  "sortCriteria": {
    "sortBy": "priority",
    "filters": ["today"],
    "customFilter": false
  }
}

REQUEST: "high priority tasks due this week"
ANALYSIS: Combination of predefined filters
RESPONSE:
{
  "explanation": "Showing high priority tasks due within the next 7 days, sorted by date",
  "sortCriteria": {
    "sortBy": "date",
    "filters": ["high", "this-week"],
    "customFilter": false
  }
}

REQUEST: "tasks due in November"
ANALYSIS: Specific month - requires custom filtering with date comparison
RESPONSE:
{
  "explanation": "Showing all tasks with due dates in November 2025, sorted by date",
  "sortCriteria": {
    "sortBy": "date",
    "customFilter": true,
    "customCriteria": "Filter tasks where dueDate month is November (month 11) and year is 2025. Compare using: new Date(dueDate).getMonth() === 10 && new Date(dueDate).getFullYear() === 2025"
  }
}

REQUEST: "urgent tasks in the next 3 days"
ANALYSIS: Priority filter + custom date range
RESPONSE:
{
  "explanation": "Showing urgent tasks due within the next 3 days from today",
  "sortCriteria": {
    "sortBy": "date",
    "filters": ["urgent"],
    "customFilter": true,
    "customCriteria": "Filter tasks where dueDate is between today and 3 days from now. Calculate: dueDate >= today && dueDate <= (today + 3 days)"
  }
}

REQUEST: "security-related tasks"
ANALYSIS: Keyword/label search - custom filtering required
RESPONSE:
{
  "explanation": "Showing tasks related to security (by label or name), sorted by priority",
  "sortCriteria": {
    "sortBy": "priority",
    "customFilter": true,
    "customCriteria": "Filter tasks where labels include 'security' OR task name/description contains 'security' (case-insensitive)"
  }
}

REQUEST: "what should I work on first?" or "most important tasks"
ANALYSIS: Ambiguous recommendation - apply smart prioritization
RESPONSE:
{
  "explanation": "Recommending tasks in priority order: overdue urgent, then urgent due soon, then high priority tasks",
  "sortCriteria": {
    "sortBy": "priority",
    "customFilter": true,
    "customCriteria": "Multi-tier priority: 1) Overdue AND urgent, 2) Urgent AND due this week, 3) High priority AND due this week, 4) All other urgent/high tasks. Within each tier, sort by earliest due date"
  }
}

REQUEST: "overdue tasks"
ANALYSIS: Direct match to predefined filter
RESPONSE:
{
  "explanation": "Showing all overdue tasks (past due date), sorted by how overdue they are",
  "sortCriteria": {
    "sortBy": "date",
    "filters": ["overdue"],
    "customFilter": false
  }
}

REQUEST: "show all tasks"
ANALYSIS: No filtering needed
RESPONSE:
{
  "explanation": "Showing all tasks sorted by due date",
  "sortCriteria": {
    "sortBy": "date",
    "customFilter": false
  }
}

REQUEST: "deployment tasks before Friday"
ANALYSIS: Keyword + specific date
RESPONSE:
{
  "explanation": "Showing deployment-related tasks due before this Friday",
  "sortCriteria": {
    "sortBy": "date",
    "customFilter": true,
    "customCriteria": "Filter tasks where (labels include 'deployment' OR category is 'deployment' OR name contains 'deploy') AND dueDate is before the upcoming Friday. Calculate Friday as: next occurrence of day 5 (Friday) from current date"
  }
}

═══════════════════════════════════════════════════════════
EDGE CASES & ERROR HANDLING
═══════════════════════════════════════════════════════════

1. NO TASKS AVAILABLE
   → Still return criteria with explanation "No tasks available to filter"

2. NO TASKS MATCH CRITERIA
   → Return criteria with explanation "No tasks match the criteria"
   → Don't modify filters to force matches

3. CONTRADICTORY REQUEST ("urgent low priority tasks")
   → Choose most logical interpretation
   → Explain the choice: "Interpreting as urgent priority (ignoring 'low')"

4. VAGUE TIME ("soon", "later", "eventually")
   → Map to concrete timeframes:
     - "soon" → this-week
     - "later" → custom filter for > 7 days
     - "eventually" → all tasks, sorted by date

5. RELATIVE DATES ("tomorrow", "next week", "in 2 days")
   → ALWAYS use customFilter
   → Calculate exact dates based on current date
   → Show calculation in customCriteria

6. MULTIPLE INTERPRETATIONS
   → Choose the most common/useful interpretation
   → Explain choice in explanation field

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════

{
  "explanation": "Clear, concise 1-2 sentence explanation of what you're doing and why. Use plain English.",
  "sortCriteria": {
    "sortBy": "priority" | "name" | "date" | "month" | "year",  // OPTIONAL: omit if no sorting needed
    "filters": ["filter1", "filter2"],  // OPTIONAL: array of predefined filter strings ONLY
    "customFilter": true | false,  // REQUIRED: true if using custom filtering logic
    "customCriteria": "Detailed technical description..."  // REQUIRED if customFilter is true
  }
}

CRITICAL RULES:
✗ NEVER invent new filter values not in the predefined list
✗ NEVER leave explanation empty
✗ NEVER use customFilter: false with customCriteria
✗ NEVER use customFilter: true without customCriteria
✓ ALWAYS validate dates are compared correctly (don't compare strings)
✓ ALWAYS consider user's timezone
✓ ALWAYS be specific in customCriteria (include date math formulas)
✓ ALWAYS handle case where no tasks match

═══════════════════════════════════════════════════════════

NOW PROCESS THE USER REQUEST ABOVE AND RETURN VALID JSON:`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a task sorting assistant that interprets natural language requests and returns sort/filter criteria.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const aiResult = JSON.parse(response) as {
        explanation: string;
        sortCriteria: {
          sortBy?: SortOption;
          filters?: FilterOption[];
          customFilter?: boolean;
          customCriteria?: string;
        };
      };

      // Validate AI response
      if (!aiResult.explanation || aiResult.explanation.trim() === '') {
        throw new Error('AI returned empty explanation');
      }

      if (aiResult.sortCriteria.customFilter === true && !aiResult.sortCriteria.customCriteria) {
        throw new Error('AI set customFilter=true but did not provide customCriteria');
      }

      if (aiResult.sortCriteria.customFilter === false && aiResult.sortCriteria.customCriteria) {
        logger.warn('AI provided customCriteria but set customFilter=false, ignoring customCriteria');
        delete aiResult.sortCriteria.customCriteria;
      }

      // Validate filter values
      const validFilters: FilterOption[] = ['urgent', 'high', 'medium', 'low', 'overdue', 'today', 'this-week', 'this-month'];
      if (aiResult.sortCriteria.filters) {
        const invalidFilters = aiResult.sortCriteria.filters.filter(f => !validFilters.includes(f));
        if (invalidFilters.length > 0) {
          logger.error(`AI returned invalid filters: ${invalidFilters.join(', ')}`);
          throw new Error(`Invalid filter values: ${invalidFilters.join(', ')}`);
        }
      }

      let sortedTasks: ExtractedTask[];

      // Check if AI needs to do custom filtering
      if (aiResult.sortCriteria.customFilter) {
        // Let AI do the actual filtering for complex cases
        logger.info(`Using AI custom filter: ${aiResult.sortCriteria.customCriteria}`);

        const customPrompt = `Filter and sort these tasks based on the criteria: ${aiResult.sortCriteria.customCriteria}

Current date: ${request.userCurrentDate || new Date().toISOString()}

Tasks:
${JSON.stringify(request.tasks, null, 2)}

Return ONLY the filtered and sorted tasks as a JSON array. If no tasks match, return an empty array.`;

        const customCompletion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a task filtering assistant. Return only a JSON array of tasks that match the criteria.',
            },
            {
              role: 'user',
              content: customPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        });

        const customResponse = customCompletion.choices[0].message.content;
        if (!customResponse) {
          throw new Error('No response from OpenAI for custom filtering');
        }

        const customResult = JSON.parse(customResponse);
        sortedTasks = customResult.tasks || customResult;
      } else {
        // Apply the criteria using our proven filter logic
        sortedTasks = this.sortAndFilter(request.tasks, {
          sortBy: aiResult.sortCriteria.sortBy,
          filters: aiResult.sortCriteria.filters,
          userTimezone: request.userTimezone,
          userCurrentDate: request.userCurrentDate,
        });
      }

      const result: ChatSortResponse = {
        sortedTasks,
        explanation: aiResult.explanation,
        sortCriteria: aiResult.sortCriteria,
      };

      logger.info(`Chat sort completed: ${result.sortedTasks.length} tasks, criteria: ${JSON.stringify(result.sortCriteria)}`);

      return result;
    } catch (error) {
      logger.error('Error processing chat sort:', error);
      throw new Error('Failed to process chat sort request');
    }
  }

  /**
   * Get available sort and filter options
   */
  getAvailableOptions(): {
    sortOptions: Array<{ value: SortOption; label: string; description: string }>;
    filterOptions: Array<{ value: FilterOption; label: string; description: string }>;
  } {
    return {
      sortOptions: [
        {
          value: 'priority',
          label: 'By Priority',
          description: 'Sort by priority (urgent > high > medium > low)',
        },
        {
          value: 'name',
          label: 'By Name',
          description: 'Sort alphabetically by task name',
        },
        {
          value: 'date',
          label: 'By Date',
          description: 'Sort by due date (earliest first)',
        },
        {
          value: 'month',
          label: 'By Month',
          description: 'Group tasks by month',
        },
        {
          value: 'year',
          label: 'By Year',
          description: 'Group tasks by year',
        },
      ],
      filterOptions: [
        {
          value: 'urgent',
          label: 'Urgent Only',
          description: 'Show only urgent priority tasks',
        },
        {
          value: 'high',
          label: 'High Priority',
          description: 'Show only high priority tasks',
        },
        {
          value: 'medium',
          label: 'Medium Priority',
          description: 'Show only medium priority tasks',
        },
        {
          value: 'low',
          label: 'Low Priority',
          description: 'Show only low priority tasks',
        },
        {
          value: 'overdue',
          label: 'Overdue',
          description: 'Show only overdue tasks',
        },
        {
          value: 'today',
          label: 'Due Today',
          description: 'Show tasks due today',
        },
        {
          value: 'this-week',
          label: 'This Week',
          description: 'Show tasks due this week',
        },
        {
          value: 'this-month',
          label: 'This Month',
          description: 'Show tasks due this month',
        },
      ],
    };
  }
}

export default new TaskSortService();
