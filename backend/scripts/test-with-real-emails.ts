import axios from 'axios';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import { query } from '../src/config/database';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const USER_ID = process.env.TEST_USER_ID || 'a910985b-be4b-4666-b604-c7bc75ea88f8';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const AUTH_TOKEN = jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '24h' });

console.log('\n');
console.log('═'.repeat(70));
console.log('📧 TESTING WITH REAL EMAIL DATA');
console.log('═'.repeat(70));
console.log('');

async function testWithRealEmails() {
  try {
    // 1. Check if user has emails
    console.log('📨 Step 1: Checking your email database...\n');

    const emailsResult = await query(
      `SELECT
        e.id,
        e.subject,
        e.sender_email,
        e.sender,
        e.body,
        e.received_at,
        e.thread_id,
        c.name as client_name
       FROM emails e
       LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.user_id = $1
       ORDER BY e.received_at DESC
       LIMIT 5`,
      [USER_ID]
    );

    if (emailsResult.rows.length === 0) {
      console.log('⚠️  No emails found in database.');
      console.log('   You need to fetch emails first using the Gmail API.\n');
      console.log('   Try running: curl http://localhost:3000/api/v1/emails/fetch?userId=' + USER_ID);
      return;
    }

    console.log(`✅ Found ${emailsResult.rows.length} recent emails:\n`);
    emailsResult.rows.forEach((email: any, i: number) => {
      console.log(`${i + 1}. Subject: "${email.subject}"`);
      console.log(`   From: ${email.sender_email || email.sender}${email.client_name ? ` (${email.client_name})` : ''}`);
      console.log(`   Date: ${new Date(email.received_at).toLocaleString()}`);
      const snippet = email.body?.substring(0, 100) || 'No content';
      console.log(`   Preview: ${snippet}...`);
      console.log('');
    });

    // 2. Test Follow-up Detection with real emails
    console.log('─'.repeat(70));
    console.log('🔍 Step 2: Testing Follow-up Detection\n');

    const detectResponse = await axios.post(
      `${API_URL}/follow-ups/detect`,
      { thresholdDays: 2 },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    console.log(`✅ Follow-up detection completed!`);
    console.log(`   Detected: ${detectResponse.data.data.createdCount} new follow-ups\n`);

    // 3. Get all follow-ups
    const followUpsResponse = await axios.get(
      `${API_URL}/follow-ups`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        params: { status: 'pending' },
      }
    );

    if (followUpsResponse.data.data.length > 0) {
      console.log('📋 Follow-ups that need your attention:\n');
      followUpsResponse.data.data.forEach((followUp: any, i: number) => {
        console.log(`${i + 1}. Client: ${followUp.clientName || followUp.clientEmail || 'Unknown'}`);
        console.log(`   Subject: ${followUp.subject || 'N/A'}`);
        console.log(`   Days since message: ${followUp.daysSinceClientMessage}`);
        console.log(`   Urgency: ${followUp.urgencyScore}/10 ${followUp.urgencyScore >= 7 ? '🚨 URGENT' : ''}`);
        console.log(`   Message: "${followUp.clientMessageSnippet}"`);
        console.log('');
      });
    } else {
      console.log('✨ No pending follow-ups! All caught up!\n');
    }

    // 4. Test Manual Task Extraction with real email
    console.log('─'.repeat(70));
    console.log('💬 Step 3: Testing Manual Task Extraction\n');

    const testEmail = emailsResult.rows[0];
    console.log(`Using email: "${testEmail.subject}"\n`);

    const textToExtract = `
Subject: ${testEmail.subject}
From: ${testEmail.sender_email || testEmail.sender}

${testEmail.body || 'No content'}
    `.trim();

    console.log('📧 Email content:\n');
    console.log(textToExtract.substring(0, 500) + '...\n');

    const extractResponse = await axios.post(
      `${API_URL}/ai/extract-manual`,
      {
        text: textToExtract,
        context: 'email',
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    console.log('─'.repeat(70));
    console.log(`🤖 AI Extracted Tasks (Confidence: ${(extractResponse.data.data.confidence * 100).toFixed(1)}%)\n`);

    if (extractResponse.data.data.tasks.length === 0) {
      console.log('   No actionable tasks found in this email.\n');
    } else {
      extractResponse.data.data.tasks.forEach((task: any, i: number) => {
        console.log(`Task ${i + 1}:`);
        console.log(`   Title: ${task.title}`);
        console.log(`   Description: ${task.description}`);
        console.log(`   Priority: ${task.priority}`);
        console.log(`   Due Date: ${task.dueDate || 'Not specified'}`);
        console.log(`   Labels: ${task.labels?.join(', ') || 'None'}`);

        if (task.suggestedBoard) {
          console.log(`   Suggested Board: ${task.suggestedBoard.name}`);
          console.log(`   Suggested List: ${task.suggestedList?.name || 'N/A'}`);
        }
        console.log('');
      });

      // 5. Accept one task
      console.log('─'.repeat(70));
      console.log('✅ Step 4: Accepting first task\n');

      const taskToAccept = extractResponse.data.data.tasks[0];
      const acceptResponse = await axios.post(
        `${API_URL}/ai/accept-tasks`,
        {
          tasks: [{
            title: taskToAccept.title,
            description: taskToAccept.description,
            priority: taskToAccept.priority,
            dueDate: taskToAccept.dueDate,
            boardId: taskToAccept.suggestedBoard?.id,
            listId: taskToAccept.suggestedList?.id,
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
          },
        }
      );

      console.log(`✅ Task accepted and created!`);
      console.log(`   Created: ${acceptResponse.data.data.created} task(s)`);
      console.log(`   Task saved to database with ID: ${acceptResponse.data.data.tasks[0]?.id}\n`);
    }

    // 6. Get follow-up statistics
    console.log('─'.repeat(70));
    console.log('📊 Step 5: Follow-up Statistics\n');

    const statsResponse = await axios.get(
      `${API_URL}/follow-ups/stats`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
      }
    );

    const stats = statsResponse.data.data;
    console.log(`Total follow-ups: ${stats.total}`);
    console.log(`Pending: ${stats.pending}`);
    console.log(`Urgent (≥7): ${stats.urgent}`);
    console.log(`Responded: ${stats.responded}`);
    console.log(`Dismissed: ${stats.dismissed}`);
    console.log(`Average urgency: ${stats.avgUrgencyScore.toFixed(1)}/10\n`);

    console.log('═'.repeat(70));
    console.log('✨ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(70));
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

testWithRealEmails();
