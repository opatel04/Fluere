// TaskSnap Demo Script - Live API Integration
console.log('🚀 TaskSnap with Live API Loading...');

// Configuration
const TASKSNAP_API_URL = 'https://tasksnap-api.ompatel1752004.workers.dev';
const CONFIG = {
    MAX_TEXT_LENGTH: 5000,
    MIN_TEXT_LENGTH: 3,
    API_TIMEOUT: 30000, // 30 seconds
    MAX_RETRIES: 2,
    TASKS_PER_PAGE: 20
};

// Global variables
let currentTasks = [];
let currentSummary = '';
let isProcessing = false;
let retryCount = 0;

// Demo data scenarios
const DEMO_SCENARIOS = {
    personal: {
        title: "Personal Tasks",
        text: `Call mom tomorrow about her birthday
Buy groceries before Friday - need milk, bread, eggs
Pay rent by the end of the month
Schedule dentist appointment for next week
Pick up dry cleaning on Tuesday
Plan weekend trip to the mountains
Water the plants tonight
Reply to Sarah's email about the dinner party`
    },
    work: {
        title: "Work Tasks", 
        text: `URGENT: Submit quarterly report by EOD today
Meeting with client on Monday at 3pm to discuss contract
Review and approve marketing budget proposal
Schedule team standup for Wednesday morning
Fix critical bug in dashboard ASAP - users can't log in
Prepare presentation for board meeting next Friday
Send invoice to ABC Corp for last month's work
Update project timeline and share with stakeholders`
    },
    mixed: {
        title: "Mixed Priority Tasks",
        text: `Fix dashboard bug ASAP - this is blocking customers!
Plan weekend camping trip for next month
Urgent: Call doctor about test results today
Buy birthday gift for mom's party on Saturday
Maybe start learning Spanish someday
Schedule oil change for car this week
CRITICAL: Submit tax documents by April 15th
Organize digital photos when I have time
Meet with financial advisor next Tuesday at 2pm`
    },
    complex: {
        title: "Complex Project Tasks",
        text: `Project Alpha Launch - Due March 15th:
- Finalize product specs by Monday
- Complete user testing by Wednesday 
- URGENT: Fix payment integration bug by Friday
- Schedule marketing campaign launch
- Coordinate with design team on final assets
- Deploy to staging environment by March 10th
- Set up monitoring and analytics
- Train customer support team
- Prepare launch day communications
- Schedule post-launch review meeting for March 20th`
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ TaskSnap Demo initialized');
    
    setupDemoEventListeners();
    setupInputValidation();
    setupKeyboardShortcuts();
    setupDemoButtons();
    setupQuickActions();
    
    console.log('✅ All setup functions completed');
});

function setupDemoEventListeners() {
    const btnAI = document.getElementById('btnAI');
    const btnShare = document.getElementById('btnShare');
    const btnIcs = document.getElementById('btnIcs');
    
    if (btnAI) {
        btnAI.addEventListener('click', function(event) {
            console.log('🤖 AI button clicked');
            handleAIOrganizeClick();
        });
        console.log('✅ AI button listener added');
    } else {
        console.error('❌ AI button not found!');
    }
    
    if (btnShare) {
        btnShare.addEventListener('click', handleShareClick);
        console.log('✅ Share button listener added');
    }
    
    if (btnIcs) {
        btnIcs.addEventListener('click', () => downloadICS(currentTasks));
        console.log('✅ ICS button listener added');
    }
    
    console.log('🎯 TaskSnap Ready - Live API Integration');
}

function setupInputValidation() {
    const textarea = document.getElementById('notesInput');
    const charCount = document.getElementById('charCount');
    const charLimit = document.getElementById('charLimit');
    const inputWarning = document.getElementById('inputWarning');
    
    if (!textarea || !charCount) return;
    
    // Update character count and validation
    function updateCharCount() {
        const text = textarea.value;
        const length = text.length;
        
        charCount.textContent = length;
        
        // Update color based on length
        if (length > CONFIG.MAX_TEXT_LENGTH * 0.9) {
            charCount.className = 'text-red-400';
            inputWarning.textContent = 'Approaching character limit';
            inputWarning.classList.remove('hidden');
        } else if (length > CONFIG.MAX_TEXT_LENGTH * 0.8) {
            charCount.className = 'text-yellow-400';
            inputWarning.textContent = 'Getting close to character limit';
            inputWarning.classList.remove('hidden');
        } else if (length < CONFIG.MIN_TEXT_LENGTH && length > 0) {
            charCount.className = 'text-yellow-400';
            inputWarning.textContent = 'Please enter at least 3 characters';
            inputWarning.classList.remove('hidden');
        } else {
            charCount.className = 'text-text-muted';
            inputWarning.classList.add('hidden');
        }
        
        // Update border color
        if (length > CONFIG.MAX_TEXT_LENGTH * 0.9) {
            textarea.classList.add('border-red-500');
            textarea.classList.remove('border-brand-light-gray', 'border-yellow-500');
        } else if (length > CONFIG.MAX_TEXT_LENGTH * 0.8) {
            textarea.classList.add('border-yellow-500');
            textarea.classList.remove('border-brand-light-gray', 'border-red-500');
        } else {
            textarea.classList.add('border-brand-light-gray');
            textarea.classList.remove('border-red-500', 'border-yellow-500');
        }
    }
    
    textarea.addEventListener('input', updateCharCount);
    textarea.addEventListener('paste', () => setTimeout(updateCharCount, 0));
    
    // Initial count
    updateCharCount();
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter or Cmd+Enter to process
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!isProcessing) {
                handleAIOrganizeClick();
            }
        }
        
        // Escape to clear input
        if (e.key === 'Escape') {
            const textarea = document.getElementById('notesInput');
            if (textarea && document.activeElement === textarea) {
                e.preventDefault();
                clearInput();
            }
        }
        
        // Tab navigation (enhanced)
        if (e.key === 'Tab') {
            const focusableElements = document.querySelectorAll(
                'button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])'
            );
            const focusedElementIndex = Array.from(focusableElements).indexOf(document.activeElement);
            
            if (focusedElementIndex >= 0) {
                const nextIndex = e.shiftKey ? 
                    (focusedElementIndex - 1 + focusableElements.length) % focusableElements.length :
                    (focusedElementIndex + 1) % focusableElements.length;
                
                e.preventDefault();
                focusableElements[nextIndex].focus();
            }
        }
    });
    
    console.log('✅ Keyboard shortcuts set up');
}

