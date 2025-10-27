// TaskSnap Landing Page - GSAP Animations with ScrollTrigger
document.addEventListener('DOMContentLoaded', function() {
    // Wait for GSAP to load
    function initAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            setTimeout(initAnimations, 100);
            return;
        }

        // Register plugins (including premium plugins)
        gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, TextPlugin, SplitText, Flip);
        
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        console.log('Initializing TaskSnap animations...');
        
        // Initialize modern animations
        initHeroAnimations();
        initCreativeTextAnimations();
        initInteractiveEffects();
        initVideoEffects();
        
        // Refresh ScrollTrigger
        ScrollTrigger.refresh();
    }

    // Store SplitText instances for cleanup
    let splitTextInstances = [];

    // Hero Section Animations
    function initHeroAnimations() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Set initial states
        gsap.set('#hero-title', {
            opacity: 0,
            y: 50
        });

        // Simple, clean hero entrance
        if (!reducedMotion) {
            const heroTl = gsap.timeline({ delay: 0.5 });
            
            heroTl.to('#hero-title', {
                opacity: 1,
                y: 0,
                duration: 1.2,
                ease: 'power3.out'
            });

        } else {
            // Reduced motion fallback
            gsap.set('#hero-title', {
                opacity: 1,
                y: 0
            });
        }
    }


    // Flashy & Creative Text Animations
    function initCreativeTextAnimations() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;

        const heroTitle = document.getElementById('hero-title');
        if (!heroTitle) return;

        const split = new SplitText(heroTitle, { type: "chars", charsClass: "creative-char" });
        splitTextInstances.push(split);

        // 1. Creative Text Shuffle Entrance (Manual)
        const shuffleChars = "abcdefghijklmnopqrstuvwxyz";
        const shuffleTl = gsap.timeline({ delay: 0.3 });

        split.chars.forEach((char, i) => {
            const initialText = char.textContent;
            if (initialText.trim() === '') return; // Skip spaces

            let clutter = "";
            const clutterTimeline = gsap.timeline({
                repeat: 1,
                delay: i * 0.05,
                onComplete: () => {
                    gsap.to(char, { textContent: initialText, duration: 0.1, ease: 'power2.inOut' });
                }
            });

            for (let j = 0; j < 5; j++) {
                clutter += shuffleChars.charAt(Math.floor(Math.random() * shuffleChars.length));
            }

            clutterTimeline.to(char, { textContent: clutter, duration: 0.05, ease: 'power2.inOut' });
            shuffleTl.add(clutterTimeline, 0);
        });

        // 2. Magnetic Distortion on Hover
        heroTitle.addEventListener('mousemove', (e) => {
            const rect = heroTitle.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            gsap.to(split.chars, {
                x: (i, target) => {
                    const dx = target.offsetLeft + (target.offsetWidth / 2) - x;
                    const dy = target.offsetTop + (target.offsetHeight / 2) - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 200;
                    const force = 1 - (distance / maxDist);
                    return dx * force * 0.3;
                },
                y: (i, target) => {
                    const dx = target.offsetLeft + (target.offsetWidth / 2) - x;
                    const dy = target.offsetTop + (target.offsetHeight / 2) - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 200;
                    const force = 1 - (distance / maxDist);
                    return dy * force * 0.3;
                },
                scale: (i, target) => {
                    const dx = target.offsetLeft + (target.offsetWidth / 2) - x;
                    const dy = target.offsetTop + (target.offsetHeight / 2) - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 200;
                    const force = 1 - (distance / maxDist);
                    return 1 + (force * 0.5);
                },
                duration: 0.4,
                stagger: 0.01,
                ease: 'power2.out'
            });
        });

        heroTitle.addEventListener('mouseleave', () => {
            gsap.to(split.chars, {
                x: 0,
                y: 0,
                scale: 1,
                duration: 0.8,
                ease: 'elastic.out(1, 0.3)',
                stagger: 0.02
            });
        });
    }

    // Interactive Effects
    function initInteractiveEffects() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        if (reducedMotion) return;

        // Enhanced Feature cards with Flip animations
        const featureCards = document.querySelectorAll('#features dl > div');
        featureCards.forEach((card, index) => {
            const icon = card.querySelector('svg');
            
            card.addEventListener('mouseenter', () => {
                // Capture state before changes
                const state = Flip.getState(card);
                
                // Apply hover styles
                card.style.transform = 'translateY(-8px) scale(1.02) rotateY(2deg)';
                card.style.zIndex = '10';
                
                // Fast Flip animation
                Flip.from(state, {
                    duration: 0.25,
                    ease: 'power2.out'
                });
                
                // Quick icon animation
                if (icon) {
                    gsap.to(icon, {
                        rotation: 15,
                        scale: 1.1,
                        duration: 0.3,
                        ease: 'back.out(1.7)'
                    });
                }
            });
            
            card.addEventListener('mouseleave', () => {
                // Capture state before changes
                const state = Flip.getState(card);
                
                // Reset styles
                card.style.transform = '';
                card.style.zIndex = '';
                
                // Fast exit animation
                Flip.from(state, {
                    duration: 0.3,
                    ease: 'power2.out'
                });
                
                // Quick icon reset
                if (icon) {
                    gsap.to(icon, {
                        rotation: 0,
                        scale: 1,
                        duration: 0.3,
                        ease: 'power2.out'
                    });
                }
            });
        });




        // Navigation smooth scrolling
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    gsap.to(window, {
                        duration: 0.8,
                        scrollTo: {
                            y: target,
                            offsetY: 80
                        },
                        ease: 'power3.inOut'
                    });
                }
            });
        });
    }

    // Enhanced Video Effects
    function initVideoEffects() {
        const video = document.getElementById('hero-video');
        if (!video) return;

        // Ensure video loops properly
        function ensureVideoLoop() {
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            
            // Force play and loop
            const playVideo = () => {
                video.play().catch(error => {
                    console.log('Video autoplay failed, will retry on user interaction');
                    document.addEventListener('click', playVideo, { once: true });
                });
            };

            // Handle video events
            video.addEventListener('loadeddata', () => {
                document.body.classList.add('video-loaded');
                console.log('Video loaded successfully');
                playVideo();
            });

            video.addEventListener('ended', () => {
                video.currentTime = 0;
                playVideo();
            });

            video.addEventListener('error', (e) => {
                console.error('Video loading error:', e);
            });

            // Initial play attempt
            if (video.readyState >= 2) {
                playVideo();
            }
        }

        ensureVideoLoop();

        // Subtle video brightness/contrast changes on scroll
        gsap.to(video, {
            filter: 'brightness(0.6) contrast(1.2) saturate(1.1)',
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 2
            }
        });

        // Gentle gradient overlay animation
        gsap.to('#gradient-overlay', {
            opacity: 0.6,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 2
            }
        });
    }



    // Start initialization
    initAnimations();
});

