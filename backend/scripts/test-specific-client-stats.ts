import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const USER_ID = process.env.USER_ID || 'a910985b-be4b-4666-b604-c7bc75ea88f8';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';
const CLIENT_ID = process.argv[2] || 'e3b2b653-fad4-457d-9360-9d94f5e38036';

// Generate JWT token for testing
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function testClientStats() {
  try {
    console.log('🧪 Testing Client Stats Endpoint with Real Data\n');
    console.log(`📡 API URL: ${API_URL}`);
    console.log(`👤 User ID: ${USER_ID}`);
    console.log(`🏢 Client ID: ${CLIENT_ID}\n`);

    const token = generateToken(USER_ID);
    const headers = {
      Authorization: `Bearer ${token}`
    };

    console.log('📊 Fetching client stats...\n');

    const statsResponse = await axios.get(`${API_URL}/clients/${CLIENT_ID}/stats`, {
      headers
    });

    const stats = statsResponse.data.data;

    console.log('✅ Stats retrieved successfully!\n');
    console.log('=' .repeat(60));
    console.log('📈 OVERVIEW');
    console.log('=' .repeat(60));
    console.log(`   Total Tasks:      ${stats.overview.totalTasks}`);
    console.log(`   Completed:        ${stats.overview.completedTasks}`);
    console.log(`   Overdue:          ${stats.overview.overdueTasks}`);
    console.log(`   Pending:          ${stats.overview.pendingTasks}`);
    console.log(`   Total Emails:     ${stats.overview.totalEmails}`);
    console.log(`   Health Score:     ${stats.overview.healthScore}`);

    console.log('\n' + '=' .repeat(60));
    console.log('💬 COMMUNICATION');
    console.log('=' .repeat(60));
    console.log(`   Avg Response Time:  ${stats.communication.avgResponseTime?.toFixed(2)} hours`);
    console.log(`   Last Contact:       ${stats.communication.lastContactDate || 'Never'}`);
    console.log(`   Email Frequency:    ${stats.communication.emailFrequency?.toFixed(2)} emails/week`);
    console.log(`   Sentiment Data:     ${stats.communication.sentimentTrend?.length || 0} data points`);

    console.log('\n' + '=' .repeat(60));
    console.log('✅ TASKS');
    console.log('=' .repeat(60));
    console.log(`   Upcoming Deadlines: ${stats.tasks.upcomingDeadlines?.length || 0}`);
    console.log(`   Completion Rate:    ${stats.tasks.completionRate}%`);
    console.log(`   Tasks by Status:`);
    console.log(`     - Pending:   ${stats.tasks.tasksByStatus.pending}`);
    console.log(`     - Completed: ${stats.tasks.tasksByStatus.completed}`);
    console.log(`     - Overdue:   ${stats.tasks.tasksByStatus.overdue}`);

    if (stats.tasks.upcomingDeadlines && stats.tasks.upcomingDeadlines.length > 0) {
      console.log('\n   📅 Upcoming Deadlines:');
      stats.tasks.upcomingDeadlines.forEach((task: any, i: number) => {
        console.log(`      ${i + 1}. ${task.title} - Due: ${task.due_date}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 CLIENT STATS ENDPOINT IS WORKING PERFECTLY!');
    console.log('=' .repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testClientStats();