// Setup demo buttons
function setupDemoButtons() {
    const demoButtons = document.querySelectorAll('.demo-btn');
    const clearButton = document.getElementById('btnClearInput');
    
    demoButtons.forEach(button => {
        button.addEventListener('click', function() {
            const scenario = this.dataset.demo;
            loadDemoScenario(scenario);
        });
    });
    
    if (clearButton) {
        clearButton.addEventListener('click', clearInput);
    }
    
    console.log('✅ Demo buttons set up');
}

// Setup quick action buttons
function setupQuickActions() {
    const btnCopyTasks = document.getElementById('btnCopyTasks');
    const btnCopyShareText = document.getElementById('btnCopyShareText');
    const btnExportText = document.getElementById('btnExportText');
    
    if (btnCopyTasks) {
        btnCopyTasks.addEventListener('click', copyTasksList);
    }
    
    if (btnCopyShareText) {
        btnCopyShareText.addEventListener('click', copyShareText);
    }
    
    if (btnExportText) {
        btnExportText.addEventListener('click', exportAsText);
    }
    
    console.log('✅ Quick actions set up');
}

// Load demo scenario
function loadDemoScenario(scenarioKey) {
    const scenario = DEMO_SCENARIOS[scenarioKey];
    if (!scenario) return;
    
    const textarea = document.getElementById('notesInput');
    if (!textarea) return;
    
    // Add loading animation to button
    const clickedButton = document.querySelector(`[data-demo="${scenarioKey}"]`);
    if (clickedButton) {
        const originalText = clickedButton.innerHTML;
        clickedButton.innerHTML = '⏳ Loading...';
        clickedButton.disabled = true;
        
        setTimeout(() => {
            clickedButton.innerHTML = originalText;
            clickedButton.disabled = false;
        }, 500);
    }
    
    // Clear existing content with animation
    if (textarea.value.trim()) {
        textarea.style.opacity = '0.5';
        setTimeout(() => {
            textarea.value = '';
            typeTextAnimation(textarea, scenario.text);
        }, 200);
    } else {
        typeTextAnimation(textarea, scenario.text);
    }
    
    showStatus(`📋 Loaded ${scenario.title} demo scenario`, 'info');
}

// Animate typing text
function typeTextAnimation(textarea, text) {
    textarea.style.opacity = '1';
    textarea.value = '';
    textarea.focus();
    
    let i = 0;
    const typingSpeed = 20; // milliseconds per character
    
    function type() {
        if (i < text.length) {
            textarea.value += text.charAt(i);
            i++;
            // Trigger input event to update character count
            textarea.dispatchEvent(new Event('input'));
            setTimeout(type, typingSpeed);
        }
    }
    
    type();
}

// Clear input function
function clearInput() {
    const textarea = document.getElementById('notesInput');
    if (!textarea) return;
    
    if (textarea.value.trim()) {
        textarea.style.opacity = '0.5';
        setTimeout(() => {
            textarea.value = '';
            textarea.style.opacity = '1';
            textarea.dispatchEvent(new Event('input')); // Update character count
            textarea.focus();
        }, 200);
        
        showStatus('🗑️ Input cleared', 'info');
    }
}

// Validate input before processing
function validateInput(text) {
    if (!text || typeof text !== 'string') {
        return { valid: false, error: 'Please enter some text to organize.' };
    }
    
    const trimmed = text.trim();
    
    if (trimmed.length < CONFIG.MIN_TEXT_LENGTH) {
        return { valid: false, error: `Please enter at least ${CONFIG.MIN_TEXT_LENGTH} characters.` };
    }
    
    if (trimmed.length > CONFIG.MAX_TEXT_LENGTH) {
        return { valid: false, error: `Text is too long. Please limit to ${CONFIG.MAX_TEXT_LENGTH} characters.` };
    }
    
    return { valid: true, text: trimmed };
}

// Handle AI organize button click with validation
async function handleAIOrganizeClick() {
    console.log('🤖 Starting AI organization...');
    
    if (isProcessing) {
        showStatus('⏳ Already processing. Please wait...', 'info');
        return;
    }
    
    const textarea = document.getElementById('notesInput');
    if (!textarea) {
        console.error('❌ Textarea not found!');
        showStatus('❌ Input field not found', 'error');
        return;
    }
    
    console.log('📝 Input text length:', textarea.value.length);
    
    const validation = validateInput(textarea.value);
    if (!validation.valid) {
        console.log('❌ Validation failed:', validation.error);
        showStatus(validation.error, 'error');
        textarea.focus();
        return;
    }
    
    console.log('✅ Input validated, processing...');
    await aiOrganizeFromTextarea(validation.text);
}

// Handle share button click
async function handleShareClick() {
    if (isProcessing) {
        showStatus('⏳ Please wait for current operation to complete.', 'info');
        return;
    }
    
    if (!currentTasks.length) {
        showStatus('📝 No tasks to share. Please organize some notes first.', 'error');
        return;
    }
    
    await shareChecklist(currentTasks, currentSummary);
}

