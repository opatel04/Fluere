import axios from 'axios';

const API_URL = 'https://tasksnap-v2-production.up.railway.app/api/v1';
const USER_ID = 'a910985b-be4b-4666-b604-c7bc75ea88f8';

async function testFullWorkflow() {
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

    console.log('📋 Getting Trello board details...\n');

    const boardsResponse = await axios.get(`${API_URL}/trello/boards`, {
      params: { userId: USER_ID }
    });

    const board = boardsResponse.data.data.boards[0];
    console.log(`✅ Using board: "${board.name}"\n`);

    const listsResponse = await axios.get(`${API_URL}/trello/boards/${board.id}/lists`, {
      params: { userId: USER_ID }
    });

    const list = listsResponse.data.data.lists[0];
    console.log(`✅ Will create cards in list: "${list.name}"\n`);

    console.log('🤖 Processing email: AI extraction + Trello card creation...\n');
    console.log('⏳ This will take 20-40 seconds...\n');

    const testResponse = await axios.post(
      `${API_URL}/process/test/full`,
      {
        userId: USER_ID,
        emailContent: `Subject: ${email.subject}\nFrom: ${email.from}\n\n${email.body || email.snippet}`,
        boardId: board.id,
        listId: list.id
      }
    );

    const result = testResponse.data.data;

    console.log('🎉 SUCCESS! Full workflow completed!\n');
    console.log(`✅ Tasks extracted: ${result.tasksExtracted || 0}`);
    console.log(`✅ Trello cards created: ${result.cardsCreated || 0}`);
    console.log(`✅ Confidence: ${((result.confidence || 0) * 100).toFixed(1)}%\n`);

    console.log('\n🔗 Check your Trello board: ' + board.url);
    console.log('\n✨ Automation test completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFullWorkflow();
