import emailProcessorService from './src/services/email-processor.service';
import logger from './src/config/logger';

const testProcessEmail = async () => {
  try {
    const userId = '8946091a-009e-403f-b5da-b3b44303f41c';
    const messageId = '19abe42f6e107f32';

    console.log(`\nProcessing email ${messageId}...`);
    const result = await emailProcessorService.processEmailMetadataOnly(userId, messageId);

    console.log('\n=== PROCESSING RESULT ===');
    console.log('Success:', result.success);
    console.log('Email ID:', result.emailId);
    console.log('Category:', result.category);
    console.log('Likely has task:', result.likelyHasTask);
    console.log('Task created:', result.taskCreated);
    console.log('Task ID:', result.taskId);

  } catch (error) {
    console.error('ERROR:', error);
  }

  process.exit(0);
};

testProcessEmail();