// Enhanced loading state management
function setLoadingState(isLoading, buttonId, loadingText = 'Processing...') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
        <span class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
                ${loadingText}
        </span>
    `;
    } else {
        button.disabled = currentTasks.length === 0 && buttonId !== 'btnAI'; // Keep share/ics disabled if no tasks
        
        // Restore original button content based on ID
        if (buttonId === 'btnAI') {
            button.innerHTML = `
                <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    🤖 Organize with AI
                </span>
            `;
        } else if (buttonId === 'btnShare') {
            button.innerHTML = `
                <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    📤 Share Tasks
                </span>
            `;
        }
    }
}

// Fetch with timeout and retry logic
async function fetchWithTimeout(url, options = {}, timeout = CONFIG.API_TIMEOUT) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please try again.');
        }
        throw error;
    }
}

// Enhanced API call with retry logic
async function callAPIWithRetry(url, options = {}, maxRetries = CONFIG.MAX_RETRIES) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options);
            
            if (!response.ok) {
                // Handle specific HTTP errors
                if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else if (response.status === 503) {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                } else if (response.status >= 500) {
                    throw new Error(`Server error (${response.status}). Please try again.`);
                } else if (response.status === 400) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'Invalid request. Please check your input.');
                } else {
                    throw new Error(`API Error: ${response.status} ${response.statusText}`);
                }
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries && !error.message.includes('Rate limit') && !error.message.includes('Invalid request')) {
                console.log(`Attempt ${attempt + 1} failed, retrying...`, error.message);
                showStatus(`🔄 Attempt ${attempt + 1} failed, retrying...`, 'info');
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            } else {
                break;
            }
        }
    }
    
    throw lastError;
}

async function aiOrganizeFromTextarea(text) {
    console.log('🚀 Processing text with API...');
    
    isProcessing = true;
    retryCount = 0;
    
    try {
        // Set loading state
        setLoadingState(true, 'btnAI', '🤖 AI Processing...');
        setAllButtonsState(false);
        
        showStatus('🤖 Connecting to TaskSnap API...', 'info');
        showLoadingSkeletons();
        
        console.log('📡 Making API call to:', `${TASKSNAP_API_URL}/api/ai-extract`);
        
        // Make the API request
        const response = await fetch(`${TASKSNAP_API_URL}/api/ai-extract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        
        console.log('📡 API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('📊 API response received:', {
            success: result.success,
            taskCount: result.data?.tasks?.length || 0,
            method: result.meta?.method
        });
        
        if (!result.success) {
            throw new Error(result.message || 'API returned an error');
        }
        
        // Validate and sanitize task data
        const tasks = validateAndSanitizeTasks(result.data?.tasks || []);
        const summary = sanitizeText(result.data?.summary || '');
        
        if (tasks.length === 0) {
            showStatus('🔍 No tasks found in your text. Try adding more specific actions or to-dos.', 'info');
            return;
        }
        
        // Store current data
        currentTasks = tasks;
        currentSummary = summary;
        
        // Prepare extraction data for display
        const extraction = {
            tasks: tasks,
            summary: summary,
            stats: {
                count: tasks.length,
                high: tasks.filter(t => t.priority === 'high').length,
                medium: tasks.filter(t => t.priority === 'medium').length,
                low: tasks.filter(t => t.priority === 'low').length,
                dated: tasks.filter(t => t.due).length,
                processedMs: result.meta?.processingTimeMs || 0
            }
        };
        
    // Remove loading skeletons and display results
    removeLoadingSkeletons();
    displayExtraction(extraction);
    
    // Enable action buttons
    enableActionButtons();
    
    // Add success animations
    addSuccessAnimation();
        
        // Show success message
        const method = result.meta?.method || 'AI';
        const fallbackMsg = result.fallback ? ' (using rule-based fallback)' : '';
        const processingTime = result.meta?.processingTimeMs ? ` in ${result.meta.processingTimeMs}ms` : '';
        showStatus(`🎉 ${method} organized ${tasks.length} tasks successfully!${fallbackMsg}${processingTime}`, 'success');
        
    } catch (error) {
        console.error('❌ Error processing tasks:', error.message);
        
        // Determine error type and show user-friendly message
        let errorMessage;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (error.message.includes('timed out')) {
            errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('API Error')) {
            errorMessage = 'Processing failed, please try again.';
        } else {
            errorMessage = 'An unexpected error occurred. Please try again.';
        }
        
        showStatus(`❌ ${errorMessage}`, 'error');
        
        // Try local fallback as last resort
        if (!error.message.includes('Rate limit') && !error.message.includes('Invalid request')) {
            try {
                showStatus('🔄 Trying local fallback processing...', 'info');
            const extraction = parseTasksLocal(text);
                
                if (extraction.tasks.length > 0) {
            currentTasks = extraction.tasks;
                    currentSummary = extraction.summary;
            displayExtraction(extraction);
                    enableActionButtons();
                    showStatus(`💻 Using local processing: Organized ${extraction.tasks.length} tasks`, 'success');
                } else {
                    showStatus('❌ Unable to extract tasks using any method', 'error');
                }
        } catch (fallbackError) {
                console.error('Local fallback also failed:', fallbackError);
                showStatus('❌ All processing methods failed. Please try again later.', 'error');
            }
        }
    } finally {
        console.log('🔄 Cleaning up processing state...');
        isProcessing = false;
        setLoadingState(false, 'btnAI');
        setAllButtonsState(true);
        console.log('✅ Processing completed');
    }
}

