import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const USER_ID = process.env.USER_ID || 'a910985b-be4b-4666-b604-c7bc75ea88f8';
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production';

// Generate JWT token for testing
function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

async function testClientStats() {
  try {
    console.log('🧪 Testing Client Stats Endpoint\n');
    console.log(`📡 API URL: ${API_URL}`);
    console.log(`👤 User ID: ${USER_ID}\n`);
    console.log('🔑 Generating JWT token for authentication...\n');

    const token = generateToken(USER_ID);
    const headers = {
      Authorization: `Bearer ${token}`
    };

    console.log('Step 1: List all clients...\n');

    // List all clients
    const listResponse = await axios.get(`${API_URL}/clients`, {
      headers
    });

    const clients = listResponse.data.data.clients;
    console.log(`✅ Found ${clients.length} client(s)\n`);

    if (clients.length === 0) {
      console.log('❌ No clients found. Creating a test client first...\n');

      // Create a test client
      const createResponse = await axios.post(
        `${API_URL}/clients`,
        {
          email: 'testclient@example.com',
          name: 'Test Client',
          company: 'Test Company'
        },
        { headers }
      );

      console.log(`✅ Created test client: ${createResponse.data.data.email}\n`);
      const clientId = createResponse.data.data.id;

      // Now test stats for this client
      await testStatsForClient(clientId, headers);
    } else {
      // Test stats for the first client
      const firstClient = clients[0];
      console.log(`Testing stats for client: ${firstClient.email || firstClient.name}\n`);
      await testStatsForClient(firstClient.id, headers);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testStatsForClient(clientId: string, headers: any) {
  console.log(`\n📊 Fetching stats for client ID: ${clientId}...\n`);

  const statsResponse = await axios.get(`${API_URL}/clients/${clientId}/stats`, {
    headers
  });

  const stats = statsResponse.data.data;

  console.log('✅ Stats retrieved successfully!\n');
  console.log('📈 Overview:');
  console.log(`   Total Tasks: ${stats.overview.totalTasks}`);
  console.log(`   Completed Tasks: ${stats.overview.completedTasks}`);
  console.log(`   Overdue Tasks: ${stats.overview.overdueTasks}`);
  console.log(`   Pending Tasks: ${stats.overview.pendingTasks}`);
  console.log(`   Total Emails: ${stats.overview.totalEmails}`);
  console.log(`   Health Score: ${stats.overview.healthScore}`);

  console.log('\n💬 Communication:');
  console.log(`   Avg Response Time: ${stats.communication.avgResponseTime?.toFixed(1)} hours`);
  console.log(`   Last Contact: ${stats.communication.lastContactDate || 'Never'}`);
  console.log(`   Email Frequency: ${stats.communication.emailFrequency?.toFixed(2)} emails/week`);
  console.log(`   Sentiment Trend: ${stats.communication.sentimentTrend?.length || 0} data points`);

  console.log('\n✅ Tasks:');
  console.log(`   Upcoming Deadlines: ${stats.tasks.upcomingDeadlines?.length || 0}`);
  console.log(`   Task Completion Rate: ${stats.tasks.completionRate}%`);
  console.log(`   Tasks by Status:`, stats.tasks.tasksByStatus);

  console.log('\n🎉 Client Stats Endpoint is working perfectly!\n');
}

testClientStats();
