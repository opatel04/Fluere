import axios from 'axios';

const API_URL = 'https://tasksnap-v2-production.up.railway.app/api/v1';
const USER_ID = 'a910985b-be4b-4666-b604-c7bc75ea88f8';

async function testExtractionOnly() {
  try {
    console.log('📧 Fetching your test email...\n');

    const fetchResponse = await axios.get(`${API_URL}/emails/fetch`, {
      params: {
        userId: USER_ID,
        maxResults: 1
      }
    });

    const email = fetchResponse.data.data.emails[0];
    console.log(`✅ Found email: "${email.subject}"\n`);

    console.log('🤖 Testing AI extraction (no Trello cards)...\n');
    console.log('Email content preview:');
    console.log(email.snippet);
    console.log('\n⏳ Processing with AI...\n');

    const testResponse = await axios.post(
      `${API_URL}/process/test`,
      {
        userId: USER_ID,
        emailContent: `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.body || email.snippet}`
      }
    );

    const result = testResponse.data.data;

    console.log('🎉 AI Extraction Complete!\n');
    console.log(`✅ Tasks found: ${result.tasks?.length || 0}`);
    console.log(`✅ Confidence: ${((result.confidence || 0) * 100).toFixed(1)}%\n`);

    if (result.tasks && result.tasks.length > 0) {
      console.log('📋 Extracted Tasks:\n');
      result.tasks.forEach((task: any, index: number) => {
        console.log(`${index + 1}. ${task.name || task.title || task.content}`);
        console.log(`   Priority: ${task.priority || 'medium'}`);
        if (task.dueDate) console.log(`   Due: ${task.dueDate}`);
        if (task.assignee) console.log(`   Assign to: ${task.assignee}`);
        console.log('');
      });
    }

    console.log('\n✨ Extraction test completed!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testExtractionOnly();