// Validate and sanitize task data
function validateAndSanitizeTasks(tasks) {
    if (!Array.isArray(tasks)) return [];
    
    return tasks
        .filter(task => task && typeof task === 'object' && task.title)
        .map(task => ({
            title: sanitizeText(task.title),
            priority: ['high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
            due: task.due && /^\d{4}-\d{2}-\d{2}$/.test(task.due) ? task.due : null,
            tags: Array.isArray(task.tags) ? task.tags.map(tag => sanitizeText(tag)).filter(Boolean) : [],
            confidence: typeof task.confidence === 'number' ? Math.max(0, Math.min(1, task.confidence)) : 0.7
        }))
        .slice(0, 100); // Limit to 100 tasks for performance
}

// Sanitize text to prevent XSS and handle special characters
function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text
        .trim()
        .substring(0, 500) // Limit length
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/\s+/g, ' '); // Normalize whitespace
}

// Enable/disable all buttons
function setAllButtonsState(enabled) {
    const buttons = ['btnAI', 'btnShare', 'btnIcs'];
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button && buttonId !== 'btnAI') { // Don't change AI button during processing
            button.disabled = !enabled;
        }
    });
}

// Enable action buttons based on available data
function enableActionButtons() {
    const hasTasks = currentTasks.length > 0;
    const hasTasksWithDates = currentTasks.filter(task => task.due).length > 0;
    
    // Enable share button if there are tasks
    const btnShare = document.getElementById('btnShare');
    if (btnShare) btnShare.disabled = !hasTasks;
    
    // Enable ICS button if there are tasks with dates
    const btnIcs = document.getElementById('btnIcs');
    if (btnIcs) btnIcs.disabled = !hasTasksWithDates;
    
    // Enable quick action buttons
    const btnCopyTasks = document.getElementById('btnCopyTasks');
    const btnCopyShareText = document.getElementById('btnCopyShareText');
    const btnExportText = document.getElementById('btnExportText');
    
    if (btnCopyTasks) btnCopyTasks.disabled = !hasTasks;
    if (btnCopyShareText) btnCopyShareText.disabled = !hasTasks;
    if (btnExportText) btnExportText.disabled = !hasTasks;
}

// Enhanced share checklist function
async function shareChecklist(tasks, summary = '') {
    if (isProcessing) {
        showStatus('⏳ Please wait for current operation to complete.', 'info');
        return;
    }
    
    if (!tasks || tasks.length === 0) {
        showStatus('📝 No tasks to share. Please organize some notes first.', 'error');
        return;
    }
    
    isProcessing = true;
    setLoadingState(true, 'btnShare', '📤 Creating link...');
    
    try {
        showStatus('📤 Creating shareable link...', 'info');
        
        // Prepare and validate share data
        const shareData = {
            summary: sanitizeText(summary || `Shared TaskList (${tasks.length} tasks)`),
            tasks: validateAndSanitizeTasks(tasks)
        };
        
        if (shareData.tasks.length === 0) {
            throw new Error('No valid tasks to share');
        }
        
        // Use enhanced API call with retry
        const response = await callAPIWithRetry(`${TASKSNAP_API_URL}/api/new`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify(shareData)
        });
        
        const result = await response.json();
        
        if (!result || !result.url) {
            throw new Error('Invalid share response from server');
        }
        
        const shareUrl = `${TASKSNAP_API_URL}${result.url}`;
        
        // Try to copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            showStatus(`🎉 Share link copied to clipboard! Link expires ${new Date(result.expiresAt).toLocaleDateString()}`, 'success');
        } catch (clipboardError) {
            // Fallback if clipboard API fails
            showStatus(`✅ Share link created! Please copy: ${shareUrl}`, 'success');
        }
        
        // Show the link in the UI with better styling
        displayShareLink(shareUrl, result.expiresAt);
        
        return shareUrl;
        
    } catch (error) {
        console.error('Share error:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = '🌐 Network error. Please check your connection and try again.';
        } else if (error.message.includes('timed out')) {
            errorMessage = '⏰ Share request timed out. Please try again.';
        }
        
        showStatus(`❌ Share failed: ${errorMessage}`, 'error');
        return null;
    } finally {
        isProcessing = false;
        setLoadingState(false, 'btnShare');
    }
}

// Display share link in UI
function displayShareLink(shareUrl, expiresAt) {
    const statusMessages = document.getElementById('statusMessages');
    if (!statusMessages) return;
    
    const linkDiv = document.createElement('div');
    linkDiv.className = 'p-4 rounded-lg border bg-brand-accent/10 border-brand-accent/30 text-brand-accent text-sm animate-fade-in';
    linkDiv.innerHTML = `
        <div class="flex flex-col gap-2">
            <div class="font-medium">🔗 Shareable Link Created!</div>
            <div class="break-all">
                <a href="${shareUrl}" target="_blank" class="underline hover:no-underline">${shareUrl}</a>
            </div>
            <div class="flex items-center justify-between text-xs">
                <span>Expires: ${new Date(expiresAt).toLocaleDateString()}</span>
                <button onclick="copyShareLink('${shareUrl}')" class="px-2 py-1 bg-brand-accent/30 hover:bg-brand-accent/50 rounded transition-colors">
                    📋 Copy Again
                </button>
            </div>
        </div>
    `;
    
    // Remove any existing share links
    const existingLinks = statusMessages.querySelectorAll('.share-link');
    existingLinks.forEach(link => link.remove());
    
    linkDiv.classList.add('share-link');
    statusMessages.appendChild(linkDiv);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (linkDiv.parentNode) {
            linkDiv.style.opacity = '0';
            setTimeout(() => linkDiv.remove(), 300);
        }
    }, 30000);
}

// Copy share link function for button
async function copyShareLink(url) {
    try {
        await navigator.clipboard.writeText(url);
        showStatus('📋 Link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Clipboard error:', error);
        showStatus('❌ Could not copy to clipboard. Please copy manually.', 'error');
    }
}

