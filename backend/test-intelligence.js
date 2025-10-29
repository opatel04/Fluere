// Test script to demonstrate Task Intelligence
const axios = require('axios');

async function demonstrateIntelligence() {
  console.log('🧠 TaskSnap Task Intelligence Demo\n');
  console.log('=' .repeat(60));

  // Test email with multiple tasks of varying priorities
  const testEmail = {
    emailContent: `
Hi team,

We have several items that need attention:

1. URGENT: Production server is down - customers can't access the site.
   Need immediate fix!

2. Review the Q4 budget proposal by Friday - this needs approval
   before the board meeting next week.

3. Schedule our weekly team standup for Monday morning.

4. Update the API documentation when you get a chance - no rush.

5. Fix the typo in the login page button text.

Please prioritize accordingly!
    `.trim()
  };

  console.log('\n📧 Testing with sample email...\n');

  try {
    const response = await axios.post(
      'http://localhost:3000/api/v1/process/test',
      testEmail
    );

    const { tasks, confidence, metadata } = response.data.data;

    console.log(`✅ AI Extraction Complete!`);
    console.log(`   Confidence: ${(confidence * 100).toFixed(1)}%`);
    console.log(`   Model: ${metadata.model}`);
    console.log(`   Processing Time: ${(metadata.processingTime / 1000).toFixed(1)}s`);
    console.log(`   Tasks Extracted: ${tasks.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('📊 TASK INTELLIGENCE ANALYSIS\n');

    // Show original order
    console.log('📝 Original Order (as extracted):');
    tasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.name} [${task.priority}]`);
    });

    // Simulate task intelligence sorting
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    console.log('\n✨ After Task Intelligence Sorting:');
    sortedTasks.forEach((task, i) => {
      const priorityEmoji = {
        urgent: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
      };
      console.log(`   ${i + 1}. ${priorityEmoji[task.priority]} ${task.name}`);
      console.log(`      Priority: ${task.priority.toUpperCase()}`);
      console.log(`      Category: ${task.category || 'general'}`);

      // Simulate smart labeling
      const smartLabels = [...(task.labels || [])];
      if (task.priority === 'urgent') smartLabels.push('⚡ Urgent');
      if (task.name.toLowerCase().includes('meeting')) smartLabels.push('📅 Meeting');
      if (task.name.toLowerCase().includes('review')) smartLabels.push('👀 Review Required');
      if (task.dueDate) {
        const daysUntil = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 1) smartLabels.push('⏰ Due Today');
        else if (daysUntil <= 7) smartLabels.push('📆 Due This Week');
      }

      if (smartLabels.length > 0) {
        console.log(`      Smart Labels: ${smartLabels.join(', ')}`);
      }
      console.log('');
    });

    // Show task summary
    console.log('='.repeat(60));
    console.log('📈 TASK SUMMARY\n');

    const summary = {
      total: tasks.length,
      byPriority: {},
      urgent: 0,
      dueThisWeek: 0
    };

    tasks.forEach(task => {
      summary.byPriority[task.priority] = (summary.byPriority[task.priority] || 0) + 1;
      if (task.priority === 'urgent') summary.urgent++;
      if (task.dueDate) {
        const daysUntil = Math.ceil((new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) summary.dueThisWeek++;
      }
    });

    console.log(`   Total Tasks: ${summary.total}`);
    console.log(`   🔴 Urgent: ${summary.byPriority.urgent || 0}`);
    console.log(`   🟠 High: ${summary.byPriority.high || 0}`);
    console.log(`   🟡 Medium: ${summary.byPriority.medium || 0}`);
    console.log(`   🟢 Low: ${summary.byPriority.low || 0}`);
    console.log(`   ⏰ Due This Week: ${summary.dueThisWeek}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎯 RECOMMENDED COMPLETION ORDER:\n');

    sortedTasks.forEach((task, i) => {
      console.log(`   ${i + 1}. ${task.name}`);
      console.log(`      → Start: Now (${task.priority} priority)`);
      console.log(`      → Estimated: ${task.estimatedTime || 'Not specified'}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('✅ Task Intelligence Demo Complete!\n');
    console.log('💡 In the real workflow:');
    console.log('   • Tasks are automatically sorted');
    console.log('   • Smart labels are added');
    console.log('   • Trello cards are created in priority order');
    console.log('   • All happens in the background!');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

demonstrateIntelligence().catch(console.error);
