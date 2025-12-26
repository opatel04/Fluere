import axios from 'axios';

const API_URL = 'https://tasksnap-v2-production.up.railway.app/api/v1';
const USER_ID = 'a910985b-be4b-4666-b604-c7bc75ea88f8';

async function processTestEmail() {
  try {
    console.log('📧 Step 1: Fetching your test email...\n');

    // Fetch emails
    const fetchResponse = await axios.get(`${API_URL}/emails/fetch`, {
      params: {
        userId: USER_ID,
        maxResults: 1,
        query: 'subject:"Q4 Planning"'
      }
    });

    const emails = fetchResponse.data.data.emails;

    if (emails.length === 0) {
      console.log('❌ Test email not found. Make sure you sent it!');
      return;
    }

    const testEmail = emails[0];
    console.log('✅ Found test email!');
    console.log(`   Subject: ${testEmail.subject}`);
    console.log(`   From: ${testEmail.from}`);
    console.log(`   Message ID: ${testEmail.messageId}\n`);

    console.log('📋 Step 2: Getting your Trello boards...\n');

    // Get Trello boards
    const boardsResponse = await axios.get(`${API_URL}/trello/boards`, {
      params: { userId: USER_ID }
    });

    const boards = boardsResponse.data.data.boards;

    if (boards.length === 0) {
      console.log('❌ No Trello boards found. Please create a board first.');
      return;
    }

    console.log(`✅ Found ${boards.length} Trello board(s):`);
    boards.forEach((board: any, index: number) => {
      console.log(`   ${index + 1}. ${board.name} (ID: ${board.id})`);
    });

    // Use the first board
    const targetBoard = boards[0];
    console.log(`\n📌 Will use board: "${targetBoard.name}"\n`);

    console.log('📝 Step 3: Getting lists from the board...\n');

    // Get lists from the board
    const listsResponse = await axios.get(`${API_URL}/trello/boards/${targetBoard.id}/lists`, {
      params: { userId: USER_ID }
    });

    const lists = listsResponse.data.data.lists;

    if (lists.length === 0) {
      console.log('❌ No lists found in the board.');
      return;
    }

    console.log(`✅ Found ${lists.length} list(s):`);
    lists.forEach((list: any, index: number) => {
      console.log(`   ${index + 1}. ${list.name} (ID: ${list.id})`);
    });

    // Use the first list (usually "To Do")
    const targetList = lists[0];
    console.log(`\n📍 Will create cards in: "${targetList.name}"\n`);

    console.log('🤖 Step 4: Processing email with AI and creating Trello cards...\n');
    console.log('⏳ This may take 10-30 seconds...\n');

    // Process the email
    const processResponse = await axios.post(
      `${API_URL}/process/email/${testEmail.messageId}`,
      {
        userId: USER_ID,
        boardId: targetBoard.id,
        listId: targetList.id
      }
    );

    const result = processResponse.data.data;

    console.log('🎉 SUCCESS! Email processed and Trello cards created!\n');
    console.log('📊 Results:');
    console.log(`   ✅ Tasks extracted: ${result.tasks?.length || 0}`);
    console.log(`   ✅ Trello cards created: ${result.cardsCreated?.length || 0}\n`);

    if (result.tasks && result.tasks.length > 0) {
      console.log('📋 Extracted Tasks:');
      result.tasks.forEach((task: any, index: number) => {
        console.log(`\n   ${index + 1}. ${task.title || task.content}`);
        console.log(`      Priority: ${task.priority || 'medium'}`);
        console.log(`      Confidence: ${(task.confidence_score * 100).toFixed(0)}%`);
      });
    }

    console.log('\n\n🔗 Check your Trello board: ' + targetBoard.url);
    console.log('\n✨ Automation test completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Details:', error.response.data.error);
    }
  }
}

processTestEmail();