function parseTasksLocal(text) {
    const startTime = Date.now();
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    const tasks = [];
    
    // Enhanced task detection
    const taskIndicators = /^[-*•]|^\d+[.)]|^[\w]/;
    const urgentWords = /urgent|asap|immediately|critical|emergency|important|high priority/i;
    const datePatterns = /\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|next week|this week|end of week)\b/i;
    
    for (const line of lines) {
        if (!line || line.length < 3) continue;
        
        // Clean up task title
        let title = line.replace(/^[-*•]|^\d+[.)]/, '').trim();
        if (title.length > 200) {
            title = title.substring(0, 197) + '...';
        }
        
        // Extract due date
        let due = null;
        const dateMatch = title.match(datePatterns);
        if (dateMatch) {
            const dateStr = dateMatch[0].toLowerCase();
            const today = new Date();
            
            if (dateStr === 'today') {
                due = today.toISOString().split('T')[0];
            } else if (dateStr === 'tomorrow') {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                due = tomorrow.toISOString().split('T')[0];
            } else if (dateStr === 'friday') {
                const friday = new Date(today);
                const daysUntilFriday = (5 - today.getDay() + 7) % 7 || 7;
                friday.setDate(today.getDate() + daysUntilFriday);
                due = friday.toISOString().split('T')[0];
            } else if (dateStr === 'monday') {
                const monday = new Date(today);
                const daysUntilMonday = (1 - today.getDay() + 7) % 7 || 7;
                monday.setDate(today.getDate() + daysUntilMonday);
                due = monday.toISOString().split('T')[0];
            } else if (dateStr === 'end of week') {
                const friday = new Date(today);
                friday.setDate(today.getDate() + (5 - today.getDay()));
                due = friday.toISOString().split('T')[0];
            }
            
            // Remove date from title
            title = title.replace(dateMatch[0], '').trim();
        }
        
        // Determine priority
        let priority = 'low';
        if (urgentWords.test(line) || (due && new Date(due) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))) {
            priority = 'high';
        } else if (due && new Date(due) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
            priority = 'medium';
        }
        
        // Calculate confidence
        let confidence = 0.7;
        if (taskIndicators.test(line)) confidence += 0.1;
        if (due) confidence += 0.1;
        if (title.includes(' ') && title.length > 8) confidence += 0.1;
        
        tasks.push({
            title,
            due,
            priority,
            confidence: Math.min(confidence, 1)
        });
    }
    
    const processedMs = Date.now() - startTime;
    const highCount = tasks.filter(t => t.priority === 'high').length;
    const datedCount = tasks.filter(t => t.due).length;
    
    // Generate executive summary
    const summary = generateSummary(tasks, highCount, datedCount);
    
    return {
        tasks,
        summary,
        stats: {
            count: tasks.length,
            high: highCount,
            dated: datedCount,
            processedMs
        }
    };
}

function generateSummary(tasks, highCount, datedCount) {
    const totalCount = tasks.length;
    if (totalCount === 0) return 'No tasks found.';
    
    let summary = `AI identified ${totalCount} actionable task${totalCount !== 1 ? 's' : ''}`;
    
    if (highCount > 0) {
        summary += `, ${highCount} marked high priority`;
    }
    
    if (datedCount > 0) {
        summary += `, ${datedCount} with deadlines`;
    }
    
    summary += '.';
    
    // Add focus recommendation
    if (highCount > 0) {
        const urgentTasks = tasks.filter(t => t.priority === 'high').slice(0, 2);
        const urgentTitles = urgentTasks.map(t => t.title.length > 25 ? t.title.substring(0, 22) + '...' : t.title);
        summary += ` Focus on: ${urgentTitles.join(' and ')}.`;
    }
    
    return summary;
}

