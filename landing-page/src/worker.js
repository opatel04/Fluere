/**
 * TaskSnap API - Cloudflare Worker
 * 
 * Main entry point for the TaskSnap backend API
 */

import OpenAI from 'openai';

// CORS headers for cross-origin requests
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const method = request.method;

      // Check request size limits (default 10MB)
      const maxSize = env.MAX_REQUEST_SIZE || 10485760; // 10MB
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxSize) {
        return jsonResponse({
          error: 'Request too large',
          message: `Request size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`
        }, 413);
      }

      // Handle CORS preflight requests
      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: CORS_HEADERS
        });
      }

      // Basic routing
      if (method === 'POST' && url.pathname === '/api/ai-extract') {
        return handleAIExtract(request, env);
      }

      if (method === 'POST' && url.pathname === '/api/new') {
        return handleNewTask(request, env);
      }

      if (method === 'GET' && url.pathname.startsWith('/shared/')) {
        const id = url.pathname.split('/shared/')[1];
        return handleGetShared(id, env);
      }

      if (method === 'GET' && url.pathname === '/health') {
        return handleHealth(env);
      }

      // 404 for unknown routes
      return new Response('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          ...CORS_HEADERS
        }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          ...CORS_HEADERS
        }
      });
    }
  }
};

// Helper function to return JSON responses with CORS headers
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

// Helper function to detect priority from text
function detectPriority(text) {
  const lowerText = text.toLowerCase();
  
  // High priority keywords
  if (lowerText.includes('urgent') || lowerText.includes('asap') || 
      lowerText.includes('important') || lowerText.includes('critical') || 
      lowerText.includes('emergency')) {
    return 'high';
  }
  
  // Low priority keywords
  if (lowerText.includes('later') || lowerText.includes('someday') || 
      lowerText.includes('maybe') || lowerText.includes('eventually')) {
    return 'low';
  }
  
  // Default to medium
  return 'medium';
}

// Helper function to detect dates from text
function detectDate(text) {
  const lowerText = text.toLowerCase();
  const today = new Date();
  
  // Tomorrow
  if (lowerText.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  // Next week
  if (lowerText.includes('next week')) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
  
  // Specific weekdays
  const weekdays = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 7
  };
  
  for (const [dayName, dayNum] of Object.entries(weekdays)) {
    if (lowerText.includes(dayName)) {
      const nextDate = getNextWeekday(today, dayNum);
      return nextDate.toISOString().split('T')[0];
    }
  }
  
  // End of week (Friday)
  if (lowerText.includes('end of week')) {
    const nextFriday = getNextWeekday(today, 5);
    return nextFriday.toISOString().split('T')[0];
  }
  
  return null;
}

// Helper function to detect tags from text
function detectTags(text) {
  const lowerText = text.toLowerCase();
  const tags = [];
  
  // Communication tags
  if (lowerText.includes('call') || lowerText.includes('phone') || 
      lowerText.includes('email') || lowerText.includes('contact')) {
    tags.push('communication');
  }
  
  // Shopping tags
  if (lowerText.includes('buy') || lowerText.includes('purchase') || 
      lowerText.includes('shop') || lowerText.includes('grocery')) {
    tags.push('shopping');
  }
  
  // Work tags
  if (lowerText.includes('work') || lowerText.includes('job') || 
      lowerText.includes('office') || lowerText.includes('project')) {
    tags.push('work');
  }
  
  return tags;
}

// Generate random alphanumeric ID for sharing
function generateId() {
  return Math.random().toString(36).substring(2, 10) + 
         Math.random().toString(36).substring(2, 10);
}

// Escape HTML characters for security
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Calculate task statistics
function calculateStats(tasks, processedMs = 0) {
  if (!Array.isArray(tasks)) {
    return { count: 0, high: 0, medium: 0, low: 0, dated: 0, processedMs };
  }
  
  const count = tasks.length;
  const high = tasks.filter(t => t.priority === 'high').length;
  const medium = tasks.filter(t => t.priority === 'medium').length;
  const low = tasks.filter(t => t.priority === 'low').length;
  const dated = tasks.filter(t => t.due && t.due !== null).length;
  
  return { count, high, medium, low, dated, processedMs };
}

// Format date to human readable format
function formatDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Normalize dates to midnight for comparison
    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const normalizedDate = normalizeDate(date);
    const normalizedToday = normalizeDate(today);
    const normalizedTomorrow = normalizeDate(tomorrow);
    
    if (normalizedDate.getTime() === normalizedToday.getTime()) {
      return 'Today';
    }
    
    if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    // Format as "Mon, Jan 15"
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateStr; // Return original if parsing fails
  }
}

