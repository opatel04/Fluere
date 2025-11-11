import axios from 'axios';

const API_URL = 'https://tasksnap-v2-production.up.railway.app/api/v1';
const USER_ID = 'a910985b-be4b-4666-b604-c7bc75ea88f8';

async function testEmailAutomation() {
  try {
    console.log('🔍 Step 1: Fetching emails from Gmail...\n');

    const fetchResponse = await axios.get(`${API_URL}/emails/fetch`, {
      params: {
        userId: USER_ID,
        maxResults: 5
      }
    });

    console.log('✅ Successfully fetched emails!');
    console.log(`Found ${fetchResponse.data.data.count} emails\n`);

    if (fetchResponse.data.data.emails.length === 0) {
      console.log('❌ No emails found. Please send a test email first.');
      return;
    }

    // Display the emails
    fetchResponse.data.data.emails.forEach((email: any, index: number) => {
      console.log(`\n📧 Email ${index + 1}:`);
      console.log(`   From: ${email.from}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Date: ${email.date}`);
      console.log(`   Snippet: ${email.snippet.substring(0, 100)}...`);
    });

    console.log('\n\n🎯 Testing complete!');
    console.log('\nNext steps:');
    console.log('1. Check the emails above');
    console.log('2. We can now process these emails to create Trello cards');

  } catch (error: any) {
    console.error('❌ Error testing automation:', error.response?.data || error.message);
  }
}

testEmailAutomation();