// Performance optimization
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        gsap.globalTimeline.pause();
    } else {
        gsap.globalTimeline.resume();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    splitTextInstances.forEach(split => {
        split.revert();
    });
    ScrollTrigger.killAll();
});

// Handle window resize
window.addEventListener('resize', () => {
    ScrollTrigger.refresh();
    
    // Refresh SplitText instances on resize
    splitTextInstances.forEach(split => {
        split.revert();
    });
    splitTextInstances = [];
});

// ========================================
// TASKSNAP AI EXTRACTION FUNCTIONALITY
// ========================================

// Global variables for task management
let currentTasks = [];
let isKVConfigured = true; // Will be determined by API responses

// Initialize TaskSnap functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TaskSnap initializing...');
    
    // Wire up event listeners for the buttons
    wireTaskSnapEvents();
});

function initTaskSnapFeatures() {
    // Wire up event listeners
    wireTaskSnapEvents();
}

function createTaskInterface() {
    // Find a good location to insert the task interface
    // Look for the demo section to add our interface after it
    const demoSection = document.getElementById('demo');
    if (!demoSection) {
        console.log('❌ Demo section not found');
        return;
    }
    
    console.log('✅ Creating TaskSnap interface');
    
    // Create task interface section
    const taskSection = document.createElement('section');
    taskSection.id = 'task-interface';
    taskSection.className = 'py-24 sm:py-32 bg-brand-gray/30';
    taskSection.innerHTML = `
        <div class="max-w-4xl mx-auto px-6 lg:px-8">
            <!-- Section Header -->
            <div class="text-center mb-12">
                <h2 class="text-base font-semibold leading-7 text-brand-accent mb-4">Try It Now</h2>
                <h3 class="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl mb-6">
                    Transform Your Notes
                </h3>
                <p class="mx-auto max-w-2xl text-lg leading-8 text-text-secondary">
                    Paste your messy notes below and watch AI organize them into clear, prioritized tasks.
                </p>
            </div>
            
            <!-- Input Section -->
            <div class="mb-8">
                <label for="notesInput" class="block text-sm font-medium text-text-primary mb-3">
                    Your Notes
                </label>
                <textarea 
                    id="notesInput" 
                    rows="6" 
                    class="w-full px-4 py-3 bg-brand-dark border border-brand-light-gray rounded-xl text-text-primary placeholder-text-muted focus:ring-2 focus:ring-brand-accent focus:border-transparent resize-none"
                    placeholder="Paste your messy notes here... 

For example:
- Call mom tomorrow
- Buy groceries before Friday  
- Urgent: Submit report by end of week
- Meeting with client on Monday 3pm
- Pay rent
- Fix that bug in the dashboard ASAP"
                ></textarea>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex flex-wrap items-center gap-3 mb-6">
                <button id="btnAI" class="rounded-xl px-6 py-3 text-sm font-medium bg-brand-accent text-brand-dark hover:bg-brand-accent/90 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Organize with AI
                    </span>
                </button>
                <button id="btnShare" class="rounded-xl px-4 py-3 text-sm font-medium bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Share
                    </span>
                </button>
                <button id="btnIcs" class="rounded-xl px-4 py-3 text-sm font-medium bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    <span class="flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download .ics
                    </span>
                </button>
                <a id="shareLink" class="text-xs underline underline-offset-4 text-brand-accent hover:text-brand-accent/80 hidden" target="_blank" rel="noopener"></a>
            </div>
            
            <!-- Status Messages -->
            <div id="statusMessages" class="mb-6 space-y-2"></div>
            
            <!-- Executive Brief -->
            <div id="briefSection" class="mb-8 p-4 bg-brand-dark/50 rounded-xl border border-brand-light-gray hidden">
                <div id="briefLine" class="text-lg text-text-primary"></div>
            </div>
            
            <!-- Tasks Section -->
            <div id="tasksSection" class="hidden">
                <div class="flex items-center justify-between mb-6">
                    <h3 class="text-2xl font-bold text-text-primary">Organized Tasks</h3>
                    <div id="taskStats" class="flex items-center gap-4 text-sm text-text-muted">
                        <span id="totalCount">0 tasks</span>
                        <span id="highPriorityCount" class="hidden">0 high priority</span>
                        <span id="datedCount" class="hidden">0 with dates</span>
                        <span id="processedTime" class="hidden">0ms</span>
                    </div>
                </div>
                
                <div id="tasksList" class="space-y-3">
                    <!-- Tasks will be rendered here -->
                </div>
            </div>
        </div>
    `;
    
    // Insert after demo section
    demoSection.parentNode.insertBefore(taskSection, demoSection.nextSibling);
}