function displayExtraction(extraction) {
    // Show brief
    const briefSection = document.getElementById('briefSection');
    const briefLine = document.getElementById('briefLine');
    
    if (extraction.summary && briefSection && briefLine) {
        briefLine.textContent = extraction.summary;
        briefSection.classList.remove('hidden');
    }
    
    // Update stats
    updateTaskStats(extraction.stats);
    
    // Render tasks
    renderTasks(extraction.tasks);
    
    // Show tasks section
    const tasksSection = document.getElementById('tasksSection');
    if (tasksSection) {
        tasksSection.classList.remove('hidden');
        
        // Smooth scroll to tasks
        setTimeout(() => {
            tasksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

function updateTaskStats(stats) {
    const totalCountEl = document.getElementById('totalCount');
    const highPriorityCountEl = document.getElementById('highPriorityCount');
    const datedCountEl = document.getElementById('datedCount');
    const processedTimeEl = document.getElementById('processedTime');
    
    if (totalCountEl) {
        totalCountEl.textContent = `${stats.count} task${stats.count !== 1 ? 's' : ''}`;
    }
    
    if (highPriorityCountEl && stats.high > 0) {
        highPriorityCountEl.textContent = `${stats.high} high priority`;
        highPriorityCountEl.classList.remove('hidden');
    }
    
    if (datedCountEl && stats.dated > 0) {
        datedCountEl.textContent = `${stats.dated} with dates`;
        datedCountEl.classList.remove('hidden');
    }
    
    if (processedTimeEl) {
        processedTimeEl.textContent = `${stats.processedMs}ms`;
        processedTimeEl.classList.remove('hidden');
    }
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    if (tasks.length === 0) {
        tasksList.innerHTML = `
            <div class="text-center py-8 text-text-muted">
                <div class="text-4xl mb-4">📝</div>
                <p class="text-lg font-medium mb-2">No tasks found in your notes</p>
                <p class="text-sm">Try adding more specific actions, to-dos, or tasks to your text.</p>
            </div>
        `;
        return;
    }
    
    // Sort tasks by priority and due date
    const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        if (a.due && b.due) {
            return new Date(a.due) - new Date(b.due);
        }
        
        return 0;
    });
    
    // Handle large task lists with pagination
    const tasksToShow = CONFIG.TASKS_PER_PAGE;
    const shouldPaginate = sortedTasks.length > tasksToShow;
    const initialTasks = shouldPaginate ? sortedTasks.slice(0, tasksToShow) : sortedTasks;
    
    tasksList.innerHTML = `
        <div class="tasks-container">
            ${initialTasks.map((task, index) => renderSingleTask(task, index)).join('')}
        </div>
        ${shouldPaginate ? `
            <div class="mt-4 text-center">
                <button id="showMoreTasks" class="px-4 py-2 bg-brand-light-gray hover:bg-brand-accent/20 text-text-secondary hover:text-brand-accent rounded-lg transition-colors">
                    Show ${Math.min(tasksToShow, sortedTasks.length - tasksToShow)} more tasks (${sortedTasks.length - tasksToShow} remaining)
                </button>
            </div>
        ` : ''}
    `;
    
    // Add show more functionality
    if (shouldPaginate) {
        const showMoreBtn = document.getElementById('showMoreTasks');
        if (showMoreBtn) {
            let currentIndex = tasksToShow;
            showMoreBtn.addEventListener('click', () => {
                const container = tasksList.querySelector('.tasks-container');
                const nextBatch = sortedTasks.slice(currentIndex, currentIndex + tasksToShow);
                
                nextBatch.forEach((task, index) => {
                    const taskHTML = renderSingleTask(task, currentIndex + index);
                    container.insertAdjacentHTML('beforeend', taskHTML);
                    
                    // Add highlight effect to newly added tasks
                    const newTask = container.lastElementChild;
                    if (newTask) {
                        addHighlightEffect(newTask);
                    }
                });
                
                currentIndex += tasksToShow;
                
                if (currentIndex >= sortedTasks.length) {
                    showMoreBtn.style.display = 'none';
                } else {
                    const remaining = sortedTasks.length - currentIndex;
                    showMoreBtn.textContent = `Show ${Math.min(tasksToShow, remaining)} more tasks (${remaining} remaining)`;
                }
            });
        }
    }
}

// Render a single task with enhanced styling and validation
function renderSingleTask(task, index) {
        const priorityClass = task.priority ? `priority-${task.priority}` : '';
        const dueDateFormatted = task.due ? formatDate(task.due) : '';
        const confidenceWidth = Math.round((task.confidence || 0) * 100);
    const tagsHtml = (task.tags || []).length > 0 ? 
        `<div class="flex flex-wrap gap-1 mt-1">
            ${task.tags.map(tag => `<span class="px-2 py-1 bg-brand-dark/50 text-text-muted rounded text-xs">${escapeHtml(tag)}</span>`).join('')}
        </div>` : '';
    
    // Enhanced title handling for long titles
    const title = escapeHtml(task.title);
    const truncatedTitle = title.length > 100 ? title.substring(0, 97) + '...' : title;
    const hasLongTitle = title.length > 100;
        
        return `
        <div class="task-item p-4 rounded-xl ${priorityClass} border border-transparent hover:border-brand-accent/30 transition-all duration-200" 
             data-task-index="${index}">
            <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-text-primary mb-1 ${hasLongTitle ? 'cursor-pointer' : ''}" 
                        ${hasLongTitle ? `onclick="toggleTaskTitle(${index})" title="Click to ${hasLongTitle ? 'expand' : 'view full text'}"` : ''}>
                        <span class="task-title-text">${truncatedTitle}</span>
                        ${hasLongTitle ? '<span class="text-brand-accent ml-1">...</span>' : ''}
                    </h4>
                    ${hasLongTitle ? `<div class="task-full-title hidden text-text-primary">${title}</div>` : ''}
                    <div class="flex items-center gap-4 text-sm text-text-muted flex-wrap">
                        ${task.priority ? `<span class="inline-flex px-2 py-1 rounded text-xs bg-${getPriorityColor(task.priority)}/20 text-${getPriorityColor(task.priority)}-400 border border-${getPriorityColor(task.priority)}/30">${task.priority}</span>` : ''}
                            ${dueDateFormatted ? `<span class="flex items-center gap-1">📅 ${dueDateFormatted}</span>` : ''}
                        ${confidenceWidth < 70 ? `<span class="text-yellow-400 text-xs">⚠️ Low confidence</span>` : ''}
                        </div>
                    ${tagsHtml}
                    </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <div class="w-16 h-2 bg-brand-light-gray rounded-full overflow-hidden" title="AI Confidence: ${confidenceWidth}%">
                        <div class="h-full bg-brand-accent rounded-full transition-all duration-300" style="width: ${confidenceWidth}%"></div>
                        </div>
                    <span class="text-xs text-text-muted tabular-nums">${confidenceWidth}%</span>
                    </div>
                </div>
            </div>
        `;
}

// Toggle task title expansion for long titles
function toggleTaskTitle(index) {
    const taskItem = document.querySelector(`[data-task-index="${index}"]`);
    if (!taskItem) return;
    
    const titleText = taskItem.querySelector('.task-title-text');
    const fullTitle = taskItem.querySelector('.task-full-title');
    const expandIcon = taskItem.querySelector('.task-title-text + span');
    
    if (fullTitle && titleText) {
        if (fullTitle.classList.contains('hidden')) {
            fullTitle.classList.remove('hidden');
            titleText.style.display = 'none';
            if (expandIcon) expandIcon.style.display = 'none';
        } else {
            fullTitle.classList.add('hidden');
            titleText.style.display = 'inline';
            if (expandIcon) expandIcon.style.display = 'inline';
        }
    }
}

// Enhanced status message function with better UX
function showStatus(message, type = 'info', duration = 5000) {
    const statusMessages = document.getElementById('statusMessages');
    if (!statusMessages) return;
    
    const colors = {
        success: 'bg-green-500/20 border-green-500/30 text-green-400',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
        info: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
        warning: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
    };
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    // Remove any existing error messages if this is a new error
    if (type === 'error') {
        const existingErrors = statusMessages.querySelectorAll('.status-error');
        existingErrors.forEach(el => el.remove());
    }
    
    const statusEl = document.createElement('div');
    statusEl.className = `status-${type} p-3 rounded-lg border ${colors[type]} text-sm transition-all duration-300 transform`;
    statusEl.style.opacity = '0';
    statusEl.style.transform = 'translateY(-10px)';
    
    statusEl.innerHTML = `
        <div class="flex items-start gap-2">
            <span class="flex-shrink-0">${icons[type] || '•'}</span>
            <span class="flex-1">${message}</span>
            ${type === 'error' || type === 'warning' ? 
                '<button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0 ml-2 text-text-muted hover:text-text-primary transition-colors">×</button>' : 
                ''
            }
        </div>
    `;
    
    statusMessages.appendChild(statusEl);
    
    // Animate in
    setTimeout(() => {
        statusEl.style.opacity = '1';
        statusEl.style.transform = 'translateY(0)';
    }, 10);
    
    // Auto-remove after duration (longer for errors)
    const autoRemoveDelay = type === 'error' ? duration * 2 : duration;
    setTimeout(() => {
        if (statusEl.parentNode) {
            statusEl.style.opacity = '0';
            statusEl.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (statusEl.parentNode) {
                    statusEl.remove();
                }
            }, 300);
        }
    }, autoRemoveDelay);
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    } catch (error) {
        return dateStr;
    }
}

