import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const USER_ID = process.env.TEST_USER_ID || 'a910985b-be4b-4666-b604-c7bc75ea88f8';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const AUTH_TOKEN = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '24h' });

// Sample realistic email content
const sampleEmails = [
  {
    subject: "Project Update - Website Redesign",
    from: "john.smith@clientcompany.com",
    body: `Hi there,

I wanted to check in on the website redesign project. We need to finalize the homepage mockups by Friday this week. Also, could you please review the color scheme we discussed last week?

A few action items:
1. Send over the final mockups by Friday 5pm
2. Schedule a review meeting for next Tuesday
3. Update the project timeline based on our last conversation

Let me know if you have any questions!

Best,
John`
  },
  {
    subject: "Urgent: Bug Report - Login Issue",
    from: "sarah.jones@startup.io",
    body: `Hey,

We're experiencing a critical issue with the login functionality on the production site. Users are getting a 500 error when trying to authenticate. This is affecting about 30% of our users.

Can you please:
- Investigate the login server logs ASAP
- Deploy a hotfix if possible today
- Let me know the ETA for the fix

This is pretty urgent as it's blocking users from accessing their accounts.

Thanks!
Sarah`
  },
  {
    subject: "Meeting Follow-up: Q4 Deliverables",
    from: "mike.chen@enterprise.com",
    body: `Hi,

Following up on our meeting yesterday. Here's what we agreed on:

Q4 Deliverables:
- Mobile app beta version by Oct 31st
- API documentation update by Nov 15th
- Security audit completion by Dec 1st

Please confirm you can meet these deadlines. Also, we need to schedule weekly check-ins starting next Monday.

Looking forward to working together!

Mike`
  }
];

console.log('\n');
console.log('═'.repeat(80));
console.log('📧 DEMO: NEW FEATURES WITH SAMPLE EMAIL DATA');
console.log('═'.repeat(80));
console.log('\n');