// Get next occurrence of a specific weekday
function getNextWeekday(currentDate, targetDay) {
  // targetDay: 1=Monday, 2=Tuesday, ..., 7=Sunday
  const current = new Date(currentDate);
  const currentDay = current.getDay() || 7; // Convert Sunday (0) to 7
  
  let daysToAdd = targetDay - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // If target day has passed this week, go to next week
  }
  
  const nextDate = new Date(current);
  nextDate.setDate(current.getDate() + daysToAdd);
  return nextDate;
}

// Generate 404 page HTML
function generateNotFoundHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskSnap - Share Not Found</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0A0A0A;
      color: #F4F4F5;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      text-align: center;
      max-width: 500px;
    }
    .logo {
      color: #4ADE80;
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 2rem;
    }
    .error-code {
      font-size: 4rem;
      font-weight: bold;
      color: #EF4444;
      margin-bottom: 1rem;
    }
    .message {
      font-size: 1.25rem;
      margin-bottom: 2rem;
      color: #A1A1AA;
    }
    .back-link {
      display: inline-block;
      background: #4ADE80;
      color: #0A0A0A;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .back-link:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">TaskSnap</div>
    <div class="error-code">404</div>
    <div class="message">
      This shared task list was not found or has expired.
    </div>
    <a href="/" class="back-link">← Back to TaskSnap</a>
  </div>
</body>
</html>`;
}

// Generate shared tasks HTML page
function generateSharedTasksHTML(shareData) {
  const tasks = shareData.tasks || [];
  
  // Calculate statistics
  const totalTasks = tasks.length;
  const highPriorityCount = tasks.filter(t => t.priority === 'high').length;
  const datedCount = tasks.filter(t => t.due).length;
  const views = shareData.views || 0;
  
  // Sort tasks by priority (high, medium, low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTasks = [...tasks].sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  
  // Generate task HTML
  const tasksHTML = sortedTasks.map(task => {
    const title = escapeHtml(task.title);
    const priority = task.priority || 'medium';
    const due = formatDate(task.due);
    const tags = (task.tags || []).map(tag => escapeHtml(tag));
    const confidence = Math.round((task.confidence || 0) * 100);
    
    const priorityClass = `priority-${priority}`;
    const tagsHTML = tags.map(tag => `<span class="tag">${tag}</span>`).join('');
    const dueHTML = due ? `<div class="due-date">📅 ${due}</div>` : '';
    
    return `
      <div class="task-card ${priorityClass}">
        <div class="task-header">
          <h3 class="task-title">${title}</h3>
          <span class="priority-badge priority-${priority}">${priority}</span>
        </div>
        ${dueHTML}
        ${tagsHTML ? `<div class="tags">${tagsHTML}</div>` : ''}
        <div class="confidence">Confidence: ${confidence}%</div>
      </div>
    `;
  }).join('');
  
  const summary = escapeHtml(shareData.summary || 'Shared Task List');
  const createdDate = shareData.createdAt ? new Date(shareData.createdAt).toLocaleDateString() : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskSnap - ${summary}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0A0A0A;
      color: #F4F4F5;
      line-height: 1.6;
      min-height: 100vh;
    }
    
    .header {
      background: linear-gradient(135deg, #1A1A1A, #0A0A0A);
      padding: 2rem 1rem;
      text-align: center;
      border-bottom: 1px solid #27272A;
    }
    
    .logo {
      color: #4ADE80;
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    
    .summary {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      color: #F4F4F5;
    }
    
    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    
    .stat {
      text-align: center;
    }
    
    .stat-number {
      font-size: 1.5rem;
      font-weight: bold;
      color: #4ADE80;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: #A1A1AA;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    
    .task-card {
      background: #18181B;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      border-left: 4px solid #27272A;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }
    
    .task-card.priority-high {
      border-left-color: #EF4444;
    }
    
    .task-card.priority-medium {
      border-left-color: #F59E0B;
    }
    
    .task-card.priority-low {
      border-left-color: #10B981;
    }
    
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      gap: 1rem;
    }
    
    .task-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #F4F4F5;
      flex: 1;
    }
    
    .priority-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      white-space: nowrap;
    }
    
    .priority-badge.priority-high {
      background: rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
      border: 1px solid #EF4444;
    }
    
    .priority-badge.priority-medium {
      background: rgba(245, 158, 11, 0.2);
      color: #FCD34D;
      border: 1px solid #F59E0B;
    }
    
    .priority-badge.priority-low {
      background: rgba(16, 185, 129, 0.2);
      color: #6EE7B7;
      border: 1px solid #10B981;
    }
    
    .due-date {
      color: #A1A1AA;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    
    .tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }
    
    .tag {
      background: #27272A;
      color: #A1A1AA;
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    
    .confidence {
      color: #71717A;
      font-size: 0.75rem;
    }
    
    .footer {
      text-align: center;
      padding: 2rem;
      color: #71717A;
      font-size: 0.875rem;
    }
    
    .back-link {
      display: inline-block;
      background: #4ADE80;
      color: #0A0A0A;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 1rem;
      transition: transform 0.2s;
    }
    
    .back-link:hover {
      transform: translateY(-2px);
    }
    
    @media (max-width: 640px) {
      .stats {
        gap: 1rem;
      }
      
      .task-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
      }
      
      .container {
        padding: 1rem 0.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">TaskSnap</div>
    <div class="summary">${summary}</div>
    <div class="stats">
      <div class="stat">
        <div class="stat-number">${totalTasks}</div>
        <div class="stat-label">Total Tasks</div>
      </div>
      <div class="stat">
        <div class="stat-number">${highPriorityCount}</div>
        <div class="stat-label">High Priority</div>
      </div>
      <div class="stat">
        <div class="stat-number">${datedCount}</div>
        <div class="stat-label">With Dates</div>
      </div>
      <div class="stat">
        <div class="stat-number">${views}</div>
        <div class="stat-label">Views</div>
      </div>
    </div>
  </div>
  
  <div class="container">
    ${tasksHTML || '<div class="task-card"><div class="task-title">No tasks found</div></div>'}
  </div>
  
  <div class="footer">
    ${createdDate ? `Created on ${createdDate}` : ''}<br>
    <a href="/" class="back-link">← Create Your Own TaskSnap</a>
  </div>
</body>
</html>`;
}