function getPriorityColor(priority) {
    const colors = { high: 'red', medium: 'yellow', low: 'green' };
    return colors[priority] || 'gray';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function downloadICS(tasks) {
    const tasksWithDates = tasks.filter(task => task.due);
    if (tasksWithDates.length === 0) {
        showStatus('No tasks with dates to export.', 'error');
        return;
    }

    const now = new Date();
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TaskSnap//EN',
        'CALSCALE:GREGORIAN',
        ...tasksWithDates.map(task => {
            const uid = `tasksnap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
                `DTSTART;VALUE=DATE:${task.due.replace(/-/g, '')}`,
                `SUMMARY:${task.title.replace(/[,;\\\\]/g, '\\\\$&')}`,
                task.priority ? `PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}` : '',
                'END:VEVENT'
            ].filter(Boolean).join('\\n');
        }).join('\\n'),
        'END:VCALENDAR'
    ].join('\\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasksnap-demo.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showStatus(`📅 Downloaded calendar file with ${tasksWithDates.length} events!`, 'success');
}

// Quick Action Functions

// Copy tasks list as formatted text
async function copyTasksList() {
    if (!currentTasks.length) {
        showStatus('📝 No tasks to copy', 'error');
        return;
    }
    
    try {
        const taskText = formatTasksAsText(currentTasks, currentSummary);
        await navigator.clipboard.writeText(taskText);
        showStatus('📋 Task list copied to clipboard!', 'success');
        
        // Add success animation
        const btn = document.getElementById('btnCopyTasks');
        if (btn) {
            btn.classList.add('animate-pulse');
            setTimeout(() => btn.classList.remove('animate-pulse'), 1000);
        }
    } catch (error) {
        showStatus('❌ Failed to copy to clipboard', 'error');
        console.error('Copy error:', error);
    }
}

// Copy social media friendly share text
async function copyShareText() {
    if (!currentTasks.length) {
        showStatus('📝 No tasks to share', 'error');
        return;
    }
    
    try {
        const stats = {
            total: currentTasks.length,
            high: currentTasks.filter(t => t.priority === 'high').length,
            withDates: currentTasks.filter(t => t.due).length
        };
        
        const shareText = `🤖 Just organized ${stats.total} tasks with TaskSnap AI!\n\n${stats.high > 0 ? `⚡ ${stats.high} high priority tasks\n` : ''}${stats.withDates > 0 ? `📅 ${stats.withDates} tasks with due dates\n` : ''}\n✨ From messy notes to organized action items in seconds!\n\n#TaskSnap #ProductivityAI #TaskManagement`;
        
        await navigator.clipboard.writeText(shareText);
        showStatus('💬 Share text copied to clipboard!', 'success');
        
        // Add success animation
        const btn = document.getElementById('btnCopyShareText');
        if (btn) {
            btn.classList.add('animate-pulse');
            setTimeout(() => btn.classList.remove('animate-pulse'), 1000);
        }
    } catch (error) {
        showStatus('❌ Failed to copy share text', 'error');
        console.error('Copy error:', error);
    }
}

// Export tasks as downloadable text file
function exportAsText() {
    if (!currentTasks.length) {
        showStatus('📝 No tasks to export', 'error');
        return;
    }
    
    try {
        const taskText = formatTasksAsText(currentTasks, currentSummary, true);
        const blob = new Blob([taskText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasksnap-tasks-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showStatus('📄 Tasks exported as text file!', 'success');
        
        // Add success animation
        const btn = document.getElementById('btnExportText');
        if (btn) {
            btn.classList.add('animate-pulse');
            setTimeout(() => btn.classList.remove('animate-pulse'), 1000);
        }
    } catch (error) {
        showStatus('❌ Failed to export file', 'error');
        console.error('Export error:', error);
    }
}

// Format tasks as readable text
function formatTasksAsText(tasks, summary = '', isExport = false) {
    const now = new Date();
    const header = isExport ? 
        `TaskSnap - Organized Tasks\nGenerated: ${now.toLocaleString()}\n${'='.repeat(50)}\n\n` : 
        '';
    
    let text = header;
    
    if (summary) {
        text += `Summary: ${summary}\n\n`;
    }
    
    // Group by priority
    const priorities = ['high', 'medium', 'low'];
    const groupedTasks = priorities.reduce((groups, priority) => {
        groups[priority] = tasks.filter(task => task.priority === priority);
        return groups;
    }, {});
    
    priorities.forEach(priority => {
        const priorityTasks = groupedTasks[priority];
        if (priorityTasks.length === 0) return;
        
        const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
        text += `${priorityEmoji} ${priority.toUpperCase()} PRIORITY (${priorityTasks.length})\n`;
        text += '-'.repeat(30) + '\n';
        
        priorityTasks.forEach((task, index) => {
            text += `${index + 1}. ${task.title}`;
            if (task.due) {
                text += ` [Due: ${formatDate(task.due)}]`;
            }
            if (task.tags && task.tags.length > 0) {
                text += ` #${task.tags.join(' #')}`;
            }
            text += '\n';
        });
        text += '\n';
    });
    
    if (isExport) {
        text += `\n${'='.repeat(50)}\nGenerated by TaskSnap - AI-powered task organization\n`;
    }
    
    return text;
}

// Add success animations when tasks are organized
function addSuccessAnimation() {
    // Animate the tasks section appearing
    const tasksSection = document.getElementById('tasksSection');
    if (tasksSection && !tasksSection.classList.contains('hidden')) {
        tasksSection.style.opacity = '0';
        tasksSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            tasksSection.style.transition = 'all 0.5s ease-out';
            tasksSection.style.opacity = '1';
            tasksSection.style.transform = 'translateY(0)';
        }, 100);
    }
    
    // Add success pulse to AI button
    const btnAI = document.getElementById('btnAI');
    if (btnAI) {
        btnAI.classList.add('animate-pulse');
        setTimeout(() => btnAI.classList.remove('animate-pulse'), 2000);
    }
    
    // Animate task items appearing
    setTimeout(() => {
        const taskItems = document.querySelectorAll('.task-item');
        taskItems.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                item.style.transition = 'all 0.3s ease-out';
                item.style.opacity = '1';
                item.style.transform = 'translateX(0)';
            }, index * 100);
        });
    }, 200);
}