async function runDemo() {
  try {
    // Demo all 3 sample emails
    for (let i = 0; i < sampleEmails.length; i++) {
      const email = sampleEmails[i];

      console.log('─'.repeat(80));
      console.log(`\n📨 EMAIL ${i + 1}/${sampleEmails.length}\n`);
      console.log(`Subject: ${email.subject}`);
      console.log(`From: ${email.from}`);
      console.log(`\n${email.body}\n`);

      console.log('─'.repeat(80));
      console.log('🤖 AI TASK EXTRACTION\n');
      console.log('⏳ Processing email with AI...\n');

      // Extract tasks using AI
      const extractResponse = await axios.post(
        `${API_URL}/ai/extract-manual`,
        {
          text: `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.body}`,
          context: 'email',
        },
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      const { tasks, confidence } = extractResponse.data.data;

      console.log(`✅ AI Confidence: ${(confidence * 100).toFixed(1)}%`);
      console.log(`✅ Extracted ${tasks.length} task(s):\n`);

      if (tasks.length === 0) {
        console.log('   No actionable tasks found in this email.\n');
      } else {
        tasks.forEach((task: any, taskIndex: number) => {
          console.log(`   ${taskIndex + 1}. ${task.title}`);
          console.log(`      Description: ${task.description || 'N/A'}`);
          console.log(`      Priority: ${task.priority || 'medium'} ${getPriorityEmoji(task.priority)}`);
          console.log(`      Due Date: ${task.dueDate || 'Not specified'}`);

          if (task.labels && task.labels.length > 0) {
            console.log(`      Labels: ${task.labels.join(', ')}`);
          }

          console.log('');
        });

        // Show what you can do with these tasks
        console.log('─'.repeat(80));
        console.log('✅ TASK ACCEPTANCE FLOW\n');
        console.log('You can now:');
        console.log('  1. ✏️  Edit task details (title, description, priority, due date)');
        console.log('  2. ✅ Accept and create tasks in your Trello board');
        console.log('  3. ❌ Reject tasks that aren\'t relevant');
        console.log('');

        // Accept the first task as demo
        if (i === 0 && tasks.length > 0) {
          console.log('📝 Demo: Accepting first task...\n');

          try {
            const acceptResponse = await axios.post(
              `${API_URL}/ai/accept-tasks`,
              {
                tasks: [{
                  title: tasks[0].title,
                  description: tasks[0].description,
                  priority: tasks[0].priority,
                  dueDate: tasks[0].dueDate,
                }]
              },
              {
                headers: {
                  'Authorization': `Bearer ${AUTH_TOKEN}`,
                },
              }
            );

            console.log(`   ✅ Task created successfully!`);
            console.log(`   Database ID: ${acceptResponse.data.data.tasks[0]?.id}`);
            console.log(`   Status: Saved to database\n`);
          } catch (error: any) {
            console.log(`   Note: Task would be created here (${error.response?.data?.error || error.message})\n`);
          }
        }
      }

      console.log('');
    }

    // Show follow-up detection example
    console.log('═'.repeat(80));
    console.log('\n🔍 FOLLOW-UP DETECTION DEMO\n');
    console.log('How it works:');
    console.log('  • Scans your inbox every 4 hours automatically');
    console.log('  • Detects emails you haven\'t responded to in 2+ days');
    console.log('  • Calculates urgency score (1-10) based on:');
    console.log('    - Days since client message');
    console.log('    - Client sentiment (if detected)');
    console.log('    - Presence of deadlines');
    console.log('    - Client importance/tier');
    console.log('');
    console.log('Example urgency scores:');
    console.log('  🟢 3/10 - Casual check-in, 3 days old');
    console.log('  🟡 6/10 - Project update needed, 5 days old');
    console.log('  🔴 9/10 - Urgent bug report, 7 days old, important client');
    console.log('');

    // Trigger actual follow-up detection
    console.log('⏳ Running follow-up detection now...\n');

    try {
      const detectResponse = await axios.post(
        `${API_URL}/follow-ups/detect`,
        { thresholdDays: 2 },
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      console.log(`✅ Detection complete: ${detectResponse.data.data.createdCount} new follow-ups found\n`);

      // Get stats
      const statsResponse = await axios.get(
        `${API_URL}/follow-ups/stats`,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      const stats = statsResponse.data.data;
      console.log('📊 Your Follow-up Statistics:');
      console.log(`   Total: ${stats.total}`);
      console.log(`   Pending: ${stats.pending}`);
      console.log(`   Urgent (≥7): ${stats.urgent} ${stats.urgent > 0 ? '🚨' : ''}`);
      console.log(`   Avg Urgency: ${stats.avgUrgencyScore.toFixed(1)}/10`);
      console.log('');
    } catch (error: any) {
      console.log(`   Note: ${error.response?.data?.error || error.message}\n`);
    }

    // Show daily summary feature
    console.log('═'.repeat(80));
    console.log('\n📊 DAILY AI SUMMARY FEATURE\n');
    console.log('Every morning at 8 AM, you receive an AI-generated email briefing:');
    console.log('');
    console.log('┌─ Daily Briefing Example ──────────────────────────────────┐');
    console.log('│                                                           │');
    console.log('│  Good morning! Here\'s your TaskSnap briefing:            │');
    console.log('│                                                           │');
    console.log('│  📌 Today\'s Focus:                                       │');
    console.log('│     • 3 tasks due today                                  │');
    console.log('│     • 2 urgent follow-ups need your attention            │');
    console.log('│     • 1 client at risk (low engagement score)            │');
    console.log('│                                                           │');
    console.log('│  🚨 Priority Actions:                                    │');
    console.log('│     1. Respond to Sarah (Bug report - 3 days overdue)    │');
    console.log('│     2. Send mockups to John (Due today at 5 PM)          │');
    console.log('│     3. Follow up with Mike on Q4 timeline                │');
    console.log('│                                                           │');
    console.log('│  💡 Tip: Focus on the urgent items first!               │');
    console.log('│                                                           │');
    console.log('└───────────────────────────────────────────────────────────┘');
    console.log('');

    // Final summary
    console.log('═'.repeat(80));
    console.log('\n✨ FEATURE SUMMARY\n');
    console.log('✅ Scheduled Jobs');
    console.log('   • Follow-up scanner: Every 4 hours');
    console.log('   • Daily summary: Every day at 8 AM UTC');
    console.log('');
    console.log('✅ Follow-up Detection');
    console.log('   • Intelligent urgency scoring (1-10)');
    console.log('   • Automatic detection every 4 hours');
    console.log('   • Manual trigger available via API');
    console.log('');
    console.log('✅ AI Task Extraction');
    console.log('   • Works with emails, meeting notes, chat, general notes');
    console.log('   • Extracts tasks, priorities, due dates, labels');
    console.log('   • Suggests Trello boards and lists');
    console.log('');
    console.log('✅ Task Acceptance Flow');
    console.log('   • Preview tasks before creating');
    console.log('   • Edit task details');
    console.log('   • Accept or reject with one click');
    console.log('');
    console.log('✅ Daily AI Summaries');
    console.log('   • Personalized morning briefing');
    console.log('   • Highlights urgent items');
    console.log('   • Tracks at-risk clients');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

function getPriorityEmoji(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'critical':
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

runDemo();
