import gmailService from './src/services/gmail.service';
import logger from './src/config/logger';

const testFetch = async () => {
  try {
    const userId = '8946091a-009e-403f-b5da-b3b44303f41c';
    const messageId = '19abe42f6e107f32';

    console.log(`Fetching email ${messageId}...`);
    const message = await gmailService.getEmailById(userId, messageId);

    if (!message) {
      console.log('ERROR: Email not found!');
      return;
    }

    console.log('\n=== RAW MESSAGE DATA ===');
    console.log('ID:', message.id);
    console.log('Thread ID:', message.threadId);
    console.log('Snippet:', message.snippet);
    console.log('Label IDs:', message.labelIds);

    console.log('\n=== HEADERS ===');
    const headers = message.payload.headers;
    const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
    const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
    console.log('Subject header:', subjectHeader);
    console.log('From header:', fromHeader);

    console.log('\n=== PARSED EMAIL ===');
    const parsed = gmailService.parseEmail(message);
    console.log('Subject:', parsed.subject);
    console.log('From:', parsed.from);
    console.log('Snippet:', parsed.snippet);
    console.log('Date:', parsed.date);
    console.log('Body length:', parsed.body.length);

  } catch (error) {
    console.error('ERROR:', error);
  }

  process.exit(0);
};

testFetch();