// Loading skeleton functions
function showLoadingSkeletons() {
    const tasksSection = document.getElementById('tasksSection');
    const tasksList = document.getElementById('tasksList');
    
    if (!tasksSection || !tasksList) return;
    
    // Show the tasks section
    tasksSection.classList.remove('hidden');
    
    // Create skeleton cards
    const skeletonHTML = Array.from({ length: 3 }, (_, index) => `
        <div class="skeleton-task-card task-item loading-skeleton p-4 rounded-xl mb-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="skeleton h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div class="skeleton h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
                <div class="ml-4">
                    <div class="skeleton h-2 bg-gray-600 rounded w-16"></div>
                </div>
            </div>
        </div>
    `).join('');
    
    tasksList.innerHTML = skeletonHTML;
    
    // Update task stats with skeleton
    updateTaskStatsLoading();
}

function removeLoadingSkeletons() {
    const skeletonCards = document.querySelectorAll('.skeleton-task-card');
    skeletonCards.forEach(card => {
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 200);
    });
}

function updateTaskStatsLoading() {
    const totalCount = document.getElementById('totalCount');
    const highCount = document.getElementById('highCount');
    const mediumCount = document.getElementById('mediumCount');
    const lowCount = document.getElementById('lowCount');
    const datedCount = document.getElementById('datedCount');
    const processedTime = document.getElementById('processedTime');

    if (totalCount) totalCount.textContent = '⏳ Processing...';
    if (highCount) highCount.textContent = '⏳';
    if (mediumCount) mediumCount.textContent = '⏳';
    if (lowCount) lowCount.textContent = '⏳';
    if (datedCount) datedCount.textContent = '⏳';
    if (processedTime) processedTime.textContent = '...';
}

// Enhanced visual feedback functions
function addHighlightEffect(element) {
    if (!element) return;
    
    element.classList.add('newly-added');
    setTimeout(() => {
        element.classList.remove('newly-added');
    }, 2000);
}

function addSuccessGlow(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('success-glow');
    setTimeout(() => {
        element.classList.remove('success-glow');
    }, 1500);
}

function addErrorShake(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.classList.add('error-shake');
    setTimeout(() => {
        element.classList.remove('error-shake');
    }, 500);
}

// Enhanced mobile-friendly character counter
function enhanceCharacterCounter() {
    const charCount = document.getElementById('charCount');
    const charLimit = document.getElementById('charLimit');
    
    if (!charCount || !charLimit) return;
    
    // Add responsive class
    charCount.classList.add('char-counter');
    charLimit.classList.add('char-counter');
}

// Mobile-specific enhancements
function applyMobileEnhancements() {
    // Add touch-friendly classes
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (!button.classList.contains('touch-target')) {
            button.classList.add('touch-target');
        }
    });
    
    // Enhance character counter
    enhanceCharacterCounter();
    
    // Add mobile-specific animations
    if (window.innerWidth <= 640) {
        document.body.classList.add('mobile-mode');
    }
}

// Initialize mobile enhancements
document.addEventListener('DOMContentLoaded', function() {
    applyMobileEnhancements();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(applyMobileEnhancements, 100);
    });
    
    // Listen for window resize
    window.addEventListener('resize', function() {
        applyMobileEnhancements();
    });
});

// Console helper function for manual testing
function testAPI() {
    console.log('🧪 Testing API manually...');
    const testText = "Call mom tomorrow, buy groceries, urgent meeting Monday";
    const textarea = document.getElementById('notesInput');
    if (textarea) {
        textarea.value = testText;
        handleAIOrganizeClick();
    }
}