// Rule-based extraction fallback when OpenAI fails
async function ruleBasedExtraction(text) {
  // Split text by lines, commas, or semicolons
  const lines = text.split(/[\n,;]+/);
  
  const tasks = [];
  
  for (let line of lines) {
    // Clean each line - remove bullets and trim whitespace
    let cleanLine = line
      .replace(/^[\s\-\*\•\+\>\◦\▪\▫\■\□\◇\◆\○\●\✓\✗\→\»]*/, '') // Remove bullets
      .trim();
    
    // Filter out very short lines (less than 3 characters)
    if (cleanLine.length < 3) {
      continue;
    }
    
    // Create task object
    const task = {
      title: cleanLine,
      priority: detectPriority(cleanLine),
      due: detectDate(cleanLine),
      tags: detectTags(cleanLine),
      confidence: 0.75
    };
    
    tasks.push(task);
  }
  
  return {
    summary: `Extracted ${tasks.length} tasks from text using rule-based analysis`,
    tasks: tasks
  };
}

// Handle AI text extraction endpoint
async function handleAIExtract(request, env) {
  const startTime = Date.now();
  let text;
  
  try {
    // Get text from request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return jsonResponse({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      }, 400);
    }
    
    text = body.text;

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return jsonResponse({
        error: 'Invalid input',
        message: 'Text field is required and cannot be empty'
      }, 400);
    }

    // Validate text length
    const trimmedText = text.trim();
    if (trimmedText.length < 3) {
      return jsonResponse({
        error: 'Text too short',
        message: 'Please provide at least 3 characters of text to analyze'
      }, 400);
    }

    if (trimmedText.length > 5000) {
      return jsonResponse({
        error: 'Text too long',
        message: 'Please limit your text to 5000 characters or less'
      }, 400);
    }

    // Check if OpenAI API key is configured
    if (!env.OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, falling back to rule-based extraction');
      const fallbackData = await ruleBasedExtraction(trimmedText);
      const processedMs = Date.now() - startTime;
      const stats = calculateStats(fallbackData.tasks, processedMs);
      
      return jsonResponse({
        success: true,
        data: fallbackData,
        stats: stats,
        meta: {
          processedAt: new Date().toISOString(),
          processingTimeMs: processedMs,
          method: 'rule-based'
        },
        fallback: true,
        message: 'OpenAI API key not configured, used rule-based extraction'
      });
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Create AI prompt for task extraction
    const prompt = `Extract tasks from the following messy text. Return a JSON object with this exact structure:

{
  "summary": "Brief summary of what the text is about",
  "tasks": [
    {
      "title": "Task description",
      "priority": "high|medium|low",
      "due": "YYYY-MM-DD or null",
      "tags": ["tag1", "tag2"],
      "confidence": 0.95
    }
  ]
}

Rules:
- Extract all actionable tasks, todos, or assignments
- Set priority based on urgency indicators (ASAP, urgent, deadline, etc.)
- Extract dates in YYYY-MM-DD format, use null if no date mentioned
- Add relevant tags based on context (work, personal, meeting, etc.)
- Confidence should be 0-1 based on how clear the task is
- Return valid JSON only, no additional text

Text to analyze:
${text}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    // Parse the AI response
    const aiResponse = completion.choices[0].message.content;
    let extractedData;
    
    try {
      extractedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return jsonResponse({
        error: 'AI response parsing failed',
        message: 'Could not parse the AI-generated task data'
      }, 500);
    }

    // Calculate processing time and statistics
    const processedMs = Date.now() - startTime;
    const stats = calculateStats(extractedData.tasks, processedMs);

    // Return successful extraction with stats
    return jsonResponse({
      success: true,
      data: extractedData,
      stats: stats,
      meta: {
        processedAt: new Date().toISOString(),
        processingTimeMs: processedMs,
        method: 'openai'
      }
    });

  } catch (error) {
    console.error('AI extraction error:', error);
    
    // Try fallback rule-based extraction when OpenAI fails
    if (text && typeof text === 'string' && text.trim().length > 0) {
      try {
        console.log('Falling back to rule-based extraction');
        const fallbackData = await ruleBasedExtraction(text);
        const processedMs = Date.now() - startTime;
        const stats = calculateStats(fallbackData.tasks, processedMs);
        
        return jsonResponse({
          success: true,
          data: fallbackData,
          stats: stats,
          meta: {
            processedAt: new Date().toISOString(),
            processingTimeMs: processedMs,
            method: 'rule-based'
          },
          fallback: true,
          message: 'AI service unavailable, used rule-based extraction'
        });
        
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
      }
    }
    
    // If everything fails, return error
    return jsonResponse({
      error: 'Extraction failed',
      message: 'Both AI and fallback extraction methods failed'
    }, 500);
  }
}

// Handle creating a new shared task list
async function handleCreateShare(request, env) {
  try {
    // Check if KV storage is available
    if (!env.TASKSNAP_KV) {
      return jsonResponse({
        error: 'Service unavailable',
        message: 'Storage service is not configured'
      }, 503);
    }

    // Get data from request body
    let data;
    try {
      data = await request.json();
    } catch (jsonError) {
      return jsonResponse({
        error: 'Invalid JSON',
        message: 'Request body must be valid JSON'
      }, 400);
    }
    
    // Generate unique share ID
    const shareId = generateId();
    
    // Create share data object
    const shareData = {
      id: shareId,
      createdAt: new Date().toISOString(),
      views: 0,
      ...data
    };

    // Store in KV with 30-day expiration
    const expirationTtl = 86400 * 30; // 30 days in seconds
    await env.TASKSNAP_KV.put(
      `share:${shareId}`, 
      JSON.stringify(shareData),
      { expirationTtl }
    );

    // Calculate expires date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return jsonResponse({
      id: shareId,
      url: `/shared/${shareId}`,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error('Create share error:', error);
    return jsonResponse({
      error: 'Failed to create share',
      message: 'Could not save shared task list'
    }, 500);
  }
}

// Handle new task creation endpoint (legacy support)
async function handleNewTask(request, env) {
  // Redirect to create share function
  return handleCreateShare(request, env);
}

// Handle health check endpoint
function handleHealth(env) {
  return jsonResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: env.VERSION || '1.0.0',
    environment: env.ENVIRONMENT || 'production',
    services: {
      kv: env.TASKSNAP_KV ? 'available' : 'unavailable',
      openai: env.OPENAI_API_KEY ? 'configured' : 'not configured'
    }
  });
}

// Handle shared task retrieval endpoint
async function handleGetShared(id, env) {
  try {
    // Check if KV storage is available
    if (!env.TASKSNAP_KV) {
      return jsonResponse({
        error: 'Service unavailable',
        message: 'Storage service is not configured'
      }, 503);
    }

    // Get data from KV storage
    const shareKey = `share:${id}`;
    const shareDataJson = await env.TASKSNAP_KV.get(shareKey);
    
    // Return 404 if not found
    if (!shareDataJson) {
      return new Response(generateNotFoundHTML(), {
        status: 404,
        headers: {
          'Content-Type': 'text/html',
          ...CORS_HEADERS
        }
      });
    }

    // Parse the shared data
    let shareData;
    try {
      shareData = JSON.parse(shareDataJson);
    } catch (parseError) {
      console.error('Failed to parse share data:', parseError);
      return jsonResponse({
        error: 'Data corruption',
        message: 'Shared task list data is corrupted'
      }, 500);
    }

    // Increment view count
    shareData.views = (shareData.views || 0) + 1;
    shareData.lastViewedAt = new Date().toISOString();

    // Save updated data back to KV (preserve original expiration)
    try {
      await env.TASKSNAP_KV.put(shareKey, JSON.stringify(shareData));
    } catch (updateError) {
      console.error('Failed to update view count:', updateError);
      // Continue even if view count update fails
    }

    // Return the share data as HTML
    return new Response(generateSharedTasksHTML(shareData), {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        ...CORS_HEADERS
      }
    });

  } catch (error) {
    console.error('Get shared error:', error);
    return jsonResponse({
      error: 'Failed to retrieve share',
      message: 'Could not load shared task list'
    }, 500);
  }
}
