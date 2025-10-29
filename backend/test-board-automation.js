/**
 * Board Automation API Test Script
 *
 * Tests the board automation endpoints:
 * 1. Get templates
 * 2. Create board configuration
 * 3. Initialize board
 * 4. Test routing
 * 5. Create list
 * 6. Move card (if card exists)
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
const userId = 'd56b609c-1727-4e9a-bd39-935cf26799c8'; // Real user ID
const boardId = '67a2aeb1809e0aa93a8d79c9'; // Real Trello board ID (CIS 401)

async function runTests() {
  console.log('🚀 Starting Board Automation API Tests\n');

  try {
    // Test 1: Get Templates
    console.log('📋 Test 1: Getting configuration templates...');
    const templatesResponse = await axios.get(`${BASE_URL}/board-automation/templates`);
    console.log('✅ Templates retrieved:', templatesResponse.data.data.count, 'templates');
    console.log('   Template names:', templatesResponse.data.data.templates.map(t => t.name).join(', '));
    console.log();

    // Test 2: Save Board Configuration (using Priority-Based template)
    console.log('💾 Test 2: Saving board configuration...');
    const template = templatesResponse.data.data.templates[0]; // Priority-Based template

    const saveConfigResponse = await axios.post(
      `${BASE_URL}/board-automation/${boardId}`,
      {
        userId,
        lists: template.lists,
        routingRules: template.routingRules,
      }
    );

    if (saveConfigResponse.data.success) {
      console.log('✅ Board configuration saved successfully');
      console.log('   Lists configured:', template.lists.map(l => l.name).join(', '));
      console.log('   Routing rules:', template.routingRules.length);
    }
    console.log();

    // Test 3: Get Board Configuration
    console.log('📖 Test 3: Getting board configuration...');
    const getConfigResponse = await axios.get(
      `${BASE_URL}/board-automation/${boardId}`,
      { data: { userId } }
    );

    if (getConfigResponse.data.success) {
      console.log('✅ Board configuration retrieved');
      console.log('   Lists:', getConfigResponse.data.data.lists.length);
      console.log('   Rules:', getConfigResponse.data.data.routingRules.length);
    }
    console.log();

    // Test 4: Initialize Board (creates missing lists)
    console.log('🔧 Test 4: Initializing board...');
    const initResponse = await axios.post(
      `${BASE_URL}/board-automation/${boardId}/initialize`,
      { userId }
    );

    if (initResponse.data.success) {
      console.log('✅ Board initialized');
      console.log('   Lists created:', initResponse.data.data.listsCreated.join(', ') || 'None');
      console.log('   Lists existing:', initResponse.data.data.listsExisting.join(', ') || 'None');
    }
    console.log();

    // Test 5: Test Routing
    console.log('🎯 Test 5: Testing task routing...');

    const testTasks = [
      {
        name: 'Fix critical bug in production',
        priority: 'urgent',
        category: 'bug',
        description: 'Server is down',
      },
      {
        name: 'Review pull request',
        priority: 'high',
        category: 'development',
        description: 'New feature implementation',
      },
      {
        name: 'Update documentation',
        priority: 'medium',
        category: 'documentation',
        description: 'API docs need updating',
      },
    ];

    for (const task of testTasks) {
      const routingResponse = await axios.post(
        `${BASE_URL}/board-automation/${boardId}/test-routing`,
        { userId, task }
      );

      if (routingResponse.data.success) {
        const routing = routingResponse.data.data;
        console.log(`✅ Task: "${task.name}"`);
        console.log(`   → Routed to: "${routing.listName}"`);
        console.log(`   → Rule: ${routing.matchedRule || 'default'}`);
      }
    }
    console.log();

    // Test 6: Create a new list
    console.log('➕ Test 6: Creating a new list...');
    const createListResponse = await axios.post(
      `${BASE_URL}/board-automation/${boardId}/lists`,
      {
        userId,
        name: 'Backlog',
        position: 'bottom',
      }
    );

    if (createListResponse.data.success) {
      console.log('✅ List created:', createListResponse.data.data.name);
      console.log('   ID:', createListResponse.data.data.id);
    }
    console.log();

    // Test 7: Get all user board configs
    console.log('📚 Test 7: Getting all board configs for user...');
    const userConfigsResponse = await axios.get(
      `${BASE_URL}/board-automation/user/${userId}`
    );

    if (userConfigsResponse.data.success) {
      console.log('✅ User has', userConfigsResponse.data.data.count, 'board configurations');
    }
    console.log();

    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Templates: ✅');
    console.log('   - Save config: ✅');
    console.log('   - Get config: ✅');
    console.log('   - Initialize board: ✅');
    console.log('   - Test routing: ✅');
    console.log('   - Create list: ✅');
    console.log('   - Get user configs: ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data?.error || error.response.data);
    }

    console.error('\n💡 Make sure:');
    console.error('   1. Backend server is running (npm run dev)');
    console.error('   2. Database is running and migrated');
    console.error('   3. User has Trello connected');
    console.error('   4. Replace userId and boardId with actual values');
  }
}

// Run the tests
runTests();
