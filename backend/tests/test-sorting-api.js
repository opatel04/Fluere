/**
 * Test script for Task Sorting API
 *
 * Run this script while the backend is running to test all endpoints
 *
 * Usage: node test-sorting-api.js
 */

const BASE_URL = 'http://localhost:3000/api';

// Sample tasks for testing
const sampleTasks = [
  {
    name: 'Fix critical login bug',
    description: 'Users cannot log in to the system',
    priority: 'urgent',
    dueDate: new Date().toISOString(),
    category: 'bug',
    labels: ['authentication', 'security']
  },
  {
    name: 'Update API documentation',
    description: 'Add examples for new endpoints',
    priority: 'low',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'documentation',
    labels: ['docs', 'api']
  },
  {
    name: 'Deploy to production',
    description: 'Push latest changes to prod',
    priority: 'high',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'deployment',
    labels: ['production']
  },
  {
    name: 'Schedule team meeting',
    description: 'Quarterly planning meeting',
    priority: 'medium',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'meeting',
    labels: ['team', 'planning']
  },
  {
    name: 'Code review PR #123',
    description: 'Review authentication changes',
    priority: 'high',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'code-review',
    labels: ['review']
  }
];

async function testGetOptions() {
  console.log('\n1️⃣  Testing GET /task-sort/options\n');

  try {
    const response = await fetch(`${BASE_URL}/task-sort/options`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ Success!');
      console.log(`\nSort Options: ${data.data.sortOptions.length}`);
      data.data.sortOptions.forEach(opt => {
        console.log(`  - ${opt.label} (${opt.value})`);
      });

      console.log(`\nFilter Options: ${data.data.filterOptions.length}`);
      data.data.filterOptions.forEach(opt => {
        console.log(`  - ${opt.label} (${opt.value})`);
      });
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testDropdownSort() {
  console.log('\n\n2️⃣  Testing POST /task-sort/sort (Dropdown)\n');

  const testCases = [
    {
      name: 'Sort by Priority',
      sortBy: 'priority',
      filters: []
    },
    {
      name: 'Sort by Date',
      sortBy: 'date',
      filters: []
    },
    {
      name: 'Filter Urgent + High',
      sortBy: 'priority',
      filters: ['urgent', 'high']
    },
    {
      name: 'Filter This Week',
      sortBy: 'date',
      filters: ['this-week']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);

    try {
      const response = await fetch(`${BASE_URL}/task-sort/sort`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: sampleTasks,
          sortBy: testCase.sortBy,
          filters: testCase.filters
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Success! ${data.data.count} tasks returned (from ${data.data.originalCount})`);
        console.log('Tasks:');
        data.data.tasks.forEach((task, i) => {
          console.log(`  ${i + 1}. ${task.name} [${task.priority}] - Due: ${new Date(task.dueDate).toLocaleDateString()}`);
        });
      } else {
        console.log('❌ Failed:', data.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

async function testChatSort() {
  console.log('\n\n3️⃣  Testing POST /task-sort/sort/chat (AI-powered)\n');

  const prompts = [
    'Show me the most urgent tasks first',
    'I need to see tasks due this week',
    'Sort by priority and show only high priority items',
    'What tasks are overdue or due today?'
  ];

  for (const prompt of prompts) {
    console.log(`\n💬 Prompt: "${prompt}"`);

    try {
      const response = await fetch(`${BASE_URL}/task-sort/sort/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: sampleTasks,
          prompt: prompt
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ Success! ${data.data.count} tasks returned`);
        console.log(`\n📝 Explanation: ${data.data.explanation}`);
        console.log('\nTasks:');
        data.data.tasks.forEach((task, i) => {
          console.log(`  ${i + 1}. ${task.name} [${task.priority}]`);
        });
        console.log(`\n🔍 Sort Criteria:`, data.data.sortCriteria);
      } else {
        console.log('❌ Failed:', data.error);
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }
}

async function runAllTests() {
  console.log('🚀 TaskSnap Sorting API Test Suite');
  console.log('====================================');

  // Check if server is running
  try {
    const response = await fetch(`${BASE_URL}/task-sort/options`);
    if (!response.ok) {
      throw new Error('Server not responding');
    }
  } catch (error) {
    console.log('\n❌ ERROR: Backend server is not running!');
    console.log('\nPlease start the backend first:');
    console.log('  cd backend');
    console.log('  npm run dev\n');
    return;
  }

  await testGetOptions();
  await testDropdownSort();
  await testChatSort();

  console.log('\n\n✅ All tests completed!\n');
}

// Run tests
runAllTests().catch(console.error);
