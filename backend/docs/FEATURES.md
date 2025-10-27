 TaskSnap Feature Planning Document

  Overview

  Three major features to implement:
  1. Label-based Gmail Processing (privacy-focused, minimal scope)
  2. Chatbot Page (manual input interface)
  3. PDF Upload (document task extraction)

  ---
  Feature 1: Label-Based Gmail Processing

  Architecture

  Core Concept: Only process emails that have a specific user-created Gmail label. This minimizes privacy concerns and gives users full control.

  OAuth Scopes Strategy (Progressive Disclosure)

  Phase 1 - Initial Setup (Minimal Scope)
  - Request: gmail.labels (read/modify labels only)
  - Purpose: Verify label exists, guide user through label creation
  - UI: "Connect Gmail to verify your label setup"

  Phase 2 - Metadata Access
  - Request: gmail.readonly or gmail.metadata
  - Purpose: List messages with specific label (metadata only - no body)
  - Trigger: After label is verified/created

  Phase 3 - Message Body (On-Demand)
  - Request: Keep gmail.readonly but only fetch full messages when user clicks "Process"
  - Purpose: Extract task details from message content
  - Transparency: "Fetching full message to extract tasks"

  User Onboarding Flow

  Step 1: Label Creation
  ┌─────────────────────────────────────────────────────┐
  │  Create Your TaskSnap Label                         │
  │                                                      │
  │  We'll only process emails YOU choose by labeling   │
  │  them with a special label.                         │
  │                                                      │
  │  Suggested label name:                              │
  │  ┌───────────────────────────────────────────┐     │
  │  │ TaskSnap-[your-name]                      │ 📋  │
  │  └───────────────────────────────────────────┘     │
  │  (Click to copy)                                    │
  │                                                      │
  │  → Go to Gmail Settings > Labels > Create new label │
  │  → Paste the name above                             │
  │  → Come back and click "I've created the label"     │
  │                                                      │
  │  [ I've created the label ]                         │
  └─────────────────────────────────────────────────────┘

  Step 2: Gmail Filter Setup (Optional but Recommended)
  ┌─────────────────────────────────────────────────────┐
  │  Automate Label Application                         │
  │                                                      │
  │  Create a Gmail filter to automatically apply       │
  │  your label to specific emails:                     │
  │                                                      │
  │  Example filter:                                    │
  │  from:(boss@company.com) OR                        │
  │  subject:(task OR action item OR TODO)             │
  │                                                      │
  │  Instructions:                                      │
  │  1. Gmail search box → paste filter above          │
  │  2. Click dropdown arrow → "Create filter"         │
  │  3. Check "Apply label: TaskSnap-[your-name]"     │
  │  4. Click "Create filter"                          │
  │                                                      │
  │  [ Show me how (screenshots) ] [ Skip for now ]    │
  └─────────────────────────────────────────────────────┘

  Step 3: First-Run Preview
  ┌─────────────────────────────────────────────────────┐
  │  Preview Your Labeled Emails                        │
  │                                                      │
  │  We found 12 emails with label "TaskSnap-Mike"     │
  │                                                      │
  │  Showing newest 3 for preview:                      │
  │                                                      │
  │  ┌───────────────────────────────────────────────┐ │
  │  │ 📧 Project deadline moved to Friday           │ │
  │  │    From: boss@company.com                     │ │
  │  │    Preview: "The Q4 launch needs to..."       │ │
  │  │    [ Extract Tasks ]                          │ │
  │  └───────────────────────────────────────────────┘ │
  │  ...                                                 │
  │                                                      │
  │  [ Process All 12 Emails ] [ Review One-by-One ]    │
  └─────────────────────────────────────────────────────┘

  Backend Architecture

  Database Schema Additions
  Table: gmail_labels
  - id
  - user_id (FK)
  - label_name (e.g., "TaskSnap-Mike")
  - gmail_label_id (Gmail's internal ID)
  - created_at
  - last_synced_at

  Table: processed_messages
  - id
  - user_id (FK)
  - gmail_message_id (unique - for idempotency)
  - gmail_thread_id
  - processed_at
  - tasks_extracted (count)
  - status (pending/processed/failed)
  - deleted_at (for 7-day retention)

  Processing Pipeline
  ┌─────────────────────────────────────────────────────┐
  │                 Processing Flow                      │
  └─────────────────────────────────────────────────────┘

  1. User clicks "Process" or scheduled job runs
     ↓
  2. List messages with labelIds=[user_label_id]
     - Use gmail.users.messages.list()
     - Get metadata only: id, threadId, date
     ↓
  3. Filter: Check if message_id already in processed_messages
     - Skip already processed (idempotency)
     ↓
  4. For each NEW message:
     a. Fetch full message: gmail.users.messages.get()
     b. Extract: subject, from, body (plain text preferred)
     c. Send to AI service for task extraction
     d. Store parsed tasks (title, due_date, description)
     e. Mark as processed in DB
     ↓
  5. Present suggestions to user:
     - Show extracted tasks
     - Allow: Accept / Edit / Reject
     ↓
  6. On Accept: Create Trello card
     - Use idempotency key = gmail_message_id hash
     ↓
  7. Cleanup: Delete raw email body after 7 days

  API Endpoints

  POST /api/v1/gmail/labels/setup
  - Body: { labelName: "TaskSnap-Mike" }
  - Creates/verifies Gmail label
  - Returns: { labelId, labelName, exists }

  GET /api/v1/gmail/messages/labeled
  - Query: ?limit=10&unprocessedOnly=true
  - Returns: List of message metadata

  POST /api/v1/gmail/messages/process
  - Body: { messageIds: [...] }
  - Fetches full messages, extracts tasks
  - Returns: Extracted task suggestions

  POST /api/v1/gmail/messages/schedule
  - Body: { frequency: "hourly" | "daily", enabled: true }
  - Sets up background job to auto-process

  Security & Privacy Controls

  Token Management
  - Store encrypted Gmail OAuth tokens
  - Implement token rotation
  - Provide one-click revoke in UI
  - Show last sync time

  Data Retention
  - Raw email body: 7 days max (configurable)
  - Parsed metadata: Until user deletes
  - Audit logs: Keep message_id hashes (not content)

  Rate Limiting
  - Max 100 messages per session (user configurable)
  - Max 500 messages per day
  - Exponential backoff on Gmail API errors

  Logging & Monitoring
  - Log: message_id hash, timestamp, tasks_extracted count
  - Never log: email body, subject content, sender details
  - Alert: If processing >1000 messages/day (potential misconfiguration)

  ---
  Feature 2: Chatbot Page (Manual Input)

  Purpose

  A separate page where users can paste ANY text (email, notes, screenshots of text, etc.) and convert it to Trello tasks.

  UI/UX Design

  Page Layout
  ┌────────────────────────────────────────────────────────────┐
  │  TaskSnap | Manual Task Extractor                          │
  │  ──────────────────────────────────────────────────────────│
  │                                                             │
  │  Paste anything - we'll extract tasks for you              │
  │                                                             │
  │  ┌────────────────────────────────────────────────────┐   │
  │  │                                                     │   │
  │  │  Paste your email, notes, meeting transcript...    │   │
  │  │                                                     │   │
  │  │  Example:                                           │   │
  │  │  "Need to finish Q4 report by Friday              │   │
  │  │   Call John about the contract                     │   │
  │  │   Schedule team meeting for next week"            │   │
  │  │                                                     │   │
  │  │                                                     │   │
  │  └────────────────────────────────────────────────────┘   │
  │                                                             │
  │  [📎 Upload PDF instead] [🔄 Extract Tasks]                │
  │                                                             │
  │  ──────────── OR ─────────────                             │
  │                                                             │
  │  🎤 Speak your tasks (coming soon)                         │
  │                                                             │
  └────────────────────────────────────────────────────────────┘

  After Processing
  ┌────────────────────────────────────────────────────────────┐
  │  Extracted 3 Tasks                                          │
  │                                                             │
  │  ┌──────────────────────────────────────────────────────┐ │
  │  │ ✓ Finish Q4 report                                   │ │
  │  │   Due: This Friday                                    │ │
  │  │   Board: [Work Projects ▼]  List: [To Do ▼]        │ │
  │  │   [✓ Accept] [Edit] [Reject]                        │ │
  │  └──────────────────────────────────────────────────────┘ │
  │                                                             │
  │  ┌──────────────────────────────────────────────────────┐ │
  │  │ ✓ Call John about contract                           │ │
  │  │   Due: Not specified                                  │ │
  │  │   Board: [Work Projects ▼]  List: [Calls ▼]        │ │
  │  │   [✓ Accept] [Edit] [Reject]                        │ │
  │  └──────────────────────────────────────────────────────┘ │
  │                                                             │
  │  [ Accept All ] [ Reject All ] [ Process Another ]         │
  └────────────────────────────────────────────────────────────┘

  Backend Architecture

  New Route
  POST /api/v1/ai/extract-manual
  - Body: {
      content: "raw text content...",
      userId: "...",
      context: "email" | "notes" | "meeting" | "other"
    }
  - Returns: {
      tasks: [
        {
          id: "temp-123",
          title: "...",
          description: "...",
          dueDate: "...",
          priority: "high" | "medium" | "low",
          suggestedBoard: "...",
          suggestedList: "..."
        }
      ]
    }

  AI Service Enhancement
  - Prompt engineering for different content types:
    - Email: Extract sender context, due dates from phrases like "by Friday"
    - Notes: Look for bullets, checkboxes, action verbs
    - Meeting transcripts: Identify action items assigned to people

  Database
  Table: manual_extractions
  - id
  - user_id
  - content_hash (for avoiding duplicate processing)
  - tasks_extracted
  - accepted_count
  - rejected_count
  - created_at

  Rate Limiting
  - Free tier: 20 extractions/day
  - Paid tier: Unlimited
  - Length limit: 10,000 characters per paste

  ---
  Feature 3: PDF Upload

  Purpose

  Upload invoices, contracts, meeting notes, project plans, etc. and extract actionable tasks.

  UI/UX Design

  Upload Interface
  ┌────────────────────────────────────────────────────────────┐
  │  Upload PDF                                                 │
  │                                                             │
  │  ┌──────────────────────────────────────────────────────┐ │
  │  │                                                       │ │
  │  │         📄                                            │ │
  │  │                                                       │ │
  │  │    Drag & drop your PDF here                        │ │
  │  │    or click to browse                                │ │
  │  │                                                       │ │
  │  │    Max size: 10MB                                    │ │
  │  │    Supported: PDF only                               │ │
  │  │                                                       │ │
  │  └──────────────────────────────────────────────────────┘ │
  │                                                             │
  │  Examples:                                                  │
  │  • Meeting notes                                           │
  │  • Project plans                                           │
  │  • Contracts with deliverables                            │
  │  • Invoices with payment deadlines                        │
  └────────────────────────────────────────────────────────────┘

  Processing State
  ┌────────────────────────────────────────────────────────────┐
  │  Processing: project-plan.pdf                               │
  │                                                             │
  │  ⏳ Extracting text from PDF...               [████░░] 80% │
  │  ⏳ Analyzing content with AI...               [░░░░░░] 0%  │
  │  ⏹  Extracting tasks...                        [░░░░░░] 0%  │
  │                                                             │
  │  This may take 15-30 seconds for large documents           │
  └────────────────────────────────────────────────────────────┘

  Backend Architecture

  File Upload Flow
  1. Frontend uploads PDF
     - FormData with file
     - Client-side validation: size, type
     ↓
  2. Backend receives file
     - Save to temporary storage (local or S3)
     - Generate unique ID
     ↓
  3. PDF Text Extraction
     - Option A: pdf-parse (npm package) - free, local
     - Option B: Google Cloud Vision API - accurate, costs $
     - Option C: AWS Textract - enterprise, costs $$
     ↓
  4. Send extracted text to AI service
     - Gemini/GPT with prompt: "Extract actionable tasks from this document"
     ↓
  5. Return structured tasks to frontend
     ↓
  6. Store in database:
     - pdf_uploads table (metadata only)
     - Link to extracted tasks
     ↓
  7. Cleanup:
     - Delete PDF file after 24 hours (GDPR compliance)
     - Keep extracted tasks until user deletes

  API Endpoints
  POST /api/v1/pdf/upload
  - Content-Type: multipart/form-data
  - Body: file (PDF)
  - Returns: { uploadId, status: "processing" }

  GET /api/v1/pdf/status/:uploadId
  - Returns: {
      status: "processing" | "completed" | "failed",
      progress: 0-100,
      tasks: [...] (when completed)
    }

  DELETE /api/v1/pdf/:uploadId
  - Deletes uploaded file and extracted tasks

  Database Schema
  Table: pdf_uploads
  - id
  - user_id
  - filename
  - file_size
  - storage_path (temporary)
  - text_extracted (boolean)
  - tasks_extracted (count)
  - status (uploading/processing/completed/failed)
  - uploaded_at
  - processed_at
  - expires_at (uploaded_at + 24h)

  File Storage Options

  Option 1: Local Storage (Simple)
  - Store in /tmp or /uploads
  - Auto-delete cron job after 24h
  - Pros: No cost, simple
  - Cons: Not scalable, lost on server restart

  Option 2: S3 / Cloud Storage (Production)
  - Upload to AWS S3 or Google Cloud Storage
  - Set lifecycle policy: auto-delete after 24h
  - Encrypted at rest
  - Pros: Scalable, persistent, secure
  - Cons: Costs money

  Option 3: In-Memory Processing (Best for Privacy)
  - Don't save file to disk at all
  - Stream → extract text → process → discard
  - Pros: Maximum privacy, no cleanup needed
  - Cons: Higher memory usage, can't retry

  Recommended: Start with Option 3, fallback to Option 1 for large files (>5MB)

  PDF Parsing Libraries

  // Option A: pdf-parse (Recommended for MVP)
  npm install pdf-parse
  // Pros: Free, simple, works locally
  // Cons: Accuracy ~85% for complex layouts

  // Option B: pdf.js (Mozilla)
  npm install pdfjs-dist
  // Pros: Battle-tested (used by Firefox)
  // Cons: More complex API

  // Option C: Google Cloud Vision API
  // Pros: 95%+ accuracy, handles scanned PDFs (OCR)
  // Cons: Costs $1.50 per 1000 pages

  ---
  Integration Points

  How These Three Features Work Together

  ┌──────────────────────────────────────────────────────────┐
  │                    User Entry Points                      │
  └──────────────────────────────────────────────────────────┘

  1. GMAIL INTEGRATION (Automated)
     └─> Label emails → Auto-process → Suggest tasks

  2. CHATBOT PAGE (Manual)
     └─> Paste text → Extract tasks → Suggest

  3. PDF UPLOAD (Manual)
     └─> Upload file → Parse → Extract tasks → Suggest

                        ↓
              ┌─────────────────┐
              │  AI Service     │ (Shared)
              │  (Gemini/GPT)   │
              └─────────────────┘
                        ↓
              ┌─────────────────┐
              │  Task Queue     │ (Shared)
              │  User reviews   │
              └─────────────────┘
                        ↓
              ┌─────────────────┐
              │  Trello API     │ (Shared)
              │  Create cards   │
              └─────────────────┘

  Shared AI Service

  All three features use the same AI extraction service with different prompts:

  // Shared interface
  interface TaskExtractionRequest {
    content: string;
    sourceType: 'gmail' | 'manual' | 'pdf';
    context?: {
      sender?: string;      // For Gmail
      subject?: string;     // For Gmail
      filename?: string;    // For PDF
      userHint?: string;    // For manual (e.g., "these are meeting notes")
    };
  }

  // Prompt templates
  const prompts = {
    gmail: "Extract tasks from this email. Consider sender authority and timeline.",
    manual: "Extract actionable tasks from this text. Look for verbs and deadlines.",
    pdf: "Extract tasks from this document. Focus on deliverables and due dates."
  };

  ---
  Implementation Priority & Timeline

  Phase 1: Foundation (Week 1-2)

  1. ✅ Backend structure (already done)
  2. 🔲 Implement shared AI service
  3. 🔲 Build chatbot page (simplest entry point)
  4. 🔲 Test end-to-end: paste text → Trello card

  Phase 2: Gmail Integration (Week 3-4)

  1. 🔲 Gmail OAuth with progressive scopes
  2. 🔲 Label setup onboarding flow
  3. 🔲 Message listing & processing pipeline
  4. 🔲 Idempotency & rate limiting

  Phase 3: PDF Upload (Week 5)

  1. 🔲 File upload endpoint
  2. 🔲 PDF parsing (start with pdf-parse)
  3. 🔲 Integrate with AI service
  4. 🔲 File cleanup & retention

  Phase 4: Polish (Week 6-7)

  1. 🔲 User settings & preferences
  2. 🔲 Better error handling & retries
  3. 🔲 Usage analytics & monitoring
  4. 🔲 Security audit

  Phase 5: Advanced Features (Week 8+)

  1. 🔲 Auto-processing (scheduled jobs)
  2. 🔲 Smart categorization (ML-based board/list suggestions)
  3. 🔲 Attachment handling (from Gmail)
  4. 🔲 Voice input for chatbot

  ---
  Technical Decisions to Make

  1. AI Provider Choice

  | Provider         | Cost              | Accuracy | Speed         | Context Limit |
  |------------------|-------------------|----------|---------------|---------------|
  | Gemini 1.5 Flash | Free tier: 15 RPM | Good     | Fast (2-3s)   | 1M tokens     |
  | GPT-4o-mini      | $0.15/1M tokens   | Better   | Medium (4-5s) | 128k tokens   |
  | Claude Sonnet    | $3/1M tokens      | Best     | Slow (6-8s)   | 200k tokens   |

  Recommendation: Start with Gemini (you already have it), switch to GPT-4o-mini if accuracy issues.

  2. PDF Parsing Strategy

  | Approach            | Accuracy | Cost           | Privacy                |
  |---------------------|----------|----------------|------------------------|
  | pdf-parse (local)   | 85%      | Free           | ✅ Best                 |
  | Google Cloud Vision | 95%      | $1.50/1k pages | ⚠️ Data sent to Google |
  | In-house OCR        | Varies   | Free           | ✅ Best                 |

  Recommendation: pdf-parse for MVP, add Vision API as premium feature.

  3. File Storage

  For MVP: In-memory processing (no storage)
  For Production: S3 with 24h lifecycle + encryption

  4. Rate Limiting Strategy

  Free Tier:
  - Gmail: 100 messages/day
  - Manual: 20 extractions/day
  - PDF: 5 uploads/day

  Paid Tier (Future):
  - Gmail: 1000 messages/day
  - Manual: Unlimited
  - PDF: 50 uploads/day

  ---
  Security & Privacy Summary

  Data Retention Policy

  | Data Type               | Retention          | Reason                    |
  |-------------------------|--------------------|---------------------------|
  | Raw email body          | 7 days             | Debugging & re-processing |
  | Parsed tasks            | Until user deletes | Core feature              |
  | PDF files               | 24 hours           | Minimal necessary time    |
  | PDF extracted text      | 7 days             | Re-processing             |
  | Trello sync metadata    | Permanent          | Idempotency               |
  | Audit logs (hashed IDs) | 90 days            | Security                  |

  User Controls

  Users can:
  - ✅ Revoke Gmail/Trello access anytime
  - ✅ Delete all their data with one click
  - ✅ Export all data (JSON)
  - ✅ See what's been processed (audit log)
  - ✅ Configure auto-delete timings
  - ✅ Disable auto-processing

  Compliance

  - GDPR: Right to deletion, data export, clear consent
  - CCPA: Privacy policy, opt-out option
  - SOC 2 (future): Audit logs, encryption at rest/transit

  ---
  UX Copy & Onboarding

  Privacy-First Messaging

  Landing Page Hero
  "You control what we see.
  We only process emails YOU label."

  Gmail Connect Button
  [ Connect Gmail Safely ]

  ✓ We only read emails you label
  ✓ No access to your full mailbox
  ✓ Revoke access anytime

  Chatbot Page
  "Paste anything sensitive?
  We don't store your text - only the tasks we extract."

  [Learn more about our privacy policy]

  PDF Upload
  "Your PDF is processed in real-time and
  deleted within 24 hours automatically."

  First-Run Experience

  Step 1: Choose Your Entry Point
  ┌────────────────────────────────────────────────────────┐
  │  How do you want to get started?                       │
  │                                                         │
  │  ┌──────────────────┐  ┌──────────────────┐           │
  │  │   📧 Gmail       │  │   💬 Manual      │           │
  │  │   Auto-process   │  │   Paste text     │           │
  │  │   labeled emails │  │   anytime        │           │
  │  │                  │  │                  │           │
  │  │  [ Connect ]     │  │  [ Try Now ]     │           │
  │  └──────────────────┘  └──────────────────┘           │
  │                                                         │
  │  ┌──────────────────┐                                  │
  │  │   📄 PDF         │                                  │
  │  │   Upload docs    │                                  │
  │  │   & extract      │                                  │
  │  │                  │                                  │
  │  │  [ Upload ]      │                                  │
  │  └──────────────────┘                                  │
  └────────────────────────────────────────────────────────┘

  ---

⏺ Summary & Next Steps

  I've created a comprehensive plan for all three features. Here are the key highlights:

  ✅ What's Covered

  1. Label-Based Gmail Processing
  - Progressive OAuth scope strategy (minimal → metadata → full access)
  - Complete onboarding flow with UX copy
  - Backend architecture with idempotency
  - Security controls (7-day retention, rate limiting, encrypted tokens)
  - API endpoints for label setup and message processing

  2. Chatbot Page
  - Simple paste-and-extract interface
  - Shared AI service architecture
  - Rate limiting strategy (20 extractions/day for free tier)
  - Context-aware prompts (email vs notes vs meeting transcripts)

  3. PDF Upload
  - Drag-and-drop interface with progress tracking
  - Three storage strategies (in-memory best for privacy)
  - PDF parsing library comparison (pdf-parse recommended for MVP)
  - 24-hour auto-deletion for GDPR compliance

  🎯 Key Technical Decisions Made

  | Decision       | Choice                         | Reason                                         |
  |----------------|--------------------------------|------------------------------------------------|
  | AI Provider    | Gemini 1.5 Flash → GPT-4o-mini | You already have Gemini, good free tier        |
  | PDF Parsing    | pdf-parse (local)              | Free, private, good enough for MVP             |
  | File Storage   | In-memory processing           | Maximum privacy, no cleanup needed             |
  | OAuth Strategy | Progressive disclosure         | Request minimal scopes first, expand as needed |
  | Data Retention | 7 days email, 24h PDF          | Balance between debugging & privacy            |

  📋 Implementation Priority

  Start with Chatbot (simplest, fastest validation):
  1. Build AI extraction service (reusable for all 3 features)
  2. Create chatbot page UI
  3. Test end-to-end: paste → extract → Trello

  Then Gmail (core value):
  1. OAuth with progressive scopes
  2. Label setup onboarding
  3. Message processing pipeline

  Finally PDF (nice-to-have):
  1. File upload endpoint
  2. PDF parsing integration
  3. Connect to existing AI service

  🔐 Privacy & Security Highlights

  - Label-based approach: Only read what users explicitly mark
  - Progressive OAuth: Start with minimal permissions
  - Short retention: 7 days email, 24h PDFs
  - In-memory processing: PDFs never touch disk (optional)
  - User controls: One-click revoke, data export, audit logs

  📝 What You Should Decide Now

  1. AI Provider: Stick with Gemini or switch to GPT-4o-mini?
  2. PDF Priority: MVP feature or Phase 2?
  3. Hosting: Where will you deploy? (Affects file storage choice)
  4. Monetization: Free tier limits? (I suggested 20/day for chatbot, 100/day for Gmail)