function wireTaskSnapEvents() {
    console.log('🔌 Wiring up TaskSnap events...');
    
    // Wire up buttons with retry logic
    setTimeout(() => {
        const btnAI = document.getElementById('btnAI');
        const btnShare = document.getElementById('btnShare');
        const btnIcs = document.getElementById('btnIcs');
        
        if (btnAI) {
            console.log('✅ AI button found, adding listener');
            btnAI.addEventListener('click', aiOrganizeFromTextarea);
        } else {
            console.log('❌ AI button not found');
        }
        
        if (btnShare) {
            console.log('✅ Share button found, adding listener');
            btnShare.addEventListener('click', shareChecklist);
        } else {
            console.log('❌ Share button not found');
        }
        
        if (btnIcs) {
            console.log('✅ ICS button found, adding listener');
            btnIcs.addEventListener('click', () => downloadICS(currentTasks || []));
        } else {
            console.log('❌ ICS button not found');
        }
    }, 100);
}

async function aiOrganizeFromTextarea() {
    const textarea = document.getElementById('notesInput');
    const btnAI = document.getElementById('btnAI');
    
    if (!textarea || !btnAI) return;
    
    const text = textarea.value.trim();
    if (!text) {
        showStatus('Please enter some notes to organize.', 'error');
        return;
    }
    
    // Disable button and show loading
    btnAI.disabled = true;
    btnAI.innerHTML = `
        <span class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
        </span>
    `;
    
    try {
        const response = await fetch('/api/ai-extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || \`HTTP \${response.status}\`);
        }
        
        const extraction = await response.json();
        
        // Update global state
        currentTasks = extraction.tasks || [];
        
        // Display results
        displayExtraction(extraction);
        
        // Enable share and ICS buttons if we have tasks
        if (currentTasks.length > 0) {
            const btnShare = document.getElementById('btnShare');
            const btnIcs = document.getElementById('btnIcs');
            
            if (btnShare) btnShare.disabled = false;
            
            // Enable ICS if there are tasks with dates
            const tasksWithDates = currentTasks.filter(task => task.due);
            if (btnIcs && tasksWithDates.length > 0) {
                btnIcs.disabled = false;
            }
        }
        
        showStatus(\`Successfully organized \${currentTasks.length} tasks!\`, 'success');
        
    } catch (error) {
        console.error('AI extraction failed:', error);
        showStatus(\`Failed to organize tasks: \${error.message}\`, 'error');
    } finally {
        // Restore button
        btnAI.disabled = false;
        btnAI.innerHTML = \`
            <span class="flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Organize with AI
            </span>
        \`;
    }
}

async function shareChecklist() {
    const btnShare = document.getElementById('btnShare');
    
    if (!currentTasks || currentTasks.length === 0) {
        showStatus('No tasks to share. Please organize some tasks first.', 'error');
        return;
    }
    
    if (!btnShare) return;
    
    // Disable button and show loading
    btnShare.disabled = true;
    btnShare.innerHTML = \`
        <span class="flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sharing...
        </span>
    \`;
    
    try {
        const response = await fetch('/api/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tasks: currentTasks,
                meta: {
                    generatedAt: new Date().toISOString(),
                    source: 'ai-extract-v1'
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (response.status === 503) {
                isKVConfigured = false;
                throw new Error('Sharing is currently unavailable. Please check your KV configuration.');
            }
            throw new Error(error.error || \`HTTP \${response.status}\`);
        }
        
        const result = await response.json();
        const fullURL = window.location.origin + result.url;
        
        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(fullURL);
            showStatus('Share link copied to clipboard!', 'success');
        } catch (clipboardError) {
            console.warn('Clipboard write failed:', clipboardError);
            showStatus(\`Share link created: \${fullURL}\`, 'success');
        }
        
        // Show share link
        const shareLink = document.getElementById('shareLink');
        if (shareLink) {
            shareLink.href = result.url;
            shareLink.textContent = 'View shared tasks →';
            shareLink.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Share failed:', error);
        showStatus(\`Failed to create share link: \${error.message}\`, 'error');
        
        if (!isKVConfigured) {
            // Show disabled state for sharing
            btnShare.innerHTML = \`
                <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.364M5.636 5.636L5.636 5.636" />
                    </svg>
                    Sharing Disabled
                </span>
            \`;
            btnShare.disabled = true;
            return;
        }
    } finally {
        if (isKVConfigured) {
            // Restore button
            btnShare.disabled = false;
            btnShare.innerHTML = \`
                <span class="flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share
                </span>
            \`;
        }
    }
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
            const dueDate = new Date(task.due + 'T09:00:00');
            const uid = \`tasksnap-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
            
            return [
                'BEGIN:VEVENT',
                \`UID:\${uid}\`,
                \`DTSTAMP:\${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\`,
                \`DTSTART;VALUE=DATE:\${task.due.replace(/-/g, '')}\`,
                \`SUMMARY:\${task.title.replace(/[,;\\\\]/g, '\\\\$&')}\`,
                task.priority ? \`PRIORITY:\${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}\` : '',
                'END:VEVENT'
            ].filter(Boolean).join('\\n');
        }).join('\\n'),
        'END:VCALENDAR'
    ].join('\\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tasksnap.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    showStatus(\`Downloaded calendar file with \${tasksWithDates.length} events.\`, 'success');
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
        totalCountEl.textContent = \`\${stats.count} task\${stats.count !== 1 ? 's' : ''}\`;
    }
    
    if (highPriorityCountEl && stats.high > 0) {
        highPriorityCountEl.textContent = \`\${stats.high} high priority\`;
        highPriorityCountEl.classList.remove('hidden');
    }
    
    if (datedCountEl && stats.dated > 0) {
        datedCountEl.textContent = \`\${stats.dated} with dates\`;
        datedCountEl.classList.remove('hidden');
    }
    
    if (processedTimeEl) {
        processedTimeEl.textContent = \`\${stats.processedMs}ms\`;
        processedTimeEl.classList.remove('hidden');
    }
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasksList');
    if (!tasksList) return;
    
    if (tasks.length === 0) {
        tasksList.innerHTML = \`
            <div class="text-center py-8 text-text-muted">
                <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>No tasks found in your notes.</p>
            </div>
        \`;
        return;
    }
    
    // Sort tasks by priority and due date
    const sortedTasks = [...tasks].sort((a, b) => {
        // Priority order: high, medium, low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        
        // Then by due date (sooner first)
        if (a.due && !b.due) return -1;
        if (!a.due && b.due) return 1;
        if (a.due && b.due) {
            return new Date(a.due) - new Date(b.due);
        }
        
        return 0;
    });
    
    tasksList.innerHTML = sortedTasks.map(task => {
        const priorityClass = task.priority ? \`priority-\${task.priority}\` : '';
        const dueDateFormatted = task.due ? formatDate(task.due) : '';
        const confidenceWidth = Math.round((task.confidence || 0) * 100);
        
        return \`
            <div class="task-item p-4 rounded-xl \${priorityClass}">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-medium text-text-primary mb-1">\${escapeHtml(task.title)}</h4>
                        <div class="flex items-center gap-4 text-sm text-text-muted">
                            \${task.priority ? \`<span class="px-2 py-1 rounded text-xs bg-\${getPriorityColor(task.priority)}/20 text-\${getPriorityColor(task.priority)}-400">\${task.priority}</span>\` : ''}
                            \${dueDateFormatted ? \`<span class="flex items-center gap-1"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>\${dueDateFormatted}</span>\` : ''}
                            \${task.tags && task.tags.length > 0 ? task.tags.map(tag => \`<span class="px-2 py-1 rounded text-xs bg-brand-accent/20 text-brand-accent">\${escapeHtml(tag)}</span>\`).join('') : ''}
                        </div>
                    </div>
                    <div class="ml-4 flex items-center gap-2">
                        <div class="w-16 h-2 bg-brand-light-gray rounded-full overflow-hidden">
                            <div class="h-full bg-brand-accent rounded-full" style="width: \${confidenceWidth}%"></div>
                        </div>
                        <span class="text-xs text-text-muted">\${confidenceWidth}%</span>
                    </div>
                </div>
            </div>
        \`;
    }).join('');
}

function showStatus(message, type = 'info') {
    const statusMessages = document.getElementById('statusMessages');
    if (!statusMessages) return;
    
    const colors = {
        success: 'bg-green-500/20 border-green-500/30 text-green-400',
        error: 'bg-red-500/20 border-red-500/30 text-red-400',
        info: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
    };
    
    const statusEl = document.createElement('div');
    statusEl.className = \`p-3 rounded-lg border \${colors[type]} text-sm\`;
    statusEl.textContent = message;
    
    statusMessages.appendChild(statusEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
        if (statusEl.parentNode) {
            statusEl.parentNode.removeChild(statusEl);
        }
    }, 5000);
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
